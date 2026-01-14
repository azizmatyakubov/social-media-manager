"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

type Platform = "X" | "LINKEDIN" | "INSTAGRAM" | "TIKTOK" | "YOUTUBE" | "PINTEREST" | "BLUESKY";
type CaptionTone = "professional" | "casual" | "witty" | "inspirational" | "educational" | "promotional" | "storytelling";
type ContentType = "image" | "video" | "carousel" | "text" | "link" | "product";

interface GeneratedCaption {
  caption: string;
  hashtags: string[];
  hookScore: number;
  characterCount: number;
  platform: Platform;
  variations: string[];
}

interface Hook {
  text: string;
  type: string;
  score: number;
}

interface Hashtag {
  tag: string;
  relevance: "high" | "medium" | "low";
  estimatedReach: "niche" | "medium" | "broad";
}

const platforms: { id: Platform; name: string; color: string; icon: string }[] = [
  { id: "X", name: "X (Twitter)", color: "bg-black", icon: "𝕏" },
  { id: "LINKEDIN", name: "LinkedIn", color: "bg-blue-600", icon: "in" },
  { id: "INSTAGRAM", name: "Instagram", color: "bg-gradient-to-r from-purple-500 to-pink-500", icon: "IG" },
  { id: "TIKTOK", name: "TikTok", color: "bg-gray-900", icon: "TT" },
  { id: "YOUTUBE", name: "YouTube", color: "bg-red-600", icon: "YT" },
  { id: "PINTEREST", name: "Pinterest", color: "bg-red-500", icon: "P" },
  { id: "BLUESKY", name: "Bluesky", color: "bg-sky-500", icon: "BS" },
];

const tones: { id: CaptionTone; name: string; description: string }[] = [
  { id: "professional", name: "Professional", description: "Polished and authoritative" },
  { id: "casual", name: "Casual", description: "Friendly and approachable" },
  { id: "witty", name: "Witty", description: "Clever and humorous" },
  { id: "inspirational", name: "Inspirational", description: "Motivating and uplifting" },
  { id: "educational", name: "Educational", description: "Informative and value-packed" },
  { id: "promotional", name: "Promotional", description: "Benefit-focused with clear CTA" },
  { id: "storytelling", name: "Storytelling", description: "Narrative-driven and engaging" },
];

const contentTypes: { id: ContentType; name: string; icon: string }[] = [
  { id: "text", name: "Text Post", icon: "M4 6h16M4 12h16M4 18h12" },
  { id: "image", name: "Image", icon: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { id: "video", name: "Video", icon: "M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  { id: "carousel", name: "Carousel", icon: "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" },
  { id: "product", name: "Product", icon: "M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" },
  { id: "link", name: "Link Share", icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" },
];

export default function AICaptionsPage() {
  const [activeTab, setActiveTab] = useState<"generate" | "improve" | "hooks" | "hashtags">("generate");

  // Generate form state
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>("X");
  const [selectedTone, setSelectedTone] = useState<CaptionTone>("casual");
  const [selectedContentType, setSelectedContentType] = useState<ContentType>("text");
  const [topic, setTopic] = useState("");
  const [keywords, setKeywords] = useState("");
  const [imageDescription, setImageDescription] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [brandVoice, setBrandVoice] = useState("");
  const [includeHashtags, setIncludeHashtags] = useState(true);
  const [includeEmojis, setIncludeEmojis] = useState(true);
  const [includeCallToAction, setIncludeCallToAction] = useState(true);

  // Results
  const [generatedCaption, setGeneratedCaption] = useState<GeneratedCaption | null>(null);
  const [batchResults, setBatchResults] = useState<Record<Platform, GeneratedCaption> | null>(null);
  const [hooks, setHooks] = useState<Hook[]>([]);
  const [hashtags, setHashtags] = useState<Hashtag[]>([]);
  const [platformTips, setPlatformTips] = useState<string[]>([]);

  // Improve tab state
  const [captionToImprove, setCaptionToImprove] = useState("");
  const [improvements, setImprovements] = useState<string[]>(["hook", "engagement"]);
  const [improvedResult, setImprovedResult] = useState<{
    improved: string;
    changes: string[];
    beforeScore: number;
    afterScore: number;
  } | null>(null);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);

  // Copy state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchPlatformTips();
  }, [selectedPlatform]);

  const fetchPlatformTips = async () => {
    try {
      const res = await fetch(`/api/ai-captions?action=platform-tips&platform=${selectedPlatform}`);
      const data = await res.json();
      setPlatformTips(data.tips || []);
    } catch (error) {
      console.error("Failed to fetch tips:", error);
    }
  };

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setGeneratedCaption(null);

    try {
      const res = await fetch("/api/ai-captions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          platform: selectedPlatform,
          topic,
          tone: selectedTone,
          contentType: selectedContentType,
          keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean),
          imageDescription: selectedContentType === "image" ? imageDescription : undefined,
          targetAudience,
          brandVoice,
          includeHashtags,
          includeEmojis,
          includeCallToAction,
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setGeneratedCaption(data.result);
    } catch (error) {
      console.error("Failed to generate:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateBatch = async () => {
    if (!topic.trim()) return;
    setBatchLoading(true);
    setBatchResults(null);

    try {
      const res = await fetch("/api/ai-captions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-batch",
          platforms: platforms.map((p) => p.id),
          topic,
          tone: selectedTone,
          contentType: selectedContentType,
          keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean),
          targetAudience,
          brandVoice,
          includeHashtags,
          includeEmojis,
          includeCallToAction,
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setBatchResults(data.results);
    } catch (error) {
      console.error("Failed to generate batch:", error);
    } finally {
      setBatchLoading(false);
    }
  };

  const handleImprove = async () => {
    if (!captionToImprove.trim()) return;
    setLoading(true);
    setImprovedResult(null);

    try {
      const res = await fetch("/api/ai-captions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "improve",
          caption: captionToImprove,
          platform: selectedPlatform,
          improvements,
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setImprovedResult(data.result);
    } catch (error) {
      console.error("Failed to improve:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateHooks = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setHooks([]);

    try {
      const res = await fetch("/api/ai-captions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-hooks",
          topic,
          platform: selectedPlatform,
          count: 6,
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setHooks(data.result.hooks || []);
    } catch (error) {
      console.error("Failed to generate hooks:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateHashtags = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setHashtags([]);

    try {
      const res = await fetch("/api/ai-captions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-hashtags",
          topic,
          platform: selectedPlatform,
          count: 15,
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setHashtags(data.result.hashtags || []);
    } catch (error) {
      console.error("Failed to generate hashtags:", error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-amber-400";
    return "text-red-400";
  };

  const getRelevanceColor = (relevance: string) => {
    if (relevance === "high") return "bg-green-500/20 text-green-400";
    if (relevance === "medium") return "bg-amber-500/20 text-amber-400";
    return "bg-zinc-500/20 text-zinc-400";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">AI Caption Generator</h1>
          <p className="text-zinc-400 mt-1">
            Generate engaging captions optimized for each platform
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-white/10 pb-2">
          {[
            { id: "generate", label: "Generate", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
            { id: "improve", label: "Improve", icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" },
            { id: "hooks", label: "Hook Ideas", icon: "M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" },
            { id: "hashtags", label: "Hashtags", icon: "M7 20l4-16m2 16l4-16M6 9h14M4 15h14" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                activeTab === tab.id
                  ? "bg-white/10 text-white"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
              </svg>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Left Column - Form */}
          <div className="col-span-2 space-y-6">
            {/* Generate Tab */}
            {activeTab === "generate" && (
              <>
                {/* Topic Input */}
                <div>
                  <label className="block text-sm font-medium mb-2">What is your post about?</label>
                  <textarea
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g., Announcing our new product launch, sharing a productivity tip, behind the scenes of our team..."
                    rows={3}
                    className="w-full px-4 py-3 bg-zinc-900/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>

                {/* Platform Selection */}
                <div>
                  <label className="block text-sm font-medium mb-2">Platform</label>
                  <div className="flex flex-wrap gap-2">
                    {platforms.map((platform) => (
                      <button
                        key={platform.id}
                        onClick={() => setSelectedPlatform(platform.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${
                          selectedPlatform === platform.id
                            ? `${platform.color} text-white`
                            : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                        }`}
                      >
                        <span className="font-bold text-sm">{platform.icon}</span>
                        <span className="text-sm">{platform.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tone Selection */}
                <div>
                  <label className="block text-sm font-medium mb-2">Tone</label>
                  <div className="grid grid-cols-4 gap-2">
                    {tones.map((tone) => (
                      <button
                        key={tone.id}
                        onClick={() => setSelectedTone(tone.id)}
                        className={`p-3 rounded-xl text-left transition ${
                          selectedTone === tone.id
                            ? "bg-indigo-600 text-white"
                            : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                        }`}
                      >
                        <p className="font-medium text-sm">{tone.name}</p>
                        <p className="text-xs opacity-70 mt-0.5">{tone.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Content Type */}
                <div>
                  <label className="block text-sm font-medium mb-2">Content Type</label>
                  <div className="flex flex-wrap gap-2">
                    {contentTypes.map((type) => (
                      <button
                        key={type.id}
                        onClick={() => setSelectedContentType(type.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${
                          selectedContentType === type.id
                            ? "bg-indigo-600 text-white"
                            : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={type.icon} />
                        </svg>
                        <span className="text-sm">{type.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Image Description (if image type) */}
                {selectedContentType === "image" && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Describe Your Image</label>
                    <textarea
                      value={imageDescription}
                      onChange={(e) => setImageDescription(e.target.value)}
                      placeholder="Describe what's in the image so we can write a relevant caption..."
                      rows={2}
                      className="w-full px-4 py-3 bg-zinc-900/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    />
                  </div>
                )}

                {/* Advanced Options */}
                <details className="group">
                  <summary className="cursor-pointer text-sm text-zinc-400 hover:text-white transition flex items-center gap-2">
                    <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    Advanced Options
                  </summary>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Keywords (comma separated)</label>
                      <input
                        type="text"
                        value={keywords}
                        onChange={(e) => setKeywords(e.target.value)}
                        placeholder="e.g., startup, productivity, AI"
                        className="w-full px-4 py-2 bg-zinc-900/50 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Target Audience</label>
                        <input
                          type="text"
                          value={targetAudience}
                          onChange={(e) => setTargetAudience(e.target.value)}
                          placeholder="e.g., tech founders, Gen Z"
                          className="w-full px-4 py-2 bg-zinc-900/50 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Brand Voice</label>
                        <input
                          type="text"
                          value={brandVoice}
                          onChange={(e) => setBrandVoice(e.target.value)}
                          placeholder="e.g., bold, minimalist, friendly"
                          className="w-full px-4 py-2 bg-zinc-900/50 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                    <div className="flex gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={includeHashtags}
                          onChange={(e) => setIncludeHashtags(e.target.checked)}
                          className="rounded border-zinc-600 bg-zinc-800 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm">Include Hashtags</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={includeEmojis}
                          onChange={(e) => setIncludeEmojis(e.target.checked)}
                          className="rounded border-zinc-600 bg-zinc-800 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm">Include Emojis</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={includeCallToAction}
                          onChange={(e) => setIncludeCallToAction(e.target.checked)}
                          className="rounded border-zinc-600 bg-zinc-800 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm">Include CTA</span>
                      </label>
                    </div>
                  </div>
                </details>

                {/* Generate Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={handleGenerate}
                    disabled={loading || !topic.trim()}
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 disabled:cursor-not-allowed rounded-xl font-medium transition flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Generate Caption
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleGenerateBatch}
                    disabled={batchLoading || !topic.trim()}
                    className="px-6 py-3 bg-white/5 hover:bg-white/10 disabled:bg-white/5 disabled:cursor-not-allowed rounded-xl font-medium transition"
                  >
                    {batchLoading ? "Generating..." : "All Platforms"}
                  </button>
                </div>

                {/* Generated Caption Result */}
                {generatedCaption && (
                  <div className="bg-zinc-900/50 rounded-xl border border-white/10 overflow-hidden">
                    <div className="p-4 border-b border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${platforms.find((p) => p.id === generatedCaption.platform)?.color}`}>
                          {generatedCaption.platform}
                        </span>
                        <span className="text-sm text-zinc-400">
                          {generatedCaption.characterCount} characters
                        </span>
                        <span className={`text-sm ${getScoreColor(generatedCaption.hookScore)}`}>
                          Hook Score: {generatedCaption.hookScore}
                        </span>
                      </div>
                      <button
                        onClick={() => copyToClipboard(generatedCaption.caption, "main")}
                        className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-sm transition flex items-center gap-1"
                      >
                        {copiedId === "main" ? (
                          <>
                            <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Copied!
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                    <div className="p-4">
                      <p className="whitespace-pre-wrap">{generatedCaption.caption}</p>
                      {generatedCaption.hashtags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {generatedCaption.hashtags.map((tag, idx) => (
                            <span key={idx} className="px-2 py-1 bg-indigo-500/20 text-indigo-400 rounded text-sm">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Variations */}
                    {generatedCaption.variations.length > 0 && (
                      <div className="border-t border-white/10">
                        <div className="p-4">
                          <p className="text-sm font-medium mb-3">Alternative Versions</p>
                          <div className="space-y-3">
                            {generatedCaption.variations.map((variation, idx) => (
                              <div
                                key={idx}
                                className="p-3 bg-zinc-800/50 rounded-lg group hover:bg-zinc-800 transition"
                              >
                                <div className="flex justify-between items-start gap-4">
                                  <p className="text-sm">{variation}</p>
                                  <button
                                    onClick={() => copyToClipboard(variation, `var-${idx}`)}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 bg-white/5 hover:bg-white/10 rounded transition"
                                  >
                                    {copiedId === `var-${idx}` ? (
                                      <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                    ) : (
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                      </svg>
                                    )}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Batch Results */}
                {batchResults && (
                  <div className="space-y-4">
                    <h3 className="font-semibold">Captions for All Platforms</h3>
                    {Object.entries(batchResults).map(([platform, caption]) => (
                      <div
                        key={platform}
                        className="bg-zinc-900/50 rounded-xl border border-white/10 overflow-hidden"
                      >
                        <div className="p-3 border-b border-white/10 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${platforms.find((p) => p.id === platform)?.color}`}>
                              {platform}
                            </span>
                            <span className="text-xs text-zinc-400">
                              {caption.characterCount} chars
                            </span>
                          </div>
                          <button
                            onClick={() => copyToClipboard(caption.caption, `batch-${platform}`)}
                            className="p-1.5 bg-white/5 hover:bg-white/10 rounded transition"
                          >
                            {copiedId === `batch-${platform}` ? (
                              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            )}
                          </button>
                        </div>
                        <div className="p-3">
                          <p className="text-sm whitespace-pre-wrap">{caption.caption}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Improve Tab */}
            {activeTab === "improve" && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">Paste your caption</label>
                  <textarea
                    value={captionToImprove}
                    onChange={(e) => setCaptionToImprove(e.target.value)}
                    placeholder="Paste the caption you want to improve..."
                    rows={4}
                    className="w-full px-4 py-3 bg-zinc-900/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Platform</label>
                  <div className="flex flex-wrap gap-2">
                    {platforms.map((platform) => (
                      <button
                        key={platform.id}
                        onClick={() => setSelectedPlatform(platform.id)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition ${
                          selectedPlatform === platform.id
                            ? `${platform.color} text-white`
                            : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                        }`}
                      >
                        <span className="font-bold text-xs">{platform.icon}</span>
                        <span className="text-sm">{platform.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">What to improve</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: "hook", label: "Hook/Opening" },
                      { id: "clarity", label: "Clarity" },
                      { id: "engagement", label: "Engagement" },
                      { id: "hashtags", label: "Hashtags" },
                      { id: "length", label: "Length" },
                      { id: "tone", label: "Tone" },
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setImprovements((prev) =>
                            prev.includes(item.id)
                              ? prev.filter((i) => i !== item.id)
                              : [...prev, item.id]
                          );
                        }}
                        className={`px-3 py-1.5 rounded-lg text-sm transition ${
                          improvements.includes(item.id)
                            ? "bg-indigo-600 text-white"
                            : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleImprove}
                  disabled={loading || !captionToImprove.trim() || improvements.length === 0}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 disabled:cursor-not-allowed rounded-xl font-medium transition"
                >
                  {loading ? "Improving..." : "Improve Caption"}
                </button>

                {improvedResult && (
                  <div className="bg-zinc-900/50 rounded-xl border border-white/10 p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Improved Caption</h3>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-zinc-400">
                          Before: <span className={getScoreColor(improvedResult.beforeScore)}>{improvedResult.beforeScore}</span>
                        </span>
                        <span className="text-zinc-400">
                          After: <span className={getScoreColor(improvedResult.afterScore)}>{improvedResult.afterScore}</span>
                        </span>
                        <span className="text-green-400">
                          +{improvedResult.afterScore - improvedResult.beforeScore} points
                        </span>
                      </div>
                    </div>
                    <div className="p-4 bg-zinc-800/50 rounded-lg">
                      <p className="whitespace-pre-wrap">{improvedResult.improved}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">Changes made:</p>
                      <ul className="space-y-1">
                        {improvedResult.changes.map((change, idx) => (
                          <li key={idx} className="text-sm text-zinc-400 flex items-start gap-2">
                            <svg className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {change}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <button
                      onClick={() => copyToClipboard(improvedResult.improved, "improved")}
                      className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm transition"
                    >
                      {copiedId === "improved" ? "Copied!" : "Copy Improved Caption"}
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Hooks Tab */}
            {activeTab === "hooks" && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">Topic</label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="What's your content about?"
                    className="w-full px-4 py-3 bg-zinc-900/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Platform</label>
                  <div className="flex flex-wrap gap-2">
                    {platforms.map((platform) => (
                      <button
                        key={platform.id}
                        onClick={() => setSelectedPlatform(platform.id)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition ${
                          selectedPlatform === platform.id
                            ? `${platform.color} text-white`
                            : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                        }`}
                      >
                        <span className="font-bold text-xs">{platform.icon}</span>
                        <span className="text-sm">{platform.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleGenerateHooks}
                  disabled={loading || !topic.trim()}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 disabled:cursor-not-allowed rounded-xl font-medium transition"
                >
                  {loading ? "Generating Hooks..." : "Generate Hook Ideas"}
                </button>

                {hooks.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold">Hook Ideas</h3>
                    {hooks.map((hook, idx) => (
                      <div
                        key={idx}
                        className="bg-zinc-900/50 rounded-xl border border-white/10 p-4 hover:border-indigo-500/30 transition group"
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <p className="mb-2">{hook.text}</p>
                            <div className="flex items-center gap-3">
                              <span className="px-2 py-0.5 bg-white/5 rounded text-xs text-zinc-400">
                                {hook.type}
                              </span>
                              <span className={`text-sm ${getScoreColor(hook.score)}`}>
                                Score: {hook.score}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => copyToClipboard(hook.text, `hook-${idx}`)}
                            className="opacity-0 group-hover:opacity-100 p-2 bg-white/5 hover:bg-white/10 rounded-lg transition"
                          >
                            {copiedId === `hook-${idx}` ? (
                              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Hashtags Tab */}
            {activeTab === "hashtags" && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">Topic</label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="What's your content about?"
                    className="w-full px-4 py-3 bg-zinc-900/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Platform</label>
                  <div className="flex flex-wrap gap-2">
                    {platforms.map((platform) => (
                      <button
                        key={platform.id}
                        onClick={() => setSelectedPlatform(platform.id)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition ${
                          selectedPlatform === platform.id
                            ? `${platform.color} text-white`
                            : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                        }`}
                      >
                        <span className="font-bold text-xs">{platform.icon}</span>
                        <span className="text-sm">{platform.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleGenerateHashtags}
                  disabled={loading || !topic.trim()}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 disabled:cursor-not-allowed rounded-xl font-medium transition"
                >
                  {loading ? "Generating..." : "Generate Hashtags"}
                </button>

                {hashtags.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Suggested Hashtags</h3>
                      <button
                        onClick={() => copyToClipboard(hashtags.map((h) => `#${h.tag}`).join(" "), "all-hashtags")}
                        className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-sm transition"
                      >
                        {copiedId === "all-hashtags" ? "Copied!" : "Copy All"}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {hashtags.map((hashtag, idx) => (
                        <button
                          key={idx}
                          onClick={() => copyToClipboard(`#${hashtag.tag}`, `hashtag-${idx}`)}
                          className={`px-3 py-1.5 rounded-lg text-sm transition ${getRelevanceColor(hashtag.relevance)} hover:opacity-80`}
                        >
                          #{hashtag.tag}
                          {copiedId === `hashtag-${idx}` && (
                            <svg className="w-3 h-3 inline ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-4 text-xs text-zinc-500">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-green-500" /> High relevance
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-500" /> Medium
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-zinc-500" /> Low
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right Column - Tips & Info */}
          <div className="space-y-6">
            {/* Platform Tips */}
            <div className="bg-zinc-900/50 rounded-xl border border-white/5 p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                {selectedPlatform} Tips
              </h3>
              <ul className="space-y-2">
                {platformTips.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-zinc-400">
                    <svg className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>

            {/* Quick Actions */}
            <div className="bg-zinc-900/50 rounded-xl border border-white/5 p-4">
              <h3 className="font-semibold mb-3">Quick Templates</h3>
              <div className="space-y-2">
                {[
                  { label: "Product Launch", topic: "Announcing our new product launch" },
                  { label: "Behind the Scenes", topic: "Behind the scenes of our team" },
                  { label: "Customer Story", topic: "A success story from one of our customers" },
                  { label: "Industry Tip", topic: "A valuable tip for professionals in my industry" },
                  { label: "Milestone", topic: "Celebrating a company milestone" },
                ].map((template, idx) => (
                  <button
                    key={idx}
                    onClick={() => setTopic(template.topic)}
                    className="w-full text-left px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm transition"
                  >
                    {template.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Character Limits */}
            <div className="bg-zinc-900/50 rounded-xl border border-white/5 p-4">
              <h3 className="font-semibold mb-3">Character Limits</h3>
              <div className="space-y-2 text-sm">
                {platforms.map((platform) => (
                  <div key={platform.id} className="flex items-center justify-between">
                    <span className="text-zinc-400">{platform.name}</span>
                    <span className="font-mono">
                      {platform.id === "X" && "280"}
                      {platform.id === "LINKEDIN" && "3,000"}
                      {platform.id === "INSTAGRAM" && "2,200"}
                      {platform.id === "TIKTOK" && "300"}
                      {platform.id === "YOUTUBE" && "5,000"}
                      {platform.id === "PINTEREST" && "500"}
                      {platform.id === "BLUESKY" && "300"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
