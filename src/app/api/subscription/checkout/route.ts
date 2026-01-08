import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PLANS } from "@/lib/plans";
import { PlanType } from "@prisma/client";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { planId, billingInterval } = await request.json();

    // Validate plan
    if (!planId || !["CREATOR", "PRO", "BUSINESS"].includes(planId)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    if (!billingInterval || !["monthly", "annual"].includes(billingInterval)) {
      return NextResponse.json({ error: "Invalid billing interval" }, { status: 400 });
    }

    const plan = PLANS[planId as PlanType];
    const priceId = billingInterval === "annual"
      ? plan.stripePriceIdAnnual
      : plan.stripePriceIdMonthly;

    // Get or create Stripe customer
    let subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    });

    let customerId = subscription?.stripeCustomerId;

    if (!customerId) {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: session.user.email,
        name: session.user.name || undefined,
        metadata: {
          userId: session.user.id,
        },
      });
      customerId = customer.id;

      // Update or create subscription record with customer ID
      if (subscription) {
        await prisma.subscription.update({
          where: { userId: session.user.id },
          data: { stripeCustomerId: customerId },
        });
      } else {
        await prisma.subscription.create({
          data: {
            userId: session.user.id,
            plan: "FREE",
            status: "ACTIVE",
            stripeCustomerId: customerId,
          },
        });
      }
    }

    // If no Stripe price IDs are configured, return info for manual setup
    if (!priceId) {
      // For development/testing without Stripe prices configured
      return NextResponse.json({
        message: "Stripe prices not configured",
        plan: planId,
        interval: billingInterval,
        price: billingInterval === "annual" ? plan.annualPrice * 12 : plan.monthlyPrice,
        // In production, you'd return a checkout URL
        setupRequired: true,
      });
    }

    // Create Stripe Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?success=true&plan=${planId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
      metadata: {
        userId: session.user.id,
        planId,
        billingInterval,
      },
      subscription_data: {
        metadata: {
          userId: session.user.id,
          planId,
        },
      },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
