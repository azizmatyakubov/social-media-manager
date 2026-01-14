"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

interface EvergreenPost {
  id: string;
  content: string;
  platform: string;
  publishedAt: string | null;
  likes: number;
  retweets: number;
  replies: number;
  impressions: number;
  shares: number;
  clicks: number;
  isEvergreen: boolean;
  lastRecycled: string | null;
  recycleCount: number;
  totalEngagement?: number;
  engagementRate?: number;
}

interface EvergreenSchedule {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  minEngagement: number;
  minImpressions: number;
  platforms: string[];
  minDaysBetween: number;
  maxRecycleCount: number;
  varyContent: boolean;
  postsPerDay: number;
  preferredTimes: string[];
  activeDays: number[];
  timezone: string;
  totalRecycled: number;
  lastRunAt: string | null;
}

interface Stats {
  totalEvergreenPosts: number;
  totalTimesRecycled: number;
  activeSchedules: number;
  originalAvgEngagement: number;
  recycledAvgEngagement: number;
  recyclingEfficiency: string | number;
}

interface Log {
  id: string;
  originalPostId: string;
  recycledPostId: string | null;
  status: string;
  variationType: string | null;
  originalContent: string;
  recycledContent: string | null;
  createdAt: string;
}

const platforms = ["X", "LINKEDIN", "INSTAGRAM", "TIKTOK", "YOUTUBE", "PINTEREST", "BLUESKY"];
const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function EvergreenPage() {
  const [activeTab, setActiveTab] = useState<"library" | "discover" | "schedules" | "logs">("library");
  const [stats, setStats] = useState<Stats | null>(null);
  const [evergreenPosts, setEvergreenPosts] = useState<EvergreenPost[]>([]);
  const [topPosts, setTopPosts] = useState<EvergreenPost[]>([]);
  const [schedules, setSchedules] = useState<EvergreenSchedule[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set());

  // Filters
  const [platformFilter, setPlatformFilter] = useState<string>("");
  const [daysBack, setDaysBack] = useState(90);

  // Schedule form
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<EvergreenSchedule | null>(null);
  const [scheduleForm, setScheduleForm] = useState({
    name: "",
    description: "",
    minEngagement: 100,
    minImpressions: 1000,
    platforms: [] as string[],
    minDaysBetween: 30,
    maxRecycleCount: 5,
    varyContent: true,
    postsPerDay: 1,
    preferredTimes: ["09:00", "14:00", "18:00"],
    activeDays: [1, 2, 3, 4, 5],
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  // Recycle modal
  const [recycleModalPost, setRecycleModalPost] = useState<EvergreenPost | null>(null);
  const [recycleOptions, setRecycleOptions] = useState({
    varyContent: true,
    scheduledFor: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab === "discover") {
      fetchTopPosts();
    }
  }, [activeTab, platformFilter, daysBack]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, postsRes, schedulesRes, logsRes] = await Promise.all([
        fetch("/api/evergreen?action=stats"),
        fetch("/api/evergreen?action=posts"),
        fetch("/api/evergreen?action=schedules"),
        fetch("/api/evergreen?action=logs&limit=20"),
      ]);

      const [statsData, postsData, schedulesData, logsData] = await Promise.all([
        statsRes.json(),
        postsRes.json(),
        schedulesRes.json(),
        logsRes.json(),
      ]);

      setStats(statsData.stats);
      setEvergreenPosts(postsData.posts || []);
      setSchedules(schedulesData.schedules || []);
      setLogs(logsData.logs || []);
    } catch (error) {
      console.error("Failed to fetch evergreen data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTopPosts = async () => {
    try {
      const params = new URLSearchParams({
        action: "top-posts",
        excludeEvergreen: "true",
        daysBack: daysBack.toString(),
        limit: "50",
      });
      if (platformFilter) params.append("platform", platformFilter);

      const res = await fetch(`/api/evergreen?${params}`);
      const data = await res.json();
      setTopPosts(data.posts || []);
    } catch (error) {
      console.error("Failed to fetch top posts:", error);
    }
  };

  const handleMarkEvergreen = async (postId: string) => {
    try {
      await fetch("/api/evergreen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark-evergreen", postId }),
      });
      fetchData();
      fetchTopPosts();
    } catch (error) {
      console.error("Failed to mark as evergreen:", error);
    }
  };

  const handleUnmarkEvergreen = async (postId: string) => {
    try {
      await fetch("/api/evergreen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unmark-evergreen", postId }),
      });
      fetchData();
    } catch (error) {
      console.error("Failed to unmark evergreen:", error);
    }
  };

  const handleBulkMark = async (isEvergreen: boolean) => {
    if (selectedPosts.size === 0) return;
    try {
      await fetch("/api/evergreen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bulk-mark",
          postIds: Array.from(selectedPosts),
          isEvergreen,
        }),
      });
      setSelectedPosts(new Set());
      fetchData();
      fetchTopPosts();
    } catch (error) {
      console.error("Failed to bulk mark:", error);
    }
  };

  const handleRecycle = async () => {
    if (!recycleModalPost) return;
    try {
      await fetch("/api/evergreen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "recycle",
          postId: recycleModalPost.id,
          varyContent: recycleOptions.varyContent,
          scheduledFor: recycleOptions.scheduledFor || undefined,
        }),
      });
      setRecycleModalPost(null);
      fetchData();
    } catch (error) {
      console.error("Failed to recycle post:", error);
    }
  };

  const handleSaveSchedule = async () => {
    try {
      const action = editingSchedule ? "update-schedule" : "create-schedule";
      const body = editingSchedule
        ? { action, scheduleId: editingSchedule.id, ...scheduleForm }
        : { action, ...scheduleForm };

      await fetch("/api/evergreen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      setShowScheduleForm(false);
      setEditingSchedule(null);
      resetScheduleForm();
      fetchData();
    } catch (error) {
      console.error("Failed to save schedule:", error);
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!confirm("Delete this schedule?")) return;
    try {
      await fetch("/api/evergreen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete-schedule", scheduleId }),
      });
      fetchData();
    } catch (error) {
      console.error("Failed to delete schedule:", error);
    }
  };

  const resetScheduleForm = () => {
    setScheduleForm({
      name: "",
      description: "",
      minEngagement: 100,
      minImpressions: 1000,
      platforms: [],
      minDaysBetween: 30,
      maxRecycleCount: 5,
      varyContent: true,
      postsPerDay: 1,
      preferredTimes: ["09:00", "14:00", "18:00"],
      activeDays: [1, 2, 3, 4, 5],
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  };

  const openEditSchedule = (schedule: EvergreenSchedule) => {
    setEditingSchedule(schedule);
    setScheduleForm({
      name: schedule.name,
      description: schedule.description || "",
      minEngagement: schedule.minEngagement,
      minImpressions: schedule.minImpressions,
      platforms: schedule.platforms,
      minDaysBetween: schedule.minDaysBetween,
      maxRecycleCount: schedule.maxRecycleCount,
      varyContent: schedule.varyContent,
      postsPerDay: schedule.postsPerDay,
      preferredTimes: schedule.preferredTimes,
      activeDays: schedule.activeDays,
      timezone: schedule.timezone,
    });
    setShowScheduleForm(true);
  };

  const getPlatformColor = (platform: string) => {
    const colors: Record<string, string> = {
      X: "bg-black",
      LINKEDIN: "bg-blue-600",
      INSTAGRAM: "bg-pink-600",
      TIKTOK: "bg-gray-800",
      YOUTUBE: "bg-red-600",
      PINTEREST: "bg-red-500",
      BLUESKY: "bg-sky-500",
    };
    return colors[platform] || "bg-gray-600";
  };

  const formatDate = (date: string | null) => {
    if (!date) return "Never";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const truncate = (text: string, length: number) => {
    if (text.length <= length) return text;
    return text.slice(0, length) + "...";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Evergreen Content</h1>
            <p className="text-zinc-400 mt-1">
              Recycle your best-performing content automatically
            </p>
          </div>
          <button
            onClick={() => {
              resetScheduleForm();
              setEditingSchedule(null);
              setShowScheduleForm(true);
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Schedule
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-zinc-900/50 rounded-xl p-4 border border-white/5">
              <p className="text-sm text-zinc-400">Evergreen Posts</p>
              <p className="text-2xl font-bold mt-1">{stats.totalEvergreenPosts}</p>
            </div>
            <div className="bg-zinc-900/50 rounded-xl p-4 border border-white/5">
              <p className="text-sm text-zinc-400">Times Recycled</p>
              <p className="text-2xl font-bold mt-1">{stats.totalTimesRecycled}</p>
            </div>
            <div className="bg-zinc-900/50 rounded-xl p-4 border border-white/5">
              <p className="text-sm text-zinc-400">Active Schedules</p>
              <p className="text-2xl font-bold mt-1">{stats.activeSchedules}</p>
            </div>
            <div className="bg-zinc-900/50 rounded-xl p-4 border border-white/5">
              <p className="text-sm text-zinc-400">Recycle Efficiency</p>
              <p className="text-2xl font-bold mt-1">{stats.recyclingEfficiency}%</p>
              <p className="text-xs text-zinc-500">vs original engagement</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 border-b border-white/10 pb-2">
          {[
            { id: "library", label: "Evergreen Library", icon: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" },
            { id: "discover", label: "Discover", icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" },
            { id: "schedules", label: "Schedules", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
            { id: "logs", label: "Activity", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                activeTab === tab.id
                  ? "bg-white/10 text-white"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
              </svg>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Library Tab */}
            {activeTab === "library" && (
              <div className="space-y-4">
                {selectedPosts.size > 0 && (
                  <div className="flex items-center gap-4 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                    <span className="text-sm">{selectedPosts.size} posts selected</span>
                    <button
                      onClick={() => handleBulkMark(false)}
                      className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm"
                    >
                      Remove from Evergreen
                    </button>
                    <button
                      onClick={() => setSelectedPosts(new Set())}
                      className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-sm ml-auto"
                    >
                      Clear Selection
                    </button>
                  </div>
                )}

                {evergreenPosts.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 mx-auto text-zinc-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                    <h3 className="text-lg font-medium mb-2">No Evergreen Posts Yet</h3>
                    <p className="text-zinc-400 mb-4">
                      Start by adding your best-performing posts to your evergreen library
                    </p>
                    <button
                      onClick={() => setActiveTab("discover")}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition"
                    >
                      Discover Top Posts
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {evergreenPosts.map((post) => (
                      <div
                        key={post.id}
                        className="bg-zinc-900/50 rounded-xl p-4 border border-white/5 hover:border-white/10 transition"
                      >
                        <div className="flex items-start gap-4">
                          <input
                            type="checkbox"
                            checked={selectedPosts.has(post.id)}
                            onChange={(e) => {
                              const newSelected = new Set(selectedPosts);
                              if (e.target.checked) {
                                newSelected.add(post.id);
                              } else {
                                newSelected.delete(post.id);
                              }
                              setSelectedPosts(newSelected);
                            }}
                            className="mt-1 rounded border-zinc-600 bg-zinc-800 text-indigo-600 focus:ring-indigo-500"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPlatformColor(post.platform)}`}>
                                {post.platform}
                              </span>
                              <span className="text-xs text-zinc-500">
                                Published {formatDate(post.publishedAt)}
                              </span>
                              {post.recycleCount > 0 && (
                                <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">
                                  Recycled {post.recycleCount}x
                                </span>
                              )}
                            </div>
                            <p className="text-sm mb-3">{truncate(post.content, 200)}</p>
                            <div className="flex items-center gap-4 text-sm text-zinc-400">
                              <span>{post.likes} likes</span>
                              <span>{post.retweets} reposts</span>
                              <span>{post.replies} replies</span>
                              <span>{post.impressions.toLocaleString()} impressions</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setRecycleModalPost(post)}
                              className="p-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 rounded-lg transition"
                              title="Recycle Now"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleUnmarkEvergreen(post.id)}
                              className="p-2 bg-white/5 hover:bg-white/10 text-zinc-400 rounded-lg transition"
                              title="Remove from Evergreen"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Discover Tab */}
            {activeTab === "discover" && (
              <div className="space-y-4">
                {/* Filters */}
                <div className="flex items-center gap-4">
                  <select
                    value={platformFilter}
                    onChange={(e) => setPlatformFilter(e.target.value)}
                    className="px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">All Platforms</option>
                    {platforms.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <select
                    value={daysBack}
                    onChange={(e) => setDaysBack(parseInt(e.target.value))}
                    className="px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={30}>Last 30 days</option>
                    <option value={60}>Last 60 days</option>
                    <option value={90}>Last 90 days</option>
                    <option value={180}>Last 6 months</option>
                    <option value={365}>Last year</option>
                  </select>
                  {selectedPosts.size > 0 && (
                    <button
                      onClick={() => handleBulkMark(true)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition ml-auto"
                    >
                      Add {selectedPosts.size} to Evergreen
                    </button>
                  )}
                </div>

                {topPosts.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-zinc-400">No top-performing posts found for the selected criteria</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {topPosts.map((post) => (
                      <div
                        key={post.id}
                        className="bg-zinc-900/50 rounded-xl p-4 border border-white/5 hover:border-white/10 transition"
                      >
                        <div className="flex items-start gap-4">
                          <input
                            type="checkbox"
                            checked={selectedPosts.has(post.id)}
                            onChange={(e) => {
                              const newSelected = new Set(selectedPosts);
                              if (e.target.checked) {
                                newSelected.add(post.id);
                              } else {
                                newSelected.delete(post.id);
                              }
                              setSelectedPosts(newSelected);
                            }}
                            className="mt-1 rounded border-zinc-600 bg-zinc-800 text-indigo-600 focus:ring-indigo-500"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPlatformColor(post.platform)}`}>
                                {post.platform}
                              </span>
                              <span className="text-xs text-zinc-500">
                                {formatDate(post.publishedAt)}
                              </span>
                              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs">
                                {post.totalEngagement} engagement
                              </span>
                              {(post.engagementRate ?? 0) > 5 && (
                                <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">
                                  {post.engagementRate?.toFixed(1)}% rate
                                </span>
                              )}
                            </div>
                            <p className="text-sm mb-3">{truncate(post.content, 200)}</p>
                            <div className="flex items-center gap-4 text-sm text-zinc-400">
                              <span>{post.likes} likes</span>
                              <span>{post.retweets} reposts</span>
                              <span>{post.impressions.toLocaleString()} impressions</span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleMarkEvergreen(post.id)}
                            className="px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 rounded-lg font-medium transition"
                          >
                            Add to Evergreen
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Schedules Tab */}
            {activeTab === "schedules" && (
              <div className="space-y-4">
                {schedules.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 mx-auto text-zinc-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <h3 className="text-lg font-medium mb-2">No Schedules Yet</h3>
                    <p className="text-zinc-400 mb-4">
                      Create a schedule to automatically recycle your evergreen content
                    </p>
                    <button
                      onClick={() => {
                        resetScheduleForm();
                        setShowScheduleForm(true);
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition"
                    >
                      Create Schedule
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {schedules.map((schedule) => (
                      <div
                        key={schedule.id}
                        className="bg-zinc-900/50 rounded-xl p-5 border border-white/5"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{schedule.name}</h3>
                              <span className={`px-2 py-0.5 rounded text-xs ${
                                schedule.isActive
                                  ? "bg-green-500/20 text-green-400"
                                  : "bg-zinc-500/20 text-zinc-400"
                              }`}>
                                {schedule.isActive ? "Active" : "Paused"}
                              </span>
                            </div>
                            {schedule.description && (
                              <p className="text-sm text-zinc-400 mt-1">{schedule.description}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => openEditSchedule(schedule)}
                              className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteSchedule(schedule.id)}
                              className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-4 mb-4">
                          <div>
                            <p className="text-xs text-zinc-500">Posts/Day</p>
                            <p className="font-medium">{schedule.postsPerDay}</p>
                          </div>
                          <div>
                            <p className="text-xs text-zinc-500">Min Gap</p>
                            <p className="font-medium">{schedule.minDaysBetween} days</p>
                          </div>
                          <div>
                            <p className="text-xs text-zinc-500">Total Recycled</p>
                            <p className="font-medium">{schedule.totalRecycled}</p>
                          </div>
                          <div>
                            <p className="text-xs text-zinc-500">Last Run</p>
                            <p className="font-medium">{formatDate(schedule.lastRunAt)}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-zinc-400">
                          <span>Active on:</span>
                          {schedule.activeDays.map((day) => (
                            <span key={day} className="px-2 py-0.5 bg-white/5 rounded">
                              {daysOfWeek[day]}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Logs Tab */}
            {activeTab === "logs" && (
              <div className="space-y-4">
                {logs.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-zinc-400">No recycling activity yet</p>
                  </div>
                ) : (
                  <div className="bg-zinc-900/50 rounded-xl border border-white/5 overflow-hidden">
                    <table className="w-full">
                      <thead className="border-b border-white/5">
                        <tr>
                          <th className="text-left text-xs font-medium text-zinc-400 p-4">Date</th>
                          <th className="text-left text-xs font-medium text-zinc-400 p-4">Status</th>
                          <th className="text-left text-xs font-medium text-zinc-400 p-4">Variation</th>
                          <th className="text-left text-xs font-medium text-zinc-400 p-4">Original Content</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.map((log) => (
                          <tr key={log.id} className="border-b border-white/5 last:border-0">
                            <td className="p-4 text-sm">
                              {new Date(log.createdAt).toLocaleString()}
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded text-xs ${
                                log.status === "success"
                                  ? "bg-green-500/20 text-green-400"
                                  : log.status === "failed"
                                  ? "bg-red-500/20 text-red-400"
                                  : "bg-amber-500/20 text-amber-400"
                              }`}>
                                {log.status}
                              </span>
                            </td>
                            <td className="p-4 text-sm text-zinc-400">
                              {log.variationType || "-"}
                            </td>
                            <td className="p-4 text-sm">
                              {truncate(log.originalContent, 100)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Schedule Form Modal */}
        {showScheduleForm && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-white/10">
                <h2 className="text-xl font-semibold">
                  {editingSchedule ? "Edit Schedule" : "Create Schedule"}
                </h2>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Schedule Name</label>
                  <input
                    type="text"
                    value={scheduleForm.name}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, name: e.target.value })}
                    placeholder="e.g., Weekly Top Performers"
                    className="w-full px-4 py-2 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description (optional)</label>
                  <textarea
                    value={scheduleForm.description}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, description: e.target.value })}
                    placeholder="What is this schedule for?"
                    rows={2}
                    className="w-full px-4 py-2 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Minimum Engagement</label>
                    <input
                      type="number"
                      value={scheduleForm.minEngagement}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, minEngagement: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Minimum Impressions</label>
                    <input
                      type="number"
                      value={scheduleForm.minImpressions}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, minImpressions: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Platforms</label>
                  <div className="flex flex-wrap gap-2">
                    {platforms.map((platform) => (
                      <button
                        key={platform}
                        type="button"
                        onClick={() => {
                          const newPlatforms = scheduleForm.platforms.includes(platform)
                            ? scheduleForm.platforms.filter((p) => p !== platform)
                            : [...scheduleForm.platforms, platform];
                          setScheduleForm({ ...scheduleForm, platforms: newPlatforms });
                        }}
                        className={`px-3 py-1 rounded-lg text-sm transition ${
                          scheduleForm.platforms.includes(platform)
                            ? "bg-indigo-600 text-white"
                            : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                        }`}
                      >
                        {platform}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">Leave empty for all platforms</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Min Days Between Recycles</label>
                    <input
                      type="number"
                      value={scheduleForm.minDaysBetween}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, minDaysBetween: parseInt(e.target.value) || 30 })}
                      className="w-full px-4 py-2 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Max Recycle Count</label>
                    <input
                      type="number"
                      value={scheduleForm.maxRecycleCount}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, maxRecycleCount: parseInt(e.target.value) || 5 })}
                      className="w-full px-4 py-2 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Posts Per Day</label>
                  <input
                    type="number"
                    value={scheduleForm.postsPerDay}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, postsPerDay: parseInt(e.target.value) || 1 })}
                    min={1}
                    max={10}
                    className="w-full px-4 py-2 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Active Days</label>
                  <div className="flex gap-2">
                    {daysOfWeek.map((day, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          const newDays = scheduleForm.activeDays.includes(idx)
                            ? scheduleForm.activeDays.filter((d) => d !== idx)
                            : [...scheduleForm.activeDays, idx];
                          setScheduleForm({ ...scheduleForm, activeDays: newDays });
                        }}
                        className={`px-3 py-2 rounded-lg text-sm transition ${
                          scheduleForm.activeDays.includes(idx)
                            ? "bg-indigo-600 text-white"
                            : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="varyContent"
                    checked={scheduleForm.varyContent}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, varyContent: e.target.checked })}
                    className="rounded border-zinc-600 bg-zinc-800 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="varyContent" className="text-sm">
                    Vary content slightly when recycling (emojis, formatting)
                  </label>
                </div>
              </div>

              <div className="p-6 border-t border-white/10 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowScheduleForm(false);
                    setEditingSchedule(null);
                    resetScheduleForm();
                  }}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg font-medium transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSchedule}
                  disabled={!scheduleForm.name}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 disabled:cursor-not-allowed rounded-lg font-medium transition"
                >
                  {editingSchedule ? "Save Changes" : "Create Schedule"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Recycle Modal */}
        {recycleModalPost && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 rounded-2xl w-full max-w-lg">
              <div className="p-6 border-b border-white/10">
                <h2 className="text-xl font-semibold">Recycle Post</h2>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-zinc-800/50 rounded-lg p-4">
                  <p className="text-sm">{truncate(recycleModalPost.content, 200)}</p>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="recycleVary"
                    checked={recycleOptions.varyContent}
                    onChange={(e) => setRecycleOptions({ ...recycleOptions, varyContent: e.target.checked })}
                    className="rounded border-zinc-600 bg-zinc-800 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="recycleVary" className="text-sm">
                    Vary content slightly
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Schedule For (optional)</label>
                  <input
                    type="datetime-local"
                    value={recycleOptions.scheduledFor}
                    onChange={(e) => setRecycleOptions({ ...recycleOptions, scheduledFor: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-zinc-500 mt-1">Leave empty to save as draft</p>
                </div>
              </div>

              <div className="p-6 border-t border-white/10 flex justify-end gap-3">
                <button
                  onClick={() => setRecycleModalPost(null)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg font-medium transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRecycle}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition"
                >
                  Recycle
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
