// Social Media Audit Tool - Comprehensive account analysis and recommendations

export interface AuditProfile {
  platform: string;
  username: string;
  displayName: string;
  bio: string;
  profileImageUrl: string;
  coverImageUrl: string;
  website: string;
  location: string;
  verified: boolean;
  followers: number;
  following: number;
  postsCount: number;
  createdAt: Date;
}

export interface AuditMetrics {
  engagementRate: number;
  avgLikes: number;
  avgComments: number;
  avgShares: number;
  avgReach: number;
  avgImpressions: number;
  followerGrowthRate: number;
  postingFrequency: number; // posts per week
  responseRate: number;
  responseTime: number; // in hours
  bestPostingTimes: string[];
  bestPostingDays: string[];
  topHashtags: string[];
  contentMix: Record<string, number>; // e.g., { image: 40, video: 30, text: 20, carousel: 10 }
}

export interface AuditCategory {
  name: string;
  score: number; // 0-100
  maxScore: number;
  weight: number;
  issues: AuditIssue[];
  recommendations: string[];
}

export interface AuditIssue {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  impact: string;
  recommendation: string;
  category: string;
}

export interface AuditBenchmark {
  metric: string;
  yourValue: number;
  industryAvg: number;
  topPerformers: number;
  percentile: number;
  status: "above" | "average" | "below";
}

export interface ContentAuditItem {
  postId: string;
  content: string;
  type: string;
  publishedAt: Date;
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  engagementRate: number;
  sentiment: "positive" | "neutral" | "negative";
  performanceScore: number;
  issues: string[];
}

export interface SocialAudit {
  id: string;
  userId: string;
  name: string;
  platforms: string[];
  profiles: AuditProfile[];
  metrics: Record<string, AuditMetrics>;
  categories: AuditCategory[];
  overallScore: number;
  benchmarks: AuditBenchmark[];
  topContent: ContentAuditItem[];
  worstContent: ContentAuditItem[];
  issues: AuditIssue[];
  actionPlan: ActionPlanItem[];
  status: "pending" | "in_progress" | "completed" | "failed";
  createdAt: Date;
  completedAt?: Date;
  expiresAt: Date;
}

export interface ActionPlanItem {
  id: string;
  priority: number;
  category: string;
  title: string;
  description: string;
  expectedImpact: string;
  effort: "low" | "medium" | "high";
  timeframe: string;
  completed: boolean;
  completedAt?: Date;
}

export interface AuditTemplate {
  id: string;
  name: string;
  description: string;
  platforms: string[];
  categories: string[];
  isDefault: boolean;
}

// Audit categories
export const AUDIT_CATEGORIES = [
  "Profile Optimization",
  "Content Strategy",
  "Engagement Quality",
  "Posting Consistency",
  "Audience Growth",
  "Brand Consistency",
  "Hashtag Strategy",
  "Visual Quality",
  "Bio & CTA",
  "Response Management",
];

// Audit templates
const DEFAULT_TEMPLATES: AuditTemplate[] = [
  {
    id: "full-audit",
    name: "Full Social Media Audit",
    description: "Comprehensive analysis of all aspects of your social media presence",
    platforms: ["twitter", "instagram", "facebook", "linkedin", "tiktok"],
    categories: AUDIT_CATEGORIES,
    isDefault: true,
  },
  {
    id: "quick-audit",
    name: "Quick Health Check",
    description: "Fast assessment of key metrics and critical issues",
    platforms: ["twitter", "instagram", "facebook", "linkedin", "tiktok"],
    categories: ["Profile Optimization", "Content Strategy", "Engagement Quality"],
    isDefault: false,
  },
  {
    id: "engagement-audit",
    name: "Engagement Deep Dive",
    description: "Focused analysis on engagement and audience interaction",
    platforms: ["twitter", "instagram", "facebook", "linkedin", "tiktok"],
    categories: ["Engagement Quality", "Response Management", "Audience Growth"],
    isDefault: false,
  },
  {
    id: "content-audit",
    name: "Content Strategy Audit",
    description: "Detailed review of content performance and strategy",
    platforms: ["twitter", "instagram", "facebook", "linkedin", "tiktok"],
    categories: ["Content Strategy", "Posting Consistency", "Visual Quality", "Hashtag Strategy"],
    isDefault: false,
  },
  {
    id: "brand-audit",
    name: "Brand Consistency Audit",
    description: "Evaluate brand presence and messaging consistency",
    platforms: ["twitter", "instagram", "facebook", "linkedin", "tiktok"],
    categories: ["Brand Consistency", "Profile Optimization", "Bio & CTA", "Visual Quality"],
    isDefault: false,
  },
];

// In-memory storage
const auditsStore = new Map<string, SocialAudit>();
const templatesStore = new Map<string, AuditTemplate>();

// Initialize templates
DEFAULT_TEMPLATES.forEach((template) => {
  templatesStore.set(template.id, template);
});

// Generate demo audit data
function generateDemoAudit(userId: string): SocialAudit {
  const issues: AuditIssue[] = [
    {
      id: "issue-1",
      severity: "critical",
      title: "Profile Bio Missing CTA",
      description: "Your Instagram bio doesn't include a clear call-to-action",
      impact: "Reduces conversion rate by up to 30%",
      recommendation: "Add a compelling CTA with a link to your landing page",
      category: "Bio & CTA",
    },
    {
      id: "issue-2",
      severity: "warning",
      title: "Inconsistent Posting Schedule",
      description: "Your posting frequency varies significantly week to week",
      impact: "Algorithm may reduce your content visibility",
      recommendation: "Create a content calendar and stick to a consistent schedule",
      category: "Posting Consistency",
    },
    {
      id: "issue-3",
      severity: "warning",
      title: "Low Video Content Ratio",
      description: "Only 15% of your content is video, below the recommended 40%",
      impact: "Missing out on higher engagement from video content",
      recommendation: "Increase video content, especially Reels and short-form",
      category: "Content Strategy",
    },
    {
      id: "issue-4",
      severity: "info",
      title: "Underutilized Hashtag Potential",
      description: "You're using generic hashtags with high competition",
      impact: "Lower discoverability in hashtag searches",
      recommendation: "Mix popular hashtags with niche-specific ones",
      category: "Hashtag Strategy",
    },
    {
      id: "issue-5",
      severity: "critical",
      title: "Slow Response Time",
      description: "Average response time to comments is 18 hours",
      impact: "Hurts engagement and follower loyalty",
      recommendation: "Respond to comments within 2-4 hours during peak times",
      category: "Response Management",
    },
    {
      id: "issue-6",
      severity: "warning",
      title: "Profile Image Quality",
      description: "Profile image appears pixelated on larger displays",
      impact: "Reduces brand professionalism",
      recommendation: "Upload a high-resolution image (at least 400x400px)",
      category: "Visual Quality",
    },
  ];

  const categories: AuditCategory[] = [
    {
      name: "Profile Optimization",
      score: 72,
      maxScore: 100,
      weight: 15,
      issues: issues.filter((i) => i.category === "Profile Optimization"),
      recommendations: [
        "Complete all profile fields",
        "Use consistent branding across platforms",
        "Add location for local discoverability",
      ],
    },
    {
      name: "Content Strategy",
      score: 58,
      maxScore: 100,
      weight: 20,
      issues: issues.filter((i) => i.category === "Content Strategy"),
      recommendations: [
        "Increase video content to 40% of posts",
        "Create content pillars for consistency",
        "Use carousel posts for higher engagement",
      ],
    },
    {
      name: "Engagement Quality",
      score: 65,
      maxScore: 100,
      weight: 20,
      issues: issues.filter((i) => i.category === "Engagement Quality"),
      recommendations: [
        "Ask questions in captions to drive comments",
        "Host regular Q&A sessions",
        "Create shareable, save-worthy content",
      ],
    },
    {
      name: "Posting Consistency",
      score: 45,
      maxScore: 100,
      weight: 15,
      issues: issues.filter((i) => i.category === "Posting Consistency"),
      recommendations: [
        "Post at least 5 times per week",
        "Schedule content in advance",
        "Maintain consistent posting times",
      ],
    },
    {
      name: "Audience Growth",
      score: 70,
      maxScore: 100,
      weight: 10,
      issues: issues.filter((i) => i.category === "Audience Growth"),
      recommendations: [
        "Collaborate with complementary accounts",
        "Run engagement campaigns",
        "Leverage trending topics",
      ],
    },
    {
      name: "Hashtag Strategy",
      score: 55,
      maxScore: 100,
      weight: 5,
      issues: issues.filter((i) => i.category === "Hashtag Strategy"),
      recommendations: [
        "Research industry-specific hashtags",
        "Create a branded hashtag",
        "Rotate hashtag sets to avoid shadowbanning",
      ],
    },
    {
      name: "Bio & CTA",
      score: 40,
      maxScore: 100,
      weight: 5,
      issues: issues.filter((i) => i.category === "Bio & CTA"),
      recommendations: [
        "Add a clear call-to-action",
        "Include relevant keywords",
        "Use link-in-bio tool for multiple links",
      ],
    },
    {
      name: "Response Management",
      score: 35,
      maxScore: 100,
      weight: 10,
      issues: issues.filter((i) => i.category === "Response Management"),
      recommendations: [
        "Set up notification alerts for mentions",
        "Create response templates for common questions",
        "Dedicate time daily for engagement",
      ],
    },
  ];

  const benchmarks: AuditBenchmark[] = [
    { metric: "Engagement Rate", yourValue: 2.8, industryAvg: 2.5, topPerformers: 5.0, percentile: 58, status: "above" },
    { metric: "Follower Growth", yourValue: 1.2, industryAvg: 2.0, topPerformers: 5.0, percentile: 35, status: "below" },
    { metric: "Posts Per Week", yourValue: 4, industryAvg: 5, topPerformers: 14, percentile: 42, status: "below" },
    { metric: "Response Time (hrs)", yourValue: 18, industryAvg: 8, topPerformers: 2, percentile: 25, status: "below" },
    { metric: "Video Content %", yourValue: 15, industryAvg: 30, topPerformers: 50, percentile: 30, status: "below" },
    { metric: "Story Engagement", yourValue: 4.5, industryAvg: 4.0, topPerformers: 8.0, percentile: 55, status: "above" },
  ];

  const topContent: ContentAuditItem[] = [
    {
      postId: "post-1",
      content: "Behind the scenes of our latest product launch! 🚀",
      type: "video",
      publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      likes: 1250,
      comments: 89,
      shares: 45,
      reach: 15000,
      engagementRate: 9.2,
      sentiment: "positive",
      performanceScore: 95,
      issues: [],
    },
    {
      postId: "post-2",
      content: "Customer success story: How @client increased sales by 200%",
      type: "carousel",
      publishedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      likes: 980,
      comments: 67,
      shares: 120,
      reach: 12500,
      engagementRate: 9.3,
      sentiment: "positive",
      performanceScore: 92,
      issues: [],
    },
  ];

  const worstContent: ContentAuditItem[] = [
    {
      postId: "post-worst-1",
      content: "Happy Monday! #MondayMotivation",
      type: "image",
      publishedAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
      likes: 45,
      comments: 2,
      shares: 0,
      reach: 800,
      engagementRate: 0.6,
      sentiment: "neutral",
      performanceScore: 15,
      issues: ["Generic content", "Low engagement", "No value proposition"],
    },
    {
      postId: "post-worst-2",
      content: "Check out our website for more info",
      type: "text",
      publishedAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000),
      likes: 23,
      comments: 0,
      shares: 1,
      reach: 500,
      engagementRate: 0.5,
      sentiment: "neutral",
      performanceScore: 12,
      issues: ["No context", "Weak CTA", "Missing visual"],
    },
  ];

  const actionPlan: ActionPlanItem[] = [
    {
      id: "action-1",
      priority: 1,
      category: "Response Management",
      title: "Implement Response Time SLA",
      description: "Set up alerts and dedicated time blocks to respond to all comments within 4 hours",
      expectedImpact: "Improve engagement rate by 20-30%",
      effort: "low",
      timeframe: "This week",
      completed: false,
    },
    {
      id: "action-2",
      priority: 2,
      category: "Bio & CTA",
      title: "Optimize Bio with Strong CTA",
      description: "Rewrite bio to include value proposition, keywords, and clear call-to-action",
      expectedImpact: "Increase profile click-through by 25%",
      effort: "low",
      timeframe: "Today",
      completed: false,
    },
    {
      id: "action-3",
      priority: 3,
      category: "Content Strategy",
      title: "Increase Video Content Production",
      description: "Create a video content calendar with at least 3 videos per week",
      expectedImpact: "Boost reach by 40% and engagement by 25%",
      effort: "high",
      timeframe: "Next 2 weeks",
      completed: false,
    },
    {
      id: "action-4",
      priority: 4,
      category: "Posting Consistency",
      title: "Create Content Calendar",
      description: "Plan and schedule content for the next month with consistent posting times",
      expectedImpact: "Improve algorithm favorability and audience expectations",
      effort: "medium",
      timeframe: "This week",
      completed: false,
    },
    {
      id: "action-5",
      priority: 5,
      category: "Hashtag Strategy",
      title: "Develop Hashtag Research System",
      description: "Research and categorize hashtags by reach, create rotating sets",
      expectedImpact: "Improve discoverability by 15-20%",
      effort: "medium",
      timeframe: "Next week",
      completed: false,
    },
  ];

  const overallScore = Math.round(
    categories.reduce((sum, cat) => sum + (cat.score * cat.weight) / 100, 0)
  );

  return {
    id: `audit-demo-${userId}`,
    userId,
    name: "Full Account Audit - Demo",
    platforms: ["instagram", "twitter", "linkedin"],
    profiles: [
      {
        platform: "instagram",
        username: "yourcompany",
        displayName: "Your Company",
        bio: "We help businesses grow | DM for inquiries",
        profileImageUrl: "",
        coverImageUrl: "",
        website: "https://yourcompany.com",
        location: "San Francisco, CA",
        verified: false,
        followers: 12500,
        following: 850,
        postsCount: 342,
        createdAt: new Date("2020-03-15"),
      },
    ],
    metrics: {
      instagram: {
        engagementRate: 2.8,
        avgLikes: 350,
        avgComments: 25,
        avgShares: 12,
        avgReach: 4500,
        avgImpressions: 5200,
        followerGrowthRate: 1.2,
        postingFrequency: 4,
        responseRate: 65,
        responseTime: 18,
        bestPostingTimes: ["9:00 AM", "1:00 PM", "7:00 PM"],
        bestPostingDays: ["Tuesday", "Thursday", "Saturday"],
        topHashtags: ["#business", "#growth", "#marketing"],
        contentMix: { image: 50, video: 15, carousel: 25, text: 10 },
      },
    },
    categories,
    overallScore,
    benchmarks,
    topContent,
    worstContent,
    issues,
    actionPlan,
    status: "completed",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    completedAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  };
}

// Initialize demo data
function initializeDemoData(userId: string): void {
  if (!auditsStore.has(`audit-demo-${userId}`)) {
    const demoAudit = generateDemoAudit(userId);
    auditsStore.set(demoAudit.id, demoAudit);
  }
}

// Audit functions
export function getUserAudits(userId: string): SocialAudit[] {
  initializeDemoData(userId);
  return Array.from(auditsStore.values())
    .filter((audit) => audit.userId === userId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function getAudit(auditId: string): SocialAudit | null {
  return auditsStore.get(auditId) || null;
}

export function startAudit(
  userId: string,
  data: {
    name: string;
    templateId: string;
    platforms: string[];
    profiles: Array<{ platform: string; username: string }>;
  }
): SocialAudit {
  const template = templatesStore.get(data.templateId);

  // Simulate audit process
  const audit: SocialAudit = {
    id: `audit-${Date.now()}`,
    userId,
    name: data.name,
    platforms: data.platforms,
    profiles: data.profiles.map((p) => ({
      platform: p.platform,
      username: p.username,
      displayName: p.username,
      bio: "",
      profileImageUrl: "",
      coverImageUrl: "",
      website: "",
      location: "",
      verified: false,
      followers: Math.floor(Math.random() * 50000) + 1000,
      following: Math.floor(Math.random() * 2000) + 100,
      postsCount: Math.floor(Math.random() * 500) + 50,
      createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000 * 3),
    })),
    metrics: {},
    categories: [],
    overallScore: 0,
    benchmarks: [],
    topContent: [],
    worstContent: [],
    issues: [],
    actionPlan: [],
    status: "in_progress",
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  };

  auditsStore.set(audit.id, audit);

  // Simulate completion after a delay (in real app, this would be async)
  setTimeout(() => {
    completeAudit(audit.id, userId);
  }, 2000);

  return audit;
}

function completeAudit(auditId: string, userId: string): void {
  const audit = auditsStore.get(auditId);
  if (!audit || audit.userId !== userId) return;

  // Generate audit results
  const demoAudit = generateDemoAudit(userId);

  audit.metrics = demoAudit.metrics;
  audit.categories = demoAudit.categories;
  audit.overallScore = demoAudit.overallScore;
  audit.benchmarks = demoAudit.benchmarks;
  audit.topContent = demoAudit.topContent;
  audit.worstContent = demoAudit.worstContent;
  audit.issues = demoAudit.issues;
  audit.actionPlan = demoAudit.actionPlan;
  audit.status = "completed";
  audit.completedAt = new Date();

  auditsStore.set(auditId, audit);
}

export function deleteAudit(auditId: string, userId: string): boolean {
  const audit = auditsStore.get(auditId);
  if (!audit || audit.userId !== userId) return false;
  return auditsStore.delete(auditId);
}

export function updateActionItem(
  auditId: string,
  userId: string,
  actionId: string,
  completed: boolean
): SocialAudit | null {
  const audit = auditsStore.get(auditId);
  if (!audit || audit.userId !== userId) return null;

  const actionIndex = audit.actionPlan.findIndex((a) => a.id === actionId);
  if (actionIndex === -1) return null;

  audit.actionPlan[actionIndex].completed = completed;
  audit.actionPlan[actionIndex].completedAt = completed ? new Date() : undefined;

  auditsStore.set(auditId, audit);
  return audit;
}

export function getAuditTemplates(): AuditTemplate[] {
  return Array.from(templatesStore.values());
}

export function getAuditTemplate(templateId: string): AuditTemplate | null {
  return templatesStore.get(templateId) || null;
}

export function getAuditStats(userId: string): {
  totalAudits: number;
  completedAudits: number;
  avgScore: number;
  criticalIssues: number;
  actionsCompleted: number;
  actionsTotal: number;
  topCategory: string;
  weakestCategory: string;
} {
  initializeDemoData(userId);
  const audits = getUserAudits(userId);
  const completedAudits = audits.filter((a) => a.status === "completed");

  const avgScore =
    completedAudits.length > 0
      ? Math.round(completedAudits.reduce((sum, a) => sum + a.overallScore, 0) / completedAudits.length)
      : 0;

  const criticalIssues = completedAudits.reduce(
    (sum, a) => sum + a.issues.filter((i) => i.severity === "critical").length,
    0
  );

  const actionsTotal = completedAudits.reduce((sum, a) => sum + a.actionPlan.length, 0);
  const actionsCompleted = completedAudits.reduce(
    (sum, a) => sum + a.actionPlan.filter((action) => action.completed).length,
    0
  );

  // Find top and weakest categories across all audits
  const categoryScores: Record<string, number[]> = {};
  completedAudits.forEach((audit) => {
    audit.categories.forEach((cat) => {
      if (!categoryScores[cat.name]) categoryScores[cat.name] = [];
      categoryScores[cat.name].push(cat.score);
    });
  });

  const avgCategoryScores = Object.entries(categoryScores).map(([name, scores]) => ({
    name,
    avg: scores.reduce((a, b) => a + b, 0) / scores.length,
  }));

  avgCategoryScores.sort((a, b) => b.avg - a.avg);

  return {
    totalAudits: audits.length,
    completedAudits: completedAudits.length,
    avgScore,
    criticalIssues,
    actionsCompleted,
    actionsTotal,
    topCategory: avgCategoryScores[0]?.name || "N/A",
    weakestCategory: avgCategoryScores[avgCategoryScores.length - 1]?.name || "N/A",
  };
}

export function exportAuditReport(audit: SocialAudit): string {
  const lines: string[] = [];

  lines.push(`# Social Media Audit Report: ${audit.name}`);
  lines.push(`Generated: ${audit.completedAt?.toLocaleDateString() || "In Progress"}`);
  lines.push("");
  lines.push(`## Overall Score: ${audit.overallScore}/100`);
  lines.push("");

  lines.push("## Executive Summary");
  lines.push(`- Platforms Audited: ${audit.platforms.join(", ")}`);
  lines.push(`- Total Issues Found: ${audit.issues.length}`);
  lines.push(`- Critical Issues: ${audit.issues.filter((i) => i.severity === "critical").length}`);
  lines.push(`- Action Items: ${audit.actionPlan.length}`);
  lines.push("");

  lines.push("## Category Scores");
  audit.categories.forEach((cat) => {
    lines.push(`- ${cat.name}: ${cat.score}/${cat.maxScore}`);
  });
  lines.push("");

  lines.push("## Key Issues");
  audit.issues.forEach((issue) => {
    lines.push(`### [${issue.severity.toUpperCase()}] ${issue.title}`);
    lines.push(issue.description);
    lines.push(`**Impact:** ${issue.impact}`);
    lines.push(`**Recommendation:** ${issue.recommendation}`);
    lines.push("");
  });

  lines.push("## Action Plan");
  audit.actionPlan.forEach((action, index) => {
    lines.push(`${index + 1}. **${action.title}** (${action.effort} effort)`);
    lines.push(`   ${action.description}`);
    lines.push(`   Expected Impact: ${action.expectedImpact}`);
    lines.push(`   Timeframe: ${action.timeframe}`);
    lines.push("");
  });

  lines.push("## Benchmarks");
  audit.benchmarks.forEach((benchmark) => {
    lines.push(
      `- ${benchmark.metric}: ${benchmark.yourValue} (Industry: ${benchmark.industryAvg}, Top: ${benchmark.topPerformers})`
    );
  });

  return lines.join("\n");
}

export { AUDIT_CATEGORIES as CATEGORIES };
