"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";

interface SuggestedReply {
  id: string;
  content: string;
  tone: string;
}

interface Mention {
  id: string;
  platform: string;
  authorName: string;
  authorUsername: string;
  content: string;
  sentiment: string | null;
  status: string;
  createdAt: string;
  replies: SuggestedReply[];
}

interface MentionStats {
  total: number;
  unread: number;
  sentimentBreakdown: {
    positive: number;
    negative: number;
    neutral: number;
  };
  responseRate: number;
}

export default function MentionsPage() {
  const { data: session, status } = useSession();
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [stats, setStats] = useState<MentionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [generatingReplies, setGeneratingReplies] = useState<string | null>(null);
  const [selectedMention, setSelectedMention] = useState<Mention | null>(null);

  useEffect(() => {
    if (status === "authenticated") {
      fetchMentions();
      fetchStats();
    }
  }, [status, filter]);

  if (status === "loading") return <div className="p-8">Loading...</div>;
  if (status === "unauthenticated") redirect("/login");

  async function fetchMentions() {
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("status", filter);

      const res = await fetch(`/api/mentions?${params}`);
      const data = await res.json();
      setMentions(data);
    } catch (error) {
      console.error("Failed to fetch mentions:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchStats() {
    const res = await fetch("/api/mentions?action=stats");
    const data = await res.json();
    setStats(data);
  }

  async function generateReplies(mentionId: string) {
    setGeneratingReplies(mentionId);

    try {
      const res = await fetch("/api/mentions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-replies",
          mentionId,
          tones: ["friendly", "professional", "witty"],
        }),
      });

      if (res.ok) {
        fetchMentions();
      }
    } catch (error) {
      console.error("Failed to generate replies:", error);
    } finally {
      setGeneratingReplies(null);
    }
  }

  async function sendReply(mentionId: string, suggestionId: string) {
    await fetch("/api/mentions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "send-reply",
        mentionId,
        suggestionId,
      }),
    });
    fetchMentions();
    fetchStats();
    setSelectedMention(null);
  }

  async function markAs(mentionId: string, newStatus: string) {
    await fetch("/api/mentions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "mark",
        mentionId,
        status: newStatus,
      }),
    });
    fetchMentions();
    fetchStats();
  }

  const sentimentColor = (sentiment: string | null) => {
    switch (sentiment) {
      case "POSITIVE":
        return "x-badge-green";
      case "NEGATIVE":
        return "bg-red-500/10 text-red-500";
      default:
        return "";
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Smart Reply Assistant</h1>
        <p className="text-[var(--x-text-secondary)]">
          Manage mentions and replies with AI-powered suggestions
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="x-card p-4">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-[var(--x-text-secondary)]">Total Mentions</p>
          </div>
          <div className="x-card p-4">
            <p className="text-2xl font-bold text-[var(--x-blue)]">{stats.unread}</p>
            <p className="text-sm text-[var(--x-text-secondary)]">Unread</p>
          </div>
          <div className="x-card p-4">
            <p className="text-2xl font-bold text-[var(--x-green)]">
              {stats.responseRate.toFixed(0)}%
            </p>
            <p className="text-sm text-[var(--x-text-secondary)]">Response Rate</p>
          </div>
          <div className="x-card p-4">
            <div className="flex gap-2 text-sm">
              <span className="text-green-500">+{stats.sentimentBreakdown.positive}</span>
              <span className="text-gray-500">{stats.sentimentBreakdown.neutral}</span>
              <span className="text-red-500">-{stats.sentimentBreakdown.negative}</span>
            </div>
            <p className="text-sm text-[var(--x-text-secondary)]">Sentiment</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {["all", "UNREAD", "READ", "REPLIED"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`x-badge cursor-pointer ${filter === f ? "x-badge-blue" : ""}`}
          >
            {f === "all" ? "All" : f}
          </button>
        ))}
      </div>

      {/* Mentions List */}
      {loading ? (
        <div className="text-center py-12 text-[var(--x-text-secondary)]">
          Loading mentions...
        </div>
      ) : mentions.length === 0 ? (
        <div className="x-card p-12 text-center">
          <p className="text-[var(--x-text-secondary)]">
            No mentions found. They will appear here when people mention you.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {mentions.map((mention) => (
            <div key={mention.id} className="x-card p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold">{mention.authorName}</span>
                  <span className="text-[var(--x-text-secondary)]">
                    @{mention.authorUsername}
                  </span>
                  {mention.sentiment && (
                    <span className={`x-badge text-xs ${sentimentColor(mention.sentiment)}`}>
                      {mention.sentiment}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`x-badge text-xs ${
                    mention.status === "UNREAD" ? "x-badge-blue" :
                    mention.status === "REPLIED" ? "x-badge-green" : ""
                  }`}>
                    {mention.status}
                  </span>
                  <span className="text-xs text-[var(--x-text-secondary)]">
                    {new Date(mention.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <p className="mb-4">{mention.content}</p>

              <div className="flex gap-2">
                <button
                  onClick={() => generateReplies(mention.id)}
                  disabled={generatingReplies === mention.id}
                  className="btn-primary text-sm"
                >
                  {generatingReplies === mention.id ? "Generating..." : "Generate Replies"}
                </button>
                {mention.replies.length > 0 && (
                  <button
                    onClick={() => setSelectedMention(mention)}
                    className="btn-secondary text-sm"
                  >
                    View Suggestions ({mention.replies.length})
                  </button>
                )}
                {mention.status === "UNREAD" && (
                  <button
                    onClick={() => markAs(mention.id, "READ")}
                    className="btn-secondary text-sm"
                  >
                    Mark Read
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reply Suggestions Modal */}
      {selectedMention && (
        <div className="fixed inset-0 x-modal-overlay flex items-center justify-center z-50">
          <div className="x-modal p-6 max-w-2xl w-full">
            <h2 className="text-xl font-bold mb-4">Reply Suggestions</h2>
            <div className="mb-4 p-3 bg-[var(--x-bg-secondary)] rounded-lg">
              <p className="text-sm text-[var(--x-text-secondary)] mb-1">
                Original mention from @{selectedMention.authorUsername}:
              </p>
              <p>{selectedMention.content}</p>
            </div>
            <div className="space-y-3">
              {selectedMention.replies.map((reply) => (
                <div
                  key={reply.id}
                  className="p-4 bg-[var(--x-bg-secondary)] rounded-lg"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="x-badge">{reply.tone}</span>
                    <button
                      onClick={() => sendReply(selectedMention.id, reply.id)}
                      className="btn-primary text-sm"
                    >
                      Send This
                    </button>
                  </div>
                  <p>{reply.content}</p>
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setSelectedMention(null)}
                className="btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
