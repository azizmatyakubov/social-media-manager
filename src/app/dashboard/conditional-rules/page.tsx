"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";

interface ConditionalRule {
  id: string;
  name: string;
  triggerMetric: string;
  triggerOperator: string;
  triggerValue: number;
  triggerTimeframe: number;
  actionType: string;
  actionContent: string | null;
  actionDelay: number;
  triggeredCount: number;
  lastTriggered: string | null;
  isActive: boolean;
  createdAt: string;
  _count?: {
    posts: number;
  };
}

interface RuleHistory {
  id: string;
  content: string;
  likes: number;
  retweets: number;
  replies: number;
  impressions: number;
  postedAt: string;
  platform: string;
}

const TRIGGER_METRICS = [
  { value: "likes", label: "Likes" },
  { value: "retweets", label: "Retweets" },
  { value: "replies", label: "Replies" },
  { value: "impressions", label: "Impressions" },
  { value: "shares", label: "Shares" },
  { value: "clicks", label: "Clicks" },
];

const TRIGGER_OPERATORS = [
  { value: "gte", label: ">= (greater than or equal)" },
  { value: "lte", label: "<= (less than or equal)" },
  { value: "eq", label: "== (equal to)" },
  { value: "gt", label: "> (greater than)" },
  { value: "lt", label: "< (less than)" },
];

const ACTION_TYPES = [
  { value: "ADD_COMMENT", label: "Add Comment", needsContent: true },
  { value: "SEND_DM", label: "Send DM", needsContent: true },
  { value: "RETWEET", label: "Retweet", needsContent: false },
  { value: "PIN_POST", label: "Pin Post", needsContent: false },
  { value: "NOTIFY", label: "Send Notification", needsContent: false },
];

export default function ConditionalRulesPage() {
  const { data: session, status } = useSession();
  const [rules, setRules] = useState<ConditionalRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedRuleHistory, setSelectedRuleHistory] = useState<RuleHistory[]>([]);
  const [selectedRuleName, setSelectedRuleName] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingRule, setEditingRule] = useState<ConditionalRule | null>(null);

  const [newRule, setNewRule] = useState({
    name: "",
    triggerMetric: "likes",
    triggerOperator: "gte",
    triggerValue: 100,
    triggerTimeframe: 24,
    actionType: "ADD_COMMENT",
    actionContent: "",
    actionDelay: 0,
  });

  useEffect(() => {
    if (status === "authenticated") {
      fetchRules();
    }
  }, [status]);

  if (status === "loading") return <div className="p-8">Loading...</div>;
  if (status === "unauthenticated") redirect("/login");

  async function fetchRules() {
    try {
      const res = await fetch("/api/conditional-rules");
      const data = await res.json();
      if (Array.isArray(data)) {
        setRules(data);
      }
    } catch (error) {
      console.error("Failed to fetch rules:", error);
    } finally {
      setLoading(false);
    }
  }

  async function createRule() {
    if (!newRule.name) {
      alert("Please enter a rule name");
      return;
    }

    const selectedAction = ACTION_TYPES.find((a) => a.value === newRule.actionType);
    if (selectedAction?.needsContent && !newRule.actionContent) {
      alert("Please enter action content");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/conditional-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRule),
      });

      if (res.ok) {
        setShowCreateModal(false);
        resetForm();
        fetchRules();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to create rule");
      }
    } catch (error) {
      console.error("Failed to create rule:", error);
      alert("Failed to create rule");
    } finally {
      setSaving(false);
    }
  }

  async function updateRule() {
    if (!editingRule) return;

    setSaving(true);
    try {
      const res = await fetch("/api/conditional-rules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ruleId: editingRule.id,
          name: newRule.name,
          triggerMetric: newRule.triggerMetric,
          triggerOperator: newRule.triggerOperator,
          triggerValue: newRule.triggerValue,
          triggerTimeframe: newRule.triggerTimeframe,
          actionType: newRule.actionType,
          actionContent: newRule.actionContent,
          actionDelay: newRule.actionDelay,
        }),
      });

      if (res.ok) {
        setShowCreateModal(false);
        setEditingRule(null);
        resetForm();
        fetchRules();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to update rule");
      }
    } catch (error) {
      console.error("Failed to update rule:", error);
      alert("Failed to update rule");
    } finally {
      setSaving(false);
    }
  }

  async function toggleRuleActive(ruleId: string, isActive: boolean) {
    try {
      await fetch("/api/conditional-rules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ruleId, isActive: !isActive }),
      });
      fetchRules();
    } catch (error) {
      console.error("Failed to toggle rule:", error);
    }
  }

  async function deleteRule(ruleId: string) {
    if (!confirm("Are you sure you want to delete this rule?")) return;

    try {
      await fetch(`/api/conditional-rules?ruleId=${ruleId}`, {
        method: "DELETE",
      });
      fetchRules();
    } catch (error) {
      console.error("Failed to delete rule:", error);
    }
  }

  async function viewHistory(rule: ConditionalRule) {
    try {
      const res = await fetch(`/api/conditional-rules?ruleId=${rule.id}&action=history`);
      const data = await res.json();
      setSelectedRuleHistory(data);
      setSelectedRuleName(rule.name);
      setShowHistoryModal(true);
    } catch (error) {
      console.error("Failed to fetch history:", error);
    }
  }

  function openEditModal(rule: ConditionalRule) {
    setEditingRule(rule);
    setNewRule({
      name: rule.name,
      triggerMetric: rule.triggerMetric,
      triggerOperator: rule.triggerOperator,
      triggerValue: rule.triggerValue,
      triggerTimeframe: rule.triggerTimeframe,
      actionType: rule.actionType,
      actionContent: rule.actionContent || "",
      actionDelay: rule.actionDelay,
    });
    setShowCreateModal(true);
  }

  function resetForm() {
    setNewRule({
      name: "",
      triggerMetric: "likes",
      triggerOperator: "gte",
      triggerValue: 100,
      triggerTimeframe: 24,
      actionType: "ADD_COMMENT",
      actionContent: "",
      actionDelay: 0,
    });
    setEditingRule(null);
  }

  function getOperatorSymbol(operator: string): string {
    const map: Record<string, string> = {
      gte: ">=",
      lte: "<=",
      eq: "=",
      gt: ">",
      lt: "<",
    };
    return map[operator] || operator;
  }

  function getActionLabel(actionType: string): string {
    const action = ACTION_TYPES.find((a) => a.value === actionType);
    return action?.label || actionType;
  }

  function formatDate(dateString: string | null): string {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const selectedActionNeedsContent = ACTION_TYPES.find(
    (a) => a.value === newRule.actionType
  )?.needsContent;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Conditional Rules</h1>
          <p className="text-[var(--x-text-secondary)]">
            Automatically take actions when your posts reach engagement thresholds
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="btn-primary"
        >
          Create Rule
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[var(--x-text-secondary)]">
          Loading rules...
        </div>
      ) : rules.length === 0 ? (
        <div className="x-card p-12 text-center">
          <div className="text-4xl mb-4">🎯</div>
          <h3 className="text-lg font-bold mb-2">No conditional rules yet</h3>
          <p className="text-[var(--x-text-secondary)] mb-4">
            Create rules to automatically take actions when your posts reach certain engagement levels.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary"
          >
            Create Your First Rule
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {rules.map((rule) => (
            <div key={rule.id} className="x-card p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-lg">{rule.name}</h3>
                    <span
                      className={`x-badge ${
                        rule.isActive ? "x-badge-green" : "x-badge-gray"
                      }`}
                    >
                      {rule.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="text-sm text-[var(--x-text-secondary)] mb-3">
                    <span className="font-medium">Trigger:</span> When{" "}
                    <span className="text-[var(--x-blue)]">{rule.triggerMetric}</span>{" "}
                    {getOperatorSymbol(rule.triggerOperator)}{" "}
                    <span className="text-[var(--x-blue)]">{rule.triggerValue}</span>{" "}
                    within{" "}
                    <span className="text-[var(--x-blue)]">{rule.triggerTimeframe}h</span>{" "}
                    of posting
                  </div>

                  <div className="text-sm text-[var(--x-text-secondary)] mb-3">
                    <span className="font-medium">Action:</span>{" "}
                    <span className="text-[var(--x-green)]">
                      {getActionLabel(rule.actionType)}
                    </span>
                    {rule.actionContent && (
                      <span className="ml-2 text-xs">
                        - &quot;{rule.actionContent.substring(0, 50)}
                        {rule.actionContent.length > 50 ? "..." : ""}&quot;
                      </span>
                    )}
                  </div>

                  <div className="flex gap-6 text-xs text-[var(--x-text-secondary)]">
                    <span>
                      Triggered: <strong>{rule.triggeredCount}</strong> times
                    </span>
                    <span>
                      Last triggered: <strong>{formatDate(rule.lastTriggered)}</strong>
                    </span>
                    <span>
                      Posts matched: <strong>{rule._count?.posts || 0}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => viewHistory(rule)}
                    className="btn-secondary text-sm"
                    title="View History"
                  >
                    History
                  </button>
                  <button
                    onClick={() => openEditModal(rule)}
                    className="btn-secondary text-sm"
                    title="Edit Rule"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => toggleRuleActive(rule.id, rule.isActive)}
                    className={`text-sm px-3 py-1.5 rounded-lg ${
                      rule.isActive
                        ? "bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30"
                        : "bg-green-500/20 text-green-500 hover:bg-green-500/30"
                    }`}
                  >
                    {rule.isActive ? "Pause" : "Activate"}
                  </button>
                  <button
                    onClick={() => deleteRule(rule.id)}
                    className="text-sm px-3 py-1.5 rounded-lg bg-red-500/20 text-red-500 hover:bg-red-500/30"
                    title="Delete Rule"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Rule Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 x-modal-overlay flex items-center justify-center z-50">
          <div className="x-modal p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-6">
              {editingRule ? "Edit Rule" : "Create Conditional Rule"}
            </h2>

            <div className="space-y-4">
              {/* Rule Name */}
              <div>
                <label className="block text-sm font-medium mb-1">Rule Name</label>
                <input
                  type="text"
                  placeholder="e.g., Auto-comment on viral posts"
                  value={newRule.name}
                  onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                  className="x-input"
                />
              </div>

              {/* Trigger Section */}
              <div className="p-4 bg-[var(--x-bg-secondary)] rounded-lg">
                <h3 className="font-medium mb-3">Trigger Condition</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-[var(--x-text-secondary)] mb-1">
                      Metric
                    </label>
                    <select
                      value={newRule.triggerMetric}
                      onChange={(e) =>
                        setNewRule({ ...newRule, triggerMetric: e.target.value })
                      }
                      className="x-input"
                    >
                      {TRIGGER_METRICS.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--x-text-secondary)] mb-1">
                      Operator
                    </label>
                    <select
                      value={newRule.triggerOperator}
                      onChange={(e) =>
                        setNewRule({ ...newRule, triggerOperator: e.target.value })
                      }
                      className="x-input"
                    >
                      {TRIGGER_OPERATORS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--x-text-secondary)] mb-1">
                      Value
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={newRule.triggerValue}
                      onChange={(e) =>
                        setNewRule({
                          ...newRule,
                          triggerValue: parseInt(e.target.value) || 0,
                        })
                      }
                      className="x-input"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-xs text-[var(--x-text-secondary)] mb-1">
                    Timeframe (hours after posting)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="168"
                    value={newRule.triggerTimeframe}
                    onChange={(e) =>
                      setNewRule({
                        ...newRule,
                        triggerTimeframe: parseInt(e.target.value) || 24,
                      })
                    }
                    className="x-input"
                  />
                  <p className="text-xs text-[var(--x-text-secondary)] mt-1">
                    Rule will only trigger within this time window after posting
                  </p>
                </div>
              </div>

              {/* Action Section */}
              <div className="p-4 bg-[var(--x-bg-secondary)] rounded-lg">
                <h3 className="font-medium mb-3">Action to Take</h3>
                <div>
                  <label className="block text-xs text-[var(--x-text-secondary)] mb-1">
                    Action Type
                  </label>
                  <select
                    value={newRule.actionType}
                    onChange={(e) =>
                      setNewRule({ ...newRule, actionType: e.target.value })
                    }
                    className="x-input"
                  >
                    {ACTION_TYPES.map((a) => (
                      <option key={a.value} value={a.value}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedActionNeedsContent && (
                  <div className="mt-3">
                    <label className="block text-xs text-[var(--x-text-secondary)] mb-1">
                      {newRule.actionType === "ADD_COMMENT"
                        ? "Comment Text"
                        : "DM Template"}
                    </label>
                    <textarea
                      placeholder={
                        newRule.actionType === "ADD_COMMENT"
                          ? "Thanks for the engagement! Check out my bio for more..."
                          : "Hi! Thanks for engaging with my post..."
                      }
                      value={newRule.actionContent}
                      onChange={(e) =>
                        setNewRule({ ...newRule, actionContent: e.target.value })
                      }
                      className="x-input"
                      rows={3}
                    />
                  </div>
                )}

                <div className="mt-3">
                  <label className="block text-xs text-[var(--x-text-secondary)] mb-1">
                    Action Delay (minutes)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newRule.actionDelay}
                    onChange={(e) =>
                      setNewRule({
                        ...newRule,
                        actionDelay: parseInt(e.target.value) || 0,
                      })
                    }
                    className="x-input"
                  />
                  <p className="text-xs text-[var(--x-text-secondary)] mt-1">
                    Wait this many minutes before taking action (0 = immediate)
                  </p>
                </div>
              </div>

              {/* Preview */}
              <div className="p-4 border border-[var(--x-border)] rounded-lg">
                <h4 className="text-sm font-medium mb-2">Rule Summary</h4>
                <p className="text-sm text-[var(--x-text-secondary)]">
                  When a post gets{" "}
                  <span className="text-[var(--x-blue)] font-medium">
                    {getOperatorSymbol(newRule.triggerOperator)} {newRule.triggerValue}{" "}
                    {newRule.triggerMetric}
                  </span>{" "}
                  within{" "}
                  <span className="text-[var(--x-blue)] font-medium">
                    {newRule.triggerTimeframe} hours
                  </span>{" "}
                  of posting, then{" "}
                  <span className="text-[var(--x-green)] font-medium">
                    {getActionLabel(newRule.actionType).toLowerCase()}
                  </span>
                  {newRule.actionDelay > 0 && (
                    <span>
                      {" "}
                      after waiting{" "}
                      <span className="text-[var(--x-blue)] font-medium">
                        {newRule.actionDelay} minutes
                      </span>
                    </span>
                  )}
                  .
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={editingRule ? updateRule : createRule}
                disabled={saving}
                className="btn-primary"
              >
                {saving
                  ? "Saving..."
                  : editingRule
                  ? "Update Rule"
                  : "Create Rule"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 x-modal-overlay flex items-center justify-center z-50">
          <div className="x-modal p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">
                Rule History: {selectedRuleName}
              </h2>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-[var(--x-text-secondary)] hover:text-[var(--x-text-primary)]"
              >
                Close
              </button>
            </div>

            {selectedRuleHistory.length === 0 ? (
              <div className="text-center py-8 text-[var(--x-text-secondary)]">
                No posts have triggered this rule yet.
              </div>
            ) : (
              <div className="space-y-3">
                {selectedRuleHistory.map((post) => (
                  <div
                    key={post.id}
                    className="p-4 bg-[var(--x-bg-secondary)] rounded-lg"
                  >
                    <p className="text-sm mb-2">{post.content}</p>
                    <div className="flex gap-4 text-xs text-[var(--x-text-secondary)]">
                      <span>Likes: {post.likes}</span>
                      <span>Retweets: {post.retweets}</span>
                      <span>Replies: {post.replies}</span>
                      <span>Impressions: {post.impressions}</span>
                      <span>Posted: {formatDate(post.postedAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
