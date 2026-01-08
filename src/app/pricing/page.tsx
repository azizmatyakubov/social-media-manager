"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const plans = [
  {
    id: "FREE",
    name: "Starter",
    description: "Perfect for trying out AutoPost",
    monthlyPrice: 0,
    annualPrice: 0,
    limits: {
      aiGenerations: 10,
      scheduledPosts: 15,
      xAccounts: 1,
    },
    features: [
      { name: "AI post generation", limit: "10/month", included: true },
      { name: "Scheduled posts", limit: "15/month", included: true },
      { name: "X account", limit: "1", included: true },
      { name: "Basic analytics", included: true },
      { name: "Thread support", included: true },
      { name: "AI Voice Learning", included: false },
      { name: "Viral Score Prediction", included: false },
      { name: "Smart Scheduling", included: false },
    ],
    cta: "Get Started Free",
    ctaVariant: "secondary" as const,
  },
  {
    id: "CREATOR",
    name: "Creator",
    description: "For serious content creators",
    monthlyPrice: 15,
    annualPrice: 12,
    limits: {
      aiGenerations: 100,
      scheduledPosts: -1,
      xAccounts: 1,
    },
    features: [
      { name: "AI post generation", limit: "100/month", included: true, highlight: true },
      { name: "Scheduled posts", limit: "Unlimited", included: true, highlight: true },
      { name: "X account", limit: "1", included: true },
      { name: "Advanced analytics", included: true },
      { name: "Thread support", included: true },
      { name: "AI Voice Learning", included: true, highlight: true },
      { name: "Viral Score Prediction", included: true, highlight: true },
      { name: "Smart Scheduling", included: true },
    ],
    cta: "Start Creator",
    ctaVariant: "secondary" as const,
  },
  {
    id: "PRO",
    name: "Pro",
    description: "Full power for growth-focused creators",
    monthlyPrice: 39,
    annualPrice: 29,
    popular: true,
    limits: {
      aiGenerations: 500,
      scheduledPosts: -1,
      xAccounts: 3,
    },
    features: [
      { name: "AI post generation", limit: "500/month", included: true, highlight: true },
      { name: "Scheduled posts", limit: "Unlimited", included: true },
      { name: "X accounts", limit: "3", included: true, highlight: true },
      { name: "Thread Architect", included: true, highlight: true },
      { name: "AI Voice Learning", included: true },
      { name: "Viral Score Prediction", included: true },
      { name: "Smart Scheduling", included: true },
      { name: "Evergreen Recycler", included: true, highlight: true },
      { name: "Trend Radar", included: true, highlight: true },
      { name: "Engagement Insights", included: true },
      { name: "API access", included: true },
    ],
    cta: "Start Pro",
    ctaVariant: "primary" as const,
  },
  {
    id: "BUSINESS",
    name: "Business",
    description: "For teams and agencies",
    monthlyPrice: 99,
    annualPrice: 79,
    limits: {
      aiGenerations: -1,
      scheduledPosts: -1,
      xAccounts: 10,
    },
    features: [
      { name: "AI post generation", limit: "Unlimited", included: true, highlight: true },
      { name: "Scheduled posts", limit: "Unlimited", included: true },
      { name: "X accounts", limit: "10", included: true, highlight: true },
      { name: "Team collaboration", included: true, highlight: true },
      { name: "Everything in Pro", included: true },
      { name: "Custom AI training", included: true, highlight: true },
      { name: "White-label reports", included: true },
      { name: "Dedicated support", included: true },
      { name: "Advanced API access", included: true },
    ],
    cta: "Start Business",
    ctaVariant: "secondary" as const,
  },
];

const featureDescriptions: Record<string, string> = {
  "AI Voice Learning": "AI learns your unique writing style from past posts",
  "Viral Score Prediction": "Predict engagement before posting with ML analysis",
  "Smart Scheduling": "ML finds YOUR audience's most active times",
  "Evergreen Recycler": "Auto-resurface your best-performing content",
  "Thread Architect": "AI optimizes thread structure with hooks & CTAs",
  "Trend Radar": "Real-time trending topics in your niche",
  "Engagement Insights": "Understand WHY your posts performed well",
  "Custom AI training": "Train AI on your brand voice and guidelines",
};

export default function PricingPage() {
  const [billingInterval, setBillingInterval] = useState<"monthly" | "annual">("annual");
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSelectPlan = async (planId: string) => {
    if (!session) {
      router.push("/register");
      return;
    }

    if (planId === "FREE") {
      router.push("/dashboard");
      return;
    }

    setLoading(planId);

    try {
      const res = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, billingInterval }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else if (data.setupRequired) {
        // Stripe not configured - show message
        alert(`Stripe integration pending. Plan: ${planId}, Price: $${data.price}/${billingInterval === "annual" ? "year" : "month"}`);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Failed to start checkout. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Background effects */}
      <div className="fixed inset-0 bg-grid opacity-20 pointer-events-none" />
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-sm">
              A
            </div>
            <span className="text-lg font-semibold tracking-tight">AutoPost</span>
          </Link>
          <div className="flex items-center gap-4">
            {session ? (
              <Link
                href="/dashboard"
                className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white transition"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white transition"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 text-sm font-medium bg-white text-black rounded-lg hover:bg-zinc-200 transition"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto mb-8">
            Start free, upgrade when you need more power. No hidden fees.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-4 p-1.5 bg-zinc-900 rounded-xl border border-white/5">
            <button
              onClick={() => setBillingInterval("monthly")}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                billingInterval === "monthly"
                  ? "bg-white text-black"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingInterval("annual")}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition flex items-center gap-2 ${
                billingInterval === "annual"
                  ? "bg-white text-black"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Annual
              <span className="px-1.5 py-0.5 text-xs font-semibold bg-emerald-500/20 text-emerald-400 rounded">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {plans.map((plan) => {
            const price = billingInterval === "annual" ? plan.annualPrice : plan.monthlyPrice;
            const isLoading = loading === plan.id;

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border p-6 flex flex-col ${
                  plan.popular
                    ? "bg-gradient-to-b from-indigo-500/10 to-purple-500/10 border-indigo-500/30"
                    : "bg-zinc-900/50 border-white/5"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 text-xs font-semibold bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                  <p className="text-sm text-zinc-400">{plan.description}</p>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">${price}</span>
                    <span className="text-zinc-400">/month</span>
                  </div>
                  {billingInterval === "annual" && price > 0 && (
                    <p className="text-sm text-zinc-500 mt-1">
                      Billed ${price * 12}/year
                    </p>
                  )}
                </div>

                <button
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={isLoading}
                  className={`w-full py-3 px-4 rounded-xl font-medium transition mb-6 ${
                    plan.ctaVariant === "primary"
                      ? "bg-white text-black hover:bg-zinc-200"
                      : "bg-white/10 text-white hover:bg-white/20"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    plan.cta
                  )}
                </button>

                <ul className="space-y-3 flex-1">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      {feature.included ? (
                        <svg className={`w-5 h-5 flex-shrink-0 ${feature.highlight ? "text-indigo-400" : "text-emerald-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 flex-shrink-0 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      <span className={`text-sm ${feature.included ? (feature.highlight ? "text-white font-medium" : "text-zinc-300") : "text-zinc-500"}`}>
                        {feature.name}
                        {feature.limit && <span className="text-zinc-500 ml-1">({feature.limit})</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Feature highlights */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">
            Features that set us apart
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Object.entries(featureDescriptions).slice(0, 4).map(([name, description]) => (
              <div key={name} className="p-6 bg-zinc-900/50 rounded-xl border border-white/5">
                <h3 className="font-semibold mb-2">{name}</h3>
                <p className="text-sm text-zinc-400">{description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Comparison with competitors */}
        <div className="bg-zinc-900/50 rounded-2xl border border-white/5 p-8">
          <h2 className="text-2xl font-bold text-center mb-8">
            How we compare
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-4 px-4 font-medium text-zinc-400">Feature</th>
                  <th className="text-center py-4 px-4 font-semibold text-indigo-400">AutoPost Pro</th>
                  <th className="text-center py-4 px-4 font-medium text-zinc-400">Tweet Hunter</th>
                  <th className="text-center py-4 px-4 font-medium text-zinc-400">Hypefury</th>
                  <th className="text-center py-4 px-4 font-medium text-zinc-400">Typefully</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-white/5">
                  <td className="py-4 px-4">Monthly price (with AI)</td>
                  <td className="text-center py-4 px-4 text-emerald-400 font-semibold">$29</td>
                  <td className="text-center py-4 px-4 text-zinc-400">$99</td>
                  <td className="text-center py-4 px-4 text-zinc-400">$57</td>
                  <td className="text-center py-4 px-4 text-zinc-400">$29</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-4 px-4">AI Voice Learning</td>
                  <td className="text-center py-4 px-4"><CheckIcon className="text-emerald-400" /></td>
                  <td className="text-center py-4 px-4"><XIcon /></td>
                  <td className="text-center py-4 px-4"><XIcon /></td>
                  <td className="text-center py-4 px-4"><XIcon /></td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-4 px-4">Viral Score Prediction</td>
                  <td className="text-center py-4 px-4"><CheckIcon className="text-emerald-400" /></td>
                  <td className="text-center py-4 px-4"><CheckIcon className="text-zinc-500" /></td>
                  <td className="text-center py-4 px-4"><XIcon /></td>
                  <td className="text-center py-4 px-4"><XIcon /></td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-4 px-4">Trend Radar</td>
                  <td className="text-center py-4 px-4"><CheckIcon className="text-emerald-400" /></td>
                  <td className="text-center py-4 px-4"><XIcon /></td>
                  <td className="text-center py-4 px-4"><XIcon /></td>
                  <td className="text-center py-4 px-4"><XIcon /></td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-4 px-4">Smart Scheduling (ML)</td>
                  <td className="text-center py-4 px-4"><CheckIcon className="text-emerald-400" /></td>
                  <td className="text-center py-4 px-4"><XIcon /></td>
                  <td className="text-center py-4 px-4"><XIcon /></td>
                  <td className="text-center py-4 px-4"><CheckIcon className="text-zinc-500" /></td>
                </tr>
                <tr>
                  <td className="py-4 px-4">AI Generations (Pro tier)</td>
                  <td className="text-center py-4 px-4 text-emerald-400 font-semibold">500/mo</td>
                  <td className="text-center py-4 px-4 text-zinc-400">Unlimited</td>
                  <td className="text-center py-4 px-4 text-zinc-400">Limited</td>
                  <td className="text-center py-4 px-4 text-zinc-400">100/mo</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ or CTA */}
        <div className="text-center mt-16">
          <p className="text-zinc-400 mb-4">
            Questions? Email us at{" "}
            <a href="mailto:support@autopost.ai" className="text-indigo-400 hover:underline">
              support@autopost.ai
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-5 h-5 mx-auto ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="w-5 h-5 mx-auto text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
