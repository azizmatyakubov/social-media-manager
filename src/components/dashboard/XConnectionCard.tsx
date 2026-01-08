"use client";

import { useState } from "react";

interface XAccount {
  id: string;
  xUsername: string;
  xUserId: string;
  createdAt: Date;
}

interface XConnectionCardProps {
  xAccount: XAccount | null;
  xCredentialsConfigured: boolean;
}

export function XConnectionCard({ xAccount, xCredentialsConfigured }: XConnectionCardProps) {
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect your X account?")) {
      return;
    }

    setIsDisconnecting(true);
    try {
      const res = await fetch("/api/x/disconnect", { method: "POST" });
      if (res.ok) {
        window.location.reload();
      }
    } catch (error) {
      console.error("Failed to disconnect:", error);
    } finally {
      setIsDisconnecting(false);
    }
  };

  // Connected state
  if (xAccount) {
    return (
      <div className="relative overflow-hidden rounded-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-teal-500/10" />
        <div className="relative p-6 border border-emerald-500/20 rounded-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg">X Account Connected</h3>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium">
                    Active
                  </span>
                </div>
                <p className="text-zinc-400 mt-0.5">
                  Connected as <span className="text-white font-medium">@{xAccount.xUsername}</span>
                </p>
              </div>
            </div>
            <button
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition disabled:opacity-50"
            >
              {isDisconnecting ? "Disconnecting..." : "Disconnect"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Not configured state - show setup guide
  if (!xCredentialsConfigured) {
    return (
      <div className="relative overflow-hidden rounded-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-cyan-500/10" />
        <div className="relative p-6 border border-blue-500/20 rounded-2xl">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-1">Connect Your X Account</h3>
              <p className="text-zinc-400 text-sm mb-4">
                To enable posting to X, you need to set up X API credentials first.
              </p>

              <div className="bg-zinc-900/50 rounded-xl p-4 border border-white/5">
                <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Setup Instructions
                </h4>
                <ol className="space-y-2 text-sm text-zinc-400">
                  <li className="flex gap-2">
                    <span className="text-blue-400 font-medium">1.</span>
                    Go to{" "}
                    <a
                      href="https://developer.twitter.com/en/portal/dashboard"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline"
                    >
                      developer.twitter.com
                    </a>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-400 font-medium">2.</span>
                    Create a new project and app (or use existing)
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-400 font-medium">3.</span>
                    Enable OAuth 2.0 with read/write permissions
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-400 font-medium">4.</span>
                    Set callback URL to:{" "}
                    <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-xs break-all">
                      http://localhost:4001/api/x/callback
                    </code>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-400 font-medium">5.</span>
                    Copy Client ID and Client Secret to your .env.local file:
                  </li>
                </ol>
                <div className="mt-3 p-3 rounded-lg bg-zinc-800/50 font-mono text-xs text-zinc-300">
                  <div>X_CLIENT_ID=your_client_id</div>
                  <div>X_CLIENT_SECRET=your_client_secret</div>
                </div>
                <p className="text-xs text-zinc-500 mt-3">
                  After adding the credentials, restart your development server.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Configured but not connected state
  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div className="absolute inset-0 bg-gradient-to-r from-zinc-500/10 to-zinc-400/10" />
      <div className="relative p-6 border border-white/10 rounded-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center">
              <svg className="w-6 h-6 text-zinc-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-lg">X Account</h3>
              <p className="text-zinc-400 text-sm">Connect your X account to start posting</p>
            </div>
          </div>
          <a
            href="/api/x/connect"
            className="px-5 py-2.5 rounded-lg bg-white text-black font-medium text-sm hover:bg-zinc-200 transition flex items-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Connect X
          </a>
        </div>
      </div>
    </div>
  );
}
