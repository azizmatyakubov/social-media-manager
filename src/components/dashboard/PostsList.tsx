"use client";

import { Post } from "@prisma/client";
import { useState } from "react";

interface PostsListProps {
  posts: Post[];
  isXConnected: boolean;
}

export function PostsList({ posts, isXConnected }: PostsListProps) {
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const handlePublish = async (postId: string) => {
    setPublishingId(postId);
    try {
      const response = await fetch("/api/posts/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });

      if (response.ok) {
        window.location.reload();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to publish post");
      }
    } catch {
      alert("Failed to publish post");
    } finally {
      setPublishingId(null);
    }
  };

  if (posts.length === 0) {
    return (
      <div className="bg-zinc-900/50 backdrop-blur-sm border border-white/5 rounded-2xl p-12 text-center">
        <div className="w-16 h-16 bg-zinc-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
        </div>
        <p className="text-zinc-300 font-medium">No posts yet</p>
        <p className="text-sm text-zinc-500 mt-1">
          Generate your first post to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <div
          key={post.id}
          className="group bg-zinc-900/50 backdrop-blur-sm border border-white/5 rounded-2xl p-6 hover:border-white/10 transition"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-zinc-200 whitespace-pre-wrap leading-relaxed group-hover:text-white transition">{post.content}</p>
              <div className="mt-4 flex items-center gap-4 text-sm text-zinc-500">
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {new Date(post.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
                {post.postedAt && (
                  <span className="text-green-400 flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                    </svg>
                    Posted {new Date(post.postedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </div>
              {post.error && (
                <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400 flex items-start gap-2">
                  <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {post.error}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${
                  post.status === "POSTED"
                    ? "bg-green-500/10 text-green-400 border-green-500/20"
                    : post.status === "PENDING"
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    : "bg-red-500/10 text-red-400 border-red-500/20"
                }`}
              >
                {post.status.toLowerCase()}
              </span>
              {post.status === "PENDING" && isXConnected && (
                <button
                  onClick={() => handlePublish(post.id)}
                  disabled={publishingId === post.id}
                  className="px-4 py-2 btn-premium rounded-lg text-white text-sm font-medium relative disabled:opacity-50"
                >
                  <span className="relative z-10 flex items-center gap-1.5">
                    {publishingId === post.id ? (
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
              )}
              {post.platformPostId && (
                <a
                  href={`https://x.com/i/status/${post.platformPostId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-white/5 text-zinc-300 text-sm font-medium rounded-lg hover:bg-white/10 transition flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  View on X
                </a>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
