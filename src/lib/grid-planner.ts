import { prisma } from "./prisma";
import { publishInstagramPost } from "./platforms/instagram";
import { Platform, MediaType, PostStatus, Prisma } from "@prisma/client";

export interface GridPost {
  position: number;
  imageUrl: string | null;
  postId: string | null;
  scheduledFor: string | null;
  caption?: string | null;
  aspectRatio?: "square" | "portrait" | "landscape";
}

export interface GridPlan {
  id: string;
  userId: string;
  instagramAccountId: string;
  posts: GridPost[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublishedPost {
  id: string;
  mediaUrl: string;
  caption?: string;
  timestamp: string;
  permalink?: string;
  likeCount?: number;
  commentsCount?: number;
}

/**
 * Get the current grid plan for a user's Instagram account
 */
export async function getGridPlan(
  userId: string,
  instagramAccountId: string
): Promise<GridPlan | null> {
  const plan = await prisma.gridPlan.findFirst({
    where: {
      userId,
      instagramAccountId,
      isActive: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  if (!plan) return null;

  return {
    id: plan.id,
    userId: plan.userId,
    instagramAccountId: plan.instagramAccountId,
    posts: (plan.posts as unknown as GridPost[]) || createEmptyGrid(),
    isActive: plan.isActive,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
  };
}

/**
 * Create an empty 9-post grid
 */
function createEmptyGrid(): GridPost[] {
  return Array.from({ length: 9 }, (_, i) => ({
    position: i,
    imageUrl: null,
    postId: null,
    scheduledFor: null,
    caption: null,
    aspectRatio: "square" as const,
  }));
}

/**
 * Create a new grid plan for an Instagram account
 */
export async function createGridPlan(
  userId: string,
  instagramAccountId: string
): Promise<GridPlan> {
  // Deactivate any existing active plans
  await prisma.gridPlan.updateMany({
    where: {
      userId,
      instagramAccountId,
      isActive: true,
    },
    data: {
      isActive: false,
    },
  });

  // Create new plan with empty grid
  const plan = await prisma.gridPlan.create({
    data: {
      userId,
      instagramAccountId,
      posts: createEmptyGrid() as unknown as Prisma.InputJsonValue,
      isActive: true,
    },
  });

  return {
    id: plan.id,
    userId: plan.userId,
    instagramAccountId: plan.instagramAccountId,
    posts: plan.posts as unknown as GridPost[],
    isActive: plan.isActive,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
  };
}

/**
 * Update a specific position in the grid
 */
export async function updateGridPosition(
  planId: string,
  position: number,
  imageUrl: string | null,
  scheduledFor: string | null,
  caption?: string | null,
  aspectRatio?: "square" | "portrait" | "landscape"
): Promise<GridPlan> {
  const plan = await prisma.gridPlan.findUnique({
    where: { id: planId },
  });

  if (!plan) {
    throw new Error("Grid plan not found");
  }

  const posts = (plan.posts as unknown as GridPost[]) || createEmptyGrid();

  // Update the specific position
  const postIndex = posts.findIndex((p) => p.position === position);
  if (postIndex !== -1) {
    posts[postIndex] = {
      ...posts[postIndex],
      imageUrl,
      scheduledFor,
      caption: caption ?? posts[postIndex].caption,
      aspectRatio: aspectRatio ?? posts[postIndex].aspectRatio ?? "square",
    };
  } else {
    posts.push({
      position,
      imageUrl,
      postId: null,
      scheduledFor,
      caption,
      aspectRatio: aspectRatio ?? "square",
    });
  }

  const updatedPlan = await prisma.gridPlan.update({
    where: { id: planId },
    data: { posts: posts as unknown as Prisma.InputJsonValue },
  });

  return {
    id: updatedPlan.id,
    userId: updatedPlan.userId,
    instagramAccountId: updatedPlan.instagramAccountId,
    posts: updatedPlan.posts as unknown as GridPost[],
    isActive: updatedPlan.isActive,
    createdAt: updatedPlan.createdAt,
    updatedAt: updatedPlan.updatedAt,
  };
}

/**
 * Reorder posts in the grid (for drag and drop)
 */
export async function reorderGrid(
  planId: string,
  positions: { from: number; to: number }[]
): Promise<GridPlan> {
  const plan = await prisma.gridPlan.findUnique({
    where: { id: planId },
  });

  if (!plan) {
    throw new Error("Grid plan not found");
  }

  const posts = [...((plan.posts as unknown as GridPost[]) || createEmptyGrid())];

  // Apply all position swaps
  for (const { from, to } of positions) {
    const fromPost = posts.find((p) => p.position === from);
    const toPost = posts.find((p) => p.position === to);

    if (fromPost && toPost) {
      // Swap content but keep positions
      const temp = {
        imageUrl: fromPost.imageUrl,
        postId: fromPost.postId,
        scheduledFor: fromPost.scheduledFor,
        caption: fromPost.caption,
        aspectRatio: fromPost.aspectRatio,
      };

      fromPost.imageUrl = toPost.imageUrl;
      fromPost.postId = toPost.postId;
      fromPost.scheduledFor = toPost.scheduledFor;
      fromPost.caption = toPost.caption;
      fromPost.aspectRatio = toPost.aspectRatio;

      toPost.imageUrl = temp.imageUrl;
      toPost.postId = temp.postId;
      toPost.scheduledFor = temp.scheduledFor;
      toPost.caption = temp.caption;
      toPost.aspectRatio = temp.aspectRatio;
    }
  }

  const updatedPlan = await prisma.gridPlan.update({
    where: { id: planId },
    data: { posts: posts as unknown as Prisma.InputJsonValue },
  });

  return {
    id: updatedPlan.id,
    userId: updatedPlan.userId,
    instagramAccountId: updatedPlan.instagramAccountId,
    posts: updatedPlan.posts as unknown as GridPost[],
    isActive: updatedPlan.isActive,
    createdAt: updatedPlan.createdAt,
    updatedAt: updatedPlan.updatedAt,
  };
}

/**
 * Get the last 9 published posts from Instagram
 */
export async function getPublishedGrid(
  instagramAccountId: string
): Promise<PublishedPost[]> {
  const account = await prisma.instagramAccount.findUnique({
    where: { id: instagramAccountId },
  });

  if (!account) {
    throw new Error("Instagram account not found");
  }

  try {
    // Fetch recent media from Instagram Graph API
    const response = await fetch(
      `https://graph.instagram.com/me/media?fields=id,media_url,caption,timestamp,permalink,like_count,comments_count&limit=9&access_token=${account.accessToken}`
    );

    if (!response.ok) {
      console.error("Failed to fetch Instagram media");
      return [];
    }

    const data = await response.json();

    return (data.data || []).map((post: any) => ({
      id: post.id,
      mediaUrl: post.media_url,
      caption: post.caption,
      timestamp: post.timestamp,
      permalink: post.permalink,
      likeCount: post.like_count,
      commentsCount: post.comments_count,
    }));
  } catch (error) {
    console.error("Error fetching published grid:", error);
    return [];
  }
}

/**
 * Preview grid: combine scheduled posts with published posts
 */
export async function previewGrid(
  planId: string
): Promise<{ scheduled: GridPost[]; published: PublishedPost[] }> {
  const plan = await prisma.gridPlan.findUnique({
    where: { id: planId },
  });

  if (!plan) {
    throw new Error("Grid plan not found");
  }

  const scheduledPosts = (plan.posts as unknown as GridPost[]).filter(
    (p) => p.imageUrl && p.scheduledFor
  );

  const publishedPosts = await getPublishedGrid(plan.instagramAccountId);

  return {
    scheduled: scheduledPosts,
    published: publishedPosts,
  };
}

/**
 * Publish a specific position from the grid
 */
export async function publishGridPost(
  planId: string,
  position: number
): Promise<{ success: boolean; postId?: string; error?: string }> {
  const plan = await prisma.gridPlan.findUnique({
    where: { id: planId },
  });

  if (!plan) {
    return { success: false, error: "Grid plan not found" };
  }

  const posts = plan.posts as unknown as GridPost[];
  const post = posts.find((p) => p.position === position);

  if (!post || !post.imageUrl) {
    return { success: false, error: "No image at this position" };
  }

  const account = await prisma.instagramAccount.findUnique({
    where: { id: plan.instagramAccountId },
  });

  if (!account) {
    return { success: false, error: "Instagram account not found" };
  }

  try {
    const result = await publishInstagramPost(
      account.accessToken,
      account.instagramId,
      post.imageUrl,
      post.caption || ""
    );

    // Update the grid to mark this post as published
    const updatedPosts = posts.map((p) => {
      if (p.position === position) {
        return {
          ...p,
          postId: result.id,
          scheduledFor: null,
        };
      }
      return p;
    });

    await prisma.gridPlan.update({
      where: { id: planId },
      data: { posts: updatedPosts as unknown as Prisma.InputJsonValue },
    });

    // Also create a Post record
    await prisma.post.create({
      data: {
        userId: plan.userId,
        platform: Platform.INSTAGRAM,
        instagramAccountId: plan.instagramAccountId,
        content: post.caption || "",
        platformPostId: result.id,
        status: PostStatus.POSTED,
        postedAt: new Date(),
        mediaUrls: [post.imageUrl],
        mediaType: MediaType.IMAGE,
      },
    });

    return { success: true, postId: result.id };
  } catch (error) {
    console.error("Error publishing grid post:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to publish",
    };
  }
}

/**
 * Clear a grid position
 */
export async function clearGridPosition(
  planId: string,
  position: number
): Promise<GridPlan> {
  return updateGridPosition(planId, position, null, null, null, "square");
}

/**
 * Calculate color harmony score for the grid
 * Returns a score from 0-100 indicating how harmonious the grid colors are
 */
export async function calculateColorHarmony(
  posts: GridPost[]
): Promise<{ score: number; suggestions: string[] }> {
  const postsWithImages = posts.filter((p) => p.imageUrl);

  if (postsWithImages.length < 2) {
    return { score: 100, suggestions: [] };
  }

  // This is a simplified version - in production you'd want to use
  // an image processing library to extract dominant colors
  const suggestions: string[] = [];

  // Check for variety in positions
  const hasTopRow = postsWithImages.some((p) => p.position < 3);
  const hasMiddleRow = postsWithImages.some(
    (p) => p.position >= 3 && p.position < 6
  );
  const hasBottomRow = postsWithImages.some((p) => p.position >= 6);

  if (!hasTopRow || !hasMiddleRow || !hasBottomRow) {
    suggestions.push("Try to distribute images across all rows for better visual balance");
  }

  // Check for schedule balance
  const scheduledPosts = postsWithImages.filter((p) => p.scheduledFor);
  if (scheduledPosts.length > 0 && scheduledPosts.length < postsWithImages.length) {
    suggestions.push("Consider scheduling all prepared posts for consistent publishing");
  }

  // Calculate a basic score
  let score = 70;
  if (hasTopRow && hasMiddleRow && hasBottomRow) score += 15;
  if (postsWithImages.length >= 6) score += 10;
  if (scheduledPosts.length === postsWithImages.length) score += 5;

  return {
    score: Math.min(100, score),
    suggestions,
  };
}

/**
 * Get all grid plans for a user
 */
export async function getUserGridPlans(userId: string): Promise<GridPlan[]> {
  const plans = await prisma.gridPlan.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });

  return plans.map((plan) => ({
    id: plan.id,
    userId: plan.userId,
    instagramAccountId: plan.instagramAccountId,
    posts: (plan.posts as unknown as GridPost[]) || createEmptyGrid(),
    isActive: plan.isActive,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
  }));
}

/**
 * Delete a grid plan
 */
export async function deleteGridPlan(planId: string): Promise<void> {
  await prisma.gridPlan.delete({
    where: { id: planId },
  });
}
