// Story/Reel Scheduler Library
// Supports scheduling stories and reels for Instagram, TikTok, YouTube Shorts, and Facebook

export type StoryPlatform = "instagram" | "facebook" | "tiktok" | "youtube";
export type StoryType = "story" | "reel" | "short";
export type StoryStatus = "draft" | "scheduled" | "published" | "failed" | "expired";
export type MediaType = "image" | "video";

export interface StoryMedia {
  id: string;
  type: MediaType;
  url: string;
  thumbnailUrl?: string;
  duration?: number; // in seconds for video
  width: number;
  height: number;
  size: number; // in bytes
}

export interface StoryOverlay {
  id: string;
  type: "text" | "sticker" | "mention" | "hashtag" | "location" | "poll" | "question" | "countdown" | "link";
  content: string;
  position: { x: number; y: number };
  style?: {
    fontSize?: number;
    fontWeight?: string;
    color?: string;
    backgroundColor?: string;
    rotation?: number;
  };
}

export interface Story {
  id: string;
  userId: string;
  type: StoryType;
  platform: StoryPlatform;
  status: StoryStatus;
  media: StoryMedia;
  overlays: StoryOverlay[];
  caption?: string;
  hashtags: string[];
  mentions: string[];
  location?: string;
  music?: {
    id: string;
    name: string;
    artist: string;
    startTime: number;
  };
  scheduledAt?: Date;
  publishedAt?: Date;
  expiresAt?: Date;
  seriesId?: string;
  seriesOrder?: number;
  analytics?: StoryAnalytics;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoryAnalytics {
  views: number;
  uniqueViews: number;
  reaches: number;
  impressions: number;
  replies: number;
  shares: number;
  profileVisits: number;
  linkClicks: number;
  stickerTaps: number;
  exitRate: number;
  avgWatchTime: number;
  completionRate: number;
}

export interface StorySeries {
  id: string;
  userId: string;
  name: string;
  description?: string;
  platform: StoryPlatform;
  type: StoryType;
  stories: string[]; // Story IDs in order
  interval: number; // minutes between stories
  scheduledStartAt?: Date;
  status: "draft" | "scheduled" | "in_progress" | "completed";
  createdAt: Date;
}

export interface StoryTemplate {
  id: string;
  userId: string;
  name: string;
  type: StoryType;
  platform: StoryPlatform;
  overlays: StoryOverlay[];
  defaultCaption?: string;
  defaultHashtags: string[];
  backgroundColor?: string;
  aspectRatio: "9:16" | "16:9" | "1:1" | "4:5";
  category: string;
  isPublic: boolean;
  usageCount: number;
  createdAt: Date;
}

export interface StoryDraft {
  id: string;
  userId: string;
  platform: StoryPlatform;
  type: StoryType;
  media?: StoryMedia;
  overlays: StoryOverlay[];
  caption?: string;
  hashtags: string[];
  mentions: string[];
  lastSavedAt: Date;
}

export interface StoryStats {
  totalStories: number;
  scheduledStories: number;
  publishedStories: number;
  drafts: number;
  series: number;
  templates: number;
  avgViews: number;
  avgEngagement: number;
  bestPerformingTime: string;
  topPlatform: StoryPlatform;
}

// In-memory storage
const stories = new Map<string, Story>();
const series = new Map<string, StorySeries>();
const templates = new Map<string, StoryTemplate>();
const drafts = new Map<string, StoryDraft>();

// Platform-specific requirements
export const PLATFORM_REQUIREMENTS: Record<
  StoryPlatform,
  {
    storyDuration: number;
    reelDuration: { min: number; max: number };
    aspectRatio: string;
    maxFileSize: number;
    supportedFormats: string[];
    features: string[];
  }
> = {
  instagram: {
    storyDuration: 15,
    reelDuration: { min: 15, max: 90 },
    aspectRatio: "9:16",
    maxFileSize: 250 * 1024 * 1024, // 250MB
    supportedFormats: ["mp4", "mov", "jpg", "png"],
    features: ["music", "stickers", "polls", "questions", "countdown", "links", "mentions", "hashtags", "location"],
  },
  facebook: {
    storyDuration: 20,
    reelDuration: { min: 3, max: 60 },
    aspectRatio: "9:16",
    maxFileSize: 1024 * 1024 * 1024, // 1GB
    supportedFormats: ["mp4", "mov", "jpg", "png"],
    features: ["music", "stickers", "text", "effects", "mentions"],
  },
  tiktok: {
    storyDuration: 60,
    reelDuration: { min: 15, max: 180 },
    aspectRatio: "9:16",
    maxFileSize: 287.6 * 1024 * 1024, // 287.6MB
    supportedFormats: ["mp4", "mov"],
    features: ["music", "effects", "duet", "stitch", "hashtags", "mentions"],
  },
  youtube: {
    storyDuration: 60,
    reelDuration: { min: 15, max: 60 },
    aspectRatio: "9:16",
    maxFileSize: 256 * 1024 * 1024, // 256MB
    supportedFormats: ["mp4", "mov", "webm"],
    features: ["music", "text", "effects", "captions"],
  },
};

export const STORY_CATEGORIES = [
  "Behind the Scenes",
  "Product Launch",
  "Promotion/Sale",
  "Tutorial",
  "Q&A",
  "Announcement",
  "User Generated",
  "Testimonial",
  "Event",
  "Poll/Quiz",
  "Day in the Life",
  "Trending",
];

export const OVERLAY_STICKERS = [
  { id: "poll", name: "Poll", icon: "📊" },
  { id: "question", name: "Question", icon: "❓" },
  { id: "countdown", name: "Countdown", icon: "⏰" },
  { id: "quiz", name: "Quiz", icon: "🎯" },
  { id: "slider", name: "Emoji Slider", icon: "😍" },
  { id: "mention", name: "Mention", icon: "@" },
  { id: "hashtag", name: "Hashtag", icon: "#" },
  { id: "location", name: "Location", icon: "📍" },
  { id: "link", name: "Link", icon: "🔗" },
  { id: "gif", name: "GIF", icon: "🎬" },
  { id: "music", name: "Music", icon: "🎵" },
  { id: "time", name: "Time", icon: "🕐" },
  { id: "weather", name: "Weather", icon: "☀️" },
  { id: "donation", name: "Donation", icon: "💝" },
];

// Helper functions
function generateId(): string {
  return `story_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Initialize with demo data
function initializeDemoData(userId: string): void {
  const hasData = Array.from(stories.values()).some((s) => s.userId === userId);
  if (hasData) return;

  const now = new Date();

  // Demo stories
  const demoStories: Partial<Story>[] = [
    {
      type: "story",
      platform: "instagram",
      status: "scheduled",
      media: {
        id: "media_1",
        type: "image",
        url: "/demo/story-1.jpg",
        width: 1080,
        height: 1920,
        size: 1024000,
      },
      overlays: [
        {
          id: "overlay_1",
          type: "text",
          content: "New Product Alert! 🚀",
          position: { x: 50, y: 20 },
          style: { fontSize: 32, fontWeight: "bold", color: "#ffffff" },
        },
      ],
      caption: "Check out our latest product launch!",
      hashtags: ["newproduct", "launch", "exciting"],
      mentions: ["brand"],
      scheduledAt: new Date(now.getTime() + 2 * 60 * 60 * 1000),
    },
    {
      type: "reel",
      platform: "instagram",
      status: "published",
      media: {
        id: "media_2",
        type: "video",
        url: "/demo/reel-1.mp4",
        thumbnailUrl: "/demo/reel-1-thumb.jpg",
        duration: 30,
        width: 1080,
        height: 1920,
        size: 15000000,
      },
      overlays: [],
      caption: "Tutorial: How to use our product in 30 seconds",
      hashtags: ["tutorial", "howto", "tips"],
      mentions: [],
      publishedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      analytics: {
        views: 12500,
        uniqueViews: 8500,
        reaches: 25000,
        impressions: 35000,
        replies: 45,
        shares: 230,
        profileVisits: 180,
        linkClicks: 95,
        stickerTaps: 0,
        exitRate: 35,
        avgWatchTime: 22,
        completionRate: 75,
      },
    },
    {
      type: "reel",
      platform: "tiktok",
      status: "scheduled",
      media: {
        id: "media_3",
        type: "video",
        url: "/demo/tiktok-1.mp4",
        thumbnailUrl: "/demo/tiktok-1-thumb.jpg",
        duration: 45,
        width: 1080,
        height: 1920,
        size: 22000000,
      },
      overlays: [],
      caption: "POV: When your product arrives 📦",
      hashtags: ["fyp", "viral", "unboxing"],
      mentions: [],
      music: { id: "music_1", name: "Trending Sound", artist: "Popular Artist", startTime: 0 },
      scheduledAt: new Date(now.getTime() + 5 * 60 * 60 * 1000),
    },
    {
      type: "short",
      platform: "youtube",
      status: "draft",
      media: {
        id: "media_4",
        type: "video",
        url: "/demo/short-1.mp4",
        thumbnailUrl: "/demo/short-1-thumb.jpg",
        duration: 55,
        width: 1080,
        height: 1920,
        size: 30000000,
      },
      overlays: [
        {
          id: "overlay_2",
          type: "text",
          content: "5 Tips You Need to Know",
          position: { x: 50, y: 10 },
          style: { fontSize: 28, fontWeight: "bold", color: "#ffffff", backgroundColor: "#000000" },
        },
      ],
      caption: "Quick tips that will change everything #shorts",
      hashtags: ["shorts", "tips", "viral"],
      mentions: [],
    },
    {
      type: "story",
      platform: "facebook",
      status: "published",
      media: {
        id: "media_5",
        type: "image",
        url: "/demo/fb-story-1.jpg",
        width: 1080,
        height: 1920,
        size: 850000,
      },
      overlays: [
        {
          id: "overlay_3",
          type: "poll",
          content: "Which color do you prefer?",
          position: { x: 50, y: 60 },
        },
      ],
      caption: "Help us decide!",
      hashtags: [],
      mentions: [],
      publishedAt: new Date(now.getTime() - 12 * 60 * 60 * 1000),
      expiresAt: new Date(now.getTime() + 12 * 60 * 60 * 1000),
      analytics: {
        views: 3200,
        uniqueViews: 2100,
        reaches: 5500,
        impressions: 7200,
        replies: 12,
        shares: 8,
        profileVisits: 45,
        linkClicks: 0,
        stickerTaps: 890,
        exitRate: 25,
        avgWatchTime: 4.5,
        completionRate: 85,
      },
    },
  ];

  demoStories.forEach((storyData, index) => {
    const storyId = generateId();
    const story: Story = {
      id: storyId,
      userId,
      type: storyData.type!,
      platform: storyData.platform!,
      status: storyData.status!,
      media: storyData.media!,
      overlays: storyData.overlays || [],
      caption: storyData.caption,
      hashtags: storyData.hashtags || [],
      mentions: storyData.mentions || [],
      location: storyData.location,
      music: storyData.music,
      scheduledAt: storyData.scheduledAt,
      publishedAt: storyData.publishedAt,
      expiresAt: storyData.expiresAt,
      analytics: storyData.analytics,
      createdAt: new Date(now.getTime() - index * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    };
    stories.set(storyId, story);
  });

  // Demo series
  const seriesId = generateId();
  const storyIds = Array.from(stories.values())
    .filter((s) => s.userId === userId && s.platform === "instagram")
    .slice(0, 3)
    .map((s) => s.id);

  const demoSeries: StorySeries = {
    id: seriesId,
    userId,
    name: "Product Launch Week",
    description: "Series of stories for our new product launch",
    platform: "instagram",
    type: "story",
    stories: storyIds,
    interval: 120, // 2 hours
    scheduledStartAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    status: "scheduled",
    createdAt: new Date(),
  };
  series.set(seriesId, demoSeries);

  // Demo templates
  const demoTemplates: Partial<StoryTemplate>[] = [
    {
      name: "Product Announcement",
      type: "story",
      platform: "instagram",
      overlays: [
        {
          id: "t1_overlay_1",
          type: "text",
          content: "NEW ARRIVAL",
          position: { x: 50, y: 15 },
          style: { fontSize: 36, fontWeight: "bold", color: "#ffffff" },
        },
        {
          id: "t1_overlay_2",
          type: "text",
          content: "Shop Now →",
          position: { x: 50, y: 85 },
          style: { fontSize: 24, color: "#ffffff", backgroundColor: "#000000" },
        },
      ],
      defaultHashtags: ["newproduct", "shopnow", "launch"],
      aspectRatio: "9:16",
      category: "Product Launch",
      isPublic: false,
      usageCount: 12,
    },
    {
      name: "Sale Alert",
      type: "story",
      platform: "instagram",
      overlays: [
        {
          id: "t2_overlay_1",
          type: "text",
          content: "FLASH SALE",
          position: { x: 50, y: 20 },
          style: { fontSize: 42, fontWeight: "bold", color: "#FF0000" },
        },
        {
          id: "t2_overlay_2",
          type: "countdown",
          content: "Ends in:",
          position: { x: 50, y: 50 },
        },
      ],
      defaultHashtags: ["sale", "flashsale", "discount"],
      aspectRatio: "9:16",
      category: "Promotion/Sale",
      isPublic: false,
      usageCount: 8,
    },
    {
      name: "Behind the Scenes",
      type: "reel",
      platform: "tiktok",
      overlays: [
        {
          id: "t3_overlay_1",
          type: "text",
          content: "BTS 🎬",
          position: { x: 10, y: 10 },
          style: { fontSize: 28, color: "#ffffff" },
        },
      ],
      defaultHashtags: ["bts", "behindthescenes", "fyp"],
      aspectRatio: "9:16",
      category: "Behind the Scenes",
      isPublic: false,
      usageCount: 15,
    },
  ];

  demoTemplates.forEach((templateData) => {
    const templateId = generateId();
    const template: StoryTemplate = {
      id: templateId,
      userId,
      name: templateData.name!,
      type: templateData.type!,
      platform: templateData.platform!,
      overlays: templateData.overlays || [],
      defaultCaption: templateData.defaultCaption,
      defaultHashtags: templateData.defaultHashtags || [],
      aspectRatio: templateData.aspectRatio || "9:16",
      category: templateData.category || "General",
      isPublic: templateData.isPublic || false,
      usageCount: templateData.usageCount || 0,
      createdAt: new Date(),
    };
    templates.set(templateId, template);
  });
}

// Story CRUD operations
export function getUserStories(
  userId: string,
  filters?: {
    platform?: StoryPlatform;
    type?: StoryType;
    status?: StoryStatus;
  }
): Story[] {
  initializeDemoData(userId);

  let userStories = Array.from(stories.values()).filter((s) => s.userId === userId);

  if (filters?.platform) {
    userStories = userStories.filter((s) => s.platform === filters.platform);
  }
  if (filters?.type) {
    userStories = userStories.filter((s) => s.type === filters.type);
  }
  if (filters?.status) {
    userStories = userStories.filter((s) => s.status === filters.status);
  }

  return userStories.sort((a, b) => {
    if (a.status === "scheduled" && b.status !== "scheduled") return -1;
    if (b.status === "scheduled" && a.status !== "scheduled") return 1;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}

export function getStory(storyId: string): Story | null {
  return stories.get(storyId) || null;
}

export function createStory(
  userId: string,
  data: {
    type: StoryType;
    platform: StoryPlatform;
    media: StoryMedia;
    overlays?: StoryOverlay[];
    caption?: string;
    hashtags?: string[];
    mentions?: string[];
    location?: string;
    music?: Story["music"];
    scheduledAt?: Date;
    seriesId?: string;
    seriesOrder?: number;
  }
): Story {
  const storyId = generateId();
  const now = new Date();

  const story: Story = {
    id: storyId,
    userId,
    type: data.type,
    platform: data.platform,
    status: data.scheduledAt ? "scheduled" : "draft",
    media: data.media,
    overlays: data.overlays || [],
    caption: data.caption,
    hashtags: data.hashtags || [],
    mentions: data.mentions || [],
    location: data.location,
    music: data.music,
    scheduledAt: data.scheduledAt,
    seriesId: data.seriesId,
    seriesOrder: data.seriesOrder,
    createdAt: now,
    updatedAt: now,
  };

  stories.set(storyId, story);
  return story;
}

export function updateStory(
  storyId: string,
  userId: string,
  updates: Partial<Omit<Story, "id" | "userId" | "createdAt">>
): Story | null {
  const story = stories.get(storyId);
  if (!story || story.userId !== userId) return null;

  const updatedStory: Story = {
    ...story,
    ...updates,
    updatedAt: new Date(),
  };

  stories.set(storyId, updatedStory);
  return updatedStory;
}

export function deleteStory(storyId: string, userId: string): boolean {
  const story = stories.get(storyId);
  if (!story || story.userId !== userId) return false;

  stories.delete(storyId);
  return true;
}

export function scheduleStory(storyId: string, userId: string, scheduledAt: Date): Story | null {
  const story = stories.get(storyId);
  if (!story || story.userId !== userId) return null;

  const updatedStory: Story = {
    ...story,
    status: "scheduled",
    scheduledAt,
    updatedAt: new Date(),
  };

  stories.set(storyId, updatedStory);
  return updatedStory;
}

export function publishStory(storyId: string, userId: string): Story | null {
  const story = stories.get(storyId);
  if (!story || story.userId !== userId) return null;

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Stories expire in 24h

  const updatedStory: Story = {
    ...story,
    status: "published",
    publishedAt: now,
    expiresAt: story.type === "story" ? expiresAt : undefined,
    updatedAt: now,
  };

  stories.set(storyId, updatedStory);
  return updatedStory;
}

// Series operations
export function getUserSeries(userId: string): StorySeries[] {
  initializeDemoData(userId);
  return Array.from(series.values())
    .filter((s) => s.userId === userId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function getSeries(seriesId: string): StorySeries | null {
  return series.get(seriesId) || null;
}

export function createSeries(
  userId: string,
  data: {
    name: string;
    description?: string;
    platform: StoryPlatform;
    type: StoryType;
    stories: string[];
    interval: number;
    scheduledStartAt?: Date;
  }
): StorySeries {
  const seriesId = generateId();

  const newSeries: StorySeries = {
    id: seriesId,
    userId,
    name: data.name,
    description: data.description,
    platform: data.platform,
    type: data.type,
    stories: data.stories,
    interval: data.interval,
    scheduledStartAt: data.scheduledStartAt,
    status: data.scheduledStartAt ? "scheduled" : "draft",
    createdAt: new Date(),
  };

  series.set(seriesId, newSeries);
  return newSeries;
}

export function updateSeries(
  seriesId: string,
  userId: string,
  updates: Partial<Omit<StorySeries, "id" | "userId" | "createdAt">>
): StorySeries | null {
  const s = series.get(seriesId);
  if (!s || s.userId !== userId) return null;

  const updatedSeries: StorySeries = {
    ...s,
    ...updates,
  };

  series.set(seriesId, updatedSeries);
  return updatedSeries;
}

export function deleteSeries(seriesId: string, userId: string): boolean {
  const s = series.get(seriesId);
  if (!s || s.userId !== userId) return false;

  series.delete(seriesId);
  return true;
}

// Template operations
export function getUserTemplates(userId: string, platform?: StoryPlatform): StoryTemplate[] {
  initializeDemoData(userId);
  let userTemplates = Array.from(templates.values()).filter((t) => t.userId === userId);

  if (platform) {
    userTemplates = userTemplates.filter((t) => t.platform === platform);
  }

  return userTemplates.sort((a, b) => b.usageCount - a.usageCount);
}

export function getTemplate(templateId: string): StoryTemplate | null {
  return templates.get(templateId) || null;
}

export function createTemplate(
  userId: string,
  data: {
    name: string;
    type: StoryType;
    platform: StoryPlatform;
    overlays: StoryOverlay[];
    defaultCaption?: string;
    defaultHashtags?: string[];
    aspectRatio?: StoryTemplate["aspectRatio"];
    category?: string;
    isPublic?: boolean;
  }
): StoryTemplate {
  const templateId = generateId();

  const template: StoryTemplate = {
    id: templateId,
    userId,
    name: data.name,
    type: data.type,
    platform: data.platform,
    overlays: data.overlays,
    defaultCaption: data.defaultCaption,
    defaultHashtags: data.defaultHashtags || [],
    aspectRatio: data.aspectRatio || "9:16",
    category: data.category || "General",
    isPublic: data.isPublic || false,
    usageCount: 0,
    createdAt: new Date(),
  };

  templates.set(templateId, template);
  return template;
}

export function useTemplate(templateId: string): StoryTemplate | null {
  const template = templates.get(templateId);
  if (!template) return null;

  template.usageCount++;
  templates.set(templateId, template);
  return template;
}

export function deleteTemplate(templateId: string, userId: string): boolean {
  const template = templates.get(templateId);
  if (!template || template.userId !== userId) return false;

  templates.delete(templateId);
  return true;
}

// Draft operations
export function saveDraft(
  userId: string,
  data: {
    platform: StoryPlatform;
    type: StoryType;
    media?: StoryMedia;
    overlays: StoryOverlay[];
    caption?: string;
    hashtags?: string[];
    mentions?: string[];
  }
): StoryDraft {
  const draftId = generateId();

  const draft: StoryDraft = {
    id: draftId,
    userId,
    platform: data.platform,
    type: data.type,
    media: data.media,
    overlays: data.overlays,
    caption: data.caption,
    hashtags: data.hashtags || [],
    mentions: data.mentions || [],
    lastSavedAt: new Date(),
  };

  drafts.set(draftId, draft);
  return draft;
}

export function getUserDrafts(userId: string): StoryDraft[] {
  return Array.from(drafts.values())
    .filter((d) => d.userId === userId)
    .sort((a, b) => b.lastSavedAt.getTime() - a.lastSavedAt.getTime());
}

export function deleteDraft(draftId: string, userId: string): boolean {
  const draft = drafts.get(draftId);
  if (!draft || draft.userId !== userId) return false;

  drafts.delete(draftId);
  return true;
}

// Analytics and stats
export function getStoryStats(userId: string): StoryStats {
  initializeDemoData(userId);
  const userStories = Array.from(stories.values()).filter((s) => s.userId === userId);
  const userSeries = Array.from(series.values()).filter((s) => s.userId === userId);
  const userTemplates = Array.from(templates.values()).filter((t) => t.userId === userId);
  const userDrafts = Array.from(drafts.values()).filter((d) => d.userId === userId);

  const publishedStories = userStories.filter((s) => s.status === "published" && s.analytics);
  const totalViews = publishedStories.reduce((sum, s) => sum + (s.analytics?.views || 0), 0);
  const totalEngagement = publishedStories.reduce(
    (sum, s) => sum + (s.analytics?.replies || 0) + (s.analytics?.shares || 0),
    0
  );

  // Determine best performing time
  const publishedByHour: Record<number, { count: number; totalViews: number }> = {};
  publishedStories.forEach((s) => {
    if (s.publishedAt) {
      const hour = s.publishedAt.getHours();
      if (!publishedByHour[hour]) {
        publishedByHour[hour] = { count: 0, totalViews: 0 };
      }
      publishedByHour[hour].count++;
      publishedByHour[hour].totalViews += s.analytics?.views || 0;
    }
  });

  let bestHour = 12;
  let bestAvgViews = 0;
  Object.entries(publishedByHour).forEach(([hour, data]) => {
    const avgViews = data.totalViews / data.count;
    if (avgViews > bestAvgViews) {
      bestAvgViews = avgViews;
      bestHour = parseInt(hour);
    }
  });

  // Determine top platform
  const platformCounts: Record<StoryPlatform, number> = {
    instagram: 0,
    facebook: 0,
    tiktok: 0,
    youtube: 0,
  };
  publishedStories.forEach((s) => {
    platformCounts[s.platform] += s.analytics?.views || 0;
  });

  const topPlatform = (Object.entries(platformCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
    "instagram") as StoryPlatform;

  return {
    totalStories: userStories.length,
    scheduledStories: userStories.filter((s) => s.status === "scheduled").length,
    publishedStories: publishedStories.length,
    drafts: userDrafts.length + userStories.filter((s) => s.status === "draft").length,
    series: userSeries.length,
    templates: userTemplates.length,
    avgViews: publishedStories.length > 0 ? Math.round(totalViews / publishedStories.length) : 0,
    avgEngagement:
      publishedStories.length > 0 ? Math.round(totalEngagement / publishedStories.length) : 0,
    bestPerformingTime: `${bestHour}:00`,
    topPlatform,
  };
}

export function getUpcomingStories(userId: string, limit: number = 10): Story[] {
  initializeDemoData(userId);
  const now = new Date();

  return Array.from(stories.values())
    .filter((s) => s.userId === userId && s.status === "scheduled" && s.scheduledAt && s.scheduledAt > now)
    .sort((a, b) => (a.scheduledAt?.getTime() || 0) - (b.scheduledAt?.getTime() || 0))
    .slice(0, limit);
}

export function getRecentlyPublished(userId: string, limit: number = 10): Story[] {
  initializeDemoData(userId);

  return Array.from(stories.values())
    .filter((s) => s.userId === userId && s.status === "published")
    .sort((a, b) => (b.publishedAt?.getTime() || 0) - (a.publishedAt?.getTime() || 0))
    .slice(0, limit);
}

// Optimal time suggestions
export function getOptimalPostingTimes(
  userId: string,
  platform: StoryPlatform
): { day: string; times: string[] }[] {
  // Platform-specific optimal times based on general research
  const optimalTimes: Record<StoryPlatform, { day: string; times: string[] }[]> = {
    instagram: [
      { day: "Monday", times: ["11:00 AM", "2:00 PM", "7:00 PM"] },
      { day: "Tuesday", times: ["10:00 AM", "2:00 PM", "9:00 PM"] },
      { day: "Wednesday", times: ["11:00 AM", "3:00 PM", "7:00 PM"] },
      { day: "Thursday", times: ["12:00 PM", "4:00 PM", "8:00 PM"] },
      { day: "Friday", times: ["10:00 AM", "2:00 PM", "5:00 PM"] },
      { day: "Saturday", times: ["9:00 AM", "11:00 AM", "7:00 PM"] },
      { day: "Sunday", times: ["10:00 AM", "2:00 PM", "9:00 PM"] },
    ],
    tiktok: [
      { day: "Monday", times: ["6:00 AM", "10:00 AM", "10:00 PM"] },
      { day: "Tuesday", times: ["2:00 AM", "4:00 AM", "9:00 AM"] },
      { day: "Wednesday", times: ["7:00 AM", "8:00 AM", "11:00 PM"] },
      { day: "Thursday", times: ["9:00 AM", "12:00 PM", "7:00 PM"] },
      { day: "Friday", times: ["5:00 AM", "1:00 PM", "3:00 PM"] },
      { day: "Saturday", times: ["11:00 AM", "7:00 PM", "8:00 PM"] },
      { day: "Sunday", times: ["7:00 AM", "8:00 AM", "4:00 PM"] },
    ],
    facebook: [
      { day: "Monday", times: ["9:00 AM", "12:00 PM", "3:00 PM"] },
      { day: "Tuesday", times: ["9:00 AM", "1:00 PM", "4:00 PM"] },
      { day: "Wednesday", times: ["9:00 AM", "12:00 PM", "3:00 PM"] },
      { day: "Thursday", times: ["8:00 AM", "12:00 PM", "2:00 PM"] },
      { day: "Friday", times: ["9:00 AM", "11:00 AM", "2:00 PM"] },
      { day: "Saturday", times: ["10:00 AM", "12:00 PM"] },
      { day: "Sunday", times: ["10:00 AM", "2:00 PM"] },
    ],
    youtube: [
      { day: "Monday", times: ["2:00 PM", "4:00 PM", "9:00 PM"] },
      { day: "Tuesday", times: ["2:00 PM", "4:00 PM", "9:00 PM"] },
      { day: "Wednesday", times: ["2:00 PM", "4:00 PM", "9:00 PM"] },
      { day: "Thursday", times: ["12:00 PM", "3:00 PM", "9:00 PM"] },
      { day: "Friday", times: ["12:00 PM", "3:00 PM", "9:00 PM"] },
      { day: "Saturday", times: ["9:00 AM", "12:00 PM", "6:00 PM"] },
      { day: "Sunday", times: ["9:00 AM", "12:00 PM", "6:00 PM"] },
    ],
  };

  return optimalTimes[platform];
}
