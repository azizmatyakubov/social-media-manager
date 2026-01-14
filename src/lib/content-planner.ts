import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type ContentType = "educational" | "promotional" | "entertaining" | "inspirational" | "behindTheScenes" | "userGenerated";
export type ContentPillar = "product" | "industry" | "culture" | "community" | "thoughtLeadership";

export interface ContentIdea {
  id: string;
  title: string;
  description: string;
  contentType: ContentType;
  pillar: ContentPillar;
  platforms: string[];
  suggestedDate?: Date;
  hooks: string[];
  hashtags: string[];
  estimatedEngagement: "low" | "medium" | "high";
  status: "idea" | "planned" | "drafted" | "scheduled" | "published";
  createdAt: Date;
}

export interface ContentPlan {
  id: string;
  userId: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  goals: string[];
  targetAudience: string;
  contentPillars: ContentPillar[];
  postingFrequency: Record<string, number>; // platform -> posts per week
  ideas: ContentIdea[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TrendingTopic {
  topic: string;
  category: string;
  relevanceScore: number;
  platforms: string[];
  suggestedAngles: string[];
}

// In-memory storage for content plans
const contentPlans = new Map<string, ContentPlan>();
const userPlans = new Map<string, Set<string>>();

export async function generateContentIdeas(
  userId: string,
  options: {
    industry: string;
    targetAudience: string;
    platforms: string[];
    contentPillars: ContentPillar[];
    count?: number;
    timeframe?: string;
  }
): Promise<ContentIdea[]> {
  const prompt = `Generate ${options.count || 10} social media content ideas for a ${options.industry} business.

Target Audience: ${options.targetAudience}
Platforms: ${options.platforms.join(", ")}
Content Pillars: ${options.contentPillars.join(", ")}
Timeframe: ${options.timeframe || "next 2 weeks"}

For each idea, provide:
1. Title (catchy, attention-grabbing)
2. Description (2-3 sentences explaining the content)
3. Content Type (educational, promotional, entertaining, inspirational, behindTheScenes, or userGenerated)
4. Content Pillar (product, industry, culture, community, or thoughtLeadership)
5. Best platforms for this content
6. 3 hook options for the opening line
7. 5 relevant hashtags
8. Estimated engagement level (low, medium, high)

Format as JSON array with fields: title, description, contentType, pillar, platforms, hooks, hashtags, estimatedEngagement`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a social media content strategist. Generate creative, engaging content ideas that align with best practices for each platform. Return valid JSON only.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
    });

    const content = response.choices[0].message.content;
    if (!content) return [];

    const parsed = JSON.parse(content);
    const ideas = parsed.ideas || parsed.content_ideas || [];

    return ideas.map((idea: Partial<ContentIdea>) => ({
      id: crypto.randomUUID(),
      title: idea.title || "Untitled",
      description: idea.description || "",
      contentType: idea.contentType || "educational",
      pillar: idea.pillar || "product",
      platforms: idea.platforms || options.platforms,
      hooks: idea.hooks || [],
      hashtags: idea.hashtags || [],
      estimatedEngagement: idea.estimatedEngagement || "medium",
      status: "idea",
      createdAt: new Date(),
    }));
  } catch (error) {
    console.error("Failed to generate content ideas:", error);
    return [];
  }
}

export async function generateContentCalendar(
  userId: string,
  options: {
    ideas: ContentIdea[];
    startDate: Date;
    endDate: Date;
    postingFrequency: Record<string, number>;
  }
): Promise<ContentIdea[]> {
  const { ideas, startDate, endDate, postingFrequency } = options;
  const scheduledIdeas: ContentIdea[] = [];
  const currentDate = new Date(startDate);

  // Calculate total days
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  // Create scheduling slots based on frequency
  const slots: { date: Date; platform: string }[] = [];

  for (let day = 0; day < totalDays; day++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + day);

    for (const [platform, postsPerWeek] of Object.entries(postingFrequency)) {
      // Distribute posts across the week
      const postDays = [0, 2, 4, 6].slice(0, postsPerWeek);
      if (postDays.includes(day % 7)) {
        slots.push({ date: new Date(date), platform });
      }
    }
  }

  // Assign ideas to slots
  let ideaIndex = 0;
  for (const slot of slots) {
    if (ideaIndex >= ideas.length) break;

    const idea = ideas[ideaIndex];
    if (idea.platforms.includes(slot.platform) || idea.platforms.length === 0) {
      scheduledIdeas.push({
        ...idea,
        suggestedDate: slot.date,
        status: "planned",
      });
      ideaIndex++;
    }
  }

  return scheduledIdeas;
}

export async function getTrendingTopics(
  industry: string,
  platforms: string[]
): Promise<TrendingTopic[]> {
  const prompt = `Identify 10 trending topics and themes relevant to the ${industry} industry that would perform well on ${platforms.join(", ")}.

For each topic, provide:
1. Topic name
2. Category (news, seasonal, viral, evergreen, industry-specific)
3. Relevance score (0-100)
4. Best platforms for this topic
5. 3 suggested content angles

Format as JSON with fields: topic, category, relevanceScore, platforms, suggestedAngles`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a social media trends analyst. Identify relevant trending topics based on current events, seasonal themes, and industry trends. Return valid JSON only.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    if (!content) return [];

    const parsed = JSON.parse(content);
    return parsed.topics || parsed.trending_topics || [];
  } catch (error) {
    console.error("Failed to get trending topics:", error);
    return [];
  }
}

export async function analyzeContentMix(
  ideas: ContentIdea[]
): Promise<{
  typeDistribution: Record<ContentType, number>;
  pillarDistribution: Record<ContentPillar, number>;
  platformCoverage: Record<string, number>;
  engagementPrediction: string;
  recommendations: string[];
}> {
  const typeDistribution: Record<ContentType, number> = {
    educational: 0,
    promotional: 0,
    entertaining: 0,
    inspirational: 0,
    behindTheScenes: 0,
    userGenerated: 0,
  };

  const pillarDistribution: Record<ContentPillar, number> = {
    product: 0,
    industry: 0,
    culture: 0,
    community: 0,
    thoughtLeadership: 0,
  };

  const platformCoverage: Record<string, number> = {};

  for (const idea of ideas) {
    typeDistribution[idea.contentType]++;
    pillarDistribution[idea.pillar]++;
    for (const platform of idea.platforms) {
      platformCoverage[platform] = (platformCoverage[platform] || 0) + 1;
    }
  }

  // Generate recommendations based on distribution
  const recommendations: string[] = [];
  const total = ideas.length;

  if (total > 0) {
    const promoPercentage = (typeDistribution.promotional / total) * 100;
    if (promoPercentage > 30) {
      recommendations.push("Consider reducing promotional content to under 30% for better engagement");
    }
    if (promoPercentage < 10) {
      recommendations.push("Add more promotional content to drive conversions");
    }

    const eduPercentage = (typeDistribution.educational / total) * 100;
    if (eduPercentage < 20) {
      recommendations.push("Increase educational content to establish authority");
    }

    const entertainingPercentage = (typeDistribution.entertaining / total) * 100;
    if (entertainingPercentage < 15) {
      recommendations.push("Add more entertaining content to boost engagement");
    }

    // Check pillar balance
    const pillarValues = Object.values(pillarDistribution);
    const maxPillar = Math.max(...pillarValues);
    const minPillar = Math.min(...pillarValues);
    if (maxPillar > minPillar * 3 && total > 5) {
      recommendations.push("Balance your content pillars for a more diverse feed");
    }
  }

  // Predict engagement based on content mix
  const highEngagementCount = ideas.filter((i) => i.estimatedEngagement === "high").length;
  const engagementRatio = total > 0 ? highEngagementCount / total : 0;

  let engagementPrediction = "moderate";
  if (engagementRatio > 0.4) engagementPrediction = "high";
  else if (engagementRatio < 0.2) engagementPrediction = "low";

  return {
    typeDistribution,
    pillarDistribution,
    platformCoverage,
    engagementPrediction,
    recommendations,
  };
}

export async function generateWeeklyPlan(
  userId: string,
  options: {
    industry: string;
    targetAudience: string;
    platforms: string[];
    contentPillars: ContentPillar[];
    weekStartDate: Date;
    postsPerDay: number;
    goals?: string[];
  }
): Promise<ContentPlan> {
  const endDate = new Date(options.weekStartDate);
  endDate.setDate(endDate.getDate() + 7);

  // Generate ideas for the week
  const ideas = await generateContentIdeas(userId, {
    industry: options.industry,
    targetAudience: options.targetAudience,
    platforms: options.platforms,
    contentPillars: options.contentPillars,
    count: options.postsPerDay * 7,
    timeframe: "next week",
  });

  // Create posting frequency
  const postingFrequency: Record<string, number> = {};
  for (const platform of options.platforms) {
    postingFrequency[platform] = options.postsPerDay;
  }

  // Schedule the ideas
  const scheduledIdeas = await generateContentCalendar(userId, {
    ideas,
    startDate: options.weekStartDate,
    endDate,
    postingFrequency,
  });

  const plan: ContentPlan = {
    id: crypto.randomUUID(),
    userId,
    name: `Week of ${options.weekStartDate.toLocaleDateString()}`,
    description: `AI-generated content plan for ${options.industry}`,
    startDate: options.weekStartDate,
    endDate,
    goals: options.goals || ["Increase engagement", "Build brand awareness"],
    targetAudience: options.targetAudience,
    contentPillars: options.contentPillars,
    postingFrequency,
    ideas: scheduledIdeas,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Store the plan
  contentPlans.set(plan.id, plan);
  if (!userPlans.has(userId)) {
    userPlans.set(userId, new Set());
  }
  userPlans.get(userId)!.add(plan.id);

  return plan;
}

export function getUserPlans(userId: string): ContentPlan[] {
  const planIds = userPlans.get(userId);
  if (!planIds) return [];

  return Array.from(planIds)
    .map((id) => contentPlans.get(id))
    .filter((plan): plan is ContentPlan => plan !== undefined)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function getPlan(planId: string, userId: string): ContentPlan | null {
  const plan = contentPlans.get(planId);
  if (!plan || plan.userId !== userId) return null;
  return plan;
}

export function updatePlan(
  planId: string,
  userId: string,
  updates: Partial<Pick<ContentPlan, "name" | "description" | "goals" | "ideas">>
): ContentPlan | null {
  const plan = contentPlans.get(planId);
  if (!plan || plan.userId !== userId) return null;

  const updatedPlan = {
    ...plan,
    ...updates,
    updatedAt: new Date(),
  };

  contentPlans.set(planId, updatedPlan);
  return updatedPlan;
}

export function deletePlan(planId: string, userId: string): boolean {
  const plan = contentPlans.get(planId);
  if (!plan || plan.userId !== userId) return false;

  contentPlans.delete(planId);
  userPlans.get(userId)?.delete(planId);
  return true;
}

export function updateIdeaStatus(
  planId: string,
  userId: string,
  ideaId: string,
  status: ContentIdea["status"]
): ContentPlan | null {
  const plan = contentPlans.get(planId);
  if (!plan || plan.userId !== userId) return null;

  const ideaIndex = plan.ideas.findIndex((i) => i.id === ideaId);
  if (ideaIndex === -1) return null;

  plan.ideas[ideaIndex].status = status;
  plan.updatedAt = new Date();

  contentPlans.set(planId, plan);
  return plan;
}

export async function suggestOptimalTimes(
  platforms: string[],
  targetAudience: string
): Promise<Record<string, string[]>> {
  // Return general best posting times based on platform
  const optimalTimes: Record<string, string[]> = {
    X: ["9:00 AM", "12:00 PM", "5:00 PM"],
    LINKEDIN: ["8:00 AM", "10:00 AM", "12:00 PM"],
    INSTAGRAM: ["11:00 AM", "1:00 PM", "7:00 PM"],
    TIKTOK: ["7:00 AM", "12:00 PM", "7:00 PM"],
    YOUTUBE: ["2:00 PM", "4:00 PM", "9:00 PM"],
    PINTEREST: ["8:00 PM", "9:00 PM", "11:00 PM"],
    BLUESKY: ["9:00 AM", "1:00 PM", "6:00 PM"],
    THREADS: ["10:00 AM", "2:00 PM", "8:00 PM"],
  };

  const result: Record<string, string[]> = {};
  for (const platform of platforms) {
    result[platform] = optimalTimes[platform] || ["9:00 AM", "12:00 PM", "5:00 PM"];
  }

  return result;
}

export const CONTENT_TYPES: { value: ContentType; label: string; description: string }[] = [
  { value: "educational", label: "Educational", description: "Teach your audience something valuable" },
  { value: "promotional", label: "Promotional", description: "Promote your products or services" },
  { value: "entertaining", label: "Entertaining", description: "Engage with fun, relatable content" },
  { value: "inspirational", label: "Inspirational", description: "Motivate and inspire your audience" },
  { value: "behindTheScenes", label: "Behind the Scenes", description: "Show your brand's human side" },
  { value: "userGenerated", label: "User Generated", description: "Feature content from your community" },
];

export const CONTENT_PILLARS: { value: ContentPillar; label: string; description: string }[] = [
  { value: "product", label: "Product", description: "Showcase your products and features" },
  { value: "industry", label: "Industry", description: "Share industry news and insights" },
  { value: "culture", label: "Culture", description: "Highlight company culture and values" },
  { value: "community", label: "Community", description: "Engage with your community" },
  { value: "thoughtLeadership", label: "Thought Leadership", description: "Share expert opinions and insights" },
];
