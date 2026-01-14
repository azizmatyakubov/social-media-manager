"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

interface ListeningQuery {
  id: string;
  name: string;
  keywords: string[];
  excludeKeywords: string[];
  platforms: string[];
  isActive: boolean;
  lastCheckedAt: string | null;
}

interface ListeningMention {
  id: string;
  platform: string;
  authorName: string;
  authorHandle: string;
  content: string;
  url: string;
  sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
  matchedKeywords: string[];
  isRead: boolean;
  createdAt: string;
}

interface ListeningStats {
  totalMentions: number;
  positiveMentions: number;
  neutralMentions: number;
  negativeMentions: number;
  topInfluencers: { name: string; handle: string; mentions: number }[];
  trendingKeywords: { keyword: string; count: number; sentiment: string }[];
  platformBreakdown: { platform: string; count: number; percentage: number }[];
}

interface TrendData {
  date: string;
  count: number;
  sentiment: number;
}

interface AIInsights {
  summary: string;
  keyFindings: string[];
  recommendations: string[];
  sentiment: string;
}

type TabType = "overview" | "mentions" | "queries" | "insights";

const PLATFORMS = ["X", "LINKEDIN", "INSTAGRAM", "TIKTOK", "YOUTUBE"];

export default function SocialListeningPage() {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<ListeningStats | null>(null);
  const [mentions, setMentions] = useState<ListeningMention[]>([]);
  const [queries, setQueries] = useState<ListeningQuery[]>([]);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [insights, setInsights] = useState<AIInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  // Filters
  const [platform, setPlatform] = useState("");
  const [sentiment, setSentiment] = useState("");
  const [showUnread, setShowUnread] = useState(false);

  // Create query form
  const [showCreateQuery, setShowCreateQuery] = useState(false);
  const [queryForm, setQueryForm] = useState({
    name: "",
    keywords: "",
    excludeKeywords: "",
    platforms: ["X", "LINKEDIN", "INSTAGRAM"],
  });

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/listening?action=stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }, []);

  const fetchMentions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ action: "mentions" });
      if (platform) params.set("platform", platform);
      if (sentiment) params.set("sentiment", sentiment);
      if (showUnread) params.set("isRead", "false");
      params.set("limit", "50");

      const res = await fetch(`/api/listening?${params}`);
      if (res.ok) {
        const data = await res.json();
        setMentions(data.mentions);
      }
    } catch (error) {
      console.error("Error fetching mentions:", error);
    } finally {
      setLoading(false);
    }
  }, [platform, sentiment, showUnread]);

  const fetchQueries = useCallback(async () => {
    try {
      const res = await fetch("/api/listening?action=queries");
      if (res.ok) {
        const data = await res.json();
        setQueries(data.queries);
      }
    } catch (error) {
      console.error("Error fetching queries:", error);
    }
  }, []);

  const fetchTrends = useCallback(async () => {
    try {
      const res = await fetch("/api/listening?action=trends&days=30");
      if (res.ok) {
        const data = await res.json();
        setTrends(data.trends);
      }
    } catch (error) {
      console.error("Error fetching trends:", error);
    }
  }, []);

  const fetchInsights = async () => {
    setInsightsLoading(true);
    try {
      const res = await fetch("/api/listening?action=insights");
      if (res.ok) {
        const data = await res.json();
        setInsights(data.insights);
      }
    } catch (error) {
      console.error("Error fetching insights:", error);
    } finally {
      setInsightsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "overview") {
      fetchStats();
      fetchTrends();
    } else if (activeTab === "mentions") {
      fetchMentions();
    } else if (activeTab === "queries") {
      fetchQueries();
    } else if (activeTab === "insights") {
      if (!insights) {
        fetchInsights();
      }
    }
  }, [activeTab, fetchStats, fetchTrends, fetchMentions, fetchQueries, insights]);

  useEffect(() => {
    if (activeTab === "mentions") {
      fetchMentions();
    }
  }, [platform, sentiment, showUnread, activeTab, fetchMentions]);

  const createQuery = async () => {
    if (!queryForm.name.trim() || !queryForm.keywords.trim()) return;

    try {
      const res = await fetch("/api/listening", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-query",
          name: queryForm.name,
          keywords: queryForm.keywords.split(",").map((k) => k.trim()),
          excludeKeywords: queryForm.excludeKeywords
            ? queryForm.excludeKeywords.split(",").map((k) => k.trim())
            : [],
          platforms: queryForm.platforms,
        }),
      });

      if (res.ok) {
        setShowCreateQuery(false);
        setQueryForm({
          name: "",
          keywords: "",
          excludeKeywords: "",
          platforms: ["X", "LINKEDIN", "INSTAGRAM"],
        });
        fetchQueries();
      }
    } catch (error) {
      console.error("Error creating query:", error);
    }
  };

  const toggleQueryActive = async (queryId: string, isActive: boolean) => {
    try {
      const res = await fetch("/api/listening", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-query",
          queryId,
          isActive: !isActive,
        }),
      });

      if (res.ok) {
        fetchQueries();
      }
    } catch (error) {
      console.error("Error updating query:", error);
    }
  };

  const deleteQuery = async (queryId: string) => {
    if (!confirm("Delete this listening query?")) return;

    try {
      const res = await fetch("/api/listening", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete-query", queryId }),
      });

      if (res.ok) {
        fetchQueries();
      }
    } catch (error) {
      console.error("Error deleting query:", error);
    }
  };

  const markAsRead = async (mentionIds: string[]) => {
    try {
      const res = await fetch("/api/listening", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark-read", mentionIds }),
      });

      if (res.ok) {
        setMentions((prev) =>
          prev.map((m) =>
            mentionIds.includes(m.id) ? { ...m, isRead: true } : m
          )
        );
      }
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "POSITIVE":
      case "positive":
        return "text-green-400 bg-green-500/10";
      case "NEGATIVE":
      case "negative":
        return "text-red-400 bg-red-500/10";
      default:
        return "text-zinc-400 bg-zinc-500/10";
    }
  };

  const getPlatformIcon = (platform: string) => {
    const icons: Record<string, string> = {
      X: "X",
      LINKEDIN: "in",
      INSTAGRAM: "IG",
      TIKTOK: "TT",
      YOUTUBE: "YT",
    };
    return icons[platform] || platform.charAt(0);
  };

  const tabs: { id: TabType; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "mentions", label: "Mentions" },
    { id: "queries", label: "Queries" },
    { id: "insights", label: "AI Insights" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Social Listening</h1>
            <p className="text-zinc-400 mt-1">
              Monitor brand mentions, keywords, and industry conversations
            </p>
          </div>
          <button
            onClick={() => setShowCreateQuery(true)}
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Query
          </button>
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
                  <span className="text-zinc-400 text-sm">Total Mentions</span>
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
                </div>
                <div className="text-3xl font-bold">{stats?.totalMentions || 0}</div>
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
                <div className="text-3xl font-bold text-green-400">{stats?.positiveMentions || 0}</div>
              </div>

              <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-zinc-400 text-sm">Neutral</span>
                  <div className="w-10 h-10 rounded-xl bg-zinc-500/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="text-3xl font-bold">{stats?.neutralMentions || 0}</div>
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
                <div className="text-3xl font-bold text-red-400">{stats?.negativeMentions || 0}</div>
              </div>
            </div>

            {/* Trend Chart */}
            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800">
              <h3 className="text-lg font-semibold mb-4">Mention Trend (30 Days)</h3>
              {trends.length === 0 ? (
                <p className="text-zinc-500 text-sm">No trend data available</p>
              ) : (
                <div className="h-48 flex items-end gap-1">
                  {trends.map((day, i) => {
                    const maxCount = Math.max(...trends.map((t) => t.count), 1);
                    const height = (day.count / maxCount) * 180;
                    const sentimentColor =
                      day.sentiment > 0.3
                        ? "bg-green-500"
                        : day.sentiment < -0.3
                        ? "bg-red-500"
                        : "bg-indigo-500";

                    return (
                      <div
                        key={day.date}
                        className="flex-1 flex flex-col justify-end items-center group"
                        title={`${day.date}: ${day.count} mentions`}
                      >
                        <div
                          className={`w-full rounded-t ${sentimentColor} transition-all group-hover:opacity-80`}
                          style={{ height: `${height}px` }}
                        />
                        {i % 7 === 0 && (
                          <span className="text-[10px] text-zinc-600 mt-1">
                            {day.date.slice(5)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Trending Keywords */}
              <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800">
                <h3 className="text-lg font-semibold mb-4">Trending Keywords</h3>
                {!stats?.trendingKeywords?.length ? (
                  <p className="text-zinc-500 text-sm">No trending keywords</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {stats.trendingKeywords.slice(0, 15).map((item) => (
                      <span
                        key={item.keyword}
                        className={`px-3 py-1.5 rounded-full text-sm ${getSentimentColor(item.sentiment)}`}
                      >
                        {item.keyword}
                        <span className="ml-1 opacity-60">({item.count})</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Platform Breakdown */}
              <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800">
                <h3 className="text-lg font-semibold mb-4">Platform Breakdown</h3>
                {!stats?.platformBreakdown?.length ? (
                  <p className="text-zinc-500 text-sm">No platform data</p>
                ) : (
                  <div className="space-y-3">
                    {stats.platformBreakdown.map((item) => (
                      <div key={item.platform}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded bg-zinc-700 flex items-center justify-center text-xs">
                              {getPlatformIcon(item.platform)}
                            </span>
                            {item.platform}
                          </span>
                          <span className="text-zinc-400">
                            {item.count} ({item.percentage}%)
                          </span>
                        </div>
                        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full"
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Top Influencers */}
            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800">
              <h3 className="text-lg font-semibold mb-4">Top Mentioners</h3>
              {!stats?.topInfluencers?.length ? (
                <p className="text-zinc-500 text-sm">No influencer data</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {stats.topInfluencers.slice(0, 10).map((inf, i) => (
                    <div key={i} className="p-4 bg-zinc-800/50 rounded-xl text-center">
                      <div className="w-12 h-12 rounded-full bg-zinc-700 flex items-center justify-center mx-auto mb-2 font-bold">
                        {inf.name.charAt(0)}
                      </div>
                      <div className="font-medium text-sm truncate">{inf.name}</div>
                      {inf.handle && (
                        <div className="text-xs text-zinc-500 truncate">@{inf.handle}</div>
                      )}
                      <div className="text-xs text-indigo-400 mt-1">{inf.mentions} mentions</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mentions Tab */}
        {activeTab === "mentions" && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-wrap gap-4 p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="px-4 py-2 bg-zinc-800 rounded-lg text-sm border border-zinc-700 focus:border-indigo-500 focus:outline-none"
              >
                <option value="">All Platforms</option>
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>

              <select
                value={sentiment}
                onChange={(e) => setSentiment(e.target.value)}
                className="px-4 py-2 bg-zinc-800 rounded-lg text-sm border border-zinc-700 focus:border-indigo-500 focus:outline-none"
              >
                <option value="">All Sentiments</option>
                <option value="POSITIVE">Positive</option>
                <option value="NEUTRAL">Neutral</option>
                <option value="NEGATIVE">Negative</option>
              </select>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showUnread}
                  onChange={(e) => setShowUnread(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-indigo-500 focus:ring-indigo-500"
                />
                <span className="text-sm">Unread Only</span>
              </label>

              {mentions.filter((m) => !m.isRead).length > 0 && (
                <button
                  onClick={() => markAsRead(mentions.filter((m) => !m.isRead).map((m) => m.id))}
                  className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-sm font-medium transition-colors"
                >
                  Mark All Read
                </button>
              )}
            </div>

            {/* Mentions List */}
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : mentions.length === 0 ? (
              <div className="text-center py-16">
                <svg className="w-16 h-16 mx-auto text-zinc-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <h3 className="text-lg font-semibold mb-2">No Mentions Found</h3>
                <p className="text-zinc-400">Mentions matching your criteria will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {mentions.map((mention) => (
                  <div
                    key={mention.id}
                    className={`p-6 rounded-xl border ${
                      mention.isRead
                        ? "bg-zinc-900/50 border-zinc-800"
                        : "bg-zinc-900/70 border-indigo-500/20"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center font-medium text-sm flex-shrink-0">
                        {mention.authorName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium">{mention.authorName}</span>
                          {mention.authorHandle && (
                            <span className="text-zinc-500 text-sm">@{mention.authorHandle}</span>
                          )}
                          <span className="w-6 h-6 rounded bg-zinc-700 flex items-center justify-center text-xs">
                            {getPlatformIcon(mention.platform)}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs ${getSentimentColor(mention.sentiment)}`}>
                            {mention.sentiment}
                          </span>
                          {!mention.isRead && (
                            <span className="w-2 h-2 rounded-full bg-indigo-500" />
                          )}
                        </div>
                        <p className="text-zinc-300 mb-3">{mention.content}</p>
                        <div className="flex items-center gap-4 text-xs text-zinc-500">
                          <span>{new Date(mention.createdAt).toLocaleString()}</span>
                          {mention.url && (
                            <a
                              href={mention.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-400 hover:text-indigo-300"
                            >
                              View Post
                            </a>
                          )}
                          {!mention.isRead && (
                            <button
                              onClick={() => markAsRead([mention.id])}
                              className="text-zinc-400 hover:text-white"
                            >
                              Mark as Read
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Queries Tab */}
        {activeTab === "queries" && (
          <div className="space-y-6">
            {queries.length === 0 ? (
              <div className="text-center py-16">
                <svg className="w-16 h-16 mx-auto text-zinc-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <h3 className="text-lg font-semibold mb-2">No Listening Queries</h3>
                <p className="text-zinc-400 mb-4">Create queries to monitor specific keywords and topics</p>
                <button
                  onClick={() => setShowCreateQuery(true)}
                  className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg font-medium transition-colors"
                >
                  Create Query
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {queries.map((query) => (
                  <div
                    key={query.id}
                    className={`p-6 rounded-2xl border ${
                      query.isActive
                        ? "bg-zinc-900/50 border-zinc-800"
                        : "bg-zinc-900/30 border-zinc-800/50 opacity-60"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="font-semibold">{query.name}</h3>
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleQueryActive(query.id, query.isActive)}
                          className={`p-1.5 rounded transition-colors ${
                            query.isActive
                              ? "text-green-400 hover:bg-zinc-700"
                              : "text-zinc-500 hover:bg-zinc-700"
                          }`}
                          title={query.isActive ? "Pause" : "Activate"}
                        >
                          {query.isActive ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                        </button>
                        <button
                          onClick={() => deleteQuery(query.id)}
                          className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-700 rounded transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <span className="text-xs text-zinc-500">Keywords</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {query.keywords.map((kw, i) => (
                            <span key={i} className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded text-xs">
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>

                      {query.excludeKeywords.length > 0 && (
                        <div>
                          <span className="text-xs text-zinc-500">Excluding</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {query.excludeKeywords.map((kw, i) => (
                              <span key={i} className="px-2 py-0.5 bg-red-500/10 text-red-400 rounded text-xs">
                                -{kw}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <span className="text-xs text-zinc-500">Platforms</span>
                        <div className="flex gap-1 mt-1">
                          {query.platforms.map((p) => (
                            <span key={p} className="w-6 h-6 rounded bg-zinc-700 flex items-center justify-center text-xs">
                              {getPlatformIcon(p)}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* AI Insights Tab */}
        {activeTab === "insights" && (
          <div className="space-y-6">
            {insightsLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-zinc-400">Generating AI insights...</p>
                </div>
              </div>
            ) : !insights ? (
              <div className="text-center py-16">
                <svg className="w-16 h-16 mx-auto text-zinc-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <h3 className="text-lg font-semibold mb-2">Generate AI Insights</h3>
                <p className="text-zinc-400 mb-4">Analyze your social listening data with AI</p>
                <button
                  onClick={fetchInsights}
                  className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg font-medium transition-colors"
                >
                  Generate Insights
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Summary */}
                <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                      <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">AI Summary</h3>
                      <span className={`text-xs px-2 py-0.5 rounded ${getSentimentColor(insights.sentiment)}`}>
                        {insights.sentiment} overall sentiment
                      </span>
                    </div>
                  </div>
                  <p className="text-zinc-300">{insights.summary}</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Key Findings */}
                  <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800">
                    <h3 className="text-lg font-semibold mb-4">Key Findings</h3>
                    {insights.keyFindings.length === 0 ? (
                      <p className="text-zinc-500 text-sm">No key findings available</p>
                    ) : (
                      <ul className="space-y-3">
                        {insights.keyFindings.map((finding, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <span className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                              {i + 1}
                            </span>
                            <span className="text-zinc-300">{finding}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Recommendations */}
                  <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800">
                    <h3 className="text-lg font-semibold mb-4">Recommendations</h3>
                    {insights.recommendations.length === 0 ? (
                      <p className="text-zinc-500 text-sm">No recommendations available</p>
                    ) : (
                      <ul className="space-y-3">
                        {insights.recommendations.map((rec, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-zinc-300">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <button
                  onClick={fetchInsights}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors"
                >
                  Regenerate Insights
                </button>
              </div>
            )}
          </div>
        )}

        {/* Create Query Modal */}
        {showCreateQuery && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 w-full max-w-lg">
              <div className="p-6 border-b border-zinc-800">
                <h3 className="text-lg font-semibold">Create Listening Query</h3>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Query Name</label>
                  <input
                    type="text"
                    value={queryForm.name}
                    onChange={(e) => setQueryForm({ ...queryForm, name: e.target.value })}
                    placeholder="e.g., Brand Mentions"
                    className="w-full px-4 py-3 bg-zinc-800 rounded-xl border border-zinc-700 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Keywords to Monitor</label>
                  <input
                    type="text"
                    value={queryForm.keywords}
                    onChange={(e) => setQueryForm({ ...queryForm, keywords: e.target.value })}
                    placeholder="keyword1, keyword2, keyword3"
                    className="w-full px-4 py-3 bg-zinc-800 rounded-xl border border-zinc-700 focus:border-indigo-500 focus:outline-none"
                  />
                  <p className="text-xs text-zinc-500 mt-1">Separate with commas</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Exclude Keywords (optional)</label>
                  <input
                    type="text"
                    value={queryForm.excludeKeywords}
                    onChange={(e) => setQueryForm({ ...queryForm, excludeKeywords: e.target.value })}
                    placeholder="spam, unrelated"
                    className="w-full px-4 py-3 bg-zinc-800 rounded-xl border border-zinc-700 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Platforms</label>
                  <div className="flex flex-wrap gap-2">
                    {PLATFORMS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          const platforms = queryForm.platforms.includes(p)
                            ? queryForm.platforms.filter((x) => x !== p)
                            : [...queryForm.platforms, p];
                          setQueryForm({ ...queryForm, platforms });
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          queryForm.platforms.includes(p)
                            ? "bg-indigo-500 text-white"
                            : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-zinc-800 flex gap-4">
                <button
                  onClick={() => {
                    setShowCreateQuery(false);
                    setQueryForm({
                      name: "",
                      keywords: "",
                      excludeKeywords: "",
                      platforms: ["X", "LINKEDIN", "INSTAGRAM"],
                    });
                  }}
                  className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createQuery}
                  disabled={!queryForm.name.trim() || !queryForm.keywords.trim()}
                  className="flex-1 py-3 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-medium transition-colors"
                >
                  Create Query
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
