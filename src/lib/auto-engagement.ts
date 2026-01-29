import { prisma } from "./prisma";
import { MatchType, TriggerType } from "@prisma/client";

// ============================================
// EVERGREEN AUTO-RETWEET FUNCTIONS
// ============================================

export interface EvergreenPost {
  id: string;
  content: string;
  isEvergreen: boolean;
  autoRetweet: boolean;
  lastRecycled: Date | null;
  recycleCount: number;
  likes: number;
  retweets: number;
  replies: number;
  impressions: number;
  platformPostId: string | null;
  postedAt: Date | null;
  createdAt: Date;
}

export interface RetweetSchedule {
  postId: string;
  intervalDays: number;
  minEngagement: number;
  nextRetweetDate: Date;
  isActive: boolean;
}

/**
 * Get all posts marked as evergreen for a user
 */
export async function getEvergreenPosts(userId: string): Promise<EvergreenPost[]> {
  const posts = await prisma.post.findMany({
    where: {
      userId,
      isEvergreen: true,
      status: "POSTED",
    },
    orderBy: [
      { lastRecycled: "asc" },
      { createdAt: "asc" },
    ],
    select: {
      id: true,
      content: true,
      isEvergreen: true,
      autoRetweet: true,
      lastRecycled: true,
      recycleCount: true,
      likes: true,
      retweets: true,
      replies: true,
      impressions: true,
      platformPostId: true,
      postedAt: true,
      createdAt: true,
    },
  });

  return posts;
}

/**
 * Schedule automatic retweets for a post
 */
export async function scheduleAutoRetweet(
  postId: string,
  intervalDays: number = 30,
  minEngagement: number = 10
): Promise<{ success: boolean; nextRetweetDate: Date }> {
  // Update the post to enable auto-retweet
  await prisma.post.update({
    where: { id: postId },
    data: {
      autoRetweet: true,
      isEvergreen: true,
    },
  });

  // Calculate next retweet date based on last recycled or creation date
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { lastRecycled: true, createdAt: true },
  });

  const baseDate = post?.lastRecycled || post?.createdAt || new Date();
  const nextRetweetDate = new Date(baseDate);
  nextRetweetDate.setDate(nextRetweetDate.getDate() + intervalDays);

  return {
    success: true,
    nextRetweetDate,
  };
}

/**
 * Execute a retweet for a specific post
 * This creates a new post with the same content
 */
export async function executeAutoRetweet(
  postId: string,
  userId: string
): Promise<{ success: boolean; newPostId?: string; error?: string }> {
  try {
    const originalPost = await prisma.post.findFirst({
      where: {
        id: postId,
        userId,
        isEvergreen: true,
      },
    });

    if (!originalPost) {
      return { success: false, error: "Post not found or not evergreen" };
    }

    // Create a new scheduled post with the same content
    const scheduledFor = new Date();
    scheduledFor.setHours(scheduledFor.getHours() + 1); // Schedule 1 hour from now

    const newPost = await prisma.post.create({
      data: {
        userId,
        content: originalPost.content,
        platform: originalPost.platform,
        xAccountId: originalPost.xAccountId,
        linkedInAccountId: originalPost.linkedInAccountId,
        instagramAccountId: originalPost.instagramAccountId,
        status: "SCHEDULED",
        scheduledFor,
        mediaUrls: originalPost.mediaUrls,
        mediaType: originalPost.mediaType,
      },
    });

    // Update original post recycling stats
    await prisma.post.update({
      where: { id: postId },
      data: {
        lastRecycled: new Date(),
        recycleCount: { increment: 1 },
      },
    });

    return { success: true, newPostId: newPost.id };
  } catch (error) {
    console.error("Execute auto-retweet error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Check if a post is eligible for retweet
 */
export async function checkRetweetEligibility(
  postId: string,
  minDaysBetweenRetweets: number = 30,
  minEngagementThreshold: number = 10
): Promise<{
  eligible: boolean;
  reason?: string;
  daysSinceLastRetweet?: number;
  engagementScore?: number;
}> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      isEvergreen: true,
      autoRetweet: true,
      lastRecycled: true,
      createdAt: true,
      likes: true,
      retweets: true,
      replies: true,
      postedAt: true,
    },
  });

  if (!post) {
    return { eligible: false, reason: "Post not found" };
  }

  if (!post.isEvergreen) {
    return { eligible: false, reason: "Post is not marked as evergreen" };
  }

  if (!post.autoRetweet) {
    return { eligible: false, reason: "Auto-retweet is not enabled for this post" };
  }

  // Calculate engagement score
  const engagementScore = post.likes + (post.retweets * 2) + (post.replies * 3);

  if (engagementScore < minEngagementThreshold) {
    return {
      eligible: false,
      reason: `Engagement score (${engagementScore}) below threshold (${minEngagementThreshold})`,
      engagementScore,
    };
  }

  // Check time since last retweet
  const lastAction = post.lastRecycled || post.postedAt || post.createdAt;
  const daysSinceLastRetweet = Math.floor(
    (Date.now() - lastAction.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceLastRetweet < minDaysBetweenRetweets) {
    return {
      eligible: false,
      reason: `Only ${daysSinceLastRetweet} days since last retweet (minimum: ${minDaysBetweenRetweets})`,
      daysSinceLastRetweet,
      engagementScore,
    };
  }

  return {
    eligible: true,
    daysSinceLastRetweet,
    engagementScore,
  };
}

/**
 * Get all posts eligible for auto-retweet
 */
export async function getEligibleRetweetPosts(
  userId: string,
  minDays: number = 30,
  minEngagement: number = 10
): Promise<EvergreenPost[]> {
  const posts = await getEvergreenPosts(userId);
  const eligiblePosts: EvergreenPost[] = [];

  for (const post of posts) {
    if (!post.autoRetweet) continue;

    const eligibility = await checkRetweetEligibility(post.id, minDays, minEngagement);
    if (eligibility.eligible) {
      eligiblePosts.push(post);
    }
  }

  return eligiblePosts;
}

// ============================================
// AUTO DM ON KEYWORD FUNCTIONS
// ============================================

export interface AutoDmRuleInput {
  name: string;
  triggerType?: TriggerType;
  keywords: string[];
  matchType?: MatchType;
  dmTemplate: string;
  includeDelay?: boolean;
  delaySeconds?: number;
  minFollowers?: number | null;
  maxDailyDms?: number;
  excludeKeywords?: string[];
  isActive?: boolean;
}

export interface AutoDmRule {
  id: string;
  userId: string;
  name: string;
  triggerType: TriggerType;
  keywords: string[];
  matchType: MatchType;
  dmTemplate: string;
  includeDelay: boolean;
  delaySeconds: number;
  minFollowers: number | null;
  maxDailyDms: number;
  excludeKeywords: string[];
  triggeredCount: number;
  lastTriggered: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Comment {
  id: string;
  authorId: string;
  authorUsername: string;
  authorFollowers?: number;
  content: string;
  postId: string;
  platform: string;
}

/**
 * Create a new auto DM rule
 */
export async function createAutoDmRule(
  userId: string,
  rule: AutoDmRuleInput
): Promise<AutoDmRule> {
  const newRule = await prisma.autoDmRule.create({
    data: {
      userId,
      name: rule.name,
      triggerType: rule.triggerType || "KEYWORD_COMMENT",
      keywords: rule.keywords,
      matchType: rule.matchType || "CONTAINS",
      dmTemplate: rule.dmTemplate,
      includeDelay: rule.includeDelay ?? true,
      delaySeconds: rule.delaySeconds || 60,
      minFollowers: rule.minFollowers || null,
      maxDailyDms: rule.maxDailyDms || 50,
      excludeKeywords: rule.excludeKeywords || [],
      isActive: rule.isActive ?? true,
    },
  });

  return newRule;
}

/**
 * Get all auto DM rules for a user
 */
export async function getAutoDmRules(userId: string): Promise<AutoDmRule[]> {
  const rules = await prisma.autoDmRule.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return rules;
}

/**
 * Update an auto DM rule
 */
export async function updateAutoDmRule(
  ruleId: string,
  userId: string,
  updates: Partial<AutoDmRuleInput>
): Promise<AutoDmRule | null> {
  // Verify ownership
  const existingRule = await prisma.autoDmRule.findFirst({
    where: { id: ruleId, userId },
  });

  if (!existingRule) {
    return null;
  }

  const updatedRule = await prisma.autoDmRule.update({
    where: { id: ruleId },
    data: {
      ...(updates.name !== undefined && { name: updates.name }),
      ...(updates.triggerType !== undefined && { triggerType: updates.triggerType }),
      ...(updates.keywords !== undefined && { keywords: updates.keywords }),
      ...(updates.matchType !== undefined && { matchType: updates.matchType }),
      ...(updates.dmTemplate !== undefined && { dmTemplate: updates.dmTemplate }),
      ...(updates.includeDelay !== undefined && { includeDelay: updates.includeDelay }),
      ...(updates.delaySeconds !== undefined && { delaySeconds: updates.delaySeconds }),
      ...(updates.minFollowers !== undefined && { minFollowers: updates.minFollowers }),
      ...(updates.maxDailyDms !== undefined && { maxDailyDms: updates.maxDailyDms }),
      ...(updates.excludeKeywords !== undefined && { excludeKeywords: updates.excludeKeywords }),
      ...(updates.isActive !== undefined && { isActive: updates.isActive }),
    },
  });

  return updatedRule;
}

/**
 * Delete an auto DM rule
 */
export async function deleteAutoDmRule(
  ruleId: string,
  userId: string
): Promise<boolean> {
  // Verify ownership
  const existingRule = await prisma.autoDmRule.findFirst({
    where: { id: ruleId, userId },
  });

  if (!existingRule) {
    return false;
  }

  await prisma.autoDmRule.delete({
    where: { id: ruleId },
  });

  return true;
}

/**
 * Check if a comment matches any keyword rule
 */
function matchesKeywords(
  content: string,
  keywords: string[],
  matchType: MatchType,
  excludeKeywords: string[]
): boolean {
  const lowerContent = content.toLowerCase();

  // Check exclude keywords first
  for (const exclude of excludeKeywords) {
    if (lowerContent.includes(exclude.toLowerCase())) {
      return false;
    }
  }

  // Check matching keywords
  for (const keyword of keywords) {
    const lowerKeyword = keyword.toLowerCase();

    switch (matchType) {
      case "EXACT":
        // Word boundary matching for exact
        const exactRegex = new RegExp(`\\b${escapeRegex(lowerKeyword)}\\b`, "i");
        if (exactRegex.test(lowerContent)) {
          return true;
        }
        break;

      case "CONTAINS":
        if (lowerContent.includes(lowerKeyword)) {
          return true;
        }
        break;

      case "STARTS_WITH":
        if (lowerContent.startsWith(lowerKeyword)) {
          return true;
        }
        break;

      case "REGEX":
        try {
          const regex = new RegExp(keyword, "i");
          if (regex.test(content)) {
            return true;
          }
        } catch {
          // Invalid regex, skip
          console.warn(`Invalid regex pattern: ${keyword}`);
        }
        break;
    }
  }

  return false;
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Get today's date at midnight for comparison
 */
function getTodayMidnight(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

/**
 * Check if a date is today
 */
function isToday(date: Date | null): boolean {
  if (!date) return false;
  const today = getTodayMidnight();
  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);
  return today.getTime() === compareDate.getTime();
}

/**
 * Get the effective daily triggered count for a rule
 * Returns 0 if the dailyCountDate is not today (count has reset)
 */
async function getEffectiveDailyCount(ruleId: string): Promise<number> {
  const rule = await prisma.autoDmRule.findUnique({
    where: { id: ruleId },
    select: { dailyTriggeredCount: true, dailyCountDate: true },
  });

  if (!rule) return 0;

  // If dailyCountDate is not today, the count should be considered 0
  if (!isToday(rule.dailyCountDate)) {
    return 0;
  }

  return rule.dailyTriggeredCount;
}

/**
 * Process a comment against all rules
 */
export async function processComment(
  comment: Comment,
  rules: AutoDmRule[]
): Promise<{
  matchedRule: AutoDmRule | null;
  shouldSendDm: boolean;
  reason?: string;
}> {
  for (const rule of rules) {
    if (!rule.isActive) {
      continue;
    }

    // Check keyword match
    const matches = matchesKeywords(
      comment.content,
      rule.keywords,
      rule.matchType,
      rule.excludeKeywords
    );

    if (!matches) {
      continue;
    }

    // Check follower threshold
    if (rule.minFollowers && comment.authorFollowers !== undefined) {
      if (comment.authorFollowers < rule.minFollowers) {
        continue;
      }
    }

    // Check daily DM limit using proper daily counter
    const dailyCount = await getEffectiveDailyCount(rule.id);

    if (dailyCount >= rule.maxDailyDms) {
      return {
        matchedRule: rule,
        shouldSendDm: false,
        reason: `Daily DM limit (${rule.maxDailyDms}) reached (${dailyCount} sent today)`,
      };
    }

    return {
      matchedRule: rule,
      shouldSendDm: true,
    };
  }

  return {
    matchedRule: null,
    shouldSendDm: false,
    reason: "No matching rule found",
  };
}

/**
 * Send an auto DM via X/Twitter API
 */
export async function sendAutoDm(
  userId: string,
  recipientId: string,
  template: string,
  variables?: Record<string, string>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // Replace template variables
  let message = template;
  if (variables) {
    for (const [key, value] of Object.entries(variables)) {
      message = message.replace(new RegExp(`\\{${key}\\}`, "g"), value);
    }
  }

  try {
    // Get user's X account
    const xAccount = await prisma.xAccount.findFirst({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });

    if (!xAccount) {
      return {
        success: false,
        error: "No X account connected",
      };
    }

    // Import and use X client to send DM
    const { sendDirectMessage } = await import("./x-client");
    const result = await sendDirectMessage(
      xAccount.accessToken,
      recipientId,
      message
    );

    console.log(`[AutoDM] Sent DM to ${recipientId}: ${message.substring(0, 50)}...`);

    return {
      success: true,
      messageId: result.eventId || result.messageId,
    };
  } catch (error) {
    console.error(`[AutoDM] Failed to send DM to ${recipientId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send DM",
    };
  }
}

/**
 * Record that a DM was triggered and update stats
 */
export async function recordDmTrigger(ruleId: string): Promise<void> {
  const now = new Date();
  const today = getTodayMidnight();

  // First, get the current rule to check if we need to reset daily count
  const rule = await prisma.autoDmRule.findUnique({
    where: { id: ruleId },
    select: { dailyCountDate: true },
  });

  // Determine if we need to reset the daily counter (new day)
  const needsReset = !rule?.dailyCountDate || !isToday(rule.dailyCountDate);

  await prisma.autoDmRule.update({
    where: { id: ruleId },
    data: {
      // Lifetime counter
      triggeredCount: { increment: 1 },
      lastTriggered: now,
      // Daily counter - reset to 1 if new day, otherwise increment
      dailyTriggeredCount: needsReset ? 1 : { increment: 1 },
      dailyCountDate: today,
    },
  });
}

/**
 * Get statistics for an auto DM rule
 */
export async function getAutoDmStats(ruleId: string): Promise<{
  triggeredCount: number;
  lastTriggered: Date | null;
  isActive: boolean;
  dailyAverage: number;
  todayCount: number;
  maxDailyDms: number;
} | null> {
  const rule = await prisma.autoDmRule.findUnique({
    where: { id: ruleId },
    select: {
      triggeredCount: true,
      lastTriggered: true,
      isActive: true,
      createdAt: true,
      dailyTriggeredCount: true,
      dailyCountDate: true,
      maxDailyDms: true,
    },
  });

  if (!rule) {
    return null;
  }

  // Calculate daily average
  const daysActive = Math.max(
    1,
    Math.floor((Date.now() - rule.createdAt.getTime()) / (1000 * 60 * 60 * 24))
  );
  const dailyAverage = rule.triggeredCount / daysActive;

  // Get effective today count (0 if dailyCountDate is not today)
  const todayCount = isToday(rule.dailyCountDate) ? rule.dailyTriggeredCount : 0;

  return {
    triggeredCount: rule.triggeredCount,
    lastTriggered: rule.lastTriggered,
    isActive: rule.isActive,
    dailyAverage: Math.round(dailyAverage * 100) / 100,
    todayCount,
    maxDailyDms: rule.maxDailyDms,
  };
}

/**
 * Toggle auto DM rule active status
 */
export async function toggleAutoDmRule(
  ruleId: string,
  userId: string
): Promise<{ success: boolean; isActive: boolean }> {
  const rule = await prisma.autoDmRule.findFirst({
    where: { id: ruleId, userId },
  });

  if (!rule) {
    return { success: false, isActive: false };
  }

  const updated = await prisma.autoDmRule.update({
    where: { id: ruleId },
    data: { isActive: !rule.isActive },
  });

  return { success: true, isActive: updated.isActive };
}

/**
 * Reset daily DM counters for all rules where the date is not today
 * This can be called by a daily cron job, but is also handled automatically
 * in recordDmTrigger when a new day starts
 */
export async function resetDailyDmCounters(): Promise<number> {
  const today = getTodayMidnight();

  // Reset all rules where dailyCountDate is not today
  const result = await prisma.autoDmRule.updateMany({
    where: {
      OR: [
        { dailyCountDate: null },
        { dailyCountDate: { lt: today } },
      ],
    },
    data: {
      dailyTriggeredCount: 0,
      dailyCountDate: today,
    },
  });

  console.log(`[AutoDM] Reset daily DM counters for ${result.count} rules`);
  return result.count;
}

/**
 * Get all active auto DM rules for processing comments
 */
export async function getActiveAutoDmRules(userId: string): Promise<AutoDmRule[]> {
  return prisma.autoDmRule.findMany({
    where: {
      userId,
      isActive: true,
    },
  });
}
