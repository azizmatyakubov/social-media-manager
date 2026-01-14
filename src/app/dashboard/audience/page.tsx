"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";

interface HourlyData {
  hour: number;
  engagements: number;
  impressions: number;
  rate: number;
}

interface DailyData {
  day: string;
  engagements: number;
  impressions: number;
  rate: number;
}

interface ContentPerformance {
  type: string;
  avgLikes: number;
  avgRetweets: number;
  avgReplies: number;
  avgEngagementRate: number;
  count: number;
}

interface GrowthData {
  date: string;
  followers: number;
  following: number;
  posts: number;
}

interface TopPost {
  id: string;
  content: string;
  likes: number;
  retweets: number;
  replies: number;
  impressions: number;
  postedAt: string;
}

interface Summary {
  currentPeriod: {
    posts: number;
    likes: number;
    retweets: number;
    replies: number;
    impressions: number;
    totalEngagement: number;
  };
  previousPeriod: {
    posts: number;
    totalEngagement: number;
  };
  change: {
    engagement: number;
    posts: number;
  };
}

interface AudienceAnalysis {
  totalFollowers: number;
  followersGrowth: number;
  followersGrowthPercent: number;
  avgEngagementRate: number;
  topEngagementHours: number[];
  topEngagementDays: string[];
  estimatedDemographics: {
    interests: string[];
    locations: string[];
    contentPreferences: string[];
  };
}

type ViewMode = "overview" | "timing" | "content" | "growth" | "demographics";

export default function AudienceInsightsPage() {
  const { data: session, status } = useSession();
  const [viewMode, setViewMode] = useState<ViewMode>("overview");
  const [loading, setLoading] = useState(true);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  const [byHour, setByHour] = useState<HourlyData[]>([]);
  const [byDay, setByDay] = useState<DailyData[]>([]);
  const [contentPerformance, setContentPerformance] = useState<ContentPerformance[]>([]);
  const [growth, setGrowth] = useState<GrowthData[]>([]);
  const [topPosts, setTopPosts] = useState<TopPost[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [analysis, setAnalysis] = useState<AudienceAnalysis | null>(null);
  const [growthDays, setGrowthDays] = useState(30);

  useEffect(() => {
    if (status === "authenticated") {
      fetchData();
    }
  }, [status]);

  useEffect(() => {
    if (status === "authenticated" && viewMode === "growth") {
      fetchGrowth();
    }
  }, [growthDays, viewMode]);

  if (status === "loading") return <div className="p-8">Loading...</div>;
  if (status === "unauthenticated") redirect("/login");

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch("/api/audience");
      const data = await res.json();
      setByHour(data.byHour || []);
      setByDay(data.byDay || []);
      setContentPerformance(data.contentPerformance || []);
      setGrowth(data.growth || []);
      setTopPosts(data.topPosts || []);
      setSummary(data.summary || null);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchGrowth() {
    try {
      const res = await fetch(`/api/audience?action=growth&days=${growthDays}`);
      const data = await res.json();
      setGrowth(data);
    } catch (error) {
      console.error("Failed to fetch growth:", error);
    }
  }

  async function analyzeAudience() {
    setLoadingAnalysis(true);
    try {
      const res = await fetch("/api/audience?action=analyze");
      const data = await res.json();
      setAnalysis(data);
    } catch (error) {
      console.error("Failed to analyze audience:", error);
    } finally {
      setLoadingAnalysis(false);
    }
  }

  function formatNumber(num: number): string {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  }

  function formatHour(hour: number): string {
    const ampm = hour >= 12 ? "PM" : "AM";
    const h = hour % 12 || 12;
    return `${h}${ampm}`;
  }

  function renderHourlyChart() {
    if (byHour.length === 0) return null;
    const maxRate = Math.max(...byHour.map((h) => h.rate)) || 1;

    return (
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-[var(--x-text-secondary)]">
          <span>Hour</span>
          <span>Engagement Rate</span>
        </div>
        <div className="grid grid-cols-24 gap-1 h-32">
          {byHour.map((item) => (
            <div
              key={item.hour}
              className="relative group"
              title={`${formatHour(item.hour)}: ${item.rate.toFixed(2)}%`}
            >
              <div className="absolute bottom-0 w-full bg-[var(--x-bg-secondary)] rounded-t">
                <div
                  className="bg-[var(--x-blue)] rounded-t transition-all"
                  style={{ height: `${(item.rate / maxRate) * 100}%`, minHeight: "2px" }}
                ></div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-[var(--x-text-secondary)]">
          <span>12AM</span>
          <span>6AM</span>
          <span>12PM</span>
          <span>6PM</span>
          <span>12AM</span>
        </div>
      </div>
    );
  }

  function renderDailyChart() {
    if (byDay.length === 0) return null;
    const maxRate = Math.max(...byDay.map((d) => d.rate)) || 1;

    return (
      <div className="space-y-3">
        {byDay.map((item) => (
          <div key={item.day} className="flex items-center gap-4">
            <span className="w-24 text-sm">{item.day.slice(0, 3)}</span>
            <div className="flex-1 h-6 bg-[var(--x-bg-secondary)] rounded overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all"
                style={{ width: `${(item.rate / maxRate) * 100}%` }}
              ></div>
            </div>
            <span className="w-16 text-right text-sm">{item.rate.toFixed(2)}%</span>
          </div>
        ))}
      </div>
    );
  }

  function renderGrowthChart() {
    if (growth.length === 0) return <p className="text-[var(--x-text-secondary)]">No growth data available.</p>;

    const minFollowers = Math.min(...growth.map((g) => g.followers));
    const maxFollowers = Math.max(...growth.map((g) => g.followers));
    const range = maxFollowers - minFollowers || 1;
    const chartHeight = 150;
    const chartWidth = 600;

    const points = growth.map((g, i) => {
      const x = (i / (growth.length - 1)) * chartWidth;
      const y = chartHeight - ((g.followers - minFollowers) / range) * chartHeight;
      return `${x},${y}`;
    }).join(" ");

    return (
      <div className="overflow-x-auto">
        <svg width={chartWidth} height={chartHeight + 30} className="overflow-visible">
          <defs>
            <linearGradient id="followerGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon
            points={`0,${chartHeight} ${points} ${chartWidth},${chartHeight}`}
            fill="url(#followerGradient)"
          />
          <polyline fill="none" stroke="#3b82f6" strokeWidth="2" points={points} />
          {growth.filter((_, i) => i % Math.ceil(growth.length / 6) === 0).map((g, i, arr) => {
            const x = (i / (arr.length - 1)) * chartWidth;
            return (
              <text
                key={g.date}
                x={x}
                y={chartHeight + 20}
                textAnchor="middle"
                className="fill-[var(--x-text-secondary)] text-xs"
              >
                {g.date.slice(5)}
              </text>
            );
          })}
        </svg>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold">Audience Insights</h1>
          <p className="text-[var(--x-text-secondary)]">
            Understand your audience and optimize your content
          </p>
        </div>
        <button
          onClick={analyzeAudience}
          disabled={loadingAnalysis}
          className="btn-primary"
        >
          {loadingAnalysis ? "Analyzing..." : "AI Analysis"}
        </button>
      </div>

      {/* View Mode Tabs */}
      <div className="flex gap-2 mb-6 border-b border-[var(--x-border)]">
        {(["overview", "timing", "content", "growth", "demographics"] as ViewMode[]).map((mode) => (
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

      {loading ? (
        <div className="text-center py-12 text-[var(--x-text-secondary)]">Loading insights...</div>
      ) : (
        <>
          {/* Overview */}
          {viewMode === "overview" && summary && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="x-card p-6">
                  <p className="text-sm text-[var(--x-text-secondary)]">Total Posts (30d)</p>
                  <p className="text-3xl font-bold">{summary.currentPeriod.posts}</p>
                  <p className={`text-sm ${summary.change.posts >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {summary.change.posts >= 0 ? "+" : ""}{summary.change.posts.toFixed(1)}% vs prev
                  </p>
                </div>
                <div className="x-card p-6">
                  <p className="text-sm text-[var(--x-text-secondary)]">Total Engagements</p>
                  <p className="text-3xl font-bold">{formatNumber(summary.currentPeriod.totalEngagement)}</p>
                  <p className={`text-sm ${summary.change.engagement >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {summary.change.engagement >= 0 ? "+" : ""}{summary.change.engagement.toFixed(1)}% vs prev
                  </p>
                </div>
                <div className="x-card p-6">
                  <p className="text-sm text-[var(--x-text-secondary)]">Total Impressions</p>
                  <p className="text-3xl font-bold">{formatNumber(summary.currentPeriod.impressions)}</p>
                </div>
                <div className="x-card p-6">
                  <p className="text-sm text-[var(--x-text-secondary)]">Avg Engagement Rate</p>
                  <p className="text-3xl font-bold">
                    {summary.currentPeriod.impressions > 0
                      ? ((summary.currentPeriod.totalEngagement / summary.currentPeriod.impressions) * 100).toFixed(2)
                      : 0}%
                  </p>
                </div>
              </div>

              {/* Engagement Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="x-card p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-red-500 text-2xl">&#9829;</span>
                    <span className="text-sm text-[var(--x-text-secondary)]">Likes</span>
                  </div>
                  <p className="text-2xl font-bold">{formatNumber(summary.currentPeriod.likes)}</p>
                </div>
                <div className="x-card p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-green-500 text-2xl">&#8635;</span>
                    <span className="text-sm text-[var(--x-text-secondary)]">Retweets</span>
                  </div>
                  <p className="text-2xl font-bold">{formatNumber(summary.currentPeriod.retweets)}</p>
                </div>
                <div className="x-card p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[var(--x-blue)] text-2xl">&#128172;</span>
                    <span className="text-sm text-[var(--x-text-secondary)]">Replies</span>
                  </div>
                  <p className="text-2xl font-bold">{formatNumber(summary.currentPeriod.replies)}</p>
                </div>
              </div>

              {/* Top Posts */}
              <div className="x-card p-6">
                <h3 className="font-bold mb-4">Top Performing Posts</h3>
                {topPosts.length === 0 ? (
                  <p className="text-[var(--x-text-secondary)]">No published posts yet.</p>
                ) : (
                  <div className="space-y-4">
                    {topPosts.map((post) => (
                      <div key={post.id} className="p-4 bg-[var(--x-bg-secondary)] rounded-lg">
                        <p className="text-sm mb-2 line-clamp-2">{post.content}</p>
                        <div className="flex gap-6 text-sm text-[var(--x-text-secondary)]">
                          <span>{post.likes} likes</span>
                          <span>{post.retweets} retweets</span>
                          <span>{post.replies} replies</span>
                          <span>{formatNumber(post.impressions)} impressions</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Timing */}
          {viewMode === "timing" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="x-card p-6">
                <h3 className="font-bold mb-4">Engagement by Hour</h3>
                {renderHourlyChart()}
                {byHour.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-[var(--x-border)]">
                    <p className="text-sm text-[var(--x-text-secondary)]">Best times to post:</p>
                    <div className="flex gap-2 mt-2">
                      {byHour
                        .sort((a, b) => b.rate - a.rate)
                        .slice(0, 3)
                        .map((h) => (
                          <span key={h.hour} className="px-3 py-1 bg-[var(--x-blue)]/20 text-[var(--x-blue)] rounded-full text-sm">
                            {formatHour(h.hour)}
                          </span>
                        ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="x-card p-6">
                <h3 className="font-bold mb-4">Engagement by Day</h3>
                {renderDailyChart()}
                {byDay.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-[var(--x-border)]">
                    <p className="text-sm text-[var(--x-text-secondary)]">Best days to post:</p>
                    <div className="flex gap-2 mt-2">
                      {byDay
                        .sort((a, b) => b.rate - a.rate)
                        .slice(0, 3)
                        .map((d) => (
                          <span key={d.day} className="px-3 py-1 bg-green-500/20 text-green-500 rounded-full text-sm">
                            {d.day}
                          </span>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Content Performance */}
          {viewMode === "content" && (
            <div className="x-card p-6">
              <h3 className="font-bold mb-6">Content Type Performance</h3>
              {contentPerformance.length === 0 ? (
                <p className="text-[var(--x-text-secondary)]">No published content yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[var(--x-border)]">
                        <th className="text-left py-3 px-4">Content Type</th>
                        <th className="text-right py-3 px-4">Posts</th>
                        <th className="text-right py-3 px-4">Avg Likes</th>
                        <th className="text-right py-3 px-4">Avg Retweets</th>
                        <th className="text-right py-3 px-4">Avg Replies</th>
                        <th className="text-right py-3 px-4">Engagement Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contentPerformance.map((item) => (
                        <tr key={item.type} className="border-b border-[var(--x-border)]">
                          <td className="py-4 px-4 font-medium">{item.type}</td>
                          <td className="text-right py-4 px-4">{item.count}</td>
                          <td className="text-right py-4 px-4">{item.avgLikes}</td>
                          <td className="text-right py-4 px-4">{item.avgRetweets}</td>
                          <td className="text-right py-4 px-4">{item.avgReplies}</td>
                          <td className="text-right py-4 px-4">
                            <span className={item.avgEngagementRate > 2 ? "text-green-500" : ""}>
                              {item.avgEngagementRate.toFixed(2)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Growth */}
          {viewMode === "growth" && (
            <div className="space-y-6">
              <div className="x-card p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold">Follower Growth</h3>
                  <select
                    value={growthDays}
                    onChange={(e) => setGrowthDays(parseInt(e.target.value))}
                    className="x-input w-auto"
                  >
                    <option value={7}>Last 7 days</option>
                    <option value={14}>Last 14 days</option>
                    <option value={30}>Last 30 days</option>
                    <option value={90}>Last 90 days</option>
                  </select>
                </div>
                {renderGrowthChart()}
              </div>

              {growth.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="x-card p-6">
                    <p className="text-sm text-[var(--x-text-secondary)]">Starting Followers</p>
                    <p className="text-2xl font-bold">{formatNumber(growth[0].followers)}</p>
                  </div>
                  <div className="x-card p-6">
                    <p className="text-sm text-[var(--x-text-secondary)]">Current Followers</p>
                    <p className="text-2xl font-bold">{formatNumber(growth[growth.length - 1].followers)}</p>
                  </div>
                  <div className="x-card p-6">
                    <p className="text-sm text-[var(--x-text-secondary)]">Net Change</p>
                    <p className={`text-2xl font-bold ${
                      growth[growth.length - 1].followers >= growth[0].followers ? "text-green-500" : "text-red-500"
                    }`}>
                      {growth[growth.length - 1].followers >= growth[0].followers ? "+" : ""}
                      {formatNumber(growth[growth.length - 1].followers - growth[0].followers)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Demographics */}
          {viewMode === "demographics" && (
            <div className="space-y-6">
              {!analysis ? (
                <div className="x-card p-12 text-center">
                  <p className="text-[var(--x-text-secondary)] mb-4">
                    Click &quot;AI Analysis&quot; to get insights about your audience demographics and interests.
                  </p>
                  <button
                    onClick={analyzeAudience}
                    disabled={loadingAnalysis}
                    className="btn-primary"
                  >
                    {loadingAnalysis ? "Analyzing..." : "Analyze My Audience"}
                  </button>
                </div>
              ) : (
                <>
                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="x-card p-6">
                      <p className="text-sm text-[var(--x-text-secondary)]">Total Followers</p>
                      <p className="text-3xl font-bold">{formatNumber(analysis.totalFollowers)}</p>
                    </div>
                    <div className="x-card p-6">
                      <p className="text-sm text-[var(--x-text-secondary)]">30-Day Growth</p>
                      <p className={`text-3xl font-bold ${analysis.followersGrowth >= 0 ? "text-green-500" : "text-red-500"}`}>
                        {analysis.followersGrowth >= 0 ? "+" : ""}{formatNumber(analysis.followersGrowth)}
                      </p>
                    </div>
                    <div className="x-card p-6">
                      <p className="text-sm text-[var(--x-text-secondary)]">Growth Rate</p>
                      <p className={`text-3xl font-bold ${analysis.followersGrowthPercent >= 0 ? "text-green-500" : "text-red-500"}`}>
                        {analysis.followersGrowthPercent >= 0 ? "+" : ""}{analysis.followersGrowthPercent.toFixed(1)}%
                      </p>
                    </div>
                    <div className="x-card p-6">
                      <p className="text-sm text-[var(--x-text-secondary)]">Avg Engagement</p>
                      <p className="text-3xl font-bold">{analysis.avgEngagementRate.toFixed(2)}%</p>
                    </div>
                  </div>

                  {/* Best Times */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="x-card p-6">
                      <h3 className="font-bold mb-4">Best Hours to Post</h3>
                      <div className="flex flex-wrap gap-2">
                        {analysis.topEngagementHours.map((hour) => (
                          <span key={hour} className="px-4 py-2 bg-[var(--x-blue)]/20 text-[var(--x-blue)] rounded-lg">
                            {formatHour(hour)}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="x-card p-6">
                      <h3 className="font-bold mb-4">Best Days to Post</h3>
                      <div className="flex flex-wrap gap-2">
                        {analysis.topEngagementDays.map((day) => (
                          <span key={day} className="px-4 py-2 bg-green-500/20 text-green-500 rounded-lg">
                            {day}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Estimated Demographics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="x-card p-6">
                      <h3 className="font-bold mb-4">Audience Interests</h3>
                      <div className="flex flex-wrap gap-2">
                        {analysis.estimatedDemographics.interests.map((interest, i) => (
                          <span key={i} className="px-3 py-1 bg-[var(--x-bg-secondary)] rounded-full text-sm">
                            {interest}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="x-card p-6">
                      <h3 className="font-bold mb-4">Likely Locations</h3>
                      <div className="flex flex-wrap gap-2">
                        {analysis.estimatedDemographics.locations.map((location, i) => (
                          <span key={i} className="px-3 py-1 bg-[var(--x-bg-secondary)] rounded-full text-sm">
                            {location}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="x-card p-6">
                      <h3 className="font-bold mb-4">Content Preferences</h3>
                      <div className="flex flex-wrap gap-2">
                        {analysis.estimatedDemographics.contentPreferences.map((pref, i) => (
                          <span key={i} className="px-3 py-1 bg-[var(--x-bg-secondary)] rounded-full text-sm">
                            {pref}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
