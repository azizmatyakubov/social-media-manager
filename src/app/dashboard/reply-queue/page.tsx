"use client";

import { useState, useEffect } from "react";

interface SuggestedReply {
  id: string;
  content: string;
  tone: string;
  confidence: number;
  reasoning: string;
}

interface ReplyItem {
  id: string;
  platform: string;
  authorName: string;
  authorUsername: string;
  content: string;
  postContent?: string;
  sentiment: string | null;
  receivedAt: string;
  priority: "high" | "medium" | "low";
  priorityReason: string;
  suggestedReplies: SuggestedReply[];
}

interface QueueAnalytics {
  totalItems: number;
  highPriority: number;
  mediumPriority: number;
  lowPriority: number;
  byPlatform: Record<string, number>;
  estimatedResponseTime: string;
}

export default function ReplyQueuePage() {
  const [queue, setQueue] = useState<ReplyItem[]>([]);
  const [analytics, setAnalytics] = useState<QueueAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPriority, setSelectedPriority] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchQueue();
    fetchAnalytics();
  }, [selectedPriority, selectedPlatform]);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedPriority) params.set("priority", selectedPriority);
      if (selectedPlatform) params.set("platform", selectedPlatform);

      const response = await fetch(`/api/reply-queue?${params}`);
      if (response.ok) {
        const data = await response.json();
        setQueue(data.queue || []);
      }
    } catch (err) {
      console.error("Failed to fetch queue:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch("/api/reply-queue?type=analytics");
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
    }
  };

  const approveReply = async (messageId: string, content: string) => {
    setProcessingId(messageId);
    try {
      const response = await fetch("/api/reply-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve",
          messageId,
          content,
        }),
      });

      if (response.ok) {
        // Remove from queue
        setQueue((prev) => prev.filter((item) => item.id !== messageId));
        fetchAnalytics();
      }
    } catch (err) {
      console.error("Failed to approve reply:", err);
    } finally {
      setProcessingId(null);
    }
  };

  const regenerateReplies = async (item: ReplyItem) => {
    setProcessingId(item.id);
    try {
      const response = await fetch("/api/reply-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "regenerate",
          content: item.content,
          postContent: item.postContent,
          sentiment: item.sentiment,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id ? { ...q, suggestedReplies: data.suggestions } : q
          )
        );
      }
    } catch (err) {
      console.error("Failed to regenerate:", err);
    } finally {
      setProcessingId(null);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      case "medium":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      default:
        return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
    }
  };

  const getSentimentIcon = (sentiment: string | null) => {
    switch (sentiment) {
      case "POSITIVE":
        return "😊";
      case "NEGATIVE":
        return "😞";
      default:
        return "😐";
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "X":
        return "𝕏";
      case "LINKEDIN":
        return "in";
      case "INSTAGRAM":
        return "📷";
      default:
        return "💬";
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Smart Reply Queue</h1>
          <p className="text-zinc-400 text-sm mt-0.5">
            AI-generated replies for your messages - approve with one click
          </p>
        </div>
        <button
          onClick={() => { fetchQueue(); fetchAnalytics(); }}
          className="px-4 py-2 bg-zinc-800/50 border border-white/10 rounded-lg text-sm hover:bg-zinc-700/50 transition"
        >
          Refresh
        </button>
      </div>

      {/* Analytics Summary */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="rounded-xl bg-zinc-900/50 border border-white/5 p-4 text-center">
            <div className="text-2xl font-bold">{analytics.totalItems}</div>
            <div className="text-xs text-zinc-500">Total</div>
          </div>
          <div className="rounded-xl bg-red-500/5 border border-red-500/10 p-4 text-center">
            <div className="text-2xl font-bold text-red-400">{analytics.highPriority}</div>
            <div className="text-xs text-zinc-500">High Priority</div>
          </div>
          <div className="rounded-xl bg-amber-500/5 border border-amber-500/10 p-4 text-center">
            <div className="text-2xl font-bold text-amber-400">{analytics.mediumPriority}</div>
            <div className="text-xs text-zinc-500">Medium</div>
          </div>
          <div className="rounded-xl bg-zinc-500/5 border border-zinc-500/10 p-4 text-center">
            <div className="text-2xl font-bold text-zinc-400">{analytics.lowPriority}</div>
            <div className="text-xs text-zinc-500">Low</div>
          </div>
          <div className="rounded-xl bg-indigo-500/5 border border-indigo-500/10 p-4 text-center">
            <div className="text-lg font-bold text-indigo-400">{analytics.estimatedResponseTime}</div>
            <div className="text-xs text-zinc-500">Est. Time</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedPriority(null)}
          className={`px-3 py-1.5 rounded-lg text-sm ${
            !selectedPriority
              ? "bg-white text-black"
              : "bg-zinc-800/50 text-zinc-400 hover:text-white"
          }`}
        >
          All
        </button>
        {["high", "medium", "low"].map((priority) => (
          <button
            key={priority}
            onClick={() => setSelectedPriority(selectedPriority === priority ? null : priority)}
            className={`px-3 py-1.5 rounded-lg text-sm capitalize ${
              selectedPriority === priority
                ? "bg-white text-black"
                : "bg-zinc-800/50 text-zinc-400 hover:text-white"
            }`}
          >
            {priority} Priority
          </button>
        ))}
      </div>

      {/* Queue Items */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3 text-zinc-400">
            <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Loading queue...
          </div>
        </div>
      ) : queue.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">🎉</div>
          <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
          <p className="text-zinc-400">No messages waiting for replies.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {queue.map((item) => (
            <div
              key={item.id}
              className="rounded-xl bg-zinc-900/50 border border-white/5 p-5 space-y-4"
            >
              {/* Message Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-sm">
                    {item.authorName.charAt(0)}
                  </div>
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {item.authorName}
                      <span className="text-zinc-500 text-sm">@{item.authorUsername}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 rounded text-xs border ${getPriorityColor(item.priority)}`}>
                        {item.priority}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {getPlatformIcon(item.platform)} {item.platform}
                      </span>
                      <span className="text-xs">{getSentimentIcon(item.sentiment)}</span>
                    </div>
                  </div>
                </div>
                <span className="text-xs text-zinc-500">
                  {new Date(item.receivedAt).toLocaleDateString()}
                </span>
              </div>

              {/* Original Message */}
              <div className="p-3 bg-zinc-800/50 rounded-lg">
                <p className="text-sm text-zinc-300">{item.content}</p>
              </div>

              {/* Context */}
              {item.postContent && (
                <div className="p-3 bg-zinc-800/30 rounded-lg border-l-2 border-indigo-500/30">
                  <p className="text-xs text-zinc-500 mb-1">Replying to your post:</p>
                  <p className="text-sm text-zinc-400">{item.postContent}</p>
                </div>
              )}

              {/* Priority Reason */}
              <p className="text-xs text-zinc-500">{item.priorityReason}</p>

              {/* Suggested Replies */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Suggested Replies</h4>
                  <button
                    onClick={() => regenerateReplies(item)}
                    disabled={processingId === item.id}
                    className="text-xs text-indigo-400 hover:text-indigo-300 disabled:opacity-50"
                  >
                    {processingId === item.id ? "Regenerating..." : "Regenerate"}
                  </button>
                </div>
                <div className="grid gap-2">
                  {item.suggestedReplies.map((reply, index) => (
                    <div
                      key={reply.id || index}
                      className="flex items-start gap-3 p-3 bg-zinc-800/30 rounded-lg hover:bg-zinc-800/50 transition group"
                    >
                      <div className="flex-1">
                        <p className="text-sm">{reply.content}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="px-2 py-0.5 rounded text-xs bg-zinc-700 text-zinc-300 capitalize">
                            {reply.tone}
                          </span>
                          <span className="text-xs text-zinc-500">
                            {reply.confidence}% confidence
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => approveReply(item.id, reply.content)}
                        disabled={processingId === item.id}
                        className="shrink-0 px-3 py-1.5 bg-green-500/10 text-green-400 rounded-lg text-sm hover:bg-green-500/20 transition opacity-0 group-hover:opacity-100 disabled:opacity-50"
                      >
                        {processingId === item.id ? "..." : "Send"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
