import { prisma } from "./prisma";
import { Platform } from "@prisma/client";

export interface CreateTemplateInput {
  name: string;
  content: string;
  category?: string;
  shortcut?: string;
  tone?: string;
  platform?: Platform;
  variables?: string[];
}

export interface UpdateTemplateInput extends Partial<CreateTemplateInput> {
  isFavorite?: boolean;
  isActive?: boolean;
}

export async function createReplyTemplate(
  userId: string,
  input: CreateTemplateInput
) {
  // Extract variables from content
  const variableMatches = input.content.match(/\{(\w+)\}/g) || [];
  const variables = variableMatches.map((v) => v.replace(/[{}]/g, ""));

  return prisma.replyTemplate.create({
    data: {
      userId,
      name: input.name,
      content: input.content,
      category: input.category || "general",
      shortcut: input.shortcut || null,
      tone: input.tone || "friendly",
      platform: input.platform || null,
      variables: variables.length > 0 ? variables : input.variables || [],
    },
  });
}

export async function updateReplyTemplate(
  userId: string,
  templateId: string,
  input: UpdateTemplateInput
) {
  // Verify ownership
  const template = await prisma.replyTemplate.findFirst({
    where: { id: templateId, userId },
  });

  if (!template) {
    throw new Error("Template not found");
  }

  // Extract variables if content changed
  let variables = input.variables;
  if (input.content && !variables) {
    const variableMatches = input.content.match(/\{(\w+)\}/g) || [];
    variables = variableMatches.map((v) => v.replace(/[{}]/g, ""));
  }

  return prisma.replyTemplate.update({
    where: { id: templateId },
    data: {
      ...(input.name && { name: input.name }),
      ...(input.content && { content: input.content }),
      ...(input.category && { category: input.category }),
      ...(input.shortcut !== undefined && { shortcut: input.shortcut || null }),
      ...(input.tone && { tone: input.tone }),
      ...(input.platform !== undefined && { platform: input.platform }),
      ...(variables && { variables }),
      ...(input.isFavorite !== undefined && { isFavorite: input.isFavorite }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    },
  });
}

export async function deleteReplyTemplate(userId: string, templateId: string) {
  // Verify ownership
  const template = await prisma.replyTemplate.findFirst({
    where: { id: templateId, userId },
  });

  if (!template) {
    throw new Error("Template not found");
  }

  return prisma.replyTemplate.delete({
    where: { id: templateId },
  });
}

export async function getReplyTemplates(
  userId: string,
  options?: {
    category?: string;
    platform?: Platform;
    favoritesOnly?: boolean;
    search?: string;
    limit?: number;
  }
) {
  const where: Record<string, unknown> = {
    userId,
    isActive: true,
  };

  if (options?.category) {
    where.category = options.category;
  }

  if (options?.platform) {
    where.platform = options.platform;
  }

  if (options?.favoritesOnly) {
    where.isFavorite = true;
  }

  if (options?.search) {
    where.OR = [
      { name: { contains: options.search, mode: "insensitive" } },
      { content: { contains: options.search, mode: "insensitive" } },
      { shortcut: { contains: options.search, mode: "insensitive" } },
    ];
  }

  return prisma.replyTemplate.findMany({
    where,
    orderBy: [
      { isFavorite: "desc" },
      { usedCount: "desc" },
      { createdAt: "desc" },
    ],
    take: options?.limit || 100,
  });
}

export async function getTemplateByShortcut(userId: string, shortcut: string) {
  return prisma.replyTemplate.findFirst({
    where: {
      userId,
      shortcut,
      isActive: true,
    },
  });
}

export async function useTemplate(userId: string, templateId: string) {
  // Verify ownership
  const template = await prisma.replyTemplate.findFirst({
    where: { id: templateId, userId },
  });

  if (!template) {
    throw new Error("Template not found");
  }

  return prisma.replyTemplate.update({
    where: { id: templateId },
    data: {
      usedCount: { increment: 1 },
      lastUsedAt: new Date(),
    },
  });
}

export async function toggleFavorite(userId: string, templateId: string) {
  const template = await prisma.replyTemplate.findFirst({
    where: { id: templateId, userId },
  });

  if (!template) {
    throw new Error("Template not found");
  }

  return prisma.replyTemplate.update({
    where: { id: templateId },
    data: {
      isFavorite: !template.isFavorite,
    },
  });
}

export async function getTemplateCategories(userId: string) {
  const templates = await prisma.replyTemplate.groupBy({
    by: ["category"],
    where: { userId, isActive: true },
    _count: { id: true },
  });

  return templates.map((t) => ({
    name: t.category,
    count: t._count.id,
  }));
}

export function applyVariables(
  content: string,
  variables: Record<string, string>
): string {
  let result = content;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), value);
  }
  return result;
}

// Predefined template suggestions
export const templateSuggestions = [
  {
    name: "Thank you",
    content: "Thank you for your kind words, {name}! Really appreciate the support. 🙏",
    category: "thanks",
    shortcut: "/thanks",
    tone: "friendly",
  },
  {
    name: "Support acknowledgment",
    content: "Hi {name}, thanks for reaching out! I'll look into this and get back to you shortly. 👍",
    category: "support",
    shortcut: "/support",
    tone: "professional",
  },
  {
    name: "Feature request noted",
    content: "Great suggestion, {name}! I've noted this down for consideration. Thanks for the feedback! ✨",
    category: "support",
    shortcut: "/feature",
    tone: "friendly",
  },
  {
    name: "Follow back",
    content: "Hey {name}, thanks for the follow! Excited to connect. Let me know if there's anything I can help with! 🤝",
    category: "greeting",
    shortcut: "/follow",
    tone: "friendly",
  },
  {
    name: "Question response",
    content: "Great question, {name}! Here's my take: ",
    category: "general",
    shortcut: "/answer",
    tone: "professional",
  },
  {
    name: "Collaboration interest",
    content: "Hi {name}! Thanks for thinking of me. I'd love to explore this further. Could you send me more details via DM? 📬",
    category: "sales",
    shortcut: "/collab",
    tone: "professional",
  },
  {
    name: "Not interested politely",
    content: "Thanks for reaching out, {name}! I appreciate the offer, but it's not quite the right fit for me at the moment. Best of luck! 👋",
    category: "general",
    shortcut: "/pass",
    tone: "friendly",
  },
  {
    name: "Link to resource",
    content: "Hey {name}! Check out this resource that might help: {link}",
    category: "support",
    shortcut: "/link",
    tone: "helpful",
  },
];

export async function createDefaultTemplates(userId: string) {
  const existingCount = await prisma.replyTemplate.count({
    where: { userId },
  });

  // Only create defaults if user has no templates
  if (existingCount > 0) {
    return [];
  }

  const templates = await Promise.all(
    templateSuggestions.map((t) =>
      prisma.replyTemplate.create({
        data: {
          userId,
          name: t.name,
          content: t.content,
          category: t.category,
          shortcut: t.shortcut,
          tone: t.tone,
          variables: t.content.match(/\{(\w+)\}/g)?.map((v) => v.replace(/[{}]/g, "")) || [],
        },
      })
    )
  );

  return templates;
}
