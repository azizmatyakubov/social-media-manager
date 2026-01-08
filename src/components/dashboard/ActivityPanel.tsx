"use client";

import { Post } from "@prisma/client";

interface ActivityPanelProps {
  posts: Post[];
  todayPosts: Post[];
  weekPosts: Post[];
}

export function ActivityPanel({ posts, todayPosts, weekPosts }: ActivityPanelProps) {
  const postedToday = todayPosts.filter(p => p.status === "POSTED").length;
  const postedThisWeek = weekPosts.filter(p => p.status === "POSTED").length;
  const recentPosted = posts.filter(p => p.status === "POSTED").slice(0, 4);

  return (
    <div className="bg-zinc-900/50 backdrop-blur-sm border border-white/5 rounded-2xl p-6 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h3 className="font-semibold">Activity</h3>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="p-3 rounded-xl bg-zinc-800/30 border border-white/5">
          <p className="text-xs text-zinc-500 mb-1">Today</p>
          <p className="text-2xl font-bold text-green-400">{postedToday}</p>
          <p className="text-xs text-zinc-500">posts published</p>
        </div>
        <div className="p-3 rounded-xl bg-zinc-800/30 border border-white/5">
          <p className="text-xs text-zinc-500 mb-1">This Week</p>
          <p className="text-2xl font-bold">{postedThisWeek}</p>
          <p className="text-xs text-zinc-500">posts published</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="flex-1">
        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Recent Activity</p>
        {recentPosted.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-zinc-500">No posts published yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentPosted.map((post) => (
              <div key={post.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/5 transition">
                <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-zinc-300 line-clamp-2">{post.content}</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {post.postedAt ? formatTimeAgo(new Date(post.postedAt)) : "Just now"}
                  </p>
                </div>
                {post.platformPostId && (
                  <a
                    href={`https://x.com/i/status/${post.platformPostId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-zinc-500 hover:text-indigo-400 transition flex-shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  return `${diffDays}d ago`;
}
