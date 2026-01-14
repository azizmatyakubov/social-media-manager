import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createContentItem,
  getUserContent,
  getContentItem,
  updateContentItem,
  deleteContentItem,
  getContentVersions,
  getVersion,
  getLatestVersion,
  editContent,
  restoreVersion,
  compareVersions,
  getVersionStats,
  searchVersions,
  CONTENT_TYPES,
  CHANGE_TYPES,
} from "@/lib/version-history";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    const author = {
      id: session.user.id,
      name: session.user.name || "Unknown",
      email: session.user.email || "",
    };

    switch (action) {
      case "content": {
        const content = getUserContent(session.user.id);
        return NextResponse.json({ content });
      }

      case "content-item": {
        const contentId = searchParams.get("contentId");
        if (!contentId) {
          return NextResponse.json({ error: "Content ID required" }, { status: 400 });
        }

        const content = getContentItem(contentId, session.user.id);
        if (!content) {
          return NextResponse.json({ error: "Content not found" }, { status: 404 });
        }

        return NextResponse.json({ content });
      }

      case "versions": {
        const contentId = searchParams.get("contentId");
        if (!contentId) {
          return NextResponse.json({ error: "Content ID required" }, { status: 400 });
        }

        const versions = getContentVersions(contentId, session.user.id);
        return NextResponse.json({ versions });
      }

      case "version": {
        const versionId = searchParams.get("versionId");
        if (!versionId) {
          return NextResponse.json({ error: "Version ID required" }, { status: 400 });
        }

        const version = getVersion(versionId, session.user.id);
        if (!version) {
          return NextResponse.json({ error: "Version not found" }, { status: 404 });
        }

        return NextResponse.json({ version });
      }

      case "latest": {
        const contentId = searchParams.get("contentId");
        if (!contentId) {
          return NextResponse.json({ error: "Content ID required" }, { status: 400 });
        }

        const version = getLatestVersion(contentId, session.user.id);
        if (!version) {
          return NextResponse.json({ error: "No versions found" }, { status: 404 });
        }

        return NextResponse.json({ version });
      }

      case "compare": {
        const versionAId = searchParams.get("versionA");
        const versionBId = searchParams.get("versionB");

        if (!versionAId || !versionBId) {
          return NextResponse.json({ error: "Both version IDs required" }, { status: 400 });
        }

        const comparison = compareVersions(versionAId, versionBId, session.user.id);
        if (!comparison) {
          return NextResponse.json({ error: "Versions not found" }, { status: 404 });
        }

        return NextResponse.json({ comparison });
      }

      case "stats": {
        const stats = getVersionStats(session.user.id);
        return NextResponse.json({ stats });
      }

      case "search": {
        const query = searchParams.get("q");
        if (!query) {
          return NextResponse.json({ error: "Search query required" }, { status: 400 });
        }

        const results = searchVersions(session.user.id, query);
        return NextResponse.json({ results });
      }

      case "content-types": {
        return NextResponse.json({ contentTypes: CONTENT_TYPES });
      }

      case "change-types": {
        return NextResponse.json({ changeTypes: CHANGE_TYPES });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Version history GET error:", error);
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

    const author = {
      id: session.user.id,
      name: session.user.name || "Unknown",
      email: session.user.email || "",
    };

    switch (action) {
      case "create-content": {
        const { title, type, platforms, text, media, hashtags, status } = data;

        if (!type || !platforms || platforms.length === 0 || !text) {
          return NextResponse.json(
            { error: "Type, platforms, and text required" },
            { status: 400 }
          );
        }

        const result = createContentItem(
          session.user.id,
          {
            title,
            type,
            platforms,
            initialContent: {
              text,
              media: media || [],
              hashtags: hashtags || [],
            },
            status: status || "draft",
          },
          author
        );

        return NextResponse.json({ content: result.content, version: result.version });
      }

      case "update-content": {
        const { contentId, ...updates } = data;

        if (!contentId) {
          return NextResponse.json({ error: "Content ID required" }, { status: 400 });
        }

        const content = updateContentItem(contentId, session.user.id, updates);
        if (!content) {
          return NextResponse.json({ error: "Content not found" }, { status: 404 });
        }

        return NextResponse.json({ content });
      }

      case "delete-content": {
        const { contentId } = data;

        if (!contentId) {
          return NextResponse.json({ error: "Content ID required" }, { status: 400 });
        }

        const deleted = deleteContentItem(contentId, session.user.id);
        if (!deleted) {
          return NextResponse.json({ error: "Content not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
      }

      case "edit": {
        const { contentId, text, media, hashtags, mentions, links, description } = data;

        if (!contentId || !text) {
          return NextResponse.json(
            { error: "Content ID and text required" },
            { status: 400 }
          );
        }

        const version = editContent(
          contentId,
          session.user.id,
          {
            text,
            media: media || [],
            hashtags: hashtags || [],
            mentions: mentions || [],
            links: links || [],
          },
          author,
          description
        );

        if (!version) {
          return NextResponse.json({ error: "Content not found" }, { status: 404 });
        }

        return NextResponse.json({ version });
      }

      case "restore": {
        const { versionId } = data;

        if (!versionId) {
          return NextResponse.json({ error: "Version ID required" }, { status: 400 });
        }

        const version = restoreVersion(versionId, session.user.id, author);
        if (!version) {
          return NextResponse.json({ error: "Version not found" }, { status: 404 });
        }

        return NextResponse.json({ version });
      }

      case "archive": {
        const { contentId } = data;

        if (!contentId) {
          return NextResponse.json({ error: "Content ID required" }, { status: 400 });
        }

        const content = updateContentItem(contentId, session.user.id, { status: "archived" });
        if (!content) {
          return NextResponse.json({ error: "Content not found" }, { status: 404 });
        }

        return NextResponse.json({ content });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Version history POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process request" },
      { status: 500 }
    );
  }
}
