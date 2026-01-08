"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ComposePage() {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [postId, setPostId] = useState<string | null>(null);

  const maxLength = 280;
  const remaining = maxLength - content.length;

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/posts/generate", {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        setContent(data.content);
        setPostId(data.id);
      } else {
        const data = await response.json();
        alert(data.error || "Failed to generate post. Make sure you have configured your settings.");
      }
    } catch {
      alert("Failed to generate post");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePublish = async () => {
    if (!postId && !content) return;

    setIsPublishing(true);
    try {
      // If we have content but no postId, save it first
      let currentPostId = postId;
      if (!currentPostId && content) {
        const saveResponse = await fetch("/api/posts/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });
        if (saveResponse.ok) {
          const saveData = await saveResponse.json();
          currentPostId = saveData.id;
        }
      }

      if (!currentPostId) {
        alert("Please generate or write a post first");
        return;
      }

      const response = await fetch("/api/posts/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: currentPostId }),
      });

      if (response.ok) {
        router.push("/dashboard/posts");
      } else {
        const data = await response.json();
        alert(data.error || "Failed to publish post");
      }
    } catch {
      alert("Failed to publish post");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Compose</h1>
        <p className="text-zinc-400 mt-1">Generate AI content or write your own post</p>
      </div>

      {/* Composer Card */}
      <div className="bg-zinc-900/50 backdrop-blur-sm border border-white/5 rounded-2xl overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center font-bold text-sm">
              X
            </div>
            <div>
              <span className="text-sm font-medium">Post to X</span>
              <span className="text-xs text-zinc-500 ml-2">280 characters max</span>
            </div>
          </div>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="group flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl hover:border-indigo-500/40 hover:bg-gradient-to-r hover:from-indigo-500/20 hover:to-purple-500/20 transition-all disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-sm font-medium">Generating...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-sm font-medium">Generate with AI</span>
              </>
            )}
          </button>
        </div>

        {/* Text Area */}
        <div className="p-6">
          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setPostId(null); // Clear postId when manually editing
            }}
            placeholder="What's happening?"
            className="w-full h-48 bg-transparent text-white text-lg placeholder-zinc-500 resize-none focus:outline-none leading-relaxed"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/5 bg-zinc-900/30">
          <div className="flex items-center gap-4">
            {/* Character count */}
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  fill="none"
                  stroke={remaining < 0 ? "#ef4444" : remaining < 20 ? "#f59e0b" : "#27272a"}
                  strokeWidth="2"
                />
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  fill="none"
                  stroke={remaining < 0 ? "#ef4444" : remaining < 20 ? "#f59e0b" : "#6366f1"}
                  strokeWidth="2"
                  strokeDasharray={`${Math.max(0, (content.length / maxLength) * 62.8)} 62.8`}
                  strokeLinecap="round"
                  transform="rotate(-90 12 12)"
                />
              </svg>
              <span className={`text-sm font-medium ${remaining < 0 ? "text-red-400" : remaining < 20 ? "text-amber-400" : "text-zinc-400"}`}>
                {remaining}
              </span>
            </div>
            {remaining < 0 && (
              <span className="text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded-lg">
                Over limit
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setContent("");
                setPostId(null);
              }}
              className="px-4 py-2.5 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition"
            >
              Clear
            </button>
            <button
              onClick={handlePublish}
              disabled={!content || content.length > maxLength || isPublishing}
              className="px-6 py-2.5 btn-premium rounded-xl text-white font-medium text-sm relative disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="relative z-10 flex items-center gap-2">
                {isPublishing ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Publishing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Publish
                  </>
                )}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="mt-8 p-6 bg-zinc-900/50 backdrop-blur-sm border border-white/5 rounded-2xl">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h3 className="font-semibold">Tips for engaging posts</h3>
        </div>
        <ul className="space-y-3">
          {[
            "Share insights and learnings from your journey",
            "Ask questions to spark conversation",
            "Keep it concise - shorter posts often perform better",
            "Be authentic - your unique voice matters"
          ].map((tip, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-zinc-400">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center mt-0.5">
                <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
