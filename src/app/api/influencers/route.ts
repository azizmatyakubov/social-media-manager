import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  discoverInfluencers,
  generateOutreachMessage,
  analyzeInfluencerFit,
  estimateInfluencerCost,
  addInfluencer,
  getUserInfluencers,
  getInfluencer,
  updateInfluencer,
  deleteInfluencer,
  createOutreachCampaign,
  getUserCampaigns,
  getCampaign,
  addInfluencerToCampaign,
  updateInfluencerStatus,
  deleteCampaign,
  INFLUENCER_TIERS,
  OUTREACH_STATUSES,
  type InfluencerSearch,
  type OutreachStatus,
} from "@/lib/influencer-discovery";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    switch (action) {
      case "list": {
        const influencers = getUserInfluencers(session.user.id);
        return NextResponse.json({ influencers });
      }

      case "get": {
        const influencerId = searchParams.get("influencerId");
        if (!influencerId) {
          return NextResponse.json({ error: "Influencer ID required" }, { status: 400 });
        }

        const influencer = getInfluencer(influencerId);
        if (!influencer) {
          return NextResponse.json({ error: "Influencer not found" }, { status: 404 });
        }

        return NextResponse.json({ influencer });
      }

      case "campaigns": {
        const campaigns = getUserCampaigns(session.user.id);
        return NextResponse.json({ campaigns });
      }

      case "campaign": {
        const campaignId = searchParams.get("campaignId");
        if (!campaignId) {
          return NextResponse.json({ error: "Campaign ID required" }, { status: 400 });
        }

        const campaign = getCampaign(campaignId, session.user.id);
        if (!campaign) {
          return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
        }

        // Enrich with full influencer data
        const enrichedInfluencers = campaign.influencers.map((ci) => {
          const influencer = getInfluencer(ci.influencerId);
          return { ...ci, influencer };
        });

        return NextResponse.json({
          campaign: { ...campaign, influencers: enrichedInfluencers },
        });
      }

      case "tiers": {
        return NextResponse.json({ tiers: INFLUENCER_TIERS });
      }

      case "statuses": {
        return NextResponse.json({ statuses: OUTREACH_STATUSES });
      }

      case "estimate-cost": {
        const influencerId = searchParams.get("influencerId");
        if (!influencerId) {
          return NextResponse.json({ error: "Influencer ID required" }, { status: 400 });
        }

        const influencer = getInfluencer(influencerId);
        if (!influencer) {
          return NextResponse.json({ error: "Influencer not found" }, { status: 404 });
        }

        const estimate = estimateInfluencerCost(influencer);
        return NextResponse.json({ estimate });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Influencers GET error:", error);
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
      case "discover": {
        const { niche, platforms, followerRange, engagementMin, location, keywords } = data;

        if (!niche || !platforms || !followerRange) {
          return NextResponse.json(
            { error: "Niche, platforms, and follower range required" },
            { status: 400 }
          );
        }

        const search: InfluencerSearch = {
          niche,
          platforms,
          followerRange,
          engagementMin: engagementMin || 1,
          location,
          keywords,
        };

        const influencers = await discoverInfluencers(search);
        return NextResponse.json({ influencers });
      }

      case "add": {
        const {
          name,
          handle,
          platform,
          profileUrl,
          bio,
          followers,
          engagementRate,
          niche,
          location,
          email,
          contentTypes,
          tags,
        } = data;

        if (!name || !handle || !platform || !followers) {
          return NextResponse.json(
            { error: "Name, handle, platform, and followers required" },
            { status: 400 }
          );
        }

        const influencer = addInfluencer(session.user.id, {
          name,
          handle,
          platform,
          profileUrl: profileUrl || `https://${platform.toLowerCase()}.com/${handle}`,
          bio,
          followers,
          tier: data.tier || "micro",
          engagementRate: engagementRate || 3,
          niche: niche || [],
          location,
          email,
          averageLikes: data.averageLikes || Math.floor(followers * 0.03),
          averageComments: data.averageComments || Math.floor(followers * 0.001),
          contentTypes: contentTypes || ["posts"],
          tags: tags || [],
        });

        return NextResponse.json({ influencer });
      }

      case "update": {
        const { influencerId, ...updates } = data;

        if (!influencerId) {
          return NextResponse.json({ error: "Influencer ID required" }, { status: 400 });
        }

        const influencer = updateInfluencer(influencerId, session.user.id, updates);
        if (!influencer) {
          return NextResponse.json({ error: "Influencer not found" }, { status: 404 });
        }

        return NextResponse.json({ influencer });
      }

      case "delete": {
        const { influencerId } = data;

        if (!influencerId) {
          return NextResponse.json({ error: "Influencer ID required" }, { status: 400 });
        }

        const deleted = deleteInfluencer(influencerId, session.user.id);
        if (!deleted) {
          return NextResponse.json({ error: "Influencer not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
      }

      case "generate-outreach": {
        const { influencerId, brandName, goal, offer, tone } = data;

        if (!influencerId || !brandName || !goal || !offer) {
          return NextResponse.json(
            { error: "Influencer ID, brand name, goal, and offer required" },
            { status: 400 }
          );
        }

        const influencer = getInfluencer(influencerId);
        if (!influencer) {
          return NextResponse.json({ error: "Influencer not found" }, { status: 404 });
        }

        const message = await generateOutreachMessage(influencer, {
          brandName,
          goal,
          offer,
          tone: tone || "professional",
        });

        return NextResponse.json({ message });
      }

      case "analyze-fit": {
        const { influencerId, industry, targetAudience, values, goals } = data;

        if (!influencerId || !industry || !targetAudience) {
          return NextResponse.json(
            { error: "Influencer ID, industry, and target audience required" },
            { status: 400 }
          );
        }

        const influencer = getInfluencer(influencerId);
        if (!influencer) {
          return NextResponse.json({ error: "Influencer not found" }, { status: 404 });
        }

        const analysis = await analyzeInfluencerFit(influencer, {
          industry,
          targetAudience,
          values: values || [],
          goals: goals || [],
        });

        return NextResponse.json({ analysis });
      }

      case "create-campaign": {
        const { name, description, goal, budget, startDate, endDate } = data;

        if (!name || !goal || !budget) {
          return NextResponse.json(
            { error: "Name, goal, and budget required" },
            { status: 400 }
          );
        }

        const campaign = createOutreachCampaign(session.user.id, {
          name,
          description,
          goal,
          budget,
          startDate: startDate ? new Date(startDate) : new Date(),
          endDate: endDate ? new Date(endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        });

        return NextResponse.json({ campaign });
      }

      case "add-to-campaign": {
        const { campaignId, influencerId } = data;

        if (!campaignId || !influencerId) {
          return NextResponse.json(
            { error: "Campaign ID and influencer ID required" },
            { status: 400 }
          );
        }

        const campaign = addInfluencerToCampaign(campaignId, session.user.id, influencerId);
        if (!campaign) {
          return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
        }

        return NextResponse.json({ campaign });
      }

      case "update-status": {
        const { campaignId, influencerId, status, proposedRate, agreedRate, deliverables, notes } = data;

        if (!campaignId || !influencerId || !status) {
          return NextResponse.json(
            { error: "Campaign ID, influencer ID, and status required" },
            { status: 400 }
          );
        }

        const campaign = updateInfluencerStatus(
          campaignId,
          session.user.id,
          influencerId,
          status as OutreachStatus,
          { proposedRate, agreedRate, deliverables, notes }
        );

        if (!campaign) {
          return NextResponse.json({ error: "Campaign or influencer not found" }, { status: 404 });
        }

        return NextResponse.json({ campaign });
      }

      case "delete-campaign": {
        const { campaignId } = data;

        if (!campaignId) {
          return NextResponse.json({ error: "Campaign ID required" }, { status: 400 });
        }

        const deleted = deleteCampaign(campaignId, session.user.id);
        if (!deleted) {
          return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Influencers POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process request" },
      { status: 500 }
    );
  }
}
