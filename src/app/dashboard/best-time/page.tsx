"use client";

import { useState, useEffect } from "react";

interface TimeSlot {
  time: string;
  day: string;
  score: number;
  reason: string;
  expectedEngagementMultiplier: number;
}

interface BestTimeAnalysis {
  topSlots: TimeSlot[];
  worstTimes: { time: string; day: string; reason: string }[];
  audienceInsights: {
    mostActiveHours: string[];
    mostActiveDays: string[];
    timezone: string;
  };
  recommendations: string[];
  nextBestSlot: {
    datetime: string;
    reason: string;
  };
}

interface ShouldPostNow {
  shouldPost: boolean;
  currentScore: number;
  betterTime: { time: string; multiplier: number } | null;
  reason: string;
}

export default function BestTimePage() {
  const [analysis, setAnalysis] = useState<BestTimeAnalysis | null>(null);
  const [shouldPostNow, setShouldPostNow] = useState<ShouldPostNow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAnalysis();
  }, []);

  const fetchAnalysis = async () => {
    setLoading(true);
    setError("");

    try {
      const [analysisRes, shouldPostRes] = await Promise.all([
        fetch("/api/best-time"),
        fetch("/api/best-time?type=should-post-now"),
      ]);

      if (!analysisRes.ok || !shouldPostRes.ok) {
        throw new Error("Failed to fetch best time data");
      }

      const [analysisData, shouldPostData] = await Promise.all([
        analysisRes.json(),
        shouldPostRes.json(),
      ]);

      setAnalysis(analysisData);
      setShouldPostNow(shouldPostData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-400 bg-green-500/10 border-green-500/20";
    if (score >= 60) return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    return "text-zinc-400 bg-zinc-500/10 border-zinc-500/20";
  };

  const formatDateTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-zinc-400">
          <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Analyzing your posting patterns...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-red-400">{error}</p>
        <button
          onClick={fetchAnalysis}
          className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Best Time to Post</h1>
        <p className="text-zinc-400 text-sm mt-0.5">
          AI-powered analysis of your optimal posting times
        </p>
      </div>

      {/* Should Post Now Card */}
      {shouldPostNow && (
        <div className={`rounded-xl p-6 border ${
          shouldPostNow.shouldPost
            ? "bg-green-500/5 border-green-500/20"
            : "bg-amber-500/5 border-amber-500/20"
        }`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-2xl ${shouldPostNow.shouldPost ? "text-green-400" : "text-amber-400"}`}>
                  {shouldPostNow.shouldPost ? "✓" : "⏳"}
                </span>
                <h2 className="text-lg font-semibold">
                  {shouldPostNow.shouldPost ? "Good Time to Post!" : "Consider Waiting"}
                </h2>
              </div>
              <p className="text-zinc-400 text-sm">{shouldPostNow.reason}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{shouldPostNow.currentScore}</div>
              <div className="text-xs text-zinc-500">Current Score</div>
            </div>
          </div>
          {shouldPostNow.betterTime && (
            <div className="mt-4 pt-4 border-t border-white/5">
              <p className="text-sm text-zinc-300">
                <span className="text-indigo-400 font-medium">Better time:</span>{" "}
                {shouldPostNow.betterTime.time} ({Math.round((shouldPostNow.betterTime.multiplier - 1) * 100)}% more engagement)
              </p>
            </div>
          )}
        </div>
      )}

      {/* Next Best Slot */}
      {analysis?.nextBestSlot && (
        <div className="rounded-xl bg-indigo-500/10 border border-indigo-500/20 p-6">
          <div className="flex items-center gap-3 mb-2">
            <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-lg font-semibold">Next Optimal Time</h2>
          </div>
          <p className="text-2xl font-bold text-indigo-300">
            {formatDateTime(analysis.nextBestSlot.datetime)}
          </p>
          <p className="text-sm text-zinc-400 mt-1">{analysis.nextBestSlot.reason}</p>
        </div>
      )}

      {/* Top Time Slots */}
      {analysis?.topSlots && analysis.topSlots.length > 0 && (
        <div className="rounded-xl bg-zinc-900/50 border border-white/5 p-6">
          <h2 className="text-lg font-semibold mb-4">Your Best Time Slots</h2>
          <div className="grid gap-3">
            {analysis.topSlots.map((slot, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-4 rounded-lg border ${getScoreColor(slot.score)}`}
              >
                <div className="flex items-center gap-4">
                  <div className="text-2xl font-bold">{index + 1}</div>
                  <div>
                    <div className="font-medium">
                      {slot.day} at {slot.time}
                    </div>
                    <div className="text-sm opacity-80">{slot.reason}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold">{slot.score}</div>
                  <div className="text-xs opacity-80">
                    {slot.expectedEngagementMultiplier}x engagement
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Audience Insights */}
      {analysis?.audienceInsights && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl bg-zinc-900/50 border border-white/5 p-6">
            <h3 className="font-semibold mb-3">Most Active Hours</h3>
            <div className="flex flex-wrap gap-2">
              {analysis.audienceInsights.mostActiveHours.map((hour, i) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-green-500/10 text-green-400 rounded-full text-sm"
                >
                  {hour}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-xl bg-zinc-900/50 border border-white/5 p-6">
            <h3 className="font-semibold mb-3">Most Active Days</h3>
            <div className="flex flex-wrap gap-2">
              {analysis.audienceInsights.mostActiveDays.map((day, i) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-indigo-500/10 text-indigo-400 rounded-full text-sm"
                >
                  {day}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {analysis?.recommendations && analysis.recommendations.length > 0 && (
        <div className="rounded-xl bg-zinc-900/50 border border-white/5 p-6">
          <h2 className="text-lg font-semibold mb-4">Recommendations</h2>
          <ul className="space-y-3">
            {analysis.recommendations.map((rec, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="text-green-400 mt-1">✓</span>
                <span className="text-zinc-300">{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Times to Avoid */}
      {analysis?.worstTimes && analysis.worstTimes.length > 0 && (
        <div className="rounded-xl bg-zinc-900/50 border border-white/5 p-6">
          <h2 className="text-lg font-semibold mb-4 text-red-400">Times to Avoid</h2>
          <div className="grid gap-2">
            {analysis.worstTimes.map((slot, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-red-500/10"
              >
                <span className="font-medium text-red-300">
                  {slot.day} at {slot.time}
                </span>
                <span className="text-sm text-zinc-400">{slot.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
