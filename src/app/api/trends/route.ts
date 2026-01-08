import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasFeatureAccess } from "@/lib/subscription";
import { suggestTrendingPost } from "@/lib/openai";

interface Trend {
  name: string;
  volume?: number;
  url?: string;
  category?: string;
}

// Cache duration in milliseconds (15 minutes)
const CACHE_DURATION = 15 * 60 * 1000;

// Simulated trend categories for demo (in production, use X API trends endpoint)
const TECH_TRENDS: Trend[] = [
  { name: "#BuildInPublic", category: "tech", volume: 15000 },
  { name: "#IndieHackers", category: "tech", volume: 12000 },
  { name: "#SaaS", category: "tech", volume: 10000 },
  { name: "AI tools", category: "tech", volume: 25000 },
  { name: "#StartupLife", category: "tech", volume: 8000 },
  { name: "Product Hunt", category: "tech", volume: 6000 },
  { name: "#100DaysOfCode", category: "tech", volume: 5000 },
  { name: "TypeScript", category: "tech", volume: 4500 },
  { name: "#NoCode", category: "tech", volume: 4000 },
  { name: "Remote Work", category: "business", volume: 20000 },
];

// GET - Get trending topics
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check feature access
    const hasAccess = await hasFeatureAccess(session.user.id, "Trend Radar");
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Upgrade to access Trend Radar" },
        { status: 403 }
      );
    }

    // Check cache
    const cachedTrends = await prisma.trendCache.findUnique({
      where: {
        category_region: {
          category: "tech",
          region: "US",
        },
      },
    });

    let trends: Trend[];

    if (cachedTrends && Date.now() - cachedTrends.fetchedAt.getTime() < CACHE_DURATION) {
      // Use cached trends
      trends = cachedTrends.trends as unknown as Trend[];
    } else {
      // In production, fetch from X API here
      // For now, use simulated trends with some randomization
      trends = TECH_TRENDS.map((t) => ({
        ...t,
        volume: t.volume! + Math.floor(Math.random() * 5000),
      })).sort((a, b) => (b.volume || 0) - (a.volume || 0));

      // Update cache
      await prisma.trendCache.upsert({
        where: {
          category_region: {
            category: "tech",
            region: "US",
          },
        },
        create: {
          category: "tech",
          region: "US",
          trends: trends as object[],
          fetchedAt: new Date(),
        },
        update: {
          trends: trends as object[],
          fetchedAt: new Date(),
        },
      });
    }

    // Get user's posting config for personalized recommendations
    const postingConfig = await prisma.postingConfig.findUnique({
      where: { userId: session.user.id },
    });

    // Filter trends by user's topics if configured
    let relevantTrends = trends;
    if (postingConfig?.topics && postingConfig.topics.length > 0) {
      const userTopicsLower = postingConfig.topics.map((t) => t.toLowerCase());
      relevantTrends = trends.filter((trend) => {
        const trendName = trend.name.toLowerCase();
        return userTopicsLower.some(
          (topic) => trendName.includes(topic) || topic.includes(trendName.replace("#", ""))
        );
      });
      // If no matches, return top general trends
      if (relevantTrends.length === 0) {
        relevantTrends = trends.slice(0, 5);
      }
    }

    return NextResponse.json({
      trends: relevantTrends,
      allTrends: trends,
      lastUpdated: cachedTrends?.fetchedAt || new Date(),
      userTopics: postingConfig?.topics || [],
    });
  } catch (error) {
    console.error("Get trends error:", error);
    return NextResponse.json(
      { error: "Failed to get trends" },
      { status: 500 }
    );
  }
}

// POST - Generate a post based on a trend
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAccess = await hasFeatureAccess(session.user.id, "Trend Radar");
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Upgrade to access Trend Radar" },
        { status: 403 }
      );
    }

    const { trendName, context } = await request.json();

    if (!trendName) {
      return NextResponse.json({ error: "Trend name is required" }, { status: 400 });
    }

    // Get user's posting config
    const postingConfig = await prisma.postingConfig.findUnique({
      where: { userId: session.user.id },
    });

    if (!postingConfig) {
      return NextResponse.json(
        { error: "Please configure your posting settings first" },
        { status: 400 }
      );
    }

    const content = await suggestTrendingPost(
      { name: trendName, context },
      postingConfig.instructions,
      postingConfig.tone
    );

    return NextResponse.json({
      content,
      trend: trendName,
      message: "Trend-based post generated successfully",
    });
  } catch (error) {
    console.error("Generate trend post error:", error);
    return NextResponse.json(
      { error: "Failed to generate trend post" },
      { status: 500 }
    );
  }
}
