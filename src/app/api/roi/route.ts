import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  calculateROI,
  calculatePlatformROI,
  getROIInsights,
  projectFutureROI,
  createCampaignROI,
  getUserCampaignROIs,
  getCampaignROI,
  updateCampaignROI,
  deleteCampaignROI,
  createROIGoal,
  getUserROIGoals,
  updateGoalProgress,
  deleteROIGoal,
  INDUSTRY_BENCHMARKS,
  type CampaignROI,
} from "@/lib/roi-calculator";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    switch (action) {
      case "campaigns": {
        const campaigns = getUserCampaignROIs(session.user.id);
        return NextResponse.json({ campaigns });
      }

      case "campaign": {
        const campaignId = searchParams.get("campaignId");
        if (!campaignId) {
          return NextResponse.json({ error: "Campaign ID required" }, { status: 400 });
        }

        const campaign = getCampaignROI(campaignId, session.user.id);
        if (!campaign) {
          return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
        }

        return NextResponse.json({ campaign });
      }

      case "goals": {
        const goals = getUserROIGoals(session.user.id);
        return NextResponse.json({ goals });
      }

      case "platform-roi": {
        const campaigns = getUserCampaignROIs(session.user.id);
        const platformROI = calculatePlatformROI(campaigns);
        return NextResponse.json({ platformROI });
      }

      case "benchmarks": {
        const industry = searchParams.get("industry");
        if (industry) {
          const benchmark = INDUSTRY_BENCHMARKS[industry];
          return NextResponse.json({ benchmark });
        }
        return NextResponse.json({ benchmarks: INDUSTRY_BENCHMARKS });
      }

      case "summary": {
        const campaigns = getUserCampaignROIs(session.user.id);

        // Calculate totals
        const totals = campaigns.reduce(
          (acc, campaign) => {
            const inv = campaign.investment;
            const res = campaign.results;
            return {
              investment: acc.investment + inv.adSpend + inv.contentCreation + inv.tools + inv.labor + inv.influencer + inv.other,
              revenue: acc.revenue + res.revenue,
              leads: acc.leads + res.leads,
              conversions: acc.conversions + res.conversions,
              impressions: acc.impressions + res.impressions,
              engagement: acc.engagement + res.engagement,
            };
          },
          { investment: 0, revenue: 0, leads: 0, conversions: 0, impressions: 0, engagement: 0 }
        );

        const overallROI = totals.investment > 0 ? ((totals.revenue - totals.investment) / totals.investment) * 100 : 0;

        return NextResponse.json({
          summary: {
            totalCampaigns: campaigns.length,
            totalInvestment: totals.investment,
            totalRevenue: totals.revenue,
            overallROI: Math.round(overallROI * 100) / 100,
            totalLeads: totals.leads,
            totalConversions: totals.conversions,
            totalImpressions: totals.impressions,
            costPerLead: totals.leads > 0 ? Math.round((totals.investment / totals.leads) * 100) / 100 : 0,
            costPerConversion: totals.conversions > 0 ? Math.round((totals.investment / totals.conversions) * 100) / 100 : 0,
          },
        });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("ROI GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch data" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case "calculate": {
        const { investment, results, customerLifetimeValue } = data;

        if (!investment || !results) {
          return NextResponse.json(
            { error: "Investment and results required" },
            { status: 400 }
          );
        }

        const metrics = calculateROI(investment, results, customerLifetimeValue);
        const insights = getROIInsights(metrics);

        return NextResponse.json({ metrics, insights });
      }

      case "create-campaign": {
        const { name, platform, startDate, endDate, investment, results, notes } = data;

        if (!name || !platform || !investment || !results) {
          return NextResponse.json(
            { error: "Name, platform, investment, and results required" },
            { status: 400 }
          );
        }

        const campaign = createCampaignROI(session.user.id, {
          name,
          platform,
          startDate: startDate ? new Date(startDate) : new Date(),
          endDate: endDate ? new Date(endDate) : new Date(),
          investment: {
            adSpend: investment.adSpend || 0,
            contentCreation: investment.contentCreation || 0,
            tools: investment.tools || 0,
            labor: investment.labor || 0,
            influencer: investment.influencer || 0,
            other: investment.other || 0,
          },
          results: {
            impressions: results.impressions || 0,
            reach: results.reach || 0,
            engagement: results.engagement || 0,
            clicks: results.clicks || 0,
            leads: results.leads || 0,
            conversions: results.conversions || 0,
            revenue: results.revenue || 0,
          },
          notes,
        });

        return NextResponse.json({ campaign });
      }

      case "update-campaign": {
        const { campaignId, ...updates } = data;

        if (!campaignId) {
          return NextResponse.json({ error: "Campaign ID required" }, { status: 400 });
        }

        const campaign = updateCampaignROI(campaignId, session.user.id, updates);
        if (!campaign) {
          return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
        }

        return NextResponse.json({ campaign });
      }

      case "delete-campaign": {
        const { campaignId } = data;

        if (!campaignId) {
          return NextResponse.json({ error: "Campaign ID required" }, { status: 400 });
        }

        const deleted = deleteCampaignROI(campaignId, session.user.id);
        if (!deleted) {
          return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
      }

      case "project": {
        const { metrics, growthRate, months } = data;

        if (!metrics || growthRate === undefined || !months) {
          return NextResponse.json(
            { error: "Metrics, growth rate, and months required" },
            { status: 400 }
          );
        }

        const projections = projectFutureROI(metrics, growthRate, months);
        return NextResponse.json({ projections });
      }

      case "create-goal": {
        const { name, targetROI, targetRevenue, targetLeads, targetConversions, deadline } = data;

        if (!name || !deadline) {
          return NextResponse.json(
            { error: "Name and deadline required" },
            { status: 400 }
          );
        }

        const goal = createROIGoal(session.user.id, {
          name,
          targetROI: targetROI || 0,
          targetRevenue: targetRevenue || 0,
          targetLeads: targetLeads || 0,
          targetConversions: targetConversions || 0,
          deadline: new Date(deadline),
        });

        return NextResponse.json({ goal });
      }

      case "update-goal-progress": {
        const { goalId, progress } = data;

        if (!goalId || progress === undefined) {
          return NextResponse.json(
            { error: "Goal ID and progress required" },
            { status: 400 }
          );
        }

        const goal = updateGoalProgress(goalId, session.user.id, progress);
        if (!goal) {
          return NextResponse.json({ error: "Goal not found" }, { status: 404 });
        }

        return NextResponse.json({ goal });
      }

      case "delete-goal": {
        const { goalId } = data;

        if (!goalId) {
          return NextResponse.json({ error: "Goal ID required" }, { status: 400 });
        }

        const deleted = deleteROIGoal(goalId, session.user.id);
        if (!deleted) {
          return NextResponse.json({ error: "Goal not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("ROI POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process request" },
      { status: 500 }
    );
  }
}
