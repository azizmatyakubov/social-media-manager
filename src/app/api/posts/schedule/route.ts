import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Platform } from "@prisma/client";

// Character limits per platform
const PLATFORM_CHAR_LIMITS: Record<Platform, number> = {
  X: 280,
  LINKEDIN: 3000,
  INSTAGRAM: 2200,
  TIKTOK: 2200,
  YOUTUBE: 500,
  PINTEREST: 500,
  BLUESKY: 300,
};

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { content, scheduledFor, platform = "X" } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    // Validate platform
    const validPlatform = platform as Platform;
    if (!PLATFORM_CHAR_LIMITS[validPlatform]) {
      return NextResponse.json(
        { error: "Invalid platform" },
        { status: 400 }
      );
    }

    // Check character limit based on platform
    const charLimit = PLATFORM_CHAR_LIMITS[validPlatform];
    if (content.length > charLimit) {
      return NextResponse.json(
        { error: `Content exceeds ${charLimit} characters for ${platform}` },
        { status: 400 }
      );
    }

    if (!scheduledFor) {
      return NextResponse.json(
        { error: "Scheduled time is required" },
        { status: 400 }
      );
    }

    const scheduledDate = new Date(scheduledFor);

    if (isNaN(scheduledDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid scheduled time" },
        { status: 400 }
      );
    }

    if (scheduledDate <= new Date()) {
      return NextResponse.json(
        { error: "Scheduled time must be in the future" },
        { status: 400 }
      );
    }

    // Get appropriate account based on platform
    let accountId: Record<string, string> = {};

    if (validPlatform === "X") {
      const xAccount = await prisma.xAccount.findFirst({
        where: { userId: session.user.id },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      });
      if (!xAccount) {
        return NextResponse.json(
          { error: "Please connect your X account first" },
          { status: 400 }
        );
      }
      accountId = { xAccountId: xAccount.id };
    } else if (validPlatform === "LINKEDIN") {
      const linkedInAccount = await prisma.linkedInAccount.findFirst({
        where: { userId: session.user.id },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      });
      if (!linkedInAccount) {
        return NextResponse.json(
          { error: "Please connect your LinkedIn account first" },
          { status: 400 }
        );
      }
      accountId = { linkedInAccountId: linkedInAccount.id };
    } else if (validPlatform === "INSTAGRAM") {
      const instagramAccount = await prisma.instagramAccount.findFirst({
        where: { userId: session.user.id },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      });
      if (!instagramAccount) {
        return NextResponse.json(
          { error: "Please connect your Instagram account first" },
          { status: 400 }
        );
      }
      accountId = { instagramAccountId: instagramAccount.id };
    }

    const post = await prisma.post.create({
      data: {
        userId: session.user.id,
        content: content.trim(),
        platform: validPlatform,
        status: "SCHEDULED",
        scheduledFor: scheduledDate,
        ...accountId,
      },
    });

    return NextResponse.json(post);
  } catch (error) {
    console.error("Schedule post error:", error);
    return NextResponse.json(
      { error: "Failed to schedule post" },
      { status: 500 }
    );
  }
}
