"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

type CampaignStatus = "DRAFT" | "SCHEDULED" | "ACTIVE" | "PAUSED" | "COMPLETED" | "ARCHIVED";

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  status: CampaignStatus;
  objective: string | null;
  platforms: string[];
  budget: number | null;
  budgetSpent: number;
  startDate: string | null;
  endDate: string | null;
  totalPosts: number;
  postsPublished: number;
  totalReach: number;
  totalEngagement: number;
  totalClicks: number;
  color: string;
  hashtags: string[];
  tags: string[];
  createdAt: string;
  postCount: number;
}

interface CampaignPost {
  id: string;
  platform: string;
  content: string;
  mediaUrls: string[];
  scheduledFor: string | null;
  publishedAt: string | null;
  status: string;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
}

interface CampaignStats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalPosts: number;
  publishedPosts: number;
  totalReach: number;
  totalEngagement: number;
  totalClicks: number;
  totalSpent: number;
}

type TabType = "overview" | "campaigns" | "create" | "detail";

const PLATFORMS = ["X", "LINKEDIN", "INSTAGRAM", "TIKTOK", "YOUTUBE", "PINTEREST", "BLUESKY"];
const OBJECTIVES = [
  { value: "awareness", label: "Brand Awareness", description: "Increase brand visibility" },
  { value: "engagement", label: "Engagement", description: "Drive likes, comments, shares" },
  { value: "traffic", label: "Website Traffic", description: "Drive visitors to your site" },
  { value: "conversions", label: "Conversions", description: "Generate leads or sales" },
];

const STATUS_COLORS: Record<CampaignStatus, string> = {
  DRAFT: "bg-zinc-500/10 text-zinc-400",
  SCHEDULED: "bg-blue-500/10 text-blue-400",
  ACTIVE: "bg-green-500/10 text-green-400",
  PAUSED: "bg-yellow-500/10 text-yellow-400",
  COMPLETED: "bg-purple-500/10 text-purple-400",
  ARCHIVED: "bg-zinc-700/10 text-zinc-500",
};

const CAMPAIGN_COLORS = [
  "#6366F1", "#8B5CF6", "#EC4899", "#F43F5E", "#F97316",
  "#EAB308", "#22C55E", "#14B8A6", "#06B6D4", "#3B82F6",
];

export default function CampaignsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [campaignPosts, setCampaignPosts] = useState<CampaignPost[]>([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Create form
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    objective: "",
    platforms: [] as string[],
    budget: "",
    startDate: "",
    endDate: "",
    hashtags: "",
    color: "#6366F1",
  });

  // Add post modal
  const [showAddPost, setShowAddPost] = useState(false);
  const [postForm, setPostForm] = useState({
    platform: "X",
    content: "",
    scheduledFor: "",
  });

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/campaigns?action=stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }, []);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ action: "list" });
      if (statusFilter) params.set("status", statusFilter);
      if (searchQuery) params.set("search", searchQuery);

      const res = await fetch(`/api/campaigns?${params}`);
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data.campaigns);
      }
    } catch (error) {
      console.error("Error fetching campaigns:", error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  const fetchCampaignPosts = useCallback(async (campaignId: string) => {
    try {
      const res = await fetch(`/api/campaigns?action=posts&campaignId=${campaignId}`);
      if (res.ok) {
        const data = await res.json();
        setCampaignPosts(data.posts);
      }
    } catch (error) {
      console.error("Error fetching posts:", error);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "overview") {
      fetchStats();
      fetchCampaigns();
    } else if (activeTab === "campaigns") {
      fetchCampaigns();
    }
  }, [activeTab, fetchStats, fetchCampaigns]);

  useEffect(() => {
    if (activeTab === "campaigns") {
      fetchCampaigns();
    }
  }, [statusFilter, searchQuery, activeTab, fetchCampaigns]);

  const createCampaign = async () => {
    if (!formData.name.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          name: formData.name,
          description: formData.description || undefined,
          objective: formData.objective || undefined,
          platforms: formData.platforms,
          budget: formData.budget ? parseFloat(formData.budget) : undefined,
          startDate: formData.startDate || undefined,
          endDate: formData.endDate || undefined,
          hashtags: formData.hashtags
            ? formData.hashtags.split(",").map((h) => h.trim())
            : [],
          color: formData.color,
        }),
      });

      if (res.ok) {
        setFormData({
          name: "",
          description: "",
          objective: "",
          platforms: [],
          budget: "",
          startDate: "",
          endDate: "",
          hashtags: "",
          color: "#6366F1",
        });
        setActiveTab("campaigns");
        fetchCampaigns();
      }
    } catch (error) {
      console.error("Error creating campaign:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateCampaignStatus = async (campaignId: string, newStatus: CampaignStatus) => {
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          campaignId,
          status: newStatus,
        }),
      });

      if (res.ok) {
        fetchCampaigns();
        if (selectedCampaign?.id === campaignId) {
          setSelectedCampaign({ ...selectedCampaign, status: newStatus });
        }
      }
    } catch (error) {
      console.error("Error updating campaign:", error);
    }
  };

  const deleteCampaign = async (campaignId: string) => {
    if (!confirm("Are you sure you want to delete this campaign?")) return;

    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", campaignId }),
      });

      if (res.ok) {
        fetchCampaigns();
        if (selectedCampaign?.id === campaignId) {
          setSelectedCampaign(null);
          setActiveTab("campaigns");
        }
      }
    } catch (error) {
      console.error("Error deleting campaign:", error);
    }
  };

  const duplicateCampaign = async (campaignId: string) => {
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "duplicate", campaignId }),
      });

      if (res.ok) {
        fetchCampaigns();
      }
    } catch (error) {
      console.error("Error duplicating campaign:", error);
    }
  };

  const addCampaignPost = async () => {
    if (!selectedCampaign || !postForm.content.trim()) return;

    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-post",
          campaignId: selectedCampaign.id,
          platform: postForm.platform,
          content: postForm.content,
          scheduledFor: postForm.scheduledFor || undefined,
        }),
      });

      if (res.ok) {
        setShowAddPost(false);
        setPostForm({ platform: "X", content: "", scheduledFor: "" });
        fetchCampaignPosts(selectedCampaign.id);
      }
    } catch (error) {
      console.error("Error adding post:", error);
    }
  };

  const deletePost = async (postId: string) => {
    if (!confirm("Delete this post?")) return;

    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete-post", postId }),
      });

      if (res.ok && selectedCampaign) {
        fetchCampaignPosts(selectedCampaign.id);
      }
    } catch (error) {
      console.error("Error deleting post:", error);
    }
  };

  const openCampaignDetail = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    fetchCampaignPosts(campaign.id);
    setActiveTab("detail");
  };

  const getPlatformIcon = (platform: string) => {
    const icons: Record<string, string> = {
      X: "X",
      LINKEDIN: "in",
      INSTAGRAM: "IG",
      TIKTOK: "TT",
      YOUTUBE: "YT",
      PINTEREST: "P",
      BLUESKY: "BS",
    };
    return icons[platform] || platform.charAt(0);
  };

  const tabs: { id: TabType; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "campaigns", label: "Campaigns" },
    { id: "create", label: "Create" },
  ];

  if (activeTab === "detail" && selectedCampaign) {
    tabs.push({ id: "detail", label: selectedCampaign.name });
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Campaign Manager</h1>
            <p className="text-zinc-400 mt-1">
              Plan, execute, and track your marketing campaigns
            </p>
          </div>
          <button
            onClick={() => setActiveTab("create")}
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Campaign
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-zinc-800 pb-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-indigo-500 text-white"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-zinc-400 text-sm">Total Campaigns</span>
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                </div>
                <div className="text-3xl font-bold">{stats?.totalCampaigns || 0}</div>
                <div className="text-xs text-zinc-500 mt-1">
                  {stats?.activeCampaigns || 0} active
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-zinc-400 text-sm">Total Posts</span>
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                </div>
                <div className="text-3xl font-bold">{stats?.totalPosts || 0}</div>
                <div className="text-xs text-zinc-500 mt-1">
                  {stats?.publishedPosts || 0} published
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-zinc-400 text-sm">Total Reach</span>
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                </div>
                <div className="text-3xl font-bold">
                  {(stats?.totalReach || 0).toLocaleString()}
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-zinc-400 text-sm">Total Engagement</span>
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>
                </div>
                <div className="text-3xl font-bold">
                  {(stats?.totalEngagement || 0).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Recent Campaigns */}
            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Recent Campaigns</h3>
                <button
                  onClick={() => setActiveTab("campaigns")}
                  className="text-sm text-indigo-400 hover:text-indigo-300"
                >
                  View all
                </button>
              </div>
              {campaigns.length === 0 ? (
                <p className="text-zinc-500 text-sm">No campaigns yet</p>
              ) : (
                <div className="space-y-3">
                  {campaigns.slice(0, 5).map((campaign) => (
                    <div
                      key={campaign.id}
                      onClick={() => openCampaignDetail(campaign)}
                      className="p-4 bg-zinc-800/50 rounded-xl hover:bg-zinc-800 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: campaign.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{campaign.name}</span>
                            <span className={`px-2 py-0.5 rounded text-xs ${STATUS_COLORS[campaign.status]}`}>
                              {campaign.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-xs text-zinc-500">
                            <span>{campaign.totalPosts} posts</span>
                            <span>{campaign.totalEngagement.toLocaleString()} engagement</span>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {campaign.platforms.slice(0, 3).map((p) => (
                            <span
                              key={p}
                              className="w-6 h-6 rounded bg-zinc-700 flex items-center justify-center text-xs"
                            >
                              {getPlatformIcon(p)}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Campaigns List Tab */}
        {activeTab === "campaigns" && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-wrap gap-4 p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search campaigns..."
                className="flex-1 min-w-[200px] px-4 py-2 bg-zinc-800 rounded-lg text-sm border border-zinc-700 focus:border-indigo-500 focus:outline-none"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 bg-zinc-800 rounded-lg text-sm border border-zinc-700 focus:border-indigo-500 focus:outline-none"
              >
                <option value="">All Status</option>
                <option value="DRAFT">Draft</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="ACTIVE">Active</option>
                <option value="PAUSED">Paused</option>
                <option value="COMPLETED">Completed</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>

            {/* Campaigns Grid */}
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : campaigns.length === 0 ? (
              <div className="text-center py-16">
                <svg className="w-16 h-16 mx-auto text-zinc-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <h3 className="text-lg font-semibold mb-2">No Campaigns</h3>
                <p className="text-zinc-400 mb-4">Create your first campaign to get started</p>
                <button
                  onClick={() => setActiveTab("create")}
                  className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg font-medium transition-colors"
                >
                  Create Campaign
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {campaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: campaign.color }}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => duplicateCampaign(campaign.id)}
                          className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-700 rounded transition-colors"
                          title="Duplicate"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => deleteCampaign(campaign.id)}
                          className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-700 rounded transition-colors"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <h3
                      className="text-lg font-semibold mb-2 cursor-pointer hover:text-indigo-400"
                      onClick={() => openCampaignDetail(campaign)}
                    >
                      {campaign.name}
                    </h3>

                    {campaign.description && (
                      <p className="text-sm text-zinc-400 mb-4 line-clamp-2">
                        {campaign.description}
                      </p>
                    )}

                    <div className="flex items-center gap-2 mb-4">
                      <span className={`px-2 py-1 rounded text-xs ${STATUS_COLORS[campaign.status]}`}>
                        {campaign.status}
                      </span>
                      {campaign.objective && (
                        <span className="px-2 py-1 bg-zinc-800 text-zinc-300 rounded text-xs capitalize">
                          {campaign.objective}
                        </span>
                      )}
                    </div>

                    {campaign.platforms.length > 0 && (
                      <div className="flex gap-1 mb-4">
                        {campaign.platforms.map((p) => (
                          <span
                            key={p}
                            className="w-7 h-7 rounded bg-zinc-800 flex items-center justify-center text-xs"
                          >
                            {getPlatformIcon(p)}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-2 text-center text-xs pt-4 border-t border-zinc-800">
                      <div>
                        <div className="text-lg font-semibold">{campaign.totalPosts}</div>
                        <div className="text-zinc-500">Posts</div>
                      </div>
                      <div>
                        <div className="text-lg font-semibold">{campaign.totalReach.toLocaleString()}</div>
                        <div className="text-zinc-500">Reach</div>
                      </div>
                      <div>
                        <div className="text-lg font-semibold">{campaign.totalEngagement.toLocaleString()}</div>
                        <div className="text-zinc-500">Engage</div>
                      </div>
                    </div>

                    <button
                      onClick={() => openCampaignDetail(campaign)}
                      className="w-full mt-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors"
                    >
                      View Details
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create Tab */}
        {activeTab === "create" && (
          <div className="max-w-2xl mx-auto">
            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800">
              <h3 className="text-lg font-semibold mb-6">Create New Campaign</h3>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Campaign Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Summer Product Launch"
                    className="w-full px-4 py-3 bg-zinc-800 rounded-xl border border-zinc-700 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe your campaign goals and strategy..."
                    rows={3}
                    className="w-full px-4 py-3 bg-zinc-800 rounded-xl border border-zinc-700 focus:border-indigo-500 focus:outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Objective</label>
                  <div className="grid grid-cols-2 gap-3">
                    {OBJECTIVES.map((obj) => (
                      <button
                        key={obj.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, objective: obj.value })}
                        className={`p-4 rounded-xl border text-left transition-colors ${
                          formData.objective === obj.value
                            ? "border-indigo-500 bg-indigo-500/10"
                            : "border-zinc-700 bg-zinc-800 hover:border-zinc-600"
                        }`}
                      >
                        <div className="font-medium text-sm">{obj.label}</div>
                        <div className="text-xs text-zinc-400 mt-1">{obj.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Platforms</label>
                  <div className="flex flex-wrap gap-2">
                    {PLATFORMS.map((platform) => (
                      <button
                        key={platform}
                        type="button"
                        onClick={() => {
                          const platforms = formData.platforms.includes(platform)
                            ? formData.platforms.filter((p) => p !== platform)
                            : [...formData.platforms, platform];
                          setFormData({ ...formData, platforms });
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          formData.platforms.includes(platform)
                            ? "bg-indigo-500 text-white"
                            : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                        }`}
                      >
                        {platform}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Start Date</label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-4 py-3 bg-zinc-800 rounded-xl border border-zinc-700 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">End Date</label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-4 py-3 bg-zinc-800 rounded-xl border border-zinc-700 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Budget ($)</label>
                  <input
                    type="number"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-4 py-3 bg-zinc-800 rounded-xl border border-zinc-700 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Hashtags</label>
                  <input
                    type="text"
                    value={formData.hashtags}
                    onChange={(e) => setFormData({ ...formData, hashtags: e.target.value })}
                    placeholder="#summer, #launch, #newproduct"
                    className="w-full px-4 py-3 bg-zinc-800 rounded-xl border border-zinc-700 focus:border-indigo-500 focus:outline-none"
                  />
                  <p className="text-xs text-zinc-500 mt-1">Separate with commas</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Color</label>
                  <div className="flex gap-2">
                    {CAMPAIGN_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({ ...formData, color })}
                        className={`w-8 h-8 rounded-full transition-transform ${
                          formData.color === color ? "scale-110 ring-2 ring-white" : ""
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => setActiveTab("campaigns")}
                    className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createCampaign}
                    disabled={!formData.name.trim() || loading}
                    className="flex-1 py-3 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-medium transition-colors"
                  >
                    {loading ? "Creating..." : "Create Campaign"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Campaign Detail Tab */}
        {activeTab === "detail" && selectedCampaign && (
          <div className="space-y-6">
            {/* Campaign Header */}
            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className="w-4 h-12 rounded"
                    style={{ backgroundColor: selectedCampaign.color }}
                  />
                  <div>
                    <h2 className="text-2xl font-bold">{selectedCampaign.name}</h2>
                    {selectedCampaign.description && (
                      <p className="text-zinc-400 mt-1">{selectedCampaign.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`px-2 py-1 rounded text-xs ${STATUS_COLORS[selectedCampaign.status]}`}>
                        {selectedCampaign.status}
                      </span>
                      {selectedCampaign.objective && (
                        <span className="px-2 py-1 bg-zinc-800 text-zinc-300 rounded text-xs capitalize">
                          {selectedCampaign.objective}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {selectedCampaign.status === "DRAFT" && (
                    <button
                      onClick={() => updateCampaignStatus(selectedCampaign.id, "ACTIVE")}
                      className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg text-sm font-medium transition-colors"
                    >
                      Launch
                    </button>
                  )}
                  {selectedCampaign.status === "ACTIVE" && (
                    <button
                      onClick={() => updateCampaignStatus(selectedCampaign.id, "PAUSED")}
                      className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 rounded-lg text-sm font-medium transition-colors"
                    >
                      Pause
                    </button>
                  )}
                  {selectedCampaign.status === "PAUSED" && (
                    <button
                      onClick={() => updateCampaignStatus(selectedCampaign.id, "ACTIVE")}
                      className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg text-sm font-medium transition-colors"
                    >
                      Resume
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 text-center">
                <div className="text-2xl font-bold">{selectedCampaign.totalPosts}</div>
                <div className="text-xs text-zinc-500">Total Posts</div>
              </div>
              <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 text-center">
                <div className="text-2xl font-bold">{selectedCampaign.totalReach.toLocaleString()}</div>
                <div className="text-xs text-zinc-500">Reach</div>
              </div>
              <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 text-center">
                <div className="text-2xl font-bold">{selectedCampaign.totalEngagement.toLocaleString()}</div>
                <div className="text-xs text-zinc-500">Engagement</div>
              </div>
              <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 text-center">
                <div className="text-2xl font-bold">{selectedCampaign.totalClicks.toLocaleString()}</div>
                <div className="text-xs text-zinc-500">Clicks</div>
              </div>
            </div>

            {/* Posts */}
            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Campaign Posts</h3>
                <button
                  onClick={() => setShowAddPost(true)}
                  className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Post
                </button>
              </div>

              {campaignPosts.length === 0 ? (
                <p className="text-zinc-500 text-sm text-center py-8">
                  No posts in this campaign yet. Add your first post!
                </p>
              ) : (
                <div className="space-y-4">
                  {campaignPosts.map((post) => (
                    <div key={post.id} className="p-4 bg-zinc-800/50 rounded-xl">
                      <div className="flex items-start gap-4">
                        <span className="w-8 h-8 rounded bg-zinc-700 flex items-center justify-center text-xs font-medium">
                          {getPlatformIcon(post.platform)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm mb-2 line-clamp-2">{post.content}</p>
                          <div className="flex items-center gap-4 text-xs text-zinc-500">
                            <span className={`px-2 py-0.5 rounded ${
                              post.status === "published"
                                ? "bg-green-500/10 text-green-400"
                                : post.status === "scheduled"
                                ? "bg-blue-500/10 text-blue-400"
                                : "bg-zinc-700 text-zinc-400"
                            }`}>
                              {post.status}
                            </span>
                            {post.scheduledFor && (
                              <span>{new Date(post.scheduledFor).toLocaleString()}</span>
                            )}
                            {post.status === "published" && (
                              <>
                                <span>{post.likes} likes</span>
                                <span>{post.comments} comments</span>
                              </>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => deletePost(post.id)}
                          className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-700 rounded transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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

        {/* Add Post Modal */}
        {showAddPost && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 w-full max-w-lg">
              <div className="p-6 border-b border-zinc-800">
                <h3 className="text-lg font-semibold">Add Campaign Post</h3>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Platform</label>
                  <select
                    value={postForm.platform}
                    onChange={(e) => setPostForm({ ...postForm, platform: e.target.value })}
                    className="w-full px-4 py-3 bg-zinc-800 rounded-xl border border-zinc-700 focus:border-indigo-500 focus:outline-none"
                  >
                    {PLATFORMS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Content</label>
                  <textarea
                    value={postForm.content}
                    onChange={(e) => setPostForm({ ...postForm, content: e.target.value })}
                    placeholder="Write your post content..."
                    rows={4}
                    className="w-full px-4 py-3 bg-zinc-800 rounded-xl border border-zinc-700 focus:border-indigo-500 focus:outline-none resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Schedule For (optional)</label>
                  <input
                    type="datetime-local"
                    value={postForm.scheduledFor}
                    onChange={(e) => setPostForm({ ...postForm, scheduledFor: e.target.value })}
                    className="w-full px-4 py-3 bg-zinc-800 rounded-xl border border-zinc-700 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="p-6 border-t border-zinc-800 flex gap-4">
                <button
                  onClick={() => {
                    setShowAddPost(false);
                    setPostForm({ platform: "X", content: "", scheduledFor: "" });
                  }}
                  className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={addCampaignPost}
                  disabled={!postForm.content.trim()}
                  className="flex-1 py-3 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-medium transition-colors"
                >
                  Add Post
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
