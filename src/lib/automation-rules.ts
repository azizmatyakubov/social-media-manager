export type TriggerType =
  | "new_follower"
  | "mention"
  | "comment"
  | "dm_received"
  | "post_engagement"
  | "keyword_detected"
  | "scheduled_time"
  | "hashtag_used"
  | "competitor_post"
  | "sentiment_change";

export type ActionType =
  | "send_dm"
  | "reply_comment"
  | "like_post"
  | "repost"
  | "cross_post"
  | "send_notification"
  | "add_to_list"
  | "pause_schedule"
  | "trigger_webhook"
  | "send_email"
  | "create_task";

export type Platform = "twitter" | "instagram" | "facebook" | "linkedin" | "tiktok" | "all";

export interface TriggerCondition {
  field: string;
  operator: "equals" | "contains" | "greater_than" | "less_than" | "matches_regex";
  value: string | number;
}

export interface AutomationTrigger {
  type: TriggerType;
  platform: Platform;
  conditions: TriggerCondition[];
}

export interface AutomationAction {
  type: ActionType;
  config: {
    template?: string;
    targetPlatforms?: Platform[];
    webhookUrl?: string;
    emailTo?: string;
    listName?: string;
    delay?: number; // seconds
    variables?: Record<string, string>;
  };
}

export interface AutomationRule {
  id: string;
  userId: string;
  name: string;
  description?: string;
  enabled: boolean;
  trigger: AutomationTrigger;
  actions: AutomationAction[];
  conditions?: {
    maxExecutionsPerDay?: number;
    activeHours?: { start: number; end: number };
    activeDays?: number[]; // 0-6 (Sun-Sat)
    cooldownMinutes?: number;
  };
  stats: {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    lastExecutedAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface RuleExecution {
  id: string;
  ruleId: string;
  userId: string;
  triggerData: Record<string, any>;
  actionResults: {
    action: ActionType;
    success: boolean;
    result?: any;
    error?: string;
  }[];
  executedAt: Date;
}

export interface RuleTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  trigger: AutomationTrigger;
  actions: AutomationAction[];
  popularity: number;
}

// In-memory storage
const automationRules = new Map<string, AutomationRule>();
const userRules = new Map<string, Set<string>>();
const ruleExecutions = new Map<string, RuleExecution[]>();

// Trigger definitions
export const TRIGGER_DEFINITIONS: Record<TriggerType, {
  name: string;
  description: string;
  fields: { name: string; type: string; options?: string[] }[];
}> = {
  new_follower: {
    name: "New Follower",
    description: "When someone follows your account",
    fields: [
      { name: "followerCount", type: "number" },
      { name: "isVerified", type: "boolean" },
    ],
  },
  mention: {
    name: "Mention",
    description: "When someone mentions your account",
    fields: [
      { name: "authorFollowers", type: "number" },
      { name: "sentiment", type: "select", options: ["positive", "neutral", "negative"] },
    ],
  },
  comment: {
    name: "New Comment",
    description: "When someone comments on your post",
    fields: [
      { name: "commentText", type: "text" },
      { name: "authorUsername", type: "text" },
    ],
  },
  dm_received: {
    name: "DM Received",
    description: "When you receive a direct message",
    fields: [
      { name: "messageText", type: "text" },
      { name: "isFollower", type: "boolean" },
    ],
  },
  post_engagement: {
    name: "Post Engagement Milestone",
    description: "When a post reaches certain engagement levels",
    fields: [
      { name: "likes", type: "number" },
      { name: "comments", type: "number" },
      { name: "shares", type: "number" },
    ],
  },
  keyword_detected: {
    name: "Keyword Detected",
    description: "When specific keywords are found in mentions/comments",
    fields: [
      { name: "keywords", type: "text" },
      { name: "source", type: "select", options: ["mentions", "comments", "both"] },
    ],
  },
  scheduled_time: {
    name: "Scheduled Time",
    description: "At a specific time or recurring schedule",
    fields: [
      { name: "time", type: "time" },
      { name: "frequency", type: "select", options: ["once", "daily", "weekly", "monthly"] },
    ],
  },
  hashtag_used: {
    name: "Hashtag Used",
    description: "When specific hashtags are used in posts mentioning you",
    fields: [
      { name: "hashtags", type: "text" },
    ],
  },
  competitor_post: {
    name: "Competitor Post",
    description: "When a competitor posts new content",
    fields: [
      { name: "competitorHandle", type: "text" },
      { name: "contentType", type: "select", options: ["any", "text", "image", "video"] },
    ],
  },
  sentiment_change: {
    name: "Sentiment Change",
    description: "When overall sentiment changes significantly",
    fields: [
      { name: "direction", type: "select", options: ["positive", "negative", "any"] },
      { name: "threshold", type: "number" },
    ],
  },
};

// Action definitions
export const ACTION_DEFINITIONS: Record<ActionType, {
  name: string;
  description: string;
  config: { name: string; type: string; required: boolean }[];
}> = {
  send_dm: {
    name: "Send DM",
    description: "Send a direct message",
    config: [
      { name: "template", type: "textarea", required: true },
    ],
  },
  reply_comment: {
    name: "Reply to Comment",
    description: "Automatically reply to a comment",
    config: [
      { name: "template", type: "textarea", required: true },
    ],
  },
  like_post: {
    name: "Like Post",
    description: "Automatically like a post",
    config: [],
  },
  repost: {
    name: "Repost/Share",
    description: "Repost or share content",
    config: [
      { name: "addComment", type: "textarea", required: false },
    ],
  },
  cross_post: {
    name: "Cross-post",
    description: "Post to other platforms",
    config: [
      { name: "targetPlatforms", type: "multiselect", required: true },
      { name: "adaptContent", type: "boolean", required: false },
    ],
  },
  send_notification: {
    name: "Send Notification",
    description: "Send a push/in-app notification",
    config: [
      { name: "message", type: "text", required: true },
    ],
  },
  add_to_list: {
    name: "Add to List",
    description: "Add user to a list",
    config: [
      { name: "listName", type: "text", required: true },
    ],
  },
  pause_schedule: {
    name: "Pause Schedule",
    description: "Pause scheduled posts",
    config: [
      { name: "duration", type: "number", required: true },
    ],
  },
  trigger_webhook: {
    name: "Trigger Webhook",
    description: "Send data to an external webhook",
    config: [
      { name: "webhookUrl", type: "url", required: true },
    ],
  },
  send_email: {
    name: "Send Email",
    description: "Send an email notification",
    config: [
      { name: "emailTo", type: "email", required: true },
      { name: "subject", type: "text", required: true },
      { name: "body", type: "textarea", required: true },
    ],
  },
  create_task: {
    name: "Create Task",
    description: "Create a task in your task list",
    config: [
      { name: "taskTitle", type: "text", required: true },
      { name: "priority", type: "select", required: false },
    ],
  },
};

// CRUD operations
export function createAutomationRule(
  userId: string,
  data: Omit<AutomationRule, "id" | "userId" | "stats" | "createdAt" | "updatedAt">
): AutomationRule {
  const rule: AutomationRule = {
    id: crypto.randomUUID(),
    userId,
    ...data,
    stats: {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  automationRules.set(rule.id, rule);

  if (!userRules.has(userId)) {
    userRules.set(userId, new Set());
  }
  userRules.get(userId)!.add(rule.id);

  return rule;
}

export function getUserAutomationRules(userId: string): AutomationRule[] {
  const ruleIds = userRules.get(userId);
  if (!ruleIds) return [];

  return Array.from(ruleIds)
    .map((id) => automationRules.get(id))
    .filter((r): r is AutomationRule => r !== undefined)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function getAutomationRule(ruleId: string, userId: string): AutomationRule | null {
  const rule = automationRules.get(ruleId);
  if (!rule || rule.userId !== userId) return null;
  return rule;
}

export function updateAutomationRule(
  ruleId: string,
  userId: string,
  updates: Partial<Pick<AutomationRule, "name" | "description" | "enabled" | "trigger" | "actions" | "conditions">>
): AutomationRule | null {
  const rule = automationRules.get(ruleId);
  if (!rule || rule.userId !== userId) return null;

  const updatedRule: AutomationRule = {
    ...rule,
    ...updates,
    updatedAt: new Date(),
  };

  automationRules.set(ruleId, updatedRule);
  return updatedRule;
}

export function toggleAutomationRule(ruleId: string, userId: string): AutomationRule | null {
  const rule = automationRules.get(ruleId);
  if (!rule || rule.userId !== userId) return null;

  rule.enabled = !rule.enabled;
  rule.updatedAt = new Date();
  automationRules.set(ruleId, rule);
  return rule;
}

export function deleteAutomationRule(ruleId: string, userId: string): boolean {
  const rule = automationRules.get(ruleId);
  if (!rule || rule.userId !== userId) return false;

  automationRules.delete(ruleId);
  userRules.get(userId)?.delete(ruleId);
  return true;
}

// Execution tracking
export function recordExecution(
  ruleId: string,
  userId: string,
  triggerData: Record<string, any>,
  actionResults: RuleExecution["actionResults"]
): RuleExecution {
  const execution: RuleExecution = {
    id: crypto.randomUUID(),
    ruleId,
    userId,
    triggerData,
    actionResults,
    executedAt: new Date(),
  };

  if (!ruleExecutions.has(ruleId)) {
    ruleExecutions.set(ruleId, []);
  }
  ruleExecutions.get(ruleId)!.unshift(execution);

  // Keep only last 100 executions per rule
  const executions = ruleExecutions.get(ruleId)!;
  if (executions.length > 100) {
    ruleExecutions.set(ruleId, executions.slice(0, 100));
  }

  // Update rule stats
  const rule = automationRules.get(ruleId);
  if (rule) {
    rule.stats.totalExecutions++;
    const allSuccess = actionResults.every((r) => r.success);
    if (allSuccess) {
      rule.stats.successfulExecutions++;
    } else {
      rule.stats.failedExecutions++;
    }
    rule.stats.lastExecutedAt = new Date();
    automationRules.set(ruleId, rule);
  }

  return execution;
}

export function getRuleExecutions(ruleId: string, userId: string): RuleExecution[] {
  const rule = automationRules.get(ruleId);
  if (!rule || rule.userId !== userId) return [];

  return ruleExecutions.get(ruleId) || [];
}

// Rule validation
export function validateRule(rule: Partial<AutomationRule>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!rule.name || rule.name.trim().length === 0) {
    errors.push("Rule name is required");
  }

  if (!rule.trigger) {
    errors.push("Trigger is required");
  } else if (!TRIGGER_DEFINITIONS[rule.trigger.type]) {
    errors.push("Invalid trigger type");
  }

  if (!rule.actions || rule.actions.length === 0) {
    errors.push("At least one action is required");
  } else {
    for (const action of rule.actions) {
      if (!ACTION_DEFINITIONS[action.type]) {
        errors.push(`Invalid action type: ${action.type}`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// Rule templates
export const RULE_TEMPLATES: RuleTemplate[] = [
  {
    id: "welcome-dm",
    name: "Welcome New Followers",
    description: "Send a welcome DM to new followers",
    category: "engagement",
    trigger: {
      type: "new_follower",
      platform: "all",
      conditions: [],
    },
    actions: [
      {
        type: "send_dm",
        config: {
          template: "Thanks for following! We're excited to connect with you. Feel free to reach out if you have any questions! 👋",
          delay: 60,
        },
      },
    ],
    popularity: 95,
  },
  {
    id: "auto-thank-mention",
    name: "Thank for Mentions",
    description: "Reply to mentions with a thank you",
    category: "engagement",
    trigger: {
      type: "mention",
      platform: "all",
      conditions: [{ field: "sentiment", operator: "equals", value: "positive" }],
    },
    actions: [
      {
        type: "reply_comment",
        config: {
          template: "Thanks for the mention! We really appreciate it! 🙏",
        },
      },
    ],
    popularity: 88,
  },
  {
    id: "viral-alert",
    name: "Viral Content Alert",
    description: "Get notified when a post goes viral",
    category: "monitoring",
    trigger: {
      type: "post_engagement",
      platform: "all",
      conditions: [{ field: "likes", operator: "greater_than", value: 1000 }],
    },
    actions: [
      {
        type: "send_notification",
        config: {
          message: "🔥 Your post is going viral! Check it out!",
        },
      },
      {
        type: "send_email",
        config: {
          subject: "Viral Content Alert",
          body: "One of your posts has reached over 1000 likes!",
        },
      },
    ],
    popularity: 82,
  },
  {
    id: "cross-post-popular",
    name: "Cross-post Popular Content",
    description: "Automatically share popular posts to other platforms",
    category: "distribution",
    trigger: {
      type: "post_engagement",
      platform: "twitter",
      conditions: [{ field: "likes", operator: "greater_than", value: 500 }],
    },
    actions: [
      {
        type: "cross_post",
        config: {
          targetPlatforms: ["linkedin", "facebook"],
          variables: { addNote: "This post resonated on X, sharing here too!" },
        },
      },
    ],
    popularity: 75,
  },
  {
    id: "negative-sentiment-alert",
    name: "Negative Sentiment Alert",
    description: "Get alerted when sentiment turns negative",
    category: "monitoring",
    trigger: {
      type: "sentiment_change",
      platform: "all",
      conditions: [
        { field: "direction", operator: "equals", value: "negative" },
        { field: "threshold", operator: "greater_than", value: 20 },
      ],
    },
    actions: [
      {
        type: "send_notification",
        config: {
          message: "⚠️ Negative sentiment detected! Review your mentions.",
        },
      },
      {
        type: "pause_schedule",
        config: {
          duration: 60, // 1 hour
        },
      },
    ],
    popularity: 70,
  },
  {
    id: "keyword-response",
    name: "Keyword Auto-Response",
    description: "Respond to specific keywords in comments",
    category: "engagement",
    trigger: {
      type: "keyword_detected",
      platform: "all",
      conditions: [{ field: "keywords", operator: "contains", value: "price,pricing,cost,how much" }],
    },
    actions: [
      {
        type: "reply_comment",
        config: {
          template: "Great question! Check out our pricing page for all the details: [link]. Let us know if you have any questions!",
        },
      },
    ],
    popularity: 68,
  },
  {
    id: "competitor-monitor",
    name: "Competitor Activity Monitor",
    description: "Get notified when competitors post",
    category: "monitoring",
    trigger: {
      type: "competitor_post",
      platform: "twitter",
      conditions: [],
    },
    actions: [
      {
        type: "send_notification",
        config: {
          message: "📊 Competitor just posted new content. Check it out!",
        },
      },
      {
        type: "create_task",
        config: {
          taskTitle: "Review competitor post and consider response",
          priority: "medium",
        },
      },
    ],
    popularity: 65,
  },
];

export function getRuleTemplates(category?: string): RuleTemplate[] {
  let templates = [...RULE_TEMPLATES];
  if (category) {
    templates = templates.filter((t) => t.category === category);
  }
  return templates.sort((a, b) => b.popularity - a.popularity);
}

export function createRuleFromTemplate(
  userId: string,
  templateId: string,
  customizations?: Partial<Pick<AutomationRule, "name" | "actions">>
): AutomationRule | null {
  const template = RULE_TEMPLATES.find((t) => t.id === templateId);
  if (!template) return null;

  return createAutomationRule(userId, {
    name: customizations?.name || template.name,
    description: template.description,
    enabled: false, // Start disabled for safety
    trigger: template.trigger,
    actions: customizations?.actions || template.actions,
  });
}

// Analytics
export function getAutomationStats(userId: string): {
  totalRules: number;
  activeRules: number;
  totalExecutions: number;
  successRate: number;
  topPerformingRules: { ruleId: string; name: string; executions: number }[];
  executionsByDay: Record<string, number>;
} {
  const rules = getUserAutomationRules(userId);

  const totalRules = rules.length;
  const activeRules = rules.filter((r) => r.enabled).length;
  const totalExecutions = rules.reduce((sum, r) => sum + r.stats.totalExecutions, 0);
  const successfulExecutions = rules.reduce((sum, r) => sum + r.stats.successfulExecutions, 0);
  const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;

  const topPerformingRules = rules
    .filter((r) => r.stats.totalExecutions > 0)
    .sort((a, b) => b.stats.totalExecutions - a.stats.totalExecutions)
    .slice(0, 5)
    .map((r) => ({
      ruleId: r.id,
      name: r.name,
      executions: r.stats.totalExecutions,
    }));

  // Mock executions by day (last 7 days)
  const executionsByDay: Record<string, number> = {};
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateKey = date.toISOString().split("T")[0];
    executionsByDay[dateKey] = Math.floor(Math.random() * 50) + 10;
  }

  return {
    totalRules,
    activeRules,
    totalExecutions,
    successRate: Math.round(successRate * 100) / 100,
    topPerformingRules,
    executionsByDay,
  };
}
