export interface ROIMetrics {
  totalInvestment: number;
  totalRevenue: number;
  roi: number;
  costPerLead: number;
  costPerAcquisition: number;
  customerLifetimeValue: number;
  socialMediaValue: number;
}

export interface CampaignROI {
  id: string;
  userId: string;
  name: string;
  platform: string;
  startDate: Date;
  endDate: Date;
  investment: {
    adSpend: number;
    contentCreation: number;
    tools: number;
    labor: number;
    influencer: number;
    other: number;
  };
  results: {
    impressions: number;
    reach: number;
    engagement: number;
    clicks: number;
    leads: number;
    conversions: number;
    revenue: number;
  };
  metrics?: ROIMetrics;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ROIGoal {
  id: string;
  userId: string;
  name: string;
  targetROI: number;
  targetRevenue: number;
  targetLeads: number;
  targetConversions: number;
  deadline: Date;
  currentProgress: number;
  status: "on_track" | "at_risk" | "behind" | "achieved";
  createdAt: Date;
}

// In-memory storage
const campaignROIs = new Map<string, CampaignROI>();
const userCampaigns = new Map<string, Set<string>>();
const roiGoals = new Map<string, ROIGoal>();
const userGoals = new Map<string, Set<string>>();

export function calculateROI(
  investment: CampaignROI["investment"],
  results: CampaignROI["results"],
  customerLifetimeValue: number = 0
): ROIMetrics {
  const totalInvestment =
    investment.adSpend +
    investment.contentCreation +
    investment.tools +
    investment.labor +
    investment.influencer +
    investment.other;

  const totalRevenue = results.revenue;

  // Basic ROI calculation: (Revenue - Investment) / Investment * 100
  const roi = totalInvestment > 0 ? ((totalRevenue - totalInvestment) / totalInvestment) * 100 : 0;

  // Cost per lead
  const costPerLead = results.leads > 0 ? totalInvestment / results.leads : 0;

  // Cost per acquisition (conversion)
  const costPerAcquisition = results.conversions > 0 ? totalInvestment / results.conversions : 0;

  // Social media value calculation (engagement-based)
  // Using industry estimates: Like = $0.10, Comment = $0.50, Share = $1.00, Click = $0.25
  const engagementValue = results.engagement * 0.25;
  const clickValue = results.clicks * 0.25;
  const leadValue = results.leads * 10; // $10 per lead
  const conversionValue = results.conversions * customerLifetimeValue;

  const socialMediaValue = engagementValue + clickValue + leadValue + conversionValue;

  return {
    totalInvestment,
    totalRevenue,
    roi: Math.round(roi * 100) / 100,
    costPerLead: Math.round(costPerLead * 100) / 100,
    costPerAcquisition: Math.round(costPerAcquisition * 100) / 100,
    customerLifetimeValue,
    socialMediaValue: Math.round(socialMediaValue * 100) / 100,
  };
}

export function calculatePlatformROI(campaigns: CampaignROI[]): Record<string, ROIMetrics> {
  const platformData: Record<string, { investment: CampaignROI["investment"]; results: CampaignROI["results"] }> = {};

  for (const campaign of campaigns) {
    if (!platformData[campaign.platform]) {
      platformData[campaign.platform] = {
        investment: { adSpend: 0, contentCreation: 0, tools: 0, labor: 0, influencer: 0, other: 0 },
        results: { impressions: 0, reach: 0, engagement: 0, clicks: 0, leads: 0, conversions: 0, revenue: 0 },
      };
    }

    const pd = platformData[campaign.platform];
    pd.investment.adSpend += campaign.investment.adSpend;
    pd.investment.contentCreation += campaign.investment.contentCreation;
    pd.investment.tools += campaign.investment.tools;
    pd.investment.labor += campaign.investment.labor;
    pd.investment.influencer += campaign.investment.influencer;
    pd.investment.other += campaign.investment.other;

    pd.results.impressions += campaign.results.impressions;
    pd.results.reach += campaign.results.reach;
    pd.results.engagement += campaign.results.engagement;
    pd.results.clicks += campaign.results.clicks;
    pd.results.leads += campaign.results.leads;
    pd.results.conversions += campaign.results.conversions;
    pd.results.revenue += campaign.results.revenue;
  }

  const platformROI: Record<string, ROIMetrics> = {};
  for (const [platform, data] of Object.entries(platformData)) {
    platformROI[platform] = calculateROI(data.investment, data.results);
  }

  return platformROI;
}

export function getROIInsights(metrics: ROIMetrics): {
  summary: string;
  suggestions: string[];
  healthScore: number;
} {
  const suggestions: string[] = [];
  let healthScore = 50; // Base score

  // Analyze ROI
  if (metrics.roi >= 200) {
    healthScore += 30;
  } else if (metrics.roi >= 100) {
    healthScore += 20;
  } else if (metrics.roi >= 50) {
    healthScore += 10;
  } else if (metrics.roi < 0) {
    healthScore -= 20;
    suggestions.push("Consider optimizing ad targeting to reduce wasted spend");
    suggestions.push("Review content strategy to improve engagement-to-conversion ratio");
  }

  // Analyze cost per acquisition
  if (metrics.costPerAcquisition > metrics.customerLifetimeValue && metrics.customerLifetimeValue > 0) {
    healthScore -= 15;
    suggestions.push("Customer acquisition cost exceeds lifetime value - optimize conversion funnel");
  }

  // Analyze cost per lead
  if (metrics.costPerLead > 50) {
    suggestions.push("Consider lead magnet improvements to reduce cost per lead");
  }

  // Social media value analysis
  if (metrics.socialMediaValue > metrics.totalInvestment) {
    healthScore += 10;
  }

  // Generate summary
  let summary = "";
  if (metrics.roi >= 100) {
    summary = "Excellent ROI! Your social media investment is delivering strong returns.";
  } else if (metrics.roi >= 50) {
    summary = "Good ROI. There's room for optimization but overall performance is solid.";
  } else if (metrics.roi >= 0) {
    summary = "Breaking even. Consider testing new strategies to improve returns.";
  } else {
    summary = "Negative ROI. Immediate attention needed to improve campaign performance.";
  }

  return {
    summary,
    suggestions,
    healthScore: Math.max(0, Math.min(100, healthScore)),
  };
}

export function projectFutureROI(
  currentMetrics: ROIMetrics,
  growthRate: number, // percentage
  months: number
): { month: number; projectedRevenue: number; projectedROI: number }[] {
  const projections = [];
  let revenue = currentMetrics.totalRevenue;
  const monthlyInvestment = currentMetrics.totalInvestment;

  for (let i = 1; i <= months; i++) {
    revenue = revenue * (1 + growthRate / 100);
    const projectedROI = ((revenue - monthlyInvestment) / monthlyInvestment) * 100;
    projections.push({
      month: i,
      projectedRevenue: Math.round(revenue),
      projectedROI: Math.round(projectedROI * 100) / 100,
    });
  }

  return projections;
}

// CRUD operations for campaign ROIs
export function createCampaignROI(
  userId: string,
  data: Omit<CampaignROI, "id" | "userId" | "metrics" | "createdAt" | "updatedAt">
): CampaignROI {
  const campaign: CampaignROI = {
    id: crypto.randomUUID(),
    userId,
    ...data,
    metrics: calculateROI(data.investment, data.results),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  campaignROIs.set(campaign.id, campaign);

  if (!userCampaigns.has(userId)) {
    userCampaigns.set(userId, new Set());
  }
  userCampaigns.get(userId)!.add(campaign.id);

  return campaign;
}

export function getUserCampaignROIs(userId: string): CampaignROI[] {
  const campaignIds = userCampaigns.get(userId);
  if (!campaignIds) return [];

  return Array.from(campaignIds)
    .map((id) => campaignROIs.get(id))
    .filter((c): c is CampaignROI => c !== undefined)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function getCampaignROI(campaignId: string, userId: string): CampaignROI | null {
  const campaign = campaignROIs.get(campaignId);
  if (!campaign || campaign.userId !== userId) return null;
  return campaign;
}

export function updateCampaignROI(
  campaignId: string,
  userId: string,
  updates: Partial<Pick<CampaignROI, "name" | "investment" | "results" | "notes">>
): CampaignROI | null {
  const campaign = campaignROIs.get(campaignId);
  if (!campaign || campaign.userId !== userId) return null;

  const updatedCampaign: CampaignROI = {
    ...campaign,
    ...updates,
    metrics: calculateROI(
      updates.investment || campaign.investment,
      updates.results || campaign.results
    ),
    updatedAt: new Date(),
  };

  campaignROIs.set(campaignId, updatedCampaign);
  return updatedCampaign;
}

export function deleteCampaignROI(campaignId: string, userId: string): boolean {
  const campaign = campaignROIs.get(campaignId);
  if (!campaign || campaign.userId !== userId) return false;

  campaignROIs.delete(campaignId);
  userCampaigns.get(userId)?.delete(campaignId);
  return true;
}

// Goal operations
export function createROIGoal(
  userId: string,
  data: Omit<ROIGoal, "id" | "userId" | "currentProgress" | "status" | "createdAt">
): ROIGoal {
  const goal: ROIGoal = {
    id: crypto.randomUUID(),
    userId,
    ...data,
    currentProgress: 0,
    status: "on_track",
    createdAt: new Date(),
  };

  roiGoals.set(goal.id, goal);

  if (!userGoals.has(userId)) {
    userGoals.set(userId, new Set());
  }
  userGoals.get(userId)!.add(goal.id);

  return goal;
}

export function getUserROIGoals(userId: string): ROIGoal[] {
  const goalIds = userGoals.get(userId);
  if (!goalIds) return [];

  return Array.from(goalIds)
    .map((id) => roiGoals.get(id))
    .filter((g): g is ROIGoal => g !== undefined)
    .sort((a, b) => a.deadline.getTime() - b.deadline.getTime());
}

export function updateGoalProgress(goalId: string, userId: string, progress: number): ROIGoal | null {
  const goal = roiGoals.get(goalId);
  if (!goal || goal.userId !== userId) return null;

  const daysUntilDeadline = Math.ceil((goal.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const expectedProgress = Math.min(100, ((new Date().getTime() - goal.createdAt.getTime()) / (goal.deadline.getTime() - goal.createdAt.getTime())) * 100);

  let status: ROIGoal["status"] = "on_track";
  if (progress >= 100) {
    status = "achieved";
  } else if (progress < expectedProgress - 20) {
    status = "behind";
  } else if (progress < expectedProgress - 10) {
    status = "at_risk";
  }

  goal.currentProgress = progress;
  goal.status = status;

  roiGoals.set(goalId, goal);
  return goal;
}

export function deleteROIGoal(goalId: string, userId: string): boolean {
  const goal = roiGoals.get(goalId);
  if (!goal || goal.userId !== userId) return false;

  roiGoals.delete(goalId);
  userGoals.get(userId)?.delete(goalId);
  return true;
}

export const INDUSTRY_BENCHMARKS: Record<string, { avgROI: number; avgCPL: number; avgCPA: number }> = {
  ecommerce: { avgROI: 95, avgCPL: 38, avgCPA: 45 },
  saas: { avgROI: 120, avgCPL: 45, avgCPA: 75 },
  healthcare: { avgROI: 75, avgCPL: 52, avgCPA: 90 },
  finance: { avgROI: 85, avgCPL: 48, avgCPA: 85 },
  education: { avgROI: 110, avgCPL: 32, avgCPA: 55 },
  retail: { avgROI: 80, avgCPL: 35, avgCPA: 50 },
  technology: { avgROI: 130, avgCPL: 42, avgCPA: 70 },
  "real-estate": { avgROI: 65, avgCPL: 55, avgCPA: 120 },
};
