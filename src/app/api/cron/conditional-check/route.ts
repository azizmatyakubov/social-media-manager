import { NextResponse } from "next/server";
import { processPostsForConditionals } from "@/lib/conditional-posting";

// Verify cron secret to prevent unauthorized access
function verifyCronSecret(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.warn("CRON_SECRET not set - allowing in development");
    return true;
  }

  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  console.log("[Cron:ConditionalCheck] Starting conditional rules check...");

  try {
    const result = await processPostsForConditionals();

    const duration = Date.now() - startTime;
    console.log(
      `[Cron:ConditionalCheck] Job completed in ${duration}ms. Processed: ${result.processed}, Triggered: ${result.triggered}`
    );

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      processed: result.processed,
      triggered: result.triggered,
      results: result.results.map((r) => ({
        postId: r.postId,
        ruleId: r.ruleId,
        ruleName: r.ruleName,
        actionType: r.actionType,
        success: r.success,
        message: r.message,
      })),
    });
  } catch (error) {
    console.error("[Cron:ConditionalCheck] Job failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Conditional check job failed",
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
