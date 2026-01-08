import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { postTweet, refreshAccessToken } from "@/lib/x-client";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { postId } = await request.json();

    if (!postId) {
      return NextResponse.json({ error: "Post ID required" }, { status: 400 });
    }

    const post = await prisma.post.findFirst({
      where: { id: postId, userId: session.user.id },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (post.status === "POSTED") {
      return NextResponse.json(
        { error: "Post already published" },
        { status: 400 }
      );
    }

    const xAccount = await prisma.xAccount.findFirst({
      where: { userId: session.user.id, isDefault: true },
    }).then(acc => acc || prisma.xAccount.findFirst({ where: { userId: session.user.id } }));

    if (!xAccount) {
      return NextResponse.json(
        { error: "X account not connected" },
        { status: 400 }
      );
    }

    let accessToken = xAccount.accessToken;

    // Check if token needs refresh
    if (xAccount.tokenExpiresAt && new Date() > xAccount.tokenExpiresAt) {
      if (!xAccount.refreshToken) {
        return NextResponse.json(
          { error: "Token expired. Please reconnect your X account." },
          { status: 400 }
        );
      }

      const tokens = await refreshAccessToken(xAccount.refreshToken);
      accessToken = tokens.access_token;

      await prisma.xAccount.update({
        where: { id: xAccount.id },
        data: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        },
      });
    }

    const tweet = await postTweet(accessToken, post.content);

    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: {
        status: "POSTED",
        platformPostId: tweet.id,
        postedAt: new Date(),
      },
    });

    return NextResponse.json(updatedPost);
  } catch (error) {
    console.error("Publish post error:", error);

    // Update post with error
    const { postId } = await request.json().catch(() => ({}));
    if (postId) {
      await prisma.post.update({
        where: { id: postId },
        data: {
          status: "FAILED",
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });
    }

    return NextResponse.json(
      { error: "Failed to publish post" },
      { status: 500 }
    );
  }
}
