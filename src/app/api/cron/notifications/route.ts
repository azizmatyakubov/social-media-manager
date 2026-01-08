import { NextRequest, NextResponse } from "next/server";
import { processPendingEmails, sendWeeklyDigests } from "@/lib/email";

// This endpoint should be called by a cron job service (e.g., Vercel Cron, GitHub Actions)
// Protect with a secret key in production

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get("authorization");

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "process";

    let result: { action: string; processed?: number; sent?: number };

    switch (action) {
      case "process":
        // Process pending email notifications
        const processed = await processPendingEmails();
        result = { action: "process", processed };
        break;

      case "digest":
        // Send weekly digests
        const sent = await sendWeeklyDigests();
        result = { action: "digest", sent };
        break;

      default:
        return NextResponse.json(
          { error: "Invalid action. Use: process, digest" },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cron notifications error:", error);
    return NextResponse.json(
      { error: "Cron job failed" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Allow POST as well for webhook-based cron services
  return GET(request);
}
