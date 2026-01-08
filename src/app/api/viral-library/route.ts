import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  searchViralTweets,
  getViralTweetsByCategory,
  getTrendingViralTweets,
  getInspirationForTopic,
  getCategoryStats,
  VIRAL_CATEGORIES,
} from "@/lib/viral-library";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    // Handle different actions
    switch (action) {
      case "trending": {
        const limit = parseInt(searchParams.get("limit") || "20");
        const tweets = await getTrendingViralTweets(limit, session.user.id);
        return NextResponse.json({ tweets });
      }

      case "category": {
        const category = searchParams.get("category");
        if (!category) {
          return NextResponse.json(
            { error: "Category is required" },
            { status: 400 }
          );
        }
        const limit = parseInt(searchParams.get("limit") || "20");
        const tweets = await getViralTweetsByCategory(
          category,
          limit,
          session.user.id
        );
        return NextResponse.json({ tweets });
      }

      case "inspiration": {
        const topic = searchParams.get("topic");
        if (!topic) {
          return NextResponse.json(
            { error: "Topic is required" },
            { status: 400 }
          );
        }
        const inspiration = await getInspirationForTopic(topic, session.user.id);
        return NextResponse.json(inspiration);
      }

      case "categories": {
        return NextResponse.json({ categories: VIRAL_CATEGORIES });
      }

      case "stats": {
        const stats = await getCategoryStats();
        return NextResponse.json({ stats });
      }

      default: {
        // Default: Search/browse with filters
        const query = searchParams.get("query") || "";
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");

        // Build filters from query params
        const filters: Record<string, unknown> = {};

        const category = searchParams.get("category");
        if (category) {
          filters.category = category;
        }

        const minLikes = searchParams.get("minLikes");
        if (minLikes) {
          filters.minLikes = parseInt(minLikes);
        }

        const maxLikes = searchParams.get("maxLikes");
        if (maxLikes) {
          filters.maxLikes = parseInt(maxLikes);
        }

        const minRetweets = searchParams.get("minRetweets");
        if (minRetweets) {
          filters.minRetweets = parseInt(minRetweets);
        }

        const minEngagementRate = searchParams.get("minEngagementRate");
        if (minEngagementRate) {
          filters.minEngagementRate = parseFloat(minEngagementRate);
        }

        const dateFrom = searchParams.get("dateFrom");
        if (dateFrom) {
          filters.dateFrom = new Date(dateFrom);
        }

        const dateTo = searchParams.get("dateTo");
        if (dateTo) {
          filters.dateTo = new Date(dateTo);
        }

        const topics = searchParams.get("topics");
        if (topics) {
          filters.topics = topics.split(",").map((t) => t.trim());
        }

        const authorVerified = searchParams.get("authorVerified");
        if (authorVerified) {
          filters.authorVerified = authorVerified === "true";
        }

        const sortBy = searchParams.get("sortBy") as
          | "likes"
          | "retweets"
          | "engagementRate"
          | "viralScore"
          | "tweetedAt"
          | undefined;
        if (sortBy) {
          filters.sortBy = sortBy;
        }

        const sortOrder = searchParams.get("sortOrder") as
          | "asc"
          | "desc"
          | undefined;
        if (sortOrder) {
          filters.sortOrder = sortOrder;
        }

        const result = await searchViralTweets(
          query,
          filters,
          page,
          limit,
          session.user.id
        );

        return NextResponse.json(result);
      }
    }
  } catch (error) {
    console.error("Viral library error:", error);
    return NextResponse.json(
      { error: "Failed to fetch viral tweets" },
      { status: 500 }
    );
  }
}
