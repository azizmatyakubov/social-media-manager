import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { postTweet, refreshAccessToken } from "@/lib/x-client";

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
  console.log("[Cron:Scheduled] Starting scheduled posts job...");

  try {
    // Find all scheduled posts that are due (scheduledFor <= now)
    const now = new Date();
    const scheduledPosts = await prisma.post.findMany({
      where: {
        status: "SCHEDULED",
        scheduledFor: {
          lte: now,
        },
      },
      include: {
        user: {
          include: {
            xAccounts: {
              orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
              take: 1,
            },
          },
        },
      },
      orderBy: {
        scheduledFor: "asc",
      },
      take: 50, // Process max 50 posts per run
    });

    console.log(`[Cron:Scheduled] Found ${scheduledPosts.length} posts to publish`);

    const results = [];

    for (const post of scheduledPosts) {
      const xAccount = post.user.xAccounts[0];

      if (!xAccount) {
        // Mark as failed - no X account
        await prisma.post.update({
          where: { id: post.id },
          data: {
            status: "FAILED",
            error: "No X account connected",
          },
        });

        results.push({
          postId: post.id,
          status: "failed",
          reason: "No X account connected",
        });
        continue;
      }

      try {
        // Get valid access token
        let accessToken = xAccount.accessToken;

        if (xAccount.tokenExpiresAt && new Date() > xAccount.tokenExpiresAt) {
          if (!xAccount.refreshToken) {
            await prisma.post.update({
              where: { id: post.id },
              data: {
                status: "FAILED",
                error: "Token expired and no refresh token",
              },
            });

            results.push({
              postId: post.id,
              status: "failed",
              reason: "Token expired and no refresh token",
            });
            continue;
          }

          console.log(`[Cron:Scheduled] Refreshing token for user ${post.userId}...`);
          const tokens = await refreshAccessToken(xAccount.refreshToken);
          accessToken = tokens.access_token;

          await prisma.xAccount.update({
            where: { id: xAccount.id },
            data: {
              accessToken: tokens.access_token,
              refreshToken: tokens.refresh_token,
              tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
            },
          });
        }

        // Post to X
        console.log(`[Cron:Scheduled] Posting scheduled post ${post.id}...`);
        const tweet = await postTweet(accessToken, post.content);

        // Update post record
        await prisma.post.update({
          where: { id: post.id },
          data: {
            status: "POSTED",
            xPostId: tweet.id,
            postedAt: new Date(),
          },
        });

        results.push({
          postId: post.id,
          status: "success",
          xPostId: tweet.id,
        });

        console.log(`[Cron:Scheduled] Successfully posted ${post.id}: ${tweet.id}`);
      } catch (error) {
        console.error(`[Cron:Scheduled] Failed to post ${post.id}:`, error);

        await prisma.post.update({
          where: { id: post.id },
          data: {
            status: "FAILED",
            error: error instanceof Error ? error.message : "Unknown error",
          },
        });

        results.push({
          postId: post.id,
          status: "failed",
          reason: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[Cron:Scheduled] Job completed in ${duration}ms. Processed: ${results.length}`);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      processed: results.length,
      results,
    });
  } catch (error) {
    console.error("[Cron:Scheduled] Job failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Scheduled posts job failed",
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
