import { prisma } from "./prisma";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Types
export interface ListeningQuery {
  id: string;
  userId: string;
  name: string;
  keywords: string[];
  excludeKeywords: string[];
  platforms: string[];
  language: string;
  isActive: boolean;
  lastCheckedAt: Date | null;
  createdAt: Date;
}

export interface ListeningMention {
  id: string;
  queryId: string;
  platform: string;
  authorName: string;
  authorHandle: string;
  authorFollowers: number;
  content: string;
  url: string;
  sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
  reach: number;
  engagement: number;
  matchedKeywords: string[];
  isRead: boolean;
  isBookmarked: boolean;
  createdAt: Date;
}

export interface ListeningStats {
  totalMentions: number;
  positiveMentions: number;
  neutralMentions: number;
  negativeMentions: number;
  totalReach: number;
  totalEngagement: number;
  topInfluencers: {
    name: string;
    handle: string;
    followers: number;
    mentions: number;
  }[];
  trendingKeywords: {
    keyword: string;
    count: number;
    sentiment: string;
  }[];
  platformBreakdown: {
    platform: string;
    count: number;
    percentage: number;
  }[];
}

// Listening Query CRUD
export async function createListeningQuery(
  userId: string,
  data: {
    name: string;
    keywords: string[];
    excludeKeywords?: string[];
    platforms?: string[];
    language?: string;
  }
) {
  // Store in database - we'll create a simple JSON storage approach
  // In production, you'd want a dedicated ListeningQuery model
  const query = {
    id: crypto.randomUUID(),
    userId,
    name: data.name,
    keywords: data.keywords,
    excludeKeywords: data.excludeKeywords || [],
    platforms: data.platforms || ["X", "LINKEDIN", "INSTAGRAM"],
    language: data.language || "en",
    isActive: true,
    lastCheckedAt: null,
    createdAt: new Date(),
  };

  // Store in user preferences or a dedicated table
  // For now, we'll use the Integration model to store queries
  await prisma.integration.upsert({
    where: {
      userId_type: {
        userId,
        type: "CUSTOM_WEBHOOK",
      },
    },
    update: {
      config: {
        listeningQueries: [
          ...(await getStoredQueries(userId)),
          query,
        ],
      },
    },
    create: {
      userId,
      type: "CUSTOM_WEBHOOK",
      name: "Social Listening Storage",
      config: {
        listeningQueries: [query],
      },
    },
  });

  return query;
}

async function getStoredQueries(userId: string): Promise<ListeningQuery[]> {
  const integration = await prisma.integration.findUnique({
    where: {
      userId_type: {
        userId,
        type: "CUSTOM_WEBHOOK",
      },
    },
  });

  if (!integration?.config) return [];

  const config = integration.config as { listeningQueries?: ListeningQuery[] };
  return config.listeningQueries || [];
}

export async function getListeningQueries(userId: string): Promise<ListeningQuery[]> {
  return getStoredQueries(userId);
}

export async function updateListeningQuery(
  userId: string,
  queryId: string,
  data: Partial<{
    name: string;
    keywords: string[];
    excludeKeywords: string[];
    platforms: string[];
    language: string;
    isActive: boolean;
  }>
) {
  const queries = await getStoredQueries(userId);
  const queryIndex = queries.findIndex((q) => q.id === queryId);

  if (queryIndex === -1) {
    throw new Error("Query not found");
  }

  queries[queryIndex] = { ...queries[queryIndex], ...data };

  await prisma.integration.update({
    where: {
      userId_type: {
        userId,
        type: "CUSTOM_WEBHOOK",
      },
    },
    data: {
      config: {
        listeningQueries: queries,
      },
    },
  });

  return queries[queryIndex];
}

export async function deleteListeningQuery(userId: string, queryId: string) {
  const queries = await getStoredQueries(userId);
  const filteredQueries = queries.filter((q) => q.id !== queryId);

  await prisma.integration.update({
    where: {
      userId_type: {
        userId,
        type: "CUSTOM_WEBHOOK",
      },
    },
    data: {
      config: {
        listeningQueries: filteredQueries,
      },
    },
  });

  return { success: true };
}

// Analyze content with AI
export async function analyzeContent(content: string): Promise<{
  sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
  topics: string[];
  summary: string;
}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Analyze social media content. Return JSON with: sentiment (POSITIVE/NEUTRAL/NEGATIVE), topics (array of key topics), summary (1 sentence).",
        },
        { role: "user", content: `Analyze: "${content}"` },
      ],
      temperature: 0.3,
      max_tokens: 200,
    });

    const result = response.choices[0]?.message?.content || "{}";
    const cleanResult = result.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleanResult);
  } catch (error) {
    console.error("Analysis error:", error);
    return {
      sentiment: "NEUTRAL",
      topics: [],
      summary: "Unable to analyze",
    };
  }
}

// Get mentions from existing data (mentions table)
export async function getListeningMentions(
  userId: string,
  options?: {
    queryId?: string;
    platform?: string;
    sentiment?: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
    isRead?: boolean;
    isBookmarked?: boolean;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
  }
): Promise<ListeningMention[]> {
  const where: Record<string, unknown> = { userId };

  if (options?.platform) {
    where.platform = options.platform;
  }

  if (options?.sentiment) {
    where.sentiment = options.sentiment;
  }

  if (options?.isRead !== undefined) {
    where.status = options.isRead ? { not: "UNREAD" } : "UNREAD";
  }

  if (options?.dateFrom || options?.dateTo) {
    where.createdAt = {};
    if (options.dateFrom) {
      (where.createdAt as Record<string, Date>).gte = options.dateFrom;
    }
    if (options.dateTo) {
      (where.createdAt as Record<string, Date>).lte = options.dateTo;
    }
  }

  const mentions = await prisma.mention.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: options?.limit ?? 50,
    skip: options?.offset ?? 0,
  });

  return mentions.map((m) => ({
    id: m.id,
    queryId: "",
    platform: m.platform,
    authorName: m.authorName,
    authorHandle: m.authorHandle || "",
    authorFollowers: 0,
    content: m.text,
    url: m.url || "",
    sentiment: (m.sentiment as "POSITIVE" | "NEUTRAL" | "NEGATIVE") || "NEUTRAL",
    reach: 0,
    engagement: 0,
    matchedKeywords: [],
    isRead: m.status !== "UNREAD",
    isBookmarked: false,
    createdAt: m.createdAt,
  }));
}

// Get listening statistics
export async function getListeningStats(
  userId: string,
  options?: {
    queryId?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }
): Promise<ListeningStats> {
  const where: Record<string, unknown> = { userId };

  if (options?.dateFrom || options?.dateTo) {
    where.createdAt = {};
    if (options.dateFrom) {
      (where.createdAt as Record<string, Date>).gte = options.dateFrom;
    }
    if (options.dateTo) {
      (where.createdAt as Record<string, Date>).lte = options.dateTo;
    }
  }

  const mentions = await prisma.mention.findMany({
    where,
    select: {
      id: true,
      platform: true,
      authorName: true,
      authorHandle: true,
      text: true,
      sentiment: true,
      createdAt: true,
    },
  });

  const stats: ListeningStats = {
    totalMentions: mentions.length,
    positiveMentions: 0,
    neutralMentions: 0,
    negativeMentions: 0,
    totalReach: 0,
    totalEngagement: 0,
    topInfluencers: [],
    trendingKeywords: [],
    platformBreakdown: [],
  };

  const authorCounts: Record<string, { name: string; handle: string; count: number }> = {};
  const platformCounts: Record<string, number> = {};
  const keywordCounts: Record<string, { count: number; sentiments: string[] }> = {};

  mentions.forEach((mention) => {
    // Count sentiments
    switch (mention.sentiment) {
      case "POSITIVE":
        stats.positiveMentions++;
        break;
      case "NEGATIVE":
        stats.negativeMentions++;
        break;
      default:
        stats.neutralMentions++;
    }

    // Count authors
    const authorKey = mention.authorHandle || mention.authorName;
    if (!authorCounts[authorKey]) {
      authorCounts[authorKey] = {
        name: mention.authorName,
        handle: mention.authorHandle || "",
        count: 0,
      };
    }
    authorCounts[authorKey].count++;

    // Count platforms
    platformCounts[mention.platform] = (platformCounts[mention.platform] || 0) + 1;

    // Extract keywords (simple word extraction)
    const words = mention.text.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    words.forEach((word) => {
      const cleanWord = word.replace(/[^a-z0-9#@]/g, "");
      if (cleanWord.length > 3) {
        if (!keywordCounts[cleanWord]) {
          keywordCounts[cleanWord] = { count: 0, sentiments: [] };
        }
        keywordCounts[cleanWord].count++;
        keywordCounts[cleanWord].sentiments.push(mention.sentiment || "NEUTRAL");
      }
    });
  });

  // Top influencers
  stats.topInfluencers = Object.values(authorCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((a) => ({
      name: a.name,
      handle: a.handle,
      followers: 0,
      mentions: a.count,
    }));

  // Platform breakdown
  const totalPlatformCount = Object.values(platformCounts).reduce((a, b) => a + b, 0);
  stats.platformBreakdown = Object.entries(platformCounts)
    .map(([platform, count]) => ({
      platform,
      count,
      percentage: totalPlatformCount > 0 ? Math.round((count / totalPlatformCount) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Trending keywords
  stats.trendingKeywords = Object.entries(keywordCounts)
    .filter(([, data]) => data.count >= 2)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 20)
    .map(([keyword, data]) => {
      const posCount = data.sentiments.filter((s) => s === "POSITIVE").length;
      const negCount = data.sentiments.filter((s) => s === "NEGATIVE").length;
      let sentiment = "NEUTRAL";
      if (posCount > negCount && posCount > data.count * 0.4) sentiment = "POSITIVE";
      if (negCount > posCount && negCount > data.count * 0.4) sentiment = "NEGATIVE";

      return {
        keyword,
        count: data.count,
        sentiment,
      };
    });

  return stats;
}

// Get mention trends over time
export async function getMentionTrends(
  userId: string,
  days: number = 30
): Promise<{ date: string; count: number; sentiment: number }[]> {
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - days);

  const mentions = await prisma.mention.findMany({
    where: {
      userId,
      createdAt: { gte: dateFrom },
    },
    select: {
      createdAt: true,
      sentiment: true,
    },
  });

  const dateMap: Record<string, { count: number; scores: number[] }> = {};

  mentions.forEach((mention) => {
    const dateKey = mention.createdAt.toISOString().split("T")[0];
    if (!dateMap[dateKey]) {
      dateMap[dateKey] = { count: 0, scores: [] };
    }
    dateMap[dateKey].count++;

    let score = 0;
    if (mention.sentiment === "POSITIVE") score = 1;
    else if (mention.sentiment === "NEGATIVE") score = -1;
    dateMap[dateKey].scores.push(score);
  });

  const result: { date: string; count: number; sentiment: number }[] = [];

  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - i));
    const dateKey = date.toISOString().split("T")[0];

    const data = dateMap[dateKey] || { count: 0, scores: [] };
    const avgSentiment = data.scores.length > 0
      ? data.scores.reduce((a, b) => a + b, 0) / data.scores.length
      : 0;

    result.push({
      date: dateKey,
      count: data.count,
      sentiment: Math.round(avgSentiment * 100) / 100,
    });
  }

  return result;
}

// Generate AI insights from mentions
export async function generateListeningInsights(
  userId: string
): Promise<{
  summary: string;
  keyFindings: string[];
  recommendations: string[];
  sentiment: string;
}> {
  const stats = await getListeningStats(userId, {
    dateFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
  });

  const prompt = `Analyze these social listening metrics and provide insights:

Total Mentions: ${stats.totalMentions}
Positive: ${stats.positiveMentions}
Neutral: ${stats.neutralMentions}
Negative: ${stats.negativeMentions}

Top Keywords: ${stats.trendingKeywords.map((k) => `${k.keyword} (${k.count})`).join(", ")}

Platform Distribution: ${stats.platformBreakdown.map((p) => `${p.platform}: ${p.percentage}%`).join(", ")}

Return JSON with:
- summary: 2-3 sentence overview
- keyFindings: array of 3-4 key insights
- recommendations: array of 2-3 actionable recommendations
- sentiment: overall sentiment assessment (positive/neutral/negative)`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a social media analyst. Provide actionable insights from social listening data.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.5,
      max_tokens: 500,
    });

    const result = response.choices[0]?.message?.content || "{}";
    const cleanResult = result.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleanResult);
  } catch (error) {
    console.error("Insights generation error:", error);
    return {
      summary: "Unable to generate insights at this time.",
      keyFindings: [],
      recommendations: [],
      sentiment: "neutral",
    };
  }
}

// Mark mentions as read
export async function markMentionsRead(
  userId: string,
  mentionIds: string[]
) {
  return prisma.mention.updateMany({
    where: {
      id: { in: mentionIds },
      userId,
    },
    data: {
      status: "READ",
    },
  });
}

// Get alert triggers based on keywords
export async function getAlertTriggers(
  userId: string,
  keywords: string[]
): Promise<ListeningMention[]> {
  const mentions = await getListeningMentions(userId, {
    isRead: false,
    limit: 100,
  });

  const lowerKeywords = keywords.map((k) => k.toLowerCase());

  return mentions.filter((mention) => {
    const lowerContent = mention.content.toLowerCase();
    return lowerKeywords.some((keyword) => lowerContent.includes(keyword));
  });
}
