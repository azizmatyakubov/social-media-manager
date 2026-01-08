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
  "TWEET",
  "THREAD",
  "LINKEDIN_POST",
  "INSTAGRAM_CAPTION",
  "BLOG_POST",
  "VIDEO_SCRIPT",
  "NEWSLETTER",
];

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
      fetchContent();
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
      fetchContent();
    } catch (error) {
      console.error("Failed:", error);
    } finally {
      setProcessing(false);
    }
  }

  async function publishContent(id: string) {
    await fetch("/api/repurpose", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "publish", id }),
    });
    fetchContent();
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Content Repurposing</h1>
        <p className="text-[var(--x-text-secondary)]">
          Transform your content into different formats for multiple platforms
        </p>
      </div>

      {/* Repurpose Tool */}
      <div className="x-card p-6 mb-8">
        <h3 className="font-bold mb-4">Repurpose Content</h3>

        <textarea
          placeholder="Paste your content here..."
          value={sourceContent}
          onChange={(e) => setSourceContent(e.target.value)}
          className="x-input mb-4"
          rows={4}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm text-[var(--x-text-secondary)] mb-1">
              Source Type
            </label>
            <select
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value)}
              className="x-input"
            >
              {CONTENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-[var(--x-text-secondary)] mb-1">
              Output Type
            </label>
            <select
              value={outputType}
              onChange={(e) => setOutputType(e.target.value)}
              className="x-input"
            >
              {CONTENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={repurpose}
              disabled={!sourceContent || processing}
              className="btn-primary w-full"
            >
              {processing ? "Processing..." : "Repurpose"}
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="border-t border-[var(--x-border)] pt-4">
          <p className="text-sm text-[var(--x-text-secondary)] mb-2">
            Quick Actions:
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => quickAction("tweet-to-thread")}
              disabled={!sourceContent || processing}
              className="btn-secondary text-sm"
            >
              Tweet → Thread
            </button>
            <button
              onClick={() => quickAction("thread-to-linkedin")}
              disabled={!sourceContent || processing}
              className="btn-secondary text-sm"
            >
              Thread → LinkedIn
            </button>
            <button
              onClick={() => quickAction("to-video-script")}
              disabled={!sourceContent || processing}
              className="btn-secondary text-sm"
            >
              → Video Script
            </button>
            <button
              onClick={getSuggestions}
              disabled={!sourceContent}
              className="btn-secondary text-sm"
            >
              Suggest Formats
            </button>
          </div>

          {suggestions.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-bold mb-2">Suggested output formats:</p>
              <div className="flex gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => setOutputType(s)}
                    className="x-badge x-badge-blue cursor-pointer"
                  >
                    {s.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="x-card p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold">Repurposed Content</h3>
            <span className="x-badge">{result.outputType.replace(/_/g, " ")}</span>
          </div>
          <div className="p-4 bg-[var(--x-bg-secondary)] rounded-lg whitespace-pre-wrap">
            {result.outputContent}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => navigator.clipboard.writeText(result.outputContent)}
              className="btn-secondary"
            >
              Copy
            </button>
            {result.outputPlatform && (
              <button
                onClick={() => publishContent(result.id)}
                className="btn-primary"
              >
                Create Post
              </button>
            )}
          </div>
        </div>
      )}

      {/* History */}
      <h3 className="font-bold mb-4">Recent Repurposed Content</h3>
      {loading ? (
        <div className="text-center py-12 text-[var(--x-text-secondary)]">
          Loading...
        </div>
      ) : content.length === 0 ? (
        <div className="x-card p-12 text-center">
          <p className="text-[var(--x-text-secondary)]">
            No repurposed content yet. Transform your first piece above!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {content.map((item) => (
            <div key={item.id} className="x-card p-4">
              <div className="flex justify-between items-center mb-2">
                <div className="flex gap-2">
                  <span className="x-badge">{item.sourceType.replace(/_/g, " ")}</span>
                  <span className="text-[var(--x-text-secondary)]">→</span>
                  <span className="x-badge x-badge-blue">
                    {item.outputType.replace(/_/g, " ")}
                  </span>
                </div>
                <span className={`x-badge ${
                  item.status === "PUBLISHED" ? "x-badge-green" : ""
                }`}>
                  {item.status}
                </span>
              </div>
              <p className="text-sm line-clamp-3">{item.outputContent}</p>
              <p className="text-xs text-[var(--x-text-secondary)] mt-2">
                {new Date(item.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
