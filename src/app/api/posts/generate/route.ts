import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generatePost, predictViralScore } from "@/lib/openai";
import { canPerformAction, incrementUsage, hasFeatureAccess } from "@/lib/subscription";
import { aiApiMiddleware } from "@/lib/api-middleware";

export async function POST(request: NextRequest) {
  // Apply rate limiting for AI endpoints
  const middleware = await aiApiMiddleware(request);
  if (!middleware.success) {
    return middleware.response;
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check AI generation limit
    const usageCheck = await canPerformAction(session.user.id, "AI_GENERATIONS");

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

    const config = await prisma.postingConfig.findUnique({
      where: { userId: session.user.id },
    });

    if (!config) {
      return NextResponse.json(
        { error: "Please configure your posting settings first" },
        { status: 400 }
      );
    }

    // Check if user has voice learning access and fetch profile
    const hasVoiceLearning = await hasFeatureAccess(session.user.id, "AI Voice Learning");
    let voiceProfile = null;

    if (hasVoiceLearning) {
      voiceProfile = await prisma.voiceProfile.findUnique({
        where: { userId: session.user.id },
      });
    }

    const content = await generatePost({
      instructions: config.instructions,
      tone: config.tone,
      topics: config.topics,
      voiceProfile,
    });

    // Increment usage after successful generation
    await incrementUsage(session.user.id, "AI_GENERATIONS");

    // Check if user has viral prediction access
    const hasViralPrediction = await hasFeatureAccess(session.user.id, "Viral Score Prediction");
    let viralScore = null;

    if (hasViralPrediction) {
      try {
        const prediction = await predictViralScore(content);
        viralScore = prediction.score;
      } catch (error) {
        console.error("Viral prediction error:", error);
        // Continue without viral score
      }
    }

    const post = await prisma.post.create({
      data: {
        userId: session.user.id,
        content,
        status: "PENDING",
        viralScore,
      },
    });

    return NextResponse.json({
      ...post,
      usage: {
        current: usageCheck.current + 1,
        limit: usageCheck.limit,
      },
      voiceProfileUsed: !!voiceProfile,
    });
  } catch (error) {
    console.error("Generate post error:", error);
    return NextResponse.json(
      { error: "Failed to generate post" },
      { status: 500 }
    );
  }
}
