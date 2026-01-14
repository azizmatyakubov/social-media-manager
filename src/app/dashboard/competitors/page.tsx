"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";

interface CompetitorSnapshot {
  followers: number;
  following: number;
  totalPosts: number;
  engagementRate: number;
  postsPerDay: number;
  avgLikes: number;
  avgRetweets: number;
  avgReplies: number;
  peakHours: number[];
  topHashtags: string[];
  topPosts: Array<{
    id: string;
    content: string;
    likes: number;
    retweets: number;
    postedAt: string;
  }> | null;
  createdAt: string;
}

interface Competitor {
  id: string;
  username: string;
  name: string | null;
  platform: string;
  profileUrl: string | null;
  createdAt: string;
  snapshots: CompetitorSnapshot[];
}

interface TrendData {
  dates: string[];
  followers: number[];
  engagementRate: number[];
  postsPerDay: number[];
}

interface ComparisonData {
  userMetrics: {
    followers: number;
    engagementRate: number;
  } | null;
  competitors: Array<{
    competitor: {
      username: string;
      name: string | null;
      platform: string;
    };
    metrics: {
      followers: number;
      engagementRate: number;
      postsPerDay: number;
      avgLikes: number;
    };
    comparison: {
      followerDiff: number;
      engagementDiff: number;
    } | null;
  }>;
}

type ViewMode = "overview" | "comparison" | "trends" | "content";

export default function CompetitorsPage() {
  const { data: session, status } = useSession();
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCompetitor, setNewCompetitor] = useState({ username: "", name: "" });
  const [insights, setInsights] = useState<string[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("overview");
  const [selectedCompetitor, setSelectedCompetitor] = useState<Competitor | null>(null);
  const [trendData, setTrendData] = useState<TrendData | null>(null);
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [loadingTrends, setLoadingTrends] = useState(false);
  const [trendDays, setTrendDays] = useState(30);

  useEffect(() => {
    if (status === "authenticated") {
      fetchCompetitors();
      fetchComparison();
    }
  }, [status]);

  useEffect(() => {
    if (selectedCompetitor && viewMode === "trends") {
      fetchTrends(selectedCompetitor.id);
    }
  }, [selectedCompetitor, viewMode, trendDays]);

  if (status === "loading") return <div className="p-8">Loading...</div>;
  if (status === "unauthenticated") redirect("/login");

  async function fetchCompetitors() {
    try {
      const res = await fetch("/api/competitors");
      const data = await res.json();
      setCompetitors(data);
      if (data.length > 0 && !selectedCompetitor) {
        setSelectedCompetitor(data[0]);
      }
    } catch (error) {
      console.error("Failed to fetch competitors:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchComparison() {
    try {
      const res = await fetch("/api/competitors?action=compare");
      const data = await res.json();
      setComparisonData(data);
    } catch (error) {
      console.error("Failed to fetch comparison:", error);
    }
  }

  async function fetchTrends(competitorId: string) {
    setLoadingTrends(true);
    try {
      const res = await fetch(`/api/competitors?action=trends&competitorId=${competitorId}&days=${trendDays}`);
      const data = await res.json();
      setTrendData(data);
    } catch (error) {
      console.error("Failed to fetch trends:", error);
    } finally {
      setLoadingTrends(false);
    }
  }

  async function addCompetitor() {
    if (!newCompetitor.username) return;

    const res = await fetch("/api/competitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: newCompetitor.username,
        name: newCompetitor.name || undefined,
        platform: "X",
      }),
    });

    if (res.ok) {
      setShowAddModal(false);
      setNewCompetitor({ username: "", name: "" });
      fetchCompetitors();
      fetchComparison();
    } else {
      const error = await res.json();
      alert(error.error || "Failed to add competitor");
    }
  }

  async function removeCompetitor(id: string) {
    if (!confirm("Remove this competitor?")) return;

    await fetch(`/api/competitors?competitorId=${id}`, {
      method: "DELETE",
    });
    fetchCompetitors();
    fetchComparison();
    if (selectedCompetitor?.id === id) {
      setSelectedCompetitor(null);
    }
  }

  async function getInsights() {
    setLoadingInsights(true);
    try {
      const res = await fetch("/api/competitors?action=insights");
      const data = await res.json();
      setInsights(data.insights || []);
    } catch (error) {
      console.error("Failed to get insights:", error);
    } finally {
      setLoadingInsights(false);
    }
  }

  function formatNumber(num: number): string {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  }

  function renderMiniChart(data: number[], color: string) {
    if (!data || data.length === 0) return null;
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const width = 100;
    const height = 30;
    const points = data.map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    }).join(" ");

    return (
      <svg width={width} height={height} className="overflow-visible">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          points={points}
        />
      </svg>
    );
  }

  function renderTrendChart() {
    if (!trendData || trendData.dates.length === 0) {
      return (
        <div className="text-center py-12 text-[var(--x-text-secondary)]">
          No trend data available yet. Data will be collected over time.
        </div>
      );
    }

    const { dates, followers, engagementRate, postsPerDay } = trendData;
    const chartHeight = 200;
    const chartWidth = 600;

    const normalize = (data: number[]) => {
      const max = Math.max(...data);
      const min = Math.min(...data);
      const range = max - min || 1;
      return data.map(v => ((v - min) / range) * chartHeight);
    };

    const normalizedFollowers = normalize(followers);
    const normalizedEngagement = normalize(engagementRate);
    const normalizedPosts = normalize(postsPerDay);

    const createPath = (data: number[]) => {
      return data.map((v, i) => {
        const x = (i / (data.length - 1)) * chartWidth;
        const y = chartHeight - v;
        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
      }).join(" ");
    };

    return (
      <div className="space-y-4">
        <div className="flex gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span>Followers</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Engagement Rate</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
            <span>Posts/Day</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <svg width={chartWidth} height={chartHeight + 40} className="overflow-visible">
            <path d={createPath(normalizedFollowers)} fill="none" stroke="#3b82f6" strokeWidth="2" />
            <path d={createPath(normalizedEngagement)} fill="none" stroke="#22c55e" strokeWidth="2" />
            <path d={createPath(normalizedPosts)} fill="none" stroke="#a855f7" strokeWidth="2" />
            {dates.filter((_, i) => i % Math.ceil(dates.length / 6) === 0).map((date, i, arr) => {
              const x = (i / (arr.length - 1)) * chartWidth;
              return (
                <text
                  key={date}
                  x={x}
                  y={chartHeight + 20}
                  textAnchor="middle"
                  className="fill-[var(--x-text-secondary)] text-xs"
                >
                  {date.slice(5)}
                </text>
              );
            })}
          </svg>
        </div>
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[var(--x-border)]">
          <div>
            <p className="text-sm text-[var(--x-text-secondary)]">Follower Change</p>
            <p className={`text-xl font-bold ${followers[followers.length - 1] > followers[0] ? "text-green-500" : "text-red-500"}`}>
              {followers[followers.length - 1] > followers[0] ? "+" : ""}{formatNumber(followers[followers.length - 1] - followers[0])}
            </p>
          </div>
          <div>
            <p className="text-sm text-[var(--x-text-secondary)]">Avg Engagement</p>
            <p className="text-xl font-bold">
              {(engagementRate.reduce((a, b) => a + b, 0) / engagementRate.length).toFixed(2)}%
            </p>
          </div>
          <div>
            <p className="text-sm text-[var(--x-text-secondary)]">Avg Posts/Day</p>
            <p className="text-xl font-bold">
              {(postsPerDay.reduce((a, b) => a + b, 0) / postsPerDay.length).toFixed(1)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  function renderComparisonChart() {
    if (!comparisonData || comparisonData.competitors.length === 0) {
      return (
        <div className="text-center py-12 text-[var(--x-text-secondary)]">
          Add competitors to see comparison data.
        </div>
      );
    }

    const allData = [
      ...(comparisonData.userMetrics ? [{
        name: "You",
        isUser: true,
        followers: comparisonData.userMetrics.followers,
        engagementRate: comparisonData.userMetrics.engagementRate,
        postsPerDay: 0,
        avgLikes: 0,
      }] : []),
      ...comparisonData.competitors.map(c => ({
        name: c.competitor.username,
        isUser: false,
        ...c.metrics,
      })),
    ];

    const maxFollowers = Math.max(...allData.map(d => d.followers)) || 1;
    const maxEngagement = Math.max(...allData.map(d => d.engagementRate)) || 1;

    return (
      <div className="space-y-6">
        {/* Followers Comparison Bar Chart */}
        <div>
          <h4 className="font-medium mb-4">Followers Comparison</h4>
          <div className="space-y-3">
            {allData.map((item, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-24 text-sm truncate">
                  {item.isUser ? <span className="font-bold text-[var(--x-blue)]">{item.name}</span> : `@${item.name}`}
                </div>
                <div className="flex-1 h-8 bg-[var(--x-bg-secondary)] rounded overflow-hidden">
                  <div
                    className={`h-full ${item.isUser ? "bg-[var(--x-blue)]" : "bg-gray-500"} transition-all duration-500`}
                    style={{ width: `${(item.followers / maxFollowers) * 100}%` }}
                  ></div>
                </div>
                <div className="w-20 text-right text-sm font-medium">
                  {formatNumber(item.followers)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Engagement Rate Comparison */}
        <div>
          <h4 className="font-medium mb-4">Engagement Rate Comparison</h4>
          <div className="space-y-3">
            {allData.map((item, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-24 text-sm truncate">
                  {item.isUser ? <span className="font-bold text-green-500">{item.name}</span> : `@${item.name}`}
                </div>
                <div className="flex-1 h-8 bg-[var(--x-bg-secondary)] rounded overflow-hidden">
                  <div
                    className={`h-full ${item.isUser ? "bg-green-500" : "bg-gray-500"} transition-all duration-500`}
                    style={{ width: `${(item.engagementRate / maxEngagement) * 100}%` }}
                  ></div>
                </div>
                <div className="w-20 text-right text-sm font-medium">
                  {item.engagementRate.toFixed(2)}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--x-border)]">
                <th className="text-left py-3 px-2">Account</th>
                <th className="text-right py-3 px-2">Followers</th>
                <th className="text-right py-3 px-2">Engagement</th>
                <th className="text-right py-3 px-2">Posts/Day</th>
                <th className="text-right py-3 px-2">Avg Likes</th>
              </tr>
            </thead>
            <tbody>
              {comparisonData.userMetrics && (
                <tr className="border-b border-[var(--x-border)] bg-[var(--x-blue)]/10">
                  <td className="py-3 px-2 font-bold">You</td>
                  <td className="text-right py-3 px-2">{formatNumber(comparisonData.userMetrics.followers)}</td>
                  <td className="text-right py-3 px-2">{comparisonData.userMetrics.engagementRate.toFixed(2)}%</td>
                  <td className="text-right py-3 px-2">-</td>
                  <td className="text-right py-3 px-2">-</td>
                </tr>
              )}
              {comparisonData.competitors.map((c, i) => (
                <tr key={i} className="border-b border-[var(--x-border)]">
                  <td className="py-3 px-2">@{c.competitor.username}</td>
                  <td className="text-right py-3 px-2">{formatNumber(c.metrics.followers)}</td>
                  <td className="text-right py-3 px-2">{c.metrics.engagementRate.toFixed(2)}%</td>
                  <td className="text-right py-3 px-2">{c.metrics.postsPerDay.toFixed(1)}</td>
                  <td className="text-right py-3 px-2">{formatNumber(c.metrics.avgLikes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function renderTopContent() {
    const snapshot = selectedCompetitor?.snapshots[0];
    const topPosts = snapshot?.topPosts || [];

    if (topPosts.length === 0) {
      return (
        <div className="text-center py-12 text-[var(--x-text-secondary)]">
          No top content data available yet.
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold">Top Performing Posts from @{selectedCompetitor?.username}</h3>
          <span className="text-sm text-[var(--x-text-secondary)]">
            Last 30 days
          </span>
        </div>
        <div className="space-y-4">
          {topPosts.map((post, i) => (
            <div key={i} className="x-card p-4">
              <p className="mb-3">{post.content}</p>
              <div className="flex gap-6 text-sm text-[var(--x-text-secondary)]">
                <span>{formatNumber(post.likes)} likes</span>
                <span>{formatNumber(post.retweets)} retweets</span>
                <span>{new Date(post.postedAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Content Patterns */}
        {snapshot && (
          <div className="mt-8 space-y-6">
            <h3 className="font-bold">Content Patterns</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="x-card p-4">
                <h4 className="font-medium mb-3">Peak Posting Hours</h4>
                <div className="flex flex-wrap gap-2">
                  {snapshot.peakHours.length > 0 ? (
                    snapshot.peakHours.map((hour) => (
                      <span key={hour} className="x-badge">
                        {hour}:00
                      </span>
                    ))
                  ) : (
                    <span className="text-[var(--x-text-secondary)]">No data</span>
                  )}
                </div>
              </div>
              <div className="x-card p-4">
                <h4 className="font-medium mb-3">Top Hashtags</h4>
                <div className="flex flex-wrap gap-2">
                  {snapshot.topHashtags.length > 0 ? (
                    snapshot.topHashtags.slice(0, 10).map((tag) => (
                      <span key={tag} className="x-badge">
                        #{tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-[var(--x-text-secondary)]">No data</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Competitor Analysis</h1>
          <p className="text-[var(--x-text-secondary)]">
            Monitor competitors and learn from their strategies
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={getInsights}
            disabled={loadingInsights || competitors.length === 0}
            className="btn-secondary"
          >
            {loadingInsights ? "Analyzing..." : "Get AI Insights"}
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            Add Competitor
          </button>
        </div>
      </div>

      {/* AI Insights */}
      {insights.length > 0 && (
        <div className="x-card p-6 mb-8 border-l-4 border-[var(--x-blue)]">
          <div className="flex justify-between items-start mb-4">
            <h3 className="font-bold">AI-Powered Insights</h3>
            <button
              onClick={() => setInsights([])}
              className="text-[var(--x-text-secondary)] hover:text-[var(--x-text-primary)]"
            >
              Dismiss
            </button>
          </div>
          <ul className="space-y-2">
            {insights.map((insight, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-[var(--x-blue)]">&#x2022;</span>
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* View Mode Tabs */}
      <div className="flex gap-2 mb-6 border-b border-[var(--x-border)]">
        {(["overview", "comparison", "trends", "content"] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`px-4 py-2 -mb-px border-b-2 transition-colors capitalize ${
              viewMode === mode
                ? "border-[var(--x-blue)] text-[var(--x-blue)]"
                : "border-transparent text-[var(--x-text-secondary)] hover:text-[var(--x-text-primary)]"
            }`}
          >
            {mode}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - Competitors List */}
        <div className="lg:col-span-1">
          <div className="x-card p-4 sticky top-4">
            <h3 className="font-bold mb-4">Tracked Competitors</h3>
            {loading ? (
              <div className="text-center py-4 text-[var(--x-text-secondary)]">
                Loading...
              </div>
            ) : competitors.length === 0 ? (
              <p className="text-sm text-[var(--x-text-secondary)]">
                No competitors tracked yet.
              </p>
            ) : (
              <div className="space-y-2">
                {competitors.map((competitor) => {
                  const snapshot = competitor.snapshots[0];
                  return (
                    <div
                      key={competitor.id}
                      onClick={() => setSelectedCompetitor(competitor)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedCompetitor?.id === competitor.id
                          ? "bg-[var(--x-blue)]/10 border border-[var(--x-blue)]"
                          : "hover:bg-[var(--x-bg-secondary)]"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">
                            {competitor.name || competitor.username}
                          </p>
                          <p className="text-sm text-[var(--x-text-secondary)]">
                            @{competitor.username}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeCompetitor(competitor.id);
                          }}
                          className="text-xs text-[var(--x-text-secondary)] hover:text-red-500"
                        >
                          Remove
                        </button>
                      </div>
                      {snapshot && (
                        <div className="mt-2 text-xs text-[var(--x-text-secondary)]">
                          {formatNumber(snapshot.followers)} followers
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {viewMode === "overview" && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="x-card p-4">
                  <p className="text-sm text-[var(--x-text-secondary)]">Total Tracked</p>
                  <p className="text-3xl font-bold">{competitors.length}</p>
                  <p className="text-sm text-[var(--x-text-secondary)]">competitors</p>
                </div>
                <div className="x-card p-4">
                  <p className="text-sm text-[var(--x-text-secondary)]">Avg Engagement</p>
                  <p className="text-3xl font-bold">
                    {competitors.length > 0
                      ? (
                          competitors.reduce((sum, c) => sum + (c.snapshots[0]?.engagementRate || 0), 0) /
                          competitors.length
                        ).toFixed(2)
                      : "0"}%
                  </p>
                  <p className="text-sm text-[var(--x-text-secondary)]">across all</p>
                </div>
                <div className="x-card p-4">
                  <p className="text-sm text-[var(--x-text-secondary)]">Top Performer</p>
                  <p className="text-xl font-bold truncate">
                    {competitors.length > 0
                      ? "@" + competitors.reduce((max, c) =>
                          (c.snapshots[0]?.engagementRate || 0) > (max.snapshots[0]?.engagementRate || 0)
                            ? c
                            : max
                        ).username
                      : "-"}
                  </p>
                  <p className="text-sm text-[var(--x-text-secondary)]">by engagement</p>
                </div>
              </div>

              {/* Competitors Grid */}
              {competitors.length === 0 ? (
                <div className="x-card p-12 text-center">
                  <p className="text-[var(--x-text-secondary)] mb-4">
                    No competitors tracked yet. Add some to start monitoring.
                  </p>
                  <button onClick={() => setShowAddModal(true)} className="btn-primary">
                    Add Your First Competitor
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {competitors.map((competitor) => {
                    const snapshot = competitor.snapshots[0];
                    return (
                      <div
                        key={competitor.id}
                        className="x-card p-6 cursor-pointer hover:border-[var(--x-blue)] transition-colors"
                        onClick={() => {
                          setSelectedCompetitor(competitor);
                          setViewMode("trends");
                        }}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-bold text-lg">
                              {competitor.name || competitor.username}
                            </h3>
                            <p className="text-[var(--x-text-secondary)]">
                              @{competitor.username}
                            </p>
                          </div>
                          <span className="x-badge">{competitor.platform}</span>
                        </div>

                        {snapshot ? (
                          <>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                              <div>
                                <p className="text-2xl font-bold">
                                  {formatNumber(snapshot.followers)}
                                </p>
                                <p className="text-sm text-[var(--x-text-secondary)]">
                                  Followers
                                </p>
                              </div>
                              <div>
                                <p className="text-2xl font-bold">
                                  {snapshot.engagementRate.toFixed(2)}%
                                </p>
                                <p className="text-sm text-[var(--x-text-secondary)]">
                                  Engagement
                                </p>
                              </div>
                              <div>
                                <p className="text-2xl font-bold">
                                  {snapshot.postsPerDay.toFixed(1)}
                                </p>
                                <p className="text-sm text-[var(--x-text-secondary)]">
                                  Posts/Day
                                </p>
                              </div>
                              <div>
                                <p className="text-2xl font-bold">
                                  {formatNumber(snapshot.avgLikes)}
                                </p>
                                <p className="text-sm text-[var(--x-text-secondary)]">
                                  Avg Likes
                                </p>
                              </div>
                            </div>
                            <div className="text-sm text-[var(--x-text-secondary)]">
                              Click to view trends
                            </div>
                          </>
                        ) : (
                          <p className="text-[var(--x-text-secondary)] text-sm">
                            No data yet. Data will be collected over time.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {viewMode === "comparison" && (
            <div className="x-card p-6">
              <h3 className="font-bold text-lg mb-6">Side-by-Side Comparison</h3>
              {renderComparisonChart()}
            </div>
          )}

          {viewMode === "trends" && (
            <div className="x-card p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg">
                  {selectedCompetitor
                    ? `Trends for @${selectedCompetitor.username}`
                    : "Select a competitor"}
                </h3>
                {selectedCompetitor && (
                  <select
                    value={trendDays}
                    onChange={(e) => setTrendDays(parseInt(e.target.value))}
                    className="x-input w-auto"
                  >
                    <option value={7}>Last 7 days</option>
                    <option value={14}>Last 14 days</option>
                    <option value={30}>Last 30 days</option>
                    <option value={90}>Last 90 days</option>
                  </select>
                )}
              </div>
              {loadingTrends ? (
                <div className="text-center py-12">Loading trends...</div>
              ) : selectedCompetitor ? (
                renderTrendChart()
              ) : (
                <div className="text-center py-12 text-[var(--x-text-secondary)]">
                  Select a competitor from the sidebar to view trends.
                </div>
              )}
            </div>
          )}

          {viewMode === "content" && (
            <div className="x-card p-6">
              {selectedCompetitor ? (
                renderTopContent()
              ) : (
                <div className="text-center py-12 text-[var(--x-text-secondary)]">
                  Select a competitor from the sidebar to view their top content.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Competitor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 x-modal-overlay flex items-center justify-center z-50">
          <div className="x-modal p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Add Competitor</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Username</label>
                <input
                  type="text"
                  placeholder="username (without @)"
                  value={newCompetitor.username}
                  onChange={(e) =>
                    setNewCompetitor({ ...newCompetitor, username: e.target.value.replace("@", "") })
                  }
                  className="x-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Display Name (optional)</label>
                <input
                  type="text"
                  placeholder="Display name"
                  value={newCompetitor.name}
                  onChange={(e) =>
                    setNewCompetitor({ ...newCompetitor, name: e.target.value })
                  }
                  className="x-input"
                />
              </div>
              <div className="text-sm text-[var(--x-text-secondary)]">
                Tip: Add your top 3-5 competitors to get the best insights.
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={addCompetitor}
                disabled={!newCompetitor.username}
                className="btn-primary"
              >
                Add Competitor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
