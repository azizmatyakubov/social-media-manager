export interface ViralContent {
  id: string;
  platform: string;
  type: "post" | "video" | "image" | "thread" | "reel" | "story";
  content: {
    text?: string;
    mediaUrl?: string;
    thumbnail?: string;
  };
  author: {
    username: string;
    displayName: string;
    followers: number;
    verified: boolean;
    profileUrl?: string;
  };
  metrics: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    saves?: number;
    engagementRate: number;
    viralScore: number;
    growthRate: number; // Growth per hour
  };
  analysis: {
    hooks: string[];
    emotions: string[];
    topics: string[];
    format: string;
    timing: {
      postedAt: Date;
      peakEngagementHour: number;
      viralStartTime?: Date;
    };
    viralFactors: ViralFactor[];
  };
  discoveredAt: Date;
  lastUpdated: Date;
}

export interface ViralFactor {
  factor: string;
  description: string;
  impact: "high" | "medium" | "low";
  applicable: boolean;
}

export interface TrendingTopic {
  id: string;
  name: string;
  platform: string[];
  category: string;
  volume: number;
  growthRate: number;
  sentiment: "positive" | "negative" | "neutral" | "mixed";
  relatedHashtags: string[];
  peakTime?: Date;
  examples: ViralContent[];
  createdAt: Date;
}

export interface ViralPattern {
  id: string;
  name: string;
  description: string;
  category: "format" | "hook" | "emotion" | "timing" | "engagement";
  successRate: number;
  examples: string[];
  tips: string[];
  platforms: string[];
}

export interface ContentAnalysis {
  viralPotential: number; // 0-100
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  predictedReach: {
    low: number;
    medium: number;
    high: number;
  };
  similarViralContent: ViralContent[];
  recommendedImprovements: {
    category: string;
    current: string;
    suggested: string;
    impact: string;
  }[];
}

export interface ViralAlert {
  id: string;
  userId: string;
  type: "trending_topic" | "viral_content" | "competitor_viral" | "opportunity";
  title: string;
  description: string;
  urgency: "high" | "medium" | "low";
  data: {
    contentId?: string;
    topicId?: string;
    metrics?: Record<string, number>;
  };
  status: "new" | "viewed" | "actioned" | "dismissed";
  createdAt: Date;
}

// In-memory storage
const viralContent = new Map<string, ViralContent>();
const trendingTopics = new Map<string, TrendingTopic>();
const viralPatterns = new Map<string, ViralPattern>();
const viralAlerts = new Map<string, ViralAlert>();
const userAlerts = new Map<string, Set<string>>();

// Default viral patterns
const defaultPatterns: Omit<ViralPattern, "id">[] = [
  {
    name: "The Open Loop",
    description: "Start with an incomplete thought that creates curiosity",
    category: "hook",
    successRate: 78,
    examples: [
      "This one mistake cost me $100k...",
      "Nobody talks about this, but...",
      "The reason most people fail is...",
    ],
    tips: [
      "Create immediate curiosity",
      "Promise valuable information",
      "Use numbers for specificity",
    ],
    platforms: ["twitter", "instagram", "tiktok", "linkedin"],
  },
  {
    name: "Contrarian Take",
    description: "Challenge conventional wisdom with a surprising perspective",
    category: "hook",
    successRate: 72,
    examples: [
      "Unpopular opinion: [controversial statement]",
      "Everyone says X, but the truth is Y",
      "Stop doing [common practice]. Here's why:",
    ],
    tips: [
      "Be genuine, not controversial for clicks",
      "Back up with evidence or experience",
      "Expect and engage with pushback",
    ],
    platforms: ["twitter", "linkedin"],
  },
  {
    name: "Before/After Transformation",
    description: "Show dramatic change or progress visually",
    category: "format",
    successRate: 85,
    examples: [
      "Day 1 vs Day 365 of learning [skill]",
      "How I redesigned my space in 48 hours",
      "My website before and after hiring a designer",
    ],
    tips: [
      "Make the contrast dramatic",
      "Include specific timeframe",
      "Show your process in between",
    ],
    platforms: ["instagram", "tiktok", "twitter"],
  },
  {
    name: "Story Thread",
    description: "Tell a compelling narrative across multiple posts",
    category: "format",
    successRate: 80,
    examples: [
      "A thread on how I went from $0 to $1M:",
      "The craziest thing happened at work today...",
      "Here's the full story of how we built [product]:",
    ],
    tips: [
      "Start with a compelling hook",
      "Each tweet should add value",
      "End with a strong conclusion",
    ],
    platforms: ["twitter"],
  },
  {
    name: "Emotional Resonance",
    description: "Content that triggers strong emotional responses",
    category: "emotion",
    successRate: 88,
    examples: [
      "Vulnerability posts about failure",
      "Celebration of unexpected wins",
      "Relatable everyday frustrations",
    ],
    tips: [
      "Be authentic and vulnerable",
      "Connect to universal experiences",
      "Don't force emotions",
    ],
    platforms: ["instagram", "twitter", "linkedin", "tiktok"],
  },
  {
    name: "Educational Carousel",
    description: "Teach something valuable in a swipeable format",
    category: "format",
    successRate: 82,
    examples: [
      "10 keyboard shortcuts you need to know",
      "Complete guide to [topic] in 8 slides",
      "Everything I learned about X this year",
    ],
    tips: [
      "First slide must hook immediately",
      "Keep each slide focused on one point",
      "Include a clear CTA at the end",
    ],
    platforms: ["instagram", "linkedin"],
  },
  {
    name: "Peak Time Posting",
    description: "Post when your audience is most active",
    category: "timing",
    successRate: 65,
    examples: [
      "Weekday mornings (8-10am) for B2B",
      "Evenings and weekends for B2C",
      "Real-time posting during events",
    ],
    tips: [
      "Test different times for your audience",
      "Consider timezone of target audience",
      "Engage actively in first hour",
    ],
    platforms: ["twitter", "instagram", "linkedin", "tiktok", "facebook"],
  },
  {
    name: "Duet/Stitch Response",
    description: "React to trending content with your unique take",
    category: "engagement",
    successRate: 75,
    examples: [
      "Duetting a viral video with expert commentary",
      "Stitching to add missing context",
      "Quote tweeting with valuable insight",
    ],
    tips: [
      "Add genuine value, not just reaction",
      "Time it while original is still trending",
      "Tag the original creator",
    ],
    platforms: ["tiktok", "twitter"],
  },
];

// Initialize patterns
defaultPatterns.forEach((pattern, idx) => {
  const id = `pattern-${idx}`;
  viralPatterns.set(id, { id, ...pattern });
});

// Generate mock viral content
function generateMockViralContent(): ViralContent[] {
  const mockContent: Omit<ViralContent, "id" | "discoveredAt" | "lastUpdated">[] = [
    {
      platform: "twitter",
      type: "thread",
      content: {
        text: "I spent 10 years building startups. Here are 10 lessons I wish I knew on day 1: (Thread)",
      },
      author: {
        username: "startupfounder",
        displayName: "Sarah Founder",
        followers: 125000,
        verified: true,
      },
      metrics: {
        views: 2500000,
        likes: 45000,
        comments: 3200,
        shares: 12000,
        engagementRate: 2.4,
        viralScore: 92,
        growthRate: 1500,
      },
      analysis: {
        hooks: ["Credibility (10 years)", "Listicle format", "Relatable topic"],
        emotions: ["curiosity", "aspiration", "learning"],
        topics: ["startups", "entrepreneurship", "lessons learned"],
        format: "thread",
        timing: {
          postedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          peakEngagementHour: 9,
        },
        viralFactors: [
          { factor: "Authority", description: "10 years of experience builds trust", impact: "high", applicable: true },
          { factor: "Listicle", description: "Easy to consume format", impact: "medium", applicable: true },
          { factor: "FOMO", description: "Things I wish I knew creates curiosity", impact: "high", applicable: true },
        ],
      },
    },
    {
      platform: "tiktok",
      type: "video",
      content: {
        text: "When you finally understand the assignment #corporate #relateable",
        thumbnail: "https://example.com/thumb.jpg",
      },
      author: {
        username: "corporatehumor",
        displayName: "Office Vibes",
        followers: 850000,
        verified: false,
      },
      metrics: {
        views: 8500000,
        likes: 920000,
        comments: 15000,
        shares: 45000,
        saves: 120000,
        engagementRate: 12.8,
        viralScore: 95,
        growthRate: 3500,
      },
      analysis: {
        hooks: ["Relatable situation", "Trending audio"],
        emotions: ["humor", "relatability", "satisfaction"],
        topics: ["corporate", "work life", "humor"],
        format: "short video",
        timing: {
          postedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
          peakEngagementHour: 18,
        },
        viralFactors: [
          { factor: "Relatability", description: "Universal office experience", impact: "high", applicable: true },
          { factor: "Humor", description: "Makes people want to share", impact: "high", applicable: true },
          { factor: "Trending Audio", description: "Rides existing trend wave", impact: "medium", applicable: true },
        ],
      },
    },
    {
      platform: "instagram",
      type: "reel",
      content: {
        text: "Your morning routine is probably wrong. Here's the science-backed version:",
        mediaUrl: "https://example.com/reel.mp4",
      },
      author: {
        username: "scienceofhabits",
        displayName: "Habit Science",
        followers: 450000,
        verified: true,
      },
      metrics: {
        views: 3200000,
        likes: 285000,
        comments: 8500,
        shares: 32000,
        saves: 95000,
        engagementRate: 13.1,
        viralScore: 89,
        growthRate: 2100,
      },
      analysis: {
        hooks: ["Challenge assumption", "Promise value"],
        emotions: ["curiosity", "self-improvement", "learning"],
        topics: ["productivity", "morning routine", "science"],
        format: "educational reel",
        timing: {
          postedAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
          peakEngagementHour: 7,
        },
        viralFactors: [
          { factor: "Contrarian Hook", description: "Challenges common belief", impact: "high", applicable: true },
          { factor: "Authority", description: "Science-backed adds credibility", impact: "high", applicable: true },
          { factor: "Save-worthy", description: "People want to reference later", impact: "medium", applicable: true },
        ],
      },
    },
    {
      platform: "linkedin",
      type: "post",
      content: {
        text: "I got rejected from 47 jobs before landing my dream role at Google. Here's what I learned about resilience:",
      },
      author: {
        username: "techrecruiter",
        displayName: "James at Google",
        followers: 75000,
        verified: false,
      },
      metrics: {
        views: 850000,
        likes: 24000,
        comments: 1800,
        shares: 4500,
        engagementRate: 3.5,
        viralScore: 82,
        growthRate: 800,
      },
      analysis: {
        hooks: ["Vulnerability", "Big brand mention", "Specific number"],
        emotions: ["inspiration", "hope", "relatability"],
        topics: ["career", "job search", "resilience"],
        format: "story post",
        timing: {
          postedAt: new Date(Date.now() - 36 * 60 * 60 * 1000),
          peakEngagementHour: 8,
        },
        viralFactors: [
          { factor: "Vulnerability", description: "Sharing failure humanizes", impact: "high", applicable: true },
          { factor: "Aspirational", description: "Dream job at big company", impact: "high", applicable: true },
          { factor: "Specific Number", description: "47 rejections is memorable", impact: "medium", applicable: true },
        ],
      },
    },
  ];

  return mockContent.map((content, idx) => ({
    id: `viral-${idx}`,
    ...content,
    discoveredAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
    lastUpdated: new Date(),
  }));
}

// Initialize mock content
const mockViralContent = generateMockViralContent();
mockViralContent.forEach((content) => viralContent.set(content.id, content));

// Get trending viral content
export function getTrendingViralContent(
  filters?: {
    platform?: string;
    type?: string;
    minViralScore?: number;
    limit?: number;
  }
): ViralContent[] {
  let results = Array.from(viralContent.values());

  if (filters?.platform) {
    results = results.filter((c) => c.platform === filters.platform);
  }

  if (filters?.type) {
    results = results.filter((c) => c.type === filters.type);
  }

  if (filters?.minViralScore) {
    results = results.filter((c) => c.metrics.viralScore >= filters.minViralScore);
  }

  results = results.sort((a, b) => b.metrics.viralScore - a.metrics.viralScore);

  if (filters?.limit) {
    results = results.slice(0, filters.limit);
  }

  return results;
}

// Get viral patterns
export function getViralPatterns(category?: string): ViralPattern[] {
  let results = Array.from(viralPatterns.values());

  if (category) {
    results = results.filter((p) => p.category === category);
  }

  return results.sort((a, b) => b.successRate - a.successRate);
}

// Analyze content for viral potential
export async function analyzeViralPotential(
  content: string,
  options?: {
    platform?: string;
    type?: string;
    includeMedia?: boolean;
  }
): Promise<ContentAnalysis> {
  // Simulate AI analysis
  const wordCount = content.split(/\s+/).length;
  const hasNumbers = /\d+/.test(content);
  const hasQuestion = content.includes("?");
  const hasEmoji = /[\u{1F300}-\u{1F9FF}]/u.test(content);
  const hasHashtags = content.includes("#");
  const hasListFormat = /^\d+\.|^-|^\*/m.test(content);
  const isShort = wordCount < 50;

  let viralPotential = 40; // Base score
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const suggestions: string[] = [];

  // Analyze hooks
  if (content.toLowerCase().includes("here's") || content.toLowerCase().includes("thread")) {
    viralPotential += 10;
    strengths.push("Uses engaging hook phrase");
  }

  if (hasNumbers) {
    viralPotential += 8;
    strengths.push("Includes specific numbers for credibility");
  } else {
    suggestions.push("Add specific numbers to increase credibility");
  }

  if (hasQuestion) {
    viralPotential += 5;
    strengths.push("Includes question to drive engagement");
  }

  if (hasEmoji && isShort) {
    viralPotential += 5;
    strengths.push("Good use of emoji for visual appeal");
  }

  if (hasHashtags) {
    viralPotential += 3;
    strengths.push("Includes relevant hashtags for discovery");
  } else {
    suggestions.push("Consider adding 2-3 relevant hashtags");
  }

  if (hasListFormat) {
    viralPotential += 10;
    strengths.push("Listicle format is easy to consume");
  }

  // Check for weaknesses
  if (wordCount > 200 && options?.platform === "twitter") {
    viralPotential -= 10;
    weaknesses.push("Content may be too long for the platform");
  }

  if (!content.toLowerCase().includes("you") && !content.toLowerCase().includes("your")) {
    weaknesses.push("Consider addressing the reader directly");
    suggestions.push("Use 'you' and 'your' to make it more personal");
  }

  // Cap at 100
  viralPotential = Math.min(100, Math.max(0, viralPotential));

  // Calculate predicted reach
  const baseReach = 1000;
  const predictedReach = {
    low: Math.floor(baseReach * (viralPotential / 100) * 10),
    medium: Math.floor(baseReach * (viralPotential / 100) * 50),
    high: Math.floor(baseReach * (viralPotential / 100) * 200),
  };

  // Find similar viral content
  const similarViralContent = getTrendingViralContent({ limit: 3 });

  return {
    viralPotential,
    strengths,
    weaknesses,
    suggestions,
    predictedReach,
    similarViralContent,
    recommendedImprovements: [
      {
        category: "Hook",
        current: content.substring(0, 50),
        suggested: "Consider starting with a contrarian statement or question",
        impact: "Could increase initial engagement by 30-50%",
      },
      {
        category: "CTA",
        current: "No clear call to action",
        suggested: "Add 'RT if you agree' or 'Save this for later'",
        impact: "Could increase shares by 20-40%",
      },
    ],
  };
}

// Trending topics
export function getTrendingTopics(platform?: string): TrendingTopic[] {
  const mockTopics: TrendingTopic[] = [
    {
      id: "trend-1",
      name: "AI Tools for Productivity",
      platform: ["twitter", "linkedin"],
      category: "technology",
      volume: 125000,
      growthRate: 45,
      sentiment: "positive",
      relatedHashtags: ["#AI", "#Productivity", "#AITools", "#FutureOfWork"],
      examples: getTrendingViralContent({ limit: 2 }),
      createdAt: new Date(),
    },
    {
      id: "trend-2",
      name: "Remote Work Culture",
      platform: ["linkedin", "twitter"],
      category: "business",
      volume: 89000,
      growthRate: 28,
      sentiment: "mixed",
      relatedHashtags: ["#RemoteWork", "#WFH", "#FutureOfWork", "#WorkLifeBalance"],
      examples: getTrendingViralContent({ limit: 2 }),
      createdAt: new Date(),
    },
    {
      id: "trend-3",
      name: "Creator Economy",
      platform: ["twitter", "instagram", "tiktok"],
      category: "business",
      volume: 156000,
      growthRate: 62,
      sentiment: "positive",
      relatedHashtags: ["#CreatorEconomy", "#ContentCreator", "#Monetization"],
      examples: getTrendingViralContent({ limit: 2 }),
      createdAt: new Date(),
    },
    {
      id: "trend-4",
      name: "Morning Routines",
      platform: ["instagram", "tiktok", "youtube"],
      category: "lifestyle",
      volume: 210000,
      growthRate: 35,
      sentiment: "positive",
      relatedHashtags: ["#MorningRoutine", "#Productivity", "#SelfImprovement"],
      examples: getTrendingViralContent({ limit: 2 }),
      createdAt: new Date(),
    },
  ];

  if (platform) {
    return mockTopics.filter((t) => t.platform.includes(platform));
  }

  return mockTopics;
}

// Viral alerts
export function createViralAlert(
  userId: string,
  data: Omit<ViralAlert, "id" | "userId" | "status" | "createdAt">
): ViralAlert {
  const alert: ViralAlert = {
    id: crypto.randomUUID(),
    userId,
    ...data,
    status: "new",
    createdAt: new Date(),
  };

  viralAlerts.set(alert.id, alert);

  if (!userAlerts.has(userId)) {
    userAlerts.set(userId, new Set());
  }
  userAlerts.get(userId)!.add(alert.id);

  return alert;
}

export function getUserViralAlerts(userId: string): ViralAlert[] {
  const alertIds = userAlerts.get(userId);
  if (!alertIds) {
    // Generate some mock alerts
    const mockAlerts: Omit<ViralAlert, "id" | "userId" | "status" | "createdAt">[] = [
      {
        type: "trending_topic",
        title: "Trending: AI Tools for Productivity",
        description: "This topic is trending with 45% growth. Consider creating content around it.",
        urgency: "high",
        data: { topicId: "trend-1" },
      },
      {
        type: "viral_content",
        title: "Similar content going viral",
        description: "Content similar to your recent post is gaining traction. Engage with the conversation!",
        urgency: "medium",
        data: { contentId: "viral-0" },
      },
      {
        type: "opportunity",
        title: "Best time to post approaching",
        description: "Your audience is most active in the next 2 hours. Consider posting now.",
        urgency: "low",
        data: {},
      },
    ];

    mockAlerts.forEach((alert) => createViralAlert(userId, alert));
  }

  const ids = userAlerts.get(userId);
  if (!ids) return [];

  return Array.from(ids)
    .map((id) => viralAlerts.get(id))
    .filter((a): a is ViralAlert => a !== undefined)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function updateAlertStatus(
  alertId: string,
  userId: string,
  status: ViralAlert["status"]
): ViralAlert | null {
  const alert = viralAlerts.get(alertId);
  if (!alert || alert.userId !== userId) return null;

  alert.status = status;
  viralAlerts.set(alertId, alert);
  return alert;
}

// Stats
export function getViralDetectorStats(userId: string): {
  trendingTopicsCount: number;
  viralContentCount: number;
  avgViralScore: number;
  topPlatforms: { platform: string; count: number }[];
  alertsCount: number;
  patternsCount: number;
} {
  const content = Array.from(viralContent.values());
  const alerts = getUserViralAlerts(userId);

  const platformCounts: Record<string, number> = {};
  let totalViralScore = 0;

  for (const c of content) {
    platformCounts[c.platform] = (platformCounts[c.platform] || 0) + 1;
    totalViralScore += c.metrics.viralScore;
  }

  const topPlatforms = Object.entries(platformCounts)
    .map(([platform, count]) => ({ platform, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    trendingTopicsCount: getTrendingTopics().length,
    viralContentCount: content.length,
    avgViralScore: content.length > 0 ? totalViralScore / content.length : 0,
    topPlatforms,
    alertsCount: alerts.filter((a) => a.status === "new").length,
    patternsCount: viralPatterns.size,
  };
}

export const CONTENT_TYPES = [
  { value: "post", label: "Post" },
  { value: "video", label: "Video" },
  { value: "image", label: "Image" },
  { value: "thread", label: "Thread" },
  { value: "reel", label: "Reel" },
  { value: "story", label: "Story" },
] as const;

export const PATTERN_CATEGORIES = [
  { value: "format", label: "Format" },
  { value: "hook", label: "Hook" },
  { value: "emotion", label: "Emotion" },
  { value: "timing", label: "Timing" },
  { value: "engagement", label: "Engagement" },
] as const;
