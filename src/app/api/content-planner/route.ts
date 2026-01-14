import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  generateContentIdeas,
  generateContentCalendar,
  getTrendingTopics,
  analyzeContentMix,
  generateWeeklyPlan,
  getUserPlans,
  getPlan,
  updatePlan,
  deletePlan,
  updateIdeaStatus,
  suggestOptimalTimes,
  CONTENT_TYPES,
  CONTENT_PILLARS,
  type ContentIdea,
  type ContentPillar,
} from "@/lib/content-planner";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    switch (action) {
      case "plans": {
        const plans = getUserPlans(session.user.id);
        return NextResponse.json({ plans });
      }

      case "plan": {
        const planId = searchParams.get("planId");
        if (!planId) {
          return NextResponse.json({ error: "Plan ID required" }, { status: 400 });
        }

        const plan = getPlan(planId, session.user.id);
        if (!plan) {
          return NextResponse.json({ error: "Plan not found" }, { status: 404 });
        }

        return NextResponse.json({ plan });
      }

      case "content-types": {
        return NextResponse.json({ contentTypes: CONTENT_TYPES });
      }

      case "content-pillars": {
        return NextResponse.json({ contentPillars: CONTENT_PILLARS });
      }

      case "optimal-times": {
        const platformsParam = searchParams.get("platforms");
        const targetAudience = searchParams.get("targetAudience") || "general";

        if (!platformsParam) {
          return NextResponse.json({ error: "Platforms required" }, { status: 400 });
        }

        const platforms = platformsParam.split(",");
        const times = await suggestOptimalTimes(platforms, targetAudience);
        return NextResponse.json({ times });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Content Planner GET error:", error);
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
      case "generate-ideas": {
        const { industry, targetAudience, platforms, contentPillars, count, timeframe } = data;

        if (!industry || !targetAudience || !platforms || !contentPillars) {
          return NextResponse.json(
            { error: "Industry, target audience, platforms, and content pillars required" },
            { status: 400 }
          );
        }

        const ideas = await generateContentIdeas(session.user.id, {
          industry,
          targetAudience,
          platforms,
          contentPillars: contentPillars as ContentPillar[],
          count,
          timeframe,
        });

        return NextResponse.json({ ideas });
      }

      case "generate-calendar": {
        const { ideas, startDate, endDate, postingFrequency } = data;

        if (!ideas || !startDate || !endDate || !postingFrequency) {
          return NextResponse.json(
            { error: "Ideas, start date, end date, and posting frequency required" },
            { status: 400 }
          );
        }

        const scheduledIdeas = await generateContentCalendar(session.user.id, {
          ideas: ideas as ContentIdea[],
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          postingFrequency,
        });

        return NextResponse.json({ ideas: scheduledIdeas });
      }

      case "trending-topics": {
        const { industry, platforms } = data;

        if (!industry || !platforms) {
          return NextResponse.json(
            { error: "Industry and platforms required" },
            { status: 400 }
          );
        }

        const topics = await getTrendingTopics(industry, platforms);
        return NextResponse.json({ topics });
      }

      case "analyze-mix": {
        const { ideas } = data;

        if (!ideas) {
          return NextResponse.json({ error: "Ideas required" }, { status: 400 });
        }

        const analysis = await analyzeContentMix(ideas as ContentIdea[]);
        return NextResponse.json({ analysis });
      }

      case "generate-weekly-plan": {
        const {
          industry,
          targetAudience,
          platforms,
          contentPillars,
          weekStartDate,
          postsPerDay,
          goals,
        } = data;

        if (!industry || !targetAudience || !platforms || !contentPillars || !weekStartDate) {
          return NextResponse.json(
            { error: "Industry, target audience, platforms, content pillars, and week start date required" },
            { status: 400 }
          );
        }

        const plan = await generateWeeklyPlan(session.user.id, {
          industry,
          targetAudience,
          platforms,
          contentPillars: contentPillars as ContentPillar[],
          weekStartDate: new Date(weekStartDate),
          postsPerDay: postsPerDay || 2,
          goals,
        });

        return NextResponse.json({ plan });
      }

      case "update-plan": {
        const { planId, name, description, goals, ideas } = data;

        if (!planId) {
          return NextResponse.json({ error: "Plan ID required" }, { status: 400 });
        }

        const plan = updatePlan(planId, session.user.id, {
          name,
          description,
          goals,
          ideas,
        });

        if (!plan) {
          return NextResponse.json({ error: "Plan not found" }, { status: 404 });
        }

        return NextResponse.json({ plan });
      }

      case "delete-plan": {
        const { planId } = data;

        if (!planId) {
          return NextResponse.json({ error: "Plan ID required" }, { status: 400 });
        }

        const deleted = deletePlan(planId, session.user.id);
        if (!deleted) {
          return NextResponse.json({ error: "Plan not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
      }

      case "update-idea-status": {
        const { planId, ideaId, status } = data;

        if (!planId || !ideaId || !status) {
          return NextResponse.json(
            { error: "Plan ID, idea ID, and status required" },
            { status: 400 }
          );
        }

        const plan = updateIdeaStatus(planId, session.user.id, ideaId, status);
        if (!plan) {
          return NextResponse.json({ error: "Plan or idea not found" }, { status: 404 });
        }

        return NextResponse.json({ plan });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Content Planner POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process request" },
      { status: 500 }
    );
  }
}
