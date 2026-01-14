import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  analyzeContent,
  generateCrisisResponse,
  assessCrisisImpact,
  detectCrisisSeverity,
  createCrisisAlert,
  getUserCrisisAlerts,
  getCrisisAlert,
  updateCrisisAlert,
  addCrisisNote,
  addCrisisResponse,
  deleteCrisisAlert,
  createResponseTemplate,
  getUserResponseTemplates,
  deleteResponseTemplate,
  createAlertRule,
  getUserAlertRules,
  updateAlertRule,
  deleteAlertRule,
  getCrisisMetrics,
  ALERT_TYPE_LABELS,
  SEVERITY_COLORS,
  STATUS_LABELS,
  DEFAULT_TEMPLATES,
  type AlertType,
  type CrisisSeverity,
  type CrisisStatus,
} from "@/lib/crisis-management";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    switch (action) {
      case "alerts": {
        const status = searchParams.get("status") as CrisisStatus | null;
        const severity = searchParams.get("severity") as CrisisSeverity | null;

        let alerts = getUserCrisisAlerts(session.user.id);

        if (status) {
          alerts = alerts.filter((a) => a.status === status);
        }
        if (severity) {
          alerts = alerts.filter((a) => a.severity === severity);
        }

        return NextResponse.json({ alerts });
      }

      case "alert": {
        const alertId = searchParams.get("alertId");
        if (!alertId) {
          return NextResponse.json({ error: "Alert ID required" }, { status: 400 });
        }

        const alert = getCrisisAlert(alertId, session.user.id);
        if (!alert) {
          return NextResponse.json({ error: "Alert not found" }, { status: 404 });
        }

        return NextResponse.json({ alert });
      }

      case "templates": {
        const templates = getUserResponseTemplates(session.user.id);
        return NextResponse.json({ templates });
      }

      case "rules": {
        const rules = getUserAlertRules(session.user.id);
        return NextResponse.json({ rules });
      }

      case "metrics": {
        const metrics = getCrisisMetrics(session.user.id);
        return NextResponse.json({ metrics });
      }

      case "active-count": {
        const alerts = getUserCrisisAlerts(session.user.id);
        const activeCount = alerts.filter((a) => a.status !== "resolved").length;
        const criticalCount = alerts.filter(
          (a) => a.status !== "resolved" && a.severity === "critical"
        ).length;
        return NextResponse.json({ activeCount, criticalCount });
      }

      case "labels": {
        return NextResponse.json({
          alertTypes: ALERT_TYPE_LABELS,
          severityColors: SEVERITY_COLORS,
          statusLabels: STATUS_LABELS,
        });
      }

      case "default-templates": {
        return NextResponse.json({ templates: DEFAULT_TEMPLATES });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Crisis GET error:", error);
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
      case "analyze": {
        const { content } = data;

        if (!content) {
          return NextResponse.json({ error: "Content required" }, { status: 400 });
        }

        const analysis = await analyzeContent(content);
        return NextResponse.json({ analysis });
      }

      case "detect": {
        const { sentimentScore, mentionCount, negativeRatio } = data;

        const severity = detectCrisisSeverity(
          sentimentScore ?? 0,
          mentionCount ?? 0,
          negativeRatio ?? 0
        );

        return NextResponse.json({ severity });
      }

      case "generate-response": {
        const { crisis, tone } = data;

        if (!crisis) {
          return NextResponse.json({ error: "Crisis data required" }, { status: 400 });
        }

        const response = await generateCrisisResponse(crisis, tone);
        return NextResponse.json(response);
      }

      case "assess-impact": {
        const { crisis } = data;

        if (!crisis) {
          return NextResponse.json({ error: "Crisis data required" }, { status: 400 });
        }

        const impact = await assessCrisisImpact(crisis);
        return NextResponse.json({ impact });
      }

      case "create-alert": {
        const { type, severity, title, description, platform, sourceUrl, mentionCount, sentimentScore, keywords, affectedAudience } = data;

        if (!type || !severity || !title || !platform) {
          return NextResponse.json(
            { error: "Type, severity, title, and platform required" },
            { status: 400 }
          );
        }

        const alert = createCrisisAlert(session.user.id, {
          type,
          severity,
          status: "detected",
          title,
          description: description || "",
          platform,
          sourceUrl,
          mentionCount: mentionCount || 0,
          sentimentScore: sentimentScore ?? 0,
          keywords: keywords || [],
          affectedAudience: affectedAudience || 0,
        });

        return NextResponse.json({ alert });
      }

      case "update-alert": {
        const { alertId, ...updates } = data;

        if (!alertId) {
          return NextResponse.json({ error: "Alert ID required" }, { status: 400 });
        }

        if (updates.respondedAt) updates.respondedAt = new Date(updates.respondedAt);
        if (updates.resolvedAt) updates.resolvedAt = new Date(updates.resolvedAt);

        const alert = updateCrisisAlert(alertId, session.user.id, updates);
        if (!alert) {
          return NextResponse.json({ error: "Alert not found" }, { status: 404 });
        }

        return NextResponse.json({ alert });
      }

      case "add-note": {
        const { alertId, note } = data;

        if (!alertId || !note) {
          return NextResponse.json(
            { error: "Alert ID and note required" },
            { status: 400 }
          );
        }

        const alert = addCrisisNote(alertId, session.user.id, note);
        if (!alert) {
          return NextResponse.json({ error: "Alert not found" }, { status: 404 });
        }

        return NextResponse.json({ alert });
      }

      case "add-response": {
        const { alertId, content, platform, status } = data;

        if (!alertId || !content || !platform) {
          return NextResponse.json(
            { error: "Alert ID, content, and platform required" },
            { status: 400 }
          );
        }

        const alert = addCrisisResponse(alertId, session.user.id, {
          content,
          platform,
          status: status || "draft",
          createdBy: session.user.id,
        });

        if (!alert) {
          return NextResponse.json({ error: "Alert not found" }, { status: 404 });
        }

        return NextResponse.json({ alert });
      }

      case "resolve-alert": {
        const { alertId } = data;

        if (!alertId) {
          return NextResponse.json({ error: "Alert ID required" }, { status: 400 });
        }

        const alert = updateCrisisAlert(alertId, session.user.id, {
          status: "resolved",
          resolvedAt: new Date(),
        });

        if (!alert) {
          return NextResponse.json({ error: "Alert not found" }, { status: 404 });
        }

        return NextResponse.json({ alert });
      }

      case "escalate-alert": {
        const { alertId, assignedTo } = data;

        if (!alertId) {
          return NextResponse.json({ error: "Alert ID required" }, { status: 400 });
        }

        const alert = updateCrisisAlert(alertId, session.user.id, {
          status: "escalated",
          severity: "critical",
          assignedTo,
        });

        if (!alert) {
          return NextResponse.json({ error: "Alert not found" }, { status: 404 });
        }

        return NextResponse.json({ alert });
      }

      case "delete-alert": {
        const { alertId } = data;

        if (!alertId) {
          return NextResponse.json({ error: "Alert ID required" }, { status: 400 });
        }

        const deleted = deleteCrisisAlert(alertId, session.user.id);
        if (!deleted) {
          return NextResponse.json({ error: "Alert not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
      }

      case "create-template": {
        const { name, category, content, variables } = data;

        if (!name || !category || !content) {
          return NextResponse.json(
            { error: "Name, category, and content required" },
            { status: 400 }
          );
        }

        const template = createResponseTemplate(session.user.id, {
          name,
          category,
          content,
          variables: variables || [],
        });

        return NextResponse.json({ template });
      }

      case "delete-template": {
        const { templateId } = data;

        if (!templateId) {
          return NextResponse.json({ error: "Template ID required" }, { status: 400 });
        }

        const deleted = deleteResponseTemplate(templateId, session.user.id);
        if (!deleted) {
          return NextResponse.json({ error: "Template not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
      }

      case "create-rule": {
        const { name, enabled, conditions, actions, severity } = data;

        if (!name || !conditions || !actions) {
          return NextResponse.json(
            { error: "Name, conditions, and actions required" },
            { status: 400 }
          );
        }

        const rule = createAlertRule(session.user.id, {
          name,
          enabled: enabled ?? true,
          conditions,
          actions,
          severity: severity || "medium",
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
          return NextResponse.json({ error: "Rule not found" }, { status: 404 });
        }

        return NextResponse.json({ rule });
      }

      case "delete-rule": {
        const { ruleId } = data;

        if (!ruleId) {
          return NextResponse.json({ error: "Rule ID required" }, { status: 400 });
        }

        const deleted = deleteAlertRule(ruleId, session.user.id);
        if (!deleted) {
          return NextResponse.json({ error: "Rule not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
      }

      case "simulate-crisis": {
        // Create a simulated crisis for testing
        const { type, severity } = data;

        const simulatedAlert = createCrisisAlert(session.user.id, {
          type: type || "sentiment_spike",
          severity: severity || "medium",
          status: "detected",
          title: "Simulated Crisis Alert",
          description: "This is a simulated crisis for testing your response workflow.",
          platform: "twitter",
          mentionCount: Math.floor(Math.random() * 200) + 50,
          sentimentScore: -(Math.random() * 0.5 + 0.3),
          keywords: ["test", "simulation", "crisis"],
          affectedAudience: Math.floor(Math.random() * 10000) + 1000,
        });

        return NextResponse.json({ alert: simulatedAlert });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Crisis POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process request" },
      { status: 500 }
    );
  }
}
