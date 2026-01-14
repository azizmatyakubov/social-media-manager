"use client";

import { useState, useEffect } from "react";

interface Goal {
  id: string;
  name: string;
  description: string;
  category: string;
  type: string;
  platform: string;
  metric: string;
  targetValue: number;
  currentValue: number;
  startValue: number;
  startDate: Date;
  endDate: Date;
  milestones: Milestone[];
  status: "active" | "completed" | "failed" | "paused";
  priority: "low" | "medium" | "high";
  progress: number;
  progressHistory: ProgressEntry[];
  insights: GoalInsight[];
}

interface Milestone {
  id: string;
  name: string;
  targetValue: number;
  achievedAt?: Date;
  isAchieved: boolean;
  reward?: string;
}

interface ProgressEntry {
  date: Date;
  value: number;
  change: number;
}

interface GoalInsight {
  id: string;
  type: "tip" | "warning" | "success" | "info";
  message: string;
  createdAt: Date;
}

interface GoalTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  metric: string;
  suggestedTarget: number;
  suggestedDuration: number;
  tips: string[];
}

interface GoalStats {
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  avgProgress: number;
  milestonesAchieved: number;
  totalMilestones: number;
  onTrackGoals: number;
  atRiskGoals: number;
}

export default function GoalsPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "goals" | "create" | "templates">("overview");
  const [goals, setGoals] = useState<Goal[]>([]);
  const [templates, setTemplates] = useState<GoalTemplate[]>([]);
  const [stats, setStats] = useState<GoalStats | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // New goal form
  const [newGoal, setNewGoal] = useState({
    name: "",
    description: "",
    category: "growth",
    metric: "followers",
    targetValue: 1000,
    platform: "all",
    priority: "medium",
    duration: 30,
  });

  // Update progress form
  const [updateValue, setUpdateValue] = useState<number | null>(null);

  const categories = [
    { value: "growth", label: "Growth", icon: "📈" },
    { value: "engagement", label: "Engagement", icon: "💬" },
    { value: "content", label: "Content", icon: "📝" },
    { value: "reach", label: "Reach", icon: "👁️" },
    { value: "conversion", label: "Conversion", icon: "🎯" },
    { value: "brand", label: "Brand", icon: "⭐" },
    { value: "revenue", label: "Revenue", icon: "💰" },
  ];

  const metrics = [
    { value: "followers", label: "Followers" },
    { value: "engagement_rate", label: "Engagement Rate (%)" },
    { value: "posts_published", label: "Posts Published" },
    { value: "impressions", label: "Impressions" },
    { value: "reach", label: "Reach" },
    { value: "clicks", label: "Link Clicks" },
    { value: "conversions", label: "Conversions" },
    { value: "video_views", label: "Video Views" },
  ];

  const platforms = [
    { id: "all", name: "All Platforms", icon: "🌐" },
    { id: "instagram", name: "Instagram", icon: "📸" },
    { id: "twitter", name: "X (Twitter)", icon: "𝕏" },
    { id: "facebook", name: "Facebook", icon: "📘" },
    { id: "linkedin", name: "LinkedIn", icon: "💼" },
    { id: "tiktok", name: "TikTok", icon: "🎵" },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [goalsRes, templatesRes, statsRes] = await Promise.all([
        fetch("/api/goals?action=goals"),
        fetch("/api/goals?action=templates"),
        fetch("/api/goals?action=stats"),
      ]);

      if (goalsRes.ok) {
        const data = await goalsRes.json();
        setGoals(data.goals);
        if (data.goals.length > 0) {
          setSelectedGoal(data.goals[0]);
        }
      }

      if (templatesRes.ok) {
        const data = await templatesRes.json();
        setTemplates(data.templates);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats);
      }
    } catch (err) {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const createGoal = async () => {
    if (!newGoal.name || !newGoal.targetValue) {
      setError("Name and target value are required");
      return;
    }

    try {
      const endDate = new Date(Date.now() + newGoal.duration * 24 * 60 * 60 * 1000);
      const response = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          ...newGoal,
          endDate,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setGoals([data.goal, ...goals]);
        setSelectedGoal(data.goal);
        setNewGoal({
          name: "",
          description: "",
          category: "growth",
          metric: "followers",
          targetValue: 1000,
          platform: "all",
          priority: "medium",
          duration: 30,
        });
        setActiveTab("goals");
        fetchData();
      }
    } catch (err) {
      setError("Failed to create goal");
    }
  };

  const createFromTemplate = async (templateId: string) => {
    try {
      const response = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-from-template",
          templateId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setGoals([data.goal, ...goals]);
        setSelectedGoal(data.goal);
        setActiveTab("goals");
        fetchData();
      }
    } catch (err) {
      setError("Failed to create goal from template");
    }
  };

  const updateProgress = async (goalId: string, currentValue: number) => {
    try {
      const response = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-progress",
          goalId,
          currentValue,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setGoals(goals.map((g) => (g.id === goalId ? data.goal : g)));
        setSelectedGoal(data.goal);
        setUpdateValue(null);
        fetchData();
      }
    } catch (err) {
      setError("Failed to update progress");
    }
  };

  const toggleGoalStatus = async (goalId: string, isPaused: boolean) => {
    try {
      const response = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: isPaused ? "resume" : "pause",
          goalId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setGoals(goals.map((g) => (g.id === goalId ? data.goal : g)));
        setSelectedGoal(data.goal);
        fetchData();
      }
    } catch (err) {
      setError("Failed to update goal status");
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return "bg-green-500";
    if (progress >= 50) return "bg-indigo-500";
    if (progress >= 25) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-500/20 text-red-400";
      case "medium":
        return "bg-yellow-500/20 text-yellow-400";
      default:
        return "bg-blue-500/20 text-blue-400";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500/20 text-green-400";
      case "active":
        return "bg-indigo-500/20 text-indigo-400";
      case "paused":
        return "bg-yellow-500/20 text-yellow-400";
      default:
        return "bg-red-500/20 text-red-400";
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case "success":
        return "✅";
      case "warning":
        return "⚠️";
      case "tip":
        return "💡";
      default:
        return "ℹ️";
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const getDaysRemaining = (endDate: Date) => {
    const days = Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-zinc-400">Loading goals...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Goals Tracker</h1>
        <p className="text-zinc-400">
          Set, track, and achieve your social media goals with milestones and insights
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400">
          {error}
          <button onClick={() => setError("")} className="ml-4 text-red-300 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
            <div className="text-zinc-400 text-sm mb-1">Active Goals</div>
            <div className="text-2xl font-bold text-indigo-400">{stats.activeGoals}</div>
          </div>
          <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
            <div className="text-zinc-400 text-sm mb-1">Avg Progress</div>
            <div className="text-2xl font-bold text-white">{stats.avgProgress}%</div>
          </div>
          <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
            <div className="text-zinc-400 text-sm mb-1">On Track</div>
            <div className="text-2xl font-bold text-green-400">{stats.onTrackGoals}</div>
          </div>
          <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
            <div className="text-zinc-400 text-sm mb-1">Milestones</div>
            <div className="text-2xl font-bold text-purple-400">
              {stats.milestonesAchieved}/{stats.totalMilestones}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-zinc-800 pb-4">
        {[
          { id: "overview", label: "Overview" },
          { id: "goals", label: "My Goals" },
          { id: "create", label: "Create Goal" },
          { id: "templates", label: "Templates" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-indigo-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && selectedGoal && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Goal Details */}
          <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-white">{selectedGoal.name}</h2>
                <p className="text-zinc-400 text-sm">{selectedGoal.description}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs ${getStatusColor(selectedGoal.status)}`}>
                {selectedGoal.status}
              </span>
            </div>

            {/* Progress Circle */}
            <div className="flex items-center gap-8 mb-6">
              <div className="relative w-32 h-32">
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    className="stroke-zinc-800"
                    strokeWidth="12"
                    fill="none"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    className={`${getProgressColor(selectedGoal.progress).replace("bg-", "stroke-")}`}
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={`${selectedGoal.progress * 3.52} 352`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-white">{Math.round(selectedGoal.progress)}%</span>
                  <span className="text-xs text-zinc-500">complete</span>
                </div>
              </div>

              <div className="flex-1 space-y-3">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Current</span>
                  <span className="text-white font-semibold">{formatNumber(selectedGoal.currentValue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Target</span>
                  <span className="text-indigo-400 font-semibold">{formatNumber(selectedGoal.targetValue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Days Left</span>
                  <span className="text-white font-semibold">{getDaysRemaining(selectedGoal.endDate)}</span>
                </div>
              </div>
            </div>

            {/* Update Progress */}
            <div className="flex gap-3">
              <input
                type="number"
                value={updateValue ?? selectedGoal.currentValue}
                onChange={(e) => setUpdateValue(Number(e.target.value))}
                className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                placeholder="Current value"
              />
              <button
                onClick={() => updateProgress(selectedGoal.id, updateValue ?? selectedGoal.currentValue)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Update
              </button>
            </div>
          </div>

          {/* Milestones */}
          <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
            <h3 className="text-lg font-semibold text-white mb-4">Milestones</h3>
            <div className="space-y-3">
              {selectedGoal.milestones.map((milestone, index) => (
                <div
                  key={milestone.id}
                  className={`flex items-center gap-4 p-3 rounded-lg ${
                    milestone.isAchieved ? "bg-green-500/10 border border-green-500/30" : "bg-zinc-800/50"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    milestone.isAchieved ? "bg-green-500" : "bg-zinc-700"
                  }`}>
                    {milestone.isAchieved ? "✓" : index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-white">{milestone.name}</div>
                    <div className="text-sm text-zinc-400">
                      Target: {formatNumber(milestone.targetValue)}
                      {milestone.reward && ` • ${milestone.reward}`}
                    </div>
                  </div>
                  {milestone.achievedAt && (
                    <div className="text-xs text-green-400">
                      {new Date(milestone.achievedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Insights */}
          <div className="lg:col-span-2 bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
            <h3 className="text-lg font-semibold text-white mb-4">Insights & Tips</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {selectedGoal.insights.map((insight) => (
                <div
                  key={insight.id}
                  className="flex items-start gap-3 p-4 bg-zinc-800/50 rounded-lg"
                >
                  <span className="text-xl">{getInsightIcon(insight.type)}</span>
                  <div>
                    <p className="text-white">{insight.message}</p>
                    <p className="text-xs text-zinc-500 mt-1">
                      {new Date(insight.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "overview" && !selectedGoal && (
        <div className="bg-zinc-900/50 rounded-xl p-12 border border-zinc-800 text-center">
          <div className="text-5xl mb-4">🎯</div>
          <h3 className="text-lg font-semibold text-white mb-2">No Goals Yet</h3>
          <p className="text-zinc-400 mb-6">Create your first goal to start tracking progress</p>
          <button
            onClick={() => setActiveTab("create")}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Create a Goal
          </button>
        </div>
      )}

      {/* My Goals Tab */}
      {activeTab === "goals" && (
        <div className="space-y-4">
          {goals.length === 0 ? (
            <div className="bg-zinc-900/50 rounded-xl p-12 border border-zinc-800 text-center">
              <div className="text-zinc-400">No goals created yet</div>
            </div>
          ) : (
            goals.map((goal) => (
              <div
                key={goal.id}
                onClick={() => {
                  setSelectedGoal(goal);
                  setActiveTab("overview");
                }}
                className={`bg-zinc-900/50 rounded-xl p-6 border cursor-pointer transition-colors hover:border-indigo-500/50 ${
                  selectedGoal?.id === goal.id ? "border-indigo-500" : "border-zinc-800"
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">
                      {categories.find((c) => c.value === goal.category)?.icon || "🎯"}
                    </span>
                    <div>
                      <h3 className="font-semibold text-white">{goal.name}</h3>
                      <p className="text-sm text-zinc-400">
                        {platforms.find((p) => p.id === goal.platform)?.name || goal.platform}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded text-xs ${getPriorityColor(goal.priority)}`}>
                      {goal.priority}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs ${getStatusColor(goal.status)}`}>
                      {goal.status}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-zinc-400">Progress</span>
                      <span className="text-white">{Math.round(goal.progress)}%</span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getProgressColor(goal.progress)} transition-all`}
                        style={{ width: `${goal.progress}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-semibold">
                      {formatNumber(goal.currentValue)} / {formatNumber(goal.targetValue)}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {getDaysRemaining(goal.endDate)} days left
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Create Goal Tab */}
      {activeTab === "create" && (
        <div className="max-w-2xl">
          <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
            <h3 className="text-lg font-semibold text-white mb-6">Create New Goal</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-zinc-400 text-sm mb-2">Goal Name</label>
                <input
                  type="text"
                  value={newGoal.name}
                  onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                  placeholder="e.g., Grow to 10K Followers"
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-zinc-400 text-sm mb-2">Description</label>
                <textarea
                  value={newGoal.description}
                  onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                  placeholder="What do you want to achieve?"
                  rows={2}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-400 text-sm mb-2">Category</label>
                  <select
                    value={newGoal.category}
                    onChange={(e) => setNewGoal({ ...newGoal, category: e.target.value })}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                  >
                    {categories.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.icon} {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 text-sm mb-2">Metric</label>
                  <select
                    value={newGoal.metric}
                    onChange={(e) => setNewGoal({ ...newGoal, metric: e.target.value })}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                  >
                    {metrics.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-400 text-sm mb-2">Target Value</label>
                  <input
                    type="number"
                    value={newGoal.targetValue}
                    onChange={(e) => setNewGoal({ ...newGoal, targetValue: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 text-sm mb-2">Duration (days)</label>
                  <input
                    type="number"
                    value={newGoal.duration}
                    onChange={(e) => setNewGoal({ ...newGoal, duration: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-400 text-sm mb-2">Platform</label>
                  <select
                    value={newGoal.platform}
                    onChange={(e) => setNewGoal({ ...newGoal, platform: e.target.value })}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                  >
                    {platforms.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.icon} {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 text-sm mb-2">Priority</label>
                  <select
                    value={newGoal.priority}
                    onChange={(e) => setNewGoal({ ...newGoal, priority: e.target.value })}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <button
                onClick={createGoal}
                className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
              >
                Create Goal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === "templates" && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">
                  {categories.find((c) => c.value === template.category)?.icon || "🎯"}
                </span>
                <h3 className="font-semibold text-white">{template.name}</h3>
              </div>
              <p className="text-zinc-400 text-sm mb-4">{template.description}</p>

              <div className="space-y-2 mb-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Suggested Target</span>
                  <span className="text-white">{formatNumber(template.suggestedTarget)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Duration</span>
                  <span className="text-white">{template.suggestedDuration} days</span>
                </div>
              </div>

              <div className="mb-4">
                <div className="text-xs text-zinc-500 mb-2">Tips:</div>
                <ul className="text-xs text-zinc-400 space-y-1">
                  {template.tips.map((tip, i) => (
                    <li key={i}>• {tip}</li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => createFromTemplate(template.id)}
                className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Use Template
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
