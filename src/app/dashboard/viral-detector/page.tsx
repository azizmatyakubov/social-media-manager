"use client";

import { useState, useEffect } from "react";

interface ViralContent {
  id: string;
  platform: string;
  type: string;
  content: {
    text?: string;
    mediaUrl?: string;
    thumbnail?: string;
  };
  author: {
    username: string;
    displayName: string;
    followers: number;
    verified: boolean;
  };
  metrics: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    engagementRate: number;
    viralScore: number;
    growthRate: number;
  };
  analysis: {
    hooks: string[];
    emotions: string[];
    topics: string[];
    format: string;
    viralFactors: { factor: string; description: string; impact: string; applicable: boolean }[];
  };
  discoveredAt: string;
}

interface ViralPattern {
  id: string;
  name: string;
  description: string;
  category: string;
  successRate: number;
  examples: string[];
  tips: string[];
  platforms: string[];
}

interface TrendingTopic {
  id: string;
  name: string;
  platform: string[];
  category: string;
  volume: number;
  growthRate: number;
  sentiment: string;
  relatedHashtags: string[];
}

interface ViralAlert {
  id: string;
  type: string;
  title: string;
  description: string;
  urgency: "high" | "medium" | "low";
  status: string;
  createdAt: string;
}

interface ContentAnalysis {
  viralPotential: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  predictedReach: {
    low: number;
    medium: number;
    high: number;
  };
  recommendedImprovements: {
    category: string;
    current: string;
    suggested: string;
    impact: string;
  }[];
}

interface Stats {
  trendingTopicsCount: number;
  viralContentCount: number;
  avgViralScore: number;
  topPlatforms: { platform: string; count: number }[];
  alertsCount: number;
  patternsCount: number;
}

export default function ViralDetectorPage() {
  const [activeTab, setActiveTab] = useState<"trending" | "analyze" | "patterns" | "topics" | "alerts">("trending");
  const [viralContent, setViralContent] = useState<ViralContent[]>([]);
  const [patterns, setPatterns] = useState<ViralPattern[]>([]);
  const [topics, setTopics] = useState<TrendingTopic[]>([]);
  const [alerts, setAlerts] = useState<ViralAlert[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [platformFilter, setPlatformFilter] = useState("");
  const [selectedContent, setSelectedContent] = useState<ViralContent | null>(null);

  // Analyze form
  const [analyzeContent, setAnalyzeContent] = useState("");
  const [analyzePlatform, setAnalyzePlatform] = useState("twitter");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<ContentAnalysis | null>(null);

  useEffect(() => {
    loadData();
  }, [platformFilter]);

  const loadData = async () => {
    try {
      const platformParam = platformFilter ? `&platform=${platformFilter}` : "";
      const [trendingRes, patternsRes, topicsRes, alertsRes, statsRes] = await Promise.all([
        fetch(`/api/viral-detector?action=trending${platformParam}`),
        fetch("/api/viral-detector?action=patterns"),
        fetch(`/api/viral-detector?action=topics${platformParam}`),
        fetch("/api/viral-detector?action=alerts"),
        fetch("/api/viral-detector?action=stats"),
      ]);

      const [trendingData, patternsData, topicsData, alertsData, statsData] = await Promise.all([
        trendingRes.json(),
        patternsRes.json(),
        topicsRes.json(),
        alertsRes.json(),
        statsRes.json(),
      ]);

      setViralContent(trendingData.content || []);
      setPatterns(patternsData.patterns || []);
      setTopics(topicsData.topics || []);
      setAlerts(alertsData.alerts || []);
      setStats(statsData.stats || null);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  const analyzeViralPotential = async () => {
    if (!analyzeContent.trim()) return;

    setAnalyzing(true);
    try {
      const res = await fetch("/api/viral-detector", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "analyze",
          content: analyzeContent,
          platform: analyzePlatform,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAnalysis(data.analysis);
      }
    } catch (error) {
      console.error("Failed to analyze:", error);
    } finally {
      setAnalyzing(false);
    }
  };

  const dismissAlert = async (alertId: string) => {
    try {
      await fetch("/api/viral-detector", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dismiss-alert", alertId }),
      });
      setAlerts(alerts.filter((a) => a.id !== alertId));
    } catch (error) {
      console.error("Failed to dismiss alert:", error);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  const getViralScoreColor = (score: number) => {
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-yellow-400";
    if (score >= 40) return "text-orange-400";
    return "text-red-400";
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "twitter": return "𝕏";
      case "instagram": return "📷";
      case "tiktok": return "🎵";
      case "linkedin": return "in";
      case "facebook": return "📘";
      case "youtube": return "▶️";
      default: return "🌐";
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "high": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "medium": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "low": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      default: return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Viral Content Detector</h1>
          <p className="text-zinc-400 mt-1">Discover trending content and analyze viral potential</p>
        </div>
        <div className="flex gap-2">
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm"
          >
            <option value="">All Platforms</option>
            <option value="twitter">Twitter/X</option>
            <option value="instagram">Instagram</option>
            <option value="tiktok">TikTok</option>
            <option value="linkedin">LinkedIn</option>
            <option value="youtube">YouTube</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <div className="text-sm text-zinc-400">Trending Topics</div>
            <div className="text-2xl font-bold mt-1">{stats.trendingTopicsCount}</div>
          </div>
          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <div className="text-sm text-zinc-400">Viral Content Found</div>
            <div className="text-2xl font-bold mt-1">{stats.viralContentCount}</div>
          </div>
          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <div className="text-sm text-zinc-400">Avg Viral Score</div>
            <div className={`text-2xl font-bold mt-1 ${getViralScoreColor(stats.avgViralScore)}`}>
              {stats.avgViralScore.toFixed(0)}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <div className="text-sm text-zinc-400">New Alerts</div>
            <div className="text-2xl font-bold mt-1 text-red-400">{stats.alertsCount}</div>
          </div>
        </div>
      )}

      {/* Alerts Banner */}
      {alerts.filter((a) => a.status === "new").length > 0 && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="font-medium text-red-400">
              {alerts.filter((a) => a.status === "new").length} new alerts
            </span>
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {alerts.filter((a) => a.status === "new").slice(0, 3).map((alert) => (
              <div key={alert.id} className={`flex-shrink-0 p-3 rounded-lg border ${getUrgencyColor(alert.urgency)}`}>
                <div className="font-medium text-sm">{alert.title}</div>
                <div className="text-xs opacity-70 mt-1">{alert.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-zinc-800 pb-2">
        {(["trending", "analyze", "patterns", "topics", "alerts"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg capitalize transition ${
              activeTab === tab
                ? "bg-indigo-600 text-white"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Trending Tab */}
      {activeTab === "trending" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {viralContent.map((content) => (
            <div
              key={content.id}
              className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition cursor-pointer"
              onClick={() => setSelectedContent(content)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getPlatformIcon(content.platform)}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{content.author.displayName}</span>
                      {content.author.verified && (
                        <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm text-zinc-500">@{content.author.username}</span>
                  </div>
                </div>
                <div className={`text-2xl font-bold ${getViralScoreColor(content.metrics.viralScore)}`}>
                  {content.metrics.viralScore}
                </div>
              </div>

              <p className="text-white mb-3 line-clamp-3">{content.content.text}</p>

              <div className="grid grid-cols-4 gap-2 text-center mb-3">
                <div className="p-2 rounded bg-zinc-800/50">
                  <div className="text-sm font-medium">{formatNumber(content.metrics.views)}</div>
                  <div className="text-xs text-zinc-500">Views</div>
                </div>
                <div className="p-2 rounded bg-zinc-800/50">
                  <div className="text-sm font-medium">{formatNumber(content.metrics.likes)}</div>
                  <div className="text-xs text-zinc-500">Likes</div>
                </div>
                <div className="p-2 rounded bg-zinc-800/50">
                  <div className="text-sm font-medium">{formatNumber(content.metrics.comments)}</div>
                  <div className="text-xs text-zinc-500">Comments</div>
                </div>
                <div className="p-2 rounded bg-zinc-800/50">
                  <div className="text-sm font-medium">{formatNumber(content.metrics.shares)}</div>
                  <div className="text-xs text-zinc-500">Shares</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1">
                {content.analysis.hooks.slice(0, 3).map((hook, idx) => (
                  <span key={idx} className="px-2 py-0.5 text-xs rounded bg-indigo-500/20 text-indigo-300">
                    {hook}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Analyze Tab */}
      {activeTab === "analyze" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800">
              <h2 className="text-lg font-semibold mb-4">Analyze Your Content</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Your Content</label>
                  <textarea
                    value={analyzeContent}
                    onChange={(e) => setAnalyzeContent(e.target.value)}
                    placeholder="Paste your content here to analyze its viral potential..."
                    rows={6}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Platform</label>
                  <select
                    value={analyzePlatform}
                    onChange={(e) => setAnalyzePlatform(e.target.value)}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:border-indigo-500"
                  >
                    <option value="twitter">Twitter/X</option>
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="facebook">Facebook</option>
                  </select>
                </div>

                <button
                  onClick={analyzeViralPotential}
                  disabled={!analyzeContent.trim() || analyzing}
                  className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {analyzing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      Analyze Viral Potential
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {analysis && (
            <div className="space-y-4">
              {/* Viral Score */}
              <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Viral Potential Score</h3>
                  <div className={`text-4xl font-bold ${getViralScoreColor(analysis.viralPotential)}`}>
                    {analysis.viralPotential}
                  </div>
                </div>
                <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      analysis.viralPotential >= 80 ? "bg-green-500" :
                      analysis.viralPotential >= 60 ? "bg-yellow-500" :
                      analysis.viralPotential >= 40 ? "bg-orange-500" : "bg-red-500"
                    }`}
                    style={{ width: `${analysis.viralPotential}%` }}
                  />
                </div>
              </div>

              {/* Predicted Reach */}
              <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800">
                <h3 className="font-semibold mb-4">Predicted Reach</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-400">{formatNumber(analysis.predictedReach.low)}</div>
                    <div className="text-xs text-zinc-500">Low</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-400">{formatNumber(analysis.predictedReach.medium)}</div>
                    <div className="text-xs text-zinc-500">Medium</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">{formatNumber(analysis.predictedReach.high)}</div>
                    <div className="text-xs text-zinc-500">High</div>
                  </div>
                </div>
              </div>

              {/* Strengths & Weaknesses */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                  <h3 className="font-semibold text-green-400 mb-2">Strengths</h3>
                  <ul className="space-y-1">
                    {analysis.strengths.map((s, idx) => (
                      <li key={idx} className="text-sm flex items-start gap-2">
                        <span className="text-green-400">✓</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                  <h3 className="font-semibold text-red-400 mb-2">Weaknesses</h3>
                  <ul className="space-y-1">
                    {analysis.weaknesses.map((w, idx) => (
                      <li key={idx} className="text-sm flex items-start gap-2">
                        <span className="text-red-400">✗</span>
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Suggestions */}
              <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                <h3 className="font-semibold text-indigo-400 mb-2">Suggestions</h3>
                <ul className="space-y-1">
                  {analysis.suggestions.map((s, idx) => (
                    <li key={idx} className="text-sm flex items-start gap-2">
                      <span className="text-indigo-400">💡</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Patterns Tab */}
      {activeTab === "patterns" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {patterns.map((pattern) => (
            <div key={pattern.id} className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold">{pattern.name}</h3>
                  <span className="text-xs text-zinc-500 capitalize">{pattern.category}</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-green-400">{pattern.successRate}%</div>
                  <div className="text-xs text-zinc-500">Success Rate</div>
                </div>
              </div>

              <p className="text-sm text-zinc-400 mb-3">{pattern.description}</p>

              <div className="mb-3">
                <div className="text-xs text-zinc-500 mb-1">Examples:</div>
                <ul className="space-y-1">
                  {pattern.examples.slice(0, 2).map((ex, idx) => (
                    <li key={idx} className="text-sm text-zinc-300 italic">"{ex}"</li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-wrap gap-1">
                {pattern.platforms.map((platform) => (
                  <span key={platform} className="px-2 py-0.5 text-xs rounded bg-zinc-800 capitalize">
                    {platform}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Topics Tab */}
      {activeTab === "topics" && (
        <div className="space-y-4">
          {topics.map((topic) => (
            <div key={topic.id} className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="text-xl">🔥</div>
                  <div>
                    <h3 className="font-semibold">{topic.name}</h3>
                    <span className="text-sm text-zinc-500 capitalize">{topic.category}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-green-400">+{topic.growthRate}%</div>
                  <div className="text-xs text-zinc-500">Growth</div>
                </div>
              </div>

              <div className="flex items-center gap-4 mb-3 text-sm">
                <span className="text-zinc-400">
                  Volume: <span className="text-white font-medium">{formatNumber(topic.volume)}</span>
                </span>
                <span className="text-zinc-400">
                  Sentiment: <span className={`font-medium ${
                    topic.sentiment === "positive" ? "text-green-400" :
                    topic.sentiment === "negative" ? "text-red-400" : "text-zinc-400"
                  }`}>{topic.sentiment}</span>
                </span>
              </div>

              <div className="flex flex-wrap gap-1">
                {topic.relatedHashtags.map((tag) => (
                  <span key={tag} className="px-2 py-0.5 text-xs rounded bg-indigo-500/20 text-indigo-300">
                    {tag}
                  </span>
                ))}
              </div>

              <div className="flex gap-1 mt-3">
                {topic.platform.map((p) => (
                  <span key={p} className="text-xl">{getPlatformIcon(p)}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === "alerts" && (
        <div className="space-y-4">
          {alerts.length === 0 ? (
            <div className="p-12 rounded-xl bg-zinc-900/50 border border-zinc-800 text-center">
              <p className="text-zinc-400">No alerts at this time</p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div key={alert.id} className={`p-4 rounded-xl border ${getUrgencyColor(alert.urgency)}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {alert.urgency === "high" && "🚨"}
                      {alert.urgency === "medium" && "⚠️"}
                      {alert.urgency === "low" && "💡"}
                    </div>
                    <div>
                      <h3 className="font-medium">{alert.title}</h3>
                      <p className="text-sm opacity-70 mt-1">{alert.description}</p>
                      <span className="text-xs opacity-50 mt-2 block">
                        {new Date(alert.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => dismissAlert(alert.id)}
                    className="p-1 opacity-50 hover:opacity-100 transition"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Content Detail Modal */}
      {selectedContent && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-zinc-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getPlatformIcon(selectedContent.platform)}</span>
                  <h2 className="text-xl font-semibold">Viral Content Analysis</h2>
                </div>
                <button
                  onClick={() => setSelectedContent(null)}
                  className="p-2 text-zinc-400 hover:text-white"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Author & Score */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-xl">
                    {selectedContent.author.displayName.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{selectedContent.author.displayName}</span>
                      {selectedContent.author.verified && (
                        <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm text-zinc-500">{formatNumber(selectedContent.author.followers)} followers</span>
                  </div>
                </div>
                <div className="text-center">
                  <div className={`text-4xl font-bold ${getViralScoreColor(selectedContent.metrics.viralScore)}`}>
                    {selectedContent.metrics.viralScore}
                  </div>
                  <div className="text-xs text-zinc-500">Viral Score</div>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 rounded-lg bg-zinc-800/50">
                <p className="text-white">{selectedContent.content.text}</p>
              </div>

              {/* Viral Factors */}
              <div>
                <h3 className="font-semibold mb-3">Why It's Viral</h3>
                <div className="space-y-2">
                  {selectedContent.analysis.viralFactors.map((factor, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/50">
                      <span className={`px-2 py-0.5 text-xs rounded ${
                        factor.impact === "high" ? "bg-green-500/20 text-green-400" :
                        factor.impact === "medium" ? "bg-yellow-500/20 text-yellow-400" :
                        "bg-zinc-500/20 text-zinc-400"
                      }`}>
                        {factor.impact}
                      </span>
                      <div>
                        <div className="font-medium">{factor.factor}</div>
                        <div className="text-sm text-zinc-400">{factor.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Apply to Your Content */}
              <button className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
                Apply This Pattern to Your Content
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
