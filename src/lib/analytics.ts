import { prisma } from "./prisma";
import { Platform } from "@prisma/client";

export async function recordDailyMetrics(
  userId: string,
  platform: Platform,
  data: {
    followers: number;
    following: number;
    totalLikes: number;
    totalRetweets: number;
    totalReplies: number;
    totalImpressions: number;
    totalClicks: number;
    postsPublished: number;
    topPostId?: string;
  }
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get yesterday's metrics to calculate change
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const previousMetrics = await prisma.dailyMetrics.findUnique({
    where: {
      userId_platform_date: {
        userId,
        platform,
        date: yesterday,
      },
    },
  });

  const followerChange = previousMetrics
    ? data.followers - previousMetrics.followers
    : 0;

  const totalEngagements = data.totalLikes + data.totalRetweets + data.totalReplies;
  const engagementRate = data.totalImpressions > 0
    ? (totalEngagements / data.totalImpressions) * 100
    : 0;

  return prisma.dailyMetrics.upsert({
    where: {
      userId_platform_date: {
        userId,
        platform,
        date: today,
      },
    },
    update: {
      followers: data.followers,
      following: data.following,
      followerChange,
      totalLikes: data.totalLikes,
      totalRetweets: data.totalRetweets,
      totalReplies: data.totalReplies,
      totalImpressions: data.totalImpressions,
      totalClicks: data.totalClicks,
      postsPublished: data.postsPublished,
      engagementRate,
      topPostId: data.topPostId,
    },
    create: {
      userId,
      platform,
      date: today,
      followers: data.followers,
      following: data.following,
      followerChange,
      totalLikes: data.totalLikes,
      totalRetweets: data.totalRetweets,
      totalReplies: data.totalReplies,
      totalImpressions: data.totalImpressions,
      totalClicks: data.totalClicks,
      postsPublished: data.postsPublished,
      engagementRate,
      topPostId: data.topPostId,
    },
  });
}

export async function getAnalyticsDashboard(
  userId: string,
  platform: Platform,
  days: number = 30
) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const metrics = await prisma.dailyMetrics.findMany({
    where: {
      userId,
      platform,
      date: { gte: startDate },
    },
    orderBy: { date: "asc" },
  });

  if (metrics.length === 0) {
    return {
      summary: null,
      trends: null,
      topPosts: [],
    };
  }

  const latest = metrics[metrics.length - 1];
  const oldest = metrics[0];

  // Calculate totals and averages
  const totalLikes = metrics.reduce((sum, m) => sum + m.totalLikes, 0);
  const totalRetweets = metrics.reduce((sum, m) => sum + m.totalRetweets, 0);
  const totalReplies = metrics.reduce((sum, m) => sum + m.totalReplies, 0);
  const totalImpressions = metrics.reduce((sum, m) => sum + m.totalImpressions, 0);
  const totalClicks = metrics.reduce((sum, m) => sum + m.totalClicks, 0);
  const postsPublished = metrics.reduce((sum, m) => sum + m.postsPublished, 0);

  const avgEngagementRate =
    metrics.reduce((sum, m) => sum + m.engagementRate, 0) / metrics.length;

  const followerGrowth = latest.followers - oldest.followers;
  const followerGrowthRate =
    oldest.followers > 0 ? (followerGrowth / oldest.followers) * 100 : 0;

  // Get top performing posts
  const topPosts = await prisma.post.findMany({
    where: {
      userId,
      platform,
      postedAt: { gte: startDate },
      status: "POSTED",
    },
    orderBy: [
      { likes: "desc" },
      { impressions: "desc" },
    ],
    take: 5,
  });

  return {
    summary: {
      currentFollowers: latest.followers,
      followerGrowth,
      followerGrowthRate: followerGrowthRate.toFixed(2),
      totalEngagements: totalLikes + totalRetweets + totalReplies,
      totalImpressions,
      totalClicks,
      postsPublished,
      avgEngagementRate: avgEngagementRate.toFixed(2),
    },
    trends: {
      dates: metrics.map((m) => m.date.toISOString().split("T")[0]),
      followers: metrics.map((m) => m.followers),
      engagementRate: metrics.map((m) => m.engagementRate),
      impressions: metrics.map((m) => m.totalImpressions),
      likes: metrics.map((m) => m.totalLikes),
    },
    topPosts: topPosts.map((p) => ({
      id: p.id,
      content: p.content.substring(0, 100) + (p.content.length > 100 ? "..." : ""),
      likes: p.likes,
      retweets: p.retweets,
      replies: p.replies,
      impressions: p.impressions,
      engagementRate: p.impressions > 0
        ? (((p.likes + p.retweets + p.replies) / p.impressions) * 100).toFixed(2)
        : "0",
      postedAt: p.postedAt,
    })),
  };
}

export async function getBestPostingTimes(userId: string, platform: Platform) {
  const posts = await prisma.post.findMany({
    where: {
      userId,
      platform,
      status: "POSTED",
      postedAt: { not: null },
    },
    select: {
      postedAt: true,
      likes: true,
      retweets: true,
      replies: true,
      impressions: true,
    },
  });

  // Group by hour
  const hourlyPerformance: Record<number, { count: number; totalEngagement: number }> = {};

  posts.forEach((post) => {
    if (!post.postedAt) return;
    const hour = post.postedAt.getHours();
    const engagement = post.likes + post.retweets + post.replies;

    if (!hourlyPerformance[hour]) {
      hourlyPerformance[hour] = { count: 0, totalEngagement: 0 };
    }
    hourlyPerformance[hour].count++;
    hourlyPerformance[hour].totalEngagement += engagement;
  });

  // Calculate average engagement per hour
  const hourlyAvg = Object.entries(hourlyPerformance)
    .map(([hour, data]) => ({
      hour: parseInt(hour),
      avgEngagement: data.count > 0 ? data.totalEngagement / data.count : 0,
      postCount: data.count,
    }))
    .sort((a, b) => b.avgEngagement - a.avgEngagement);

  const bestHours = hourlyAvg.slice(0, 3).map((h) => h.hour);

  // Group by day of week
  const dailyPerformance: Record<number, { count: number; totalEngagement: number }> = {};

  posts.forEach((post) => {
    if (!post.postedAt) return;
    const day = post.postedAt.getDay();
    const engagement = post.likes + post.retweets + post.replies;

    if (!dailyPerformance[day]) {
      dailyPerformance[day] = { count: 0, totalEngagement: 0 };
    }
    dailyPerformance[day].count++;
    dailyPerformance[day].totalEngagement += engagement;
  });

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dailyAvg = Object.entries(dailyPerformance)
    .map(([day, data]) => ({
      day: days[parseInt(day)],
      dayNum: parseInt(day),
      avgEngagement: data.count > 0 ? data.totalEngagement / data.count : 0,
      postCount: data.count,
    }))
    .sort((a, b) => b.avgEngagement - a.avgEngagement);

  const bestDays = dailyAvg.slice(0, 3).map((d) => d.day);

  return {
    bestHours,
    bestDays,
    hourlyBreakdown: hourlyAvg,
    dailyBreakdown: dailyAvg,
    recommendation: `Best times to post: ${bestDays[0]} at ${bestHours[0]}:00`,
  };
}

export async function getContentPerformance(userId: string, platform: Platform) {
  const posts = await prisma.post.findMany({
    where: {
      userId,
      platform,
      status: "POSTED",
    },
    select: {
      content: true,
      likes: true,
      retweets: true,
      replies: true,
      impressions: true,
      mediaType: true,
      mediaUrls: true,
    },
  });

  // Analyze content types
  const withMedia = posts.filter((p) => p.mediaUrls.length > 0);
  const withoutMedia = posts.filter((p) => p.mediaUrls.length === 0);

  const avgEngagementWithMedia = withMedia.length > 0
    ? withMedia.reduce((sum, p) => sum + p.likes + p.retweets + p.replies, 0) / withMedia.length
    : 0;

  const avgEngagementWithoutMedia = withoutMedia.length > 0
    ? withoutMedia.reduce((sum, p) => sum + p.likes + p.retweets + p.replies, 0) / withoutMedia.length
    : 0;

  // Analyze content length
  const shortPosts = posts.filter((p) => p.content.length < 100);
  const mediumPosts = posts.filter((p) => p.content.length >= 100 && p.content.length < 200);
  const longPosts = posts.filter((p) => p.content.length >= 200);

  const avgByLength = {
    short: shortPosts.length > 0
      ? shortPosts.reduce((sum, p) => sum + p.likes + p.retweets + p.replies, 0) / shortPosts.length
      : 0,
    medium: mediumPosts.length > 0
      ? mediumPosts.reduce((sum, p) => sum + p.likes + p.retweets + p.replies, 0) / mediumPosts.length
      : 0,
    long: longPosts.length > 0
      ? longPosts.reduce((sum, p) => sum + p.likes + p.retweets + p.replies, 0) / longPosts.length
      : 0,
  };

  // Analyze hashtag usage
  const withHashtags = posts.filter((p) => p.content.includes("#"));
  const withoutHashtags = posts.filter((p) => !p.content.includes("#"));

  const avgWithHashtags = withHashtags.length > 0
    ? withHashtags.reduce((sum, p) => sum + p.likes + p.retweets + p.replies, 0) / withHashtags.length
    : 0;

  const avgWithoutHashtags = withoutHashtags.length > 0
    ? withoutHashtags.reduce((sum, p) => sum + p.likes + p.retweets + p.replies, 0) / withoutHashtags.length
    : 0;

  return {
    mediaImpact: {
      withMedia: {
        count: withMedia.length,
        avgEngagement: avgEngagementWithMedia.toFixed(1),
      },
      withoutMedia: {
        count: withoutMedia.length,
        avgEngagement: avgEngagementWithoutMedia.toFixed(1),
      },
      recommendation: avgEngagementWithMedia > avgEngagementWithoutMedia
        ? "Posts with media perform better"
        : "Text-only posts perform better",
    },
    lengthImpact: {
      short: { count: shortPosts.length, avgEngagement: avgByLength.short.toFixed(1) },
      medium: { count: mediumPosts.length, avgEngagement: avgByLength.medium.toFixed(1) },
      long: { count: longPosts.length, avgEngagement: avgByLength.long.toFixed(1) },
      bestLength: Object.entries(avgByLength).sort(([, a], [, b]) => b - a)[0][0],
    },
    hashtagImpact: {
      withHashtags: {
        count: withHashtags.length,
        avgEngagement: avgWithHashtags.toFixed(1),
      },
      withoutHashtags: {
        count: withoutHashtags.length,
        avgEngagement: avgWithoutHashtags.toFixed(1),
      },
      recommendation: avgWithHashtags > avgWithoutHashtags
        ? "Hashtags improve engagement"
        : "Posts without hashtags perform better",
    },
  };
}

export async function getGrowthProjection(userId: string, platform: Platform) {
  const metrics = await prisma.dailyMetrics.findMany({
    where: { userId, platform },
    orderBy: { date: "asc" },
    take: 90, // Last 90 days
  });

  if (metrics.length < 7) {
    return { projection: null, message: "Not enough data for projection" };
  }

  // Calculate average daily growth
  const growthRates: number[] = [];
  for (let i = 1; i < metrics.length; i++) {
    if (metrics[i - 1].followers > 0) {
      const rate = (metrics[i].followers - metrics[i - 1].followers) / metrics[i - 1].followers;
      growthRates.push(rate);
    }
  }

  const avgDailyGrowthRate = growthRates.reduce((a, b) => a + b, 0) / growthRates.length;
  const currentFollowers = metrics[metrics.length - 1].followers;

  // Project forward 30, 60, 90 days
  const projections = {
    days30: Math.round(currentFollowers * Math.pow(1 + avgDailyGrowthRate, 30)),
    days60: Math.round(currentFollowers * Math.pow(1 + avgDailyGrowthRate, 60)),
    days90: Math.round(currentFollowers * Math.pow(1 + avgDailyGrowthRate, 90)),
  };

  return {
    currentFollowers,
    avgDailyGrowthRate: (avgDailyGrowthRate * 100).toFixed(3),
    projections,
    disclaimer: "Projections based on historical growth rate and may vary",
  };
}
