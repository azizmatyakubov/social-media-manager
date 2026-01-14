import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getEngagementByHour,
  getEngagementByDay,
  getContentTypePerformance,
  getGrowthTrend,
  analyzeAudience,
  getTopPerformingPosts,
  getEngagementSummary,
} from "@/lib/audience-insights";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (action === "by-hour") {
      const data = await getEngagementByHour(session.user.id);
      return NextResponse.json(data);
    }

    if (action === "by-day") {
      const data = await getEngagementByDay(session.user.id);
      return NextResponse.json(data);
    }

    if (action === "content-performance") {
      const data = await getContentTypePerformance(session.user.id);
      return NextResponse.json(data);
    }

    if (action === "growth") {
      const days = parseInt(searchParams.get("days") || "30");
      const data = await getGrowthTrend(session.user.id, days);
      return NextResponse.json(data);
    }

    if (action === "top-posts") {
      const limit = parseInt(searchParams.get("limit") || "10");
      const data = await getTopPerformingPosts(session.user.id, limit);
      return NextResponse.json(data);
    }

    if (action === "summary") {
      const data = await getEngagementSummary(session.user.id);
      return NextResponse.json(data);
    }

    if (action === "analyze") {
      const data = await analyzeAudience(session.user.id);
      return NextResponse.json(data);
    }

    // Default: return all insights
    const [byHour, byDay, contentPerformance, growth, topPosts, summary] = await Promise.all([
      getEngagementByHour(session.user.id),
      getEngagementByDay(session.user.id),
      getContentTypePerformance(session.user.id),
      getGrowthTrend(session.user.id, 30),
      getTopPerformingPosts(session.user.id, 5),
      getEngagementSummary(session.user.id),
    ]);

    return NextResponse.json({
      byHour,
      byDay,
      contentPerformance,
      growth,
      topPosts,
      summary,
    });
  } catch (error) {
    console.error("Audience insights error:", error);
    return NextResponse.json(
      { error: "Failed to fetch audience insights" },
      { status: 500 }
    );
  }
}
