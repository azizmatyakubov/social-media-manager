import { prisma } from "./prisma";
import { PostStatus } from "@prisma/client";

export interface CreateCategoryInput {
  name: string;
  color?: string;
  icon?: string;
  description?: string;
  postsPerDay?: number;
  preferredTimes?: string[];
  preferredDays?: string[];
  shuffleQueue?: boolean;
  recycleContent?: boolean;
}

export interface UpdateCategoryInput {
  name?: string;
  color?: string;
  icon?: string;
  description?: string;
  postsPerDay?: number;
  preferredTimes?: string[];
  preferredDays?: string[];
  shuffleQueue?: boolean;
  recycleContent?: boolean;
  isActive?: boolean;
}

export interface CategoryStats {
  totalPosts: number;
  pendingPosts: number;
  scheduledPosts: number;
  postedPosts: number;
  failedPosts: number;
  totalLikes: number;
  totalRetweets: number;
  totalReplies: number;
  totalImpressions: number;
  avgEngagementRate: number;
  topPerformingPost: {
    id: string;
    content: string;
    likes: number;
    retweets: number;
    replies: number;
    impressions: number;
  } | null;
}

/**
 * Create a new content category
 */
export async function createCategory(userId: string, category: CreateCategoryInput) {
  return prisma.contentCategory.create({
    data: {
      userId,
      name: category.name,
      color: category.color || "#3B82F6",
      icon: category.icon,
      description: category.description,
      postsPerDay: category.postsPerDay || 1,
      preferredTimes: category.preferredTimes || [],
      preferredDays: category.preferredDays || [],
      shuffleQueue: category.shuffleQueue || false,
      recycleContent: category.recycleContent || false,
    },
    include: {
      _count: {
        select: { posts: true },
      },
    },
  });
}

/**
 * Get all categories for a user
 */
export async function getCategories(userId: string) {
  return prisma.contentCategory.findMany({
    where: { userId },
    include: {
      _count: {
        select: { posts: true },
      },
      posts: {
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          content: true,
          status: true,
          scheduledFor: true,
          likes: true,
          retweets: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Get a single category by ID
 */
export async function getCategory(categoryId: string) {
  return prisma.contentCategory.findUnique({
    where: { id: categoryId },
    include: {
      _count: {
        select: { posts: true },
      },
    },
  });
}

/**
 * Update a category
 */
export async function updateCategory(categoryId: string, updates: UpdateCategoryInput) {
  return prisma.contentCategory.update({
    where: { id: categoryId },
    data: updates,
    include: {
      _count: {
        select: { posts: true },
      },
    },
  });
}

/**
 * Delete a category
 */
export async function deleteCategory(categoryId: string) {
  // First, remove category from all posts
  await prisma.post.updateMany({
    where: { categoryId },
    data: { categoryId: null },
  });

  // Then delete the category
  return prisma.contentCategory.delete({
    where: { id: categoryId },
  });
}

/**
 * Assign a post to a category
 */
export async function assignPostToCategory(postId: string, categoryId: string | null) {
  const post = await prisma.post.update({
    where: { id: postId },
    data: { categoryId },
    include: {
      category: true,
    },
  });

  // Update category post count
  if (categoryId) {
    await updateCategoryPostCount(categoryId);
  }

  return post;
}

/**
 * Get all posts in a category
 */
export async function getPostsByCategory(
  categoryId: string,
  options?: {
    status?: PostStatus;
    limit?: number;
    offset?: number;
    orderBy?: "createdAt" | "scheduledFor" | "likes" | "impressions";
    order?: "asc" | "desc";
  }
) {
  const { status, limit = 50, offset = 0, orderBy = "createdAt", order = "desc" } = options || {};

  const where: { categoryId: string; status?: PostStatus } = { categoryId };
  if (status) {
    where.status = status;
  }

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { [orderBy]: order },
      include: {
        xAccount: {
          select: { xUsername: true },
        },
        linkedInAccount: {
          select: { name: true },
        },
        instagramAccount: {
          select: { username: true },
        },
      },
    }),
    prisma.post.count({ where }),
  ]);

  return { posts, total };
}

/**
 * Get the posting schedule for a category
 */
export async function getCategorySchedule(categoryId: string) {
  const category = await prisma.contentCategory.findUnique({
    where: { id: categoryId },
    select: {
      postsPerDay: true,
      preferredTimes: true,
      preferredDays: true,
      shuffleQueue: true,
      recycleContent: true,
      isActive: true,
    },
  });

  if (!category) {
    throw new Error("Category not found");
  }

  // Get scheduled posts for this category
  const scheduledPosts = await prisma.post.findMany({
    where: {
      categoryId,
      status: PostStatus.SCHEDULED,
      scheduledFor: {
        gte: new Date(),
      },
    },
    orderBy: { scheduledFor: "asc" },
    take: 20,
    select: {
      id: true,
      content: true,
      scheduledFor: true,
      platform: true,
    },
  });

  return {
    ...category,
    scheduledPosts,
    nextPostTime: scheduledPosts[0]?.scheduledFor || null,
  };
}

/**
 * Get the next post to be published from the category queue
 */
export async function getNextCategoryPost(categoryId: string) {
  const category = await prisma.contentCategory.findUnique({
    where: { id: categoryId },
  });

  if (!category || !category.isActive) {
    return null;
  }

  // If shuffle is enabled, get a random pending post
  if (category.shuffleQueue) {
    const pendingPosts = await prisma.post.findMany({
      where: {
        categoryId,
        status: PostStatus.PENDING,
      },
      select: { id: true },
    });

    if (pendingPosts.length === 0) {
      // If recycling is enabled and no pending posts, get oldest posted post
      if (category.recycleContent) {
        return prisma.post.findFirst({
          where: {
            categoryId,
            status: PostStatus.POSTED,
            isEvergreen: true,
          },
          orderBy: { lastRecycled: "asc" },
        });
      }
      return null;
    }

    const randomIndex = Math.floor(Math.random() * pendingPosts.length);
    const randomPost = pendingPosts[randomIndex];

    return prisma.post.findUnique({
      where: { id: randomPost.id },
      include: {
        xAccount: true,
        linkedInAccount: true,
        instagramAccount: true,
      },
    });
  }

  // Otherwise, get the oldest pending post (FIFO)
  const nextPost = await prisma.post.findFirst({
    where: {
      categoryId,
      status: PostStatus.PENDING,
    },
    orderBy: { createdAt: "asc" },
    include: {
      xAccount: true,
      linkedInAccount: true,
      instagramAccount: true,
    },
  });

  if (nextPost) {
    return nextPost;
  }

  // If recycling is enabled and no pending posts
  if (category.recycleContent) {
    return prisma.post.findFirst({
      where: {
        categoryId,
        status: PostStatus.POSTED,
        isEvergreen: true,
      },
      orderBy: { lastRecycled: "asc" },
      include: {
        xAccount: true,
        linkedInAccount: true,
        instagramAccount: true,
      },
    });
  }

  return null;
}

/**
 * Randomize the order of posts in the category queue
 */
export async function shuffleCategoryQueue(categoryId: string) {
  // Get all pending posts in the category
  const pendingPosts = await prisma.post.findMany({
    where: {
      categoryId,
      status: PostStatus.PENDING,
    },
    select: { id: true, createdAt: true },
  });

  if (pendingPosts.length < 2) {
    return { shuffled: false, count: pendingPosts.length, message: "Not enough posts to shuffle" };
  }

  // Fisher-Yates shuffle algorithm for the createdAt timestamps
  const timestamps = pendingPosts.map((p) => p.createdAt);
  for (let i = timestamps.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [timestamps[i], timestamps[j]] = [timestamps[j], timestamps[i]];
  }

  // Update posts with shuffled timestamps
  await Promise.all(
    pendingPosts.map((post, index) =>
      prisma.post.update({
        where: { id: post.id },
        data: { createdAt: timestamps[index] },
      })
    )
  );

  return { shuffled: true, count: pendingPosts.length, message: "Queue shuffled successfully" };
}

/**
 * Get engagement statistics for a category
 */
export async function getCategoryStats(categoryId: string): Promise<CategoryStats> {
  const category = await prisma.contentCategory.findUnique({
    where: { id: categoryId },
  });

  if (!category) {
    throw new Error("Category not found");
  }

  // Get post counts by status
  const [pendingCount, scheduledCount, postedCount, failedCount] = await Promise.all([
    prisma.post.count({ where: { categoryId, status: PostStatus.PENDING } }),
    prisma.post.count({ where: { categoryId, status: PostStatus.SCHEDULED } }),
    prisma.post.count({ where: { categoryId, status: PostStatus.POSTED } }),
    prisma.post.count({ where: { categoryId, status: PostStatus.FAILED } }),
  ]);

  const totalPosts = pendingCount + scheduledCount + postedCount + failedCount;

  // Get aggregated engagement metrics
  const engagementStats = await prisma.post.aggregate({
    where: { categoryId, status: PostStatus.POSTED },
    _sum: {
      likes: true,
      retweets: true,
      replies: true,
      impressions: true,
    },
    _avg: {
      likes: true,
      retweets: true,
      replies: true,
      impressions: true,
    },
  });

  // Calculate average engagement rate
  const totalLikes = engagementStats._sum.likes || 0;
  const totalRetweets = engagementStats._sum.retweets || 0;
  const totalReplies = engagementStats._sum.replies || 0;
  const totalImpressions = engagementStats._sum.impressions || 0;

  const avgEngagementRate =
    totalImpressions > 0
      ? ((totalLikes + totalRetweets + totalReplies) / totalImpressions) * 100
      : 0;

  // Get top performing post
  const topPost = await prisma.post.findFirst({
    where: { categoryId, status: PostStatus.POSTED },
    orderBy: [{ likes: "desc" }, { retweets: "desc" }, { replies: "desc" }],
    select: {
      id: true,
      content: true,
      likes: true,
      retweets: true,
      replies: true,
      impressions: true,
    },
  });

  return {
    totalPosts,
    pendingPosts: pendingCount,
    scheduledPosts: scheduledCount,
    postedPosts: postedCount,
    failedPosts: failedCount,
    totalLikes,
    totalRetweets,
    totalReplies,
    totalImpressions,
    avgEngagementRate: Math.round(avgEngagementRate * 100) / 100,
    topPerformingPost: topPost,
  };
}

/**
 * Update the total posts count for a category
 */
async function updateCategoryPostCount(categoryId: string) {
  const count = await prisma.post.count({ where: { categoryId } });
  await prisma.contentCategory.update({
    where: { id: categoryId },
    data: { totalPosts: count },
  });
}

/**
 * Bulk assign posts to a category
 */
export async function bulkAssignPosts(postIds: string[], categoryId: string | null) {
  await prisma.post.updateMany({
    where: { id: { in: postIds } },
    data: { categoryId },
  });

  if (categoryId) {
    await updateCategoryPostCount(categoryId);
  }

  return { updated: postIds.length };
}

/**
 * Move a post from one category to another
 */
export async function movePostToCategory(
  postId: string,
  fromCategoryId: string | null,
  toCategoryId: string | null
) {
  await prisma.post.update({
    where: { id: postId },
    data: { categoryId: toCategoryId },
  });

  // Update counts for both categories
  if (fromCategoryId) {
    await updateCategoryPostCount(fromCategoryId);
  }
  if (toCategoryId) {
    await updateCategoryPostCount(toCategoryId);
  }

  return { moved: true };
}

/**
 * Get category with detailed analytics over time
 */
export async function getCategoryAnalytics(
  categoryId: string,
  days: number = 30
) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const posts = await prisma.post.findMany({
    where: {
      categoryId,
      status: PostStatus.POSTED,
      postedAt: { gte: startDate },
    },
    orderBy: { postedAt: "asc" },
    select: {
      postedAt: true,
      likes: true,
      retweets: true,
      replies: true,
      impressions: true,
    },
  });

  // Group by day
  const dailyStats: Record<
    string,
    {
      date: string;
      posts: number;
      likes: number;
      retweets: number;
      replies: number;
      impressions: number;
    }
  > = {};

  posts.forEach((post) => {
    if (post.postedAt) {
      const dateKey = post.postedAt.toISOString().split("T")[0];
      if (!dailyStats[dateKey]) {
        dailyStats[dateKey] = {
          date: dateKey,
          posts: 0,
          likes: 0,
          retweets: 0,
          replies: 0,
          impressions: 0,
        };
      }
      dailyStats[dateKey].posts++;
      dailyStats[dateKey].likes += post.likes;
      dailyStats[dateKey].retweets += post.retweets;
      dailyStats[dateKey].replies += post.replies;
      dailyStats[dateKey].impressions += post.impressions;
    }
  });

  return Object.values(dailyStats).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Reorder posts within a category (for manual queue ordering)
 */
export async function reorderCategoryPosts(categoryId: string, postIds: string[]) {
  // Update each post with a new createdAt timestamp to maintain order
  const now = new Date();
  await Promise.all(
    postIds.map((postId, index) =>
      prisma.post.update({
        where: { id: postId },
        data: { createdAt: new Date(now.getTime() + index * 1000) },
      })
    )
  );

  return { reordered: postIds.length };
}
