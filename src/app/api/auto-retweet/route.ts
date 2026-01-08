import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasFeatureAccess } from "@/lib/subscription";
import {
  getEvergreenPosts,
  scheduleAutoRetweet,
  checkRetweetEligibility,
} from "@/lib/auto-engagement";

/**
 * GET - Get evergreen posts and their retweet schedules
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check feature access
    const hasAccess = await hasFeatureAccess(session.user.id, "Evergreen Recycler");
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Upgrade to access Evergreen Auto-Retweet" },
        { status: 403 }
      );
    }

    // Get all evergreen posts
    const evergreenPosts = await getEvergreenPosts(session.user.id);

    // Add eligibility info to each post
    const postsWithEligibility = await Promise.all(
      evergreenPosts.map(async (post) => {
        const eligibility = await checkRetweetEligibility(post.id);
        const engagementScore = post.likes + (post.retweets * 2) + (post.replies * 3);

        // Calculate next retweet date
        const lastAction = post.lastRecycled || post.postedAt || post.createdAt;
        const nextRetweetDate = new Date(lastAction);
        nextRetweetDate.setDate(nextRetweetDate.getDate() + 30);

        return {
          ...post,
          eligibility,
          engagementScore,
          nextRetweetDate,
        };
      })
    );

    // Get retweet history (recycled posts)
    const retweetHistory = await prisma.post.findMany({
      where: {
        userId: session.user.id,
        recycleCount: { gt: 0 },
      },
      orderBy: { lastRecycled: "desc" },
      take: 20,
      select: {
        id: true,
        content: true,
        lastRecycled: true,
        recycleCount: true,
        likes: true,
        retweets: true,
      },
    });

    // Calculate stats
    const stats = {
      totalEvergreen: evergreenPosts.length,
      autoRetweetEnabled: evergreenPosts.filter((p) => p.autoRetweet).length,
      eligibleForRetweet: postsWithEligibility.filter((p) => p.eligibility.eligible).length,
      totalRetweets: evergreenPosts.reduce((sum, p) => sum + p.recycleCount, 0),
    };

    return NextResponse.json({
      posts: postsWithEligibility,
      history: retweetHistory,
      stats,
    });
  } catch (error) {
    console.error("Get evergreen posts error:", error);
    return NextResponse.json(
      { error: "Failed to get evergreen posts" },
      { status: 500 }
    );
  }
}

/**
 * POST - Mark post as evergreen and set retweet settings
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAccess = await hasFeatureAccess(session.user.id, "Evergreen Recycler");
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Upgrade to access Evergreen Auto-Retweet" },
        { status: 403 }
      );
    }

    const { postId, isEvergreen, autoRetweet, intervalDays, minEngagement } =
      await request.json();

    if (!postId) {
      return NextResponse.json({ error: "Post ID is required" }, { status: 400 });
    }

    // Verify post belongs to user
    const post = await prisma.post.findFirst({
      where: { id: postId, userId: session.user.id },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Update post with evergreen settings
    const updated = await prisma.post.update({
      where: { id: postId },
      data: {
        isEvergreen: isEvergreen ?? post.isEvergreen,
        autoRetweet: autoRetweet ?? post.autoRetweet,
      },
    });

    // If enabling auto-retweet, set up the schedule
    let scheduleResult = null;
    if (autoRetweet) {
      scheduleResult = await scheduleAutoRetweet(
        postId,
        intervalDays || 30,
        minEngagement || 10
      );
    }

    return NextResponse.json({
      success: true,
      post: updated,
      schedule: scheduleResult,
    });
  } catch (error) {
    console.error("Update evergreen settings error:", error);
    return NextResponse.json(
      { error: "Failed to update evergreen settings" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Remove evergreen status from a post
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const postId = searchParams.get("postId");

    if (!postId) {
      return NextResponse.json({ error: "Post ID is required" }, { status: 400 });
    }

    // Verify post belongs to user
    const post = await prisma.post.findFirst({
      where: { id: postId, userId: session.user.id },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Remove evergreen and auto-retweet status
    await prisma.post.update({
      where: { id: postId },
      data: {
        isEvergreen: false,
        autoRetweet: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Evergreen status removed",
    });
  } catch (error) {
    console.error("Remove evergreen status error:", error);
    return NextResponse.json(
      { error: "Failed to remove evergreen status" },
      { status: 500 }
    );
  }
}
