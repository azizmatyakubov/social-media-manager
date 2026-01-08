import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateThread } from "@/lib/openai";
import { canPerformAction, incrementUsage, hasFeatureAccess } from "@/lib/subscription";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check feature access
    const hasThreadAccess = await hasFeatureAccess(session.user.id, "Thread Architect");
    if (!hasThreadAccess) {
      return NextResponse.json(
        { error: "Thread Architect requires Pro plan or higher" },
        { status: 403 }
      );
    }

    // Check AI generation limit
    const usageCheck = await canPerformAction(session.user.id, "AI_GENERATIONS");
    if (!usageCheck.allowed) {
      return NextResponse.json(
        {
          error: usageCheck.message,
          limitReached: true,
        },
        { status: 403 }
      );
    }

    const { topic, postCount = 5 } = await request.json();

    if (!topic) {
      return NextResponse.json({ error: "Topic is required" }, { status: 400 });
    }

    if (postCount < 2 || postCount > 15) {
      return NextResponse.json(
        { error: "Post count must be between 2 and 15" },
        { status: 400 }
      );
    }

    // Get user's config for tone and topics
    const config = await prisma.postingConfig.findUnique({
      where: { userId: session.user.id },
    });

    // Get voice profile if available
    const voiceProfile = await prisma.voiceProfile.findUnique({
      where: { userId: session.user.id },
    });

    const posts = await generateThread({
      instructions: topic,
      tone: config?.tone || "professional",
      topics: config?.topics || [],
      postCount,
      voiceProfile,
    });

    // Increment usage
    await incrementUsage(session.user.id, "AI_GENERATIONS");

    return NextResponse.json({
      posts: posts.map((content, index) => ({
        content,
        index,
        charCount: content.length,
      })),
      totalPosts: posts.length,
      usage: {
        current: usageCheck.current + 1,
        limit: usageCheck.limit,
      },
    });
  } catch (error) {
    console.error("Generate thread error:", error);
    return NextResponse.json(
      { error: "Failed to generate thread" },
      { status: 500 }
    );
  }
}
