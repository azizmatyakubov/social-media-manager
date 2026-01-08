import { prisma } from "./prisma";
import { getOpenAI } from "./openai";
import { Platform, MentionStatus, Sentiment } from "@prisma/client";

export interface MentionData {
  platformId: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  content: string;
  inReplyTo?: string;
}

export async function syncMentions(userId: string, platform: Platform) {
  // This would integrate with platform APIs to fetch mentions
  // For now, we'll provide the structure
  const xAccount = await prisma.xAccount.findFirst({
    where: { userId, isDefault: true },
  });

  if (!xAccount) {
    throw new Error("No connected account found");
  }

  // In production, fetch mentions from X API
  // const mentions = await fetchXMentions(xAccount.accessToken);

  return { synced: 0 };
}

export async function saveMention(userId: string, platform: Platform, data: MentionData) {
  // Check if mention already exists
  const existing = await prisma.mention.findUnique({
    where: {
      platform_platformId: {
        platform,
        platformId: data.platformId,
      },
    },
  });

  if (existing) {
    return existing;
  }

  // Analyze sentiment
  const sentiment = await analyzeSentiment(data.content);

  return prisma.mention.create({
    data: {
      userId,
      platform,
      platformId: data.platformId,
      authorId: data.authorId,
      authorName: data.authorName,
      authorUsername: data.authorUsername,
      content: data.content,
      inReplyTo: data.inReplyTo,
      sentiment,
      status: MentionStatus.UNREAD,
    },
  });
}

async function analyzeSentiment(content: string): Promise<Sentiment> {
  const openai = getOpenAI();

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "Analyze the sentiment of the following text. Return only one word: POSITIVE, NEUTRAL, or NEGATIVE",
      },
      { role: "user", content },
    ],
    max_tokens: 10,
  });

  const result = response.choices[0]?.message?.content?.toUpperCase().trim();

  if (result === "POSITIVE") return Sentiment.POSITIVE;
  if (result === "NEGATIVE") return Sentiment.NEGATIVE;
  return Sentiment.NEUTRAL;
}

export async function generateReplySuggestions(mentionId: string, tones: string[] = ["friendly", "professional", "witty"]) {
  const mention = await prisma.mention.findUnique({
    where: { id: mentionId },
    include: {
      user: {
        include: {
          voiceProfile: true,
        },
      },
    },
  });

  if (!mention) {
    throw new Error("Mention not found");
  }

  const openai = getOpenAI();
  const suggestions: Array<{ content: string; tone: string }> = [];

  for (const tone of tones) {
    let systemPrompt = `You are a social media expert generating a ${tone} reply to a mention/comment.`;

    if (mention.user.voiceProfile?.styleAnalysis) {
      systemPrompt += `\n\nMatch this writing style: ${mention.user.voiceProfile.styleAnalysis}`;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Generate a ${tone} reply to this ${mention.platform} mention from @${mention.authorUsername}:\n\n"${mention.content}"\n\nKeep it under 280 characters and make it engaging.`,
        },
      ],
      max_tokens: 150,
    });

    const replyContent = response.choices[0]?.message?.content;

    if (replyContent) {
      suggestions.push({
        content: replyContent,
        tone,
      });
    }
  }

  // Save suggestions to database
  const savedSuggestions = await Promise.all(
    suggestions.map((s) =>
      prisma.suggestedReply.create({
        data: {
          mentionId,
          content: s.content,
          tone: s.tone,
        },
      })
    )
  );

  return savedSuggestions;
}

export async function sendReply(
  mentionId: string,
  suggestionId: string,
  customContent?: string
) {
  const mention = await prisma.mention.findUnique({
    where: { id: mentionId },
    include: {
      user: {
        include: {
          xAccounts: { where: { isDefault: true } },
        },
      },
    },
  });

  if (!mention) {
    throw new Error("Mention not found");
  }

  let replyContent: string;

  if (customContent) {
    replyContent = customContent;
  } else {
    const suggestion = await prisma.suggestedReply.findUnique({
      where: { id: suggestionId },
    });
    if (!suggestion) {
      throw new Error("Suggestion not found");
    }
    replyContent = suggestion.content;

    // Mark suggestion as used
    await prisma.suggestedReply.update({
      where: { id: suggestionId },
      data: { used: true },
    });
  }

  // Send reply via platform API
  // In production: await sendXReply(xAccount.accessToken, mention.platformId, replyContent);

  // Update mention status
  await prisma.mention.update({
    where: { id: mentionId },
    data: {
      status: MentionStatus.REPLIED,
      repliedAt: new Date(),
    },
  });

  return { success: true, content: replyContent };
}

export async function getMentions(
  userId: string,
  options: {
    status?: MentionStatus;
    sentiment?: Sentiment;
    limit?: number;
    offset?: number;
  } = {}
) {
  return prisma.mention.findMany({
    where: {
      userId,
      ...(options.status && { status: options.status }),
      ...(options.sentiment && { sentiment: options.sentiment }),
    },
    include: {
      replies: {
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
    take: options.limit || 20,
    skip: options.offset || 0,
  });
}

export async function getMentionStats(userId: string) {
  const [total, unread, positive, negative, neutral] = await Promise.all([
    prisma.mention.count({ where: { userId } }),
    prisma.mention.count({ where: { userId, status: MentionStatus.UNREAD } }),
    prisma.mention.count({ where: { userId, sentiment: Sentiment.POSITIVE } }),
    prisma.mention.count({ where: { userId, sentiment: Sentiment.NEGATIVE } }),
    prisma.mention.count({ where: { userId, sentiment: Sentiment.NEUTRAL } }),
  ]);

  return {
    total,
    unread,
    sentimentBreakdown: {
      positive,
      negative,
      neutral,
    },
    responseRate: total > 0 ? ((total - unread) / total) * 100 : 0,
  };
}

export async function markMentionAs(mentionId: string, status: MentionStatus) {
  return prisma.mention.update({
    where: { id: mentionId },
    data: { status },
  });
}

export async function bulkMarkMentions(mentionIds: string[], status: MentionStatus) {
  return prisma.mention.updateMany({
    where: { id: { in: mentionIds } },
    data: { status },
  });
}

export async function getHighPriorityMentions(userId: string) {
  // Get mentions that need attention:
  // - Negative sentiment
  // - From accounts with many followers
  // - Questions that need answers
  return prisma.mention.findMany({
    where: {
      userId,
      status: MentionStatus.UNREAD,
      OR: [
        { sentiment: Sentiment.NEGATIVE },
        { content: { contains: "?" } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
}
