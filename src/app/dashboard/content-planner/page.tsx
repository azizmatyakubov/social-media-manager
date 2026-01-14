"use client";

import { useState, useEffect } from "react";
import {
  Sparkles,
  Calendar,
  Target,
  TrendingUp,
  Lightbulb,
  Plus,
  Clock,
  CheckCircle2,
  Circle,
  Play,
  FileText,
  Trash2,
  RefreshCw,
  ChevronRight,
  BarChart3,
  Users,
  Hash,
  Zap,
} from "lucide-react";

type ContentType = "educational" | "promotional" | "entertaining" | "inspirational" | "behindTheScenes" | "userGenerated";
type ContentPillar = "product" | "industry" | "culture" | "community" | "thoughtLeadership";

interface ContentIdea {
  id: string;
  title: string;
  description: string;
  contentType: ContentType;
  pillar: ContentPillar;
  platforms: string[];
  suggestedDate?: string;
  hooks: string[];
  hashtags: string[];
  estimatedEngagement: "low" | "medium" | "high";
  status: "idea" | "planned" | "drafted" | "scheduled" | "published";
  createdAt: string;
}

interface ContentPlan {
  id: string;
  userId: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  goals: string[];
  targetAudience: string;
  contentPillars: ContentPillar[];
  postingFrequency: Record<string, number>;
  ideas: ContentIdea[];
  createdAt: string;
  updatedAt: string;
}

interface TrendingTopic {
  topic: string;
  category: string;
  relevanceScore: number;
  platforms: string[];
  suggestedAngles: string[];
}

const PLATFORMS = [
  { value: "X", label: "X (Twitter)" },
  { value: "LINKEDIN", label: "LinkedIn" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "TIKTOK", label: "TikTok" },
  { value: "YOUTUBE", label: "YouTube" },
  { value: "PINTEREST", label: "Pinterest" },
  { value: "BLUESKY", label: "Bluesky" },
  { value: "THREADS", label: "Threads" },
];

const CONTENT_PILLARS = [
  { value: "product", label: "Product", color: "bg-blue-500" },
  { value: "industry", label: "Industry", color: "bg-purple-500" },
  { value: "culture", label: "Culture", color: "bg-pink-500" },
  { value: "community", label: "Community", color: "bg-green-500" },
  { value: "thoughtLeadership", label: "Thought Leadership", color: "bg-orange-500" },
];

const CONTENT_TYPES = [
  { value: "educational", label: "Educational", icon: Lightbulb },
  { value: "promotional", label: "Promotional", icon: Target },
  { value: "entertaining", label: "Entertaining", icon: Play },
  { value: "inspirational", label: "Inspirational", icon: Sparkles },
  { value: "behindTheScenes", label: "Behind the Scenes", icon: Users },
  { value: "userGenerated", label: "User Generated", icon: Hash },
];

export default function ContentPlannerPage() {
  const [activeTab, setActiveTab] = useState<"generate" | "plans" | "trends" | "calendar">("generate");
  const [plans, setPlans] = useState<ContentPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<ContentPlan | null>(null);
  const [generatedIdeas, setGeneratedIdeas] = useState<ContentIdea[]>([]);
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Form state
  const [industry, setIndustry] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedPillars, setSelectedPillars] = useState<ContentPillar[]>([]);
  const [postsPerDay, setPostsPerDay] = useState(2);
  const [goals, setGoals] = useState<string[]>(["Increase engagement", "Build brand awareness"]);
  const [newGoal, setNewGoal] = useState("");

  // Analysis state
  const [analysis, setAnalysis] = useState<{
    typeDistribution: Record<ContentType, number>;
    pillarDistribution: Record<ContentPillar, number>;
    platformCoverage: Record<string, number>;
    engagementPrediction: string;
    recommendations: string[];
  } | null>(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await fetch("/api/content-planner?action=plans");
      const data = await response.json();
      if (data.plans) {
        setPlans(data.plans);
      }
    } catch (error) {
      console.error("Failed to fetch plans:", error);
    }
  };

  const handleGenerateIdeas = async () => {
    if (!industry || !targetAudience || selectedPlatforms.length === 0 || selectedPillars.length === 0) {
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/content-planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-ideas",
          industry,
          targetAudience,
          platforms: selectedPlatforms,
          contentPillars: selectedPillars,
          count: 10,
        }),
      });

      const data = await response.json();
      if (data.ideas) {
        setGeneratedIdeas(data.ideas);
        // Also analyze the mix
        await analyzeContentMix(data.ideas);
      }
    } catch (error) {
      console.error("Failed to generate ideas:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateWeeklyPlan = async () => {
    if (!industry || !targetAudience || selectedPlatforms.length === 0 || selectedPillars.length === 0) {
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/content-planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-weekly-plan",
          industry,
          targetAudience,
          platforms: selectedPlatforms,
          contentPillars: selectedPillars,
          weekStartDate: new Date().toISOString(),
          postsPerDay,
          goals,
        }),
      });

      const data = await response.json();
      if (data.plan) {
        setPlans([data.plan, ...plans]);
        setSelectedPlan(data.plan);
        setActiveTab("plans");
      }
    } catch (error) {
      console.error("Failed to generate weekly plan:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFetchTrends = async () => {
    if (!industry || selectedPlatforms.length === 0) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/content-planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "trending-topics",
          industry,
          platforms: selectedPlatforms,
        }),
      });

      const data = await response.json();
      if (data.topics) {
        setTrendingTopics(data.topics);
      }
    } catch (error) {
      console.error("Failed to fetch trends:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeContentMix = async (ideas: ContentIdea[]) => {
    try {
      const response = await fetch("/api/content-planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "analyze-mix",
          ideas,
        }),
      });

      const data = await response.json();
      if (data.analysis) {
        setAnalysis(data.analysis);
      }
    } catch (error) {
      console.error("Failed to analyze content mix:", error);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    try {
      const response = await fetch("/api/content-planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete-plan",
          planId,
        }),
      });

      if (response.ok) {
        setPlans(plans.filter((p) => p.id !== planId));
        if (selectedPlan?.id === planId) {
          setSelectedPlan(null);
        }
      }
    } catch (error) {
      console.error("Failed to delete plan:", error);
    }
  };

  const handleUpdateIdeaStatus = async (planId: string, ideaId: string, status: ContentIdea["status"]) => {
    try {
      const response = await fetch("/api/content-planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-idea-status",
          planId,
          ideaId,
          status,
        }),
      });

      const data = await response.json();
      if (data.plan) {
        setSelectedPlan(data.plan);
        setPlans(plans.map((p) => (p.id === data.plan.id ? data.plan : p)));
      }
    } catch (error) {
      console.error("Failed to update idea status:", error);
    }
  };

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
  };

  const togglePillar = (pillar: ContentPillar) => {
    setSelectedPillars((prev) =>
      prev.includes(pillar) ? prev.filter((p) => p !== pillar) : [...prev, pillar]
    );
  };

  const addGoal = () => {
    if (newGoal.trim() && !goals.includes(newGoal.trim())) {
      setGoals([...goals, newGoal.trim()]);
      setNewGoal("");
    }
  };

  const removeGoal = (goal: string) => {
    setGoals(goals.filter((g) => g !== goal));
  };

  const getStatusIcon = (status: ContentIdea["status"]) => {
    switch (status) {
      case "idea":
        return <Circle className="w-4 h-4 text-zinc-400" />;
      case "planned":
        return <Clock className="w-4 h-4 text-blue-400" />;
      case "drafted":
        return <FileText className="w-4 h-4 text-yellow-400" />;
      case "scheduled":
        return <Calendar className="w-4 h-4 text-purple-400" />;
      case "published":
        return <CheckCircle2 className="w-4 h-4 text-green-400" />;
    }
  };

  const getEngagementColor = (engagement: string) => {
    switch (engagement) {
      case "high":
        return "text-green-400 bg-green-400/10";
      case "medium":
        return "text-yellow-400 bg-yellow-400/10";
      case "low":
        return "text-red-400 bg-red-400/10";
      default:
        return "text-zinc-400 bg-zinc-400/10";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-indigo-400" />
            AI Content Planner
          </h1>
          <p className="text-zinc-400 mt-1">Generate content ideas and plan your social media strategy</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-800">
        <nav className="flex gap-4">
          {[
            { id: "generate", label: "Generate Ideas", icon: Lightbulb },
            { id: "plans", label: "My Plans", icon: Calendar },
            { id: "trends", label: "Trending Topics", icon: TrendingUp },
            { id: "calendar", label: "Calendar View", icon: BarChart3 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-indigo-500 text-white"
                  : "border-transparent text-zinc-400 hover:text-white"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Generate Ideas Tab */}
      {activeTab === "generate" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Settings Panel */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
              <h3 className="text-lg font-semibold text-white mb-4">Content Strategy</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Industry/Niche</label>
                  <input
                    type="text"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="e.g., SaaS, E-commerce, Fitness"
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Target Audience</label>
                  <input
                    type="text"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    placeholder="e.g., Small business owners, 25-45"
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Platforms</label>
                  <div className="flex flex-wrap gap-2">
                    {PLATFORMS.map((platform) => (
                      <button
                        key={platform.value}
                        onClick={() => togglePlatform(platform.value)}
                        className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                          selectedPlatforms.includes(platform.value)
                            ? "bg-indigo-600 text-white"
                            : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                        }`}
                      >
                        {platform.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Content Pillars</label>
                  <div className="flex flex-wrap gap-2">
                    {CONTENT_PILLARS.map((pillar) => (
                      <button
                        key={pillar.value}
                        onClick={() => togglePillar(pillar.value as ContentPillar)}
                        className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                          selectedPillars.includes(pillar.value as ContentPillar)
                            ? `${pillar.color} text-white`
                            : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                        }`}
                      >
                        {pillar.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Posts per Day</label>
                  <input
                    type="number"
                    value={postsPerDay}
                    onChange={(e) => setPostsPerDay(parseInt(e.target.value) || 1)}
                    min={1}
                    max={10}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Goals</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {goals.map((goal) => (
                      <span
                        key={goal}
                        className="px-3 py-1 bg-zinc-800 rounded-lg text-sm text-zinc-300 flex items-center gap-2"
                      >
                        {goal}
                        <button
                          onClick={() => removeGoal(goal)}
                          className="text-zinc-500 hover:text-red-400"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newGoal}
                      onChange={(e) => setNewGoal(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addGoal()}
                      placeholder="Add a goal"
                      className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      onClick={addGoal}
                      className="px-3 py-2 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-2">
                <button
                  onClick={handleGenerateIdeas}
                  disabled={isGenerating || !industry || !targetAudience || selectedPlatforms.length === 0}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Lightbulb className="w-4 h-4" />
                  {isGenerating ? "Generating..." : "Generate Ideas"}
                </button>

                <button
                  onClick={handleGenerateWeeklyPlan}
                  disabled={isGenerating || !industry || !targetAudience || selectedPlatforms.length === 0}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Calendar className="w-4 h-4" />
                  {isGenerating ? "Generating..." : "Generate Weekly Plan"}
                </button>
              </div>
            </div>

            {/* Analysis Panel */}
            {analysis && (
              <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
                <h3 className="text-lg font-semibold text-white mb-4">Content Analysis</h3>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-zinc-400 mb-2">Engagement Prediction</p>
                    <span className={`px-3 py-1 rounded-full text-sm ${getEngagementColor(analysis.engagementPrediction)}`}>
                      {analysis.engagementPrediction} engagement
                    </span>
                  </div>

                  {analysis.recommendations.length > 0 && (
                    <div>
                      <p className="text-sm text-zinc-400 mb-2">Recommendations</p>
                      <ul className="space-y-2">
                        {analysis.recommendations.map((rec, index) => (
                          <li key={index} className="text-sm text-zinc-300 flex items-start gap-2">
                            <Zap className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Ideas Panel */}
          <div className="lg:col-span-2">
            <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Generated Ideas</h3>
                {generatedIdeas.length > 0 && (
                  <span className="text-sm text-zinc-400">{generatedIdeas.length} ideas</span>
                )}
              </div>

              {generatedIdeas.length === 0 ? (
                <div className="text-center py-12">
                  <Lightbulb className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                  <p className="text-zinc-400">
                    Configure your content strategy and click &quot;Generate Ideas&quot; to get started
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {generatedIdeas.map((idea) => (
                    <div
                      key={idea.id}
                      className="bg-zinc-800 rounded-lg p-4 border border-zinc-700"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium text-white">{idea.title}</h4>
                          <p className="text-sm text-zinc-400 mt-1">{idea.description}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs ${getEngagementColor(idea.estimatedEngagement)}`}>
                          {idea.estimatedEngagement}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-3">
                        <span className="px-2 py-1 bg-zinc-700 rounded text-xs text-zinc-300">
                          {CONTENT_TYPES.find((t) => t.value === idea.contentType)?.label}
                        </span>
                        <span className="px-2 py-1 bg-zinc-700 rounded text-xs text-zinc-300">
                          {CONTENT_PILLARS.find((p) => p.value === idea.pillar)?.label}
                        </span>
                        {idea.platforms.map((platform) => (
                          <span
                            key={platform}
                            className="px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded text-xs"
                          >
                            {platform}
                          </span>
                        ))}
                      </div>

                      {idea.hooks.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-zinc-500 mb-1">Hook Options:</p>
                          <ul className="space-y-1">
                            {idea.hooks.slice(0, 2).map((hook, index) => (
                              <li key={index} className="text-sm text-zinc-300">
                                &quot;{hook}&quot;
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {idea.hashtags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {idea.hashtags.slice(0, 5).map((tag) => (
                            <span key={tag} className="text-xs text-indigo-400">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Plans Tab */}
      {activeTab === "plans" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Plans List */}
          <div className="lg:col-span-1">
            <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
              <h3 className="text-lg font-semibold text-white mb-4">Your Plans</h3>

              {plans.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                  <p className="text-zinc-400">No plans yet. Generate a weekly plan to get started!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {plans.map((plan) => (
                    <button
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan)}
                      className={`w-full text-left p-4 rounded-lg transition-colors ${
                        selectedPlan?.id === plan.id
                          ? "bg-indigo-600 text-white"
                          : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{plan.name}</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                      <p className="text-sm opacity-70 mt-1">
                        {plan.ideas.length} ideas • {plan.contentPillars.length} pillars
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Plan Details */}
          <div className="lg:col-span-2">
            {selectedPlan ? (
              <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-semibold text-white">{selectedPlan.name}</h3>
                    {selectedPlan.description && (
                      <p className="text-zinc-400 mt-1">{selectedPlan.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeletePlan(selectedPlan.id)}
                    className="px-3 py-2 bg-zinc-800 text-red-400 rounded-lg hover:bg-zinc-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Plan Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-zinc-800 rounded-lg p-4">
                    <p className="text-sm text-zinc-400">Total Ideas</p>
                    <p className="text-2xl font-bold text-white">{selectedPlan.ideas.length}</p>
                  </div>
                  <div className="bg-zinc-800 rounded-lg p-4">
                    <p className="text-sm text-zinc-400">Scheduled</p>
                    <p className="text-2xl font-bold text-white">
                      {selectedPlan.ideas.filter((i) => i.status === "scheduled").length}
                    </p>
                  </div>
                  <div className="bg-zinc-800 rounded-lg p-4">
                    <p className="text-sm text-zinc-400">Published</p>
                    <p className="text-2xl font-bold text-white">
                      {selectedPlan.ideas.filter((i) => i.status === "published").length}
                    </p>
                  </div>
                </div>

                {/* Goals */}
                {selectedPlan.goals.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-zinc-400 mb-2">Goals</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedPlan.goals.map((goal) => (
                        <span key={goal} className="px-3 py-1 bg-zinc-800 rounded-lg text-sm text-zinc-300">
                          <Target className="w-3 h-3 inline mr-1" />
                          {goal}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ideas List */}
                <div>
                  <h4 className="text-sm font-medium text-zinc-400 mb-3">Content Ideas</h4>
                  <div className="space-y-3">
                    {selectedPlan.ideas.map((idea) => (
                      <div
                        key={idea.id}
                        className="bg-zinc-800 rounded-lg p-4 border border-zinc-700"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            {getStatusIcon(idea.status)}
                            <div>
                              <h5 className="font-medium text-white">{idea.title}</h5>
                              <p className="text-sm text-zinc-400 mt-1">{idea.description}</p>
                              {idea.suggestedDate && (
                                <p className="text-xs text-indigo-400 mt-2">
                                  <Calendar className="w-3 h-3 inline mr-1" />
                                  {new Date(idea.suggestedDate).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                          <select
                            value={idea.status}
                            onChange={(e) =>
                              handleUpdateIdeaStatus(
                                selectedPlan.id,
                                idea.id,
                                e.target.value as ContentIdea["status"]
                              )
                            }
                            className="px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-sm text-white focus:outline-none"
                          >
                            <option value="idea">Idea</option>
                            <option value="planned">Planned</option>
                            <option value="drafted">Drafted</option>
                            <option value="scheduled">Scheduled</option>
                            <option value="published">Published</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800 text-center py-12">
                <Calendar className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                <p className="text-zinc-400">Select a plan to view details</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Trends Tab */}
      {activeTab === "trends" && (
        <div className="space-y-6">
          <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Discover Trending Topics</h3>
              <button
                onClick={handleFetchTrends}
                disabled={isLoading || !industry || selectedPlatforms.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                {isLoading ? "Loading..." : "Fetch Trends"}
              </button>
            </div>

            <p className="text-zinc-400 mb-4">
              Enter your industry and select platforms above, then fetch trending topics for content inspiration.
            </p>

            {trendingTopics.length === 0 ? (
              <div className="text-center py-12">
                <TrendingUp className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                <p className="text-zinc-400">Configure your industry and platforms to discover trending topics</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {trendingTopics.map((topic, index) => (
                  <div
                    key={index}
                    className="bg-zinc-800 rounded-lg p-4 border border-zinc-700"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-white">{topic.topic}</h4>
                      <span className="px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded text-xs">
                        {topic.relevanceScore}% relevant
                      </span>
                    </div>
                    <p className="text-sm text-zinc-400 mb-3">Category: {topic.category}</p>

                    <div className="space-y-2">
                      <p className="text-xs text-zinc-500">Suggested angles:</p>
                      <ul className="space-y-1">
                        {topic.suggestedAngles.slice(0, 3).map((angle, i) => (
                          <li key={i} className="text-sm text-zinc-300 flex items-start gap-2">
                            <ChevronRight className="w-3 h-3 mt-1 text-indigo-400" />
                            {angle}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex flex-wrap gap-1 mt-3">
                      {topic.platforms.map((platform) => (
                        <span
                          key={platform}
                          className="px-2 py-0.5 bg-zinc-700 rounded text-xs text-zinc-300"
                        >
                          {platform}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Calendar Tab */}
      {activeTab === "calendar" && (
        <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
          <h3 className="text-lg font-semibold text-white mb-4">Content Calendar</h3>

          {plans.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-zinc-400">Generate a weekly plan to see your content calendar</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="text-center text-sm text-zinc-500 py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days with scheduled content */}
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 28 }).map((_, index) => {
                  const date = new Date();
                  date.setDate(date.getDate() + index - date.getDay());

                  const dayIdeas = plans.flatMap((plan) =>
                    plan.ideas.filter((idea) => {
                      if (!idea.suggestedDate) return false;
                      const ideaDate = new Date(idea.suggestedDate);
                      return ideaDate.toDateString() === date.toDateString();
                    })
                  );

                  const isToday = date.toDateString() === new Date().toDateString();

                  return (
                    <div
                      key={index}
                      className={`min-h-24 p-2 rounded-lg border ${
                        isToday ? "border-indigo-500 bg-indigo-500/10" : "border-zinc-800 bg-zinc-800/50"
                      }`}
                    >
                      <p className={`text-sm ${isToday ? "text-indigo-400 font-medium" : "text-zinc-500"}`}>
                        {date.getDate()}
                      </p>
                      <div className="space-y-1 mt-1">
                        {dayIdeas.slice(0, 2).map((idea) => (
                          <div
                            key={idea.id}
                            className="px-1.5 py-0.5 bg-indigo-600/30 rounded text-xs text-indigo-300 truncate"
                            title={idea.title}
                          >
                            {idea.title}
                          </div>
                        ))}
                        {dayIdeas.length > 2 && (
                          <p className="text-xs text-zinc-500">+{dayIdeas.length - 2} more</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
