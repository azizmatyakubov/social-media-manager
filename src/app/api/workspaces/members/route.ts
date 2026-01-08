import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  inviteMember,
  acceptInvite,
  removeMember,
  updateMemberRole,
  canPerformAction,
} from "@/lib/workspace";
import { WorkspaceRole } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace ID required" }, { status: 400 });
    }

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json(members);
  } catch (error) {
    console.error("Members fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch members" },
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
    const { action, workspaceId, email, role, token, memberId, newRole } = body;

    // Check permissions for workspace actions
    if (workspaceId) {
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

      if (action === "invite" && !canPerformAction(membership.role, "member.invite")) {
        return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
      }
    }

    if (action === "invite") {
      const invite = await inviteMember(
        workspaceId,
        session.user.id,
        email,
        role as WorkspaceRole
      );
      return NextResponse.json(invite);
    }

    if (action === "accept") {
      const member = await acceptInvite(token, session.user.id);
      return NextResponse.json(member);
    }

    if (action === "remove") {
      await removeMember(workspaceId, memberId, session.user.id);
      return NextResponse.json({ success: true });
    }

    if (action === "updateRole") {
      const member = await updateMemberRole(
        workspaceId,
        memberId,
        newRole as WorkspaceRole,
        session.user.id
      );
      return NextResponse.json(member);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Member action error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process member action" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace ID required" }, { status: 400 });
    }

    // Leave workspace
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: session.user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Not a member" }, { status: 404 });
    }

    if (membership.role === WorkspaceRole.OWNER) {
      return NextResponse.json(
        { error: "Owners cannot leave. Transfer ownership first." },
        { status: 400 }
      );
    }

    await prisma.workspaceMember.delete({
      where: { id: membership.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Leave workspace error:", error);
    return NextResponse.json(
      { error: "Failed to leave workspace" },
      { status: 500 }
    );
  }
}
