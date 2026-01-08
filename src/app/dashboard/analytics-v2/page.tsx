"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";

interface AnalyticsSummary {
  currentFollowers: number;
  followerGrowth: number;
  followerGrowthRate: string;
  totalEngagements: number;
  totalImpressions: number;
  totalClicks: number;
  postsPublished: number;
  avgEngagementRate: string;
}

interface TopPost {
  id: string;
  content: string;
  likes: number;
  retweets: number;
  impressions: number;
  engagementRate: string;
}

interface Trends {
  dates: string[];
  followers: number[];
  engagementRate: number[];
  impressions: number[];
}

interface BestTimes {
  bestHours: number[];
  bestDays: string[];
  recommendation: string;
}

export default function AdvancedAnalyticsPage() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [trends, setTrends] = useState<Trends | null>(null);
  const [topPosts, setTopPosts] = useState<TopPost[]>([]);
  const [bestTimes, setBestTimes] = useState<BestTimes | null>(null);
  const [contentPerformance, setContentPerformance] = useState<{
    mediaImpact: { withMedia: { avgEngagement: string }; withoutMedia: { avgEngagement: string }; recommendation: string };
    lengthImpact: { bestLength: string };
    hashtagImpact: { recommendation: string };
  } | null>(null);

  useEffect(() => {
    if (status === "authenticated") {
      fetchAnalytics();
    }
  }, [status, days]);

  if (status === "loading") return <div className="p-8">Loading...</div>;
  if (status === "unauthenticated") redirect("/login");

  async function fetchAnalytics() {
    setLoading(true);
    try {
      const [dashboardRes, timesRes, perfRes] = await Promise.all([
        fetch(`/api/analytics/dashboard?days=${days}`),
        fetch("/api/analytics/dashboard?action=best-times"),
        fetch("/api/analytics/dashboard?action=content-performance"),
      ]);

      const dashboard = await dashboardRes.json();
      const times = await timesRes.json();
      const perf = await perfRes.json();

      setSummary(dashboard.summary);
      setTrends(dashboard.trends);
      setTopPosts(dashboard.topPosts || []);
      setBestTimes(times);
      setContentPerformance(perf);
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Advanced Analytics</h1>
          <p className="text-[var(--x-text-secondary)]">
            Deep insights into your social media performance
          </p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(parseInt(e.target.value))}
          className="x-input max-w-[150px]"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[var(--x-text-secondary)]">
          Loading analytics...
        </div>
      ) : !summary ? (
        <div className="x-card p-12 text-center">
          <p className="text-[var(--x-text-secondary)]">
            No analytics data yet. Start posting to see your performance.
          </p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="x-card p-4">
              <p className="text-2xl font-bold">
                {summary.currentFollowers.toLocaleString()}
              </p>
              <p className="text-sm text-[var(--x-text-secondary)]">Followers</p>
              <p className={`text-sm ${summary.followerGrowth >= 0 ? "text-green-500" : "text-red-500"}`}>
                {summary.followerGrowth >= 0 ? "+" : ""}{summary.followerGrowth} ({summary.followerGrowthRate}%)
              </p>
            </div>
            <div className="x-card p-4">
              <p className="text-2xl font-bold">
                {summary.totalEngagements.toLocaleString()}
              </p>
              <p className="text-sm text-[var(--x-text-secondary)]">Engagements</p>
            </div>
            <div className="x-card p-4">
              <p className="text-2xl font-bold">
                {summary.totalImpressions.toLocaleString()}
              </p>
              <p className="text-sm text-[var(--x-text-secondary)]">Impressions</p>
            </div>
            <div className="x-card p-4">
              <p className="text-2xl font-bold">{summary.avgEngagementRate}%</p>
              <p className="text-sm text-[var(--x-text-secondary)]">Avg Engagement</p>
            </div>
          </div>

          {/* Best Posting Times */}
          {bestTimes && (
            <div className="x-card p-6 mb-8">
              <h3 className="font-bold mb-4">Best Posting Times</h3>
              <p className="text-[var(--x-blue)] mb-4">{bestTimes.recommendation}</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-[var(--x-text-secondary)] mb-2">Best Hours</p>
                  <div className="flex gap-2">
                    {bestTimes.bestHours.map((hour) => (
                      <span key={hour} className="x-badge x-badge-blue">
                        {hour}:00
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-[var(--x-text-secondary)] mb-2">Best Days</p>
                  <div className="flex gap-2">
                    {bestTimes.bestDays.map((day) => (
                      <span key={day} className="x-badge x-badge-green">
                        {day}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Content Performance Insights */}
          {contentPerformance && (
            <div className="x-card p-6 mb-8">
              <h3 className="font-bold mb-4">Content Insights</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-[var(--x-bg-secondary)] rounded-lg">
                  <p className="font-bold mb-2">Media Impact</p>
                  <p className="text-sm text-[var(--x-text-secondary)]">
                    {contentPerformance.mediaImpact.recommendation}
                  </p>
                  <div className="mt-2 text-sm">
                    <span className="text-[var(--x-blue)]">
                      With media: {contentPerformance.mediaImpact.withMedia.avgEngagement} avg
                    </span>
                  </div>
                </div>
                <div className="p-4 bg-[var(--x-bg-secondary)] rounded-lg">
                  <p className="font-bold mb-2">Optimal Length</p>
                  <p className="text-sm text-[var(--x-text-secondary)]">
                    Best performing: <span className="text-[var(--x-blue)] capitalize">{contentPerformance.lengthImpact.bestLength}</span> posts
                  </p>
                </div>
                <div className="p-4 bg-[var(--x-bg-secondary)] rounded-lg">
                  <p className="font-bold mb-2">Hashtag Effect</p>
                  <p className="text-sm text-[var(--x-text-secondary)]">
                    {contentPerformance.hashtagImpact.recommendation}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Top Posts */}
          {topPosts.length > 0 && (
            <div className="x-card p-6">
              <h3 className="font-bold mb-4">Top Performing Posts</h3>
              <div className="space-y-4">
                {topPosts.map((post, i) => (
                  <div key={post.id} className="p-4 bg-[var(--x-bg-secondary)] rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <span className="x-badge">#{i + 1}</span>
                      <span className="text-sm text-[var(--x-blue)]">
                        {post.engagementRate}% engagement
                      </span>
                    </div>
                    <p className="text-sm mb-3">{post.content}</p>
                    <div className="flex gap-4 text-xs text-[var(--x-text-secondary)]">
                      <span>{post.likes} likes</span>
                      <span>{post.retweets} retweets</span>
                      <span>{post.impressions.toLocaleString()} impressions</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
