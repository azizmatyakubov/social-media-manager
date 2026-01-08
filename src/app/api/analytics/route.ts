import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(todayStart);
    monthStart.setDate(monthStart.getDate() - 30);

    // Get all posts for the user
    const allPosts = await prisma.post.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    // Calculate metrics
    const totalPosts = allPosts.length;
    const postedCount = allPosts.filter((p) => p.status === "POSTED").length;
    const pendingCount = allPosts.filter((p) => p.status === "PENDING").length;
    const scheduledCount = allPosts.filter((p) => p.status === "SCHEDULED").length;
    const failedCount = allPosts.filter((p) => p.status === "FAILED").length;

    // Posts by time period
    const todayPosts = allPosts.filter(
      (p) => new Date(p.createdAt) >= todayStart
    ).length;
    const weekPosts = allPosts.filter(
      (p) => new Date(p.createdAt) >= weekStart
    ).length;
    const monthPosts = allPosts.filter(
      (p) => new Date(p.createdAt) >= monthStart
    ).length;

    // Published posts by time period
    const publishedToday = allPosts.filter(
      (p) => p.status === "POSTED" && p.postedAt && new Date(p.postedAt) >= todayStart
    ).length;
    const publishedWeek = allPosts.filter(
      (p) => p.status === "POSTED" && p.postedAt && new Date(p.postedAt) >= weekStart
    ).length;
    const publishedMonth = allPosts.filter(
      (p) => p.status === "POSTED" && p.postedAt && new Date(p.postedAt) >= monthStart
    ).length;

    // Daily posting data for the last 14 days (for chart)
    const dailyData = [];
    for (let i = 13; i >= 0; i--) {
      const date = new Date(todayStart);
      date.setDate(date.getDate() - i);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayPosts = allPosts.filter((p) => {
        const postDate = p.postedAt ? new Date(p.postedAt) : new Date(p.createdAt);
        return postDate >= date && postDate < nextDate && p.status === "POSTED";
      }).length;

      dailyData.push({
        date: date.toISOString().split("T")[0],
        label: date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
        posts: dayPosts,
      });
    }

    // Posting hour distribution (for best time analysis)
    const hourDistribution: Record<number, number> = {};
    allPosts
      .filter((p) => p.status === "POSTED" && p.postedAt)
      .forEach((p) => {
        const hour = new Date(p.postedAt!).getHours();
        hourDistribution[hour] = (hourDistribution[hour] || 0) + 1;
      });

    // Find best posting hour
    let bestHour = 9; // default
    let maxPosts = 0;
    Object.entries(hourDistribution).forEach(([hour, count]) => {
      if (count > maxPosts) {
        maxPosts = count;
        bestHour = parseInt(hour);
      }
    });

    // Success rate
    const attemptedPosts = postedCount + failedCount;
    const successRate = attemptedPosts > 0 ? Math.round((postedCount / attemptedPosts) * 100) : 100;

    // Average posts per day (last 30 days)
    const avgPostsPerDay = monthPosts > 0 ? (publishedMonth / 30).toFixed(1) : "0";

    // Streak calculation (consecutive days with posts)
    let currentStreak = 0;
    let checkDate = new Date(todayStart);
    while (true) {
      const nextDate = new Date(checkDate);
      nextDate.setDate(nextDate.getDate() + 1);

      const hasPost = allPosts.some((p) => {
        if (p.status !== "POSTED" || !p.postedAt) return false;
        const postDate = new Date(p.postedAt);
        return postDate >= checkDate && postDate < nextDate;
      });

      if (hasPost) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return NextResponse.json({
      overview: {
        totalPosts,
        postedCount,
        pendingCount,
        scheduledCount,
        failedCount,
        successRate,
      },
      periods: {
        today: { total: todayPosts, published: publishedToday },
        week: { total: weekPosts, published: publishedWeek },
        month: { total: monthPosts, published: publishedMonth },
      },
      insights: {
        avgPostsPerDay,
        bestHour,
        bestHourFormatted: `${bestHour % 12 || 12}:00 ${bestHour >= 12 ? "PM" : "AM"}`,
        currentStreak,
      },
      chartData: {
        daily: dailyData,
        hourDistribution: Object.entries(hourDistribution).map(([hour, count]) => ({
          hour: parseInt(hour),
          label: `${parseInt(hour) % 12 || 12}${parseInt(hour) >= 12 ? "pm" : "am"}`,
          posts: count,
        })),
      },
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
