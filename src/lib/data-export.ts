import { prisma } from "./prisma";

export interface ExportOptions {
  format: "csv" | "json" | "xlsx";
  dateRange?: {
    start: Date;
    end: Date;
  };
  includeAnalytics?: boolean;
}

interface PostExport {
  id: string;
  content: string;
  platform: string;
  status: string;
  scheduledFor: string | null;
  postedAt: string | null;
  likes: number;
  retweets: number;
  replies: number;
  impressions: number;
  createdAt: string;
}

interface AnalyticsExport {
  date: string;
  followers: number;
  following: number;
  posts: number;
  likes: number;
  retweets: number;
  replies: number;
  impressions: number;
}

interface AccountExport {
  email: string;
  name: string | null;
  createdAt: string;
  totalPosts: number;
  publishedPosts: number;
  scheduledPosts: number;
  draftPosts: number;
  connectedAccounts: Array<{
    platform: string;
    username: string;
    followers: number;
    following: number;
  }>;
}

export async function exportPosts(
  userId: string,
  options: ExportOptions
): Promise<PostExport[]> {
  const where: Record<string, unknown> = { userId };

  if (options.dateRange) {
    where.createdAt = {
      gte: options.dateRange.start,
      lte: options.dateRange.end,
    };
  }

  const posts = await prisma.post.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      content: true,
      platform: true,
      status: true,
      scheduledFor: true,
      postedAt: true,
      likes: true,
      retweets: true,
      replies: true,
      impressions: true,
      createdAt: true,
    },
  });

  return posts.map((post) => ({
    id: post.id,
    content: post.content,
    platform: post.platform,
    status: post.status,
    scheduledFor: post.scheduledFor?.toISOString() || null,
    postedAt: post.postedAt?.toISOString() || null,
    likes: post.likes,
    retweets: post.retweets,
    replies: post.replies,
    impressions: post.impressions,
    createdAt: post.createdAt.toISOString(),
  }));
}

export async function exportAnalytics(
  userId: string,
  options: ExportOptions
): Promise<AnalyticsExport[]> {
  const where: Record<string, unknown> = { userId };

  if (options.dateRange) {
    where.date = {
      gte: options.dateRange.start,
      lte: options.dateRange.end,
    };
  }

  const metrics = await prisma.dailyMetrics.findMany({
    where,
    orderBy: { date: "desc" },
    select: {
      date: true,
      followers: true,
      following: true,
      posts: true,
      likes: true,
      retweets: true,
      replies: true,
      impressions: true,
    },
  });

  return metrics.map((metric) => ({
    date: metric.date.toISOString().split("T")[0],
    followers: metric.followers,
    following: metric.following,
    posts: metric.posts,
    likes: metric.likes,
    retweets: metric.retweets,
    replies: metric.replies,
    impressions: metric.impressions,
  }));
}

export async function exportAccountData(userId: string): Promise<AccountExport> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      name: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const [totalPosts, publishedPosts, scheduledPosts, draftPosts] = await Promise.all([
    prisma.post.count({ where: { userId } }),
    prisma.post.count({ where: { userId, status: "PUBLISHED" } }),
    prisma.post.count({ where: { userId, status: "SCHEDULED" } }),
    prisma.post.count({ where: { userId, status: "DRAFT" } }),
  ]);

  const xAccounts = await prisma.xAccount.findMany({
    where: { userId },
    select: {
      username: true,
      followers: true,
      following: true,
    },
  });

  return {
    email: user.email,
    name: user.name,
    createdAt: user.createdAt.toISOString(),
    totalPosts,
    publishedPosts,
    scheduledPosts,
    draftPosts,
    connectedAccounts: xAccounts.map((acc) => ({
      platform: "X",
      username: acc.username,
      followers: acc.followers,
      following: acc.following,
    })),
  };
}

export async function exportAllData(
  userId: string,
  options: ExportOptions
): Promise<{
  account: AccountExport;
  posts: PostExport[];
  analytics: AnalyticsExport[];
}> {
  const [account, posts, analytics] = await Promise.all([
    exportAccountData(userId),
    exportPosts(userId, options),
    exportAnalytics(userId, options),
  ]);

  return { account, posts, analytics };
}

// Convert data to CSV format
export function toCSV<T extends Record<string, unknown>>(data: T[]): string {
  if (data.length === 0) return "";

  const headers = Object.keys(data[0]);
  const rows = data.map((item) =>
    headers
      .map((header) => {
        const value = item[header];
        if (value === null || value === undefined) return "";
        const str = String(value);
        // Escape quotes and wrap in quotes if contains comma, newline, or quote
        if (str.includes(",") || str.includes("\n") || str.includes('"')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      })
      .join(",")
  );

  return [headers.join(","), ...rows].join("\n");
}

// Convert data to JSON format (pretty printed)
export function toJSON<T>(data: T): string {
  return JSON.stringify(data, null, 2);
}

// Generate export filename
export function generateFilename(
  type: "posts" | "analytics" | "account" | "full",
  format: "csv" | "json" | "xlsx"
): string {
  const date = new Date().toISOString().split("T")[0];
  return `autopost-${type}-export-${date}.${format}`;
}

// Get export history for user
export async function getExportHistory(userId: string) {
  // For now, we'll track exports in a simple way
  // In production, you might want to store this in a database
  return [];
}

// Calculate data size estimate
export async function getDataSizeEstimate(userId: string): Promise<{
  posts: number;
  analytics: number;
  estimatedSizeKB: number;
}> {
  const [postsCount, analyticsCount] = await Promise.all([
    prisma.post.count({ where: { userId } }),
    prisma.dailyMetrics.count({ where: { userId } }),
  ]);

  // Rough estimate: ~500 bytes per post, ~100 bytes per metric
  const estimatedSizeKB = Math.ceil((postsCount * 500 + analyticsCount * 100) / 1024);

  return {
    posts: postsCount,
    analytics: analyticsCount,
    estimatedSizeKB,
  };
}
