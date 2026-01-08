import { prisma } from "./prisma";
import { getOpenAI } from "./openai";
import { Platform } from "@prisma/client";

// Questionnaire structure for the AI Copilot wizard
export interface QuestionnaireStep {
  id: string;
  title: string;
  description: string;
  fields: QuestionnaireField[];
}

export interface QuestionnaireField {
  name: string;
  label: string;
  type: "text" | "textarea" | "url" | "multiselect" | "tags";
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
}

export interface QuestionnaireAnswers {
  brandName: string;
  brandWebsite?: string;
  brandTagline?: string;
  brandDescription: string;
  targetAudience: string;
  competitors: string[];
  goals: string[];
}

export interface GeneratedStrategy {
  recommendedPlatforms: {
    platform: Platform;
    reason: string;
    priority: "high" | "medium" | "low";
  }[];
  postsPerWeek: Record<string, number>;
  contentPillars: {
    name: string;
    description: string;
    examples: string[];
  }[];
  toneOfVoice: string;
  hashtagStrategy: string;
  bestTimes: Record<string, string[]>;
  strategyDocument: string;
}

// Get the questionnaire structure for the wizard
export function startStrategyQuestionnaire(): QuestionnaireStep[] {
  return [
    {
      id: "brand-basics",
      title: "Brand Basics",
      description: "Tell us about your brand identity",
      fields: [
        {
          name: "brandName",
          label: "Brand Name",
          type: "text",
          placeholder: "e.g., Acme Inc.",
          required: true,
        },
        {
          name: "brandWebsite",
          label: "Website URL",
          type: "url",
          placeholder: "https://example.com",
          required: false,
        },
        {
          name: "brandTagline",
          label: "Tagline or Slogan",
          type: "text",
          placeholder: "e.g., Building the future, one product at a time",
          required: false,
        },
      ],
    },
    {
      id: "business-description",
      title: "Business Description",
      description: "Describe what your business does",
      fields: [
        {
          name: "brandDescription",
          label: "What does your business do?",
          type: "textarea",
          placeholder:
            "Describe your products, services, and what makes you unique. The more detail, the better the strategy will be.",
          required: true,
        },
      ],
    },
    {
      id: "target-audience",
      title: "Target Audience",
      description: "Who are you trying to reach?",
      fields: [
        {
          name: "targetAudience",
          label: "Describe your ideal customer",
          type: "textarea",
          placeholder:
            "Include demographics, interests, pain points, and where they spend time online. e.g., Tech-savvy professionals aged 25-45 who struggle with productivity...",
          required: true,
        },
      ],
    },
    {
      id: "competitors",
      title: "Competitors",
      description: "Who are your main competitors?",
      fields: [
        {
          name: "competitors",
          label: "List your main competitors",
          type: "tags",
          placeholder: "Enter competitor name and press Enter",
          required: false,
        },
      ],
    },
    {
      id: "goals",
      title: "Goals",
      description: "What do you want to achieve on social media?",
      fields: [
        {
          name: "goals",
          label: "Select your primary goals",
          type: "multiselect",
          required: true,
          options: [
            { value: "brand_awareness", label: "Brand Awareness" },
            { value: "lead_generation", label: "Lead Generation" },
            { value: "engagement", label: "Community Engagement" },
            { value: "traffic", label: "Website Traffic" },
            { value: "sales", label: "Direct Sales" },
            { value: "thought_leadership", label: "Thought Leadership" },
            { value: "customer_support", label: "Customer Support" },
            { value: "recruitment", label: "Talent Recruitment" },
          ],
        },
      ],
    },
  ];
}

// Generate a complete social media strategy using AI
export async function generateStrategy(
  answers: QuestionnaireAnswers
): Promise<GeneratedStrategy> {
  const openai = getOpenAI();

  const goalsText = answers.goals
    .map((g) => g.replace(/_/g, " "))
    .join(", ");
  const competitorsText =
    answers.competitors.length > 0
      ? answers.competitors.join(", ")
      : "Not specified";

  const systemPrompt = `You are an expert social media strategist with 15+ years of experience helping brands build their online presence. Your task is to create a comprehensive, actionable social media strategy.

You must return a valid JSON object with this exact structure:
{
  "recommendedPlatforms": [
    {
      "platform": "X" | "LINKEDIN" | "INSTAGRAM" | "TIKTOK" | "YOUTUBE" | "PINTEREST" | "BLUESKY" | "THREADS",
      "reason": "string explaining why this platform",
      "priority": "high" | "medium" | "low"
    }
  ],
  "postsPerWeek": {
    "X": number,
    "LINKEDIN": number,
    ...
  },
  "contentPillars": [
    {
      "name": "Pillar Name",
      "description": "What this pillar is about",
      "examples": ["Example post 1", "Example post 2", "Example post 3"]
    }
  ],
  "toneOfVoice": "Description of brand voice and tone",
  "hashtagStrategy": "Detailed hashtag strategy",
  "bestTimes": {
    "X": ["09:00", "12:00", "18:00"],
    "LINKEDIN": ["08:00", "12:00"],
    ...
  },
  "strategyDocument": "A comprehensive markdown document containing the full strategy"
}

Guidelines:
- Recommend 2-4 platforms based on the target audience and goals
- Content pillars should be 3-5 specific themes with real example posts
- Best times should be based on typical engagement patterns for the industry
- The strategy document should be detailed and actionable`;

  const userPrompt = `Create a complete social media strategy for this brand:

**Brand Name:** ${answers.brandName}
${answers.brandWebsite ? `**Website:** ${answers.brandWebsite}` : ""}
${answers.brandTagline ? `**Tagline:** ${answers.brandTagline}` : ""}

**Business Description:**
${answers.brandDescription}

**Target Audience:**
${answers.targetAudience}

**Competitors:** ${competitorsText}

**Goals:** ${goalsText}

Generate a comprehensive strategy that will help this brand achieve their goals.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 4000,
    response_format: { type: "json_object" },
    temperature: 0.7,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Failed to generate strategy");
  }

  const strategy = JSON.parse(content) as GeneratedStrategy;

  // Ensure all required fields are present
  return {
    recommendedPlatforms: strategy.recommendedPlatforms || [],
    postsPerWeek: strategy.postsPerWeek || {},
    contentPillars: strategy.contentPillars || [],
    toneOfVoice: strategy.toneOfVoice || "",
    hashtagStrategy: strategy.hashtagStrategy || "",
    bestTimes: strategy.bestTimes || {},
    strategyDocument: strategy.strategyDocument || "",
  };
}

// Save a strategy to the database
export async function saveStrategy(
  userId: string,
  answers: QuestionnaireAnswers,
  strategy: GeneratedStrategy,
  name?: string
) {
  return prisma.aiStrategy.create({
    data: {
      userId,
      name: name || `${answers.brandName} Strategy`,
      brandName: answers.brandName,
      brandWebsite: answers.brandWebsite,
      brandTagline: answers.brandTagline,
      brandDescription: answers.brandDescription,
      targetAudience: answers.targetAudience,
      competitors: answers.competitors,
      goals: answers.goals,
      recommendedPlatforms: strategy.recommendedPlatforms.map(
        (p) => p.platform
      ) as Platform[],
      postsPerWeek: strategy.postsPerWeek,
      contentPillars: strategy.contentPillars.map((p) => p.name),
      toneOfVoice: strategy.toneOfVoice,
      hashtagStrategy: strategy.hashtagStrategy,
      bestTimes: strategy.bestTimes,
      strategyDocument: strategy.strategyDocument,
      generatedAt: new Date(),
      isActive: true,
    },
  });
}

// Get all strategies for a user
export async function getStrategies(userId: string) {
  return prisma.aiStrategy.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

// Get a single strategy by ID
export async function getStrategy(strategyId: string) {
  return prisma.aiStrategy.findUnique({
    where: { id: strategyId },
  });
}

// Update a strategy
export async function updateStrategy(
  strategyId: string,
  updates: Partial<{
    name: string;
    isActive: boolean;
    contentPillars: string[];
    recommendedPlatforms: Platform[];
    postsPerWeek: Record<string, number>;
    toneOfVoice: string;
    hashtagStrategy: string;
    bestTimes: Record<string, string[]>;
    strategyDocument: string;
  }>
) {
  return prisma.aiStrategy.update({
    where: { id: strategyId },
    data: updates,
  });
}

// Delete a strategy
export async function deleteStrategy(strategyId: string) {
  return prisma.aiStrategy.delete({
    where: { id: strategyId },
  });
}

// Generate a content calendar based on a strategy
export async function generateContentCalendar(
  userId: string,
  strategy: {
    contentPillars: string[];
    recommendedPlatforms: Platform[];
    postsPerWeek: Record<string, number> | null;
    bestTimes: Record<string, string[]> | null;
    toneOfVoice: string | null;
    brandName: string | null;
    brandDescription: string | null;
  },
  weeks: number = 4
): Promise<
  Array<{
    date: Date;
    time: string;
    platform: Platform;
    content: string;
    pillar: string;
  }>
> {
  const openai = getOpenAI();
  const posts: Array<{
    date: Date;
    time: string;
    platform: Platform;
    content: string;
    pillar: string;
  }> = [];

  const platforms = strategy.recommendedPlatforms;
  const pillars = strategy.contentPillars;
  const postsPerWeek = (strategy.postsPerWeek as Record<string, number>) || {};
  const bestTimes = (strategy.bestTimes as Record<string, string[]>) || {};

  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + weeks * 7);

  // Calculate total posts needed per platform
  for (const platform of platforms) {
    const platformKey = platform.toString();
    const weeklyPosts = postsPerWeek[platformKey] || 3;
    const times = bestTimes[platformKey] || ["09:00", "12:00", "18:00"];
    const totalPosts = weeklyPosts * weeks;

    // Generate posts in batches
    const systemPrompt = `You are a social media content creator for ${strategy.brandName || "a brand"}.

Brand description: ${strategy.brandDescription || "Not specified"}
Tone of voice: ${strategy.toneOfVoice || "Professional and engaging"}
Platform: ${platform}

Generate engaging social media posts. Each post should:
- Be appropriate for ${platform}
- Follow the brand's tone of voice
- Be varied and interesting
- Include relevant calls-to-action where appropriate

Return a JSON array of post objects with "content" and "pillar" fields.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Generate ${totalPosts} posts distributed across these content pillars: ${pillars.join(", ")}.

Return JSON: { "posts": [{ "content": "post text", "pillar": "pillar name" }] }`,
        },
      ],
      max_tokens: 3000,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) continue;

    try {
      const result = JSON.parse(content);
      const generatedPosts = result.posts || [];

      // Distribute posts across the date range
      let postIndex = 0;
      const currentDate = new Date(startDate);

      while (currentDate <= endDate && postIndex < generatedPosts.length) {
        const postsToday = Math.min(
          Math.ceil(weeklyPosts / 7),
          generatedPosts.length - postIndex
        );

        for (let i = 0; i < postsToday && postIndex < generatedPosts.length; i++) {
          const post = generatedPosts[postIndex];
          const time = times[i % times.length];

          posts.push({
            date: new Date(currentDate),
            time,
            platform,
            content: post.content,
            pillar: post.pillar,
          });

          postIndex++;
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }
    } catch (error) {
      console.error("Failed to parse generated posts:", error);
    }
  }

  // Sort posts by date and time
  posts.sort((a, b) => {
    const dateCompare = a.date.getTime() - b.date.getTime();
    if (dateCompare !== 0) return dateCompare;
    return a.time.localeCompare(b.time);
  });

  return posts;
}

// Get AI-suggested platforms based on brand info
export async function getSuggestedPlatforms(brandInfo: {
  brandDescription: string;
  targetAudience: string;
  goals: string[];
}): Promise<
  Array<{
    platform: Platform;
    score: number;
    reason: string;
  }>
> {
  const openai = getOpenAI();

  const systemPrompt = `You are a social media platform expert. Based on the brand and audience information, recommend the best social media platforms.

Consider:
- Where the target audience spends time
- Which platforms best support the business goals
- Content format preferences
- Industry norms

Return a JSON object with "platforms" array containing objects with:
- platform: One of "X", "LINKEDIN", "INSTAGRAM", "TIKTOK", "YOUTUBE", "PINTEREST", "BLUESKY", "THREADS"
- score: 1-100 indicating how well the platform fits
- reason: Brief explanation`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Analyze and recommend platforms for:

Business: ${brandInfo.brandDescription}
Target Audience: ${brandInfo.targetAudience}
Goals: ${brandInfo.goals.join(", ")}`,
      },
    ],
    max_tokens: 1000,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    return [];
  }

  try {
    const result = JSON.parse(content);
    return (result.platforms || []).map(
      (p: { platform: string; score: number; reason: string }) => ({
        platform: p.platform as Platform,
        score: p.score,
        reason: p.reason,
      })
    );
  } catch {
    return [];
  }
}

// Generate content pillars based on brand info
export async function generateContentPillars(brandInfo: {
  brandName: string;
  brandDescription: string;
  targetAudience: string;
  goals: string[];
}): Promise<
  Array<{
    name: string;
    description: string;
    examples: string[];
  }>
> {
  const openai = getOpenAI();

  const systemPrompt = `You are a content strategy expert. Create content pillars (themes) for a brand's social media strategy.

Content pillars should be:
- Specific to the brand and industry
- Diverse enough to keep content fresh
- Aligned with business goals
- Interesting to the target audience

Return a JSON object with "pillars" array containing objects with:
- name: Short pillar name (2-4 words)
- description: What type of content falls under this pillar
- examples: Array of 3 example post ideas`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Create 4-5 content pillars for:

Brand: ${brandInfo.brandName}
Business: ${brandInfo.brandDescription}
Target Audience: ${brandInfo.targetAudience}
Goals: ${brandInfo.goals.join(", ")}`,
      },
    ],
    max_tokens: 1500,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    return [];
  }

  try {
    const result = JSON.parse(content);
    return result.pillars || [];
  } catch {
    return [];
  }
}
