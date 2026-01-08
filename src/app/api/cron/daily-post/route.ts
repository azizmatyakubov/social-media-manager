import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generatePost } from "@/lib/openai";
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

// Get current hour in a specific timezone
function getCurrentHourInTimezone(timezone: string): number {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    });
    return parseInt(formatter.format(now), 10);
  } catch {
    // Fallback to UTC if timezone is invalid
    return new Date().getUTCHours();
  }
}

// Get today's date string in a timezone (for tracking daily posts)
function getTodayInTimezone(timezone: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(now); // Returns YYYY-MM-DD
  } catch {
    return new Date().toISOString().split("T")[0];
  }
}

// Check if user already posted today
async function hasPostedToday(userId: string, timezone: string): Promise<boolean> {
  const today = getTodayInTimezone(timezone);
  const startOfDay = new Date(today + "T00:00:00Z");
  const endOfDay = new Date(today + "T23:59:59Z");

  const todayPost = await prisma.post.findFirst({
    where: {
      userId,
      status: "POSTED",
      postedAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  return !!todayPost;
}

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  console.log("[Cron] Starting daily post job...");

  try {
    // Get all active posting configs with connected X accounts
    const activeConfigs = await prisma.postingConfig.findMany({
      where: { isActive: true },
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
    });

    console.log(`[Cron] Found ${activeConfigs.length} active configs`);

    const results = [];

    for (const config of activeConfigs) {
      const xAccount = config.user.xAccounts[0];
      const userTimezone = config.timezone || "UTC";
      const postingHour = parseInt(config.postingTime.split(":")[0], 10);
      const currentHour = getCurrentHourInTimezone(userTimezone);

      // Skip if it's not the user's posting hour
      if (currentHour !== postingHour) {
        continue;
      }

      // Skip if no X account connected
      if (!xAccount) {
        results.push({
          userId: config.userId,
          status: "skipped",
          reason: "No X account connected",
        });
        continue;
      }

      // Skip if already posted today
      const alreadyPosted = await hasPostedToday(config.userId, userTimezone);
      if (alreadyPosted) {
        results.push({
          userId: config.userId,
          status: "skipped",
          reason: "Already posted today",
        });
        continue;
      }

      try {
        console.log(`[Cron] Generating post for user ${config.userId}...`);

        // Generate post content
        const content = await generatePost({
          instructions: config.instructions,
          tone: config.tone,
          topics: config.topics,
        });

        // Get valid access token
        let accessToken = xAccount.accessToken;

        if (xAccount.tokenExpiresAt && new Date() > xAccount.tokenExpiresAt) {
          if (!xAccount.refreshToken) {
            results.push({
              userId: config.userId,
              status: "failed",
              reason: "Token expired and no refresh token",
            });
            continue;
          }

          console.log(`[Cron] Refreshing token for user ${config.userId}...`);
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
        console.log(`[Cron] Posting to X for user ${config.userId}...`);
        const tweet = await postTweet(accessToken, content);

        // Save post record
        await prisma.post.create({
          data: {
            userId: config.userId,
            content,
            status: "POSTED",
            platformPostId: tweet.id,
            postedAt: new Date(),
          },
        });

        results.push({
          userId: config.userId,
          status: "success",
          platformPostId: tweet.id,
        });

        console.log(`[Cron] Successfully posted for user ${config.userId}: ${tweet.id}`);
      } catch (error) {
        console.error(`[Cron] Failed to post for user ${config.userId}:`, error);

        // Save failed post record
        await prisma.post.create({
          data: {
            userId: config.userId,
            content: "Failed to generate or post",
            status: "FAILED",
            error: error instanceof Error ? error.message : "Unknown error",
          },
        });

        results.push({
          userId: config.userId,
          status: "failed",
          reason: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[Cron] Job completed in ${duration}ms. Processed: ${results.length}`);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      totalActive: activeConfigs.length,
      processed: results.length,
      results,
    });
  } catch (error) {
    console.error("[Cron] Job failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Cron job failed",
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
