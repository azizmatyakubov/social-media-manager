// Dynamic Pricing Calculator for Social Media Ads

export interface AdCampaign {
  id: string;
  userId: string;
  name: string;
  platform: string;
  objective: AdObjective;
  targetAudience: TargetAudience;
  budget: BudgetSettings;
  bidding: BiddingStrategy;
  creative: CreativeSettings;
  schedule: CampaignSchedule;
  projections: CampaignProjections;
  status: "draft" | "active" | "paused" | "completed";
  createdAt: Date;
  updatedAt: Date;
}

export type AdObjective =
  | "awareness"
  | "reach"
  | "traffic"
  | "engagement"
  | "app_installs"
  | "video_views"
  | "lead_generation"
  | "conversions"
  | "catalog_sales";

export interface TargetAudience {
  locations: string[];
  ageRange: { min: number; max: number };
  genders: string[];
  interests: string[];
  behaviors: string[];
  customAudiences: string[];
  estimatedReach: number;
  audienceQuality: "broad" | "moderate" | "narrow";
}

export interface BudgetSettings {
  type: "daily" | "lifetime";
  amount: number;
  currency: string;
  spendLimit?: number;
  pacing: "standard" | "accelerated";
}

export interface BiddingStrategy {
  type: "auto" | "manual" | "target_cost" | "bid_cap" | "cost_cap";
  bidAmount?: number;
  targetCost?: number;
  optimizationGoal: string;
}

export interface CreativeSettings {
  format: "image" | "video" | "carousel" | "collection" | "stories";
  placements: string[];
  callToAction: string;
}

export interface CampaignSchedule {
  startDate: Date;
  endDate?: Date;
  dayParting?: {
    enabled: boolean;
    schedule: Record<string, { start: number; end: number }[]>;
  };
}

export interface CampaignProjections {
  impressions: { min: number; max: number };
  reach: { min: number; max: number };
  clicks: { min: number; max: number };
  ctr: { min: number; max: number };
  cpc: { min: number; max: number };
  cpm: { min: number; max: number };
  conversions: { min: number; max: number };
  costPerConversion: { min: number; max: number };
  roas: { min: number; max: number };
  totalSpend: number;
}

export interface PlatformRates {
  platform: string;
  avgCPM: number;
  avgCPC: number;
  avgCTR: number;
  avgConversionRate: number;
  minBudget: number;
  competitionLevel: "low" | "medium" | "high";
}

export interface IndustryBenchmark {
  industry: string;
  platform: string;
  avgCPM: number;
  avgCPC: number;
  avgCTR: number;
  avgConversionRate: number;
  avgROAS: number;
}

export interface BudgetRecommendation {
  minBudget: number;
  recommendedBudget: number;
  optimalBudget: number;
  reasoning: string;
  expectedResults: {
    impressions: number;
    clicks: number;
    conversions: number;
    roi: number;
  };
}

export interface PricingScenario {
  id: string;
  name: string;
  budget: number;
  projections: CampaignProjections;
  comparison: {
    impressionsPerDollar: number;
    clicksPerDollar: number;
    conversionsPerDollar: number;
    efficiency: number; // 0-100
  };
}

// Platform rate defaults
const PLATFORM_RATES: Record<string, PlatformRates> = {
  facebook: {
    platform: "Facebook",
    avgCPM: 11.54,
    avgCPC: 0.97,
    avgCTR: 1.11,
    avgConversionRate: 9.21,
    minBudget: 1,
    competitionLevel: "high",
  },
  instagram: {
    platform: "Instagram",
    avgCPM: 8.96,
    avgCPC: 1.17,
    avgCTR: 0.94,
    avgConversionRate: 8.07,
    minBudget: 1,
    competitionLevel: "high",
  },
  twitter: {
    platform: "X (Twitter)",
    avgCPM: 6.46,
    avgCPC: 0.58,
    avgCTR: 1.35,
    avgConversionRate: 6.82,
    minBudget: 1,
    competitionLevel: "medium",
  },
  linkedin: {
    platform: "LinkedIn",
    avgCPM: 33.80,
    avgCPC: 5.58,
    avgCTR: 0.44,
    avgConversionRate: 6.10,
    minBudget: 10,
    competitionLevel: "high",
  },
  tiktok: {
    platform: "TikTok",
    avgCPM: 10.00,
    avgCPC: 1.00,
    avgCTR: 1.02,
    avgConversionRate: 7.50,
    minBudget: 20,
    competitionLevel: "medium",
  },
  youtube: {
    platform: "YouTube",
    avgCPM: 9.68,
    avgCPC: 0.11,
    avgCTR: 0.65,
    avgConversionRate: 4.50,
    minBudget: 10,
    competitionLevel: "high",
  },
  pinterest: {
    platform: "Pinterest",
    avgCPM: 5.50,
    avgCPC: 0.44,
    avgCTR: 1.50,
    avgConversionRate: 8.50,
    minBudget: 1,
    competitionLevel: "low",
  },
};

// Industry benchmarks
const INDUSTRY_BENCHMARKS: IndustryBenchmark[] = [
  { industry: "E-commerce", platform: "facebook", avgCPM: 14.2, avgCPC: 1.07, avgCTR: 1.32, avgConversionRate: 10.23, avgROAS: 4.2 },
  { industry: "E-commerce", platform: "instagram", avgCPM: 10.5, avgCPC: 1.35, avgCTR: 1.10, avgConversionRate: 9.87, avgROAS: 3.8 },
  { industry: "SaaS", platform: "linkedin", avgCPM: 38.5, avgCPC: 6.50, avgCTR: 0.52, avgConversionRate: 5.50, avgROAS: 2.5 },
  { industry: "SaaS", platform: "facebook", avgCPM: 12.8, avgCPC: 1.25, avgCTR: 0.98, avgConversionRate: 4.20, avgROAS: 2.2 },
  { industry: "Retail", platform: "facebook", avgCPM: 11.2, avgCPC: 0.85, avgCTR: 1.45, avgConversionRate: 11.50, avgROAS: 5.0 },
  { industry: "Finance", platform: "linkedin", avgCPM: 42.0, avgCPC: 7.80, avgCTR: 0.42, avgConversionRate: 4.80, avgROAS: 3.2 },
  { industry: "Healthcare", platform: "facebook", avgCPM: 9.8, avgCPC: 0.92, avgCTR: 1.08, avgConversionRate: 7.20, avgROAS: 2.8 },
  { industry: "Education", platform: "facebook", avgCPM: 8.5, avgCPC: 0.78, avgCTR: 1.22, avgConversionRate: 8.50, avgROAS: 3.5 },
  { industry: "Travel", platform: "instagram", avgCPM: 7.8, avgCPC: 0.95, avgCTR: 1.35, avgConversionRate: 6.80, avgROAS: 4.5 },
  { industry: "Real Estate", platform: "facebook", avgCPM: 13.5, avgCPC: 1.45, avgCTR: 0.95, avgConversionRate: 5.20, avgROAS: 2.0 },
];

// In-memory storage
const campaignsStore = new Map<string, AdCampaign>();
const scenariosStore = new Map<string, PricingScenario[]>();

// Helper functions
function calculateProjections(
  platform: string,
  budget: number,
  days: number,
  objective: AdObjective,
  audienceQuality: "broad" | "moderate" | "narrow"
): CampaignProjections {
  const rates = PLATFORM_RATES[platform] || PLATFORM_RATES.facebook;

  // Adjust rates based on audience quality
  const audienceMultiplier = {
    broad: 0.85,
    moderate: 1.0,
    narrow: 1.25,
  }[audienceQuality];

  // Adjust based on objective
  const objectiveMultipliers: Record<AdObjective, { cpm: number; ctr: number; conv: number }> = {
    awareness: { cpm: 0.8, ctr: 0.6, conv: 0.3 },
    reach: { cpm: 0.7, ctr: 0.5, conv: 0.2 },
    traffic: { cpm: 1.0, ctr: 1.2, conv: 0.5 },
    engagement: { cpm: 0.9, ctr: 1.4, conv: 0.4 },
    app_installs: { cpm: 1.1, ctr: 0.8, conv: 1.0 },
    video_views: { cpm: 0.6, ctr: 0.4, conv: 0.3 },
    lead_generation: { cpm: 1.2, ctr: 0.9, conv: 0.8 },
    conversions: { cpm: 1.3, ctr: 1.0, conv: 1.2 },
    catalog_sales: { cpm: 1.2, ctr: 1.1, conv: 1.1 },
  };

  const objMult = objectiveMultipliers[objective];

  const adjustedCPM = rates.avgCPM * audienceMultiplier * objMult.cpm;
  const adjustedCTR = rates.avgCTR * objMult.ctr;
  const adjustedConvRate = rates.avgConversionRate * objMult.conv;

  const totalBudget = budget * days;
  const impressions = (totalBudget / adjustedCPM) * 1000;
  const clicks = impressions * (adjustedCTR / 100);
  const conversions = clicks * (adjustedConvRate / 100);
  const cpc = totalBudget / clicks;
  const costPerConversion = conversions > 0 ? totalBudget / conversions : 0;

  // Assume average order value of $50 for ROAS calculation
  const avgOrderValue = 50;
  const roas = conversions > 0 ? (conversions * avgOrderValue) / totalBudget : 0;

  // Add variance (±20% for min/max)
  const variance = 0.2;

  return {
    impressions: {
      min: Math.round(impressions * (1 - variance)),
      max: Math.round(impressions * (1 + variance)),
    },
    reach: {
      min: Math.round(impressions * 0.6 * (1 - variance)),
      max: Math.round(impressions * 0.8 * (1 + variance)),
    },
    clicks: {
      min: Math.round(clicks * (1 - variance)),
      max: Math.round(clicks * (1 + variance)),
    },
    ctr: {
      min: Math.round((adjustedCTR * (1 - variance)) * 100) / 100,
      max: Math.round((adjustedCTR * (1 + variance)) * 100) / 100,
    },
    cpc: {
      min: Math.round((cpc * (1 - variance)) * 100) / 100,
      max: Math.round((cpc * (1 + variance)) * 100) / 100,
    },
    cpm: {
      min: Math.round((adjustedCPM * (1 - variance)) * 100) / 100,
      max: Math.round((adjustedCPM * (1 + variance)) * 100) / 100,
    },
    conversions: {
      min: Math.round(conversions * (1 - variance)),
      max: Math.round(conversions * (1 + variance)),
    },
    costPerConversion: {
      min: Math.round((costPerConversion * (1 - variance)) * 100) / 100,
      max: Math.round((costPerConversion * (1 + variance)) * 100) / 100,
    },
    roas: {
      min: Math.round((roas * (1 - variance)) * 100) / 100,
      max: Math.round((roas * (1 + variance)) * 100) / 100,
    },
    totalSpend: totalBudget,
  };
}

// Generate demo campaigns
function initializeDemoData(userId: string): void {
  const demoKey = `demo-${userId}`;
  if (campaignsStore.has(demoKey)) return;

  const demoCampaign: AdCampaign = {
    id: demoKey,
    userId,
    name: "Summer Sale Campaign",
    platform: "facebook",
    objective: "conversions",
    targetAudience: {
      locations: ["United States", "Canada"],
      ageRange: { min: 25, max: 54 },
      genders: ["all"],
      interests: ["Online shopping", "Fashion", "Summer activities"],
      behaviors: ["Engaged shoppers"],
      customAudiences: [],
      estimatedReach: 2500000,
      audienceQuality: "moderate",
    },
    budget: {
      type: "daily",
      amount: 50,
      currency: "USD",
      pacing: "standard",
    },
    bidding: {
      type: "auto",
      optimizationGoal: "conversions",
    },
    creative: {
      format: "carousel",
      placements: ["feed", "stories", "reels"],
      callToAction: "Shop Now",
    },
    schedule: {
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    projections: calculateProjections("facebook", 50, 30, "conversions", "moderate"),
    status: "active",
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),
  };

  campaignsStore.set(demoKey, demoCampaign);
}

// API Functions
export function getUserCampaigns(userId: string): AdCampaign[] {
  initializeDemoData(userId);
  return Array.from(campaignsStore.values())
    .filter((c) => c.userId === userId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function getCampaign(campaignId: string): AdCampaign | null {
  return campaignsStore.get(campaignId) || null;
}

export function createCampaign(
  userId: string,
  data: Omit<AdCampaign, "id" | "userId" | "projections" | "createdAt" | "updatedAt">
): AdCampaign {
  const days = data.schedule.endDate
    ? Math.ceil((new Date(data.schedule.endDate).getTime() - new Date(data.schedule.startDate).getTime()) / (1000 * 60 * 60 * 24))
    : 30;

  const projections = calculateProjections(
    data.platform,
    data.budget.amount,
    days,
    data.objective,
    data.targetAudience.audienceQuality
  );

  const campaign: AdCampaign = {
    ...data,
    id: `campaign-${Date.now()}`,
    userId,
    projections,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  campaignsStore.set(campaign.id, campaign);
  return campaign;
}

export function updateCampaign(
  campaignId: string,
  userId: string,
  updates: Partial<AdCampaign>
): AdCampaign | null {
  const campaign = campaignsStore.get(campaignId);
  if (!campaign || campaign.userId !== userId) return null;

  const updated = { ...campaign, ...updates, updatedAt: new Date() };

  // Recalculate projections if relevant fields changed
  if (updates.budget || updates.platform || updates.objective || updates.targetAudience || updates.schedule) {
    const days = updated.schedule.endDate
      ? Math.ceil((new Date(updated.schedule.endDate).getTime() - new Date(updated.schedule.startDate).getTime()) / (1000 * 60 * 60 * 24))
      : 30;
    updated.projections = calculateProjections(
      updated.platform,
      updated.budget.amount,
      days,
      updated.objective,
      updated.targetAudience.audienceQuality
    );
  }

  campaignsStore.set(campaignId, updated);
  return updated;
}

export function deleteCampaign(campaignId: string, userId: string): boolean {
  const campaign = campaignsStore.get(campaignId);
  if (!campaign || campaign.userId !== userId) return false;
  return campaignsStore.delete(campaignId);
}

export function calculateBudgetRecommendation(
  platform: string,
  objective: AdObjective,
  targetReach: number,
  industry?: string
): BudgetRecommendation {
  const rates = PLATFORM_RATES[platform] || PLATFORM_RATES.facebook;
  const benchmark = industry
    ? INDUSTRY_BENCHMARKS.find((b) => b.industry === industry && b.platform === platform)
    : null;

  const effectiveCPM = benchmark?.avgCPM || rates.avgCPM;
  const effectiveCTR = benchmark?.avgCTR || rates.avgCTR;
  const effectiveConvRate = benchmark?.avgConversionRate || rates.avgConversionRate;

  // Calculate budget needed for target reach
  const impressionsNeeded = targetReach * 3; // Assume 3 impressions per unique reach
  const minBudget = Math.max(rates.minBudget * 7, (impressionsNeeded / 1000) * effectiveCPM * 0.5);
  const recommendedBudget = (impressionsNeeded / 1000) * effectiveCPM;
  const optimalBudget = recommendedBudget * 1.5;

  const expectedClicks = (impressionsNeeded * effectiveCTR) / 100;
  const expectedConversions = (expectedClicks * effectiveConvRate) / 100;

  return {
    minBudget: Math.round(minBudget),
    recommendedBudget: Math.round(recommendedBudget),
    optimalBudget: Math.round(optimalBudget),
    reasoning: `Based on ${rates.platform} average CPM of $${effectiveCPM.toFixed(2)} and your target reach of ${targetReach.toLocaleString()}, we recommend a budget that allows for adequate frequency and optimization.`,
    expectedResults: {
      impressions: impressionsNeeded,
      clicks: Math.round(expectedClicks),
      conversions: Math.round(expectedConversions),
      roi: benchmark?.avgROAS || 2.5,
    },
  };
}

export function generatePricingScenarios(
  platform: string,
  objective: AdObjective,
  baseBudget: number,
  days: number
): PricingScenario[] {
  const budgets = [
    baseBudget * 0.5,
    baseBudget * 0.75,
    baseBudget,
    baseBudget * 1.5,
    baseBudget * 2,
  ];

  return budgets.map((budget, index) => {
    const projections = calculateProjections(platform, budget, days, objective, "moderate");
    const avgImpressions = (projections.impressions.min + projections.impressions.max) / 2;
    const avgClicks = (projections.clicks.min + projections.clicks.max) / 2;
    const avgConversions = (projections.conversions.min + projections.conversions.max) / 2;
    const totalSpend = projections.totalSpend;

    return {
      id: `scenario-${index}`,
      name: ["Conservative", "Moderate", "Recommended", "Growth", "Aggressive"][index],
      budget: budget * days,
      projections,
      comparison: {
        impressionsPerDollar: avgImpressions / totalSpend,
        clicksPerDollar: avgClicks / totalSpend,
        conversionsPerDollar: avgConversions / totalSpend,
        efficiency: Math.min(100, Math.round(((avgConversions / totalSpend) * 100) * 10)),
      },
    };
  });
}

export function getPlatformRates(): PlatformRates[] {
  return Object.values(PLATFORM_RATES);
}

export function getIndustryBenchmarks(platform?: string, industry?: string): IndustryBenchmark[] {
  return INDUSTRY_BENCHMARKS.filter(
    (b) => (!platform || b.platform === platform) && (!industry || b.industry === industry)
  );
}

export function getAdPricingStats(userId: string): {
  totalCampaigns: number;
  activeCampaigns: number;
  totalBudget: number;
  projectedImpressions: number;
  projectedConversions: number;
  avgCPC: number;
  avgROAS: number;
} {
  initializeDemoData(userId);
  const campaigns = getUserCampaigns(userId);
  const activeCampaigns = campaigns.filter((c) => c.status === "active");

  const totalBudget = campaigns.reduce((sum, c) => sum + c.projections.totalSpend, 0);
  const projectedImpressions = campaigns.reduce(
    (sum, c) => sum + (c.projections.impressions.min + c.projections.impressions.max) / 2,
    0
  );
  const projectedConversions = campaigns.reduce(
    (sum, c) => sum + (c.projections.conversions.min + c.projections.conversions.max) / 2,
    0
  );

  const avgCPC = campaigns.length > 0
    ? campaigns.reduce((sum, c) => sum + (c.projections.cpc.min + c.projections.cpc.max) / 2, 0) / campaigns.length
    : 0;

  const avgROAS = campaigns.length > 0
    ? campaigns.reduce((sum, c) => sum + (c.projections.roas.min + c.projections.roas.max) / 2, 0) / campaigns.length
    : 0;

  return {
    totalCampaigns: campaigns.length,
    activeCampaigns: activeCampaigns.length,
    totalBudget: Math.round(totalBudget),
    projectedImpressions: Math.round(projectedImpressions),
    projectedConversions: Math.round(projectedConversions),
    avgCPC: Math.round(avgCPC * 100) / 100,
    avgROAS: Math.round(avgROAS * 100) / 100,
  };
}

export const AD_OBJECTIVES: { value: AdObjective; label: string; description: string }[] = [
  { value: "awareness", label: "Brand Awareness", description: "Increase awareness of your brand" },
  { value: "reach", label: "Reach", description: "Show your ad to the maximum number of people" },
  { value: "traffic", label: "Traffic", description: "Drive traffic to your website" },
  { value: "engagement", label: "Engagement", description: "Get more likes, comments, and shares" },
  { value: "app_installs", label: "App Installs", description: "Get more people to install your app" },
  { value: "video_views", label: "Video Views", description: "Get more people to watch your videos" },
  { value: "lead_generation", label: "Lead Generation", description: "Collect leads for your business" },
  { value: "conversions", label: "Conversions", description: "Drive valuable actions on your website" },
  { value: "catalog_sales", label: "Catalog Sales", description: "Show products from your catalog" },
];

export const INDUSTRIES = [
  "E-commerce",
  "SaaS",
  "Retail",
  "Finance",
  "Healthcare",
  "Education",
  "Travel",
  "Real Estate",
  "Food & Beverage",
  "Entertainment",
  "Technology",
  "Automotive",
];
