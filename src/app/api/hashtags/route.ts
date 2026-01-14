import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aiApiMiddleware } from "@/lib/api-middleware";
import {
  suggestHashtagsForContent,
  getHashtagsForTopic,
  analyzeHashtag,
  getTrendingHashtags,
  generateHashtagStrategy,
  findRelatedHashtags,
  getUserTopHashtags,
} from "@/lib/hashtag-research";
import { Platform } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (action === "user-top") {
      const limit = parseInt(searchParams.get("limit") || "20");
      const topHashtags = await getUserTopHashtags(session.user.id, limit);
      return NextResponse.json(topHashtags);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Hashtag GET error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Apply AI rate limiting
  const middleware = await aiApiMiddleware(request);
  if (!middleware.success) {
    return middleware.response;
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, platform = "X" } = body;

    if (action === "suggest-for-content") {
      const { content, count } = body;
      if (!content) {
        return NextResponse.json(
          { error: "Content is required" },
          { status: 400 }
        );
      }
      const suggestions = await suggestHashtagsForContent(
        content,
        platform as Platform,
        count || 15
      );
      return NextResponse.json({ suggestions });
    }

    if (action === "get-for-topic") {
      const { topic } = body;
      if (!topic) {
        return NextResponse.json(
          { error: "Topic is required" },
          { status: 400 }
        );
      }
      const hashtags = await getHashtagsForTopic(topic, platform as Platform);
      return NextResponse.json(hashtags);
    }

    if (action === "analyze") {
      const { hashtag } = body;
      if (!hashtag) {
        return NextResponse.json(
          { error: "Hashtag is required" },
          { status: 400 }
        );
      }
      const analysis = await analyzeHashtag(hashtag);
      return NextResponse.json(analysis);
    }

    if (action === "trending") {
      const { category } = body;
      const trending = await getTrendingHashtags(platform as Platform, category);
      return NextResponse.json({ trending });
    }

    if (action === "strategy") {
      const { niche, accountSize, goals } = body;
      if (!niche || !accountSize || !goals) {
        return NextResponse.json(
          { error: "Niche, accountSize, and goals are required" },
          { status: 400 }
        );
      }
      const strategy = await generateHashtagStrategy(niche, accountSize, goals);
      return NextResponse.json(strategy);
    }

    if (action === "related") {
      const { hashtags } = body;
      if (!hashtags || !Array.isArray(hashtags)) {
        return NextResponse.json(
          { error: "Hashtags array is required" },
          { status: 400 }
        );
      }
      const related = await findRelatedHashtags(hashtags, platform as Platform);
      return NextResponse.json({ related });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Hashtag POST error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
