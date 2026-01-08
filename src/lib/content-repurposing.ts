import { prisma } from "./prisma";
import { getOpenAI } from "./openai";
import { ContentType, Platform, RepurposeStatus } from "@prisma/client";

const CONTENT_LIMITS: Record<ContentType, number> = {
  TWEET: 280,
  THREAD: 280, // Per tweet
  LINKEDIN_POST: 3000,
  INSTAGRAM_CAPTION: 2200,
  BLOG_POST: 50000,
  VIDEO_SCRIPT: 10000,
  NEWSLETTER: 20000,
};

const PLATFORM_MAP: Record<ContentType, Platform | null> = {
  TWEET: Platform.X,
  THREAD: Platform.X,
  LINKEDIN_POST: Platform.LINKEDIN,
  INSTAGRAM_CAPTION: Platform.INSTAGRAM,
  BLOG_POST: null,
  VIDEO_SCRIPT: null,
  NEWSLETTER: null,
};

export async function repurposeContent(
  userId: string,
  sourceContent: string,
  sourceType: ContentType,
  outputType: ContentType,
  sourcePostId?: string
) {
  const openai = getOpenAI();

  const prompt = buildRepurposePrompt(sourceContent, sourceType, outputType);

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: getSystemPrompt(outputType),
      },
      { role: "user", content: prompt },
    ],
    max_tokens: getMaxTokens(outputType),
  });

  const outputContent = response.choices[0]?.message?.content || "";

  const repurposed = await prisma.repurposedContent.create({
    data: {
      userId,
      sourceType,
      sourceContent,
      sourcePostId,
      outputType,
      outputContent,
      outputPlatform: PLATFORM_MAP[outputType],
      status: RepurposeStatus.DRAFT,
    },
  });

  return repurposed;
}

function buildRepurposePrompt(
  content: string,
  sourceType: ContentType,
  outputType: ContentType
): string {
  const limit = CONTENT_LIMITS[outputType];

  return `Convert this ${formatContentType(sourceType)} into a ${formatContentType(outputType)}.

Source content:
${content}

Requirements:
- Maximum length: ${limit} characters${outputType === "THREAD" ? " per tweet" : ""}
- Maintain the core message and value
- Optimize for the target format
- Make it engaging and native to the platform

Provide only the converted content, no explanations.`;
}

function formatContentType(type: ContentType): string {
  return type.toLowerCase().replace(/_/g, " ");
}

function getSystemPrompt(outputType: ContentType): string {
  const prompts: Record<ContentType, string> = {
    TWEET: "You are a Twitter/X content expert. Create concise, engaging tweets under 280 characters.",
    THREAD: "You are a Twitter/X thread expert. Create engaging thread content with clear numbering (1/, 2/, etc.).",
    LINKEDIN_POST: "You are a LinkedIn content strategist. Create professional, insightful posts that drive engagement.",
    INSTAGRAM_CAPTION: "You are an Instagram content creator. Create engaging captions with relevant emojis and hashtags.",
    BLOG_POST: "You are a content writer. Create well-structured blog posts with headers, paragraphs, and clear takeaways.",
    VIDEO_SCRIPT: "You are a video scriptwriter. Create engaging scripts with clear sections for intro, main content, and call-to-action.",
    NEWSLETTER: "You are a newsletter writer. Create engaging email content with a clear structure and personal tone.",
  };

  return prompts[outputType];
}

function getMaxTokens(outputType: ContentType): number {
  const tokens: Record<ContentType, number> = {
    TWEET: 100,
    THREAD: 1000,
    LINKEDIN_POST: 800,
    INSTAGRAM_CAPTION: 600,
    BLOG_POST: 2000,
    VIDEO_SCRIPT: 1500,
    NEWSLETTER: 1500,
  };

  return tokens[outputType];
}

export async function tweetToThread(userId: string, tweetContent: string) {
  const openai = getOpenAI();

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "Expand a tweet into an engaging Twitter thread. Each tweet should be under 280 characters. Number them as 1/, 2/, etc. Create 5-10 tweets that dive deeper into the topic.",
      },
      {
        role: "user",
        content: `Expand this tweet into a thread:\n\n${tweetContent}`,
      },
    ],
    max_tokens: 1500,
  });

  const threadContent = response.choices[0]?.message?.content || "";

  return prisma.repurposedContent.create({
    data: {
      userId,
      sourceType: ContentType.TWEET,
      sourceContent: tweetContent,
      outputType: ContentType.THREAD,
      outputContent: threadContent,
      outputPlatform: Platform.X,
      status: RepurposeStatus.DRAFT,
    },
  });
}

export async function threadToLinkedIn(userId: string, threadContent: string) {
  return repurposeContent(userId, threadContent, ContentType.THREAD, ContentType.LINKEDIN_POST);
}

export async function blogToSocialPosts(
  userId: string,
  blogContent: string,
  platforms: Platform[] = [Platform.X, Platform.LINKEDIN]
) {
  const results: Array<{ platform: Platform; content: string }> = [];

  for (const platform of platforms) {
    const outputType = platform === Platform.X
      ? ContentType.TWEET
      : platform === Platform.LINKEDIN
        ? ContentType.LINKEDIN_POST
        : ContentType.INSTAGRAM_CAPTION;

    const repurposed = await repurposeContent(
      userId,
      blogContent,
      ContentType.BLOG_POST,
      outputType
    );

    results.push({
      platform,
      content: repurposed.outputContent,
    });
  }

  return results;
}

export async function contentToVideoScript(userId: string, content: string, sourceType: ContentType) {
  const openai = getOpenAI();

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Convert content into a video script with:
- HOOK: Attention-grabbing opening (5-10 seconds)
- INTRO: Brief introduction (10-15 seconds)
- MAIN CONTENT: Key points with visual cues (60-90 seconds)
- CTA: Clear call-to-action (5-10 seconds)

Include [VISUAL CUE] annotations for b-roll or graphics.`,
      },
      {
        role: "user",
        content: `Convert this ${formatContentType(sourceType)} into a video script:\n\n${content}`,
      },
    ],
    max_tokens: 1500,
  });

  return prisma.repurposedContent.create({
    data: {
      userId,
      sourceType,
      sourceContent: content,
      outputType: ContentType.VIDEO_SCRIPT,
      outputContent: response.choices[0]?.message?.content || "",
      status: RepurposeStatus.DRAFT,
    },
  });
}

export async function getUserRepurposedContent(
  userId: string,
  options: {
    status?: RepurposeStatus;
    outputType?: ContentType;
    limit?: number;
    offset?: number;
  } = {}
) {
  return prisma.repurposedContent.findMany({
    where: {
      userId,
      ...(options.status && { status: options.status }),
      ...(options.outputType && { outputType: options.outputType }),
    },
    orderBy: { createdAt: "desc" },
    take: options.limit || 20,
    skip: options.offset || 0,
  });
}

export async function updateRepurposedContent(
  id: string,
  data: {
    outputContent?: string;
    status?: RepurposeStatus;
  }
) {
  return prisma.repurposedContent.update({
    where: { id },
    data,
  });
}

export async function publishRepurposedContent(id: string, userId: string) {
  const repurposed = await prisma.repurposedContent.findUnique({
    where: { id },
  });

  if (!repurposed || repurposed.userId !== userId) {
    throw new Error("Content not found");
  }

  if (!repurposed.outputPlatform) {
    throw new Error("Cannot publish content without a target platform");
  }

  // Create a post from the repurposed content
  const post = await prisma.post.create({
    data: {
      userId,
      platform: repurposed.outputPlatform,
      content: repurposed.outputContent,
      status: "PENDING",
    },
  });

  await prisma.repurposedContent.update({
    where: { id },
    data: {
      status: RepurposeStatus.PUBLISHED,
      postId: post.id,
    },
  });

  return post;
}

export async function suggestRepurposeOptions(content: string): Promise<ContentType[]> {
  const length = content.length;
  const suggestions: ContentType[] = [];

  if (length < 280) {
    // Short content - can be expanded
    suggestions.push(ContentType.THREAD, ContentType.LINKEDIN_POST, ContentType.BLOG_POST);
  } else if (length < 1000) {
    // Medium content
    suggestions.push(ContentType.TWEET, ContentType.LINKEDIN_POST, ContentType.INSTAGRAM_CAPTION);
  } else {
    // Long content - can be condensed
    suggestions.push(ContentType.TWEET, ContentType.THREAD, ContentType.VIDEO_SCRIPT);
  }

  return suggestions;
}
