"use client";

import { useState, useEffect } from "react";

interface AuditCategory {
  name: string;
  score: number;
  maxScore: number;
  weight: number;
  issues: AuditIssue[];
  recommendations: string[];
}

interface AuditIssue {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  impact: string;
  recommendation: string;
  category: string;
}

interface AuditBenchmark {
  metric: string;
  yourValue: number;
  industryAvg: number;
  topPerformers: number;
  percentile: number;
  status: "above" | "average" | "below";
}

interface ActionPlanItem {
  id: string;
  priority: number;
  category: string;
  title: string;
  description: string;
  expectedImpact: string;
  effort: "low" | "medium" | "high";
  timeframe: string;
  completed: boolean;
  completedAt?: Date;
}

interface SocialAudit {
  id: string;
  userId: string;
  name: string;
  platforms: string[];
  categories: AuditCategory[];
  overallScore: number;
  benchmarks: AuditBenchmark[];
  issues: AuditIssue[];
  actionPlan: ActionPlanItem[];
  status: "pending" | "in_progress" | "completed" | "failed";
  createdAt: Date;
  completedAt?: Date;
}

interface AuditTemplate {
  id: string;
  name: string;
  description: string;
  platforms: string[];
  categories: string[];
  isDefault: boolean;
}

interface AuditStats {
  totalAudits: number;
  completedAudits: number;
  avgScore: number;
  criticalIssues: number;
  actionsCompleted: number;
  actionsTotal: number;
  topCategory: string;
  weakestCategory: string;
}

export default function SocialAuditPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "new" | "history" | "report">("overview");
  const [audits, setAudits] = useState<SocialAudit[]>([]);
  const [templates, setTemplates] = useState<AuditTemplate[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [selectedAudit, setSelectedAudit] = useState<SocialAudit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // New audit form
  const [newAuditName, setNewAuditName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [profiles, setProfiles] = useState<Array<{ platform: string; username: string }>>([]);

  const platforms = [
    { id: "instagram", name: "Instagram", icon: "📸" },
    { id: "twitter", name: "X (Twitter)", icon: "𝕏" },
    { id: "facebook", name: "Facebook", icon: "📘" },
    { id: "linkedin", name: "LinkedIn", icon: "💼" },
    { id: "tiktok", name: "TikTok", icon: "🎵" },
    { id: "youtube", name: "YouTube", icon: "▶️" },
    { id: "pinterest", name: "Pinterest", icon: "📌" },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [auditsRes, templatesRes, statsRes] = await Promise.all([
        fetch("/api/social-audit?action=audits"),
        fetch("/api/social-audit?action=templates"),
        fetch("/api/social-audit?action=stats"),
      ]);

      if (auditsRes.ok) {
        const data = await auditsRes.json();
        setAudits(data.audits);
        if (data.audits.length > 0 && data.audits[0].status === "completed") {
          setSelectedAudit(data.audits[0]);
        }
      }

      if (templatesRes.ok) {
        const data = await templatesRes.json();
        setTemplates(data.templates);
        if (data.templates.length > 0) {
          setSelectedTemplate(data.templates[0].id);
        }
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

  const startNewAudit = async () => {
    if (!newAuditName || !selectedTemplate || selectedPlatforms.length === 0) {
      setError("Please fill in all required fields");
      return;
    }

    try {
      const response = await fetch("/api/social-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start-audit",
          name: newAuditName,
          templateId: selectedTemplate,
          platforms: selectedPlatforms,
          profiles: profiles.filter((p) => p.username),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAudits([data.audit, ...audits]);
        setNewAuditName("");
        setSelectedPlatforms([]);
        setProfiles([]);
        setActiveTab("history");

        // Poll for completion
        pollAuditStatus(data.audit.id);
      }
    } catch (err) {
      setError("Failed to start audit");
    }
  };

  const pollAuditStatus = async (auditId: string) => {
    const checkStatus = async () => {
      const response = await fetch(`/api/social-audit?action=audit&auditId=${auditId}`);
      if (response.ok) {
        const data = await response.json();
        setAudits((prev) =>
          prev.map((a) => (a.id === auditId ? data.audit : a))
        );
        if (data.audit.status === "completed") {
          setSelectedAudit(data.audit);
          setActiveTab("report");
          fetchData();
        } else if (data.audit.status === "in_progress") {
          setTimeout(checkStatus, 2000);
        }
      }
    };
    setTimeout(checkStatus, 2000);
  };

  const togglePlatform = (platformId: string) => {
    if (selectedPlatforms.includes(platformId)) {
      setSelectedPlatforms(selectedPlatforms.filter((p) => p !== platformId));
      setProfiles(profiles.filter((p) => p.platform !== platformId));
    } else {
      setSelectedPlatforms([...selectedPlatforms, platformId]);
      setProfiles([...profiles, { platform: platformId, username: "" }]);
    }
  };

  const updateProfile = (platform: string, username: string) => {
    setProfiles(
      profiles.map((p) => (p.platform === platform ? { ...p, username } : p))
    );
  };

  const toggleActionComplete = async (actionId: string, completed: boolean) => {
    if (!selectedAudit) return;

    try {
      const response = await fetch("/api/social-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-action",
          auditId: selectedAudit.id,
          actionId,
          completed,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedAudit(data.audit);
        fetchData();
      }
    } catch (err) {
      setError("Failed to update action");
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-yellow-400";
    if (score >= 40) return "text-orange-400";
    return "text-red-400";
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    if (score >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "warning":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default:
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    }
  };

  const getEffortColor = (effort: string) => {
    switch (effort) {
      case "low":
        return "bg-green-500/20 text-green-400";
      case "medium":
        return "bg-yellow-500/20 text-yellow-400";
      default:
        return "bg-red-500/20 text-red-400";
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-zinc-400">Loading audit tools...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Social Media Audit</h1>
        <p className="text-zinc-400">
          Comprehensive analysis and recommendations for your social media presence
        </p>
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
            <div className="text-zinc-400 text-sm mb-1">Average Score</div>
            <div className={`text-2xl font-bold ${getScoreColor(stats.avgScore)}`}>
              {stats.avgScore}/100
            </div>
          </div>
          <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
            <div className="text-zinc-400 text-sm mb-1">Critical Issues</div>
            <div className="text-2xl font-bold text-red-400">{stats.criticalIssues}</div>
          </div>
          <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
            <div className="text-zinc-400 text-sm mb-1">Actions Progress</div>
            <div className="text-2xl font-bold text-indigo-400">
              {stats.actionsCompleted}/{stats.actionsTotal}
            </div>
          </div>
          <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
            <div className="text-zinc-400 text-sm mb-1">Weakest Area</div>
            <div className="text-lg font-bold text-orange-400">{stats.weakestCategory}</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-zinc-800 pb-4">
        {[
          { id: "overview", label: "Overview" },
          { id: "new", label: "New Audit" },
          { id: "history", label: "History" },
          { id: "report", label: "Detailed Report" },
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
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && selectedAudit && (
        <div className="space-y-6">
          {/* Overall Score */}
          <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-white">{selectedAudit.name}</h2>
                <p className="text-zinc-400 text-sm">
                  Completed {new Date(selectedAudit.completedAt || "").toLocaleDateString()}
                </p>
              </div>
              <div className="text-center">
                <div
                  className={`text-5xl font-bold ${getScoreColor(selectedAudit.overallScore)}`}
                >
                  {selectedAudit.overallScore}
                </div>
                <div className="text-zinc-400 text-sm">Overall Score</div>
              </div>
            </div>

            {/* Category Scores */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {selectedAudit.categories.map((category) => (
                <div key={category.name} className="bg-zinc-800/50 rounded-lg p-4">
                  <div className="text-zinc-400 text-sm mb-2">{category.name}</div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-zinc-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getScoreBg(category.score)} transition-all`}
                        style={{ width: `${category.score}%` }}
                      />
                    </div>
                    <span className={`font-semibold ${getScoreColor(category.score)}`}>
                      {category.score}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Issues */}
          <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
            <h3 className="text-lg font-semibold text-white mb-4">Priority Issues</h3>
            <div className="space-y-3">
              {selectedAudit.issues.slice(0, 5).map((issue) => (
                <div
                  key={issue.id}
                  className={`p-4 rounded-lg border ${getSeverityColor(issue.severity)}`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg">
                      {issue.severity === "critical" ? "🚨" : issue.severity === "warning" ? "⚠️" : "ℹ️"}
                    </span>
                    <div>
                      <div className="font-medium">{issue.title}</div>
                      <div className="text-sm opacity-80">{issue.description}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Plan Preview */}
          <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Quick Action Plan</h3>
              <button
                onClick={() => setActiveTab("report")}
                className="text-indigo-400 hover:text-indigo-300 text-sm"
              >
                View Full Report →
              </button>
            </div>
            <div className="space-y-3">
              {selectedAudit.actionPlan.slice(0, 3).map((action) => (
                <div
                  key={action.id}
                  className="flex items-center gap-4 p-4 bg-zinc-800/50 rounded-lg"
                >
                  <input
                    type="checkbox"
                    checked={action.completed}
                    onChange={(e) => toggleActionComplete(action.id, e.target.checked)}
                    className="w-5 h-5 rounded bg-zinc-700 border-zinc-600"
                  />
                  <div className="flex-1">
                    <div className={`font-medium ${action.completed ? "line-through text-zinc-500" : "text-white"}`}>
                      {action.title}
                    </div>
                    <div className="text-sm text-zinc-400">{action.timeframe}</div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${getEffortColor(action.effort)}`}>
                    {action.effort} effort
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "overview" && !selectedAudit && (
        <div className="bg-zinc-900/50 rounded-xl p-12 border border-zinc-800 text-center">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-semibold text-white mb-2">No Audits Yet</h3>
          <p className="text-zinc-400 mb-6">
            Start your first social media audit to get actionable insights
          </p>
          <button
            onClick={() => setActiveTab("new")}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Start New Audit
          </button>
        </div>
      )}

      {/* New Audit Tab */}
      {activeTab === "new" && (
        <div className="max-w-2xl space-y-6">
          <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
            <h3 className="text-lg font-semibold text-white mb-4">Start New Audit</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-zinc-400 text-sm mb-2">Audit Name</label>
                <input
                  type="text"
                  value={newAuditName}
                  onChange={(e) => setNewAuditName(e.target.value)}
                  placeholder="e.g., Q1 2024 Social Audit"
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 text-sm mb-2">Audit Template</label>
                <div className="grid gap-3">
                  {templates.map((template) => (
                    <label
                      key={template.id}
                      className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${
                        selectedTemplate === template.id
                          ? "bg-indigo-600/20 border-indigo-500"
                          : "bg-zinc-800 border-zinc-700 hover:border-zinc-600"
                      }`}
                    >
                      <input
                        type="radio"
                        name="template"
                        value={template.id}
                        checked={selectedTemplate === template.id}
                        onChange={(e) => setSelectedTemplate(e.target.value)}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-medium text-white">{template.name}</div>
                        <div className="text-sm text-zinc-400">{template.description}</div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {template.categories.slice(0, 4).map((cat) => (
                            <span
                              key={cat}
                              className="px-2 py-0.5 bg-zinc-700 text-zinc-300 rounded text-xs"
                            >
                              {cat}
                            </span>
                          ))}
                          {template.categories.length > 4 && (
                            <span className="px-2 py-0.5 text-zinc-400 text-xs">
                              +{template.categories.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 text-sm mb-2">Select Platforms</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {platforms.map((platform) => (
                    <button
                      key={platform.id}
                      onClick={() => togglePlatform(platform.id)}
                      className={`p-4 rounded-lg border text-center transition-colors ${
                        selectedPlatforms.includes(platform.id)
                          ? "bg-indigo-600/20 border-indigo-500 text-white"
                          : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600"
                      }`}
                    >
                      <div className="text-2xl mb-1">{platform.icon}</div>
                      <div className="text-sm">{platform.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              {selectedPlatforms.length > 0 && (
                <div>
                  <label className="block text-zinc-400 text-sm mb-2">
                    Enter Usernames (Optional)
                  </label>
                  <div className="space-y-3">
                    {profiles.map((profile) => {
                      const platform = platforms.find((p) => p.id === profile.platform);
                      return (
                        <div key={profile.platform} className="flex items-center gap-3">
                          <span className="text-xl w-8">{platform?.icon}</span>
                          <input
                            type="text"
                            value={profile.username}
                            onChange={(e) => updateProfile(profile.platform, e.target.value)}
                            placeholder={`@username on ${platform?.name}`}
                            className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <button
                onClick={startNewAudit}
                disabled={!newAuditName || !selectedTemplate || selectedPlatforms.length === 0}
                className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Start Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === "history" && (
        <div className="space-y-4">
          {audits.length === 0 ? (
            <div className="bg-zinc-900/50 rounded-xl p-12 border border-zinc-800 text-center">
              <div className="text-zinc-400">No audits found</div>
            </div>
          ) : (
            audits.map((audit) => (
              <div
                key={audit.id}
                className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-white">{audit.name}</h3>
                    <p className="text-sm text-zinc-400">
                      {new Date(audit.createdAt).toLocaleDateString()} • {audit.platforms.join(", ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    {audit.status === "completed" ? (
                      <>
                        <div className={`text-2xl font-bold ${getScoreColor(audit.overallScore)}`}>
                          {audit.overallScore}/100
                        </div>
                        <button
                          onClick={() => {
                            setSelectedAudit(audit);
                            setActiveTab("report");
                          }}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                          View Report
                        </button>
                      </>
                    ) : audit.status === "in_progress" ? (
                      <span className="px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg">
                        Analyzing...
                      </span>
                    ) : (
                      <span className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg">
                        Failed
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Detailed Report Tab */}
      {activeTab === "report" && selectedAudit && (
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">{selectedAudit.name}</h2>
                <p className="text-zinc-400">
                  Platforms: {selectedAudit.platforms.join(", ")} •
                  Completed: {new Date(selectedAudit.completedAt || "").toLocaleDateString()}
                </p>
              </div>
              <div className="text-center">
                <div className={`text-6xl font-bold ${getScoreColor(selectedAudit.overallScore)}`}>
                  {selectedAudit.overallScore}
                </div>
                <div className="text-zinc-400">Overall Score</div>
              </div>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
            <h3 className="text-lg font-semibold text-white mb-4">Category Breakdown</h3>
            <div className="space-y-4">
              {selectedAudit.categories.map((category) => (
                <div key={category.name} className="bg-zinc-800/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-white">{category.name}</span>
                    <span className={`font-bold ${getScoreColor(category.score)}`}>
                      {category.score}/{category.maxScore}
                    </span>
                  </div>
                  <div className="h-3 bg-zinc-700 rounded-full overflow-hidden mb-3">
                    <div
                      className={`h-full ${getScoreBg(category.score)} transition-all`}
                      style={{ width: `${category.score}%` }}
                    />
                  </div>
                  {category.recommendations.length > 0 && (
                    <div className="text-sm text-zinc-400">
                      <strong>Recommendations:</strong>
                      <ul className="list-disc list-inside mt-1">
                        {category.recommendations.map((rec, i) => (
                          <li key={i}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Benchmarks */}
          <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
            <h3 className="text-lg font-semibold text-white mb-4">Industry Benchmarks</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-zinc-400 text-sm">
                    <th className="pb-3">Metric</th>
                    <th className="pb-3">Your Value</th>
                    <th className="pb-3">Industry Avg</th>
                    <th className="pb-3">Top Performers</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="text-white">
                  {selectedAudit.benchmarks.map((benchmark) => (
                    <tr key={benchmark.metric} className="border-t border-zinc-800">
                      <td className="py-3">{benchmark.metric}</td>
                      <td className="py-3 font-medium">{benchmark.yourValue}</td>
                      <td className="py-3 text-zinc-400">{benchmark.industryAvg}</td>
                      <td className="py-3 text-zinc-400">{benchmark.topPerformers}</td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            benchmark.status === "above"
                              ? "bg-green-500/20 text-green-400"
                              : benchmark.status === "average"
                              ? "bg-yellow-500/20 text-yellow-400"
                              : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {benchmark.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* All Issues */}
          <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
            <h3 className="text-lg font-semibold text-white mb-4">
              All Issues ({selectedAudit.issues.length})
            </h3>
            <div className="space-y-4">
              {selectedAudit.issues.map((issue) => (
                <div
                  key={issue.id}
                  className={`p-4 rounded-lg border ${getSeverityColor(issue.severity)}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span>
                        {issue.severity === "critical" ? "🚨" : issue.severity === "warning" ? "⚠️" : "ℹ️"}
                      </span>
                      <span className="font-semibold">{issue.title}</span>
                    </div>
                    <span className="text-xs opacity-70 uppercase">{issue.severity}</span>
                  </div>
                  <p className="text-sm mb-2 opacity-90">{issue.description}</p>
                  <div className="text-sm">
                    <strong>Impact:</strong> {issue.impact}
                  </div>
                  <div className="text-sm mt-1">
                    <strong>Recommendation:</strong> {issue.recommendation}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Full Action Plan */}
          <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
            <h3 className="text-lg font-semibold text-white mb-4">Complete Action Plan</h3>
            <div className="space-y-4">
              {selectedAudit.actionPlan.map((action, index) => (
                <div
                  key={action.id}
                  className={`p-4 rounded-lg border transition-colors ${
                    action.completed
                      ? "bg-green-500/10 border-green-500/30"
                      : "bg-zinc-800/50 border-zinc-700"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 flex items-center justify-center bg-indigo-600 text-white rounded-full font-bold">
                        {index + 1}
                      </span>
                      <input
                        type="checkbox"
                        checked={action.completed}
                        onChange={(e) => toggleActionComplete(action.id, e.target.checked)}
                        className="w-5 h-5 rounded bg-zinc-700 border-zinc-600"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span
                          className={`font-semibold ${
                            action.completed ? "line-through text-zinc-500" : "text-white"
                          }`}
                        >
                          {action.title}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs ${getEffortColor(action.effort)}`}>
                          {action.effort} effort
                        </span>
                      </div>
                      <p className="text-sm text-zinc-400 mb-2">{action.description}</p>
                      <div className="flex flex-wrap gap-4 text-sm">
                        <span className="text-zinc-500">
                          <strong>Category:</strong> {action.category}
                        </span>
                        <span className="text-zinc-500">
                          <strong>Timeframe:</strong> {action.timeframe}
                        </span>
                        <span className="text-green-400">
                          <strong>Impact:</strong> {action.expectedImpact}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "report" && !selectedAudit && (
        <div className="bg-zinc-900/50 rounded-xl p-12 border border-zinc-800 text-center">
          <div className="text-zinc-400">Select an audit from History to view the report</div>
        </div>
      )}
    </div>
  );
}
