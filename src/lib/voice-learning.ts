import OpenAI from "openai";
import { prisma } from "./prisma";
import { PostStatus } from "@prisma/client";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface VoiceAnalysis {
  avgSentenceLen: number;
  avgWordLen: number;
  emojiUsage: number;
  hashtagUsage: number;
  questionUsage: number;
  exclamationUse: number;
  commonPhrases: string[];
  commonEmojis: string[];
  commonHashtags: string[];
  toneKeywords: string[];
  styleAnalysis: string;
}

// Analyze user's posting style from their past posts
export async function analyzeVoice(userId: string): Promise<VoiceAnalysis | null> {
  // Get user's published posts
  const posts = await prisma.post.findMany({
    where: {
      userId,
      status: PostStatus.POSTED,
    },
    orderBy: { postedAt: "desc" },
    take: 50, // Analyze last 50 posts
    select: { content: true },
  });

  if (posts.length < 5) {
    return null; // Need at least 5 posts to analyze
  }

  const contents = posts.map((p) => p.content);

  // Calculate basic metrics
  const metrics = calculateMetrics(contents);

  // Use AI to analyze deeper patterns
  const aiAnalysis = await analyzeWithAI(contents);

  return {
    ...metrics,
    ...aiAnalysis,
  };
}

function calculateMetrics(posts: string[]) {
  let totalSentences = 0;
  let totalWords = 0;
  let totalChars = 0;
  let emojiCount = 0;
  let hashtagCount = 0;
  let questionCount = 0;
  let exclamationCount = 0;

  const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
  const hashtagRegex = /#\w+/g;
  const allEmojis: string[] = [];
  const allHashtags: string[] = [];

  for (const post of posts) {
    // Count sentences (rough approximation)
    const sentences = post.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    totalSentences += sentences.length;

    // Count words
    const words = post.split(/\s+/).filter((w) => w.length > 0);
    totalWords += words.length;
    totalChars += words.join("").length;

    // Count emojis
    const emojis = post.match(emojiRegex) || [];
    emojiCount += emojis.length;
    allEmojis.push(...emojis);

    // Count hashtags
    const hashtags = post.match(hashtagRegex) || [];
    hashtagCount += hashtags.length;
    allHashtags.push(...hashtags);

    // Count questions and exclamations
    questionCount += (post.match(/\?/g) || []).length;
    exclamationCount += (post.match(/!/g) || []).length;
  }

  const totalPosts = posts.length;

  // Find most common emojis
  const emojiFreq = countFrequency(allEmojis);
  const commonEmojis = Object.entries(emojiFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([emoji]) => emoji);

  // Find most common hashtags
  const hashtagFreq = countFrequency(allHashtags);
  const commonHashtags = Object.entries(hashtagFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag);

  return {
    avgSentenceLen: totalSentences > 0 ? totalWords / totalSentences : 0,
    avgWordLen: totalWords > 0 ? totalChars / totalWords : 0,
    emojiUsage: emojiCount / totalPosts,
    hashtagUsage: hashtagCount / totalPosts,
    questionUsage: questionCount / totalPosts,
    exclamationUse: exclamationCount / totalPosts,
    commonEmojis,
    commonHashtags,
  };
}

function countFrequency(items: string[]): Record<string, number> {
  const freq: Record<string, number> = {};
  for (const item of items) {
    freq[item] = (freq[item] || 0) + 1;
  }
  return freq;
}

async function analyzeWithAI(posts: string[]): Promise<{
  commonPhrases: string[];
  toneKeywords: string[];
  styleAnalysis: string;
}> {
  const samplePosts = posts.slice(0, 20).join("\n---\n");

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are an expert writing analyst. Analyze the writing style of these social media posts and provide insights.
Return a JSON object with:
- commonPhrases: array of 5-10 recurring phrases or sentence starters the author uses
- toneKeywords: array of 5-10 adjectives describing the writing tone (e.g., "conversational", "technical", "enthusiastic")
- styleAnalysis: a 2-3 sentence summary of the author's unique writing style, voice, and patterns

Be specific and observational. Look for unique quirks, formatting habits, and linguistic patterns.`,
      },
      {
        role: "user",
        content: `Analyze these posts:\n\n${samplePosts}`,
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 500,
  });

  try {
    const result = JSON.parse(response.choices[0].message.content || "{}");
    return {
      commonPhrases: result.commonPhrases || [],
      toneKeywords: result.toneKeywords || [],
      styleAnalysis: result.styleAnalysis || "",
    };
  } catch {
    return {
      commonPhrases: [],
      toneKeywords: [],
      styleAnalysis: "",
    };
  }
}

// Update or create voice profile for user
export async function updateVoiceProfile(userId: string) {
  const analysis = await analyzeVoice(userId);

  if (!analysis) {
    return null;
  }

  // Get sample posts for reference
  const samplePosts = await prisma.post.findMany({
    where: { userId, status: PostStatus.POSTED },
    orderBy: { likes: "desc" },
    take: 10,
    select: { content: true },
  });

  const profile = await prisma.voiceProfile.upsert({
    where: { userId },
    update: {
      avgSentenceLen: analysis.avgSentenceLen,
      avgWordLen: analysis.avgWordLen,
      emojiUsage: analysis.emojiUsage,
      hashtagUsage: analysis.hashtagUsage,
      questionUsage: analysis.questionUsage,
      exclamationUse: analysis.exclamationUse,
      commonPhrases: analysis.commonPhrases,
      commonEmojis: analysis.commonEmojis,
      commonHashtags: analysis.commonHashtags,
      toneKeywords: analysis.toneKeywords,
      styleAnalysis: analysis.styleAnalysis,
      samplePosts: samplePosts.map((p) => p.content),
      postsAnalyzed: 50,
      lastAnalyzed: new Date(),
    },
    create: {
      userId,
      avgSentenceLen: analysis.avgSentenceLen,
      avgWordLen: analysis.avgWordLen,
      emojiUsage: analysis.emojiUsage,
      hashtagUsage: analysis.hashtagUsage,
      questionUsage: analysis.questionUsage,
      exclamationUse: analysis.exclamationUse,
      commonPhrases: analysis.commonPhrases,
      commonEmojis: analysis.commonEmojis,
      commonHashtags: analysis.commonHashtags,
      toneKeywords: analysis.toneKeywords,
      styleAnalysis: analysis.styleAnalysis,
      samplePosts: samplePosts.map((p) => p.content),
      postsAnalyzed: 50,
      lastAnalyzed: new Date(),
    },
  });

  return profile;
}

// Get voice profile for user
export async function getVoiceProfile(userId: string) {
  return prisma.voiceProfile.findUnique({
    where: { userId },
  });
}

// Generate voice-aware prompt enhancement
export function getVoicePromptEnhancement(profile: {
  styleAnalysis: string | null;
  commonPhrases: string[];
  toneKeywords: string[];
  emojiUsage: number | null;
  hashtagUsage: number | null;
  commonEmojis: string[];
  commonHashtags: string[];
}): string {
  const parts: string[] = [];

  if (profile.styleAnalysis) {
    parts.push(`Writing style: ${profile.styleAnalysis}`);
  }

  if (profile.toneKeywords.length > 0) {
    parts.push(`Tone: ${profile.toneKeywords.join(", ")}`);
  }

  if (profile.commonPhrases.length > 0) {
    parts.push(`Often uses phrases like: "${profile.commonPhrases.slice(0, 3).join('", "')}"`);
  }

  if (profile.emojiUsage && profile.emojiUsage > 0.3 && profile.commonEmojis.length > 0) {
    parts.push(`Frequently uses emojis like: ${profile.commonEmojis.slice(0, 3).join(" ")}`);
  }

  if (profile.hashtagUsage && profile.hashtagUsage > 0.3 && profile.commonHashtags.length > 0) {
    parts.push(`Often includes hashtags like: ${profile.commonHashtags.slice(0, 3).join(", ")}`);
  }

  return parts.join("\n");
}
