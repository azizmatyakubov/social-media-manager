import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  fetchInboxMessages,
  getInboxStats,
  replyToMessage,
  updateMessageStatus,
  bulkUpdateMessageStatus,
  assignMessage,
  updateMessageLabels,
  addMessageLabel,
  removeMessageLabel,
  generateSuggestedReplies,
  getConversationThread,
  getHighPriorityMessages,
  searchInboxMessages,
  getTeamMembers,
} from "@/lib/social-inbox";
import { Platform, InboxStatus, MessageType, Sentiment } from "@prisma/client";

/**
 * GET /api/inbox
 * Fetch inbox messages with filters
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    // Handle special actions
    if (action === "stats") {
      const stats = await getInboxStats(session.user.id);
      return NextResponse.json(stats);
    }

    if (action === "priority") {
      const limit = parseInt(searchParams.get("limit") || "10");
      const messages = await getHighPriorityMessages(session.user.id, limit);
      return NextResponse.json(messages);
    }

    if (action === "search") {
      const query = searchParams.get("q") || "";
      const limit = parseInt(searchParams.get("limit") || "20");
      const messages = await searchInboxMessages(session.user.id, query, limit);
      return NextResponse.json(messages);
    }

    if (action === "thread") {
      const messageId = searchParams.get("messageId");
      if (!messageId) {
        return NextResponse.json(
          { error: "Message ID is required" },
          { status: 400 }
        );
      }
      const thread = await getConversationThread(messageId, session.user.id);
      return NextResponse.json(thread);
    }

    if (action === "team-members") {
      const members = await getTeamMembers(session.user.id);
      return NextResponse.json(members);
    }

    if (action === "suggest-replies") {
      const messageId = searchParams.get("messageId");
      if (!messageId) {
        return NextResponse.json(
          { error: "Message ID is required" },
          { status: 400 }
        );
      }
      const tonesParam = searchParams.get("tones");
      const tones = tonesParam
        ? tonesParam.split(",")
        : ["friendly", "professional", "helpful"];
      const suggestions = await generateSuggestedReplies(messageId, tones);
      return NextResponse.json(suggestions);
    }

    // Build filters from query params
    const filters: {
      platform?: Platform;
      status?: InboxStatus;
      messageType?: MessageType;
      sentiment?: Sentiment;
      isSpam?: boolean;
      labels?: string[];
      assignedTo?: string;
      dateFrom?: Date;
      dateTo?: Date;
      limit?: number;
      offset?: number;
    } = {};

    const platform = searchParams.get("platform");
    if (platform && Object.values(Platform).includes(platform as Platform)) {
      filters.platform = platform as Platform;
    }

    const status = searchParams.get("status");
    if (status && Object.values(InboxStatus).includes(status as InboxStatus)) {
      filters.status = status as InboxStatus;
    }

    const messageType = searchParams.get("messageType");
    if (
      messageType &&
      Object.values(MessageType).includes(messageType as MessageType)
    ) {
      filters.messageType = messageType as MessageType;
    }

    const sentiment = searchParams.get("sentiment");
    if (sentiment && Object.values(Sentiment).includes(sentiment as Sentiment)) {
      filters.sentiment = sentiment as Sentiment;
    }

    const isSpam = searchParams.get("isSpam");
    if (isSpam !== null) {
      filters.isSpam = isSpam === "true";
    }

    const labels = searchParams.get("labels");
    if (labels) {
      filters.labels = labels.split(",");
    }

    const assignedTo = searchParams.get("assignedTo");
    if (assignedTo) {
      filters.assignedTo = assignedTo;
    }

    const dateFrom = searchParams.get("dateFrom");
    if (dateFrom) {
      filters.dateFrom = new Date(dateFrom);
    }

    const dateTo = searchParams.get("dateTo");
    if (dateTo) {
      filters.dateTo = new Date(dateTo);
    }

    filters.limit = parseInt(searchParams.get("limit") || "50");
    filters.offset = parseInt(searchParams.get("offset") || "0");

    const messages = await fetchInboxMessages(session.user.id, filters);
    return NextResponse.json(messages);
  } catch (error) {
    console.error("Inbox fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch inbox messages" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/inbox
 * Reply to a message or generate suggestions
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === "reply") {
      const { messageId, content } = body;

      if (!messageId || !content) {
        return NextResponse.json(
          { error: "Message ID and content are required" },
          { status: 400 }
        );
      }

      const result = await replyToMessage(messageId, content, session.user.id);

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    }

    if (action === "generate-replies") {
      const { messageId, tones } = body;

      if (!messageId) {
        return NextResponse.json(
          { error: "Message ID is required" },
          { status: 400 }
        );
      }

      const suggestions = await generateSuggestedReplies(
        messageId,
        tones || ["friendly", "professional", "helpful"]
      );

      return NextResponse.json(suggestions);
    }

    if (action === "bulk-update-status") {
      const { messageIds, status } = body;

      if (!messageIds || !Array.isArray(messageIds) || !status) {
        return NextResponse.json(
          { error: "Message IDs and status are required" },
          { status: 400 }
        );
      }

      if (!Object.values(InboxStatus).includes(status as InboxStatus)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }

      const result = await bulkUpdateMessageStatus(
        messageIds,
        status as InboxStatus,
        session.user.id
      );

      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Inbox action error:", error);
    return NextResponse.json(
      { error: "Failed to process inbox action" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/inbox
 * Update message status, assignment, or labels
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { messageId, action } = body;

    if (!messageId) {
      return NextResponse.json(
        { error: "Message ID is required" },
        { status: 400 }
      );
    }

    if (action === "update-status") {
      const { status } = body;

      if (!status || !Object.values(InboxStatus).includes(status as InboxStatus)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }

      const result = await updateMessageStatus(
        messageId,
        status as InboxStatus,
        session.user.id
      );

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    }

    if (action === "assign") {
      const { assigneeId } = body;

      const result = await assignMessage(
        messageId,
        assigneeId || null,
        session.user.id
      );

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    }

    if (action === "update-labels") {
      const { labels } = body;

      if (!Array.isArray(labels)) {
        return NextResponse.json(
          { error: "Labels must be an array" },
          { status: 400 }
        );
      }

      const result = await updateMessageLabels(messageId, labels, session.user.id);

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    }

    if (action === "add-label") {
      const { label } = body;

      if (!label) {
        return NextResponse.json({ error: "Label is required" }, { status: 400 });
      }

      const result = await addMessageLabel(messageId, label, session.user.id);

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    }

    if (action === "remove-label") {
      const { label } = body;

      if (!label) {
        return NextResponse.json({ error: "Label is required" }, { status: 400 });
      }

      const result = await removeMessageLabel(messageId, label, session.user.id);

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Inbox update error:", error);
    return NextResponse.json(
      { error: "Failed to update message" },
      { status: 500 }
    );
  }
}
