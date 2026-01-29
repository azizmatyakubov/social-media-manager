import { prisma } from "./prisma";
import { getOpenAI } from "./openai";

export interface OptimalTimeSlot {
  time: string; // HH:mm format
  day: string;
  score: number;
  reason: string;
  expectedEngagementMultiplier: number;
}

export interface BestTimeAnalysis {
  topSlots: OptimalTimeSlot[];
  worstTimes: { time: string; day: string; reason: string }[];
  audienceInsights: {
    mostActiveHours: string[];
    mostActiveDays: string[];
    timezone: string;
  };
  recommendations: string[];
  nextBestSlot: {
    datetime: Date;
    reason: string;
  };
}

// Get user's timezone from their posting config
async function getUserTimezone(userId: string): Promise<string> {
  const config = await prisma.postingConfig.findUnique({
    where: { userId },
    select: { timezone: true },
  });
  return config?.timezone || "UTC";
}

// Convert date to user's timezone for analysis
function getDateInTimezone(date: Date, timezone: string): Date {
  try {
    // Get the date string in the target timezone
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    };
    const formatter = new Intl.DateTimeFormat("en-US", options);
    const parts = formatter.formatToParts(date);

    const partValues: Record<string, string> = {};
    parts.forEach((part) => {
      partValues[part.type] = part.value;
    });

    // Create a new date with the timezone-adjusted values
    const adjustedDate = new Date(date);
    adjustedDate.setHours(parseInt(partValues.hour || "0", 10));
    adjustedDate.setMinutes(parseInt(partValues.minute || "0", 10));

    return adjustedDate;
  } catch {
    return date;
  }
}

// Analyze user's historical data to find best posting times
export async function analyzeOptimalPostingTimes(
  userId: string
): Promise<BestTimeAnalysis> {
  // Get user's timezone
  const userTimezone = await getUserTimezone(userId);

  // Get user's posted content with engagement
  const posts = await prisma.post.findMany({
    where: {
      userId,
      status: "POSTED",
      postedAt: { not: null },
      impressions: { gt: 0 },
    },
    select: {
      postedAt: true,
      likes: true,
      retweets: true,
      replies: true,
      impressions: true,
    },
    orderBy: { postedAt: "desc" },
    take: 100,
  });

  // Group posts by hour and day
  const hourlyEngagement: Record<number, { total: number; count: number }> = {};
  const dailyEngagement: Record<string, { total: number; count: number }> = {};

  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  posts.forEach((post) => {
    if (!post.postedAt) return;

    // Convert to user's timezone for accurate hour/day analysis
    const localDate = getDateInTimezone(post.postedAt, userTimezone);
    const hour = localDate.getHours();
    const day = days[localDate.getDay()];
    const engagementRate =
      ((post.likes + post.retweets + post.replies) / (post.impressions || 1)) *
      100;

    // Hour tracking
    if (!hourlyEngagement[hour]) {
      hourlyEngagement[hour] = { total: 0, count: 0 };
    }
    hourlyEngagement[hour].total += engagementRate;
    hourlyEngagement[hour].count++;

    // Day tracking
    if (!dailyEngagement[day]) {
      dailyEngagement[day] = { total: 0, count: 0 };
    }
    dailyEngagement[day].total += engagementRate;
    dailyEngagement[day].count++;
  });

  // Calculate averages
  const hourlyAverages = Object.entries(hourlyEngagement)
    .map(([hour, data]) => ({
      hour: parseInt(hour),
      avgEngagement: data.total / data.count,
      count: data.count,
    }))
    .sort((a, b) => b.avgEngagement - a.avgEngagement);

  const dailyAverages = Object.entries(dailyEngagement)
    .map(([day, data]) => ({
      day,
      avgEngagement: data.total / data.count,
      count: data.count,
    }))
    .sort((a, b) => b.avgEngagement - a.avgEngagement);

  // If not enough data, use AI to provide general recommendations
  if (posts.length < 10) {
    return await getAIRecommendedTimes(userId);
  }

  // Find top 5 time slots
  const topSlots: OptimalTimeSlot[] = [];
  const topHours = hourlyAverages.slice(0, 5);
  const topDays = dailyAverages.slice(0, 3);

  for (const hour of topHours) {
    for (const day of topDays.slice(0, 2)) {
      const baseEngagement =
        hourlyAverages.length > 0
          ? hourlyAverages.reduce((a, b) => a + b.avgEngagement, 0) /
            hourlyAverages.length
          : 1;

      topSlots.push({
        time: `${hour.hour.toString().padStart(2, "0")}:00`,
        day: day.day,
        score: Math.round(
          ((hour.avgEngagement + day.avgEngagement) / 2 / baseEngagement) * 50 +
            50
        ),
        reason: `Based on ${hour.count} posts at this hour with ${hour.avgEngagement.toFixed(
          2
        )}% avg engagement`,
        expectedEngagementMultiplier:
          Math.round((hour.avgEngagement / (baseEngagement || 1)) * 100) / 100,
      });
    }
  }

  // Sort by score and take top 5
  topSlots.sort((a, b) => b.score - a.score);

  // Find worst times
  const worstHours = hourlyAverages.slice(-3);
  const worstTimes = worstHours.map((h) => ({
    time: `${h.hour.toString().padStart(2, "0")}:00`,
    day: "Any",
    reason: `Low engagement (${h.avgEngagement.toFixed(2)}%) based on ${
      h.count
    } posts`,
  }));

  // Calculate next best slot
  const now = new Date();
  const nextBestSlot = findNextOptimalSlot(topSlots, now);

  return {
    topSlots: topSlots.slice(0, 5),
    worstTimes,
    audienceInsights: {
      mostActiveHours: topHours
        .slice(0, 3)
        .map((h) => `${h.hour.toString().padStart(2, "0")}:00`),
      mostActiveDays: topDays.slice(0, 3).map((d) => d.day),
      timezone: userTimezone,
    },
    recommendations: generateRecommendations(hourlyAverages, dailyAverages),
    nextBestSlot,
  };
}

function findNextOptimalSlot(
  topSlots: OptimalTimeSlot[],
  from: Date
): { datetime: Date; reason: string } {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const checkDate = new Date(from);
    checkDate.setDate(checkDate.getDate() + dayOffset);
    const dayName = days[checkDate.getDay()];

    for (const slot of topSlots) {
      if (slot.day === dayName || slot.day === "Any") {
        const [hours] = slot.time.split(":").map(Number);
        const slotDate = new Date(checkDate);
        slotDate.setHours(hours, 0, 0, 0);

        if (slotDate > from) {
          return {
            datetime: slotDate,
            reason: `${slot.day} at ${slot.time} - ${slot.reason}`,
          };
        }
      }
    }
  }

  // Default to tomorrow at the top slot time
  const tomorrow = new Date(from);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  return {
    datetime: tomorrow,
    reason: "Default recommendation - morning posts typically perform well",
  };
}

function generateRecommendations(
  hourlyAverages: { hour: number; avgEngagement: number; count: number }[],
  dailyAverages: { day: string; avgEngagement: number; count: number }[]
): string[] {
  const recommendations: string[] = [];

  if (hourlyAverages.length > 0) {
    const topHour = hourlyAverages[0];
    recommendations.push(
      `Your audience is most active around ${topHour.hour
        .toString()
        .padStart(2, "0")}:00 with ${topHour.avgEngagement.toFixed(
        2
      )}% engagement`
    );
  }

  if (dailyAverages.length > 0) {
    const topDay = dailyAverages[0];
    recommendations.push(
      `${topDay.day}s show the highest engagement for your content`
    );
  }

  // Morning vs evening analysis
  const morningHours = hourlyAverages.filter((h) => h.hour >= 6 && h.hour < 12);
  const eveningHours = hourlyAverages.filter(
    (h) => h.hour >= 17 && h.hour < 22
  );

  if (morningHours.length > 0 && eveningHours.length > 0) {
    const avgMorning =
      morningHours.reduce((a, b) => a + b.avgEngagement, 0) /
      morningHours.length;
    const avgEvening =
      eveningHours.reduce((a, b) => a + b.avgEngagement, 0) /
      eveningHours.length;

    if (avgMorning > avgEvening * 1.2) {
      recommendations.push(
        "Your morning posts significantly outperform evening posts"
      );
    } else if (avgEvening > avgMorning * 1.2) {
      recommendations.push(
        "Your evening posts significantly outperform morning posts"
      );
    }
  }

  return recommendations;
}

// For users with limited data, use AI recommendations
async function getAIRecommendedTimes(userId: string): Promise<BestTimeAnalysis> {
  // Get user's posting config for context
  const config = await prisma.postingConfig.findUnique({
    where: { userId },
    select: { topics: true, tone: true, timezone: true },
  });

  const systemPrompt = `You are a social media timing expert for X (Twitter).
Based on the user's niche and general X engagement patterns, recommend optimal posting times.

Return JSON with:
{
  "topSlots": [
    { "time": "HH:mm", "day": "DayName", "score": 0-100, "reason": "why", "expectedEngagementMultiplier": 1.0-2.0 }
  ],
  "worstTimes": [{ "time": "HH:mm", "day": "DayName", "reason": "why to avoid" }],
  "audienceInsights": {
    "mostActiveHours": ["HH:mm", "HH:mm", "HH:mm"],
    "mostActiveDays": ["Day", "Day", "Day"],
    "timezone": "UTC"
  },
  "recommendations": ["tip1", "tip2", "tip3"]
}`;

  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 800,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Recommend posting times for a user in the ${
          config?.topics?.join(", ") || "tech/startup"
        } niche with ${config?.tone || "professional"} tone.`,
      },
    ],
  });

  const result = response.choices[0]?.message?.content;
  if (!result) {
    throw new Error("No AI recommendation");
  }

  const aiResult = JSON.parse(result);

  // Calculate next best slot from AI recommendations
  const now = new Date();
  const nextBestSlot = findNextOptimalSlot(aiResult.topSlots || [], now);

  return {
    ...aiResult,
    nextBestSlot,
  };
}

// Get quick suggestion for immediate posting
export async function shouldPostNow(
  userId: string
): Promise<{
  shouldPost: boolean;
  currentScore: number;
  betterTime: { time: string; multiplier: number } | null;
  reason: string;
}> {
  const analysis = await analyzeOptimalPostingTimes(userId);
  const now = new Date();
  const currentHour = now.getHours();
  const currentDay = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ][now.getDay()];

  // Check if current time is in top slots
  const currentSlot = analysis.topSlots.find(
    (slot) =>
      slot.time.startsWith(`${currentHour.toString().padStart(2, "0")}:`) &&
      (slot.day === currentDay || slot.day === "Any")
  );

  if (currentSlot && currentSlot.score >= 70) {
    return {
      shouldPost: true,
      currentScore: currentSlot.score,
      betterTime: null,
      reason: `Great timing! ${currentSlot.reason}`,
    };
  }

  // Find better time in the next few hours
  const betterSlot = analysis.topSlots[0];
  return {
    shouldPost: currentSlot ? currentSlot.score >= 50 : false,
    currentScore: currentSlot?.score || 40,
    betterTime: betterSlot
      ? { time: `${betterSlot.day} ${betterSlot.time}`, multiplier: betterSlot.expectedEngagementMultiplier }
      : null,
    reason: currentSlot
      ? `Posting now is okay, but ${betterSlot?.day} at ${betterSlot?.time} could get ${Math.round(
          (betterSlot?.expectedEngagementMultiplier || 1) * 100 - 100
        )}% more engagement`
      : `Consider waiting until ${betterSlot?.day} at ${betterSlot?.time} for better engagement`,
  };
}
