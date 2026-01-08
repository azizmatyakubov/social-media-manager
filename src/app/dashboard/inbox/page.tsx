"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";

// Types
interface InboxMessage {
  id: string;
  platform: string;
  messageType: string;
  platformId: string;
  conversationId: string | null;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorAvatar: string | null;
  content: string;
  mediaUrls: string[];
  postId: string | null;
  postContent: string | null;
  status: string;
  sentiment: string | null;
  isSpam: boolean;
  labels: string[];
  assignedTo: string | null;
  repliedAt: string | null;
  replyContent: string | null;
  receivedAt: string;
  createdAt: string;
}

interface InboxStats {
  total: number;
  unread: number;
  replied: number;
  archived: number;
  spam: number;
  byPlatform: Record<string, number>;
  bySentiment: {
    positive: number;
    neutral: number;
    negative: number;
  };
  responseRate: number;
}

interface TeamMember {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

interface SuggestedReply {
  content: string;
  tone: string;
}

// Platform icons
const platformIcons: Record<string, string> = {
  X: "X",
  LINKEDIN: "in",
  INSTAGRAM: "IG",
  TIKTOK: "TT",
  YOUTUBE: "YT",
  PINTEREST: "P",
  BLUESKY: "BS",
  THREADS: "TH",
};

// Platform colors
const platformColors: Record<string, string> = {
  X: "bg-black text-white",
  LINKEDIN: "bg-blue-600 text-white",
  INSTAGRAM: "bg-gradient-to-r from-purple-500 to-pink-500 text-white",
  TIKTOK: "bg-black text-white",
  YOUTUBE: "bg-red-600 text-white",
  PINTEREST: "bg-red-500 text-white",
  BLUESKY: "bg-sky-500 text-white",
  THREADS: "bg-black text-white",
};

// Sentiment colors
const sentimentColors: Record<string, string> = {
  POSITIVE: "bg-green-500/10 text-green-500",
  NEUTRAL: "bg-gray-500/10 text-gray-500",
  NEGATIVE: "bg-red-500/10 text-red-500",
};

// Status colors
const statusColors: Record<string, string> = {
  UNREAD: "bg-blue-500/10 text-blue-500",
  READ: "bg-gray-500/10 text-gray-500",
  REPLIED: "bg-green-500/10 text-green-500",
  ARCHIVED: "bg-purple-500/10 text-purple-500",
  SPAM: "bg-red-500/10 text-red-500",
};

// Message type labels
const messageTypeLabels: Record<string, string> = {
  COMMENT: "Comment",
  REPLY: "Reply",
  DM: "DM",
  MENTION: "Mention",
  QUOTE: "Quote",
};

export default function InboxPage() {
  const { data: session, status } = useSession();
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [stats, setStats] = useState<InboxStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<InboxMessage | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [suggestedReplies, setSuggestedReplies] = useState<SuggestedReply[]>([]);
  const [generatingReplies, setGeneratingReplies] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  // Filters
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sentimentFilter, setSentimentFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Selected messages for bulk actions
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());

  // Label management
  const [showLabelInput, setShowLabelInput] = useState(false);
  const [newLabel, setNewLabel] = useState("");

  const fetchMessages = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (platformFilter !== "all") params.set("platform", platformFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (sentimentFilter !== "all") params.set("sentiment", sentimentFilter);
      if (searchQuery) {
        params.set("action", "search");
        params.set("q", searchQuery);
      }

      const res = await fetch(`/api/inbox?${params}`);
      const data = await res.json();
      setMessages(data);
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    } finally {
      setLoading(false);
    }
  }, [platformFilter, statusFilter, sentimentFilter, searchQuery]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/inbox?action=stats");
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  }, []);

  const fetchTeamMembers = useCallback(async () => {
    try {
      const res = await fetch("/api/inbox?action=team-members");
      const data = await res.json();
      setTeamMembers(data);
    } catch (error) {
      console.error("Failed to fetch team members:", error);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      fetchMessages();
      fetchStats();
      fetchTeamMembers();
    }
  }, [status, fetchMessages, fetchStats, fetchTeamMembers]);

  if (status === "loading") return <div className="p-8">Loading...</div>;
  if (status === "unauthenticated") redirect("/login");

  async function syncInbox() {
    setSyncing(true);
    try {
      const res = await fetch("/api/inbox/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success || data.totalSynced >= 0) {
        fetchMessages();
        fetchStats();
      }
    } catch (error) {
      console.error("Sync failed:", error);
    } finally {
      setSyncing(false);
    }
  }

  async function updateStatus(messageId: string, newStatus: string) {
    try {
      await fetch("/api/inbox", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId,
          action: "update-status",
          status: newStatus,
        }),
      });
      fetchMessages();
      fetchStats();
      if (selectedMessage?.id === messageId) {
        setSelectedMessage({ ...selectedMessage, status: newStatus });
      }
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  }

  async function bulkUpdateStatus(newStatus: string) {
    if (selectedMessageIds.size === 0) return;
    try {
      await fetch("/api/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bulk-update-status",
          messageIds: Array.from(selectedMessageIds),
          status: newStatus,
        }),
      });
      setSelectedMessageIds(new Set());
      fetchMessages();
      fetchStats();
    } catch (error) {
      console.error("Failed to bulk update:", error);
    }
  }

  async function assignToMember(messageId: string, assigneeId: string | null) {
    try {
      await fetch("/api/inbox", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId,
          action: "assign",
          assigneeId,
        }),
      });
      fetchMessages();
      if (selectedMessage?.id === messageId) {
        setSelectedMessage({ ...selectedMessage, assignedTo: assigneeId });
      }
    } catch (error) {
      console.error("Failed to assign:", error);
    }
  }

  async function addLabel(messageId: string, label: string) {
    try {
      await fetch("/api/inbox", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId,
          action: "add-label",
          label,
        }),
      });
      fetchMessages();
      if (selectedMessage?.id === messageId) {
        setSelectedMessage({
          ...selectedMessage,
          labels: [...selectedMessage.labels, label],
        });
      }
      setNewLabel("");
      setShowLabelInput(false);
    } catch (error) {
      console.error("Failed to add label:", error);
    }
  }

  async function removeLabel(messageId: string, label: string) {
    try {
      await fetch("/api/inbox", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId,
          action: "remove-label",
          label,
        }),
      });
      fetchMessages();
      if (selectedMessage?.id === messageId) {
        setSelectedMessage({
          ...selectedMessage,
          labels: selectedMessage.labels.filter((l) => l !== label),
        });
      }
    } catch (error) {
      console.error("Failed to remove label:", error);
    }
  }

  async function generateReplies(messageId: string) {
    setGeneratingReplies(true);
    setSuggestedReplies([]);
    try {
      const res = await fetch("/api/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-replies",
          messageId,
          tones: ["friendly", "professional", "helpful"],
        }),
      });
      const data = await res.json();
      setSuggestedReplies(data);
    } catch (error) {
      console.error("Failed to generate replies:", error);
    } finally {
      setGeneratingReplies(false);
    }
  }

  async function sendReply(messageId: string, content: string) {
    if (!content.trim()) return;
    setSendingReply(true);
    try {
      await fetch("/api/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reply",
          messageId,
          content,
        }),
      });
      setReplyContent("");
      setSuggestedReplies([]);
      fetchMessages();
      fetchStats();
      if (selectedMessage?.id === messageId) {
        setSelectedMessage({
          ...selectedMessage,
          status: "REPLIED",
          replyContent: content,
          repliedAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Failed to send reply:", error);
    } finally {
      setSendingReply(false);
    }
  }

  function toggleMessageSelection(messageId: string) {
    const newSelection = new Set(selectedMessageIds);
    if (newSelection.has(messageId)) {
      newSelection.delete(messageId);
    } else {
      newSelection.add(messageId);
    }
    setSelectedMessageIds(newSelection);
  }

  function selectAllMessages() {
    if (selectedMessageIds.size === messages.length) {
      setSelectedMessageIds(new Set());
    } else {
      setSelectedMessageIds(new Set(messages.map((m) => m.id)));
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Unified Inbox</h1>
          <p className="text-[var(--x-text-secondary)]">
            Manage all your social media messages in one place
          </p>
        </div>
        <button
          onClick={syncInbox}
          disabled={syncing}
          className="btn-primary flex items-center gap-2"
        >
          {syncing ? (
            <>
              <span className="animate-spin">@</span>
              Syncing...
            </>
          ) : (
            <>
              <span>@</span>
              Sync All
            </>
          )}
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="x-card p-4">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-[var(--x-text-secondary)]">Total Messages</p>
          </div>
          <div className="x-card p-4">
            <p className="text-2xl font-bold text-blue-500">{stats.unread}</p>
            <p className="text-sm text-[var(--x-text-secondary)]">Unread</p>
          </div>
          <div className="x-card p-4">
            <p className="text-2xl font-bold text-green-500">{stats.replied}</p>
            <p className="text-sm text-[var(--x-text-secondary)]">Replied</p>
          </div>
          <div className="x-card p-4">
            <p className="text-2xl font-bold text-purple-500">{stats.archived}</p>
            <p className="text-sm text-[var(--x-text-secondary)]">Archived</p>
          </div>
          <div className="x-card p-4">
            <p className="text-2xl font-bold text-[var(--x-green)]">
              {stats.responseRate.toFixed(0)}%
            </p>
            <p className="text-sm text-[var(--x-text-secondary)]">Response Rate</p>
          </div>
        </div>
      )}

      {/* Sentiment Overview */}
      {stats && (
        <div className="x-card p-4 mb-8">
          <h3 className="font-semibold mb-3">Sentiment Overview</h3>
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              <span>Positive: {stats.bySentiment.positive}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-gray-500"></span>
              <span>Neutral: {stats.bySentiment.neutral}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500"></span>
              <span>Negative: {stats.bySentiment.negative}</span>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="x-card p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="x-input w-full"
            />
          </div>

          {/* Platform Filter */}
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="x-select"
          >
            <option value="all">All Platforms</option>
            {Object.keys(platformIcons).map((platform) => (
              <option key={platform} value={platform}>
                {platform}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="x-select"
          >
            <option value="all">All Status</option>
            <option value="UNREAD">Unread</option>
            <option value="READ">Read</option>
            <option value="REPLIED">Replied</option>
            <option value="ARCHIVED">Archived</option>
            <option value="SPAM">Spam</option>
          </select>

          {/* Sentiment Filter */}
          <select
            value={sentimentFilter}
            onChange={(e) => setSentimentFilter(e.target.value)}
            className="x-select"
          >
            <option value="all">All Sentiment</option>
            <option value="POSITIVE">Positive</option>
            <option value="NEUTRAL">Neutral</option>
            <option value="NEGATIVE">Negative</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedMessageIds.size > 0 && (
        <div className="x-card p-4 mb-6 flex items-center gap-4">
          <span className="text-sm text-[var(--x-text-secondary)]">
            {selectedMessageIds.size} selected
          </span>
          <button
            onClick={() => bulkUpdateStatus("READ")}
            className="btn-secondary text-sm"
          >
            Mark as Read
          </button>
          <button
            onClick={() => bulkUpdateStatus("ARCHIVED")}
            className="btn-secondary text-sm"
          >
            Archive
          </button>
          <button
            onClick={() => bulkUpdateStatus("SPAM")}
            className="btn-secondary text-sm text-red-500"
          >
            Mark as Spam
          </button>
          <button
            onClick={() => setSelectedMessageIds(new Set())}
            className="btn-secondary text-sm"
          >
            Clear Selection
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex gap-6">
        {/* Message List */}
        <div className="flex-1">
          {loading ? (
            <div className="text-center py-12 text-[var(--x-text-secondary)]">
              Loading messages...
            </div>
          ) : messages.length === 0 ? (
            <div className="x-card p-12 text-center">
              <p className="text-[var(--x-text-secondary)]">
                No messages found. Sync your accounts to see messages here.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Select All */}
              <div className="flex items-center gap-2 px-4 py-2">
                <input
                  type="checkbox"
                  checked={
                    selectedMessageIds.size === messages.length &&
                    messages.length > 0
                  }
                  onChange={selectAllMessages}
                  className="w-4 h-4"
                />
                <span className="text-sm text-[var(--x-text-secondary)]">
                  Select All
                </span>
              </div>

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`x-card p-4 cursor-pointer transition-all hover:ring-2 hover:ring-[var(--x-blue)] ${
                    selectedMessage?.id === message.id
                      ? "ring-2 ring-[var(--x-blue)]"
                      : ""
                  } ${message.status === "UNREAD" ? "border-l-4 border-l-blue-500" : ""}`}
                  onClick={() => {
                    setSelectedMessage(message);
                    setSuggestedReplies([]);
                    setReplyContent("");
                    if (message.status === "UNREAD") {
                      updateStatus(message.id, "READ");
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedMessageIds.has(message.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleMessageSelection(message.id);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 mt-1"
                    />

                    {/* Avatar / Platform Icon */}
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${
                        platformColors[message.platform] || "bg-gray-500 text-white"
                      }`}
                    >
                      {message.authorAvatar ? (
                        <img
                          src={message.authorAvatar}
                          alt={message.authorName}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        platformIcons[message.platform] || "?"
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold truncate">
                          {message.authorName}
                        </span>
                        <span className="text-sm text-[var(--x-text-secondary)] truncate">
                          @{message.authorUsername}
                        </span>
                        <span
                          className={`x-badge text-xs ${
                            platformColors[message.platform] || ""
                          }`}
                        >
                          {message.platform}
                        </span>
                        <span className="x-badge text-xs">
                          {messageTypeLabels[message.messageType] || message.messageType}
                        </span>
                      </div>
                      <p className="text-sm line-clamp-2 mb-2">{message.content}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`x-badge text-xs ${
                            statusColors[message.status] || ""
                          }`}
                        >
                          {message.status}
                        </span>
                        {message.sentiment && (
                          <span
                            className={`x-badge text-xs ${
                              sentimentColors[message.sentiment] || ""
                            }`}
                          >
                            {message.sentiment}
                          </span>
                        )}
                        {message.labels.map((label) => (
                          <span
                            key={label}
                            className="x-badge text-xs bg-[var(--x-blue)]/10 text-[var(--x-blue)]"
                          >
                            {label}
                          </span>
                        ))}
                        <span className="text-xs text-[var(--x-text-secondary)] ml-auto">
                          {new Date(message.receivedAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Message Detail Panel */}
        {selectedMessage && (
          <div className="w-[400px] x-card p-6 sticky top-4 h-fit max-h-[calc(100vh-120px)] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold ${
                    platformColors[selectedMessage.platform] ||
                    "bg-gray-500 text-white"
                  }`}
                >
                  {selectedMessage.authorAvatar ? (
                    <img
                      src={selectedMessage.authorAvatar}
                      alt={selectedMessage.authorName}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    platformIcons[selectedMessage.platform] || "?"
                  )}
                </div>
                <div>
                  <p className="font-semibold">{selectedMessage.authorName}</p>
                  <p className="text-sm text-[var(--x-text-secondary)]">
                    @{selectedMessage.authorUsername}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedMessage(null)}
                className="text-[var(--x-text-secondary)] hover:text-[var(--x-text-primary)]"
              >
                x
              </button>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-4">
              <span
                className={`x-badge text-xs ${
                  platformColors[selectedMessage.platform] || ""
                }`}
              >
                {selectedMessage.platform}
              </span>
              <span className="x-badge text-xs">
                {messageTypeLabels[selectedMessage.messageType] ||
                  selectedMessage.messageType}
              </span>
              <span
                className={`x-badge text-xs ${
                  statusColors[selectedMessage.status] || ""
                }`}
              >
                {selectedMessage.status}
              </span>
              {selectedMessage.sentiment && (
                <span
                  className={`x-badge text-xs ${
                    sentimentColors[selectedMessage.sentiment] || ""
                  }`}
                >
                  {selectedMessage.sentiment}
                </span>
              )}
              {selectedMessage.isSpam && (
                <span className="x-badge text-xs bg-red-500/10 text-red-500">
                  SPAM
                </span>
              )}
            </div>

            {/* Original Post (if reply/comment) */}
            {selectedMessage.postContent && (
              <div className="mb-4 p-3 bg-[var(--x-bg-secondary)] rounded-lg">
                <p className="text-xs text-[var(--x-text-secondary)] mb-1">
                  In response to your post:
                </p>
                <p className="text-sm">{selectedMessage.postContent}</p>
              </div>
            )}

            {/* Message Content */}
            <div className="mb-4">
              <p className="text-sm text-[var(--x-text-secondary)] mb-1">
                Message:
              </p>
              <p>{selectedMessage.content}</p>
              <p className="text-xs text-[var(--x-text-secondary)] mt-2">
                {new Date(selectedMessage.receivedAt).toLocaleString()}
              </p>
            </div>

            {/* Labels */}
            <div className="mb-4">
              <p className="text-sm text-[var(--x-text-secondary)] mb-2">Labels:</p>
              <div className="flex flex-wrap gap-2">
                {selectedMessage.labels.map((label) => (
                  <span
                    key={label}
                    className="x-badge text-xs bg-[var(--x-blue)]/10 text-[var(--x-blue)] flex items-center gap-1"
                  >
                    {label}
                    <button
                      onClick={() => removeLabel(selectedMessage.id, label)}
                      className="hover:text-red-500"
                    >
                      x
                    </button>
                  </span>
                ))}
                {showLabelInput ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      placeholder="Label name"
                      className="x-input text-xs py-1 px-2 w-24"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newLabel.trim()) {
                          addLabel(selectedMessage.id, newLabel.trim());
                        }
                        if (e.key === "Escape") {
                          setShowLabelInput(false);
                          setNewLabel("");
                        }
                      }}
                      autoFocus
                    />
                    <button
                      onClick={() => {
                        if (newLabel.trim()) {
                          addLabel(selectedMessage.id, newLabel.trim());
                        }
                      }}
                      className="text-green-500"
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowLabelInput(true)}
                    className="x-badge text-xs cursor-pointer hover:bg-[var(--x-blue)]/20"
                  >
                    + Add Label
                  </button>
                )}
              </div>
            </div>

            {/* Assign to Team Member */}
            <div className="mb-4">
              <p className="text-sm text-[var(--x-text-secondary)] mb-2">
                Assign to:
              </p>
              <select
                value={selectedMessage.assignedTo || ""}
                onChange={(e) =>
                  assignToMember(
                    selectedMessage.id,
                    e.target.value || null
                  )
                }
                className="x-select w-full"
              >
                <option value="">Unassigned</option>
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name || member.email}
                  </option>
                ))}
              </select>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedMessage.status !== "READ" &&
                selectedMessage.status !== "REPLIED" && (
                  <button
                    onClick={() => updateStatus(selectedMessage.id, "READ")}
                    className="btn-secondary text-sm"
                  >
                    Mark as Read
                  </button>
                )}
              {selectedMessage.status !== "ARCHIVED" && (
                <button
                  onClick={() => updateStatus(selectedMessage.id, "ARCHIVED")}
                  className="btn-secondary text-sm"
                >
                  Archive
                </button>
              )}
              {!selectedMessage.isSpam && (
                <button
                  onClick={() => updateStatus(selectedMessage.id, "SPAM")}
                  className="btn-secondary text-sm text-red-500"
                >
                  Mark as Spam
                </button>
              )}
            </div>

            {/* Previous Reply */}
            {selectedMessage.replyContent && (
              <div className="mb-4 p-3 bg-green-500/10 rounded-lg">
                <p className="text-xs text-green-500 mb-1">
                  Your reply ({new Date(selectedMessage.repliedAt!).toLocaleString()}):
                </p>
                <p className="text-sm">{selectedMessage.replyContent}</p>
              </div>
            )}

            {/* Reply Section */}
            {selectedMessage.status !== "REPLIED" && (
              <div className="border-t border-[var(--x-border)] pt-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold">Reply</p>
                  <button
                    onClick={() => generateReplies(selectedMessage.id)}
                    disabled={generatingReplies}
                    className="btn-secondary text-xs"
                  >
                    {generatingReplies ? "Generating..." : "AI Suggest"}
                  </button>
                </div>

                {/* Suggested Replies */}
                {suggestedReplies.length > 0 && (
                  <div className="mb-3 space-y-2">
                    {suggestedReplies.map((suggestion, index) => (
                      <div
                        key={index}
                        className="p-3 bg-[var(--x-bg-secondary)] rounded-lg cursor-pointer hover:ring-2 hover:ring-[var(--x-blue)]"
                        onClick={() => setReplyContent(suggestion.content)}
                      >
                        <span className="x-badge text-xs mb-1">
                          {suggestion.tone}
                        </span>
                        <p className="text-sm">{suggestion.content}</p>
                      </div>
                    ))}
                  </div>
                )}

                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Type your reply..."
                  className="x-input w-full h-24 resize-none mb-2"
                />
                <button
                  onClick={() => sendReply(selectedMessage.id, replyContent)}
                  disabled={sendingReply || !replyContent.trim()}
                  className="btn-primary w-full"
                >
                  {sendingReply ? "Sending..." : "Send Reply"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
