// AI Content Idea Generator

export interface ContentIdea {
  id: string;
  userId: string;
  title: string;
  description: string;
  type: ContentType;
  category: string;
  platform: string;
  tone: string;
  hook: string;
  outline: string[];
  hashtags: string[];
  estimatedEngagement: "low" | "medium" | "high";
  difficulty: "easy" | "medium" | "hard";
  timeToCreate: number; // minutes
  bestTimeToPost: string;
  targetAudience: string;
  callToAction: string;
  isSaved: boolean;
  isUsed: boolean;
  usedAt?: Date;
  rating?: number;
  createdAt: Date;
  source: "ai_generated" | "trending" | "template" | "user";
}

export type ContentType =
  | "post"
  | "story"
  | "reel"
  | "video"
  | "carousel"
  | "thread"
  | "poll"
  | "live"
  | "article";

export interface IdeaCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  examples: string[];
}

export interface TrendingTopic {
  id: string;
  topic: string;
  platform: string;
  trendScore: number;
  volume: number;
  growth: number;
  region: string;
  relatedHashtags: string[];
  sampleContent: string[];
}

export interface ContentPillar {
  id: string;
  userId: string;
  name: string;
  description: string;
  percentage: number; // what percentage of content should be this pillar
  color: string;
  keywords: string[];
  examples: string[];
}

export interface IdeaSession {
  id: string;
  userId: string;
  name: string;
  niche: string;
  platforms: string[];
  contentTypes: ContentType[];
  tones: string[];
  pillars: string[];
  ideas: ContentIdea[];
  createdAt: Date;
}

// Idea categories
export const IDEA_CATEGORIES: IdeaCategory[] = [
  {
    id: "educational",
    name: "Educational",
    description: "Teach your audience something valuable",
    icon: "📚",
    examples: ["How-to guides", "Tips & tricks", "Industry insights", "Tutorials"],
  },
  {
    id: "entertaining",
    name: "Entertaining",
    description: "Make your audience laugh or feel good",
    icon: "🎭",
    examples: ["Memes", "Behind the scenes", "Day in the life", "Challenges"],
  },
  {
    id: "inspiring",
    name: "Inspiring",
    description: "Motivate and inspire your audience",
    icon: "✨",
    examples: ["Success stories", "Quotes", "Transformation posts", "Milestones"],
  },
  {
    id: "promotional",
    name: "Promotional",
    description: "Showcase your products or services",
    icon: "📢",
    examples: ["Product launches", "Sales", "Features spotlight", "Testimonials"],
  },
  {
    id: "engaging",
    name: "Engaging",
    description: "Drive conversations and interactions",
    icon: "💬",
    examples: ["Questions", "Polls", "Debates", "AMAs"],
  },
  {
    id: "news",
    name: "News & Updates",
    description: "Share industry news and company updates",
    icon: "📰",
    examples: ["Industry news", "Company updates", "Trend analysis", "Predictions"],
  },
  {
    id: "ugc",
    name: "User Generated",
    description: "Feature content from your community",
    icon: "👥",
    examples: ["Reposts", "Testimonials", "Customer stories", "Community highlights"],
  },
  {
    id: "personal",
    name: "Personal",
    description: "Share personal stories and experiences",
    icon: "💭",
    examples: ["Personal stories", "Lessons learned", "Failures", "Reflections"],
  },
];

// Content tones
export const CONTENT_TONES = [
  { id: "professional", label: "Professional" },
  { id: "casual", label: "Casual" },
  { id: "humorous", label: "Humorous" },
  { id: "inspirational", label: "Inspirational" },
  { id: "educational", label: "Educational" },
  { id: "conversational", label: "Conversational" },
  { id: "authoritative", label: "Authoritative" },
  { id: "empathetic", label: "Empathetic" },
];

// Niche templates
const NICHE_IDEAS: Record<string, string[]> = {
  "tech/saas": [
    "5 hidden features of [product] that will blow your mind",
    "The real cost of NOT using automation in your workflow",
    "We analyzed 1000 users - here's what we learned",
    "How we reduced churn by 40% (the unconventional way)",
    "Your competitors are using this. Are you?",
  ],
  "marketing": [
    "The marketing trend that's replacing [old trend]",
    "We spent $10K on ads. Here's every lesson learned",
    "Stop doing this in your email marketing",
    "The psychology behind viral content",
    "Our biggest marketing fail (and how we recovered)",
  ],
  "fitness": [
    "The exercise you're doing wrong (and how to fix it)",
    "My 30-day transformation challenge results",
    "What I eat in a day for [goal]",
    "The supplement industry doesn't want you to know this",
    "5 minute workout that actually works",
  ],
  "finance": [
    "How I saved my first $10K (starting from zero)",
    "The investment mistake that cost me $[X]",
    "Money rules I wish I learned earlier",
    "Is [trending topic] a bubble?",
    "Building wealth in your 20s vs 30s vs 40s",
  ],
  "ecommerce": [
    "Why 90% of products fail (and how to beat the odds)",
    "Behind the scenes of our product development",
    "Customer unboxing reactions that made us cry",
    "The packaging change that increased sales 25%",
    "How we handle returns (the honest truth)",
  ],
  "personal_brand": [
    "My morning routine that changed everything",
    "The truth about being an entrepreneur",
    "What nobody tells you about [your field]",
    "3 books that shaped my thinking",
    "How I went from [starting point] to [achievement]",
  ],
};

// In-memory storage
const ideasStore = new Map<string, ContentIdea>();
const sessionsStore = new Map<string, IdeaSession>();
const pillarsStore = new Map<string, ContentPillar>();

// Generate ideas based on inputs
function generateIdeas(
  niche: string,
  platforms: string[],
  contentTypes: ContentType[],
  tones: string[],
  count: number = 10
): ContentIdea[] {
  const nicheTemplates = NICHE_IDEAS[niche] || NICHE_IDEAS["personal_brand"];
  const ideas: ContentIdea[] = [];

  const categories = IDEA_CATEGORIES.map((c) => c.id);
  const hooks = [
    "Did you know that...",
    "Here's a secret:",
    "Stop scrolling if you...",
    "This changed everything:",
    "Nobody talks about this but...",
    "Hot take:",
    "The truth is...",
    "I used to think... but now I know...",
    "Unpopular opinion:",
    "Let's talk about...",
  ];

  const ctas = [
    "Save this for later!",
    "Share with someone who needs this",
    "Drop a comment below",
    "Follow for more tips",
    "Link in bio",
    "What do you think?",
    "Try this and let me know!",
    "Tag a friend",
  ];

  for (let i = 0; i < count; i++) {
    const template = nicheTemplates[i % nicheTemplates.length];
    const category = categories[Math.floor(Math.random() * categories.length)];
    const platform = platforms[Math.floor(Math.random() * platforms.length)];
    const contentType = contentTypes[Math.floor(Math.random() * contentTypes.length)];
    const tone = tones[Math.floor(Math.random() * tones.length)];

    const idea: ContentIdea = {
      id: `idea-${Date.now()}-${i}`,
      userId: "",
      title: template,
      description: `A ${tone} ${category} ${contentType} about "${template}"`,
      type: contentType,
      category,
      platform,
      tone,
      hook: hooks[Math.floor(Math.random() * hooks.length)],
      outline: generateOutline(contentType, template),
      hashtags: generateHashtags(niche, category),
      estimatedEngagement: ["low", "medium", "high"][Math.floor(Math.random() * 3)] as any,
      difficulty: ["easy", "medium", "hard"][Math.floor(Math.random() * 3)] as any,
      timeToCreate: [15, 30, 45, 60, 90][Math.floor(Math.random() * 5)],
      bestTimeToPost: ["9:00 AM", "12:00 PM", "3:00 PM", "6:00 PM", "8:00 PM"][
        Math.floor(Math.random() * 5)
      ],
      targetAudience: "Your core audience interested in " + niche.replace("_", " "),
      callToAction: ctas[Math.floor(Math.random() * ctas.length)],
      isSaved: false,
      isUsed: false,
      createdAt: new Date(),
      source: "ai_generated",
    };

    ideas.push(idea);
  }

  return ideas;
}

function generateOutline(type: ContentType, title: string): string[] {
  switch (type) {
    case "carousel":
      return [
        "Slide 1: Hook - grab attention",
        "Slide 2-4: Main points",
        "Slide 5: Summary/takeaway",
        "Slide 6: Call to action",
      ];
    case "thread":
      return [
        "Tweet 1: Hook + promise",
        "Tweet 2-4: Main content",
        "Tweet 5: Summary",
        "Tweet 6: CTA + retweet first tweet",
      ];
    case "video":
    case "reel":
      return [
        "0-3s: Hook (stop the scroll)",
        "3-15s: Setup the problem",
        "15-45s: Deliver the value",
        "45-60s: Recap + CTA",
      ];
    case "story":
      return [
        "Story 1: Question/hook",
        "Story 2-3: Content",
        "Story 4: Poll/sticker engagement",
        "Story 5: CTA",
      ];
    default:
      return [
        "Opening hook",
        "Main point 1",
        "Main point 2",
        "Conclusion + CTA",
      ];
  }
}

function generateHashtags(niche: string, category: string): string[] {
  const baseHashtags = [
    "#contentcreator",
    "#socialmediatips",
    "#growthmindset",
    "#entrepreneurship",
  ];

  const nicheHashtags: Record<string, string[]> = {
    "tech/saas": ["#saas", "#startup", "#techstartup", "#productivity"],
    marketing: ["#marketing", "#digitalmarketing", "#marketingtips", "#branding"],
    fitness: ["#fitness", "#workout", "#health", "#fitnessmotivation"],
    finance: ["#money", "#investing", "#personalfinance", "#wealthbuilding"],
    ecommerce: ["#ecommerce", "#smallbusiness", "#entrepreneur", "#shopsmall"],
    personal_brand: ["#personalbrand", "#leadership", "#success", "#mindset"],
  };

  return [
    ...(nicheHashtags[niche] || nicheHashtags["personal_brand"]).slice(0, 3),
    ...baseHashtags.slice(0, 2),
  ];
}

// Initialize demo data
function initializeDemoData(userId: string): void {
  const demoKey = `session-demo-${userId}`;
  if (sessionsStore.has(demoKey)) return;

  const ideas = generateIdeas("marketing", ["instagram", "twitter", "linkedin"], ["post", "carousel", "reel"], ["professional", "casual"], 15);
  ideas.forEach((idea) => {
    idea.userId = userId;
    ideasStore.set(idea.id, idea);
  });

  // Create demo session
  const session: IdeaSession = {
    id: demoKey,
    userId,
    name: "Marketing Ideas",
    niche: "marketing",
    platforms: ["instagram", "twitter", "linkedin"],
    contentTypes: ["post", "carousel", "reel"],
    tones: ["professional", "casual"],
    pillars: ["educational", "promotional", "engaging"],
    ideas: ideas.slice(0, 10),
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
  };

  sessionsStore.set(session.id, session);

  // Create demo pillars
  const demoPillars: ContentPillar[] = [
    {
      id: `pillar-1-${userId}`,
      userId,
      name: "Educational",
      description: "Tips, tutorials, and how-tos",
      percentage: 40,
      color: "#4F46E5",
      keywords: ["tips", "how-to", "guide", "learn"],
      examples: ["How-to posts", "Industry insights", "Tutorials"],
    },
    {
      id: `pillar-2-${userId}`,
      userId,
      name: "Behind the Scenes",
      description: "Show your process and team",
      percentage: 25,
      color: "#10B981",
      keywords: ["bts", "team", "process", "day"],
      examples: ["Team updates", "Process reveals", "Day in the life"],
    },
    {
      id: `pillar-3-${userId}`,
      userId,
      name: "Promotional",
      description: "Products, services, and offers",
      percentage: 20,
      color: "#F59E0B",
      keywords: ["launch", "sale", "product", "feature"],
      examples: ["Product launches", "Feature spotlights", "Customer testimonials"],
    },
    {
      id: `pillar-4-${userId}`,
      userId,
      name: "Community",
      description: "Engagement and UGC",
      percentage: 15,
      color: "#EC4899",
      keywords: ["community", "ugc", "question", "poll"],
      examples: ["Q&As", "Polls", "User stories", "Community highlights"],
    },
  ];

  demoPillars.forEach((p) => pillarsStore.set(p.id, p));
}

// API Functions
export function getUserIdeas(userId: string, filters?: { saved?: boolean; used?: boolean }): ContentIdea[] {
  initializeDemoData(userId);
  let ideas = Array.from(ideasStore.values()).filter((idea) => idea.userId === userId);

  if (filters?.saved !== undefined) {
    ideas = ideas.filter((i) => i.isSaved === filters.saved);
  }
  if (filters?.used !== undefined) {
    ideas = ideas.filter((i) => i.isUsed === filters.used);
  }

  return ideas.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function getIdea(ideaId: string): ContentIdea | null {
  return ideasStore.get(ideaId) || null;
}

export function generateNewIdeas(
  userId: string,
  options: {
    niche: string;
    platforms: string[];
    contentTypes: ContentType[];
    tones: string[];
    count?: number;
    sessionName?: string;
  }
): IdeaSession {
  const ideas = generateIdeas(
    options.niche,
    options.platforms,
    options.contentTypes,
    options.tones,
    options.count || 10
  );

  ideas.forEach((idea) => {
    idea.userId = userId;
    ideasStore.set(idea.id, idea);
  });

  const session: IdeaSession = {
    id: `session-${Date.now()}`,
    userId,
    name: options.sessionName || `Ideas - ${new Date().toLocaleDateString()}`,
    niche: options.niche,
    platforms: options.platforms,
    contentTypes: options.contentTypes,
    tones: options.tones,
    pillars: [],
    ideas,
    createdAt: new Date(),
  };

  sessionsStore.set(session.id, session);
  return session;
}

export function saveIdea(ideaId: string, userId: string): ContentIdea | null {
  const idea = ideasStore.get(ideaId);
  if (!idea || idea.userId !== userId) return null;
  idea.isSaved = true;
  ideasStore.set(ideaId, idea);
  return idea;
}

export function markIdeaUsed(ideaId: string, userId: string): ContentIdea | null {
  const idea = ideasStore.get(ideaId);
  if (!idea || idea.userId !== userId) return null;
  idea.isUsed = true;
  idea.usedAt = new Date();
  ideasStore.set(ideaId, idea);
  return idea;
}

export function rateIdea(ideaId: string, userId: string, rating: number): ContentIdea | null {
  const idea = ideasStore.get(ideaId);
  if (!idea || idea.userId !== userId) return null;
  idea.rating = rating;
  ideasStore.set(ideaId, idea);
  return idea;
}

export function deleteIdea(ideaId: string, userId: string): boolean {
  const idea = ideasStore.get(ideaId);
  if (!idea || idea.userId !== userId) return false;
  return ideasStore.delete(ideaId);
}

export function getUserSessions(userId: string): IdeaSession[] {
  initializeDemoData(userId);
  return Array.from(sessionsStore.values())
    .filter((s) => s.userId === userId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function getSession(sessionId: string): IdeaSession | null {
  return sessionsStore.get(sessionId) || null;
}

export function getUserPillars(userId: string): ContentPillar[] {
  initializeDemoData(userId);
  return Array.from(pillarsStore.values())
    .filter((p) => p.userId === userId)
    .sort((a, b) => b.percentage - a.percentage);
}

export function createPillar(
  userId: string,
  data: Omit<ContentPillar, "id" | "userId">
): ContentPillar {
  const pillar: ContentPillar = {
    ...data,
    id: `pillar-${Date.now()}`,
    userId,
  };
  pillarsStore.set(pillar.id, pillar);
  return pillar;
}

export function updatePillar(
  pillarId: string,
  userId: string,
  updates: Partial<ContentPillar>
): ContentPillar | null {
  const pillar = pillarsStore.get(pillarId);
  if (!pillar || pillar.userId !== userId) return null;
  const updated = { ...pillar, ...updates };
  pillarsStore.set(pillarId, updated);
  return updated;
}

export function deletePillar(pillarId: string, userId: string): boolean {
  const pillar = pillarsStore.get(pillarId);
  if (!pillar || pillar.userId !== userId) return false;
  return pillarsStore.delete(pillarId);
}

export function getIdeaStats(userId: string): {
  totalIdeas: number;
  savedIdeas: number;
  usedIdeas: number;
  avgRating: number;
  byCategory: Record<string, number>;
  byPlatform: Record<string, number>;
  recentSessions: number;
} {
  initializeDemoData(userId);
  const ideas = getUserIdeas(userId);
  const sessions = getUserSessions(userId);

  const savedIdeas = ideas.filter((i) => i.isSaved).length;
  const usedIdeas = ideas.filter((i) => i.isUsed).length;
  const ratedIdeas = ideas.filter((i) => i.rating);
  const avgRating = ratedIdeas.length > 0
    ? ratedIdeas.reduce((sum, i) => sum + (i.rating || 0), 0) / ratedIdeas.length
    : 0;

  const byCategory: Record<string, number> = {};
  const byPlatform: Record<string, number> = {};

  ideas.forEach((idea) => {
    byCategory[idea.category] = (byCategory[idea.category] || 0) + 1;
    byPlatform[idea.platform] = (byPlatform[idea.platform] || 0) + 1;
  });

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentSessions = sessions.filter((s) => s.createdAt.getTime() > weekAgo).length;

  return {
    totalIdeas: ideas.length,
    savedIdeas,
    usedIdeas,
    avgRating: Math.round(avgRating * 10) / 10,
    byCategory,
    byPlatform,
    recentSessions,
  };
}

export const NICHES = [
  { id: "tech/saas", label: "Tech / SaaS" },
  { id: "marketing", label: "Marketing" },
  { id: "fitness", label: "Fitness & Health" },
  { id: "finance", label: "Finance" },
  { id: "ecommerce", label: "E-commerce" },
  { id: "personal_brand", label: "Personal Brand" },
  { id: "food", label: "Food & Beverage" },
  { id: "travel", label: "Travel" },
  { id: "fashion", label: "Fashion" },
  { id: "education", label: "Education" },
];

export const CONTENT_TYPES: { value: ContentType; label: string; icon: string }[] = [
  { value: "post", label: "Post", icon: "📝" },
  { value: "story", label: "Story", icon: "📱" },
  { value: "reel", label: "Reel", icon: "🎬" },
  { value: "video", label: "Video", icon: "🎥" },
  { value: "carousel", label: "Carousel", icon: "🖼️" },
  { value: "thread", label: "Thread", icon: "🧵" },
  { value: "poll", label: "Poll", icon: "📊" },
  { value: "live", label: "Live", icon: "🔴" },
  { value: "article", label: "Article", icon: "📰" },
];

export { IDEA_CATEGORIES, CONTENT_TONES };
