import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getUserGoals,
  getGoal,
  createGoal,
  updateGoal,
  deleteGoal,
  addMilestone,
  getGoalTemplates,
  createGoalFromTemplate,
  getGoalStats,
  GOAL_CATEGORIES,
  GOAL_METRICS,
} from "@/lib/goals-tracker";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    switch (action) {
      case "goals": {
        const status = searchParams.get("status") as any;
        const goals = getUserGoals(session.user.id, status);
        return NextResponse.json({ goals });
      }

      case "goal": {
        const goalId = searchParams.get("goalId");
        if (!goalId) {
          return NextResponse.json({ error: "Goal ID required" }, { status: 400 });
        }
        const goal = getGoal(goalId);
        if (!goal) {
          return NextResponse.json({ error: "Goal not found" }, { status: 404 });
        }
        return NextResponse.json({ goal });
      }

      case "templates": {
        const templates = getGoalTemplates();
        return NextResponse.json({ templates });
      }

      case "stats": {
        const stats = getGoalStats(session.user.id);
        return NextResponse.json({ stats });
      }

      case "constants": {
        return NextResponse.json({
          categories: GOAL_CATEGORIES,
          metrics: GOAL_METRICS,
          priorities: ["low", "medium", "high"],
          platforms: ["all", "instagram", "twitter", "facebook", "linkedin", "tiktok", "youtube"],
        });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Goals GET error:", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
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
      case "create": {
        const {
          name,
          description,
          category,
          type,
          platform,
          metric,
          targetValue,
          startValue,
          startDate,
          endDate,
          priority,
          notifications,
        } = data;

        if (!name || !category || !metric || targetValue === undefined) {
          return NextResponse.json(
            { error: "Name, category, metric, and target value required" },
            { status: 400 }
          );
        }

        const goal = createGoal(session.user.id, {
          name,
          description: description || "",
          category,
          type: type || "reach_target",
          platform: platform || "all",
          metric,
          targetValue,
          startValue: startValue || 0,
          startDate: startDate ? new Date(startDate) : new Date(),
          endDate: endDate ? new Date(endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          milestones: [],
          status: "active",
          priority: priority || "medium",
          notifications: notifications || {
            onMilestone: true,
            onProgress: true,
            dailyReminder: false,
            weeklyReport: true,
          },
        });

        return NextResponse.json({ goal });
      }

      case "create-from-template": {
        const { templateId, name, targetValue, duration, platform } = data;
        if (!templateId) {
          return NextResponse.json({ error: "Template ID required" }, { status: 400 });
        }

        const goal = createGoalFromTemplate(session.user.id, templateId, {
          name,
          targetValue,
          duration,
          platform,
        });

        if (!goal) {
          return NextResponse.json({ error: "Template not found" }, { status: 404 });
        }

        return NextResponse.json({ goal });
      }

      case "update": {
        const { goalId, ...updates } = data;
        if (!goalId) {
          return NextResponse.json({ error: "Goal ID required" }, { status: 400 });
        }

        // Convert date strings to Date objects
        if (updates.startDate) updates.startDate = new Date(updates.startDate);
        if (updates.endDate) updates.endDate = new Date(updates.endDate);

        const goal = updateGoal(goalId, session.user.id, updates);
        if (!goal) {
          return NextResponse.json(
            { error: "Goal not found or unauthorized" },
            { status: 404 }
          );
        }

        return NextResponse.json({ goal });
      }

      case "update-progress": {
        const { goalId, currentValue, notes } = data;
        if (!goalId || currentValue === undefined) {
          return NextResponse.json(
            { error: "Goal ID and current value required" },
            { status: 400 }
          );
        }

        const goal = updateGoal(goalId, session.user.id, { currentValue });
        if (!goal) {
          return NextResponse.json(
            { error: "Goal not found or unauthorized" },
            { status: 404 }
          );
        }

        return NextResponse.json({ goal });
      }

      case "delete": {
        const { goalId } = data;
        if (!goalId) {
          return NextResponse.json({ error: "Goal ID required" }, { status: 400 });
        }

        const success = deleteGoal(goalId, session.user.id);
        if (!success) {
          return NextResponse.json(
            { error: "Goal not found or unauthorized" },
            { status: 404 }
          );
        }

        return NextResponse.json({ success: true });
      }

      case "add-milestone": {
        const { goalId, name, targetValue, reward } = data;
        if (!goalId || !name || targetValue === undefined) {
          return NextResponse.json(
            { error: "Goal ID, name, and target value required" },
            { status: 400 }
          );
        }

        const goal = addMilestone(goalId, session.user.id, { name, targetValue, reward });
        if (!goal) {
          return NextResponse.json(
            { error: "Goal not found or unauthorized" },
            { status: 404 }
          );
        }

        return NextResponse.json({ goal });
      }

      case "pause": {
        const { goalId } = data;
        if (!goalId) {
          return NextResponse.json({ error: "Goal ID required" }, { status: 400 });
        }

        const goal = updateGoal(goalId, session.user.id, { status: "paused" });
        if (!goal) {
          return NextResponse.json(
            { error: "Goal not found or unauthorized" },
            { status: 404 }
          );
        }

        return NextResponse.json({ goal });
      }

      case "resume": {
        const { goalId } = data;
        if (!goalId) {
          return NextResponse.json({ error: "Goal ID required" }, { status: 400 });
        }

        const goal = updateGoal(goalId, session.user.id, { status: "active" });
        if (!goal) {
          return NextResponse.json(
            { error: "Goal not found or unauthorized" },
            { status: 404 }
          );
        }

        return NextResponse.json({ goal });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Goals POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process request" },
      { status: 500 }
    );
  }
}
