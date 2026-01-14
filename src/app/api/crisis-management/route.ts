import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
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
        const status = searchParams.get("status") as any;
        const alerts = getUserCrisisAlerts(session.user.id);
        const filteredAlerts = status
          ? alerts.filter((a) => a.status === status)
          : alerts;
        return NextResponse.json({ alerts: filteredAlerts });
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

      case "constants": {
        return NextResponse.json({
          alertTypes: ALERT_TYPE_LABELS,
          severityColors: SEVERITY_COLORS,
          statusLabels: STATUS_LABELS,
          defaultTemplates: DEFAULT_TEMPLATES,
        });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Crisis management GET error:", error);
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
      case "detect-severity": {
        const { content, metrics, platform } = data;
        if (!content) {
          return NextResponse.json({ error: "Content required" }, { status: 400 });
        }
        const severity = detectCrisisSeverity(content, metrics, platform);
        return NextResponse.json({ severity });
      }

      case "create-alert": {
        const {
          type,
          severity,
          platform,
          title,
          description,
          sourceContent,
          sourceUrl,
          sourceAuthor,
          affectedAccounts,
        } = data;
        if (!type || !severity || !platform || !title) {
          return NextResponse.json(
            { error: "Type, severity, platform, and title required" },
            { status: 400 }
          );
        }
        const alert = createCrisisAlert(session.user.id, {
          type,
          severity,
          platform,
          title,
          description: description || "",
          sourceContent,
          sourceUrl,
          sourceAuthor,
          affectedAccounts: affectedAccounts || [],
        });
        return NextResponse.json({ alert });
      }

      case "update-alert": {
        const { alertId, ...updates } = data;
        if (!alertId) {
          return NextResponse.json({ error: "Alert ID required" }, { status: 400 });
        }
        const alert = updateCrisisAlert(alertId, session.user.id, updates);
        if (!alert) {
          return NextResponse.json(
            { error: "Alert not found or unauthorized" },
            { status: 404 }
          );
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
          return NextResponse.json(
            { error: "Alert not found or unauthorized" },
            { status: 404 }
          );
        }
        return NextResponse.json({ alert });
      }

      case "add-response": {
        const { alertId, type, content, sentBy, platform, success, engagementMetrics } = data;
        if (!alertId || !type || !content) {
          return NextResponse.json(
            { error: "Alert ID, type, and content required" },
            { status: 400 }
          );
        }
        const alert = addCrisisResponse(alertId, session.user.id, {
          type,
          content,
          sentBy: sentBy || session.user.name || "User",
          platform,
          success,
          engagementMetrics,
        });
        if (!alert) {
          return NextResponse.json(
            { error: "Alert not found or unauthorized" },
            { status: 404 }
          );
        }
        return NextResponse.json({ alert });
      }

      case "delete-alert": {
        const { alertId } = data;
        if (!alertId) {
          return NextResponse.json({ error: "Alert ID required" }, { status: 400 });
        }
        const success = deleteCrisisAlert(alertId, session.user.id);
        if (!success) {
          return NextResponse.json(
            { error: "Alert not found or unauthorized" },
            { status: 404 }
          );
        }
        return NextResponse.json({ success: true });
      }

      case "create-template": {
        const { name, content, category, tone, platforms, variables, isDefault } = data;
        if (!name || !content || !category) {
          return NextResponse.json(
            { error: "Name, content, and category required" },
            { status: 400 }
          );
        }
        const template = createResponseTemplate(session.user.id, {
          name,
          content,
          category,
          tone: tone || "professional",
          platforms: platforms || [],
          variables: variables || [],
          isDefault: isDefault || false,
        });
        return NextResponse.json({ template });
      }

      case "delete-template": {
        const { templateId } = data;
        if (!templateId) {
          return NextResponse.json({ error: "Template ID required" }, { status: 400 });
        }
        const success = deleteResponseTemplate(templateId, session.user.id);
        if (!success) {
          return NextResponse.json(
            { error: "Template not found or unauthorized" },
            { status: 404 }
          );
        }
        return NextResponse.json({ success: true });
      }

      case "create-rule": {
        const { name, type, conditions, severity, platforms, isEnabled, autoRespond, responseTemplateId } = data;
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
          severity: severity || "medium",
          platforms: platforms || [],
          isEnabled: isEnabled !== false,
          autoRespond: autoRespond || false,
          responseTemplateId,
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

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Crisis management POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process request" },
      { status: 500 }
    );
  }
}
