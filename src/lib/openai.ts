import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface GeneratePostParams {
  instructions: string;
  tone: string;
  topics: string[];
  voiceProfile?: {
    styleAnalysis: string | null;
    commonPhrases: string[];
    toneKeywords: string[];
    emojiUsage: number | null;
    hashtagUsage: number | null;
    commonEmojis: string[];
    commonHashtags: string[];
    samplePosts: string[];
  } | null;
}

export async function generatePost({
  instructions,
  tone,
  topics,
  voiceProfile,
}: GeneratePostParams): Promise<string> {
  const topicsStr = topics.length > 0 ? topics.join(", ") : "general topics";

  let voiceGuidance = "";

  if (voiceProfile) {
    voiceGuidance = `
IMPORTANT - Match this author's unique writing voice:
${voiceProfile.styleAnalysis || ""}

Tone characteristics: ${voiceProfile.toneKeywords.join(", ") || tone}
${voiceProfile.commonPhrases.length > 0 ? `Phrases they often use: "${voiceProfile.commonPhrases.slice(0, 3).join('", "')}"` : ""}
${voiceProfile.emojiUsage && voiceProfile.emojiUsage > 0.3 ? `They use emojis like: ${voiceProfile.commonEmojis.slice(0, 3).join(" ")}` : "Avoid emojis unless necessary."}
${voiceProfile.hashtagUsage && voiceProfile.hashtagUsage > 0.3 ? `They use hashtags like: ${voiceProfile.commonHashtags.slice(0, 2).join(", ")}` : ""}

Reference posts for style (write LIKE these, not copy them):
${voiceProfile.samplePosts.slice(0, 3).map((p, i) => `${i + 1}. "${p}"`).join("\n")}
`;
  }

  const systemPrompt = `You are an expert social media content creator for X (formerly Twitter).
Your task is to write engaging posts that resonate with the indie hacker and tech community.

Guidelines:
- Keep posts under 280 characters
- Be authentic and conversational
- Use the specified tone
- Don't use hashtags excessively (max 1-2 if relevant)
- Make it shareable and engaging
- Focus on providing value, insights, or sparking discussion
- Output ONLY the post text, nothing else
${voiceGuidance}`;

  const userPrompt = `Write a single X post based on the following:

User's instructions: ${instructions || "Write an engaging post for indie hackers and tech enthusiasts"}

Tone: ${tone}

Topics to consider: ${topicsStr}

Generate only the post text, nothing else. No quotes around it.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 150,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No content in response");
  }

  return content.trim();
}

// Generate thread (multiple connected posts)
export async function generateThread({
  instructions,
  tone,
  topics,
  postCount = 5,
  voiceProfile,
}: GeneratePostParams & { postCount?: number }): Promise<string[]> {
  const topicsStr = topics.length > 0 ? topics.join(", ") : "general topics";

  let voiceGuidance = "";
  if (voiceProfile?.styleAnalysis) {
    voiceGuidance = `Match this writing style: ${voiceProfile.styleAnalysis}
Tone: ${voiceProfile.toneKeywords.join(", ")}`;
  }

  const systemPrompt = `You are an expert at writing viral X (Twitter) threads.
Create compelling threads that hook readers and keep them engaged.

Guidelines:
- First post should be a strong hook that makes people want to read more
- Each post should be under 280 characters
- End with a call-to-action or summary
- Use numbers or structure when appropriate (e.g., "5 things I learned...")
- Make it educational, insightful, or story-driven
${voiceGuidance}

Return a JSON array of strings, each string being one post in the thread.`;

  const userPrompt = `Create a ${postCount}-post thread about:

Topic: ${instructions || "Share valuable insights for indie hackers"}

Tone: ${tone}

Related topics: ${topicsStr}

Return ONLY a JSON array of ${postCount} posts.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 1000,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No content in response");
  }

  try {
    const result = JSON.parse(content);
    // Handle various response formats
    const posts = result.posts || result.thread || result;
    if (Array.isArray(posts)) {
      return posts.map((p: string | { content: string }) =>
        typeof p === "string" ? p : p.content
      );
    }
    throw new Error("Invalid thread format");
  } catch {
    throw new Error("Failed to parse thread response");
  }
}

// Predict viral score for a post
export async function predictViralScore(content: string): Promise<{
  score: number;
  factors: {
    hook: number;
    clarity: number;
    emotion: number;
    actionable: number;
    shareability: number;
  };
  suggestions: string[];
}> {
  const systemPrompt = `You are an expert at predicting social media engagement.
Analyze the given post and predict its viral potential on X (Twitter).

Score each factor from 0-100:
- hook: How attention-grabbing is the opening?
- clarity: How clear and easy to understand?
- emotion: Does it evoke emotion (curiosity, surprise, agreement)?
- actionable: Does it provide actionable value?
- shareability: Would people want to share this?

Overall score should be weighted average with emphasis on hook and shareability.

Also provide 1-3 brief suggestions to improve the post.

Return JSON with: score (0-100), factors (object with each score), suggestions (array of strings)`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 300,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Analyze this post:\n\n"${content}"` },
    ],
  });

  const result = response.choices[0]?.message?.content;
  if (!result) {
    throw new Error("No prediction result");
  }

  const prediction = JSON.parse(result);

  return {
    score: Math.round(prediction.score || 50),
    factors: {
      hook: Math.round(prediction.factors?.hook || 50),
      clarity: Math.round(prediction.factors?.clarity || 50),
      emotion: Math.round(prediction.factors?.emotion || 50),
      actionable: Math.round(prediction.factors?.actionable || 50),
      shareability: Math.round(prediction.factors?.shareability || 50),
    },
    suggestions: prediction.suggestions || [],
  };
}

// Generate engagement insights for a post
export async function analyzeEngagement(
  content: string,
  metrics: { likes: number; retweets: number; replies: number; impressions: number }
): Promise<{
  analysis: string;
  whatWorked: string[];
  improvements: string[];
  optimalPostingTips: string[];
}> {
  const engagementRate = metrics.impressions > 0
    ? ((metrics.likes + metrics.retweets + metrics.replies) / metrics.impressions * 100).toFixed(2)
    : "0";

  const systemPrompt = `You are a social media analytics expert. Analyze why this post performed the way it did.
Provide specific, actionable insights based on the content and metrics.

Return JSON with:
- analysis: 2-3 sentence summary of performance
- whatWorked: array of 2-3 things that worked well
- improvements: array of 2-3 suggestions for improvement
- optimalPostingTips: array of 1-2 tips for similar future posts`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 400,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Post: "${content}"

Metrics:
- Likes: ${metrics.likes}
- Retweets: ${metrics.retweets}
- Replies: ${metrics.replies}
- Impressions: ${metrics.impressions}
- Engagement Rate: ${engagementRate}%

Analyze this post's performance.`,
      },
    ],
  });

  const result = response.choices[0]?.message?.content;
  if (!result) {
    throw new Error("No analysis result");
  }

  const analysis = JSON.parse(result);

  return {
    analysis: analysis.analysis || "Unable to analyze performance.",
    whatWorked: analysis.whatWorked || [],
    improvements: analysis.improvements || [],
    optimalPostingTips: analysis.optimalPostingTips || [],
  };
}

// Suggest posts based on trending topics
export async function suggestTrendingPost(
  trend: { name: string; context?: string },
  userInstructions: string,
  tone: string
): Promise<string> {
  const systemPrompt = `You are an expert at creating timely, relevant social media content.
Create a post that ties into a trending topic while staying authentic to the user's brand.

Guidelines:
- Connect the trend to the user's niche naturally
- Don't force the connection if it doesn't fit
- Keep under 280 characters
- Be timely but not desperate for engagement`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 150,
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Trending topic: ${trend.name}
${trend.context ? `Context: ${trend.context}` : ""}

User's niche/instructions: ${userInstructions}
Tone: ${tone}

Write a post that connects this trend to the user's expertise.`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No content generated");
  }

  return content.trim();
}
