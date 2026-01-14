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

      case "benchmarks": {
        return NextResponse.json({ benchmarks: INDUSTRY_BENCHMARKS });
      }

      case "constants": {
        return NextResponse.json({
          industries: Object.keys(INDUSTRY_BENCHMARKS),
          platforms: ["facebook", "instagram", "twitter", "linkedin", "tiktok", "youtube", "pinterest"],
        });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("ROI calculator GET error:", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
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
        const { investment, revenue, timeframeMonths, additionalCosts } = data;
        if (investment === undefined || revenue === undefined) {
          return NextResponse.json(
            { error: "Investment and revenue required" },
            { status: 400 }
          );
        }
        const metrics = calculateROI(investment, revenue, timeframeMonths, additionalCosts);
        const insights = getROIInsights(metrics);
        return NextResponse.json({ metrics, insights });
      }

      case "calculate-platform": {
        const { campaigns } = data;
        if (!campaigns || !Array.isArray(campaigns)) {
          return NextResponse.json({ error: "Campaigns array required" }, { status: 400 });
        }
        const platformROI = calculatePlatformROI(campaigns);
        return NextResponse.json({ platformROI });
      }

      case "project": {
        const { currentMetrics, months, growthRate } = data;
        if (!currentMetrics || !months) {
          return NextResponse.json(
            { error: "Current metrics and months required" },
            { status: 400 }
          );
        }
        const projections = projectFutureROI(currentMetrics, months, growthRate);
        return NextResponse.json({ projections });
      }

      case "create-campaign": {
        const { name, platform, investment, revenue, leads, conversions, startDate, endDate, industry } = data;
        if (!name || !platform || investment === undefined) {
          return NextResponse.json(
            { error: "Name, platform, and investment required" },
            { status: 400 }
          );
        }
        const campaign = createCampaignROI(session.user.id, {
          name,
          platform,
          investment,
          revenue: revenue || 0,
          leads: leads || 0,
          conversions: conversions || 0,
          startDate: startDate ? new Date(startDate) : new Date(),
          endDate: endDate ? new Date(endDate) : undefined,
          industry,
        });
        return NextResponse.json({ campaign });
      }

      case "update-campaign": {
        const { campaignId, ...updates } = data;
        if (!campaignId) {
          return NextResponse.json({ error: "Campaign ID required" }, { status: 400 });
        }
        if (updates.startDate) updates.startDate = new Date(updates.startDate);
        if (updates.endDate) updates.endDate = new Date(updates.endDate);

        const campaign = updateCampaignROI(campaignId, session.user.id, updates);
        if (!campaign) {
          return NextResponse.json(
            { error: "Campaign not found or unauthorized" },
            { status: 404 }
          );
        }
        return NextResponse.json({ campaign });
      }

      case "delete-campaign": {
        const { campaignId } = data;
        if (!campaignId) {
          return NextResponse.json({ error: "Campaign ID required" }, { status: 400 });
        }
        const success = deleteCampaignROI(campaignId, session.user.id);
        if (!success) {
          return NextResponse.json(
            { error: "Campaign not found or unauthorized" },
            { status: 404 }
          );
        }
        return NextResponse.json({ success: true });
      }

      case "create-goal": {
        const { name, type, targetROI, targetCPA, targetCPL, deadline, platform, budget } = data;
        if (!name || !type) {
          return NextResponse.json(
            { error: "Name and type required" },
            { status: 400 }
          );
        }
        const goal = createROIGoal(session.user.id, {
          name,
          type,
          targetROI,
          targetCPA,
          targetCPL,
          deadline: deadline ? new Date(deadline) : undefined,
          platform,
          budget,
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
          return NextResponse.json(
            { error: "Goal not found or unauthorized" },
            { status: 404 }
          );
        }
        return NextResponse.json({ goal });
      }

      case "delete-goal": {
        const { goalId } = data;
        if (!goalId) {
          return NextResponse.json({ error: "Goal ID required" }, { status: 400 });
        }
        const success = deleteROIGoal(goalId, session.user.id);
        if (!success) {
          return NextResponse.json(
            { error: "Goal not found or unauthorized" },
            { status: 404 }
          );
        }
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("ROI calculator POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process request" },
      { status: 500 }
    );
  }
}
