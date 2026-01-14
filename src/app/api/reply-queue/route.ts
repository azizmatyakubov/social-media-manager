import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getReplyQueue,
  getQueueAnalytics,
  approveReply,
  generateSuggestedReplies,
} from "@/lib/smart-reply-queue";
import { hasFeatureAccess } from "@/lib/subscription";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check feature access
    const hasAccess = await hasFeatureAccess(session.user.id, "Smart Reply Queue");
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Smart Reply Queue requires Creator plan or higher" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "queue";
    const platform = searchParams.get("platform") || undefined;
    const priority = searchParams.get("priority") as "high" | "medium" | "low" | undefined;
    const limit = parseInt(searchParams.get("limit") || "50");

    if (type === "analytics") {
      const analytics = await getQueueAnalytics(session.user.id);
      return NextResponse.json(analytics);
    }

    // Get queue
    const queue = await getReplyQueue(session.user.id, {
      platform,
      limit,
      priorityFilter: priority,
    });

    return NextResponse.json({ queue });
  } catch (error) {
    console.error("Reply queue error:", error);
    return NextResponse.json(
      { error: "Failed to get reply queue" },
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
    const { action, messageId, content, postContent, sentiment } = body;

    switch (action) {
      case "approve": {
        if (!messageId || !content) {
          return NextResponse.json(
            { error: "Message ID and content are required" },
            { status: 400 }
          );
        }

        const result = await approveReply(messageId, content, session.user.id);
        return NextResponse.json(result);
      }

      case "regenerate": {
        if (!content) {
          return NextResponse.json(
            { error: "Original message content is required" },
            { status: 400 }
          );
        }

        const suggestions = await generateSuggestedReplies(
          content,
          postContent,
          sentiment
        );
        return NextResponse.json({ suggestions });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Reply queue action error:", error);
    return NextResponse.json(
      { error: "Failed to process action" },
      { status: 500 }
    );
  }
}
