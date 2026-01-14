import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getUserContentGaps,
  getContentGap,
  createContentGap,
  updateContentGap,
  deleteContentGap,
  getUserAnalyses,
  getAnalysis,
  createAnalysis,
  deleteAnalysis,
  getUserReports,
  getReport,
  generateGapReport,
  deleteReport,
  getGapAnalyzerStats,
  CONTENT_CATEGORIES,
  GAP_STATUSES,
  GAP_PRIORITIES,
  GAP_DIFFICULTIES,
  ANALYSIS_TYPES,
} from "@/lib/content-gap";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    switch (action) {
      case "gaps": {
        const status = searchParams.get("status");
        const priority = searchParams.get("priority");
        const category = searchParams.get("category");
        const gaps = getUserContentGaps(session.user.id, {
          status: status as any || undefined,
          priority: priority as any || undefined,
          category: category || undefined,
        });
        return NextResponse.json({ gaps });
      }

      case "gap": {
        const gapId = searchParams.get("gapId");
        if (!gapId) {
          return NextResponse.json({ error: "Gap ID required" }, { status: 400 });
        }
        const gap = getContentGap(gapId);
        if (!gap) {
          return NextResponse.json({ error: "Gap not found" }, { status: 404 });
        }
        return NextResponse.json({ gap });
      }

      case "analyses": {
        const analyses = getUserAnalyses(session.user.id);
        return NextResponse.json({ analyses });
      }

      case "analysis": {
        const analysisId = searchParams.get("analysisId");
        if (!analysisId) {
          return NextResponse.json({ error: "Analysis ID required" }, { status: 400 });
        }
        const analysis = getAnalysis(analysisId);
        if (!analysis) {
          return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
        }
        return NextResponse.json({ analysis });
      }

      case "reports": {
        const reports = getUserReports(session.user.id);
        return NextResponse.json({ reports });
      }

      case "report": {
        const reportId = searchParams.get("reportId");
        if (!reportId) {
          return NextResponse.json({ error: "Report ID required" }, { status: 400 });
        }
        const report = getReport(reportId);
        if (!report) {
          return NextResponse.json({ error: "Report not found" }, { status: 404 });
        }
        return NextResponse.json({ report });
      }

      case "stats": {
        const stats = getGapAnalyzerStats(session.user.id);
        return NextResponse.json({ stats });
      }

      case "constants": {
        return NextResponse.json({
          categories: CONTENT_CATEGORIES,
          statuses: GAP_STATUSES,
          priorities: GAP_PRIORITIES,
          difficulties: GAP_DIFFICULTIES,
          analysisTypes: ANALYSIS_TYPES,
        });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Content gap GET error:", error);
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
      case "create-gap": {
        const { topic, category, description, competitorsCovering, searchVolume, difficulty, opportunity, relevance, suggestedFormats, suggestedPlatforms, keywords, priority, notes } = data;
        if (!topic || !category) {
          return NextResponse.json({ error: "Topic and category required" }, { status: 400 });
        }
        const gap = createContentGap(session.user.id, {
          topic,
          category,
          description: description || "",
          competitorsCovering: competitorsCovering || [],
          searchVolume: searchVolume || 0,
          difficulty: difficulty || "medium",
          opportunity: opportunity || 50,
          relevance: relevance || 50,
          suggestedFormats: suggestedFormats || [],
          suggestedPlatforms: suggestedPlatforms || [],
          keywords: keywords || [],
          status: "identified",
          priority: priority || "medium",
          notes,
        });
        return NextResponse.json({ gap });
      }

      case "update-gap": {
        const { gapId, ...updates } = data;
        if (!gapId) {
          return NextResponse.json({ error: "Gap ID required" }, { status: 400 });
        }
        const gap = updateContentGap(gapId, session.user.id, updates);
        if (!gap) {
          return NextResponse.json({ error: "Gap not found or unauthorized" }, { status: 404 });
        }
        return NextResponse.json({ gap });
      }

      case "delete-gap": {
        const { gapId } = data;
        if (!gapId) {
          return NextResponse.json({ error: "Gap ID required" }, { status: 400 });
        }
        const success = deleteContentGap(gapId, session.user.id);
        if (!success) {
          return NextResponse.json({ error: "Gap not found or unauthorized" }, { status: 404 });
        }
        return NextResponse.json({ success: true });
      }

      case "create-analysis": {
        const { name, type, source, topics, formats, platforms, frequency, engagement } = data;
        if (!name || !type || !source) {
          return NextResponse.json({ error: "Name, type, and source required" }, { status: 400 });
        }
        const analysis = createAnalysis(session.user.id, {
          name,
          type,
          source,
          topics: topics || [],
          formats: formats || [],
          platforms: platforms || [],
          frequency: frequency || { postsPerWeek: 0, mostActiveDay: "", mostActiveTime: "", consistency: 0 },
          engagement: engagement || { avgLikes: 0, avgComments: 0, avgShares: 0, engagementRate: 0, topPerformingTopics: [] },
        });
        return NextResponse.json({ analysis });
      }

      case "delete-analysis": {
        const { analysisId } = data;
        if (!analysisId) {
          return NextResponse.json({ error: "Analysis ID required" }, { status: 400 });
        }
        const success = deleteAnalysis(analysisId, session.user.id);
        if (!success) {
          return NextResponse.json({ error: "Analysis not found or unauthorized" }, { status: 404 });
        }
        return NextResponse.json({ success: true });
      }

      case "generate-report": {
        const { name, analysisIds } = data;
        if (!name || !analysisIds || analysisIds.length === 0) {
          return NextResponse.json({ error: "Name and analysis IDs required" }, { status: 400 });
        }
        const report = await generateGapReport(session.user.id, name, analysisIds);
        return NextResponse.json({ report });
      }

      case "delete-report": {
        const { reportId } = data;
        if (!reportId) {
          return NextResponse.json({ error: "Report ID required" }, { status: 400 });
        }
        const success = deleteReport(reportId, session.user.id);
        if (!success) {
          return NextResponse.json({ error: "Report not found or unauthorized" }, { status: 404 });
        }
        return NextResponse.json({ success: true });
      }

      case "update-gap-status": {
        const { gapId, status } = data;
        if (!gapId || !status) {
          return NextResponse.json({ error: "Gap ID and status required" }, { status: 400 });
        }
        const gap = updateContentGap(gapId, session.user.id, { status });
        if (!gap) {
          return NextResponse.json({ error: "Gap not found or unauthorized" }, { status: 404 });
        }
        return NextResponse.json({ gap });
      }

      case "update-gap-priority": {
        const { gapId, priority } = data;
        if (!gapId || !priority) {
          return NextResponse.json({ error: "Gap ID and priority required" }, { status: 400 });
        }
        const gap = updateContentGap(gapId, session.user.id, { priority });
        if (!gap) {
          return NextResponse.json({ error: "Gap not found or unauthorized" }, { status: 404 });
        }
        return NextResponse.json({ gap });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Content gap POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process request" },
      { status: 500 }
    );
  }
}
