"use client";

import { useState, useEffect } from "react";

type StoryPlatform = "instagram" | "facebook" | "tiktok" | "youtube";
type StoryType = "story" | "reel" | "short";
type StoryStatus = "draft" | "scheduled" | "published" | "failed" | "expired";

interface StoryMedia {
  id: string;
  type: "image" | "video";
  url: string;
  thumbnailUrl?: string;
  duration?: number;
  width: number;
  height: number;
  size: number;
}

interface StoryOverlay {
  id: string;
  type: "text" | "sticker" | "mention" | "hashtag" | "location" | "poll" | "question" | "countdown" | "link";
  content: string;
  position: { x: number; y: number };
  style?: {
    fontSize?: number;
    fontWeight?: string;
    color?: string;
    backgroundColor?: string;
    rotation?: number;
  };
}

interface Story {
  id: string;
  userId: string;
  type: StoryType;
  platform: StoryPlatform;
  status: StoryStatus;
  media: StoryMedia;
  overlays: StoryOverlay[];
  caption?: string;
  hashtags: string[];
  mentions: string[];
  location?: string;
  scheduledAt?: string;
  publishedAt?: string;
  expiresAt?: string;
  analytics?: {
    views: number;
    uniqueViews: number;
    reaches: number;
    impressions: number;
    replies: number;
    shares: number;
    profileVisits: number;
    linkClicks: number;
    completionRate: number;
  };
  createdAt: string;
}

interface StorySeries {
  id: string;
  name: string;
  description?: string;
  platform: StoryPlatform;
  type: StoryType;
  stories: string[];
  interval: number;
  scheduledStartAt?: string;
  status: "draft" | "scheduled" | "in_progress" | "completed";
}

interface StoryTemplate {
  id: string;
  name: string;
  type: StoryType;
  platform: StoryPlatform;
  overlays: StoryOverlay[];
  defaultCaption?: string;
  defaultHashtags: string[];
  category: string;
  usageCount: number;
}

interface StoryStats {
  totalStories: number;
  scheduledStories: number;
  publishedStories: number;
  drafts: number;
  series: number;
  templates: number;
  avgViews: number;
  avgEngagement: number;
  bestPerformingTime: string;
  topPlatform: StoryPlatform;
}

const platforms: { value: StoryPlatform; label: string; color: string; types: StoryType[] }[] = [
  { value: "instagram", label: "Instagram", color: "#E4405F", types: ["story", "reel"] },
  { value: "facebook", label: "Facebook", color: "#1877F2", types: ["story", "reel"] },
  { value: "tiktok", label: "TikTok", color: "#000000", types: ["reel"] },
  { value: "youtube", label: "YouTube", color: "#FF0000", types: ["short"] },
];

const stickers = [
  { id: "poll", name: "Poll", icon: "📊" },
  { id: "question", name: "Question", icon: "❓" },
  { id: "countdown", name: "Countdown", icon: "⏰" },
  { id: "quiz", name: "Quiz", icon: "🎯" },
  { id: "slider", name: "Emoji Slider", icon: "😍" },
  { id: "mention", name: "Mention", icon: "@" },
  { id: "hashtag", name: "Hashtag", icon: "#" },
  { id: "location", name: "Location", icon: "📍" },
  { id: "link", name: "Link", icon: "🔗" },
  { id: "music", name: "Music", icon: "🎵" },
];

export default function StoriesPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "create" | "scheduled" | "templates" | "series">("overview");
  const [stories, setStories] = useState<Story[]>([]);
  const [upcomingStories, setUpcomingStories] = useState<Story[]>([]);
  const [templates, setTemplates] = useState<StoryTemplate[]>([]);
  const [seriesList, setSeriesList] = useState<StorySeries[]>([]);
  const [stats, setStats] = useState<StoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlatform, setSelectedPlatform] = useState<StoryPlatform>("instagram");
  const [selectedType, setSelectedType] = useState<StoryType>("story");
  const [filterPlatform, setFilterPlatform] = useState<StoryPlatform | "all">("all");
  const [filterStatus, setFilterStatus] = useState<StoryStatus | "all">("all");

  // Create form state
  const [createCaption, setCreateCaption] = useState("");
  const [createHashtags, setCreateHashtags] = useState<string[]>([]);
  const [createScheduledAt, setCreateScheduledAt] = useState("");
  const [hashtagInput, setHashtagInput] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [storiesRes, upcomingRes, templatesRes, seriesRes, statsRes] = await Promise.all([
        fetch("/api/stories?action=stories"),
        fetch("/api/stories?action=upcoming&limit=5"),
        fetch("/api/stories?action=templates"),
        fetch("/api/stories?action=series-list"),
        fetch("/api/stories?action=stats"),
      ]);

      const [storiesData, upcomingData, templatesData, seriesData, statsData] = await Promise.all([
        storiesRes.json(),
        upcomingRes.json(),
        templatesRes.json(),
        seriesRes.json(),
        statsRes.json(),
      ]);

      if (storiesData.stories) setStories(storiesData.stories);
      if (upcomingData.stories) setUpcomingStories(upcomingData.stories);
      if (templatesData.templates) setTemplates(templatesData.templates);
      if (seriesData.series) setSeriesList(seriesData.series);
      if (statsData.stats) setStats(statsData.stats);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleStory = async (storyId: string, scheduledAt: string) => {
    try {
      const res = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "schedule", storyId, scheduledAt }),
      });
      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Failed to schedule story:", error);
    }
  };

  const handlePublishStory = async (storyId: string) => {
    try {
      const res = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish", storyId }),
      });
      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Failed to publish story:", error);
    }
  };

  const handleDeleteStory = async (storyId: string) => {
    try {
      const res = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", storyId }),
      });
      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Failed to delete story:", error);
    }
  };

  const handleCreateStory = async () => {
    try {
      // Demo media for now
      const demoMedia: StoryMedia = {
        id: `media_${Date.now()}`,
        type: "image",
        url: "/demo/placeholder.jpg",
        width: 1080,
        height: 1920,
        size: 1024000,
      };

      const res = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          type: selectedType,
          platform: selectedPlatform,
          media: demoMedia,
          overlays: [],
          caption: createCaption,
          hashtags: createHashtags,
          scheduledAt: createScheduledAt || undefined,
        }),
      });

      if (res.ok) {
        setCreateCaption("");
        setCreateHashtags([]);
        setCreateScheduledAt("");
        fetchData();
        setActiveTab("scheduled");
      }
    } catch (error) {
      console.error("Failed to create story:", error);
    }
  };

  const addHashtag = () => {
    if (hashtagInput.trim() && !createHashtags.includes(hashtagInput.trim())) {
      setCreateHashtags([...createHashtags, hashtagInput.trim().replace("#", "")]);
      setHashtagInput("");
    }
  };

  const removeHashtag = (tag: string) => {
    setCreateHashtags(createHashtags.filter((t) => t !== tag));
  };

  const getStatusColor = (status: StoryStatus) => {
    switch (status) {
      case "published":
        return "bg-green-500/20 text-green-400";
      case "scheduled":
        return "bg-blue-500/20 text-blue-400";
      case "draft":
        return "bg-zinc-500/20 text-zinc-400";
      case "failed":
        return "bg-red-500/20 text-red-400";
      case "expired":
        return "bg-orange-500/20 text-orange-400";
      default:
        return "bg-zinc-500/20 text-zinc-400";
    }
  };

  const getPlatformColor = (platform: StoryPlatform) => {
    return platforms.find((p) => p.value === platform)?.color || "#666";
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const filteredStories = stories.filter((story) => {
    if (filterPlatform !== "all" && story.platform !== filterPlatform) return false;
    if (filterStatus !== "all" && story.status !== filterStatus) return false;
    return true;
  });

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="bg-zinc-800 rounded-xl p-4">
            <p className="text-zinc-400 text-sm">Total Stories</p>
            <p className="text-2xl font-bold text-white">{stats.totalStories}</p>
          </div>
          <div className="bg-zinc-800 rounded-xl p-4">
            <p className="text-zinc-400 text-sm">Scheduled</p>
            <p className="text-2xl font-bold text-blue-400">{stats.scheduledStories}</p>
          </div>
          <div className="bg-zinc-800 rounded-xl p-4">
            <p className="text-zinc-400 text-sm">Published</p>
            <p className="text-2xl font-bold text-green-400">{stats.publishedStories}</p>
          </div>
          <div className="bg-zinc-800 rounded-xl p-4">
            <p className="text-zinc-400 text-sm">Avg Views</p>
            <p className="text-2xl font-bold text-white">{stats.avgViews.toLocaleString()}</p>
          </div>
          <div className="bg-zinc-800 rounded-xl p-4">
            <p className="text-zinc-400 text-sm">Best Time</p>
            <p className="text-2xl font-bold text-indigo-400">{stats.bestPerformingTime}</p>
          </div>
          <div className="bg-zinc-800 rounded-xl p-4">
            <p className="text-zinc-400 text-sm">Top Platform</p>
            <p className="text-2xl font-bold capitalize" style={{ color: getPlatformColor(stats.topPlatform) }}>
              {stats.topPlatform}
            </p>
          </div>
        </div>
      )}

      {/* Upcoming Stories */}
      <div className="bg-zinc-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Upcoming Stories</h3>
          <button
            onClick={() => setActiveTab("scheduled")}
            className="text-indigo-400 text-sm hover:text-indigo-300"
          >
            View All →
          </button>
        </div>
        {upcomingStories.length > 0 ? (
          <div className="space-y-3">
            {upcomingStories.map((story) => (
              <div
                key={story.id}
                className="flex items-center justify-between p-4 bg-zinc-900 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-16 bg-zinc-700 rounded-lg flex items-center justify-center"
                    style={{ borderColor: getPlatformColor(story.platform), borderWidth: 2 }}
                  >
                    {story.media.type === "video" ? (
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="text-white font-medium capitalize">
                      {story.platform} {story.type}
                    </p>
                    {story.caption && (
                      <p className="text-zinc-400 text-sm truncate max-w-xs">{story.caption}</p>
                    )}
                    <p className="text-zinc-500 text-xs mt-1">
                      {story.scheduledAt && formatDate(story.scheduledAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs ${getStatusColor(story.status)}`}>
                    {story.status}
                  </span>
                  <button
                    onClick={() => handlePublishStory(story.id)}
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                  >
                    Publish Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-zinc-500 text-center py-8">No upcoming stories scheduled</p>
        )}
      </div>

      {/* Recent Performance */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-zinc-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Stories Performance</h3>
          <div className="space-y-3">
            {stories
              .filter((s) => s.status === "published" && s.analytics)
              .slice(0, 5)
              .map((story) => (
                <div key={story.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: getPlatformColor(story.platform) }}
                    />
                    <span className="text-white text-sm capitalize">
                      {story.platform} {story.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-zinc-400">{story.analytics?.views.toLocaleString()} views</span>
                    <span className="text-green-400">{story.analytics?.completionRate}% completed</span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div className="bg-zinc-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setActiveTab("create")}
              className="p-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex flex-col items-center gap-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-sm">Create Story</span>
            </button>
            <button
              onClick={() => setActiveTab("templates")}
              className="p-4 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 flex flex-col items-center gap-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
              <span className="text-sm">Use Template</span>
            </button>
            <button
              onClick={() => setActiveTab("series")}
              className="p-4 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 flex flex-col items-center gap-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span className="text-sm">Create Series</span>
            </button>
            <button
              onClick={() => setActiveTab("scheduled")}
              className="p-4 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 flex flex-col items-center gap-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm">View Schedule</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCreate = () => (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-zinc-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-6">Create New Story/Reel</h3>

        {/* Platform & Type Selection */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-zinc-400 text-sm mb-2">Platform</label>
            <div className="grid grid-cols-2 gap-2">
              {platforms.map((platform) => (
                <button
                  key={platform.value}
                  onClick={() => {
                    setSelectedPlatform(platform.value);
                    if (!platform.types.includes(selectedType)) {
                      setSelectedType(platform.types[0]);
                    }
                  }}
                  className={`p-3 rounded-lg border transition-all ${
                    selectedPlatform === platform.value
                      ? "border-indigo-500 bg-indigo-500/20"
                      : "border-zinc-700 hover:border-zinc-600"
                  }`}
                >
                  <span className="text-white font-medium">{platform.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-zinc-400 text-sm mb-2">Content Type</label>
            <div className="flex gap-2">
              {platforms
                .find((p) => p.value === selectedPlatform)
                ?.types.map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={`flex-1 p-3 rounded-lg border capitalize transition-all ${
                      selectedType === type
                        ? "border-indigo-500 bg-indigo-500/20 text-white"
                        : "border-zinc-700 text-zinc-400 hover:border-zinc-600"
                    }`}
                  >
                    {type}
                  </button>
                ))}
            </div>
          </div>
        </div>

        {/* Media Upload Area */}
        <div className="mb-6">
          <label className="block text-zinc-400 text-sm mb-2">Media</label>
          <div className="border-2 border-dashed border-zinc-700 rounded-xl p-8 text-center hover:border-zinc-600 transition-colors cursor-pointer">
            <svg className="w-12 h-12 text-zinc-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-white font-medium mb-1">Drop your media here</p>
            <p className="text-zinc-500 text-sm">or click to browse</p>
            <p className="text-zinc-600 text-xs mt-2">
              Supported: MP4, MOV, JPG, PNG (Max 250MB)
            </p>
          </div>
        </div>

        {/* Caption */}
        <div className="mb-6">
          <label className="block text-zinc-400 text-sm mb-2">Caption</label>
          <textarea
            value={createCaption}
            onChange={(e) => setCreateCaption(e.target.value)}
            placeholder="Write your caption..."
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none resize-none"
            rows={3}
          />
        </div>

        {/* Hashtags */}
        <div className="mb-6">
          <label className="block text-zinc-400 text-sm mb-2">Hashtags</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={hashtagInput}
              onChange={(e) => setHashtagInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addHashtag())}
              placeholder="Add hashtag..."
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
            />
            <button
              onClick={addHashtag}
              className="px-4 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600"
            >
              Add
            </button>
          </div>
          {createHashtags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {createHashtags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-indigo-500/20 text-indigo-400 rounded-full text-sm flex items-center gap-2"
                >
                  #{tag}
                  <button onClick={() => removeHashtag(tag)} className="hover:text-white">
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Stickers */}
        <div className="mb-6">
          <label className="block text-zinc-400 text-sm mb-2">Interactive Elements</label>
          <div className="flex flex-wrap gap-2">
            {stickers.map((sticker) => (
              <button
                key={sticker.id}
                className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg hover:border-zinc-600 transition-colors flex items-center gap-2"
              >
                <span>{sticker.icon}</span>
                <span className="text-white text-sm">{sticker.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Schedule */}
        <div className="mb-6">
          <label className="block text-zinc-400 text-sm mb-2">Schedule (Optional)</label>
          <input
            type="datetime-local"
            value={createScheduledAt}
            onChange={(e) => setCreateScheduledAt(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:border-indigo-500 focus:outline-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleCreateStory}
            className="flex-1 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
          >
            {createScheduledAt ? "Schedule Story" : "Save as Draft"}
          </button>
          {!createScheduledAt && (
            <button
              onClick={handleCreateStory}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              Publish Now
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const renderScheduled = () => (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <select
          value={filterPlatform}
          onChange={(e) => setFilterPlatform(e.target.value as StoryPlatform | "all")}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white"
        >
          <option value="all">All Platforms</option>
          {platforms.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as StoryStatus | "all")}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white"
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
          <option value="published">Published</option>
        </select>
      </div>

      {/* Stories Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStories.map((story) => (
          <div key={story.id} className="bg-zinc-800 rounded-xl overflow-hidden">
            {/* Preview */}
            <div
              className="aspect-[9/16] bg-zinc-900 relative flex items-center justify-center"
              style={{ maxHeight: "280px" }}
            >
              {story.media.type === "video" ? (
                <svg className="w-16 h-16 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-16 h-16 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )}
              <div className="absolute top-2 left-2 flex gap-2">
                <span
                  className="px-2 py-1 rounded text-xs text-white capitalize"
                  style={{ backgroundColor: getPlatformColor(story.platform) }}
                >
                  {story.platform}
                </span>
                <span className={`px-2 py-1 rounded text-xs ${getStatusColor(story.status)}`}>
                  {story.status}
                </span>
              </div>
              {story.media.type === "video" && story.media.duration && (
                <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 rounded text-xs text-white">
                  {Math.floor(story.media.duration / 60)}:{(story.media.duration % 60).toString().padStart(2, "0")}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="p-4">
              <p className="text-white capitalize font-medium mb-1">{story.type}</p>
              {story.caption && (
                <p className="text-zinc-400 text-sm truncate mb-2">{story.caption}</p>
              )}
              {story.scheduledAt && (
                <p className="text-zinc-500 text-xs mb-2">
                  Scheduled: {formatDate(story.scheduledAt)}
                </p>
              )}
              {story.analytics && (
                <div className="flex gap-3 text-xs text-zinc-400 mb-3">
                  <span>{story.analytics.views.toLocaleString()} views</span>
                  <span>{story.analytics.replies} replies</span>
                </div>
              )}
              <div className="flex gap-2">
                {story.status === "draft" && (
                  <button
                    onClick={() => handlePublishStory(story.id)}
                    className="flex-1 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                  >
                    Publish
                  </button>
                )}
                {story.status === "scheduled" && (
                  <button
                    onClick={() => handlePublishStory(story.id)}
                    className="flex-1 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                  >
                    Publish Now
                  </button>
                )}
                <button
                  onClick={() => handleDeleteStory(story.id)}
                  className="px-3 py-2 bg-zinc-700 text-white text-sm rounded hover:bg-zinc-600"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredStories.length === 0 && (
        <div className="text-center py-12">
          <svg className="w-16 h-16 text-zinc-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <p className="text-zinc-400">No stories found</p>
          <button
            onClick={() => setActiveTab("create")}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Create Your First Story
          </button>
        </div>
      )}
    </div>
  );

  const renderTemplates = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Story Templates</h3>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
          Create Template
        </button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <div key={template.id} className="bg-zinc-800 rounded-xl overflow-hidden">
            <div className="aspect-[9/16] bg-zinc-900 relative flex items-center justify-center max-h-[280px]">
              <svg className="w-16 h-16 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
              <div className="absolute top-2 left-2">
                <span
                  className="px-2 py-1 rounded text-xs text-white capitalize"
                  style={{ backgroundColor: getPlatformColor(template.platform) }}
                >
                  {template.platform}
                </span>
              </div>
            </div>
            <div className="p-4">
              <p className="text-white font-medium mb-1">{template.name}</p>
              <p className="text-zinc-400 text-sm mb-2">{template.category}</p>
              <p className="text-zinc-500 text-xs mb-3">Used {template.usageCount} times</p>
              <button className="w-full py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700">
                Use Template
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSeries = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Story Series</h3>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
          Create Series
        </button>
      </div>

      {seriesList.length > 0 ? (
        <div className="space-y-4">
          {seriesList.map((s) => (
            <div key={s.id} className="bg-zinc-800 rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="text-white font-medium text-lg">{s.name}</h4>
                  {s.description && <p className="text-zinc-400 text-sm">{s.description}</p>}
                </div>
                <span
                  className={`px-3 py-1 rounded text-sm capitalize ${
                    s.status === "completed"
                      ? "bg-green-500/20 text-green-400"
                      : s.status === "in_progress"
                      ? "bg-blue-500/20 text-blue-400"
                      : s.status === "scheduled"
                      ? "bg-indigo-500/20 text-indigo-400"
                      : "bg-zinc-500/20 text-zinc-400"
                  }`}
                >
                  {s.status.replace("_", " ")}
                </span>
              </div>
              <div className="flex items-center gap-6 text-sm text-zinc-400 mb-4">
                <span className="capitalize" style={{ color: getPlatformColor(s.platform) }}>
                  {s.platform}
                </span>
                <span>{s.stories.length} stories</span>
                <span>{s.interval} min interval</span>
                {s.scheduledStartAt && (
                  <span>Starts: {formatDate(s.scheduledStartAt)}</span>
                )}
              </div>
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-zinc-700 text-white text-sm rounded hover:bg-zinc-600">
                  Edit
                </button>
                <button className="px-4 py-2 bg-zinc-700 text-white text-sm rounded hover:bg-zinc-600">
                  View Stories
                </button>
                {s.status === "draft" && (
                  <button className="px-4 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700">
                    Schedule
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-zinc-800 rounded-xl">
          <svg className="w-16 h-16 text-zinc-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <p className="text-zinc-400 mb-2">No story series yet</p>
          <p className="text-zinc-500 text-sm mb-4">Create a series to post multiple stories in sequence</p>
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            Create Your First Series
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Stories & Reels</h1>
          <p className="text-zinc-400">Schedule and manage stories, reels, and shorts across platforms</p>
        </div>
        <button
          onClick={() => setActiveTab("create")}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create New
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-zinc-800 pb-2">
        {[
          { id: "overview", label: "Overview" },
          { id: "create", label: "Create" },
          { id: "scheduled", label: "All Stories" },
          { id: "templates", label: "Templates" },
          { id: "series", label: "Series" },
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
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        </div>
      ) : (
        <>
          {activeTab === "overview" && renderOverview()}
          {activeTab === "create" && renderCreate()}
          {activeTab === "scheduled" && renderScheduled()}
          {activeTab === "templates" && renderTemplates()}
          {activeTab === "series" && renderSeries()}
        </>
      )}
    </div>
  );
}
