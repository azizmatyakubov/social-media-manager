import { prisma } from "./prisma";
import { getOpenAI } from "./openai";

// Types
export interface ViralTweetFilters {
  category?: string;
  minLikes?: number;
  maxLikes?: number;
  minRetweets?: number;
  maxRetweets?: number;
  minEngagementRate?: number;
  dateFrom?: Date;
  dateTo?: Date;
  topics?: string[];
  authorVerified?: boolean;
  sortBy?: "likes" | "retweets" | "engagementRate" | "viralScore" | "tweetedAt";
  sortOrder?: "asc" | "desc";
}

export interface SearchResult {
  tweets: ViralTweetWithStats[];
  total: number;
  hasMore: boolean;
}

export interface ViralTweetWithStats {
  id: string;
  tweetId: string;
  authorId: string;
  authorUsername: string;
  authorName: string;
  authorFollowers: number;
  authorVerified: boolean;
  content: string;
  mediaUrls: string[];
  likes: number;
  retweets: number;
  replies: number;
  impressions: number;
  engagementRate: number;
  viralScore: number;
  category: string | null;
  topics: string[];
  hashtags: string[];
  tweetedAt: Date;
  collectedAt: Date;
  isSaved?: boolean;
}

// Categories for viral tweets
export const VIRAL_CATEGORIES = [
  "motivation",
  "tech",
  "marketing",
  "humor",
  "business",
  "productivity",
  "startup",
  "finance",
  "health",
  "lifestyle",
  "news",
  "education",
  "entertainment",
  "sports",
  "politics",
  "science",
  "art",
  "food",
  "travel",
  "other",
] as const;

export type ViralCategory = (typeof VIRAL_CATEGORIES)[number];

/**
 * Search viral tweets with filters and pagination
 */
export async function searchViralTweets(
  query: string,
  filters: ViralTweetFilters = {},
  page: number = 1,
  limit: number = 20,
  userId?: string
): Promise<SearchResult> {
  const skip = (page - 1) * limit;

  // Build where clause
  const where: Record<string, unknown> = {};

  // Full-text search on content
  if (query && query.trim()) {
    where.content = {
      contains: query.trim(),
      mode: "insensitive",
    };
  }

  // Category filter
  if (filters.category) {
    where.category = filters.category;
  }

  // Likes range
  if (filters.minLikes !== undefined || filters.maxLikes !== undefined) {
    where.likes = {};
    if (filters.minLikes !== undefined) {
      (where.likes as Record<string, number>).gte = filters.minLikes;
    }
    if (filters.maxLikes !== undefined) {
      (where.likes as Record<string, number>).lte = filters.maxLikes;
    }
  }

  // Retweets range
  if (filters.minRetweets !== undefined || filters.maxRetweets !== undefined) {
    where.retweets = {};
    if (filters.minRetweets !== undefined) {
      (where.retweets as Record<string, number>).gte = filters.minRetweets;
    }
    if (filters.maxRetweets !== undefined) {
      (where.retweets as Record<string, number>).lte = filters.maxRetweets;
    }
  }

  // Engagement rate
  if (filters.minEngagementRate !== undefined) {
    where.engagementRate = {
      gte: filters.minEngagementRate,
    };
  }

  // Date range
  if (filters.dateFrom || filters.dateTo) {
    where.tweetedAt = {};
    if (filters.dateFrom) {
      (where.tweetedAt as Record<string, Date>).gte = filters.dateFrom;
    }
    if (filters.dateTo) {
      (where.tweetedAt as Record<string, Date>).lte = filters.dateTo;
    }
  }

  // Topics filter
  if (filters.topics && filters.topics.length > 0) {
    where.topics = {
      hasSome: filters.topics,
    };
  }

  // Verified author filter
  if (filters.authorVerified !== undefined) {
    where.authorVerified = filters.authorVerified;
  }

  // Sorting
  const sortBy = filters.sortBy || "viralScore";
  const sortOrder = filters.sortOrder || "desc";
  const orderBy: Record<string, string> = { [sortBy]: sortOrder };

  // Query with count
  const [tweets, total] = await Promise.all([
    prisma.viralTweet.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    prisma.viralTweet.count({ where }),
  ]);

  // If userId provided, check which tweets are saved
  let savedTweetIds: Set<string> = new Set();
  if (userId) {
    const savedTweets = await prisma.savedViralTweet.findMany({
      where: {
        userId,
        viralTweetId: { in: tweets.map((t) => t.id) },
      },
      select: { viralTweetId: true },
    });
    savedTweetIds = new Set(savedTweets.map((s) => s.viralTweetId));
  }

  const tweetsWithSaved: ViralTweetWithStats[] = tweets.map((tweet) => ({
    ...tweet,
    isSaved: savedTweetIds.has(tweet.id),
  }));

  return {
    tweets: tweetsWithSaved,
    total,
    hasMore: skip + tweets.length < total,
  };
}

/**
 * Get viral tweets by category with limit
 */
export async function getViralTweetsByCategory(
  category: string,
  limit: number = 20,
  userId?: string
): Promise<ViralTweetWithStats[]> {
  const tweets = await prisma.viralTweet.findMany({
    where: { category },
    orderBy: { viralScore: "desc" },
    take: limit,
  });

  // Check saved status if userId provided
  let savedTweetIds: Set<string> = new Set();
  if (userId) {
    const savedTweets = await prisma.savedViralTweet.findMany({
      where: {
        userId,
        viralTweetId: { in: tweets.map((t) => t.id) },
      },
      select: { viralTweetId: true },
    });
    savedTweetIds = new Set(savedTweets.map((s) => s.viralTweetId));
  }

  return tweets.map((tweet) => ({
    ...tweet,
    isSaved: savedTweetIds.has(tweet.id),
  }));
}

/**
 * Get recently trending/viral tweets
 */
export async function getTrendingViralTweets(
  limit: number = 20,
  userId?: string
): Promise<ViralTweetWithStats[]> {
  // Get tweets from the last 7 days with high engagement
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const tweets = await prisma.viralTweet.findMany({
    where: {
      tweetedAt: { gte: sevenDaysAgo },
    },
    orderBy: [{ viralScore: "desc" }, { engagementRate: "desc" }],
    take: limit,
  });

  // Check saved status if userId provided
  let savedTweetIds: Set<string> = new Set();
  if (userId) {
    const savedTweets = await prisma.savedViralTweet.findMany({
      where: {
        userId,
        viralTweetId: { in: tweets.map((t) => t.id) },
      },
      select: { viralTweetId: true },
    });
    savedTweetIds = new Set(savedTweets.map((s) => s.viralTweetId));
  }

  return tweets.map((tweet) => ({
    ...tweet,
    isSaved: savedTweetIds.has(tweet.id),
  }));
}

/**
 * Save a viral tweet to user's collection
 */
export async function saveViralTweet(
  userId: string,
  viralTweetId: string,
  notes?: string
): Promise<{ id: string; savedAt: Date }> {
  // Verify the viral tweet exists
  const viralTweet = await prisma.viralTweet.findUnique({
    where: { id: viralTweetId },
  });

  if (!viralTweet) {
    throw new Error("Viral tweet not found");
  }

  // Check if already saved
  const existing = await prisma.savedViralTweet.findUnique({
    where: {
      userId_viralTweetId: { userId, viralTweetId },
    },
  });

  if (existing) {
    // Update notes if provided
    if (notes !== undefined) {
      await prisma.savedViralTweet.update({
        where: { id: existing.id },
        data: { notes },
      });
    }
    return { id: existing.id, savedAt: existing.savedAt };
  }

  // Create new saved entry
  const saved = await prisma.savedViralTweet.create({
    data: {
      userId,
      viralTweetId,
      notes,
    },
  });

  return { id: saved.id, savedAt: saved.savedAt };
}

/**
 * Get user's saved viral tweets
 */
export async function getSavedViralTweets(
  userId: string,
  page: number = 1,
  limit: number = 20
): Promise<{
  tweets: (ViralTweetWithStats & { notes: string | null; savedAt: Date })[];
  total: number;
  hasMore: boolean;
}> {
  const skip = (page - 1) * limit;

  const [savedTweets, total] = await Promise.all([
    prisma.savedViralTweet.findMany({
      where: { userId },
      orderBy: { savedAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.savedViralTweet.count({ where: { userId } }),
  ]);

  // Get the actual viral tweets
  const viralTweetIds = savedTweets.map((s) => s.viralTweetId);
  const viralTweets = await prisma.viralTweet.findMany({
    where: { id: { in: viralTweetIds } },
  });

  // Create a map for quick lookup
  const viralTweetMap = new Map(viralTweets.map((t) => [t.id, t]));

  // Combine the data
  const tweets = savedTweets
    .map((saved) => {
      const viralTweet = viralTweetMap.get(saved.viralTweetId);
      if (!viralTweet) return null;

      return {
        ...viralTweet,
        isSaved: true,
        notes: saved.notes,
        savedAt: saved.savedAt,
      };
    })
    .filter(Boolean) as (ViralTweetWithStats & {
    notes: string | null;
    savedAt: Date;
  })[];

  return {
    tweets,
    total,
    hasMore: skip + tweets.length < total,
  };
}

/**
 * Remove a viral tweet from user's saved collection
 */
export async function removeSavedViralTweet(
  userId: string,
  viralTweetId: string
): Promise<boolean> {
  const saved = await prisma.savedViralTweet.findUnique({
    where: {
      userId_viralTweetId: { userId, viralTweetId },
    },
  });

  if (!saved) {
    return false;
  }

  await prisma.savedViralTweet.delete({
    where: { id: saved.id },
  });

  return true;
}

/**
 * Get AI-powered content inspiration for a topic
 * Returns similar viral tweets and AI-generated suggestions
 */
export async function getInspirationForTopic(
  topic: string,
  userId?: string
): Promise<{
  similarTweets: ViralTweetWithStats[];
  suggestions: string[];
  contentIdeas: string[];
}> {
  // Find tweets related to the topic
  const similarTweets = await prisma.viralTweet.findMany({
    where: {
      OR: [
        { content: { contains: topic, mode: "insensitive" } },
        { topics: { has: topic.toLowerCase() } },
        { hashtags: { has: `#${topic.toLowerCase()}` } },
      ],
    },
    orderBy: { viralScore: "desc" },
    take: 10,
  });

  // Check saved status
  let savedTweetIds: Set<string> = new Set();
  if (userId) {
    const savedTweetsList = await prisma.savedViralTweet.findMany({
      where: {
        userId,
        viralTweetId: { in: similarTweets.map((t) => t.id) },
      },
      select: { viralTweetId: true },
    });
    savedTweetIds = new Set(savedTweetsList.map((s) => s.viralTweetId));
  }

  const tweetsWithSaved: ViralTweetWithStats[] = similarTweets.map((tweet) => ({
    ...tweet,
    isSaved: savedTweetIds.has(tweet.id),
  }));

  // Get AI suggestions based on the topic and similar tweets
  const openai = getOpenAI();

  const topTweetsContent = similarTweets
    .slice(0, 5)
    .map((t) => `- "${t.content}" (${t.likes} likes)`)
    .join("\n");

  const prompt = `Based on this topic: "${topic}"

And these viral tweet examples about similar topics:
${topTweetsContent || "No examples available."}

Generate:
1. Three unique tweet suggestions (under 280 characters each) inspired by what makes these viral
2. Three content ideas that could work well for this topic

Return JSON with:
{
  "suggestions": ["tweet1", "tweet2", "tweet3"],
  "contentIdeas": ["idea1", "idea2", "idea3"]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 500,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are an expert social media strategist. Generate engaging content ideas and tweet suggestions.",
        },
        { role: "user", content: prompt },
      ],
    });

    const result = JSON.parse(response.choices[0]?.message?.content || "{}");

    return {
      similarTweets: tweetsWithSaved,
      suggestions: result.suggestions || [],
      contentIdeas: result.contentIdeas || [],
    };
  } catch (error) {
    console.error("Error generating inspiration:", error);
    return {
      similarTweets: tweetsWithSaved,
      suggestions: [],
      contentIdeas: [],
    };
  }
}

/**
 * AI-powered tweet categorization
 */
export async function categorizeTweet(
  content: string
): Promise<{
  category: ViralCategory;
  confidence: number;
  topics: string[];
  hashtags: string[];
}> {
  const openai = getOpenAI();

  const categoriesStr = VIRAL_CATEGORIES.join(", ");

  const prompt = `Categorize this tweet and extract topics:

Tweet: "${content}"

Categories to choose from: ${categoriesStr}

Return JSON with:
{
  "category": "one of the categories above",
  "confidence": 0.0-1.0 confidence score,
  "topics": ["topic1", "topic2"] - 2-5 relevant topic keywords,
  "hashtags": ["#tag1", "#tag2"] - 2-4 relevant hashtags
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 200,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are an expert at categorizing social media content. Be accurate and concise.",
        },
        { role: "user", content: prompt },
      ],
    });

    const result = JSON.parse(response.choices[0]?.message?.content || "{}");

    // Validate category
    const category = VIRAL_CATEGORIES.includes(result.category)
      ? result.category
      : "other";

    return {
      category,
      confidence: Math.min(1, Math.max(0, result.confidence || 0.5)),
      topics: result.topics || [],
      hashtags: result.hashtags || [],
    };
  } catch (error) {
    console.error("Error categorizing tweet:", error);
    return {
      category: "other",
      confidence: 0,
      topics: [],
      hashtags: [],
    };
  }
}

/**
 * Get category statistics
 */
export async function getCategoryStats(): Promise<
  {
    category: string;
    count: number;
    avgLikes: number;
    avgEngagement: number;
  }[]
> {
  const stats = await prisma.viralTweet.groupBy({
    by: ["category"],
    _count: { id: true },
    _avg: { likes: true, engagementRate: true },
    where: {
      category: { not: null },
    },
  });

  return stats.map((s) => ({
    category: s.category || "other",
    count: s._count.id,
    avgLikes: Math.round(s._avg.likes || 0),
    avgEngagement: parseFloat((s._avg.engagementRate || 0).toFixed(2)),
  }));
}

/**
 * Mark a saved tweet as used (for tracking inspiration usage)
 */
export async function markSavedTweetAsUsed(
  userId: string,
  viralTweetId: string
): Promise<boolean> {
  const saved = await prisma.savedViralTweet.findUnique({
    where: {
      userId_viralTweetId: { userId, viralTweetId },
    },
  });

  if (!saved) {
    return false;
  }

  await prisma.savedViralTweet.update({
    where: { id: saved.id },
    data: {
      usedCount: { increment: 1 },
      lastUsed: new Date(),
    },
  });

  return true;
}
