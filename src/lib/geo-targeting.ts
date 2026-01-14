export interface GeoRegion {
  id: string;
  name: string;
  code: string;
  type: "country" | "state" | "city" | "region";
  parentId?: string;
  population?: number;
  timezone: string;
  languages: string[];
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface GeoTarget {
  id: string;
  userId: string;
  name: string;
  description?: string;
  regions: string[]; // Region IDs
  excludedRegions: string[];
  languages: string[];
  demographics?: {
    ageRange?: { min: number; max: number };
    gender?: "all" | "male" | "female";
    interests?: string[];
  };
  audienceSize?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface GeoPost {
  id: string;
  userId: string;
  content: string;
  platforms: string[];
  geoTargetId: string;
  localizedVersions: {
    regionId: string;
    language: string;
    content: string;
    hashtags: string[];
  }[];
  scheduledAt?: Date;
  status: "draft" | "scheduled" | "published" | "failed";
  analytics?: {
    impressions: number;
    engagement: number;
    reach: number;
    byRegion: Record<string, { impressions: number; engagement: number }>;
  };
  createdAt: Date;
  publishedAt?: Date;
}

export interface GeoAudienceInsight {
  regionId: string;
  regionName: string;
  followers: number;
  engagementRate: number;
  bestPostingTimes: { hour: number; day: string; score: number }[];
  topContentTypes: { type: string; performance: number }[];
  languageBreakdown: Record<string, number>;
  growthRate: number;
}

// In-memory storage
const geoRegions = new Map<string, GeoRegion>();
const geoTargets = new Map<string, GeoTarget>();
const userGeoTargets = new Map<string, Set<string>>();
const geoPosts = new Map<string, GeoPost>();
const userGeoPosts = new Map<string, Set<string>>();
const audienceInsights = new Map<string, GeoAudienceInsight>();

// Initialize with common regions
const defaultRegions: GeoRegion[] = [
  // North America
  { id: "us", name: "United States", code: "US", type: "country", timezone: "America/New_York", languages: ["en"], population: 331000000 },
  { id: "ca", name: "Canada", code: "CA", type: "country", timezone: "America/Toronto", languages: ["en", "fr"], population: 38000000 },
  { id: "mx", name: "Mexico", code: "MX", type: "country", timezone: "America/Mexico_City", languages: ["es"], population: 128000000 },

  // US States
  { id: "us-ca", name: "California", code: "CA", type: "state", parentId: "us", timezone: "America/Los_Angeles", languages: ["en", "es"], population: 39500000 },
  { id: "us-ny", name: "New York", code: "NY", type: "state", parentId: "us", timezone: "America/New_York", languages: ["en"], population: 19500000 },
  { id: "us-tx", name: "Texas", code: "TX", type: "state", parentId: "us", timezone: "America/Chicago", languages: ["en", "es"], population: 29000000 },
  { id: "us-fl", name: "Florida", code: "FL", type: "state", parentId: "us", timezone: "America/New_York", languages: ["en", "es"], population: 21500000 },
  { id: "us-il", name: "Illinois", code: "IL", type: "state", parentId: "us", timezone: "America/Chicago", languages: ["en"], population: 12800000 },

  // Europe
  { id: "gb", name: "United Kingdom", code: "GB", type: "country", timezone: "Europe/London", languages: ["en"], population: 67000000 },
  { id: "de", name: "Germany", code: "DE", type: "country", timezone: "Europe/Berlin", languages: ["de"], population: 83000000 },
  { id: "fr", name: "France", code: "FR", type: "country", timezone: "Europe/Paris", languages: ["fr"], population: 67000000 },
  { id: "es", name: "Spain", code: "ES", type: "country", timezone: "Europe/Madrid", languages: ["es"], population: 47000000 },
  { id: "it", name: "Italy", code: "IT", type: "country", timezone: "Europe/Rome", languages: ["it"], population: 60000000 },
  { id: "nl", name: "Netherlands", code: "NL", type: "country", timezone: "Europe/Amsterdam", languages: ["nl", "en"], population: 17000000 },
  { id: "be", name: "Belgium", code: "BE", type: "country", timezone: "Europe/Brussels", languages: ["nl", "fr", "de"], population: 11500000 },
  { id: "ch", name: "Switzerland", code: "CH", type: "country", timezone: "Europe/Zurich", languages: ["de", "fr", "it"], population: 8600000 },
  { id: "at", name: "Austria", code: "AT", type: "country", timezone: "Europe/Vienna", languages: ["de"], population: 9000000 },
  { id: "pt", name: "Portugal", code: "PT", type: "country", timezone: "Europe/Lisbon", languages: ["pt"], population: 10300000 },
  { id: "ie", name: "Ireland", code: "IE", type: "country", timezone: "Europe/Dublin", languages: ["en", "ga"], population: 5000000 },
  { id: "se", name: "Sweden", code: "SE", type: "country", timezone: "Europe/Stockholm", languages: ["sv"], population: 10400000 },
  { id: "no", name: "Norway", code: "NO", type: "country", timezone: "Europe/Oslo", languages: ["no"], population: 5400000 },
  { id: "dk", name: "Denmark", code: "DK", type: "country", timezone: "Europe/Copenhagen", languages: ["da"], population: 5800000 },
  { id: "fi", name: "Finland", code: "FI", type: "country", timezone: "Europe/Helsinki", languages: ["fi", "sv"], population: 5500000 },
  { id: "pl", name: "Poland", code: "PL", type: "country", timezone: "Europe/Warsaw", languages: ["pl"], population: 38000000 },

  // Asia Pacific
  { id: "jp", name: "Japan", code: "JP", type: "country", timezone: "Asia/Tokyo", languages: ["ja"], population: 126000000 },
  { id: "kr", name: "South Korea", code: "KR", type: "country", timezone: "Asia/Seoul", languages: ["ko"], population: 52000000 },
  { id: "cn", name: "China", code: "CN", type: "country", timezone: "Asia/Shanghai", languages: ["zh"], population: 1400000000 },
  { id: "in", name: "India", code: "IN", type: "country", timezone: "Asia/Kolkata", languages: ["hi", "en"], population: 1380000000 },
  { id: "au", name: "Australia", code: "AU", type: "country", timezone: "Australia/Sydney", languages: ["en"], population: 26000000 },
  { id: "nz", name: "New Zealand", code: "NZ", type: "country", timezone: "Pacific/Auckland", languages: ["en", "mi"], population: 5000000 },
  { id: "sg", name: "Singapore", code: "SG", type: "country", timezone: "Asia/Singapore", languages: ["en", "zh", "ms", "ta"], population: 5700000 },
  { id: "hk", name: "Hong Kong", code: "HK", type: "region", timezone: "Asia/Hong_Kong", languages: ["zh", "en"], population: 7500000 },
  { id: "tw", name: "Taiwan", code: "TW", type: "region", timezone: "Asia/Taipei", languages: ["zh"], population: 24000000 },
  { id: "my", name: "Malaysia", code: "MY", type: "country", timezone: "Asia/Kuala_Lumpur", languages: ["ms", "en", "zh"], population: 32000000 },
  { id: "ph", name: "Philippines", code: "PH", type: "country", timezone: "Asia/Manila", languages: ["en", "tl"], population: 110000000 },
  { id: "th", name: "Thailand", code: "TH", type: "country", timezone: "Asia/Bangkok", languages: ["th"], population: 70000000 },
  { id: "id", name: "Indonesia", code: "ID", type: "country", timezone: "Asia/Jakarta", languages: ["id"], population: 270000000 },
  { id: "vn", name: "Vietnam", code: "VN", type: "country", timezone: "Asia/Ho_Chi_Minh", languages: ["vi"], population: 97000000 },

  // Latin America
  { id: "br", name: "Brazil", code: "BR", type: "country", timezone: "America/Sao_Paulo", languages: ["pt"], population: 213000000 },
  { id: "ar", name: "Argentina", code: "AR", type: "country", timezone: "America/Argentina/Buenos_Aires", languages: ["es"], population: 45000000 },
  { id: "co", name: "Colombia", code: "CO", type: "country", timezone: "America/Bogota", languages: ["es"], population: 51000000 },
  { id: "cl", name: "Chile", code: "CL", type: "country", timezone: "America/Santiago", languages: ["es"], population: 19000000 },
  { id: "pe", name: "Peru", code: "PE", type: "country", timezone: "America/Lima", languages: ["es"], population: 33000000 },

  // Middle East & Africa
  { id: "ae", name: "United Arab Emirates", code: "AE", type: "country", timezone: "Asia/Dubai", languages: ["ar", "en"], population: 10000000 },
  { id: "sa", name: "Saudi Arabia", code: "SA", type: "country", timezone: "Asia/Riyadh", languages: ["ar"], population: 35000000 },
  { id: "il", name: "Israel", code: "IL", type: "country", timezone: "Asia/Jerusalem", languages: ["he", "ar", "en"], population: 9500000 },
  { id: "eg", name: "Egypt", code: "EG", type: "country", timezone: "Africa/Cairo", languages: ["ar"], population: 102000000 },
  { id: "za", name: "South Africa", code: "ZA", type: "country", timezone: "Africa/Johannesburg", languages: ["en", "af", "zu"], population: 60000000 },
  { id: "ng", name: "Nigeria", code: "NG", type: "country", timezone: "Africa/Lagos", languages: ["en"], population: 206000000 },
  { id: "ke", name: "Kenya", code: "KE", type: "country", timezone: "Africa/Nairobi", languages: ["en", "sw"], population: 54000000 },

  // Major Cities
  { id: "city-nyc", name: "New York City", code: "NYC", type: "city", parentId: "us-ny", timezone: "America/New_York", languages: ["en", "es"], population: 8300000, coordinates: { lat: 40.7128, lng: -74.0060 } },
  { id: "city-la", name: "Los Angeles", code: "LA", type: "city", parentId: "us-ca", timezone: "America/Los_Angeles", languages: ["en", "es"], population: 4000000, coordinates: { lat: 34.0522, lng: -118.2437 } },
  { id: "city-london", name: "London", code: "LON", type: "city", parentId: "gb", timezone: "Europe/London", languages: ["en"], population: 9000000, coordinates: { lat: 51.5074, lng: -0.1278 } },
  { id: "city-tokyo", name: "Tokyo", code: "TYO", type: "city", parentId: "jp", timezone: "Asia/Tokyo", languages: ["ja"], population: 14000000, coordinates: { lat: 35.6762, lng: 139.6503 } },
  { id: "city-paris", name: "Paris", code: "PAR", type: "city", parentId: "fr", timezone: "Europe/Paris", languages: ["fr"], population: 2200000, coordinates: { lat: 48.8566, lng: 2.3522 } },
  { id: "city-berlin", name: "Berlin", code: "BER", type: "city", parentId: "de", timezone: "Europe/Berlin", languages: ["de"], population: 3600000, coordinates: { lat: 52.5200, lng: 13.4050 } },
  { id: "city-sydney", name: "Sydney", code: "SYD", type: "city", parentId: "au", timezone: "Australia/Sydney", languages: ["en"], population: 5300000, coordinates: { lat: -33.8688, lng: 151.2093 } },
  { id: "city-singapore", name: "Singapore", code: "SIN", type: "city", parentId: "sg", timezone: "Asia/Singapore", languages: ["en", "zh", "ms"], population: 5700000, coordinates: { lat: 1.3521, lng: 103.8198 } },
  { id: "city-dubai", name: "Dubai", code: "DXB", type: "city", parentId: "ae", timezone: "Asia/Dubai", languages: ["ar", "en"], population: 3500000, coordinates: { lat: 25.2048, lng: 55.2708 } },
  { id: "city-toronto", name: "Toronto", code: "TOR", type: "city", parentId: "ca", timezone: "America/Toronto", languages: ["en", "fr"], population: 2900000, coordinates: { lat: 43.6532, lng: -79.3832 } },
];

// Initialize regions
defaultRegions.forEach(region => geoRegions.set(region.id, region));

// Region CRUD
export function getAllRegions(): GeoRegion[] {
  return Array.from(geoRegions.values());
}

export function getRegion(id: string): GeoRegion | null {
  return geoRegions.get(id) || null;
}

export function getRegionsByType(type: GeoRegion["type"]): GeoRegion[] {
  return Array.from(geoRegions.values()).filter(r => r.type === type);
}

export function getRegionsByParent(parentId: string): GeoRegion[] {
  return Array.from(geoRegions.values()).filter(r => r.parentId === parentId);
}

export function searchRegions(query: string): GeoRegion[] {
  const lowerQuery = query.toLowerCase();
  return Array.from(geoRegions.values())
    .filter(r =>
      r.name.toLowerCase().includes(lowerQuery) ||
      r.code.toLowerCase().includes(lowerQuery)
    )
    .slice(0, 20);
}

// Geo Target CRUD
export function createGeoTarget(
  userId: string,
  data: Omit<GeoTarget, "id" | "userId" | "createdAt" | "updatedAt">
): GeoTarget {
  const target: GeoTarget = {
    id: crypto.randomUUID(),
    userId,
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Calculate audience size estimate
  const selectedRegions = data.regions.map(id => geoRegions.get(id)).filter(Boolean) as GeoRegion[];
  const excludedRegions = data.excludedRegions.map(id => geoRegions.get(id)).filter(Boolean) as GeoRegion[];

  const totalPop = selectedRegions.reduce((sum, r) => sum + (r.population || 0), 0);
  const excludedPop = excludedRegions.reduce((sum, r) => sum + (r.population || 0), 0);
  target.audienceSize = Math.floor((totalPop - excludedPop) * 0.15); // Estimate 15% social media users

  geoTargets.set(target.id, target);

  if (!userGeoTargets.has(userId)) {
    userGeoTargets.set(userId, new Set());
  }
  userGeoTargets.get(userId)!.add(target.id);

  return target;
}

export function getUserGeoTargets(userId: string): GeoTarget[] {
  const targetIds = userGeoTargets.get(userId);
  if (!targetIds) return [];

  return Array.from(targetIds)
    .map(id => geoTargets.get(id))
    .filter((t): t is GeoTarget => t !== undefined)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function getGeoTarget(id: string, userId: string): GeoTarget | null {
  const target = geoTargets.get(id);
  if (!target || target.userId !== userId) return null;
  return target;
}

export function updateGeoTarget(
  id: string,
  userId: string,
  updates: Partial<Omit<GeoTarget, "id" | "userId" | "createdAt" | "updatedAt">>
): GeoTarget | null {
  const target = geoTargets.get(id);
  if (!target || target.userId !== userId) return null;

  const updated: GeoTarget = {
    ...target,
    ...updates,
    updatedAt: new Date(),
  };

  // Recalculate audience size if regions changed
  if (updates.regions || updates.excludedRegions) {
    const regions = (updates.regions || target.regions).map(id => geoRegions.get(id)).filter(Boolean) as GeoRegion[];
    const excluded = (updates.excludedRegions || target.excludedRegions).map(id => geoRegions.get(id)).filter(Boolean) as GeoRegion[];
    const totalPop = regions.reduce((sum, r) => sum + (r.population || 0), 0);
    const excludedPop = excluded.reduce((sum, r) => sum + (r.population || 0), 0);
    updated.audienceSize = Math.floor((totalPop - excludedPop) * 0.15);
  }

  geoTargets.set(id, updated);
  return updated;
}

export function deleteGeoTarget(id: string, userId: string): boolean {
  const target = geoTargets.get(id);
  if (!target || target.userId !== userId) return false;

  geoTargets.delete(id);
  userGeoTargets.get(userId)?.delete(id);
  return true;
}

// Geo Post CRUD
export function createGeoPost(
  userId: string,
  data: Omit<GeoPost, "id" | "userId" | "createdAt" | "analytics">
): GeoPost {
  const post: GeoPost = {
    id: crypto.randomUUID(),
    userId,
    ...data,
    analytics: {
      impressions: 0,
      engagement: 0,
      reach: 0,
      byRegion: {},
    },
    createdAt: new Date(),
  };

  geoPosts.set(post.id, post);

  if (!userGeoPosts.has(userId)) {
    userGeoPosts.set(userId, new Set());
  }
  userGeoPosts.get(userId)!.add(post.id);

  return post;
}

export function getUserGeoPosts(userId: string): GeoPost[] {
  const postIds = userGeoPosts.get(userId);
  if (!postIds) return [];

  return Array.from(postIds)
    .map(id => geoPosts.get(id))
    .filter((p): p is GeoPost => p !== undefined)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function getGeoPost(id: string, userId: string): GeoPost | null {
  const post = geoPosts.get(id);
  if (!post || post.userId !== userId) return null;
  return post;
}

export function updateGeoPost(
  id: string,
  userId: string,
  updates: Partial<Omit<GeoPost, "id" | "userId" | "createdAt">>
): GeoPost | null {
  const post = geoPosts.get(id);
  if (!post || post.userId !== userId) return null;

  const updated: GeoPost = { ...post, ...updates };
  geoPosts.set(id, updated);
  return updated;
}

export function deleteGeoPost(id: string, userId: string): boolean {
  const post = geoPosts.get(id);
  if (!post || post.userId !== userId) return false;

  geoPosts.delete(id);
  userGeoPosts.get(userId)?.delete(id);
  return true;
}

// Localization and content adaptation
export async function generateLocalizedContent(
  content: string,
  targetRegions: string[],
  options?: {
    adaptHashtags?: boolean;
    adaptCulturalReferences?: boolean;
    targetLanguages?: string[];
  }
): Promise<{ regionId: string; language: string; content: string; hashtags: string[] }[]> {
  const results: { regionId: string; language: string; content: string; hashtags: string[] }[] = [];

  for (const regionId of targetRegions) {
    const region = geoRegions.get(regionId);
    if (!region) continue;

    // For each language in the region
    const languages = options?.targetLanguages || region.languages;
    for (const language of languages) {
      // Simulate localized content (in production, use translation API)
      let localizedContent = content;
      const hashtags: string[] = [];

      // Add region-specific hashtags
      if (options?.adaptHashtags) {
        hashtags.push(`#${region.name.replace(/\s/g, "")}`);
        if (region.type === "city") {
          hashtags.push(`#${region.code}Life`);
        }
      }

      results.push({
        regionId,
        language,
        content: localizedContent,
        hashtags,
      });
    }
  }

  return results;
}

// Audience insights
export function getAudienceInsightsByRegion(userId: string, regionIds: string[]): GeoAudienceInsight[] {
  // Generate mock insights for each region
  return regionIds.map(regionId => {
    const region = geoRegions.get(regionId);
    if (!region) return null;

    // Check if we have cached insights
    const cached = audienceInsights.get(`${userId}-${regionId}`);
    if (cached) return cached;

    // Generate mock insight
    const insight: GeoAudienceInsight = {
      regionId,
      regionName: region.name,
      followers: Math.floor(Math.random() * 10000) + 500,
      engagementRate: Math.random() * 5 + 1,
      bestPostingTimes: [
        { hour: 9, day: "Monday", score: 0.85 },
        { hour: 12, day: "Wednesday", score: 0.82 },
        { hour: 18, day: "Friday", score: 0.90 },
      ],
      topContentTypes: [
        { type: "Image", performance: 0.88 },
        { type: "Video", performance: 0.85 },
        { type: "Text", performance: 0.72 },
      ],
      languageBreakdown: region.languages.reduce((acc, lang, idx) => {
        acc[lang] = (100 - idx * 20);
        return acc;
      }, {} as Record<string, number>),
      growthRate: Math.random() * 10 - 2,
    };

    audienceInsights.set(`${userId}-${regionId}`, insight);
    return insight;
  }).filter((i): i is GeoAudienceInsight => i !== null);
}

// Best posting times for regions
export function getBestPostingTimes(regionIds: string[]): {
  regionId: string;
  regionName: string;
  localTime: string;
  utcTime: string;
  score: number;
}[] {
  const results: {
    regionId: string;
    regionName: string;
    localTime: string;
    utcTime: string;
    score: number;
  }[] = [];

  for (const regionId of regionIds) {
    const region = geoRegions.get(regionId);
    if (!region) continue;

    // Mock best posting times
    const bestHours = [9, 12, 18, 20];
    for (const hour of bestHours) {
      results.push({
        regionId,
        regionName: region.name,
        localTime: `${hour.toString().padStart(2, "0")}:00`,
        utcTime: `${((hour + 5) % 24).toString().padStart(2, "0")}:00`, // Simplified UTC conversion
        score: Math.random() * 0.3 + 0.7,
      });
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 10);
}

// Analytics by region
export function getGeoAnalytics(userId: string): {
  topRegions: { regionId: string; name: string; impressions: number; engagement: number }[];
  reachByContinent: Record<string, number>;
  languagePerformance: { language: string; posts: number; avgEngagement: number }[];
} {
  const posts = getUserGeoPosts(userId);

  const regionStats: Record<string, { impressions: number; engagement: number }> = {};
  const continentReach: Record<string, number> = {
    "North America": 0,
    "Europe": 0,
    "Asia Pacific": 0,
    "Latin America": 0,
    "Middle East & Africa": 0,
  };

  // Aggregate stats from posts
  for (const post of posts) {
    if (post.analytics) {
      for (const [regionId, stats] of Object.entries(post.analytics.byRegion)) {
        if (!regionStats[regionId]) {
          regionStats[regionId] = { impressions: 0, engagement: 0 };
        }
        regionStats[regionId].impressions += stats.impressions;
        regionStats[regionId].engagement += stats.engagement;
      }
    }
  }

  // If no real data, generate mock data
  if (Object.keys(regionStats).length === 0) {
    const sampleRegions = ["us", "gb", "de", "jp", "au"];
    for (const regionId of sampleRegions) {
      regionStats[regionId] = {
        impressions: Math.floor(Math.random() * 50000) + 5000,
        engagement: Math.floor(Math.random() * 2000) + 200,
      };
    }
    continentReach["North America"] = 45000;
    continentReach["Europe"] = 35000;
    continentReach["Asia Pacific"] = 28000;
    continentReach["Latin America"] = 12000;
    continentReach["Middle East & Africa"] = 8000;
  }

  const topRegions = Object.entries(regionStats)
    .map(([regionId, stats]) => ({
      regionId,
      name: geoRegions.get(regionId)?.name || regionId,
      impressions: stats.impressions,
      engagement: stats.engagement,
    }))
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 10);

  return {
    topRegions,
    reachByContinent: continentReach,
    languagePerformance: [
      { language: "English", posts: 45, avgEngagement: 3.2 },
      { language: "Spanish", posts: 12, avgEngagement: 2.8 },
      { language: "French", posts: 8, avgEngagement: 2.5 },
      { language: "German", posts: 5, avgEngagement: 3.1 },
      { language: "Japanese", posts: 4, avgEngagement: 4.2 },
    ],
  };
}

// Pre-defined audience templates
export const AUDIENCE_TEMPLATES = [
  {
    id: "north-america",
    name: "North America",
    description: "Target audiences in US, Canada, and Mexico",
    regions: ["us", "ca", "mx"],
    languages: ["en", "es", "fr"],
  },
  {
    id: "europe-english",
    name: "Europe (English Speaking)",
    description: "English-speaking European countries",
    regions: ["gb", "ie", "nl"],
    languages: ["en"],
  },
  {
    id: "dach",
    name: "DACH Region",
    description: "German-speaking countries",
    regions: ["de", "at", "ch"],
    languages: ["de"],
  },
  {
    id: "apac-english",
    name: "APAC (English)",
    description: "English-speaking Asia Pacific",
    regions: ["au", "nz", "sg", "hk", "ph"],
    languages: ["en"],
  },
  {
    id: "latam",
    name: "Latin America",
    description: "Spanish and Portuguese speaking Americas",
    regions: ["mx", "br", "ar", "co", "cl", "pe"],
    languages: ["es", "pt"],
  },
  {
    id: "mena",
    name: "Middle East & North Africa",
    description: "MENA region",
    regions: ["ae", "sa", "eg"],
    languages: ["ar", "en"],
  },
  {
    id: "global-english",
    name: "Global English",
    description: "All major English-speaking markets",
    regions: ["us", "gb", "ca", "au", "nz", "ie", "sg", "in", "ph"],
    languages: ["en"],
  },
];

export const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "nl", name: "Dutch" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "zh", name: "Chinese" },
  { code: "ar", name: "Arabic" },
  { code: "hi", name: "Hindi" },
  { code: "ru", name: "Russian" },
  { code: "pl", name: "Polish" },
  { code: "sv", name: "Swedish" },
  { code: "no", name: "Norwegian" },
  { code: "da", name: "Danish" },
  { code: "fi", name: "Finnish" },
  { code: "th", name: "Thai" },
  { code: "vi", name: "Vietnamese" },
  { code: "id", name: "Indonesian" },
  { code: "ms", name: "Malay" },
  { code: "tl", name: "Tagalog" },
  { code: "tr", name: "Turkish" },
  { code: "he", name: "Hebrew" },
];
