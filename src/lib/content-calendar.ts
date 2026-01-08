import { prisma } from "./prisma";
import { getOpenAI } from "./openai";
import { Platform, SlotStatus } from "@prisma/client";

export interface CalendarGenerationOptions {
  startDate: Date;
  endDate: Date;
  postsPerDay: number;
  platforms: Platform[];
  themes: string[];
  timezone: string;
}

export async function generateCalendarContent(
  userId: string,
  calendarId: string,
  options: CalendarGenerationOptions
) {
  const voiceProfile = await prisma.voiceProfile.findUnique({
    where: { userId },
  });

  const postingConfig = await prisma.postingConfig.findUnique({
    where: { userId },
  });

  const trends = await prisma.trendCache.findFirst({
    where: { category: "general" },
    orderBy: { fetchedAt: "desc" },
  });

  const openai = getOpenAI();
  const slots: Array<{
    date: Date;
    time: string;
    platform: Platform;
    suggestedContent: string;
    contentTheme: string;
  }> = [];

  const currentDate = new Date(options.startDate);
  const defaultTimes = ["09:00", "13:00", "18:00"];

  while (currentDate <= options.endDate) {
    for (let i = 0; i < options.postsPerDay; i++) {
      for (const platform of options.platforms) {
        const theme = options.themes[Math.floor(Math.random() * options.themes.length)] || "general";
        const time = defaultTimes[i % defaultTimes.length];

        const prompt = buildCalendarPrompt({
          platform,
          theme,
          voiceProfile,
          postingConfig,
          trends: trends?.trends as Array<{ name: string }> | undefined,
          date: new Date(currentDate),
        });

        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are a social media content expert. Generate engaging ${platform} content.`,
            },
            { role: "user", content: prompt },
          ],
          max_tokens: 500,
        });

        const content = response.choices[0]?.message?.content || "";

        slots.push({
          date: new Date(currentDate),
          time,
          platform,
          suggestedContent: content,
          contentTheme: theme,
        });
      }
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Batch create calendar slots
  const createdSlots = await Promise.all(
    slots.map((slot) =>
      prisma.calendarSlot.create({
        data: {
          calendarId,
          date: slot.date,
          time: slot.time,
          platform: slot.platform,
          suggestedContent: slot.suggestedContent,
          contentTheme: slot.contentTheme,
          status: SlotStatus.SUGGESTED,
        },
      })
    )
  );

  return createdSlots;
}

function buildCalendarPrompt(options: {
  platform: Platform;
  theme: string;
  voiceProfile: { styleAnalysis?: string | null; toneKeywords: string[] } | null;
  postingConfig: { tone?: string; topics?: string[] } | null;
  trends?: Array<{ name: string }>;
  date: Date;
}) {
  const dayOfWeek = options.date.toLocaleDateString("en-US", { weekday: "long" });

  let prompt = `Generate a ${options.platform} post for ${dayOfWeek} about "${options.theme}".`;

  if (options.voiceProfile?.styleAnalysis) {
    prompt += `\n\nWriting style: ${options.voiceProfile.styleAnalysis}`;
  }

  if (options.postingConfig?.tone) {
    prompt += `\nTone: ${options.postingConfig.tone}`;
  }

  if (options.trends && options.trends.length > 0) {
    const trendNames = options.trends.slice(0, 5).map((t) => t.name).join(", ");
    prompt += `\n\nConsider these trending topics if relevant: ${trendNames}`;
  }

  const limits: Record<Platform, number> = {
    X: 280,
    LINKEDIN: 3000,
    INSTAGRAM: 2200,
  };

  prompt += `\n\nCharacter limit: ${limits[options.platform]} characters.`;
  prompt += `\nProvide only the post content, no explanations.`;

  return prompt;
}

export async function getCalendarWithSlots(calendarId: string, startDate: Date, endDate: Date) {
  return prisma.contentCalendar.findUnique({
    where: { id: calendarId },
    include: {
      slots: {
        where: {
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: [{ date: "asc" }, { time: "asc" }],
      },
    },
  });
}

export async function approveSlot(slotId: string, content?: string) {
  return prisma.calendarSlot.update({
    where: { id: slotId },
    data: {
      status: SlotStatus.FILLED,
      content: content || undefined,
    },
  });
}

export async function publishSlotAsPost(slotId: string, userId: string) {
  const slot = await prisma.calendarSlot.findUnique({
    where: { id: slotId },
  });

  if (!slot || !slot.content) {
    throw new Error("Slot not found or has no content");
  }

  const post = await prisma.post.create({
    data: {
      userId,
      platform: slot.platform,
      content: slot.content,
      scheduledFor: new Date(`${slot.date.toISOString().split("T")[0]}T${slot.time}:00Z`),
      status: "SCHEDULED",
    },
  });

  await prisma.calendarSlot.update({
    where: { id: slotId },
    data: {
      status: SlotStatus.PUBLISHED,
      postId: post.id,
    },
  });

  return post;
}

export async function createCalendar(
  userId: string,
  data: {
    name: string;
    description?: string;
    timezone?: string;
    postsPerDay?: number;
    preferredTimes?: string[];
    contentThemes?: string[];
    autoGenerate?: boolean;
  }
) {
  return prisma.contentCalendar.create({
    data: {
      userId,
      name: data.name,
      description: data.description,
      timezone: data.timezone || "UTC",
      postsPerDay: data.postsPerDay || 3,
      preferredTimes: data.preferredTimes || ["09:00", "13:00", "18:00"],
      contentThemes: data.contentThemes || [],
      autoGenerate: data.autoGenerate || false,
    },
  });
}
