export interface AutoResponse {
  id: string;
  userId: string;
  name: string;
  type: "comment" | "dm" | "mention" | "review";
  platform: string[];
  trigger: ResponseTrigger;
  response: ResponseContent;
  settings: ResponseSettings;
  status: "active" | "paused" | "draft";
  analytics: {
    triggered: number;
    responded: number;
    successRate: number;
    lastTriggeredAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ResponseTrigger {
  type: "keyword" | "sentiment" | "question" | "first_time" | "follow" | "all";
  keywords?: string[];
  keywordMatch?: "any" | "all" | "exact";
  sentiment?: "positive" | "negative" | "neutral";
  excludeKeywords?: string[];
  conditions?: {
    minFollowers?: number;
    maxFollowers?: number;
    verifiedOnly?: boolean;
    newFollowerOnly?: boolean;
    repeatCustomer?: boolean;
  };
}

export interface ResponseContent {
  type: "text" | "template" | "ai";
  messages: string[];
  variations?: string[];
  includeUsername?: boolean;
  includeEmoji?: boolean;
  tone?: "professional" | "friendly" | "casual" | "formal";
  maxLength?: number;
  attachments?: {
    type: "image" | "link" | "product";
    url: string;
    title?: string;
  }[];
  cta?: {
    text: string;
    url: string;
  };
}

export interface ResponseSettings {
  delay: {
    min: number; // seconds
    max: number;
  };
  rateLimit: {
    maxPerHour: number;
    maxPerDay: number;
  };
  schedule?: {
    enabled: boolean;
    timezone: string;
    activeHours: { start: number; end: number };
    activeDays: number[]; // 0-6, Sunday = 0
  };
  humanReview?: {
    enabled: boolean;
    threshold: number; // confidence threshold
    notifyEmail?: string;
  };
  fallback?: {
    enabled: boolean;
    message: string;
    notifyTeam: boolean;
  };
}

export interface ResponseLog {
  id: string;
  responseId: string;
  userId: string;
  type: "comment" | "dm" | "mention" | "review";
  platform: string;
  incomingMessage: string;
  respondedWith: string;
  senderUsername: string;
  senderFollowers?: number;
  sentiment?: string;
  matchedKeywords?: string[];
  status: "sent" | "pending" | "failed" | "skipped";
  skipReason?: string;
  confidence?: number;
  createdAt: Date;
  respondedAt?: Date;
}

export interface ResponseTemplate {
  id: string;
  userId: string;
  name: string;
  category: string;
  content: string;
  variables: string[];
  usageCount: number;
  createdAt: Date;
}

// In-memory storage
const autoResponses = new Map<string, AutoResponse>();
const userAutoResponses = new Map<string, Set<string>>();
const responseLogs = new Map<string, ResponseLog>();
const userResponseLogs = new Map<string, Set<string>>();
const responseTemplates = new Map<string, ResponseTemplate>();
const userTemplates = new Map<string, Set<string>>();

// Default templates
const defaultTemplates: Omit<ResponseTemplate, "id" | "userId" | "createdAt">[] = [
  {
    name: "Thank You Reply",
    category: "positive",
    content: "Thank you so much for your kind words, {username}! We really appreciate your support. 🙏",
    variables: ["username"],
    usageCount: 0,
  },
  {
    name: "Support Redirect",
    category: "support",
    content: "Hi {username}, thanks for reaching out! For the fastest support, please email us at support@example.com or visit our help center. We'll get back to you ASAP!",
    variables: ["username"],
    usageCount: 0,
  },
  {
    name: "Welcome New Follower",
    category: "welcome",
    content: "Welcome to our community, {username}! 🎉 We're excited to have you here. Feel free to reach out anytime!",
    variables: ["username"],
    usageCount: 0,
  },
  {
    name: "Question Response",
    category: "question",
    content: "Great question, {username}! Let me help you with that. {answer}",
    variables: ["username", "answer"],
    usageCount: 0,
  },
  {
    name: "Product Inquiry",
    category: "sales",
    content: "Hi {username}! Thanks for your interest in our products. Check out our full catalog here: {link}. Let me know if you have any questions!",
    variables: ["username", "link"],
    usageCount: 0,
  },
  {
    name: "Apology Response",
    category: "negative",
    content: "We're sorry to hear about your experience, {username}. Please DM us your order details and we'll make this right immediately.",
    variables: ["username"],
    usageCount: 0,
  },
  {
    name: "Business Hours",
    category: "info",
    content: "Thanks for your message, {username}! Our team is currently away but will respond during business hours (9AM-6PM EST, Mon-Fri). In the meantime, check our FAQ: {link}",
    variables: ["username", "link"],
    usageCount: 0,
  },
  {
    name: "Feature Request Acknowledgment",
    category: "feedback",
    content: "Thanks for the suggestion, {username}! We've noted your feedback and our team will review it. We love hearing from our community! 💡",
    variables: ["username"],
    usageCount: 0,
  },
];

// Auto Response CRUD
export function createAutoResponse(
  userId: string,
  data: Omit<AutoResponse, "id" | "userId" | "analytics" | "createdAt" | "updatedAt">
): AutoResponse {
  const response: AutoResponse = {
    id: crypto.randomUUID(),
    userId,
    ...data,
    analytics: {
      triggered: 0,
      responded: 0,
      successRate: 0,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  autoResponses.set(response.id, response);

  if (!userAutoResponses.has(userId)) {
    userAutoResponses.set(userId, new Set());
  }
  userAutoResponses.get(userId)!.add(response.id);

  return response;
}

export function getUserAutoResponses(userId: string): AutoResponse[] {
  const responseIds = userAutoResponses.get(userId);
  if (!responseIds) return [];

  return Array.from(responseIds)
    .map((id) => autoResponses.get(id))
    .filter((r): r is AutoResponse => r !== undefined)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function getAutoResponse(id: string, userId: string): AutoResponse | null {
  const response = autoResponses.get(id);
  if (!response || response.userId !== userId) return null;
  return response;
}

export function updateAutoResponse(
  id: string,
  userId: string,
  updates: Partial<Omit<AutoResponse, "id" | "userId" | "createdAt" | "updatedAt">>
): AutoResponse | null {
  const response = autoResponses.get(id);
  if (!response || response.userId !== userId) return null;

  const updated: AutoResponse = {
    ...response,
    ...updates,
    updatedAt: new Date(),
  };

  autoResponses.set(id, updated);
  return updated;
}

export function deleteAutoResponse(id: string, userId: string): boolean {
  const response = autoResponses.get(id);
  if (!response || response.userId !== userId) return false;

  autoResponses.delete(id);
  userAutoResponses.get(userId)?.delete(id);
  return true;
}

export function toggleAutoResponse(id: string, userId: string): AutoResponse | null {
  const response = autoResponses.get(id);
  if (!response || response.userId !== userId) return null;

  response.status = response.status === "active" ? "paused" : "active";
  response.updatedAt = new Date();
  autoResponses.set(id, response);
  return response;
}

// Response Log CRUD
export function createResponseLog(
  userId: string,
  data: Omit<ResponseLog, "id" | "userId" | "createdAt">
): ResponseLog {
  const log: ResponseLog = {
    id: crypto.randomUUID(),
    userId,
    ...data,
    createdAt: new Date(),
  };

  responseLogs.set(log.id, log);

  if (!userResponseLogs.has(userId)) {
    userResponseLogs.set(userId, new Set());
  }
  userResponseLogs.get(userId)!.add(log.id);

  // Update auto-response analytics
  const response = autoResponses.get(data.responseId);
  if (response) {
    response.analytics.triggered++;
    if (data.status === "sent") {
      response.analytics.responded++;
    }
    response.analytics.successRate =
      (response.analytics.responded / response.analytics.triggered) * 100;
    response.analytics.lastTriggeredAt = new Date();
    autoResponses.set(data.responseId, response);
  }

  return log;
}

export function getUserResponseLogs(
  userId: string,
  options?: {
    responseId?: string;
    status?: string;
    type?: string;
    limit?: number;
  }
): ResponseLog[] {
  const logIds = userResponseLogs.get(userId);
  if (!logIds) return [];

  let logs = Array.from(logIds)
    .map((id) => responseLogs.get(id))
    .filter((l): l is ResponseLog => l !== undefined);

  if (options?.responseId) {
    logs = logs.filter((l) => l.responseId === options.responseId);
  }

  if (options?.status) {
    logs = logs.filter((l) => l.status === options.status);
  }

  if (options?.type) {
    logs = logs.filter((l) => l.type === options.type);
  }

  logs = logs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  if (options?.limit) {
    logs = logs.slice(0, options.limit);
  }

  return logs;
}

// Template CRUD
export function createTemplate(
  userId: string,
  data: Omit<ResponseTemplate, "id" | "userId" | "usageCount" | "createdAt">
): ResponseTemplate {
  const template: ResponseTemplate = {
    id: crypto.randomUUID(),
    userId,
    ...data,
    usageCount: 0,
    createdAt: new Date(),
  };

  responseTemplates.set(template.id, template);

  if (!userTemplates.has(userId)) {
    userTemplates.set(userId, new Set());
  }
  userTemplates.get(userId)!.add(template.id);

  return template;
}

export function getUserTemplates(userId: string): ResponseTemplate[] {
  const templateIds = userTemplates.get(userId);

  // Start with default templates
  const templates: ResponseTemplate[] = defaultTemplates.map((t, idx) => ({
    id: `default-${idx}`,
    userId: "system",
    ...t,
    createdAt: new Date(),
  }));

  // Add user templates
  if (templateIds) {
    const userTpls = Array.from(templateIds)
      .map((id) => responseTemplates.get(id))
      .filter((t): t is ResponseTemplate => t !== undefined);
    templates.push(...userTpls);
  }

  return templates;
}

export function deleteTemplate(id: string, userId: string): boolean {
  if (id.startsWith("default-")) return false;

  const template = responseTemplates.get(id);
  if (!template || template.userId !== userId) return false;

  responseTemplates.delete(id);
  userTemplates.get(userId)?.delete(id);
  return true;
}

// AI-powered response generation
export async function generateAIResponse(
  incomingMessage: string,
  context: {
    platform: string;
    senderUsername: string;
    type: "comment" | "dm" | "mention" | "review";
    tone: "professional" | "friendly" | "casual" | "formal";
    brandVoice?: string;
    previousInteractions?: string[];
    productContext?: string;
  }
): Promise<{ response: string; confidence: number; suggestedActions: string[] }> {
  // Simulate AI response generation
  // In production, this would call OpenAI or similar

  const responses: Record<string, string[]> = {
    positive: [
      `Thanks so much for your kind words, @${context.senderUsername}! We really appreciate you! 🙌`,
      `This made our day, @${context.senderUsername}! Thank you for the support! 💯`,
      `You're amazing, @${context.senderUsername}! Thanks for sharing the love! ❤️`,
    ],
    negative: [
      `We're sorry to hear this, @${context.senderUsername}. Please DM us so we can make it right.`,
      `This isn't the experience we want for you, @${context.senderUsername}. Let's fix this - check your DMs!`,
      `We appreciate you letting us know, @${context.senderUsername}. Our team is on it!`,
    ],
    question: [
      `Great question, @${context.senderUsername}! Let me help you with that...`,
      `Thanks for asking, @${context.senderUsername}! Here's what you need to know...`,
      `Happy to help, @${context.senderUsername}! The answer is...`,
    ],
    general: [
      `Thanks for reaching out, @${context.senderUsername}! We're here to help.`,
      `Hey @${context.senderUsername}! Thanks for connecting with us.`,
      `Appreciate you, @${context.senderUsername}! Let us know if you need anything.`,
    ],
  };

  // Simple sentiment detection
  const lowerMessage = incomingMessage.toLowerCase();
  let category = "general";
  let confidence = 0.7;

  if (lowerMessage.includes("thank") || lowerMessage.includes("love") || lowerMessage.includes("great") || lowerMessage.includes("amazing")) {
    category = "positive";
    confidence = 0.9;
  } else if (lowerMessage.includes("bad") || lowerMessage.includes("terrible") || lowerMessage.includes("issue") || lowerMessage.includes("problem")) {
    category = "negative";
    confidence = 0.85;
  } else if (lowerMessage.includes("?") || lowerMessage.includes("how") || lowerMessage.includes("what") || lowerMessage.includes("where")) {
    category = "question";
    confidence = 0.8;
  }

  const categoryResponses = responses[category];
  const response = categoryResponses[Math.floor(Math.random() * categoryResponses.length)];

  const suggestedActions: string[] = [];
  if (category === "negative") {
    suggestedActions.push("Review customer history", "Escalate to support team");
  }
  if (category === "question") {
    suggestedActions.push("Link to FAQ", "Provide product details");
  }

  return { response, confidence, suggestedActions };
}

// Process incoming message
export async function processIncomingMessage(
  userId: string,
  message: {
    content: string;
    platform: string;
    senderUsername: string;
    senderFollowers?: number;
    type: "comment" | "dm" | "mention" | "review";
    postId?: string;
  }
): Promise<{
  matched: boolean;
  responseId?: string;
  respondedWith?: string;
  log?: ResponseLog;
}> {
  const responses = getUserAutoResponses(userId).filter((r) => r.status === "active");

  for (const response of responses) {
    // Check if type matches
    if (response.type !== message.type) continue;

    // Check if platform matches
    if (!response.platform.includes(message.platform) && !response.platform.includes("all")) continue;

    // Check trigger conditions
    const matched = checkTrigger(response.trigger, message);
    if (!matched) continue;

    // Generate response content
    let respondedWith = "";
    if (response.response.type === "text" && response.response.messages.length > 0) {
      respondedWith = response.response.messages[Math.floor(Math.random() * response.response.messages.length)];
    } else if (response.response.type === "ai") {
      const aiResponse = await generateAIResponse(message.content, {
        platform: message.platform,
        senderUsername: message.senderUsername,
        type: message.type,
        tone: response.response.tone || "friendly",
      });
      respondedWith = aiResponse.response;
    }

    // Replace variables
    respondedWith = respondedWith.replace(/{username}/g, message.senderUsername);

    // Create log
    const log = createResponseLog(userId, {
      responseId: response.id,
      type: message.type,
      platform: message.platform,
      incomingMessage: message.content,
      respondedWith,
      senderUsername: message.senderUsername,
      senderFollowers: message.senderFollowers,
      status: "sent",
      respondedAt: new Date(),
    });

    return { matched: true, responseId: response.id, respondedWith, log };
  }

  return { matched: false };
}

// Check trigger conditions
function checkTrigger(
  trigger: ResponseTrigger,
  message: { content: string; senderFollowers?: number }
): boolean {
  const lowerContent = message.content.toLowerCase();

  // Check trigger type
  switch (trigger.type) {
    case "all":
      return true;

    case "keyword":
      if (!trigger.keywords || trigger.keywords.length === 0) return false;
      const keywordsLower = trigger.keywords.map((k) => k.toLowerCase());

      if (trigger.keywordMatch === "all") {
        return keywordsLower.every((k) => lowerContent.includes(k));
      } else if (trigger.keywordMatch === "exact") {
        return keywordsLower.some((k) => lowerContent === k);
      } else {
        // 'any' match
        return keywordsLower.some((k) => lowerContent.includes(k));
      }

    case "question":
      return lowerContent.includes("?") ||
        lowerContent.startsWith("how") ||
        lowerContent.startsWith("what") ||
        lowerContent.startsWith("where") ||
        lowerContent.startsWith("when") ||
        lowerContent.startsWith("why") ||
        lowerContent.startsWith("can") ||
        lowerContent.startsWith("do you");

    case "sentiment":
      // Simple sentiment detection
      const positiveWords = ["love", "great", "amazing", "awesome", "thank", "best"];
      const negativeWords = ["hate", "bad", "terrible", "awful", "worst", "issue", "problem"];

      const hasPositive = positiveWords.some((w) => lowerContent.includes(w));
      const hasNegative = negativeWords.some((w) => lowerContent.includes(w));

      if (trigger.sentiment === "positive") return hasPositive && !hasNegative;
      if (trigger.sentiment === "negative") return hasNegative && !hasPositive;
      if (trigger.sentiment === "neutral") return !hasPositive && !hasNegative;
      return false;

    case "first_time":
      // Would need to check user history in production
      return true;

    case "follow":
      // Would check if new follower in production
      return true;
  }

  // Check exclusions
  if (trigger.excludeKeywords && trigger.excludeKeywords.length > 0) {
    const excludeLower = trigger.excludeKeywords.map((k) => k.toLowerCase());
    if (excludeLower.some((k) => lowerContent.includes(k))) return false;
  }

  // Check conditions
  if (trigger.conditions) {
    if (trigger.conditions.minFollowers && message.senderFollowers) {
      if (message.senderFollowers < trigger.conditions.minFollowers) return false;
    }
    if (trigger.conditions.maxFollowers && message.senderFollowers) {
      if (message.senderFollowers > trigger.conditions.maxFollowers) return false;
    }
  }

  return true;
}

// Analytics
export function getAutoResponseAnalytics(userId: string): {
  totalResponses: number;
  activeResponses: number;
  totalTriggered: number;
  totalResponded: number;
  avgSuccessRate: number;
  byType: Record<string, { count: number; responded: number }>;
  byPlatform: Record<string, { count: number; responded: number }>;
  recentActivity: ResponseLog[];
  hourlyDistribution: { hour: number; count: number }[];
} {
  const responses = getUserAutoResponses(userId);
  const logs = getUserResponseLogs(userId, { limit: 100 });

  const totalResponses = responses.length;
  const activeResponses = responses.filter((r) => r.status === "active").length;
  const totalTriggered = responses.reduce((sum, r) => sum + r.analytics.triggered, 0);
  const totalResponded = responses.reduce((sum, r) => sum + r.analytics.responded, 0);
  const avgSuccessRate = totalTriggered > 0 ? (totalResponded / totalTriggered) * 100 : 0;

  const byType: Record<string, { count: number; responded: number }> = {};
  const byPlatform: Record<string, { count: number; responded: number }> = {};

  for (const log of logs) {
    if (!byType[log.type]) {
      byType[log.type] = { count: 0, responded: 0 };
    }
    byType[log.type].count++;
    if (log.status === "sent") byType[log.type].responded++;

    if (!byPlatform[log.platform]) {
      byPlatform[log.platform] = { count: 0, responded: 0 };
    }
    byPlatform[log.platform].count++;
    if (log.status === "sent") byPlatform[log.platform].responded++;
  }

  // Calculate hourly distribution
  const hourlyDistribution = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: logs.filter((l) => new Date(l.createdAt).getHours() === hour).length,
  }));

  return {
    totalResponses,
    activeResponses,
    totalTriggered,
    totalResponded,
    avgSuccessRate,
    byType,
    byPlatform,
    recentActivity: logs.slice(0, 10),
    hourlyDistribution,
  };
}

export const TRIGGER_TYPES = [
  { value: "keyword", label: "Keywords", description: "Trigger when specific keywords are detected" },
  { value: "sentiment", label: "Sentiment", description: "Trigger based on message sentiment" },
  { value: "question", label: "Questions", description: "Trigger when a question is asked" },
  { value: "first_time", label: "First Time", description: "Trigger for first-time interactions" },
  { value: "follow", label: "New Follower", description: "Trigger when someone follows you" },
  { value: "all", label: "All Messages", description: "Respond to all incoming messages" },
] as const;

export const RESPONSE_TYPES = [
  { value: "text", label: "Custom Text", description: "Send predefined responses" },
  { value: "template", label: "Template", description: "Use a saved template" },
  { value: "ai", label: "AI Generated", description: "Let AI craft contextual responses" },
] as const;

export const MESSAGE_TYPES = [
  { value: "comment", label: "Comments", icon: "💬" },
  { value: "dm", label: "Direct Messages", icon: "✉️" },
  { value: "mention", label: "Mentions", icon: "@" },
  { value: "review", label: "Reviews", icon: "⭐" },
] as const;
