// Social Media Goals Tracker

export interface Goal {
  id: string;
  userId: string;
  name: string;
  description: string;
  category: GoalCategory;
  type: GoalType;
  platform: string | "all";
  metric: GoalMetric;
  targetValue: number;
  currentValue: number;
  startValue: number;
  startDate: Date;
  endDate: Date;
  milestones: Milestone[];
  status: "active" | "completed" | "failed" | "paused";
  priority: "low" | "medium" | "high";
  progress: number; // 0-100
  progressHistory: ProgressEntry[];
  insights: GoalInsight[];
  notifications: NotificationSettings;
  createdAt: Date;
  updatedAt: Date;
}

export type GoalCategory =
  | "growth"
  | "engagement"
  | "content"
  | "reach"
  | "conversion"
  | "brand"
  | "revenue";

export type GoalType =
  | "increase"
  | "decrease"
  | "maintain"
  | "reach_target";

export type GoalMetric =
  | "followers"
  | "engagement_rate"
  | "posts_published"
  | "impressions"
  | "reach"
  | "clicks"
  | "conversions"
  | "revenue"
  | "response_time"
  | "likes_per_post"
  | "comments_per_post"
  | "shares_per_post"
  | "video_views"
  | "story_views"
  | "website_traffic";

export interface Milestone {
  id: string;
  name: string;
  targetValue: number;
  achievedAt?: Date;
  isAchieved: boolean;
  reward?: string;
}

export interface ProgressEntry {
  date: Date;
  value: number;
  change: number;
  notes?: string;
}

export interface GoalInsight {
  id: string;
  type: "tip" | "warning" | "success" | "info";
  message: string;
  createdAt: Date;
}

export interface NotificationSettings {
  onMilestone: boolean;
  onProgress: boolean;
  dailyReminder: boolean;
  weeklyReport: boolean;
}

export interface GoalTemplate {
  id: string;
  name: string;
  description: string;
  category: GoalCategory;
  metric: GoalMetric;
  suggestedTarget: number;
  suggestedDuration: number; // days
  tips: string[];
}

// Goal templates
const GOAL_TEMPLATES: GoalTemplate[] = [
  {
    id: "grow-followers",
    name: "Grow Followers",
    description: "Increase your follower count",
    category: "growth",
    metric: "followers",
    suggestedTarget: 1000,
    suggestedDuration: 90,
    tips: ["Post consistently", "Engage with your audience", "Use relevant hashtags"],
  },
  {
    id: "boost-engagement",
    name: "Boost Engagement Rate",
    description: "Improve your engagement rate",
    category: "engagement",
    metric: "engagement_rate",
    suggestedTarget: 5,
    suggestedDuration: 30,
    tips: ["Ask questions in posts", "Respond to comments quickly", "Create shareable content"],
  },
  {
    id: "content-consistency",
    name: "Post Consistently",
    description: "Publish content regularly",
    category: "content",
    metric: "posts_published",
    suggestedTarget: 30,
    suggestedDuration: 30,
    tips: ["Use a content calendar", "Batch create content", "Schedule posts in advance"],
  },
  {
    id: "increase-reach",
    name: "Expand Reach",
    description: "Reach more people with your content",
    category: "reach",
    metric: "reach",
    suggestedTarget: 50000,
    suggestedDuration: 30,
    tips: ["Optimize posting times", "Use trending hashtags", "Collaborate with others"],
  },
  {
    id: "drive-traffic",
    name: "Drive Website Traffic",
    description: "Get more clicks to your website",
    category: "conversion",
    metric: "clicks",
    suggestedTarget: 500,
    suggestedDuration: 30,
    tips: ["Include clear CTAs", "Use link in bio", "Create compelling preview content"],
  },
  {
    id: "video-views",
    name: "Increase Video Views",
    description: "Get more views on your videos",
    category: "reach",
    metric: "video_views",
    suggestedTarget: 10000,
    suggestedDuration: 30,
    tips: ["Create attention-grabbing thumbnails", "Hook viewers in first 3 seconds", "Use trending audio"],
  },
];

// In-memory storage
const goalsStore = new Map<string, Goal>();

// Demo data generator
function generateDemoGoals(userId: string): Goal[] {
  const now = new Date();
  const goals: Goal[] = [
    {
      id: `goal-1-${userId}`,
      userId,
      name: "Grow to 10K Followers",
      description: "Reach 10,000 followers on Instagram by end of Q1",
      category: "growth",
      type: "reach_target",
      platform: "instagram",
      metric: "followers",
      targetValue: 10000,
      currentValue: 7850,
      startValue: 5000,
      startDate: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      milestones: [
        { id: "m1", name: "6K Followers", targetValue: 6000, achievedAt: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000), isAchieved: true },
        { id: "m2", name: "7K Followers", targetValue: 7000, achievedAt: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000), isAchieved: true },
        { id: "m3", name: "8K Followers", targetValue: 8000, isAchieved: false },
        { id: "m4", name: "9K Followers", targetValue: 9000, isAchieved: false },
        { id: "m5", name: "10K Followers", targetValue: 10000, isAchieved: false, reward: "Swipe up feature!" },
      ],
      status: "active",
      priority: "high",
      progress: 57,
      progressHistory: generateProgressHistory(5000, 7850, 60),
      insights: [
        { id: "i1", type: "success", message: "You're on track to reach your goal!", createdAt: new Date() },
        { id: "i2", type: "tip", message: "Try posting Reels to accelerate growth", createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) },
      ],
      notifications: { onMilestone: true, onProgress: true, dailyReminder: false, weeklyReport: true },
      createdAt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    },
    {
      id: `goal-2-${userId}`,
      userId,
      name: "5% Engagement Rate",
      description: "Achieve 5% average engagement rate on Twitter",
      category: "engagement",
      type: "reach_target",
      platform: "twitter",
      metric: "engagement_rate",
      targetValue: 5,
      currentValue: 3.8,
      startValue: 2.1,
      startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
      milestones: [
        { id: "m1", name: "3% Engagement", targetValue: 3, achievedAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000), isAchieved: true },
        { id: "m2", name: "4% Engagement", targetValue: 4, isAchieved: false },
        { id: "m3", name: "5% Engagement", targetValue: 5, isAchieved: false },
      ],
      status: "active",
      priority: "medium",
      progress: 59,
      progressHistory: generateProgressHistory(2.1, 3.8, 30),
      insights: [
        { id: "i1", type: "tip", message: "Reply to comments within 1 hour for better engagement", createdAt: new Date() },
      ],
      notifications: { onMilestone: true, onProgress: false, dailyReminder: false, weeklyReport: true },
      createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    },
    {
      id: `goal-3-${userId}`,
      userId,
      name: "Post 5 Times Per Week",
      description: "Maintain consistent posting schedule across platforms",
      category: "content",
      type: "maintain",
      platform: "all",
      metric: "posts_published",
      targetValue: 20,
      currentValue: 18,
      startValue: 0,
      startDate: new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      milestones: [
        { id: "m1", name: "5 Posts", targetValue: 5, achievedAt: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000), isAchieved: true },
        { id: "m2", name: "10 Posts", targetValue: 10, achievedAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000), isAchieved: true },
        { id: "m3", name: "15 Posts", targetValue: 15, achievedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), isAchieved: true },
        { id: "m4", name: "20 Posts", targetValue: 20, isAchieved: false },
      ],
      status: "active",
      priority: "high",
      progress: 90,
      progressHistory: generateProgressHistory(0, 18, 28),
      insights: [
        { id: "i1", type: "success", message: "Almost there! 2 more posts to hit your goal", createdAt: new Date() },
        { id: "i2", type: "info", message: "Your posting consistency has improved 40%", createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000) },
      ],
      notifications: { onMilestone: true, onProgress: true, dailyReminder: true, weeklyReport: true },
      createdAt: new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    },
  ];

  goals.forEach((g) => goalsStore.set(g.id, g));
  return goals;
}

function generateProgressHistory(start: number, current: number, days: number): ProgressEntry[] {
  const history: ProgressEntry[] = [];
  const increment = (current - start) / days;

  for (let i = 0; i <= days; i++) {
    const date = new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000);
    const value = start + increment * i + (Math.random() - 0.5) * increment * 2;
    const prevValue = history.length > 0 ? history[history.length - 1].value : start;
    history.push({
      date,
      value: Math.max(start, Math.round(value * 100) / 100),
      change: Math.round((value - prevValue) * 100) / 100,
    });
  }

  return history;
}

// Initialize demo data
function initializeDemoData(userId: string): void {
  if (goalsStore.has(`goal-1-${userId}`)) return;
  generateDemoGoals(userId);
}

// API Functions
export function getUserGoals(userId: string, status?: Goal["status"]): Goal[] {
  initializeDemoData(userId);
  let goals = Array.from(goalsStore.values()).filter((g) => g.userId === userId);
  if (status) {
    goals = goals.filter((g) => g.status === status);
  }
  return goals.sort((a, b) => b.priority.localeCompare(a.priority));
}

export function getGoal(goalId: string): Goal | null {
  return goalsStore.get(goalId) || null;
}

export function createGoal(
  userId: string,
  data: Omit<Goal, "id" | "userId" | "currentValue" | "progress" | "progressHistory" | "insights" | "createdAt" | "updatedAt">
): Goal {
  const progress = ((data.startValue - data.startValue) / (data.targetValue - data.startValue)) * 100;

  const goal: Goal = {
    ...data,
    id: `goal-${Date.now()}`,
    userId,
    currentValue: data.startValue,
    progress: 0,
    progressHistory: [{ date: new Date(), value: data.startValue, change: 0 }],
    insights: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  goalsStore.set(goal.id, goal);
  return goal;
}

export function updateGoal(goalId: string, userId: string, updates: Partial<Goal>): Goal | null {
  const goal = goalsStore.get(goalId);
  if (!goal || goal.userId !== userId) return null;

  // Recalculate progress if currentValue changed
  if (updates.currentValue !== undefined) {
    const range = goal.targetValue - goal.startValue;
    const achieved = updates.currentValue - goal.startValue;
    updates.progress = Math.min(100, Math.max(0, (achieved / range) * 100));

    // Add to progress history
    goal.progressHistory.push({
      date: new Date(),
      value: updates.currentValue,
      change: updates.currentValue - goal.currentValue,
    });

    // Check milestones
    goal.milestones.forEach((milestone) => {
      if (!milestone.isAchieved && updates.currentValue! >= milestone.targetValue) {
        milestone.isAchieved = true;
        milestone.achievedAt = new Date();
        goal.insights.push({
          id: `insight-${Date.now()}`,
          type: "success",
          message: `Milestone achieved: ${milestone.name}!`,
          createdAt: new Date(),
        });
      }
    });

    // Check if goal completed
    if (updates.currentValue >= goal.targetValue) {
      updates.status = "completed";
      goal.insights.push({
        id: `insight-${Date.now()}`,
        type: "success",
        message: "Congratulations! You've achieved your goal!",
        createdAt: new Date(),
      });
    }
  }

  const updated = { ...goal, ...updates, updatedAt: new Date() };
  goalsStore.set(goalId, updated);
  return updated;
}

export function deleteGoal(goalId: string, userId: string): boolean {
  const goal = goalsStore.get(goalId);
  if (!goal || goal.userId !== userId) return false;
  return goalsStore.delete(goalId);
}

export function addMilestone(
  goalId: string,
  userId: string,
  milestone: Omit<Milestone, "id" | "isAchieved">
): Goal | null {
  const goal = goalsStore.get(goalId);
  if (!goal || goal.userId !== userId) return null;

  goal.milestones.push({
    ...milestone,
    id: `milestone-${Date.now()}`,
    isAchieved: goal.currentValue >= milestone.targetValue,
    achievedAt: goal.currentValue >= milestone.targetValue ? new Date() : undefined,
  });

  goal.milestones.sort((a, b) => a.targetValue - b.targetValue);
  goal.updatedAt = new Date();
  goalsStore.set(goalId, goal);
  return goal;
}

export function getGoalTemplates(): GoalTemplate[] {
  return GOAL_TEMPLATES;
}

export function createGoalFromTemplate(
  userId: string,
  templateId: string,
  customizations: {
    name?: string;
    targetValue?: number;
    duration?: number;
    platform?: string;
  }
): Goal | null {
  const template = GOAL_TEMPLATES.find((t) => t.id === templateId);
  if (!template) return null;

  const now = new Date();
  const duration = customizations.duration || template.suggestedDuration;
  const targetValue = customizations.targetValue || template.suggestedTarget;

  return createGoal(userId, {
    name: customizations.name || template.name,
    description: template.description,
    category: template.category,
    type: "reach_target",
    platform: customizations.platform || "all",
    metric: template.metric,
    targetValue,
    startValue: 0,
    startDate: now,
    endDate: new Date(now.getTime() + duration * 24 * 60 * 60 * 1000),
    milestones: generateDefaultMilestones(targetValue),
    status: "active",
    priority: "medium",
    notifications: { onMilestone: true, onProgress: true, dailyReminder: false, weeklyReport: true },
  });
}

function generateDefaultMilestones(target: number): Milestone[] {
  const milestones: Milestone[] = [];
  const increments = [25, 50, 75, 100];

  increments.forEach((percent, index) => {
    const value = Math.round((target * percent) / 100);
    milestones.push({
      id: `m-${index}`,
      name: `${percent}% Complete`,
      targetValue: value,
      isAchieved: false,
    });
  });

  return milestones;
}

export function getGoalStats(userId: string): {
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  avgProgress: number;
  milestonesAchieved: number;
  totalMilestones: number;
  onTrackGoals: number;
  atRiskGoals: number;
} {
  initializeDemoData(userId);
  const goals = getUserGoals(userId);

  const activeGoals = goals.filter((g) => g.status === "active");
  const completedGoals = goals.filter((g) => g.status === "completed");

  const avgProgress =
    activeGoals.length > 0
      ? activeGoals.reduce((sum, g) => sum + g.progress, 0) / activeGoals.length
      : 0;

  const milestonesAchieved = goals.reduce(
    (sum, g) => sum + g.milestones.filter((m) => m.isAchieved).length,
    0
  );
  const totalMilestones = goals.reduce((sum, g) => sum + g.milestones.length, 0);

  // Calculate on-track vs at-risk based on expected progress
  const now = new Date();
  let onTrack = 0;
  let atRisk = 0;

  activeGoals.forEach((goal) => {
    const totalDays = (goal.endDate.getTime() - goal.startDate.getTime()) / (1000 * 60 * 60 * 24);
    const elapsedDays = (now.getTime() - goal.startDate.getTime()) / (1000 * 60 * 60 * 24);
    const expectedProgress = (elapsedDays / totalDays) * 100;

    if (goal.progress >= expectedProgress * 0.8) {
      onTrack++;
    } else {
      atRisk++;
    }
  });

  return {
    totalGoals: goals.length,
    activeGoals: activeGoals.length,
    completedGoals: completedGoals.length,
    avgProgress: Math.round(avgProgress),
    milestonesAchieved,
    totalMilestones,
    onTrackGoals: onTrack,
    atRiskGoals: atRisk,
  };
}

export const GOAL_CATEGORIES: { value: GoalCategory; label: string; icon: string }[] = [
  { value: "growth", label: "Growth", icon: "📈" },
  { value: "engagement", label: "Engagement", icon: "💬" },
  { value: "content", label: "Content", icon: "📝" },
  { value: "reach", label: "Reach", icon: "👁️" },
  { value: "conversion", label: "Conversion", icon: "🎯" },
  { value: "brand", label: "Brand", icon: "⭐" },
  { value: "revenue", label: "Revenue", icon: "💰" },
];

export const GOAL_METRICS: { value: GoalMetric; label: string; category: GoalCategory[] }[] = [
  { value: "followers", label: "Followers", category: ["growth"] },
  { value: "engagement_rate", label: "Engagement Rate", category: ["engagement"] },
  { value: "posts_published", label: "Posts Published", category: ["content"] },
  { value: "impressions", label: "Impressions", category: ["reach"] },
  { value: "reach", label: "Reach", category: ["reach"] },
  { value: "clicks", label: "Link Clicks", category: ["conversion"] },
  { value: "conversions", label: "Conversions", category: ["conversion"] },
  { value: "revenue", label: "Revenue", category: ["revenue"] },
  { value: "likes_per_post", label: "Likes Per Post", category: ["engagement"] },
  { value: "comments_per_post", label: "Comments Per Post", category: ["engagement"] },
  { value: "video_views", label: "Video Views", category: ["reach"] },
  { value: "story_views", label: "Story Views", category: ["reach"] },
];
