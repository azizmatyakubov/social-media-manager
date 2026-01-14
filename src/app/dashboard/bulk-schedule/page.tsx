"use client";

import { useState, useRef, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

interface ParsedCSV {
  headers: string[];
  rows: Record<string, string>[];
  totalRows: number;
}

interface BulkPost {
  content: string;
  platform: string;
  scheduledFor?: string;
  mediaUrls?: string[];
}

interface ColumnMapping {
  content: string;
  platform?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  mediaUrl?: string;
}

interface UploadError {
  row: number;
  error: string;
}

interface UploadWarning {
  row: number;
  warning: string;
}

interface Stats {
  totalPosts: number;
  scheduledPosts: number;
  recentPosts: number;
  averagePerDay: number;
}

const platforms = [
  { id: "X", name: "X (Twitter)", maxLength: 280 },
  { id: "LINKEDIN", name: "LinkedIn", maxLength: 3000 },
  { id: "INSTAGRAM", name: "Instagram", maxLength: 2200 },
  { id: "TIKTOK", name: "TikTok", maxLength: 300 },
  { id: "YOUTUBE", name: "YouTube", maxLength: 5000 },
  { id: "PINTEREST", name: "Pinterest", maxLength: 500 },
  { id: "BLUESKY", name: "Bluesky", maxLength: 300 },
];

export default function BulkSchedulePage() {
  const [step, setStep] = useState<"upload" | "mapping" | "preview" | "result">("upload");
  const [csvContent, setCsvContent] = useState("");
  const [parsedCSV, setParsedCSV] = useState<ParsedCSV | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    content: "",
    platform: "",
    scheduledDate: "",
    scheduledTime: "",
    mediaUrl: "",
  });
  const [defaultPlatform, setDefaultPlatform] = useState("");
  const [previewPosts, setPreviewPosts] = useState<BulkPost[]>([]);
  const [errors, setErrors] = useState<UploadError[]>([]);
  const [warnings, setWarnings] = useState<UploadWarning[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    total: number;
    created: number;
    failed: number;
  } | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<"DRAFT" | "SCHEDULED">("DRAFT");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/bulk-schedule?action=stats");
      const data = await res.json();
      setStats(data.stats);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    setCsvContent(text);
    await parseCSVContent(text);
  };

  const parseCSVContent = async (content: string) => {
    setLoading(true);
    setErrors([]);

    try {
      const res = await fetch("/api/bulk-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "parse", csvContent: content }),
      });

      const data = await res.json();

      if (data.error) {
        setErrors([{ row: 0, error: data.error }]);
        return;
      }

      setParsedCSV(data.parsed);
      setStep("mapping");

      // Auto-detect column mappings
      const headers = data.parsed.headers.map((h: string) => h.toLowerCase());
      const newMapping: ColumnMapping = { content: "" };

      headers.forEach((header: string, index: number) => {
        const originalHeader = data.parsed.headers[index];
        if (header.includes("content") || header.includes("text") || header.includes("post") || header.includes("message")) {
          newMapping.content = originalHeader;
        }
        if (header.includes("platform") || header.includes("network")) {
          newMapping.platform = originalHeader;
        }
        if (header.includes("date") && !header.includes("time")) {
          newMapping.scheduledDate = originalHeader;
        }
        if (header.includes("time") && !header.includes("date")) {
          newMapping.scheduledTime = originalHeader;
        }
        if (header.includes("media") || header.includes("image") || header.includes("url")) {
          newMapping.mediaUrl = originalHeader;
        }
      });

      setColumnMapping(newMapping);
    } catch {
      setErrors([{ row: 0, error: "Failed to parse CSV file" }]);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async () => {
    if (!parsedCSV || !columnMapping.content) return;

    setLoading(true);
    setErrors([]);
    setWarnings([]);

    try {
      const res = await fetch("/api/bulk-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "preview",
          rows: parsedCSV.rows,
          mapping: columnMapping,
          defaultPlatform: defaultPlatform || undefined,
        }),
      });

      const data = await res.json();

      if (data.error) {
        setErrors([{ row: 0, error: data.error }]);
        return;
      }

      setPreviewPosts(data.posts);
      setErrors(data.errors || []);
      setWarnings(data.warnings || []);
      setStep("preview");
    } catch {
      setErrors([{ row: 0, error: "Failed to process posts" }]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (previewPosts.length === 0) return;

    setLoading(true);

    try {
      const res = await fetch("/api/bulk-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upload",
          posts: previewPosts,
          defaultStatus,
        }),
      });

      const data = await res.json();

      if (data.error) {
        setErrors([{ row: 0, error: data.error }]);
        return;
      }

      setUploadResult(data.result);
      setStep("result");
      fetchStats();
    } catch {
      setErrors([{ row: 0, error: "Failed to upload posts" }]);
    } finally {
      setLoading(false);
    }
  };

  const downloadSampleCSV = () => {
    window.open("/api/bulk-schedule?action=sample-csv", "_blank");
  };

  const resetForm = () => {
    setStep("upload");
    setCsvContent("");
    setParsedCSV(null);
    setColumnMapping({ content: "" });
    setDefaultPlatform("");
    setPreviewPosts([]);
    setErrors([]);
    setWarnings([]);
    setUploadResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const updatePostContent = (index: number, content: string) => {
    const newPosts = [...previewPosts];
    newPosts[index] = { ...newPosts[index], content };
    setPreviewPosts(newPosts);
  };

  const removePost = (index: number) => {
    setPreviewPosts(previewPosts.filter((_, i) => i !== index));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Bulk Scheduler</h1>
            <p className="text-zinc-400 mt-1">
              Upload multiple posts at once using CSV
            </p>
          </div>
          <button
            onClick={downloadSampleCSV}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg font-medium transition flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Sample CSV
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-zinc-900/50 rounded-xl p-4 border border-white/5">
              <p className="text-sm text-zinc-400">Total Posts</p>
              <p className="text-2xl font-bold mt-1">{stats.totalPosts}</p>
            </div>
            <div className="bg-zinc-900/50 rounded-xl p-4 border border-white/5">
              <p className="text-sm text-zinc-400">Scheduled</p>
              <p className="text-2xl font-bold mt-1">{stats.scheduledPosts}</p>
            </div>
            <div className="bg-zinc-900/50 rounded-xl p-4 border border-white/5">
              <p className="text-sm text-zinc-400">Last 30 Days</p>
              <p className="text-2xl font-bold mt-1">{stats.recentPosts}</p>
            </div>
            <div className="bg-zinc-900/50 rounded-xl p-4 border border-white/5">
              <p className="text-sm text-zinc-400">Avg Per Day</p>
              <p className="text-2xl font-bold mt-1">{stats.averagePerDay}</p>
            </div>
          </div>
        )}

        {/* Steps indicator */}
        <div className="flex items-center gap-4">
          {["upload", "mapping", "preview", "result"].map((s, idx) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-medium ${
                  step === s
                    ? "bg-indigo-600 text-white"
                    : idx < ["upload", "mapping", "preview", "result"].indexOf(step)
                    ? "bg-green-500 text-white"
                    : "bg-zinc-800 text-zinc-400"
                }`}
              >
                {idx < ["upload", "mapping", "preview", "result"].indexOf(step) ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  idx + 1
                )}
              </div>
              {idx < 3 && (
                <div
                  className={`w-12 h-0.5 ${
                    idx < ["upload", "mapping", "preview", "result"].indexOf(step)
                      ? "bg-green-500"
                      : "bg-zinc-800"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
            <h3 className="font-semibold text-red-400 mb-2">Errors</h3>
            <ul className="space-y-1 text-sm text-red-300">
              {errors.slice(0, 5).map((err, idx) => (
                <li key={idx}>
                  {err.row > 0 ? `Row ${err.row}: ` : ""}{err.error}
                </li>
              ))}
              {errors.length > 5 && (
                <li className="text-zinc-400">...and {errors.length - 5} more errors</li>
              )}
            </ul>
          </div>
        )}

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
            <h3 className="font-semibold text-amber-400 mb-2">Warnings</h3>
            <ul className="space-y-1 text-sm text-amber-300">
              {warnings.slice(0, 3).map((warn, idx) => (
                <li key={idx}>
                  Row {warn.row}: {warn.warning}
                </li>
              ))}
              {warnings.length > 3 && (
                <li className="text-zinc-400">...and {warnings.length - 3} more warnings</li>
              )}
            </ul>
          </div>
        )}

        {/* Step 1: Upload */}
        {step === "upload" && (
          <div className="bg-zinc-900/50 rounded-xl border border-white/5 p-8">
            <div className="max-w-xl mx-auto text-center">
              <div
                className="border-2 border-dashed border-white/10 rounded-xl p-12 hover:border-indigo-500/50 transition cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <svg className="w-16 h-16 mx-auto text-zinc-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <h3 className="text-lg font-medium mb-2">Upload CSV File</h3>
                <p className="text-zinc-400 text-sm mb-4">
                  Drag and drop or click to select your CSV file
                </p>
                <p className="text-xs text-zinc-500">
                  Supported columns: content, platform, scheduled_date, scheduled_time, media_url
                </p>
              </div>

              <div className="mt-6 text-center">
                <p className="text-zinc-400 text-sm mb-3">Or paste CSV content directly</p>
                <textarea
                  value={csvContent}
                  onChange={(e) => setCsvContent(e.target.value)}
                  placeholder="content,platform,scheduled_date&#10;My first post,X,2024-01-15"
                  rows={4}
                  className="w-full px-4 py-3 bg-zinc-800/50 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                />
                {csvContent && (
                  <button
                    onClick={() => parseCSVContent(csvContent)}
                    disabled={loading}
                    className="mt-4 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition"
                  >
                    {loading ? "Processing..." : "Parse CSV"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Column Mapping */}
        {step === "mapping" && parsedCSV && (
          <div className="bg-zinc-900/50 rounded-xl border border-white/5 p-6">
            <h2 className="text-lg font-semibold mb-4">Map Your Columns</h2>
            <p className="text-zinc-400 text-sm mb-6">
              We found {parsedCSV.totalRows} rows in your CSV. Match the columns to the correct fields.
            </p>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Content Column <span className="text-red-400">*</span>
                </label>
                <select
                  value={columnMapping.content}
                  onChange={(e) => setColumnMapping({ ...columnMapping, content: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select column</option>
                  {parsedCSV.headers.map((header) => (
                    <option key={header} value={header}>{header}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Platform Column</label>
                <select
                  value={columnMapping.platform || ""}
                  onChange={(e) => setColumnMapping({ ...columnMapping, platform: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select column (optional)</option>
                  {parsedCSV.headers.map((header) => (
                    <option key={header} value={header}>{header}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Scheduled Date Column</label>
                <select
                  value={columnMapping.scheduledDate || ""}
                  onChange={(e) => setColumnMapping({ ...columnMapping, scheduledDate: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select column (optional)</option>
                  {parsedCSV.headers.map((header) => (
                    <option key={header} value={header}>{header}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Scheduled Time Column</label>
                <select
                  value={columnMapping.scheduledTime || ""}
                  onChange={(e) => setColumnMapping({ ...columnMapping, scheduledTime: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select column (optional)</option>
                  {parsedCSV.headers.map((header) => (
                    <option key={header} value={header}>{header}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Media URL Column</label>
                <select
                  value={columnMapping.mediaUrl || ""}
                  onChange={(e) => setColumnMapping({ ...columnMapping, mediaUrl: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select column (optional)</option>
                  {parsedCSV.headers.map((header) => (
                    <option key={header} value={header}>{header}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Default Platform</label>
                <select
                  value={defaultPlatform}
                  onChange={(e) => setDefaultPlatform(e.target.value)}
                  className="w-full px-4 py-2 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select if no platform column</option>
                  {platforms.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Preview of first row */}
            {parsedCSV.rows[0] && columnMapping.content && (
              <div className="mt-6 p-4 bg-zinc-800/50 rounded-lg">
                <p className="text-sm font-medium mb-2">Preview (First Row)</p>
                <p className="text-sm text-zinc-400">
                  Content: {parsedCSV.rows[0][columnMapping.content] || "(empty)"}
                </p>
                {columnMapping.platform && (
                  <p className="text-sm text-zinc-400">
                    Platform: {parsedCSV.rows[0][columnMapping.platform] || "(empty)"}
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-4 mt-6">
              <button
                onClick={() => setStep("upload")}
                className="px-6 py-2 bg-white/5 hover:bg-white/10 rounded-lg font-medium transition"
              >
                Back
              </button>
              <button
                onClick={handlePreview}
                disabled={loading || !columnMapping.content}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 disabled:cursor-not-allowed rounded-lg font-medium transition"
              >
                {loading ? "Processing..." : "Preview Posts"}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === "preview" && (
          <div className="space-y-6">
            <div className="bg-zinc-900/50 rounded-xl border border-white/5 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">
                  Preview ({previewPosts.length} posts)
                </h2>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <span className="text-sm text-zinc-400">Status:</span>
                    <select
                      value={defaultStatus}
                      onChange={(e) => setDefaultStatus(e.target.value as "DRAFT" | "SCHEDULED")}
                      className="px-3 py-1 bg-zinc-800 border border-white/10 rounded-lg text-sm"
                    >
                      <option value="DRAFT">Save as Draft</option>
                      <option value="SCHEDULED">Schedule</option>
                    </select>
                  </label>
                </div>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {previewPosts.map((post, index) => (
                  <div
                    key={index}
                    className="bg-zinc-800/50 rounded-lg p-4 group hover:bg-zinc-800 transition"
                  >
                    <div className="flex items-start gap-4">
                      <span className="text-xs text-zinc-500 font-mono mt-1">
                        #{index + 1}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            post.platform === "X" ? "bg-black" :
                            post.platform === "LINKEDIN" ? "bg-blue-600" :
                            post.platform === "INSTAGRAM" ? "bg-pink-600" :
                            "bg-zinc-600"
                          }`}>
                            {post.platform}
                          </span>
                          {post.scheduledFor && (
                            <span className="text-xs text-zinc-400">
                              {new Date(post.scheduledFor).toLocaleString()}
                            </span>
                          )}
                        </div>
                        <textarea
                          value={post.content}
                          onChange={(e) => updatePostContent(index, e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 bg-zinc-900/50 border border-white/5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                        />
                        <div className="flex items-center justify-between mt-2">
                          <span className={`text-xs ${
                            post.content.length > (platforms.find(p => p.id === post.platform)?.maxLength || 1000)
                              ? "text-red-400"
                              : "text-zinc-500"
                          }`}>
                            {post.content.length} / {platforms.find(p => p.id === post.platform)?.maxLength || "?"} chars
                          </span>
                          {post.mediaUrls && post.mediaUrls.length > 0 && (
                            <span className="text-xs text-zinc-400">
                              {post.mediaUrls.length} media file(s)
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => removePost(index)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep("mapping")}
                className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-lg font-medium transition"
              >
                Back
              </button>
              <button
                onClick={handleUpload}
                disabled={loading || previewPosts.length === 0}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 disabled:cursor-not-allowed rounded-lg font-medium transition"
              >
                {loading ? "Uploading..." : `Upload ${previewPosts.length} Posts`}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Result */}
        {step === "result" && uploadResult && (
          <div className="bg-zinc-900/50 rounded-xl border border-white/5 p-8">
            <div className="max-w-md mx-auto text-center">
              <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6 ${
                uploadResult.failed === 0 ? "bg-green-500/20" : "bg-amber-500/20"
              }`}>
                {uploadResult.failed === 0 ? (
                  <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-10 h-10 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                )}
              </div>

              <h2 className="text-2xl font-bold mb-2">
                {uploadResult.failed === 0 ? "All Posts Created!" : "Upload Complete"}
              </h2>
              <p className="text-zinc-400 mb-6">
                {uploadResult.created} of {uploadResult.total} posts were successfully created
              </p>

              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-zinc-800/50 rounded-lg p-4">
                  <p className="text-2xl font-bold">{uploadResult.total}</p>
                  <p className="text-xs text-zinc-400">Total</p>
                </div>
                <div className="bg-green-500/10 rounded-lg p-4">
                  <p className="text-2xl font-bold text-green-400">{uploadResult.created}</p>
                  <p className="text-xs text-zinc-400">Created</p>
                </div>
                <div className="bg-red-500/10 rounded-lg p-4">
                  <p className="text-2xl font-bold text-red-400">{uploadResult.failed}</p>
                  <p className="text-xs text-zinc-400">Failed</p>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={resetForm}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-lg font-medium transition"
                >
                  Upload More
                </button>
                <a
                  href="/dashboard/posts"
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition text-center"
                >
                  View Posts
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
