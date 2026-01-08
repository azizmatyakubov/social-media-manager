import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createWorkspace,
  getUserWorkspaces,
  getWorkspaceWithMembers,
} from "@/lib/workspace";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");

    if (workspaceId) {
      const workspace = await getWorkspaceWithMembers(workspaceId);
      return NextResponse.json(workspace);
    }

    const workspaces = await getUserWorkspaces(session.user.id);
    return NextResponse.json(workspaces);
  } catch (error) {
    console.error("Workspaces fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch workspaces" },
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
    const { name, description, requireApproval } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const workspace = await createWorkspace(session.user.id, {
      name,
      description,
      requireApproval,
    });

    return NextResponse.json(workspace);
  } catch (error) {
    console.error("Workspace create error:", error);
    return NextResponse.json(
      { error: "Failed to create workspace" },
      { status: 500 }
    );
  }
}
