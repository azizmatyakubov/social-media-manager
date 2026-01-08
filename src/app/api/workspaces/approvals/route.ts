import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createApprovalRequest,
  reviewApprovalRequest,
  canPerformAction,
} from "@/lib/workspace";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    const status = searchParams.get("status");

    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace ID required" }, { status: 400 });
    }

    const approvals = await prisma.approvalRequest.findMany({
      where: {
        workspaceId,
        ...(status && { status: status as "PENDING" | "APPROVED" | "REJECTED" }),
      },
      orderBy: { createdAt: "desc" },
    });

    // Get related posts
    const postIds = approvals.map((a) => a.postId);
    const posts = await prisma.post.findMany({
      where: { id: { in: postIds } },
      select: {
        id: true,
        content: true,
        platform: true,
        scheduledFor: true,
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    const postsMap = new Map(posts.map((p) => [p.id, p]));

    const approvalsWithPosts = approvals.map((a) => ({
      ...a,
      post: postsMap.get(a.postId),
    }));

    return NextResponse.json(approvalsWithPosts);
  } catch (error) {
    console.error("Approvals fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch approvals" },
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
    const { action, workspaceId, postId, requestId, approved, comment } = body;

    // Check workspace membership
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: session.user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Not a member" }, { status: 403 });
    }

    if (action === "request") {
      const request = await createApprovalRequest(
        workspaceId,
        postId,
        session.user.id
      );
      return NextResponse.json(request);
    }

    if (action === "review") {
      if (!canPerformAction(membership.role, "post.approve")) {
        return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
      }

      const result = await reviewApprovalRequest(
        requestId,
        session.user.id,
        approved,
        comment
      );
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Approval action error:", error);
    return NextResponse.json(
      { error: "Failed to process approval" },
      { status: 500 }
    );
  }
}
