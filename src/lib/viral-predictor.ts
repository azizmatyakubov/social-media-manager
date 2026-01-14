import { getOpenAI } from "./openai";
import { prisma } from "./prisma";

// Enhanced viral prediction with detailed breakdown
export interface ViralPrediction {
  score: number;
  scoreLabel: string;
  confidence: number;
  factors: {
    hookStrength: { score: number; analysis: string };
    emotionalResonance: { score: number; analysis: string };
    shareability: { score: number; analysis: string };
    clarity: { score: number; analysis: string };
    timeliness: { score: number; analysis: string };
    callToAction: { score: number; analysis: string };
  };
  suggestions: {
    priority: "high" | "medium" | "low";
    text: string;
    impact: string;
  }[];
  hookAnalysis: {
    type: string;
    strength: string;
    alternatives: string[];
  };
  predictedMetrics: {
    estimatedLikes: string;
    estimatedRetweets: string;
    estimatedReplies: string;
    engagementRate: string;
  };
  competitorComparison: {
    percentile: number;
    betterThan: string;
  };
}

export async function predictViralScoreEnhanced(
  content: string,
  userId?: string
): Promise<ViralPrediction> {
  // Get user's historical data for personalized predictions
  let historicalContext = "";
  if (userId) {
    const userPosts = await prisma.post.findMany({
      where: {
        userId,
        status: "POSTED",
        impressions: { gt: 0 },
      },
      orderBy: { impressions: "desc" },
      take: 10,
      select: {
        content: true,
        likes: true,
        retweets: true,
        replies: true,
        impressions: true,
      },
    });

    if (userPosts.length > 0) {
      const avgEngagement =
        userPosts.reduce(
          (acc, p) =>
            acc +
            ((p.likes + p.retweets + p.replies) / (p.impressions || 1)) * 100,
          0
        ) / userPosts.length;

      historicalContext = `
User's historical average engagement: ${avgEngagement.toFixed(2)}%
Top performing post styles from this user's history:
${userPosts
  .slice(0, 3)
  .map(
    (p, i) =>
      `${i + 1}. "${p.content.substring(0, 100)}..." (${(
        ((p.likes + p.retweets + p.replies) / (p.impressions || 1)) *
        100
      ).toFixed(2)}% engagement)`
  )
  .join("\n")}
`;
    }
  }

  const systemPrompt = `You are an expert social media analyst specializing in viral content on X (Twitter).
You have analyzed millions of tweets and can predict engagement with high accuracy.

${historicalContext}

Analyze the post and provide a comprehensive viral prediction.

CRITICAL SCORING GUIDELINES:
- 90-100: Exceptional - Top 0.1% potential, will likely get 10k+ engagements
- 80-89: Excellent - Top 1% potential, strong viral candidate
- 70-79: Very Good - Top 5%, will outperform most posts
- 60-69: Good - Above average, solid engagement expected
- 50-59: Average - Typical performance
- 40-49: Below Average - May underperform
- Below 40: Needs significant improvement

Provide JSON with this exact structure:
{
  "score": <0-100>,
  "confidence": <0-100>,
  "factors": {
    "hookStrength": { "score": <0-100>, "analysis": "<brief analysis>" },
    "emotionalResonance": { "score": <0-100>, "analysis": "<brief analysis>" },
    "shareability": { "score": <0-100>, "analysis": "<brief analysis>" },
    "clarity": { "score": <0-100>, "analysis": "<brief analysis>" },
    "timeliness": { "score": <0-100>, "analysis": "<brief analysis>" },
    "callToAction": { "score": <0-100>, "analysis": "<brief analysis>" }
  },
  "suggestions": [
    { "priority": "high|medium|low", "text": "<suggestion>", "impact": "<expected impact>" }
  ],
  "hookAnalysis": {
    "type": "<hook type: question/statistic/story/controversy/claim/list>",
    "strength": "<weak/moderate/strong>",
    "alternatives": ["<3 alternative hooks>"]
  },
  "predictedMetrics": {
    "estimatedLikes": "<range like 50-150>",
    "estimatedRetweets": "<range>",
    "estimatedReplies": "<range>",
    "engagementRate": "<percentage range>"
  },
  "percentile": <0-100>
}`;

  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 1000,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Analyze this post for viral potential:\n\n"${content}"`,
      },
    ],
  });

  const result = response.choices[0]?.message?.content;
  if (!result) {
    throw new Error("No prediction result");
  }

  const prediction = JSON.parse(result);
  const score = Math.round(prediction.score || 50);

  return {
    score,
    scoreLabel: getEnhancedScoreLabel(score),
    confidence: Math.round(prediction.confidence || 70),
    factors: {
      hookStrength: {
        score: Math.round(prediction.factors?.hookStrength?.score || 50),
        analysis: prediction.factors?.hookStrength?.analysis || "",
      },
      emotionalResonance: {
        score: Math.round(prediction.factors?.emotionalResonance?.score || 50),
        analysis: prediction.factors?.emotionalResonance?.analysis || "",
      },
      shareability: {
        score: Math.round(prediction.factors?.shareability?.score || 50),
        analysis: prediction.factors?.shareability?.analysis || "",
      },
      clarity: {
        score: Math.round(prediction.factors?.clarity?.score || 50),
        analysis: prediction.factors?.clarity?.analysis || "",
      },
      timeliness: {
        score: Math.round(prediction.factors?.timeliness?.score || 50),
        analysis: prediction.factors?.timeliness?.analysis || "",
      },
      callToAction: {
        score: Math.round(prediction.factors?.callToAction?.score || 50),
        analysis: prediction.factors?.callToAction?.analysis || "",
      },
    },
    suggestions: (prediction.suggestions || []).map(
      (s: { priority?: string; text?: string; impact?: string }) => ({
        priority: (s.priority as "high" | "medium" | "low") || "medium",
        text: s.text || "",
        impact: s.impact || "",
      })
    ),
    hookAnalysis: {
      type: prediction.hookAnalysis?.type || "unknown",
      strength: prediction.hookAnalysis?.strength || "moderate",
      alternatives: prediction.hookAnalysis?.alternatives || [],
    },
    predictedMetrics: {
      estimatedLikes: prediction.predictedMetrics?.estimatedLikes || "10-50",
      estimatedRetweets:
        prediction.predictedMetrics?.estimatedRetweets || "2-10",
      estimatedReplies: prediction.predictedMetrics?.estimatedReplies || "1-5",
      engagementRate:
        prediction.predictedMetrics?.engagementRate || "1-3%",
    },
    competitorComparison: {
      percentile: Math.round(prediction.percentile || 50),
      betterThan: `${Math.round(prediction.percentile || 50)}% of similar posts`,
    },
  };
}

function getEnhancedScoreLabel(score: number): string {
  if (score >= 90) return "Viral Potential";
  if (score >= 80) return "Excellent";
  if (score >= 70) return "Very Good";
  if (score >= 60) return "Good";
  if (score >= 50) return "Average";
  if (score >= 40) return "Below Average";
  return "Needs Work";
}

// Compare multiple post variations
export async function comparePostVariations(
  variations: string[]
): Promise<{
  winner: number;
  scores: { content: string; score: number; reason: string }[];
  recommendation: string;
}> {
  const systemPrompt = `You are an expert at A/B testing social media content.
Compare these post variations and determine which will perform best.

Return JSON with:
{
  "winner": <index of best variation, 0-based>,
  "scores": [{ "content": "<post>", "score": <0-100>, "reason": "<why this score>" }],
  "recommendation": "<which to use and why>"
}`;

  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 500,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Compare these post variations:\n\n${variations
          .map((v, i) => `Variation ${i + 1}: "${v}"`)
          .join("\n\n")}`,
      },
    ],
  });

  const result = response.choices[0]?.message?.content;
  if (!result) {
    throw new Error("No comparison result");
  }

  return JSON.parse(result);
}
