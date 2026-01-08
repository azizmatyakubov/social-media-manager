import { prisma } from "./prisma";
import { getOpenAI } from "./openai";
import { Platform, InboxStatus, Sentiment, MessageType } from "@prisma/client";

// ============================================
// Types
// ============================================

export interface InboxFilters {
  platform?: Platform;
  status?: InboxStatus;
  messageType?: MessageType;
  sentiment?: Sentiment;
  isSpam?: boolean;
  labels?: string[];
  assignedTo?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface InboxMessageData {
  platformId: string;
  conversationId?: string;
  messageType: MessageType;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorAvatar?: string;
  content: string;
  mediaUrls?: string[];
  postId?: string;
  postContent?: string;
  receivedAt?: Date;
}

export interface InboxStats {
  total: number;
  unread: number;
  replied: number;
  archived: number;
  spam: number;
  byPlatform: Record<Platform, number>;
  bySentiment: {
    positive: number;
    neutral: number;
    negative: number;
  };
  responseRate: number;
  avgResponseTime?: number;
}

// ============================================
// Core Inbox Functions
// ============================================

/**
 * Fetch inbox messages with optional filters
 */
export async function fetchInboxMessages(userId: string, filters: InboxFilters = {}) {
  const where: Record<string, unknown> = { userId };

  if (filters.platform) {
    where.platform = filters.platform;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.messageType) {
    where.messageType = filters.messageType;
  }

  if (filters.sentiment) {
    where.sentiment = filters.sentiment;
  }

  if (filters.isSpam !== undefined) {
    where.isSpam = filters.isSpam;
  }

  if (filters.labels && filters.labels.length > 0) {
    where.labels = { hasSome: filters.labels };
  }

  if (filters.assignedTo) {
    where.assignedTo = filters.assignedTo;
  }

  if (filters.dateFrom || filters.dateTo) {
    where.receivedAt = {};
    if (filters.dateFrom) {
      (where.receivedAt as Record<string, Date>).gte = filters.dateFrom;
    }
    if (filters.dateTo) {
      (where.receivedAt as Record<string, Date>).lte = filters.dateTo;
    }
  }

  if (filters.search) {
    where.OR = [
      { content: { contains: filters.search, mode: "insensitive" } },
      { authorName: { contains: filters.search, mode: "insensitive" } },
      { authorUsername: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  const messages = await prisma.inboxMessage.findMany({
    where,
    orderBy: { receivedAt: "desc" },
    take: filters.limit || 50,
    skip: filters.offset || 0,
  });

  return messages;
}

/**
 * Get inbox statistics for a user
 */
export async function getInboxStats(userId: string): Promise<InboxStats> {
  const [
    total,
    unread,
    replied,
    archived,
    spam,
    xCount,
    linkedInCount,
    instagramCount,
    tiktokCount,
    youtubeCount,
    pinterestCount,
    blueskyCount,
    threadsCount,
    positive,
    neutral,
    negative,
  ] = await Promise.all([
    prisma.inboxMessage.count({ where: { userId } }),
    prisma.inboxMessage.count({ where: { userId, status: InboxStatus.UNREAD } }),
    prisma.inboxMessage.count({ where: { userId, status: InboxStatus.REPLIED } }),
    prisma.inboxMessage.count({ where: { userId, status: InboxStatus.ARCHIVED } }),
    prisma.inboxMessage.count({ where: { userId, isSpam: true } }),
    prisma.inboxMessage.count({ where: { userId, platform: Platform.X } }),
    prisma.inboxMessage.count({ where: { userId, platform: Platform.LINKEDIN } }),
    prisma.inboxMessage.count({ where: { userId, platform: Platform.INSTAGRAM } }),
    prisma.inboxMessage.count({ where: { userId, platform: Platform.TIKTOK } }),
    prisma.inboxMessage.count({ where: { userId, platform: Platform.YOUTUBE } }),
    prisma.inboxMessage.count({ where: { userId, platform: Platform.PINTEREST } }),
    prisma.inboxMessage.count({ where: { userId, platform: Platform.BLUESKY } }),
    prisma.inboxMessage.count({ where: { userId, platform: Platform.THREADS } }),
    prisma.inboxMessage.count({ where: { userId, sentiment: Sentiment.POSITIVE } }),
    prisma.inboxMessage.count({ where: { userId, sentiment: Sentiment.NEUTRAL } }),
    prisma.inboxMessage.count({ where: { userId, sentiment: Sentiment.NEGATIVE } }),
  ]);

  return {
    total,
    unread,
    replied,
    archived,
    spam,
    byPlatform: {
      X: xCount,
      LINKEDIN: linkedInCount,
      INSTAGRAM: instagramCount,
      TIKTOK: tiktokCount,
      YOUTUBE: youtubeCount,
      PINTEREST: pinterestCount,
      BLUESKY: blueskyCount,
      THREADS: threadsCount,
    },
    bySentiment: {
      positive,
      neutral,
      negative,
    },
    responseRate: total > 0 ? (replied / total) * 100 : 0,
  };
}

/**
 * Sync messages from a specific platform
 */
export async function syncPlatformMessages(
  userId: string,
  platform: Platform
): Promise<{ synced: number; errors: string[] }> {
  const errors: string[] = [];
  let synced = 0;

  try {
    // Get the user's account for the specified platform
    let account;
    switch (platform) {
      case Platform.X:
        account = await prisma.xAccount.findFirst({
          where: { userId, isDefault: true },
        });
        break;
      case Platform.LINKEDIN:
        account = await prisma.linkedInAccount.findFirst({
          where: { userId, isDefault: true },
        });
        break;
      case Platform.INSTAGRAM:
        account = await prisma.instagramAccount.findFirst({
          where: { userId, isDefault: true },
        });
        break;
      case Platform.TIKTOK:
        account = await prisma.tikTokAccount.findFirst({
          where: { userId, isDefault: true },
        });
        break;
      case Platform.YOUTUBE:
        account = await prisma.youTubeAccount.findFirst({
          where: { userId, isDefault: true },
        });
        break;
      case Platform.PINTEREST:
        account = await prisma.pinterestAccount.findFirst({
          where: { userId, isDefault: true },
        });
        break;
      case Platform.BLUESKY:
        account = await prisma.blueskyAccount.findFirst({
          where: { userId, isDefault: true },
        });
        break;
      default:
        errors.push(`Unsupported platform: ${platform}`);
        return { synced, errors };
    }

    if (!account) {
      errors.push(`No connected ${platform} account found`);
      return { synced, errors };
    }

    // In production, this would call the respective platform APIs
    // to fetch DMs, comments, mentions, etc.
    // For now, we return the structure for integration

    // Example structure for X (Twitter) API integration:
    // const messages = await fetchXDMs(account.accessToken);
    // const comments = await fetchXReplies(account.accessToken);
    // const mentions = await fetchXMentions(account.accessToken);

    // for (const msg of messages) {
    //   await saveInboxMessage(userId, platform, msg);
    //   synced++;
    // }

    return { synced, errors };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Unknown sync error");
    return { synced, errors };
  }
}

/**
 * Save an inbox message from a platform
 */
export async function saveInboxMessage(
  userId: string,
  platform: Platform,
  data: InboxMessageData
): Promise<{ id: string; isNew: boolean }> {
  // Check if message already exists
  const existing = await prisma.inboxMessage.findUnique({
    where: {
      platform_platformId: {
        platform,
        platformId: data.platformId,
      },
    },
  });

  if (existing) {
    return { id: existing.id, isNew: false };
  }

  // Analyze sentiment for the new message
  const sentiment = await analyzeMessageSentiment(data.content);

  // Check for spam
  const isSpam = await checkIfSpam(data.content);

  const message = await prisma.inboxMessage.create({
    data: {
      userId,
      platform,
      messageType: data.messageType,
      platformId: data.platformId,
      conversationId: data.conversationId,
      authorId: data.authorId,
      authorName: data.authorName,
      authorUsername: data.authorUsername,
      authorAvatar: data.authorAvatar,
      content: data.content,
      mediaUrls: data.mediaUrls || [],
      postId: data.postId,
      postContent: data.postContent,
      status: isSpam ? InboxStatus.SPAM : InboxStatus.UNREAD,
      sentiment,
      isSpam,
      receivedAt: data.receivedAt || new Date(),
    },
  });

  return { id: message.id, isNew: true };
}

/**
 * Reply to a message
 */
export async function replyToMessage(
  messageId: string,
  content: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const message = await prisma.inboxMessage.findFirst({
    where: { id: messageId, userId },
  });

  if (!message) {
    return { success: false, error: "Message not found" };
  }

  // In production, this would send the reply via the platform's API
  // For now, we update the message status and store the reply

  // Get the appropriate account for the platform
  // const account = await getAccountForPlatform(userId, message.platform);
  // await sendPlatformReply(account, message, content);

  await prisma.inboxMessage.update({
    where: { id: messageId },
    data: {
      status: InboxStatus.REPLIED,
      repliedAt: new Date(),
      replyContent: content,
    },
  });

  return { success: true };
}

/**
 * Update message status
 */
export async function updateMessageStatus(
  messageId: string,
  status: InboxStatus,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const message = await prisma.inboxMessage.findFirst({
    where: { id: messageId, userId },
  });

  if (!message) {
    return { success: false, error: "Message not found" };
  }

  await prisma.inboxMessage.update({
    where: { id: messageId },
    data: { status },
  });

  return { success: true };
}

/**
 * Bulk update message status
 */
export async function bulkUpdateMessageStatus(
  messageIds: string[],
  status: InboxStatus,
  userId: string
): Promise<{ updated: number }> {
  const result = await prisma.inboxMessage.updateMany({
    where: {
      id: { in: messageIds },
      userId,
    },
    data: { status },
  });

  return { updated: result.count };
}

/**
 * Assign a message to a team member
 */
export async function assignMessage(
  messageId: string,
  assigneeId: string | null,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const message = await prisma.inboxMessage.findFirst({
    where: { id: messageId, userId },
  });

  if (!message) {
    return { success: false, error: "Message not found" };
  }

  await prisma.inboxMessage.update({
    where: { id: messageId },
    data: { assignedTo: assigneeId },
  });

  return { success: true };
}

/**
 * Update message labels/tags
 */
export async function updateMessageLabels(
  messageId: string,
  labels: string[],
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const message = await prisma.inboxMessage.findFirst({
    where: { id: messageId, userId },
  });

  if (!message) {
    return { success: false, error: "Message not found" };
  }

  await prisma.inboxMessage.update({
    where: { id: messageId },
    data: { labels },
  });

  return { success: true };
}

/**
 * Add a label to a message
 */
export async function addMessageLabel(
  messageId: string,
  label: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const message = await prisma.inboxMessage.findFirst({
    where: { id: messageId, userId },
  });

  if (!message) {
    return { success: false, error: "Message not found" };
  }

  const labels = message.labels.includes(label)
    ? message.labels
    : [...message.labels, label];

  await prisma.inboxMessage.update({
    where: { id: messageId },
    data: { labels },
  });

  return { success: true };
}

/**
 * Remove a label from a message
 */
export async function removeMessageLabel(
  messageId: string,
  label: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const message = await prisma.inboxMessage.findFirst({
    where: { id: messageId, userId },
  });

  if (!message) {
    return { success: false, error: "Message not found" };
  }

  await prisma.inboxMessage.update({
    where: { id: messageId },
    data: { labels: message.labels.filter((l) => l !== label) },
  });

  return { success: true };
}

// ============================================
// AI Functions
// ============================================

/**
 * Analyze the sentiment of a message using AI
 */
export async function analyzeMessageSentiment(content: string): Promise<Sentiment> {
  try {
    const openai = getOpenAI();

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Analyze the sentiment of the following social media message. Consider the context, tone, and intent. Return ONLY one word: POSITIVE, NEUTRAL, or NEGATIVE",
        },
        { role: "user", content },
      ],
      max_tokens: 10,
      temperature: 0.3,
    });

    const result = response.choices[0]?.message?.content?.toUpperCase().trim();

    if (result === "POSITIVE") return Sentiment.POSITIVE;
    if (result === "NEGATIVE") return Sentiment.NEGATIVE;
    return Sentiment.NEUTRAL;
  } catch (error) {
    console.error("Sentiment analysis error:", error);
    return Sentiment.NEUTRAL;
  }
}

/**
 * Filter messages for spam using AI
 */
export async function filterSpamMessages<T extends { content: string; id?: string }>(
  messages: T[]
): Promise<{ spam: T[]; notSpam: T[] }> {
  const spam: T[] = [];
  const notSpam: T[] = [];

  for (const message of messages) {
    const isSpam = await checkIfSpam(message.content);
    if (isSpam) {
      spam.push(message);
    } else {
      notSpam.push(message);
    }
  }

  return { spam, notSpam };
}

/**
 * Check if a message is spam using AI
 */
async function checkIfSpam(content: string): Promise<boolean> {
  try {
    const openai = getOpenAI();

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Analyze if the following social media message is spam. Consider:
- Promotional/advertising content
- Scam attempts
- Bot-generated content
- Irrelevant/unsolicited messages
- Suspicious links or offers

Return ONLY "SPAM" or "NOT_SPAM"`,
        },
        { role: "user", content },
      ],
      max_tokens: 10,
      temperature: 0.2,
    });

    const result = response.choices[0]?.message?.content?.toUpperCase().trim();
    return result === "SPAM";
  } catch (error) {
    console.error("Spam detection error:", error);
    return false;
  }
}

/**
 * Generate AI-suggested replies for a message
 */
export async function generateSuggestedReplies(
  messageId: string,
  tones: string[] = ["friendly", "professional", "helpful"]
): Promise<Array<{ content: string; tone: string }>> {
  const message = await prisma.inboxMessage.findUnique({
    where: { id: messageId },
    include: {
      user: {
        include: {
          voiceProfile: true,
        },
      },
    },
  });

  if (!message) {
    throw new Error("Message not found");
  }

  const openai = getOpenAI();
  const suggestions: Array<{ content: string; tone: string }> = [];

  for (const tone of tones) {
    let systemPrompt = `You are a social media expert generating a ${tone} reply to a message.
Keep the reply concise, engaging, and appropriate for ${message.platform}.`;

    if (message.user.voiceProfile?.styleAnalysis) {
      systemPrompt += `\n\nMatch this writing style: ${message.user.voiceProfile.styleAnalysis}`;
    }

    if (message.user.voiceProfile?.toneKeywords?.length) {
      systemPrompt += `\nTone characteristics: ${message.user.voiceProfile.toneKeywords.join(", ")}`;
    }

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Generate a ${tone} reply to this ${message.messageType.toLowerCase()} from @${message.authorUsername}:

"${message.content}"

${message.postContent ? `This is in response to my post: "${message.postContent}"` : ""}

Keep it under 280 characters and make it engaging.`,
          },
        ],
        max_tokens: 150,
        temperature: 0.7,
      });

      const replyContent = response.choices[0]?.message?.content;

      if (replyContent) {
        suggestions.push({
          content: replyContent.replace(/^["']|["']$/g, "").trim(),
          tone,
        });
      }
    } catch (error) {
      console.error(`Failed to generate ${tone} reply:`, error);
    }
  }

  return suggestions;
}

/**
 * Get conversation thread for a message
 */
export async function getConversationThread(
  messageId: string,
  userId: string
): Promise<Array<{
  id: string;
  content: string;
  authorUsername: string;
  receivedAt: Date;
  isReply: boolean;
  replyContent: string | null;
}>> {
  const message = await prisma.inboxMessage.findFirst({
    where: { id: messageId, userId },
  });

  if (!message || !message.conversationId) {
    return message
      ? [
          {
            id: message.id,
            content: message.content,
            authorUsername: message.authorUsername,
            receivedAt: message.receivedAt,
            isReply: false,
            replyContent: message.replyContent,
          },
        ]
      : [];
  }

  const conversation = await prisma.inboxMessage.findMany({
    where: {
      userId,
      conversationId: message.conversationId,
    },
    orderBy: { receivedAt: "asc" },
    select: {
      id: true,
      content: true,
      authorUsername: true,
      receivedAt: true,
      replyContent: true,
    },
  });

  return conversation.map((msg) => ({
    ...msg,
    isReply: !!msg.replyContent,
  }));
}

/**
 * Get high priority messages (negative sentiment, questions, etc.)
 */
export async function getHighPriorityMessages(userId: string, limit: number = 10) {
  return prisma.inboxMessage.findMany({
    where: {
      userId,
      status: InboxStatus.UNREAD,
      isSpam: false,
      OR: [
        { sentiment: Sentiment.NEGATIVE },
        { content: { contains: "?" } },
        { messageType: MessageType.DM },
      ],
    },
    orderBy: [{ sentiment: "asc" }, { receivedAt: "desc" }],
    take: limit,
  });
}

/**
 * Search inbox messages
 */
export async function searchInboxMessages(
  userId: string,
  query: string,
  limit: number = 20
) {
  return prisma.inboxMessage.findMany({
    where: {
      userId,
      OR: [
        { content: { contains: query, mode: "insensitive" } },
        { authorName: { contains: query, mode: "insensitive" } },
        { authorUsername: { contains: query, mode: "insensitive" } },
        { postContent: { contains: query, mode: "insensitive" } },
      ],
    },
    orderBy: { receivedAt: "desc" },
    take: limit,
  });
}

/**
 * Get team members for assignment dropdown
 */
export async function getTeamMembers(userId: string) {
  // Get user's workspaces
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    include: {
      workspace: {
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const teamMembers = new Map<
    string,
    { id: string; name: string | null; email: string; image: string | null }
  >();

  for (const membership of memberships) {
    for (const member of membership.workspace.members) {
      if (!teamMembers.has(member.user.id)) {
        teamMembers.set(member.user.id, member.user);
      }
    }
  }

  return Array.from(teamMembers.values());
}
