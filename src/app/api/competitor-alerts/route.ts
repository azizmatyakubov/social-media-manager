import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getTrackedCompetitors,
  getCompetitor,
  addCompetitor,
  updateCompetitor,
  removeCompetitor,
  getCompetitorPosts,
  getAllRecentPosts,
  getAlertRules,
  getAlertRule,
  createAlertRule,
  updateAlertRule,
  deleteAlertRule,
  getAlerts,
  updateAlertStatus,
  markAllAlertsRead,
  getAlertStats,
  ALERT_RULE_TYPES,
  PLATFORMS,
} from "@/lib/competitor-alerts";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    switch (action) {
      case "competitors": {
        const competitors = getTrackedCompetitors(session.user.id);
        return NextResponse.json({ competitors });
      }

      case "competitor": {
        const competitorId = searchParams.get("competitorId");
        if (!competitorId) {
          return NextResponse.json({ error: "Competitor ID required" }, { status: 400 });
        }
        const competitor = getCompetitor(competitorId);
        if (!competitor) {
          return NextResponse.json({ error: "Competitor not found" }, { status: 404 });
        }
        return NextResponse.json({ competitor });
      }

      case "competitor-posts": {
        const competitorId = searchParams.get("competitorId");
        if (!competitorId) {
          return NextResponse.json({ error: "Competitor ID required" }, { status: 400 });
        }
        const limit = parseInt(searchParams.get("limit") || "20");
        const posts = getCompetitorPosts(competitorId, limit);
        return NextResponse.json({ posts });
      }

      case "recent-posts": {
        const limit = parseInt(searchParams.get("limit") || "50");
        const posts = getAllRecentPosts(session.user.id, limit);
        return NextResponse.json({ posts });
      }

      case "rules": {
        const rules = getAlertRules(session.user.id);
        return NextResponse.json({ rules });
      }

      case "rule": {
        const ruleId = searchParams.get("ruleId");
        if (!ruleId) {
          return NextResponse.json({ error: "Rule ID required" }, { status: 400 });
        }
        const rule = getAlertRule(ruleId);
        if (!rule) {
          return NextResponse.json({ error: "Rule not found" }, { status: 404 });
        }
        return NextResponse.json({ rule });
      }

      case "alerts": {
        const status = searchParams.get("status") as any;
        const priority = searchParams.get("priority") as any;
        const competitorId = searchParams.get("competitorId") || undefined;
        const limit = parseInt(searchParams.get("limit") || "100");
        const alerts = getAlerts(session.user.id, { status, priority, competitorId, limit });
        return NextResponse.json({ alerts });
      }

      case "stats": {
        const stats = getAlertStats(session.user.id);
        return NextResponse.json({ stats });
      }

      case "constants": {
        return NextResponse.json({
          ruleTypes: ALERT_RULE_TYPES,
          platforms: PLATFORMS,
          priorities: ["low", "medium", "high", "critical"],
          statuses: ["unread", "read", "dismissed", "actioned"],
        });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Competitor alerts GET error:", error);
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
      case "add-competitor": {
        const { name, handle, platform, avatarUrl, followers, verified, isActive, postFrequency, avgEngagement } = data;
        if (!name || !handle || !platform) {
          return NextResponse.json(
            { error: "Name, handle, and platform required" },
            { status: 400 }
          );
        }
        const competitor = addCompetitor(session.user.id, {
          name,
          handle,
          platform,
          avatarUrl: avatarUrl || "",
          followers: followers || 0,
          verified: verified || false,
          isActive: isActive !== false,
          postFrequency: postFrequency || 0,
          avgEngagement: avgEngagement || 0,
        });
        return NextResponse.json({ competitor });
      }

      case "update-competitor": {
        const { competitorId, ...updates } = data;
        if (!competitorId) {
          return NextResponse.json({ error: "Competitor ID required" }, { status: 400 });
        }
        const competitor = updateCompetitor(competitorId, session.user.id, updates);
        if (!competitor) {
          return NextResponse.json(
            { error: "Competitor not found or unauthorized" },
            { status: 404 }
          );
        }
        return NextResponse.json({ competitor });
      }

      case "remove-competitor": {
        const { competitorId } = data;
        if (!competitorId) {
          return NextResponse.json({ error: "Competitor ID required" }, { status: 400 });
        }
        const success = removeCompetitor(competitorId, session.user.id);
        if (!success) {
          return NextResponse.json(
            { error: "Competitor not found or unauthorized" },
            { status: 404 }
          );
        }
        return NextResponse.json({ success: true });
      }

      case "create-rule": {
        const { name, type, conditions, actions: ruleActions, competitorIds, platforms, isEnabled, priority } = data;
        if (!name || !type) {
          return NextResponse.json(
            { error: "Name and type required" },
            { status: 400 }
          );
        }
        const rule = createAlertRule(session.user.id, {
          name,
          type,
          conditions: conditions || [],
          actions: ruleActions || [{ type: "in_app", config: {} }],
          competitorIds: competitorIds || [],
          platforms: platforms || [],
          isEnabled: isEnabled !== false,
          priority: priority || "medium",
        });
        return NextResponse.json({ rule });
      }

      case "update-rule": {
        const { ruleId, ...updates } = data;
        if (!ruleId) {
          return NextResponse.json({ error: "Rule ID required" }, { status: 400 });
        }
        const rule = updateAlertRule(ruleId, session.user.id, updates);
        if (!rule) {
          return NextResponse.json(
            { error: "Rule not found or unauthorized" },
            { status: 404 }
          );
        }
        return NextResponse.json({ rule });
      }

      case "delete-rule": {
        const { ruleId } = data;
        if (!ruleId) {
          return NextResponse.json({ error: "Rule ID required" }, { status: 400 });
        }
        const success = deleteAlertRule(ruleId, session.user.id);
        if (!success) {
          return NextResponse.json(
            { error: "Rule not found or unauthorized" },
            { status: 404 }
          );
        }
        return NextResponse.json({ success: true });
      }

      case "update-alert-status": {
        const { alertId, status } = data;
        if (!alertId || !status) {
          return NextResponse.json(
            { error: "Alert ID and status required" },
            { status: 400 }
          );
        }
        const alert = updateAlertStatus(alertId, session.user.id, status);
        if (!alert) {
          return NextResponse.json(
            { error: "Alert not found or unauthorized" },
            { status: 404 }
          );
        }
        return NextResponse.json({ alert });
      }

      case "mark-all-read": {
        const count = markAllAlertsRead(session.user.id);
        return NextResponse.json({ count });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Competitor alerts POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process request" },
      { status: 500 }
    );
  }
}
