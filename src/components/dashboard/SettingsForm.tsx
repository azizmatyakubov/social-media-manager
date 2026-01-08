"use client";

import { useState } from "react";

interface PostingConfig {
  instructions: string;
  tone: string;
  topics: string[];
  postingTime: string;
  timezone: string;
  isActive: boolean;
}

interface SettingsFormProps {
  initialConfig?: PostingConfig;
}

const toneOptions = [
  { value: "professional", label: "Professional", desc: "Polished and business-like", icon: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
  { value: "casual", label: "Casual", desc: "Friendly and conversational", icon: "M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  { value: "humorous", label: "Humorous", desc: "Witty and entertaining", icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" },
  { value: "inspirational", label: "Inspirational", desc: "Motivating and uplifting", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
  { value: "educational", label: "Educational", desc: "Informative and teaching", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
];

export function SettingsForm({ initialConfig }: SettingsFormProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [config, setConfig] = useState<PostingConfig>({
    instructions: initialConfig?.instructions || "",
    tone: initialConfig?.tone || "professional",
    topics: initialConfig?.topics || [],
    postingTime: initialConfig?.postingTime || "09:00",
    timezone: initialConfig?.timezone || "UTC",
    isActive: initialConfig?.isActive || false,
  });
  const [topicInput, setTopicInput] = useState("");

  const handleAddTopic = () => {
    if (topicInput.trim() && !config.topics.includes(topicInput.trim())) {
      setConfig({
        ...config,
        topics: [...config.topics, topicInput.trim()],
      });
      setTopicInput("");
    }
  };

  const handleRemoveTopic = (topic: string) => {
    setConfig({
      ...config,
      topics: config.topics.filter((t) => t !== topic),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        setMessage("Settings saved successfully!");
      } else {
        const data = await response.json();
        setMessage(data.error || "Failed to save settings");
      }
    } catch {
      setMessage("Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* AI Instructions */}
      <div className="bg-zinc-900/50 backdrop-blur-sm border border-white/5 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold">AI Instructions</h2>
        </div>
        <p className="text-zinc-400 text-sm mb-4">
          Tell the AI about yourself, your niche, and what kind of posts you want.
        </p>
        <textarea
          value={config.instructions}
          onChange={(e) => setConfig({ ...config, instructions: e.target.value })}
          rows={5}
          className="w-full px-4 py-3.5 bg-zinc-800/30 border border-white/5 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition resize-none"
          placeholder="E.g., I'm a SaaS founder building productivity tools. Write tweets about indie hacking, startup life, and tech tips. Keep it authentic and share learnings from my journey."
        />
      </div>

      {/* Tone Selection */}
      <div className="bg-zinc-900/50 backdrop-blur-sm border border-white/5 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold">Tone</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {toneOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setConfig({ ...config, tone: option.value })}
              className={`group p-4 rounded-xl border text-left transition-all ${
                config.tone === option.value
                  ? "bg-indigo-500/10 border-indigo-500/30 shadow-lg shadow-indigo-500/5"
                  : "bg-zinc-800/30 border-white/5 hover:border-white/10 hover:bg-zinc-800/50"
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${
                  config.tone === option.value ? "bg-indigo-500/20" : "bg-white/5"
                }`}>
                  <svg className={`w-4 h-4 transition ${config.tone === option.value ? "text-indigo-400" : "text-zinc-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={option.icon} />
                  </svg>
                </div>
                <p className={`font-medium ${config.tone === option.value ? "text-white" : "text-zinc-300"}`}>{option.label}</p>
              </div>
              <p className="text-sm text-zinc-500">{option.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Topics */}
      <div className="bg-zinc-900/50 backdrop-blur-sm border border-white/5 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold">Topics</h2>
        </div>
        <p className="text-zinc-400 text-sm mb-4">
          Add topics you want the AI to focus on.
        </p>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={topicInput}
            onChange={(e) => setTopicInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTopic())}
            className="flex-1 px-4 py-3.5 bg-zinc-800/30 border border-white/5 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition"
            placeholder="Add a topic (e.g., AI, startups, productivity)"
          />
          <button
            type="button"
            onClick={handleAddTopic}
            className="px-5 py-3.5 bg-white/10 text-white rounded-xl hover:bg-white/15 transition font-medium"
          >
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {config.topics.map((topic) => (
            <span
              key={topic}
              className="group inline-flex items-center px-4 py-2 rounded-xl text-sm bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:border-blue-500/40 transition"
            >
              {topic}
              <button
                type="button"
                onClick={() => handleRemoveTopic(topic)}
                className="ml-2 w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center hover:bg-red-500/30 hover:text-red-400 transition"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
          {config.topics.length === 0 && (
            <p className="text-zinc-500 text-sm">No topics added yet</p>
          )}
        </div>
      </div>

      {/* Schedule */}
      <div className="bg-zinc-900/50 backdrop-blur-sm border border-white/5 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold">Schedule</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Posting Time
            </label>
            <input
              type="time"
              value={config.postingTime}
              onChange={(e) => setConfig({ ...config, postingTime: e.target.value })}
              className="w-full px-4 py-3.5 bg-zinc-800/30 border border-white/5 rounded-xl text-white focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Timezone
            </label>
            <select
              value={config.timezone}
              onChange={(e) => setConfig({ ...config, timezone: e.target.value })}
              className="w-full px-4 py-3.5 bg-zinc-800/30 border border-white/5 rounded-xl text-white focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition"
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern Time (US)</option>
              <option value="America/Los_Angeles">Pacific Time (US)</option>
              <option value="Europe/London">London</option>
              <option value="Europe/Paris">Paris</option>
              <option value="Asia/Tokyo">Tokyo</option>
              <option value="Asia/Singapore">Singapore</option>
            </select>
          </div>
        </div>
      </div>

      {/* Auto-Post Toggle */}
      <div className="bg-zinc-900/50 backdrop-blur-sm border border-white/5 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition ${
              config.isActive ? "bg-green-500/10" : "bg-zinc-800/50"
            }`}>
              <svg className={`w-6 h-6 transition ${config.isActive ? "text-green-400" : "text-zinc-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold">Auto-Posting</h2>
              <p className="text-zinc-400 text-sm mt-0.5">
                When enabled, AI will generate and post daily at your scheduled time.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setConfig({ ...config, isActive: !config.isActive })}
            className={`relative w-14 h-8 rounded-full transition-all ${
              config.isActive ? "bg-green-500" : "bg-zinc-700"
            }`}
          >
            <span
              className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg transition-transform ${
                config.isActive ? "translate-x-7" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center gap-3 ${
            message.includes("success")
              ? "bg-green-500/10 border border-green-500/20 text-green-400"
              : "bg-red-500/10 border border-red-500/20 text-red-400"
          }`}
        >
          {message.includes("success") ? (
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          {message}
        </div>
      )}

      {/* Save Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-4 btn-premium rounded-xl text-white font-semibold relative disabled:opacity-50"
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          {loading ? (
            <>
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Saving...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Save Settings
            </>
          )}
        </span>
      </button>
    </form>
  );
}
