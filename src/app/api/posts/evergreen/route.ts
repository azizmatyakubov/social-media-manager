import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasFeatureAccess } from "@/lib/subscription";

// GET - Get evergreen posts that can be recycled
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
        { error: "Upgrade to access Evergreen Recycler" },
        { status: 403 }
      );
    }

    // Get posts marked as evergreen
    const evergreenPosts = await prisma.post.findMany({
      where: {
        userId: session.user.id,
        isEvergreen: true,
        status: "POSTED",
      },
      orderBy: [
        { lastRecycled: "asc" }, // Oldest recycled first
        { createdAt: "asc" },
      ],
      take: 50,
    });

    // Get candidates based on engagement (high performing posts)
    const candidates = await prisma.post.findMany({
      where: {
        userId: session.user.id,
        status: "POSTED",
        isEvergreen: false,
        // Has good engagement
        OR: [
          { likes: { gte: 10 } },
          { retweets: { gte: 5 } },
          { replies: { gte: 5 } },
        ],
      },
      orderBy: { likes: "desc" },
      take: 20,
    });

    // Calculate engagement scores and recyclability
    const evergreenWithScore = evergreenPosts.map((post) => {
      const daysSinceRecycled = post.lastRecycled
        ? Math.floor((Date.now() - post.lastRecycled.getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      const engagementScore = post.likes + (post.retweets * 2) + (post.replies * 3);

      return {
        ...post,
        engagementScore,
        daysSinceRecycled,
        canRecycle: daysSinceRecycled >= 30, // Can recycle after 30 days
        suggestedRecycleDate: post.lastRecycled
          ? new Date(post.lastRecycled.getTime() + 30 * 24 * 60 * 60 * 1000)
          : new Date(),
      };
    });

    const candidatesWithScore = candidates.map((post) => {
      const engagementScore = post.likes + (post.retweets * 2) + (post.replies * 3);
      return {
        ...post,
        engagementScore,
        isCandidate: true,
      };
    });

    return NextResponse.json({
      evergreen: evergreenWithScore,
      candidates: candidatesWithScore,
      stats: {
        totalEvergreen: evergreenPosts.length,
        readyToRecycle: evergreenWithScore.filter((p) => p.canRecycle).length,
        candidates: candidates.length,
      },
    });
  } catch (error) {
    console.error("Get evergreen posts error:", error);
    return NextResponse.json(
      { error: "Failed to get evergreen posts" },
      { status: 500 }
    );
  }
}

// PATCH - Mark/unmark post as evergreen
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAccess = await hasFeatureAccess(session.user.id, "Evergreen Recycler");
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Upgrade to access Evergreen Recycler" },
        { status: 403 }
      );
    }

    const { postId, isEvergreen } = await request.json();

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

    const updated = await prisma.post.update({
      where: { id: postId },
      data: { isEvergreen: Boolean(isEvergreen) },
    });

    return NextResponse.json({ success: true, post: updated });
  } catch (error) {
    console.error("Update evergreen status error:", error);
    return NextResponse.json(
      { error: "Failed to update post" },
      { status: 500 }
    );
  }
}

// POST - Recycle an evergreen post (create new scheduled post)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAccess = await hasFeatureAccess(session.user.id, "Evergreen Recycler");
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Upgrade to access Evergreen Recycler" },
        { status: 403 }
      );
    }

    const { postId, scheduledFor, modifyContent } = await request.json();

    if (!postId) {
      return NextResponse.json({ error: "Post ID is required" }, { status: 400 });
    }

    // Get original post
    const originalPost = await prisma.post.findFirst({
      where: { id: postId, userId: session.user.id, isEvergreen: true },
    });

    if (!originalPost) {
      return NextResponse.json({ error: "Evergreen post not found" }, { status: 404 });
    }

    // Use modified content or original
    const content = modifyContent?.trim() || originalPost.content;

    // Create new post as recycle
    const [newPost] = await Promise.all([
      prisma.post.create({
        data: {
          userId: session.user.id,
          content,
          status: scheduledFor ? "SCHEDULED" : "PENDING",
          scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
          mediaUrls: originalPost.mediaUrls,
          mediaType: originalPost.mediaType,
        },
      }),
      // Update original post recycling stats
      prisma.post.update({
        where: { id: postId },
        data: {
          lastRecycled: new Date(),
          recycleCount: { increment: 1 },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      post: newPost,
      message: "Post recycled successfully",
    });
  } catch (error) {
    console.error("Recycle post error:", error);
    return NextResponse.json(
      { error: "Failed to recycle post" },
      { status: 500 }
    );
  }
}
