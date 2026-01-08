import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PostStatus } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { threadId } = await request.json();

    if (!threadId) {
      return NextResponse.json({ error: "Thread ID is required" }, { status: 400 });
    }

    // Get thread with posts
    const thread = await prisma.thread.findUnique({
      where: { id: threadId, userId: session.user.id },
      include: {
        posts: {
          orderBy: { threadIndex: "asc" },
        },
      },
    });

    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    if (thread.status === PostStatus.POSTED) {
      return NextResponse.json({ error: "Thread already published" }, { status: 400 });
    }

    // Get X account
    const xAccount = await prisma.xAccount.findFirst({
      where: { userId: session.user.id, isDefault: true },
    });

    if (!xAccount) {
      // Try to get any X account
      const anyAccount = await prisma.xAccount.findFirst({
        where: { userId: session.user.id },
      });

      if (!anyAccount) {
        return NextResponse.json(
          { error: "No X account connected" },
          { status: 400 }
        );
      }
    }

    const account = xAccount || await prisma.xAccount.findFirst({
      where: { userId: session.user.id },
    });

    if (!account) {
      return NextResponse.json({ error: "No X account found" }, { status: 400 });
    }

    // Publish thread to X
    let previousTweetId: string | null = null;
    const publishedPosts: { id: string; xPostId: string }[] = [];

    for (const post of thread.posts) {
      try {
        const tweetData: Record<string, unknown> = {
          text: post.content,
        };

        // If this is not the first tweet, add it as a reply
        if (previousTweetId) {
          tweetData.reply = {
            in_reply_to_tweet_id: previousTweetId,
          };
        }

        const response = await fetch("https://api.twitter.com/2/tweets", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${account.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(tweetData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || "Failed to post tweet");
        }

        const data = await response.json();
        previousTweetId = data.data.id;

        // Update post with X post ID
        await prisma.post.update({
          where: { id: post.id },
          data: {
            xPostId: data.data.id,
            status: PostStatus.POSTED,
            postedAt: new Date(),
            xAccountId: account.id,
          },
        });

        publishedPosts.push({ id: post.id, xPostId: data.data.id });

        // Small delay between tweets to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        // Mark remaining posts as failed
        await prisma.post.updateMany({
          where: {
            threadId: thread.id,
            status: { not: PostStatus.POSTED },
          },
          data: {
            status: PostStatus.FAILED,
            error: error instanceof Error ? error.message : "Failed to publish",
          },
        });

        await prisma.thread.update({
          where: { id: thread.id },
          data: { status: PostStatus.FAILED },
        });

        return NextResponse.json(
          {
            error: "Thread publishing failed",
            publishedCount: publishedPosts.length,
            totalCount: thread.posts.length,
          },
          { status: 500 }
        );
      }
    }

    // Update thread status
    await prisma.thread.update({
      where: { id: thread.id },
      data: {
        status: PostStatus.POSTED,
        postedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      threadId: thread.id,
      publishedPosts,
      firstTweetUrl: `https://twitter.com/${account.xUsername}/status/${publishedPosts[0]?.xPostId}`,
    });
  } catch (error) {
    console.error("Publish thread error:", error);
    return NextResponse.json(
      { error: "Failed to publish thread" },
      { status: 500 }
    );
  }
}
