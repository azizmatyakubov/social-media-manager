import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { reorderGrid, calculateColorHarmony } from "@/lib/grid-planner";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { planId, positions } = body;

    if (!planId) {
      return NextResponse.json(
        { error: "Plan ID required" },
        { status: 400 }
      );
    }

    if (!positions || !Array.isArray(positions)) {
      return NextResponse.json(
        { error: "Positions array required" },
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

    // Validate position data
    for (const pos of positions) {
      if (
        typeof pos.from !== "number" ||
        typeof pos.to !== "number" ||
        pos.from < 0 ||
        pos.from > 8 ||
        pos.to < 0 ||
        pos.to > 8
      ) {
        return NextResponse.json(
          { error: "Invalid position values. Must be 0-8." },
          { status: 400 }
        );
      }
    }

    const updatedPlan = await reorderGrid(planId, positions);
    const harmony = await calculateColorHarmony(updatedPlan.posts);

    return NextResponse.json({
      plan: updatedPlan,
      harmony,
    });
  } catch (error) {
    console.error("Grid reorder error:", error);
    return NextResponse.json(
      { error: "Failed to reorder grid" },
      { status: 500 }
    );
  }
}
