import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getMentions,
  getMentionStats,
  generateReplySuggestions,
  sendReply,
  markMentionAs,
  bulkMarkMentions,
  getHighPriorityMentions,
} from "@/lib/smart-reply";
import { MentionStatus, Sentiment } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const status = searchParams.get("status") as MentionStatus | null;
    const sentiment = searchParams.get("sentiment") as Sentiment | null;
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    if (action === "stats") {
      const stats = await getMentionStats(session.user.id);
      return NextResponse.json(stats);
    }

    if (action === "priority") {
      const mentions = await getHighPriorityMentions(session.user.id);
      return NextResponse.json(mentions);
    }

    const mentions = await getMentions(session.user.id, {
      status: status || undefined,
      sentiment: sentiment || undefined,
      limit,
      offset,
    });

    return NextResponse.json(mentions);
  } catch (error) {
    console.error("Mentions fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch mentions" },
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
    const { action } = body;

    if (action === "generate-replies") {
      const { mentionId, tones } = body;

      if (!mentionId) {
        return NextResponse.json({ error: "Mention ID is required" }, { status: 400 });
      }

      const suggestions = await generateReplySuggestions(
        mentionId,
        tones || ["friendly", "professional", "witty"]
      );

      return NextResponse.json(suggestions);
    }

    if (action === "send-reply") {
      const { mentionId, suggestionId, customContent } = body;

      if (!mentionId) {
        return NextResponse.json({ error: "Mention ID is required" }, { status: 400 });
      }

      const result = await sendReply(mentionId, suggestionId, customContent);
      return NextResponse.json(result);
    }

    if (action === "mark") {
      const { mentionId, status } = body;

      if (!mentionId || !status) {
        return NextResponse.json({ error: "Mention ID and status are required" }, { status: 400 });
      }

      const mention = await markMentionAs(mentionId, status as MentionStatus);
      return NextResponse.json(mention);
    }

    if (action === "bulk-mark") {
      const { mentionIds, status } = body;

      if (!mentionIds || !status) {
        return NextResponse.json({ error: "Mention IDs and status are required" }, { status: 400 });
      }

      await bulkMarkMentions(mentionIds, status as MentionStatus);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Mention action error:", error);
    return NextResponse.json(
      { error: "Failed to process mention action" },
      { status: 500 }
    );
  }
}
