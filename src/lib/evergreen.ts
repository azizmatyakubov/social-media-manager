import { prisma } from "./prisma";
import { Platform } from "@prisma/client";

// Types
export interface EvergreenScheduleInput {
  name: string;
  description?: string;
  isActive?: boolean;
  minEngagement?: number;
  minImpressions?: number;
  platforms?: string[];
  categoryIds?: string[];
  excludeHashtags?: string[];
  includeHashtags?: string[];
  minDaysBetween?: number;
  maxRecycleCount?: number;
  varyContent?: boolean;
  postsPerDay?: number;
  preferredTimes?: string[];
  activeDays?: number[];
  timezone?: string;
}

export interface EvergreenPost {
  id: string;
  content: string;
  platform: Platform;
  publishedAt: Date | null;
  likes: number;
  retweets: number;
  replies: number;
  impressions: number;
  shares: number;
  clicks: number;
  isEvergreen: boolean;
  lastRecycled: Date | null;
  recycleCount: number;
  mediaUrls: string[];
  categoryId: string | null;
}

// Create evergreen schedule
export async function createEvergreenSchedule(
  userId: string,
  data: EvergreenScheduleInput
) {
  return prisma.evergreenSchedule.create({
    data: {
      userId,
      name: data.name,
      description: data.description,
      isActive: data.isActive ?? true,
      minEngagement: data.minEngagement ?? 0,
      minImpressions: data.minImpressions ?? 0,
      platforms: data.platforms ?? [],
      categoryIds: data.categoryIds ?? [],
      excludeHashtags: data.excludeHashtags ?? [],
      includeHashtags: data.includeHashtags ?? [],
      minDaysBetween: data.minDaysBetween ?? 30,
      maxRecycleCount: data.maxRecycleCount ?? 5,
      varyContent: data.varyContent ?? true,
      postsPerDay: data.postsPerDay ?? 1,
      preferredTimes: data.preferredTimes ?? [],
      activeDays: data.activeDays ?? [0, 1, 2, 3, 4, 5, 6],
      timezone: data.timezone ?? "UTC",
    },
  });
}

// Update evergreen schedule
export async function updateEvergreenSchedule(
  scheduleId: string,
  userId: string,
  data: Partial<EvergreenScheduleInput>
) {
  return prisma.evergreenSchedule.update({
    where: { id: scheduleId, userId },
    data,
  });
}

// Delete evergreen schedule
export async function deleteEvergreenSchedule(scheduleId: string, userId: string) {
  return prisma.evergreenSchedule.delete({
    where: { id: scheduleId, userId },
  });
}

// Get user's evergreen schedules
export async function getEvergreenSchedules(userId: string) {
  return prisma.evergreenSchedule.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

// Get single schedule
export async function getEvergreenSchedule(scheduleId: string, userId: string) {
  return prisma.evergreenSchedule.findFirst({
    where: { id: scheduleId, userId },
  });
}

// Mark post as evergreen
export async function markAsEvergreen(postId: string, userId: string) {
  return prisma.post.update({
    where: { id: postId, userId },
    data: { isEvergreen: true },
  });
}

// Unmark post as evergreen
export async function unmarkAsEvergreen(postId: string, userId: string) {
  return prisma.post.update({
    where: { id: postId, userId },
    data: { isEvergreen: false, lastRecycled: null, recycleCount: 0 },
  });
}

// Get evergreen posts for a user
export async function getEvergreenPosts(
  userId: string,
  options?: {
    platform?: Platform;
    minEngagement?: number;
    limit?: number;
    offset?: number;
  }
) {
  const where: Record<string, unknown> = {
    userId,
    isEvergreen: true,
    status: "PUBLISHED",
  };

  if (options?.platform) {
    where.platform = options.platform;
  }

  const posts = await prisma.post.findMany({
    where,
    orderBy: { publishedAt: "desc" },
    take: options?.limit ?? 50,
    skip: options?.offset ?? 0,
    select: {
      id: true,
      content: true,
      platform: true,
      publishedAt: true,
      likes: true,
      retweets: true,
      replies: true,
      impressions: true,
      shares: true,
      clicks: true,
      isEvergreen: true,
      lastRecycled: true,
      recycleCount: true,
      mediaUrls: true,
      categoryId: true,
    },
  });

  // Filter by engagement if specified
  if (options?.minEngagement) {
    return posts.filter((post) => {
      const engagement = post.likes + post.retweets + post.replies + post.shares;
      return engagement >= (options.minEngagement ?? 0);
    });
  }

  return posts;
}

// Get top performing posts eligible for evergreen
export async function getTopPerformingPosts(
  userId: string,
  options?: {
    platform?: Platform;
    minEngagement?: number;
    minImpressions?: number;
    excludeEvergreen?: boolean;
    limit?: number;
    daysBack?: number;
  }
) {
  const since = options?.daysBack
    ? new Date(Date.now() - options.daysBack * 24 * 60 * 60 * 1000)
    : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // Default 90 days

  const where: Record<string, unknown> = {
    userId,
    status: "PUBLISHED",
    publishedAt: { gte: since },
  };

  if (options?.platform) {
    where.platform = options.platform;
  }

  if (options?.excludeEvergreen) {
    where.isEvergreen = false;
  }

  if (options?.minImpressions) {
    where.impressions = { gte: options.minImpressions };
  }

  const posts = await prisma.post.findMany({
    where,
    orderBy: [{ likes: "desc" }, { impressions: "desc" }],
    take: options?.limit ?? 50,
    select: {
      id: true,
      content: true,
      platform: true,
      publishedAt: true,
      likes: true,
      retweets: true,
      replies: true,
      impressions: true,
      shares: true,
      clicks: true,
      isEvergreen: true,
      lastRecycled: true,
      recycleCount: true,
      mediaUrls: true,
      categoryId: true,
    },
  });

  // Calculate engagement and filter
  const postsWithEngagement = posts.map((post) => ({
    ...post,
    totalEngagement: post.likes + post.retweets + post.replies + post.shares,
    engagementRate:
      post.impressions > 0
        ? ((post.likes + post.retweets + post.replies + post.shares) / post.impressions) * 100
        : 0,
  }));

  if (options?.minEngagement) {
    return postsWithEngagement
      .filter((post) => post.totalEngagement >= (options.minEngagement ?? 0))
      .sort((a, b) => b.totalEngagement - a.totalEngagement);
  }

  return postsWithEngagement.sort((a, b) => b.totalEngagement - a.totalEngagement);
}

// Get posts eligible for recycling based on schedule criteria
export async function getEligibleForRecycling(
  userId: string,
  scheduleId: string
) {
  const schedule = await prisma.evergreenSchedule.findFirst({
    where: { id: scheduleId, userId },
  });

  if (!schedule) {
    throw new Error("Schedule not found");
  }

  const cutoffDate = new Date(
    Date.now() - schedule.minDaysBetween * 24 * 60 * 60 * 1000
  );

  const where: Record<string, unknown> = {
    userId,
    isEvergreen: true,
    status: "PUBLISHED",
    recycleCount: { lt: schedule.maxRecycleCount },
    OR: [{ lastRecycled: null }, { lastRecycled: { lt: cutoffDate } }],
  };

  // Platform filter
  if (schedule.platforms.length > 0) {
    where.platform = { in: schedule.platforms as Platform[] };
  }

  // Category filter
  if (schedule.categoryIds.length > 0) {
    where.categoryId = { in: schedule.categoryIds };
  }

  const posts = await prisma.post.findMany({
    where,
    orderBy: [{ likes: "desc" }, { lastRecycled: "asc" }],
    select: {
      id: true,
      content: true,
      platform: true,
      publishedAt: true,
      likes: true,
      retweets: true,
      replies: true,
      impressions: true,
      shares: true,
      clicks: true,
      isEvergreen: true,
      lastRecycled: true,
      recycleCount: true,
      mediaUrls: true,
      categoryId: true,
    },
  });

  // Filter by engagement
  const filtered = posts.filter((post) => {
    const engagement = post.likes + post.retweets + post.replies + post.shares;
    if (engagement < schedule.minEngagement) return false;
    if (post.impressions < schedule.minImpressions) return false;

    // Hashtag filtering
    const contentLower = post.content.toLowerCase();

    // Exclude posts with excluded hashtags
    for (const tag of schedule.excludeHashtags) {
      if (contentLower.includes(tag.toLowerCase())) return false;
    }

    // Include only posts with required hashtags (if any specified)
    if (schedule.includeHashtags.length > 0) {
      const hasRequired = schedule.includeHashtags.some((tag) =>
        contentLower.includes(tag.toLowerCase())
      );
      if (!hasRequired) return false;
    }

    return true;
  });

  return filtered;
}

// Create a recycled post
export async function recyclePost(
  userId: string,
  originalPostId: string,
  scheduleId?: string,
  options?: {
    scheduledFor?: Date;
    varyContent?: boolean;
  }
) {
  const original = await prisma.post.findFirst({
    where: { id: originalPostId, userId },
    include: {
      xAccount: true,
      linkedInAccount: true,
      instagramAccount: true,
      tiktokAccount: true,
      youtubeAccount: true,
      pinterestAccount: true,
      blueskyAccount: true,
    },
  });

  if (!original) {
    throw new Error("Original post not found");
  }

  // Create varied content if requested
  let content = original.content;
  let variationType = "original";

  if (options?.varyContent) {
    const varied = varyPostContent(original.content);
    content = varied.content;
    variationType = varied.type;
  }

  // Create the new post
  const newPost = await prisma.post.create({
    data: {
      userId,
      content,
      platform: original.platform,
      status: options?.scheduledFor ? "SCHEDULED" : "DRAFT",
      scheduledFor: options?.scheduledFor,
      mediaUrls: original.mediaUrls,
      mediaType: original.mediaType,
      categoryId: original.categoryId,
      xAccountId: original.xAccountId,
      linkedInAccountId: original.linkedInAccountId,
      instagramAccountId: original.instagramAccountId,
      tiktokAccountId: original.tiktokAccountId,
      youtubeAccountId: original.youtubeAccountId,
      pinterestAccountId: original.pinterestAccountId,
      blueskyAccountId: original.blueskyAccountId,
    },
  });

  // Update original post recycle stats
  await prisma.post.update({
    where: { id: originalPostId },
    data: {
      lastRecycled: new Date(),
      recycleCount: { increment: 1 },
    },
  });

  // Log the recycling
  await prisma.evergreenLog.create({
    data: {
      userId,
      scheduleId,
      originalPostId,
      recycledPostId: newPost.id,
      status: "success",
      variationType,
      originalContent: original.content,
      recycledContent: content,
    },
  });

  // Update schedule stats if applicable
  if (scheduleId) {
    await prisma.evergreenSchedule.update({
      where: { id: scheduleId },
      data: {
        totalRecycled: { increment: 1 },
        lastRunAt: new Date(),
      },
    });
  }

  return newPost;
}

// Content variation utilities
export function varyPostContent(content: string): { content: string; type: string } {
  const variations = [
    { type: "emoji_swap", fn: swapEmojis },
    { type: "reorder", fn: reorderContent },
    { type: "add_variation", fn: addVariationPrefix },
    { type: "hashtag_shuffle", fn: shuffleHashtags },
  ];

  // Pick a random variation
  const variation = variations[Math.floor(Math.random() * variations.length)];
  const newContent = variation.fn(content);

  return {
    content: newContent,
    type: variation.type,
  };
}

function swapEmojis(content: string): string {
  const emojiSets = [
    ["", "", "", ""],
    ["", "", "", ""],
    ["", "", "", ""],
    ["", "", "", ""],
  ];

  let result = content;
  for (const set of emojiSets) {
    for (const emoji of set) {
      if (content.includes(emoji)) {
        const newEmoji = set[Math.floor(Math.random() * set.length)];
        result = result.replace(emoji, newEmoji);
        break;
      }
    }
  }
  return result;
}

function reorderContent(content: string): string {
  // If content has line breaks, try to reorder non-hashtag lines
  const lines = content.split("\n");
  if (lines.length <= 2) return content;

  const hashtagLines = lines.filter((l) => l.trim().startsWith("#") || /^#\w/.test(l.trim()));
  const contentLines = lines.filter((l) => !l.trim().startsWith("#") && !/^#\w/.test(l.trim()));

  if (contentLines.length <= 1) return content;

  // Shuffle content lines (keeping first line usually as it's often the hook)
  const firstLine = contentLines[0];
  const rest = contentLines.slice(1);
  const shuffled = rest.sort(() => Math.random() - 0.5);

  return [...[firstLine], ...shuffled, ...hashtagLines].join("\n");
}

function addVariationPrefix(content: string): string {
  const prefixes = [
    "Reminder: ",
    "In case you missed it: ",
    "Worth sharing again: ",
    "Still relevant: ",
    "Throwback: ",
  ];

  // Only add prefix if content doesn't already have one
  const hasPrefix = prefixes.some((p) => content.startsWith(p));
  if (hasPrefix) {
    // Remove existing prefix and add new one
    for (const p of prefixes) {
      if (content.startsWith(p)) {
        content = content.slice(p.length);
        break;
      }
    }
  }

  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  return prefix + content;
}

function shuffleHashtags(content: string): string {
  const hashtagRegex = /#\w+/g;
  const hashtags = content.match(hashtagRegex);

  if (!hashtags || hashtags.length <= 1) return content;

  // Shuffle hashtags
  const shuffled = [...hashtags].sort(() => Math.random() - 0.5);

  let result = content;
  let idx = 0;
  result = result.replace(hashtagRegex, () => shuffled[idx++]);

  return result;
}

// Get recycling logs
export async function getEvergreenLogs(
  userId: string,
  options?: {
    scheduleId?: string;
    limit?: number;
    offset?: number;
  }
) {
  const where: Record<string, unknown> = { userId };
  if (options?.scheduleId) {
    where.scheduleId = options.scheduleId;
  }

  return prisma.evergreenLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: options?.limit ?? 50,
    skip: options?.offset ?? 0,
  });
}

// Get evergreen stats for dashboard
export async function getEvergreenStats(userId: string) {
  const [
    totalEvergreen,
    totalRecycled,
    activeSchedules,
    recentLogs,
  ] = await Promise.all([
    prisma.post.count({
      where: { userId, isEvergreen: true },
    }),
    prisma.evergreenLog.count({
      where: { userId, status: "success" },
    }),
    prisma.evergreenSchedule.count({
      where: { userId, isActive: true },
    }),
    prisma.evergreenLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  // Get engagement comparison
  const [originalEngagement, recycledEngagement] = await Promise.all([
    getAverageEngagement(userId, false),
    getAverageEngagement(userId, true),
  ]);

  return {
    totalEvergreenPosts: totalEvergreen,
    totalTimesRecycled: totalRecycled,
    activeSchedules,
    recentActivity: recentLogs,
    originalAvgEngagement: originalEngagement,
    recycledAvgEngagement: recycledEngagement,
    recyclingEfficiency:
      originalEngagement > 0
        ? ((recycledEngagement / originalEngagement) * 100).toFixed(1)
        : 0,
  };
}

async function getAverageEngagement(userId: string, isRecycled: boolean) {
  const posts = await prisma.post.findMany({
    where: {
      userId,
      status: "PUBLISHED",
      recycleCount: isRecycled ? { gt: 0 } : { equals: 0 },
    },
    select: {
      likes: true,
      retweets: true,
      replies: true,
      shares: true,
    },
    take: 100,
  });

  if (posts.length === 0) return 0;

  const totalEngagement = posts.reduce(
    (sum, post) => sum + post.likes + post.retweets + post.replies + post.shares,
    0
  );

  return Math.round(totalEngagement / posts.length);
}

// Bulk mark posts as evergreen
export async function bulkMarkEvergreen(
  userId: string,
  postIds: string[],
  isEvergreen: boolean
) {
  return prisma.post.updateMany({
    where: {
      id: { in: postIds },
      userId,
    },
    data: {
      isEvergreen,
      ...(isEvergreen ? {} : { lastRecycled: null, recycleCount: 0 }),
    },
  });
}
