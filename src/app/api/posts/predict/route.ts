import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { predictViralScore } from "@/lib/openai";
import { hasFeatureAccess } from "@/lib/subscription";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check feature access
    const hasAccess = await hasFeatureAccess(session.user.id, "Viral Score Prediction");
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Viral Score Prediction requires Creator plan or higher" },
        { status: 403 }
      );
    }

    const { content } = await request.json();

    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    if (content.length > 280) {
      return NextResponse.json(
        { error: "Content exceeds 280 characters" },
        { status: 400 }
      );
    }

    const prediction = await predictViralScore(content);

    return NextResponse.json({
      ...prediction,
      scoreLabel: getScoreLabel(prediction.score),
    });
  } catch (error) {
    console.error("Predict viral score error:", error);
    return NextResponse.json(
      { error: "Failed to predict viral score" },
      { status: 500 }
    );
  }
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "High Viral Potential";
  if (score >= 60) return "Good Engagement Expected";
  if (score >= 40) return "Average Performance";
  if (score >= 20) return "Below Average";
  return "Low Engagement Expected";
}
