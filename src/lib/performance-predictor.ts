import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface PredictionInput {
  content: string;
  platform: string;
  contentType: "text" | "image" | "video" | "carousel" | "story" | "reel";
  scheduledTime?: Date;
  hashtags?: string[];
  targetAudience?: string;
  historicalData?: {
    avgLikes: number;
    avgComments: number;
    avgShares: number;
    avgEngagementRate: number;
    topPerformingTimes: string[];
    topPerformingTypes: string[];
  };
}

export interface PerformancePrediction {
  overallScore: number;
  engagementPrediction: {
    likes: { low: number; expected: number; high: number };
    comments: { low: number; expected: number; high: number };
    shares: { low: number; expected: number; high: number };
    engagementRate: { low: number; expected: number; high: number };
  };
  viralPotential: "low" | "medium" | "high" | "very_high";
  factors: {
    category: string;
    score: number;
    impact: "positive" | "neutral" | "negative";
    feedback: string;
  }[];
  recommendations: {
    priority: "high" | "medium" | "low";
    area: string;
    suggestion: string;
    potentialImpact: string;
  }[];
  bestTimeToPost: string[];
  competitorBenchmark?: {
    percentile: number;
    feedback: string;
  };
}

export interface ContentElement {
  element: string;
  score: number;
  feedback: string;
}

export async function predictPerformance(
  input: PredictionInput
): Promise<PerformancePrediction> {
  const prompt = `Analyze this social media content and predict its performance:

CONTENT:
${input.content}

DETAILS:
- Platform: ${input.platform}
- Content Type: ${input.contentType}
- Hashtags: ${input.hashtags?.join(", ") || "None"}
- Target Audience: ${input.targetAudience || "General"}
${input.scheduledTime ? `- Scheduled Time: ${input.scheduledTime.toISOString()}` : ""}
${input.historicalData ? `
HISTORICAL PERFORMANCE:
- Average Likes: ${input.historicalData.avgLikes}
- Average Comments: ${input.historicalData.avgComments}
- Average Engagement Rate: ${input.historicalData.avgEngagementRate}%
- Top Performing Times: ${input.historicalData.topPerformingTimes.join(", ")}
` : ""}

Analyze and predict:
1. Overall performance score (0-100)
2. Engagement predictions (likes, comments, shares, engagement rate) with low/expected/high ranges
3. Viral potential (low, medium, high, very_high)
4. Analysis factors (hook strength, emotional appeal, clarity, relevance, visual potential, CTA effectiveness, hashtag quality, timing)
5. Specific recommendations for improvement
6. Best times to post for maximum engagement

Return as JSON with structure:
{
  "overallScore": number,
  "engagementPrediction": {
    "likes": { "low": number, "expected": number, "high": number },
    "comments": { "low": number, "expected": number, "high": number },
    "shares": { "low": number, "expected": number, "high": number },
    "engagementRate": { "low": number, "expected": number, "high": number }
  },
  "viralPotential": "low" | "medium" | "high" | "very_high",
  "factors": [{ "category": string, "score": number (0-100), "impact": "positive" | "neutral" | "negative", "feedback": string }],
  "recommendations": [{ "priority": "high" | "medium" | "low", "area": string, "suggestion": string, "potentialImpact": string }],
  "bestTimeToPost": [string]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a social media analytics expert. Analyze content and provide accurate performance predictions based on best practices, platform algorithms, and engagement patterns. Return valid JSON only.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    return JSON.parse(content);
  } catch (error) {
    console.error("Failed to predict performance:", error);
    return getDefaultPrediction();
  }
}

export async function analyzeContentElements(
  content: string,
  platform: string
): Promise<ContentElement[]> {
  const prompt = `Analyze the following social media content and score each element:

CONTENT:
${content}

PLATFORM: ${platform}

Evaluate these elements:
1. Hook/Opening Line - Does it grab attention in the first 2 seconds?
2. Emotional Appeal - Does it evoke emotion (curiosity, excitement, fear of missing out)?
3. Clarity - Is the message clear and easy to understand?
4. Value Proposition - Does it provide value to the reader?
5. Call to Action - Is there a clear next step?
6. Formatting - Is it well-formatted for the platform (line breaks, emojis)?
7. Length - Is it optimal for the platform?
8. Authenticity - Does it feel genuine and not overly promotional?

Return as JSON array with objects: { "element": string, "score": number (0-100), "feedback": string }`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a content optimization expert. Analyze content elements objectively. Return valid JSON only.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const result = response.choices[0].message.content;
    if (!result) return [];

    const parsed = JSON.parse(result);
    return parsed.elements || parsed;
  } catch (error) {
    console.error("Failed to analyze content elements:", error);
    return [];
  }
}

export async function compareVariations(
  variations: string[],
  platform: string
): Promise<{
  rankings: { content: string; score: number; strengths: string[]; weaknesses: string[] }[];
  winner: number;
  recommendation: string;
}> {
  const prompt = `Compare these content variations for ${platform} and rank them:

${variations.map((v, i) => `VARIATION ${i + 1}:\n${v}`).join("\n\n---\n\n")}

Analyze each variation and rank them by predicted performance. Consider:
- Hook strength
- Engagement potential
- Clarity
- Platform optimization

Return as JSON with:
{
  "rankings": [
    { "content": string (first 50 chars), "score": number, "strengths": [string], "weaknesses": [string] }
  ],
  "winner": number (index of best variation, 0-based),
  "recommendation": string
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a content strategist. Compare content variations objectively and provide clear rankings. Return valid JSON only.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const result = response.choices[0].message.content;
    if (!result) throw new Error("No response");

    return JSON.parse(result);
  } catch (error) {
    console.error("Failed to compare variations:", error);
    return {
      rankings: variations.map((v) => ({
        content: v.slice(0, 50),
        score: 50,
        strengths: [],
        weaknesses: [],
      })),
      winner: 0,
      recommendation: "Unable to analyze variations",
    };
  }
}

export async function suggestImprovements(
  content: string,
  platform: string,
  targetScore: number = 80
): Promise<{
  improvedContent: string;
  changes: { original: string; improved: string; reason: string }[];
  predictedScoreIncrease: number;
}> {
  const prompt = `Improve this ${platform} content to achieve a performance score of at least ${targetScore}:

ORIGINAL CONTENT:
${content}

Provide:
1. An improved version of the content
2. List of specific changes made and why
3. Predicted score increase

Focus on:
- Stronger hook
- Better emotional triggers
- Clearer value proposition
- Optimized formatting
- Improved call to action

Return as JSON with:
{
  "improvedContent": string,
  "changes": [{ "original": string, "improved": string, "reason": string }],
  "predictedScoreIncrease": number
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a content optimization expert. Improve social media content while maintaining the original message. Return valid JSON only.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.6,
    });

    const result = response.choices[0].message.content;
    if (!result) throw new Error("No response");

    return JSON.parse(result);
  } catch (error) {
    console.error("Failed to suggest improvements:", error);
    return {
      improvedContent: content,
      changes: [],
      predictedScoreIncrease: 0,
    };
  }
}

export function getOptimalPostingTimes(platform: string): string[] {
  const times: Record<string, string[]> = {
    X: ["9:00 AM", "12:00 PM", "5:00 PM", "8:00 PM"],
    Instagram: ["11:00 AM", "1:00 PM", "7:00 PM", "9:00 PM"],
    LinkedIn: ["7:30 AM", "10:00 AM", "12:00 PM", "5:00 PM"],
    TikTok: ["7:00 AM", "12:00 PM", "3:00 PM", "7:00 PM"],
    YouTube: ["2:00 PM", "4:00 PM", "9:00 PM"],
    Facebook: ["9:00 AM", "1:00 PM", "4:00 PM"],
    Pinterest: ["8:00 PM", "9:00 PM", "11:00 PM"],
  };

  return times[platform] || ["9:00 AM", "12:00 PM", "5:00 PM"];
}

export function calculateViralityFactors(content: string): {
  factor: string;
  present: boolean;
  weight: number;
}[] {
  const factors = [
    { factor: "Question hook", pattern: /^\?|^[A-Z][^.!?]*\?/, weight: 15 },
    { factor: "Number/List", pattern: /\d+\s*(ways|tips|things|reasons|steps)/i, weight: 12 },
    { factor: "Urgency", pattern: /limited|now|today|hurry|don't miss/i, weight: 10 },
    { factor: "Curiosity gap", pattern: /secret|reveal|discover|learn|find out/i, weight: 12 },
    { factor: "Social proof", pattern: /\d+[k+m+]?\s*(people|followers|users)|everyone|most people/i, weight: 10 },
    { factor: "Emotional words", pattern: /amazing|incredible|shocking|surprising|mind-blowing/i, weight: 8 },
    { factor: "Personal story", pattern: /^I\s|my\s|when I|how I/i, weight: 10 },
    { factor: "Call to action", pattern: /click|follow|share|comment|like|subscribe|link in bio/i, weight: 8 },
    { factor: "Emojis", pattern: /[\u{1F300}-\u{1F9FF}]/u, weight: 5 },
    { factor: "Line breaks", pattern: /\n\n|\n/, weight: 5 },
  ];

  return factors.map((f) => ({
    factor: f.factor,
    present: f.pattern.test(content),
    weight: f.weight,
  }));
}

function getDefaultPrediction(): PerformancePrediction {
  return {
    overallScore: 50,
    engagementPrediction: {
      likes: { low: 50, expected: 100, high: 200 },
      comments: { low: 5, expected: 15, high: 30 },
      shares: { low: 2, expected: 8, high: 20 },
      engagementRate: { low: 1, expected: 3, high: 5 },
    },
    viralPotential: "medium",
    factors: [],
    recommendations: [],
    bestTimeToPost: ["9:00 AM", "12:00 PM", "5:00 PM"],
  };
}

export const PLATFORM_BENCHMARKS: Record<string, { avgEngagement: number; goodEngagement: number; greatEngagement: number }> = {
  X: { avgEngagement: 0.5, goodEngagement: 1.5, greatEngagement: 3 },
  Instagram: { avgEngagement: 1.2, goodEngagement: 3, greatEngagement: 6 },
  LinkedIn: { avgEngagement: 2, goodEngagement: 4, greatEngagement: 8 },
  TikTok: { avgEngagement: 5, goodEngagement: 10, greatEngagement: 15 },
  YouTube: { avgEngagement: 2, goodEngagement: 5, greatEngagement: 10 },
  Facebook: { avgEngagement: 0.5, goodEngagement: 2, greatEngagement: 5 },
};
