import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createConditionalRule,
  getConditionalRules,
  getConditionalRule,
  updateConditionalRule,
  deleteConditionalRule,
  getConditionalStats,
  getRuleHistory,
} from "@/lib/conditional-posting";
import { ConditionalAction } from "@prisma/client";

// GET: Get all conditional rules for the current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ruleId = searchParams.get("ruleId");
    const action = searchParams.get("action");

    // Get stats for a specific rule
    if (ruleId && action === "stats") {
      // Verify the rule belongs to the user
      const rule = await getConditionalRule(ruleId);
      if (!rule || rule.userId !== session.user.id) {
        return NextResponse.json({ error: "Rule not found" }, { status: 404 });
      }

      const stats = await getConditionalStats(ruleId);
      return NextResponse.json(stats);
    }

    // Get history for a specific rule
    if (ruleId && action === "history") {
      const rule = await getConditionalRule(ruleId);
      if (!rule || rule.userId !== session.user.id) {
        return NextResponse.json({ error: "Rule not found" }, { status: 404 });
      }

      const limit = parseInt(searchParams.get("limit") || "20");
      const history = await getRuleHistory(ruleId, limit);
      return NextResponse.json(history);
    }

    // Get a single rule
    if (ruleId) {
      const rule = await getConditionalRule(ruleId);
      if (!rule || rule.userId !== session.user.id) {
        return NextResponse.json({ error: "Rule not found" }, { status: 404 });
      }
      return NextResponse.json(rule);
    }

    // Get all rules for the user
    const rules = await getConditionalRules(session.user.id);
    return NextResponse.json(rules);
  } catch (error) {
    console.error("Conditional rules fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch conditional rules" },
      { status: 500 }
    );
  }
}

// POST: Create a new conditional rule
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    const {
      name,
      triggerMetric,
      triggerOperator,
      triggerValue,
      triggerTimeframe,
      actionType,
      actionContent,
      actionDelay,
    } = body;

    if (!name || !triggerMetric || !triggerOperator || triggerValue === undefined || !triggerTimeframe || !actionType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate trigger metric
    const validMetrics = ["likes", "retweets", "replies", "impressions", "shares", "clicks"];
    if (!validMetrics.includes(triggerMetric)) {
      return NextResponse.json(
        { error: `Invalid trigger metric. Must be one of: ${validMetrics.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate operator
    const validOperators = ["gte", "lte", "eq", "gt", "lt", ">=", "<=", "==", ">", "<"];
    if (!validOperators.includes(triggerOperator)) {
      return NextResponse.json(
        { error: `Invalid operator. Must be one of: ${validOperators.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate action type
    const validActions = Object.values(ConditionalAction);
    if (!validActions.includes(actionType as ConditionalAction)) {
      return NextResponse.json(
        { error: `Invalid action type. Must be one of: ${validActions.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate that comment/DM actions have content
    if (
      (actionType === ConditionalAction.ADD_COMMENT || actionType === ConditionalAction.SEND_DM) &&
      !actionContent
    ) {
      return NextResponse.json(
        { error: "Action content is required for comment and DM actions" },
        { status: 400 }
      );
    }

    const rule = await createConditionalRule(session.user.id, {
      name,
      triggerMetric,
      triggerOperator,
      triggerValue: parseInt(triggerValue),
      triggerTimeframe: parseInt(triggerTimeframe),
      actionType: actionType as ConditionalAction,
      actionContent,
      actionDelay: actionDelay ? parseInt(actionDelay) : 0,
    });

    return NextResponse.json(rule, { status: 201 });
  } catch (error) {
    console.error("Conditional rule create error:", error);
    return NextResponse.json(
      { error: "Failed to create conditional rule" },
      { status: 500 }
    );
  }
}

// PATCH: Update a conditional rule
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { ruleId, ...updates } = body;

    if (!ruleId) {
      return NextResponse.json(
        { error: "Rule ID is required" },
        { status: 400 }
      );
    }

    // Verify the rule belongs to the user
    const existingRule = await getConditionalRule(ruleId);
    if (!existingRule || existingRule.userId !== session.user.id) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    // Validate updates if provided
    if (updates.triggerMetric) {
      const validMetrics = ["likes", "retweets", "replies", "impressions", "shares", "clicks"];
      if (!validMetrics.includes(updates.triggerMetric)) {
        return NextResponse.json(
          { error: `Invalid trigger metric` },
          { status: 400 }
        );
      }
    }

    if (updates.triggerOperator) {
      const validOperators = ["gte", "lte", "eq", "gt", "lt", ">=", "<=", "==", ">", "<"];
      if (!validOperators.includes(updates.triggerOperator)) {
        return NextResponse.json(
          { error: `Invalid operator` },
          { status: 400 }
        );
      }
    }

    if (updates.actionType) {
      const validActions = Object.values(ConditionalAction);
      if (!validActions.includes(updates.actionType as ConditionalAction)) {
        return NextResponse.json(
          { error: `Invalid action type` },
          { status: 400 }
        );
      }
    }

    // Parse numeric values
    const parsedUpdates = { ...updates };
    if (updates.triggerValue !== undefined) {
      parsedUpdates.triggerValue = parseInt(updates.triggerValue);
    }
    if (updates.triggerTimeframe !== undefined) {
      parsedUpdates.triggerTimeframe = parseInt(updates.triggerTimeframe);
    }
    if (updates.actionDelay !== undefined) {
      parsedUpdates.actionDelay = parseInt(updates.actionDelay);
    }

    const updatedRule = await updateConditionalRule(ruleId, parsedUpdates);
    return NextResponse.json(updatedRule);
  } catch (error) {
    console.error("Conditional rule update error:", error);
    return NextResponse.json(
      { error: "Failed to update conditional rule" },
      { status: 500 }
    );
  }
}

// DELETE: Delete a conditional rule
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ruleId = searchParams.get("ruleId");

    if (!ruleId) {
      return NextResponse.json(
        { error: "Rule ID is required" },
        { status: 400 }
      );
    }

    // Verify the rule belongs to the user
    const existingRule = await getConditionalRule(ruleId);
    if (!existingRule || existingRule.userId !== session.user.id) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    await deleteConditionalRule(ruleId);
    return NextResponse.json({ success: true, message: "Rule deleted" });
  } catch (error) {
    console.error("Conditional rule delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete conditional rule" },
      { status: 500 }
    );
  }
}
