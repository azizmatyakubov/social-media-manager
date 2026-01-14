"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";

interface RepurposedContent {
  id: string;
  sourceType: string;
  sourceContent: string;
  outputType: string;
  outputContent: string;
  outputPlatform: string | null;
  status: string;
  createdAt: string;
}

const CONTENT_TYPES = [
  { value: "TWEET", label: "Tweet", icon: "X", maxLength: 280 },
  { value: "THREAD", label: "Thread", icon: "X", maxLength: "280/tweet" },
  { value: "LINKEDIN_POST", label: "LinkedIn Post", icon: "in", maxLength: 3000 },
  { value: "INSTAGRAM_CAPTION", label: "Instagram Caption", icon: "IG", maxLength: 2200 },
  { value: "BLOG_POST", label: "Blog Post", icon: "B", maxLength: "5000+" },
  { value: "VIDEO_SCRIPT", label: "Video Script", icon: "YT", maxLength: "2-5 min" },
  { value: "NEWSLETTER", label: "Newsletter", icon: "M", maxLength: "500-1000 words" },
];

const QUICK_TEMPLATES = [
  { source: "TWEET", output: "THREAD", label: "Tweet to Thread", description: "Expand a tweet into a detailed thread" },
  { source: "THREAD", output: "LINKEDIN_POST", label: "Thread to LinkedIn", description: "Convert thread to a LinkedIn post" },
  { source: "BLOG_POST", output: "TWEET", label: "Blog to Tweets", description: "Extract key points as tweets" },
  { source: "BLOG_POST", output: "VIDEO_SCRIPT", label: "Blog to Video", description: "Create a video script from blog" },
  { source: "TWEET", output: "INSTAGRAM_CAPTION", label: "Tweet to Instagram", description: "Adapt for Instagram with hashtags" },
  { source: "VIDEO_SCRIPT", output: "BLOG_POST", label: "Video to Blog", description: "Convert video script to article" },
];

type ViewMode = "create" | "templates" | "history";

export default function RepurposePage() {
  const { data: session, status } = useSession();
  const [content, setContent] = useState<RepurposedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [sourceContent, setSourceContent] = useState("");
  const [sourceType, setSourceType] = useState("TWEET");
  const [outputType, setOutputType] = useState("THREAD");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [result, setResult] = useState<RepurposedContent | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("create");
  const [selectedResult, setSelectedResult] = useState<RepurposedContent | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [importingUrl, setImportingUrl] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [selectedOutputs, setSelectedOutputs] = useState<string[]>([]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchContent();
    }
  }, [status]);

  if (status === "loading") return <div className="p-8">Loading...</div>;
  if (status === "unauthenticated") redirect("/login");

  async function fetchContent() {
    try {
      const res = await fetch("/api/repurpose");
      const data = await res.json();
      setContent(data);
    } catch (error) {
      console.error("Failed to fetch content:", error);
    } finally {
      setLoading(false);
    }
  }

  async function getSuggestions() {
    if (!sourceContent) return;

    const res = await fetch("/api/repurpose", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "suggest", content: sourceContent }),
    });

    const data = await res.json();
    setSuggestions(data.suggestions || []);
  }

  async function repurpose() {
    if (!sourceContent) return;
    setProcessing(true);
    setResult(null);

    try {
      if (batchMode && selectedOutputs.length > 0) {
        // Batch repurpose to multiple formats
        const results = [];
        for (const output of selectedOutputs) {
          const res = await fetch("/api/repurpose", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "repurpose",
              content: sourceContent,
              sourceType,
              outputType: output,
            }),
          });
          const data = await res.json();
          results.push(data);
        }
        setResult(results[0]); // Show first result
        fetchContent();
      } else {
        const res = await fetch("/api/repurpose", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "repurpose",
            content: sourceContent,
            sourceType,
            outputType,
          }),
        });

        const data = await res.json();
        setResult(data);
        setEditedContent(data.outputContent);
        fetchContent();
      }
    } catch (error) {
      console.error("Failed to repurpose:", error);
    } finally {
      setProcessing(false);
    }
  }

  async function quickAction(action: string) {
    if (!sourceContent) return;
    setProcessing(true);
    setResult(null);

    try {
      const res = await fetch("/api/repurpose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, content: sourceContent }),
      });

      const data = await res.json();
      setResult(data);
      setEditedContent(data.outputContent);
      fetchContent();
    } catch (error) {
      console.error("Failed:", error);
    } finally {
      setProcessing(false);
    }
  }

  async function useTemplate(template: typeof QUICK_TEMPLATES[0]) {
    setSourceType(template.source);
    setOutputType(template.output);
    setViewMode("create");
  }

  async function publishContent(id: string) {
    await fetch("/api/repurpose", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "publish", id }),
    });
    fetchContent();
  }

  async function updateContent(id: string, newContent: string) {
    await fetch("/api/repurpose", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, outputContent: newContent }),
    });
    fetchContent();
  }

  async function importFromUrl() {
    if (!urlInput) return;
    setImportingUrl(true);

    try {
      // For now, just show a message - in production this would fetch and parse the URL
      alert("URL import feature: In production, this would fetch the content from the URL and pre-fill the editor.");
      setImportingUrl(false);
    } catch (error) {
      console.error("Failed to import:", error);
      setImportingUrl(false);
    }
  }

  function toggleBatchOutput(type: string) {
    setSelectedOutputs(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  }

  function getContentTypeInfo(value: string) {
    return CONTENT_TYPES.find(t => t.value === value);
  }

  function getCharacterCount() {
    const info = getContentTypeInfo(sourceType);
    const max = typeof info?.maxLength === 'number' ? info.maxLength : null;
    if (!max) return null;
    const count = sourceContent.length;
    const percentage = (count / max) * 100;
    return { count, max, percentage };
  }

  const charCount = getCharacterCount();

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold">Content Repurposing</h1>
          <p className="text-[var(--x-text-secondary)]">
            Transform your content into different formats for multiple platforms
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setBatchMode(!batchMode)}
            className={`btn-secondary text-sm ${batchMode ? "bg-[var(--x-blue)]/20" : ""}`}
          >
            {batchMode ? "Single Mode" : "Batch Mode"}
          </button>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="flex gap-2 mb-6 border-b border-[var(--x-border)]">
        {(["create", "templates", "history"] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`px-4 py-2 -mb-px border-b-2 transition-colors capitalize ${
              viewMode === mode
                ? "border-[var(--x-blue)] text-[var(--x-blue)]"
                : "border-transparent text-[var(--x-text-secondary)] hover:text-[var(--x-text-primary)]"
            }`}
          >
            {mode === "create" ? "Repurpose" : mode}
          </button>
        ))}
      </div>

      {viewMode === "create" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Input */}
          <div className="space-y-4">
            {/* URL Import */}
            <div className="x-card p-4">
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="Import from URL (blog post, article...)"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="x-input flex-1"
                />
                <button
                  onClick={importFromUrl}
                  disabled={!urlInput || importingUrl}
                  className="btn-secondary"
                >
                  {importingUrl ? "..." : "Import"}
                </button>
              </div>
            </div>

            {/* Source Content */}
            <div className="x-card p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold">Source Content</h3>
                <select
                  value={sourceType}
                  onChange={(e) => setSourceType(e.target.value)}
                  className="x-input w-auto text-sm"
                >
                  {CONTENT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <textarea
                placeholder="Paste or type your content here..."
                value={sourceContent}
                onChange={(e) => {
                  setSourceContent(e.target.value);
                  setSuggestions([]);
                }}
                className="x-input mb-2"
                rows={8}
              />

              {charCount && (
                <div className="flex justify-between text-sm text-[var(--x-text-secondary)]">
                  <span>{charCount.count} / {charCount.max} characters</span>
                  <span className={charCount.percentage > 100 ? "text-red-500" : ""}>
                    {charCount.percentage > 100 ? "Over limit!" : `${charCount.percentage.toFixed(0)}%`}
                  </span>
                </div>
              )}

              <div className="flex gap-2 mt-4">
                <button
                  onClick={getSuggestions}
                  disabled={!sourceContent}
                  className="btn-secondary text-sm"
                >
                  Suggest Formats
                </button>
                <button
                  onClick={() => setSourceContent("")}
                  className="btn-secondary text-sm"
                >
                  Clear
                </button>
              </div>

              {suggestions.length > 0 && (
                <div className="mt-4 pt-4 border-t border-[var(--x-border)]">
                  <p className="text-sm text-[var(--x-text-secondary)] mb-2">Suggested output formats:</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => setOutputType(s)}
                        className={`x-badge cursor-pointer ${outputType === s ? "x-badge-blue" : ""}`}
                      >
                        {s.replace(/_/g, " ")}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Output Selection */}
            <div className="x-card p-6">
              <h3 className="font-bold mb-4">
                {batchMode ? "Select Output Formats" : "Output Format"}
              </h3>

              {batchMode ? (
                <div className="grid grid-cols-2 gap-2">
                  {CONTENT_TYPES.filter(t => t.value !== sourceType).map((type) => (
                    <button
                      key={type.value}
                      onClick={() => toggleBatchOutput(type.value)}
                      className={`p-3 rounded-lg border text-left transition-colors ${
                        selectedOutputs.includes(type.value)
                          ? "border-[var(--x-blue)] bg-[var(--x-blue)]/10"
                          : "border-[var(--x-border)] hover:border-[var(--x-blue)]/50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded bg-[var(--x-bg-secondary)] flex items-center justify-center text-xs font-bold">
                          {type.icon}
                        </span>
                        <span className="font-medium">{type.label}</span>
                      </div>
                      <p className="text-xs text-[var(--x-text-secondary)] mt-1">
                        Max: {type.maxLength}
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {CONTENT_TYPES.filter(t => t.value !== sourceType).map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setOutputType(type.value)}
                      className={`p-3 rounded-lg border text-left transition-colors ${
                        outputType === type.value
                          ? "border-[var(--x-blue)] bg-[var(--x-blue)]/10"
                          : "border-[var(--x-border)] hover:border-[var(--x-blue)]/50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded bg-[var(--x-bg-secondary)] flex items-center justify-center text-xs font-bold">
                          {type.icon}
                        </span>
                        <span className="font-medium">{type.label}</span>
                      </div>
                      <p className="text-xs text-[var(--x-text-secondary)] mt-1">
                        Max: {type.maxLength}
                      </p>
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={repurpose}
                disabled={!sourceContent || processing || (batchMode && selectedOutputs.length === 0)}
                className="btn-primary w-full mt-4"
              >
                {processing ? "Processing..." : batchMode ? `Repurpose to ${selectedOutputs.length} formats` : "Repurpose Content"}
              </button>
            </div>

            {/* Quick Actions */}
            <div className="x-card p-6">
              <h3 className="font-bold mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => quickAction("tweet-to-thread")}
                  disabled={!sourceContent || processing}
                  className="btn-secondary text-sm"
                >
                  Tweet to Thread
                </button>
                <button
                  onClick={() => quickAction("thread-to-linkedin")}
                  disabled={!sourceContent || processing}
                  className="btn-secondary text-sm"
                >
                  Thread to LinkedIn
                </button>
                <button
                  onClick={() => quickAction("to-video-script")}
                  disabled={!sourceContent || processing}
                  className="btn-secondary text-sm"
                >
                  To Video Script
                </button>
                <button
                  onClick={() => quickAction("blog-to-social")}
                  disabled={!sourceContent || processing}
                  className="btn-secondary text-sm"
                >
                  Blog to Social
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Output */}
          <div className="space-y-4">
            {result ? (
              <div className="x-card p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold">Repurposed Content</h3>
                  <span className="x-badge x-badge-blue">
                    {result.outputType.replace(/_/g, " ")}
                  </span>
                </div>

                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="x-input mb-4"
                  rows={12}
                />

                <div className="flex justify-between">
                  <div className="text-sm text-[var(--x-text-secondary)]">
                    {editedContent.length} characters
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigator.clipboard.writeText(editedContent)}
                      className="btn-secondary text-sm"
                    >
                      Copy
                    </button>
                    {editedContent !== result.outputContent && (
                      <button
                        onClick={() => updateContent(result.id, editedContent)}
                        className="btn-secondary text-sm"
                      >
                        Save Changes
                      </button>
                    )}
                    {result.outputPlatform && (
                      <button
                        onClick={() => publishContent(result.id)}
                        className="btn-primary text-sm"
                      >
                        Create Post
                      </button>
                    )}
                  </div>
                </div>

                {/* Preview */}
                <div className="mt-6 pt-6 border-t border-[var(--x-border)]">
                  <h4 className="font-medium mb-3">Preview</h4>
                  <div className="p-4 bg-[var(--x-bg-secondary)] rounded-lg">
                    {result.outputType === "THREAD" ? (
                      <div className="space-y-3">
                        {editedContent.split(/\d+\//).filter(Boolean).map((tweet, i) => (
                          <div key={i} className="p-3 bg-[var(--x-bg-primary)] rounded border border-[var(--x-border)]">
                            <p className="text-sm">{i + 1}/ {tweet.trim()}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap text-sm">
                        {editedContent}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="x-card p-12 text-center">
                <div className="text-6xl mb-4 opacity-20">&#8644;</div>
                <p className="text-[var(--x-text-secondary)]">
                  Your repurposed content will appear here
                </p>
                <p className="text-sm text-[var(--x-text-secondary)] mt-2">
                  Paste content on the left and click Repurpose
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {viewMode === "templates" && (
        <div className="space-y-6">
          <p className="text-[var(--x-text-secondary)]">
            Use these templates to quickly convert between common content formats.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {QUICK_TEMPLATES.map((template, i) => (
              <div
                key={i}
                onClick={() => useTemplate(template)}
                className="x-card p-6 cursor-pointer hover:border-[var(--x-blue)] transition-colors"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="w-8 h-8 rounded bg-[var(--x-bg-secondary)] flex items-center justify-center text-sm font-bold">
                    {getContentTypeInfo(template.source)?.icon}
                  </span>
                  <span className="text-[var(--x-text-secondary)]">&#8594;</span>
                  <span className="w-8 h-8 rounded bg-[var(--x-blue)]/20 text-[var(--x-blue)] flex items-center justify-center text-sm font-bold">
                    {getContentTypeInfo(template.output)?.icon}
                  </span>
                </div>
                <h3 className="font-bold mb-1">{template.label}</h3>
                <p className="text-sm text-[var(--x-text-secondary)]">
                  {template.description}
                </p>
              </div>
            ))}
          </div>

          <div className="x-card p-6">
            <h3 className="font-bold mb-4">Content Format Guide</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {CONTENT_TYPES.map((type) => (
                <div key={type.value} className="p-4 bg-[var(--x-bg-secondary)] rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 rounded bg-[var(--x-bg-primary)] flex items-center justify-center text-xs font-bold">
                      {type.icon}
                    </span>
                    <span className="font-medium">{type.label}</span>
                  </div>
                  <p className="text-sm text-[var(--x-text-secondary)]">
                    Max length: {type.maxLength}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {viewMode === "history" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <select className="x-input w-auto">
              <option value="">All Output Types</option>
              {CONTENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <select className="x-input w-auto">
              <option value="">All Status</option>
              <option value="DRAFT">Draft</option>
              <option value="READY">Ready</option>
              <option value="PUBLISHED">Published</option>
            </select>
          </div>

          {loading ? (
            <div className="text-center py-12 text-[var(--x-text-secondary)]">
              Loading...
            </div>
          ) : content.length === 0 ? (
            <div className="x-card p-12 text-center">
              <p className="text-[var(--x-text-secondary)]">
                No repurposed content yet. Transform your first piece!
              </p>
              <button
                onClick={() => setViewMode("create")}
                className="btn-primary mt-4"
              >
                Start Repurposing
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {content.map((item) => (
                <div key={item.id} className="x-card p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded bg-[var(--x-bg-secondary)] flex items-center justify-center text-sm font-bold">
                        {getContentTypeInfo(item.sourceType)?.icon}
                      </span>
                      <span className="text-[var(--x-text-secondary)]">&#8594;</span>
                      <span className="w-8 h-8 rounded bg-[var(--x-blue)]/20 text-[var(--x-blue)] flex items-center justify-center text-sm font-bold">
                        {getContentTypeInfo(item.outputType)?.icon}
                      </span>
                      <div>
                        <p className="font-medium">
                          {item.sourceType.replace(/_/g, " ")} to {item.outputType.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-[var(--x-text-secondary)]">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span className={`x-badge ${item.status === "PUBLISHED" ? "x-badge-green" : ""}`}>
                      {item.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-[var(--x-text-secondary)] mb-1">Source</p>
                      <p className="text-sm line-clamp-3 p-2 bg-[var(--x-bg-secondary)] rounded">
                        {item.sourceContent}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[var(--x-text-secondary)] mb-1">Output</p>
                      <p className="text-sm line-clamp-3 p-2 bg-[var(--x-bg-secondary)] rounded">
                        {item.outputContent}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 mt-4">
                    <button
                      onClick={() => {
                        setSelectedResult(item);
                        setEditedContent(item.outputContent);
                        setResult(item);
                        setViewMode("create");
                      }}
                      className="btn-secondary text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => navigator.clipboard.writeText(item.outputContent)}
                      className="btn-secondary text-sm"
                    >
                      Copy
                    </button>
                    {item.outputPlatform && item.status !== "PUBLISHED" && (
                      <button
                        onClick={() => publishContent(item.id)}
                        className="btn-primary text-sm"
                      >
                        Create Post
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
