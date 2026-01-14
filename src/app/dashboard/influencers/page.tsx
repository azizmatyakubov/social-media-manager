"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Search,
  Plus,
  Trash2,
  Mail,
  ExternalLink,
  Star,
  Filter,
  Target,
  DollarSign,
  TrendingUp,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  Copy,
  RefreshCw,
  UserPlus,
} from "lucide-react";

type InfluencerTier = "nano" | "micro" | "mid" | "macro" | "mega";
type OutreachStatus = "not_contacted" | "contacted" | "responded" | "negotiating" | "agreed" | "declined" | "completed";

interface Influencer {
  id: string;
  name: string;
  handle: string;
  platform: string;
  profileUrl: string;
  bio?: string;
  followers: number;
  tier: InfluencerTier;
  engagementRate: number;
  niche: string[];
  location?: string;
  email?: string;
  averageLikes: number;
  averageComments: number;
  contentTypes: string[];
  tags: string[];
  score: number;
  addedAt: string;
}

interface OutreachCampaign {
  id: string;
  name: string;
  description?: string;
  goal: string;
  budget: number;
  startDate: string;
  endDate: string;
  influencers: {
    influencerId: string;
    influencer?: Influencer;
    status: OutreachStatus;
    lastContactDate?: string;
    proposedRate?: number;
    agreedRate?: number;
  }[];
  createdAt: string;
}

const PLATFORMS = ["Instagram", "TikTok", "YouTube", "X", "LinkedIn"];
const TIER_COLORS: Record<InfluencerTier, string> = {
  nano: "bg-green-500/20 text-green-300",
  micro: "bg-blue-500/20 text-blue-300",
  mid: "bg-purple-500/20 text-purple-300",
  macro: "bg-yellow-500/20 text-yellow-300",
  mega: "bg-red-500/20 text-red-300",
};

const STATUS_CONFIG: Record<OutreachStatus, { label: string; color: string; icon: typeof Clock }> = {
  not_contacted: { label: "Not Contacted", color: "text-zinc-400 bg-zinc-400/10", icon: Clock },
  contacted: { label: "Contacted", color: "text-blue-400 bg-blue-400/10", icon: Mail },
  responded: { label: "Responded", color: "text-purple-400 bg-purple-400/10", icon: MessageSquare },
  negotiating: { label: "Negotiating", color: "text-yellow-400 bg-yellow-400/10", icon: TrendingUp },
  agreed: { label: "Agreed", color: "text-green-400 bg-green-400/10", icon: CheckCircle2 },
  declined: { label: "Declined", color: "text-red-400 bg-red-400/10", icon: XCircle },
  completed: { label: "Completed", color: "text-emerald-400 bg-emerald-400/10", icon: CheckCircle2 },
};

export default function InfluencersPage() {
  const [activeTab, setActiveTab] = useState<"discover" | "saved" | "campaigns" | "outreach">("discover");
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [savedInfluencers, setSavedInfluencers] = useState<Influencer[]>([]);
  const [campaigns, setCampaigns] = useState<OutreachCampaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<OutreachCampaign | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);

  // Search form state
  const [searchNiche, setSearchNiche] = useState("");
  const [searchPlatforms, setSearchPlatforms] = useState<string[]>(["Instagram"]);
  const [followerMin, setFollowerMin] = useState(10000);
  const [followerMax, setFollowerMax] = useState(100000);
  const [engagementMin, setEngagementMin] = useState(2);

  // Outreach form state
  const [selectedInfluencer, setSelectedInfluencer] = useState<Influencer | null>(null);
  const [outreachBrand, setOutreachBrand] = useState("");
  const [outreachGoal, setOutreachGoal] = useState("");
  const [outreachOffer, setOutreachOffer] = useState("");
  const [outreachTone, setOutreachTone] = useState<"professional" | "casual" | "friendly">("professional");
  const [generatedMessage, setGeneratedMessage] = useState<{ subject: string; body: string } | null>(null);
  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false);

  // Campaign form state
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [campaignName, setCampaignName] = useState("");
  const [campaignGoal, setCampaignGoal] = useState("");
  const [campaignBudget, setCampaignBudget] = useState(5000);

  useEffect(() => {
    fetchSavedInfluencers();
    fetchCampaigns();
  }, []);

  const fetchSavedInfluencers = async () => {
    try {
      const response = await fetch("/api/influencers?action=list");
      const data = await response.json();
      if (data.influencers) {
        setSavedInfluencers(data.influencers);
      }
    } catch (error) {
      console.error("Failed to fetch influencers:", error);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const response = await fetch("/api/influencers?action=campaigns");
      const data = await response.json();
      if (data.campaigns) {
        setCampaigns(data.campaigns);
      }
    } catch (error) {
      console.error("Failed to fetch campaigns:", error);
    }
  };

  const handleDiscover = async () => {
    if (!searchNiche || searchPlatforms.length === 0) return;

    setIsDiscovering(true);
    try {
      const response = await fetch("/api/influencers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "discover",
          niche: searchNiche,
          platforms: searchPlatforms,
          followerRange: { min: followerMin, max: followerMax },
          engagementMin,
        }),
      });

      const data = await response.json();
      if (data.influencers) {
        setInfluencers(data.influencers);
      }
    } catch (error) {
      console.error("Failed to discover influencers:", error);
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleSaveInfluencer = async (influencer: Influencer) => {
    try {
      const response = await fetch("/api/influencers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add",
          ...influencer,
        }),
      });

      const data = await response.json();
      if (data.influencer) {
        setSavedInfluencers([data.influencer, ...savedInfluencers]);
      }
    } catch (error) {
      console.error("Failed to save influencer:", error);
    }
  };

  const handleDeleteInfluencer = async (influencerId: string) => {
    try {
      const response = await fetch("/api/influencers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          influencerId,
        }),
      });

      if (response.ok) {
        setSavedInfluencers(savedInfluencers.filter((i) => i.id !== influencerId));
      }
    } catch (error) {
      console.error("Failed to delete influencer:", error);
    }
  };

  const handleGenerateOutreach = async () => {
    if (!selectedInfluencer || !outreachBrand || !outreachGoal || !outreachOffer) return;

    setIsGeneratingMessage(true);
    try {
      const response = await fetch("/api/influencers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-outreach",
          influencerId: selectedInfluencer.id,
          brandName: outreachBrand,
          goal: outreachGoal,
          offer: outreachOffer,
          tone: outreachTone,
        }),
      });

      const data = await response.json();
      if (data.message) {
        setGeneratedMessage(data.message);
      }
    } catch (error) {
      console.error("Failed to generate outreach:", error);
    } finally {
      setIsGeneratingMessage(false);
    }
  };

  const handleCreateCampaign = async () => {
    if (!campaignName || !campaignGoal || !campaignBudget) return;

    try {
      const response = await fetch("/api/influencers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-campaign",
          name: campaignName,
          goal: campaignGoal,
          budget: campaignBudget,
        }),
      });

      const data = await response.json();
      if (data.campaign) {
        setCampaigns([data.campaign, ...campaigns]);
        setShowCampaignForm(false);
        setCampaignName("");
        setCampaignGoal("");
        setCampaignBudget(5000);
      }
    } catch (error) {
      console.error("Failed to create campaign:", error);
    }
  };

  const handleAddToCampaign = async (campaignId: string, influencerId: string) => {
    try {
      const response = await fetch("/api/influencers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add-to-campaign",
          campaignId,
          influencerId,
        }),
      });

      const data = await response.json();
      if (data.campaign) {
        setCampaigns(campaigns.map((c) => (c.id === data.campaign.id ? data.campaign : c)));
      }
    } catch (error) {
      console.error("Failed to add to campaign:", error);
    }
  };

  const handleUpdateStatus = async (campaignId: string, influencerId: string, status: OutreachStatus) => {
    try {
      const response = await fetch("/api/influencers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-status",
          campaignId,
          influencerId,
          status,
        }),
      });

      const data = await response.json();
      if (data.campaign) {
        setCampaigns(campaigns.map((c) => (c.id === data.campaign.id ? data.campaign : c)));
        if (selectedCampaign?.id === data.campaign.id) {
          setSelectedCampaign(data.campaign);
        }
      }
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  const togglePlatform = (platform: string) => {
    setSearchPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-400" />
            Influencer Discovery
          </h1>
          <p className="text-zinc-400 mt-1">Find, analyze, and connect with influencers</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-800">
        <nav className="flex gap-4">
          {[
            { id: "discover", label: "Discover", icon: Search },
            { id: "saved", label: "Saved", icon: Star },
            { id: "campaigns", label: "Campaigns", icon: Target },
            { id: "outreach", label: "Outreach", icon: Mail },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-indigo-500 text-white"
                  : "border-transparent text-zinc-400 hover:text-white"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.id === "saved" && savedInfluencers.length > 0 && (
                <span className="px-1.5 py-0.5 bg-indigo-600 rounded text-xs">
                  {savedInfluencers.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Discover Tab */}
      {activeTab === "discover" && (
        <div className="space-y-6">
          {/* Search Form */}
          <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
            <h3 className="text-lg font-semibold text-white mb-4">Search Influencers</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-2">
                <label className="block text-sm text-zinc-400 mb-2">Niche / Industry</label>
                <input
                  type="text"
                  value={searchNiche}
                  onChange={(e) => setSearchNiche(e.target.value)}
                  placeholder="e.g., Fitness, Beauty, Tech"
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">Min Followers</label>
                <input
                  type="number"
                  value={followerMin}
                  onChange={(e) => setFollowerMin(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">Max Followers</label>
                <input
                  type="number"
                  value={followerMax}
                  onChange={(e) => setFollowerMax(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Platforms</label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map((platform) => (
                    <button
                      key={platform}
                      onClick={() => togglePlatform(platform)}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        searchPlatforms.includes(platform)
                          ? "bg-indigo-600 text-white"
                          : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                      }`}
                    >
                      {platform}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">Min Engagement Rate (%)</label>
                <input
                  type="number"
                  value={engagementMin}
                  onChange={(e) => setEngagementMin(parseFloat(e.target.value) || 0)}
                  step="0.5"
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <button
              onClick={handleDiscover}
              disabled={!searchNiche || searchPlatforms.length === 0 || isDiscovering}
              className="mt-4 flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50"
            >
              <Search className="w-4 h-4" />
              {isDiscovering ? "Searching..." : "Discover Influencers"}
            </button>
          </div>

          {/* Results */}
          <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Results</h3>
              {influencers.length > 0 && (
                <span className="text-sm text-zinc-400">{influencers.length} influencers found</span>
              )}
            </div>

            {influencers.length === 0 ? (
              <div className="text-center py-12">
                <Search className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                <p className="text-zinc-400">Search for influencers to see results</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {influencers.map((influencer) => (
                  <div
                    key={influencer.id}
                    className="bg-zinc-800 rounded-lg p-4 border border-zinc-700"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-white">{influencer.name}</h4>
                        <p className="text-sm text-indigo-400">{influencer.handle}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${TIER_COLORS[influencer.tier]}`}>
                        {influencer.tier}
                      </span>
                    </div>

                    <p className="text-sm text-zinc-400 mb-3 line-clamp-2">{influencer.bio}</p>

                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="text-center">
                        <p className="text-lg font-bold text-white">{formatNumber(influencer.followers)}</p>
                        <p className="text-xs text-zinc-500">Followers</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-white">{influencer.engagementRate}%</p>
                        <p className="text-xs text-zinc-500">Engagement</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-white">{influencer.score}</p>
                        <p className="text-xs text-zinc-500">Score</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-3">
                      {influencer.niche.slice(0, 3).map((n) => (
                        <span key={n} className="px-2 py-0.5 bg-zinc-700 rounded text-xs text-zinc-300">
                          {n}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSaveInfluencer(influencer)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500"
                      >
                        <Plus className="w-4 h-4" />
                        Save
                      </button>
                      <a
                        href={influencer.profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 bg-zinc-700 text-zinc-300 rounded-lg hover:bg-zinc-600"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Saved Tab */}
      {activeTab === "saved" && (
        <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
          <h3 className="text-lg font-semibold text-white mb-4">Saved Influencers</h3>

          {savedInfluencers.length === 0 ? (
            <div className="text-center py-12">
              <Star className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-zinc-400">No saved influencers yet. Discover and save some!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {savedInfluencers.map((influencer) => (
                <div
                  key={influencer.id}
                  className="bg-zinc-800 rounded-lg p-4 border border-zinc-700 flex items-center gap-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div>
                        <h4 className="font-medium text-white">{influencer.name}</h4>
                        <p className="text-sm text-indigo-400">{influencer.handle}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${TIER_COLORS[influencer.tier]}`}>
                        {influencer.tier}
                      </span>
                      <span className="px-2 py-1 bg-zinc-700 rounded text-xs text-zinc-300">
                        {influencer.platform}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-zinc-400">
                      <span>{formatNumber(influencer.followers)} followers</span>
                      <span>{influencer.engagementRate}% engagement</span>
                      <span>Score: {influencer.score}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {campaigns.length > 0 && (
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAddToCampaign(e.target.value, influencer.id);
                            e.target.value = "";
                          }
                        }}
                        className="px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-sm text-white"
                        defaultValue=""
                      >
                        <option value="">Add to Campaign</option>
                        {campaigns.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    )}
                    <button
                      onClick={() => {
                        setSelectedInfluencer(influencer);
                        setActiveTab("outreach");
                      }}
                      className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500"
                    >
                      <Mail className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteInfluencer(influencer.id)}
                      className="px-3 py-2 bg-zinc-700 text-red-400 rounded-lg hover:bg-zinc-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Campaigns Tab */}
      {activeTab === "campaigns" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Campaign List */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white">Your Campaigns</h3>
                <button
                  onClick={() => setShowCampaignForm(true)}
                  className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {campaigns.length === 0 ? (
                <div className="text-center py-8">
                  <Target className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                  <p className="text-zinc-400">No campaigns yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {campaigns.map((campaign) => (
                    <button
                      key={campaign.id}
                      onClick={() => setSelectedCampaign(campaign)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        selectedCampaign?.id === campaign.id
                          ? "bg-indigo-600 text-white"
                          : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                      }`}
                    >
                      <p className="font-medium">{campaign.name}</p>
                      <div className="flex items-center gap-2 mt-1 text-sm opacity-70">
                        <span>{campaign.influencers.length} influencers</span>
                        <span>•</span>
                        <span>${campaign.budget.toLocaleString()}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Campaign Details */}
          <div className="lg:col-span-2">
            {selectedCampaign ? (
              <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-semibold text-white">{selectedCampaign.name}</h3>
                    <p className="text-zinc-400 mt-1">{selectedCampaign.goal}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">${selectedCampaign.budget.toLocaleString()}</p>
                    <p className="text-sm text-zinc-400">Budget</p>
                  </div>
                </div>

                {/* Campaign Stats */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  {(["not_contacted", "contacted", "negotiating", "agreed"] as OutreachStatus[]).map((status) => {
                    const count = selectedCampaign.influencers.filter((i) => i.status === status).length;
                    const config = STATUS_CONFIG[status];
                    return (
                      <div key={status} className="bg-zinc-800 rounded-lg p-3">
                        <p className="text-xs text-zinc-500">{config.label}</p>
                        <p className="text-xl font-bold text-white">{count}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Influencers in Campaign */}
                <h4 className="text-sm font-medium text-zinc-400 mb-3">Influencers</h4>
                {selectedCampaign.influencers.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-zinc-700 rounded-lg">
                    <UserPlus className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                    <p className="text-zinc-400">Add influencers from your saved list</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedCampaign.influencers.map((ci) => {
                      const influencer = savedInfluencers.find((i) => i.id === ci.influencerId);
                      if (!influencer) return null;
                      const statusConfig = STATUS_CONFIG[ci.status];
                      const StatusIcon = statusConfig.icon;

                      return (
                        <div
                          key={ci.influencerId}
                          className="bg-zinc-800 rounded-lg p-4 border border-zinc-700 flex items-center gap-4"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h5 className="font-medium text-white">{influencer.name}</h5>
                              <span className="text-sm text-indigo-400">{influencer.handle}</span>
                            </div>
                            <p className="text-sm text-zinc-400 mt-1">
                              {formatNumber(influencer.followers)} followers • {influencer.engagementRate}% engagement
                            </p>
                          </div>

                          <select
                            value={ci.status}
                            onChange={(e) => handleUpdateStatus(selectedCampaign.id, ci.influencerId, e.target.value as OutreachStatus)}
                            className={`px-3 py-1.5 rounded-lg text-sm ${statusConfig.color}`}
                          >
                            {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                              <option key={value} value={value}>{config.label}</option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800 text-center py-12">
                <Target className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                <p className="text-zinc-400">Select a campaign to view details</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Outreach Tab */}
      {activeTab === "outreach" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
            <h3 className="text-lg font-semibold text-white mb-4">Generate Outreach Message</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Select Influencer</label>
                <select
                  value={selectedInfluencer?.id || ""}
                  onChange={(e) => {
                    const inf = savedInfluencers.find((i) => i.id === e.target.value);
                    setSelectedInfluencer(inf || null);
                  }}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Choose an influencer...</option>
                  {savedInfluencers.map((inf) => (
                    <option key={inf.id} value={inf.id}>
                      {inf.name} ({inf.handle})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">Your Brand Name</label>
                <input
                  type="text"
                  value={outreachBrand}
                  onChange={(e) => setOutreachBrand(e.target.value)}
                  placeholder="e.g., Acme Inc."
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">Campaign Goal</label>
                <input
                  type="text"
                  value={outreachGoal}
                  onChange={(e) => setOutreachGoal(e.target.value)}
                  placeholder="e.g., Product launch promotion"
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">What You&apos;re Offering</label>
                <textarea
                  value={outreachOffer}
                  onChange={(e) => setOutreachOffer(e.target.value)}
                  placeholder="e.g., Free products + $500 per post"
                  rows={3}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">Tone</label>
                <div className="flex gap-2">
                  {(["professional", "friendly", "casual"] as const).map((tone) => (
                    <button
                      key={tone}
                      onClick={() => setOutreachTone(tone)}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm capitalize transition-colors ${
                        outreachTone === tone
                          ? "bg-indigo-600 text-white"
                          : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                      }`}
                    >
                      {tone}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleGenerateOutreach}
                disabled={!selectedInfluencer || !outreachBrand || !outreachGoal || !outreachOffer || isGeneratingMessage}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50"
              >
                <Mail className="w-4 h-4" />
                {isGeneratingMessage ? "Generating..." : "Generate Message"}
              </button>
            </div>
          </div>

          <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Generated Message</h3>
              {generatedMessage && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigator.clipboard.writeText(`Subject: ${generatedMessage.subject}\n\n${generatedMessage.body}`)}
                    className="text-zinc-400 hover:text-white"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleGenerateOutreach}
                    disabled={isGeneratingMessage}
                    className="text-zinc-400 hover:text-white"
                  >
                    <RefreshCw className={`w-4 h-4 ${isGeneratingMessage ? "animate-spin" : ""}`} />
                  </button>
                </div>
              )}
            </div>

            {generatedMessage ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-zinc-400 mb-1">Subject</p>
                  <div className="bg-zinc-800 rounded-lg p-3 text-white">
                    {generatedMessage.subject}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-zinc-400 mb-1">Body</p>
                  <div className="bg-zinc-800 rounded-lg p-4 text-zinc-300 whitespace-pre-wrap">
                    {generatedMessage.body}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Mail className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                <p className="text-zinc-400">Generated message will appear here</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Campaign Modal */}
      {showCampaignForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-md border border-zinc-800">
            <h3 className="text-lg font-semibold text-white mb-4">Create Campaign</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Campaign Name</label>
                <input
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="e.g., Summer Product Launch"
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">Goal</label>
                <input
                  type="text"
                  value={campaignGoal}
                  onChange={(e) => setCampaignGoal(e.target.value)}
                  placeholder="e.g., Increase brand awareness"
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">Budget ($)</label>
                <input
                  type="number"
                  value={campaignBudget}
                  onChange={(e) => setCampaignBudget(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 mt-6">
              <button
                onClick={() => setShowCampaignForm(false)}
                className="flex-1 px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCampaign}
                disabled={!campaignName || !campaignGoal}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50"
              >
                Create Campaign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
