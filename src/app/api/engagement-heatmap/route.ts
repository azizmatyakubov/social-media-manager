import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getEngagementAnalytics,
  getAllPlatformAnalytics,
  getHeatmapComparison,
  getOptimalPostingSchedule,
  getEngagementStats,
  PLATFORMS,
  PERIODS,
  DAYS,
} from "@/lib/engagement-heatmap";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    switch (action) {
      case "analytics": {
        const platform = searchParams.get("platform") || "instagram";
        const dateRange = (searchParams.get("dateRange") || "30d") as "7d" | "30d" | "90d";
        const analytics = getEngagementAnalytics(session.user.id, platform, dateRange);
        return NextResponse.json({ analytics });
      }

      case "all-platforms": {
        const allAnalytics = getAllPlatformAnalytics(session.user.id);
        return NextResponse.json({ analytics: allAnalytics });
      }

      case "comparison": {
        const platformsParam = searchParams.get("platforms");
        const platforms = platformsParam ? platformsParam.split(",") : ["instagram", "twitter"];
        const comparison = getHeatmapComparison(session.user.id, platforms);
        return NextResponse.json({ comparison });
      }

      case "optimal-schedule": {
        const platform = searchParams.get("platform") || "instagram";
        const schedule = getOptimalPostingSchedule(session.user.id, platform);
        return NextResponse.json({ schedule });
      }

      case "stats": {
        const stats = getEngagementStats(session.user.id);
        return NextResponse.json({ stats });
      }

      case "constants": {
        return NextResponse.json({
          platforms: PLATFORMS,
          days: DAYS,
          periods: PERIODS,
        });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Engagement heatmap GET error:", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
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
      case "refresh-analytics": {
        const { platform, dateRange } = data;
        const validDateRange = (["7d", "30d", "90d"].includes(dateRange) ? dateRange : "30d") as "7d" | "30d" | "90d";
        const analytics = getEngagementAnalytics(
          session.user.id,
          platform || "instagram",
          validDateRange
        );
        return NextResponse.json({ analytics });
      }

      case "export-heatmap": {
        const { platform, dateRange, format } = data;
        const validDateRange = (["7d", "30d", "90d"].includes(dateRange) ? dateRange : "30d") as "7d" | "30d" | "90d";
        const analytics = getEngagementAnalytics(
          session.user.id,
          platform || "instagram",
          validDateRange
        );

        if (!analytics) {
          return NextResponse.json({ error: "No analytics data" }, { status: 404 });
        }

        // Format for export
        if (format === "csv") {
          const csvRows = ["Day,Hour,Engagement,Posts,Avg Likes,Avg Comments,Avg Shares,Avg Reach"];

          analytics.heatmapData.forEach((cell) => {
            csvRows.push(
              `${DAYS[cell.day]},${cell.hour}:00,${cell.value},${cell.posts},${cell.avgLikes},${cell.avgComments},${cell.avgShares},${cell.avgReach}`
            );
          });

          return NextResponse.json({
            csv: csvRows.join("\n"),
            filename: `engagement-heatmap-${platform}-${dateRange}.csv`
          });
        }

        return NextResponse.json({ analytics });
      }

      case "get-recommendations": {
        const { platform } = data;
        const analytics = getEngagementAnalytics(
          session.user.id,
          platform || "instagram",
          "30d"
        );

        if (!analytics) {
          return NextResponse.json({ error: "No analytics data" }, { status: 404 });
        }

        // Generate recommendations based on best times
        const recommendations = analytics.bestTimes.slice(0, 5).map((time, index) => ({
          priority: index + 1,
          day: time.day,
          hour: time.hour,
          score: time.score,
          avgEngagement: time.avgEngagement,
          confidence: time.confidence,
        }));

        return NextResponse.json({ recommendations });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Engagement heatmap POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process request" },
      { status: 500 }
    );
  }
}
