"use client";

import { useState, useEffect } from "react";

interface ContentVersion {
  id: string;
  contentId: string;
  versionNumber: number;
  content: {
    text: string;
    media?: { type: string; url: string }[];
    hashtags?: string[];
  };
  metadata: {
    platforms: string[];
    status: string;
    characterCount: number;
  };
  changes: {
    type: "created" | "edited" | "media_added" | "media_removed" | "scheduled" | "restored";
    description: string;
    diff?: {
      added: string[];
      removed: string[];
      modified: string[];
    };
  };
  author: {
    name: string;
    email: string;
  };
  createdAt: string;
  restoredFrom?: string;
}

interface ContentItem {
  id: string;
  title?: string;
  currentVersion: number;
  type: "post" | "thread" | "story" | "reel";
  platforms: string[];
  status: "draft" | "scheduled" | "published" | "archived";
  versionCount: number;
  lastEditedAt: string;
  createdAt: string;
}

interface VersionStats {
  totalContent: number;
  totalVersions: number;
  avgVersionsPerContent: number;
  mostEditedContent: { id: string; title: string; versionCount: number }[];
  recentActivity: ContentVersion[];
  versionsByDay: { date: string; count: number }[];
}

interface VersionComparison {
  versionA: ContentVersion;
  versionB: ContentVersion;
  textDiff: { type: "added" | "removed" | "unchanged"; value: string }[];
  changes: { field: string; oldValue: string; newValue: string }[];
}

export default function VersionHistoryPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "content" | "activity">("overview");
  const [content, setContent] = useState<ContentItem[]>([]);
  const [stats, setStats] = useState<VersionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [versions, setVersions] = useState<ContentVersion[]>([]);
  const [showVersionsModal, setShowVersionsModal] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [comparison, setComparison] = useState<VersionComparison | null>(null);
  const [compareVersions, setCompareVersions] = useState<{ a: string; b: string }>({ a: "", b: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ContentVersion[]>([]);

  // Form states
  const [newContent, setNewContent] = useState({
    title: "",
    type: "post" as const,
    platforms: ["twitter"],
    text: "",
    hashtags: [] as string[],
  });
  const [hashtagInput, setHashtagInput] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [contentRes, statsRes] = await Promise.all([
        fetch("/api/version-history?action=content"),
        fetch("/api/version-history?action=stats"),
      ]);

      const [contentData, statsData] = await Promise.all([
        contentRes.json(),
        statsRes.json(),
      ]);

      setContent(contentData.content || []);
      setStats(statsData.stats || null);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadVersions = async (contentId: string) => {
    try {
      const res = await fetch(`/api/version-history?action=versions&contentId=${contentId}`);
      const data = await res.json();
      setVersions(data.versions || []);
    } catch (error) {
      console.error("Failed to load versions:", error);
    }
  };

  const createContent = async () => {
    if (!newContent.text.trim()) return;

    try {
      const res = await fetch("/api/version-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-content",
          ...newContent,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setContent([data.content, ...content]);
        setShowCreateModal(false);
        resetForm();
        loadData(); // Refresh stats
      }
    } catch (error) {
      console.error("Failed to create content:", error);
    }
  };

  const restoreVersion = async (versionId: string) => {
    try {
      const res = await fetch("/api/version-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore", versionId }),
      });

      if (res.ok) {
        if (selectedContent) {
          loadVersions(selectedContent.id);
        }
        loadData();
      }
    } catch (error) {
      console.error("Failed to restore version:", error);
    }
  };

  const compareVersionsHandler = async () => {
    if (!compareVersions.a || !compareVersions.b) return;

    try {
      const res = await fetch(
        `/api/version-history?action=compare&versionA=${compareVersions.a}&versionB=${compareVersions.b}`
      );
      const data = await res.json();
      setComparison(data.comparison || null);
      setShowCompareModal(true);
    } catch (error) {
      console.error("Failed to compare versions:", error);
    }
  };

  const searchContent = async () => {
    if (!searchQuery.trim()) return;

    try {
      const res = await fetch(`/api/version-history?action=search&q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error("Failed to search:", error);
    }
  };

  const deleteContent = async (contentId: string) => {
    try {
      const res = await fetch("/api/version-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete-content", contentId }),
      });

      if (res.ok) {
        setContent(content.filter((c) => c.id !== contentId));
        loadData();
      }
    } catch (error) {
      console.error("Failed to delete content:", error);
    }
  };

  const resetForm = () => {
    setNewContent({
      title: "",
      type: "post",
      platforms: ["twitter"],
      text: "",
      hashtags: [],
    });
    setHashtagInput("");
  };

  const addHashtag = () => {
    if (hashtagInput.trim() && !newContent.hashtags.includes(hashtagInput.trim())) {
      setNewContent({
        ...newContent,
        hashtags: [...newContent.hashtags, hashtagInput.trim().replace(/^#/, "")],
      });
      setHashtagInput("");
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "post": return "📝";
      case "thread": return "🧵";
      case "story": return "📖";
      case "reel": return "🎬";
      default: return "📄";
    }
  };

  const getChangeTypeColor = (type: string) => {
    switch (type) {
      case "created": return "bg-green-500/20 text-green-400";
      case "edited": return "bg-blue-500/20 text-blue-400";
      case "media_added": return "bg-purple-500/20 text-purple-400";
      case "media_removed": return "bg-orange-500/20 text-orange-400";
      case "scheduled": return "bg-cyan-500/20 text-cyan-400";
      case "restored": return "bg-yellow-500/20 text-yellow-400";
      default: return "bg-zinc-500/20 text-zinc-400";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft": return "bg-zinc-500/20 text-zinc-400";
      case "scheduled": return "bg-blue-500/20 text-blue-400";
      case "published": return "bg-green-500/20 text-green-400";
      case "archived": return "bg-orange-500/20 text-orange-400";
      default: return "bg-zinc-500/20 text-zinc-400";
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
          <h1 className="text-2xl font-bold">Version History</h1>
          <p className="text-zinc-400 mt-1">Track changes and restore previous versions of your content</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Content
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <div className="text-sm text-zinc-400">Total Content</div>
            <div className="text-2xl font-bold mt-1">{stats.totalContent}</div>
          </div>
          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <div className="text-sm text-zinc-400">Total Versions</div>
            <div className="text-2xl font-bold mt-1">{stats.totalVersions}</div>
          </div>
          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <div className="text-sm text-zinc-400">Avg Versions/Content</div>
            <div className="text-2xl font-bold mt-1">{stats.avgVersionsPerContent.toFixed(1)}</div>
          </div>
          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <div className="text-sm text-zinc-400">Edits Today</div>
            <div className="text-2xl font-bold mt-1">
              {stats.versionsByDay[stats.versionsByDay.length - 1]?.count || 0}
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchContent()}
            placeholder="Search content and versions..."
            className="w-full px-4 py-2 pl-10 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:border-indigo-500"
          />
          <svg
            className="w-5 h-5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <button
          onClick={searchContent}
          className="px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition"
        >
          Search
        </button>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">Search Results ({searchResults.length})</h3>
            <button
              onClick={() => setSearchResults([])}
              className="text-sm text-zinc-400 hover:text-white"
            >
              Clear
            </button>
          </div>
          <div className="space-y-2">
            {searchResults.slice(0, 5).map((version) => (
              <div key={version.id} className="p-3 rounded-lg bg-zinc-800/50">
                <p className="text-sm text-white truncate">{version.content.text}</p>
                <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
                  <span>v{version.versionNumber}</span>
                  <span>-</span>
                  <span>{version.author.name}</span>
                  <span>-</span>
                  <span>{new Date(version.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-zinc-800 pb-2">
        {(["overview", "content", "activity"] as const).map((tab) => (
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

      {/* Overview Tab */}
      {activeTab === "overview" && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Most Edited */}
          <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <h2 className="text-lg font-semibold mb-4">Most Edited Content</h2>
            <div className="space-y-3">
              {stats.mostEditedContent.map((item, idx) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center text-sm">
                      {idx + 1}
                    </span>
                    <span className="truncate">{item.title}</span>
                  </div>
                  <span className="text-sm text-indigo-400">{item.versionCount} versions</span>
                </div>
              ))}
              {stats.mostEditedContent.length === 0 && (
                <p className="text-zinc-500 text-center py-4">No content yet</p>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
            <div className="space-y-3">
              {stats.recentActivity.slice(0, 5).map((version) => (
                <div key={version.id} className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 text-xs rounded ${getChangeTypeColor(version.changes.type)}`}>
                    {version.changes.type}
                  </span>
                  <span className="text-sm truncate flex-1">{version.changes.description}</span>
                  <span className="text-xs text-zinc-500">
                    {new Date(version.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
              {stats.recentActivity.length === 0 && (
                <p className="text-zinc-500 text-center py-4">No activity yet</p>
              )}
            </div>
          </div>

          {/* Activity Chart */}
          <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800 md:col-span-2">
            <h2 className="text-lg font-semibold mb-4">Edits Over Time</h2>
            <div className="flex items-end gap-2 h-32">
              {stats.versionsByDay.map((day, idx) => {
                const maxCount = Math.max(...stats.versionsByDay.map((d) => d.count), 1);
                const height = (day.count / maxCount) * 100;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-indigo-500/50 rounded-t transition-all"
                      style={{ height: `${Math.max(height, 4)}%` }}
                    />
                    <span className="text-xs text-zinc-500">
                      {day.date.split("/")[0]}/{day.date.split("/")[1]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Content Tab */}
      {activeTab === "content" && (
        <div className="space-y-4">
          {content.length === 0 ? (
            <div className="p-12 rounded-xl bg-zinc-900/50 border border-zinc-800 text-center">
              <svg className="w-16 h-16 text-zinc-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-zinc-400">No content with version history</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                Create Content
              </button>
            </div>
          ) : (
            content.map((item) => (
              <div key={item.id} className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-xl">
                      {getTypeIcon(item.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{item.title || `Untitled ${item.type}`}</h3>
                        <span className={`px-2 py-0.5 text-xs rounded ${getStatusColor(item.status)}`}>
                          {item.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-zinc-400">
                        <span>{item.versionCount} version(s)</span>
                        <span>Last edited: {new Date(item.lastEditedAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex gap-1 mt-2">
                        {item.platforms.map((platform) => (
                          <span key={platform} className="px-2 py-0.5 text-xs rounded bg-zinc-800 text-zinc-300 capitalize">
                            {platform}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedContent(item);
                        loadVersions(item.id);
                        setShowVersionsModal(true);
                      }}
                      className="px-3 py-1.5 bg-zinc-800 text-white text-sm rounded-lg hover:bg-zinc-700 transition"
                    >
                      View History
                    </button>
                    <button
                      onClick={() => deleteContent(item.id)}
                      className="p-2 text-zinc-400 hover:text-red-400 transition"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Activity Tab */}
      {activeTab === "activity" && stats && (
        <div className="space-y-3">
          {stats.recentActivity.length === 0 ? (
            <div className="p-12 rounded-xl bg-zinc-900/50 border border-zinc-800 text-center">
              <p className="text-zinc-400">No activity yet</p>
            </div>
          ) : (
            stats.recentActivity.map((version) => (
              <div key={version.id} className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center font-medium">
                    {version.author.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{version.author.name}</span>
                      <span className={`px-2 py-0.5 text-xs rounded ${getChangeTypeColor(version.changes.type)}`}>
                        {version.changes.type}
                      </span>
                      <span className="text-sm text-zinc-500">
                        {new Date(version.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-zinc-400 mt-1">{version.changes.description}</p>
                    {version.changes.diff && (
                      <div className="mt-2 flex gap-2 text-xs">
                        {version.changes.diff.added.length > 0 && (
                          <span className="text-green-400">+{version.changes.diff.added.length} added</span>
                        )}
                        {version.changes.diff.removed.length > 0 && (
                          <span className="text-red-400">-{version.changes.diff.removed.length} removed</span>
                        )}
                        {version.changes.diff.modified.length > 0 && (
                          <span className="text-blue-400">~{version.changes.diff.modified.length} modified</span>
                        )}
                      </div>
                    )}
                    <p className="text-sm text-zinc-500 mt-2 bg-zinc-800/50 p-2 rounded truncate">
                      {version.content.text}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Versions Modal */}
      {showVersionsModal && selectedContent && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-zinc-800">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Version History</h2>
                  <p className="text-sm text-zinc-400 mt-1">
                    {selectedContent.title || `Untitled ${selectedContent.type}`}
                  </p>
                </div>
                <button
                  onClick={() => { setShowVersionsModal(false); setVersions([]); }}
                  className="p-2 text-zinc-400 hover:text-white transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Compare Selection */}
            <div className="p-4 border-b border-zinc-800 bg-zinc-800/30">
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-400">Compare:</span>
                <select
                  value={compareVersions.a}
                  onChange={(e) => setCompareVersions({ ...compareVersions, a: e.target.value })}
                  className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm"
                >
                  <option value="">Select version</option>
                  {versions.map((v) => (
                    <option key={v.id} value={v.id}>v{v.versionNumber}</option>
                  ))}
                </select>
                <span className="text-zinc-500">vs</span>
                <select
                  value={compareVersions.b}
                  onChange={(e) => setCompareVersions({ ...compareVersions, b: e.target.value })}
                  className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm"
                >
                  <option value="">Select version</option>
                  {versions.map((v) => (
                    <option key={v.id} value={v.id}>v{v.versionNumber}</option>
                  ))}
                </select>
                <button
                  onClick={compareVersionsHandler}
                  disabled={!compareVersions.a || !compareVersions.b}
                  className="px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  Compare
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {versions.map((version) => (
                <div key={version.id} className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">v{version.versionNumber}</span>
                      <span className={`px-2 py-0.5 text-xs rounded ${getChangeTypeColor(version.changes.type)}`}>
                        {version.changes.type}
                      </span>
                      {version.restoredFrom && (
                        <span className="text-xs text-yellow-400">Restored</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-zinc-500">
                        {new Date(version.createdAt).toLocaleString()}
                      </span>
                      {version.versionNumber > 1 && (
                        <button
                          onClick={() => restoreVersion(version.id)}
                          className="px-2 py-1 text-xs bg-yellow-500/20 text-yellow-400 rounded hover:bg-yellow-500/30 transition"
                        >
                          Restore
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-zinc-400 mb-2">{version.changes.description}</p>
                  <p className="text-white bg-zinc-900/50 p-3 rounded">{version.content.text}</p>

                  {version.content.hashtags && version.content.hashtags.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {version.content.hashtags.map((tag) => (
                        <span key={tag} className="text-xs text-indigo-400">#{tag}</span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-3 text-xs text-zinc-500">
                    <span>by {version.author.name}</span>
                    <span>-</span>
                    <span>{version.metadata.characterCount} chars</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Compare Modal */}
      {showCompareModal && comparison && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-zinc-800">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  Compare v{comparison.versionA.versionNumber} vs v{comparison.versionB.versionNumber}
                </h2>
                <button
                  onClick={() => { setShowCompareModal(false); setComparison(null); }}
                  className="p-2 text-zinc-400 hover:text-white transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Text Diff */}
              <div>
                <h3 className="font-medium mb-3">Text Changes</h3>
                <div className="p-4 rounded-lg bg-zinc-800/50 font-mono text-sm">
                  {comparison.textDiff.map((part, idx) => (
                    <span
                      key={idx}
                      className={
                        part.type === "added"
                          ? "bg-green-500/20 text-green-400"
                          : part.type === "removed"
                          ? "bg-red-500/20 text-red-400 line-through"
                          : "text-zinc-300"
                      }
                    >
                      {part.value}{" "}
                    </span>
                  ))}
                </div>
              </div>

              {/* Field Changes */}
              {comparison.changes.length > 0 && (
                <div>
                  <h3 className="font-medium mb-3">Other Changes</h3>
                  <div className="space-y-2">
                    {comparison.changes.map((change, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-zinc-800/50 flex items-center gap-4">
                        <span className="font-medium capitalize">{change.field}:</span>
                        <span className="text-red-400 line-through">{change.oldValue || "(empty)"}</span>
                        <span className="text-zinc-500">→</span>
                        <span className="text-green-400">{change.newValue || "(empty)"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 w-full max-w-lg">
            <div className="p-6 border-b border-zinc-800">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Create Content</h2>
                <button
                  onClick={() => { setShowCreateModal(false); resetForm(); }}
                  className="p-2 text-zinc-400 hover:text-white transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Title (Optional)</label>
                <input
                  type="text"
                  value={newContent.title}
                  onChange={(e) => setNewContent({ ...newContent, title: e.target.value })}
                  placeholder="e.g., Product Launch Announcement"
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Content Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { value: "post", label: "Post", icon: "📝" },
                    { value: "thread", label: "Thread", icon: "🧵" },
                    { value: "story", label: "Story", icon: "📖" },
                    { value: "reel", label: "Reel", icon: "🎬" },
                  ].map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setNewContent({ ...newContent, type: type.value as any })}
                      className={`p-2 rounded-lg border transition text-center ${
                        newContent.type === type.value
                          ? "bg-indigo-600 border-indigo-600 text-white"
                          : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-indigo-500"
                      }`}
                    >
                      <span className="text-xl block">{type.icon}</span>
                      <span className="text-xs">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Platforms</label>
                <div className="flex gap-2 flex-wrap">
                  {["twitter", "instagram", "facebook", "linkedin", "tiktok"].map((platform) => (
                    <button
                      key={platform}
                      onClick={() => {
                        const platforms = newContent.platforms.includes(platform)
                          ? newContent.platforms.filter((p) => p !== platform)
                          : [...newContent.platforms, platform];
                        setNewContent({ ...newContent, platforms });
                      }}
                      className={`px-3 py-1.5 rounded-lg border capitalize transition ${
                        newContent.platforms.includes(platform)
                          ? "bg-indigo-600 border-indigo-600 text-white"
                          : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-indigo-500"
                      }`}
                    >
                      {platform}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Content</label>
                <textarea
                  value={newContent.text}
                  onChange={(e) => setNewContent({ ...newContent, text: e.target.value })}
                  placeholder="Write your content..."
                  rows={4}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:border-indigo-500"
                />
                <p className="text-xs text-zinc-500 mt-1">{newContent.text.length} characters</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Hashtags</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={hashtagInput}
                    onChange={(e) => setHashtagInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addHashtag())}
                    placeholder="Add hashtag"
                    className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={addHashtag}
                    className="px-4 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 transition"
                  >
                    Add
                  </button>
                </div>
                {newContent.hashtags.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {newContent.hashtags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded flex items-center gap-1"
                      >
                        #{tag}
                        <button
                          onClick={() => setNewContent({
                            ...newContent,
                            hashtags: newContent.hashtags.filter((t) => t !== tag),
                          })}
                          className="hover:text-red-400"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-zinc-800 flex justify-end gap-3">
              <button
                onClick={() => { setShowCreateModal(false); resetForm(); }}
                className="px-4 py-2 text-zinc-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={createContent}
                disabled={!newContent.text.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Content
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
