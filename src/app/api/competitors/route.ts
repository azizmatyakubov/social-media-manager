import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  addCompetitor,
  removeCompetitor,
  getCompetitors,
  getCompetitorAnalysis,
  compareWithCompetitors,
  getCompetitorInsights,
  getCompetitorTrends,
} from "@/lib/competitor-tracking";
import { Platform } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const competitorId = searchParams.get("competitorId");
    const platform = searchParams.get("platform") as Platform | null;

    if (action === "analysis" && competitorId) {
      const analysis = await getCompetitorAnalysis(competitorId);
      return NextResponse.json(analysis);
    }

    if (action === "compare") {
      const comparison = await compareWithCompetitors(session.user.id);
      return NextResponse.json(comparison);
    }

    if (action === "insights") {
      const insights = await getCompetitorInsights(session.user.id);
      return NextResponse.json(insights);
    }

    if (action === "trends" && competitorId) {
      const days = parseInt(searchParams.get("days") || "30");
      const trends = await getCompetitorTrends(competitorId, days);
      return NextResponse.json(trends);
    }

    const competitors = await getCompetitors(session.user.id, platform || undefined);
    return NextResponse.json(competitors);
  } catch (error) {
    console.error("Competitors fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch competitors" },
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
    const { username, platform, name } = body;

    if (!username) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }

    const competitor = await addCompetitor(session.user.id, {
      username,
      platform: platform || Platform.X,
      name,
    });

    return NextResponse.json(competitor);
  } catch (error) {
    console.error("Add competitor error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to add competitor" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const competitorId = searchParams.get("competitorId");

    if (!competitorId) {
      return NextResponse.json({ error: "Competitor ID is required" }, { status: 400 });
    }

    await removeCompetitor(competitorId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Remove competitor error:", error);
    return NextResponse.json(
      { error: "Failed to remove competitor" },
      { status: 500 }
    );
  }
}
