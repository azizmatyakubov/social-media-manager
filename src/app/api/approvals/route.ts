import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createApprovalRequest,
  getApprovalRequests,
  getApprovalRequest,
  approveRequest,
  rejectRequest,
  requestChanges,
  addApprovalComment,
  cancelRequest,
  resubmitRequest,
  getApprovalStats,
  getPendingForReview,
  bulkApprove,
  type ApprovalStatus,
  type Priority,
} from "@/lib/approvals";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    switch (action) {
      case "list": {
        const workspaceId = searchParams.get("workspaceId") || undefined;
        const status = searchParams.get("status") as ApprovalStatus | null;
        const priority = searchParams.get("priority") as Priority | null;
        const isReviewer = searchParams.get("isReviewer") === "true";
        const limit = searchParams.get("limit");
        const offset = searchParams.get("offset");

        const requests = await getApprovalRequests(session.user.id, {
          workspaceId,
          status: status || undefined,
          priority: priority || undefined,
          isReviewer,
          limit: limit ? parseInt(limit) : undefined,
          offset: offset ? parseInt(offset) : undefined,
        });

        return NextResponse.json({ requests });
      }

      case "get": {
        const requestId = searchParams.get("requestId");
        if (!requestId) {
          return NextResponse.json({ error: "Request ID required" }, { status: 400 });
        }

        const approvalRequest = await getApprovalRequest(requestId, session.user.id);
        if (!approvalRequest) {
          return NextResponse.json({ error: "Request not found" }, { status: 404 });
        }

        return NextResponse.json({ request: approvalRequest });
      }

      case "pending-review": {
        const workspaceId = searchParams.get("workspaceId") || undefined;
        const requests = await getPendingForReview(session.user.id, workspaceId);
        return NextResponse.json({ requests });
      }

      case "stats": {
        const workspaceId = searchParams.get("workspaceId") || undefined;
        const stats = await getApprovalStats(session.user.id, workspaceId);
        return NextResponse.json({ stats });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Approvals GET error:", error);
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
      case "create": {
        const { postId, workspaceId, priority, dueDate, notes } = data;

        if (!postId) {
          return NextResponse.json({ error: "Post ID required" }, { status: 400 });
        }

        const approvalRequest = await createApprovalRequest(session.user.id, {
          postId,
          workspaceId,
          priority,
          dueDate: dueDate ? new Date(dueDate) : undefined,
          notes,
        });

        return NextResponse.json({ request: approvalRequest });
      }

      case "approve": {
        const { requestId, comment } = data;
        if (!requestId) {
          return NextResponse.json({ error: "Request ID required" }, { status: 400 });
        }

        await approveRequest(
          requestId,
          session.user.id,
          session.user.name || session.user.email || "Unknown",
          comment
        );

        return NextResponse.json({ success: true });
      }

      case "reject": {
        const { requestId, reason } = data;
        if (!requestId || !reason) {
          return NextResponse.json({ error: "Request ID and reason required" }, { status: 400 });
        }

        await rejectRequest(
          requestId,
          session.user.id,
          session.user.name || session.user.email || "Unknown",
          reason
        );

        return NextResponse.json({ success: true });
      }

      case "request-changes": {
        const { requestId, feedback } = data;
        if (!requestId || !feedback) {
          return NextResponse.json({ error: "Request ID and feedback required" }, { status: 400 });
        }

        await requestChanges(
          requestId,
          session.user.id,
          session.user.name || session.user.email || "Unknown",
          feedback
        );

        return NextResponse.json({ success: true });
      }

      case "comment": {
        const { requestId, content, type } = data;
        if (!requestId || !content) {
          return NextResponse.json({ error: "Request ID and content required" }, { status: 400 });
        }

        const comment = await addApprovalComment(
          session.user.id,
          session.user.name || session.user.email || "Unknown",
          { requestId, content, type }
        );

        return NextResponse.json({ comment });
      }

      case "cancel": {
        const { requestId } = data;
        if (!requestId) {
          return NextResponse.json({ error: "Request ID required" }, { status: 400 });
        }

        await cancelRequest(requestId, session.user.id);
        return NextResponse.json({ success: true });
      }

      case "resubmit": {
        const { requestId, notes } = data;
        if (!requestId) {
          return NextResponse.json({ error: "Request ID required" }, { status: 400 });
        }

        await resubmitRequest(requestId, session.user.id, notes);
        return NextResponse.json({ success: true });
      }

      case "bulk-approve": {
        const { requestIds } = data;
        if (!requestIds || !Array.isArray(requestIds)) {
          return NextResponse.json({ error: "Request IDs array required" }, { status: 400 });
        }

        const result = await bulkApprove(
          requestIds,
          session.user.id,
          session.user.name || session.user.email || "Unknown"
        );

        return NextResponse.json(result);
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Approvals POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process request" },
      { status: 500 }
    );
  }
}
