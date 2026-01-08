import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { previewFeed, createPostFromRssItem } from "@/lib/rss-feeds";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { feedUrl, limit = 5, postTemplate, includeImage = true } = body;

    if (!feedUrl) {
      return NextResponse.json({ error: "Feed URL is required" }, { status: 400 });
    }

    // Validate URL format
    try {
      const url = new URL(feedUrl);
      if (!["http:", "https:"].includes(url.protocol)) {
        return NextResponse.json(
          { error: "URL must use HTTP or HTTPS protocol" },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
    }

    // Fetch and parse the feed
    const preview = await previewFeed(feedUrl, limit);

    // If a custom template is provided, regenerate sample posts
    let samplePosts = preview.samplePosts;
    if (postTemplate) {
      samplePosts = preview.feed.items.map((item) =>
        createPostFromRssItem(item, postTemplate, { includeImage })
      );
    }

    return NextResponse.json({
      success: true,
      feed: {
        title: preview.feed.title,
        description: preview.feed.description,
        link: preview.feed.link,
        language: preview.feed.language,
        lastBuildDate: preview.feed.lastBuildDate,
        itemCount: preview.feed.items.length,
      },
      items: preview.feed.items.map((item) => ({
        guid: item.guid,
        title: item.title,
        link: item.link,
        description: item.description.substring(0, 200) + (item.description.length > 200 ? "..." : ""),
        pubDate: item.pubDate,
        author: item.author,
        image: item.image,
        categories: item.categories,
      })),
      samplePosts,
    });
  } catch (error) {
    console.error("RSS feed preview error:", error);

    // Provide more specific error messages
    let errorMessage = "Failed to preview RSS feed";
    if (error instanceof Error) {
      if (error.message.includes("Failed to fetch")) {
        errorMessage = "Could not fetch the feed. Please check the URL and try again.";
      } else if (error.message.includes("Invalid")) {
        errorMessage = error.message;
      } else {
        errorMessage = `Error parsing feed: ${error.message}`;
      }
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
