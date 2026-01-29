import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { upgradeSubscription } from "@/lib/subscription";
import { PlanType } from "@prisma/client";

// Lazy initialization to avoid build-time errors
let stripeClient: Stripe | null = null;
function getStripe(): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }
  return stripeClient;
}

function getWebhookSecret(): string {
  return process.env.STRIPE_WEBHOOK_SECRET!;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get("stripe-signature");

    if (!signature) {
      return NextResponse.json({ error: "No signature" }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
      event = getStripe().webhooks.constructEvent(body, signature, getWebhookSecret());
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const planId = session.metadata?.planId as PlanType;

  if (!userId || !planId) {
    console.error("Missing metadata in checkout session");
    return;
  }

  const subscriptionId = session.subscription as string;
  const customerId = session.customer as string;

  // Retrieve the subscription to get period details
  const stripeSubscription = await getStripe().subscriptions.retrieve(subscriptionId);
  const subscriptionData = stripeSubscription as unknown as {
    items: { data: Array<{ price: { id: string } }> };
    current_period_start: number;
    current_period_end: number;
  };

  await upgradeSubscription(userId, planId, {
    customerId,
    subscriptionId,
    priceId: subscriptionData.items.data[0].price.id,
    currentPeriodStart: new Date(subscriptionData.current_period_start * 1000),
    currentPeriodEnd: new Date(subscriptionData.current_period_end * 1000),
  });

  console.log(`User ${userId} upgraded to ${planId}`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  // Find user by Stripe customer ID
  const userSubscription = await prisma.subscription.findUnique({
    where: { stripeCustomerId: customerId },
  });

  if (!userSubscription) {
    console.error("No subscription found for customer:", customerId);
    return;
  }

  // Cast subscription to handle type differences
  const subData = subscription as unknown as {
    id: string;
    items: { data: Array<{ price: { id: string } }> };
    current_period_start: number;
    current_period_end: number;
    cancel_at_period_end: boolean;
    status: Stripe.Subscription.Status;
  };

  // Update subscription details
  await prisma.subscription.update({
    where: { id: userSubscription.id },
    data: {
      stripeSubscriptionId: subData.id,
      stripePriceId: subData.items.data[0].price.id,
      currentPeriodStart: new Date(subData.current_period_start * 1000),
      currentPeriodEnd: new Date(subData.current_period_end * 1000),
      cancelAtPeriodEnd: subData.cancel_at_period_end,
      status: mapStripeStatus(subData.status),
    },
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  // Find user by Stripe customer ID
  const userSubscription = await prisma.subscription.findUnique({
    where: { stripeCustomerId: customerId },
  });

  if (!userSubscription) {
    console.error("No subscription found for customer:", customerId);
    return;
  }

  // Downgrade to free plan
  await prisma.subscription.update({
    where: { id: userSubscription.id },
    data: {
      plan: "FREE",
      status: "CANCELED",
      stripeSubscriptionId: null,
      stripePriceId: null,
      cancelAtPeriodEnd: false,
    },
  });

  console.log(`User ${userSubscription.userId} downgraded to FREE`);
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const invoiceData = invoice as unknown as { subscription: string | null; customer: string };
  if (!invoiceData.subscription) return;

  const customerId = invoiceData.customer;

  const userSubscription = await prisma.subscription.findUnique({
    where: { stripeCustomerId: customerId },
  });

  if (!userSubscription) return;

  // Update status to active
  await prisma.subscription.update({
    where: { id: userSubscription.id },
    data: { status: "ACTIVE" },
  });
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const invoiceData = invoice as unknown as {
    subscription: string | null;
    customer: string;
    amount_due?: number;
    currency?: string;
    hosted_invoice_url?: string;
  };
  if (!invoiceData.subscription) return;

  const customerId = invoiceData.customer;

  const userSubscription = await prisma.subscription.findUnique({
    where: { stripeCustomerId: customerId },
    include: { user: { select: { id: true, email: true, name: true } } },
  });

  if (!userSubscription) return;

  // Update status to past due
  await prisma.subscription.update({
    where: { id: userSubscription.id },
    data: { status: "PAST_DUE" },
  });

  // Send email notification about failed payment
  const { queueEmail } = await import("@/lib/email");

  // Format the amount
  const amountDue = invoiceData.amount_due
    ? (invoiceData.amount_due / 100).toFixed(2)
    : "0.00";
  const currency = (invoiceData.currency || "usd").toUpperCase();

  await queueEmail(userSubscription.userId, "SUBSCRIPTION_CHANGE", {
    action: "Payment Failed",
    plan: userSubscription.plan,
    amount: `${currency} ${amountDue}`,
    invoiceUrl: invoiceData.hosted_invoice_url,
    nextBillingDate: userSubscription.currentPeriodEnd?.toLocaleDateString(),
    message: `Your payment of ${currency} ${amountDue} failed. Please update your payment method to continue your subscription.`,
  });

  console.log(`Payment failed notification sent to user ${userSubscription.userId}`);
}

function mapStripeStatus(status: Stripe.Subscription.Status) {
  const statusMap: Record<string, "ACTIVE" | "PAST_DUE" | "CANCELED" | "INCOMPLETE" | "TRIALING"> = {
    active: "ACTIVE",
    past_due: "PAST_DUE",
    canceled: "CANCELED",
    incomplete: "INCOMPLETE",
    incomplete_expired: "CANCELED",
    trialing: "TRIALING",
    unpaid: "PAST_DUE",
    paused: "ACTIVE",
  };
  return statusMap[status] || "ACTIVE";
}
