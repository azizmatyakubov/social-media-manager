"use client";

import { useState, useEffect } from "react";
import {
  BarChart3,
  Plus,
  Trash2,
  Copy,
  Settings,
  Download,
  Eye,
  GripVertical,
  LineChart,
  PieChart,
  TrendingUp,
  Hash,
  Users,
  Heart,
  MessageCircle,
  Share2,
  MousePointer,
  FileText,
  Layout,
  Sparkles,
} from "lucide-react";

interface ReportWidget {
  id: string;
  type: "metric" | "chart" | "table" | "comparison";
  title: string;
  metric: string;
  chartType?: "line" | "bar" | "pie" | "area";
  platforms?: string[];
  dateRange?: string;
  size: "small" | "medium" | "large";
}

interface Report {
  id: string;
  userId: string;
  name: string;
  description?: string;
  widgets: ReportWidget[];
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ReportTemplate {
  name: string;
  description: string;
  widgets: Omit<ReportWidget, "id">[];
}

interface MetricDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
}

export default function ReportBuilderPage() {
  const [activeTab, setActiveTab] = useState<"reports" | "builder" | "templates">("reports");
  const [reports, setReports] = useState<Report[]>([]);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [metrics, setMetrics] = useState<MetricDefinition[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [reportData, setReportData] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);

  // New report form state
  const [newReportName, setNewReportName] = useState("");
  const [newReportDescription, setNewReportDescription] = useState("");

  // Widget form state
  const [showWidgetForm, setShowWidgetForm] = useState(false);
  const [widgetForm, setWidgetForm] = useState<Omit<ReportWidget, "id">>({
    type: "metric",
    title: "",
    metric: "",
    chartType: "line",
    platforms: [],
    dateRange: "30d",
    size: "medium",
  });

  useEffect(() => {
    fetchReports();
    fetchTemplates();
    fetchMetrics();
  }, []);

  const fetchReports = async () => {
    try {
      const response = await fetch("/api/custom-reports?action=list");
      const data = await response.json();
      if (data.reports) {
        setReports(data.reports);
      }
    } catch (error) {
      console.error("Failed to fetch reports:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await fetch("/api/custom-reports?action=templates");
      const data = await response.json();
      if (data.templates) {
        setTemplates(data.templates);
      }
    } catch (error) {
      console.error("Failed to fetch templates:", error);
    }
  };

  const fetchMetrics = async () => {
    try {
      const response = await fetch("/api/custom-reports?action=metrics");
      const data = await response.json();
      if (data.metrics) {
        setMetrics(data.metrics);
      }
    } catch (error) {
      console.error("Failed to fetch metrics:", error);
    }
  };

  const fetchReportData = async (reportId: string) => {
    try {
      const response = await fetch(`/api/custom-reports?action=data&reportId=${reportId}`);
      const data = await response.json();
      if (data.data) {
        setReportData(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch report data:", error);
    }
  };

  const handleCreateReport = async () => {
    if (!newReportName.trim()) return;

    setIsCreating(true);
    try {
      const response = await fetch("/api/custom-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          name: newReportName,
          description: newReportDescription,
          widgets: [],
          isPublic: false,
        }),
      });

      const data = await response.json();
      if (data.report) {
        setReports([...reports, data.report]);
        setSelectedReport(data.report);
        setNewReportName("");
        setNewReportDescription("");
        setActiveTab("builder");
      }
    } catch (error) {
      console.error("Failed to create report:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateFromTemplate = async (templateIndex: number) => {
    setIsCreating(true);
    try {
      const response = await fetch("/api/custom-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-from-template",
          templateIndex,
        }),
      });

      const data = await response.json();
      if (data.report) {
        setReports([...reports, data.report]);
        setSelectedReport(data.report);
        setActiveTab("builder");
      }
    } catch (error) {
      console.error("Failed to create from template:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    try {
      const response = await fetch("/api/custom-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          reportId,
        }),
      });

      if (response.ok) {
        setReports(reports.filter((r) => r.id !== reportId));
        if (selectedReport?.id === reportId) {
          setSelectedReport(null);
        }
      }
    } catch (error) {
      console.error("Failed to delete report:", error);
    }
  };

  const handleDuplicateReport = async (reportId: string) => {
    try {
      const response = await fetch("/api/custom-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "duplicate",
          reportId,
        }),
      });

      const data = await response.json();
      if (data.report) {
        setReports([...reports, data.report]);
      }
    } catch (error) {
      console.error("Failed to duplicate report:", error);
    }
  };

  const handleAddWidget = async () => {
    if (!selectedReport || !widgetForm.title || !widgetForm.metric) return;

    try {
      const response = await fetch("/api/custom-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add-widget",
          reportId: selectedReport.id,
          widget: widgetForm,
        }),
      });

      const data = await response.json();
      if (data.report) {
        setSelectedReport(data.report);
        setReports(reports.map((r) => (r.id === data.report.id ? data.report : r)));
        setShowWidgetForm(false);
        setWidgetForm({
          type: "metric",
          title: "",
          metric: "",
          chartType: "line",
          platforms: [],
          dateRange: "30d",
          size: "medium",
        });
      }
    } catch (error) {
      console.error("Failed to add widget:", error);
    }
  };

  const handleRemoveWidget = async (widgetId: string) => {
    if (!selectedReport) return;

    try {
      const response = await fetch("/api/custom-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "remove-widget",
          reportId: selectedReport.id,
          widgetId,
        }),
      });

      const data = await response.json();
      if (data.report) {
        setSelectedReport(data.report);
        setReports(reports.map((r) => (r.id === data.report.id ? data.report : r)));
      }
    } catch (error) {
      console.error("Failed to remove widget:", error);
    }
  };

  const handlePreview = async () => {
    if (!selectedReport) return;
    setIsPreviewing(true);
    await fetchReportData(selectedReport.id);
  };

  const getWidgetIcon = (type: string) => {
    switch (type) {
      case "metric":
        return <Hash className="w-4 h-4" />;
      case "chart":
        return <LineChart className="w-4 h-4" />;
      case "table":
        return <FileText className="w-4 h-4" />;
      case "comparison":
        return <TrendingUp className="w-4 h-4" />;
      default:
        return <BarChart3 className="w-4 h-4" />;
    }
  };

  const getMetricIcon = (metric: string) => {
    if (metric.includes("follower")) return <Users className="w-4 h-4" />;
    if (metric.includes("engagement") || metric.includes("like")) return <Heart className="w-4 h-4" />;
    if (metric.includes("comment")) return <MessageCircle className="w-4 h-4" />;
    if (metric.includes("share")) return <Share2 className="w-4 h-4" />;
    if (metric.includes("click")) return <MousePointer className="w-4 h-4" />;
    return <BarChart3 className="w-4 h-4" />;
  };

  const groupedMetrics = metrics.reduce((acc, metric) => {
    if (!acc[metric.category]) {
      acc[metric.category] = [];
    }
    acc[metric.category].push(metric);
    return acc;
  }, {} as Record<string, MetricDefinition[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Custom Report Builder</h1>
          <p className="text-zinc-400 mt-1">Create personalized analytics dashboards</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("templates")}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700"
          >
            <Layout className="w-4 h-4" />
            Templates
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-800">
        <nav className="flex gap-4">
          {[
            { id: "reports", label: "My Reports", icon: FileText },
            { id: "builder", label: "Builder", icon: Settings },
            { id: "templates", label: "Templates", icon: Layout },
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
            </button>
          ))}
        </nav>
      </div>

      {/* Reports List Tab */}
      {activeTab === "reports" && (
        <div className="space-y-6">
          {/* Create New Report */}
          <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
            <h3 className="text-lg font-semibold text-white mb-4">Create New Report</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Report Name</label>
                <input
                  type="text"
                  value={newReportName}
                  onChange={(e) => setNewReportName(e.target.value)}
                  placeholder="e.g., Monthly Performance Summary"
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Description (Optional)</label>
                <input
                  type="text"
                  value={newReportDescription}
                  onChange={(e) => setNewReportDescription(e.target.value)}
                  placeholder="Brief description of this report"
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <button
              onClick={handleCreateReport}
              disabled={!newReportName.trim() || isCreating}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              {isCreating ? "Creating..." : "Create Report"}
            </button>
          </div>

          {/* Reports Grid */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Your Reports</h3>
            {isLoading ? (
              <div className="text-center py-12 text-zinc-400">Loading reports...</div>
            ) : reports.length === 0 ? (
              <div className="text-center py-12 bg-zinc-900/50 rounded-xl border border-zinc-800">
                <BarChart3 className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                <p className="text-zinc-400">No reports yet. Create your first report above!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800 hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-white">{report.name}</h4>
                        {report.description && (
                          <p className="text-sm text-zinc-400 mt-1">{report.description}</p>
                        )}
                      </div>
                      <span className="text-xs text-zinc-500">
                        {report.widgets.length} widgets
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-4">
                      {report.widgets.slice(0, 3).map((widget) => (
                        <span
                          key={widget.id}
                          className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-400"
                        >
                          {widget.title}
                        </span>
                      ))}
                      {report.widgets.length > 3 && (
                        <span className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-400">
                          +{report.widgets.length - 3} more
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedReport(report);
                          setActiveTab("builder");
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500"
                      >
                        <Settings className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDuplicateReport(report.id)}
                        className="px-3 py-2 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteReport(report.id)}
                        className="px-3 py-2 bg-zinc-800 text-red-400 rounded-lg hover:bg-zinc-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Builder Tab */}
      {activeTab === "builder" && (
        <div className="space-y-6">
          {!selectedReport ? (
            <div className="text-center py-12 bg-zinc-900/50 rounded-xl border border-zinc-800">
              <Settings className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-zinc-400 mb-4">Select a report to edit or create a new one</p>
              <button
                onClick={() => setActiveTab("reports")}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500"
              >
                Go to Reports
              </button>
            </div>
          ) : (
            <>
              {/* Report Header */}
              <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-white">{selectedReport.name}</h3>
                    {selectedReport.description && (
                      <p className="text-zinc-400 mt-1">{selectedReport.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handlePreview}
                      className="flex items-center gap-2 px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700"
                    >
                      <Eye className="w-4 h-4" />
                      Preview
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700">
                      <Download className="w-4 h-4" />
                      Export
                    </button>
                  </div>
                </div>
              </div>

              {/* Preview Mode */}
              {isPreviewing && reportData && (
                <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Report Preview</h3>
                    <button
                      onClick={() => {
                        setIsPreviewing(false);
                        setReportData(null);
                      }}
                      className="text-zinc-400 hover:text-white"
                    >
                      Close Preview
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(reportData).map(([widgetId, data]) => {
                      const widget = selectedReport.widgets.find((w) => w.id === widgetId);
                      if (!widget) return null;
                      const widgetData = data as { value?: number; change?: number };
                      return (
                        <div
                          key={widgetId}
                          className={`bg-zinc-800 rounded-lg p-4 ${
                            widget.size === "large" ? "col-span-2" : ""
                          }`}
                        >
                          <h4 className="text-sm text-zinc-400 mb-2">{widget.title}</h4>
                          <div className="text-2xl font-bold text-white">
                            {typeof widgetData?.value === "number"
                              ? widgetData.value.toLocaleString()
                              : "N/A"}
                          </div>
                          {widgetData?.change !== undefined && (
                            <div
                              className={`text-sm ${
                                widgetData.change >= 0 ? "text-green-400" : "text-red-400"
                              }`}
                            >
                              {widgetData.change >= 0 ? "+" : ""}
                              {widgetData.change.toFixed(1)}%
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Widgets Grid */}
              <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Widgets</h3>
                  <button
                    onClick={() => setShowWidgetForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500"
                  >
                    <Plus className="w-4 h-4" />
                    Add Widget
                  </button>
                </div>

                {selectedReport.widgets.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-zinc-700 rounded-lg">
                    <BarChart3 className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                    <p className="text-zinc-400">
                      No widgets yet. Add your first widget to get started!
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {selectedReport.widgets.map((widget) => (
                      <div
                        key={widget.id}
                        className={`bg-zinc-800 rounded-lg p-4 group ${
                          widget.size === "large" ? "col-span-2" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <GripVertical className="w-4 h-4 text-zinc-500 cursor-grab" />
                            {getWidgetIcon(widget.type)}
                            <span className="font-medium text-white">{widget.title}</span>
                          </div>
                          <button
                            onClick={() => handleRemoveWidget(widget.id)}
                            className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="mt-3 space-y-1 text-sm text-zinc-400">
                          <div className="flex items-center gap-2">
                            {getMetricIcon(widget.metric)}
                            <span>{widget.metric}</span>
                          </div>
                          <div>Type: {widget.type}</div>
                          {widget.chartType && <div>Chart: {widget.chartType}</div>}
                          <div>Size: {widget.size}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Widget Modal */}
              {showWidgetForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-lg border border-zinc-800">
                    <h3 className="text-lg font-semibold text-white mb-4">Add Widget</h3>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm text-zinc-400 mb-2">Widget Title</label>
                        <input
                          type="text"
                          value={widgetForm.title}
                          onChange={(e) =>
                            setWidgetForm({ ...widgetForm, title: e.target.value })
                          }
                          placeholder="e.g., Total Followers"
                          className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-zinc-400 mb-2">Widget Type</label>
                        <select
                          value={widgetForm.type}
                          onChange={(e) =>
                            setWidgetForm({
                              ...widgetForm,
                              type: e.target.value as ReportWidget["type"],
                            })
                          }
                          className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="metric">Metric Card</option>
                          <option value="chart">Chart</option>
                          <option value="table">Table</option>
                          <option value="comparison">Comparison</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm text-zinc-400 mb-2">Metric</label>
                        <select
                          value={widgetForm.metric}
                          onChange={(e) =>
                            setWidgetForm({ ...widgetForm, metric: e.target.value })
                          }
                          className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">Select a metric</option>
                          {Object.entries(groupedMetrics).map(([category, categoryMetrics]) => (
                            <optgroup key={category} label={category}>
                              {categoryMetrics.map((metric) => (
                                <option key={metric.id} value={metric.id}>
                                  {metric.name}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>

                      {widgetForm.type === "chart" && (
                        <div>
                          <label className="block text-sm text-zinc-400 mb-2">Chart Type</label>
                          <select
                            value={widgetForm.chartType}
                            onChange={(e) =>
                              setWidgetForm({
                                ...widgetForm,
                                chartType: e.target.value as ReportWidget["chartType"],
                              })
                            }
                            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="line">Line Chart</option>
                            <option value="bar">Bar Chart</option>
                            <option value="pie">Pie Chart</option>
                            <option value="area">Area Chart</option>
                          </select>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm text-zinc-400 mb-2">Size</label>
                        <select
                          value={widgetForm.size}
                          onChange={(e) =>
                            setWidgetForm({
                              ...widgetForm,
                              size: e.target.value as ReportWidget["size"],
                            })
                          }
                          className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="small">Small</option>
                          <option value="medium">Medium</option>
                          <option value="large">Large</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm text-zinc-400 mb-2">Date Range</label>
                        <select
                          value={widgetForm.dateRange}
                          onChange={(e) =>
                            setWidgetForm({ ...widgetForm, dateRange: e.target.value })
                          }
                          className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="7d">Last 7 Days</option>
                          <option value="30d">Last 30 Days</option>
                          <option value="90d">Last 90 Days</option>
                          <option value="1y">Last Year</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-6">
                      <button
                        onClick={() => setShowWidgetForm(false)}
                        className="flex-1 px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddWidget}
                        disabled={!widgetForm.title || !widgetForm.metric}
                        className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50"
                      >
                        Add Widget
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === "templates" && (
        <div className="space-y-6">
          <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <h3 className="text-lg font-semibold text-white">Report Templates</h3>
            </div>
            <p className="text-zinc-400 mb-6">
              Start with a pre-built template and customize it to your needs.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((template, index) => (
                <div
                  key={index}
                  className="bg-zinc-800 rounded-lg p-4 border border-zinc-700 hover:border-indigo-500 transition-colors"
                >
                  <h4 className="font-medium text-white mb-2">{template.name}</h4>
                  <p className="text-sm text-zinc-400 mb-4">{template.description}</p>

                  <div className="flex flex-wrap gap-1 mb-4">
                    {template.widgets.slice(0, 4).map((widget, widgetIndex) => (
                      <span
                        key={widgetIndex}
                        className="px-2 py-1 bg-zinc-900 rounded text-xs text-zinc-400"
                      >
                        {widget.title}
                      </span>
                    ))}
                    {template.widgets.length > 4 && (
                      <span className="px-2 py-1 bg-zinc-900 rounded text-xs text-zinc-400">
                        +{template.widgets.length - 4} more
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => handleCreateFromTemplate(index)}
                    disabled={isCreating}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    Use Template
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Available Metrics Reference */}
          <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
            <h3 className="text-lg font-semibold text-white mb-4">Available Metrics</h3>
            <div className="space-y-4">
              {Object.entries(groupedMetrics).map(([category, categoryMetrics]) => (
                <div key={category}>
                  <h4 className="text-sm font-medium text-zinc-300 mb-2">{category}</h4>
                  <div className="flex flex-wrap gap-2">
                    {categoryMetrics.map((metric) => (
                      <span
                        key={metric.id}
                        className="px-3 py-1 bg-zinc-800 rounded-full text-sm text-zinc-400"
                        title={metric.description}
                      >
                        {metric.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
