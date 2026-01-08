"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";

interface RssFeed {
  id: string;
  name: string;
  feedUrl: string;
  platforms: string[];
  autoPost: boolean;
  postTemplate: string | null;
  includeImage: boolean;
  maxPostsPerDay: number;
  checkInterval: number;
  lastChecked: string | null;
  totalPosted: number;
  isActive: boolean;
  createdAt: string;
}

interface FeedPreview {
  feed: {
    title: string;
    description: string;
    link: string;
    itemCount: number;
  };
  items: Array<{
    guid: string;
    title: string;
    link: string;
    description: string;
    pubDate: string;
    author?: string;
    image?: string;
    categories?: string[];
  }>;
  samplePosts: Array<{
    content: string;
    imageUrl?: string;
  }>;
}

const PLATFORM_OPTIONS = [
  { value: "X", label: "X (Twitter)" },
  { value: "LINKEDIN", label: "LinkedIn" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "BLUESKY", label: "Bluesky" },
];

const TEMPLATE_VARIABLES = [
  { variable: "{title}", description: "Post title" },
  { variable: "{link}", description: "Link to article" },
  { variable: "{description}", description: "Post description (truncated)" },
  { variable: "{author}", description: "Author name" },
  { variable: "{categories}", description: "Categories/tags" },
];

const DEFAULT_TEMPLATE = "{title}\n\n{link}";

export default function RssFeedsPage() {
  const { data: session, status } = useSession();
  const [feeds, setFeeds] = useState<RssFeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedFeed, setSelectedFeed] = useState<RssFeed | null>(null);
  const [previewData, setPreviewData] = useState<FeedPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    feedUrl: "",
    name: "",
    platforms: ["X"] as string[],
    autoPost: true,
    postTemplate: DEFAULT_TEMPLATE,
    includeImage: true,
    maxPostsPerDay: 5,
    checkInterval: 60,
    isActive: true,
  });

  useEffect(() => {
    if (status === "authenticated") {
      fetchFeeds();
    }
  }, [status]);

  if (status === "loading") return <div className="p-8">Loading...</div>;
  if (status === "unauthenticated") redirect("/login");

  async function fetchFeeds() {
    try {
      const res = await fetch("/api/rss-feeds");
      const data = await res.json();
      setFeeds(data);
    } catch (error) {
      console.error("Failed to fetch feeds:", error);
    } finally {
      setLoading(false);
    }
  }

  async function previewFeed() {
    if (!formData.feedUrl) return;

    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewData(null);

    try {
      const res = await fetch("/api/rss-feeds/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedUrl: formData.feedUrl,
          limit: 5,
          postTemplate: formData.postTemplate,
          includeImage: formData.includeImage,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPreviewError(data.error || "Failed to preview feed");
        return;
      }

      setPreviewData(data);
      // Auto-fill name if not set
      if (!formData.name && data.feed.title) {
        setFormData((prev) => ({ ...prev, name: data.feed.title }));
      }
    } catch (error) {
      setPreviewError("Failed to preview feed");
      console.error("Preview error:", error);
    } finally {
      setPreviewLoading(false);
    }
  }

  async function addFeed() {
    if (!formData.feedUrl) return;

    try {
      const res = await fetch("/api/rss-feeds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setShowAddModal(false);
        resetForm();
        fetchFeeds();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to add feed");
      }
    } catch (error) {
      console.error("Add feed error:", error);
      alert("Failed to add feed");
    }
  }

  async function updateFeed() {
    if (!selectedFeed) return;

    try {
      const res = await fetch("/api/rss-feeds", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedId: selectedFeed.id,
          ...formData,
        }),
      });

      if (res.ok) {
        setShowEditModal(false);
        setSelectedFeed(null);
        resetForm();
        fetchFeeds();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to update feed");
      }
    } catch (error) {
      console.error("Update feed error:", error);
      alert("Failed to update feed");
    }
  }

  async function deleteFeed(id: string) {
    if (!confirm("Are you sure you want to delete this feed?")) return;

    try {
      await fetch(`/api/rss-feeds?feedId=${id}`, { method: "DELETE" });
      fetchFeeds();
    } catch (error) {
      console.error("Delete feed error:", error);
    }
  }

  async function toggleFeedActive(feed: RssFeed) {
    try {
      await fetch("/api/rss-feeds", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedId: feed.id,
          isActive: !feed.isActive,
        }),
      });
      fetchFeeds();
    } catch (error) {
      console.error("Toggle feed error:", error);
    }
  }

  function openEditModal(feed: RssFeed) {
    setSelectedFeed(feed);
    setFormData({
      feedUrl: feed.feedUrl,
      name: feed.name,
      platforms: feed.platforms,
      autoPost: feed.autoPost,
      postTemplate: feed.postTemplate || DEFAULT_TEMPLATE,
      includeImage: feed.includeImage,
      maxPostsPerDay: feed.maxPostsPerDay,
      checkInterval: feed.checkInterval,
      isActive: feed.isActive,
    });
    setShowEditModal(true);
  }

  function resetForm() {
    setFormData({
      feedUrl: "",
      name: "",
      platforms: ["X"],
      autoPost: true,
      postTemplate: DEFAULT_TEMPLATE,
      includeImage: true,
      maxPostsPerDay: 5,
      checkInterval: 60,
      isActive: true,
    });
    setPreviewData(null);
    setPreviewError(null);
  }

  function handlePlatformToggle(platform: string) {
    setFormData((prev) => {
      const platforms = prev.platforms.includes(platform)
        ? prev.platforms.filter((p) => p !== platform)
        : [...prev.platforms, platform];
      return { ...prev, platforms };
    });
  }

  function formatLastChecked(dateStr: string | null) {
    if (!dateStr) return "Never";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">RSS Feed Auto-Posting</h1>
          <p className="text-[var(--x-text-secondary)]">
            Automatically create posts from your favorite RSS feeds
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
          className="btn-primary"
        >
          Add RSS Feed
        </button>
      </div>

      {/* Feeds List */}
      {loading ? (
        <div className="text-center py-12 text-[var(--x-text-secondary)]">
          Loading feeds...
        </div>
      ) : feeds.length === 0 ? (
        <div className="x-card p-12 text-center">
          <div className="text-4xl mb-4">RSS</div>
          <h3 className="text-lg font-bold mb-2">No RSS Feeds Connected</h3>
          <p className="text-[var(--x-text-secondary)] mb-6">
            Add RSS feeds to automatically create social media posts from your favorite content sources.
          </p>
          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="btn-primary"
          >
            Add Your First Feed
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {feeds.map((feed) => (
            <div key={feed.id} className="x-card p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-lg">{feed.name}</h3>
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        feed.isActive
                          ? "bg-green-500/20 text-green-500"
                          : "bg-gray-500/20 text-gray-400"
                      }`}
                    >
                      {feed.isActive ? "Active" : "Paused"}
                    </span>
                    {feed.autoPost && (
                      <span className="px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400">
                        Auto-Post
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[var(--x-text-secondary)] mb-3 break-all">
                    {feed.feedUrl}
                  </p>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div>
                      <span className="text-[var(--x-text-secondary)]">Platforms:</span>{" "}
                      {feed.platforms.join(", ")}
                    </div>
                    <div>
                      <span className="text-[var(--x-text-secondary)]">Posted:</span>{" "}
                      {feed.totalPosted}
                    </div>
                    <div>
                      <span className="text-[var(--x-text-secondary)]">Last Check:</span>{" "}
                      {formatLastChecked(feed.lastChecked)}
                    </div>
                    <div>
                      <span className="text-[var(--x-text-secondary)]">Interval:</span>{" "}
                      {feed.checkInterval}min
                    </div>
                    <div>
                      <span className="text-[var(--x-text-secondary)]">Max/Day:</span>{" "}
                      {feed.maxPostsPerDay}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleFeedActive(feed)}
                    className={`px-3 py-1.5 rounded text-sm ${
                      feed.isActive
                        ? "bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30"
                        : "bg-green-500/20 text-green-500 hover:bg-green-500/30"
                    }`}
                  >
                    {feed.isActive ? "Pause" : "Resume"}
                  </button>
                  <button
                    onClick={() => openEditModal(feed)}
                    className="btn-secondary"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteFeed(feed.id)}
                    className="text-red-500 hover:text-red-400 px-3 py-1.5"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Post Template Preview */}
              {feed.postTemplate && (
                <div className="mt-4 p-3 rounded bg-[var(--x-background)] text-sm">
                  <div className="text-xs text-[var(--x-text-secondary)] mb-1">
                    Post Template:
                  </div>
                  <code className="whitespace-pre-wrap">{feed.postTemplate}</code>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 x-modal-overlay flex items-center justify-center z-50 p-4">
          <div className="x-modal p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-6">
              {showEditModal ? "Edit RSS Feed" : "Add RSS Feed"}
            </h2>

            <div className="space-y-6">
              {/* Feed URL */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Feed URL <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://example.com/feed.xml"
                    value={formData.feedUrl}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, feedUrl: e.target.value }))
                    }
                    className="x-input flex-1"
                    disabled={showEditModal}
                  />
                  {!showEditModal && (
                    <button
                      onClick={previewFeed}
                      disabled={!formData.feedUrl || previewLoading}
                      className="btn-secondary whitespace-nowrap"
                    >
                      {previewLoading ? "Loading..." : "Preview"}
                    </button>
                  )}
                </div>
                {previewError && (
                  <p className="text-red-500 text-sm mt-2">{previewError}</p>
                )}
              </div>

              {/* Preview Results */}
              {previewData && (
                <div className="p-4 rounded border border-[var(--x-border)] bg-[var(--x-background)]">
                  <h4 className="font-bold mb-2">{previewData.feed.title}</h4>
                  <p className="text-sm text-[var(--x-text-secondary)] mb-3">
                    {previewData.feed.description}
                  </p>
                  <p className="text-sm text-[var(--x-text-secondary)]">
                    {previewData.feed.itemCount} items found
                  </p>

                  {/* Sample Posts */}
                  <div className="mt-4">
                    <h5 className="text-sm font-medium mb-2">Sample Posts:</h5>
                    <div className="space-y-2">
                      {previewData.samplePosts.slice(0, 2).map((post, i) => (
                        <div
                          key={i}
                          className="p-3 rounded bg-[var(--x-card-bg)] text-sm"
                        >
                          <p className="whitespace-pre-wrap">{post.content}</p>
                          {post.imageUrl && (
                            <p className="text-xs text-[var(--x-text-secondary)] mt-1">
                              Image: {post.imageUrl.substring(0, 50)}...
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Feed Name */}
              <div>
                <label className="block text-sm font-medium mb-2">Feed Name</label>
                <input
                  type="text"
                  placeholder="My Blog Feed"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="x-input"
                />
              </div>

              {/* Platforms */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Post to Platforms
                </label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORM_OPTIONS.map((platform) => (
                    <button
                      key={platform.value}
                      onClick={() => handlePlatformToggle(platform.value)}
                      className={`px-3 py-2 rounded text-sm transition-colors ${
                        formData.platforms.includes(platform.value)
                          ? "bg-[var(--x-blue)] text-white"
                          : "bg-[var(--x-background)] hover:bg-[var(--x-hover)]"
                      }`}
                    >
                      {platform.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Post Template */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Post Template
                </label>
                <textarea
                  value={formData.postTemplate}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, postTemplate: e.target.value }))
                  }
                  className="x-input font-mono text-sm"
                  rows={4}
                  placeholder="{title}\n\n{link}"
                />
                <div className="mt-2">
                  <p className="text-xs text-[var(--x-text-secondary)] mb-2">
                    Available variables:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {TEMPLATE_VARIABLES.map((v) => (
                      <button
                        key={v.variable}
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            postTemplate: prev.postTemplate + v.variable,
                          }))
                        }
                        className="px-2 py-1 text-xs rounded bg-[var(--x-background)] hover:bg-[var(--x-hover)]"
                        title={v.description}
                      >
                        {v.variable}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Settings Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Check Interval (minutes)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={1440}
                    value={formData.checkInterval}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        checkInterval: parseInt(e.target.value) || 60,
                      }))
                    }
                    className="x-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Max Posts Per Day
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={formData.maxPostsPerDay}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        maxPostsPerDay: parseInt(e.target.value) || 5,
                      }))
                    }
                    className="x-input"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.autoPost}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, autoPost: e.target.checked }))
                    }
                    className="w-5 h-5 rounded"
                  />
                  <div>
                    <span className="font-medium">Auto-Post</span>
                    <p className="text-sm text-[var(--x-text-secondary)]">
                      Automatically create posts from new feed items
                    </p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.includeImage}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        includeImage: e.target.checked,
                      }))
                    }
                    className="w-5 h-5 rounded"
                  />
                  <div>
                    <span className="font-medium">Include Images</span>
                    <p className="text-sm text-[var(--x-text-secondary)]">
                      Attach images from feed items when available
                    </p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, isActive: e.target.checked }))
                    }
                    className="w-5 h-5 rounded"
                  />
                  <div>
                    <span className="font-medium">Active</span>
                    <p className="text-sm text-[var(--x-text-secondary)]">
                      Enable or disable this feed
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-[var(--x-border)]">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  setSelectedFeed(null);
                  resetForm();
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={showEditModal ? updateFeed : addFeed}
                disabled={!formData.feedUrl || formData.platforms.length === 0}
                className="btn-primary"
              >
                {showEditModal ? "Save Changes" : "Add Feed"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
