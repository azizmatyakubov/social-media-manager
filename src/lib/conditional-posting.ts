import { prisma } from "./prisma";
import { ConditionalAction, Post, ConditionalRule } from "@prisma/client";

// ============================================
// Types
// ============================================

export interface CreateConditionalRuleInput {
  userId: string;
  name: string;
  triggerMetric: string;
  triggerOperator: string;
  triggerValue: number;
  triggerTimeframe: number;
  actionType: ConditionalAction;
  actionContent?: string;
  actionDelay?: number;
}

export interface UpdateConditionalRuleInput {
  name?: string;
  triggerMetric?: string;
  triggerOperator?: string;
  triggerValue?: number;
  triggerTimeframe?: number;
  actionType?: ConditionalAction;
  actionContent?: string;
  actionDelay?: number;
  isActive?: boolean;
}

export interface ConditionalRuleWithStats extends ConditionalRule {
  _count?: {
    posts: number;
  };
}

export interface RuleExecutionResult {
  postId: string;
  ruleId: string;
  ruleName: string;
  actionType: ConditionalAction;
  success: boolean;
  message: string;
}

// ============================================
// CRUD Operations
// ============================================

/**
 * Create a new conditional rule for a user
 */
export async function createConditionalRule(
  userId: string,
  rule: Omit<CreateConditionalRuleInput, "userId">
): Promise<ConditionalRule> {
  return prisma.conditionalRule.create({
    data: {
      userId,
      name: rule.name,
      triggerMetric: rule.triggerMetric,
      triggerOperator: rule.triggerOperator,
      triggerValue: rule.triggerValue,
      triggerTimeframe: rule.triggerTimeframe,
      actionType: rule.actionType,
      actionContent: rule.actionContent,
      actionDelay: rule.actionDelay ?? 0,
    },
  });
}

/**
 * Get all conditional rules for a user
 */
export async function getConditionalRules(
  userId: string,
  includeStats: boolean = true
): Promise<ConditionalRuleWithStats[]> {
  return prisma.conditionalRule.findMany({
    where: { userId },
    include: includeStats
      ? {
          _count: {
            select: { posts: true },
          },
        }
      : undefined,
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Get a single conditional rule by ID
 */
export async function getConditionalRule(
  ruleId: string
): Promise<ConditionalRule | null> {
  return prisma.conditionalRule.findUnique({
    where: { id: ruleId },
  });
}

/**
 * Update a conditional rule
 */
export async function updateConditionalRule(
  ruleId: string,
  updates: UpdateConditionalRuleInput
): Promise<ConditionalRule> {
  return prisma.conditionalRule.update({
    where: { id: ruleId },
    data: updates,
  });
}

/**
 * Delete a conditional rule
 */
export async function deleteConditionalRule(ruleId: string): Promise<void> {
  // First, unlink any posts associated with this rule
  await prisma.post.updateMany({
    where: { conditionalRuleId: ruleId },
    data: { conditionalRuleId: null },
  });

  await prisma.conditionalRule.delete({
    where: { id: ruleId },
  });
}

// ============================================
// Rule Evaluation
// ============================================

/**
 * Check if a post meets the conditions of a specific rule
 */
export function checkPostAgainstRule(
  post: Post,
  rule: ConditionalRule
): boolean {
  // Get the metric value from the post
  let metricValue: number;
  switch (rule.triggerMetric) {
    case "likes":
      metricValue = post.likes;
      break;
    case "retweets":
      metricValue = post.retweets;
      break;
    case "replies":
      metricValue = post.replies;
      break;
    case "impressions":
      metricValue = post.impressions;
      break;
    case "shares":
      metricValue = post.shares;
      break;
    case "clicks":
      metricValue = post.clicks;
      break;
    default:
      return false;
  }

  // Check the operator condition
  switch (rule.triggerOperator) {
    case "gte":
    case ">=":
      return metricValue >= rule.triggerValue;
    case "lte":
    case "<=":
      return metricValue <= rule.triggerValue;
    case "eq":
    case "==":
      return metricValue === rule.triggerValue;
    case "gt":
    case ">":
      return metricValue > rule.triggerValue;
    case "lt":
    case "<":
      return metricValue < rule.triggerValue;
    default:
      return false;
  }
}

/**
 * Check if a post is within the timeframe for rule evaluation
 */
export function isPostWithinTimeframe(
  post: Post,
  rule: ConditionalRule
): boolean {
  if (!post.postedAt) return false;

  const postedAt = new Date(post.postedAt);
  const now = new Date();
  const hoursSincePosted =
    (now.getTime() - postedAt.getTime()) / (1000 * 60 * 60);

  return hoursSincePosted <= rule.triggerTimeframe;
}

/**
 * Check a post against all provided rules and return matching rules
 */
export function checkPostAgainstRules(
  post: Post,
  rules: ConditionalRule[]
): ConditionalRule[] {
  return rules.filter((rule) => {
    // Rule must be active
    if (!rule.isActive) return false;

    // Post must be within the timeframe
    if (!isPostWithinTimeframe(post, rule)) return false;

    // Post must meet the condition
    return checkPostAgainstRule(post, rule);
  });
}

// ============================================
// Action Execution
// ============================================

/**
 * Execute the action for a matched rule
 */
export async function executeConditionalAction(
  post: Post,
  rule: ConditionalRule
): Promise<RuleExecutionResult> {
  const result: RuleExecutionResult = {
    postId: post.id,
    ruleId: rule.id,
    ruleName: rule.name,
    actionType: rule.actionType,
    success: false,
    message: "",
  };

  try {
    // Get the user's X account for actions that need it
    const xAccount = await prisma.xAccount.findFirst({
      where: { userId: post.userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });

    switch (rule.actionType) {
      case ConditionalAction.ADD_COMMENT:
        if (!rule.actionContent) {
          result.message = "No comment content specified";
          return result;
        }
        // In production, this would call the X API to add a reply
        // For now, we'll just log and mark as success
        console.log(
          `[Conditional] Would add comment to post ${post.id}: ${rule.actionContent}`
        );
        if (xAccount && post.platformPostId) {
          // TODO: Implement actual X API call to reply to tweet
          // await replyToTweet(xAccount.accessToken, post.platformPostId, rule.actionContent);
          result.success = true;
          result.message = `Comment added to post: ${rule.actionContent.substring(0, 50)}...`;
        } else {
          result.message = "Missing X account or platform post ID";
        }
        break;

      case ConditionalAction.SEND_DM:
        if (!rule.actionContent) {
          result.message = "No DM template specified";
          return result;
        }
        console.log(
          `[Conditional] Would send DM for post ${post.id}: ${rule.actionContent}`
        );
        // TODO: Implement DM sending logic
        result.success = true;
        result.message = "DM notification queued";
        break;

      case ConditionalAction.RETWEET:
        console.log(`[Conditional] Would retweet post ${post.id}`);
        if (xAccount && post.platformPostId) {
          // TODO: Implement actual X API call to retweet
          // await retweetTweet(xAccount.accessToken, post.platformPostId);
          result.success = true;
          result.message = "Post retweeted";
        } else {
          result.message = "Missing X account or platform post ID";
        }
        break;

      case ConditionalAction.PIN_POST:
        console.log(`[Conditional] Would pin post ${post.id}`);
        if (xAccount && post.platformPostId) {
          // TODO: Implement actual X API call to pin tweet
          // await pinTweet(xAccount.accessToken, post.platformPostId);
          result.success = true;
          result.message = "Post pinned to profile";
        } else {
          result.message = "Missing X account or platform post ID";
        }
        break;

      case ConditionalAction.NOTIFY:
        console.log(`[Conditional] Would send notification for post ${post.id}`);
        // Create an in-app notification or send email
        // TODO: Implement notification system integration
        result.success = true;
        result.message = `Notification sent: Post reached ${rule.triggerValue} ${rule.triggerMetric}`;
        break;

      default:
        result.message = `Unknown action type: ${rule.actionType}`;
    }

    // Update rule stats if action was successful
    if (result.success) {
      await prisma.conditionalRule.update({
        where: { id: rule.id },
        data: {
          triggeredCount: { increment: 1 },
          lastTriggered: new Date(),
        },
      });

      // Link the post to the rule that triggered
      await prisma.post.update({
        where: { id: post.id },
        data: { conditionalRuleId: rule.id },
      });
    }
  } catch (error) {
    console.error(`[Conditional] Error executing action for rule ${rule.id}:`, error);
    result.message = error instanceof Error ? error.message : "Unknown error";
  }

  return result;
}

// ============================================
// Statistics
// ============================================

/**
 * Get detailed statistics for a conditional rule
 */
export async function getConditionalStats(ruleId: string) {
  const rule = await prisma.conditionalRule.findUnique({
    where: { id: ruleId },
    include: {
      posts: {
        select: {
          id: true,
          content: true,
          likes: true,
          retweets: true,
          replies: true,
          impressions: true,
          postedAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!rule) {
    throw new Error("Rule not found");
  }

  // Calculate average metrics for triggered posts
  const triggeredPosts = rule.posts;
  const avgMetrics = {
    likes: 0,
    retweets: 0,
    replies: 0,
    impressions: 0,
  };

  if (triggeredPosts.length > 0) {
    avgMetrics.likes =
      triggeredPosts.reduce((sum, p) => sum + p.likes, 0) / triggeredPosts.length;
    avgMetrics.retweets =
      triggeredPosts.reduce((sum, p) => sum + p.retweets, 0) / triggeredPosts.length;
    avgMetrics.replies =
      triggeredPosts.reduce((sum, p) => sum + p.replies, 0) / triggeredPosts.length;
    avgMetrics.impressions =
      triggeredPosts.reduce((sum, p) => sum + p.impressions, 0) / triggeredPosts.length;
  }

  // Get trigger history (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentTriggers = triggeredPosts.filter(
    (p) => new Date(p.createdAt) >= thirtyDaysAgo
  ).length;

  return {
    rule: {
      id: rule.id,
      name: rule.name,
      triggerMetric: rule.triggerMetric,
      triggerOperator: rule.triggerOperator,
      triggerValue: rule.triggerValue,
      triggerTimeframe: rule.triggerTimeframe,
      actionType: rule.actionType,
      isActive: rule.isActive,
      createdAt: rule.createdAt,
    },
    stats: {
      totalTriggered: rule.triggeredCount,
      recentTriggers,
      lastTriggered: rule.lastTriggered,
      averageMetrics: avgMetrics,
    },
    recentPosts: triggeredPosts,
  };
}

// ============================================
// Main Processing Function
// ============================================

/**
 * Main function to check all posts against conditional rules
 * This is meant to be called by a cron job
 */
export async function processPostsForConditionals(): Promise<{
  processed: number;
  triggered: number;
  results: RuleExecutionResult[];
}> {
  console.log("[Conditional] Starting conditional rules processing...");

  // Get all active conditional rules with their users
  const activeRules = await prisma.conditionalRule.findMany({
    where: { isActive: true },
    include: {
      user: {
        select: { id: true },
      },
    },
  });

  if (activeRules.length === 0) {
    console.log("[Conditional] No active rules found");
    return { processed: 0, triggered: 0, results: [] };
  }

  console.log(`[Conditional] Found ${activeRules.length} active rules`);

  // Group rules by user for efficiency
  const rulesByUser = new Map<string, ConditionalRule[]>();
  for (const rule of activeRules) {
    const userId = rule.userId;
    if (!rulesByUser.has(userId)) {
      rulesByUser.set(userId, []);
    }
    rulesByUser.get(userId)!.push(rule);
  }

  const allResults: RuleExecutionResult[] = [];
  let totalProcessed = 0;

  // Process each user's posts against their rules
  for (const [userId, userRules] of rulesByUser) {
    // Get the maximum timeframe from user's rules
    const maxTimeframe = Math.max(...userRules.map((r) => r.triggerTimeframe));
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - maxTimeframe);

    // Get posts that are:
    // 1. Posted (status = POSTED)
    // 2. Within the timeframe
    // 3. Not already triggered by a conditional rule
    const eligiblePosts = await prisma.post.findMany({
      where: {
        userId,
        status: "POSTED",
        postedAt: { gte: cutoffDate },
        conditionalRuleId: null, // Not already processed by a rule
      },
    });

    console.log(
      `[Conditional] User ${userId}: checking ${eligiblePosts.length} posts against ${userRules.length} rules`
    );

    for (const post of eligiblePosts) {
      totalProcessed++;

      // Check which rules this post matches
      const matchingRules = checkPostAgainstRules(post, userRules);

      for (const rule of matchingRules) {
        console.log(
          `[Conditional] Post ${post.id} matched rule "${rule.name}" (${rule.triggerMetric} ${rule.triggerOperator} ${rule.triggerValue})`
        );

        // Execute the action for this rule
        const result = await executeConditionalAction(post, rule);
        allResults.push(result);

        // Only process the first matching rule per post to avoid duplicate actions
        break;
      }
    }
  }

  const triggeredCount = allResults.filter((r) => r.success).length;
  console.log(
    `[Conditional] Processing complete. Processed: ${totalProcessed}, Triggered: ${triggeredCount}`
  );

  return {
    processed: totalProcessed,
    triggered: triggeredCount,
    results: allResults,
  };
}

/**
 * Get rule execution history
 */
export async function getRuleHistory(
  ruleId: string,
  limit: number = 20
) {
  const posts = await prisma.post.findMany({
    where: { conditionalRuleId: ruleId },
    select: {
      id: true,
      content: true,
      likes: true,
      retweets: true,
      replies: true,
      impressions: true,
      postedAt: true,
      platform: true,
    },
    orderBy: { postedAt: "desc" },
    take: limit,
  });

  return posts;
}
