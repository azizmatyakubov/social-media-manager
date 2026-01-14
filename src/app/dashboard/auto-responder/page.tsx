"use client";

import { useState, useEffect } from "react";

interface AutoResponse {
  id: string;
  name: string;
  type: "comment" | "dm" | "mention" | "review";
  platform: string[];
  trigger: {
    type: "keyword" | "sentiment" | "question" | "first_time" | "follow" | "all";
    keywords?: string[];
    keywordMatch?: "any" | "all" | "exact";
    sentiment?: "positive" | "negative" | "neutral";
    excludeKeywords?: string[];
  };
  response: {
    type: "text" | "template" | "ai";
    messages: string[];
    tone?: string;
  };
  settings: {
    delay: { min: number; max: number };
    rateLimit: { maxPerHour: number; maxPerDay: number };
  };
  status: "active" | "paused" | "draft";
  analytics: {
    triggered: number;
    responded: number;
    successRate: number;
    lastTriggeredAt?: string;
  };
  createdAt: string;
}

interface ResponseLog {
  id: string;
  responseId: string;
  type: string;
  platform: string;
  incomingMessage: string;
  respondedWith: string;
  senderUsername: string;
  status: "sent" | "pending" | "failed" | "skipped";
  createdAt: string;
}

interface Template {
  id: string;
  name: string;
  category: string;
  content: string;
  variables: string[];
  usageCount: number;
}

interface Analytics {
  totalResponses: number;
  activeResponses: number;
  totalTriggered: number;
  totalResponded: number;
  avgSuccessRate: number;
  byType: Record<string, { count: number; responded: number }>;
  byPlatform: Record<string, { count: number; responded: number }>;
  recentActivity: ResponseLog[];
}

export default function AutoResponderPage() {
  const [activeTab, setActiveTab] = useState<"responses" | "templates" | "logs" | "analytics">("responses");
  const [responses, setResponses] = useState<AutoResponse[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [logs, setLogs] = useState<ResponseLog[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState<AutoResponse | null>(null);
  const [testMessage, setTestMessage] = useState("");
  const [testResult, setTestResult] = useState<{ matched: boolean; reply?: string } | null>(null);

  // Form states
  const [newResponse, setNewResponse] = useState({
    name: "",
    type: "comment" as const,
    platform: ["twitter"],
    trigger: {
      type: "keyword" as const,
      keywords: [] as string[],
      keywordMatch: "any" as const,
    },
    response: {
      type: "text" as const,
      messages: [""],
      tone: "friendly",
    },
    status: "draft" as const,
  });
  const [keywordInput, setKeywordInput] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [responsesRes, templatesRes, logsRes, analyticsRes] = await Promise.all([
        fetch("/api/auto-responder?action=responses"),
        fetch("/api/auto-responder?action=templates"),
        fetch("/api/auto-responder?action=logs&limit=50"),
        fetch("/api/auto-responder?action=analytics"),
      ]);

      const [responsesData, templatesData, logsData, analyticsData] = await Promise.all([
        responsesRes.json(),
        templatesRes.json(),
        logsRes.json(),
        analyticsRes.json(),
      ]);

      setResponses(responsesData.responses || []);
      setTemplates(templatesData.templates || []);
      setLogs(logsData.logs || []);
      setAnalytics(analyticsData.analytics || null);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  const createResponse = async () => {
    if (!newResponse.name || newResponse.response.messages.filter(m => m.trim()).length === 0) return;

    try {
      const res = await fetch("/api/auto-responder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          ...newResponse,
          settings: {
            delay: { min: 30, max: 120 },
            rateLimit: { maxPerHour: 50, maxPerDay: 500 },
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setResponses([data.response, ...responses]);
        setShowCreateModal(false);
        resetForm();
      }
    } catch (error) {
      console.error("Failed to create response:", error);
    }
  };

  const toggleResponse = async (id: string) => {
    try {
      const res = await fetch("/api/auto-responder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle", responseId: id }),
      });

      if (res.ok) {
        const data = await res.json();
        setResponses(responses.map((r) => (r.id === id ? data.response : r)));
      }
    } catch (error) {
      console.error("Failed to toggle response:", error);
    }
  };

  const deleteResponse = async (id: string) => {
    try {
      const res = await fetch("/api/auto-responder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", responseId: id }),
      });

      if (res.ok) {
        setResponses(responses.filter((r) => r.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete response:", error);
    }
  };

  const testAutoResponse = async () => {
    if (!testMessage.trim()) return;

    try {
      const res = await fetch("/api/auto-responder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test-response",
          message: testMessage,
          platform: "twitter",
          senderUsername: "test_user",
          type: selectedResponse?.type || "comment",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setTestResult(data.result);
      }
    } catch (error) {
      console.error("Failed to test response:", error);
    }
  };

  const addKeyword = () => {
    if (keywordInput.trim() && !newResponse.trigger.keywords?.includes(keywordInput.trim())) {
      setNewResponse({
        ...newResponse,
        trigger: {
          ...newResponse.trigger,
          keywords: [...(newResponse.trigger.keywords || []), keywordInput.trim()],
        },
      });
      setKeywordInput("");
    }
  };

  const removeKeyword = (keyword: string) => {
    setNewResponse({
      ...newResponse,
      trigger: {
        ...newResponse.trigger,
        keywords: newResponse.trigger.keywords?.filter((k) => k !== keyword) || [],
      },
    });
  };

  const resetForm = () => {
    setNewResponse({
      name: "",
      type: "comment",
      platform: ["twitter"],
      trigger: { type: "keyword", keywords: [], keywordMatch: "any" },
      response: { type: "text", messages: [""], tone: "friendly" },
      status: "draft",
    });
    setKeywordInput("");
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "comment": return "💬";
      case "dm": return "✉️";
      case "mention": return "@";
      case "review": return "⭐";
      default: return "📝";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500/20 text-green-400";
      case "paused": return "bg-yellow-500/20 text-yellow-400";
      case "draft": return "bg-zinc-500/20 text-zinc-400";
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
          <h1 className="text-2xl font-bold">Auto-Responder</h1>
          <p className="text-zinc-400 mt-1">Automate responses to comments, DMs, and mentions</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Auto-Response
        </button>
      </div>

      {/* Stats */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <div className="text-sm text-zinc-400">Active Responses</div>
            <div className="text-2xl font-bold mt-1">{analytics.activeResponses}</div>
          </div>
          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <div className="text-sm text-zinc-400">Total Triggered</div>
            <div className="text-2xl font-bold mt-1">{analytics.totalTriggered}</div>
          </div>
          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <div className="text-sm text-zinc-400">Messages Sent</div>
            <div className="text-2xl font-bold mt-1">{analytics.totalResponded}</div>
          </div>
          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <div className="text-sm text-zinc-400">Success Rate</div>
            <div className="text-2xl font-bold mt-1 text-green-400">{analytics.avgSuccessRate.toFixed(1)}%</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-zinc-800 pb-2">
        {(["responses", "templates", "logs", "analytics"] as const).map((tab) => (
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

      {/* Responses Tab */}
      {activeTab === "responses" && (
        <div className="space-y-4">
          {responses.length === 0 ? (
            <div className="p-12 rounded-xl bg-zinc-900/50 border border-zinc-800 text-center">
              <svg className="w-16 h-16 text-zinc-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-zinc-400">No auto-responses configured</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                Create Your First Auto-Response
              </button>
            </div>
          ) : (
            responses.map((response) => (
              <div key={response.id} className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center text-2xl">
                      {getTypeIcon(response.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{response.name}</h3>
                        <span className={`px-2 py-0.5 text-xs rounded ${getStatusColor(response.status)}`}>
                          {response.status}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-400 mt-1">
                        Responds to {response.type}s on {response.platform.join(", ")}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-zinc-500">
                        <span>Trigger: {response.trigger.type}</span>
                        {response.trigger.keywords && response.trigger.keywords.length > 0 && (
                          <span>Keywords: {response.trigger.keywords.slice(0, 3).join(", ")}{response.trigger.keywords.length > 3 ? "..." : ""}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span className="text-zinc-400">
                          Triggered: <span className="text-white">{response.analytics.triggered}</span>
                        </span>
                        <span className="text-zinc-400">
                          Responded: <span className="text-white">{response.analytics.responded}</span>
                        </span>
                        <span className="text-zinc-400">
                          Success: <span className="text-green-400">{response.analytics.successRate.toFixed(0)}%</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedResponse(response);
                        setShowTestModal(true);
                      }}
                      className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition"
                      title="Test"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => toggleResponse(response.id)}
                      className={`p-2 rounded-lg transition ${
                        response.status === "active"
                          ? "text-green-400 hover:bg-green-400/10"
                          : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                      }`}
                      title={response.status === "active" ? "Pause" : "Activate"}
                    >
                      {response.status === "active" ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={() => deleteResponse(response.id)}
                      className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition"
                      title="Delete"
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

      {/* Templates Tab */}
      {activeTab === "templates" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <div key={template.id} className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">{template.name}</h3>
                <span className="px-2 py-0.5 text-xs rounded bg-zinc-700 text-zinc-300">
                  {template.category}
                </span>
              </div>
              <p className="text-sm text-zinc-400 mb-3">{template.content}</p>
              {template.variables.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {template.variables.map((v) => (
                    <span key={v} className="px-2 py-0.5 text-xs rounded bg-indigo-500/20 text-indigo-300">
                      {"{" + v + "}"}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Logs Tab */}
      {activeTab === "logs" && (
        <div className="space-y-3">
          {logs.length === 0 ? (
            <div className="p-12 rounded-xl bg-zinc-900/50 border border-zinc-800 text-center">
              <p className="text-zinc-400">No response logs yet</p>
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{getTypeIcon(log.type)}</span>
                      <span className="font-medium">@{log.senderUsername}</span>
                      <span className="text-sm text-zinc-500">on {log.platform}</span>
                      <span className={`px-2 py-0.5 text-xs rounded ${
                        log.status === "sent" ? "bg-green-500/20 text-green-400" :
                        log.status === "pending" ? "bg-yellow-500/20 text-yellow-400" :
                        log.status === "failed" ? "bg-red-500/20 text-red-400" :
                        "bg-zinc-700 text-zinc-400"
                      }`}>
                        {log.status}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="p-2 rounded bg-zinc-800/50 text-sm">
                        <span className="text-zinc-500">Received:</span> {log.incomingMessage}
                      </div>
                      <div className="p-2 rounded bg-indigo-500/10 border border-indigo-500/20 text-sm">
                        <span className="text-indigo-400">Replied:</span> {log.respondedWith}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-zinc-500">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === "analytics" && analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <h2 className="text-lg font-semibold mb-4">By Message Type</h2>
            <div className="space-y-3">
              {Object.entries(analytics.byType).map(([type, data]) => (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getTypeIcon(type)}</span>
                    <span className="capitalize">{type}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-zinc-400">{data.count} triggered</span>
                    <span className="text-green-400 ml-2">{data.responded} responded</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <h2 className="text-lg font-semibold mb-4">By Platform</h2>
            <div className="space-y-3">
              {Object.entries(analytics.byPlatform).map(([platform, data]) => (
                <div key={platform} className="flex items-center justify-between">
                  <span className="capitalize">{platform}</span>
                  <div className="text-sm">
                    <span className="text-zinc-400">{data.count} triggered</span>
                    <span className="text-green-400 ml-2">{data.responded} responded</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800 md:col-span-2">
            <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
            <div className="space-y-2">
              {analytics.recentActivity.slice(0, 5).map((log) => (
                <div key={log.id} className="flex items-center justify-between p-2 rounded bg-zinc-800/50">
                  <div className="flex items-center gap-2">
                    <span>{getTypeIcon(log.type)}</span>
                    <span>@{log.senderUsername}</span>
                    <span className="text-zinc-500">-</span>
                    <span className="text-sm text-zinc-400 truncate max-w-xs">{log.incomingMessage}</span>
                  </div>
                  <span className={`px-2 py-0.5 text-xs rounded ${
                    log.status === "sent" ? "bg-green-500/20 text-green-400" : "bg-zinc-700 text-zinc-400"
                  }`}>
                    {log.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-zinc-800">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Create Auto-Response</h2>
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

            <div className="p-6 space-y-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Name</label>
                <input
                  type="text"
                  value={newResponse.name}
                  onChange={(e) => setNewResponse({ ...newResponse, name: e.target.value })}
                  placeholder="e.g., Welcome New Followers"
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Message Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { value: "comment", label: "Comments", icon: "💬" },
                    { value: "dm", label: "DMs", icon: "✉️" },
                    { value: "mention", label: "Mentions", icon: "@" },
                    { value: "review", label: "Reviews", icon: "⭐" },
                  ].map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setNewResponse({ ...newResponse, type: type.value as any })}
                      className={`p-3 rounded-lg border transition text-center ${
                        newResponse.type === type.value
                          ? "bg-indigo-600 border-indigo-600 text-white"
                          : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-indigo-500"
                      }`}
                    >
                      <span className="text-xl block mb-1">{type.icon}</span>
                      <span className="text-sm">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Platform */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Platforms</label>
                <div className="flex gap-2 flex-wrap">
                  {["twitter", "instagram", "facebook", "linkedin", "tiktok"].map((platform) => (
                    <button
                      key={platform}
                      onClick={() => {
                        const platforms = newResponse.platform.includes(platform)
                          ? newResponse.platform.filter((p) => p !== platform)
                          : [...newResponse.platform, platform];
                        setNewResponse({ ...newResponse, platform: platforms });
                      }}
                      className={`px-3 py-1.5 rounded-lg border capitalize transition ${
                        newResponse.platform.includes(platform)
                          ? "bg-indigo-600 border-indigo-600 text-white"
                          : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-indigo-500"
                      }`}
                    >
                      {platform}
                    </button>
                  ))}
                </div>
              </div>

              {/* Trigger Type */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Trigger Type</label>
                <select
                  value={newResponse.trigger.type}
                  onChange={(e) => setNewResponse({
                    ...newResponse,
                    trigger: { ...newResponse.trigger, type: e.target.value as any }
                  })}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:border-indigo-500"
                >
                  <option value="keyword">Keywords</option>
                  <option value="sentiment">Sentiment</option>
                  <option value="question">Questions</option>
                  <option value="first_time">First Time Interaction</option>
                  <option value="follow">New Follower</option>
                  <option value="all">All Messages</option>
                </select>
              </div>

              {/* Keywords */}
              {newResponse.trigger.type === "keyword" && (
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Keywords</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addKeyword())}
                      placeholder="Type a keyword and press Enter"
                      className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      onClick={addKeyword}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                    >
                      Add
                    </button>
                  </div>
                  {newResponse.trigger.keywords && newResponse.trigger.keywords.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {newResponse.trigger.keywords.map((keyword) => (
                        <span
                          key={keyword}
                          className="px-2 py-1 bg-zinc-800 rounded flex items-center gap-1"
                        >
                          {keyword}
                          <button
                            onClick={() => removeKeyword(keyword)}
                            className="text-zinc-500 hover:text-red-400"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Response Type */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Response Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "text", label: "Custom Text" },
                    { value: "template", label: "Template" },
                    { value: "ai", label: "AI Generated" },
                  ].map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setNewResponse({
                        ...newResponse,
                        response: { ...newResponse.response, type: type.value as any }
                      })}
                      className={`p-2 rounded-lg border transition ${
                        newResponse.response.type === type.value
                          ? "bg-indigo-600 border-indigo-600 text-white"
                          : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-indigo-500"
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Response Messages */}
              {newResponse.response.type === "text" && (
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Response Messages</label>
                  <p className="text-sm text-zinc-500 mb-2">Add multiple variations. Use {"{username}"} to insert the sender's name.</p>
                  {newResponse.response.messages.map((msg, idx) => (
                    <div key={idx} className="flex gap-2 mb-2">
                      <textarea
                        value={msg}
                        onChange={(e) => {
                          const messages = [...newResponse.response.messages];
                          messages[idx] = e.target.value;
                          setNewResponse({ ...newResponse, response: { ...newResponse.response, messages } });
                        }}
                        placeholder="Enter response message..."
                        rows={2}
                        className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:border-indigo-500"
                      />
                      {newResponse.response.messages.length > 1 && (
                        <button
                          onClick={() => {
                            const messages = newResponse.response.messages.filter((_, i) => i !== idx);
                            setNewResponse({ ...newResponse, response: { ...newResponse.response, messages } });
                          }}
                          className="p-2 text-zinc-400 hover:text-red-400"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      const messages = [...newResponse.response.messages, ""];
                      setNewResponse({ ...newResponse, response: { ...newResponse.response, messages } });
                    }}
                    className="text-sm text-indigo-400 hover:text-indigo-300"
                  >
                    + Add variation
                  </button>
                </div>
              )}

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Status</label>
                <div className="flex gap-2">
                  {[
                    { value: "draft", label: "Draft" },
                    { value: "active", label: "Active" },
                  ].map((status) => (
                    <button
                      key={status.value}
                      onClick={() => setNewResponse({ ...newResponse, status: status.value as any })}
                      className={`px-4 py-2 rounded-lg border transition ${
                        newResponse.status === status.value
                          ? "bg-indigo-600 border-indigo-600 text-white"
                          : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-indigo-500"
                      }`}
                    >
                      {status.label}
                    </button>
                  ))}
                </div>
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
                onClick={createResponse}
                disabled={!newResponse.name || newResponse.response.messages.filter(m => m.trim()).length === 0}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Auto-Response
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Modal */}
      {showTestModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 w-full max-w-lg">
            <div className="p-6 border-b border-zinc-800">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Test Auto-Response</h2>
                <button
                  onClick={() => { setShowTestModal(false); setTestMessage(""); setTestResult(null); }}
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
                <label className="block text-sm font-medium text-zinc-300 mb-2">Test Message</label>
                <textarea
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="Enter a test message to see how the auto-responder would reply..."
                  rows={3}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                onClick={testAutoResponse}
                disabled={!testMessage.trim()}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
              >
                Test Response
              </button>

              {testResult && (
                <div className={`p-4 rounded-lg ${testResult.matched ? "bg-green-500/10 border border-green-500/20" : "bg-red-500/10 border border-red-500/20"}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {testResult.matched ? (
                      <>
                        <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-green-400 font-medium">Match Found</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        <span className="text-red-400 font-medium">No Match</span>
                      </>
                    )}
                  </div>
                  {testResult.reply && (
                    <div className="p-3 rounded bg-zinc-800/50">
                      <p className="text-sm text-zinc-400 mb-1">Would respond with:</p>
                      <p className="text-white">{testResult.reply}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
