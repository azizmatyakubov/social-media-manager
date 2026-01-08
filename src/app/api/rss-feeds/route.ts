import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  addRssFeed,
  getRssFeeds,
  getRssFeed,
  updateRssFeed,
  deleteRssFeed,
  validateFeedUrl,
  getFeedStats,
} from "@/lib/rss-feeds";
import { Platform } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const feedId = searchParams.get("feedId");
    const action = searchParams.get("action");

    // Get specific feed
    if (feedId && !action) {
      const feed = await getRssFeed(feedId);
      if (!feed) {
        return NextResponse.json({ error: "Feed not found" }, { status: 404 });
      }
      return NextResponse.json(feed);
    }

    // Get feed stats
    if (feedId && action === "stats") {
      const stats = await getFeedStats(feedId);
      return NextResponse.json(stats);
    }

    // Get all feeds
    const feeds = await getRssFeeds(session.user.id);
    return NextResponse.json(feeds);
  } catch (error) {
    console.error("RSS feeds fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch RSS feeds" },
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
    const {
      feedUrl,
      name,
      platforms,
      autoPost,
      postTemplate,
      includeImage,
      maxPostsPerDay,
      checkInterval,
      categoryId,
    } = body;

    if (!feedUrl) {
      return NextResponse.json({ error: "Feed URL is required" }, { status: 400 });
    }

    // Validate feed URL first
    const validation = await validateFeedUrl(feedUrl);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || "Invalid feed URL" },
        { status: 400 }
      );
    }

    // Parse platforms if provided
    let parsedPlatforms: Platform[] | undefined;
    if (platforms) {
      if (Array.isArray(platforms)) {
        parsedPlatforms = platforms.filter((p: string) =>
          Object.values(Platform).includes(p as Platform)
        ) as Platform[];
      } else if (typeof platforms === "string") {
        parsedPlatforms = [platforms as Platform];
      }
    }

    const feed = await addRssFeed(session.user.id, feedUrl, {
      name: name || validation.feedInfo?.title,
      platforms: parsedPlatforms,
      autoPost,
      postTemplate,
      includeImage,
      maxPostsPerDay,
      checkInterval,
      categoryId,
    });

    return NextResponse.json({
      success: true,
      feed,
      feedInfo: validation.feedInfo,
    });
  } catch (error) {
    console.error("Add RSS feed error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to add RSS feed" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { feedId, ...settings } = body;

    if (!feedId) {
      return NextResponse.json({ error: "Feed ID is required" }, { status: 400 });
    }

    // Verify ownership
    const existingFeed = await getRssFeed(feedId);
    if (!existingFeed) {
      return NextResponse.json({ error: "Feed not found" }, { status: 404 });
    }
    if (existingFeed.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Parse platforms if provided
    if (settings.platforms) {
      if (Array.isArray(settings.platforms)) {
        settings.platforms = settings.platforms.filter((p: string) =>
          Object.values(Platform).includes(p as Platform)
        ) as Platform[];
      } else if (typeof settings.platforms === "string") {
        settings.platforms = [settings.platforms as Platform];
      }
    }

    const feed = await updateRssFeed(feedId, settings);

    return NextResponse.json({ success: true, feed });
  } catch (error) {
    console.error("Update RSS feed error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update RSS feed" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const feedId = searchParams.get("feedId");

    if (!feedId) {
      return NextResponse.json({ error: "Feed ID is required" }, { status: 400 });
    }

    // Verify ownership
    const existingFeed = await getRssFeed(feedId);
    if (!existingFeed) {
      return NextResponse.json({ error: "Feed not found" }, { status: 404 });
    }
    if (existingFeed.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await deleteRssFeed(feedId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete RSS feed error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete RSS feed" },
      { status: 500 }
    );
  }
}
