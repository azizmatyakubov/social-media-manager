import { prisma } from "./prisma";

// Types
export interface UTMParams {
  source: string;         // utm_source - where the traffic is coming from (e.g., twitter, linkedin)
  medium: string;         // utm_medium - how the traffic is arriving (e.g., social, cpc, email)
  campaign: string;       // utm_campaign - what campaign is driving it (e.g., spring_sale)
  term?: string;          // utm_term - keywords for paid search
  content?: string;       // utm_content - differentiate similar content (e.g., cta_button vs link)
}

export interface UTMPreset {
  id: string;
  userId: string;
  name: string;
  source: string;
  medium: string;
  campaign: string;
  term: string | null;
  content: string | null;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UTMLink {
  id: string;
  userId: string;
  originalUrl: string;
  fullUrl: string;
  shortCode: string | null;
  source: string;
  medium: string;
  campaign: string;
  term: string | null;
  content: string | null;
  clicks: number;
  createdAt: Date;
}

// Build UTM URL
export function buildUTMUrl(baseUrl: string, params: UTMParams): string {
  try {
    const url = new URL(baseUrl);

    // Remove existing UTM params
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach((param) => {
      url.searchParams.delete(param);
    });

    // Add new UTM params
    url.searchParams.set("utm_source", params.source);
    url.searchParams.set("utm_medium", params.medium);
    url.searchParams.set("utm_campaign", params.campaign);

    if (params.term) {
      url.searchParams.set("utm_term", params.term);
    }
    if (params.content) {
      url.searchParams.set("utm_content", params.content);
    }

    return url.toString();
  } catch {
    throw new Error("Invalid URL provided");
  }
}

// Parse UTM params from URL
export function parseUTMParams(url: string): UTMParams | null {
  try {
    const parsed = new URL(url);
    const source = parsed.searchParams.get("utm_source");
    const medium = parsed.searchParams.get("utm_medium");
    const campaign = parsed.searchParams.get("utm_campaign");

    if (!source || !medium || !campaign) {
      return null;
    }

    return {
      source,
      medium,
      campaign,
      term: parsed.searchParams.get("utm_term") || undefined,
      content: parsed.searchParams.get("utm_content") || undefined,
    };
  } catch {
    return null;
  }
}

// Generate short code
export function generateShortCode(length: number = 6): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Create UTM link in database
export async function createUTMLink(
  userId: string,
  originalUrl: string,
  params: UTMParams,
  options?: { createShortCode?: boolean }
) {
  const fullUrl = buildUTMUrl(originalUrl, params);
  const shortCode = options?.createShortCode ? generateShortCode() : null;

  const link = await prisma.uTMLink.create({
    data: {
      userId,
      originalUrl,
      fullUrl,
      shortCode,
      source: params.source,
      medium: params.medium,
      campaign: params.campaign,
      term: params.term || null,
      content: params.content || null,
    },
  });

  return link;
}

// Get user's UTM links
export async function getUTMLinks(
  userId: string,
  options?: {
    campaign?: string;
    source?: string;
    limit?: number;
    offset?: number;
  }
) {
  const where: Record<string, unknown> = { userId };

  if (options?.campaign) {
    where.campaign = options.campaign;
  }
  if (options?.source) {
    where.source = options.source;
  }

  return prisma.uTMLink.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: options?.limit ?? 50,
    skip: options?.offset ?? 0,
  });
}

// Get UTM link by short code
export async function getUTMLinkByShortCode(shortCode: string) {
  return prisma.uTMLink.findFirst({
    where: { shortCode },
  });
}

// Track click on UTM link
export async function trackUTMClick(linkId: string) {
  return prisma.uTMLink.update({
    where: { id: linkId },
    data: {
      clicks: { increment: 1 },
    },
  });
}

// Create UTM preset
export async function createUTMPreset(
  userId: string,
  data: {
    name: string;
    source: string;
    medium: string;
    campaign: string;
    term?: string;
    content?: string;
  }
) {
  return prisma.uTMPreset.create({
    data: {
      userId,
      name: data.name,
      source: data.source,
      medium: data.medium,
      campaign: data.campaign,
      term: data.term || null,
      content: data.content || null,
    },
  });
}

// Get user's UTM presets
export async function getUTMPresets(userId: string) {
  return prisma.uTMPreset.findMany({
    where: { userId },
    orderBy: [{ usageCount: "desc" }, { createdAt: "desc" }],
  });
}

// Update UTM preset
export async function updateUTMPreset(
  presetId: string,
  userId: string,
  data: Partial<{
    name: string;
    source: string;
    medium: string;
    campaign: string;
    term: string | null;
    content: string | null;
  }>
) {
  return prisma.uTMPreset.update({
    where: { id: presetId, userId },
    data,
  });
}

// Delete UTM preset
export async function deleteUTMPreset(presetId: string, userId: string) {
  return prisma.uTMPreset.delete({
    where: { id: presetId, userId },
  });
}

// Increment preset usage
export async function incrementPresetUsage(presetId: string) {
  return prisma.uTMPreset.update({
    where: { id: presetId },
    data: {
      usageCount: { increment: 1 },
    },
  });
}

// Delete UTM link
export async function deleteUTMLink(linkId: string, userId: string) {
  return prisma.uTMLink.delete({
    where: { id: linkId, userId },
  });
}

// Get UTM analytics
export async function getUTMAnalytics(userId: string) {
  const links = await prisma.uTMLink.findMany({
    where: { userId },
    select: {
      source: true,
      medium: true,
      campaign: true,
      clicks: true,
      createdAt: true,
    },
  });

  // Aggregate by source
  const bySource = links.reduce<Record<string, { count: number; clicks: number }>>((acc, link) => {
    if (!acc[link.source]) {
      acc[link.source] = { count: 0, clicks: 0 };
    }
    acc[link.source].count++;
    acc[link.source].clicks += link.clicks;
    return acc;
  }, {});

  // Aggregate by medium
  const byMedium = links.reduce<Record<string, { count: number; clicks: number }>>((acc, link) => {
    if (!acc[link.medium]) {
      acc[link.medium] = { count: 0, clicks: 0 };
    }
    acc[link.medium].count++;
    acc[link.medium].clicks += link.clicks;
    return acc;
  }, {});

  // Aggregate by campaign
  const byCampaign = links.reduce<Record<string, { count: number; clicks: number }>>((acc, link) => {
    if (!acc[link.campaign]) {
      acc[link.campaign] = { count: 0, clicks: 0 };
    }
    acc[link.campaign].count++;
    acc[link.campaign].clicks += link.clicks;
    return acc;
  }, {});

  return {
    totalLinks: links.length,
    totalClicks: links.reduce((sum, l) => sum + l.clicks, 0),
    bySource: Object.entries(bySource).map(([name, data]) => ({ name, ...data })),
    byMedium: Object.entries(byMedium).map(([name, data]) => ({ name, ...data })),
    byCampaign: Object.entries(byCampaign).map(([name, data]) => ({ name, ...data })),
  };
}

// Default source suggestions
export const defaultSources = [
  { value: "twitter", label: "Twitter/X" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
  { value: "pinterest", label: "Pinterest" },
  { value: "email", label: "Email" },
  { value: "newsletter", label: "Newsletter" },
  { value: "blog", label: "Blog" },
];

// Default medium suggestions
export const defaultMediums = [
  { value: "social", label: "Social Media" },
  { value: "organic", label: "Organic" },
  { value: "cpc", label: "Cost Per Click (CPC)" },
  { value: "cpm", label: "Cost Per Mille (CPM)" },
  { value: "email", label: "Email" },
  { value: "referral", label: "Referral" },
  { value: "affiliate", label: "Affiliate" },
  { value: "banner", label: "Banner Ad" },
  { value: "video", label: "Video" },
];

// Validate UTM params
export function validateUTMParams(params: Partial<UTMParams>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!params.source || params.source.trim() === "") {
    errors.push("Source is required");
  } else if (!/^[a-zA-Z0-9_-]+$/.test(params.source)) {
    errors.push("Source can only contain letters, numbers, hyphens, and underscores");
  }

  if (!params.medium || params.medium.trim() === "") {
    errors.push("Medium is required");
  } else if (!/^[a-zA-Z0-9_-]+$/.test(params.medium)) {
    errors.push("Medium can only contain letters, numbers, hyphens, and underscores");
  }

  if (!params.campaign || params.campaign.trim() === "") {
    errors.push("Campaign is required");
  } else if (!/^[a-zA-Z0-9_-]+$/.test(params.campaign)) {
    errors.push("Campaign can only contain letters, numbers, hyphens, and underscores");
  }

  if (params.term && !/^[a-zA-Z0-9_+-]+$/.test(params.term)) {
    errors.push("Term can only contain letters, numbers, hyphens, underscores, and plus signs");
  }

  if (params.content && !/^[a-zA-Z0-9_-]+$/.test(params.content)) {
    errors.push("Content can only contain letters, numbers, hyphens, and underscores");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
