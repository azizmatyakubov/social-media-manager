import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  analyzeSentiment,
  analyzeSentimentBatch,
  getCommentsWithSentiment,
  getSentimentStats,
  getTrendingTopics,
  generateReplySuggestions,
  getSentimentTrend,
  getPriorityComments,
  type SentimentType,
} from "@/lib/sentiment-analysis";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    switch (action) {
      case "comments": {
        const platform = searchParams.get("platform") || undefined;
        const sentiment = searchParams.get("sentiment") as SentimentType | null;
        const actionRequired = searchParams.get("actionRequired");
        const urgency = searchParams.get("urgency") as "LOW" | "MEDIUM" | "HIGH" | null;
        const dateFrom = searchParams.get("dateFrom");
        const dateTo = searchParams.get("dateTo");
        const limit = searchParams.get("limit");
        const offset = searchParams.get("offset");

        const comments = await getCommentsWithSentiment(session.user.id, {
          platform,
          sentiment: sentiment || undefined,
          actionRequired: actionRequired === "true" ? true : actionRequired === "false" ? false : undefined,
          urgency: urgency || undefined,
          dateFrom: dateFrom ? new Date(dateFrom) : undefined,
          dateTo: dateTo ? new Date(dateTo) : undefined,
          limit: limit ? parseInt(limit) : undefined,
          offset: offset ? parseInt(offset) : undefined,
        });

        return NextResponse.json({ comments });
      }

      case "stats": {
        const platform = searchParams.get("platform") || undefined;
        const dateFrom = searchParams.get("dateFrom");
        const dateTo = searchParams.get("dateTo");

        const stats = await getSentimentStats(session.user.id, {
          platform,
          dateFrom: dateFrom ? new Date(dateFrom) : undefined,
          dateTo: dateTo ? new Date(dateTo) : undefined,
        });

        return NextResponse.json({ stats });
      }

      case "trending": {
        const platform = searchParams.get("platform") || undefined;
        const dateFrom = searchParams.get("dateFrom");
        const dateTo = searchParams.get("dateTo");
        const limit = searchParams.get("limit");

        const topics = await getTrendingTopics(session.user.id, {
          platform,
          dateFrom: dateFrom ? new Date(dateFrom) : undefined,
          dateTo: dateTo ? new Date(dateTo) : undefined,
          limit: limit ? parseInt(limit) : undefined,
        });

        return NextResponse.json({ topics });
      }

      case "trend": {
        const days = searchParams.get("days");
        const trend = await getSentimentTrend(
          session.user.id,
          days ? parseInt(days) : undefined
        );

        return NextResponse.json({ trend });
      }

      case "priority": {
        const limit = searchParams.get("limit");
        const comments = await getPriorityComments(
          session.user.id,
          limit ? parseInt(limit) : undefined
        );

        return NextResponse.json({ comments });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Sentiment GET error:", error);
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
      case "analyze": {
        const { text } = data;
        if (!text) {
          return NextResponse.json({ error: "Text required" }, { status: 400 });
        }

        const result = await analyzeSentiment(text);
        return NextResponse.json({ result });
      }

      case "analyze-batch": {
        const { comments } = data;
        if (!comments || !Array.isArray(comments)) {
          return NextResponse.json({ error: "Comments array required" }, { status: 400 });
        }

        const results = await analyzeSentimentBatch(comments);
        return NextResponse.json({
          results: Object.fromEntries(results),
        });
      }

      case "generate-reply": {
        const { comment, sentiment } = data;
        if (!comment || !sentiment) {
          return NextResponse.json({ error: "Comment and sentiment required" }, { status: 400 });
        }

        const suggestions = await generateReplySuggestions(comment, sentiment);
        return NextResponse.json({ suggestions });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Sentiment POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process request" },
      { status: 500 }
    );
  }
}
