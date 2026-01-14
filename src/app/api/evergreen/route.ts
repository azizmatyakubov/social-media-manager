import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createEvergreenSchedule,
  updateEvergreenSchedule,
  deleteEvergreenSchedule,
  getEvergreenSchedules,
  getEvergreenSchedule,
  markAsEvergreen,
  unmarkAsEvergreen,
  getEvergreenPosts,
  getTopPerformingPosts,
  getEligibleForRecycling,
  recyclePost,
  getEvergreenLogs,
  getEvergreenStats,
  bulkMarkEvergreen,
} from "@/lib/evergreen";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    switch (action) {
      case "schedules": {
        const schedules = await getEvergreenSchedules(session.user.id);
        return NextResponse.json({ schedules });
      }

      case "schedule": {
        const scheduleId = searchParams.get("scheduleId");
        if (!scheduleId) {
          return NextResponse.json({ error: "Schedule ID required" }, { status: 400 });
        }
        const schedule = await getEvergreenSchedule(scheduleId, session.user.id);
        return NextResponse.json({ schedule });
      }

      case "posts": {
        const platform = searchParams.get("platform") || undefined;
        const minEngagement = searchParams.get("minEngagement");
        const limit = searchParams.get("limit");
        const offset = searchParams.get("offset");

        const posts = await getEvergreenPosts(session.user.id, {
          platform: platform as "X" | "LINKEDIN" | "INSTAGRAM" | undefined,
          minEngagement: minEngagement ? parseInt(minEngagement) : undefined,
          limit: limit ? parseInt(limit) : undefined,
          offset: offset ? parseInt(offset) : undefined,
        });
        return NextResponse.json({ posts });
      }

      case "top-posts": {
        const platform = searchParams.get("platform") || undefined;
        const minEngagement = searchParams.get("minEngagement");
        const minImpressions = searchParams.get("minImpressions");
        const excludeEvergreen = searchParams.get("excludeEvergreen") === "true";
        const limit = searchParams.get("limit");
        const daysBack = searchParams.get("daysBack");

        const posts = await getTopPerformingPosts(session.user.id, {
          platform: platform as "X" | "LINKEDIN" | "INSTAGRAM" | undefined,
          minEngagement: minEngagement ? parseInt(minEngagement) : undefined,
          minImpressions: minImpressions ? parseInt(minImpressions) : undefined,
          excludeEvergreen,
          limit: limit ? parseInt(limit) : undefined,
          daysBack: daysBack ? parseInt(daysBack) : undefined,
        });
        return NextResponse.json({ posts });
      }

      case "eligible": {
        const scheduleId = searchParams.get("scheduleId");
        if (!scheduleId) {
          return NextResponse.json({ error: "Schedule ID required" }, { status: 400 });
        }
        const posts = await getEligibleForRecycling(session.user.id, scheduleId);
        return NextResponse.json({ posts });
      }

      case "logs": {
        const scheduleId = searchParams.get("scheduleId") || undefined;
        const limit = searchParams.get("limit");
        const offset = searchParams.get("offset");

        const logs = await getEvergreenLogs(session.user.id, {
          scheduleId,
          limit: limit ? parseInt(limit) : undefined,
          offset: offset ? parseInt(offset) : undefined,
        });
        return NextResponse.json({ logs });
      }

      case "stats": {
        const stats = await getEvergreenStats(session.user.id);
        return NextResponse.json({ stats });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Evergreen GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch evergreen data" },
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
      case "create-schedule": {
        const schedule = await createEvergreenSchedule(session.user.id, data);
        return NextResponse.json({ schedule });
      }

      case "update-schedule": {
        const { scheduleId, ...updateData } = data;
        if (!scheduleId) {
          return NextResponse.json({ error: "Schedule ID required" }, { status: 400 });
        }
        const schedule = await updateEvergreenSchedule(scheduleId, session.user.id, updateData);
        return NextResponse.json({ schedule });
      }

      case "delete-schedule": {
        const { scheduleId } = data;
        if (!scheduleId) {
          return NextResponse.json({ error: "Schedule ID required" }, { status: 400 });
        }
        await deleteEvergreenSchedule(scheduleId, session.user.id);
        return NextResponse.json({ success: true });
      }

      case "mark-evergreen": {
        const { postId } = data;
        if (!postId) {
          return NextResponse.json({ error: "Post ID required" }, { status: 400 });
        }
        const post = await markAsEvergreen(postId, session.user.id);
        return NextResponse.json({ post });
      }

      case "unmark-evergreen": {
        const { postId } = data;
        if (!postId) {
          return NextResponse.json({ error: "Post ID required" }, { status: 400 });
        }
        const post = await unmarkAsEvergreen(postId, session.user.id);
        return NextResponse.json({ post });
      }

      case "bulk-mark": {
        const { postIds, isEvergreen } = data;
        if (!postIds || !Array.isArray(postIds)) {
          return NextResponse.json({ error: "Post IDs array required" }, { status: 400 });
        }
        const result = await bulkMarkEvergreen(session.user.id, postIds, isEvergreen);
        return NextResponse.json({ updated: result.count });
      }

      case "recycle": {
        const { postId, scheduleId, scheduledFor, varyContent } = data;
        if (!postId) {
          return NextResponse.json({ error: "Post ID required" }, { status: 400 });
        }
        const post = await recyclePost(session.user.id, postId, scheduleId, {
          scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
          varyContent: varyContent ?? true,
        });
        return NextResponse.json({ post });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Evergreen POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process request" },
      { status: 500 }
    );
  }
}
