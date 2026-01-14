"use client";

import { useState } from "react";

const HOOK_TYPES = [
  { id: "question", label: "Question", icon: "?" },
  { id: "statistic", label: "Statistic", icon: "#" },
  { id: "story", label: "Story", icon: "📖" },
  { id: "controversy", label: "Controversy", icon: "🔥" },
  { id: "claim", label: "Bold Claim", icon: "💪" },
  { id: "list", label: "List", icon: "📋" },
  { id: "how-to", label: "How-To", icon: "🎯" },
  { id: "mistake", label: "Mistake", icon: "⚠️" },
  { id: "secret", label: "Secret", icon: "🤫" },
  { id: "prediction", label: "Prediction", icon: "🔮" },
];

interface GeneratedHook {
  hook: string;
  type: string;
  strength: string;
  score: number;
  explanation: string;
  fullPost?: string;
}

export default function HooksPage() {
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("professional");
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["question", "claim", "list"]);
  const [includeFullPost, setIncludeFullPost] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hooks, setHooks] = useState<GeneratedHook[]>([]);
  const [error, setError] = useState("");

  const toggleHookType = (typeId: string) => {
    setSelectedTypes((prev) =>
      prev.includes(typeId)
        ? prev.filter((t) => t !== typeId)
        : [...prev, typeId]
    );
  };

  const generateHooks = async () => {
    if (!topic.trim()) {
      setError("Please enter a topic");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/hooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          topic,
          tone,
          hookTypes: selectedTypes.length > 0 ? selectedTypes : undefined,
          count: 5,
          includeFullPost,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate hooks");
      }

      const data = await response.json();
      setHooks(data.hooks || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate hooks");
    } finally {
      setLoading(false);
    }
  };

  const copyHook = (hook: string) => {
    navigator.clipboard.writeText(hook);
  };

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case "viral":
        return "text-pink-400 bg-pink-500/10";
      case "strong":
        return "text-green-400 bg-green-500/10";
      case "moderate":
        return "text-amber-400 bg-amber-500/10";
      default:
        return "text-zinc-400 bg-zinc-500/10";
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Hook Generator</h1>
        <p className="text-zinc-400 text-sm mt-0.5">
          Generate powerful opening lines that grab attention
        </p>
      </div>

      {/* Generator Form */}
      <div className="rounded-xl bg-zinc-900/50 border border-white/5 p-6 space-y-6">
        {/* Topic Input */}
        <div>
          <label className="block text-sm font-medium mb-2">Topic or Theme</label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., How I grew from 0 to 10K followers"
            className="w-full px-4 py-3 bg-zinc-800/50 border border-white/10 rounded-lg focus:outline-none focus:border-indigo-500 transition"
          />
        </div>

        {/* Tone Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">Tone</label>
          <div className="flex flex-wrap gap-2">
            {["professional", "casual", "witty", "inspiring", "educational"].map((t) => (
              <button
                key={t}
                onClick={() => setTone(t)}
                className={`px-4 py-2 rounded-lg text-sm capitalize transition ${
                  tone === t
                    ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300 border"
                    : "bg-zinc-800/50 border border-white/5 text-zinc-400 hover:text-white"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Hook Types */}
        <div>
          <label className="block text-sm font-medium mb-2">Hook Types</label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {HOOK_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => toggleHookType(type.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
                  selectedTypes.includes(type.id)
                    ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300 border"
                    : "bg-zinc-800/50 border border-white/5 text-zinc-400 hover:text-white"
                }`}
              >
                <span>{type.icon}</span>
                <span>{type.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Options */}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={includeFullPost}
              onChange={(e) => setIncludeFullPost(e.target.checked)}
              className="w-4 h-4 rounded bg-zinc-800 border-white/20"
            />
            <span className="text-zinc-300">Include full post for each hook</span>
          </label>
        </div>

        {/* Generate Button */}
        <button
          onClick={generateHooks}
          disabled={loading}
          className="w-full py-3 px-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium rounded-lg hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Generating...
            </span>
          ) : (
            "Generate Hooks"
          )}
        </button>

        {error && (
          <p className="text-red-400 text-sm text-center">{error}</p>
        )}
      </div>

      {/* Generated Hooks */}
      {hooks.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Generated Hooks</h2>
          {hooks.map((hook, index) => (
            <div
              key={index}
              className="rounded-xl bg-zinc-900/50 border border-white/5 p-5 space-y-3"
            >
              <div className="flex items-start justify-between gap-4">
                <p className="text-lg font-medium leading-relaxed">{hook.hook}</p>
                <button
                  onClick={() => copyHook(hook.hook)}
                  className="shrink-0 p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition"
                  title="Copy hook"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${getStrengthColor(hook.strength)}`}>
                  {hook.strength.toUpperCase()}
                </span>
                <span className="px-2 py-1 rounded text-xs bg-zinc-800 text-zinc-400">
                  {hook.type}
                </span>
                <span className="px-2 py-1 rounded text-xs bg-indigo-500/10 text-indigo-400">
                  Score: {hook.score}/100
                </span>
              </div>

              <p className="text-sm text-zinc-400">{hook.explanation}</p>

              {hook.fullPost && (
                <div className="mt-4 p-4 bg-zinc-800/50 rounded-lg">
                  <p className="text-xs text-zinc-500 mb-2">Full Post:</p>
                  <p className="text-sm text-zinc-300 whitespace-pre-wrap">{hook.fullPost}</p>
                  <button
                    onClick={() => copyHook(hook.fullPost || "")}
                    className="mt-2 text-xs text-indigo-400 hover:text-indigo-300"
                  >
                    Copy full post
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
