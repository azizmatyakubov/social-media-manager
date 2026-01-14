"use client";

import { useState, useEffect } from "react";
import {
  CalendarDaysIcon,
  ClockIcon,
  SparklesIcon,
  QueueListIcon,
  ChartBarIcon,
  PlusIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  BoltIcon,
  HashtagIcon,
} from "@heroicons/react/24/outline";

type Platform = "twitter" | "instagram" | "facebook" | "linkedin" | "tiktok";
type ContentType = "text" | "image" | "video" | "carousel" | "story" | "reel" | "thread";

interface ScheduledPost {
  id: string;
  content: string;
  contentType: ContentType;
  platform: Platform;
  scheduledTime: string;
  optimizedTime?: string;
  optimizationScore: number;
  status: "pending" | "scheduled" | "published" | "failed";
  hashtags?: string[];
}

interface ScheduleSlot {
  id: string;
  dayOfWeek: number;
  hour: number;
  minute: number;
  platform: Platform;
  score: number;
  audiencePercentage: number;
}

interface SmartQueue {
  id: string;
  name: string;
  platforms: Platform[];
  slots: ScheduleSlot[];
  posts: ScheduledPost[];
  autoOptimize: boolean;
  timezone: string;
}

interface Optimization {
  originalTime: string;
  suggestedTime: string;
  improvementPercentage: number;
  reason: string;
  competitorConflicts: number;
  audienceActivity: number;
}

const PLATFORMS: { value: Platform; label: string; color: string }[] = [
  { value: "twitter", label: "X (Twitter)", color: "bg-sky-500" },
  { value: "instagram", label: "Instagram", color: "bg-pink-500" },
  { value: "facebook", label: "Facebook", color: "bg-blue-600" },
  { value: "linkedin", label: "LinkedIn", color: "bg-blue-700" },
  { value: "tiktok", label: "TikTok", color: "bg-black" },
];

const CONTENT_TYPES: { value: ContentType; label: string }[] = [
  { value: "text", label: "Text Post" },
  { value: "image", label: "Image Post" },
  { value: "video", label: "Video Post" },
  { value: "carousel", label: "Carousel" },
  { value: "story", label: "Story" },
  { value: "reel", label: "Reel" },
  { value: "thread", label: "Thread" },
];

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function SmartSchedulePage() {
  const [activeTab, setActiveTab] = useState<"schedule" | "optimize" | "queues" | "analytics">("schedule");
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [queues, setQueues] = useState<SmartQueue[]>([]);
  const [loading, setLoading] = useState(false);

  // Schedule form
  const [content, setContent] = useState("");
  const [contentType, setContentType] = useState<ContentType>("text");
  const [platform, setPlatform] = useState<Platform>("twitter");
  const [scheduledTime, setScheduledTime] = useState("");
  const [optimization, setOptimization] = useState<Optimization | null>(null);
  const [suggestedHashtags, setSuggestedHashtags] = useState<string[]>([]);

  // Batch optimization
  const [batchPosts, setBatchPosts] = useState<string>("");
  const [batchResults, setBatchResults] = useState<any>(null);

  // Smart schedule generator
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(["twitter"]);
  const [postsPerDay, setPostsPerDay] = useState(2);
  const [scheduleDays, setScheduleDays] = useState(7);
  const [generatedSlots, setGeneratedSlots] = useState<ScheduleSlot[]>([]);

  // Queue form
  const [queueName, setQueueName] = useState("");
  const [queuePlatforms, setQueuePlatforms] = useState<Platform[]>([]);
  const [autoOptimize, setAutoOptimize] = useState(true);

  useEffect(() => {
    fetchPosts();
    fetchQueues();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await fetch("/api/smart-schedule?action=posts");
      const data = await response.json();
      setPosts(data.posts || []);
    } catch (error) {
      console.error("Failed to fetch posts:", error);
    }
  };

  const fetchQueues = async () => {
    try {
      const response = await fetch("/api/smart-schedule?action=queues");
      const data = await response.json();
      setQueues(data.queues || []);
    } catch (error) {
      console.error("Failed to fetch queues:", error);
    }
  };

  const optimizeTime = async () => {
    if (!scheduledTime) return;

    setLoading(true);
    try {
      const response = await fetch("/api/smart-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "optimize",
          content,
          platform,
          scheduledTime,
        }),
      });

      const data = await response.json();
      setOptimization(data.optimization);
    } catch (error) {
      console.error("Failed to optimize:", error);
    } finally {
      setLoading(false);
    }
  };

  const suggestHashtags = async () => {
    if (!content) return;

    setLoading(true);
    try {
      const response = await fetch("/api/smart-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "suggest-hashtags",
          content,
          platform,
        }),
      });

      const data = await response.json();
      setSuggestedHashtags(data.hashtags || []);
    } catch (error) {
      console.error("Failed to suggest hashtags:", error);
    } finally {
      setLoading(false);
    }
  };

  const createPost = async () => {
    if (!content || !scheduledTime) return;

    setLoading(true);
    try {
      const response = await fetch("/api/smart-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-post",
          content,
          contentType,
          platform,
          scheduledTime,
          hashtags: suggestedHashtags,
        }),
      });

      const data = await response.json();
      if (data.post) {
        await fetchPosts();
        setContent("");
        setScheduledTime("");
        setOptimization(null);
        setSuggestedHashtags([]);
      }
    } catch (error) {
      console.error("Failed to create post:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateSchedule = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/smart-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-schedule",
          platforms: selectedPlatforms,
          postsPerDay,
          days: scheduleDays,
        }),
      });

      const data = await response.json();
      setGeneratedSlots(data.slots || []);
    } catch (error) {
      console.error("Failed to generate schedule:", error);
    } finally {
      setLoading(false);
    }
  };

  const batchOptimize = async () => {
    if (!batchPosts) return;

    setLoading(true);
    try {
      const postsArray = batchPosts.split("\n").filter(Boolean).map((line, index) => {
        const [content, time] = line.split("|");
        return {
          content: content?.trim() || "",
          platform,
          scheduledTime: time?.trim() || new Date(Date.now() + index * 3600000).toISOString(),
        };
      });

      const response = await fetch("/api/smart-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "batch-optimize",
          posts: postsArray,
        }),
      });

      const data = await response.json();
      setBatchResults(data);
    } catch (error) {
      console.error("Failed to batch optimize:", error);
    } finally {
      setLoading(false);
    }
  };

  const createQueue = async () => {
    if (!queueName || queuePlatforms.length === 0) return;

    setLoading(true);
    try {
      const response = await fetch("/api/smart-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-queue",
          name: queueName,
          platforms: queuePlatforms,
          autoOptimize,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });

      const data = await response.json();
      if (data.queue) {
        await fetchQueues();
        setQueueName("");
        setQueuePlatforms([]);
      }
    } catch (error) {
      console.error("Failed to create queue:", error);
    } finally {
      setLoading(false);
    }
  };

  const deletePost = async (postId: string) => {
    try {
      await fetch("/api/smart-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete-post", postId }),
      });
      await fetchPosts();
    } catch (error) {
      console.error("Failed to delete post:", error);
    }
  };

  const formatTime = (time: string) => {
    return new Date(time).toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">AI Smart Scheduling</h1>
        <p className="text-zinc-400 mt-1">
          Optimize your posting times with AI-powered scheduling
        </p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-zinc-900/50 p-1 rounded-lg w-fit">
        {[
          { id: "schedule", label: "Schedule", icon: CalendarDaysIcon },
          { id: "optimize", label: "Batch Optimize", icon: BoltIcon },
          { id: "queues", label: "Smart Queues", icon: QueueListIcon },
          { id: "analytics", label: "Analytics", icon: ChartBarIcon },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
              activeTab === id
                ? "bg-indigo-600 text-white"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Schedule Tab */}
      {activeTab === "schedule" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Create Post */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <SparklesIcon className="w-5 h-5 text-indigo-400" />
              Schedule with AI Optimization
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Platform</label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value as Platform)}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                >
                  {PLATFORMS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Content Type</label>
                <select
                  value={contentType}
                  onChange={(e) => setContentType(e.target.value as ContentType)}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                >
                  {CONTENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Content</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={4}
                  placeholder="Write your post content..."
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
                <div className="flex justify-end mt-2">
                  <button
                    onClick={suggestHashtags}
                    disabled={loading || !content}
                    className="flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-300 disabled:opacity-50"
                  >
                    <HashtagIcon className="w-4 h-4" />
                    Suggest Hashtags
                  </button>
                </div>
              </div>

              {suggestedHashtags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {suggestedHashtags.map((tag, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Schedule Time</label>
                <input
                  type="datetime-local"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                onClick={optimizeTime}
                disabled={loading || !scheduledTime}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 disabled:opacity-50"
              >
                <SparklesIcon className="w-4 h-4" />
                {loading ? "Analyzing..." : "Find Optimal Time"}
              </button>

              {optimization && (
                <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                  <div className="flex items-start gap-3">
                    {optimization.improvementPercentage > 0 ? (
                      <CheckCircleIcon className="w-5 h-5 text-green-400 mt-0.5" />
                    ) : (
                      <ClockIcon className="w-5 h-5 text-blue-400 mt-0.5" />
                    )}
                    <div>
                      <p className="text-white font-medium">{optimization.reason}</p>
                      <div className="mt-2 text-sm text-zinc-400 space-y-1">
                        <p>Audience Activity: {optimization.audienceActivity}%</p>
                        {optimization.improvementPercentage > 0 && (
                          <p className="text-green-400">
                            +{optimization.improvementPercentage}% improvement
                          </p>
                        )}
                        <p>Suggested: {formatTime(optimization.suggestedTime)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={createPost}
                disabled={loading || !content || !scheduledTime}
                className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Scheduling..." : "Schedule Post"}
              </button>
            </div>
          </div>

          {/* Scheduled Posts */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <QueueListIcon className="w-5 h-5 text-indigo-400" />
              Scheduled Posts
            </h2>

            {posts.length === 0 ? (
              <p className="text-zinc-500 text-center py-8">No scheduled posts yet</p>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-0.5 rounded text-xs text-white ${
                            PLATFORMS.find(p => p.value === post.platform)?.color || "bg-zinc-600"
                          }`}>
                            {PLATFORMS.find(p => p.value === post.platform)?.label}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            post.status === "scheduled" ? "bg-green-500/20 text-green-400" :
                            post.status === "published" ? "bg-blue-500/20 text-blue-400" :
                            post.status === "failed" ? "bg-red-500/20 text-red-400" :
                            "bg-yellow-500/20 text-yellow-400"
                          }`}>
                            {post.status}
                          </span>
                        </div>
                        <p className="text-white text-sm line-clamp-2">{post.content}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-zinc-400">
                          <span className="flex items-center gap-1">
                            <ClockIcon className="w-3 h-3" />
                            {formatTime(post.scheduledTime)}
                          </span>
                          <span className="flex items-center gap-1">
                            <ChartBarIcon className="w-3 h-3" />
                            Score: {post.optimizationScore}%
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => deletePost(post.id)}
                        className="text-zinc-500 hover:text-red-400 p-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Batch Optimize Tab */}
      {activeTab === "optimize" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            {/* Batch Input */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <BoltIcon className="w-5 h-5 text-yellow-400" />
                Batch Optimization
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Platform</label>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value as Platform)}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  >
                    {PLATFORMS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">
                    Posts (one per line, format: content|time)
                  </label>
                  <textarea
                    value={batchPosts}
                    onChange={(e) => setBatchPosts(e.target.value)}
                    rows={8}
                    placeholder="Post content 1|2024-01-15T10:00&#10;Post content 2|2024-01-15T14:00&#10;Post content 3|2024-01-16T09:00"
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 font-mono text-sm"
                  />
                </div>

                <button
                  onClick={batchOptimize}
                  disabled={loading || !batchPosts}
                  className="w-full px-4 py-3 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700 disabled:opacity-50"
                >
                  {loading ? "Optimizing..." : "Optimize All Posts"}
                </button>
              </div>
            </div>

            {/* Generate Schedule */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <CalendarDaysIcon className="w-5 h-5 text-green-400" />
                Generate Smart Schedule
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Platforms</label>
                  <div className="flex flex-wrap gap-2">
                    {PLATFORMS.map((p) => (
                      <button
                        key={p.value}
                        onClick={() => {
                          setSelectedPlatforms(prev =>
                            prev.includes(p.value)
                              ? prev.filter(x => x !== p.value)
                              : [...prev, p.value]
                          );
                        }}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          selectedPlatforms.includes(p.value)
                            ? `${p.color} text-white`
                            : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Posts per Day</label>
                    <input
                      type="number"
                      value={postsPerDay}
                      onChange={(e) => setPostsPerDay(parseInt(e.target.value) || 1)}
                      min="1"
                      max="10"
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Days Ahead</label>
                    <input
                      type="number"
                      value={scheduleDays}
                      onChange={(e) => setScheduleDays(parseInt(e.target.value) || 7)}
                      min="1"
                      max="30"
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <button
                  onClick={generateSchedule}
                  disabled={loading || selectedPlatforms.length === 0}
                  className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? "Generating..." : "Generate Schedule"}
                </button>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="space-y-6">
            {batchResults && (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Optimization Results</h2>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="p-3 bg-zinc-800 rounded-lg text-center">
                    <p className="text-2xl font-bold text-green-400">+{batchResults.summary.totalImprovement}%</p>
                    <p className="text-xs text-zinc-400">Avg Improvement</p>
                  </div>
                  <div className="p-3 bg-zinc-800 rounded-lg text-center">
                    <p className="text-2xl font-bold text-white">{batchResults.summary.postsOptimized}</p>
                    <p className="text-xs text-zinc-400">Optimized</p>
                  </div>
                  <div className="p-3 bg-zinc-800 rounded-lg text-center">
                    <p className="text-2xl font-bold text-zinc-400">{batchResults.summary.postsUnchanged}</p>
                    <p className="text-xs text-zinc-400">Unchanged</p>
                  </div>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {batchResults.optimizedPosts?.map((item: any, i: number) => (
                    <div key={i} className="p-3 bg-zinc-800/50 rounded-lg flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{item.post.content}</p>
                        <p className="text-xs text-zinc-400">{formatTime(item.optimization.suggestedTime)}</p>
                      </div>
                      {item.optimization.improvementPercentage > 0 && (
                        <span className="text-green-400 text-sm ml-2">
                          +{item.optimization.improvementPercentage}%
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {generatedSlots.length > 0 && (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Generated Time Slots</h2>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {generatedSlots.map((slot) => (
                    <div
                      key={slot.id}
                      className="p-3 bg-zinc-800/50 rounded-lg flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full ${
                          PLATFORMS.find(p => p.value === slot.platform)?.color || "bg-zinc-600"
                        }`} />
                        <div>
                          <p className="text-white text-sm">
                            {DAY_NAMES[slot.dayOfWeek]} at {slot.hour.toString().padStart(2, "0")}:00
                          </p>
                          <p className="text-xs text-zinc-400">
                            {PLATFORMS.find(p => p.value === slot.platform)?.label}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-green-400 text-sm font-medium">{slot.score}%</p>
                        <p className="text-xs text-zinc-500">{slot.audiencePercentage}% active</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Queues Tab */}
      {activeTab === "queues" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create Queue */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <PlusIcon className="w-5 h-5 text-indigo-400" />
              Create Smart Queue
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Queue Name</label>
                <input
                  type="text"
                  value={queueName}
                  onChange={(e) => setQueueName(e.target.value)}
                  placeholder="e.g., Weekly Content Queue"
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Platforms</label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => {
                        setQueuePlatforms(prev =>
                          prev.includes(p.value)
                            ? prev.filter(x => x !== p.value)
                            : [...prev, p.value]
                        );
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        queuePlatforms.includes(p.value)
                          ? `${p.color} text-white`
                          : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="autoOptimize"
                  checked={autoOptimize}
                  onChange={(e) => setAutoOptimize(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="autoOptimize" className="text-sm text-zinc-300">
                  Auto-optimize posting times
                </label>
              </div>

              <button
                onClick={createQueue}
                disabled={loading || !queueName || queuePlatforms.length === 0}
                className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                Create Queue
              </button>
            </div>
          </div>

          {/* Queue List */}
          <div className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Your Smart Queues</h2>

            {queues.length === 0 ? (
              <p className="text-zinc-500 text-center py-8">No queues created yet</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {queues.map((queue) => (
                  <div
                    key={queue.id}
                    className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-white font-medium">{queue.name}</h3>
                      {queue.autoOptimize && (
                        <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">
                          Auto-optimize
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1 mb-3">
                      {queue.platforms.map((p) => (
                        <span
                          key={p}
                          className={`px-2 py-0.5 rounded text-xs text-white ${
                            PLATFORMS.find(plat => plat.value === p)?.color || "bg-zinc-600"
                          }`}
                        >
                          {PLATFORMS.find(plat => plat.value === p)?.label}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-sm text-zinc-400">
                      <span>{queue.posts.length} posts queued</span>
                      <span>{queue.timezone}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === "analytics" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Overview Stats */}
          <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
              <p className="text-zinc-400 text-sm">Total Scheduled</p>
              <p className="text-2xl font-bold text-white mt-1">{posts.length}</p>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
              <p className="text-zinc-400 text-sm">Avg Optimization Score</p>
              <p className="text-2xl font-bold text-green-400 mt-1">
                {posts.length > 0
                  ? Math.round(posts.reduce((sum, p) => sum + p.optimizationScore, 0) / posts.length)
                  : 0}%
              </p>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
              <p className="text-zinc-400 text-sm">Active Queues</p>
              <p className="text-2xl font-bold text-indigo-400 mt-1">{queues.length}</p>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
              <p className="text-zinc-400 text-sm">Posts This Week</p>
              <p className="text-2xl font-bold text-yellow-400 mt-1">
                {posts.filter(p => {
                  const postDate = new Date(p.scheduledTime);
                  const now = new Date();
                  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                  return postDate >= now && postDate <= weekFromNow;
                }).length}
              </p>
            </div>
          </div>

          {/* Platform Distribution */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Posts by Platform</h2>
            <div className="space-y-3">
              {PLATFORMS.map((p) => {
                const count = posts.filter(post => post.platform === p.value).length;
                const percentage = posts.length > 0 ? (count / posts.length) * 100 : 0;
                return (
                  <div key={p.value} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-300">{p.label}</span>
                      <span className="text-zinc-400">{count}</span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${p.color}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Best Performing Times */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Best Posting Times</h2>
            <div className="space-y-3">
              {[
                { time: "12:00 PM", day: "Tuesday", score: 95 },
                { time: "6:00 PM", day: "Wednesday", score: 92 },
                { time: "9:00 AM", day: "Monday", score: 88 },
                { time: "3:00 PM", day: "Friday", score: 85 },
                { time: "8:00 PM", day: "Thursday", score: 82 },
              ].map((slot, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-zinc-800/50 rounded-lg">
                  <div>
                    <p className="text-white text-sm">{slot.day}</p>
                    <p className="text-zinc-400 text-xs">{slot.time}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500"
                        style={{ width: `${slot.score}%` }}
                      />
                    </div>
                    <span className="text-green-400 text-sm">{slot.score}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Schedule */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Next 7 Days</h2>
            <div className="space-y-2">
              {Array.from({ length: 7 }).map((_, i) => {
                const date = new Date();
                date.setDate(date.getDate() + i);
                const dateStr = date.toISOString().split("T")[0];
                const dayPosts = posts.filter(p =>
                  new Date(p.scheduledTime).toISOString().split("T")[0] === dateStr
                );

                return (
                  <div key={i} className="flex items-center justify-between p-2 bg-zinc-800/50 rounded-lg">
                    <div>
                      <p className="text-white text-sm">
                        {date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {dayPosts.length > 0 ? (
                        <>
                          <div className="flex -space-x-1">
                            {dayPosts.slice(0, 3).map((post, j) => (
                              <span
                                key={j}
                                className={`w-4 h-4 rounded-full border border-zinc-900 ${
                                  PLATFORMS.find(p => p.value === post.platform)?.color || "bg-zinc-600"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-zinc-300 text-sm">{dayPosts.length} posts</span>
                        </>
                      ) : (
                        <span className="text-zinc-500 text-sm">No posts</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
