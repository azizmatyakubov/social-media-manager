"use client";

import { useState, useEffect } from "react";

interface GeoRegion {
  id: string;
  name: string;
  code: string;
  type: "country" | "state" | "city" | "region";
  parentId?: string;
  population?: number;
  timezone: string;
  languages: string[];
}

interface GeoTarget {
  id: string;
  name: string;
  description?: string;
  regions: string[];
  excludedRegions: string[];
  languages: string[];
  audienceSize?: number;
  demographics?: {
    ageRange?: { min: number; max: number };
    gender?: "all" | "male" | "female";
    interests?: string[];
  };
  createdAt: string;
}

interface GeoPost {
  id: string;
  content: string;
  platforms: string[];
  geoTargetId: string;
  localizedVersions: {
    regionId: string;
    language: string;
    content: string;
    hashtags: string[];
  }[];
  scheduledAt?: string;
  status: "draft" | "scheduled" | "published" | "failed";
  createdAt: string;
}

interface AudienceTemplate {
  id: string;
  name: string;
  description: string;
  regions: string[];
  languages: string[];
}

interface GeoAnalytics {
  topRegions: { regionId: string; name: string; impressions: number; engagement: number }[];
  reachByContinent: Record<string, number>;
  languagePerformance: { language: string; posts: number; avgEngagement: number }[];
}

export default function GeoTargetingPage() {
  const [activeTab, setActiveTab] = useState<"audiences" | "posts" | "analytics">("audiences");
  const [targets, setTargets] = useState<GeoTarget[]>([]);
  const [posts, setPosts] = useState<GeoPost[]>([]);
  const [regions, setRegions] = useState<GeoRegion[]>([]);
  const [templates, setTemplates] = useState<AudienceTemplate[]>([]);
  const [analytics, setAnalytics] = useState<GeoAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [regionSearch, setRegionSearch] = useState("");
  const [searchResults, setSearchResults] = useState<GeoRegion[]>([]);

  // Form states
  const [newTarget, setNewTarget] = useState({
    name: "",
    description: "",
    regions: [] as string[],
    excludedRegions: [] as string[],
    languages: [] as string[],
  });

  const [newPost, setNewPost] = useState({
    content: "",
    platforms: ["twitter"] as string[],
    geoTargetId: "",
    scheduledAt: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (regionSearch.length >= 2) {
      searchRegions(regionSearch);
    } else {
      setSearchResults([]);
    }
  }, [regionSearch]);

  const loadData = async () => {
    try {
      const [targetsRes, postsRes, regionsRes, templatesRes, analyticsRes] = await Promise.all([
        fetch("/api/geo-targeting?action=targets"),
        fetch("/api/geo-targeting?action=posts"),
        fetch("/api/geo-targeting?action=regions&type=country"),
        fetch("/api/geo-targeting?action=templates"),
        fetch("/api/geo-targeting?action=analytics"),
      ]);

      const [targetsData, postsData, regionsData, templatesData, analyticsData] = await Promise.all([
        targetsRes.json(),
        postsRes.json(),
        regionsRes.json(),
        templatesRes.json(),
        analyticsRes.json(),
      ]);

      setTargets(targetsData.targets || []);
      setPosts(postsData.posts || []);
      setRegions(regionsData.regions || []);
      setTemplates(templatesData.templates || []);
      setAnalytics(analyticsData.analytics || null);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  const searchRegions = async (query: string) => {
    try {
      const res = await fetch(`/api/geo-targeting?action=regions&q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setSearchResults(data.regions || []);
    } catch (error) {
      console.error("Failed to search regions:", error);
    }
  };

  const createTarget = async () => {
    if (!newTarget.name || newTarget.regions.length === 0) return;

    try {
      const res = await fetch("/api/geo-targeting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-target",
          ...newTarget,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setTargets([data.target, ...targets]);
        setShowCreateModal(false);
        setNewTarget({ name: "", description: "", regions: [], excludedRegions: [], languages: [] });
      }
    } catch (error) {
      console.error("Failed to create target:", error);
    }
  };

  const createFromTemplate = async (templateId: string) => {
    try {
      const res = await fetch("/api/geo-targeting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-from-template",
          templateId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setTargets([data.target, ...targets]);
      }
    } catch (error) {
      console.error("Failed to create from template:", error);
    }
  };

  const deleteTarget = async (id: string) => {
    try {
      const res = await fetch("/api/geo-targeting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete-target", targetId: id }),
      });

      if (res.ok) {
        setTargets(targets.filter((t) => t.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete target:", error);
    }
  };

  const createPost = async () => {
    if (!newPost.content || !newPost.geoTargetId) return;

    try {
      const res = await fetch("/api/geo-targeting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-post",
          ...newPost,
          status: newPost.scheduledAt ? "scheduled" : "draft",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setPosts([data.post, ...posts]);
        setShowPostModal(false);
        setNewPost({ content: "", platforms: ["twitter"], geoTargetId: "", scheduledAt: "" });
      }
    } catch (error) {
      console.error("Failed to create post:", error);
    }
  };

  const publishPost = async (postId: string) => {
    try {
      const res = await fetch("/api/geo-targeting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish-geo-post", postId }),
      });

      if (res.ok) {
        const data = await res.json();
        setPosts(posts.map((p) => (p.id === postId ? data.post : p)));
      }
    } catch (error) {
      console.error("Failed to publish post:", error);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  const getRegionName = (id: string): string => {
    const region = regions.find((r) => r.id === id);
    return region?.name || id;
  };

  const getTargetName = (id: string): string => {
    const target = targets.find((t) => t.id === id);
    return target?.name || "Unknown";
  };

  const toggleRegion = (regionId: string) => {
    if (newTarget.regions.includes(regionId)) {
      setNewTarget({ ...newTarget, regions: newTarget.regions.filter((r) => r !== regionId) });
    } else {
      setNewTarget({ ...newTarget, regions: [...newTarget.regions, regionId] });
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
          <h1 className="text-2xl font-bold">Geo-Targeting</h1>
          <p className="text-zinc-400 mt-1">Target your content to specific regions and audiences</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowPostModal(true)}
            className="px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            New Geo Post
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Audience
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-zinc-800 pb-2">
        {(["audiences", "posts", "analytics"] as const).map((tab) => (
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

      {/* Audiences Tab */}
      {activeTab === "audiences" && (
        <div className="space-y-6">
          {/* Quick Templates */}
          <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <h2 className="text-lg font-semibold mb-4">Quick Start Templates</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => createFromTemplate(template.id)}
                  className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700 hover:border-indigo-500 transition text-left group"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">{template.name}</span>
                  </div>
                  <p className="text-sm text-zinc-400">{template.description}</p>
                  <div className="mt-2 flex gap-1 flex-wrap">
                    {template.languages.slice(0, 3).map((lang) => (
                      <span key={lang} className="px-2 py-0.5 text-xs rounded bg-zinc-700 text-zinc-300 uppercase">
                        {lang}
                      </span>
                    ))}
                  </div>
                  <span className="mt-3 text-xs text-indigo-400 group-hover:text-indigo-300 flex items-center gap-1">
                    Use template
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Saved Audiences */}
          <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <h2 className="text-lg font-semibold mb-4">Your Audiences</h2>
            {targets.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-zinc-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="text-zinc-400">No custom audiences yet</p>
                <p className="text-sm text-zinc-500 mt-1">Create one or use a template above</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {targets.map((target) => (
                  <div key={target.id} className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-medium">{target.name}</h3>
                        {target.description && (
                          <p className="text-sm text-zinc-400 mt-1">{target.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => deleteTarget(target.id)}
                        className="p-1 text-zinc-500 hover:text-red-400 transition"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-zinc-300">
                          Est. audience: {formatNumber(target.audienceSize || 0)}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {target.regions.slice(0, 4).map((regionId) => (
                          <span key={regionId} className="px-2 py-0.5 text-xs rounded bg-indigo-500/20 text-indigo-300">
                            {getRegionName(regionId)}
                          </span>
                        ))}
                        {target.regions.length > 4 && (
                          <span className="px-2 py-0.5 text-xs rounded bg-zinc-700 text-zinc-400">
                            +{target.regions.length - 4} more
                          </span>
                        )}
                      </div>

                      {target.languages.length > 0 && (
                        <div className="flex gap-1">
                          {target.languages.map((lang) => (
                            <span key={lang} className="px-2 py-0.5 text-xs rounded bg-zinc-700 text-zinc-300 uppercase">
                              {lang}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Posts Tab */}
      {activeTab === "posts" && (
        <div className="space-y-4">
          {posts.length === 0 ? (
            <div className="p-12 rounded-xl bg-zinc-900/50 border border-zinc-800 text-center">
              <svg className="w-16 h-16 text-zinc-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-zinc-400">No geo-targeted posts yet</p>
              <button
                onClick={() => setShowPostModal(true)}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                Create Your First Post
              </button>
            </div>
          ) : (
            posts.map((post) => (
              <div key={post.id} className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-white mb-2">{post.content}</p>
                    <div className="flex items-center gap-4 text-sm text-zinc-400">
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        {getTargetName(post.geoTargetId)}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {post.scheduledAt
                          ? new Date(post.scheduledAt).toLocaleDateString()
                          : "Not scheduled"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        post.status === "published"
                          ? "bg-green-500/20 text-green-400"
                          : post.status === "scheduled"
                          ? "bg-blue-500/20 text-blue-400"
                          : post.status === "failed"
                          ? "bg-red-500/20 text-red-400"
                          : "bg-zinc-700 text-zinc-300"
                      }`}
                    >
                      {post.status}
                    </span>
                    {post.status === "draft" && (
                      <button
                        onClick={() => publishPost(post.id)}
                        className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
                      >
                        Publish
                      </button>
                    )}
                  </div>
                </div>

                {post.localizedVersions.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-zinc-700">
                    <p className="text-sm text-zinc-400 mb-2">Localized versions:</p>
                    <div className="flex gap-2">
                      {post.localizedVersions.map((v, idx) => (
                        <span key={idx} className="px-2 py-1 text-xs rounded bg-zinc-800 text-zinc-300">
                          {v.language.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === "analytics" && analytics && (
        <div className="space-y-6">
          {/* Top Regions */}
          <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <h2 className="text-lg font-semibold mb-4">Top Performing Regions</h2>
            <div className="space-y-3">
              {analytics.topRegions.map((region, idx) => (
                <div key={region.regionId} className="flex items-center gap-4">
                  <span className="w-6 h-6 flex items-center justify-center rounded bg-zinc-800 text-sm font-medium">
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{region.name}</span>
                      <span className="text-sm text-zinc-400">
                        {formatNumber(region.impressions)} impressions
                      </span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{
                          width: `${(region.impressions / (analytics.topRegions[0]?.impressions || 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Reach by Continent */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800">
              <h2 className="text-lg font-semibold mb-4">Reach by Continent</h2>
              <div className="space-y-3">
                {Object.entries(analytics.reachByContinent).map(([continent, reach]) => (
                  <div key={continent} className="flex items-center justify-between">
                    <span className="text-zinc-300">{continent}</span>
                    <span className="font-medium">{formatNumber(reach)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800">
              <h2 className="text-lg font-semibold mb-4">Language Performance</h2>
              <div className="space-y-3">
                {analytics.languagePerformance.map((lang) => (
                  <div key={lang.language} className="flex items-center justify-between">
                    <div>
                      <span className="text-zinc-300">{lang.language}</span>
                      <span className="text-sm text-zinc-500 ml-2">{lang.posts} posts</span>
                    </div>
                    <span className="font-medium text-indigo-400">{lang.avgEngagement.toFixed(1)}% eng.</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Audience Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-zinc-800">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Create Audience</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 text-zinc-400 hover:text-white transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Audience Name</label>
                <input
                  type="text"
                  value={newTarget.name}
                  onChange={(e) => setNewTarget({ ...newTarget, name: e.target.value })}
                  placeholder="e.g., US Tech Professionals"
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Description</label>
                <textarea
                  value={newTarget.description}
                  onChange={(e) => setNewTarget({ ...newTarget, description: e.target.value })}
                  placeholder="Describe this audience..."
                  rows={2}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Search Regions</label>
                <input
                  type="text"
                  value={regionSearch}
                  onChange={(e) => setRegionSearch(e.target.value)}
                  placeholder="Search for countries, states, or cities..."
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:border-indigo-500"
                />
                {searchResults.length > 0 && (
                  <div className="mt-2 p-2 bg-zinc-800 rounded-lg border border-zinc-700 max-h-40 overflow-y-auto">
                    {searchResults.map((region) => (
                      <button
                        key={region.id}
                        onClick={() => toggleRegion(region.id)}
                        className={`w-full text-left px-3 py-2 rounded hover:bg-zinc-700 transition flex items-center justify-between ${
                          newTarget.regions.includes(region.id) ? "bg-indigo-600/20" : ""
                        }`}
                      >
                        <span>
                          {region.name}
                          <span className="text-xs text-zinc-500 ml-2">({region.type})</span>
                        </span>
                        {newTarget.regions.includes(region.id) && (
                          <svg className="w-4 h-4 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Popular Countries */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Popular Countries</label>
                <div className="flex flex-wrap gap-2">
                  {regions.slice(0, 12).map((region) => (
                    <button
                      key={region.id}
                      onClick={() => toggleRegion(region.id)}
                      className={`px-3 py-1.5 rounded-lg border transition ${
                        newTarget.regions.includes(region.id)
                          ? "bg-indigo-600 border-indigo-600 text-white"
                          : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-indigo-500"
                      }`}
                    >
                      {region.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selected Regions */}
              {newTarget.regions.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Selected Regions ({newTarget.regions.length})
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {newTarget.regions.map((regionId) => (
                      <span
                        key={regionId}
                        className="px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded flex items-center gap-1"
                      >
                        {getRegionName(regionId)}
                        <button
                          onClick={() => toggleRegion(regionId)}
                          className="hover:text-indigo-100"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-zinc-800 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-zinc-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={createTarget}
                disabled={!newTarget.name || newTarget.regions.length === 0}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Audience
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Post Modal */}
      {showPostModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 w-full max-w-lg">
            <div className="p-6 border-b border-zinc-800">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Create Geo-Targeted Post</h2>
                <button
                  onClick={() => setShowPostModal(false)}
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
                <label className="block text-sm font-medium text-zinc-300 mb-2">Content</label>
                <textarea
                  value={newPost.content}
                  onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                  placeholder="Write your post content..."
                  rows={4}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Target Audience</label>
                <select
                  value={newPost.geoTargetId}
                  onChange={(e) => setNewPost({ ...newPost, geoTargetId: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Select an audience</option>
                  {targets.map((target) => (
                    <option key={target.id} value={target.id}>
                      {target.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Platforms</label>
                <div className="flex gap-2">
                  {["twitter", "instagram", "facebook", "linkedin"].map((platform) => (
                    <button
                      key={platform}
                      onClick={() => {
                        const platforms = newPost.platforms.includes(platform)
                          ? newPost.platforms.filter((p) => p !== platform)
                          : [...newPost.platforms, platform];
                        setNewPost({ ...newPost, platforms });
                      }}
                      className={`px-3 py-1.5 rounded-lg border capitalize transition ${
                        newPost.platforms.includes(platform)
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
                <label className="block text-sm font-medium text-zinc-300 mb-2">Schedule (Optional)</label>
                <input
                  type="datetime-local"
                  value={newPost.scheduledAt}
                  onChange={(e) => setNewPost({ ...newPost, scheduledAt: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="p-6 border-t border-zinc-800 flex justify-end gap-3">
              <button
                onClick={() => setShowPostModal(false)}
                className="px-4 py-2 text-zinc-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={createPost}
                disabled={!newPost.content || !newPost.geoTargetId}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Post
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
