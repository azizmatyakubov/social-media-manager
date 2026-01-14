import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  analyzeOptimalPostingTimes,
  shouldPostNow,
} from "@/lib/best-time-ai";
import { hasFeatureAccess } from "@/lib/subscription";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check feature access
    const hasAccess = await hasFeatureAccess(session.user.id, "Best Time AI");
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Best Time AI requires Creator plan or higher" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "analysis";

    if (type === "should-post-now") {
      const result = await shouldPostNow(session.user.id);
      return NextResponse.json(result);
    }

    // Full analysis
    const analysis = await analyzeOptimalPostingTimes(session.user.id);
    return NextResponse.json(analysis);
  } catch (error) {
    console.error("Best time analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze optimal posting times" },
      { status: 500 }
    );
  }
}
