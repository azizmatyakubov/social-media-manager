import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getStrategies,
  getStrategy,
  generateStrategy,
  saveStrategy,
  updateStrategy,
  deleteStrategy,
  generateContentCalendar,
  getSuggestedPlatforms,
  generateContentPillars,
  QuestionnaireAnswers,
} from "@/lib/ai-copilot";

// GET: Retrieve user's strategies
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const strategyId = searchParams.get("strategyId");

    // Get single strategy
    if (strategyId) {
      const strategy = await getStrategy(strategyId);
      if (!strategy) {
        return NextResponse.json(
          { error: "Strategy not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(strategy);
    }

    // Get all strategies
    const strategies = await getStrategies(session.user.id);
    return NextResponse.json(strategies);
  } catch (error) {
    console.error("AI Copilot GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch strategies" },
      { status: 500 }
    );
  }
}

// POST: Generate and save a new strategy
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, ...data } = body;

    // Generate content calendar from existing strategy
    if (action === "generate-calendar") {
      const { strategyId, weeks } = data;
      const strategy = await getStrategy(strategyId);

      if (!strategy) {
        return NextResponse.json(
          { error: "Strategy not found" },
          { status: 404 }
        );
      }

      const calendar = await generateContentCalendar(
        session.user.id,
        {
          contentPillars: strategy.contentPillars,
          recommendedPlatforms: strategy.recommendedPlatforms,
          postsPerWeek: strategy.postsPerWeek as Record<string, number> | null,
          bestTimes: strategy.bestTimes as Record<string, string[]> | null,
          toneOfVoice: strategy.toneOfVoice,
          brandName: strategy.brandName,
          brandDescription: strategy.brandDescription,
        },
        weeks || 4
      );

      return NextResponse.json({ calendar, count: calendar.length });
    }

    // Get suggested platforms
    if (action === "suggest-platforms") {
      const { brandDescription, targetAudience, goals } = data;
      const platforms = await getSuggestedPlatforms({
        brandDescription,
        targetAudience,
        goals,
      });
      return NextResponse.json({ platforms });
    }

    // Generate content pillars
    if (action === "generate-pillars") {
      const { brandName, brandDescription, targetAudience, goals } = data;
      const pillars = await generateContentPillars({
        brandName,
        brandDescription,
        targetAudience,
        goals,
      });
      return NextResponse.json({ pillars });
    }

    // Generate full strategy from questionnaire answers
    const answers: QuestionnaireAnswers = {
      brandName: data.brandName,
      brandWebsite: data.brandWebsite,
      brandTagline: data.brandTagline,
      brandDescription: data.brandDescription,
      targetAudience: data.targetAudience,
      competitors: data.competitors || [],
      goals: data.goals || [],
    };

    // Validate required fields
    if (!answers.brandName || !answers.brandDescription || !answers.targetAudience) {
      return NextResponse.json(
        { error: "Missing required fields: brandName, brandDescription, targetAudience" },
        { status: 400 }
      );
    }

    if (!answers.goals || answers.goals.length === 0) {
      return NextResponse.json(
        { error: "At least one goal is required" },
        { status: 400 }
      );
    }

    // Generate the strategy
    const strategy = await generateStrategy(answers);

    // Save to database
    const savedStrategy = await saveStrategy(
      session.user.id,
      answers,
      strategy,
      data.name
    );

    return NextResponse.json({
      strategy: savedStrategy,
      generated: strategy,
    });
  } catch (error) {
    console.error("AI Copilot POST error:", error);
    return NextResponse.json(
      { error: "Failed to generate strategy" },
      { status: 500 }
    );
  }
}

// PATCH: Update an existing strategy
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { strategyId, ...updates } = body;

    if (!strategyId) {
      return NextResponse.json(
        { error: "Strategy ID is required" },
        { status: 400 }
      );
    }

    // Verify ownership
    const existingStrategy = await getStrategy(strategyId);
    if (!existingStrategy || existingStrategy.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Strategy not found" },
        { status: 404 }
      );
    }

    const updatedStrategy = await updateStrategy(strategyId, updates);
    return NextResponse.json(updatedStrategy);
  } catch (error) {
    console.error("AI Copilot PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update strategy" },
      { status: 500 }
    );
  }
}

// DELETE: Delete a strategy
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const strategyId = searchParams.get("strategyId");

    if (!strategyId) {
      return NextResponse.json(
        { error: "Strategy ID is required" },
        { status: 400 }
      );
    }

    // Verify ownership
    const existingStrategy = await getStrategy(strategyId);
    if (!existingStrategy || existingStrategy.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Strategy not found" },
        { status: 404 }
      );
    }

    await deleteStrategy(strategyId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("AI Copilot DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete strategy" },
      { status: 500 }
    );
  }
}
