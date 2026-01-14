import OpenAI from "openai";
import { prisma } from "./prisma";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Types
export type SentimentType = "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "MIXED";
export type EmotionType =
  | "JOY"
  | "ANGER"
  | "SADNESS"
  | "FEAR"
  | "SURPRISE"
  | "DISGUST"
  | "TRUST"
  | "ANTICIPATION";

export interface SentimentResult {
  sentiment: SentimentType;
  score: number; // -1 to 1
  confidence: number; // 0 to 1
  emotions: {
    emotion: EmotionType;
    score: number;
  }[];
  keywords: string[];
  intent: "QUESTION" | "COMPLAINT" | "PRAISE" | "SUGGESTION" | "GENERAL";
  urgency: "LOW" | "MEDIUM" | "HIGH";
  actionRequired: boolean;
  summary: string;
}

export interface CommentWithSentiment {
  id: string;
  text: string;
  authorName: string;
  authorHandle?: string;
  platform: string;
  postId?: string;
  postContent?: string;
  createdAt: Date;
  sentiment?: SentimentResult;
}

export interface SentimentStats {
  total: number;
  positive: number;
  neutral: number;
  negative: number;
  mixed: number;
  avgScore: number;
  topEmotions: { emotion: EmotionType; count: number }[];
  actionRequired: number;
  urgentCount: number;
  intents: { intent: string; count: number }[];
}

// Analyze sentiment of a single comment
export async function analyzeSentiment(text: string): Promise<SentimentResult> {
  const prompt = `Analyze the sentiment and emotions of this social media comment. Return a JSON object with:
- sentiment: "POSITIVE", "NEUTRAL", "NEGATIVE", or "MIXED"
- score: number from -1 (most negative) to 1 (most positive)
- confidence: number from 0 to 1
- emotions: array of {emotion, score} where emotion is one of: JOY, ANGER, SADNESS, FEAR, SURPRISE, DISGUST, TRUST, ANTICIPATION
- keywords: array of key phrases/words
- intent: "QUESTION", "COMPLAINT", "PRAISE", "SUGGESTION", or "GENERAL"
- urgency: "LOW", "MEDIUM", or "HIGH"
- actionRequired: boolean indicating if this needs a response
- summary: brief 1-sentence summary

Comment: "${text}"

Return only valid JSON, no explanation.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a sentiment analysis expert. Analyze social media comments accurately and return structured JSON.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content || "{}";
    const cleanContent = content.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleanContent) as SentimentResult;
  } catch (error) {
    console.error("Sentiment analysis error:", error);
    // Return default neutral sentiment on error
    return {
      sentiment: "NEUTRAL",
      score: 0,
      confidence: 0.5,
      emotions: [],
      keywords: [],
      intent: "GENERAL",
      urgency: "LOW",
      actionRequired: false,
      summary: "Unable to analyze sentiment",
    };
  }
}

// Analyze multiple comments in batch
export async function analyzeSentimentBatch(
  comments: { id: string; text: string }[]
): Promise<Map<string, SentimentResult>> {
  const results = new Map<string, SentimentResult>();

  // Process in parallel with rate limiting (5 at a time)
  const batchSize = 5;
  for (let i = 0; i < comments.length; i += batchSize) {
    const batch = comments.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (comment) => {
        const result = await analyzeSentiment(comment.text);
        return { id: comment.id, result };
      })
    );

    batchResults.forEach(({ id, result }) => {
      results.set(id, result);
    });
  }

  return results;
}

// Get comments with sentiment analysis
export async function getCommentsWithSentiment(
  userId: string,
  options?: {
    platform?: string;
    sentiment?: SentimentType;
    actionRequired?: boolean;
    urgency?: "LOW" | "MEDIUM" | "HIGH";
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
  }
): Promise<CommentWithSentiment[]> {
  // Get mentions/comments from the database
  const where: Record<string, unknown> = { userId };

  if (options?.platform) {
    where.platform = options.platform;
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
    include: {
      post: {
        select: {
          id: true,
          content: true,
        },
      },
    },
  });

  // Analyze sentiment for each comment
  const commentsWithSentiment: CommentWithSentiment[] = await Promise.all(
    mentions.map(async (mention) => {
      const sentiment = await analyzeSentiment(mention.text);

      // Filter based on sentiment options
      if (options?.sentiment && sentiment.sentiment !== options.sentiment) {
        return null;
      }
      if (options?.actionRequired !== undefined && sentiment.actionRequired !== options.actionRequired) {
        return null;
      }
      if (options?.urgency && sentiment.urgency !== options.urgency) {
        return null;
      }

      return {
        id: mention.id,
        text: mention.text,
        authorName: mention.authorName,
        authorHandle: mention.authorHandle || undefined,
        platform: mention.platform,
        postId: mention.postId || undefined,
        postContent: mention.post?.content || undefined,
        createdAt: mention.createdAt,
        sentiment,
      };
    })
  );

  return commentsWithSentiment.filter((c): c is CommentWithSentiment => c !== null);
}

// Get sentiment statistics
export async function getSentimentStats(
  userId: string,
  options?: {
    platform?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }
): Promise<SentimentStats> {
  const comments = await getCommentsWithSentiment(userId, {
    ...options,
    limit: 200, // Analyze up to 200 comments for stats
  });

  const stats: SentimentStats = {
    total: comments.length,
    positive: 0,
    neutral: 0,
    negative: 0,
    mixed: 0,
    avgScore: 0,
    topEmotions: [],
    actionRequired: 0,
    urgentCount: 0,
    intents: [],
  };

  if (comments.length === 0) {
    return stats;
  }

  const emotionCounts: Record<string, number> = {};
  const intentCounts: Record<string, number> = {};
  let totalScore = 0;

  comments.forEach((comment) => {
    if (!comment.sentiment) return;

    // Count sentiments
    switch (comment.sentiment.sentiment) {
      case "POSITIVE":
        stats.positive++;
        break;
      case "NEUTRAL":
        stats.neutral++;
        break;
      case "NEGATIVE":
        stats.negative++;
        break;
      case "MIXED":
        stats.mixed++;
        break;
    }

    totalScore += comment.sentiment.score;

    // Count emotions
    comment.sentiment.emotions.forEach(({ emotion }) => {
      emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
    });

    // Count intents
    intentCounts[comment.sentiment.intent] =
      (intentCounts[comment.sentiment.intent] || 0) + 1;

    if (comment.sentiment.actionRequired) {
      stats.actionRequired++;
    }

    if (comment.sentiment.urgency === "HIGH") {
      stats.urgentCount++;
    }
  });

  stats.avgScore = totalScore / comments.length;

  stats.topEmotions = Object.entries(emotionCounts)
    .map(([emotion, count]) => ({ emotion: emotion as EmotionType, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  stats.intents = Object.entries(intentCounts)
    .map(([intent, count]) => ({ intent, count }))
    .sort((a, b) => b.count - a.count);

  return stats;
}

// Get trending topics from comments
export async function getTrendingTopics(
  userId: string,
  options?: {
    platform?: string;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
  }
): Promise<{ topic: string; count: number; sentiment: SentimentType }[]> {
  const comments = await getCommentsWithSentiment(userId, {
    ...options,
    limit: 100,
  });

  const topicMap: Record<string, { count: number; scores: number[] }> = {};

  comments.forEach((comment) => {
    if (!comment.sentiment?.keywords) return;

    comment.sentiment.keywords.forEach((keyword) => {
      const key = keyword.toLowerCase();
      if (!topicMap[key]) {
        topicMap[key] = { count: 0, scores: [] };
      }
      topicMap[key].count++;
      topicMap[key].scores.push(comment.sentiment!.score);
    });
  });

  return Object.entries(topicMap)
    .map(([topic, data]) => {
      const avgScore = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
      let sentiment: SentimentType = "NEUTRAL";
      if (avgScore > 0.3) sentiment = "POSITIVE";
      else if (avgScore < -0.3) sentiment = "NEGATIVE";

      return { topic, count: data.count, sentiment };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, options?.limit ?? 10);
}

// Generate smart reply suggestions based on comment sentiment
export async function generateReplySuggestions(
  comment: string,
  sentiment: SentimentResult
): Promise<string[]> {
  const prompt = `Generate 3 appropriate reply suggestions for this social media comment.

Comment: "${comment}"
Sentiment: ${sentiment.sentiment} (score: ${sentiment.score})
Intent: ${sentiment.intent}
Urgency: ${sentiment.urgency}
${sentiment.actionRequired ? "This comment requires a response." : ""}

Guidelines:
- Keep replies professional but friendly
- Address the commenter's concern/question directly
- For negative comments, be empathetic and solution-oriented
- For positive comments, express genuine gratitude
- Keep each reply under 280 characters

Return only a JSON array of 3 reply strings.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a social media manager who crafts thoughtful, professional responses.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content || "[]";
    const cleanContent = content.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleanContent) as string[];
  } catch (error) {
    console.error("Reply generation error:", error);
    return [
      "Thank you for your feedback!",
      "We appreciate you taking the time to comment.",
      "Thanks for reaching out to us!",
    ];
  }
}

// Get sentiment trend over time
export async function getSentimentTrend(
  userId: string,
  days: number = 30
): Promise<{ date: string; positive: number; neutral: number; negative: number; avgScore: number }[]> {
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - days);

  const comments = await getCommentsWithSentiment(userId, {
    dateFrom,
    limit: 500,
  });

  // Group by date
  const dateMap: Record<string, { positive: number; neutral: number; negative: number; scores: number[] }> = {};

  comments.forEach((comment) => {
    const dateKey = comment.createdAt.toISOString().split("T")[0];

    if (!dateMap[dateKey]) {
      dateMap[dateKey] = { positive: 0, neutral: 0, negative: 0, scores: [] };
    }

    if (comment.sentiment) {
      switch (comment.sentiment.sentiment) {
        case "POSITIVE":
          dateMap[dateKey].positive++;
          break;
        case "NEUTRAL":
        case "MIXED":
          dateMap[dateKey].neutral++;
          break;
        case "NEGATIVE":
          dateMap[dateKey].negative++;
          break;
      }
      dateMap[dateKey].scores.push(comment.sentiment.score);
    }
  });

  // Convert to array and fill missing dates
  const result: { date: string; positive: number; neutral: number; negative: number; avgScore: number }[] = [];

  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - i));
    const dateKey = date.toISOString().split("T")[0];

    const data = dateMap[dateKey] || { positive: 0, neutral: 0, negative: 0, scores: [] };
    const avgScore = data.scores.length > 0
      ? data.scores.reduce((a, b) => a + b, 0) / data.scores.length
      : 0;

    result.push({
      date: dateKey,
      positive: data.positive,
      neutral: data.neutral,
      negative: data.negative,
      avgScore: Math.round(avgScore * 100) / 100,
    });
  }

  return result;
}

// Get priority comments (high urgency or action required)
export async function getPriorityComments(
  userId: string,
  limit: number = 10
): Promise<CommentWithSentiment[]> {
  const comments = await getCommentsWithSentiment(userId, { limit: 100 });

  // Filter and sort by priority
  return comments
    .filter((c) => c.sentiment?.actionRequired || c.sentiment?.urgency === "HIGH")
    .sort((a, b) => {
      // High urgency first, then action required
      const aScore = (a.sentiment?.urgency === "HIGH" ? 10 : 0) + (a.sentiment?.actionRequired ? 5 : 0);
      const bScore = (b.sentiment?.urgency === "HIGH" ? 10 : 0) + (b.sentiment?.actionRequired ? 5 : 0);
      return bScore - aScore;
    })
    .slice(0, limit);
}
