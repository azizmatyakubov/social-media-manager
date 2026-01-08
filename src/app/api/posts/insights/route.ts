import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasFeatureAccess } from "@/lib/subscription";
import { analyzeEngagement } from "@/lib/openai";

// GET - Get insights for a specific post
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAccess = await hasFeatureAccess(session.user.id, "AI Engagement Insights");
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Upgrade to access AI Engagement Insights" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const postId = searchParams.get("postId");

    if (!postId) {
      return NextResponse.json({ error: "Post ID is required" }, { status: 400 });
    }

    // Get the post
    const post = await prisma.post.findFirst({
      where: { id: postId, userId: session.user.id },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (post.status !== "POSTED") {
      return NextResponse.json(
        { error: "Insights are only available for published posts" },
        { status: 400 }
      );
    }

    // Analyze with AI
    const insights = await analyzeEngagement(post.content, {
      likes: post.likes,
      retweets: post.retweets,
      replies: post.replies,
      impressions: post.impressions,
    });

    // Calculate engagement metrics
    const engagementRate = post.impressions > 0
      ? ((post.likes + post.retweets + post.replies) / post.impressions * 100)
      : 0;

    return NextResponse.json({
      post: {
        id: post.id,
        content: post.content,
        postedAt: post.postedAt,
      },
      metrics: {
        likes: post.likes,
        retweets: post.retweets,
        replies: post.replies,
        impressions: post.impressions,
        engagementRate: engagementRate.toFixed(2),
      },
      insights,
    });
  } catch (error) {
    console.error("Get insights error:", error);
    return NextResponse.json(
      { error: "Failed to get insights" },
      { status: 500 }
    );
  }
}

// POST - Get aggregate insights for multiple posts
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAccess = await hasFeatureAccess(session.user.id, "AI Engagement Insights");
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Upgrade to access AI Engagement Insights" },
        { status: 403 }
      );
    }

    const { period = "week" } = await request.json();

    // Calculate date range
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "day":
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Get posted posts in the period
    const posts = await prisma.post.findMany({
      where: {
        userId: session.user.id,
        status: "POSTED",
        postedAt: { gte: startDate },
      },
      orderBy: { postedAt: "desc" },
    });

    if (posts.length === 0) {
      return NextResponse.json({
        summary: {
          totalPosts: 0,
          totalImpressions: 0,
          totalEngagements: 0,
          avgEngagementRate: 0,
        },
        topPost: null,
        insights: {
          analysis: "No posts in this period. Start posting to see insights!",
          whatWorked: [],
          improvements: ["Post consistently to build audience", "Try posting at different times"],
          optimalPostingTips: [],
        },
        posts: [],
      });
    }

    // Calculate aggregate metrics
    const totalImpressions = posts.reduce((sum, p) => sum + p.impressions, 0);
    const totalEngagements = posts.reduce(
      (sum, p) => sum + p.likes + p.retweets + p.replies,
      0
    );
    const avgEngagementRate = totalImpressions > 0
      ? (totalEngagements / totalImpressions * 100)
      : 0;

    // Find top performing post
    const topPost = posts.reduce((best, post) => {
      const currentScore = post.likes + (post.retweets * 2) + (post.replies * 3);
      const bestScore = best.likes + (best.retweets * 2) + (best.replies * 3);
      return currentScore > bestScore ? post : best;
    }, posts[0]);

    // Analyze the top post for insights
    const insights = await analyzeEngagement(topPost.content, {
      likes: topPost.likes,
      retweets: topPost.retweets,
      replies: topPost.replies,
      impressions: topPost.impressions,
    });

    // Calculate best posting time from historical data
    const postingTimes = posts.map((p) => {
      if (!p.postedAt) return null;
      const hour = p.postedAt.getHours();
      const engagementScore = p.likes + (p.retweets * 2) + (p.replies * 3);
      return { hour, engagementScore };
    }).filter(Boolean);

    const hourScores: Record<number, { total: number; count: number }> = {};
    postingTimes.forEach((pt) => {
      if (!pt) return;
      if (!hourScores[pt.hour]) {
        hourScores[pt.hour] = { total: 0, count: 0 };
      }
      hourScores[pt.hour].total += pt.engagementScore;
      hourScores[pt.hour].count++;
    });

    const bestHours = Object.entries(hourScores)
      .map(([hour, data]) => ({
        hour: parseInt(hour),
        avgEngagement: data.total / data.count,
      }))
      .sort((a, b) => b.avgEngagement - a.avgEngagement)
      .slice(0, 3);

    // Analyze content patterns
    const contentPatterns = {
      withEmojis: posts.filter((p) => /[\u{1F600}-\u{1F64F}]/u.test(p.content)).length,
      withHashtags: posts.filter((p) => /#\w+/.test(p.content)).length,
      withQuestions: posts.filter((p) => /\?/.test(p.content)).length,
      withNumbers: posts.filter((p) => /\d/.test(p.content)).length,
    };

    return NextResponse.json({
      summary: {
        totalPosts: posts.length,
        totalImpressions,
        totalEngagements,
        avgEngagementRate: avgEngagementRate.toFixed(2),
      },
      topPost: {
        id: topPost.id,
        content: topPost.content,
        likes: topPost.likes,
        retweets: topPost.retweets,
        replies: topPost.replies,
        impressions: topPost.impressions,
      },
      insights,
      bestPostingTimes: bestHours.map((h) => ({
        hour: h.hour,
        label: `${h.hour.toString().padStart(2, "0")}:00`,
        avgEngagement: Math.round(h.avgEngagement),
      })),
      contentPatterns,
      period,
    });
  } catch (error) {
    console.error("Get aggregate insights error:", error);
    return NextResponse.json(
      { error: "Failed to get insights" },
      { status: 500 }
    );
  }
}
