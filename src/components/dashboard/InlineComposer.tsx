"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface InlineComposerProps {
  isXConnected: boolean;
  hasConfig: boolean;
}

export function InlineComposer({ isXConnected, hasConfig }: InlineComposerProps) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [postId, setPostId] = useState<string | null>(null);
  const [showScheduler, setShowScheduler] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");

  const maxLength = 280;
  const remaining = maxLength - content.length;

  // Get minimum date (now) for the date picker
  const now = new Date();
  const minDate = now.toISOString().split("T")[0];
  const minTime = now.toTimeString().slice(0, 5);

  const handleGenerate = async () => {
    if (!hasConfig) {
      alert("Please configure your AI settings first in Settings.");
      return;
    }

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
        alert(data.error || "Failed to generate. Configure your AI settings first.");
      }
    } catch {
      alert("Failed to generate post");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!content.trim()) return;

    setIsSaving(true);
    try {
      const response = await fetch("/api/posts/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (response.ok) {
        const data = await response.json();
        setPostId(data.id);
        setContent("");
        router.refresh();
      } else {
        alert("Failed to save post");
      }
    } catch {
      alert("Failed to save post");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!content.trim()) return;
    if (!isXConnected) {
      alert("Please connect your X account first.");
      return;
    }

    setIsPublishing(true);
    try {
      let currentPostId = postId;

      // Save first if not saved
      if (!currentPostId) {
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
        alert("Failed to save post");
        return;
      }

      const response = await fetch("/api/posts/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: currentPostId }),
      });

      if (response.ok) {
        setContent("");
        setPostId(null);
        router.refresh();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to publish");
      }
    } catch {
      alert("Failed to publish post");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSchedule = async () => {
    if (!content.trim()) return;
    if (!isXConnected) {
      alert("Please connect your X account first.");
      return;
    }
    if (!scheduledDate || !scheduledTime) {
      alert("Please select a date and time");
      return;
    }

    const scheduledFor = new Date(`${scheduledDate}T${scheduledTime}`);
    if (scheduledFor <= new Date()) {
      alert("Please select a future date and time");
      return;
    }

    setIsScheduling(true);
    try {
      const response = await fetch("/api/posts/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          scheduledFor: scheduledFor.toISOString(),
        }),
      });

      if (response.ok) {
        setContent("");
        setPostId(null);
        setShowScheduler(false);
        setScheduledDate("");
        setScheduledTime("");
        router.refresh();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to schedule");
      }
    } catch {
      alert("Failed to schedule post");
    } finally {
      setIsScheduling(false);
    }
  };

  return (
    <div className="bg-zinc-900/50 backdrop-blur-sm border border-white/5 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <span className="font-medium">Instant Post</span>
        </div>
        <span className="text-xs text-zinc-500">One-click content creation</span>
      </div>

      {/* Composer */}
      <div className="p-5">
        <textarea
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            setPostId(null);
          }}
          placeholder="What's on your mind? Type here or let AI generate for you..."
          className="w-full h-28 bg-transparent text-white placeholder-zinc-500 resize-none focus:outline-none text-[15px] leading-relaxed"
        />
      </div>

      {/* Schedule Picker */}
      {showScheduler && (
        <div className="px-5 pb-4 border-t border-white/5 pt-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-sm text-zinc-400">Date:</label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                min={minDate}
                className="bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-zinc-400">Time:</label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                min={scheduledDate === minDate ? minTime : undefined}
                className="bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50"
              />
            </div>
            <button
              onClick={handleSchedule}
              disabled={!scheduledDate || !scheduledTime || isScheduling || !content.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg hover:border-emerald-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isScheduling ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              <span className="text-sm font-medium">{isScheduling ? "Scheduling..." : "Confirm"}</span>
            </button>
            <button
              onClick={() => {
                setShowScheduler(false);
                setScheduledDate("");
                setScheduledTime("");
              }}
              className="text-sm text-zinc-500 hover:text-zinc-300 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="px-5 py-4 border-t border-white/5 bg-zinc-900/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="group flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl hover:border-indigo-500/40 transition-all disabled:opacity-50"
          >
            {isGenerating ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            )}
            <span className="text-sm font-medium">{isGenerating ? "Generating..." : "Generate AI"}</span>
          </button>

          {/* Save Draft */}
          <button
            onClick={handleSave}
            disabled={!content.trim() || content.length > maxLength || isSaving}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 text-zinc-300 rounded-xl hover:bg-white/10 hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            )}
            <span className="text-sm font-medium">{isSaving ? "Saving..." : "Save Draft"}</span>
          </button>

          {/* Schedule Button */}
          <button
            onClick={() => setShowScheduler(!showScheduler)}
            disabled={!content.trim() || content.length > maxLength || !isXConnected}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed ${
              showScheduler
                ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                : "bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium">Schedule</span>
          </button>
        </div>

        <div className="flex items-center gap-4">
          {/* Character Count */}
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <circle
                cx="12" cy="12" r="10"
                fill="none"
                stroke={remaining < 0 ? "#ef4444" : remaining < 20 ? "#f59e0b" : "#27272a"}
                strokeWidth="2"
              />
              <circle
                cx="12" cy="12" r="10"
                fill="none"
                stroke={remaining < 0 ? "#ef4444" : remaining < 20 ? "#f59e0b" : "#6366f1"}
                strokeWidth="2"
                strokeDasharray={`${Math.max(0, (content.length / maxLength) * 62.8)} 62.8`}
                strokeLinecap="round"
                transform="rotate(-90 12 12)"
              />
            </svg>
            <span className={`text-sm font-medium ${remaining < 0 ? "text-red-400" : remaining < 20 ? "text-amber-400" : "text-zinc-500"}`}>
              {remaining}
            </span>
          </div>

          {/* Publish Button */}
          <button
            onClick={handlePublish}
            disabled={!content.trim() || content.length > maxLength || isPublishing || !isXConnected}
            className="flex items-center gap-2 px-5 py-2.5 btn-premium rounded-xl text-white font-medium text-sm relative disabled:opacity-50 disabled:cursor-not-allowed"
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
                  Publish Now
                </>
              )}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
