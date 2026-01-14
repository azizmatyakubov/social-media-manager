"use client";

import { useState, useEffect } from "react";
import {
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  BellAlertIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlusIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  ChartBarIcon,
  CogIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

type CrisisSeverity = "low" | "medium" | "high" | "critical";
type CrisisStatus = "detected" | "investigating" | "responding" | "resolved" | "escalated";
type AlertType = "sentiment_spike" | "mention_surge" | "negative_review" | "viral_complaint" | "competitor_attack" | "pr_incident" | "custom";

interface CrisisAlert {
  id: string;
  type: AlertType;
  severity: CrisisSeverity;
  status: CrisisStatus;
  title: string;
  description: string;
  platform: string;
  sourceUrl?: string;
  mentionCount: number;
  sentimentScore: number;
  keywords: string[];
  affectedAudience: number;
  detectedAt: string;
  respondedAt?: string;
  resolvedAt?: string;
  assignedTo?: string;
  notes: string[];
  responses: any[];
  timeline: any[];
}

interface ResponseTemplate {
  id: string;
  name: string;
  category: string;
  content: string;
  variables: string[];
}

interface AlertRule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: any[];
  actions: any[];
  severity: CrisisSeverity;
}

interface CrisisMetrics {
  totalAlerts: number;
  activeAlerts: number;
  resolvedAlerts: number;
  avgResolutionTime: number;
  alertsBySeverity: Record<CrisisSeverity, number>;
  alertsByType: Record<AlertType, number>;
  recentTrend: "improving" | "stable" | "worsening";
}

const SEVERITY_STYLES: Record<CrisisSeverity, { bg: string; text: string; border: string; icon: string }> = {
  low: { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/30", icon: "bg-blue-500" },
  medium: { bg: "bg-yellow-500/20", text: "text-yellow-400", border: "border-yellow-500/30", icon: "bg-yellow-500" },
  high: { bg: "bg-orange-500/20", text: "text-orange-400", border: "border-orange-500/30", icon: "bg-orange-500" },
  critical: { bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/30", icon: "bg-red-500" },
};

const STATUS_STYLES: Record<CrisisStatus, { bg: string; text: string }> = {
  detected: { bg: "bg-red-500/20", text: "text-red-400" },
  investigating: { bg: "bg-yellow-500/20", text: "text-yellow-400" },
  responding: { bg: "bg-blue-500/20", text: "text-blue-400" },
  resolved: { bg: "bg-green-500/20", text: "text-green-400" },
  escalated: { bg: "bg-purple-500/20", text: "text-purple-400" },
};

const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  sentiment_spike: "Sentiment Spike",
  mention_surge: "Mention Surge",
  negative_review: "Negative Review",
  viral_complaint: "Viral Complaint",
  competitor_attack: "Competitor Attack",
  pr_incident: "PR Incident",
  custom: "Custom Alert",
};

export default function CrisisManagementPage() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "alerts" | "templates" | "rules">("dashboard");
  const [alerts, setAlerts] = useState<CrisisAlert[]>([]);
  const [templates, setTemplates] = useState<ResponseTemplate[]>([]);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [metrics, setMetrics] = useState<CrisisMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<CrisisAlert | null>(null);

  // Form states
  const [analyzeContent, setAnalyzeContent] = useState("");
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [generatedResponse, setGeneratedResponse] = useState<any>(null);
  const [newNote, setNewNote] = useState("");
  const [responseTone, setResponseTone] = useState<"apologetic" | "empathetic" | "factual" | "reassuring">("empathetic");

  // Template form
  const [templateName, setTemplateName] = useState("");
  const [templateCategory, setTemplateCategory] = useState("");
  const [templateContent, setTemplateContent] = useState("");

  // Rule form
  const [ruleName, setRuleName] = useState("");
  const [ruleSeverity, setRuleSeverity] = useState<CrisisSeverity>("medium");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [alertsRes, templatesRes, rulesRes, metricsRes] = await Promise.all([
        fetch("/api/crisis?action=alerts"),
        fetch("/api/crisis?action=templates"),
        fetch("/api/crisis?action=rules"),
        fetch("/api/crisis?action=metrics"),
      ]);

      const alertsData = await alertsRes.json();
      const templatesData = await templatesRes.json();
      const rulesData = await rulesRes.json();
      const metricsData = await metricsRes.json();

      setAlerts(alertsData.alerts || []);
      setTemplates(templatesData.templates || []);
      setRules(rulesData.rules || []);
      setMetrics(metricsData.metrics || null);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    }
  };

  const analyzeForCrisis = async () => {
    if (!analyzeContent) return;

    setLoading(true);
    try {
      const response = await fetch("/api/crisis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "analyze", content: analyzeContent }),
      });

      const data = await response.json();
      setAnalysisResult(data.analysis);
    } catch (error) {
      console.error("Failed to analyze:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateResponse = async () => {
    if (!selectedAlert) return;

    setLoading(true);
    try {
      const response = await fetch("/api/crisis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-response",
          crisis: selectedAlert,
          tone: responseTone,
        }),
      });

      const data = await response.json();
      setGeneratedResponse(data);
    } catch (error) {
      console.error("Failed to generate response:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateAlertStatus = async (alertId: string, status: CrisisStatus) => {
    try {
      const response = await fetch("/api/crisis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: status === "resolved" ? "resolve-alert" : "update-alert",
          alertId,
          status,
        }),
      });

      if (response.ok) {
        await fetchData();
        if (selectedAlert?.id === alertId) {
          const updatedAlert = await fetch(`/api/crisis?action=alert&alertId=${alertId}`);
          const data = await updatedAlert.json();
          setSelectedAlert(data.alert);
        }
      }
    } catch (error) {
      console.error("Failed to update alert:", error);
    }
  };

  const addNote = async () => {
    if (!selectedAlert || !newNote) return;

    try {
      const response = await fetch("/api/crisis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add-note",
          alertId: selectedAlert.id,
          note: newNote,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedAlert(data.alert);
        setNewNote("");
      }
    } catch (error) {
      console.error("Failed to add note:", error);
    }
  };

  const simulateCrisis = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/crisis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "simulate-crisis" }),
      });

      if (response.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error("Failed to simulate:", error);
    } finally {
      setLoading(false);
    }
  };

  const createTemplate = async () => {
    if (!templateName || !templateCategory || !templateContent) return;

    setLoading(true);
    try {
      const variables = templateContent.match(/\{\{(\w+)\}\}/g)?.map(v => v.replace(/\{\{|\}\}/g, "")) || [];

      const response = await fetch("/api/crisis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-template",
          name: templateName,
          category: templateCategory,
          content: templateContent,
          variables,
        }),
      });

      if (response.ok) {
        await fetchData();
        setTemplateName("");
        setTemplateCategory("");
        setTemplateContent("");
      }
    } catch (error) {
      console.error("Failed to create template:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatMinutes = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShieldExclamationIcon className="w-7 h-7 text-red-400" />
            Crisis Management
          </h1>
          <p className="text-zinc-400 mt-1">
            Monitor, detect, and respond to potential crises
          </p>
        </div>

        <button
          onClick={simulateCrisis}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 disabled:opacity-50"
        >
          <BellAlertIcon className="w-4 h-4" />
          Simulate Crisis
        </button>
      </div>

      {/* Quick Stats */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className={`p-4 rounded-xl border ${
            metrics.activeAlerts > 0 ? "bg-red-500/10 border-red-500/30" : "bg-zinc-900/50 border-zinc-800"
          }`}>
            <div className="flex items-center justify-between">
              <p className="text-zinc-400 text-sm">Active Alerts</p>
              {metrics.activeAlerts > 0 && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              )}
            </div>
            <p className={`text-2xl font-bold mt-1 ${metrics.activeAlerts > 0 ? "text-red-400" : "text-white"}`}>
              {metrics.activeAlerts}
            </p>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <p className="text-zinc-400 text-sm">Resolved</p>
            <p className="text-2xl font-bold text-green-400 mt-1">{metrics.resolvedAlerts}</p>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <p className="text-zinc-400 text-sm">Avg Resolution</p>
            <p className="text-2xl font-bold text-white mt-1">{formatMinutes(metrics.avgResolutionTime)}</p>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <p className="text-zinc-400 text-sm">Trend</p>
            <div className="flex items-center gap-2 mt-1">
              {metrics.recentTrend === "improving" ? (
                <>
                  <ArrowTrendingDownIcon className="w-5 h-5 text-green-400" />
                  <span className="text-green-400 font-medium">Improving</span>
                </>
              ) : metrics.recentTrend === "worsening" ? (
                <>
                  <ArrowTrendingUpIcon className="w-5 h-5 text-red-400" />
                  <span className="text-red-400 font-medium">Worsening</span>
                </>
              ) : (
                <span className="text-zinc-400 font-medium">Stable</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-1 bg-zinc-900/50 p-1 rounded-lg w-fit">
        {[
          { id: "dashboard", label: "Dashboard", icon: ChartBarIcon },
          { id: "alerts", label: "Alerts", icon: BellAlertIcon },
          { id: "templates", label: "Templates", icon: DocumentTextIcon },
          { id: "rules", label: "Rules", icon: CogIcon },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
              activeTab === id
                ? "bg-red-600 text-white"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Dashboard Tab */}
      {activeTab === "dashboard" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Content Analyzer */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <SparklesIcon className="w-5 h-5 text-indigo-400" />
              Crisis Detection AI
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Analyze content for crisis potential
                </label>
                <textarea
                  value={analyzeContent}
                  onChange={(e) => setAnalyzeContent(e.target.value)}
                  rows={4}
                  placeholder="Paste social media content, reviews, or mentions to analyze..."
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                onClick={analyzeForCrisis}
                disabled={loading || !analyzeContent}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? "Analyzing..." : "Analyze Content"}
              </button>

              {analysisResult && (
                <div className={`p-4 rounded-lg border ${
                  analysisResult.isCrisis
                    ? SEVERITY_STYLES[analysisResult.urgency as CrisisSeverity]?.bg + " " + SEVERITY_STYLES[analysisResult.urgency as CrisisSeverity]?.border
                    : "bg-green-500/10 border-green-500/30"
                }`}>
                  <div className="flex items-start gap-3">
                    {analysisResult.isCrisis ? (
                      <ExclamationTriangleIcon className={`w-5 h-5 mt-0.5 ${SEVERITY_STYLES[analysisResult.urgency as CrisisSeverity]?.text}`} />
                    ) : (
                      <CheckCircleIcon className="w-5 h-5 text-green-400 mt-0.5" />
                    )}
                    <div>
                      <p className="text-white font-medium">
                        {analysisResult.isCrisis ? `Crisis Detected: ${analysisResult.crisisType}` : "No Crisis Detected"}
                      </p>
                      <p className="text-sm text-zinc-400 mt-1">
                        Sentiment: {(analysisResult.sentiment * 100).toFixed(0)}%
                      </p>
                      {analysisResult.keywords?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {analysisResult.keywords.map((kw: string, i: number) => (
                            <span key={i} className="px-2 py-0.5 bg-zinc-700 rounded text-xs text-zinc-300">
                              {kw}
                            </span>
                          ))}
                        </div>
                      )}
                      {analysisResult.suggestedActions?.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-zinc-500 mb-1">Suggested Actions:</p>
                          <ul className="text-sm text-zinc-300 space-y-1">
                            {analysisResult.suggestedActions.map((action: string, i: number) => (
                              <li key={i}>• {action}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Severity Breakdown */}
          {metrics && (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Alerts by Severity</h2>
              <div className="space-y-3">
                {(["critical", "high", "medium", "low"] as CrisisSeverity[]).map((severity) => {
                  const count = metrics.alertsBySeverity[severity] || 0;
                  const percentage = metrics.totalAlerts > 0 ? (count / metrics.totalAlerts) * 100 : 0;
                  return (
                    <div key={severity} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className={`capitalize ${SEVERITY_STYLES[severity].text}`}>{severity}</span>
                        <span className="text-zinc-400">{count}</span>
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${SEVERITY_STYLES[severity].icon}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6">
                <h3 className="text-sm font-medium text-zinc-400 mb-3">Alerts by Type</h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(ALERT_TYPE_LABELS).map(([type, label]) => {
                    const count = metrics.alertsByType[type as AlertType] || 0;
                    if (count === 0) return null;
                    return (
                      <div key={type} className="flex items-center justify-between p-2 bg-zinc-800/50 rounded-lg">
                        <span className="text-xs text-zinc-300">{label}</span>
                        <span className="text-xs font-medium text-white">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Recent Alerts */}
          <div className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Recent Alerts</h2>
            {alerts.length === 0 ? (
              <p className="text-zinc-500 text-center py-8">No alerts yet</p>
            ) : (
              <div className="space-y-3">
                {alerts.slice(0, 5).map((alert) => (
                  <div
                    key={alert.id}
                    onClick={() => setSelectedAlert(alert)}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors hover:bg-zinc-800/50 ${
                      SEVERITY_STYLES[alert.severity].bg
                    } ${SEVERITY_STYLES[alert.severity].border}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-2 ${SEVERITY_STYLES[alert.severity].icon}`} />
                        <div>
                          <h3 className="text-white font-medium">{alert.title}</h3>
                          <p className="text-sm text-zinc-400 mt-1 line-clamp-1">{alert.description}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
                            <span>{alert.platform}</span>
                            <span>{alert.mentionCount} mentions</span>
                            <span>{formatDate(alert.detectedAt)}</span>
                          </div>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_STYLES[alert.status].bg} ${STATUS_STYLES[alert.status].text}`}>
                        {alert.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === "alerts" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Alert List */}
          <div className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">All Alerts</h2>

            {alerts.length === 0 ? (
              <p className="text-zinc-500 text-center py-8">No alerts</p>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    onClick={() => setSelectedAlert(alert)}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      selectedAlert?.id === alert.id
                        ? "ring-2 ring-indigo-500"
                        : "hover:bg-zinc-800/50"
                    } ${SEVERITY_STYLES[alert.severity].bg} ${SEVERITY_STYLES[alert.severity].border}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-2 ${SEVERITY_STYLES[alert.severity].icon}`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-white font-medium">{alert.title}</h3>
                            <span className={`px-2 py-0.5 rounded text-xs ${SEVERITY_STYLES[alert.severity].bg} ${SEVERITY_STYLES[alert.severity].text}`}>
                              {alert.severity}
                            </span>
                          </div>
                          <p className="text-sm text-zinc-400 mt-1">{ALERT_TYPE_LABELS[alert.type]}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
                            <span className="capitalize">{alert.platform}</span>
                            <span>{alert.mentionCount} mentions</span>
                            <span>Sentiment: {(alert.sentimentScore * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_STYLES[alert.status].bg} ${STATUS_STYLES[alert.status].text}`}>
                        {alert.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Alert Details */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            {selectedAlert ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <h2 className="text-lg font-semibold text-white">{selectedAlert.title}</h2>
                  <button
                    onClick={() => setSelectedAlert(null)}
                    className="text-zinc-400 hover:text-white"
                  >
                    <XCircleIcon className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className={`px-2 py-1 rounded text-xs ${SEVERITY_STYLES[selectedAlert.severity].bg} ${SEVERITY_STYLES[selectedAlert.severity].text}`}>
                    {selectedAlert.severity}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs ${STATUS_STYLES[selectedAlert.status].bg} ${STATUS_STYLES[selectedAlert.status].text}`}>
                    {selectedAlert.status}
                  </span>
                  <span className="px-2 py-1 rounded text-xs bg-zinc-700 text-zinc-300">
                    {selectedAlert.platform}
                  </span>
                </div>

                <p className="text-sm text-zinc-400">{selectedAlert.description}</p>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-2 bg-zinc-800/50 rounded">
                    <p className="text-zinc-500">Mentions</p>
                    <p className="text-white font-medium">{selectedAlert.mentionCount}</p>
                  </div>
                  <div className="p-2 bg-zinc-800/50 rounded">
                    <p className="text-zinc-500">Sentiment</p>
                    <p className={`font-medium ${selectedAlert.sentimentScore < 0 ? "text-red-400" : "text-green-400"}`}>
                      {(selectedAlert.sentimentScore * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>

                {selectedAlert.keywords.length > 0 && (
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Keywords</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedAlert.keywords.map((kw, i) => (
                        <span key={i} className="px-2 py-0.5 bg-zinc-700 rounded text-xs text-zinc-300">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Status Actions */}
                {selectedAlert.status !== "resolved" && (
                  <div className="flex flex-wrap gap-2">
                    {selectedAlert.status === "detected" && (
                      <button
                        onClick={() => updateAlertStatus(selectedAlert.id, "investigating")}
                        className="px-3 py-1.5 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
                      >
                        Start Investigating
                      </button>
                    )}
                    {selectedAlert.status === "investigating" && (
                      <button
                        onClick={() => updateAlertStatus(selectedAlert.id, "responding")}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      >
                        Begin Response
                      </button>
                    )}
                    <button
                      onClick={() => updateAlertStatus(selectedAlert.id, "resolved")}
                      className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                    >
                      Mark Resolved
                    </button>
                  </div>
                )}

                {/* Generate Response */}
                <div className="pt-4 border-t border-zinc-700">
                  <h3 className="text-sm font-medium text-white mb-2">Generate Response</h3>
                  <select
                    value={responseTone}
                    onChange={(e) => setResponseTone(e.target.value as any)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white mb-2"
                  >
                    <option value="empathetic">Empathetic</option>
                    <option value="apologetic">Apologetic</option>
                    <option value="factual">Factual</option>
                    <option value="reassuring">Reassuring</option>
                  </select>
                  <button
                    onClick={generateResponse}
                    disabled={loading}
                    className="w-full px-3 py-2 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {loading ? "Generating..." : "Generate AI Response"}
                  </button>

                  {generatedResponse && (
                    <div className="mt-3 p-3 bg-zinc-800/50 rounded">
                      <p className="text-sm text-white">{generatedResponse.response}</p>
                      {generatedResponse.warnings?.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-zinc-700">
                          <p className="text-xs text-red-400">Warnings:</p>
                          <ul className="text-xs text-zinc-400">
                            {generatedResponse.warnings.map((w: string, i: number) => (
                              <li key={i}>• {w}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div className="pt-4 border-t border-zinc-700">
                  <h3 className="text-sm font-medium text-white mb-2">Notes</h3>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Add a note..."
                      className="flex-1 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
                    />
                    <button
                      onClick={addNote}
                      disabled={!newNote}
                      className="px-3 py-1.5 bg-zinc-700 text-white rounded text-sm hover:bg-zinc-600 disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                  {selectedAlert.notes.length > 0 && (
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {selectedAlert.notes.map((note, i) => (
                        <p key={i} className="text-sm text-zinc-400 p-2 bg-zinc-800/50 rounded">
                          {note}
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                {/* Timeline */}
                <div className="pt-4 border-t border-zinc-700">
                  <h3 className="text-sm font-medium text-white mb-2">Timeline</h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedAlert.timeline.map((event, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5" />
                        <div>
                          <p className="text-zinc-300">{event.description}</p>
                          <p className="text-zinc-500">{formatDate(event.timestamp)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-zinc-500 text-center py-8">Select an alert to view details</p>
            )}
          </div>
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === "templates" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <PlusIcon className="w-5 h-5 text-indigo-400" />
              Create Template
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Name</label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Template name"
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Category</label>
                <select
                  value={templateCategory}
                  onChange={(e) => setTemplateCategory(e.target.value)}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Select category</option>
                  <option value="initial">Initial Response</option>
                  <option value="apology">Apology</option>
                  <option value="resolution">Resolution</option>
                  <option value="escalation">Escalation</option>
                  <option value="follow-up">Follow Up</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Content (use {"{{variable}}"} for placeholders)
                </label>
                <textarea
                  value={templateContent}
                  onChange={(e) => setTemplateContent(e.target.value)}
                  rows={4}
                  placeholder="We apologize for {{issue}}..."
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                onClick={createTemplate}
                disabled={loading || !templateName || !templateCategory || !templateContent}
                className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                Create Template
              </button>
            </div>
          </div>

          <div className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Response Templates</h2>

            {templates.length === 0 ? (
              <p className="text-zinc-500 text-center py-8">No templates yet</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map((template) => (
                  <div key={template.id} className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-white font-medium">{template.name}</h3>
                      <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 rounded text-xs capitalize">
                        {template.category}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-400">{template.content}</p>
                    {template.variables.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {template.variables.map((v, i) => (
                          <span key={i} className="px-2 py-0.5 bg-zinc-700 rounded text-xs text-zinc-300">
                            {`{{${v}}}`}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rules Tab */}
      {activeTab === "rules" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <PlusIcon className="w-5 h-5 text-indigo-400" />
              Create Alert Rule
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Rule Name</label>
                <input
                  type="text"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  placeholder="e.g., High negative sentiment alert"
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Severity Level</label>
                <select
                  value={ruleSeverity}
                  onChange={(e) => setRuleSeverity(e.target.value as CrisisSeverity)}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div className="p-3 bg-zinc-800/50 rounded-lg text-sm text-zinc-400">
                <p className="font-medium text-zinc-300 mb-1">Default Conditions:</p>
                <ul className="space-y-1">
                  <li>• Sentiment drops below -40%</li>
                  <li>• Mention volume increases 200%</li>
                  <li>• Negative keyword detected</li>
                </ul>
              </div>

              <button
                onClick={async () => {
                  if (!ruleName) return;
                  setLoading(true);
                  try {
                    await fetch("/api/crisis", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        action: "create-rule",
                        name: ruleName,
                        enabled: true,
                        conditions: [
                          { type: "sentiment", operator: "lt", value: -0.4 },
                          { type: "volume", operator: "gt", value: 200 },
                        ],
                        actions: [
                          { type: "email", config: { notify: true } },
                        ],
                        severity: ruleSeverity,
                      }),
                    });
                    await fetchData();
                    setRuleName("");
                  } catch (error) {
                    console.error("Failed to create rule:", error);
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading || !ruleName}
                className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                Create Rule
              </button>
            </div>
          </div>

          <div className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Alert Rules</h2>

            {rules.length === 0 ? (
              <p className="text-zinc-500 text-center py-8">No rules configured</p>
            ) : (
              <div className="space-y-3">
                {rules.map((rule) => (
                  <div key={rule.id} className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${rule.enabled ? "bg-green-500" : "bg-zinc-500"}`} />
                        <h3 className="text-white font-medium">{rule.name}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs ${SEVERITY_STYLES[rule.severity].bg} ${SEVERITY_STYLES[rule.severity].text}`}>
                          {rule.severity}
                        </span>
                      </div>
                      <button
                        onClick={async () => {
                          await fetch("/api/crisis", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              action: "update-rule",
                              ruleId: rule.id,
                              enabled: !rule.enabled,
                            }),
                          });
                          await fetchData();
                        }}
                        className={`px-3 py-1 rounded text-xs ${
                          rule.enabled
                            ? "bg-green-500/20 text-green-400"
                            : "bg-zinc-700 text-zinc-400"
                        }`}
                      >
                        {rule.enabled ? "Enabled" : "Disabled"}
                      </button>
                    </div>
                    <div className="mt-2 text-sm text-zinc-400">
                      {rule.conditions.length} conditions • {rule.actions.length} actions
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
