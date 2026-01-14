"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "CHANGES_REQUESTED" | "CANCELLED";

interface ApprovalRequest {
  id: string;
  postId: string;
  requesterId: string;
  status: ApprovalStatus;
  priority: string;
  dueDate: string | null;
  notes: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  post: {
    id: string;
    content: string;
    platform: string;
    status: string;
    scheduledFor: string | null;
    mediaUrls: string[];
    user: {
      id: string;
      name: string | null;
      email: string;
    };
  };
  comments: {
    id: string;
    userId: string;
    userName: string;
    content: string;
    type: string;
    createdAt: string;
  }[];
}

interface ApprovalStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  changesRequested: number;
  avgApprovalTimeMinutes: number;
  overdue: number;
}

type TabType = "pending" | "my-requests" | "all" | "settings";

const STATUS_COLORS: Record<ApprovalStatus, string> = {
  PENDING: "bg-yellow-500/10 text-yellow-400",
  APPROVED: "bg-green-500/10 text-green-400",
  REJECTED: "bg-red-500/10 text-red-400",
  CHANGES_REQUESTED: "bg-orange-500/10 text-orange-400",
  CANCELLED: "bg-zinc-500/10 text-zinc-400",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-zinc-500/10 text-zinc-400",
  normal: "bg-blue-500/10 text-blue-400",
  high: "bg-orange-500/10 text-orange-400",
  urgent: "bg-red-500/10 text-red-400",
};

export default function ApprovalsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("pending");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<ApprovalStats | null>(null);
  const [pendingRequests, setPendingRequests] = useState<ApprovalRequest[]>([]);
  const [myRequests, setMyRequests] = useState<ApprovalRequest[]>([]);
  const [allRequests, setAllRequests] = useState<ApprovalRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);

  // Action forms
  const [rejectReason, setRejectReason] = useState("");
  const [changeFeedback, setChangeFeedback] = useState("");
  const [comment, setComment] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showChangesModal, setShowChangesModal] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/approvals?action=stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }, []);

  const fetchPendingRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/approvals?action=pending-review");
      if (res.ok) {
        const data = await res.json();
        setPendingRequests(data.requests);
      }
    } catch (error) {
      console.error("Error fetching pending:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMyRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/approvals?action=list&isReviewer=false");
      if (res.ok) {
        const data = await res.json();
        setMyRequests(data.requests);
      }
    } catch (error) {
      console.error("Error fetching my requests:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAllRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/approvals?action=list&isReviewer=true");
      if (res.ok) {
        const data = await res.json();
        setAllRequests(data.requests);
      }
    } catch (error) {
      console.error("Error fetching all requests:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (activeTab === "pending") {
      fetchPendingRequests();
    } else if (activeTab === "my-requests") {
      fetchMyRequests();
    } else if (activeTab === "all") {
      fetchAllRequests();
    }
  }, [activeTab, fetchPendingRequests, fetchMyRequests, fetchAllRequests]);

  const handleApprove = async (requestId: string) => {
    try {
      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", requestId, comment: comment || undefined }),
      });

      if (res.ok) {
        setComment("");
        setSelectedRequest(null);
        fetchStats();
        if (activeTab === "pending") fetchPendingRequests();
        else if (activeTab === "all") fetchAllRequests();
      }
    } catch (error) {
      console.error("Error approving:", error);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!rejectReason.trim()) return;

    try {
      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", requestId, reason: rejectReason }),
      });

      if (res.ok) {
        setRejectReason("");
        setShowRejectModal(false);
        setSelectedRequest(null);
        fetchStats();
        if (activeTab === "pending") fetchPendingRequests();
        else if (activeTab === "all") fetchAllRequests();
      }
    } catch (error) {
      console.error("Error rejecting:", error);
    }
  };

  const handleRequestChanges = async (requestId: string) => {
    if (!changeFeedback.trim()) return;

    try {
      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request-changes", requestId, feedback: changeFeedback }),
      });

      if (res.ok) {
        setChangeFeedback("");
        setShowChangesModal(false);
        setSelectedRequest(null);
        fetchStats();
        if (activeTab === "pending") fetchPendingRequests();
        else if (activeTab === "all") fetchAllRequests();
      }
    } catch (error) {
      console.error("Error requesting changes:", error);
    }
  };

  const handleAddComment = async (requestId: string) => {
    if (!comment.trim()) return;

    try {
      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "comment", requestId, content: comment }),
      });

      if (res.ok) {
        setComment("");
        // Refresh the request to show the new comment
        const detailRes = await fetch(`/api/approvals?action=get&requestId=${requestId}`);
        if (detailRes.ok) {
          const data = await detailRes.json();
          setSelectedRequest(data.request);
        }
      }
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  const handleCancel = async (requestId: string) => {
    if (!confirm("Cancel this approval request?")) return;

    try {
      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", requestId }),
      });

      if (res.ok) {
        setSelectedRequest(null);
        fetchStats();
        fetchMyRequests();
      }
    } catch (error) {
      console.error("Error cancelling:", error);
    }
  };

  const handleResubmit = async (requestId: string) => {
    try {
      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resubmit", requestId }),
      });

      if (res.ok) {
        setSelectedRequest(null);
        fetchStats();
        fetchMyRequests();
      }
    } catch (error) {
      console.error("Error resubmitting:", error);
    }
  };

  const getPlatformIcon = (platform: string) => {
    const icons: Record<string, string> = {
      X: "X",
      LINKEDIN: "in",
      INSTAGRAM: "IG",
      TIKTOK: "TT",
      YOUTUBE: "YT",
      PINTEREST: "P",
      BLUESKY: "BS",
    };
    return icons[platform] || platform.charAt(0);
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diff = now.getTime() - then.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const tabs: { id: TabType; label: string; count?: number }[] = [
    { id: "pending", label: "Pending Review", count: stats?.pending },
    { id: "my-requests", label: "My Requests" },
    { id: "all", label: "All Requests" },
  ];

  const renderRequestCard = (request: ApprovalRequest, isReviewer: boolean = false) => (
    <div
      key={request.id}
      className={`p-6 rounded-2xl border ${
        request.status === "PENDING" && request.dueDate && new Date(request.dueDate) < new Date()
          ? "bg-red-900/10 border-red-800/50"
          : "bg-zinc-900/50 border-zinc-800"
      }`}
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-zinc-700 flex items-center justify-center font-medium text-sm flex-shrink-0">
          {getPlatformIcon(request.post.platform)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`px-2 py-0.5 rounded text-xs ${STATUS_COLORS[request.status]}`}>
              {request.status.replace("_", " ")}
            </span>
            <span className={`px-2 py-0.5 rounded text-xs ${PRIORITY_COLORS[request.priority]}`}>
              {request.priority}
            </span>
            <span className="text-xs text-zinc-500">
              {formatTimeAgo(request.submittedAt)}
            </span>
            {request.dueDate && new Date(request.dueDate) < new Date() && request.status === "PENDING" && (
              <span className="px-2 py-0.5 rounded text-xs bg-red-500/10 text-red-400">
                OVERDUE
              </span>
            )}
          </div>

          <p className="text-zinc-300 mb-3 line-clamp-3">{request.post.content}</p>

          <div className="flex items-center gap-4 text-xs text-zinc-500 mb-3">
            <span>By {request.post.user.name || request.post.user.email}</span>
            {request.post.scheduledFor && (
              <span>Scheduled: {new Date(request.post.scheduledFor).toLocaleDateString()}</span>
            )}
            {request.dueDate && (
              <span>Due: {new Date(request.dueDate).toLocaleDateString()}</span>
            )}
          </div>

          {request.notes && (
            <div className="p-3 bg-zinc-800/50 rounded-lg mb-3">
              <span className="text-xs text-zinc-500">Notes:</span>
              <p className="text-sm text-zinc-300 mt-1">{request.notes}</p>
            </div>
          )}

          {/* Comments preview */}
          {request.comments.length > 0 && (
            <div className="mb-3">
              <span className="text-xs text-zinc-500">{request.comments.length} comment(s)</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedRequest(request)}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors"
            >
              View Details
            </button>
            {isReviewer && request.status === "PENDING" && (
              <>
                <button
                  onClick={() => handleApprove(request.id)}
                  className="px-3 py-1.5 bg-green-500 hover:bg-green-600 rounded-lg text-sm font-medium transition-colors"
                >
                  Approve
                </button>
                <button
                  onClick={() => {
                    setSelectedRequest(request);
                    setShowChangesModal(true);
                  }}
                  className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 rounded-lg text-sm font-medium transition-colors"
                >
                  Request Changes
                </button>
                <button
                  onClick={() => {
                    setSelectedRequest(request);
                    setShowRejectModal(true);
                  }}
                  className="px-3 py-1.5 bg-red-500 hover:bg-red-600 rounded-lg text-sm font-medium transition-colors"
                >
                  Reject
                </button>
              </>
            )}
            {!isReviewer && request.status === "PENDING" && (
              <button
                onClick={() => handleCancel(request.id)}
                className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
            )}
            {!isReviewer && (request.status === "CHANGES_REQUESTED" || request.status === "REJECTED") && (
              <button
                onClick={() => handleResubmit(request.id)}
                className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-sm font-medium transition-colors"
              >
                Resubmit
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Approval Workflow</h1>
          <p className="text-zinc-400 mt-1">
            Review and manage content approvals
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 text-center">
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
            <div className="text-xs text-zinc-500">Total</div>
          </div>
          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 text-center">
            <div className="text-2xl font-bold text-yellow-400">{stats?.pending || 0}</div>
            <div className="text-xs text-zinc-500">Pending</div>
          </div>
          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 text-center">
            <div className="text-2xl font-bold text-green-400">{stats?.approved || 0}</div>
            <div className="text-xs text-zinc-500">Approved</div>
          </div>
          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 text-center">
            <div className="text-2xl font-bold text-red-400">{stats?.rejected || 0}</div>
            <div className="text-xs text-zinc-500">Rejected</div>
          </div>
          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 text-center">
            <div className="text-2xl font-bold text-orange-400">{stats?.changesRequested || 0}</div>
            <div className="text-xs text-zinc-500">Changes</div>
          </div>
          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 text-center">
            <div className="text-2xl font-bold">{stats?.avgApprovalTimeMinutes || 0}m</div>
            <div className="text-xs text-zinc-500">Avg Time</div>
          </div>
          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 text-center">
            <div className="text-2xl font-bold text-red-400">{stats?.overdue || 0}</div>
            <div className="text-xs text-zinc-500">Overdue</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-zinc-800 pb-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === tab.id
                  ? "bg-indigo-500 text-white"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-white/20 text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {activeTab === "pending" && (
              pendingRequests.length === 0 ? (
                <div className="text-center py-16">
                  <svg className="w-16 h-16 mx-auto text-zinc-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-lg font-semibold mb-2">No Pending Reviews</h3>
                  <p className="text-zinc-400">All caught up! No requests waiting for your review.</p>
                </div>
              ) : (
                pendingRequests.map((request) => renderRequestCard(request, true))
              )
            )}

            {activeTab === "my-requests" && (
              myRequests.length === 0 ? (
                <div className="text-center py-16">
                  <svg className="w-16 h-16 mx-auto text-zinc-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <h3 className="text-lg font-semibold mb-2">No Requests</h3>
                  <p className="text-zinc-400">You haven&apos;t submitted any approval requests yet.</p>
                </div>
              ) : (
                myRequests.map((request) => renderRequestCard(request, false))
              )
            )}

            {activeTab === "all" && (
              allRequests.length === 0 ? (
                <div className="text-center py-16">
                  <svg className="w-16 h-16 mx-auto text-zinc-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <h3 className="text-lg font-semibold mb-2">No Requests</h3>
                  <p className="text-zinc-400">No approval requests in the system.</p>
                </div>
              ) : (
                allRequests.map((request) => renderRequestCard(request, true))
              )
            )}
          </div>
        )}

        {/* Detail Modal */}
        {selectedRequest && !showRejectModal && !showChangesModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-zinc-800 sticky top-0 bg-zinc-900">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Approval Request</h3>
                  <button
                    onClick={() => setSelectedRequest(null)}
                    className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Status & Meta */}
                <div className="flex flex-wrap gap-2">
                  <span className={`px-3 py-1 rounded-lg text-sm ${STATUS_COLORS[selectedRequest.status]}`}>
                    {selectedRequest.status.replace("_", " ")}
                  </span>
                  <span className={`px-3 py-1 rounded-lg text-sm ${PRIORITY_COLORS[selectedRequest.priority]}`}>
                    {selectedRequest.priority} priority
                  </span>
                  <span className="px-3 py-1 rounded-lg text-sm bg-zinc-800 text-zinc-300">
                    {selectedRequest.post.platform}
                  </span>
                </div>

                {/* Post Content */}
                <div className="p-4 bg-zinc-800/50 rounded-xl">
                  <h4 className="text-sm font-medium text-zinc-400 mb-2">Post Content</h4>
                  <p className="text-zinc-200">{selectedRequest.post.content}</p>
                  {selectedRequest.post.mediaUrls.length > 0 && (
                    <div className="mt-3 text-xs text-zinc-500">
                      {selectedRequest.post.mediaUrls.length} media file(s) attached
                    </div>
                  )}
                </div>

                {/* Meta Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-zinc-500">Submitted by</span>
                    <p>{selectedRequest.post.user.name || selectedRequest.post.user.email}</p>
                  </div>
                  <div>
                    <span className="text-zinc-500">Submitted at</span>
                    <p>{new Date(selectedRequest.submittedAt).toLocaleString()}</p>
                  </div>
                  {selectedRequest.dueDate && (
                    <div>
                      <span className="text-zinc-500">Due date</span>
                      <p>{new Date(selectedRequest.dueDate).toLocaleString()}</p>
                    </div>
                  )}
                  {selectedRequest.post.scheduledFor && (
                    <div>
                      <span className="text-zinc-500">Scheduled for</span>
                      <p>{new Date(selectedRequest.post.scheduledFor).toLocaleString()}</p>
                    </div>
                  )}
                </div>

                {/* Notes */}
                {selectedRequest.notes && (
                  <div className="p-4 bg-zinc-800/50 rounded-xl">
                    <h4 className="text-sm font-medium text-zinc-400 mb-2">Notes</h4>
                    <p className="text-zinc-300">{selectedRequest.notes}</p>
                  </div>
                )}

                {/* Comments */}
                <div>
                  <h4 className="text-sm font-medium text-zinc-400 mb-3">Comments</h4>
                  {selectedRequest.comments.length === 0 ? (
                    <p className="text-zinc-500 text-sm">No comments yet</p>
                  ) : (
                    <div className="space-y-3">
                      {selectedRequest.comments.map((c) => (
                        <div
                          key={c.id}
                          className={`p-3 rounded-lg ${
                            c.type === "approval"
                              ? "bg-green-500/10 border border-green-500/20"
                              : c.type === "rejection"
                              ? "bg-red-500/10 border border-red-500/20"
                              : c.type === "change_request"
                              ? "bg-orange-500/10 border border-orange-500/20"
                              : "bg-zinc-800/50"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm">{c.userName}</span>
                            <span className="text-xs text-zinc-500">
                              {formatTimeAgo(c.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm text-zinc-300">{c.content}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add comment */}
                  <div className="mt-4 flex gap-2">
                    <input
                      type="text"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Add a comment..."
                      className="flex-1 px-4 py-2 bg-zinc-800 rounded-lg border border-zinc-700 focus:border-indigo-500 focus:outline-none text-sm"
                    />
                    <button
                      onClick={() => handleAddComment(selectedRequest.id)}
                      disabled={!comment.trim()}
                      className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              {selectedRequest.status === "PENDING" && (
                <div className="p-6 border-t border-zinc-800 flex gap-3">
                  <button
                    onClick={() => handleApprove(selectedRequest.id)}
                    className="flex-1 py-3 bg-green-500 hover:bg-green-600 rounded-xl font-medium transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => setShowChangesModal(true)}
                    className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 rounded-xl font-medium transition-colors"
                  >
                    Request Changes
                  </button>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    className="flex-1 py-3 bg-red-500 hover:bg-red-600 rounded-xl font-medium transition-colors"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reject Modal */}
        {showRejectModal && selectedRequest && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 w-full max-w-md">
              <div className="p-6 border-b border-zinc-800">
                <h3 className="text-lg font-semibold">Reject Request</h3>
              </div>
              <div className="p-6">
                <label className="block text-sm font-medium mb-2">Reason for rejection</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Please explain why this content is being rejected..."
                  rows={4}
                  className="w-full px-4 py-3 bg-zinc-800 rounded-xl border border-zinc-700 focus:border-indigo-500 focus:outline-none resize-none"
                />
              </div>
              <div className="p-6 border-t border-zinc-800 flex gap-4">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectReason("");
                  }}
                  className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleReject(selectedRequest.id)}
                  disabled={!rejectReason.trim()}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-medium transition-colors"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Request Changes Modal */}
        {showChangesModal && selectedRequest && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 w-full max-w-md">
              <div className="p-6 border-b border-zinc-800">
                <h3 className="text-lg font-semibold">Request Changes</h3>
              </div>
              <div className="p-6">
                <label className="block text-sm font-medium mb-2">Feedback</label>
                <textarea
                  value={changeFeedback}
                  onChange={(e) => setChangeFeedback(e.target.value)}
                  placeholder="What changes need to be made?"
                  rows={4}
                  className="w-full px-4 py-3 bg-zinc-800 rounded-xl border border-zinc-700 focus:border-indigo-500 focus:outline-none resize-none"
                />
              </div>
              <div className="p-6 border-t border-zinc-800 flex gap-4">
                <button
                  onClick={() => {
                    setShowChangesModal(false);
                    setChangeFeedback("");
                  }}
                  className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRequestChanges(selectedRequest.id)}
                  disabled={!changeFeedback.trim()}
                  className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-medium transition-colors"
                >
                  Request Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
