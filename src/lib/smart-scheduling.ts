import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type Platform = "twitter" | "instagram" | "facebook" | "linkedin" | "tiktok";
export type ContentType = "text" | "image" | "video" | "carousel" | "story" | "reel" | "thread";

export interface ScheduleSlot {
  id: string;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  hour: number; // 0-23
  minute: number; // 0-59
  platform: Platform;
  score: number; // 0-100 engagement score
  audiencePercentage: number; // percentage of audience active
}

export interface ScheduledPost {
  id: string;
  userId: string;
  content: string;
  contentType: ContentType;
  platform: Platform;
  scheduledTime: Date;
  optimizedTime?: Date;
  optimizationScore: number;
  status: "pending" | "scheduled" | "published" | "failed";
  aiSuggestions?: string[];
  hashtags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AudienceActivityPattern {
  platform: Platform;
  dayOfWeek: number;
  hourlyActivity: number[]; // 24 hours, 0-100 activity level
  peakHours: number[];
  lowHours: number[];
}

export interface ScheduleOptimization {
  originalTime: Date;
  suggestedTime: Date;
  improvementPercentage: number;
  reason: string;
  competitorConflicts: number;
  audienceActivity: number;
}

export interface SmartQueue {
  id: string;
  userId: string;
  name: string;
  platforms: Platform[];
  slots: ScheduleSlot[];
  posts: ScheduledPost[];
  autoOptimize: boolean;
  avoidWeekends: boolean;
  timezone: string;
  createdAt: Date;
}

// In-memory storage
const scheduledPosts = new Map<string, ScheduledPost>();
const userPosts = new Map<string, Set<string>>();
const smartQueues = new Map<string, SmartQueue>();
const userQueues = new Map<string, Set<string>>();
const activityPatterns = new Map<string, AudienceActivityPattern[]>();

// Default optimal times based on industry research
const DEFAULT_OPTIMAL_TIMES: Record<Platform, { weekday: number[]; weekend: number[] }> = {
  twitter: {
    weekday: [8, 9, 12, 17, 18, 21],
    weekend: [9, 10, 11, 19, 20],
  },
  instagram: {
    weekday: [7, 8, 11, 12, 13, 17, 18, 19],
    weekend: [10, 11, 12, 19, 20, 21],
  },
  facebook: {
    weekday: [9, 13, 14, 15, 16],
    weekend: [12, 13, 14, 15],
  },
  linkedin: {
    weekday: [7, 8, 10, 11, 12, 17, 18],
    weekend: [10, 11],
  },
  tiktok: {
    weekday: [7, 8, 12, 15, 19, 20, 21, 22],
    weekend: [9, 10, 11, 19, 20, 21, 22, 23],
  },
};

export function getOptimalTimes(
  platform: Platform,
  dayOfWeek: number
): { hour: number; score: number }[] {
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const optimalHours = isWeekend
    ? DEFAULT_OPTIMAL_TIMES[platform].weekend
    : DEFAULT_OPTIMAL_TIMES[platform].weekday;

  return optimalHours.map((hour, index) => ({
    hour,
    score: 100 - index * 8, // Decreasing score for later times
  }));
}

export function generateAudiencePattern(
  platform: Platform,
  userId: string
): AudienceActivityPattern[] {
  const patterns: AudienceActivityPattern[] = [];

  for (let day = 0; day < 7; day++) {
    const isWeekend = day === 0 || day === 6;
    const hourlyActivity: number[] = [];

    for (let hour = 0; hour < 24; hour++) {
      // Generate realistic activity patterns
      let activity = 20; // Base activity

      if (hour >= 7 && hour <= 9) activity = isWeekend ? 50 : 70; // Morning
      if (hour >= 11 && hour <= 13) activity = 80; // Lunch
      if (hour >= 17 && hour <= 19) activity = isWeekend ? 70 : 90; // After work
      if (hour >= 20 && hour <= 22) activity = 75; // Evening
      if (hour >= 0 && hour <= 5) activity = 10; // Night

      // Add some platform-specific variance
      if (platform === "linkedin" && isWeekend) activity *= 0.3;
      if (platform === "tiktok" && hour >= 20) activity *= 1.2;
      if (platform === "instagram" && (hour === 12 || hour === 18)) activity *= 1.3;

      hourlyActivity.push(Math.min(100, Math.round(activity)));
    }

    const peakHours = hourlyActivity
      .map((activity, hour) => ({ hour, activity }))
      .sort((a, b) => b.activity - a.activity)
      .slice(0, 5)
      .map((h) => h.hour);

    const lowHours = hourlyActivity
      .map((activity, hour) => ({ hour, activity }))
      .sort((a, b) => a.activity - b.activity)
      .slice(0, 5)
      .map((h) => h.hour);

    patterns.push({
      platform,
      dayOfWeek: day,
      hourlyActivity,
      peakHours,
      lowHours,
    });
  }

  // Store patterns
  const key = `${userId}-${platform}`;
  const existing = activityPatterns.get(userId) || [];
  activityPatterns.set(userId, [...existing.filter((p) => p.platform !== platform), ...patterns]);

  return patterns;
}

export async function optimizeSchedule(
  post: Partial<ScheduledPost>,
  userId: string
): Promise<ScheduleOptimization> {
  const platform = post.platform || "twitter";
  const originalTime = post.scheduledTime || new Date();
  const dayOfWeek = originalTime.getDay();
  const currentHour = originalTime.getHours();

  // Get optimal times for this platform and day
  const optimalTimes = getOptimalTimes(platform, dayOfWeek);
  const patterns = activityPatterns.get(userId) || generateAudiencePattern(platform, userId);
  const dayPattern = patterns.find((p) => p.dayOfWeek === dayOfWeek);

  // Find the best time slot
  let bestTime = originalTime;
  let bestScore = dayPattern?.hourlyActivity[currentHour] || 50;

  for (const optimal of optimalTimes) {
    const patternScore = dayPattern?.hourlyActivity[optimal.hour] || 50;
    const combinedScore = (optimal.score + patternScore) / 2;

    if (combinedScore > bestScore) {
      bestScore = combinedScore;
      bestTime = new Date(originalTime);
      bestTime.setHours(optimal.hour, 0, 0, 0);
    }
  }

  // Check for competitor conflicts (mock data)
  const competitorConflicts = Math.floor(Math.random() * 5);

  const improvement = bestTime.getTime() !== originalTime.getTime()
    ? Math.round(((bestScore - (dayPattern?.hourlyActivity[currentHour] || 50)) / 50) * 100)
    : 0;

  let reason = "Current time is already optimal";
  if (improvement > 0) {
    reason = `Moving to ${bestTime.getHours()}:00 increases audience reach by ${improvement}%`;
  } else if (improvement < 0) {
    reason = "Keeping original time as no better slot is available today";
  }

  return {
    originalTime,
    suggestedTime: bestTime,
    improvementPercentage: Math.max(0, improvement),
    reason,
    competitorConflicts,
    audienceActivity: bestScore,
  };
}

export async function generateSmartSchedule(
  userId: string,
  platforms: Platform[],
  postsPerDay: number,
  days: number
): Promise<ScheduleSlot[]> {
  const slots: ScheduleSlot[] = [];
  const today = new Date();

  for (let day = 0; day < days; day++) {
    const date = new Date(today);
    date.setDate(date.getDate() + day);
    const dayOfWeek = date.getDay();

    for (const platform of platforms) {
      const optimalTimes = getOptimalTimes(platform, dayOfWeek);
      const selectedTimes = optimalTimes.slice(0, postsPerDay);

      for (const time of selectedTimes) {
        slots.push({
          id: crypto.randomUUID(),
          dayOfWeek,
          hour: time.hour,
          minute: 0,
          platform,
          score: time.score,
          audiencePercentage: Math.round(60 + Math.random() * 30),
        });
      }
    }
  }

  return slots;
}

export async function analyzeContentForTiming(
  content: string,
  platform: Platform
): Promise<{
  recommendedTime: string;
  reasoning: string;
  urgency: "low" | "medium" | "high";
  contentType: ContentType;
}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a social media timing expert. Analyze content and recommend the best posting time.

          Consider:
          - Content urgency (news, trends, evergreen)
          - Target audience habits
          - Platform-specific peak times
          - Content type (text, image, video implications)

          Return JSON: { "recommendedTime": "HH:MM", "reasoning": "...", "urgency": "low|medium|high", "contentType": "text|image|video|carousel|story|reel|thread" }`,
        },
        {
          role: "user",
          content: `Platform: ${platform}\n\nContent: ${content}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content || "{}");
  } catch (error) {
    // Fallback response
    return {
      recommendedTime: "12:00",
      reasoning: "Lunch hour typically sees high engagement across platforms",
      urgency: "medium",
      contentType: "text",
    };
  }
}

export async function batchOptimize(
  posts: Partial<ScheduledPost>[],
  userId: string
): Promise<{
  optimizedPosts: (ScheduledPost & { optimization: ScheduleOptimization })[];
  summary: {
    totalImprovement: number;
    postsOptimized: number;
    postsUnchanged: number;
  };
}> {
  const optimizedPosts: (ScheduledPost & { optimization: ScheduleOptimization })[] = [];
  let totalImprovement = 0;
  let postsOptimized = 0;
  let postsUnchanged = 0;

  for (const post of posts) {
    const optimization = await optimizeSchedule(post, userId);

    const scheduledPost: ScheduledPost = {
      id: post.id || crypto.randomUUID(),
      userId,
      content: post.content || "",
      contentType: post.contentType || "text",
      platform: post.platform || "twitter",
      scheduledTime: post.scheduledTime || new Date(),
      optimizedTime: optimization.suggestedTime,
      optimizationScore: optimization.audienceActivity,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (optimization.improvementPercentage > 0) {
      postsOptimized++;
      totalImprovement += optimization.improvementPercentage;
    } else {
      postsUnchanged++;
    }

    optimizedPosts.push({ ...scheduledPost, optimization });
  }

  return {
    optimizedPosts,
    summary: {
      totalImprovement: Math.round(totalImprovement / posts.length),
      postsOptimized,
      postsUnchanged,
    },
  };
}

// CRUD operations for scheduled posts
export function createScheduledPost(
  userId: string,
  data: Omit<ScheduledPost, "id" | "userId" | "status" | "createdAt" | "updatedAt">
): ScheduledPost {
  const post: ScheduledPost = {
    id: crypto.randomUUID(),
    userId,
    ...data,
    status: "scheduled",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  scheduledPosts.set(post.id, post);

  if (!userPosts.has(userId)) {
    userPosts.set(userId, new Set());
  }
  userPosts.get(userId)!.add(post.id);

  return post;
}

export function getUserScheduledPosts(userId: string): ScheduledPost[] {
  const postIds = userPosts.get(userId);
  if (!postIds) return [];

  return Array.from(postIds)
    .map((id) => scheduledPosts.get(id))
    .filter((p): p is ScheduledPost => p !== undefined)
    .sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());
}

export function getScheduledPost(postId: string, userId: string): ScheduledPost | null {
  const post = scheduledPosts.get(postId);
  if (!post || post.userId !== userId) return null;
  return post;
}

export function updateScheduledPost(
  postId: string,
  userId: string,
  updates: Partial<Pick<ScheduledPost, "content" | "scheduledTime" | "platform" | "status">>
): ScheduledPost | null {
  const post = scheduledPosts.get(postId);
  if (!post || post.userId !== userId) return null;

  const updatedPost: ScheduledPost = {
    ...post,
    ...updates,
    updatedAt: new Date(),
  };

  scheduledPosts.set(postId, updatedPost);
  return updatedPost;
}

export function deleteScheduledPost(postId: string, userId: string): boolean {
  const post = scheduledPosts.get(postId);
  if (!post || post.userId !== userId) return false;

  scheduledPosts.delete(postId);
  userPosts.get(userId)?.delete(postId);
  return true;
}

// Smart Queue operations
export function createSmartQueue(
  userId: string,
  data: Omit<SmartQueue, "id" | "userId" | "posts" | "createdAt">
): SmartQueue {
  const queue: SmartQueue = {
    id: crypto.randomUUID(),
    userId,
    ...data,
    posts: [],
    createdAt: new Date(),
  };

  smartQueues.set(queue.id, queue);

  if (!userQueues.has(userId)) {
    userQueues.set(userId, new Set());
  }
  userQueues.get(userId)!.add(queue.id);

  return queue;
}

export function getUserSmartQueues(userId: string): SmartQueue[] {
  const queueIds = userQueues.get(userId);
  if (!queueIds) return [];

  return Array.from(queueIds)
    .map((id) => smartQueues.get(id))
    .filter((q): q is SmartQueue => q !== undefined)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function getSmartQueue(queueId: string, userId: string): SmartQueue | null {
  const queue = smartQueues.get(queueId);
  if (!queue || queue.userId !== userId) return null;
  return queue;
}

export function addPostToQueue(queueId: string, userId: string, post: ScheduledPost): SmartQueue | null {
  const queue = smartQueues.get(queueId);
  if (!queue || queue.userId !== userId) return null;

  queue.posts.push(post);
  smartQueues.set(queueId, queue);
  return queue;
}

export function deleteSmartQueue(queueId: string, userId: string): boolean {
  const queue = smartQueues.get(queueId);
  if (!queue || queue.userId !== userId) return false;

  smartQueues.delete(queueId);
  userQueues.get(userId)?.delete(queueId);
  return true;
}

export async function suggestHashtags(
  content: string,
  platform: Platform
): Promise<{ hashtags: string[]; reasoning: string }> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a hashtag optimization expert. Suggest relevant hashtags for the content.

          Consider:
          - Platform-specific best practices (${platform})
          - Mix of popular and niche hashtags
          - Relevance to content
          - Trending topics

          Return JSON: { "hashtags": ["#tag1", "#tag2", ...], "reasoning": "..." }
          Limit to 5-10 hashtags.`,
        },
        {
          role: "user",
          content: content,
        },
      ],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content || '{"hashtags": [], "reasoning": ""}');
  } catch (error) {
    return {
      hashtags: [],
      reasoning: "Unable to generate hashtags",
    };
  }
}

export function getUpcomingPosts(
  userId: string,
  hours: number = 24
): ScheduledPost[] {
  const posts = getUserScheduledPosts(userId);
  const now = new Date();
  const cutoff = new Date(now.getTime() + hours * 60 * 60 * 1000);

  return posts.filter(
    (post) =>
      post.status === "scheduled" &&
      post.scheduledTime >= now &&
      post.scheduledTime <= cutoff
  );
}

export function getScheduleCalendar(
  userId: string,
  startDate: Date,
  endDate: Date
): Record<string, ScheduledPost[]> {
  const posts = getUserScheduledPosts(userId);
  const calendar: Record<string, ScheduledPost[]> = {};

  for (const post of posts) {
    if (post.scheduledTime >= startDate && post.scheduledTime <= endDate) {
      const dateKey = post.scheduledTime.toISOString().split("T")[0];
      if (!calendar[dateKey]) {
        calendar[dateKey] = [];
      }
      calendar[dateKey].push(post);
    }
  }

  return calendar;
}

export const PLATFORM_POST_LIMITS: Record<Platform, { daily: number; optimal: number }> = {
  twitter: { daily: 15, optimal: 3 },
  instagram: { daily: 3, optimal: 1 },
  facebook: { daily: 5, optimal: 2 },
  linkedin: { daily: 3, optimal: 1 },
  tiktok: { daily: 5, optimal: 2 },
};

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  text: "Text Post",
  image: "Image Post",
  video: "Video Post",
  carousel: "Carousel",
  story: "Story",
  reel: "Reel",
  thread: "Thread",
};
