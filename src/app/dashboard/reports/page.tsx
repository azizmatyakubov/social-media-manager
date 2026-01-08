"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";

interface Report {
  id: string;
  name: string;
  reportType: string;
  platforms: string[];
  logoUrl: string | null;
  companyName: string | null;
  primaryColor: string;
  secondaryColor: string;
  showWatermark: boolean;
  autoGenerate: boolean;
  scheduleDay: string | null;
  scheduleTime: string | null;
  emailRecipients: string[];
  generatedCount: number;
  lastGenerated: string | null;
  createdAt: string;
}

interface ReportData {
  report: {
    id: string;
    name: string;
    reportType: string;
    companyName: string | null;
    logoUrl: string | null;
    primaryColor: string;
    secondaryColor: string;
    showWatermark: boolean;
  };
  dateRange: {
    startDate: string;
    endDate: string;
  };
  platforms: string[];
  data: Record<string, PlatformData>;
  generatedAt: string;
}

interface PlatformData {
  summary: {
    postsPublished: number;
    totalLikes: number;
    totalRetweets: number;
    totalReplies: number;
    totalImpressions: number;
    totalEngagement: number;
    engagementRate: string;
    currentFollowers: number;
    followerGrowth: number;
  };
  topPosts: Array<{
    content: string;
    likes: number;
    retweets: number;
    replies: number;
    impressions: number;
  }>;
}

const REPORT_TYPES = [
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
];

const PLATFORMS = [
  { value: "X", label: "X (Twitter)" },
  { value: "LINKEDIN", label: "LinkedIn" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "TIKTOK", label: "TikTok" },
  { value: "YOUTUBE", label: "YouTube" },
];

const SCHEDULE_DAYS = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
];

export default function ReportsPage() {
  const { data: session, status } = useSession();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [previewData, setPreviewData] = useState<ReportData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [sending, setSending] = useState<string | null>(null);

  // Create report form state
  const [formData, setFormData] = useState({
    name: "",
    reportType: "WEEKLY",
    platforms: ["X"],
    companyName: "",
    logoUrl: "",
    primaryColor: "#1DA1F2",
    secondaryColor: "#14171A",
    showWatermark: false,
  });

  // Schedule form state
  const [scheduleData, setScheduleData] = useState({
    day: "monday",
    time: "09:00",
    emailRecipients: "",
  });

  useEffect(() => {
    if (status === "authenticated") {
      fetchReports();
    }
  }, [status]);

  if (status === "loading") return <div className="p-8">Loading...</div>;
  if (status === "unauthenticated") redirect("/login");

  async function fetchReports() {
    try {
      const res = await fetch("/api/reports");
      const data = await res.json();
      setReports(data);
    } catch (error) {
      console.error("Failed to fetch reports:", error);
    } finally {
      setLoading(false);
    }
  }

  async function createReport() {
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setShowCreateModal(false);
        setFormData({
          name: "",
          reportType: "WEEKLY",
          platforms: ["X"],
          companyName: "",
          logoUrl: "",
          primaryColor: "#1DA1F2",
          secondaryColor: "#14171A",
          showWatermark: false,
        });
        fetchReports();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to create report");
      }
    } catch (error) {
      console.error("Failed to create report:", error);
      alert("Failed to create report");
    }
  }

  async function generateReport(reportId: string) {
    setGenerating(reportId);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", reportId }),
      });

      if (res.ok) {
        const data = await res.json();
        // Open report in new tab
        if (data.reportUrl) {
          window.open(data.reportUrl, "_blank");
        }
        fetchReports();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to generate report");
      }
    } catch (error) {
      console.error("Failed to generate report:", error);
      alert("Failed to generate report");
    } finally {
      setGenerating(null);
    }
  }

  async function previewReport(report: Report) {
    setSelectedReport(report);
    setPreviewLoading(true);
    setShowPreviewModal(true);

    try {
      const res = await fetch(`/api/reports?reportId=${report.id}&action=data`);
      const data = await res.json();
      setPreviewData(data);
    } catch (error) {
      console.error("Failed to fetch preview:", error);
    } finally {
      setPreviewLoading(false);
    }
  }

  async function scheduleReport() {
    if (!selectedReport) return;

    try {
      const recipients = scheduleData.emailRecipients
        .split(",")
        .map((e) => e.trim())
        .filter((e) => e);

      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "schedule",
          reportId: selectedReport.id,
          day: scheduleData.day,
          time: scheduleData.time,
          emailRecipients: recipients,
        }),
      });

      if (res.ok) {
        setShowScheduleModal(false);
        fetchReports();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to schedule report");
      }
    } catch (error) {
      console.error("Failed to schedule report:", error);
      alert("Failed to schedule report");
    }
  }

  async function sendReport(reportId: string) {
    const email = prompt("Enter email address to send report:");
    if (!email) return;

    setSending(reportId);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send",
          reportId,
          recipients: [email],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(`Report sent to ${data.sent} recipient(s)`);
      } else {
        const error = await res.json();
        alert(error.error || "Failed to send report");
      }
    } catch (error) {
      console.error("Failed to send report:", error);
      alert("Failed to send report");
    } finally {
      setSending(null);
    }
  }

  async function deleteReport(reportId: string) {
    if (!confirm("Are you sure you want to delete this report?")) return;

    try {
      const res = await fetch(`/api/reports?reportId=${reportId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchReports();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to delete report");
      }
    } catch (error) {
      console.error("Failed to delete report:", error);
      alert("Failed to delete report");
    }
  }

  function togglePlatform(platform: string) {
    setFormData((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter((p) => p !== platform)
        : [...prev.platforms, platform],
    }));
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">White-Label Reports</h1>
          <p className="text-[var(--x-text-secondary)]">
            Create branded performance reports for your clients
          </p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary">
          Create Report
        </button>
      </div>

      {/* Reports List */}
      {loading ? (
        <div className="text-center py-12 text-[var(--x-text-secondary)]">
          Loading reports...
        </div>
      ) : reports.length === 0 ? (
        <div className="x-card p-12 text-center">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="font-bold text-lg mb-2">No reports yet</h3>
          <p className="text-[var(--x-text-secondary)] mb-4">
            Create your first branded report to share with clients.
          </p>
          <button onClick={() => setShowCreateModal(true)} className="btn-primary">
            Create Your First Report
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reports.map((report) => (
            <div key={report.id} className="x-card p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg">{report.name}</h3>
                  <p className="text-sm text-[var(--x-text-secondary)]">
                    {report.companyName || "No company name"}
                  </p>
                </div>
                <span className="x-badge">{report.reportType}</span>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {report.platforms.map((platform) => (
                  <span
                    key={platform}
                    className="text-xs px-2 py-1 rounded-full bg-[var(--x-bg-tertiary)]"
                  >
                    {platform}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-2 mb-4">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: report.primaryColor }}
                />
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: report.secondaryColor }}
                />
                <span className="text-xs text-[var(--x-text-secondary)]">Brand colors</span>
              </div>

              {report.autoGenerate && (
                <div className="text-xs text-[var(--x-text-secondary)] mb-4">
                  Auto-generates: {report.scheduleDay} at {report.scheduleTime}
                </div>
              )}

              {report.lastGenerated && (
                <div className="text-xs text-[var(--x-text-secondary)] mb-4">
                  Last generated: {new Date(report.lastGenerated).toLocaleDateString()}
                  <span className="ml-2">({report.generatedCount} total)</span>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => previewReport(report)}
                  className="btn-secondary text-sm"
                >
                  Preview
                </button>
                <button
                  onClick={() => generateReport(report.id)}
                  disabled={generating === report.id}
                  className="btn-primary text-sm"
                >
                  {generating === report.id ? "Generating..." : "Download PDF"}
                </button>
                <button
                  onClick={() => sendReport(report.id)}
                  disabled={sending === report.id}
                  className="btn-secondary text-sm"
                >
                  {sending === report.id ? "Sending..." : "Email"}
                </button>
                <button
                  onClick={() => {
                    setSelectedReport(report);
                    setScheduleData({
                      day: report.scheduleDay || "monday",
                      time: report.scheduleTime || "09:00",
                      emailRecipients: report.emailRecipients.join(", "),
                    });
                    setShowScheduleModal(true);
                  }}
                  className="btn-secondary text-sm"
                >
                  Schedule
                </button>
                <button
                  onClick={() => deleteReport(report.id)}
                  className="text-red-500 hover:text-red-600 text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Report Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 x-modal-overlay flex items-center justify-center z-50">
          <div className="x-modal p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-6">Create New Report</h2>

            <div className="space-y-4">
              {/* Report Name */}
              <div>
                <label className="block text-sm font-medium mb-1">Report Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Monthly Performance Report"
                  className="x-input"
                />
              </div>

              {/* Report Type */}
              <div>
                <label className="block text-sm font-medium mb-1">Report Type</label>
                <select
                  value={formData.reportType}
                  onChange={(e) => setFormData({ ...formData, reportType: e.target.value })}
                  className="x-input"
                >
                  {REPORT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Platforms */}
              <div>
                <label className="block text-sm font-medium mb-2">Platforms</label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map((platform) => (
                    <button
                      key={platform.value}
                      onClick={() => togglePlatform(platform.value)}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        formData.platforms.includes(platform.value)
                          ? "bg-[var(--x-blue)] text-white"
                          : "bg-[var(--x-bg-tertiary)] hover:bg-[var(--x-border)]"
                      }`}
                    >
                      {platform.label}
                    </button>
                  ))}
                </div>
              </div>

              <hr className="border-[var(--x-border)]" />

              <h3 className="font-medium">Branding</h3>

              {/* Company Name */}
              <div>
                <label className="block text-sm font-medium mb-1">Company Name</label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder="Acme Corp"
                  className="x-input"
                />
              </div>

              {/* Logo URL */}
              <div>
                <label className="block text-sm font-medium mb-1">Logo URL</label>
                <input
                  type="url"
                  value={formData.logoUrl}
                  onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                  placeholder="https://example.com/logo.png"
                  className="x-input"
                />
              </div>

              {/* Colors */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Primary Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={formData.primaryColor}
                      onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                      className="h-10 w-14 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.primaryColor}
                      onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                      className="x-input flex-1"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Secondary Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={formData.secondaryColor}
                      onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                      className="h-10 w-14 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.secondaryColor}
                      onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                      className="x-input flex-1"
                    />
                  </div>
                </div>
              </div>

              {/* Show Watermark */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.showWatermark}
                  onChange={(e) => setFormData({ ...formData, showWatermark: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Show "Generated by Social Media Manager" watermark</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowCreateModal(false)} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={createReport}
                disabled={!formData.name || formData.platforms.length === 0}
                className="btn-primary"
              >
                Create Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 x-modal-overlay flex items-center justify-center z-50">
          <div className="x-modal p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Report Preview</h2>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="text-[var(--x-text-secondary)] hover:text-[var(--x-text)]"
              >
                Close
              </button>
            </div>

            {previewLoading ? (
              <div className="text-center py-12">Loading preview...</div>
            ) : previewData ? (
              <div>
                {/* Header */}
                <div
                  className="p-6 rounded-lg mb-6 text-white text-center"
                  style={{ backgroundColor: previewData.report.primaryColor }}
                >
                  {previewData.report.logoUrl && (
                    <img
                      src={previewData.report.logoUrl}
                      alt="Logo"
                      className="h-12 mx-auto mb-4"
                    />
                  )}
                  <h3 className="text-xl font-bold">
                    {previewData.report.companyName || previewData.report.name}
                  </h3>
                  <p className="opacity-90">
                    {new Date(previewData.dateRange.startDate).toLocaleDateString()} -{" "}
                    {new Date(previewData.dateRange.endDate).toLocaleDateString()}
                  </p>
                </div>

                {/* Platform Data */}
                {previewData.platforms.map((platform) => {
                  const data = previewData.data[platform] as PlatformData;
                  if (!data) return null;

                  return (
                    <div key={platform} className="mb-8">
                      <h4
                        className="text-lg font-bold mb-4 pb-2 border-b-2"
                        style={{ borderColor: previewData.report.primaryColor }}
                      >
                        {platform}
                      </h4>

                      <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="x-card p-4 text-center">
                          <div className="text-2xl font-bold">{data.summary.postsPublished}</div>
                          <div className="text-sm text-[var(--x-text-secondary)]">Posts</div>
                        </div>
                        <div className="x-card p-4 text-center">
                          <div className="text-2xl font-bold">
                            {data.summary.totalImpressions.toLocaleString()}
                          </div>
                          <div className="text-sm text-[var(--x-text-secondary)]">Impressions</div>
                        </div>
                        <div className="x-card p-4 text-center">
                          <div className="text-2xl font-bold">{data.summary.engagementRate}%</div>
                          <div className="text-sm text-[var(--x-text-secondary)]">
                            Engagement Rate
                          </div>
                        </div>
                        <div className="x-card p-4 text-center">
                          <div className="text-2xl font-bold">
                            {data.summary.totalLikes.toLocaleString()}
                          </div>
                          <div className="text-sm text-[var(--x-text-secondary)]">Likes</div>
                        </div>
                        <div className="x-card p-4 text-center">
                          <div className="text-2xl font-bold">
                            {data.summary.currentFollowers.toLocaleString()}
                          </div>
                          <div className="text-sm text-[var(--x-text-secondary)]">Followers</div>
                        </div>
                        <div className="x-card p-4 text-center">
                          <div className="text-2xl font-bold">
                            {data.summary.followerGrowth >= 0 ? "+" : ""}
                            {data.summary.followerGrowth.toLocaleString()}
                          </div>
                          <div className="text-sm text-[var(--x-text-secondary)]">Growth</div>
                        </div>
                      </div>

                      {data.topPosts.length > 0 && (
                        <div>
                          <h5 className="font-medium mb-3">Top Performing Posts</h5>
                          <div className="space-y-3">
                            {data.topPosts.slice(0, 3).map((post, i) => (
                              <div key={i} className="x-card p-4">
                                <p className="text-sm mb-2">"{post.content}"</p>
                                <div className="flex gap-4 text-xs text-[var(--x-text-secondary)]">
                                  <span>{post.likes} likes</span>
                                  <span>{post.retweets} retweets</span>
                                  <span>{post.replies} replies</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {previewData.report.showWatermark && (
                  <p className="text-center text-sm text-[var(--x-text-secondary)]">
                    Generated by Social Media Manager
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-[var(--x-text-secondary)]">
                No data available for this report
              </div>
            )}
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && selectedReport && (
        <div className="fixed inset-0 x-modal-overlay flex items-center justify-center z-50">
          <div className="x-modal p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-6">Schedule Report</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Day of Week</label>
                <select
                  value={scheduleData.day}
                  onChange={(e) => setScheduleData({ ...scheduleData, day: e.target.value })}
                  className="x-input"
                >
                  {SCHEDULE_DAYS.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Time</label>
                <input
                  type="time"
                  value={scheduleData.time}
                  onChange={(e) => setScheduleData({ ...scheduleData, time: e.target.value })}
                  className="x-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Email Recipients (comma-separated)
                </label>
                <input
                  type="text"
                  value={scheduleData.emailRecipients}
                  onChange={(e) =>
                    setScheduleData({ ...scheduleData, emailRecipients: e.target.value })
                  }
                  placeholder="client@example.com, manager@example.com"
                  className="x-input"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowScheduleModal(false)} className="btn-secondary">
                Cancel
              </button>
              <button onClick={scheduleReport} className="btn-primary">
                Save Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
