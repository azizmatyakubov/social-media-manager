// Competitor Content Alerts System

export interface TrackedCompetitor {
  id: string;
  userId: string;
  name: string;
  handle: string;
  platform: string;
  avatarUrl: string;
  followers: number;
  verified: boolean;
  trackingSince: Date;
  isActive: boolean;
  postFrequency: number; // posts per week
  avgEngagement: number;
  lastChecked: Date;
}

export interface CompetitorPost {
  id: string;
  competitorId: string;
  platform: string;
  content: string;
  type: "text" | "image" | "video" | "carousel" | "story" | "reel";
  publishedAt: Date;
  metrics: {
    likes: number;
    comments: number;
    shares: number;
    views?: number;
    saves?: number;
  };
  engagementRate: number;
  viralScore: number;
  hashtags: string[];
  mentions: string[];
  links: string[];
  mediaUrls: string[];
  sentiment: "positive" | "neutral" | "negative";
  isViral: boolean;
  wasAlerted: boolean;
}

export interface AlertRule {
  id: string;
  userId: string;
  name: string;
  type: AlertRuleType;
  conditions: AlertCondition[];
  actions: AlertAction[];
  competitorIds: string[]; // empty means all competitors
  platforms: string[]; // empty means all platforms
  isEnabled: boolean;
  priority: "low" | "medium" | "high" | "critical";
  createdAt: Date;
  triggeredCount: number;
  lastTriggered?: Date;
}

export type AlertRuleType =
  | "new_post"
  | "viral_content"
  | "engagement_spike"
  | "keyword_mention"
  | "hashtag_usage"
  | "campaign_launch"
  | "product_announcement"
  | "negative_sentiment";

export interface AlertCondition {
  field: string;
  operator: "equals" | "contains" | "greater_than" | "less_than" | "matches_regex";
  value: string | number;
}

export interface AlertAction {
  type: "email" | "push" | "slack" | "webhook" | "in_app";
  config: Record<string, string>;
}

export interface ContentAlert {
  id: string;
  userId: string;
  ruleId: string;
  competitorId: string;
  postId: string;
  type: AlertRuleType;
  title: string;
  message: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "unread" | "read" | "dismissed" | "actioned";
  metadata: {
    competitorName: string;
    platform: string;
    engagementRate?: number;
    viralScore?: number;
    keywords?: string[];
  };
  createdAt: Date;
  readAt?: Date;
  actionedAt?: Date;
}

export interface AlertDigest {
  id: string;
  userId: string;
  period: "daily" | "weekly";
  startDate: Date;
  endDate: Date;
  summary: {
    totalAlerts: number;
    byPriority: Record<string, number>;
    byType: Record<string, number>;
    topCompetitors: Array<{ name: string; alertCount: number }>;
    viralContent: number;
  };
  alerts: ContentAlert[];
  insights: string[];
  createdAt: Date;
}

// In-memory storage
const competitorsStore = new Map<string, TrackedCompetitor>();
const postsStore = new Map<string, CompetitorPost>();
const rulesStore = new Map<string, AlertRule>();
const alertsStore = new Map<string, ContentAlert>();

// Alert rule types
export const ALERT_RULE_TYPES: { type: AlertRuleType; label: string; description: string }[] = [
  { type: "new_post", label: "New Post", description: "Alert when a competitor posts new content" },
  { type: "viral_content", label: "Viral Content", description: "Alert when competitor content goes viral" },
  { type: "engagement_spike", label: "Engagement Spike", description: "Alert on unusual engagement activity" },
  { type: "keyword_mention", label: "Keyword Mention", description: "Alert when specific keywords are mentioned" },
  { type: "hashtag_usage", label: "Hashtag Usage", description: "Alert when specific hashtags are used" },
  { type: "campaign_launch", label: "Campaign Launch", description: "Detect new marketing campaigns" },
  { type: "product_announcement", label: "Product Announcement", description: "Alert on new product launches" },
  { type: "negative_sentiment", label: "Negative Sentiment", description: "Alert on negative competitor content" },
];

// Demo data generators
function generateDemoCompetitors(userId: string): TrackedCompetitor[] {
  const competitors: TrackedCompetitor[] = [
    {
      id: `comp-1-${userId}`,
      userId,
      name: "TechRival Inc",
      handle: "@techrival",
      platform: "twitter",
      avatarUrl: "",
      followers: 125000,
      verified: true,
      trackingSince: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      isActive: true,
      postFrequency: 21,
      avgEngagement: 3.2,
      lastChecked: new Date(Date.now() - 5 * 60 * 1000),
    },
    {
      id: `comp-2-${userId}`,
      userId,
      name: "MarketLeader Co",
      handle: "@marketleader",
      platform: "instagram",
      avatarUrl: "",
      followers: 450000,
      verified: true,
      trackingSince: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      isActive: true,
      postFrequency: 14,
      avgEngagement: 4.5,
      lastChecked: new Date(Date.now() - 10 * 60 * 1000),
    },
    {
      id: `comp-3-${userId}`,
      userId,
      name: "StartupDisruptor",
      handle: "@startupdisruptor",
      platform: "linkedin",
      avatarUrl: "",
      followers: 85000,
      verified: false,
      trackingSince: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      isActive: true,
      postFrequency: 7,
      avgEngagement: 2.8,
      lastChecked: new Date(Date.now() - 15 * 60 * 1000),
    },
    {
      id: `comp-4-${userId}`,
      userId,
      name: "IndustryGiant",
      handle: "@industrygiant",
      platform: "facebook",
      avatarUrl: "",
      followers: 2500000,
      verified: true,
      trackingSince: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
      isActive: true,
      postFrequency: 28,
      avgEngagement: 1.8,
      lastChecked: new Date(Date.now() - 2 * 60 * 1000),
    },
  ];

  competitors.forEach((c) => competitorsStore.set(c.id, c));
  return competitors;
}

function generateDemoPosts(userId: string, competitors: TrackedCompetitor[]): CompetitorPost[] {
  const posts: CompetitorPost[] = [];
  const contentTypes: CompetitorPost["type"][] = ["text", "image", "video", "carousel"];

  competitors.forEach((competitor) => {
    const numPosts = Math.floor(Math.random() * 5) + 3;
    for (let i = 0; i < numPosts; i++) {
      const isViral = Math.random() > 0.8;
      const post: CompetitorPost = {
        id: `post-${competitor.id}-${i}`,
        competitorId: competitor.id,
        platform: competitor.platform,
        content: getRandomPostContent(i),
        type: contentTypes[Math.floor(Math.random() * contentTypes.length)],
        publishedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        metrics: {
          likes: Math.floor(Math.random() * 5000) + 100,
          comments: Math.floor(Math.random() * 500) + 10,
          shares: Math.floor(Math.random() * 200) + 5,
          views: Math.floor(Math.random() * 50000) + 1000,
        },
        engagementRate: Math.random() * 5 + 1,
        viralScore: isViral ? Math.random() * 50 + 50 : Math.random() * 40,
        hashtags: ["#marketing", "#growth", "#socialmedia"].slice(0, Math.floor(Math.random() * 3) + 1),
        mentions: [],
        links: [],
        mediaUrls: [],
        sentiment: Math.random() > 0.2 ? "positive" : Math.random() > 0.5 ? "neutral" : "negative",
        isViral,
        wasAlerted: Math.random() > 0.5,
      };
      posts.push(post);
      postsStore.set(post.id, post);
    }
  });

  return posts;
}

function getRandomPostContent(index: number): string {
  const contents = [
    "Excited to announce our new product launch! 🚀 Check out our latest innovation...",
    "Behind the scenes at our latest team event. Culture matters! #teamwork",
    "New case study: How we helped Company X achieve 200% growth in 6 months",
    "Join us for our upcoming webinar on industry trends. Link in bio!",
    "Customer success story: See how our solution transformed their business",
    "We're hiring! Looking for talented individuals to join our growing team",
    "Product update: New features just dropped! Here's what's new...",
    "Thank you to our amazing community for 100K followers! 🎉",
  ];
  return contents[index % contents.length];
}

function generateDemoAlerts(userId: string, posts: CompetitorPost[]): ContentAlert[] {
  const alerts: ContentAlert[] = [];
  const priorities: ContentAlert["priority"][] = ["low", "medium", "high", "critical"];
  const alertTypes: AlertRuleType[] = ["new_post", "viral_content", "engagement_spike", "keyword_mention"];

  const recentPosts = posts
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    .slice(0, 10);

  recentPosts.forEach((post, index) => {
    const competitor = competitorsStore.get(post.competitorId);
    if (!competitor) return;

    const type = alertTypes[index % alertTypes.length];
    const priority = post.isViral ? "high" : priorities[Math.floor(Math.random() * 3)];

    const alert: ContentAlert = {
      id: `alert-${post.id}`,
      userId,
      ruleId: "demo-rule",
      competitorId: post.competitorId,
      postId: post.id,
      type,
      title: getAlertTitle(type, competitor.name),
      message: getAlertMessage(type, competitor.name, post),
      priority,
      status: index < 3 ? "unread" : index < 6 ? "read" : "actioned",
      metadata: {
        competitorName: competitor.name,
        platform: competitor.platform,
        engagementRate: post.engagementRate,
        viralScore: post.viralScore,
      },
      createdAt: new Date(post.publishedAt.getTime() + 5 * 60 * 1000),
      readAt: index >= 3 ? new Date() : undefined,
    };
    alerts.push(alert);
    alertsStore.set(alert.id, alert);
  });

  return alerts;
}

function getAlertTitle(type: AlertRuleType, competitorName: string): string {
  switch (type) {
    case "new_post":
      return `New post from ${competitorName}`;
    case "viral_content":
      return `Viral content detected: ${competitorName}`;
    case "engagement_spike":
      return `Engagement spike: ${competitorName}`;
    case "keyword_mention":
      return `Keyword match: ${competitorName}`;
    default:
      return `Alert: ${competitorName}`;
  }
}

function getAlertMessage(type: AlertRuleType, competitorName: string, post: CompetitorPost): string {
  switch (type) {
    case "new_post":
      return `${competitorName} just published new ${post.type} content with ${post.metrics.likes} likes so far.`;
    case "viral_content":
      return `${competitorName}'s post is going viral with a ${post.viralScore.toFixed(0)}% viral score and ${post.engagementRate.toFixed(1)}% engagement rate.`;
    case "engagement_spike":
      return `${competitorName}'s recent post shows ${post.engagementRate.toFixed(1)}% engagement, significantly above their average.`;
    case "keyword_mention":
      return `${competitorName} mentioned tracked keywords in their latest post.`;
    default:
      return `New activity detected from ${competitorName}.`;
  }
}

function generateDemoRules(userId: string): AlertRule[] {
  const rules: AlertRule[] = [
    {
      id: `rule-1-${userId}`,
      userId,
      name: "Viral Content Alert",
      type: "viral_content",
      conditions: [{ field: "viralScore", operator: "greater_than", value: 50 }],
      actions: [{ type: "in_app", config: {} }, { type: "email", config: { template: "viral_alert" } }],
      competitorIds: [],
      platforms: [],
      isEnabled: true,
      priority: "high",
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      triggeredCount: 12,
      lastTriggered: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      id: `rule-2-${userId}`,
      userId,
      name: "New Post Notifications",
      type: "new_post",
      conditions: [],
      actions: [{ type: "in_app", config: {} }],
      competitorIds: [],
      platforms: [],
      isEnabled: true,
      priority: "low",
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      triggeredCount: 156,
      lastTriggered: new Date(Date.now() - 4 * 60 * 60 * 1000),
    },
    {
      id: `rule-3-${userId}`,
      userId,
      name: "Product Launch Detection",
      type: "product_announcement",
      conditions: [{ field: "content", operator: "contains", value: "launch" }],
      actions: [{ type: "in_app", config: {} }, { type: "slack", config: { channel: "#marketing" } }],
      competitorIds: [],
      platforms: [],
      isEnabled: true,
      priority: "critical",
      createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      triggeredCount: 5,
      lastTriggered: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    },
  ];

  rules.forEach((r) => rulesStore.set(r.id, r));
  return rules;
}

// Initialize demo data
function initializeDemoData(userId: string): void {
  const demoKey = `demo-init-${userId}`;
  if (competitorsStore.has(`comp-1-${userId}`)) return;

  const competitors = generateDemoCompetitors(userId);
  const posts = generateDemoPosts(userId, competitors);
  generateDemoAlerts(userId, posts);
  generateDemoRules(userId);
}

// API Functions
export function getTrackedCompetitors(userId: string): TrackedCompetitor[] {
  initializeDemoData(userId);
  return Array.from(competitorsStore.values())
    .filter((c) => c.userId === userId)
    .sort((a, b) => b.followers - a.followers);
}

export function getCompetitor(competitorId: string): TrackedCompetitor | null {
  return competitorsStore.get(competitorId) || null;
}

export function addCompetitor(
  userId: string,
  data: Omit<TrackedCompetitor, "id" | "userId" | "trackingSince" | "lastChecked">
): TrackedCompetitor {
  const competitor: TrackedCompetitor = {
    ...data,
    id: `comp-${Date.now()}`,
    userId,
    trackingSince: new Date(),
    lastChecked: new Date(),
  };
  competitorsStore.set(competitor.id, competitor);
  return competitor;
}

export function updateCompetitor(
  competitorId: string,
  userId: string,
  updates: Partial<TrackedCompetitor>
): TrackedCompetitor | null {
  const competitor = competitorsStore.get(competitorId);
  if (!competitor || competitor.userId !== userId) return null;
  const updated = { ...competitor, ...updates };
  competitorsStore.set(competitorId, updated);
  return updated;
}

export function removeCompetitor(competitorId: string, userId: string): boolean {
  const competitor = competitorsStore.get(competitorId);
  if (!competitor || competitor.userId !== userId) return false;
  return competitorsStore.delete(competitorId);
}

export function getCompetitorPosts(competitorId: string, limit = 20): CompetitorPost[] {
  return Array.from(postsStore.values())
    .filter((p) => p.competitorId === competitorId)
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    .slice(0, limit);
}

export function getAllRecentPosts(userId: string, limit = 50): CompetitorPost[] {
  initializeDemoData(userId);
  const competitors = getTrackedCompetitors(userId);
  const competitorIds = new Set(competitors.map((c) => c.id));

  return Array.from(postsStore.values())
    .filter((p) => competitorIds.has(p.competitorId))
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    .slice(0, limit);
}

export function getAlertRules(userId: string): AlertRule[] {
  initializeDemoData(userId);
  return Array.from(rulesStore.values())
    .filter((r) => r.userId === userId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function getAlertRule(ruleId: string): AlertRule | null {
  return rulesStore.get(ruleId) || null;
}

export function createAlertRule(
  userId: string,
  data: Omit<AlertRule, "id" | "userId" | "createdAt" | "triggeredCount">
): AlertRule {
  const rule: AlertRule = {
    ...data,
    id: `rule-${Date.now()}`,
    userId,
    createdAt: new Date(),
    triggeredCount: 0,
  };
  rulesStore.set(rule.id, rule);
  return rule;
}

export function updateAlertRule(
  ruleId: string,
  userId: string,
  updates: Partial<AlertRule>
): AlertRule | null {
  const rule = rulesStore.get(ruleId);
  if (!rule || rule.userId !== userId) return null;
  const updated = { ...rule, ...updates };
  rulesStore.set(ruleId, updated);
  return updated;
}

export function deleteAlertRule(ruleId: string, userId: string): boolean {
  const rule = rulesStore.get(ruleId);
  if (!rule || rule.userId !== userId) return false;
  return rulesStore.delete(ruleId);
}

export function getAlerts(
  userId: string,
  options?: {
    status?: ContentAlert["status"];
    priority?: ContentAlert["priority"];
    competitorId?: string;
    limit?: number;
  }
): ContentAlert[] {
  initializeDemoData(userId);
  let alerts = Array.from(alertsStore.values()).filter((a) => a.userId === userId);

  if (options?.status) {
    alerts = alerts.filter((a) => a.status === options.status);
  }
  if (options?.priority) {
    alerts = alerts.filter((a) => a.priority === options.priority);
  }
  if (options?.competitorId) {
    alerts = alerts.filter((a) => a.competitorId === options.competitorId);
  }

  return alerts
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, options?.limit || 100);
}

export function updateAlertStatus(
  alertId: string,
  userId: string,
  status: ContentAlert["status"]
): ContentAlert | null {
  const alert = alertsStore.get(alertId);
  if (!alert || alert.userId !== userId) return null;

  alert.status = status;
  if (status === "read") {
    alert.readAt = new Date();
  } else if (status === "actioned") {
    alert.actionedAt = new Date();
  }

  alertsStore.set(alertId, alert);
  return alert;
}

export function markAllAlertsRead(userId: string): number {
  let count = 0;
  alertsStore.forEach((alert) => {
    if (alert.userId === userId && alert.status === "unread") {
      alert.status = "read";
      alert.readAt = new Date();
      count++;
    }
  });
  return count;
}

export function getAlertStats(userId: string): {
  totalAlerts: number;
  unreadAlerts: number;
  criticalAlerts: number;
  todayAlerts: number;
  trackedCompetitors: number;
  activeRules: number;
  viralContent: number;
  avgResponseTime: number;
} {
  initializeDemoData(userId);
  const alerts = getAlerts(userId);
  const competitors = getTrackedCompetitors(userId);
  const rules = getAlertRules(userId);
  const posts = getAllRecentPosts(userId);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayAlerts = alerts.filter((a) => new Date(a.createdAt) >= today).length;
  const viralContent = posts.filter((p) => p.isViral).length;

  return {
    totalAlerts: alerts.length,
    unreadAlerts: alerts.filter((a) => a.status === "unread").length,
    criticalAlerts: alerts.filter((a) => a.priority === "critical" && a.status === "unread").length,
    todayAlerts,
    trackedCompetitors: competitors.length,
    activeRules: rules.filter((r) => r.isEnabled).length,
    viralContent,
    avgResponseTime: 2.5, // hours (demo value)
  };
}

export const PLATFORMS = [
  { id: "twitter", name: "X (Twitter)", icon: "𝕏" },
  { id: "instagram", name: "Instagram", icon: "📸" },
  { id: "facebook", name: "Facebook", icon: "📘" },
  { id: "linkedin", name: "LinkedIn", icon: "💼" },
  { id: "tiktok", name: "TikTok", icon: "🎵" },
  { id: "youtube", name: "YouTube", icon: "▶️" },
];
