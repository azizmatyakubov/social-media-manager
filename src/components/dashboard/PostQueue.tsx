"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Post {
  id: string;
  content: string;
  status: string;
  scheduledFor: Date | null;
  createdAt: Date;
}

interface PostQueueProps {
  posts: Post[];
  isXConnected: boolean;
}

function formatScheduledTime(date: Date | null): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function getTimeUntil(date: Date | null): string {
  if (!date) return "";
  const now = new Date();
  const target = new Date(date);
  const diff = target.getTime() - now.getTime();

  if (diff < 0) return "overdue";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `in ${days}d`;
  }
  if (hours > 0) {
    return `in ${hours}h ${minutes}m`;
  }
  return `in ${minutes}m`;
}

export function PostQueue({ posts, isXConnected }: PostQueueProps) {
  const router = useRouter();
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const pendingPosts = posts.filter((p) => p.status === "PENDING");
  const scheduledPosts = posts.filter((p) => p.status === "SCHEDULED");
  const totalCount = pendingPosts.length + scheduledPosts.length;

  const handlePublish = async (postId: string) => {
    if (!isXConnected) {
      alert("Connect your X account first");
      return;
    }

    setActioningId(postId);
    try {
      const response = await fetch("/api/posts/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });

      if (response.ok) {
        router.refresh();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to publish");
      }
    } catch {
      alert("Failed to publish");
    } finally {
      setActioningId(null);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm("Delete this post?")) return;

    setActioningId(postId);
    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        router.refresh();
      } else {
        alert("Failed to delete");
      }
    } catch {
      alert("Failed to delete");
    } finally {
      setActioningId(null);
    }
  };

  const handleEdit = (post: Post) => {
    setEditingId(post.id);
    setEditContent(post.content);
  };

  const handleSaveEdit = async (postId: string) => {
    if (!editContent.trim()) return;

    setActioningId(postId);
    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent }),
      });

      if (response.ok) {
        setEditingId(null);
        setEditContent("");
        router.refresh();
      } else {
        alert("Failed to save");
      }
    } catch {
      alert("Failed to save");
    } finally {
      setActioningId(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent("");
  };

  if (totalCount === 0) {
    return (
      <div className="bg-zinc-900/50 backdrop-blur-sm border border-white/5 rounded-2xl p-6 h-full">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="font-semibold">Queue</h3>
          <span className="text-xs text-zinc-500 ml-auto">0 posts</span>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-zinc-800/50 flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-zinc-400 text-sm">No posts in queue</p>
          <p className="text-zinc-500 text-xs mt-1">Generate or schedule a post to get started</p>
        </div>
      </div>
    );
  }

  const renderPost = (post: Post, isScheduled: boolean) => (
    <div
      key={post.id}
      className="group p-4 rounded-xl bg-zinc-800/30 border border-white/5 hover:border-white/10 transition"
    >
      {editingId === post.id ? (
        <div className="space-y-3">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full h-24 bg-zinc-900/50 border border-white/10 rounded-lg p-3 text-sm text-white placeholder-zinc-500 resize-none focus:outline-none focus:border-indigo-500/50"
          />
          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={handleCancelEdit}
              className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              onClick={() => handleSaveEdit(post.id)}
              disabled={actioningId === post.id || editContent.length > 280}
              className="px-3 py-1.5 text-xs bg-indigo-500/20 text-indigo-400 rounded-lg hover:bg-indigo-500/30 transition disabled:opacity-50"
            >
              {actioningId === post.id ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      ) : (
        <>
          {isScheduled && post.scheduledFor && (
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs text-emerald-400 font-medium">
                  {formatScheduledTime(post.scheduledFor)}
                </span>
              </div>
              <span className="text-xs text-zinc-500">
                {getTimeUntil(post.scheduledFor)}
              </span>
            </div>
          )}
          <p className="text-sm text-zinc-300 line-clamp-3 mb-3 group-hover:text-white transition">
            {post.content}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePublish(post.id)}
              disabled={actioningId === post.id || !isXConnected}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-green-500/10 text-green-400 rounded-lg hover:bg-green-500/20 transition disabled:opacity-50"
            >
              {actioningId === post.id ? (
                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
              Publish Now
            </button>
            <button
              onClick={() => handleEdit(post)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white/5 text-zinc-400 rounded-lg hover:bg-white/10 hover:text-white transition"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>
            <button
              onClick={() => handleDelete(post.id)}
              disabled={actioningId === post.id}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-500 rounded-lg hover:bg-red-500/10 hover:text-red-400 transition ml-auto"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="bg-zinc-900/50 backdrop-blur-sm border border-white/5 rounded-2xl p-6 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
          <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h3 className="font-semibold">Queue</h3>
        <div className="flex items-center gap-2 ml-auto">
          {scheduledPosts.length > 0 && (
            <span className="text-xs text-emerald-400/70 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              {scheduledPosts.length} scheduled
            </span>
          )}
          {pendingPosts.length > 0 && (
            <span className="text-xs text-amber-400/70 bg-amber-500/10 px-2 py-0.5 rounded-full">
              {pendingPosts.length} draft
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3 flex-1 overflow-auto">
        {/* Scheduled posts first */}
        {scheduledPosts.length > 0 && (
          <>
            {scheduledPosts.map((post) => renderPost(post, true))}
          </>
        )}

        {/* Then pending/draft posts */}
        {pendingPosts.length > 0 && scheduledPosts.length > 0 && (
          <div className="border-t border-white/5 pt-3 mt-3">
            <span className="text-xs text-zinc-500 uppercase tracking-wide">Drafts</span>
          </div>
        )}
        {pendingPosts.map((post) => renderPost(post, false))}
      </div>
    </div>
  );
}
