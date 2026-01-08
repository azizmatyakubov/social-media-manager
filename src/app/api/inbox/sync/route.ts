import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { syncPlatformMessages, getInboxStats } from "@/lib/social-inbox";
import { Platform } from "@prisma/client";

/**
 * POST /api/inbox/sync
 * Sync messages from connected platforms
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { platforms } = body;

    // Validate platforms
    const platformsToSync: Platform[] = [];

    if (platforms && Array.isArray(platforms)) {
      for (const platform of platforms) {
        if (Object.values(Platform).includes(platform as Platform)) {
          platformsToSync.push(platform as Platform);
        }
      }
    } else {
      // If no platforms specified, sync all
      platformsToSync.push(...Object.values(Platform));
    }

    if (platformsToSync.length === 0) {
      return NextResponse.json(
        { error: "No valid platforms specified" },
        { status: 400 }
      );
    }

    // Sync each platform
    const results: Record<
      string,
      { synced: number; errors: string[] }
    > = {};
    let totalSynced = 0;
    const allErrors: string[] = [];

    for (const platform of platformsToSync) {
      try {
        const result = await syncPlatformMessages(session.user.id, platform);
        results[platform] = result;
        totalSynced += result.synced;
        allErrors.push(...result.errors);
      } catch (error) {
        results[platform] = {
          synced: 0,
          errors: [error instanceof Error ? error.message : "Sync failed"],
        };
        allErrors.push(`${platform}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    // Get updated stats
    const stats = await getInboxStats(session.user.id);

    return NextResponse.json({
      success: allErrors.length === 0,
      totalSynced,
      results,
      errors: allErrors,
      stats,
    });
  } catch (error) {
    console.error("Inbox sync error:", error);
    return NextResponse.json(
      { error: "Failed to sync inbox" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/inbox/sync
 * Get sync status for all platforms
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // In production, this would return the last sync time for each platform
    // and whether a sync is currently in progress
    const syncStatus: Record<
      string,
      { lastSync: Date | null; inProgress: boolean }
    > = {};

    for (const platform of Object.values(Platform)) {
      syncStatus[platform] = {
        lastSync: null, // Would be fetched from a sync tracking table
        inProgress: false,
      };
    }

    return NextResponse.json(syncStatus);
  } catch (error) {
    console.error("Sync status error:", error);
    return NextResponse.json(
      { error: "Failed to get sync status" },
      { status: 500 }
    );
  }
}
