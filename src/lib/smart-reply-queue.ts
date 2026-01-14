import { getOpenAI } from "./openai";
import { prisma } from "./prisma";
import { Sentiment } from "@prisma/client";

export interface ReplyItem {
  id: string;
  platform: string;
  authorName: string;
  authorUsername: string;
  authorFollowers?: number;
  content: string;
  postContent?: string;
  sentiment: Sentiment | null;
  receivedAt: Date;
  priority: "high" | "medium" | "low";
  priorityReason: string;
  suggestedReplies: SuggestedReply[];
}

export interface SuggestedReply {
  id: string;
  content: string;
  tone: "friendly" | "professional" | "witty" | "helpful" | "grateful";
  confidence: number;
  reasoning: string;
}

export interface ReplyQueueAnalysis {
  totalItems: number;
  highPriority: number;
  mediumPriority: number;
  lowPriority: number;
  byPlatform: Record<string, number>;
  bySentiment: Record<string, number>;
  estimatedResponseTime: string;
}

// Get prioritized reply queue
export async function getReplyQueue(
  userId: string,
  options?: {
    platform?: string;
    limit?: number;
    priorityFilter?: "high" | "medium" | "low";
  }
): Promise<ReplyItem[]> {
  const { platform, limit = 50, priorityFilter } = options || {};

  // Get unread/unanswered mentions and inbox messages
  const whereClause: {
    userId: string;
    status: string;
    platform?: string;
  } = {
    userId,
    status: "UNREAD",
  };

  if (platform) {
    whereClause.platform = platform;
  }

  const messages = await prisma.inboxMessage.findMany({
    where: whereClause,
    orderBy: { receivedAt: "desc" },
    take: limit * 2, // Get more to filter by priority
  });

  // Process and prioritize
  const replyItems: ReplyItem[] = await Promise.all(
    messages.map(async (msg) => {
      const priority = calculatePriority(msg);
      const suggestedReplies = await generateSuggestedReplies(
        msg.content,
        msg.postContent || undefined,
        msg.sentiment
      );

      return {
        id: msg.id,
        platform: msg.platform,
        authorName: msg.authorName,
        authorUsername: msg.authorUsername,
        content: msg.content,
        postContent: msg.postContent || undefined,
        sentiment: msg.sentiment,
        receivedAt: msg.receivedAt,
        priority: priority.level,
        priorityReason: priority.reason,
        suggestedReplies,
      };
    })
  );

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  replyItems.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  // Filter by priority if specified
  let filtered = replyItems;
  if (priorityFilter) {
    filtered = replyItems.filter((item) => item.priority === priorityFilter);
  }

  return filtered.slice(0, limit);
}

function calculatePriority(message: {
  sentiment: Sentiment | null;
  content: string;
  authorUsername: string;
}): { level: "high" | "medium" | "low"; reason: string } {
  // Check for questions
  const isQuestion = message.content.includes("?");

  // Check for negative sentiment
  const isNegative = message.sentiment === "NEGATIVE";

  // Check for mentions of competitors or issues
  const hasUrgentKeywords = /help|urgent|problem|issue|broken|error|fix/i.test(
    message.content
  );

  // Check for potential influencers (verified or high engagement keywords)
  const isPotentialInfluencer =
    message.authorUsername.length < 15 && !message.authorUsername.includes("_");

  if (isNegative || hasUrgentKeywords) {
    return { level: "high", reason: "Requires immediate attention - negative sentiment or urgent issue" };
  }

  if (isQuestion) {
    return { level: "high", reason: "Direct question - respond to build engagement" };
  }

  if (isPotentialInfluencer) {
    return { level: "medium", reason: "Potential influencer - good engagement opportunity" };
  }

  return { level: "low", reason: "Standard engagement opportunity" };
}

// Generate AI-powered reply suggestions
export async function generateSuggestedReplies(
  incomingMessage: string,
  originalPost?: string,
  sentiment?: Sentiment | null
): Promise<SuggestedReply[]> {
  const context = originalPost
    ? `They're replying to your post: "${originalPost}"`
    : "This is a direct message/mention.";

  const systemPrompt = `You are a social media engagement expert.
Generate 3 reply options for the incoming message.

Guidelines:
- Be authentic and human, not robotic
- Match the energy of the message
- ${sentiment === "NEGATIVE" ? "Address concerns empathetically first" : "Be warm and engaging"}
- Keep replies under 280 characters
- Don't be overly promotional
- Include a variety of tones

Return JSON with "replies" array:
{
  "replies": [
    {
      "content": "<reply text>",
      "tone": "friendly|professional|witty|helpful|grateful",
      "confidence": <0-100>,
      "reasoning": "<why this reply works>"
    }
  ]
}`;

  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 600,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `${context}

Incoming message: "${incomingMessage}"

Generate 3 reply options with different tones.`,
      },
    ],
  });

  const result = response.choices[0]?.message?.content;
  if (!result) {
    return [];
  }

  const parsed = JSON.parse(result);
  return (parsed.replies || []).map(
    (r: Omit<SuggestedReply, "id">, index: number) => ({
      id: `suggestion-${index}`,
      content: r.content || "",
      tone: r.tone || "friendly",
      confidence: Math.round(r.confidence || 70),
      reasoning: r.reasoning || "",
    })
  );
}

// Approve and send a reply
export async function approveReply(
  messageId: string,
  replyContent: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Update the inbox message status
    await prisma.inboxMessage.update({
      where: { id: messageId },
      data: {
        status: "REPLIED",
        repliedAt: new Date(),
        replyContent,
      },
    });

    // TODO: Actually send the reply via platform API
    // This would integrate with x-client.ts, linkedin.ts, etc.

    return { success: true };
  } catch (error) {
    console.error("Failed to approve reply:", error);
    return { success: false, error: "Failed to send reply" };
  }
}

// Get queue analytics
export async function getQueueAnalytics(
  userId: string
): Promise<ReplyQueueAnalysis> {
  const messages = await prisma.inboxMessage.findMany({
    where: {
      userId,
      status: "UNREAD",
    },
    select: {
      platform: true,
      sentiment: true,
      content: true,
      authorUsername: true,
    },
  });

  // Calculate priorities
  let highPriority = 0;
  let mediumPriority = 0;
  let lowPriority = 0;

  const byPlatform: Record<string, number> = {};
  const bySentiment: Record<string, number> = {};

  messages.forEach((msg) => {
    // Priority
    const priority = calculatePriority(msg);
    if (priority.level === "high") highPriority++;
    else if (priority.level === "medium") mediumPriority++;
    else lowPriority++;

    // Platform
    byPlatform[msg.platform] = (byPlatform[msg.platform] || 0) + 1;

    // Sentiment
    const sentimentKey = msg.sentiment || "UNKNOWN";
    bySentiment[sentimentKey] = (bySentiment[sentimentKey] || 0) + 1;
  });

  // Estimate response time (assume 30 sec per reply)
  const totalMinutes = Math.ceil(messages.length * 0.5);
  let estimatedTime: string;
  if (totalMinutes < 60) {
    estimatedTime = `${totalMinutes} minutes`;
  } else {
    estimatedTime = `${Math.round(totalMinutes / 60 * 10) / 10} hours`;
  }

  return {
    totalItems: messages.length,
    highPriority,
    mediumPriority,
    lowPriority,
    byPlatform,
    bySentiment,
    estimatedResponseTime: estimatedTime,
  };
}

// Bulk generate replies for efficiency
export async function bulkGenerateReplies(
  messages: { id: string; content: string; postContent?: string; sentiment?: Sentiment | null }[]
): Promise<Map<string, SuggestedReply[]>> {
  const results = new Map<string, SuggestedReply[]>();

  // Process in batches of 5 for efficiency
  const batchSize = 5;
  for (let i = 0; i < messages.length; i += batchSize) {
    const batch = messages.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((msg) =>
        generateSuggestedReplies(msg.content, msg.postContent, msg.sentiment)
      )
    );

    batch.forEach((msg, index) => {
      results.set(msg.id, batchResults[index]);
    });
  }

  return results;
}

// Learn from user's reply patterns to improve suggestions
export async function learnFromApprovedReply(
  originalMessage: string,
  userReply: string,
  userId: string
): Promise<void> {
  // Store the pattern for future learning
  // This could be used to fine-tune suggestions based on user's style

  // For now, we just log it - in production, you'd store this in a learning table
  console.log(`Learning from approved reply for user ${userId}`);

  // TODO: Implement pattern storage and retrieval for personalized suggestions
}
