import { getOpenAI } from "./openai";

// Types
export type Platform = "X" | "LINKEDIN" | "INSTAGRAM" | "TIKTOK" | "YOUTUBE" | "PINTEREST" | "BLUESKY";
export type CaptionTone = "professional" | "casual" | "witty" | "inspirational" | "educational" | "promotional" | "storytelling";
export type ContentType = "image" | "video" | "carousel" | "text" | "link" | "product";

interface PlatformConfig {
  maxLength: number;
  supportsHashtags: boolean;
  maxHashtags: number;
  supportsEmojis: boolean;
  supportsLinks: boolean;
  style: string;
}

const platformConfigs: Record<Platform, PlatformConfig> = {
  X: {
    maxLength: 280,
    supportsHashtags: true,
    maxHashtags: 2,
    supportsEmojis: true,
    supportsLinks: true,
    style: "Concise, punchy, conversational. Good for hot takes, insights, and engagement hooks.",
  },
  LINKEDIN: {
    maxLength: 3000,
    supportsHashtags: true,
    maxHashtags: 5,
    supportsEmojis: true,
    supportsLinks: true,
    style: "Professional yet personable. Story-driven, value-focused. Use line breaks for readability.",
  },
  INSTAGRAM: {
    maxLength: 2200,
    supportsHashtags: true,
    maxHashtags: 30,
    supportsEmojis: true,
    supportsLinks: false,
    style: "Visual-first captions. Engaging opening line, storytelling, strong CTA. Hashtags at the end.",
  },
  TIKTOK: {
    maxLength: 300,
    supportsHashtags: true,
    maxHashtags: 5,
    supportsEmojis: true,
    supportsLinks: false,
    style: "Short, trendy, relatable. Use hooks like 'POV:' or 'Wait for it'. Gen-Z friendly language.",
  },
  YOUTUBE: {
    maxLength: 5000,
    supportsHashtags: true,
    maxHashtags: 3,
    supportsEmojis: true,
    supportsLinks: true,
    style: "SEO-friendly, descriptive. Include timestamps, calls to subscribe. Can be longer and detailed.",
  },
  PINTEREST: {
    maxLength: 500,
    supportsHashtags: true,
    maxHashtags: 5,
    supportsEmojis: true,
    supportsLinks: true,
    style: "Search-optimized, descriptive. Focus on keywords people search for. Helpful and inspiring.",
  },
  BLUESKY: {
    maxLength: 300,
    supportsHashtags: false,
    maxHashtags: 0,
    supportsEmojis: true,
    supportsLinks: true,
    style: "Similar to X but more community-focused. Avoid hashtags, focus on conversation.",
  },
};

export interface GenerateCaptionInput {
  platform: Platform;
  topic: string;
  tone: CaptionTone;
  contentType: ContentType;
  keywords?: string[];
  imageDescription?: string;
  productInfo?: {
    name: string;
    description: string;
    price?: string;
    link?: string;
  };
  includeHashtags?: boolean;
  includeEmojis?: boolean;
  includeCallToAction?: boolean;
  targetAudience?: string;
  brandVoice?: string;
  language?: string;
}

export interface GeneratedCaption {
  caption: string;
  hashtags: string[];
  hookScore: number;
  characterCount: number;
  platform: Platform;
  variations: string[];
}

// Generate a caption
export async function generateCaption(input: GenerateCaptionInput): Promise<GeneratedCaption> {
  const config = platformConfigs[input.platform];

  const systemPrompt = buildSystemPrompt(input, config);
  const userPrompt = buildUserPrompt(input, config);

  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 1000,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const result = response.choices[0]?.message?.content;
  if (!result) {
    throw new Error("No caption generated");
  }

  const parsed = JSON.parse(result);

  return {
    caption: parsed.caption || "",
    hashtags: parsed.hashtags || [],
    hookScore: parsed.hookScore || 70,
    characterCount: (parsed.caption || "").length,
    platform: input.platform,
    variations: parsed.variations || [],
  };
}

function buildSystemPrompt(input: GenerateCaptionInput, config: PlatformConfig): string {
  const toneDescriptions: Record<CaptionTone, string> = {
    professional: "Polished, authoritative, trustworthy. Use industry-appropriate language.",
    casual: "Friendly, approachable, conversational. Like talking to a friend.",
    witty: "Clever, humorous, unexpected twists. Use wordplay and puns when appropriate.",
    inspirational: "Motivating, uplifting, emotionally resonant. Share wisdom and encouragement.",
    educational: "Informative, clear, value-packed. Teach something useful.",
    promotional: "Compelling, benefit-focused, with clear value proposition and CTA.",
    storytelling: "Narrative-driven, engaging, with a beginning, middle, and end.",
  };

  return `You are an expert social media copywriter specializing in ${input.platform} content.

PLATFORM GUIDELINES FOR ${input.platform}:
- Maximum length: ${config.maxLength} characters
- Style: ${config.style}
${config.supportsHashtags ? `- Hashtags: Use up to ${config.maxHashtags} relevant hashtags` : "- No hashtags on this platform"}
${config.supportsEmojis ? "- Emojis: Use sparingly to enhance the message" : "- Avoid emojis"}
${config.supportsLinks ? "- Links: Can include clickable links" : "- Links not clickable in captions"}

TONE: ${toneDescriptions[input.tone]}

${input.brandVoice ? `BRAND VOICE: ${input.brandVoice}` : ""}
${input.targetAudience ? `TARGET AUDIENCE: ${input.targetAudience}` : ""}
${input.language ? `LANGUAGE: Write in ${input.language}` : "LANGUAGE: Write in English"}

CONTENT TYPE: ${input.contentType}
${input.contentType === "image" ? "Write a caption that complements the visual content." : ""}
${input.contentType === "video" ? "Write a caption that makes people want to watch the video." : ""}
${input.contentType === "carousel" ? "Write a caption that encourages swiping through all slides." : ""}
${input.contentType === "product" ? "Focus on benefits and value proposition." : ""}

Return a JSON object with:
- caption: The main caption text (must be under ${config.maxLength} characters)
- hashtags: Array of relevant hashtags (without # symbol)
- hookScore: Rate the hook/opening line strength from 0-100
- variations: Array of 2 alternative versions of the caption`;
}

function buildUserPrompt(input: GenerateCaptionInput, config: PlatformConfig): string {
  let prompt = `Generate a ${input.tone} caption for ${input.platform} about: ${input.topic}`;

  if (input.keywords && input.keywords.length > 0) {
    prompt += `\n\nKeywords to include: ${input.keywords.join(", ")}`;
  }

  if (input.imageDescription) {
    prompt += `\n\nImage description: ${input.imageDescription}`;
  }

  if (input.productInfo) {
    prompt += `\n\nProduct info:
- Name: ${input.productInfo.name}
- Description: ${input.productInfo.description}
${input.productInfo.price ? `- Price: ${input.productInfo.price}` : ""}
${input.productInfo.link ? `- Link: ${input.productInfo.link}` : ""}`;
  }

  if (input.includeCallToAction) {
    prompt += "\n\nInclude a clear call-to-action.";
  }

  if (input.includeHashtags === false) {
    prompt += "\n\nDo not include hashtags.";
  } else if (config.supportsHashtags) {
    prompt += `\n\nInclude ${Math.min(config.maxHashtags, 5)} relevant hashtags.`;
  }

  if (input.includeEmojis === false) {
    prompt += "\n\nDo not use emojis.";
  }

  return prompt;
}

// Generate multiple captions at once
export async function generateCaptionBatch(
  input: Omit<GenerateCaptionInput, "platform">,
  platforms: Platform[]
): Promise<Record<Platform, GeneratedCaption>> {
  const results: Record<string, GeneratedCaption> = {};

  // Generate in parallel
  await Promise.all(
    platforms.map(async (platform) => {
      const caption = await generateCaption({ ...input, platform });
      results[platform] = caption;
    })
  );

  return results as Record<Platform, GeneratedCaption>;
}

// Improve an existing caption
export async function improveCaption(
  caption: string,
  platform: Platform,
  improvements: ("hook" | "clarity" | "engagement" | "hashtags" | "length" | "tone")[]
): Promise<{
  improved: string;
  changes: string[];
  beforeScore: number;
  afterScore: number;
}> {
  const config = platformConfigs[platform];

  const improvementDescriptions: Record<string, string> = {
    hook: "Make the opening line more attention-grabbing",
    clarity: "Improve clarity and readability",
    engagement: "Add elements that encourage engagement (questions, CTAs)",
    hashtags: "Optimize hashtags for reach",
    length: `Adjust length to optimal for ${platform}`,
    tone: "Make the tone more appropriate for the platform",
  };

  const requestedImprovements = improvements
    .map((i) => `- ${improvementDescriptions[i]}`)
    .join("\n");

  const systemPrompt = `You are a social media optimization expert.
Improve the given caption for ${platform} based on the requested improvements.
Platform max length: ${config.maxLength} characters.

Return JSON with:
- improved: The improved caption
- changes: Array of specific changes made
- beforeScore: Estimated engagement score of original (0-100)
- afterScore: Estimated engagement score of improved version (0-100)`;

  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 600,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Original caption: "${caption}"

Requested improvements:
${requestedImprovements}

Improve this caption while maintaining its core message.`,
      },
    ],
  });

  const result = response.choices[0]?.message?.content;
  if (!result) {
    throw new Error("No improvement generated");
  }

  const parsed = JSON.parse(result);

  return {
    improved: parsed.improved || caption,
    changes: parsed.changes || [],
    beforeScore: parsed.beforeScore || 60,
    afterScore: parsed.afterScore || 75,
  };
}

// Generate caption from image (using GPT-4 Vision would require upgrade)
export async function generateCaptionFromImage(
  imageDescription: string,
  platform: Platform,
  tone: CaptionTone
): Promise<GeneratedCaption> {
  return generateCaption({
    platform,
    topic: "Image post",
    tone,
    contentType: "image",
    imageDescription,
    includeCallToAction: true,
    includeHashtags: true,
  });
}

// Generate hook variations
export async function generateHookVariations(
  topic: string,
  platform: Platform,
  count: number = 5
): Promise<{
  hooks: {
    text: string;
    type: string;
    score: number;
  }[];
}> {
  const config = platformConfigs[platform];

  const systemPrompt = `You are an expert at writing scroll-stopping hooks for ${platform}.
Generate ${count} different hook variations for the same topic.

Hook types to consider:
- Question: Start with an engaging question
- Statistic: Lead with a surprising number or stat
- Contrarian: Challenge common beliefs
- Story: Start with "I" or a personal angle
- Bold claim: Make a strong, attention-grabbing statement
- Curiosity gap: Create intrigue without revealing everything

Each hook should be suitable for ${platform} (max ${Math.min(config.maxLength, 100)} characters for the hook).

Return JSON with:
- hooks: Array of objects with text, type, and score (estimated hook strength 0-100)`;

  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 600,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Generate ${count} hook variations for: ${topic}` },
    ],
  });

  const result = response.choices[0]?.message?.content;
  if (!result) {
    throw new Error("No hooks generated");
  }

  return JSON.parse(result);
}

// Generate hashtag suggestions
export async function generateHashtags(
  topic: string,
  platform: Platform,
  count: number = 10
): Promise<{
  hashtags: {
    tag: string;
    relevance: "high" | "medium" | "low";
    estimatedReach: "niche" | "medium" | "broad";
  }[];
}> {
  const config = platformConfigs[platform];

  if (!config.supportsHashtags) {
    return { hashtags: [] };
  }

  const systemPrompt = `You are a hashtag research expert for ${platform}.
Generate ${count} relevant hashtags for the given topic.

Consider:
- Mix of broad and niche hashtags
- Trending hashtags when relevant
- Platform-specific popular tags
- Avoid banned or spam-flagged hashtags

Return JSON with:
- hashtags: Array of objects with tag (without #), relevance (high/medium/low), estimatedReach (niche/medium/broad)`;

  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 400,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Generate hashtags for: ${topic}` },
    ],
  });

  const result = response.choices[0]?.message?.content;
  if (!result) {
    throw new Error("No hashtags generated");
  }

  return JSON.parse(result);
}

// Get platform-specific tips
export function getPlatformTips(platform: Platform): string[] {
  const tips: Record<Platform, string[]> = {
    X: [
      "Keep your first line strong - it's what shows in previews",
      "Use threads for longer content",
      "Engage with replies within the first hour",
      "Images and videos get 2-3x more engagement",
      "Best times: 9-11 AM and 7-9 PM",
    ],
    LINKEDIN: [
      "Start with a hook in the first 2 lines",
      "Use line breaks for readability",
      "Personal stories outperform corporate content",
      "Ask questions to encourage comments",
      "Best times: Tuesday-Thursday, 8-10 AM",
    ],
    INSTAGRAM: [
      "Front-load important info before the 'more' cutoff",
      "Use carousel posts for higher engagement",
      "Put hashtags in comments or at the end",
      "Include a CTA in every post",
      "Best times: 11 AM - 1 PM and 7-9 PM",
    ],
    TIKTOK: [
      "Hook viewers in the first 3 seconds",
      "Use trending sounds when relevant",
      "Keep captions short and punchy",
      "Include trending hashtags",
      "Post 1-4 times per day for growth",
    ],
    YOUTUBE: [
      "First 2 sentences appear in search results",
      "Include keywords naturally",
      "Add timestamps for longer videos",
      "Include links to related content",
      "Ask viewers to like and subscribe",
    ],
    PINTEREST: [
      "Use keyword-rich descriptions",
      "Include a clear CTA",
      "Rich pins get more engagement",
      "Optimal length: 200-300 characters",
      "Post consistently throughout the day",
    ],
    BLUESKY: [
      "Focus on genuine conversation",
      "No hashtags needed",
      "Engage authentically with others",
      "Quality over quantity",
      "Build community through replies",
    ],
  };

  return tips[platform] || [];
}

// Export platform configs for use in UI
export { platformConfigs };
