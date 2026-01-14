import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { predictViralScoreEnhanced, comparePostVariations } from "@/lib/viral-predictor";
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

    const body = await request.json();
    const { content, variations } = body;

    // If variations provided, compare them
    if (variations && Array.isArray(variations) && variations.length > 1) {
      const comparison = await comparePostVariations(variations);
      return NextResponse.json({ type: "comparison", ...comparison });
    }

    // Single post prediction
    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    if (content.length > 4000) {
      return NextResponse.json(
        { error: "Content exceeds maximum length" },
        { status: 400 }
      );
    }

    const prediction = await predictViralScoreEnhanced(content, session.user.id);

    return NextResponse.json({
      type: "prediction",
      ...prediction,
    });
  } catch (error) {
    console.error("Enhanced predict viral score error:", error);
    return NextResponse.json(
      { error: "Failed to predict viral score" },
      { status: 500 }
    );
  }
}
