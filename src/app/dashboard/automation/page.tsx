"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";

// ============================================
// TYPES
// ============================================

interface EvergreenPost {
  id: string;
  content: string;
  isEvergreen: boolean;
  autoRetweet: boolean;
  lastRecycled: string | null;
  recycleCount: number;
  likes: number;
  retweets: number;
  replies: number;
  impressions: number;
  postedAt: string | null;
  createdAt: string;
  engagementScore: number;
  nextRetweetDate: string;
  eligibility: {
    eligible: boolean;
    reason?: string;
    daysSinceLastRetweet?: number;
  };
}

interface AutoDmRule {
  id: string;
  name: string;
  triggerType: string;
  keywords: string[];
  matchType: string;
  dmTemplate: string;
  includeDelay: boolean;
  delaySeconds: number;
  minFollowers: number | null;
  maxDailyDms: number;
  excludeKeywords: string[];
  triggeredCount: number;
  lastTriggered: string | null;
  isActive: boolean;
  createdAt: string;
  stats?: {
    triggeredCount: number;
    dailyAverage: number;
  };
}

interface RetweetHistory {
  id: string;
  content: string;
  lastRecycled: string;
  recycleCount: number;
  likes: number;
  retweets: number;
}

// ============================================
// COMPONENT
// ============================================

export default function AutomationPage() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState<"evergreen" | "autodm">("evergreen");

  // Evergreen state
  const [evergreenPosts, setEvergreenPosts] = useState<EvergreenPost[]>([]);
  const [retweetHistory, setRetweetHistory] = useState<RetweetHistory[]>([]);
  const [evergreenStats, setEvergreenStats] = useState({
    totalEvergreen: 0,
    autoRetweetEnabled: 0,
    eligibleForRetweet: 0,
    totalRetweets: 0,
  });
  const [evergreenLoading, setEvergreenLoading] = useState(true);

  // Auto DM state
  const [autoDmRules, setAutoDmRules] = useState<AutoDmRule[]>([]);
  const [autoDmStats, setAutoDmStats] = useState({
    totalRules: 0,
    activeRules: 0,
    totalTriggered: 0,
  });
  const [autoDmLoading, setAutoDmLoading] = useState(true);
  const [showCreateRuleModal, setShowCreateRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState<AutoDmRule | null>(null);

  // New rule form state
  const [newRule, setNewRule] = useState({
    name: "",
    triggerType: "KEYWORD_COMMENT",
    keywords: "",
    matchType: "CONTAINS",
    dmTemplate: "",
    includeDelay: true,
    delaySeconds: 60,
    minFollowers: "",
    maxDailyDms: 50,
    excludeKeywords: "",
  });

  useEffect(() => {
    if (status === "authenticated") {
      if (activeTab === "evergreen") {
        fetchEvergreenPosts();
      } else {
        fetchAutoDmRules();
      }
    }
  }, [status, activeTab]);

  if (status === "loading") return <div className="p-8">Loading...</div>;
  if (status === "unauthenticated") redirect("/login");

  // ============================================
  // EVERGREEN FUNCTIONS
  // ============================================

  async function fetchEvergreenPosts() {
    setEvergreenLoading(true);
    try {
      const res = await fetch("/api/auto-retweet");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setEvergreenPosts(data.posts || []);
      setRetweetHistory(data.history || []);
      setEvergreenStats(data.stats || {
        totalEvergreen: 0,
        autoRetweetEnabled: 0,
        eligibleForRetweet: 0,
        totalRetweets: 0,
      });
    } catch (error) {
      console.error("Failed to fetch evergreen posts:", error);
    } finally {
      setEvergreenLoading(false);
    }
  }

  async function toggleAutoRetweet(postId: string, currentValue: boolean) {
    try {
      const res = await fetch("/api/auto-retweet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId,
          autoRetweet: !currentValue,
          isEvergreen: true,
        }),
      });

      if (res.ok) {
        fetchEvergreenPosts();
      }
    } catch (error) {
      console.error("Failed to toggle auto-retweet:", error);
    }
  }

  async function removeEvergreen(postId: string) {
    if (!confirm("Remove this post from evergreen rotation?")) return;

    try {
      const res = await fetch(`/api/auto-retweet?postId=${postId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchEvergreenPosts();
      }
    } catch (error) {
      console.error("Failed to remove evergreen:", error);
    }
  }

  // ============================================
  // AUTO DM FUNCTIONS
  // ============================================

  async function fetchAutoDmRules() {
    setAutoDmLoading(true);
    try {
      const res = await fetch("/api/auto-dm");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setAutoDmRules(data.rules || []);
      setAutoDmStats(data.summary || {
        totalRules: 0,
        activeRules: 0,
        totalTriggered: 0,
      });
    } catch (error) {
      console.error("Failed to fetch auto DM rules:", error);
    } finally {
      setAutoDmLoading(false);
    }
  }

  async function createRule() {
    if (!newRule.name || !newRule.keywords || !newRule.dmTemplate) {
      alert("Please fill in all required fields");
      return;
    }

    try {
      const res = await fetch("/api/auto-dm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newRule.name,
          triggerType: newRule.triggerType,
          keywords: newRule.keywords.split(",").map((k) => k.trim()),
          matchType: newRule.matchType,
          dmTemplate: newRule.dmTemplate,
          includeDelay: newRule.includeDelay,
          delaySeconds: newRule.delaySeconds,
          minFollowers: newRule.minFollowers ? parseInt(newRule.minFollowers) : null,
          maxDailyDms: newRule.maxDailyDms,
          excludeKeywords: newRule.excludeKeywords
            ? newRule.excludeKeywords.split(",").map((k) => k.trim())
            : [],
        }),
      });

      if (res.ok) {
        setShowCreateRuleModal(false);
        resetNewRule();
        fetchAutoDmRules();
      }
    } catch (error) {
      console.error("Failed to create rule:", error);
    }
  }

  async function updateRule() {
    if (!editingRule) return;

    try {
      const res = await fetch("/api/auto-dm", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ruleId: editingRule.id,
          name: newRule.name,
          triggerType: newRule.triggerType,
          keywords: newRule.keywords.split(",").map((k) => k.trim()),
          matchType: newRule.matchType,
          dmTemplate: newRule.dmTemplate,
          includeDelay: newRule.includeDelay,
          delaySeconds: newRule.delaySeconds,
          minFollowers: newRule.minFollowers ? parseInt(newRule.minFollowers) : null,
          maxDailyDms: newRule.maxDailyDms,
          excludeKeywords: newRule.excludeKeywords
            ? newRule.excludeKeywords.split(",").map((k) => k.trim())
            : [],
        }),
      });

      if (res.ok) {
        setEditingRule(null);
        setShowCreateRuleModal(false);
        resetNewRule();
        fetchAutoDmRules();
      }
    } catch (error) {
      console.error("Failed to update rule:", error);
    }
  }

  async function toggleRule(ruleId: string) {
    try {
      const res = await fetch("/api/auto-dm", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ruleId,
          action: "toggle",
        }),
      });

      if (res.ok) {
        fetchAutoDmRules();
      }
    } catch (error) {
      console.error("Failed to toggle rule:", error);
    }
  }

  async function deleteRule(ruleId: string) {
    if (!confirm("Are you sure you want to delete this rule?")) return;

    try {
      const res = await fetch(`/api/auto-dm?ruleId=${ruleId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchAutoDmRules();
      }
    } catch (error) {
      console.error("Failed to delete rule:", error);
    }
  }

  function resetNewRule() {
    setNewRule({
      name: "",
      triggerType: "KEYWORD_COMMENT",
      keywords: "",
      matchType: "CONTAINS",
      dmTemplate: "",
      includeDelay: true,
      delaySeconds: 60,
      minFollowers: "",
      maxDailyDms: 50,
      excludeKeywords: "",
    });
  }

  function openEditModal(rule: AutoDmRule) {
    setEditingRule(rule);
    setNewRule({
      name: rule.name,
      triggerType: rule.triggerType,
      keywords: rule.keywords.join(", "),
      matchType: rule.matchType,
      dmTemplate: rule.dmTemplate,
      includeDelay: rule.includeDelay,
      delaySeconds: rule.delaySeconds,
      minFollowers: rule.minFollowers?.toString() || "",
      maxDailyDms: rule.maxDailyDms,
      excludeKeywords: rule.excludeKeywords.join(", "),
    });
    setShowCreateRuleModal(true);
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatTimeAgo(dateStr: string | null) {
    if (!dateStr) return "Never";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Automation</h1>
        <p className="text-[var(--x-text-secondary)]">
          Automate your engagement with evergreen retweets and keyword-triggered DMs
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-[var(--x-border)]">
        <button
          onClick={() => setActiveTab("evergreen")}
          className={`pb-3 px-1 font-medium transition-colors ${
            activeTab === "evergreen"
              ? "text-[var(--x-blue)] border-b-2 border-[var(--x-blue)]"
              : "text-[var(--x-text-secondary)] hover:text-[var(--x-text)]"
          }`}
        >
          Evergreen Retweets
        </button>
        <button
          onClick={() => setActiveTab("autodm")}
          className={`pb-3 px-1 font-medium transition-colors ${
            activeTab === "autodm"
              ? "text-[var(--x-blue)] border-b-2 border-[var(--x-blue)]"
              : "text-[var(--x-text-secondary)] hover:text-[var(--x-text)]"
          }`}
        >
          Auto DM Rules
        </button>
      </div>

      {/* Evergreen Tab */}
      {activeTab === "evergreen" && (
        <div>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="x-card p-4">
              <div className="text-2xl font-bold">{evergreenStats.totalEvergreen}</div>
              <div className="text-sm text-[var(--x-text-secondary)]">Evergreen Posts</div>
            </div>
            <div className="x-card p-4">
              <div className="text-2xl font-bold">{evergreenStats.autoRetweetEnabled}</div>
              <div className="text-sm text-[var(--x-text-secondary)]">Auto-Retweet Enabled</div>
            </div>
            <div className="x-card p-4">
              <div className="text-2xl font-bold">{evergreenStats.eligibleForRetweet}</div>
              <div className="text-sm text-[var(--x-text-secondary)]">Ready to Retweet</div>
            </div>
            <div className="x-card p-4">
              <div className="text-2xl font-bold">{evergreenStats.totalRetweets}</div>
              <div className="text-sm text-[var(--x-text-secondary)]">Total Retweets</div>
            </div>
          </div>

          {evergreenLoading ? (
            <div className="text-center py-12 text-[var(--x-text-secondary)]">
              Loading evergreen posts...
            </div>
          ) : evergreenPosts.length === 0 ? (
            <div className="x-card p-12 text-center">
              <p className="text-[var(--x-text-secondary)] mb-4">
                No evergreen posts yet. Mark your best-performing posts as evergreen to automatically recycle them.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {evergreenPosts.map((post) => (
                <div key={post.id} className="x-card p-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <p className="mb-2">{post.content.slice(0, 200)}{post.content.length > 200 && "..."}</p>
                      <div className="flex flex-wrap gap-3 text-sm text-[var(--x-text-secondary)]">
                        <span>Likes: {post.likes}</span>
                        <span>Retweets: {post.retweets}</span>
                        <span>Replies: {post.replies}</span>
                        <span>Score: {post.engagementScore}</span>
                        <span>Recycled: {post.recycleCount}x</span>
                      </div>
                      <div className="mt-2 text-sm">
                        {post.eligibility.eligible ? (
                          <span className="text-[var(--x-green)]">Ready to retweet</span>
                        ) : (
                          <span className="text-[var(--x-text-secondary)]">
                            Next retweet: {formatDate(post.nextRetweetDate)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <span className="text-sm">Auto-Retweet</span>
                        <input
                          type="checkbox"
                          checked={post.autoRetweet}
                          onChange={() => toggleAutoRetweet(post.id, post.autoRetweet)}
                          className="w-4 h-4"
                        />
                      </label>
                      <button
                        onClick={() => removeEvergreen(post.id)}
                        className="text-sm text-[var(--x-red)] hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Retweet History */}
          {retweetHistory.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-bold mb-4">Retweet History</h3>
              <div className="x-card overflow-hidden">
                <table className="w-full">
                  <thead className="bg-[var(--x-bg-secondary)]">
                    <tr>
                      <th className="text-left p-3 text-sm font-medium">Content</th>
                      <th className="text-center p-3 text-sm font-medium">Times Recycled</th>
                      <th className="text-center p-3 text-sm font-medium">Last Recycled</th>
                      <th className="text-center p-3 text-sm font-medium">Engagement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {retweetHistory.map((item) => (
                      <tr key={item.id} className="border-t border-[var(--x-border)]">
                        <td className="p-3 text-sm">
                          {item.content.slice(0, 100)}{item.content.length > 100 && "..."}
                        </td>
                        <td className="p-3 text-center">{item.recycleCount}</td>
                        <td className="p-3 text-center text-sm text-[var(--x-text-secondary)]">
                          {formatTimeAgo(item.lastRecycled)}
                        </td>
                        <td className="p-3 text-center text-sm">
                          {item.likes} likes, {item.retweets} RTs
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Auto DM Tab */}
      {activeTab === "autodm" && (
        <div>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="x-card p-4">
              <div className="text-2xl font-bold">{autoDmStats.totalRules}</div>
              <div className="text-sm text-[var(--x-text-secondary)]">Total Rules</div>
            </div>
            <div className="x-card p-4">
              <div className="text-2xl font-bold">{autoDmStats.activeRules}</div>
              <div className="text-sm text-[var(--x-text-secondary)]">Active Rules</div>
            </div>
            <div className="x-card p-4">
              <div className="text-2xl font-bold">{autoDmStats.totalTriggered}</div>
              <div className="text-sm text-[var(--x-text-secondary)]">Total DMs Sent</div>
            </div>
          </div>

          <div className="flex justify-end mb-4">
            <button
              onClick={() => {
                resetNewRule();
                setEditingRule(null);
                setShowCreateRuleModal(true);
              }}
              className="btn-primary"
            >
              New Rule
            </button>
          </div>

          {autoDmLoading ? (
            <div className="text-center py-12 text-[var(--x-text-secondary)]">
              Loading auto DM rules...
            </div>
          ) : autoDmRules.length === 0 ? (
            <div className="x-card p-12 text-center">
              <p className="text-[var(--x-text-secondary)] mb-4">
                No auto DM rules yet. Create a rule to automatically send DMs when users comment with specific keywords.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {autoDmRules.map((rule) => (
                <div key={rule.id} className="x-card p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold">{rule.name}</h3>
                        <span
                          className={`x-badge ${rule.isActive ? "x-badge-green" : ""}`}
                        >
                          {rule.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-3">
                        {rule.keywords.map((keyword, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 bg-[var(--x-bg-secondary)] rounded text-sm"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>

                      <div className="text-sm text-[var(--x-text-secondary)] space-y-1">
                        <p>
                          <strong>Match Type:</strong> {rule.matchType.toLowerCase().replace("_", " ")}
                        </p>
                        <p>
                          <strong>Template:</strong> {rule.dmTemplate.slice(0, 100)}
                          {rule.dmTemplate.length > 100 && "..."}
                        </p>
                        {rule.minFollowers && (
                          <p>
                            <strong>Min Followers:</strong> {rule.minFollowers.toLocaleString()}
                          </p>
                        )}
                        <p>
                          <strong>Delay:</strong> {rule.delaySeconds}s
                        </p>
                      </div>

                      <div className="mt-3 flex gap-4 text-sm">
                        <span>
                          <strong>{rule.triggeredCount}</strong> times triggered
                        </span>
                        <span className="text-[var(--x-text-secondary)]">
                          Last: {formatTimeAgo(rule.lastTriggered)}
                        </span>
                        {rule.stats && (
                          <span className="text-[var(--x-text-secondary)]">
                            Avg: {rule.stats.dailyAverage}/day
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 items-end">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <span className="text-sm">Enabled</span>
                        <input
                          type="checkbox"
                          checked={rule.isActive}
                          onChange={() => toggleRule(rule.id)}
                          className="w-4 h-4"
                        />
                      </label>
                      <button
                        onClick={() => openEditModal(rule)}
                        className="text-sm text-[var(--x-blue)] hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteRule(rule.id)}
                        className="text-sm text-[var(--x-red)] hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Rule Modal */}
      {showCreateRuleModal && (
        <div className="fixed inset-0 x-modal-overlay flex items-center justify-center z-50">
          <div className="x-modal p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingRule ? "Edit Rule" : "Create Auto DM Rule"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Rule Name *</label>
                <input
                  type="text"
                  placeholder="e.g., Free Guide Request"
                  value={newRule.name}
                  onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                  className="x-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Trigger Type</label>
                <select
                  value={newRule.triggerType}
                  onChange={(e) => setNewRule({ ...newRule, triggerType: e.target.value })}
                  className="x-input"
                >
                  <option value="KEYWORD_COMMENT">Comment contains keyword</option>
                  <option value="KEYWORD_MENTION">Mention contains keyword</option>
                  <option value="NEW_FOLLOWER">New follower</option>
                  <option value="POST_ENGAGEMENT">Post engagement threshold</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Keywords * (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="interested, send me, want to learn"
                  value={newRule.keywords}
                  onChange={(e) => setNewRule({ ...newRule, keywords: e.target.value })}
                  className="x-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Match Type</label>
                <select
                  value={newRule.matchType}
                  onChange={(e) => setNewRule({ ...newRule, matchType: e.target.value })}
                  className="x-input"
                >
                  <option value="CONTAINS">Contains</option>
                  <option value="EXACT">Exact match</option>
                  <option value="STARTS_WITH">Starts with</option>
                  <option value="REGEX">Regex pattern</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">DM Template *</label>
                <textarea
                  placeholder="Hey {username}! Thanks for your interest. Here's the link..."
                  value={newRule.dmTemplate}
                  onChange={(e) => setNewRule({ ...newRule, dmTemplate: e.target.value })}
                  className="x-input"
                  rows={4}
                />
                <p className="text-xs text-[var(--x-text-secondary)] mt-1">
                  Use {"{username}"} for recipient&apos;s name
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Delay (seconds)</label>
                  <input
                    type="number"
                    value={newRule.delaySeconds}
                    onChange={(e) =>
                      setNewRule({ ...newRule, delaySeconds: parseInt(e.target.value) || 60 })
                    }
                    className="x-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Max DMs/Day</label>
                  <input
                    type="number"
                    value={newRule.maxDailyDms}
                    onChange={(e) =>
                      setNewRule({ ...newRule, maxDailyDms: parseInt(e.target.value) || 50 })
                    }
                    className="x-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Min Followers (optional)
                </label>
                <input
                  type="number"
                  placeholder="Leave empty for no minimum"
                  value={newRule.minFollowers}
                  onChange={(e) => setNewRule({ ...newRule, minFollowers: e.target.value })}
                  className="x-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Exclude Keywords (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="spam, unsubscribe"
                  value={newRule.excludeKeywords}
                  onChange={(e) =>
                    setNewRule({ ...newRule, excludeKeywords: e.target.value })
                  }
                  className="x-input"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateRuleModal(false);
                  setEditingRule(null);
                  resetNewRule();
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={editingRule ? updateRule : createRule}
                className="btn-primary"
              >
                {editingRule ? "Update Rule" : "Create Rule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
