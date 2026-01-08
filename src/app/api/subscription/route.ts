import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSubscriptionDetails, getUsagePercentage, isApproachingLimit } from "@/lib/subscription";
import { PLAN_ORDER, getUpgradePlan, FEATURE_DESCRIPTIONS } from "@/lib/plans";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { subscription, plan } = await getSubscriptionDetails(session.user.id);

    // Calculate usage percentages and warnings
    const usageStats = {
      aiGenerations: {
        ...subscription.usage.aiGenerations,
        percentage: getUsagePercentage(
          subscription.usage.aiGenerations.count,
          subscription.usage.aiGenerations.limit
        ),
        approaching: isApproachingLimit(
          subscription.usage.aiGenerations.count,
          subscription.usage.aiGenerations.limit
        ),
        unlimited: subscription.usage.aiGenerations.limit === -1,
      },
      scheduledPosts: {
        ...subscription.usage.scheduledPosts,
        percentage: getUsagePercentage(
          subscription.usage.scheduledPosts.count,
          subscription.usage.scheduledPosts.limit
        ),
        approaching: isApproachingLimit(
          subscription.usage.scheduledPosts.count,
          subscription.usage.scheduledPosts.limit
        ),
        unlimited: subscription.usage.scheduledPosts.limit === -1,
      },
      xAccounts: {
        ...subscription.usage.xAccounts,
        percentage: getUsagePercentage(
          subscription.usage.xAccounts.count,
          subscription.usage.xAccounts.limit
        ),
        approaching: isApproachingLimit(
          subscription.usage.xAccounts.count,
          subscription.usage.xAccounts.limit
        ),
        unlimited: subscription.usage.xAccounts.limit === -1,
      },
    };

    const upgradePlan = getUpgradePlan(subscription.plan);

    return NextResponse.json({
      subscription: {
        id: subscription.id,
        plan: subscription.plan,
        planName: plan.name,
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      },
      plan: {
        ...plan,
        features: plan.features.map((f) => ({
          ...f,
          description: FEATURE_DESCRIPTIONS[f.name]?.description,
        })),
      },
      usage: usageStats,
      upgradePlan: upgradePlan,
      planOrder: PLAN_ORDER,
    });
  } catch (error) {
    console.error("Error fetching subscription:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription" },
      { status: 500 }
    );
  }
}
