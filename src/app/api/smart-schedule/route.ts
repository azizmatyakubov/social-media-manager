import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getOptimalTimes,
  generateAudiencePattern,
  optimizeSchedule,
  generateSmartSchedule,
  analyzeContentForTiming,
  batchOptimize,
  createScheduledPost,
  getUserScheduledPosts,
  getScheduledPost,
  updateScheduledPost,
  deleteScheduledPost,
  createSmartQueue,
  getUserSmartQueues,
  getSmartQueue,
  addPostToQueue,
  deleteSmartQueue,
  suggestHashtags,
  getUpcomingPosts,
  getScheduleCalendar,
  PLATFORM_POST_LIMITS,
  CONTENT_TYPE_LABELS,
  type Platform,
  type ContentType,
} from "@/lib/smart-scheduling";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    switch (action) {
      case "posts": {
        const posts = getUserScheduledPosts(session.user.id);
        return NextResponse.json({ posts });
      }

      case "post": {
        const postId = searchParams.get("postId");
        if (!postId) {
          return NextResponse.json({ error: "Post ID required" }, { status: 400 });
        }

        const post = getScheduledPost(postId, session.user.id);
        if (!post) {
          return NextResponse.json({ error: "Post not found" }, { status: 404 });
        }

        return NextResponse.json({ post });
      }

      case "queues": {
        const queues = getUserSmartQueues(session.user.id);
        return NextResponse.json({ queues });
      }

      case "queue": {
        const queueId = searchParams.get("queueId");
        if (!queueId) {
          return NextResponse.json({ error: "Queue ID required" }, { status: 400 });
        }

        const queue = getSmartQueue(queueId, session.user.id);
        if (!queue) {
          return NextResponse.json({ error: "Queue not found" }, { status: 404 });
        }

        return NextResponse.json({ queue });
      }

      case "optimal-times": {
        const platform = (searchParams.get("platform") || "twitter") as Platform;
        const dayOfWeek = parseInt(searchParams.get("dayOfWeek") || "1");

        const times = getOptimalTimes(platform, dayOfWeek);
        return NextResponse.json({ times });
      }

      case "audience-pattern": {
        const platform = (searchParams.get("platform") || "twitter") as Platform;
        const patterns = generateAudiencePattern(platform, session.user.id);
        return NextResponse.json({ patterns });
      }

      case "upcoming": {
        const hours = parseInt(searchParams.get("hours") || "24");
        const posts = getUpcomingPosts(session.user.id, hours);
        return NextResponse.json({ posts });
      }

      case "calendar": {
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");

        if (!startDate || !endDate) {
          return NextResponse.json({ error: "Start and end dates required" }, { status: 400 });
        }

        const calendar = getScheduleCalendar(
          session.user.id,
          new Date(startDate),
          new Date(endDate)
        );
        return NextResponse.json({ calendar });
      }

      case "platform-limits": {
        return NextResponse.json({ limits: PLATFORM_POST_LIMITS });
      }

      case "content-types": {
        return NextResponse.json({ types: CONTENT_TYPE_LABELS });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Smart schedule GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch data" },
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
      case "optimize": {
        const { content, platform, scheduledTime } = data;

        if (!platform || !scheduledTime) {
          return NextResponse.json(
            { error: "Platform and scheduled time required" },
            { status: 400 }
          );
        }

        const optimization = await optimizeSchedule(
          {
            content,
            platform,
            scheduledTime: new Date(scheduledTime),
          },
          session.user.id
        );

        return NextResponse.json({ optimization });
      }

      case "generate-schedule": {
        const { platforms, postsPerDay, days } = data;

        if (!platforms || !postsPerDay || !days) {
          return NextResponse.json(
            { error: "Platforms, posts per day, and days required" },
            { status: 400 }
          );
        }

        const slots = await generateSmartSchedule(
          session.user.id,
          platforms,
          postsPerDay,
          days
        );

        return NextResponse.json({ slots });
      }

      case "analyze-content": {
        const { content, platform } = data;

        if (!content || !platform) {
          return NextResponse.json(
            { error: "Content and platform required" },
            { status: 400 }
          );
        }

        const analysis = await analyzeContentForTiming(content, platform);
        return NextResponse.json({ analysis });
      }

      case "batch-optimize": {
        const { posts } = data;

        if (!posts || !Array.isArray(posts)) {
          return NextResponse.json(
            { error: "Posts array required" },
            { status: 400 }
          );
        }

        const result = await batchOptimize(
          posts.map((p: any) => ({
            ...p,
            scheduledTime: new Date(p.scheduledTime),
          })),
          session.user.id
        );

        return NextResponse.json(result);
      }

      case "create-post": {
        const { content, contentType, platform, scheduledTime, hashtags } = data;

        if (!content || !platform || !scheduledTime) {
          return NextResponse.json(
            { error: "Content, platform, and scheduled time required" },
            { status: 400 }
          );
        }

        // Get optimization
        const optimization = await optimizeSchedule(
          { content, platform, scheduledTime: new Date(scheduledTime) },
          session.user.id
        );

        const post = createScheduledPost(session.user.id, {
          content,
          contentType: contentType || "text",
          platform,
          scheduledTime: new Date(scheduledTime),
          optimizedTime: optimization.suggestedTime,
          optimizationScore: optimization.audienceActivity,
          hashtags,
        });

        return NextResponse.json({ post, optimization });
      }

      case "update-post": {
        const { postId, ...updates } = data;

        if (!postId) {
          return NextResponse.json({ error: "Post ID required" }, { status: 400 });
        }

        if (updates.scheduledTime) {
          updates.scheduledTime = new Date(updates.scheduledTime);
        }

        const post = updateScheduledPost(postId, session.user.id, updates);
        if (!post) {
          return NextResponse.json({ error: "Post not found" }, { status: 404 });
        }

        return NextResponse.json({ post });
      }

      case "delete-post": {
        const { postId } = data;

        if (!postId) {
          return NextResponse.json({ error: "Post ID required" }, { status: 400 });
        }

        const deleted = deleteScheduledPost(postId, session.user.id);
        if (!deleted) {
          return NextResponse.json({ error: "Post not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
      }

      case "create-queue": {
        const { name, platforms, slots, autoOptimize, avoidWeekends, timezone } = data;

        if (!name || !platforms) {
          return NextResponse.json(
            { error: "Name and platforms required" },
            { status: 400 }
          );
        }

        const queue = createSmartQueue(session.user.id, {
          name,
          platforms,
          slots: slots || [],
          autoOptimize: autoOptimize ?? true,
          avoidWeekends: avoidWeekends ?? false,
          timezone: timezone || "UTC",
        });

        return NextResponse.json({ queue });
      }

      case "add-to-queue": {
        const { queueId, post } = data;

        if (!queueId || !post) {
          return NextResponse.json(
            { error: "Queue ID and post required" },
            { status: 400 }
          );
        }

        const scheduledPost = createScheduledPost(session.user.id, {
          ...post,
          scheduledTime: new Date(post.scheduledTime),
          optimizedTime: post.optimizedTime ? new Date(post.optimizedTime) : undefined,
          optimizationScore: post.optimizationScore || 0,
        });

        const queue = addPostToQueue(queueId, session.user.id, scheduledPost);
        if (!queue) {
          return NextResponse.json({ error: "Queue not found" }, { status: 404 });
        }

        return NextResponse.json({ queue, post: scheduledPost });
      }

      case "delete-queue": {
        const { queueId } = data;

        if (!queueId) {
          return NextResponse.json({ error: "Queue ID required" }, { status: 400 });
        }

        const deleted = deleteSmartQueue(queueId, session.user.id);
        if (!deleted) {
          return NextResponse.json({ error: "Queue not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
      }

      case "suggest-hashtags": {
        const { content, platform } = data;

        if (!content || !platform) {
          return NextResponse.json(
            { error: "Content and platform required" },
            { status: 400 }
          );
        }

        const suggestions = await suggestHashtags(content, platform);
        return NextResponse.json(suggestions);
      }

      case "auto-schedule": {
        const { posts, strategy } = data;

        if (!posts || !Array.isArray(posts)) {
          return NextResponse.json(
            { error: "Posts array required" },
            { status: 400 }
          );
        }

        // Auto-schedule posts based on strategy
        const scheduledPosts = [];
        const now = new Date();
        let slotIndex = 0;

        for (const post of posts) {
          const platform = post.platform as Platform;
          const optimalTimes = getOptimalTimes(platform, (now.getDay() + Math.floor(slotIndex / 3)) % 7);

          const scheduledTime = new Date(now);
          scheduledTime.setDate(scheduledTime.getDate() + Math.floor(slotIndex / 3));
          scheduledTime.setHours(optimalTimes[slotIndex % 3]?.hour || 12, 0, 0, 0);

          const optimization = await optimizeSchedule(
            { ...post, scheduledTime },
            session.user.id
          );

          const scheduledPost = createScheduledPost(session.user.id, {
            content: post.content,
            contentType: post.contentType || "text",
            platform,
            scheduledTime: optimization.suggestedTime,
            optimizedTime: optimization.suggestedTime,
            optimizationScore: optimization.audienceActivity,
            hashtags: post.hashtags,
          });

          scheduledPosts.push({ post: scheduledPost, optimization });
          slotIndex++;
        }

        return NextResponse.json({ scheduledPosts });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Smart schedule POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process request" },
      { status: 500 }
    );
  }
}
