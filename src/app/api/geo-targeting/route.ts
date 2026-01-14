import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getAllRegions,
  getRegion,
  getRegionsByType,
  getRegionsByParent,
  searchRegions,
  createGeoTarget,
  getUserGeoTargets,
  getGeoTarget,
  updateGeoTarget,
  deleteGeoTarget,
  createGeoPost,
  getUserGeoPosts,
  getGeoPost,
  updateGeoPost,
  deleteGeoPost,
  generateLocalizedContent,
  getAudienceInsightsByRegion,
  getBestPostingTimes,
  getGeoAnalytics,
  AUDIENCE_TEMPLATES,
  SUPPORTED_LANGUAGES,
} from "@/lib/geo-targeting";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    switch (action) {
      case "regions": {
        const type = searchParams.get("type") as "country" | "state" | "city" | "region" | null;
        const parentId = searchParams.get("parentId");
        const query = searchParams.get("q");

        if (query) {
          return NextResponse.json({ regions: searchRegions(query) });
        }

        if (parentId) {
          return NextResponse.json({ regions: getRegionsByParent(parentId) });
        }

        if (type) {
          return NextResponse.json({ regions: getRegionsByType(type) });
        }

        return NextResponse.json({ regions: getAllRegions() });
      }

      case "region": {
        const regionId = searchParams.get("regionId");
        if (!regionId) {
          return NextResponse.json({ error: "Region ID required" }, { status: 400 });
        }

        const region = getRegion(regionId);
        if (!region) {
          return NextResponse.json({ error: "Region not found" }, { status: 404 });
        }

        return NextResponse.json({ region });
      }

      case "targets": {
        const targets = getUserGeoTargets(session.user.id);
        return NextResponse.json({ targets });
      }

      case "target": {
        const targetId = searchParams.get("targetId");
        if (!targetId) {
          return NextResponse.json({ error: "Target ID required" }, { status: 400 });
        }

        const target = getGeoTarget(targetId, session.user.id);
        if (!target) {
          return NextResponse.json({ error: "Target not found" }, { status: 404 });
        }

        return NextResponse.json({ target });
      }

      case "posts": {
        const posts = getUserGeoPosts(session.user.id);
        return NextResponse.json({ posts });
      }

      case "post": {
        const postId = searchParams.get("postId");
        if (!postId) {
          return NextResponse.json({ error: "Post ID required" }, { status: 400 });
        }

        const post = getGeoPost(postId, session.user.id);
        if (!post) {
          return NextResponse.json({ error: "Post not found" }, { status: 404 });
        }

        return NextResponse.json({ post });
      }

      case "audience-insights": {
        const regionIds = searchParams.get("regionIds")?.split(",") || [];
        if (regionIds.length === 0) {
          return NextResponse.json({ error: "Region IDs required" }, { status: 400 });
        }

        const insights = getAudienceInsightsByRegion(session.user.id, regionIds);
        return NextResponse.json({ insights });
      }

      case "best-times": {
        const regionIds = searchParams.get("regionIds")?.split(",") || [];
        if (regionIds.length === 0) {
          return NextResponse.json({ error: "Region IDs required" }, { status: 400 });
        }

        const times = getBestPostingTimes(regionIds);
        return NextResponse.json({ times });
      }

      case "analytics": {
        const analytics = getGeoAnalytics(session.user.id);
        return NextResponse.json({ analytics });
      }

      case "templates": {
        return NextResponse.json({ templates: AUDIENCE_TEMPLATES });
      }

      case "languages": {
        return NextResponse.json({ languages: SUPPORTED_LANGUAGES });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Geo-targeting GET error:", error);
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
      case "create-target": {
        const { name, description, regions, excludedRegions, languages, demographics } = data;

        if (!name || !regions || regions.length === 0) {
          return NextResponse.json(
            { error: "Name and at least one region required" },
            { status: 400 }
          );
        }

        const target = createGeoTarget(session.user.id, {
          name,
          description,
          regions,
          excludedRegions: excludedRegions || [],
          languages: languages || [],
          demographics,
        });

        return NextResponse.json({ target });
      }

      case "create-from-template": {
        const { templateId, name } = data;

        const template = AUDIENCE_TEMPLATES.find(t => t.id === templateId);
        if (!template) {
          return NextResponse.json({ error: "Template not found" }, { status: 404 });
        }

        const target = createGeoTarget(session.user.id, {
          name: name || template.name,
          description: template.description,
          regions: template.regions,
          excludedRegions: [],
          languages: template.languages,
        });

        return NextResponse.json({ target });
      }

      case "update-target": {
        const { targetId, ...updates } = data;

        if (!targetId) {
          return NextResponse.json({ error: "Target ID required" }, { status: 400 });
        }

        const target = updateGeoTarget(targetId, session.user.id, updates);
        if (!target) {
          return NextResponse.json({ error: "Target not found" }, { status: 404 });
        }

        return NextResponse.json({ target });
      }

      case "delete-target": {
        const { targetId } = data;

        if (!targetId) {
          return NextResponse.json({ error: "Target ID required" }, { status: 400 });
        }

        const deleted = deleteGeoTarget(targetId, session.user.id);
        if (!deleted) {
          return NextResponse.json({ error: "Target not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
      }

      case "create-post": {
        const { content, platforms, geoTargetId, localizedVersions, scheduledAt, status } = data;

        if (!content || !platforms || platforms.length === 0 || !geoTargetId) {
          return NextResponse.json(
            { error: "Content, platforms, and geo target required" },
            { status: 400 }
          );
        }

        const post = createGeoPost(session.user.id, {
          content,
          platforms,
          geoTargetId,
          localizedVersions: localizedVersions || [],
          scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
          status: status || "draft",
        });

        return NextResponse.json({ post });
      }

      case "update-post": {
        const { postId, ...updates } = data;

        if (!postId) {
          return NextResponse.json({ error: "Post ID required" }, { status: 400 });
        }

        if (updates.scheduledAt) {
          updates.scheduledAt = new Date(updates.scheduledAt);
        }

        const post = updateGeoPost(postId, session.user.id, updates);
        if (!post) {
          return NextResponse.json({ error: "Post not found" }, { status: 404 });
        }

        return NextResponse.json({ post });
      }

      case "delete-post": {
        const { postId } = data;

        if (!postId) {
          return NextResponse.json({ error: "Post ID required" }, { status: 400 });
        }

        const deleted = deleteGeoPost(postId, session.user.id);
        if (!deleted) {
          return NextResponse.json({ error: "Post not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
      }

      case "generate-localized": {
        const { content, regionIds, options } = data;

        if (!content || !regionIds || regionIds.length === 0) {
          return NextResponse.json(
            { error: "Content and region IDs required" },
            { status: 400 }
          );
        }

        const localized = await generateLocalizedContent(content, regionIds, options);
        return NextResponse.json({ localized });
      }

      case "schedule-geo-post": {
        const { postId, scheduledAt } = data;

        if (!postId || !scheduledAt) {
          return NextResponse.json(
            { error: "Post ID and scheduled time required" },
            { status: 400 }
          );
        }

        const post = updateGeoPost(postId, session.user.id, {
          scheduledAt: new Date(scheduledAt),
          status: "scheduled",
        });

        if (!post) {
          return NextResponse.json({ error: "Post not found" }, { status: 404 });
        }

        return NextResponse.json({ post });
      }

      case "publish-geo-post": {
        const { postId } = data;

        if (!postId) {
          return NextResponse.json({ error: "Post ID required" }, { status: 400 });
        }

        const post = updateGeoPost(postId, session.user.id, {
          status: "published",
          publishedAt: new Date(),
        });

        if (!post) {
          return NextResponse.json({ error: "Post not found" }, { status: 404 });
        }

        return NextResponse.json({ post });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Geo-targeting POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process request" },
      { status: 500 }
    );
  }
}
