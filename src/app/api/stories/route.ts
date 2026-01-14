import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getUserStories,
  getStory,
  createStory,
  updateStory,
  deleteStory,
  scheduleStory,
  publishStory,
  getUserSeries,
  getSeries,
  createSeries,
  updateSeries,
  deleteSeries,
  getUserTemplates,
  getTemplate,
  createTemplate,
  useTemplate,
  deleteTemplate,
  getUserDrafts,
  saveDraft,
  deleteDraft,
  getStoryStats,
  getUpcomingStories,
  getRecentlyPublished,
  getOptimalPostingTimes,
  PLATFORM_REQUIREMENTS,
  STORY_CATEGORIES,
  OVERLAY_STICKERS,
} from "@/lib/story-scheduler";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    switch (action) {
      case "stories": {
        const platform = searchParams.get("platform") as any;
        const type = searchParams.get("type") as any;
        const status = searchParams.get("status") as any;
        const stories = getUserStories(session.user.id, { platform, type, status });
        return NextResponse.json({ stories });
      }

      case "story": {
        const storyId = searchParams.get("storyId");
        if (!storyId) {
          return NextResponse.json({ error: "Story ID required" }, { status: 400 });
        }
        const story = getStory(storyId);
        if (!story) {
          return NextResponse.json({ error: "Story not found" }, { status: 404 });
        }
        return NextResponse.json({ story });
      }

      case "upcoming": {
        const limit = parseInt(searchParams.get("limit") || "10");
        const stories = getUpcomingStories(session.user.id, limit);
        return NextResponse.json({ stories });
      }

      case "recent": {
        const limit = parseInt(searchParams.get("limit") || "10");
        const stories = getRecentlyPublished(session.user.id, limit);
        return NextResponse.json({ stories });
      }

      case "series-list": {
        const seriesList = getUserSeries(session.user.id);
        return NextResponse.json({ series: seriesList });
      }

      case "series": {
        const seriesId = searchParams.get("seriesId");
        if (!seriesId) {
          return NextResponse.json({ error: "Series ID required" }, { status: 400 });
        }
        const s = getSeries(seriesId);
        if (!s) {
          return NextResponse.json({ error: "Series not found" }, { status: 404 });
        }
        return NextResponse.json({ series: s });
      }

      case "templates": {
        const platform = searchParams.get("platform") as any;
        const templates = getUserTemplates(session.user.id, platform);
        return NextResponse.json({ templates });
      }

      case "template": {
        const templateId = searchParams.get("templateId");
        if (!templateId) {
          return NextResponse.json({ error: "Template ID required" }, { status: 400 });
        }
        const template = getTemplate(templateId);
        if (!template) {
          return NextResponse.json({ error: "Template not found" }, { status: 404 });
        }
        return NextResponse.json({ template });
      }

      case "drafts": {
        const userDrafts = getUserDrafts(session.user.id);
        return NextResponse.json({ drafts: userDrafts });
      }

      case "stats": {
        const stats = getStoryStats(session.user.id);
        return NextResponse.json({ stats });
      }

      case "optimal-times": {
        const platform = searchParams.get("platform") as any || "instagram";
        const times = getOptimalPostingTimes(session.user.id, platform);
        return NextResponse.json({ times });
      }

      case "constants": {
        return NextResponse.json({
          platformRequirements: PLATFORM_REQUIREMENTS,
          categories: STORY_CATEGORIES,
          stickers: OVERLAY_STICKERS,
          platforms: ["instagram", "facebook", "tiktok", "youtube"],
          types: ["story", "reel", "short"],
          statuses: ["draft", "scheduled", "published", "failed", "expired"],
        });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Stories GET error:", error);
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
      case "create": {
        const { type, platform, media, overlays, caption, hashtags, mentions, location, music, scheduledAt } = data;
        if (!type || !platform || !media) {
          return NextResponse.json(
            { error: "Type, platform, and media are required" },
            { status: 400 }
          );
        }

        const story = createStory(session.user.id, {
          type,
          platform,
          media,
          overlays,
          caption,
          hashtags,
          mentions,
          location,
          music,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        });
        return NextResponse.json({ story });
      }

      case "update": {
        const { storyId, ...updates } = data;
        if (!storyId) {
          return NextResponse.json({ error: "Story ID required" }, { status: 400 });
        }
        const story = updateStory(storyId, session.user.id, updates);
        if (!story) {
          return NextResponse.json(
            { error: "Story not found or unauthorized" },
            { status: 404 }
          );
        }
        return NextResponse.json({ story });
      }

      case "delete": {
        const { storyId } = data;
        if (!storyId) {
          return NextResponse.json({ error: "Story ID required" }, { status: 400 });
        }
        const success = deleteStory(storyId, session.user.id);
        if (!success) {
          return NextResponse.json(
            { error: "Story not found or unauthorized" },
            { status: 404 }
          );
        }
        return NextResponse.json({ success: true });
      }

      case "schedule": {
        const { storyId, scheduledAt } = data;
        if (!storyId || !scheduledAt) {
          return NextResponse.json(
            { error: "Story ID and scheduled time required" },
            { status: 400 }
          );
        }
        const story = scheduleStory(storyId, session.user.id, new Date(scheduledAt));
        if (!story) {
          return NextResponse.json(
            { error: "Story not found or unauthorized" },
            { status: 404 }
          );
        }
        return NextResponse.json({ story });
      }

      case "publish": {
        const { storyId } = data;
        if (!storyId) {
          return NextResponse.json({ error: "Story ID required" }, { status: 400 });
        }
        const story = publishStory(storyId, session.user.id);
        if (!story) {
          return NextResponse.json(
            { error: "Story not found or unauthorized" },
            { status: 404 }
          );
        }
        return NextResponse.json({ story });
      }

      case "create-series": {
        const { name, description, platform, type, stories, interval, scheduledStartAt } = data;
        if (!name || !platform || !type || !stories || stories.length === 0) {
          return NextResponse.json(
            { error: "Name, platform, type, and stories are required" },
            { status: 400 }
          );
        }
        const series = createSeries(session.user.id, {
          name,
          description,
          platform,
          type,
          stories,
          interval: interval || 60,
          scheduledStartAt: scheduledStartAt ? new Date(scheduledStartAt) : undefined,
        });
        return NextResponse.json({ series });
      }

      case "update-series": {
        const { seriesId, ...updates } = data;
        if (!seriesId) {
          return NextResponse.json({ error: "Series ID required" }, { status: 400 });
        }
        const series = updateSeries(seriesId, session.user.id, updates);
        if (!series) {
          return NextResponse.json(
            { error: "Series not found or unauthorized" },
            { status: 404 }
          );
        }
        return NextResponse.json({ series });
      }

      case "delete-series": {
        const { seriesId } = data;
        if (!seriesId) {
          return NextResponse.json({ error: "Series ID required" }, { status: 400 });
        }
        const success = deleteSeries(seriesId, session.user.id);
        if (!success) {
          return NextResponse.json(
            { error: "Series not found or unauthorized" },
            { status: 404 }
          );
        }
        return NextResponse.json({ success: true });
      }

      case "create-template": {
        const { name, type, platform, overlays, defaultCaption, defaultHashtags, aspectRatio, category, isPublic } =
          data;
        if (!name || !type || !platform || !overlays) {
          return NextResponse.json(
            { error: "Name, type, platform, and overlays are required" },
            { status: 400 }
          );
        }
        const template = createTemplate(session.user.id, {
          name,
          type,
          platform,
          overlays,
          defaultCaption,
          defaultHashtags,
          aspectRatio,
          category,
          isPublic,
        });
        return NextResponse.json({ template });
      }

      case "use-template": {
        const { templateId } = data;
        if (!templateId) {
          return NextResponse.json({ error: "Template ID required" }, { status: 400 });
        }
        const template = useTemplate(templateId);
        if (!template) {
          return NextResponse.json({ error: "Template not found" }, { status: 404 });
        }
        return NextResponse.json({ template });
      }

      case "delete-template": {
        const { templateId } = data;
        if (!templateId) {
          return NextResponse.json({ error: "Template ID required" }, { status: 400 });
        }
        const success = deleteTemplate(templateId, session.user.id);
        if (!success) {
          return NextResponse.json(
            { error: "Template not found or unauthorized" },
            { status: 404 }
          );
        }
        return NextResponse.json({ success: true });
      }

      case "save-draft": {
        const { platform, type, media, overlays, caption, hashtags, mentions } = data;
        if (!platform || !type) {
          return NextResponse.json(
            { error: "Platform and type are required" },
            { status: 400 }
          );
        }
        const draft = saveDraft(session.user.id, {
          platform,
          type,
          media,
          overlays: overlays || [],
          caption,
          hashtags,
          mentions,
        });
        return NextResponse.json({ draft });
      }

      case "delete-draft": {
        const { draftId } = data;
        if (!draftId) {
          return NextResponse.json({ error: "Draft ID required" }, { status: 400 });
        }
        const success = deleteDraft(draftId, session.user.id);
        if (!success) {
          return NextResponse.json(
            { error: "Draft not found or unauthorized" },
            { status: 404 }
          );
        }
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Stories POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process request" },
      { status: 500 }
    );
  }
}
