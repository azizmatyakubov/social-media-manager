import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PostStatus } from "@prisma/client";

// GET - List all threads
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const threads = await prisma.thread.findMany({
      where: { userId: session.user.id },
      include: {
        posts: {
          orderBy: { threadIndex: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(threads);
  } catch (error) {
    console.error("Get threads error:", error);
    return NextResponse.json(
      { error: "Failed to get threads" },
      { status: 500 }
    );
  }
}

// POST - Create a new thread
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, posts, scheduledFor } = await request.json();

    if (!posts || !Array.isArray(posts) || posts.length < 2) {
      return NextResponse.json(
        { error: "Thread must have at least 2 posts" },
        { status: 400 }
      );
    }

    // Validate each post
    for (let i = 0; i < posts.length; i++) {
      if (!posts[i].content || posts[i].content.length > 280) {
        return NextResponse.json(
          { error: `Post ${i + 1} is invalid or exceeds 280 characters` },
          { status: 400 }
        );
      }
    }

    const status = scheduledFor ? PostStatus.SCHEDULED : PostStatus.PENDING;

    // Create thread with posts
    const thread = await prisma.thread.create({
      data: {
        userId: session.user.id,
        title: title || `Thread - ${new Date().toLocaleDateString()}`,
        status,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        posts: {
          create: posts.map((post: { content: string }, index: number) => ({
            userId: session.user.id,
            content: post.content,
            status,
            scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
            threadIndex: index,
          })),
        },
      },
      include: {
        posts: {
          orderBy: { threadIndex: "asc" },
        },
      },
    });

    return NextResponse.json(thread);
  } catch (error) {
    console.error("Create thread error:", error);
    return NextResponse.json(
      { error: "Failed to create thread" },
      { status: 500 }
    );
  }
}
