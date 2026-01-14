import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createCampaign,
  updateCampaign,
  deleteCampaign,
  getCampaign,
  getCampaigns,
  createCampaignPost,
  updateCampaignPost,
  deleteCampaignPost,
  getCampaignPosts,
  getCampaignStats,
  getCampaignPerformance,
  updateCampaignMetrics,
  duplicateCampaign,
  archiveCompletedCampaigns,
  getCampaignCalendarEvents,
  type CampaignStatus,
} from "@/lib/campaigns";

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
        const status = searchParams.get("status") as CampaignStatus | null;
        const platform = searchParams.get("platform") || undefined;
        const search = searchParams.get("search") || undefined;
        const sortBy = searchParams.get("sortBy") as "name" | "createdAt" | "startDate" | "totalEngagement" | null;
        const sortOrder = searchParams.get("sortOrder") as "asc" | "desc" | null;
        const limit = searchParams.get("limit");
        const offset = searchParams.get("offset");

        const campaigns = await getCampaigns(session.user.id, {
          status: status || undefined,
          platform,
          search,
          sortBy: sortBy || undefined,
          sortOrder: sortOrder || undefined,
          limit: limit ? parseInt(limit) : undefined,
          offset: offset ? parseInt(offset) : undefined,
        });

        return NextResponse.json({ campaigns });
      }

      case "get": {
        const campaignId = searchParams.get("campaignId");
        if (!campaignId) {
          return NextResponse.json({ error: "Campaign ID required" }, { status: 400 });
        }

        const campaign = await getCampaign(campaignId, session.user.id);
        if (!campaign) {
          return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
        }

        return NextResponse.json({ campaign });
      }

      case "posts": {
        const campaignId = searchParams.get("campaignId");
        if (!campaignId) {
          return NextResponse.json({ error: "Campaign ID required" }, { status: 400 });
        }

        const status = searchParams.get("status") || undefined;
        const platform = searchParams.get("platform") || undefined;
        const sortBy = searchParams.get("sortBy") as "scheduledFor" | "createdAt" | "engagement" | null;
        const sortOrder = searchParams.get("sortOrder") as "asc" | "desc" | null;

        const posts = await getCampaignPosts(campaignId, session.user.id, {
          status,
          platform,
          sortBy: sortBy || undefined,
          sortOrder: sortOrder || undefined,
        });

        return NextResponse.json({ posts });
      }

      case "stats": {
        const stats = await getCampaignStats(session.user.id);
        return NextResponse.json({ stats });
      }

      case "performance": {
        const campaignId = searchParams.get("campaignId");
        if (!campaignId) {
          return NextResponse.json({ error: "Campaign ID required" }, { status: 400 });
        }

        const performance = await getCampaignPerformance(campaignId, session.user.id);
        return NextResponse.json({ performance });
      }

      case "calendar": {
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");

        if (!startDate || !endDate) {
          return NextResponse.json({ error: "Start and end dates required" }, { status: 400 });
        }

        const events = await getCampaignCalendarEvents(
          session.user.id,
          new Date(startDate),
          new Date(endDate)
        );

        return NextResponse.json({ events });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Campaigns GET error:", error);
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
      case "create": {
        const { name, description, status, objective, targetAudience, platforms, budget, startDate, endDate, utmSource, utmMedium, utmCampaign, hashtags, tags, color } = data;

        if (!name) {
          return NextResponse.json({ error: "Name required" }, { status: 400 });
        }

        const campaign = await createCampaign(session.user.id, {
          name,
          description,
          status,
          objective,
          targetAudience,
          platforms,
          budget,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          utmSource,
          utmMedium,
          utmCampaign,
          hashtags,
          tags,
          color,
        });

        return NextResponse.json({ campaign });
      }

      case "update": {
        const { campaignId, ...updateData } = data;
        if (!campaignId) {
          return NextResponse.json({ error: "Campaign ID required" }, { status: 400 });
        }

        // Convert date strings to Date objects
        if (updateData.startDate) {
          updateData.startDate = new Date(updateData.startDate);
        }
        if (updateData.endDate) {
          updateData.endDate = new Date(updateData.endDate);
        }

        const campaign = await updateCampaign(campaignId, session.user.id, updateData);
        return NextResponse.json({ campaign });
      }

      case "delete": {
        const { campaignId } = data;
        if (!campaignId) {
          return NextResponse.json({ error: "Campaign ID required" }, { status: 400 });
        }

        await deleteCampaign(campaignId, session.user.id);
        return NextResponse.json({ success: true });
      }

      case "duplicate": {
        const { campaignId, newName } = data;
        if (!campaignId) {
          return NextResponse.json({ error: "Campaign ID required" }, { status: 400 });
        }

        const campaign = await duplicateCampaign(campaignId, session.user.id, newName);
        return NextResponse.json({ campaign });
      }

      case "create-post": {
        const { campaignId, platform, content, mediaUrls, scheduledFor } = data;

        if (!campaignId || !platform || !content) {
          return NextResponse.json({ error: "Campaign ID, platform, and content required" }, { status: 400 });
        }

        const post = await createCampaignPost(session.user.id, {
          campaignId,
          platform,
          content,
          mediaUrls,
          scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
        });

        return NextResponse.json({ post });
      }

      case "update-post": {
        const { postId, ...updateData } = data;
        if (!postId) {
          return NextResponse.json({ error: "Post ID required" }, { status: 400 });
        }

        if (updateData.scheduledFor) {
          updateData.scheduledFor = new Date(updateData.scheduledFor);
        }
        if (updateData.publishedAt) {
          updateData.publishedAt = new Date(updateData.publishedAt);
        }

        const post = await updateCampaignPost(postId, session.user.id, updateData);
        return NextResponse.json({ post });
      }

      case "delete-post": {
        const { postId } = data;
        if (!postId) {
          return NextResponse.json({ error: "Post ID required" }, { status: 400 });
        }

        await deleteCampaignPost(postId, session.user.id);
        return NextResponse.json({ success: true });
      }

      case "update-metrics": {
        const { campaignId } = data;
        if (!campaignId) {
          return NextResponse.json({ error: "Campaign ID required" }, { status: 400 });
        }

        const campaign = await updateCampaignMetrics(campaignId);
        return NextResponse.json({ campaign });
      }

      case "archive-completed": {
        const count = await archiveCompletedCampaigns(session.user.id);
        return NextResponse.json({ archived: count });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Campaigns POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process request" },
      { status: 500 }
    );
  }
}
