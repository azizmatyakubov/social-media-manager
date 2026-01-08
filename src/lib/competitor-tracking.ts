import { prisma } from "./prisma";
import { Platform } from "@prisma/client";

export interface CompetitorInput {
  platform: Platform;
  username: string;
  platformId?: string;
  name?: string;
}

export async function addCompetitor(userId: string, data: CompetitorInput) {
  // Check if already tracking
  const existing = await prisma.competitor.findFirst({
    where: {
      userId,
      platform: data.platform,
      username: data.username,
    },
  });

  if (existing) {
    throw new Error("Already tracking this competitor");
  }

  return prisma.competitor.create({
    data: {
      userId,
      platform: data.platform,
      platformId: data.platformId || data.username,
      username: data.username,
      name: data.name,
    },
  });
}

export async function removeCompetitor(competitorId: string) {
  return prisma.competitor.delete({
    where: { id: competitorId },
  });
}

export async function getCompetitors(userId: string, platform?: Platform) {
  return prisma.competitor.findMany({
    where: {
      userId,
      isActive: true,
      ...(platform && { platform }),
    },
    include: {
      snapshots: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
}

export async function createSnapshot(competitorId: string, data: {
  followers: number;
  following: number;
  totalPosts: number;
  avgLikes: number;
  avgRetweets: number;
  avgReplies: number;
  engagementRate: number;
  postsPerDay: number;
  peakHours: number[];
  topHashtags: string[];
  topPosts?: Array<{
    id: string;
    content: string;
    likes: number;
    retweets: number;
    postedAt: string;
  }>;
}) {
  return prisma.competitorSnapshot.create({
    data: {
      competitorId,
      followers: data.followers,
      following: data.following,
      totalPosts: data.totalPosts,
      avgLikes: data.avgLikes,
      avgRetweets: data.avgRetweets,
      avgReplies: data.avgReplies,
      engagementRate: data.engagementRate,
      postsPerDay: data.postsPerDay,
      peakHours: data.peakHours,
      topHashtags: data.topHashtags,
      topPosts: data.topPosts,
    },
  });
}

export async function getCompetitorAnalysis(competitorId: string) {
  const competitor = await prisma.competitor.findUnique({
    where: { id: competitorId },
    include: {
      snapshots: {
        orderBy: { createdAt: "desc" },
        take: 30, // Last 30 snapshots
      },
    },
  });

  if (!competitor) {
    throw new Error("Competitor not found");
  }

  const snapshots = competitor.snapshots;
  if (snapshots.length === 0) {
    return {
      competitor,
      analysis: null,
    };
  }

  const latest = snapshots[0];
  const oldest = snapshots[snapshots.length - 1];

  // Calculate growth
  const followerGrowth = latest.followers - oldest.followers;
  const followerGrowthRate = oldest.followers > 0
    ? ((followerGrowth / oldest.followers) * 100).toFixed(2)
    : "0";

  // Calculate averages
  const avgEngagementRate = snapshots.reduce((sum, s) => sum + s.engagementRate, 0) / snapshots.length;

  // Find peak posting hours
  const hourCounts: Record<number, number> = {};
  snapshots.forEach((s) => {
    s.peakHours.forEach((h) => {
      hourCounts[h] = (hourCounts[h] || 0) + 1;
    });
  });
  const consistentPeakHours = Object.entries(hourCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([hour]) => parseInt(hour));

  // Find common hashtags
  const hashtagCounts: Record<string, number> = {};
  snapshots.forEach((s) => {
    s.topHashtags.forEach((h) => {
      hashtagCounts[h] = (hashtagCounts[h] || 0) + 1;
    });
  });
  const commonHashtags = Object.entries(hashtagCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([hashtag]) => hashtag);

  return {
    competitor,
    analysis: {
      currentMetrics: {
        followers: latest.followers,
        following: latest.following,
        totalPosts: latest.totalPosts,
        engagementRate: latest.engagementRate,
        postsPerDay: latest.postsPerDay,
      },
      growth: {
        followerChange: followerGrowth,
        followerGrowthRate: `${followerGrowthRate}%`,
        period: `${snapshots.length} days`,
      },
      patterns: {
        avgEngagementRate: avgEngagementRate.toFixed(2),
        consistentPeakHours,
        commonHashtags,
      },
      topPosts: latest.topPosts,
    },
  };
}

export async function compareWithCompetitors(userId: string) {
  // Get user's metrics
  const userMetrics = await prisma.dailyMetrics.findFirst({
    where: { userId },
    orderBy: { date: "desc" },
  });

  // Get competitors' latest snapshots
  const competitors = await prisma.competitor.findMany({
    where: { userId, isActive: true },
    include: {
      snapshots: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  const comparison = competitors.map((c) => {
    const snapshot = c.snapshots[0];
    if (!snapshot) return null;

    return {
      competitor: {
        username: c.username,
        name: c.name,
        platform: c.platform,
      },
      metrics: {
        followers: snapshot.followers,
        engagementRate: snapshot.engagementRate,
        postsPerDay: snapshot.postsPerDay,
        avgLikes: snapshot.avgLikes,
      },
      comparison: userMetrics ? {
        followerDiff: (userMetrics.followers || 0) - snapshot.followers,
        engagementDiff: (userMetrics.engagementRate || 0) - snapshot.engagementRate,
      } : null,
    };
  }).filter(Boolean);

  return {
    userMetrics: userMetrics ? {
      followers: userMetrics.followers,
      engagementRate: userMetrics.engagementRate,
    } : null,
    competitors: comparison,
  };
}

export async function getCompetitorInsights(userId: string) {
  const { getOpenAI } = await import("./openai");
  const openai = getOpenAI();

  const competitors = await getCompetitors(userId);

  if (competitors.length === 0) {
    return { insights: [] };
  }

  const competitorData = competitors.map((c) => ({
    username: c.username,
    metrics: c.snapshots[0] || {},
  }));

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "You are a social media analyst. Provide actionable insights based on competitor data.",
      },
      {
        role: "user",
        content: `Analyze these competitors and provide 3-5 actionable insights:\n${JSON.stringify(competitorData, null, 2)}`,
      },
    ],
    max_tokens: 500,
  });

  const insights = response.choices[0]?.message?.content || "";

  return {
    insights: insights.split("\n").filter((line) => line.trim()),
    competitors: competitorData,
  };
}

export async function syncCompetitorData(competitorId: string) {
  const competitor = await prisma.competitor.findUnique({
    where: { id: competitorId },
    include: {
      user: {
        include: {
          xAccounts: { where: { isDefault: true } },
        },
      },
    },
  });

  if (!competitor) {
    throw new Error("Competitor not found");
  }

  // In production, this would call the platform API to fetch real data
  // For now, we'll return a placeholder
  return {
    message: "Competitor data sync would happen here with platform API",
    competitor: competitor.username,
  };
}

export async function getCompetitorTrends(competitorId: string, days: number = 30) {
  const snapshots = await prisma.competitorSnapshot.findMany({
    where: {
      competitorId,
      createdAt: {
        gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return {
    dates: snapshots.map((s) => s.createdAt.toISOString().split("T")[0]),
    followers: snapshots.map((s) => s.followers),
    engagementRate: snapshots.map((s) => s.engagementRate),
    postsPerDay: snapshots.map((s) => s.postsPerDay),
  };
}
