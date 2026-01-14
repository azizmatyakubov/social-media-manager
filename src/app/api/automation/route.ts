import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createAutomationRule,
  getUserAutomationRules,
  getAutomationRule,
  updateAutomationRule,
  toggleAutomationRule,
  deleteAutomationRule,
  recordExecution,
  getRuleExecutions,
  validateRule,
  getRuleTemplates,
  createRuleFromTemplate,
  getAutomationStats,
  TRIGGER_DEFINITIONS,
  ACTION_DEFINITIONS,
} from "@/lib/automation-rules";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    switch (action) {
      case "rules": {
        const rules = getUserAutomationRules(session.user.id);
        return NextResponse.json({ rules });
      }

      case "rule": {
        const ruleId = searchParams.get("ruleId");
        if (!ruleId) {
          return NextResponse.json({ error: "Rule ID required" }, { status: 400 });
        }

        const rule = getAutomationRule(ruleId, session.user.id);
        if (!rule) {
          return NextResponse.json({ error: "Rule not found" }, { status: 404 });
        }

        return NextResponse.json({ rule });
      }

      case "executions": {
        const ruleId = searchParams.get("ruleId");
        if (!ruleId) {
          return NextResponse.json({ error: "Rule ID required" }, { status: 400 });
        }

        const executions = getRuleExecutions(ruleId, session.user.id);
        return NextResponse.json({ executions });
      }

      case "templates": {
        const category = searchParams.get("category");
        const templates = getRuleTemplates(category || undefined);
        return NextResponse.json({ templates });
      }

      case "triggers": {
        return NextResponse.json({ triggers: TRIGGER_DEFINITIONS });
      }

      case "actions": {
        return NextResponse.json({ actions: ACTION_DEFINITIONS });
      }

      case "stats": {
        const stats = getAutomationStats(session.user.id);
        return NextResponse.json({ stats });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Automation GET error:", error);
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
      case "create": {
        const { name, description, trigger, actions, conditions } = data;

        // Validate
        const validation = validateRule({ name, trigger, actions });
        if (!validation.valid) {
          return NextResponse.json(
            { error: "Validation failed", errors: validation.errors },
            { status: 400 }
          );
        }

        const rule = createAutomationRule(session.user.id, {
          name,
          description,
          enabled: false, // Start disabled for safety
          trigger,
          actions,
          conditions,
        });

        return NextResponse.json({ rule });
      }

      case "update": {
        const { ruleId, ...updates } = data;

        if (!ruleId) {
          return NextResponse.json({ error: "Rule ID required" }, { status: 400 });
        }

        // Validate if trigger or actions are being updated
        if (updates.trigger || updates.actions) {
          const existingRule = getAutomationRule(ruleId, session.user.id);
          if (!existingRule) {
            return NextResponse.json({ error: "Rule not found" }, { status: 404 });
          }

          const validation = validateRule({
            name: updates.name || existingRule.name,
            trigger: updates.trigger || existingRule.trigger,
            actions: updates.actions || existingRule.actions,
          });

          if (!validation.valid) {
            return NextResponse.json(
              { error: "Validation failed", errors: validation.errors },
              { status: 400 }
            );
          }
        }

        const rule = updateAutomationRule(ruleId, session.user.id, updates);
        if (!rule) {
          return NextResponse.json({ error: "Rule not found" }, { status: 404 });
        }

        return NextResponse.json({ rule });
      }

      case "toggle": {
        const { ruleId } = data;

        if (!ruleId) {
          return NextResponse.json({ error: "Rule ID required" }, { status: 400 });
        }

        const rule = toggleAutomationRule(ruleId, session.user.id);
        if (!rule) {
          return NextResponse.json({ error: "Rule not found" }, { status: 404 });
        }

        return NextResponse.json({ rule });
      }

      case "delete": {
        const { ruleId } = data;

        if (!ruleId) {
          return NextResponse.json({ error: "Rule ID required" }, { status: 400 });
        }

        const deleted = deleteAutomationRule(ruleId, session.user.id);
        if (!deleted) {
          return NextResponse.json({ error: "Rule not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
      }

      case "create-from-template": {
        const { templateId, customizations } = data;

        if (!templateId) {
          return NextResponse.json({ error: "Template ID required" }, { status: 400 });
        }

        const rule = createRuleFromTemplate(session.user.id, templateId, customizations);
        if (!rule) {
          return NextResponse.json({ error: "Template not found" }, { status: 404 });
        }

        return NextResponse.json({ rule });
      }

      case "test-rule": {
        const { ruleId, mockData } = data;

        if (!ruleId) {
          return NextResponse.json({ error: "Rule ID required" }, { status: 400 });
        }

        const rule = getAutomationRule(ruleId, session.user.id);
        if (!rule) {
          return NextResponse.json({ error: "Rule not found" }, { status: 404 });
        }

        // Simulate execution
        const actionResults = rule.actions.map((action) => ({
          action: action.type,
          success: true,
          result: { simulated: true, message: `Would execute ${action.type}` },
        }));

        const execution = recordExecution(ruleId, session.user.id, mockData || {}, actionResults);

        return NextResponse.json({ execution, message: "Test execution completed" });
      }

      case "duplicate": {
        const { ruleId } = data;

        if (!ruleId) {
          return NextResponse.json({ error: "Rule ID required" }, { status: 400 });
        }

        const originalRule = getAutomationRule(ruleId, session.user.id);
        if (!originalRule) {
          return NextResponse.json({ error: "Rule not found" }, { status: 404 });
        }

        const newRule = createAutomationRule(session.user.id, {
          name: `${originalRule.name} (Copy)`,
          description: originalRule.description,
          enabled: false,
          trigger: originalRule.trigger,
          actions: originalRule.actions,
          conditions: originalRule.conditions,
        });

        return NextResponse.json({ rule: newRule });
      }

      case "bulk-toggle": {
        const { ruleIds, enabled } = data;

        if (!ruleIds || !Array.isArray(ruleIds)) {
          return NextResponse.json({ error: "Rule IDs array required" }, { status: 400 });
        }

        const results = [];
        for (const ruleId of ruleIds) {
          const rule = getAutomationRule(ruleId, session.user.id);
          if (rule && rule.enabled !== enabled) {
            toggleAutomationRule(ruleId, session.user.id);
            results.push({ ruleId, toggled: true });
          } else {
            results.push({ ruleId, toggled: false });
          }
        }

        return NextResponse.json({ results });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Automation POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process request" },
      { status: 500 }
    );
  }
}
