import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createListeningQuery,
  getListeningQueries,
  updateListeningQuery,
  deleteListeningQuery,
  getListeningMentions,
  getListeningStats,
  getMentionTrends,
  generateListeningInsights,
  markMentionsRead,
  getAlertTriggers,
  analyzeContent,
} from "@/lib/social-listening";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    switch (action) {
      case "queries": {
        const queries = await getListeningQueries(session.user.id);
        return NextResponse.json({ queries });
      }

      case "mentions": {
        const queryId = searchParams.get("queryId") || undefined;
        const platform = searchParams.get("platform") || undefined;
        const sentiment = searchParams.get("sentiment") as "POSITIVE" | "NEUTRAL" | "NEGATIVE" | null;
        const isRead = searchParams.get("isRead");
        const dateFrom = searchParams.get("dateFrom");
        const dateTo = searchParams.get("dateTo");
        const limit = searchParams.get("limit");
        const offset = searchParams.get("offset");

        const mentions = await getListeningMentions(session.user.id, {
          queryId,
          platform,
          sentiment: sentiment || undefined,
          isRead: isRead === "true" ? true : isRead === "false" ? false : undefined,
          dateFrom: dateFrom ? new Date(dateFrom) : undefined,
          dateTo: dateTo ? new Date(dateTo) : undefined,
          limit: limit ? parseInt(limit) : undefined,
          offset: offset ? parseInt(offset) : undefined,
        });

        return NextResponse.json({ mentions });
      }

      case "stats": {
        const queryId = searchParams.get("queryId") || undefined;
        const dateFrom = searchParams.get("dateFrom");
        const dateTo = searchParams.get("dateTo");

        const stats = await getListeningStats(session.user.id, {
          queryId,
          dateFrom: dateFrom ? new Date(dateFrom) : undefined,
          dateTo: dateTo ? new Date(dateTo) : undefined,
        });

        return NextResponse.json({ stats });
      }

      case "trends": {
        const days = searchParams.get("days");
        const trends = await getMentionTrends(
          session.user.id,
          days ? parseInt(days) : undefined
        );

        return NextResponse.json({ trends });
      }

      case "insights": {
        const insights = await generateListeningInsights(session.user.id);
        return NextResponse.json({ insights });
      }

      case "alerts": {
        const keywords = searchParams.get("keywords")?.split(",").filter(Boolean) || [];
        if (keywords.length === 0) {
          return NextResponse.json({ alerts: [] });
        }

        const alerts = await getAlertTriggers(session.user.id, keywords);
        return NextResponse.json({ alerts });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Listening GET error:", error);
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
      case "create-query": {
        const { name, keywords, excludeKeywords, platforms, language } = data;

        if (!name || !keywords || keywords.length === 0) {
          return NextResponse.json(
            { error: "Name and keywords required" },
            { status: 400 }
          );
        }

        const query = await createListeningQuery(session.user.id, {
          name,
          keywords,
          excludeKeywords,
          platforms,
          language,
        });

        return NextResponse.json({ query });
      }

      case "update-query": {
        const { queryId, ...updateData } = data;
        if (!queryId) {
          return NextResponse.json({ error: "Query ID required" }, { status: 400 });
        }

        const query = await updateListeningQuery(session.user.id, queryId, updateData);
        return NextResponse.json({ query });
      }

      case "delete-query": {
        const { queryId } = data;
        if (!queryId) {
          return NextResponse.json({ error: "Query ID required" }, { status: 400 });
        }

        await deleteListeningQuery(session.user.id, queryId);
        return NextResponse.json({ success: true });
      }

      case "mark-read": {
        const { mentionIds } = data;
        if (!mentionIds || !Array.isArray(mentionIds)) {
          return NextResponse.json({ error: "Mention IDs array required" }, { status: 400 });
        }

        await markMentionsRead(session.user.id, mentionIds);
        return NextResponse.json({ success: true });
      }

      case "analyze": {
        const { content } = data;
        if (!content) {
          return NextResponse.json({ error: "Content required" }, { status: 400 });
        }

        const analysis = await analyzeContent(content);
        return NextResponse.json({ analysis });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Listening POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process request" },
      { status: 500 }
    );
  }
}
