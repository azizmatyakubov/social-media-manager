import { prisma } from "./prisma";

// Types
export type CampaignStatus = "DRAFT" | "SCHEDULED" | "ACTIVE" | "PAUSED" | "COMPLETED" | "ARCHIVED";
export type CampaignObjective = "awareness" | "engagement" | "traffic" | "conversions";

export interface CampaignInput {
  name: string;
  description?: string;
  status?: CampaignStatus;
  objective?: CampaignObjective;
  targetAudience?: string;
  platforms?: string[];
  budget?: number;
  startDate?: Date;
  endDate?: Date;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  hashtags?: string[];
  tags?: string[];
  color?: string;
}

export interface CampaignPostInput {
  campaignId: string;
  platform: string;
  content: string;
  mediaUrls?: string[];
  scheduledFor?: Date;
}

export interface CampaignWithPosts {
  id: string;
  name: string;
  description: string | null;
  status: CampaignStatus;
  objective: string | null;
  targetAudience: string | null;
  platforms: string[];
  budget: number | null;
  budgetSpent: number;
  startDate: Date | null;
  endDate: Date | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  hashtags: string[];
  tags: string[];
  totalPosts: number;
  postsPublished: number;
  totalReach: number;
  totalEngagement: number;
  totalClicks: number;
  totalConversions: number;
  color: string;
  createdAt: Date;
  updatedAt: Date;
  posts: CampaignPostData[];
}

export interface CampaignPostData {
  id: string;
  campaignId: string;
  postId: string | null;
  platform: string;
  content: string;
  mediaUrls: string[];
  scheduledFor: Date | null;
  publishedAt: Date | null;
  status: string;
  reach: number;
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  engagement: number;
  createdAt: Date;
  updatedAt: Date;
}

// Campaign CRUD
export async function createCampaign(userId: string, data: CampaignInput) {
  return prisma.campaign.create({
    data: {
      userId,
      name: data.name,
      description: data.description,
      status: data.status || "DRAFT",
      objective: data.objective,
      targetAudience: data.targetAudience,
      platforms: data.platforms || [],
      budget: data.budget,
      startDate: data.startDate,
      endDate: data.endDate,
      utmSource: data.utmSource,
      utmMedium: data.utmMedium,
      utmCampaign: data.utmCampaign,
      hashtags: data.hashtags || [],
      tags: data.tags || [],
      color: data.color || "#6366F1",
    },
  });
}

export async function updateCampaign(
  campaignId: string,
  userId: string,
  data: Partial<CampaignInput>
) {
  return prisma.campaign.update({
    where: { id: campaignId, userId },
    data,
  });
}

export async function deleteCampaign(campaignId: string, userId: string) {
  return prisma.campaign.delete({
    where: { id: campaignId, userId },
  });
}

export async function getCampaign(campaignId: string, userId: string): Promise<CampaignWithPosts | null> {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, userId },
    include: {
      posts: {
        orderBy: { scheduledFor: "asc" },
      },
    },
  });

  if (!campaign) return null;

  return {
    ...campaign,
    status: campaign.status as CampaignStatus,
  };
}

export async function getCampaigns(
  userId: string,
  options?: {
    status?: CampaignStatus;
    platform?: string;
    search?: string;
    sortBy?: "name" | "createdAt" | "startDate" | "totalEngagement";
    sortOrder?: "asc" | "desc";
    limit?: number;
    offset?: number;
  }
) {
  const where: Record<string, unknown> = { userId };

  if (options?.status) {
    where.status = options.status;
  }

  if (options?.platform) {
    where.platforms = { has: options.platform };
  }

  if (options?.search) {
    where.OR = [
      { name: { contains: options.search, mode: "insensitive" } },
      { description: { contains: options.search, mode: "insensitive" } },
      { tags: { has: options.search.toLowerCase() } },
    ];
  }

  const orderBy: Record<string, string> = {};
  if (options?.sortBy) {
    orderBy[options.sortBy] = options.sortOrder || "desc";
  } else {
    orderBy.createdAt = "desc";
  }

  const campaigns = await prisma.campaign.findMany({
    where,
    orderBy,
    take: options?.limit ?? 50,
    skip: options?.offset ?? 0,
    include: {
      _count: {
        select: { posts: true },
      },
    },
  });

  return campaigns.map((c) => ({
    ...c,
    status: c.status as CampaignStatus,
    postCount: c._count.posts,
  }));
}

// Campaign Post CRUD
export async function createCampaignPost(userId: string, data: CampaignPostInput) {
  // Verify campaign belongs to user
  const campaign = await prisma.campaign.findFirst({
    where: { id: data.campaignId, userId },
  });

  if (!campaign) {
    throw new Error("Campaign not found");
  }

  const post = await prisma.campaignPost.create({
    data: {
      campaignId: data.campaignId,
      platform: data.platform,
      content: data.content,
      mediaUrls: data.mediaUrls || [],
      scheduledFor: data.scheduledFor,
      status: data.scheduledFor ? "scheduled" : "draft",
    },
  });

  // Update campaign post count
  await prisma.campaign.update({
    where: { id: data.campaignId },
    data: { totalPosts: { increment: 1 } },
  });

  return post;
}

export async function updateCampaignPost(
  postId: string,
  userId: string,
  data: Partial<CampaignPostInput & { status?: string; publishedAt?: Date }>
) {
  // Verify access
  const post = await prisma.campaignPost.findFirst({
    where: { id: postId },
    include: { campaign: { select: { userId: true } } },
  });

  if (!post || post.campaign.userId !== userId) {
    throw new Error("Post not found");
  }

  return prisma.campaignPost.update({
    where: { id: postId },
    data,
  });
}

export async function deleteCampaignPost(postId: string, userId: string) {
  // Verify access
  const post = await prisma.campaignPost.findFirst({
    where: { id: postId },
    include: { campaign: { select: { id: true, userId: true } } },
  });

  if (!post || post.campaign.userId !== userId) {
    throw new Error("Post not found");
  }

  await prisma.campaignPost.delete({
    where: { id: postId },
  });

  // Update campaign post count
  await prisma.campaign.update({
    where: { id: post.campaign.id },
    data: { totalPosts: { decrement: 1 } },
  });

  return { success: true };
}

export async function getCampaignPosts(
  campaignId: string,
  userId: string,
  options?: {
    status?: string;
    platform?: string;
    sortBy?: "scheduledFor" | "createdAt" | "engagement";
    sortOrder?: "asc" | "desc";
  }
) {
  // Verify access
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, userId },
  });

  if (!campaign) {
    throw new Error("Campaign not found");
  }

  const where: Record<string, unknown> = { campaignId };

  if (options?.status) {
    where.status = options.status;
  }

  if (options?.platform) {
    where.platform = options.platform;
  }

  const orderBy: Record<string, string> = {};
  if (options?.sortBy) {
    orderBy[options.sortBy] = options.sortOrder || "desc";
  } else {
    orderBy.scheduledFor = "asc";
  }

  return prisma.campaignPost.findMany({
    where,
    orderBy,
  });
}

// Campaign Analytics
export async function getCampaignStats(userId: string) {
  const [
    totalCampaigns,
    activeCampaigns,
    totalPosts,
    publishedPosts,
    aggregatedStats,
  ] = await Promise.all([
    prisma.campaign.count({ where: { userId } }),
    prisma.campaign.count({ where: { userId, status: "ACTIVE" } }),
    prisma.campaignPost.count({
      where: { campaign: { userId } },
    }),
    prisma.campaignPost.count({
      where: { campaign: { userId }, status: "published" },
    }),
    prisma.campaign.aggregate({
      where: { userId },
      _sum: {
        totalReach: true,
        totalEngagement: true,
        totalClicks: true,
        totalConversions: true,
        budgetSpent: true,
      },
    }),
  ]);

  return {
    totalCampaigns,
    activeCampaigns,
    totalPosts,
    publishedPosts,
    totalReach: aggregatedStats._sum.totalReach || 0,
    totalEngagement: aggregatedStats._sum.totalEngagement || 0,
    totalClicks: aggregatedStats._sum.totalClicks || 0,
    totalConversions: aggregatedStats._sum.totalConversions || 0,
    totalSpent: aggregatedStats._sum.budgetSpent || 0,
  };
}

export async function getCampaignPerformance(campaignId: string, userId: string) {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, userId },
    include: {
      posts: true,
    },
  });

  if (!campaign) {
    throw new Error("Campaign not found");
  }

  // Calculate performance by platform
  const platformStats: Record<string, {
    posts: number;
    reach: number;
    engagement: number;
    clicks: number;
  }> = {};

  campaign.posts.forEach((post) => {
    if (!platformStats[post.platform]) {
      platformStats[post.platform] = { posts: 0, reach: 0, engagement: 0, clicks: 0 };
    }
    platformStats[post.platform].posts++;
    platformStats[post.platform].reach += post.reach;
    platformStats[post.platform].engagement += post.likes + post.comments + post.shares;
    platformStats[post.platform].clicks += post.clicks;
  });

  // Calculate performance by status
  const statusCounts = {
    draft: 0,
    scheduled: 0,
    published: 0,
    failed: 0,
  };

  campaign.posts.forEach((post) => {
    if (post.status in statusCounts) {
      statusCounts[post.status as keyof typeof statusCounts]++;
    }
  });

  // Top performing posts
  const topPosts = [...campaign.posts]
    .sort((a, b) => (b.likes + b.comments + b.shares) - (a.likes + a.comments + a.shares))
    .slice(0, 5);

  return {
    campaign: {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      objective: campaign.objective,
      startDate: campaign.startDate,
      endDate: campaign.endDate,
      budget: campaign.budget,
      budgetSpent: campaign.budgetSpent,
    },
    totals: {
      posts: campaign.posts.length,
      reach: campaign.totalReach,
      engagement: campaign.totalEngagement,
      clicks: campaign.totalClicks,
      conversions: campaign.totalConversions,
    },
    platformStats: Object.entries(platformStats).map(([platform, stats]) => ({
      platform,
      ...stats,
    })),
    statusCounts,
    topPosts,
  };
}

// Update campaign metrics
export async function updateCampaignMetrics(campaignId: string) {
  const posts = await prisma.campaignPost.findMany({
    where: { campaignId },
  });

  let totalReach = 0;
  let totalEngagement = 0;
  let totalClicks = 0;
  let postsPublished = 0;

  posts.forEach((post) => {
    totalReach += post.reach;
    totalEngagement += post.likes + post.comments + post.shares;
    totalClicks += post.clicks;
    if (post.status === "published") {
      postsPublished++;
    }
  });

  return prisma.campaign.update({
    where: { id: campaignId },
    data: {
      totalReach,
      totalEngagement,
      totalClicks,
      postsPublished,
    },
  });
}

// Duplicate campaign
export async function duplicateCampaign(campaignId: string, userId: string, newName?: string) {
  const original = await prisma.campaign.findFirst({
    where: { id: campaignId, userId },
    include: { posts: true },
  });

  if (!original) {
    throw new Error("Campaign not found");
  }

  const newCampaign = await prisma.campaign.create({
    data: {
      userId,
      name: newName || `${original.name} (Copy)`,
      description: original.description,
      status: "DRAFT",
      objective: original.objective,
      targetAudience: original.targetAudience,
      platforms: original.platforms,
      budget: original.budget,
      utmSource: original.utmSource,
      utmMedium: original.utmMedium,
      utmCampaign: original.utmCampaign ? `${original.utmCampaign}-copy` : null,
      hashtags: original.hashtags,
      tags: original.tags,
      color: original.color,
    },
  });

  // Duplicate posts
  if (original.posts.length > 0) {
    await prisma.campaignPost.createMany({
      data: original.posts.map((post) => ({
        campaignId: newCampaign.id,
        platform: post.platform,
        content: post.content,
        mediaUrls: post.mediaUrls,
        status: "draft",
      })),
    });

    await prisma.campaign.update({
      where: { id: newCampaign.id },
      data: { totalPosts: original.posts.length },
    });
  }

  return newCampaign;
}

// Archive completed campaigns
export async function archiveCompletedCampaigns(userId: string) {
  const now = new Date();

  const result = await prisma.campaign.updateMany({
    where: {
      userId,
      status: { in: ["ACTIVE", "COMPLETED"] },
      endDate: { lt: now },
    },
    data: { status: "ARCHIVED" },
  });

  return result.count;
}

// Get campaign calendar events
export async function getCampaignCalendarEvents(
  userId: string,
  startDate: Date,
  endDate: Date
) {
  const campaigns = await prisma.campaign.findMany({
    where: {
      userId,
      OR: [
        {
          startDate: { gte: startDate, lte: endDate },
        },
        {
          endDate: { gte: startDate, lte: endDate },
        },
        {
          AND: [
            { startDate: { lte: startDate } },
            { endDate: { gte: endDate } },
          ],
        },
      ],
    },
    include: {
      posts: {
        where: {
          scheduledFor: { gte: startDate, lte: endDate },
        },
        orderBy: { scheduledFor: "asc" },
      },
    },
  });

  return campaigns.map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
    startDate: c.startDate,
    endDate: c.endDate,
    status: c.status,
    posts: c.posts.map((p) => ({
      id: p.id,
      platform: p.platform,
      scheduledFor: p.scheduledFor,
      status: p.status,
    })),
  }));
}
