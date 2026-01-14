import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getTrendingViralContent,
  getViralPatterns,
  analyzeViralPotential,
  getTrendingTopics,
  getUserViralAlerts,
  updateAlertStatus,
  getViralDetectorStats,
  CONTENT_TYPES,
  PATTERN_CATEGORIES,
} from "@/lib/viral-detector";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    switch (action) {
      case "trending": {
        const platform = searchParams.get("platform");
        const type = searchParams.get("type");
        const minViralScore = searchParams.get("minViralScore");
        const limit = searchParams.get("limit");

        const content = getTrendingViralContent({
          platform: platform || undefined,
          type: type || undefined,
          minViralScore: minViralScore ? parseInt(minViralScore) : undefined,
          limit: limit ? parseInt(limit) : 20,
        });

        return NextResponse.json({ content });
      }

      case "patterns": {
        const category = searchParams.get("category");
        const patterns = getViralPatterns(category || undefined);
        return NextResponse.json({ patterns });
      }

      case "topics": {
        const platform = searchParams.get("platform");
        const topics = getTrendingTopics(platform || undefined);
        return NextResponse.json({ topics });
      }

      case "alerts": {
        const alerts = getUserViralAlerts(session.user.id);
        return NextResponse.json({ alerts });
      }

      case "stats": {
        const stats = getViralDetectorStats(session.user.id);
        return NextResponse.json({ stats });
      }

      case "content-types": {
        return NextResponse.json({ contentTypes: CONTENT_TYPES });
      }

      case "pattern-categories": {
        return NextResponse.json({ patternCategories: PATTERN_CATEGORIES });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Viral detector GET error:", error);
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
        const { content, platform, type, includeMedia } = data;

        if (!content) {
          return NextResponse.json(
            { error: "Content is required" },
            { status: 400 }
          );
        }

        const analysis = await analyzeViralPotential(content, {
          platform,
          type,
          includeMedia,
        });

        return NextResponse.json({ analysis });
      }

      case "update-alert": {
        const { alertId, status } = data;

        if (!alertId || !status) {
          return NextResponse.json(
            { error: "Alert ID and status required" },
            { status: 400 }
          );
        }

        const alert = updateAlertStatus(alertId, session.user.id, status);
        if (!alert) {
          return NextResponse.json({ error: "Alert not found" }, { status: 404 });
        }

        return NextResponse.json({ alert });
      }

      case "dismiss-alert": {
        const { alertId } = data;

        if (!alertId) {
          return NextResponse.json({ error: "Alert ID required" }, { status: 400 });
        }

        const alert = updateAlertStatus(alertId, session.user.id, "dismissed");
        if (!alert) {
          return NextResponse.json({ error: "Alert not found" }, { status: 404 });
        }

        return NextResponse.json({ alert });
      }

      case "action-alert": {
        const { alertId } = data;

        if (!alertId) {
          return NextResponse.json({ error: "Alert ID required" }, { status: 400 });
        }

        const alert = updateAlertStatus(alertId, session.user.id, "actioned");
        if (!alert) {
          return NextResponse.json({ error: "Alert not found" }, { status: 404 });
        }

        return NextResponse.json({ alert });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Viral detector POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process request" },
      { status: 500 }
    );
  }
}
