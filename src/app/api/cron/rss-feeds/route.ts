import { NextResponse } from "next/server";
import { processRssFeeds } from "@/lib/rss-feeds";

// Verify cron secret to prevent unauthorized access
function verifyCronSecret(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.warn("[Cron:RSS] CRON_SECRET not set - allowing in development");
    return true;
  }

  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  console.log("[Cron:RSS] Starting RSS feed processing job...");

  try {
    const results = await processRssFeeds();

    const duration = Date.now() - startTime;
    console.log(`[Cron:RSS] Job completed in ${duration}ms`);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      ...results,
    });
  } catch (error) {
    console.error("[Cron:RSS] Job failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "RSS feed processing job failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggers
export async function POST(request: Request) {
  return GET(request);
}
