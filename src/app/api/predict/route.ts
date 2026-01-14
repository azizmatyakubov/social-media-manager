import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  predictPerformance,
  analyzeContentElements,
  compareVariations,
  suggestImprovements,
  getOptimalPostingTimes,
  calculateViralityFactors,
  PLATFORM_BENCHMARKS,
  type PredictionInput,
} from "@/lib/performance-predictor";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    switch (action) {
      case "optimal-times": {
        const platform = searchParams.get("platform");
        if (!platform) {
          return NextResponse.json({ error: "Platform required" }, { status: 400 });
        }

        const times = getOptimalPostingTimes(platform);
        return NextResponse.json({ times });
      }

      case "benchmarks": {
        const platform = searchParams.get("platform");
        if (platform) {
          const benchmark = PLATFORM_BENCHMARKS[platform];
          return NextResponse.json({ benchmark });
        }
        return NextResponse.json({ benchmarks: PLATFORM_BENCHMARKS });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Predict GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch data" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case "predict": {
        const { content, platform, contentType, scheduledTime, hashtags, targetAudience, historicalData } = data;

        if (!content || !platform) {
          return NextResponse.json(
            { error: "Content and platform required" },
            { status: 400 }
          );
        }

        const input: PredictionInput = {
          content,
          platform,
          contentType: contentType || "text",
          scheduledTime: scheduledTime ? new Date(scheduledTime) : undefined,
          hashtags,
          targetAudience,
          historicalData,
        };

        const prediction = await predictPerformance(input);

        // Also calculate virality factors
        const viralityFactors = calculateViralityFactors(content);

        return NextResponse.json({ prediction, viralityFactors });
      }

      case "analyze-elements": {
        const { content, platform } = data;

        if (!content || !platform) {
          return NextResponse.json(
            { error: "Content and platform required" },
            { status: 400 }
          );
        }

        const elements = await analyzeContentElements(content, platform);
        return NextResponse.json({ elements });
      }

      case "compare": {
        const { variations, platform } = data;

        if (!variations || !Array.isArray(variations) || variations.length < 2 || !platform) {
          return NextResponse.json(
            { error: "At least 2 variations and platform required" },
            { status: 400 }
          );
        }

        const comparison = await compareVariations(variations, platform);
        return NextResponse.json({ comparison });
      }

      case "improve": {
        const { content, platform, targetScore } = data;

        if (!content || !platform) {
          return NextResponse.json(
            { error: "Content and platform required" },
            { status: 400 }
          );
        }

        const improvements = await suggestImprovements(content, platform, targetScore);
        return NextResponse.json({ improvements });
      }

      case "quick-score": {
        const { content } = data;

        if (!content) {
          return NextResponse.json({ error: "Content required" }, { status: 400 });
        }

        // Quick scoring without AI - just virality factors
        const factors = calculateViralityFactors(content);
        const score = factors.reduce((sum, f) => sum + (f.present ? f.weight : 0), 0);
        const maxScore = factors.reduce((sum, f) => sum + f.weight, 0);
        const normalizedScore = Math.round((score / maxScore) * 100);

        return NextResponse.json({
          score: normalizedScore,
          factors,
          feedback: normalizedScore >= 70
            ? "Strong content with good viral potential"
            : normalizedScore >= 50
            ? "Decent content, consider adding more engagement triggers"
            : "Content could use improvement in hook and engagement elements",
        });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Predict POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process request" },
      { status: 500 }
    );
  }
}
