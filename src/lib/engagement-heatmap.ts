// Engagement Heatmap Analytics

export interface HeatmapData {
  hour: number; // 0-23
  day: number; // 0-6 (Sunday-Saturday)
  value: number; // engagement score
  posts: number;
  avgLikes: number;
  avgComments: number;
  avgShares: number;
  avgReach: number;
}

export interface EngagementAnalytics {
  id: string;
  userId: string;
  platform: string;
  period: "7d" | "30d" | "90d";
  heatmapData: HeatmapData[];
  bestTimes: BestTime[];
  worstTimes: BestTime[];
  insights: EngagementInsight[];
  summary: EngagementSummary;
  generatedAt: Date;
}

export interface BestTime {
  day: string;
  hour: string;
  score: number;
  avgEngagement: number;
  confidence: "high" | "medium" | "low";
}

export interface EngagementInsight {
  id: string;
  type: "peak" | "trend" | "anomaly" | "recommendation";
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  actionable: boolean;
}

export interface EngagementSummary {
  totalPosts: number;
  totalEngagements: number;
  avgEngagementRate: number;
  peakDay: string;
  peakHour: string;
  lowestDay: string;
  lowestHour: string;
  weekdayVsWeekend: {
    weekday: number;
    weekend: number;
  };
  morningVsEvening: {
    morning: number; // 6am-12pm
    afternoon: number; // 12pm-6pm
    evening: number; // 6pm-12am
    night: number; // 12am-6am
  };
}

export interface PostPerformance {
  id: string;
  content: string;
  platform: string;
  publishedAt: Date;
  dayOfWeek: number;
  hourOfDay: number;
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  engagementRate: number;
  performanceScore: number;
}

// Day names
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// In-memory storage
const analyticsStore = new Map<string, EngagementAnalytics>();
const postsStore = new Map<string, PostPerformance[]>();

// Generate realistic heatmap data
function generateHeatmapData(platform: string): HeatmapData[] {
  const data: HeatmapData[] = [];

  // Platform-specific patterns
  const patterns: Record<string, { peakHours: number[]; peakDays: number[] }> = {
    instagram: { peakHours: [9, 11, 14, 19, 21], peakDays: [1, 2, 3, 4] },
    twitter: { peakHours: [8, 12, 17, 21], peakDays: [1, 2, 3, 4, 5] },
    facebook: { peakHours: [9, 13, 16, 20], peakDays: [3, 4, 5] },
    linkedin: { peakHours: [7, 8, 12, 17, 18], peakDays: [1, 2, 3, 4] },
    tiktok: { peakHours: [7, 10, 19, 22, 23], peakDays: [1, 2, 4, 5, 6] },
  };

  const pattern = patterns[platform] || patterns.instagram;

  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      const isPeakHour = pattern.peakHours.includes(hour);
      const isPeakDay = pattern.peakDays.includes(day);

      let baseValue = 20 + Math.random() * 20;

      if (isPeakHour) baseValue += 30;
      if (isPeakDay) baseValue += 20;
      if (isPeakHour && isPeakDay) baseValue += 15;

      // Add some randomness
      baseValue += (Math.random() - 0.5) * 15;

      // Night hours have lower engagement
      if (hour >= 0 && hour < 6) baseValue *= 0.3;

      const value = Math.max(0, Math.min(100, baseValue));
      const posts = Math.floor(Math.random() * 5) + 1;

      data.push({
        hour,
        day,
        value: Math.round(value),
        posts,
        avgLikes: Math.round(value * 10 + Math.random() * 100),
        avgComments: Math.round(value * 0.5 + Math.random() * 20),
        avgShares: Math.round(value * 0.2 + Math.random() * 10),
        avgReach: Math.round(value * 50 + Math.random() * 500),
      });
    }
  }

  return data;
}

function generateBestTimes(heatmapData: HeatmapData[]): BestTime[] {
  const sorted = [...heatmapData].sort((a, b) => b.value - a.value);
  const best = sorted.slice(0, 5);

  return best.map((item, index) => ({
    day: DAYS[item.day],
    hour: formatHour(item.hour),
    score: item.value,
    avgEngagement: item.avgLikes + item.avgComments + item.avgShares,
    confidence: index < 2 ? "high" : index < 4 ? "medium" : "low",
  }));
}

function generateWorstTimes(heatmapData: HeatmapData[]): BestTime[] {
  const sorted = [...heatmapData]
    .filter((d) => d.hour >= 6 && d.hour <= 23) // Exclude night hours
    .sort((a, b) => a.value - b.value);
  const worst = sorted.slice(0, 3);

  return worst.map((item) => ({
    day: DAYS[item.day],
    hour: formatHour(item.hour),
    score: item.value,
    avgEngagement: item.avgLikes + item.avgComments + item.avgShares,
    confidence: "high",
  }));
}

function formatHour(hour: number): string {
  if (hour === 0) return "12:00 AM";
  if (hour === 12) return "12:00 PM";
  if (hour < 12) return `${hour}:00 AM`;
  return `${hour - 12}:00 PM`;
}

function generateInsights(heatmapData: HeatmapData[], platform: string): EngagementInsight[] {
  const insights: EngagementInsight[] = [];

  // Find peak patterns
  const peakSlot = heatmapData.reduce((max, curr) => (curr.value > max.value ? curr : max));
  insights.push({
    id: "peak-1",
    type: "peak",
    title: `Peak Engagement: ${DAYS[peakSlot.day]} at ${formatHour(peakSlot.hour)}`,
    description: `Your audience is most active on ${DAYS[peakSlot.day]}s around ${formatHour(peakSlot.hour)}. Posts during this time see ${peakSlot.value}% higher engagement.`,
    impact: "high",
    actionable: true,
  });

  // Weekday vs weekend analysis
  const weekdayData = heatmapData.filter((d) => d.day >= 1 && d.day <= 5);
  const weekendData = heatmapData.filter((d) => d.day === 0 || d.day === 6);
  const weekdayAvg = weekdayData.reduce((sum, d) => sum + d.value, 0) / weekdayData.length;
  const weekendAvg = weekendData.reduce((sum, d) => sum + d.value, 0) / weekendData.length;

  if (weekdayAvg > weekendAvg * 1.2) {
    insights.push({
      id: "trend-1",
      type: "trend",
      title: "Weekday Engagement Dominates",
      description: `Your weekday posts perform ${Math.round((weekdayAvg / weekendAvg - 1) * 100)}% better than weekend posts. Consider focusing your content on Monday-Friday.`,
      impact: "medium",
      actionable: true,
    });
  }

  // Morning vs evening
  const morningData = heatmapData.filter((d) => d.hour >= 6 && d.hour < 12);
  const eveningData = heatmapData.filter((d) => d.hour >= 18 && d.hour < 24);
  const morningAvg = morningData.reduce((sum, d) => sum + d.value, 0) / morningData.length;
  const eveningAvg = eveningData.reduce((sum, d) => sum + d.value, 0) / eveningData.length;

  if (eveningAvg > morningAvg * 1.15) {
    insights.push({
      id: "trend-2",
      type: "trend",
      title: "Evening Content Performs Better",
      description: `Evening posts (6PM-12AM) see ${Math.round((eveningAvg / morningAvg - 1) * 100)}% more engagement than morning posts. Shift your schedule accordingly.`,
      impact: "medium",
      actionable: true,
    });
  }

  // Platform-specific recommendation
  const recommendations: Record<string, string> = {
    instagram: "Instagram Reels posted between 7-9 PM tend to get 50% more reach. Try posting video content during these peak hours.",
    twitter: "Twitter engagement peaks during commute hours. Consider scheduling tweets for 8-9 AM and 5-6 PM.",
    linkedin: "LinkedIn sees highest engagement during work hours. Tuesday-Thursday mornings are optimal for B2B content.",
    tiktok: "TikTok's algorithm favors consistent posting. Aim for 1-3 posts during your peak hours daily.",
    facebook: "Facebook engagement is strongest mid-week. Wednesday afternoons often see the best performance.",
  };

  insights.push({
    id: "rec-1",
    type: "recommendation",
    title: `${platform.charAt(0).toUpperCase() + platform.slice(1)} Optimization Tip`,
    description: recommendations[platform] || recommendations.instagram,
    impact: "high",
    actionable: true,
  });

  return insights;
}

function generateSummary(heatmapData: HeatmapData[]): EngagementSummary {
  const peakSlot = heatmapData.reduce((max, curr) => (curr.value > max.value ? curr : max));
  const lowestSlot = heatmapData
    .filter((d) => d.hour >= 6 && d.hour <= 23)
    .reduce((min, curr) => (curr.value < min.value ? curr : min));

  const weekdayData = heatmapData.filter((d) => d.day >= 1 && d.day <= 5);
  const weekendData = heatmapData.filter((d) => d.day === 0 || d.day === 6);

  const morningData = heatmapData.filter((d) => d.hour >= 6 && d.hour < 12);
  const afternoonData = heatmapData.filter((d) => d.hour >= 12 && d.hour < 18);
  const eveningData = heatmapData.filter((d) => d.hour >= 18 && d.hour < 24);
  const nightData = heatmapData.filter((d) => d.hour >= 0 && d.hour < 6);

  const totalPosts = heatmapData.reduce((sum, d) => sum + d.posts, 0);
  const totalEngagements = heatmapData.reduce(
    (sum, d) => sum + d.avgLikes + d.avgComments + d.avgShares,
    0
  );

  return {
    totalPosts,
    totalEngagements,
    avgEngagementRate: Math.round((totalEngagements / totalPosts / 100) * 100) / 100,
    peakDay: DAYS[peakSlot.day],
    peakHour: formatHour(peakSlot.hour),
    lowestDay: DAYS[lowestSlot.day],
    lowestHour: formatHour(lowestSlot.hour),
    weekdayVsWeekend: {
      weekday: Math.round(weekdayData.reduce((sum, d) => sum + d.value, 0) / weekdayData.length),
      weekend: Math.round(weekendData.reduce((sum, d) => sum + d.value, 0) / weekendData.length),
    },
    morningVsEvening: {
      morning: Math.round(morningData.reduce((sum, d) => sum + d.value, 0) / morningData.length),
      afternoon: Math.round(afternoonData.reduce((sum, d) => sum + d.value, 0) / afternoonData.length),
      evening: Math.round(eveningData.reduce((sum, d) => sum + d.value, 0) / eveningData.length),
      night: Math.round(nightData.reduce((sum, d) => sum + d.value, 0) / nightData.length),
    },
  };
}

// Initialize demo data
function initializeDemoData(userId: string): void {
  const platforms = ["instagram", "twitter", "linkedin"];

  platforms.forEach((platform) => {
    const key = `${userId}-${platform}-30d`;
    if (analyticsStore.has(key)) return;

    const heatmapData = generateHeatmapData(platform);
    const analytics: EngagementAnalytics = {
      id: key,
      userId,
      platform,
      period: "30d",
      heatmapData,
      bestTimes: generateBestTimes(heatmapData),
      worstTimes: generateWorstTimes(heatmapData),
      insights: generateInsights(heatmapData, platform),
      summary: generateSummary(heatmapData),
      generatedAt: new Date(),
    };

    analyticsStore.set(key, analytics);
  });
}

// API Functions
export function getEngagementAnalytics(
  userId: string,
  platform: string,
  period: "7d" | "30d" | "90d" = "30d"
): EngagementAnalytics | null {
  initializeDemoData(userId);
  const key = `${userId}-${platform}-${period}`;

  let analytics = analyticsStore.get(key);

  if (!analytics) {
    // Generate for requested period
    const heatmapData = generateHeatmapData(platform);
    analytics = {
      id: key,
      userId,
      platform,
      period,
      heatmapData,
      bestTimes: generateBestTimes(heatmapData),
      worstTimes: generateWorstTimes(heatmapData),
      insights: generateInsights(heatmapData, platform),
      summary: generateSummary(heatmapData),
      generatedAt: new Date(),
    };
    analyticsStore.set(key, analytics);
  }

  return analytics;
}

export function getAllPlatformAnalytics(userId: string): EngagementAnalytics[] {
  initializeDemoData(userId);
  return Array.from(analyticsStore.values()).filter(
    (a) => a.userId === userId && a.period === "30d"
  );
}

export function getHeatmapComparison(
  userId: string,
  platforms: string[]
): Record<string, HeatmapData[]> {
  initializeDemoData(userId);
  const result: Record<string, HeatmapData[]> = {};

  platforms.forEach((platform) => {
    const analytics = getEngagementAnalytics(userId, platform);
    if (analytics) {
      result[platform] = analytics.heatmapData;
    }
  });

  return result;
}

export function getOptimalPostingSchedule(userId: string, platform: string): {
  daily: { hour: number; score: number }[];
  weekly: { day: number; score: number }[];
  recommendations: string[];
} {
  const analytics = getEngagementAnalytics(userId, platform);
  if (!analytics) {
    return { daily: [], weekly: [], recommendations: [] };
  }

  // Get best hour for each day
  const daily: { hour: number; score: number }[] = [];
  for (let hour = 0; hour < 24; hour++) {
    const hourData = analytics.heatmapData.filter((d) => d.hour === hour);
    const avgScore = hourData.reduce((sum, d) => sum + d.value, 0) / hourData.length;
    daily.push({ hour, score: Math.round(avgScore) });
  }

  // Get best day scores
  const weekly: { day: number; score: number }[] = [];
  for (let day = 0; day < 7; day++) {
    const dayData = analytics.heatmapData.filter((d) => d.day === day);
    const avgScore = dayData.reduce((sum, d) => sum + d.value, 0) / dayData.length;
    weekly.push({ day, score: Math.round(avgScore) });
  }

  const recommendations = [
    `Best time to post: ${analytics.summary.peakDay} at ${analytics.summary.peakHour}`,
    `Avoid posting on ${analytics.summary.lowestDay} at ${analytics.summary.lowestHour}`,
    analytics.summary.weekdayVsWeekend.weekday > analytics.summary.weekdayVsWeekend.weekend
      ? "Focus on weekday posting for better engagement"
      : "Weekend posts perform well for your audience",
  ];

  return { daily, weekly, recommendations };
}

export function getEngagementStats(userId: string): {
  platforms: { platform: string; avgEngagement: number; peakTime: string }[];
  overallBestTime: { day: string; hour: string };
  weekdayVsWeekend: { weekday: number; weekend: number };
} {
  initializeDemoData(userId);
  const allAnalytics = getAllPlatformAnalytics(userId);

  const platforms = allAnalytics.map((a) => ({
    platform: a.platform,
    avgEngagement: a.summary.avgEngagementRate,
    peakTime: `${a.summary.peakDay} ${a.summary.peakHour}`,
  }));

  // Find overall best time across platforms
  let bestSlot = { day: 0, hour: 0, totalScore: 0 };
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      let totalScore = 0;
      allAnalytics.forEach((a) => {
        const slot = a.heatmapData.find((d) => d.day === day && d.hour === hour);
        if (slot) totalScore += slot.value;
      });
      if (totalScore > bestSlot.totalScore) {
        bestSlot = { day, hour, totalScore };
      }
    }
  }

  const weekdayTotal = allAnalytics.reduce(
    (sum, a) => sum + a.summary.weekdayVsWeekend.weekday,
    0
  );
  const weekendTotal = allAnalytics.reduce(
    (sum, a) => sum + a.summary.weekdayVsWeekend.weekend,
    0
  );

  return {
    platforms,
    overallBestTime: {
      day: DAYS[bestSlot.day],
      hour: formatHour(bestSlot.hour),
    },
    weekdayVsWeekend: {
      weekday: Math.round(weekdayTotal / allAnalytics.length),
      weekend: Math.round(weekendTotal / allAnalytics.length),
    },
  };
}

export const PLATFORMS = [
  { id: "instagram", name: "Instagram", icon: "📸" },
  { id: "twitter", name: "X (Twitter)", icon: "𝕏" },
  { id: "facebook", name: "Facebook", icon: "📘" },
  { id: "linkedin", name: "LinkedIn", icon: "💼" },
  { id: "tiktok", name: "TikTok", icon: "🎵" },
];

export const PERIODS = [
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "90d", label: "Last 90 Days" },
];

export { DAYS };
