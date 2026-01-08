import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MediaType } from "@prisma/client";
import { canPerformAction, incrementUsage } from "@/lib/subscription";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { content, scheduledFor, mediaUrls, mediaType } = await request.json();

    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    if (content.length > 280) {
      return NextResponse.json(
        { error: "Content exceeds 280 characters" },
        { status: 400 }
      );
    }

    // Check scheduled posts limit if scheduling
    if (scheduledFor) {
      const usageCheck = await canPerformAction(session.user.id, "SCHEDULED_POSTS");
      if (!usageCheck.allowed) {
        return NextResponse.json(
          {
            error: usageCheck.message,
            limitReached: true,
            current: usageCheck.current,
            limit: usageCheck.limit,
          },
          { status: 403 }
        );
      }
    }

    const status = scheduledFor ? "SCHEDULED" : "PENDING";

    // Validate mediaUrls if provided
    const validMediaUrls = Array.isArray(mediaUrls) ? mediaUrls.filter((url: string) => typeof url === "string" && url.startsWith("/uploads/")) : [];
    const validMediaType = mediaType && Object.values(MediaType).includes(mediaType) ? mediaType : null;

    const post = await prisma.post.create({
      data: {
        userId: session.user.id,
        content: content.trim(),
        status,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        mediaUrls: validMediaUrls,
        mediaType: validMediaType,
      },
    });

    // Increment usage if scheduled
    if (scheduledFor) {
      await incrementUsage(session.user.id, "SCHEDULED_POSTS");
    }

    return NextResponse.json(post);
  } catch (error) {
    console.error("Save post error:", error);
    return NextResponse.json(
      { error: "Failed to save post" },
      { status: 500 }
    );
  }
}
