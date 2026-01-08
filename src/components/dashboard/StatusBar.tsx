"use client";

import Link from "next/link";
import { XAccount, PostingConfig } from "@prisma/client";

interface StatusBarProps {
  xAccount: XAccount | null;
  postingConfig: PostingConfig | null;
}

export function StatusBar({ xAccount, postingConfig }: StatusBarProps) {
  return (
    <div className="bg-zinc-900/50 backdrop-blur-sm border border-white/5 rounded-2xl p-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        {/* X Connection Status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              xAccount ? "bg-purple-500/10" : "bg-zinc-800/50"
            }`}>
              <span className={`font-bold text-sm ${xAccount ? "text-purple-400" : "text-zinc-500"}`}>X</span>
            </div>
            {xAccount ? (
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">@{xAccount.xUsername}</span>
                  <span className="flex items-center gap-1 text-xs text-green-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    Connected
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-sm text-zinc-500">Not connected</span>
                <Link
                  href="/api/x/connect"
                  className="text-xs px-3 py-1.5 bg-white text-black font-medium rounded-lg hover:bg-zinc-200 transition"
                >
                  Connect X
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Auto-post Status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              postingConfig?.isActive ? "bg-green-500/10" : "bg-zinc-800/50"
            }`}>
              <svg className={`w-4 h-4 ${postingConfig?.isActive ? "text-green-400" : "text-zinc-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            {postingConfig?.isActive ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Auto-posting</span>
                <span className="flex items-center gap-1 text-xs text-green-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  Active
                </span>
                <span className="text-xs text-zinc-500 ml-1">
                  Next: {postingConfig.postingTime} {postingConfig.timezone}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-sm text-zinc-500">Auto-posting off</span>
                <Link
                  href="/dashboard/settings"
                  className="text-xs px-3 py-1.5 bg-white/10 text-zinc-300 font-medium rounded-lg hover:bg-white/15 transition"
                >
                  Configure
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-6 ml-auto">
          <Link href="/dashboard/posts" className="group flex items-center gap-2 text-zinc-400 hover:text-white transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span className="text-sm">View All Posts</span>
            <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
          <Link href="/dashboard/settings" className="group flex items-center gap-2 text-zinc-400 hover:text-white transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-sm">Settings</span>
            <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
