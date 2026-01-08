import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasFeatureAccess } from "@/lib/subscription";
import {
  createAutoDmRule,
  getAutoDmRules,
  updateAutoDmRule,
  deleteAutoDmRule,
  getAutoDmStats,
  toggleAutoDmRule,
} from "@/lib/auto-engagement";
import { MatchType, TriggerType } from "@prisma/client";

/**
 * GET - Get all auto DM rules for the user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check feature access
    const hasAccess = await hasFeatureAccess(session.user.id, "Auto DM");
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Upgrade to access Auto DM feature" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const ruleId = searchParams.get("ruleId");

    // If ruleId provided, get stats for that specific rule
    if (ruleId) {
      const stats = await getAutoDmStats(ruleId);
      if (!stats) {
        return NextResponse.json({ error: "Rule not found" }, { status: 404 });
      }
      return NextResponse.json({ stats });
    }

    // Get all rules
    const rules = await getAutoDmRules(session.user.id);

    // Add stats to each rule
    const rulesWithStats = await Promise.all(
      rules.map(async (rule) => {
        const stats = await getAutoDmStats(rule.id);
        return {
          ...rule,
          stats,
        };
      })
    );

    // Calculate summary stats
    const summaryStats = {
      totalRules: rules.length,
      activeRules: rules.filter((r) => r.isActive).length,
      totalTriggered: rules.reduce((sum, r) => sum + r.triggeredCount, 0),
      lastTriggered: rules
        .filter((r) => r.lastTriggered)
        .sort((a, b) =>
          (b.lastTriggered?.getTime() || 0) - (a.lastTriggered?.getTime() || 0)
        )[0]?.lastTriggered || null,
    };

    return NextResponse.json({
      rules: rulesWithStats,
      summary: summaryStats,
    });
  } catch (error) {
    console.error("Get auto DM rules error:", error);
    return NextResponse.json(
      { error: "Failed to get auto DM rules" },
      { status: 500 }
    );
  }
}

/**
 * POST - Create a new auto DM rule
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAccess = await hasFeatureAccess(session.user.id, "Auto DM");
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Upgrade to access Auto DM feature" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.name.trim()) {
      return NextResponse.json(
        { error: "Rule name is required" },
        { status: 400 }
      );
    }

    if (!body.keywords || !Array.isArray(body.keywords) || body.keywords.length === 0) {
      return NextResponse.json(
        { error: "At least one keyword is required" },
        { status: 400 }
      );
    }

    if (!body.dmTemplate || !body.dmTemplate.trim()) {
      return NextResponse.json(
        { error: "DM template is required" },
        { status: 400 }
      );
    }

    // Validate enums
    const validTriggerTypes: TriggerType[] = [
      "KEYWORD_COMMENT",
      "KEYWORD_MENTION",
      "NEW_FOLLOWER",
      "POST_ENGAGEMENT",
    ];
    const validMatchTypes: MatchType[] = ["EXACT", "CONTAINS", "STARTS_WITH", "REGEX"];

    if (body.triggerType && !validTriggerTypes.includes(body.triggerType)) {
      return NextResponse.json(
        { error: "Invalid trigger type" },
        { status: 400 }
      );
    }

    if (body.matchType && !validMatchTypes.includes(body.matchType)) {
      return NextResponse.json(
        { error: "Invalid match type" },
        { status: 400 }
      );
    }

    const rule = await createAutoDmRule(session.user.id, {
      name: body.name.trim(),
      triggerType: body.triggerType || "KEYWORD_COMMENT",
      keywords: body.keywords.map((k: string) => k.trim()).filter(Boolean),
      matchType: body.matchType || "CONTAINS",
      dmTemplate: body.dmTemplate.trim(),
      includeDelay: body.includeDelay ?? true,
      delaySeconds: body.delaySeconds || 60,
      minFollowers: body.minFollowers || null,
      maxDailyDms: body.maxDailyDms || 50,
      excludeKeywords: body.excludeKeywords?.map((k: string) => k.trim()).filter(Boolean) || [],
      isActive: body.isActive ?? true,
    });

    return NextResponse.json({
      success: true,
      rule,
    });
  } catch (error) {
    console.error("Create auto DM rule error:", error);
    return NextResponse.json(
      { error: "Failed to create auto DM rule" },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Update an existing auto DM rule
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAccess = await hasFeatureAccess(session.user.id, "Auto DM");
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Upgrade to access Auto DM feature" },
        { status: 403 }
      );
    }

    const body = await request.json();

    if (!body.ruleId) {
      return NextResponse.json({ error: "Rule ID is required" }, { status: 400 });
    }

    // Handle toggle action separately
    if (body.action === "toggle") {
      const result = await toggleAutoDmRule(body.ruleId, session.user.id);
      if (!result.success) {
        return NextResponse.json({ error: "Rule not found" }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        isActive: result.isActive,
      });
    }

    // Build updates object
    const updates: Record<string, unknown> = {};

    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.triggerType !== undefined) updates.triggerType = body.triggerType;
    if (body.keywords !== undefined) {
      updates.keywords = body.keywords.map((k: string) => k.trim()).filter(Boolean);
    }
    if (body.matchType !== undefined) updates.matchType = body.matchType;
    if (body.dmTemplate !== undefined) updates.dmTemplate = body.dmTemplate.trim();
    if (body.includeDelay !== undefined) updates.includeDelay = body.includeDelay;
    if (body.delaySeconds !== undefined) updates.delaySeconds = body.delaySeconds;
    if (body.minFollowers !== undefined) updates.minFollowers = body.minFollowers;
    if (body.maxDailyDms !== undefined) updates.maxDailyDms = body.maxDailyDms;
    if (body.excludeKeywords !== undefined) {
      updates.excludeKeywords = body.excludeKeywords
        .map((k: string) => k.trim())
        .filter(Boolean);
    }
    if (body.isActive !== undefined) updates.isActive = body.isActive;

    const rule = await updateAutoDmRule(body.ruleId, session.user.id, updates);

    if (!rule) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      rule,
    });
  } catch (error) {
    console.error("Update auto DM rule error:", error);
    return NextResponse.json(
      { error: "Failed to update auto DM rule" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete an auto DM rule
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ruleId = searchParams.get("ruleId");

    if (!ruleId) {
      return NextResponse.json({ error: "Rule ID is required" }, { status: 400 });
    }

    const deleted = await deleteAutoDmRule(ruleId, session.user.id);

    if (!deleted) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Rule deleted successfully",
    });
  } catch (error) {
    console.error("Delete auto DM rule error:", error);
    return NextResponse.json(
      { error: "Failed to delete auto DM rule" },
      { status: 500 }
    );
  }
}
