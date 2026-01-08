"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface SubscriptionData {
  subscription: {
    id: string;
    plan: string;
    planName: string;
    status: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  };
  plan: {
    name: string;
    monthlyPrice: number;
    annualPrice: number;
    features: Array<{
      name: string;
      included: boolean;
      limit?: string;
      highlight?: boolean;
      description?: string;
    }>;
  };
  usage: {
    aiGenerations: { count: number; limit: number; percentage: number; approaching: boolean; unlimited: boolean };
    scheduledPosts: { count: number; limit: number; percentage: number; approaching: boolean; unlimited: boolean };
    xAccounts: { count: number; limit: number; percentage: number; approaching: boolean; unlimited: boolean };
  };
  upgradePlan: string | null;
}

export function SubscriptionCard() {
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    async function fetchSubscription() {
      try {
        const res = await fetch("/api/subscription");
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (error) {
        console.error("Failed to fetch subscription:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchSubscription();
  }, []);

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/subscription/portal", { method: "POST" });
      const json = await res.json();
      if (json.url) {
        window.location.href = json.url;
      } else {
        alert(json.error || "Failed to open billing portal");
      }
    } catch (error) {
      console.error("Portal error:", error);
    } finally {
      setPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-zinc-900/50 backdrop-blur-sm border border-white/5 rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 animate-spin text-indigo-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-zinc-400">Loading subscription...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { subscription, usage, upgradePlan } = data;
  const isPaid = subscription.plan !== "FREE";

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <div className="bg-zinc-900/50 backdrop-blur-sm border border-white/5 rounded-2xl p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h3 className="text-lg font-semibold">Current Plan</h3>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                subscription.plan === "FREE"
                  ? "bg-zinc-700 text-zinc-300"
                  : subscription.plan === "CREATOR"
                  ? "bg-blue-500/20 text-blue-400"
                  : subscription.plan === "PRO"
                  ? "bg-indigo-500/20 text-indigo-400"
                  : "bg-purple-500/20 text-purple-400"
              }`}>
                {subscription.planName}
              </span>
            </div>
            {subscription.cancelAtPeriodEnd && (
              <p className="text-sm text-amber-400">
                Cancels at end of billing period
              </p>
            )}
            {subscription.currentPeriodEnd && isPaid && (
              <p className="text-sm text-zinc-500">
                {subscription.cancelAtPeriodEnd ? "Access until" : "Renews"}{" "}
                {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {isPaid && (
              <button
                onClick={handleManageBilling}
                disabled={portalLoading}
                className="px-4 py-2 text-sm font-medium text-zinc-300 bg-white/5 rounded-lg hover:bg-white/10 transition disabled:opacity-50"
              >
                {portalLoading ? "Loading..." : "Manage Billing"}
              </button>
            )}
            {upgradePlan && (
              <Link
                href="/pricing"
                className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg hover:opacity-90 transition"
              >
                Upgrade
              </Link>
            )}
          </div>
        </div>

        {/* Usage Stats */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-zinc-400">Usage This Month</h4>

          {/* AI Generations */}
          <UsageBar
            label="AI Generations"
            current={usage.aiGenerations.count}
            limit={usage.aiGenerations.limit}
            unlimited={usage.aiGenerations.unlimited}
            approaching={usage.aiGenerations.approaching}
          />

          {/* Scheduled Posts */}
          <UsageBar
            label="Scheduled Posts"
            current={usage.scheduledPosts.count}
            limit={usage.scheduledPosts.limit}
            unlimited={usage.scheduledPosts.unlimited}
            approaching={usage.scheduledPosts.approaching}
          />

          {/* X Accounts */}
          <UsageBar
            label="X Accounts"
            current={usage.xAccounts.count}
            limit={usage.xAccounts.limit}
            unlimited={usage.xAccounts.unlimited}
            approaching={usage.xAccounts.approaching}
          />
        </div>
      </div>

      {/* Upgrade Prompt */}
      {subscription.plan === "FREE" && (
        <div className="relative overflow-hidden rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20" />
          <div className="relative p-6 border border-indigo-500/20 rounded-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold mb-1">Unlock More Power</h3>
                <p className="text-sm text-zinc-400 mb-4">
                  Get unlimited scheduled posts, AI Voice Learning, Viral Score Prediction, and more.
                </p>
                <ul className="text-sm text-zinc-300 space-y-1 mb-4">
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    100 AI generations/month
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    AI learns your writing style
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Predict engagement before posting
                  </li>
                </ul>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">$12</div>
                <div className="text-sm text-zinc-400">/month</div>
                <div className="text-xs text-zinc-500">billed annually</div>
              </div>
            </div>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-zinc-200 transition"
            >
              View Plans
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function UsageBar({
  label,
  current,
  limit,
  unlimited,
  approaching,
}: {
  label: string;
  current: number;
  limit: number;
  unlimited: boolean;
  approaching: boolean;
}) {
  const percentage = unlimited ? 0 : Math.min((current / limit) * 100, 100);

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm text-zinc-300">{label}</span>
        <span className={`text-sm ${approaching ? "text-amber-400" : "text-zinc-400"}`}>
          {unlimited ? (
            <span className="text-emerald-400">Unlimited</span>
          ) : (
            <>
              {current} / {limit}
              {approaching && " (Approaching limit)"}
            </>
          )}
        </span>
      </div>
      {!unlimited && (
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              percentage >= 100
                ? "bg-red-500"
                : approaching
                ? "bg-amber-500"
                : "bg-gradient-to-r from-indigo-500 to-purple-500"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
}
