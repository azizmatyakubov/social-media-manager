"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

interface ContentGap {
  id: string;
  topic: string;
  category: string;
  description: string;
  competitorsCovering: string[];
  searchVolume: number;
  difficulty: "low" | "medium" | "high";
  opportunity: number;
  relevance: number;
  suggestedFormats: string[];
  suggestedPlatforms: string[];
  keywords: string[];
  status: "identified" | "planned" | "in_progress" | "covered";
  priority: "low" | "medium" | "high" | "urgent";
  notes?: string;
  updatedAt: string;
}

interface ContentAnalysis {
  id: string;
  name: string;
  type: "competitor" | "industry" | "self";
  source: string;
  topics: { topic: string; category: string; postCount: number; engagement: number; trend: string }[];
  formats: { format: string; percentage: number; avgEngagement: number }[];
  platforms: { platform: string; postCount: number; avgEngagement: number }[];
  frequency: { postsPerWeek: number; mostActiveDay: string; consistency: number };
  engagement: { avgLikes: number; avgComments: number; engagementRate: number; topPerformingTopics: string[] };
  analyzedAt: string;
}

interface GapReport {
  id: string;
  name: string;
  analyses: string[];
  gaps: ContentGap[];
  recommendations: { id: string; title: string; description: string; type: string; impact: string; effort: string; suggestedContent: string[] }[];
  summary: {
    totalGaps: number;
    highPriorityGaps: number;
    topOpportunities: string[];
    competitorAdvantages: string[];
    yourStrengths: string[];
    quickWins: string[];
    overallScore: number;
  };
  createdAt: string;
}

interface Stats {
  totalGaps: number;
  identifiedGaps: number;
  coveredGaps: number;
  highPriorityGaps: number;
  avgOpportunity: number;
  topCategories: { category: string; count: number }[];
}

export default function ContentGapPage() {
  const [activeTab, setActiveTab] = useState<"gaps" | "analyses" | "reports">("gaps");
  const [gaps, setGaps] = useState<ContentGap[]>([]);
  const [analyses, setAnalyses] = useState<ContentAnalysis[]>([]);
  const [reports, setReports] = useState<GapReport[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedGap, setSelectedGap] = useState<ContentGap | null>(null);
  const [selectedReport, setSelectedReport] = useState<GapReport | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterPriority, setFilterPriority] = useState<string>("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [gapsRes, analysesRes, reportsRes, statsRes] = await Promise.all([
        fetch("/api/content-gap?action=gaps"),
        fetch("/api/content-gap?action=analyses"),
        fetch("/api/content-gap?action=reports"),
        fetch("/api/content-gap?action=stats"),
      ]);

      const [gapsData, analysesData, reportsData, statsData] = await Promise.all([
        gapsRes.json(),
        analysesRes.json(),
        reportsRes.json(),
        statsRes.json(),
      ]);

      setGaps(gapsData.gaps || []);
      setAnalyses(analysesData.analyses || []);
      setReports(reportsData.reports || []);
      setStats(statsData.stats);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    const analysisIds = analyses.map((a) => a.id);
    if (analysisIds.length === 0) return;

    setGenerating(true);
    try {
      const res = await fetch("/api/content-gap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-report",
          name: `Gap Analysis - ${new Date().toLocaleDateString()}`,
          analysisIds,
        }),
      });

      const data = await res.json();
      if (data.report) {
        setReports([data.report, ...reports]);
        setSelectedReport(data.report);
        loadData();
      }
    } catch (error) {
      console.error("Error generating report:", error);
    } finally {
      setGenerating(false);
    }
  };

  const updateGapStatus = async (gapId: string, status: string) => {
    try {
      const res = await fetch("/api/content-gap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update-gap-status", gapId, status }),
      });

      const data = await res.json();
      if (data.gap) {
        setGaps(gaps.map((g) => (g.id === gapId ? data.gap : g)));
        if (selectedGap?.id === gapId) {
          setSelectedGap(data.gap);
        }
        loadData();
      }
    } catch (error) {
      console.error("Error updating gap:", error);
    }
  };

  const updateGapPriority = async (gapId: string, priority: string) => {
    try {
      const res = await fetch("/api/content-gap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update-gap-priority", gapId, priority }),
      });

      const data = await res.json();
      if (data.gap) {
        setGaps(gaps.map((g) => (g.id === gapId ? data.gap : g)));
        if (selectedGap?.id === gapId) {
          setSelectedGap(data.gap);
        }
      }
    } catch (error) {
      console.error("Error updating gap:", error);
    }
  };

  const filteredGaps = gaps.filter((g) => {
    if (filterStatus && g.status !== filterStatus) return false;
    if (filterPriority && g.priority !== filterPriority) return false;
    return true;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "text-red-400 bg-red-500/20";
      case "high":
        return "text-orange-400 bg-orange-500/20";
      case "medium":
        return "text-yellow-400 bg-yellow-500/20";
      default:
        return "text-zinc-400 bg-zinc-500/20";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "covered":
        return "text-green-400 bg-green-500/20";
      case "in_progress":
        return "text-blue-400 bg-blue-500/20";
      case "planned":
        return "text-purple-400 bg-purple-500/20";
      default:
        return "text-zinc-400 bg-zinc-500/20";
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "high":
        return "text-red-400";
      case "medium":
        return "text-yellow-400";
      default:
        return "text-green-400";
    }
  };

  const getOpportunityColor = (score: number) => {
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-yellow-400";
    if (score >= 40) return "text-orange-400";
    return "text-red-400";
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Content Gap Analyzer</h1>
            <p className="text-zinc-400 mt-1">Identify content opportunities your competitors are capitalizing on</p>
          </div>
          <button
            onClick={generateReport}
            disabled={generating || analyses.length === 0}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl font-medium transition flex items-center gap-2"
          >
            {generating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Analyzing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Run Analysis
              </>
            )}
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-4 bg-zinc-900/50 rounded-xl border border-white/5">
              <p className="text-zinc-400 text-sm">Total Gaps</p>
              <p className="text-2xl font-bold mt-1">{stats.totalGaps}</p>
            </div>
            <div className="p-4 bg-zinc-900/50 rounded-xl border border-white/5">
              <p className="text-zinc-400 text-sm">High Priority</p>
              <p className="text-2xl font-bold mt-1 text-orange-400">{stats.highPriorityGaps}</p>
            </div>
            <div className="p-4 bg-zinc-900/50 rounded-xl border border-white/5">
              <p className="text-zinc-400 text-sm">Covered</p>
              <p className="text-2xl font-bold mt-1 text-green-400">{stats.coveredGaps}</p>
            </div>
            <div className="p-4 bg-zinc-900/50 rounded-xl border border-white/5">
              <p className="text-zinc-400 text-sm">Avg Opportunity</p>
              <p className="text-2xl font-bold mt-1">{stats.avgOpportunity}%</p>
            </div>
            <div className="p-4 bg-zinc-900/50 rounded-xl border border-white/5">
              <p className="text-zinc-400 text-sm">Identified</p>
              <p className="text-2xl font-bold mt-1">{stats.identifiedGaps}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 border-b border-white/10 pb-4">
          {[
            { id: "gaps", label: "Content Gaps" },
            { id: "analyses", label: "Analyses" },
            { id: "reports", label: "Reports" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                activeTab === tab.id
                  ? "bg-indigo-600 text-white"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Gaps Tab */}
        {activeTab === "gaps" && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex gap-4">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 bg-zinc-800 rounded-lg border border-white/10 focus:border-indigo-500 focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="identified">Identified</option>
                <option value="planned">Planned</option>
                <option value="in_progress">In Progress</option>
                <option value="covered">Covered</option>
              </select>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="px-4 py-2 bg-zinc-800 rounded-lg border border-white/10 focus:border-indigo-500 focus:outline-none"
              >
                <option value="">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Gap List */}
              <div className="lg:col-span-2 space-y-3">
                {filteredGaps.map((gap) => (
                  <button
                    key={gap.id}
                    onClick={() => setSelectedGap(gap)}
                    className={`w-full p-4 rounded-xl border text-left transition ${
                      selectedGap?.id === gap.id
                        ? "bg-indigo-500/10 border-indigo-500"
                        : "bg-zinc-900/50 border-white/5 hover:border-white/10"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium">{gap.topic}</h4>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${getPriorityColor(gap.priority)}`}>
                          {gap.priority}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(gap.status)}`}>
                          {gap.status.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-zinc-400 line-clamp-2 mb-3">{gap.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-zinc-500">
                          <span className={getOpportunityColor(gap.opportunity)}>{gap.opportunity}%</span> opportunity
                        </span>
                        <span className="text-zinc-500">
                          <span className={getDifficultyColor(gap.difficulty)}>{gap.difficulty}</span> difficulty
                        </span>
                      </div>
                      <div className="flex -space-x-1">
                        {gap.competitorsCovering.slice(0, 3).map((comp, idx) => (
                          <div
                            key={idx}
                            className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-xs border border-zinc-900"
                            title={comp}
                          >
                            {comp.charAt(0)}
                          </div>
                        ))}
                      </div>
                    </div>
                  </button>
                ))}

                {filteredGaps.length === 0 && (
                  <div className="text-center py-12 text-zinc-500">
                    <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <p>No gaps found</p>
                    <p className="text-sm mt-1">Run an analysis to identify content gaps</p>
                  </div>
                )}
              </div>

              {/* Gap Detail */}
              <div>
                {selectedGap ? (
                  <div className="p-4 bg-zinc-900/50 rounded-xl border border-white/5 sticky top-4">
                    <h3 className="font-semibold mb-4">{selectedGap.topic}</h3>

                    <div className="space-y-4">
                      <div>
                        <p className="text-xs text-zinc-500 mb-1">Category</p>
                        <p className="text-sm">{selectedGap.category}</p>
                      </div>

                      <div>
                        <p className="text-xs text-zinc-500 mb-1">Description</p>
                        <p className="text-sm text-zinc-400">{selectedGap.description}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-zinc-500 mb-1">Opportunity</p>
                          <p className={`text-2xl font-bold ${getOpportunityColor(selectedGap.opportunity)}`}>
                            {selectedGap.opportunity}%
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-zinc-500 mb-1">Search Volume</p>
                          <p className="text-2xl font-bold">{selectedGap.searchVolume.toLocaleString()}</p>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-zinc-500 mb-2">Competitors Covering</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedGap.competitorsCovering.map((comp) => (
                            <span key={comp} className="px-2 py-1 bg-zinc-800 rounded text-xs">
                              {comp}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-zinc-500 mb-2">Suggested Formats</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedGap.suggestedFormats.map((format) => (
                            <span key={format} className="px-2 py-1 bg-indigo-500/20 text-indigo-400 rounded text-xs">
                              {format}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-zinc-500 mb-2">Suggested Platforms</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedGap.suggestedPlatforms.map((platform) => (
                            <span key={platform} className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs">
                              {platform}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-zinc-500 mb-2">Keywords</p>
                        <div className="flex flex-wrap gap-1">
                          {selectedGap.keywords.map((kw) => (
                            <span key={kw} className="px-2 py-0.5 bg-zinc-800 rounded text-xs text-zinc-400">
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="pt-4 border-t border-white/5 space-y-2">
                        <p className="text-xs text-zinc-500 mb-2">Update Status</p>
                        <div className="grid grid-cols-2 gap-2">
                          {["identified", "planned", "in_progress", "covered"].map((status) => (
                            <button
                              key={status}
                              onClick={() => updateGapStatus(selectedGap.id, status)}
                              className={`px-3 py-1.5 rounded text-xs transition ${
                                selectedGap.status === status
                                  ? "bg-indigo-600 text-white"
                                  : "bg-zinc-800 hover:bg-zinc-700"
                              }`}
                            >
                              {status.replace("_", " ")}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs text-zinc-500">Update Priority</p>
                        <div className="grid grid-cols-4 gap-2">
                          {["low", "medium", "high", "urgent"].map((priority) => (
                            <button
                              key={priority}
                              onClick={() => updateGapPriority(selectedGap.id, priority)}
                              className={`px-2 py-1 rounded text-xs transition ${
                                selectedGap.priority === priority
                                  ? getPriorityColor(priority)
                                  : "bg-zinc-800 hover:bg-zinc-700"
                              }`}
                            >
                              {priority}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-zinc-900/50 rounded-xl border border-white/5 text-center text-zinc-500 py-12">
                    <p>Select a gap to view details</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Analyses Tab */}
        {activeTab === "analyses" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analyses.map((analysis) => (
              <div
                key={analysis.id}
                className="p-4 bg-zinc-900/50 rounded-xl border border-white/5"
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">{analysis.name}</h4>
                  <span className={`px-2 py-1 rounded text-xs ${
                    analysis.type === "self"
                      ? "bg-green-500/20 text-green-400"
                      : analysis.type === "competitor"
                      ? "bg-orange-500/20 text-orange-400"
                      : "bg-blue-500/20 text-blue-400"
                  }`}>
                    {analysis.type}
                  </span>
                </div>

                <p className="text-sm text-zinc-400 mb-4">{analysis.source}</p>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-zinc-500">Posts/Week</p>
                    <p className="text-lg font-semibold">{analysis.frequency.postsPerWeek}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Engagement</p>
                    <p className="text-lg font-semibold">{analysis.engagement.engagementRate.toFixed(1)}%</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-zinc-500 mb-2">Top Topics</p>
                  <div className="flex flex-wrap gap-1">
                    {analysis.engagement.topPerformingTopics.slice(0, 3).map((topic) => (
                      <span key={topic} className="px-2 py-0.5 bg-zinc-800 rounded text-xs">
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>

                <p className="text-xs text-zinc-500 mt-4">
                  Analyzed: {new Date(analysis.analyzedAt).toLocaleDateString()}
                </p>
              </div>
            ))}

            {analyses.length === 0 && (
              <div className="col-span-full text-center py-12 text-zinc-500">
                <p>No analyses yet</p>
                <p className="text-sm mt-1">Run an analysis to compare your content with competitors</p>
              </div>
            )}
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === "reports" && (
          <div className="space-y-4">
            {reports.map((report) => (
              <div
                key={report.id}
                className="p-6 bg-zinc-900/50 rounded-xl border border-white/5"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="font-semibold text-lg">{report.name}</h4>
                    <p className="text-sm text-zinc-400">
                      Generated: {new Date(report.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold">{report.summary.overallScore}</p>
                    <p className="text-xs text-zinc-500">Overall Score</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-3 bg-zinc-800/50 rounded-lg">
                    <p className="text-2xl font-bold">{report.summary.totalGaps}</p>
                    <p className="text-xs text-zinc-400">Total Gaps</p>
                  </div>
                  <div className="p-3 bg-zinc-800/50 rounded-lg">
                    <p className="text-2xl font-bold text-orange-400">{report.summary.highPriorityGaps}</p>
                    <p className="text-xs text-zinc-400">High Priority</p>
                  </div>
                  <div className="p-3 bg-zinc-800/50 rounded-lg">
                    <p className="text-2xl font-bold">{report.recommendations.length}</p>
                    <p className="text-xs text-zinc-400">Recommendations</p>
                  </div>
                  <div className="p-3 bg-zinc-800/50 rounded-lg">
                    <p className="text-2xl font-bold text-green-400">{report.summary.quickWins.length}</p>
                    <p className="text-xs text-zinc-400">Quick Wins</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-zinc-500 mb-2">Top Opportunities</p>
                    <div className="space-y-1">
                      {report.summary.topOpportunities.map((opp) => (
                        <div key={opp} className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-400"></span>
                          <span className="text-sm">{opp}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-2">Competitor Advantages</p>
                    <div className="space-y-1">
                      {report.summary.competitorAdvantages.slice(0, 3).map((adv) => (
                        <div key={adv} className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-orange-400"></span>
                          <span className="text-sm">{adv}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-2">Your Strengths</p>
                    <div className="space-y-1">
                      {report.summary.yourStrengths.map((str) => (
                        <div key={str} className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                          <span className="text-sm">{str}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedReport(selectedReport?.id === report.id ? null : report)}
                  className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition"
                >
                  {selectedReport?.id === report.id ? "Hide Details" : "View Details"}
                </button>

                {selectedReport?.id === report.id && (
                  <div className="mt-4 pt-4 border-t border-white/5">
                    <h5 className="font-medium mb-3">Recommendations</h5>
                    <div className="space-y-3">
                      {report.recommendations.map((rec) => (
                        <div key={rec.id} className="p-3 bg-zinc-800/50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <h6 className="font-medium text-sm">{rec.title}</h6>
                            <div className="flex gap-2">
                              <span className={`px-2 py-0.5 rounded text-xs ${
                                rec.impact === "high" ? "bg-green-500/20 text-green-400" : "bg-zinc-700"
                              }`}>
                                {rec.impact} impact
                              </span>
                              <span className={`px-2 py-0.5 rounded text-xs ${
                                rec.effort === "low" ? "bg-green-500/20 text-green-400" : "bg-zinc-700"
                              }`}>
                                {rec.effort} effort
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-zinc-400">{rec.description}</p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {rec.suggestedContent.map((content) => (
                              <span key={content} className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 rounded text-xs">
                                {content}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {reports.length === 0 && (
              <div className="text-center py-12 text-zinc-500">
                <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p>No reports yet</p>
                <p className="text-sm mt-1">Generate a report to see content gap analysis</p>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
