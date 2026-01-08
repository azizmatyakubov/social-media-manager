import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getAnalyticsDashboard,
  getBestPostingTimes,
  getContentPerformance,
  getGrowthProjection,
} from "@/lib/analytics";
import { Platform } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const platform = (searchParams.get("platform") as Platform) || Platform.X;
    const days = parseInt(searchParams.get("days") || "30");

    if (action === "best-times") {
      const times = await getBestPostingTimes(session.user.id, platform);
      return NextResponse.json(times);
    }

    if (action === "content-performance") {
      const performance = await getContentPerformance(session.user.id, platform);
      return NextResponse.json(performance);
    }

    if (action === "growth-projection") {
      const projection = await getGrowthProjection(session.user.id, platform);
      return NextResponse.json(projection);
    }

    // Default: full dashboard
    const dashboard = await getAnalyticsDashboard(session.user.id, platform, days);
    return NextResponse.json(dashboard);
  } catch (error) {
    console.error("Analytics dashboard error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
