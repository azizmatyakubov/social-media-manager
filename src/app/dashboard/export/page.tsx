"use client";

import { useState, useEffect } from "react";

interface DataEstimate {
  posts: number;
  analytics: number;
  estimatedSizeKB: number;
}

type ExportType = "posts" | "analytics" | "account" | "full";
type ExportFormat = "csv" | "json";

interface ExportHistoryItem {
  id: string;
  type: ExportType;
  format: ExportFormat;
  createdAt: string;
  size: string;
}

export default function ExportPage() {
  const [activeTab, setActiveTab] = useState<"export" | "history" | "gdpr">("export");
  const [exportType, setExportType] = useState<ExportType>("posts");
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [estimate, setEstimate] = useState<DataEstimate | null>(null);
  const [exportHistory] = useState<ExportHistoryItem[]>([]);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchEstimate();
  }, []);

  const fetchEstimate = async () => {
    try {
      const response = await fetch("/api/export?action=estimate");
      if (response.ok) {
        const data = await response.json();
        setEstimate(data);
      }
    } catch (error) {
      console.error("Failed to fetch estimate:", error);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: exportType,
          format,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Export failed");
      }

      // Get the filename from headers
      const contentDisposition = response.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] || `export.${format}`;

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setMessage({ type: "success", text: "Export completed successfully!" });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Export failed",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const exportTypes: { value: ExportType; label: string; description: string; icon: JSX.Element }[] = [
    {
      value: "posts",
      label: "Posts",
      description: "All your posts with engagement metrics",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
    {
      value: "analytics",
      label: "Analytics",
      description: "Daily metrics and performance data",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      value: "account",
      label: "Account",
      description: "Profile info and connected accounts",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    {
      value: "full",
      label: "Full Export",
      description: "Everything - posts, analytics, and account",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
        </svg>
      ),
    },
  ];

  const formats: { value: ExportFormat; label: string; description: string }[] = [
    { value: "csv", label: "CSV", description: "Spreadsheet compatible" },
    { value: "json", label: "JSON", description: "Developer friendly" },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Export Data</h1>
        <p className="text-zinc-400 mt-1">
          Download your data in various formats
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-4">
        {[
          { id: "export", label: "Export" },
          { id: "history", label: "History" },
          { id: "gdpr", label: "GDPR Request" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-white/10 text-white"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "export" && (
        <div className="space-y-6">
          {/* Data Estimate */}
          {estimate && (
            <div className="p-4 bg-zinc-900/50 border border-white/10 rounded-xl">
              <h3 className="text-sm font-medium text-zinc-400 mb-3">Your Data</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold">{estimate.posts}</p>
                  <p className="text-xs text-zinc-500">Posts</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{estimate.analytics}</p>
                  <p className="text-xs text-zinc-500">Analytics Records</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">~{estimate.estimatedSizeKB}KB</p>
                  <p className="text-xs text-zinc-500">Estimated Size</p>
                </div>
              </div>
            </div>
          )}

          {/* Export Type Selection */}
          <div>
            <label className="block text-sm font-medium mb-3">What to Export</label>
            <div className="grid grid-cols-2 gap-3">
              {exportTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setExportType(type.value)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    exportType === type.value
                      ? "border-indigo-500 bg-indigo-500/10"
                      : "border-white/10 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`${
                        exportType === type.value ? "text-indigo-400" : "text-zinc-400"
                      }`}
                    >
                      {type.icon}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{type.label}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{type.description}</p>
                    </div>
                    {exportType === type.value && (
                      <svg className="w-5 h-5 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium mb-3">Format</label>
            <div className="flex gap-3">
              {formats.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFormat(f.value)}
                  className={`flex-1 p-4 rounded-xl border text-center transition-all ${
                    format === f.value
                      ? "border-indigo-500 bg-indigo-500/10"
                      : "border-white/10 hover:border-white/20"
                  }`}
                >
                  <p className="font-medium">{f.label}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{f.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Date Range */}
          {(exportType === "posts" || exportType === "analytics" || exportType === "full") && (
            <div>
              <label className="block text-sm font-medium mb-3">
                Date Range{" "}
                <span className="text-zinc-500 font-normal">(optional)</span>
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1.5">From</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-900/50 border border-white/10 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1.5">To</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-900/50 border border-white/10 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
              <p className="text-xs text-zinc-500 mt-2">
                Leave empty to export all data
              </p>
            </div>
          )}

          {/* Message */}
          {message && (
            <div
              className={`p-4 rounded-lg ${
                message.type === "success"
                  ? "bg-green-500/10 border border-green-500/20 text-green-400"
                  : "bg-red-500/10 border border-red-500/20 text-red-400"
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Export Button */}
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isExporting ? (
              <>
                <svg
                  className="w-5 h-5 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Exporting...
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Export Data
              </>
            )}
          </button>
        </div>
      )}

      {activeTab === "history" && (
        <div className="space-y-4">
          <p className="text-zinc-400 text-sm">
            Your recent exports will appear here. Exports are available for download
            for 24 hours.
          </p>

          {exportHistory.length === 0 ? (
            <div className="text-center py-12 bg-zinc-900/50 border border-white/10 rounded-xl">
              <svg
                className="w-12 h-12 mx-auto text-zinc-600 mb-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              <p className="text-zinc-400">No export history yet</p>
              <p className="text-xs text-zinc-500 mt-1">
                Your exports will appear here once you create them
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {exportHistory.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 bg-zinc-900/50 border border-white/10 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/5 rounded-lg">
                      <svg
                        className="w-5 h-5 text-zinc-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium capitalize">
                        {item.type} Export
                      </p>
                      <p className="text-xs text-zinc-500">
                        {item.format.toUpperCase()} - {item.size} -{" "}
                        {new Date(item.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                    <svg
                      className="w-5 h-5 text-zinc-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "gdpr" && (
        <div className="space-y-6">
          <div className="p-6 bg-zinc-900/50 border border-white/10 rounded-xl">
            <h3 className="text-lg font-semibold mb-2">
              Your Data, Your Rights
            </h3>
            <p className="text-zinc-400 text-sm mb-4">
              Under GDPR and similar regulations, you have the right to access,
              export, and delete your personal data. We make this process simple
              and transparent.
            </p>

            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-white/5 rounded-lg">
                <div className="p-2 bg-indigo-500/10 rounded-lg">
                  <svg
                    className="w-5 h-5 text-indigo-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium">Data Access</h4>
                  <p className="text-sm text-zinc-400 mt-1">
                    You can export all your data anytime using the Export tab.
                    This includes posts, analytics, and account information.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-white/5 rounded-lg">
                <div className="p-2 bg-yellow-500/10 rounded-lg">
                  <svg
                    className="w-5 h-5 text-yellow-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium">Data Correction</h4>
                  <p className="text-sm text-zinc-400 mt-1">
                    You can update your profile information in Settings at any
                    time.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-white/5 rounded-lg">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <svg
                    className="w-5 h-5 text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium">Data Deletion</h4>
                  <p className="text-sm text-zinc-400 mt-1">
                    You can delete your account and all associated data from
                    Settings. This action is irreversible.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-yellow-400 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h4 className="font-medium text-yellow-400">
                  Need Additional Help?
                </h4>
                <p className="text-sm text-zinc-400 mt-1">
                  If you need assistance with your data rights or have specific
                  requests, please contact our support team at
                  privacy@autopost.com
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
