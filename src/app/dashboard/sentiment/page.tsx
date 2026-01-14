"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

interface SentimentResult {
  sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "MIXED";
  score: number;
  confidence: number;
  emotions: { emotion: string; score: number }[];
  keywords: string[];
  intent: string;
  urgency: "LOW" | "MEDIUM" | "HIGH";
  actionRequired: boolean;
  summary: string;
}

interface CommentWithSentiment {
  id: string;
  text: string;
  authorName: string;
  authorHandle?: string;
  platform: string;
  postId?: string;
  postContent?: string;
  createdAt: string;
  sentiment?: SentimentResult;
}

interface SentimentStats {
  total: number;
  positive: number;
  neutral: number;
  negative: number;
  mixed: number;
  avgScore: number;
  topEmotions: { emotion: string; count: number }[];
  actionRequired: number;
  urgentCount: number;
  intents: { intent: string; count: number }[];
}

interface TrendingTopic {
  topic: string;
  count: number;
  sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
}

interface TrendData {
  date: string;
  positive: number;
  neutral: number;
  negative: number;
  avgScore: number;
}

type TabType = "overview" | "comments" | "analyze" | "trends";

export default function SentimentAnalysisPage() {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<SentimentStats | null>(null);
  const [comments, setComments] = useState<CommentWithSentiment[]>([]);
  const [priorityComments, setPriorityComments] = useState<CommentWithSentiment[]>([]);
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [trendData, setTrendData] = useState<TrendData[]>([]);

  // Filters
  const [platform, setPlatform] = useState("");
  const [sentimentFilter, setSentimentFilter] = useState("");
  const [showActionRequired, setShowActionRequired] = useState(false);

  // Analyze tab
  const [analyzeText, setAnalyzeText] = useState("");
  const [analyzeResult, setAnalyzeResult] = useState<SentimentResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [replySuggestions, setReplySuggestions] = useState<string[]>([]);

  const fetchStats = useCallback(async () => {
    try {
      const params = new URLSearchParams({ action: "stats" });
      if (platform) params.set("platform", platform);

      const res = await fetch(`/api/sentiment?${params}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }, [platform]);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ action: "comments" });
      if (platform) params.set("platform", platform);
      if (sentimentFilter) params.set("sentiment", sentimentFilter);
      if (showActionRequired) params.set("actionRequired", "true");
      params.set("limit", "50");

      const res = await fetch(`/api/sentiment?${params}`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments);
      }
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setLoading(false);
    }
  }, [platform, sentimentFilter, showActionRequired]);

  const fetchPriorityComments = useCallback(async () => {
    try {
      const res = await fetch("/api/sentiment?action=priority&limit=5");
      if (res.ok) {
        const data = await res.json();
        setPriorityComments(data.comments);
      }
    } catch (error) {
      console.error("Error fetching priority comments:", error);
    }
  }, []);

  const fetchTrendingTopics = useCallback(async () => {
    try {
      const params = new URLSearchParams({ action: "trending", limit: "10" });
      if (platform) params.set("platform", platform);

      const res = await fetch(`/api/sentiment?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTrendingTopics(data.topics);
      }
    } catch (error) {
      console.error("Error fetching trending topics:", error);
    }
  }, [platform]);

  const fetchTrendData = useCallback(async () => {
    try {
      const res = await fetch("/api/sentiment?action=trend&days=30");
      if (res.ok) {
        const data = await res.json();
        setTrendData(data.trend);
      }
    } catch (error) {
      console.error("Error fetching trend data:", error);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "overview") {
      fetchStats();
      fetchPriorityComments();
      fetchTrendingTopics();
      fetchTrendData();
    } else if (activeTab === "comments") {
      fetchComments();
    } else if (activeTab === "trends") {
      fetchTrendData();
      fetchTrendingTopics();
    }
  }, [activeTab, platform, sentimentFilter, showActionRequired, fetchStats, fetchComments, fetchPriorityComments, fetchTrendingTopics, fetchTrendData]);

  const analyzeSentiment = async () => {
    if (!analyzeText.trim()) return;

    setAnalyzing(true);
    setAnalyzeResult(null);
    setReplySuggestions([]);

    try {
      const res = await fetch("/api/sentiment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "analyze", text: analyzeText }),
      });

      if (res.ok) {
        const data = await res.json();
        setAnalyzeResult(data.result);

        // Get reply suggestions if action is required
        if (data.result.actionRequired || data.result.sentiment === "NEGATIVE") {
          const replyRes = await fetch("/api/sentiment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "generate-reply",
              comment: analyzeText,
              sentiment: data.result,
            }),
          });

          if (replyRes.ok) {
            const replyData = await replyRes.json();
            setReplySuggestions(replyData.suggestions);
          }
        }
      }
    } catch (error) {
      console.error("Error analyzing:", error);
    } finally {
      setAnalyzing(false);
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "POSITIVE":
        return "text-green-400 bg-green-500/10";
      case "NEGATIVE":
        return "text-red-400 bg-red-500/10";
      case "MIXED":
        return "text-yellow-400 bg-yellow-500/10";
      default:
        return "text-zinc-400 bg-zinc-500/10";
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case "POSITIVE":
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case "NEGATIVE":
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "HIGH":
        return "text-red-400 bg-red-500/10";
      case "MEDIUM":
        return "text-yellow-400 bg-yellow-500/10";
      default:
        return "text-zinc-400 bg-zinc-500/10";
    }
  };

  const tabs: { id: TabType; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "comments", label: "Comments" },
    { id: "analyze", label: "Analyze" },
    { id: "trends", label: "Trends" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Sentiment Analysis</h1>
          <p className="text-zinc-400 mt-1">
            Understand how your audience feels about your content
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-zinc-800 pb-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-indigo-500 text-white"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-zinc-400 text-sm">Total Comments</span>
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                </div>
                <div className="text-3xl font-bold">{stats?.total || 0}</div>
              </div>

              <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-zinc-400 text-sm">Positive</span>
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="text-3xl font-bold text-green-400">{stats?.positive || 0}</div>
                <div className="text-xs text-zinc-500 mt-1">
                  {stats?.total ? Math.round((stats.positive / stats.total) * 100) : 0}% of total
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-zinc-400 text-sm">Negative</span>
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="text-3xl font-bold text-red-400">{stats?.negative || 0}</div>
                <div className="text-xs text-zinc-500 mt-1">
                  {stats?.total ? Math.round((stats.negative / stats.total) * 100) : 0}% of total
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-zinc-400 text-sm">Action Required</span>
                  <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                </div>
                <div className="text-3xl font-bold text-yellow-400">{stats?.actionRequired || 0}</div>
                <div className="text-xs text-zinc-500 mt-1">
                  {stats?.urgentCount || 0} urgent
                </div>
              </div>
            </div>

            {/* Sentiment Score */}
            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800">
              <h3 className="text-lg font-semibold mb-4">Overall Sentiment Score</h3>
              <div className="flex items-center gap-6">
                <div className="relative w-32 h-32">
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-zinc-800"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${((stats?.avgScore || 0) + 1) / 2 * 352} 352`}
                      className={
                        (stats?.avgScore || 0) > 0.3
                          ? "text-green-500"
                          : (stats?.avgScore || 0) < -0.3
                          ? "text-red-500"
                          : "text-yellow-500"
                      }
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold">
                      {((stats?.avgScore || 0) * 100).toFixed(0)}
                    </span>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-green-400">Positive</span>
                        <span>{stats?.positive || 0}</span>
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `${stats?.total ? (stats.positive / stats.total) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-zinc-400">Neutral</span>
                        <span>{(stats?.neutral || 0) + (stats?.mixed || 0)}</span>
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-zinc-500 rounded-full"
                          style={{ width: `${stats?.total ? ((stats.neutral + stats.mixed) / stats.total) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-red-400">Negative</span>
                        <span>{stats?.negative || 0}</span>
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-500 rounded-full"
                          style={{ width: `${stats?.total ? (stats.negative / stats.total) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Priority Comments */}
              <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800">
                <h3 className="text-lg font-semibold mb-4">Priority Comments</h3>
                {priorityComments.length === 0 ? (
                  <p className="text-zinc-500 text-sm">No priority comments</p>
                ) : (
                  <div className="space-y-4">
                    {priorityComments.map((comment) => (
                      <div key={comment.id} className="p-4 bg-zinc-800/50 rounded-xl">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium text-sm">{comment.authorName}</span>
                              <span className={`px-2 py-0.5 rounded-full text-xs ${getSentimentColor(comment.sentiment?.sentiment || "NEUTRAL")}`}>
                                {comment.sentiment?.sentiment}
                              </span>
                              {comment.sentiment?.urgency === "HIGH" && (
                                <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/10 text-red-400">
                                  URGENT
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-zinc-300 line-clamp-2">{comment.text}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Top Emotions */}
              <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800">
                <h3 className="text-lg font-semibold mb-4">Top Emotions</h3>
                {!stats?.topEmotions?.length ? (
                  <p className="text-zinc-500 text-sm">No emotion data available</p>
                ) : (
                  <div className="space-y-3">
                    {stats.topEmotions.map((item) => (
                      <div key={item.emotion}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="capitalize">{item.emotion.toLowerCase()}</span>
                          <span className="text-zinc-400">{item.count}</span>
                        </div>
                        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full"
                            style={{ width: `${(item.count / stats.total) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Trending Topics */}
            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800">
              <h3 className="text-lg font-semibold mb-4">Trending Topics</h3>
              {trendingTopics.length === 0 ? (
                <p className="text-zinc-500 text-sm">No trending topics</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {trendingTopics.map((topic) => (
                    <span
                      key={topic.topic}
                      className={`px-3 py-1.5 rounded-full text-sm ${getSentimentColor(topic.sentiment)}`}
                    >
                      {topic.topic}
                      <span className="ml-1 opacity-60">({topic.count})</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Comments Tab */}
        {activeTab === "comments" && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-wrap gap-4 p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="px-4 py-2 bg-zinc-800 rounded-lg text-sm border border-zinc-700 focus:border-indigo-500 focus:outline-none"
              >
                <option value="">All Platforms</option>
                <option value="X">X (Twitter)</option>
                <option value="LINKEDIN">LinkedIn</option>
                <option value="INSTAGRAM">Instagram</option>
                <option value="TIKTOK">TikTok</option>
              </select>

              <select
                value={sentimentFilter}
                onChange={(e) => setSentimentFilter(e.target.value)}
                className="px-4 py-2 bg-zinc-800 rounded-lg text-sm border border-zinc-700 focus:border-indigo-500 focus:outline-none"
              >
                <option value="">All Sentiments</option>
                <option value="POSITIVE">Positive</option>
                <option value="NEUTRAL">Neutral</option>
                <option value="NEGATIVE">Negative</option>
                <option value="MIXED">Mixed</option>
              </select>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showActionRequired}
                  onChange={(e) => setShowActionRequired(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-indigo-500 focus:ring-indigo-500"
                />
                <span className="text-sm">Action Required Only</span>
              </label>
            </div>

            {/* Comments List */}
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-16">
                <svg className="w-16 h-16 mx-auto text-zinc-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <h3 className="text-lg font-semibold mb-2">No Comments Found</h3>
                <p className="text-zinc-400">Comments from your connected platforms will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="p-6 bg-zinc-900/50 rounded-xl border border-zinc-800">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center font-medium text-sm">
                        {comment.authorName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium">{comment.authorName}</span>
                          {comment.authorHandle && (
                            <span className="text-zinc-500 text-sm">@{comment.authorHandle}</span>
                          )}
                          <span className="text-zinc-600 text-sm">
                            {new Date(comment.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-zinc-300 mb-3">{comment.text}</p>

                        {comment.sentiment && (
                          <div className="flex flex-wrap gap-2">
                            <span className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 ${getSentimentColor(comment.sentiment.sentiment)}`}>
                              {getSentimentIcon(comment.sentiment.sentiment)}
                              {comment.sentiment.sentiment}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs ${getUrgencyColor(comment.sentiment.urgency)}`}>
                              {comment.sentiment.urgency} Priority
                            </span>
                            <span className="px-2 py-1 rounded-full text-xs bg-zinc-700 text-zinc-300">
                              {comment.sentiment.intent}
                            </span>
                            {comment.sentiment.actionRequired && (
                              <span className="px-2 py-1 rounded-full text-xs bg-yellow-500/10 text-yellow-400">
                                Action Required
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <span className="px-2 py-1 rounded text-xs bg-zinc-700 text-zinc-300">
                        {comment.platform}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Analyze Tab */}
        {activeTab === "analyze" && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800">
              <h3 className="text-lg font-semibold mb-4">Analyze Text</h3>
              <textarea
                value={analyzeText}
                onChange={(e) => setAnalyzeText(e.target.value)}
                placeholder="Paste a comment or text to analyze its sentiment..."
                className="w-full h-32 px-4 py-3 bg-zinc-800 rounded-xl border border-zinc-700 focus:border-indigo-500 focus:outline-none resize-none"
              />
              <button
                onClick={analyzeSentiment}
                disabled={analyzing || !analyzeText.trim()}
                className="mt-4 px-6 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
              >
                {analyzing ? "Analyzing..." : "Analyze Sentiment"}
              </button>
            </div>

            {analyzeResult && (
              <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800">
                <h3 className="text-lg font-semibold mb-4">Analysis Results</h3>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 bg-zinc-800/50 rounded-xl text-center">
                    <div className={`text-2xl font-bold ${getSentimentColor(analyzeResult.sentiment).split(" ")[0]}`}>
                      {analyzeResult.sentiment}
                    </div>
                    <div className="text-xs text-zinc-500 mt-1">Sentiment</div>
                  </div>
                  <div className="p-4 bg-zinc-800/50 rounded-xl text-center">
                    <div className="text-2xl font-bold">
                      {(analyzeResult.score * 100).toFixed(0)}%
                    </div>
                    <div className="text-xs text-zinc-500 mt-1">Score</div>
                  </div>
                  <div className="p-4 bg-zinc-800/50 rounded-xl text-center">
                    <div className="text-2xl font-bold">
                      {(analyzeResult.confidence * 100).toFixed(0)}%
                    </div>
                    <div className="text-xs text-zinc-500 mt-1">Confidence</div>
                  </div>
                  <div className="p-4 bg-zinc-800/50 rounded-xl text-center">
                    <div className={`text-2xl font-bold ${getUrgencyColor(analyzeResult.urgency).split(" ")[0]}`}>
                      {analyzeResult.urgency}
                    </div>
                    <div className="text-xs text-zinc-500 mt-1">Urgency</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-zinc-400 mb-3">Intent</h4>
                    <span className="px-3 py-1.5 rounded-lg bg-zinc-800 text-sm">
                      {analyzeResult.intent}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-zinc-400 mb-3">Emotions Detected</h4>
                    <div className="flex flex-wrap gap-2">
                      {analyzeResult.emotions.map((e) => (
                        <span key={e.emotion} className="px-2 py-1 bg-zinc-800 rounded text-xs">
                          {e.emotion}: {Math.round(e.score * 100)}%
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-zinc-400 mb-3">Keywords</h4>
                    <div className="flex flex-wrap gap-2">
                      {analyzeResult.keywords.map((keyword, i) => (
                        <span key={i} className="px-2 py-1 bg-indigo-500/10 text-indigo-400 rounded text-xs">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-zinc-400 mb-3">Summary</h4>
                    <p className="text-sm text-zinc-300">{analyzeResult.summary}</p>
                  </div>
                </div>

                {(analyzeResult.actionRequired || replySuggestions.length > 0) && (
                  <div className="mt-6 pt-6 border-t border-zinc-700">
                    <h4 className="text-sm font-medium text-zinc-400 mb-3">Suggested Replies</h4>
                    <div className="space-y-2">
                      {replySuggestions.map((reply, i) => (
                        <div
                          key={i}
                          className="p-3 bg-zinc-800/50 rounded-lg text-sm flex items-center justify-between gap-4"
                        >
                          <span>{reply}</span>
                          <button
                            onClick={() => navigator.clipboard.writeText(reply)}
                            className="text-zinc-400 hover:text-white transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Trends Tab */}
        {activeTab === "trends" && (
          <div className="space-y-6">
            {/* Trend Chart */}
            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800">
              <h3 className="text-lg font-semibold mb-4">Sentiment Trend (30 Days)</h3>
              {trendData.length === 0 ? (
                <p className="text-zinc-500 text-sm">No trend data available</p>
              ) : (
                <div className="h-64 flex items-end gap-1">
                  {trendData.slice(-30).map((day, i) => {
                    const total = day.positive + day.neutral + day.negative;
                    const maxHeight = 200;
                    return (
                      <div
                        key={day.date}
                        className="flex-1 flex flex-col justify-end gap-0.5"
                        title={`${day.date}: ${day.positive} positive, ${day.neutral} neutral, ${day.negative} negative`}
                      >
                        {total > 0 && (
                          <>
                            <div
                              className="bg-green-500 rounded-t"
                              style={{ height: `${(day.positive / Math.max(...trendData.map(d => d.positive + d.neutral + d.negative))) * maxHeight}px` }}
                            />
                            <div
                              className="bg-zinc-500"
                              style={{ height: `${(day.neutral / Math.max(...trendData.map(d => d.positive + d.neutral + d.negative))) * maxHeight}px` }}
                            />
                            <div
                              className="bg-red-500 rounded-b"
                              style={{ height: `${(day.negative / Math.max(...trendData.map(d => d.positive + d.neutral + d.negative))) * maxHeight}px` }}
                            />
                          </>
                        )}
                        {i % 5 === 0 && (
                          <span className="text-[10px] text-zinc-600 text-center mt-1">
                            {day.date.slice(5)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex gap-4 mt-4 justify-center">
                <span className="flex items-center gap-2 text-sm">
                  <span className="w-3 h-3 bg-green-500 rounded" /> Positive
                </span>
                <span className="flex items-center gap-2 text-sm">
                  <span className="w-3 h-3 bg-zinc-500 rounded" /> Neutral
                </span>
                <span className="flex items-center gap-2 text-sm">
                  <span className="w-3 h-3 bg-red-500 rounded" /> Negative
                </span>
              </div>
            </div>

            {/* Trending Topics */}
            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800">
              <h3 className="text-lg font-semibold mb-4">Trending Topics</h3>
              {trendingTopics.length === 0 ? (
                <p className="text-zinc-500 text-sm">No trending topics</p>
              ) : (
                <div className="space-y-3">
                  {trendingTopics.map((topic, i) => (
                    <div key={topic.topic} className="flex items-center gap-4">
                      <span className="text-zinc-500 text-sm w-6">#{i + 1}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{topic.topic}</span>
                          <span className={`px-2 py-0.5 rounded text-xs ${getSentimentColor(topic.sentiment)}`}>
                            {topic.sentiment}
                          </span>
                        </div>
                        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              topic.sentiment === "POSITIVE"
                                ? "bg-green-500"
                                : topic.sentiment === "NEGATIVE"
                                ? "bg-red-500"
                                : "bg-zinc-500"
                            }`}
                            style={{ width: `${(topic.count / (trendingTopics[0]?.count || 1)) * 100}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-zinc-400 text-sm">{topic.count} mentions</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Intent Distribution */}
            {stats?.intents && stats.intents.length > 0 && (
              <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800">
                <h3 className="text-lg font-semibold mb-4">Intent Distribution</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {stats.intents.map((item) => (
                    <div key={item.intent} className="p-4 bg-zinc-800/50 rounded-xl text-center">
                      <div className="text-2xl font-bold text-indigo-400">{item.count}</div>
                      <div className="text-xs text-zinc-500 mt-1 capitalize">
                        {item.intent.toLowerCase().replace("_", " ")}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
