"use client";

import { useState, useEffect } from "react";

interface HeatmapData {
  hour: number;
  day: number;
  value: number;
  posts: number;
  avgLikes: number;
  avgComments: number;
  avgShares: number;
  avgReach: number;
}

interface BestTime {
  day: string;
  hour: string;
  score: number;
  avgEngagement: number;
  confidence: "high" | "medium" | "low";
}

interface EngagementInsight {
  id: string;
  type: "peak" | "trend" | "anomaly" | "recommendation";
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  actionable: boolean;
}

interface EngagementSummary {
  totalPosts: number;
  totalEngagements: number;
  avgEngagementRate: number;
  peakDay: string;
  peakHour: string;
  lowestDay: string;
  lowestHour: string;
  weekdayVsWeekend: {
    weekday: number;
    weekend: number;
  };
  morningVsEvening: {
    morning: number;
    afternoon: number;
    evening: number;
    night: number;
  };
}

interface EngagementAnalytics {
  id: string;
  userId: string;
  platform: string;
  period: string;
  heatmapData: HeatmapData[];
  bestTimes: BestTime[];
  worstTimes: BestTime[];
  insights: EngagementInsight[];
  summary: EngagementSummary;
  generatedAt: string;
}

interface OptimalSchedule {
  daily: { hour: number; score: number }[];
  weekly: { day: number; score: number }[];
  recommendations: string[];
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const FULL_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function EngagementHeatmapPage() {
  const [activeTab, setActiveTab] = useState<"heatmap" | "times" | "comparison" | "schedule">("heatmap");
  const [selectedPlatform, setSelectedPlatform] = useState("instagram");
  const [dateRange, setDateRange] = useState("30d");
  const [analytics, setAnalytics] = useState<EngagementAnalytics | null>(null);
  const [allPlatformAnalytics, setAllPlatformAnalytics] = useState<EngagementAnalytics[]>([]);
  const [schedule, setSchedule] = useState<OptimalSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredCell, setHoveredCell] = useState<HeatmapData | null>(null);

  const platforms = [
    { value: "instagram", label: "Instagram", color: "#E4405F" },
    { value: "twitter", label: "Twitter/X", color: "#1DA1F2" },
    { value: "facebook", label: "Facebook", color: "#1877F2" },
    { value: "linkedin", label: "LinkedIn", color: "#0A66C2" },
    { value: "tiktok", label: "TikTok", color: "#000000" },
  ];

  const dateRanges = [
    { value: "7d", label: "Last 7 days" },
    { value: "30d", label: "Last 30 days" },
    { value: "90d", label: "Last 90 days" },
  ];

  useEffect(() => {
    fetchAnalytics();
  }, [selectedPlatform, dateRange]);

  useEffect(() => {
    if (activeTab === "comparison") {
      fetchAllPlatformAnalytics();
    } else if (activeTab === "schedule") {
      fetchOptimalSchedule();
    }
  }, [activeTab]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/engagement-heatmap?action=analytics&platform=${selectedPlatform}&dateRange=${dateRange}`
      );
      const data = await res.json();
      if (data.analytics) {
        setAnalytics(data.analytics);
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllPlatformAnalytics = async () => {
    try {
      const res = await fetch(`/api/engagement-heatmap?action=all-platforms`);
      const data = await res.json();
      if (data.analytics) {
        setAllPlatformAnalytics(data.analytics);
      }
    } catch (error) {
      console.error("Failed to fetch all platform analytics:", error);
    }
  };

  const fetchOptimalSchedule = async () => {
    try {
      const res = await fetch(
        `/api/engagement-heatmap?action=optimal-schedule&platform=${selectedPlatform}`
      );
      const data = await res.json();
      if (data.schedule) {
        setSchedule(data.schedule);
      }
    } catch (error) {
      console.error("Failed to fetch schedule:", error);
    }
  };

  const getHeatmapColor = (value: number, maxValue: number) => {
    const intensity = value / maxValue;
    if (intensity >= 0.8) return "bg-green-500";
    if (intensity >= 0.6) return "bg-green-400";
    if (intensity >= 0.4) return "bg-yellow-400";
    if (intensity >= 0.2) return "bg-orange-400";
    return "bg-red-400";
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case "peak":
        return (
          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        );
      case "trend":
        return (
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
        );
      case "anomaly":
        return (
          <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case "recommendation":
        return (
          <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const formatHour = (hour: number) => {
    if (hour === 0) return "12 AM";
    if (hour === 12) return "12 PM";
    if (hour < 12) return `${hour} AM`;
    return `${hour - 12} PM`;
  };

  const maxHeatmapValue = analytics
    ? Math.max(...analytics.heatmapData.map((h) => h.value))
    : 100;

  const renderHeatmap = () => {
    if (!analytics) return null;

    // Create a 2D grid for the heatmap (7 days x 24 hours)
    const grid: (HeatmapData | null)[][] = Array(7)
      .fill(null)
      .map(() => Array(24).fill(null));

    analytics.heatmapData.forEach((cell) => {
      grid[cell.day][cell.hour] = cell;
    });

    return (
      <div className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-zinc-800 rounded-xl p-4">
            <p className="text-zinc-400 text-sm">Total Posts</p>
            <p className="text-2xl font-bold text-white">{analytics.summary.totalPosts}</p>
          </div>
          <div className="bg-zinc-800 rounded-xl p-4">
            <p className="text-zinc-400 text-sm">Avg Engagement Rate</p>
            <p className="text-2xl font-bold text-white">{analytics.summary.avgEngagementRate.toFixed(1)}%</p>
          </div>
          <div className="bg-zinc-800 rounded-xl p-4">
            <p className="text-zinc-400 text-sm">Total Engagements</p>
            <p className="text-2xl font-bold text-green-400">{analytics.summary.totalEngagements.toLocaleString()}</p>
          </div>
          <div className="bg-zinc-800 rounded-xl p-4">
            <p className="text-zinc-400 text-sm">Peak Day</p>
            <p className="text-2xl font-bold text-white">{analytics.summary.peakDay}</p>
          </div>
          <div className="bg-zinc-800 rounded-xl p-4">
            <p className="text-zinc-400 text-sm">Peak Hour</p>
            <p className="text-2xl font-bold text-indigo-400">{analytics.summary.peakHour}</p>
          </div>
        </div>

        {/* Heatmap Grid */}
        <div className="bg-zinc-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Engagement Heatmap</h3>
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <span>Low</span>
              <div className="flex gap-1">
                <div className="w-4 h-4 rounded bg-red-400"></div>
                <div className="w-4 h-4 rounded bg-orange-400"></div>
                <div className="w-4 h-4 rounded bg-yellow-400"></div>
                <div className="w-4 h-4 rounded bg-green-400"></div>
                <div className="w-4 h-4 rounded bg-green-500"></div>
              </div>
              <span>High</span>
            </div>
          </div>

          {/* Hour labels */}
          <div className="flex ml-12 mb-2">
            {[0, 3, 6, 9, 12, 15, 18, 21].map((hour) => (
              <div key={hour} className="flex-1 text-center text-xs text-zinc-500">
                {formatHour(hour)}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="space-y-1">
            {DAYS.map((day, dayIndex) => (
              <div key={day} className="flex items-center gap-2">
                <div className="w-10 text-sm text-zinc-400">{day}</div>
                <div className="flex-1 flex gap-0.5">
                  {Array(24)
                    .fill(null)
                    .map((_, hourIndex) => {
                      const cell = grid[dayIndex][hourIndex];
                      return (
                        <div
                          key={hourIndex}
                          className={`flex-1 h-8 rounded-sm cursor-pointer transition-all hover:ring-2 hover:ring-white/50 ${
                            cell ? getHeatmapColor(cell.value, maxHeatmapValue) : "bg-zinc-700"
                          }`}
                          onMouseEnter={() => setHoveredCell(cell)}
                          onMouseLeave={() => setHoveredCell(null)}
                        />
                      );
                    })}
                </div>
              </div>
            ))}
          </div>

          {/* Tooltip */}
          {hoveredCell && (
            <div className="mt-4 p-4 bg-zinc-900 rounded-lg border border-zinc-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-medium">
                  {FULL_DAYS[hoveredCell.day]} at {formatHour(hoveredCell.hour)}
                </span>
                <span className="text-green-400 font-bold">{hoveredCell.value.toFixed(1)} score</span>
              </div>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-zinc-500">Posts</p>
                  <p className="text-white">{hoveredCell.posts}</p>
                </div>
                <div>
                  <p className="text-zinc-500">Avg Likes</p>
                  <p className="text-white">{hoveredCell.avgLikes.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-zinc-500">Avg Comments</p>
                  <p className="text-white">{hoveredCell.avgComments.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-zinc-500">Avg Reach</p>
                  <p className="text-white">{hoveredCell.avgReach.toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Insights */}
        <div className="bg-zinc-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Insights & Recommendations</h3>
          <div className="space-y-3">
            {analytics.insights.map((insight) => (
              <div
                key={insight.id}
                className="flex items-start gap-3 p-3 bg-zinc-900 rounded-lg"
              >
                {getInsightIcon(insight.type)}
                <div className="flex-1">
                  <p className="text-white font-medium">{insight.title}</p>
                  <p className="text-zinc-400 text-sm">{insight.description}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${
                  insight.impact === "high" ? "bg-red-500/20 text-red-400" :
                  insight.impact === "medium" ? "bg-yellow-500/20 text-yellow-400" :
                  "bg-green-500/20 text-green-400"
                }`}>
                  {insight.impact} impact
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderBestTimes = () => {
    if (!analytics) return null;

    return (
      <div className="space-y-6">
        {/* Best Times */}
        <div className="bg-zinc-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            Best Times to Post
          </h3>
          <div className="grid gap-3">
            {analytics.bestTimes.slice(0, 5).map((time, index) => (
              <div
                key={`best-${index}`}
                className="flex items-center justify-between p-4 bg-zinc-900 rounded-lg border border-green-500/20"
              >
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-white font-medium">
                      {time.day} at {time.hour}
                    </p>
                    <p className="text-zinc-400 text-sm">
                      Confidence: <span className={`${
                        time.confidence === "high" ? "text-green-400" :
                        time.confidence === "medium" ? "text-yellow-400" : "text-red-400"
                      }`}>{time.confidence}</span>
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-green-400 font-bold">{time.score.toFixed(1)}</p>
                  <p className="text-zinc-500 text-sm">score</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Worst Times */}
        <div className="bg-zinc-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Times to Avoid
          </h3>
          <div className="grid gap-3">
            {analytics.worstTimes.slice(0, 3).map((time, index) => (
              <div
                key={`worst-${index}`}
                className="flex items-center justify-between p-4 bg-zinc-900 rounded-lg border border-red-500/20"
              >
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-white font-medium">
                      {time.day} at {time.hour}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-red-400 font-bold">{time.score.toFixed(1)}</p>
                  <p className="text-zinc-500 text-sm">score</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Time Distribution */}
        <div className="bg-zinc-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Time of Day Analysis</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-zinc-900 rounded-lg">
              <p className="text-zinc-400 text-sm">Morning (6am-12pm)</p>
              <p className="text-2xl font-bold text-white">{analytics.summary.morningVsEvening.morning}</p>
            </div>
            <div className="p-4 bg-zinc-900 rounded-lg">
              <p className="text-zinc-400 text-sm">Afternoon (12pm-6pm)</p>
              <p className="text-2xl font-bold text-white">{analytics.summary.morningVsEvening.afternoon}</p>
            </div>
            <div className="p-4 bg-zinc-900 rounded-lg">
              <p className="text-zinc-400 text-sm">Evening (6pm-12am)</p>
              <p className="text-2xl font-bold text-white">{analytics.summary.morningVsEvening.evening}</p>
            </div>
            <div className="p-4 bg-zinc-900 rounded-lg">
              <p className="text-zinc-400 text-sm">Night (12am-6am)</p>
              <p className="text-2xl font-bold text-white">{analytics.summary.morningVsEvening.night}</p>
            </div>
          </div>
        </div>

        {/* Weekday vs Weekend */}
        <div className="bg-zinc-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Weekday vs Weekend</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-zinc-900 rounded-lg">
              <p className="text-zinc-400 text-sm">Weekday Average</p>
              <p className="text-2xl font-bold text-white">{analytics.summary.weekdayVsWeekend.weekday}</p>
            </div>
            <div className="p-4 bg-zinc-900 rounded-lg">
              <p className="text-zinc-400 text-sm">Weekend Average</p>
              <p className="text-2xl font-bold text-white">{analytics.summary.weekdayVsWeekend.weekend}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderComparison = () => {
    return (
      <div className="space-y-6">
        <div className="bg-zinc-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Platform Comparison</h3>
          <p className="text-zinc-400 mb-6">Compare engagement patterns across different platforms</p>

          <div className="space-y-8">
            {allPlatformAnalytics.map((platformData) => {
              const platformInfo = platforms.find((p) => p.value === platformData.platform);
              const maxVal = Math.max(...platformData.heatmapData.map((h) => h.value));

              return (
                <div key={platformData.platform}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: platformInfo?.color }}
                      />
                      <span className="text-white font-medium">{platformInfo?.label}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-zinc-400">
                        Best: <span className="text-green-400">{platformData.summary.peakDay} {platformData.summary.peakHour}</span>
                      </span>
                    </div>
                  </div>

                  {/* Mini heatmap */}
                  <div className="flex gap-0.5">
                    {DAYS.map((_, dayIndex) => (
                      <div key={dayIndex} className="flex-1 flex flex-col gap-0.5">
                        {[9, 12, 15, 18].map((hour) => {
                          const cell = platformData.heatmapData.find(
                            (h) => h.day === dayIndex && h.hour === hour
                          );
                          return (
                            <div
                              key={hour}
                              className={`h-2 rounded-sm ${
                                cell ? getHeatmapColor(cell.value, maxVal) : "bg-zinc-700"
                              }`}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary Table */}
        <div className="bg-zinc-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Platform Summary</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-zinc-400 text-sm">
                  <th className="pb-3">Platform</th>
                  <th className="pb-3">Best Time</th>
                  <th className="pb-3">Worst Time</th>
                  <th className="pb-3">Avg Engagement</th>
                </tr>
              </thead>
              <tbody className="text-white">
                {allPlatformAnalytics.map((platformData) => {
                  const platformInfo = platforms.find((p) => p.value === platformData.platform);

                  return (
                    <tr key={platformData.platform} className="border-t border-zinc-700">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: platformInfo?.color }}
                          />
                          {platformInfo?.label}
                        </div>
                      </td>
                      <td className="py-3 text-green-400">
                        {platformData.bestTimes[0]?.day} {platformData.bestTimes[0]?.hour}
                      </td>
                      <td className="py-3 text-red-400">
                        {platformData.worstTimes[0]?.day} {platformData.worstTimes[0]?.hour}
                      </td>
                      <td className="py-3">{platformData.summary.avgEngagementRate.toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderSchedule = () => {
    if (!schedule) return <div className="text-zinc-400">Loading schedule...</div>;

    return (
      <div className="space-y-6">
        {/* Recommendations */}
        <div className="bg-zinc-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Optimal Posting Schedule</h3>
          <p className="text-zinc-400 mb-4">
            AI-generated recommendations based on your engagement patterns
          </p>

          <div className="space-y-3">
            {schedule.recommendations.map((rec, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-zinc-900 rounded-lg">
                <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-white">{rec}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Best Times */}
        <div className="bg-zinc-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Best Hours by Score</h3>
          <div className="flex items-end justify-between h-40 gap-1">
            {schedule.daily.map((slot) => {
              const maxScore = Math.max(...schedule.daily.map(d => d.score));
              const height = (slot.score / maxScore) * 100;
              return (
                <div key={slot.hour} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-indigo-500 rounded-t transition-all hover:bg-indigo-400"
                    style={{ height: `${height}%` }}
                  />
                  {slot.hour % 3 === 0 && (
                    <span className="text-xs text-zinc-500">{formatHour(slot.hour)}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Weekly Best Days */}
        <div className="bg-zinc-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Best Days by Score</h3>
          <div className="grid grid-cols-7 gap-2">
            {schedule.weekly.map((slot) => {
              const maxScore = Math.max(...schedule.weekly.map(d => d.score));
              const intensity = slot.score / maxScore;
              return (
                <div key={slot.day} className="text-center">
                  <p className="text-zinc-400 text-sm mb-2">{DAYS[slot.day]}</p>
                  <div className={`p-4 rounded-lg ${
                    intensity >= 0.8 ? "bg-green-500/30" :
                    intensity >= 0.6 ? "bg-green-500/20" :
                    intensity >= 0.4 ? "bg-yellow-500/20" :
                    "bg-zinc-700"
                  }`}>
                    <p className="text-white font-bold">{slot.score}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Engagement Heatmap</h1>
          <p className="text-zinc-400">Analyze your best posting times based on engagement data</p>
        </div>
        <button
          onClick={fetchAnalytics}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-zinc-400 text-sm">Platform:</label>
          <select
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
          >
            {platforms.map((platform) => (
              <option key={platform.value} value={platform.value}>
                {platform.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-zinc-400 text-sm">Date Range:</label>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
          >
            {dateRanges.map((range) => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-zinc-800 pb-2">
        {[
          { id: "heatmap", label: "Heatmap" },
          { id: "times", label: "Best Times" },
          { id: "comparison", label: "Comparison" },
          { id: "schedule", label: "Schedule" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === tab.id
                ? "bg-indigo-600 text-white"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading && activeTab === "heatmap" ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        </div>
      ) : (
        <>
          {activeTab === "heatmap" && renderHeatmap()}
          {activeTab === "times" && renderBestTimes()}
          {activeTab === "comparison" && renderComparison()}
          {activeTab === "schedule" && renderSchedule()}
        </>
      )}
    </div>
  );
}
