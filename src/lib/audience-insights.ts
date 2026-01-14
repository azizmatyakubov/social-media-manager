import { prisma } from "./prisma";
import { getOpenAI } from "./openai";

interface EngagementByHour {
  hour: number;
  engagements: number;
  impressions: number;
  rate: number;
}

interface EngagementByDay {
  day: string;
  engagements: number;
  impressions: number;
  rate: number;
}

interface ContentPerformance {
  type: string;
  avgLikes: number;
  avgRetweets: number;
  avgReplies: number;
  avgEngagementRate: number;
  count: number;
}

interface GrowthData {
  date: string;
  followers: number;
  following: number;
  posts: number;
}

interface AudienceInsights {
  totalFollowers: number;
  followersGrowth: number;
  followersGrowthPercent: number;
  avgEngagementRate: number;
  topEngagementHours: number[];
  topEngagementDays: string[];
  estimatedDemographics: {
    interests: string[];
    locations: string[];
    contentPreferences: string[];
  };
}

export async function getEngagementByHour(userId: string): Promise<EngagementByHour[]> {
  const posts = await prisma.post.findMany({
    where: {
      userId,
      status: "PUBLISHED",
      postedAt: { not: null },
    },
    select: {
      postedAt: true,
      likes: true,
      retweets: true,
      replies: true,
      impressions: true,
    },
    orderBy: { postedAt: "desc" },
    take: 200,
  });

  const hourlyData: Record<number, { engagements: number; impressions: number; count: number }> = {};

  for (let i = 0; i < 24; i++) {
    hourlyData[i] = { engagements: 0, impressions: 0, count: 0 };
  }

  posts.forEach((post) => {
    if (post.postedAt) {
      const hour = new Date(post.postedAt).getHours();
      hourlyData[hour].engagements += post.likes + post.retweets + post.replies;
      hourlyData[hour].impressions += post.impressions;
      hourlyData[hour].count += 1;
    }
  });

  return Object.entries(hourlyData).map(([hour, data]) => ({
    hour: parseInt(hour),
    engagements: data.engagements,
    impressions: data.impressions,
    rate: data.impressions > 0 ? (data.engagements / data.impressions) * 100 : 0,
  }));
}

export async function getEngagementByDay(userId: string): Promise<EngagementByDay[]> {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const posts = await prisma.post.findMany({
    where: {
      userId,
      status: "PUBLISHED",
      postedAt: { not: null },
    },
    select: {
      postedAt: true,
      likes: true,
      retweets: true,
      replies: true,
      impressions: true,
    },
    orderBy: { postedAt: "desc" },
    take: 200,
  });

  const dailyData: Record<string, { engagements: number; impressions: number; count: number }> = {};

  days.forEach((day) => {
    dailyData[day] = { engagements: 0, impressions: 0, count: 0 };
  });

  posts.forEach((post) => {
    if (post.postedAt) {
      const day = days[new Date(post.postedAt).getDay()];
      dailyData[day].engagements += post.likes + post.retweets + post.replies;
      dailyData[day].impressions += post.impressions;
      dailyData[day].count += 1;
    }
  });

  return days.map((day) => ({
    day,
    engagements: dailyData[day].engagements,
    impressions: dailyData[day].impressions,
    rate: dailyData[day].impressions > 0
      ? (dailyData[day].engagements / dailyData[day].impressions) * 100
      : 0,
  }));
}

export async function getContentTypePerformance(userId: string): Promise<ContentPerformance[]> {
  const posts = await prisma.post.findMany({
    where: {
      userId,
      status: "PUBLISHED",
    },
    select: {
      content: true,
      mediaUrls: true,
      likes: true,
      retweets: true,
      replies: true,
      impressions: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const typeData: Record<string, { likes: number; retweets: number; replies: number; impressions: number; count: number }> = {
    "Text Only": { likes: 0, retweets: 0, replies: 0, impressions: 0, count: 0 },
    "With Image": { likes: 0, retweets: 0, replies: 0, impressions: 0, count: 0 },
    "With Video": { likes: 0, retweets: 0, replies: 0, impressions: 0, count: 0 },
    "With Link": { likes: 0, retweets: 0, replies: 0, impressions: 0, count: 0 },
    "Thread": { likes: 0, retweets: 0, replies: 0, impressions: 0, count: 0 },
  };

  posts.forEach((post) => {
    let type = "Text Only";

    if (post.mediaUrls && post.mediaUrls.length > 0) {
      const firstMedia = post.mediaUrls[0];
      if (firstMedia.includes(".mp4") || firstMedia.includes("video")) {
        type = "With Video";
      } else {
        type = "With Image";
      }
    } else if (post.content.includes("http://") || post.content.includes("https://")) {
      type = "With Link";
    }

    typeData[type].likes += post.likes;
    typeData[type].retweets += post.retweets;
    typeData[type].replies += post.replies;
    typeData[type].impressions += post.impressions;
    typeData[type].count += 1;
  });

  return Object.entries(typeData)
    .filter(([_, data]) => data.count > 0)
    .map(([type, data]) => ({
      type,
      avgLikes: Math.round(data.likes / data.count),
      avgRetweets: Math.round(data.retweets / data.count),
      avgReplies: Math.round(data.replies / data.count),
      avgEngagementRate: data.impressions > 0
        ? ((data.likes + data.retweets + data.replies) / data.impressions) * 100
        : 0,
      count: data.count,
    }));
}

export async function getGrowthTrend(userId: string, days: number = 30): Promise<GrowthData[]> {
  const metrics = await prisma.dailyMetrics.findMany({
    where: {
      userId,
      date: {
        gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      },
    },
    orderBy: { date: "asc" },
    select: {
      date: true,
      followers: true,
      following: true,
      posts: true,
    },
  });

  return metrics.map((m) => ({
    date: m.date.toISOString().split("T")[0],
    followers: m.followers,
    following: m.following,
    posts: m.posts,
  }));
}

export async function analyzeAudience(userId: string): Promise<AudienceInsights> {
  const openai = getOpenAI();

  // Get recent posts for analysis
  const posts = await prisma.post.findMany({
    where: {
      userId,
      status: "PUBLISHED",
    },
    select: {
      content: true,
      likes: true,
      retweets: true,
      replies: true,
      impressions: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // Get X account data
  const xAccount = await prisma.xAccount.findFirst({
    where: { userId },
    select: {
      followers: true,
      following: true,
    },
  });

  // Get daily metrics for growth calculation
  const recentMetrics = await prisma.dailyMetrics.findMany({
    where: {
      userId,
      date: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
    },
    orderBy: { date: "asc" },
  });

  // Calculate follower growth
  const currentFollowers = xAccount?.followers || 0;
  const oldestMetric = recentMetrics[0];
  const followersGrowth = oldestMetric
    ? currentFollowers - oldestMetric.followers
    : 0;
  const followersGrowthPercent = oldestMetric && oldestMetric.followers > 0
    ? ((currentFollowers - oldestMetric.followers) / oldestMetric.followers) * 100
    : 0;

  // Calculate avg engagement rate
  const totalEngagements = posts.reduce(
    (sum, p) => sum + p.likes + p.retweets + p.replies,
    0
  );
  const totalImpressions = posts.reduce((sum, p) => sum + p.impressions, 0);
  const avgEngagementRate = totalImpressions > 0
    ? (totalEngagements / totalImpressions) * 100
    : 0;

  // Get engagement by hour
  const hourlyEngagement = await getEngagementByHour(userId);
  const topEngagementHours = hourlyEngagement
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 3)
    .map((h) => h.hour);

  // Get engagement by day
  const dailyEngagement = await getEngagementByDay(userId);
  const topEngagementDays = dailyEngagement
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 3)
    .map((d) => d.day);

  // Use AI to analyze audience interests from post content
  const topPosts = posts
    .sort((a, b) => (b.likes + b.retweets) - (a.likes + a.retweets))
    .slice(0, 10);

  const postContents = topPosts.map((p) => p.content).join("\n\n");

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Analyze the top performing posts and infer audience characteristics.
Provide:
- interests: 5-7 topics/interests the audience likely has
- locations: 3-5 likely geographic regions
- contentPreferences: 3-5 content types they prefer

Return JSON format.`,
      },
      {
        role: "user",
        content: `Analyze these top performing posts to infer audience interests:\n\n${postContents}`,
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 500,
  });

  const aiInsights = JSON.parse(response.choices[0]?.message?.content || "{}");

  return {
    totalFollowers: currentFollowers,
    followersGrowth,
    followersGrowthPercent,
    avgEngagementRate,
    topEngagementHours,
    topEngagementDays,
    estimatedDemographics: {
      interests: aiInsights.interests || [],
      locations: aiInsights.locations || [],
      contentPreferences: aiInsights.contentPreferences || [],
    },
  };
}

export async function getTopPerformingPosts(userId: string, limit: number = 10) {
  return prisma.post.findMany({
    where: {
      userId,
      status: "PUBLISHED",
    },
    orderBy: [
      { likes: "desc" },
    ],
    take: limit,
    select: {
      id: true,
      content: true,
      likes: true,
      retweets: true,
      replies: true,
      impressions: true,
      postedAt: true,
    },
  });
}

export async function getEngagementSummary(userId: string) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

  const [currentPeriod, previousPeriod] = await Promise.all([
    prisma.post.aggregate({
      where: {
        userId,
        status: "PUBLISHED",
        postedAt: { gte: thirtyDaysAgo },
      },
      _sum: {
        likes: true,
        retweets: true,
        replies: true,
        impressions: true,
      },
      _count: true,
    }),
    prisma.post.aggregate({
      where: {
        userId,
        status: "PUBLISHED",
        postedAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
      },
      _sum: {
        likes: true,
        retweets: true,
        replies: true,
        impressions: true,
      },
      _count: true,
    }),
  ]);

  const currentEngagement =
    (currentPeriod._sum.likes || 0) +
    (currentPeriod._sum.retweets || 0) +
    (currentPeriod._sum.replies || 0);
  const previousEngagement =
    (previousPeriod._sum.likes || 0) +
    (previousPeriod._sum.retweets || 0) +
    (previousPeriod._sum.replies || 0);

  const engagementChange = previousEngagement > 0
    ? ((currentEngagement - previousEngagement) / previousEngagement) * 100
    : 0;

  return {
    currentPeriod: {
      posts: currentPeriod._count,
      likes: currentPeriod._sum.likes || 0,
      retweets: currentPeriod._sum.retweets || 0,
      replies: currentPeriod._sum.replies || 0,
      impressions: currentPeriod._sum.impressions || 0,
      totalEngagement: currentEngagement,
    },
    previousPeriod: {
      posts: previousPeriod._count,
      likes: previousPeriod._sum.likes || 0,
      retweets: previousPeriod._sum.retweets || 0,
      replies: previousPeriod._sum.replies || 0,
      impressions: previousPeriod._sum.impressions || 0,
      totalEngagement: previousEngagement,
    },
    change: {
      engagement: engagementChange,
      posts: previousPeriod._count > 0
        ? ((currentPeriod._count - previousPeriod._count) / previousPeriod._count) * 100
        : 0,
    },
  };
}
