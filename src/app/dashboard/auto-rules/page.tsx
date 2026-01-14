"use client";

import { useState, useEffect } from "react";
import {
  BoltIcon,
  PlayIcon,
  PauseIcon,
  PlusIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  ChartBarIcon,
  CheckCircleIcon,
  XCircleIcon,
  CogIcon,
  SparklesIcon,
  ArrowPathIcon,
  BeakerIcon,
} from "@heroicons/react/24/outline";

type TriggerType =
  | "new_follower"
  | "mention"
  | "comment"
  | "dm_received"
  | "post_engagement"
  | "keyword_detected"
  | "scheduled_time"
  | "hashtag_used"
  | "competitor_post"
  | "sentiment_change";

type ActionType =
  | "send_dm"
  | "reply_comment"
  | "like_post"
  | "repost"
  | "cross_post"
  | "send_notification"
  | "add_to_list"
  | "pause_schedule"
  | "trigger_webhook"
  | "send_email"
  | "create_task";

type Platform = "twitter" | "instagram" | "facebook" | "linkedin" | "tiktok" | "all";

interface AutomationRule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  trigger: {
    type: TriggerType;
    platform: Platform;
    conditions: any[];
  };
  actions: {
    type: ActionType;
    config: any;
  }[];
  stats: {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    lastExecutedAt?: string;
  };
  createdAt: string;
}

interface RuleTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  trigger: any;
  actions: any[];
  popularity: number;
}

interface AutomationStats {
  totalRules: number;
  activeRules: number;
  totalExecutions: number;
  successRate: number;
  topPerformingRules: { ruleId: string; name: string; executions: number }[];
  executionsByDay: Record<string, number>;
}

const TRIGGER_LABELS: Record<TriggerType, { name: string; icon: string }> = {
  new_follower: { name: "New Follower", icon: "👤" },
  mention: { name: "Mention", icon: "@" },
  comment: { name: "New Comment", icon: "💬" },
  dm_received: { name: "DM Received", icon: "✉️" },
  post_engagement: { name: "Post Engagement", icon: "❤️" },
  keyword_detected: { name: "Keyword Detected", icon: "🔍" },
  scheduled_time: { name: "Scheduled Time", icon: "⏰" },
  hashtag_used: { name: "Hashtag Used", icon: "#" },
  competitor_post: { name: "Competitor Post", icon: "🎯" },
  sentiment_change: { name: "Sentiment Change", icon: "📊" },
};

const ACTION_LABELS: Record<ActionType, string> = {
  send_dm: "Send DM",
  reply_comment: "Reply",
  like_post: "Like",
  repost: "Repost",
  cross_post: "Cross-post",
  send_notification: "Notify",
  add_to_list: "Add to List",
  pause_schedule: "Pause Schedule",
  trigger_webhook: "Webhook",
  send_email: "Email",
  create_task: "Create Task",
};

const PLATFORM_LABELS: Record<Platform, string> = {
  twitter: "X (Twitter)",
  instagram: "Instagram",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  all: "All Platforms",
};

export default function AutoRulesPage() {
  const [activeTab, setActiveTab] = useState<"rules" | "templates" | "stats">("rules");
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [templates, setTemplates] = useState<RuleTemplate[]>([]);
  const [stats, setStats] = useState<AutomationStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Create rule form
  const [ruleName, setRuleName] = useState("");
  const [ruleDescription, setRuleDescription] = useState("");
  const [triggerType, setTriggerType] = useState<TriggerType>("new_follower");
  const [triggerPlatform, setTriggerPlatform] = useState<Platform>("all");
  const [selectedActions, setSelectedActions] = useState<ActionType[]>([]);
  const [actionConfigs, setActionConfigs] = useState<Record<ActionType, any>>({} as any);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [rulesRes, templatesRes, statsRes] = await Promise.all([
        fetch("/api/automation?action=rules"),
        fetch("/api/automation?action=templates"),
        fetch("/api/automation?action=stats"),
      ]);

      const rulesData = await rulesRes.json();
      const templatesData = await templatesRes.json();
      const statsData = await statsRes.json();

      setRules(rulesData.rules || []);
      setTemplates(templatesData.templates || []);
      setStats(statsData.stats || null);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    }
  };

  const toggleRule = async (ruleId: string) => {
    try {
      const response = await fetch("/api/automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle", ruleId }),
      });

      if (response.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error("Failed to toggle rule:", error);
    }
  };

  const deleteRule = async (ruleId: string) => {
    if (!confirm("Are you sure you want to delete this rule?")) return;

    try {
      const response = await fetch("/api/automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", ruleId }),
      });

      if (response.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error("Failed to delete rule:", error);
    }
  };

  const duplicateRule = async (ruleId: string) => {
    try {
      const response = await fetch("/api/automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "duplicate", ruleId }),
      });

      if (response.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error("Failed to duplicate rule:", error);
    }
  };

  const testRule = async (ruleId: string) => {
    setLoading(true);
    try {
      const response = await fetch("/api/automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test-rule",
          ruleId,
          mockData: { test: true },
        }),
      });

      if (response.ok) {
        await fetchData();
        alert("Test execution completed successfully!");
      }
    } catch (error) {
      console.error("Failed to test rule:", error);
    } finally {
      setLoading(false);
    }
  };

  const createFromTemplate = async (templateId: string) => {
    setLoading(true);
    try {
      const response = await fetch("/api/automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create-from-template", templateId }),
      });

      if (response.ok) {
        await fetchData();
        setActiveTab("rules");
      }
    } catch (error) {
      console.error("Failed to create from template:", error);
    } finally {
      setLoading(false);
    }
  };

  const createRule = async () => {
    if (!ruleName || selectedActions.length === 0) return;

    setLoading(true);
    try {
      const response = await fetch("/api/automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          name: ruleName,
          description: ruleDescription,
          trigger: {
            type: triggerType,
            platform: triggerPlatform,
            conditions: [],
          },
          actions: selectedActions.map((type) => ({
            type,
            config: actionConfigs[type] || {},
          })),
        }),
      });

      if (response.ok) {
        await fetchData();
        setShowCreateModal(false);
        resetForm();
      }
    } catch (error) {
      console.error("Failed to create rule:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setRuleName("");
    setRuleDescription("");
    setTriggerType("new_follower");
    setTriggerPlatform("all");
    setSelectedActions([]);
    setActionConfigs({} as any);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BoltIcon className="w-7 h-7 text-yellow-400" />
            Automation Rules Engine
          </h1>
          <p className="text-zinc-400 mt-1">
            Create IFTTT-style automations for your social media
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <PlusIcon className="w-4 h-4" />
          Create Rule
        </button>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <p className="text-zinc-400 text-sm">Total Rules</p>
            <p className="text-2xl font-bold text-white mt-1">{stats.totalRules}</p>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <p className="text-zinc-400 text-sm">Active Rules</p>
            <p className="text-2xl font-bold text-green-400 mt-1">{stats.activeRules}</p>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <p className="text-zinc-400 text-sm">Total Executions</p>
            <p className="text-2xl font-bold text-indigo-400 mt-1">{stats.totalExecutions}</p>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <p className="text-zinc-400 text-sm">Success Rate</p>
            <p className="text-2xl font-bold text-yellow-400 mt-1">{stats.successRate}%</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-1 bg-zinc-900/50 p-1 rounded-lg w-fit">
        {[
          { id: "rules", label: "My Rules", icon: CogIcon },
          { id: "templates", label: "Templates", icon: SparklesIcon },
          { id: "stats", label: "Analytics", icon: ChartBarIcon },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
              activeTab === id
                ? "bg-yellow-600 text-white"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Rules Tab */}
      {activeTab === "rules" && (
        <div className="space-y-4">
          {rules.length === 0 ? (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-12 text-center">
              <BoltIcon className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No automation rules yet</h3>
              <p className="text-zinc-400 mb-4">
                Create your first rule or start from a template
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Create Rule
                </button>
                <button
                  onClick={() => setActiveTab("templates")}
                  className="px-4 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600"
                >
                  Browse Templates
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className={`bg-zinc-900/50 border rounded-xl p-6 ${
                    rule.enabled ? "border-green-500/30" : "border-zinc-800"
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${
                        rule.enabled ? "bg-green-500/20" : "bg-zinc-800"
                      }`}>
                        {TRIGGER_LABELS[rule.trigger.type]?.icon || "⚡"}
                      </div>
                      <div>
                        <h3 className="text-white font-medium">{rule.name}</h3>
                        <p className="text-sm text-zinc-400">
                          {TRIGGER_LABELS[rule.trigger.type]?.name} → {rule.actions.length} action(s)
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleRule(rule.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        rule.enabled
                          ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                          : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                      }`}
                    >
                      {rule.enabled ? (
                        <PauseIcon className="w-5 h-5" />
                      ) : (
                        <PlayIcon className="w-5 h-5" />
                      )}
                    </button>
                  </div>

                  {rule.description && (
                    <p className="text-sm text-zinc-500 mb-4">{rule.description}</p>
                  )}

                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-300">
                      {PLATFORM_LABELS[rule.trigger.platform]}
                    </span>
                    {rule.actions.map((action, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded text-xs"
                      >
                        {ACTION_LABELS[action.type]}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-xs text-zinc-500 pt-4 border-t border-zinc-800">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <ArrowPathIcon className="w-3 h-3" />
                        {rule.stats.totalExecutions} runs
                      </span>
                      {rule.stats.successfulExecutions > 0 && (
                        <span className="flex items-center gap-1 text-green-400">
                          <CheckCircleIcon className="w-3 h-3" />
                          {rule.stats.successfulExecutions}
                        </span>
                      )}
                      {rule.stats.failedExecutions > 0 && (
                        <span className="flex items-center gap-1 text-red-400">
                          <XCircleIcon className="w-3 h-3" />
                          {rule.stats.failedExecutions}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => testRule(rule.id)}
                        disabled={loading}
                        className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white"
                        title="Test Rule"
                      >
                        <BeakerIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => duplicateRule(rule.id)}
                        className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white"
                        title="Duplicate"
                      >
                        <DocumentDuplicateIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteRule(rule.id)}
                        className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-red-400"
                        title="Delete"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === "templates" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">
                    {TRIGGER_LABELS[template.trigger.type as TriggerType]?.icon || "⚡"}
                  </span>
                  <span className="px-2 py-0.5 bg-zinc-800 rounded text-xs text-zinc-400 capitalize">
                    {template.category}
                  </span>
                </div>
                <span className="text-xs text-zinc-500">{template.popularity}% popular</span>
              </div>

              <h3 className="text-white font-medium mb-2">{template.name}</h3>
              <p className="text-sm text-zinc-400 mb-4">{template.description}</p>

              <div className="flex flex-wrap gap-1 mb-4">
                {template.actions.map((action: any, i: number) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded text-xs"
                  >
                    {ACTION_LABELS[action.type as ActionType]}
                  </span>
                ))}
              </div>

              <button
                onClick={() => createFromTemplate(template.id)}
                disabled={loading}
                className="w-full px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 disabled:opacity-50 text-sm"
              >
                Use Template
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Stats Tab */}
      {activeTab === "stats" && stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Executions (Last 7 Days)</h2>
            <div className="flex items-end gap-2 h-40">
              {Object.entries(stats.executionsByDay).map(([date, count]) => {
                const maxCount = Math.max(...Object.values(stats.executionsByDay));
                const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
                return (
                  <div key={date} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-indigo-500/50 rounded-t"
                      style={{ height: `${height}%` }}
                    />
                    <span className="text-xs text-zinc-500">
                      {new Date(date).toLocaleDateString(undefined, { weekday: "short" })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Top Performing Rules</h2>
            {stats.topPerformingRules.length === 0 ? (
              <p className="text-zinc-500 text-center py-8">No executions yet</p>
            ) : (
              <div className="space-y-3">
                {stats.topPerformingRules.map((rule, i) => (
                  <div key={rule.ruleId} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        i === 0 ? "bg-yellow-500 text-black" :
                        i === 1 ? "bg-zinc-400 text-black" :
                        i === 2 ? "bg-orange-700 text-white" :
                        "bg-zinc-700 text-zinc-300"
                      }`}>
                        {i + 1}
                      </span>
                      <span className="text-white">{rule.name}</span>
                    </div>
                    <span className="text-indigo-400 font-medium">{rule.executions} runs</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Rule Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-zinc-800">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Create Automation Rule</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-zinc-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Rule Name</label>
                  <input
                    type="text"
                    value={ruleName}
                    onChange={(e) => setRuleName(e.target.value)}
                    placeholder="e.g., Welcome new followers"
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Description</label>
                  <input
                    type="text"
                    value={ruleDescription}
                    onChange={(e) => setRuleDescription(e.target.value)}
                    placeholder="What does this rule do?"
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">When this happens...</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(TRIGGER_LABELS) as TriggerType[]).map((trigger) => (
                    <button
                      key={trigger}
                      onClick={() => setTriggerType(trigger)}
                      className={`flex items-center gap-2 p-3 rounded-lg border transition-colors ${
                        triggerType === trigger
                          ? "bg-indigo-500/20 border-indigo-500/50 text-white"
                          : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600"
                      }`}
                    >
                      <span>{TRIGGER_LABELS[trigger].icon}</span>
                      <span className="text-sm">{TRIGGER_LABELS[trigger].name}</span>
                    </button>
                  ))}
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-zinc-400 mb-2">On Platform</label>
                  <select
                    value={triggerPlatform}
                    onChange={(e) => setTriggerPlatform(e.target.value as Platform)}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  >
                    {(Object.keys(PLATFORM_LABELS) as Platform[]).map((platform) => (
                      <option key={platform} value={platform}>
                        {PLATFORM_LABELS[platform]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Then do this...</label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(ACTION_LABELS) as ActionType[]).map((action) => (
                    <button
                      key={action}
                      onClick={() => {
                        setSelectedActions((prev) =>
                          prev.includes(action)
                            ? prev.filter((a) => a !== action)
                            : [...prev, action]
                        );
                      }}
                      className={`p-2 rounded-lg border text-xs transition-colors ${
                        selectedActions.includes(action)
                          ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-300"
                          : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600"
                      }`}
                    >
                      {ACTION_LABELS[action]}
                    </button>
                  ))}
                </div>
              </div>

              {selectedActions.includes("send_dm") && (
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">DM Template</label>
                  <textarea
                    value={actionConfigs.send_dm?.template || ""}
                    onChange={(e) => setActionConfigs({ ...actionConfigs, send_dm: { template: e.target.value } })}
                    rows={3}
                    placeholder="Thanks for following!"
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              {selectedActions.includes("reply_comment") && (
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Reply Template</label>
                  <textarea
                    value={actionConfigs.reply_comment?.template || ""}
                    onChange={(e) => setActionConfigs({ ...actionConfigs, reply_comment: { template: e.target.value } })}
                    rows={3}
                    placeholder="Thanks for your comment!"
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}
            </div>

            <div className="p-6 border-t border-zinc-800 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700"
              >
                Cancel
              </button>
              <button
                onClick={createRule}
                disabled={loading || !ruleName || selectedActions.length === 0}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create Rule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
