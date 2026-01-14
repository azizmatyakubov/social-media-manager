// Content Gap Analyzer

export interface ContentGap {
  id: string;
  userId: string;
  topic: string;
  category: string;
  description: string;
  competitorsCovering: string[];
  searchVolume: number;
  difficulty: "low" | "medium" | "high";
  opportunity: number; // 0-100
  relevance: number; // 0-100
  suggestedFormats: string[];
  suggestedPlatforms: string[];
  keywords: string[];
  status: "identified" | "planned" | "in_progress" | "covered";
  priority: "low" | "medium" | "high" | "urgent";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContentAnalysis {
  id: string;
  userId: string;
  name: string;
  type: "competitor" | "industry" | "self";
  source: string;
  topics: TopicCoverage[];
  formats: FormatDistribution[];
  platforms: PlatformActivity[];
  frequency: PostingFrequency;
  engagement: EngagementMetrics;
  analyzedAt: Date;
}

export interface TopicCoverage {
  topic: string;
  category: string;
  postCount: number;
  engagement: number;
  lastPosted?: Date;
  trend: "rising" | "stable" | "declining";
}

export interface FormatDistribution {
  format: string;
  percentage: number;
  avgEngagement: number;
}

export interface PlatformActivity {
  platform: string;
  postCount: number;
  avgEngagement: number;
  topPerforming: string[];
}

export interface PostingFrequency {
  postsPerWeek: number;
  mostActiveDay: string;
  mostActiveTime: string;
  consistency: number; // 0-100
}

export interface EngagementMetrics {
  avgLikes: number;
  avgComments: number;
  avgShares: number;
  engagementRate: number;
  topPerformingTopics: string[];
}

export interface GapReport {
  id: string;
  userId: string;
  name: string;
  analyses: string[];
  gaps: ContentGap[];
  recommendations: ContentRecommendation[];
  summary: ReportSummary;
  createdAt: Date;
}

export interface ContentRecommendation {
  id: string;
  title: string;
  description: string;
  gapId?: string;
  type: "topic" | "format" | "platform" | "timing" | "engagement";
  impact: "low" | "medium" | "high";
  effort: "low" | "medium" | "high";
  suggestedContent: string[];
  deadline?: Date;
}

export interface ReportSummary {
  totalGaps: number;
  highPriorityGaps: number;
  topOpportunities: string[];
  competitorAdvantages: string[];
  yourStrengths: string[];
  quickWins: string[];
  overallScore: number;
}

// In-memory storage
const contentGaps = new Map<string, ContentGap>();
const contentAnalyses = new Map<string, ContentAnalysis>();
const gapReports = new Map<string, GapReport>();

// Categories for content
export const CONTENT_CATEGORIES = [
  "Educational",
  "Entertainment",
  "Promotional",
  "Behind-the-scenes",
  "User-generated",
  "Industry news",
  "Case studies",
  "How-to guides",
  "Thought leadership",
  "Product updates",
  "Customer stories",
  "Tips & tricks",
] as const;

// Initialize demo data
function initDemoData() {
  // Demo content analyses
  const demoAnalyses: ContentAnalysis[] = [
    {
      id: "analysis-1",
      userId: "user-1",
      name: "Your Content Analysis",
      type: "self",
      source: "Your Account",
      topics: [
        { topic: "Product features", category: "Promotional", postCount: 25, engagement: 3.2, trend: "stable" },
        { topic: "Industry news", category: "Industry news", postCount: 18, engagement: 2.8, trend: "declining" },
        { topic: "Tips & tutorials", category: "How-to guides", postCount: 12, engagement: 4.5, trend: "rising" },
        { topic: "Company updates", category: "Behind-the-scenes", postCount: 8, engagement: 2.1, trend: "stable" },
      ],
      formats: [
        { format: "Images", percentage: 45, avgEngagement: 3.2 },
        { format: "Videos", percentage: 25, avgEngagement: 5.1 },
        { format: "Text posts", percentage: 20, avgEngagement: 2.4 },
        { format: "Carousels", percentage: 10, avgEngagement: 4.8 },
      ],
      platforms: [
        { platform: "Twitter", postCount: 120, avgEngagement: 2.8, topPerforming: ["Tips", "News"] },
        { platform: "LinkedIn", postCount: 45, avgEngagement: 4.2, topPerforming: ["Thought leadership"] },
        { platform: "Instagram", postCount: 30, avgEngagement: 3.5, topPerforming: ["Behind-the-scenes"] },
      ],
      frequency: {
        postsPerWeek: 12,
        mostActiveDay: "Tuesday",
        mostActiveTime: "10:00 AM",
        consistency: 72,
      },
      engagement: {
        avgLikes: 156,
        avgComments: 23,
        avgShares: 12,
        engagementRate: 3.4,
        topPerformingTopics: ["Tips & tutorials", "Product features"],
      },
      analyzedAt: new Date(),
    },
    {
      id: "analysis-2",
      userId: "user-1",
      name: "Competitor A",
      type: "competitor",
      source: "@CompetitorA",
      topics: [
        { topic: "Customer success stories", category: "Customer stories", postCount: 30, engagement: 5.2, trend: "rising" },
        { topic: "Product comparisons", category: "Educational", postCount: 20, engagement: 4.8, trend: "stable" },
        { topic: "Industry trends", category: "Thought leadership", postCount: 35, engagement: 4.1, trend: "rising" },
        { topic: "How-to content", category: "How-to guides", postCount: 28, engagement: 6.2, trend: "rising" },
      ],
      formats: [
        { format: "Videos", percentage: 40, avgEngagement: 6.1 },
        { format: "Carousels", percentage: 30, avgEngagement: 5.2 },
        { format: "Images", percentage: 20, avgEngagement: 3.8 },
        { format: "Text posts", percentage: 10, avgEngagement: 2.9 },
      ],
      platforms: [
        { platform: "LinkedIn", postCount: 80, avgEngagement: 5.5, topPerforming: ["Thought leadership", "Case studies"] },
        { platform: "Twitter", postCount: 150, avgEngagement: 3.8, topPerforming: ["News", "Tips"] },
        { platform: "YouTube", postCount: 25, avgEngagement: 8.2, topPerforming: ["Tutorials"] },
      ],
      frequency: {
        postsPerWeek: 18,
        mostActiveDay: "Wednesday",
        mostActiveTime: "9:00 AM",
        consistency: 85,
      },
      engagement: {
        avgLikes: 245,
        avgComments: 45,
        avgShares: 28,
        engagementRate: 5.2,
        topPerformingTopics: ["Customer success stories", "How-to content"],
      },
      analyzedAt: new Date(),
    },
    {
      id: "analysis-3",
      userId: "user-1",
      name: "Competitor B",
      type: "competitor",
      source: "@CompetitorB",
      topics: [
        { topic: "Memes & humor", category: "Entertainment", postCount: 45, engagement: 7.8, trend: "rising" },
        { topic: "Quick tips", category: "Tips & tricks", postCount: 55, engagement: 5.5, trend: "stable" },
        { topic: "User spotlights", category: "User-generated", postCount: 20, engagement: 6.2, trend: "rising" },
        { topic: "Product demos", category: "Educational", postCount: 15, engagement: 4.5, trend: "stable" },
      ],
      formats: [
        { format: "Short videos", percentage: 50, avgEngagement: 7.2 },
        { format: "Memes", percentage: 25, avgEngagement: 8.5 },
        { format: "Carousels", percentage: 15, avgEngagement: 5.1 },
        { format: "Text posts", percentage: 10, avgEngagement: 3.2 },
      ],
      platforms: [
        { platform: "TikTok", postCount: 80, avgEngagement: 8.5, topPerforming: ["Entertainment", "Quick tips"] },
        { platform: "Instagram", postCount: 100, avgEngagement: 6.2, topPerforming: ["User content", "Memes"] },
        { platform: "Twitter", postCount: 90, avgEngagement: 4.8, topPerforming: ["Quick tips"] },
      ],
      frequency: {
        postsPerWeek: 22,
        mostActiveDay: "Friday",
        mostActiveTime: "2:00 PM",
        consistency: 90,
      },
      engagement: {
        avgLikes: 380,
        avgComments: 65,
        avgShares: 48,
        engagementRate: 6.8,
        topPerformingTopics: ["Memes & humor", "User spotlights"],
      },
      analyzedAt: new Date(),
    },
  ];
  demoAnalyses.forEach((a) => contentAnalyses.set(a.id, a));

  // Demo content gaps
  const demoGaps: ContentGap[] = [
    {
      id: "gap-1",
      userId: "user-1",
      topic: "Customer Success Stories",
      category: "Customer stories",
      description: "Competitors are heavily featuring customer success stories and case studies, generating high engagement",
      competitorsCovering: ["Competitor A", "Competitor B"],
      searchVolume: 8500,
      difficulty: "medium",
      opportunity: 85,
      relevance: 90,
      suggestedFormats: ["Video testimonials", "Case study carousels", "Quote graphics"],
      suggestedPlatforms: ["LinkedIn", "Twitter", "YouTube"],
      keywords: ["customer story", "case study", "success", "results", "testimonial"],
      status: "identified",
      priority: "high",
      createdAt: new Date("2024-01-15"),
      updatedAt: new Date(),
    },
    {
      id: "gap-2",
      userId: "user-1",
      topic: "Short-form Video Content",
      category: "Entertainment",
      description: "Your competitors are dominating TikTok and Reels with entertaining short videos",
      competitorsCovering: ["Competitor B"],
      searchVolume: 15000,
      difficulty: "medium",
      opportunity: 92,
      relevance: 75,
      suggestedFormats: ["TikTok videos", "Instagram Reels", "YouTube Shorts"],
      suggestedPlatforms: ["TikTok", "Instagram", "YouTube"],
      keywords: ["tips", "quick", "tutorial", "hack", "trick"],
      status: "identified",
      priority: "urgent",
      createdAt: new Date("2024-01-20"),
      updatedAt: new Date(),
    },
    {
      id: "gap-3",
      userId: "user-1",
      topic: "Educational Deep Dives",
      category: "How-to guides",
      description: "In-depth tutorials and educational content performing well for competitors",
      competitorsCovering: ["Competitor A"],
      searchVolume: 6200,
      difficulty: "high",
      opportunity: 78,
      relevance: 95,
      suggestedFormats: ["Long-form videos", "Blog posts", "Webinars"],
      suggestedPlatforms: ["YouTube", "LinkedIn", "Blog"],
      keywords: ["guide", "tutorial", "how to", "learn", "step by step"],
      status: "planned",
      priority: "high",
      createdAt: new Date("2024-01-22"),
      updatedAt: new Date(),
    },
    {
      id: "gap-4",
      userId: "user-1",
      topic: "User-Generated Content",
      category: "User-generated",
      description: "Competitor B leverages UGC effectively, creating community engagement",
      competitorsCovering: ["Competitor B"],
      searchVolume: 4500,
      difficulty: "low",
      opportunity: 70,
      relevance: 80,
      suggestedFormats: ["Reposts", "User spotlights", "Community challenges"],
      suggestedPlatforms: ["Instagram", "TikTok", "Twitter"],
      keywords: ["community", "user", "feature", "spotlight", "share"],
      status: "identified",
      priority: "medium",
      createdAt: new Date("2024-01-25"),
      updatedAt: new Date(),
    },
    {
      id: "gap-5",
      userId: "user-1",
      topic: "Industry Thought Leadership",
      category: "Thought leadership",
      description: "Competitor A is establishing authority with trend analysis and expert opinions",
      competitorsCovering: ["Competitor A"],
      searchVolume: 3800,
      difficulty: "high",
      opportunity: 65,
      relevance: 85,
      suggestedFormats: ["LinkedIn articles", "Twitter threads", "Podcast appearances"],
      suggestedPlatforms: ["LinkedIn", "Twitter"],
      keywords: ["trends", "future", "analysis", "expert", "industry"],
      status: "identified",
      priority: "medium",
      createdAt: new Date("2024-01-28"),
      updatedAt: new Date(),
    },
  ];
  demoGaps.forEach((g) => contentGaps.set(g.id, g));

  // Demo report
  const demoReport: GapReport = {
    id: "report-1",
    userId: "user-1",
    name: "Q1 Content Gap Analysis",
    analyses: ["analysis-1", "analysis-2", "analysis-3"],
    gaps: demoGaps,
    recommendations: [
      {
        id: "rec-1",
        title: "Launch Customer Story Campaign",
        description: "Create a monthly customer spotlight series featuring success stories",
        gapId: "gap-1",
        type: "topic",
        impact: "high",
        effort: "medium",
        suggestedContent: [
          "Video interview with top customer",
          "Before/after case study carousel",
          "Metrics highlight graphic",
        ],
      },
      {
        id: "rec-2",
        title: "Start TikTok Presence",
        description: "Begin posting short-form educational content on TikTok and Reels",
        gapId: "gap-2",
        type: "platform",
        impact: "high",
        effort: "high",
        suggestedContent: [
          "30-second tip videos",
          "Trending sound tutorials",
          "Behind-the-scenes clips",
        ],
      },
      {
        id: "rec-3",
        title: "Increase Video Content",
        description: "Shift format distribution to include more video content",
        type: "format",
        impact: "high",
        effort: "medium",
        suggestedContent: [
          "Tutorial videos",
          "Product demos",
          "Team introductions",
        ],
      },
    ],
    summary: {
      totalGaps: 5,
      highPriorityGaps: 3,
      topOpportunities: ["Customer Stories", "Short-form Video", "Educational Content"],
      competitorAdvantages: ["Video content", "Posting frequency", "Community engagement"],
      yourStrengths: ["Tips & tutorials engagement", "LinkedIn presence"],
      quickWins: ["Repost user content", "Create quote graphics from testimonials"],
      overallScore: 62,
    },
    createdAt: new Date("2024-01-30"),
  };
  gapReports.set(demoReport.id, demoReport);
}

// Initialize
initDemoData();

// Gap functions
export function getUserContentGaps(
  userId: string,
  options?: { status?: ContentGap["status"]; priority?: ContentGap["priority"]; category?: string }
): ContentGap[] {
  let gaps = Array.from(contentGaps.values()).filter((g) => g.userId === userId);

  if (options?.status) {
    gaps = gaps.filter((g) => g.status === options.status);
  }

  if (options?.priority) {
    gaps = gaps.filter((g) => g.priority === options.priority);
  }

  if (options?.category) {
    gaps = gaps.filter((g) => g.category === options.category);
  }

  return gaps.sort((a, b) => b.opportunity - a.opportunity);
}

export function getContentGap(gapId: string): ContentGap | undefined {
  return contentGaps.get(gapId);
}

export function createContentGap(
  userId: string,
  data: Omit<ContentGap, "id" | "userId" | "createdAt" | "updatedAt">
): ContentGap {
  const gap: ContentGap = {
    id: `gap-${Date.now()}`,
    userId,
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  contentGaps.set(gap.id, gap);
  return gap;
}

export function updateContentGap(
  gapId: string,
  userId: string,
  updates: Partial<Omit<ContentGap, "id" | "userId" | "createdAt">>
): ContentGap | null {
  const gap = contentGaps.get(gapId);
  if (!gap || gap.userId !== userId) return null;

  Object.assign(gap, updates, { updatedAt: new Date() });
  return gap;
}

export function deleteContentGap(gapId: string, userId: string): boolean {
  const gap = contentGaps.get(gapId);
  if (!gap || gap.userId !== userId) return false;
  return contentGaps.delete(gapId);
}

// Analysis functions
export function getUserAnalyses(userId: string): ContentAnalysis[] {
  return Array.from(contentAnalyses.values())
    .filter((a) => a.userId === userId)
    .sort((a, b) => b.analyzedAt.getTime() - a.analyzedAt.getTime());
}

export function getAnalysis(analysisId: string): ContentAnalysis | undefined {
  return contentAnalyses.get(analysisId);
}

export function createAnalysis(
  userId: string,
  data: Omit<ContentAnalysis, "id" | "userId" | "analyzedAt">
): ContentAnalysis {
  const analysis: ContentAnalysis = {
    id: `analysis-${Date.now()}`,
    userId,
    ...data,
    analyzedAt: new Date(),
  };

  contentAnalyses.set(analysis.id, analysis);
  return analysis;
}

export function deleteAnalysis(analysisId: string, userId: string): boolean {
  const analysis = contentAnalyses.get(analysisId);
  if (!analysis || analysis.userId !== userId) return false;
  return contentAnalyses.delete(analysisId);
}

// Report functions
export function getUserReports(userId: string): GapReport[] {
  return Array.from(gapReports.values())
    .filter((r) => r.userId === userId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function getReport(reportId: string): GapReport | undefined {
  return gapReports.get(reportId);
}

export async function generateGapReport(
  userId: string,
  name: string,
  analysisIds: string[]
): Promise<GapReport> {
  // Simulate analysis
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const analyses = analysisIds
    .map((id) => contentAnalyses.get(id))
    .filter((a): a is ContentAnalysis => !!a);

  const selfAnalysis = analyses.find((a) => a.type === "self");
  const competitorAnalyses = analyses.filter((a) => a.type === "competitor");

  // Identify gaps
  const gaps: ContentGap[] = [];
  const competitorTopics = new Map<string, { competitors: string[]; engagement: number }>();

  // Collect all competitor topics
  competitorAnalyses.forEach((comp) => {
    comp.topics.forEach((topic) => {
      const existing = competitorTopics.get(topic.topic);
      if (existing) {
        existing.competitors.push(comp.name);
        existing.engagement = Math.max(existing.engagement, topic.engagement);
      } else {
        competitorTopics.set(topic.topic, {
          competitors: [comp.name],
          engagement: topic.engagement,
        });
      }
    });
  });

  // Find gaps (topics competitors cover but we don't, or cover poorly)
  const selfTopics = new Set(selfAnalysis?.topics.map((t) => t.topic) || []);

  competitorTopics.forEach((data, topic) => {
    if (!selfTopics.has(topic) || (selfAnalysis?.topics.find((t) => t.topic === topic)?.engagement || 0) < data.engagement * 0.7) {
      gaps.push({
        id: `gap-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId,
        topic,
        category: "General",
        description: `Competitors are covering "${topic}" with ${data.engagement.toFixed(1)}% engagement`,
        competitorsCovering: data.competitors,
        searchVolume: Math.floor(Math.random() * 10000) + 1000,
        difficulty: data.engagement > 5 ? "high" : data.engagement > 3 ? "medium" : "low",
        opportunity: Math.min(95, Math.floor(data.engagement * 15)),
        relevance: Math.floor(Math.random() * 30) + 70,
        suggestedFormats: ["Video", "Carousel", "Thread"],
        suggestedPlatforms: ["Twitter", "LinkedIn", "Instagram"],
        keywords: topic.toLowerCase().split(" "),
        status: "identified",
        priority: data.engagement > 5 ? "high" : "medium",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  });

  // Save gaps
  gaps.forEach((g) => contentGaps.set(g.id, g));

  // Generate recommendations
  const recommendations: ContentRecommendation[] = gaps.slice(0, 3).map((gap, idx) => ({
    id: `rec-${Date.now()}-${idx}`,
    title: `Address gap: ${gap.topic}`,
    description: `Create content to cover ${gap.topic} topic that competitors are dominating`,
    gapId: gap.id,
    type: "topic" as const,
    impact: gap.priority === "high" ? "high" as const : "medium" as const,
    effort: gap.difficulty,
    suggestedContent: gap.suggestedFormats.map((f) => `${gap.topic} - ${f}`),
  }));

  const report: GapReport = {
    id: `report-${Date.now()}`,
    userId,
    name,
    analyses: analysisIds,
    gaps,
    recommendations,
    summary: {
      totalGaps: gaps.length,
      highPriorityGaps: gaps.filter((g) => g.priority === "high" || g.priority === "urgent").length,
      topOpportunities: gaps.slice(0, 3).map((g) => g.topic),
      competitorAdvantages: competitorAnalyses.flatMap((c) =>
        c.engagement.topPerformingTopics.slice(0, 2)
      ),
      yourStrengths: selfAnalysis?.engagement.topPerformingTopics || [],
      quickWins: gaps.filter((g) => g.difficulty === "low").slice(0, 2).map((g) => g.topic),
      overallScore: Math.floor(
        65 - gaps.filter((g) => g.priority === "high").length * 5 + Math.random() * 10
      ),
    },
    createdAt: new Date(),
  };

  gapReports.set(report.id, report);
  return report;
}

export function deleteReport(reportId: string, userId: string): boolean {
  const report = gapReports.get(reportId);
  if (!report || report.userId !== userId) return false;
  return gapReports.delete(reportId);
}

// Stats
export function getGapAnalyzerStats(userId: string): {
  totalGaps: number;
  identifiedGaps: number;
  coveredGaps: number;
  highPriorityGaps: number;
  avgOpportunity: number;
  topCategories: { category: string; count: number }[];
} {
  const userGaps = Array.from(contentGaps.values()).filter((g) => g.userId === userId);

  const categoryCounts = new Map<string, number>();
  userGaps.forEach((g) => {
    categoryCounts.set(g.category, (categoryCounts.get(g.category) || 0) + 1);
  });

  const topCategories = Array.from(categoryCounts.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalGaps: userGaps.length,
    identifiedGaps: userGaps.filter((g) => g.status === "identified").length,
    coveredGaps: userGaps.filter((g) => g.status === "covered").length,
    highPriorityGaps: userGaps.filter((g) => g.priority === "high" || g.priority === "urgent")
      .length,
    avgOpportunity: userGaps.length
      ? Math.round(userGaps.reduce((sum, g) => sum + g.opportunity, 0) / userGaps.length)
      : 0,
    topCategories,
  };
}

// Export constants
export const GAP_STATUSES = ["identified", "planned", "in_progress", "covered"] as const;
export const GAP_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export const GAP_DIFFICULTIES = ["low", "medium", "high"] as const;
export const ANALYSIS_TYPES = ["competitor", "industry", "self"] as const;
