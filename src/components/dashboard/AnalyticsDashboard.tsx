"use client";

import { useEffect, useState } from "react";

interface AnalyticsData {
  overview: {
    totalPosts: number;
    postedCount: number;
    pendingCount: number;
    scheduledCount: number;
    failedCount: number;
    successRate: number;
  };
  periods: {
    today: { total: number; published: number };
    week: { total: number; published: number };
    month: { total: number; published: number };
  };
  insights: {
    avgPostsPerDay: string;
    bestHour: number;
    bestHourFormatted: string;
    currentStreak: number;
  };
  chartData: {
    daily: { date: string; label: string; posts: number }[];
    hourDistribution: { hour: number; label: string; posts: number }[];
  };
}

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch("/api/analytics");
        if (!res.ok) throw new Error("Failed to fetch");
        const json = await res.json();
        setData(json);
      } catch {
        setError("Failed to load analytics");
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 animate-spin text-indigo-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-zinc-400">Loading analytics...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
        <p className="text-red-400">{error || "Failed to load analytics"}</p>
      </div>
    );
  }

  const maxDailyPosts = Math.max(...data.chartData.daily.map((d) => d.posts), 1);

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Posts"
          value={data.overview.totalPosts}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
          color="indigo"
        />
        <StatCard
          label="Published"
          value={data.overview.postedCount}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
            </svg>
          }
          color="emerald"
        />
        <StatCard
          label="Success Rate"
          value={`${data.overview.successRate}%`}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
          color="blue"
        />
        <StatCard
          label="Current Streak"
          value={`${data.insights.currentStreak} days`}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
            </svg>
          }
          color="orange"
        />
      </div>

      {/* Period Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <PeriodCard label="Today" published={data.periods.today.published} total={data.periods.today.total} />
        <PeriodCard label="This Week" published={data.periods.week.published} total={data.periods.week.total} />
        <PeriodCard label="This Month" published={data.periods.month.published} total={data.periods.month.total} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Activity Chart */}
        <div className="lg:col-span-2 bg-zinc-900/50 backdrop-blur-sm border border-white/5 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold">Daily Activity</h3>
            <span className="text-xs text-zinc-500">Last 14 days</span>
          </div>
          <div className="flex items-end gap-1 h-40">
            {data.chartData.daily.map((day, i) => (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex flex-col items-center">
                  <span className="text-xs text-zinc-400 mb-1">{day.posts}</span>
                  <div
                    className="w-full bg-gradient-to-t from-indigo-500 to-purple-500 rounded-t transition-all hover:from-indigo-400 hover:to-purple-400"
                    style={{
                      height: `${Math.max((day.posts / maxDailyPosts) * 100, 4)}px`,
                      minHeight: day.posts > 0 ? "8px" : "4px",
                      opacity: day.posts > 0 ? 1 : 0.3,
                    }}
                  />
                </div>
                <span className="text-[10px] text-zinc-500 truncate w-full text-center">
                  {i % 2 === 0 ? day.label.split(" ")[1] : ""}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Insights Panel */}
        <div className="bg-zinc-900/50 backdrop-blur-sm border border-white/5 rounded-2xl p-6">
          <h3 className="font-semibold mb-6">Insights</h3>
          <div className="space-y-4">
            <InsightItem
              label="Best Posting Time"
              value={data.insights.bestHourFormatted}
              description="Based on your posting history"
              icon={
                <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <InsightItem
              label="Avg. Posts/Day"
              value={data.insights.avgPostsPerDay}
              description="Last 30 days average"
              icon={
                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              }
            />
            <InsightItem
              label="Queue Status"
              value={`${data.overview.pendingCount + data.overview.scheduledCount}`}
              description={`${data.overview.scheduledCount} scheduled, ${data.overview.pendingCount} drafts`}
              icon={
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              }
            />
            {data.overview.failedCount > 0 && (
              <InsightItem
                label="Failed Posts"
                value={data.overview.failedCount.toString()}
                description="Posts that failed to publish"
                icon={
                  <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
            )}
          </div>
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="bg-zinc-900/50 backdrop-blur-sm border border-white/5 rounded-2xl p-6">
        <h3 className="font-semibold mb-4">Post Status Breakdown</h3>
        <div className="flex items-center gap-2 h-4 rounded-full overflow-hidden bg-zinc-800">
          {data.overview.postedCount > 0 && (
            <div
              className="h-full bg-emerald-500"
              style={{ width: `${(data.overview.postedCount / data.overview.totalPosts) * 100}%` }}
            />
          )}
          {data.overview.scheduledCount > 0 && (
            <div
              className="h-full bg-blue-500"
              style={{ width: `${(data.overview.scheduledCount / data.overview.totalPosts) * 100}%` }}
            />
          )}
          {data.overview.pendingCount > 0 && (
            <div
              className="h-full bg-amber-500"
              style={{ width: `${(data.overview.pendingCount / data.overview.totalPosts) * 100}%` }}
            />
          )}
          {data.overview.failedCount > 0 && (
            <div
              className="h-full bg-red-500"
              style={{ width: `${(data.overview.failedCount / data.overview.totalPosts) * 100}%` }}
            />
          )}
        </div>
        <div className="flex items-center gap-6 mt-4">
          <StatusLegend color="emerald" label="Published" count={data.overview.postedCount} />
          <StatusLegend color="blue" label="Scheduled" count={data.overview.scheduledCount} />
          <StatusLegend color="amber" label="Drafts" count={data.overview.pendingCount} />
          {data.overview.failedCount > 0 && (
            <StatusLegend color="red" label="Failed" count={data.overview.failedCount} />
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: "indigo" | "emerald" | "blue" | "orange";
}) {
  const colors = {
    indigo: "from-indigo-500/10 to-purple-500/10 border-indigo-500/20 text-indigo-400",
    emerald: "from-emerald-500/10 to-teal-500/10 border-emerald-500/20 text-emerald-400",
    blue: "from-blue-500/10 to-cyan-500/10 border-blue-500/20 text-blue-400",
    orange: "from-orange-500/10 to-amber-500/10 border-orange-500/20 text-orange-400",
  };

  return (
    <div className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${colors[color]} border p-4`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-zinc-400 mb-1">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        <div className={`w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center ${colors[color].split(" ").pop()}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function PeriodCard({ label, published, total }: { label: string; published: number; total: number }) {
  return (
    <div className="bg-zinc-900/50 backdrop-blur-sm border border-white/5 rounded-xl p-4">
      <p className="text-xs text-zinc-500 mb-2">{label}</p>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-emerald-400">{published}</span>
        <span className="text-zinc-500">published</span>
      </div>
      <p className="text-xs text-zinc-500 mt-1">{total} total created</p>
    </div>
  );
}

function InsightItem({
  label,
  value,
  description,
  icon,
}: {
  label: string;
  value: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/30 border border-white/5">
      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-xs text-zinc-500">{label}</p>
        <p className="font-semibold">{value}</p>
        <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
      </div>
    </div>
  );
}

function StatusLegend({ color, label, count }: { color: string; label: string; count: number }) {
  const colorClasses: Record<string, string> = {
    emerald: "bg-emerald-500",
    blue: "bg-blue-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded-full ${colorClasses[color]}`} />
      <span className="text-sm text-zinc-400">
        {label} <span className="text-zinc-500">({count})</span>
      </span>
    </div>
  );
}
