import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  checkRetweetEligibility,
  executeAutoRetweet,
} from "@/lib/auto-engagement";

// Verify cron secret to prevent unauthorized access
function verifyCronSecret(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.warn("[Cron:AutoRetweet] CRON_SECRET not set - allowing in development");
    return true;
  }

  return authHeader === `Bearer ${cronSecret}`;
}

/**
 * GET - Cron job to check and execute auto-retweets
 * Should be called periodically (e.g., every hour or daily)
 */
export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  console.log("[Cron:AutoRetweet] Starting auto-retweet job...");

  try {
    // Find all posts with auto-retweet enabled
    const autoRetweetPosts = await prisma.post.findMany({
      where: {
        isEvergreen: true,
        autoRetweet: true,
        status: "POSTED",
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
      orderBy: [
        { lastRecycled: "asc" },
        { createdAt: "asc" },
      ],
    });

    console.log(`[Cron:AutoRetweet] Found ${autoRetweetPosts.length} posts with auto-retweet enabled`);

    const results: {
      postId: string;
      userId: string;
      status: "success" | "skipped" | "failed";
      reason?: string;
      newPostId?: string;
    }[] = [];

    // Configuration
    const MIN_DAYS_BETWEEN_RETWEETS = 30;
    const MIN_ENGAGEMENT_THRESHOLD = 10;
    const MAX_RETWEETS_PER_RUN = 10; // Limit to prevent spam

    let retweetCount = 0;

    for (const post of autoRetweetPosts) {
      if (retweetCount >= MAX_RETWEETS_PER_RUN) {
        console.log(`[Cron:AutoRetweet] Reached max retweets per run (${MAX_RETWEETS_PER_RUN})`);
        break;
      }

      // Check eligibility
      const eligibility = await checkRetweetEligibility(
        post.id,
        MIN_DAYS_BETWEEN_RETWEETS,
        MIN_ENGAGEMENT_THRESHOLD
      );

      if (!eligibility.eligible) {
        results.push({
          postId: post.id,
          userId: post.userId,
          status: "skipped",
          reason: eligibility.reason,
        });
        continue;
      }

      // Execute the auto-retweet
      console.log(`[Cron:AutoRetweet] Executing retweet for post ${post.id}...`);
      const result = await executeAutoRetweet(post.id, post.userId);

      if (result.success) {
        retweetCount++;
        results.push({
          postId: post.id,
          userId: post.userId,
          status: "success",
          newPostId: result.newPostId,
        });
        console.log(`[Cron:AutoRetweet] Successfully created retweet post ${result.newPostId}`);
      } else {
        results.push({
          postId: post.id,
          userId: post.userId,
          status: "failed",
          reason: result.error,
        });
        console.error(`[Cron:AutoRetweet] Failed to retweet post ${post.id}: ${result.error}`);
      }
    }

    const duration = Date.now() - startTime;
    const successCount = results.filter((r) => r.status === "success").length;
    const skippedCount = results.filter((r) => r.status === "skipped").length;
    const failedCount = results.filter((r) => r.status === "failed").length;

    console.log(
      `[Cron:AutoRetweet] Job completed in ${duration}ms. ` +
      `Success: ${successCount}, Skipped: ${skippedCount}, Failed: ${failedCount}`
    );

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      summary: {
        totalProcessed: results.length,
        success: successCount,
        skipped: skippedCount,
        failed: failedCount,
      },
      results,
    });
  } catch (error) {
    console.error("[Cron:AutoRetweet] Job failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Auto-retweet job failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Manual trigger for auto-retweet job
 */
export async function POST(request: Request) {
  return GET(request);
}
