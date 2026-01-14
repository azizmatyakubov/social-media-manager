import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getUserCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  calculateBudgetRecommendation,
  generatePricingScenarios,
  getPlatformRates,
  getIndustryBenchmarks,
  getAdPricingStats,
  AD_OBJECTIVES,
  INDUSTRIES,
} from "@/lib/ad-pricing";

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
        const campaigns = getUserCampaigns(session.user.id);
        return NextResponse.json({ campaigns });
      }

      case "campaign": {
        const campaignId = searchParams.get("campaignId");
        if (!campaignId) {
          return NextResponse.json({ error: "Campaign ID required" }, { status: 400 });
        }
        const campaign = getCampaign(campaignId);
        if (!campaign) {
          return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
        }
        return NextResponse.json({ campaign });
      }

      case "platform-rates": {
        const rates = getPlatformRates();
        return NextResponse.json({ rates });
      }

      case "benchmarks": {
        const platform = searchParams.get("platform") || undefined;
        const industry = searchParams.get("industry") || undefined;
        const benchmarks = getIndustryBenchmarks(platform, industry);
        return NextResponse.json({ benchmarks });
      }

      case "stats": {
        const stats = getAdPricingStats(session.user.id);
        return NextResponse.json({ stats });
      }

      case "constants": {
        return NextResponse.json({
          objectives: AD_OBJECTIVES,
          industries: INDUSTRIES,
          platforms: ["facebook", "instagram", "twitter", "linkedin", "tiktok", "youtube", "pinterest"],
        });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Ad pricing GET error:", error);
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
      case "create-campaign": {
        const { name, platform, objective, targetAudience, budget, bidding, creative, schedule, status } = data;
        if (!name || !platform || !objective) {
          return NextResponse.json(
            { error: "Name, platform, and objective required" },
            { status: 400 }
          );
        }
        const campaign = createCampaign(session.user.id, {
          name,
          platform,
          objective,
          targetAudience: targetAudience || {
            locations: ["United States"],
            ageRange: { min: 18, max: 65 },
            genders: ["all"],
            interests: [],
            behaviors: [],
            customAudiences: [],
            estimatedReach: 1000000,
            audienceQuality: "moderate",
          },
          budget: budget || {
            type: "daily",
            amount: 20,
            currency: "USD",
            pacing: "standard",
          },
          bidding: bidding || {
            type: "auto",
            optimizationGoal: objective,
          },
          creative: creative || {
            format: "image",
            placements: ["feed"],
            callToAction: "Learn More",
          },
          schedule: schedule || {
            startDate: new Date(),
          },
          status: status || "draft",
        });
        return NextResponse.json({ campaign });
      }

      case "update-campaign": {
        const { campaignId, ...updates } = data;
        if (!campaignId) {
          return NextResponse.json({ error: "Campaign ID required" }, { status: 400 });
        }
        const campaign = updateCampaign(campaignId, session.user.id, updates);
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
        const success = deleteCampaign(campaignId, session.user.id);
        if (!success) {
          return NextResponse.json(
            { error: "Campaign not found or unauthorized" },
            { status: 404 }
          );
        }
        return NextResponse.json({ success: true });
      }

      case "calculate-budget": {
        const { platform, objective, targetReach, industry } = data;
        if (!platform || !objective || !targetReach) {
          return NextResponse.json(
            { error: "Platform, objective, and target reach required" },
            { status: 400 }
          );
        }
        const recommendation = calculateBudgetRecommendation(
          platform,
          objective,
          targetReach,
          industry
        );
        return NextResponse.json({ recommendation });
      }

      case "generate-scenarios": {
        const { platform, objective, baseBudget, days } = data;
        if (!platform || !objective || !baseBudget) {
          return NextResponse.json(
            { error: "Platform, objective, and base budget required" },
            { status: 400 }
          );
        }
        const scenarios = generatePricingScenarios(
          platform,
          objective,
          baseBudget,
          days || 30
        );
        return NextResponse.json({ scenarios });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Ad pricing POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process request" },
      { status: 500 }
    );
  }
}
