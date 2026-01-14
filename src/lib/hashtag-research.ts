import { getOpenAI } from "./openai";
import { prisma } from "./prisma";
import { Platform } from "@prisma/client";

interface HashtagData {
  hashtag: string;
  category: string;
  popularity: "high" | "medium" | "low";
  competition: "high" | "medium" | "low";
  recommendedFor: string[];
  relatedHashtags: string[];
}

interface HashtagSuggestion {
  hashtag: string;
  relevance: number;
  estimatedReach: string;
  category: string;
}

interface HashtagSet {
  primary: string[];
  secondary: string[];
  niche: string[];
}

export async function suggestHashtagsForContent(
  content: string,
  platform: Platform = Platform.X,
  count: number = 15
): Promise<HashtagSuggestion[]> {
  const openai = getOpenAI();

  const platformLimits: Record<Platform, number> = {
    X: 3,
    INSTAGRAM: 30,
    LINKEDIN: 5,
    TIKTOK: 5,
    YOUTUBE: 15,
    PINTEREST: 20,
    BLUESKY: 5,
  };

  const maxHashtags = Math.min(count, platformLimits[platform] || 10);

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a social media hashtag expert. Suggest relevant hashtags for ${platform} content.
For each hashtag:
- Evaluate relevance (0-100)
- Estimate reach (e.g., "100K-500K", "1M+")
- Categorize (e.g., "industry", "trending", "niche", "community")

Return JSON format: { "suggestions": [{ "hashtag": "#example", "relevance": 85, "estimatedReach": "100K-500K", "category": "industry" }] }`,
      },
      {
        role: "user",
        content: `Suggest ${maxHashtags} hashtags for this ${platform} content:\n\n${content}`,
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 1000,
  });

  const result = JSON.parse(response.choices[0]?.message?.content || "{}");
  return result.suggestions || [];
}

export async function getHashtagsForTopic(
  topic: string,
  platform: Platform = Platform.X
): Promise<HashtagSet> {
  const openai = getOpenAI();

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a hashtag research expert for ${platform}.
Provide hashtags categorized into:
- Primary: High-volume, directly related hashtags (3-5)
- Secondary: Medium-volume, related hashtags (5-7)
- Niche: Lower-volume but highly targeted hashtags (3-5)

Return JSON: { "primary": ["#tag1"], "secondary": ["#tag2"], "niche": ["#tag3"] }`,
      },
      {
        role: "user",
        content: `Find hashtags for the topic: ${topic}`,
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 500,
  });

  const result = JSON.parse(response.choices[0]?.message?.content || "{}");
  return {
    primary: result.primary || [],
    secondary: result.secondary || [],
    niche: result.niche || [],
  };
}

export async function analyzeHashtag(hashtag: string): Promise<HashtagData> {
  const openai = getOpenAI();
  const cleanHashtag = hashtag.startsWith("#") ? hashtag.slice(1) : hashtag;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Analyze the hashtag and provide:
- category: what industry/topic it belongs to
- popularity: "high", "medium", or "low"
- competition: "high", "medium", or "low"
- recommendedFor: types of accounts/content that should use it
- relatedHashtags: 5-10 related hashtags

Return JSON format with these fields.`,
      },
      {
        role: "user",
        content: `Analyze the hashtag: #${cleanHashtag}`,
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 500,
  });

  const result = JSON.parse(response.choices[0]?.message?.content || "{}");
  return {
    hashtag: `#${cleanHashtag}`,
    category: result.category || "general",
    popularity: result.popularity || "medium",
    competition: result.competition || "medium",
    recommendedFor: result.recommendedFor || [],
    relatedHashtags: result.relatedHashtags || [],
  };
}

export async function getTrendingHashtags(
  platform: Platform = Platform.X,
  category?: string
): Promise<Array<{ hashtag: string; trend: "rising" | "stable" | "declining"; category: string }>> {
  const openai = getOpenAI();

  const prompt = category
    ? `List 15 currently trending hashtags on ${platform} in the "${category}" category.`
    : `List 15 currently trending hashtags across all categories on ${platform}.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a social media trend analyst. Identify trending hashtags.
For each, indicate:
- trend: "rising", "stable", or "declining"
- category: the content category

Return JSON: { "trending": [{ "hashtag": "#example", "trend": "rising", "category": "tech" }] }`,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 800,
  });

  const result = JSON.parse(response.choices[0]?.message?.content || "{}");
  return result.trending || [];
}

export async function generateHashtagStrategy(
  niche: string,
  accountSize: "small" | "medium" | "large",
  goals: string[]
): Promise<{
  strategy: string;
  recommended: HashtagSet;
  tips: string[];
  avoidList: string[];
}> {
  const openai = getOpenAI();

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a social media growth strategist. Create a hashtag strategy based on:
- Account size affects which hashtags to prioritize
- Small accounts: focus on niche hashtags
- Medium accounts: mix of popular and niche
- Large accounts: can target popular hashtags

Provide:
1. Overall strategy explanation
2. Recommended hashtag sets (primary, secondary, niche)
3. Tips for using hashtags effectively
4. Hashtags to avoid

Return JSON format.`,
      },
      {
        role: "user",
        content: `Create a hashtag strategy for:
Niche: ${niche}
Account Size: ${accountSize}
Goals: ${goals.join(", ")}`,
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 1000,
  });

  const result = JSON.parse(response.choices[0]?.message?.content || "{}");
  return {
    strategy: result.strategy || "",
    recommended: result.recommended || { primary: [], secondary: [], niche: [] },
    tips: result.tips || [],
    avoidList: result.avoidList || [],
  };
}

export async function findRelatedHashtags(
  baseHashtags: string[],
  platform: Platform = Platform.X
): Promise<string[]> {
  const openai = getOpenAI();

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Find related hashtags that work well with the given hashtags on ${platform}.
Return 10-15 complementary hashtags that would expand reach while staying relevant.
Return JSON: { "related": ["#hashtag1", "#hashtag2"] }`,
      },
      {
        role: "user",
        content: `Find hashtags related to: ${baseHashtags.join(", ")}`,
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 300,
  });

  const result = JSON.parse(response.choices[0]?.message?.content || "{}");
  return result.related || [];
}

export async function saveHashtagCollection(
  userId: string,
  name: string,
  hashtags: string[],
  platform: Platform
) {
  // For now, we'll store this in a simple way
  // In a production app, you'd have a dedicated HashtagCollection model
  return {
    id: Date.now().toString(),
    userId,
    name,
    hashtags,
    platform,
    createdAt: new Date(),
  };
}

export async function getUserTopHashtags(userId: string, limit: number = 20) {
  // Analyze user's published posts to find their most used hashtags
  const posts = await prisma.post.findMany({
    where: {
      userId,
      status: "PUBLISHED",
    },
    select: {
      content: true,
    },
    take: 100,
    orderBy: { createdAt: "desc" },
  });

  const hashtagCount: Record<string, number> = {};

  posts.forEach((post) => {
    const hashtags = post.content.match(/#\w+/g) || [];
    hashtags.forEach((tag) => {
      const normalized = tag.toLowerCase();
      hashtagCount[normalized] = (hashtagCount[normalized] || 0) + 1;
    });
  });

  return Object.entries(hashtagCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([hashtag, count]) => ({ hashtag, count }));
}

export function formatHashtagsForPlatform(
  hashtags: string[],
  platform: Platform,
  placement: "inline" | "end" = "end"
): string {
  const limits: Record<Platform, number> = {
    X: 3,
    INSTAGRAM: 30,
    LINKEDIN: 5,
    TIKTOK: 5,
    YOUTUBE: 15,
    PINTEREST: 20,
    BLUESKY: 5,
  };

  const limited = hashtags.slice(0, limits[platform] || 10);
  const formatted = limited.map((h) => (h.startsWith("#") ? h : `#${h}`));

  if (placement === "inline") {
    return formatted.join(" ");
  }

  // For "end" placement, add line breaks for Instagram
  if (platform === Platform.INSTAGRAM) {
    return "\n.\n.\n.\n" + formatted.join(" ");
  }

  return "\n\n" + formatted.join(" ");
}
