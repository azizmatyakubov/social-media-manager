import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type InfluencerTier = "nano" | "micro" | "mid" | "macro" | "mega";
export type OutreachStatus = "not_contacted" | "contacted" | "responded" | "negotiating" | "agreed" | "declined" | "completed";

export interface Influencer {
  id: string;
  name: string;
  handle: string;
  platform: string;
  profileUrl: string;
  avatarUrl?: string;
  bio?: string;
  followers: number;
  tier: InfluencerTier;
  engagementRate: number;
  niche: string[];
  location?: string;
  email?: string;
  averageLikes: number;
  averageComments: number;
  contentTypes: string[];
  audienceDemographics?: {
    ageRange: string;
    genderSplit: { male: number; female: number; other: number };
    topLocations: string[];
  };
  estimatedCost?: {
    post: number;
    story: number;
    reel: number;
    video: number;
  };
  notes?: string;
  tags: string[];
  score: number;
  addedAt: Date;
}

export interface OutreachCampaign {
  id: string;
  userId: string;
  name: string;
  description?: string;
  goal: string;
  budget: number;
  startDate: Date;
  endDate: Date;
  influencers: {
    influencerId: string;
    status: OutreachStatus;
    lastContactDate?: Date;
    proposedRate?: number;
    agreedRate?: number;
    deliverables?: string[];
    notes?: string;
  }[];
  messageTemplates: {
    id: string;
    name: string;
    subject: string;
    body: string;
  }[];
  metrics?: {
    totalReach: number;
    totalEngagement: number;
    conversions: number;
    roi: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface InfluencerSearch {
  niche: string;
  platforms: string[];
  followerRange: { min: number; max: number };
  engagementMin: number;
  location?: string;
  keywords?: string[];
}

// In-memory storage
const influencers = new Map<string, Influencer>();
const userInfluencers = new Map<string, Set<string>>();
const outreachCampaigns = new Map<string, OutreachCampaign>();
const userCampaigns = new Map<string, Set<string>>();

export function getTierFromFollowers(followers: number): InfluencerTier {
  if (followers < 10000) return "nano";
  if (followers < 100000) return "micro";
  if (followers < 500000) return "mid";
  if (followers < 1000000) return "macro";
  return "mega";
}

export function calculateInfluencerScore(influencer: Partial<Influencer>): number {
  let score = 0;

  // Engagement rate (0-40 points)
  const engagementRate = influencer.engagementRate || 0;
  if (engagementRate >= 6) score += 40;
  else if (engagementRate >= 4) score += 30;
  else if (engagementRate >= 2) score += 20;
  else if (engagementRate >= 1) score += 10;

  // Followers quality (0-30 points) - nano/micro often have better engagement
  const tier = influencer.tier || getTierFromFollowers(influencer.followers || 0);
  if (tier === "nano" || tier === "micro") score += 30;
  else if (tier === "mid") score += 25;
  else if (tier === "macro") score += 20;
  else score += 15;

  // Profile completeness (0-20 points)
  if (influencer.bio) score += 5;
  if (influencer.email) score += 5;
  if (influencer.location) score += 5;
  if ((influencer.niche?.length || 0) > 0) score += 5;

  // Content variety (0-10 points)
  const contentTypes = influencer.contentTypes?.length || 0;
  if (contentTypes >= 4) score += 10;
  else if (contentTypes >= 2) score += 5;

  return Math.min(100, score);
}

export async function discoverInfluencers(
  search: InfluencerSearch
): Promise<Influencer[]> {
  // Simulate AI-powered discovery with mock data
  const prompt = `Generate 10 realistic influencer profiles for the following search criteria:

Niche: ${search.niche}
Platforms: ${search.platforms.join(", ")}
Follower range: ${search.followerRange.min.toLocaleString()} - ${search.followerRange.max.toLocaleString()}
Minimum engagement rate: ${search.engagementMin}%
${search.location ? `Location: ${search.location}` : ""}
${search.keywords?.length ? `Keywords: ${search.keywords.join(", ")}` : ""}

For each influencer, provide:
1. Name (realistic name)
2. Handle (platform username)
3. Platform
4. Bio (short description)
5. Follower count
6. Engagement rate (percentage)
7. Niche categories (array)
8. Content types they create
9. Location
10. Average likes per post
11. Average comments per post

Return as JSON array with fields: name, handle, platform, bio, followers, engagementRate, niche, contentTypes, location, averageLikes, averageComments`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an influencer marketing expert. Generate realistic influencer profiles based on the search criteria. Return valid JSON only with an 'influencers' array.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
    });

    const content = response.choices[0].message.content;
    if (!content) return [];

    const parsed = JSON.parse(content);
    const rawInfluencers = parsed.influencers || [];

    return rawInfluencers.map((inf: Partial<Influencer>) => {
      const influencer: Influencer = {
        id: crypto.randomUUID(),
        name: inf.name || "Unknown",
        handle: inf.handle || "@unknown",
        platform: inf.platform || search.platforms[0],
        profileUrl: `https://${(inf.platform || search.platforms[0]).toLowerCase()}.com/${inf.handle}`,
        bio: inf.bio,
        followers: inf.followers || 10000,
        tier: getTierFromFollowers(inf.followers || 10000),
        engagementRate: inf.engagementRate || 3,
        niche: inf.niche || [search.niche],
        location: inf.location,
        averageLikes: inf.averageLikes || Math.floor((inf.followers || 10000) * 0.03),
        averageComments: inf.averageComments || Math.floor((inf.followers || 10000) * 0.001),
        contentTypes: inf.contentTypes || ["posts", "stories"],
        tags: [],
        score: 0,
        addedAt: new Date(),
      };

      influencer.score = calculateInfluencerScore(influencer);
      return influencer;
    });
  } catch (error) {
    console.error("Failed to discover influencers:", error);
    return [];
  }
}

export async function generateOutreachMessage(
  influencer: Influencer,
  campaign: {
    brandName: string;
    goal: string;
    offer: string;
    tone: "professional" | "casual" | "friendly";
  }
): Promise<{ subject: string; body: string }> {
  const prompt = `Generate a personalized influencer outreach email for:

INFLUENCER:
- Name: ${influencer.name}
- Handle: ${influencer.handle}
- Platform: ${influencer.platform}
- Followers: ${influencer.followers.toLocaleString()}
- Niche: ${influencer.niche.join(", ")}
- Bio: ${influencer.bio || "Not available"}

CAMPAIGN:
- Brand: ${campaign.brandName}
- Goal: ${campaign.goal}
- What we're offering: ${campaign.offer}
- Tone: ${campaign.tone}

Generate a compelling outreach email that:
1. Shows you've researched them specifically
2. Explains the collaboration opportunity
3. Highlights mutual benefits
4. Includes a clear call-to-action

Return as JSON with fields: subject, body`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an influencer marketing specialist. Write personalized, effective outreach emails. Return valid JSON only.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    if (!content) return { subject: "", body: "" };

    return JSON.parse(content);
  } catch (error) {
    console.error("Failed to generate outreach message:", error);
    return { subject: "", body: "" };
  }
}

export async function analyzeInfluencerFit(
  influencer: Influencer,
  brandDetails: {
    industry: string;
    targetAudience: string;
    values: string[];
    goals: string[];
  }
): Promise<{
  fitScore: number;
  strengths: string[];
  concerns: string[];
  recommendation: string;
}> {
  const prompt = `Analyze how well this influencer fits the brand:

INFLUENCER:
- Name: ${influencer.name}
- Platform: ${influencer.platform}
- Followers: ${influencer.followers.toLocaleString()}
- Engagement Rate: ${influencer.engagementRate}%
- Niche: ${influencer.niche.join(", ")}
- Content Types: ${influencer.contentTypes.join(", ")}
- Bio: ${influencer.bio || "Not available"}

BRAND:
- Industry: ${brandDetails.industry}
- Target Audience: ${brandDetails.targetAudience}
- Values: ${brandDetails.values.join(", ")}
- Campaign Goals: ${brandDetails.goals.join(", ")}

Analyze and provide:
1. Fit score (0-100)
2. Strengths of this match (array of points)
3. Potential concerns (array of points)
4. Overall recommendation (2-3 sentences)

Return as JSON with fields: fitScore, strengths, concerns, recommendation`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an influencer marketing analyst. Evaluate influencer-brand fit objectively. Return valid JSON only.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      return { fitScore: 0, strengths: [], concerns: [], recommendation: "" };
    }

    return JSON.parse(content);
  } catch (error) {
    console.error("Failed to analyze influencer fit:", error);
    return { fitScore: 0, strengths: [], concerns: [], recommendation: "" };
  }
}

export function estimateInfluencerCost(influencer: Influencer): {
  post: number;
  story: number;
  reel: number;
  video: number;
} {
  // Industry standard estimation based on followers and engagement
  const baseRate = influencer.followers * 0.01; // $0.01 per follower as base
  const engagementMultiplier = Math.min(2, influencer.engagementRate / 3); // Boost for high engagement

  const adjustedRate = baseRate * engagementMultiplier;

  return {
    post: Math.round(adjustedRate),
    story: Math.round(adjustedRate * 0.5),
    reel: Math.round(adjustedRate * 1.5),
    video: Math.round(adjustedRate * 3),
  };
}

// CRUD operations for influencers
export function addInfluencer(userId: string, influencer: Omit<Influencer, "id" | "score" | "addedAt">): Influencer {
  const newInfluencer: Influencer = {
    ...influencer,
    id: crypto.randomUUID(),
    score: calculateInfluencerScore(influencer),
    addedAt: new Date(),
  };

  influencers.set(newInfluencer.id, newInfluencer);

  if (!userInfluencers.has(userId)) {
    userInfluencers.set(userId, new Set());
  }
  userInfluencers.get(userId)!.add(newInfluencer.id);

  return newInfluencer;
}

export function getUserInfluencers(userId: string): Influencer[] {
  const influencerIds = userInfluencers.get(userId);
  if (!influencerIds) return [];

  return Array.from(influencerIds)
    .map((id) => influencers.get(id))
    .filter((inf): inf is Influencer => inf !== undefined)
    .sort((a, b) => b.score - a.score);
}

export function getInfluencer(influencerId: string): Influencer | null {
  return influencers.get(influencerId) || null;
}

export function updateInfluencer(
  influencerId: string,
  userId: string,
  updates: Partial<Omit<Influencer, "id" | "addedAt">>
): Influencer | null {
  const inf = influencers.get(influencerId);
  if (!inf) return null;

  const userInfs = userInfluencers.get(userId);
  if (!userInfs?.has(influencerId)) return null;

  const updated: Influencer = {
    ...inf,
    ...updates,
    score: calculateInfluencerScore({ ...inf, ...updates }),
  };

  influencers.set(influencerId, updated);
  return updated;
}

export function deleteInfluencer(influencerId: string, userId: string): boolean {
  const userInfs = userInfluencers.get(userId);
  if (!userInfs?.has(influencerId)) return false;

  influencers.delete(influencerId);
  userInfs.delete(influencerId);
  return true;
}

// CRUD operations for outreach campaigns
export function createOutreachCampaign(
  userId: string,
  data: Omit<OutreachCampaign, "id" | "userId" | "influencers" | "messageTemplates" | "createdAt" | "updatedAt">
): OutreachCampaign {
  const campaign: OutreachCampaign = {
    id: crypto.randomUUID(),
    userId,
    ...data,
    influencers: [],
    messageTemplates: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  outreachCampaigns.set(campaign.id, campaign);

  if (!userCampaigns.has(userId)) {
    userCampaigns.set(userId, new Set());
  }
  userCampaigns.get(userId)!.add(campaign.id);

  return campaign;
}

export function getUserCampaigns(userId: string): OutreachCampaign[] {
  const campaignIds = userCampaigns.get(userId);
  if (!campaignIds) return [];

  return Array.from(campaignIds)
    .map((id) => outreachCampaigns.get(id))
    .filter((c): c is OutreachCampaign => c !== undefined)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function getCampaign(campaignId: string, userId: string): OutreachCampaign | null {
  const campaign = outreachCampaigns.get(campaignId);
  if (!campaign || campaign.userId !== userId) return null;
  return campaign;
}

export function addInfluencerToCampaign(
  campaignId: string,
  userId: string,
  influencerId: string
): OutreachCampaign | null {
  const campaign = outreachCampaigns.get(campaignId);
  if (!campaign || campaign.userId !== userId) return null;

  if (campaign.influencers.some((i) => i.influencerId === influencerId)) {
    return campaign; // Already added
  }

  campaign.influencers.push({
    influencerId,
    status: "not_contacted",
  });
  campaign.updatedAt = new Date();

  outreachCampaigns.set(campaignId, campaign);
  return campaign;
}

export function updateInfluencerStatus(
  campaignId: string,
  userId: string,
  influencerId: string,
  status: OutreachStatus,
  additionalData?: {
    proposedRate?: number;
    agreedRate?: number;
    deliverables?: string[];
    notes?: string;
  }
): OutreachCampaign | null {
  const campaign = outreachCampaigns.get(campaignId);
  if (!campaign || campaign.userId !== userId) return null;

  const influencerIndex = campaign.influencers.findIndex((i) => i.influencerId === influencerId);
  if (influencerIndex === -1) return null;

  campaign.influencers[influencerIndex] = {
    ...campaign.influencers[influencerIndex],
    status,
    lastContactDate: new Date(),
    ...additionalData,
  };
  campaign.updatedAt = new Date();

  outreachCampaigns.set(campaignId, campaign);
  return campaign;
}

export function deleteCampaign(campaignId: string, userId: string): boolean {
  const campaign = outreachCampaigns.get(campaignId);
  if (!campaign || campaign.userId !== userId) return false;

  outreachCampaigns.delete(campaignId);
  userCampaigns.get(userId)?.delete(campaignId);
  return true;
}

export const INFLUENCER_TIERS: { value: InfluencerTier; label: string; range: string }[] = [
  { value: "nano", label: "Nano", range: "1K - 10K" },
  { value: "micro", label: "Micro", range: "10K - 100K" },
  { value: "mid", label: "Mid-Tier", range: "100K - 500K" },
  { value: "macro", label: "Macro", range: "500K - 1M" },
  { value: "mega", label: "Mega", range: "1M+" },
];

export const OUTREACH_STATUSES: { value: OutreachStatus; label: string; color: string }[] = [
  { value: "not_contacted", label: "Not Contacted", color: "zinc" },
  { value: "contacted", label: "Contacted", color: "blue" },
  { value: "responded", label: "Responded", color: "purple" },
  { value: "negotiating", label: "Negotiating", color: "yellow" },
  { value: "agreed", label: "Agreed", color: "green" },
  { value: "declined", label: "Declined", color: "red" },
  { value: "completed", label: "Completed", color: "emerald" },
];
