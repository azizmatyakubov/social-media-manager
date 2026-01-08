"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    )
  },
  {
    name: "Compose",
    href: "/dashboard/compose",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    )
  },
  {
    name: "Calendar",
    href: "/dashboard/calendar",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    )
  },
  {
    name: "Posts",
    href: "/dashboard/posts",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    )
  },
  {
    name: "Analytics",
    href: "/dashboard/analytics-v2",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )
  },
];

const advancedNavigation = [
  {
    name: "A/B Tests",
    href: "/dashboard/ab-tests",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
      </svg>
    )
  },
  {
    name: "Images",
    href: "/dashboard/images",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    )
  },
  {
    name: "Mentions",
    href: "/dashboard/mentions",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
      </svg>
    )
  },
  {
    name: "Competitors",
    href: "/dashboard/competitors",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    )
  },
  {
    name: "Repurpose",
    href: "/dashboard/repurpose",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    )
  },
];

const teamNavigation = [
  {
    name: "Team",
    href: "/dashboard/team",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    )
  },
  {
    name: "Integrations",
    href: "/dashboard/integrations",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
      </svg>
    )
  },
  {
    name: "Settings",
    href: "/dashboard/settings",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )
  },
];

// Platform options for social media connections - exported for use in other components
export const platformOptions = [
  { name: "X (Twitter)", value: "X", color: "#000000", icon: "X" },
  { name: "LinkedIn", value: "LINKEDIN", color: "#0A66C2", icon: "in" },
  { name: "Instagram", value: "INSTAGRAM", color: "#E4405F", icon: "IG" },
  { name: "TikTok", value: "TIKTOK", color: "#000000", icon: "TT" },
  { name: "YouTube", value: "YOUTUBE", color: "#FF0000", icon: "YT" },
  { name: "Pinterest", value: "PINTEREST", color: "#E60023", icon: "P" },
  { name: "Bluesky", value: "BLUESKY", color: "#0085FF", icon: "BS" },
  { name: "Threads", value: "THREADS", color: "#000000", icon: "TH" },
] as const;

export type PlatformOption = typeof platformOptions[number];
export type PlatformValue = PlatformOption["value"];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [showAdvanced, setShowAdvanced] = useState(true);

  const NavLink = ({ item }: { item: { name: string; href: string; icon: React.ReactNode } }) => {
    const isActive = pathname === item.href;
    return (
      <li>
        <Link
          href={item.href}
          className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${
            isActive
              ? "bg-white/10 text-white shadow-lg shadow-indigo-500/5"
              : "text-zinc-400 hover:bg-white/5 hover:text-white"
          }`}
        >
          <span className={isActive ? "text-indigo-400" : ""}>{item.icon}</span>
          <span className="font-medium text-sm">{item.name}</span>
          {isActive && (
            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400" />
          )}
        </Link>
      </li>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Background effects */}
      <div className="fixed inset-0 bg-grid opacity-20 pointer-events-none" />
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[120px]" />
      </div>

      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-zinc-950/80 backdrop-blur-xl border-r border-white/5 flex flex-col z-50 overflow-y-auto">
        {/* Logo */}
        <div className="p-6 border-b border-white/5">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-sm">
              A
            </div>
            <span className="text-lg font-semibold tracking-tight">AutoPost</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-6">
          {/* Main Nav */}
          <ul className="space-y-1">
            {navigation.map((item) => (
              <NavLink key={item.name} item={item} />
            ))}
          </ul>

          {/* Advanced Features */}
          <div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center justify-between w-full px-4 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider"
            >
              <span>Advanced</span>
              <svg
                className={`w-4 h-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showAdvanced && (
              <ul className="space-y-1 mt-2">
                {advancedNavigation.map((item) => (
                  <NavLink key={item.name} item={item} />
                ))}
              </ul>
            )}
          </div>

          {/* Team & Settings */}
          <div>
            <p className="px-4 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Workspace
            </p>
            <ul className="space-y-1">
              {teamNavigation.map((item) => (
                <NavLink key={item.name} item={item} />
              ))}
            </ul>
          </div>
        </nav>

        {/* Upgrade banner */}
        <div className="p-4">
          <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-sm font-medium">Pro Plan</span>
            </div>
            <p className="text-xs text-zinc-400 mb-3">Unlock all features and advanced AI.</p>
            <Link href="/pricing" className="block w-full py-2 text-xs font-medium rounded-lg bg-white/10 hover:bg-white/15 transition text-center">
              Upgrade
            </Link>
          </div>
        </div>

        {/* User section */}
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-medium text-sm flex-shrink-0">
                {session?.user?.name?.charAt(0) || session?.user?.email?.charAt(0) || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {session?.user?.name || "User"}
                </p>
                <p className="text-xs text-zinc-500 truncate">
                  {session?.user?.email}
                </p>
              </div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition flex-shrink-0"
              title="Sign out"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64 min-h-screen relative">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
