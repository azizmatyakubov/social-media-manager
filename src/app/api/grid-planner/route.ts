import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getGridPlan,
  createGridPlan,
  updateGridPosition,
  getPublishedGrid,
  previewGrid,
  publishGridPost,
  clearGridPosition,
  calculateColorHarmony,
} from "@/lib/grid-planner";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const instagramAccountId = searchParams.get("instagramAccountId");
    const action = searchParams.get("action");

    if (!instagramAccountId) {
      // Return user's Instagram accounts for selection
      const accounts = await prisma.instagramAccount.findMany({
        where: { userId: session.user.id },
        select: {
          id: true,
          username: true,
          instagramId: true,
          isDefault: true,
        },
      });

      return NextResponse.json({ accounts });
    }

    // Verify the account belongs to the user
    const account = await prisma.instagramAccount.findFirst({
      where: {
        id: instagramAccountId,
        userId: session.user.id,
      },
    });

    if (!account) {
      return NextResponse.json(
        { error: "Instagram account not found" },
        { status: 404 }
      );
    }

    if (action === "published") {
      // Get published grid from Instagram
      const published = await getPublishedGrid(instagramAccountId);
      return NextResponse.json({ published });
    }

    if (action === "preview") {
      const planId = searchParams.get("planId");
      if (!planId) {
        return NextResponse.json(
          { error: "Plan ID required for preview" },
          { status: 400 }
        );
      }
      const preview = await previewGrid(planId);
      return NextResponse.json(preview);
    }

    // Get or create grid plan
    let plan = await getGridPlan(session.user.id, instagramAccountId);

    if (!plan) {
      plan = await createGridPlan(session.user.id, instagramAccountId);
    }

    // Calculate color harmony
    const harmony = await calculateColorHarmony(plan.posts);

    return NextResponse.json({
      plan,
      harmony,
      account: {
        id: account.id,
        username: account.username,
      },
    });
  } catch (error) {
    console.error("Grid planner GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch grid plan" },
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
    const { action, instagramAccountId } = body;

    if (!instagramAccountId) {
      return NextResponse.json(
        { error: "Instagram account ID required" },
        { status: 400 }
      );
    }

    // Verify account ownership
    const account = await prisma.instagramAccount.findFirst({
      where: {
        id: instagramAccountId,
        userId: session.user.id,
      },
    });

    if (!account) {
      return NextResponse.json(
        { error: "Instagram account not found" },
        { status: 404 }
      );
    }

    if (action === "create") {
      const plan = await createGridPlan(session.user.id, instagramAccountId);
      return NextResponse.json({ plan });
    }

    if (action === "publish") {
      const { planId, position } = body;
      if (planId === undefined || position === undefined) {
        return NextResponse.json(
          { error: "Plan ID and position required" },
          { status: 400 }
        );
      }

      const result = await publishGridPost(planId, position);

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({ success: true, postId: result.postId });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Grid planner POST error:", error);
    return NextResponse.json(
      { error: "Failed to process grid action" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { planId, position, imageUrl, scheduledFor, caption, aspectRatio, action } = body;

    if (!planId) {
      return NextResponse.json(
        { error: "Plan ID required" },
        { status: 400 }
      );
    }

    // Verify plan ownership
    const plan = await prisma.gridPlan.findFirst({
      where: {
        id: planId,
        userId: session.user.id,
      },
    });

    if (!plan) {
      return NextResponse.json(
        { error: "Grid plan not found" },
        { status: 404 }
      );
    }

    if (position === undefined) {
      return NextResponse.json(
        { error: "Position required" },
        { status: 400 }
      );
    }

    if (action === "clear") {
      const updatedPlan = await clearGridPosition(planId, position);
      const harmony = await calculateColorHarmony(updatedPlan.posts);
      return NextResponse.json({ plan: updatedPlan, harmony });
    }

    const updatedPlan = await updateGridPosition(
      planId,
      position,
      imageUrl ?? null,
      scheduledFor ?? null,
      caption,
      aspectRatio
    );

    const harmony = await calculateColorHarmony(updatedPlan.posts);

    return NextResponse.json({ plan: updatedPlan, harmony });
  } catch (error) {
    console.error("Grid planner PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update grid position" },
      { status: 500 }
    );
  }
}
