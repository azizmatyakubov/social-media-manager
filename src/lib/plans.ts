import { PlanType } from "@prisma/client";

export interface PlanFeature {
  name: string;
  included: boolean;
  limit?: number | string;
  highlight?: boolean;
}

export interface Plan {
  id: PlanType;
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number; // per month when billed annually
  stripePriceIdMonthly?: string;
  stripePriceIdAnnual?: string;
  popular?: boolean;
  limits: {
    aiGenerations: number; // per month, -1 = unlimited
    scheduledPosts: number; // per month, -1 = unlimited
    xAccounts: number;
  };
  features: PlanFeature[];
}

// Unique differentiators from competitors:
// 1. AI Voice Learning - Learn YOUR writing style (not in Typefully, basic in Hypefury)
// 2. Viral Score Prediction - Predict engagement before posting (Tweet Hunter has this at $99)
// 3. Smart Scheduling - ML-based on YOUR audience data (competitors use generic times)
// 4. Evergreen Recycler - Auto-resurface high-performers (Hypefury has manual, we're smarter)
// 5. Thread Architect - AI optimizes thread structure (unique)
// 6. Trend Radar - Niche-specific trending topics (unique)
// 7. Engagement Insights - "Why" analysis, not just numbers (unique)

export const PLANS: Record<PlanType, Plan> = {
  FREE: {
    id: "FREE",
    name: "Starter",
    description: "Perfect for trying out AutoPost",
    monthlyPrice: 0,
    annualPrice: 0,
    limits: {
      aiGenerations: 10,
      scheduledPosts: 15,
      xAccounts: 1,
    },
    features: [
      { name: "AI post generation", included: true, limit: "10/month" },
      { name: "Scheduled posts", included: true, limit: "15/month" },
      { name: "X account", included: true, limit: "1" },
      { name: "Basic analytics", included: true },
      { name: "Thread support", included: true },
      { name: "AI Voice Learning", included: false },
      { name: "Viral Score Prediction", included: false },
      { name: "Smart Scheduling", included: false },
      { name: "Evergreen Recycler", included: false },
      { name: "Priority support", included: false },
    ],
  },
  CREATOR: {
    id: "CREATOR",
    name: "Creator",
    description: "For serious content creators",
    monthlyPrice: 15,
    annualPrice: 12, // $144/year = $12/month
    limits: {
      aiGenerations: 100,
      scheduledPosts: -1, // unlimited
      xAccounts: 1,
    },
    features: [
      { name: "AI post generation", included: true, limit: "100/month", highlight: true },
      { name: "Scheduled posts", included: true, limit: "Unlimited", highlight: true },
      { name: "X account", included: true, limit: "1" },
      { name: "Advanced analytics", included: true },
      { name: "Thread support", included: true },
      { name: "AI Voice Learning", included: true, highlight: true },
      { name: "Viral Score Prediction", included: true, highlight: true },
      { name: "Smart Scheduling", included: true },
      { name: "Evergreen Recycler", included: false },
      { name: "Email support", included: true },
    ],
  },
  PRO: {
    id: "PRO",
    name: "Pro",
    description: "Full power for growth-focused creators",
    monthlyPrice: 39,
    annualPrice: 29, // $348/year = $29/month
    popular: true,
    limits: {
      aiGenerations: 500,
      scheduledPosts: -1,
      xAccounts: 3,
    },
    features: [
      { name: "AI post generation", included: true, limit: "500/month", highlight: true },
      { name: "Scheduled posts", included: true, limit: "Unlimited" },
      { name: "X accounts", included: true, limit: "3", highlight: true },
      { name: "Advanced analytics", included: true },
      { name: "Thread Architect", included: true, highlight: true },
      { name: "AI Voice Learning", included: true },
      { name: "Viral Score Prediction", included: true },
      { name: "Smart Scheduling", included: true },
      { name: "Evergreen Recycler", included: true, highlight: true },
      { name: "Trend Radar", included: true, highlight: true },
      { name: "Engagement Insights", included: true },
      { name: "Priority support", included: true },
      { name: "API access", included: true },
    ],
  },
  BUSINESS: {
    id: "BUSINESS",
    name: "Business",
    description: "For teams and agencies",
    monthlyPrice: 99,
    annualPrice: 79, // $948/year = $79/month
    limits: {
      aiGenerations: -1, // unlimited
      scheduledPosts: -1,
      xAccounts: 10,
    },
    features: [
      { name: "AI post generation", included: true, limit: "Unlimited", highlight: true },
      { name: "Scheduled posts", included: true, limit: "Unlimited" },
      { name: "X accounts", included: true, limit: "10", highlight: true },
      { name: "Team collaboration", included: true, highlight: true },
      { name: "Advanced analytics", included: true },
      { name: "Thread Architect", included: true },
      { name: "AI Voice Learning", included: true },
      { name: "Viral Score Prediction", included: true },
      { name: "Smart Scheduling", included: true },
      { name: "Evergreen Recycler", included: true },
      { name: "Trend Radar", included: true },
      { name: "Engagement Insights", included: true },
      { name: "Custom AI training", included: true, highlight: true },
      { name: "White-label reports", included: true },
      { name: "Dedicated support", included: true },
      { name: "Advanced API access", included: true },
    ],
  },
};

export const PLAN_ORDER: PlanType[] = ["FREE", "CREATOR", "PRO", "BUSINESS"];

export function getPlan(planType: PlanType): Plan {
  return PLANS[planType];
}

export function getPlanLimits(planType: PlanType) {
  return PLANS[planType].limits;
}

export function canAccessFeature(planType: PlanType, feature: string): boolean {
  const plan = PLANS[planType];
  const featureObj = plan.features.find((f) => f.name === feature);
  return featureObj?.included ?? false;
}

export function getUpgradePlan(currentPlan: PlanType): PlanType | null {
  const currentIndex = PLAN_ORDER.indexOf(currentPlan);
  if (currentIndex < PLAN_ORDER.length - 1) {
    return PLAN_ORDER[currentIndex + 1];
  }
  return null;
}

// Feature descriptions for marketing
export const FEATURE_DESCRIPTIONS: Record<string, { title: string; description: string }> = {
  "AI Voice Learning": {
    title: "AI Voice Learning",
    description: "Our AI learns your unique writing style from your past posts, creating content that sounds authentically you.",
  },
  "Viral Score Prediction": {
    title: "Viral Score Prediction",
    description: "Predict how well your post will perform before you publish. Get engagement estimates based on ML analysis.",
  },
  "Smart Scheduling": {
    title: "Smart Scheduling",
    description: "Forget generic 'best times'. Our ML analyzes YOUR audience to find when THEY are most active.",
  },
  "Evergreen Recycler": {
    title: "Evergreen Recycler",
    description: "Automatically resurface your best-performing evergreen content at optimal intervals.",
  },
  "Thread Architect": {
    title: "Thread Architect",
    description: "AI-powered thread optimization with attention-grabbing hooks, perfect pacing, and compelling CTAs.",
  },
  "Trend Radar": {
    title: "Trend Radar",
    description: "Real-time trending topics in YOUR niche. Get AI-suggested posts based on what's hot right now.",
  },
  "Engagement Insights": {
    title: "Engagement Insights",
    description: "Go beyond numbers. Understand WHY your posts performed well with AI-powered analysis.",
  },
  "Custom AI training": {
    title: "Custom AI Training",
    description: "Train the AI on your brand voice, guidelines, and preferred topics for truly personalized content.",
  },
};
