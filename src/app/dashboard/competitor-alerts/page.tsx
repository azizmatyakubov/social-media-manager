"use client";

import { useState, useEffect } from "react";

interface TrackedCompetitor {
  id: string;
  name: string;
  handle: string;
  platform: string;
  followers: number;
  verified: boolean;
  isActive: boolean;
  postFrequency: number;
  avgEngagement: number;
  lastChecked: Date;
}

interface CompetitorPost {
  id: string;
  competitorId: string;
  platform: string;
  content: string;
  type: string;
  publishedAt: Date;
  metrics: {
    likes: number;
    comments: number;
    shares: number;
    views?: number;
  };
  engagementRate: number;
  viralScore: number;
  hashtags: string[];
  isViral: boolean;
}

interface AlertRule {
  id: string;
  name: string;
  type: string;
  isEnabled: boolean;
  priority: string;
  triggeredCount: number;
  lastTriggered?: Date;
}

interface ContentAlert {
  id: string;
  competitorId: string;
  postId: string;
  type: string;
  title: string;
  message: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "unread" | "read" | "dismissed" | "actioned";
  metadata: {
    competitorName: string;
    platform: string;
    engagementRate?: number;
    viralScore?: number;
  };
  createdAt: Date;
}

interface AlertStats {
  totalAlerts: number;
  unreadAlerts: number;
  criticalAlerts: number;
  todayAlerts: number;
  trackedCompetitors: number;
  activeRules: number;
  viralContent: number;
  avgResponseTime: number;
}

export default function CompetitorAlertsPage() {
  const [activeTab, setActiveTab] = useState<"feed" | "competitors" | "rules" | "insights">("feed");
  const [competitors, setCompetitors] = useState<TrackedCompetitor[]>([]);
  const [posts, setPosts] = useState<CompetitorPost[]>([]);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [alerts, setAlerts] = useState<ContentAlert[]>([]);
  const [stats, setStats] = useState<AlertStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [alertFilter, setAlertFilter] = useState<"all" | "unread" | "critical">("all");

  // Add competitor form
  const [showAddCompetitor, setShowAddCompetitor] = useState(false);
  const [newCompetitor, setNewCompetitor] = useState({
    name: "",
    handle: "",
    platform: "twitter",
  });

  // Add rule form
  const [showAddRule, setShowAddRule] = useState(false);
  const [newRule, setNewRule] = useState({
    name: "",
    type: "new_post",
    priority: "medium",
  });

  const platforms = [
    { id: "twitter", name: "X (Twitter)", icon: "𝕏" },
    { id: "instagram", name: "Instagram", icon: "📸" },
    { id: "facebook", name: "Facebook", icon: "📘" },
    { id: "linkedin", name: "LinkedIn", icon: "💼" },
    { id: "tiktok", name: "TikTok", icon: "🎵" },
    { id: "youtube", name: "YouTube", icon: "▶️" },
  ];

  const ruleTypes = [
    { type: "new_post", label: "New Post" },
    { type: "viral_content", label: "Viral Content" },
    { type: "engagement_spike", label: "Engagement Spike" },
    { type: "keyword_mention", label: "Keyword Mention" },
    { type: "hashtag_usage", label: "Hashtag Usage" },
    { type: "campaign_launch", label: "Campaign Launch" },
    { type: "product_announcement", label: "Product Announcement" },
    { type: "negative_sentiment", label: "Negative Sentiment" },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [competitorsRes, postsRes, rulesRes, alertsRes, statsRes] = await Promise.all([
        fetch("/api/competitor-alerts?action=competitors"),
        fetch("/api/competitor-alerts?action=recent-posts&limit=30"),
        fetch("/api/competitor-alerts?action=rules"),
        fetch("/api/competitor-alerts?action=alerts"),
        fetch("/api/competitor-alerts?action=stats"),
      ]);

      if (competitorsRes.ok) {
        const data = await competitorsRes.json();
        setCompetitors(data.competitors);
      }

      if (postsRes.ok) {
        const data = await postsRes.json();
        setPosts(data.posts);
      }

      if (rulesRes.ok) {
        const data = await rulesRes.json();
        setRules(data.rules);
      }

      if (alertsRes.ok) {
        const data = await alertsRes.json();
        setAlerts(data.alerts);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats);
      }
    } catch (err) {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const addCompetitor = async () => {
    if (!newCompetitor.name || !newCompetitor.handle) {
      setError("Name and handle are required");
      return;
    }

    try {
      const response = await fetch("/api/competitor-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add-competitor",
          ...newCompetitor,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCompetitors([data.competitor, ...competitors]);
        setNewCompetitor({ name: "", handle: "", platform: "twitter" });
        setShowAddCompetitor(false);
        fetchData();
      }
    } catch (err) {
      setError("Failed to add competitor");
    }
  };

  const toggleCompetitor = async (competitorId: string, isActive: boolean) => {
    try {
      const response = await fetch("/api/competitor-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-competitor",
          competitorId,
          isActive,
        }),
      });

      if (response.ok) {
        setCompetitors(
          competitors.map((c) =>
            c.id === competitorId ? { ...c, isActive } : c
          )
        );
      }
    } catch (err) {
      setError("Failed to update competitor");
    }
  };

  const createRule = async () => {
    if (!newRule.name || !newRule.type) {
      setError("Name and type are required");
      return;
    }

    try {
      const response = await fetch("/api/competitor-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-rule",
          ...newRule,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setRules([data.rule, ...rules]);
        setNewRule({ name: "", type: "new_post", priority: "medium" });
        setShowAddRule(false);
        fetchData();
      }
    } catch (err) {
      setError("Failed to create rule");
    }
  };

  const toggleRule = async (ruleId: string, isEnabled: boolean) => {
    try {
      const response = await fetch("/api/competitor-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-rule",
          ruleId,
          isEnabled,
        }),
      });

      if (response.ok) {
        setRules(rules.map((r) => (r.id === ruleId ? { ...r, isEnabled } : r)));
      }
    } catch (err) {
      setError("Failed to update rule");
    }
  };

  const updateAlertStatus = async (alertId: string, status: ContentAlert["status"]) => {
    try {
      const response = await fetch("/api/competitor-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-alert-status",
          alertId,
          status,
        }),
      });

      if (response.ok) {
        setAlerts(alerts.map((a) => (a.id === alertId ? { ...a, status } : a)));
        fetchData();
      }
    } catch (err) {
      setError("Failed to update alert");
    }
  };

  const markAllRead = async () => {
    try {
      await fetch("/api/competitor-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark-all-read" }),
      });
      setAlerts(alerts.map((a) => ({ ...a, status: a.status === "unread" ? "read" : a.status })));
      fetchData();
    } catch (err) {
      setError("Failed to mark all as read");
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "high":
        return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "medium":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default:
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    }
  };

  const getPlatformIcon = (platform: string) => {
    const p = platforms.find((pl) => pl.id === platform);
    return p?.icon || "🌐";
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const filteredAlerts = alerts.filter((alert) => {
    if (alertFilter === "unread") return alert.status === "unread";
    if (alertFilter === "critical") return alert.priority === "critical";
    return true;
  });

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-zinc-400">Loading competitor alerts...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Competitor Alerts</h1>
            <p className="text-zinc-400">
              Monitor competitor content and get real-time alerts on important activity
            </p>
          </div>
          {stats && stats.unreadAlerts > 0 && (
            <button
              onClick={markAllRead}
              className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 transition-colors"
            >
              Mark All Read ({stats.unreadAlerts})
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400">
          {error}
          <button onClick={() => setError("")} className="ml-4 text-red-300 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
            <div className="text-zinc-400 text-sm mb-1">Unread Alerts</div>
            <div className="text-2xl font-bold text-indigo-400">{stats.unreadAlerts}</div>
          </div>
          <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
            <div className="text-zinc-400 text-sm mb-1">Critical Alerts</div>
            <div className="text-2xl font-bold text-red-400">{stats.criticalAlerts}</div>
          </div>
          <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
            <div className="text-zinc-400 text-sm mb-1">Tracked Competitors</div>
            <div className="text-2xl font-bold text-white">{stats.trackedCompetitors}</div>
          </div>
          <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
            <div className="text-zinc-400 text-sm mb-1">Viral Content</div>
            <div className="text-2xl font-bold text-orange-400">{stats.viralContent}</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-zinc-800 pb-4">
        {[
          { id: "feed", label: "Alert Feed" },
          { id: "competitors", label: "Competitors" },
          { id: "rules", label: "Alert Rules" },
          { id: "insights", label: "Recent Posts" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-indigo-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            {tab.label}
            {tab.id === "feed" && stats && stats.unreadAlerts > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {stats.unreadAlerts}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Alert Feed Tab */}
      {activeTab === "feed" && (
        <div className="space-y-4">
          {/* Filter */}
          <div className="flex gap-2 mb-4">
            {[
              { id: "all", label: "All" },
              { id: "unread", label: "Unread" },
              { id: "critical", label: "Critical" },
            ].map((filter) => (
              <button
                key={filter.id}
                onClick={() => setAlertFilter(filter.id as typeof alertFilter)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  alertFilter === filter.id
                    ? "bg-indigo-600 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {filteredAlerts.length === 0 ? (
            <div className="bg-zinc-900/50 rounded-xl p-12 border border-zinc-800 text-center">
              <div className="text-5xl mb-4">🔔</div>
              <h3 className="text-lg font-semibold text-white mb-2">No Alerts</h3>
              <p className="text-zinc-400">
                {alertFilter !== "all"
                  ? "No alerts match your filter"
                  : "You're all caught up!"}
              </p>
            </div>
          ) : (
            filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`bg-zinc-900/50 rounded-xl p-4 border transition-colors ${
                  alert.status === "unread"
                    ? "border-indigo-500/50 bg-indigo-600/5"
                    : "border-zinc-800"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="text-2xl">{getPlatformIcon(alert.metadata.platform)}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-semibold text-white">{alert.title}</span>
                      <span className={`px-2 py-0.5 rounded text-xs border ${getPriorityColor(alert.priority)}`}>
                        {alert.priority}
                      </span>
                      {alert.status === "unread" && (
                        <span className="w-2 h-2 bg-indigo-500 rounded-full" />
                      )}
                    </div>
                    <p className="text-zinc-400 text-sm mb-2">{alert.message}</p>
                    <div className="flex items-center gap-4 text-xs text-zinc-500">
                      <span>{getTimeAgo(alert.createdAt)}</span>
                      {alert.metadata.engagementRate && (
                        <span>
                          {alert.metadata.engagementRate.toFixed(1)}% engagement
                        </span>
                      )}
                      {alert.metadata.viralScore && alert.metadata.viralScore > 50 && (
                        <span className="text-orange-400">
                          🔥 Viral ({alert.metadata.viralScore.toFixed(0)}%)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {alert.status === "unread" && (
                      <button
                        onClick={() => updateAlertStatus(alert.id, "read")}
                        className="px-3 py-1.5 bg-zinc-800 text-zinc-300 rounded text-sm hover:bg-zinc-700"
                      >
                        Mark Read
                      </button>
                    )}
                    <button
                      onClick={() => updateAlertStatus(alert.id, "actioned")}
                      className="px-3 py-1.5 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700"
                    >
                      View
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Competitors Tab */}
      {activeTab === "competitors" && (
        <div className="space-y-4">
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowAddCompetitor(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              + Add Competitor
            </button>
          </div>

          {showAddCompetitor && (
            <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800 mb-4">
              <h3 className="text-lg font-semibold text-white mb-4">Add Competitor</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-zinc-400 text-sm mb-2">Name</label>
                  <input
                    type="text"
                    value={newCompetitor.name}
                    onChange={(e) => setNewCompetitor({ ...newCompetitor, name: e.target.value })}
                    placeholder="Company Name"
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 text-sm mb-2">Handle</label>
                  <input
                    type="text"
                    value={newCompetitor.handle}
                    onChange={(e) => setNewCompetitor({ ...newCompetitor, handle: e.target.value })}
                    placeholder="@username"
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 text-sm mb-2">Platform</label>
                  <select
                    value={newCompetitor.platform}
                    onChange={(e) => setNewCompetitor({ ...newCompetitor, platform: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                  >
                    {platforms.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.icon} {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={addCompetitor}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Add Competitor
                </button>
                <button
                  onClick={() => setShowAddCompetitor(false)}
                  className="px-4 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {competitors.map((competitor) => (
            <div
              key={competitor.id}
              className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-2xl">
                    {getPlatformIcon(competitor.platform)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{competitor.name}</span>
                      {competitor.verified && (
                        <span className="text-blue-400 text-sm">✓</span>
                      )}
                    </div>
                    <div className="text-zinc-400 text-sm">{competitor.handle}</div>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-white">
                      {formatNumber(competitor.followers)}
                    </div>
                    <div className="text-xs text-zinc-500">Followers</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-white">
                      {competitor.postFrequency}/wk
                    </div>
                    <div className="text-xs text-zinc-500">Posts</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-indigo-400">
                      {competitor.avgEngagement.toFixed(1)}%
                    </div>
                    <div className="text-xs text-zinc-500">Engagement</div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={competitor.isActive}
                      onChange={(e) => toggleCompetitor(competitor.id, e.target.checked)}
                      className="w-5 h-5 rounded bg-zinc-700 border-zinc-600 accent-indigo-500"
                    />
                    <span className="text-sm text-zinc-400">Tracking</span>
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rules Tab */}
      {activeTab === "rules" && (
        <div className="space-y-4">
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowAddRule(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              + Create Rule
            </button>
          </div>

          {showAddRule && (
            <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800 mb-4">
              <h3 className="text-lg font-semibold text-white mb-4">Create Alert Rule</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-zinc-400 text-sm mb-2">Rule Name</label>
                  <input
                    type="text"
                    value={newRule.name}
                    onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                    placeholder="My Alert Rule"
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 text-sm mb-2">Alert Type</label>
                  <select
                    value={newRule.type}
                    onChange={(e) => setNewRule({ ...newRule, type: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                  >
                    {ruleTypes.map((t) => (
                      <option key={t.type} value={t.type}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-400 text-sm mb-2">Priority</label>
                  <select
                    value={newRule.priority}
                    onChange={(e) => setNewRule({ ...newRule, priority: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={createRule}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Create Rule
                </button>
                <button
                  onClick={() => setShowAddRule(false)}
                  className="px-4 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {rules.map((rule) => (
            <div
              key={rule.id}
              className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-semibold text-white">{rule.name}</span>
                    <span className={`px-2 py-0.5 rounded text-xs border ${getPriorityColor(rule.priority)}`}>
                      {rule.priority}
                    </span>
                  </div>
                  <div className="text-zinc-400 text-sm">
                    {ruleTypes.find((t) => t.type === rule.type)?.label || rule.type}
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-white">{rule.triggeredCount}</div>
                    <div className="text-xs text-zinc-500">Triggered</div>
                  </div>
                  {rule.lastTriggered && (
                    <div className="text-sm text-zinc-500">
                      Last: {getTimeAgo(rule.lastTriggered)}
                    </div>
                  )}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rule.isEnabled}
                      onChange={(e) => toggleRule(rule.id, e.target.checked)}
                      className="w-5 h-5 rounded bg-zinc-700 border-zinc-600 accent-indigo-500"
                    />
                    <span className="text-sm text-zinc-400">Enabled</span>
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent Posts Tab */}
      {activeTab === "insights" && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Competitor Activity</h3>

          {posts.map((post) => {
            const competitor = competitors.find((c) => c.id === post.competitorId);
            return (
              <div
                key={post.id}
                className={`bg-zinc-900/50 rounded-xl p-6 border ${
                  post.isViral ? "border-orange-500/50" : "border-zinc-800"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="text-2xl">{getPlatformIcon(post.platform)}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-semibold text-white">
                        {competitor?.name || "Unknown"}
                      </span>
                      <span className="text-zinc-500 text-sm">{competitor?.handle}</span>
                      {post.isViral && (
                        <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded text-xs">
                          🔥 Viral
                        </span>
                      )}
                    </div>
                    <p className="text-zinc-300 mb-3">{post.content}</p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {post.hashtags.map((tag) => (
                        <span key={tag} className="px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-6 text-sm text-zinc-500">
                      <span>❤️ {formatNumber(post.metrics.likes)}</span>
                      <span>💬 {formatNumber(post.metrics.comments)}</span>
                      <span>🔁 {formatNumber(post.metrics.shares)}</span>
                      {post.metrics.views && (
                        <span>👁️ {formatNumber(post.metrics.views)}</span>
                      )}
                      <span className="text-indigo-400">
                        {post.engagementRate.toFixed(1)}% engagement
                      </span>
                      <span>{getTimeAgo(post.publishedAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
