import { prisma } from "./prisma";
import { getPlanLimits, PLANS, type Plan } from "./plans";
import { PlanType, UsageType, SubscriptionStatus } from "@prisma/client";

export interface SubscriptionWithUsage {
  id: string;
  userId: string;
  plan: PlanType;
  status: SubscriptionStatus;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  usage: {
    aiGenerations: { count: number; limit: number };
    scheduledPosts: { count: number; limit: number };
    xAccounts: { count: number; limit: number };
  };
}

// Get or create subscription for user
export async function getOrCreateSubscription(userId: string): Promise<SubscriptionWithUsage> {
  let subscription = await prisma.subscription.findUnique({
    where: { userId },
    include: { usage: true },
  });

  if (!subscription) {
    // Create free subscription for new users
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    subscription = await prisma.subscription.create({
      data: {
        userId,
        plan: "FREE",
        status: "ACTIVE",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
      include: { usage: true },
    });
  }

  // Ensure usage records exist for current period
  const usage = await ensureUsageRecords(subscription.id, subscription.plan);

  return {
    id: subscription.id,
    userId: subscription.userId,
    plan: subscription.plan,
    status: subscription.status,
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    usage,
  };
}

// Ensure usage records exist for current billing period
async function ensureUsageRecords(subscriptionId: string, plan: PlanType) {
  const limits = getPlanLimits(plan);
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const usageTypes: UsageType[] = ["AI_GENERATIONS", "SCHEDULED_POSTS", "X_ACCOUNTS"];
  const limitMap: Record<UsageType, number> = {
    AI_GENERATIONS: limits.aiGenerations,
    SCHEDULED_POSTS: limits.scheduledPosts,
    X_ACCOUNTS: limits.xAccounts,
  };

  const usageRecords = {
    aiGenerations: { count: 0, limit: limits.aiGenerations },
    scheduledPosts: { count: 0, limit: limits.scheduledPosts },
    xAccounts: { count: 0, limit: limits.xAccounts },
  };

  for (const type of usageTypes) {
    const existing = await prisma.usage.findUnique({
      where: {
        subscriptionId_type_periodStart: {
          subscriptionId,
          type,
          periodStart,
        },
      },
    });

    if (existing) {
      const key = type === "AI_GENERATIONS" ? "aiGenerations" :
                  type === "SCHEDULED_POSTS" ? "scheduledPosts" : "xAccounts";
      usageRecords[key] = { count: existing.count, limit: existing.limit };
    } else {
      await prisma.usage.create({
        data: {
          subscriptionId,
          type,
          count: 0,
          limit: limitMap[type],
          periodStart,
          periodEnd,
        },
      });
    }
  }

  return usageRecords;
}

// Check if user can perform an action
export async function canPerformAction(
  userId: string,
  action: UsageType
): Promise<{ allowed: boolean; current: number; limit: number; message?: string }> {
  const subscription = await getOrCreateSubscription(userId);

  const usageKey = action === "AI_GENERATIONS" ? "aiGenerations" :
                   action === "SCHEDULED_POSTS" ? "scheduledPosts" : "xAccounts";

  const { count, limit } = subscription.usage[usageKey];

  // -1 means unlimited
  if (limit === -1) {
    return { allowed: true, current: count, limit };
  }

  if (count >= limit) {
    const planName = PLANS[subscription.plan].name;
    return {
      allowed: false,
      current: count,
      limit,
      message: `You've reached your ${usageKey} limit (${limit}) on the ${planName} plan. Upgrade to continue.`,
    };
  }

  return { allowed: true, current: count, limit };
}

// Increment usage counter
export async function incrementUsage(userId: string, action: UsageType): Promise<void> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription) {
    throw new Error("No subscription found");
  }

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

  await prisma.usage.update({
    where: {
      subscriptionId_type_periodStart: {
        subscriptionId: subscription.id,
        type: action,
        periodStart,
      },
    },
    data: {
      count: { increment: 1 },
    },
  });
}

// Get subscription details with plan info
export async function getSubscriptionDetails(userId: string): Promise<{
  subscription: SubscriptionWithUsage;
  plan: Plan;
}> {
  const subscription = await getOrCreateSubscription(userId);
  const plan = PLANS[subscription.plan];

  return { subscription, plan };
}

// Check feature access
export async function hasFeatureAccess(userId: string, feature: string): Promise<boolean> {
  const subscription = await getOrCreateSubscription(userId);
  const plan = PLANS[subscription.plan];

  const featureObj = plan.features.find((f) => f.name === feature);
  return featureObj?.included ?? false;
}

// Upgrade subscription (called after Stripe webhook confirms payment)
export async function upgradeSubscription(
  userId: string,
  newPlan: PlanType,
  stripeData?: {
    customerId: string;
    subscriptionId: string;
    priceId: string;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
  }
): Promise<void> {
  const newLimits = getPlanLimits(newPlan);

  await prisma.$transaction(async (tx) => {
    // Update subscription
    const subscription = await tx.subscription.update({
      where: { userId },
      data: {
        plan: newPlan,
        status: "ACTIVE",
        ...(stripeData && {
          stripeCustomerId: stripeData.customerId,
          stripeSubscriptionId: stripeData.subscriptionId,
          stripePriceId: stripeData.priceId,
          currentPeriodStart: stripeData.currentPeriodStart,
          currentPeriodEnd: stripeData.currentPeriodEnd,
        }),
      },
    });

    // Update usage limits for current period
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const usageTypes: { type: UsageType; limit: number }[] = [
      { type: "AI_GENERATIONS", limit: newLimits.aiGenerations },
      { type: "SCHEDULED_POSTS", limit: newLimits.scheduledPosts },
      { type: "X_ACCOUNTS", limit: newLimits.xAccounts },
    ];

    for (const { type, limit } of usageTypes) {
      await tx.usage.updateMany({
        where: {
          subscriptionId: subscription.id,
          type,
          periodStart,
        },
        data: { limit },
      });
    }
  });
}

// Cancel subscription (sets cancel at period end)
export async function cancelSubscription(userId: string): Promise<void> {
  await prisma.subscription.update({
    where: { userId },
    data: { cancelAtPeriodEnd: true },
  });
}

// Reactivate subscription
export async function reactivateSubscription(userId: string): Promise<void> {
  await prisma.subscription.update({
    where: { userId },
    data: { cancelAtPeriodEnd: false },
  });
}

// Calculate usage percentage
export function getUsagePercentage(current: number, limit: number): number {
  if (limit === -1) return 0; // Unlimited
  if (limit === 0) return 100;
  return Math.min(Math.round((current / limit) * 100), 100);
}

// Check if approaching limit (80% used)
export function isApproachingLimit(current: number, limit: number): boolean {
  if (limit === -1) return false;
  return current >= limit * 0.8;
}
