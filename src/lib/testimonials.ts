export interface Testimonial {
  id: string;
  userId: string;
  source: "twitter" | "instagram" | "facebook" | "linkedin" | "email" | "manual" | "review_site";
  type: "text" | "video" | "screenshot" | "review";
  content: {
    text: string;
    rating?: number; // 1-5
    media?: {
      type: "image" | "video";
      url: string;
      thumbnail?: string;
    }[];
    originalUrl?: string;
  };
  author: {
    name: string;
    username?: string;
    avatar?: string;
    company?: string;
    title?: string;
    location?: string;
    followers?: number;
    verified?: boolean;
  };
  metadata: {
    productOrService?: string;
    campaign?: string;
    tags: string[];
    sentiment: "positive" | "neutral" | "negative";
    language: string;
    date: Date;
  };
  status: "pending" | "approved" | "rejected" | "featured";
  displaySettings: {
    showAvatar: boolean;
    showCompany: boolean;
    showDate: boolean;
    showRating: boolean;
    showSource: boolean;
  };
  analytics: {
    views: number;
    clicks: number;
    conversions: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface TestimonialWidget {
  id: string;
  userId: string;
  name: string;
  type: "carousel" | "grid" | "list" | "wall" | "single" | "slider";
  theme: {
    backgroundColor: string;
    textColor: string;
    accentColor: string;
    borderRadius: number;
    fontFamily: string;
    darkMode: boolean;
  };
  layout: {
    columns: number;
    gap: number;
    maxItems: number;
    autoRotate: boolean;
    rotationSpeed: number;
  };
  filters: {
    minRating: number;
    sources: string[];
    tags: string[];
    featured: boolean;
  };
  embedCode: string;
  analytics: {
    impressions: number;
    engagements: number;
    clicks: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface TestimonialRequest {
  id: string;
  userId: string;
  recipientEmail: string;
  recipientName: string;
  template: string;
  status: "pending" | "sent" | "opened" | "completed" | "expired";
  customMessage?: string;
  productOrService?: string;
  incentive?: string;
  expiresAt: Date;
  sentAt?: Date;
  completedAt?: Date;
  testimonialId?: string;
  createdAt: Date;
}

export interface SocialProofStats {
  totalTestimonials: number;
  approvedTestimonials: number;
  featuredTestimonials: number;
  avgRating: number;
  bySource: Record<string, number>;
  byRating: Record<number, number>;
  recentTestimonials: Testimonial[];
  topPerformers: Testimonial[];
  sentimentBreakdown: { positive: number; neutral: number; negative: number };
  widgetImpressions: number;
}

// In-memory storage
const testimonials = new Map<string, Testimonial>();
const userTestimonials = new Map<string, Set<string>>();
const widgets = new Map<string, TestimonialWidget>();
const userWidgets = new Map<string, Set<string>>();
const requests = new Map<string, TestimonialRequest>();
const userRequests = new Map<string, Set<string>>();

// Testimonial CRUD
export function createTestimonial(
  userId: string,
  data: Omit<Testimonial, "id" | "userId" | "analytics" | "createdAt" | "updatedAt">
): Testimonial {
  const testimonial: Testimonial = {
    id: crypto.randomUUID(),
    userId,
    ...data,
    analytics: {
      views: 0,
      clicks: 0,
      conversions: 0,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  testimonials.set(testimonial.id, testimonial);

  if (!userTestimonials.has(userId)) {
    userTestimonials.set(userId, new Set());
  }
  userTestimonials.get(userId)!.add(testimonial.id);

  return testimonial;
}

export function getUserTestimonials(
  userId: string,
  filters?: {
    status?: string;
    source?: string;
    minRating?: number;
    tags?: string[];
    featured?: boolean;
  }
): Testimonial[] {
  const testimonialIds = userTestimonials.get(userId);
  if (!testimonialIds) return [];

  let results = Array.from(testimonialIds)
    .map((id) => testimonials.get(id))
    .filter((t): t is Testimonial => t !== undefined);

  if (filters?.status) {
    results = results.filter((t) => t.status === filters.status);
  }

  if (filters?.source) {
    results = results.filter((t) => t.source === filters.source);
  }

  if (filters?.minRating) {
    results = results.filter((t) => (t.content.rating || 0) >= filters.minRating);
  }

  if (filters?.tags && filters.tags.length > 0) {
    results = results.filter((t) =>
      filters.tags!.some((tag) => t.metadata.tags.includes(tag))
    );
  }

  if (filters?.featured) {
    results = results.filter((t) => t.status === "featured");
  }

  return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function getTestimonial(id: string, userId: string): Testimonial | null {
  const testimonial = testimonials.get(id);
  if (!testimonial || testimonial.userId !== userId) return null;
  return testimonial;
}

export function updateTestimonial(
  id: string,
  userId: string,
  updates: Partial<Omit<Testimonial, "id" | "userId" | "createdAt" | "updatedAt">>
): Testimonial | null {
  const testimonial = testimonials.get(id);
  if (!testimonial || testimonial.userId !== userId) return null;

  const updated: Testimonial = {
    ...testimonial,
    ...updates,
    updatedAt: new Date(),
  };

  testimonials.set(id, updated);
  return updated;
}

export function deleteTestimonial(id: string, userId: string): boolean {
  const testimonial = testimonials.get(id);
  if (!testimonial || testimonial.userId !== userId) return false;

  testimonials.delete(id);
  userTestimonials.get(userId)?.delete(id);
  return true;
}

export function featureTestimonial(id: string, userId: string): Testimonial | null {
  return updateTestimonial(id, userId, { status: "featured" });
}

export function approveTestimonial(id: string, userId: string): Testimonial | null {
  return updateTestimonial(id, userId, { status: "approved" });
}

export function rejectTestimonial(id: string, userId: string): Testimonial | null {
  return updateTestimonial(id, userId, { status: "rejected" });
}

// Widget CRUD
export function createWidget(
  userId: string,
  data: Omit<TestimonialWidget, "id" | "userId" | "embedCode" | "analytics" | "createdAt" | "updatedAt">
): TestimonialWidget {
  const widgetId = crypto.randomUUID();

  const widget: TestimonialWidget = {
    id: widgetId,
    userId,
    ...data,
    embedCode: generateEmbedCode(widgetId),
    analytics: {
      impressions: 0,
      engagements: 0,
      clicks: 0,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  widgets.set(widget.id, widget);

  if (!userWidgets.has(userId)) {
    userWidgets.set(userId, new Set());
  }
  userWidgets.get(userId)!.add(widget.id);

  return widget;
}

export function getUserWidgets(userId: string): TestimonialWidget[] {
  const widgetIds = userWidgets.get(userId);
  if (!widgetIds) return [];

  return Array.from(widgetIds)
    .map((id) => widgets.get(id))
    .filter((w): w is TestimonialWidget => w !== undefined)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function getWidget(id: string, userId: string): TestimonialWidget | null {
  const widget = widgets.get(id);
  if (!widget || widget.userId !== userId) return null;
  return widget;
}

export function updateWidget(
  id: string,
  userId: string,
  updates: Partial<Omit<TestimonialWidget, "id" | "userId" | "embedCode" | "createdAt" | "updatedAt">>
): TestimonialWidget | null {
  const widget = widgets.get(id);
  if (!widget || widget.userId !== userId) return null;

  const updated: TestimonialWidget = {
    ...widget,
    ...updates,
    updatedAt: new Date(),
  };

  widgets.set(id, updated);
  return updated;
}

export function deleteWidget(id: string, userId: string): boolean {
  const widget = widgets.get(id);
  if (!widget || widget.userId !== userId) return false;

  widgets.delete(id);
  userWidgets.get(userId)?.delete(id);
  return true;
}

// Request CRUD
export function createRequest(
  userId: string,
  data: Omit<TestimonialRequest, "id" | "userId" | "status" | "createdAt">
): TestimonialRequest {
  const request: TestimonialRequest = {
    id: crypto.randomUUID(),
    userId,
    ...data,
    status: "pending",
    createdAt: new Date(),
  };

  requests.set(request.id, request);

  if (!userRequests.has(userId)) {
    userRequests.set(userId, new Set());
  }
  userRequests.get(userId)!.add(request.id);

  return request;
}

export function getUserRequests(userId: string): TestimonialRequest[] {
  const requestIds = userRequests.get(userId);
  if (!requestIds) return [];

  return Array.from(requestIds)
    .map((id) => requests.get(id))
    .filter((r): r is TestimonialRequest => r !== undefined)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function sendRequest(id: string, userId: string): TestimonialRequest | null {
  const request = requests.get(id);
  if (!request || request.userId !== userId) return null;

  request.status = "sent";
  request.sentAt = new Date();
  requests.set(id, request);
  return request;
}

export function completeRequest(
  id: string,
  userId: string,
  testimonialId: string
): TestimonialRequest | null {
  const request = requests.get(id);
  if (!request || request.userId !== userId) return null;

  request.status = "completed";
  request.completedAt = new Date();
  request.testimonialId = testimonialId;
  requests.set(id, request);
  return request;
}

// Embed code generation
function generateEmbedCode(widgetId: string): string {
  return `<script src="https://app.example.com/widgets/${widgetId}.js" async></script>
<div id="testimonial-widget-${widgetId}"></div>`;
}

// Import from social media
export async function importFromTwitter(
  userId: string,
  tweetUrl: string
): Promise<Testimonial | null> {
  // Simulate Twitter import
  const testimonial = createTestimonial(userId, {
    source: "twitter",
    type: "text",
    content: {
      text: "Amazing product! Highly recommend to everyone. The customer service is top-notch! 🎉",
      originalUrl: tweetUrl,
    },
    author: {
      name: "Happy Customer",
      username: "@happycustomer",
      avatar: "https://pbs.twimg.com/profile_images/placeholder.jpg",
      followers: 1250,
      verified: false,
    },
    metadata: {
      tags: ["imported", "twitter"],
      sentiment: "positive",
      language: "en",
      date: new Date(),
    },
    status: "pending",
    displaySettings: {
      showAvatar: true,
      showCompany: false,
      showDate: true,
      showRating: false,
      showSource: true,
    },
  });

  return testimonial;
}

export async function importFromReview(
  userId: string,
  source: string,
  reviewData: {
    text: string;
    rating: number;
    authorName: string;
    date: Date;
  }
): Promise<Testimonial> {
  return createTestimonial(userId, {
    source: "review_site",
    type: "review",
    content: {
      text: reviewData.text,
      rating: reviewData.rating,
    },
    author: {
      name: reviewData.authorName,
    },
    metadata: {
      tags: ["imported", source],
      sentiment: reviewData.rating >= 4 ? "positive" : reviewData.rating >= 3 ? "neutral" : "negative",
      language: "en",
      date: reviewData.date,
    },
    status: "pending",
    displaySettings: {
      showAvatar: true,
      showCompany: false,
      showDate: true,
      showRating: true,
      showSource: true,
    },
  });
}

// Analytics
export function getSocialProofStats(userId: string): SocialProofStats {
  const userTestis = getUserTestimonials(userId);

  const approvedTestimonials = userTestis.filter((t) => t.status === "approved" || t.status === "featured");
  const featuredTestimonials = userTestis.filter((t) => t.status === "featured");

  const ratings = userTestis
    .filter((t) => t.content.rating)
    .map((t) => t.content.rating!);
  const avgRating = ratings.length > 0
    ? ratings.reduce((a, b) => a + b, 0) / ratings.length
    : 0;

  const bySource: Record<string, number> = {};
  const byRating: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  for (const t of userTestis) {
    bySource[t.source] = (bySource[t.source] || 0) + 1;
    if (t.content.rating) {
      byRating[t.content.rating] = (byRating[t.content.rating] || 0) + 1;
    }
  }

  const sentimentBreakdown = {
    positive: userTestis.filter((t) => t.metadata.sentiment === "positive").length,
    neutral: userTestis.filter((t) => t.metadata.sentiment === "neutral").length,
    negative: userTestis.filter((t) => t.metadata.sentiment === "negative").length,
  };

  const topPerformers = [...userTestis]
    .sort((a, b) => (b.analytics.conversions + b.analytics.clicks) - (a.analytics.conversions + a.analytics.clicks))
    .slice(0, 5);

  const userWidgetList = getUserWidgets(userId);
  const widgetImpressions = userWidgetList.reduce((sum, w) => sum + w.analytics.impressions, 0);

  return {
    totalTestimonials: userTestis.length,
    approvedTestimonials: approvedTestimonials.length,
    featuredTestimonials: featuredTestimonials.length,
    avgRating,
    bySource,
    byRating,
    recentTestimonials: userTestis.slice(0, 5),
    topPerformers,
    sentimentBreakdown,
    widgetImpressions,
  };
}

// Email templates
export const REQUEST_TEMPLATES = [
  {
    id: "simple",
    name: "Simple Request",
    subject: "We'd love your feedback!",
    body: `Hi {name},

Thank you for being our customer! We'd love to hear about your experience with {product}.

Would you mind sharing a quick testimonial? It only takes a minute and helps us improve.

[Share Your Experience]

Thanks so much!
{company}`,
  },
  {
    id: "detailed",
    name: "Detailed Request",
    subject: "Your feedback matters to us",
    body: `Hi {name},

We hope you're enjoying {product}! Your opinion is incredibly valuable to us.

We'd be grateful if you could share a brief testimonial about your experience. Here are some questions to consider:
- What problem did we help you solve?
- What's your favorite feature?
- Would you recommend us to others?

[Share Your Testimonial]

As a thank you, we're offering {incentive}!

Best regards,
{company}`,
  },
  {
    id: "video",
    name: "Video Testimonial Request",
    subject: "Share your story with us!",
    body: `Hi {name},

We'd love to feature you! Would you be interested in sharing a quick video testimonial?

It can be as simple as a 30-second clip from your phone sharing what you love about {product}.

[Record Video Testimonial]

We really appreciate your support!

Cheers,
{company}`,
  },
];

export const WIDGET_TYPES = [
  { value: "carousel", label: "Carousel", description: "Rotating testimonials" },
  { value: "grid", label: "Grid", description: "Masonry-style layout" },
  { value: "list", label: "List", description: "Vertical list view" },
  { value: "wall", label: "Wall of Love", description: "Social media style wall" },
  { value: "single", label: "Single", description: "One featured testimonial" },
  { value: "slider", label: "Slider", description: "Horizontal slider" },
] as const;

export const TESTIMONIAL_SOURCES = [
  { value: "twitter", label: "Twitter/X", icon: "𝕏" },
  { value: "instagram", label: "Instagram", icon: "📷" },
  { value: "facebook", label: "Facebook", icon: "📘" },
  { value: "linkedin", label: "LinkedIn", icon: "in" },
  { value: "email", label: "Email", icon: "✉️" },
  { value: "manual", label: "Manual", icon: "✏️" },
  { value: "review_site", label: "Review Site", icon: "⭐" },
] as const;
