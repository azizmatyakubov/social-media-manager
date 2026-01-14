"use client";

import { useState, useEffect } from "react";

interface ContentIdea {
  id: string;
  title: string;
  description: string;
  type: string;
  category: string;
  platform: string;
  tone: string;
  hook: string;
  outline: string[];
  hashtags: string[];
  estimatedEngagement: "low" | "medium" | "high";
  difficulty: "easy" | "medium" | "hard";
  timeToCreate: number;
  bestTimeToPost: string;
  targetAudience: string;
  callToAction: string;
  isSaved: boolean;
  isUsed: boolean;
  rating?: number;
  createdAt: Date;
}

interface ContentPillar {
  id: string;
  name: string;
  description: string;
  percentage: number;
  color: string;
  keywords: string[];
  examples: string[];
}

interface IdeaStats {
  totalIdeas: number;
  savedIdeas: number;
  usedIdeas: number;
  avgRating: number;
  byCategory: Record<string, number>;
  byPlatform: Record<string, number>;
  recentSessions: number;
}

export default function IdeaGeneratorPage() {
  const [activeTab, setActiveTab] = useState<"generate" | "saved" | "pillars" | "library">("generate");
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [pillars, setPillars] = useState<ContentPillar[]>([]);
  const [stats, setStats] = useState<IdeaStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [selectedIdea, setSelectedIdea] = useState<ContentIdea | null>(null);

  // Generator form
  const [genNiche, setGenNiche] = useState("marketing");
  const [genPlatforms, setGenPlatforms] = useState<string[]>(["instagram"]);
  const [genTypes, setGenTypes] = useState<string[]>(["post", "carousel"]);
  const [genTones, setGenTones] = useState<string[]>(["professional"]);
  const [genCount, setGenCount] = useState(10);

  const niches = [
    { id: "tech/saas", label: "Tech / SaaS" },
    { id: "marketing", label: "Marketing" },
    { id: "fitness", label: "Fitness & Health" },
    { id: "finance", label: "Finance" },
    { id: "ecommerce", label: "E-commerce" },
    { id: "personal_brand", label: "Personal Brand" },
  ];

  const platforms = [
    { id: "instagram", name: "Instagram", icon: "📸" },
    { id: "twitter", name: "X (Twitter)", icon: "𝕏" },
    { id: "linkedin", name: "LinkedIn", icon: "💼" },
    { id: "tiktok", name: "TikTok", icon: "🎵" },
    { id: "facebook", name: "Facebook", icon: "📘" },
  ];

  const contentTypes = [
    { value: "post", label: "Post", icon: "📝" },
    { value: "story", label: "Story", icon: "📱" },
    { value: "reel", label: "Reel", icon: "🎬" },
    { value: "carousel", label: "Carousel", icon: "🖼️" },
    { value: "thread", label: "Thread", icon: "🧵" },
    { value: "video", label: "Video", icon: "🎥" },
  ];

  const tones = [
    { id: "professional", label: "Professional" },
    { id: "casual", label: "Casual" },
    { id: "humorous", label: "Humorous" },
    { id: "inspirational", label: "Inspirational" },
    { id: "educational", label: "Educational" },
  ];

  const categories = [
    { id: "educational", name: "Educational", icon: "📚" },
    { id: "entertaining", name: "Entertaining", icon: "🎭" },
    { id: "inspiring", name: "Inspiring", icon: "✨" },
    { id: "promotional", name: "Promotional", icon: "📢" },
    { id: "engaging", name: "Engaging", icon: "💬" },
    { id: "news", name: "News", icon: "📰" },
    { id: "ugc", name: "UGC", icon: "👥" },
    { id: "personal", name: "Personal", icon: "💭" },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ideasRes, pillarsRes, statsRes] = await Promise.all([
        fetch("/api/ideas?action=ideas"),
        fetch("/api/ideas?action=pillars"),
        fetch("/api/ideas?action=stats"),
      ]);

      if (ideasRes.ok) {
        const data = await ideasRes.json();
        setIdeas(data.ideas);
      }

      if (pillarsRes.ok) {
        const data = await pillarsRes.json();
        setPillars(data.pillars);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats);
      }
    } catch (err) {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const generateIdeas = async () => {
    if (genPlatforms.length === 0) {
      setError("Please select at least one platform");
      return;
    }

    try {
      setGenerating(true);
      const response = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          niche: genNiche,
          platforms: genPlatforms,
          contentTypes: genTypes,
          tones: genTones,
          count: genCount,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setIdeas([...data.session.ideas, ...ideas]);
        setActiveTab("library");
        fetchData();
      }
    } catch (err) {
      setError("Failed to generate ideas");
    } finally {
      setGenerating(false);
    }
  };

  const saveIdea = async (ideaId: string) => {
    try {
      const response = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", ideaId }),
      });

      if (response.ok) {
        setIdeas(ideas.map((i) => (i.id === ideaId ? { ...i, isSaved: true } : i)));
        fetchData();
      }
    } catch (err) {
      setError("Failed to save idea");
    }
  };

  const markUsed = async (ideaId: string) => {
    try {
      const response = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark-used", ideaId }),
      });

      if (response.ok) {
        setIdeas(ideas.map((i) => (i.id === ideaId ? { ...i, isUsed: true } : i)));
        fetchData();
      }
    } catch (err) {
      setError("Failed to mark idea as used");
    }
  };

  const togglePlatform = (platformId: string) => {
    if (genPlatforms.includes(platformId)) {
      setGenPlatforms(genPlatforms.filter((p) => p !== platformId));
    } else {
      setGenPlatforms([...genPlatforms, platformId]);
    }
  };

  const toggleType = (typeValue: string) => {
    if (genTypes.includes(typeValue)) {
      setGenTypes(genTypes.filter((t) => t !== typeValue));
    } else {
      setGenTypes([...genTypes, typeValue]);
    }
  };

  const toggleTone = (toneId: string) => {
    if (genTones.includes(toneId)) {
      setGenTones(genTones.filter((t) => t !== toneId));
    } else {
      setGenTones([...genTones, toneId]);
    }
  };

  const getEngagementColor = (level: string) => {
    switch (level) {
      case "high":
        return "bg-green-500/20 text-green-400";
      case "medium":
        return "bg-yellow-500/20 text-yellow-400";
      default:
        return "bg-blue-500/20 text-blue-400";
    }
  };

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case "easy":
        return "bg-green-500/20 text-green-400";
      case "medium":
        return "bg-yellow-500/20 text-yellow-400";
      default:
        return "bg-red-500/20 text-red-400";
    }
  };

  const getCategoryIcon = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId)?.icon || "📝";
  };

  const savedIdeas = ideas.filter((i) => i.isSaved);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-zinc-400">Loading idea generator...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Content Idea Generator</h1>
        <p className="text-zinc-400">
          Generate AI-powered content ideas tailored to your niche and audience
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400">
          {error}
          <button onClick={() => setError("")} className="ml-4 text-red-300 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
            <div className="text-zinc-400 text-sm mb-1">Total Ideas</div>
            <div className="text-2xl font-bold text-indigo-400">{stats.totalIdeas}</div>
          </div>
          <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
            <div className="text-zinc-400 text-sm mb-1">Saved</div>
            <div className="text-2xl font-bold text-yellow-400">{stats.savedIdeas}</div>
          </div>
          <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
            <div className="text-zinc-400 text-sm mb-1">Used</div>
            <div className="text-2xl font-bold text-green-400">{stats.usedIdeas}</div>
          </div>
          <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
            <div className="text-zinc-400 text-sm mb-1">This Week</div>
            <div className="text-2xl font-bold text-purple-400">{stats.recentSessions} sessions</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-zinc-800 pb-4">
        {[
          { id: "generate", label: "Generate Ideas" },
          { id: "library", label: "Idea Library" },
          { id: "saved", label: `Saved (${savedIdeas.length})` },
          { id: "pillars", label: "Content Pillars" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-indigo-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Generate Tab */}
      {activeTab === "generate" && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
              <h3 className="text-lg font-semibold text-white mb-4">Configure Generator</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-zinc-400 text-sm mb-2">Your Niche</label>
                  <select
                    value={genNiche}
                    onChange={(e) => setGenNiche(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                  >
                    {niches.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 text-sm mb-2">Platforms</label>
                  <div className="flex flex-wrap gap-2">
                    {platforms.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => togglePlatform(p.id)}
                        className={`px-3 py-2 rounded-lg border transition-colors ${
                          genPlatforms.includes(p.id)
                            ? "bg-indigo-600/20 border-indigo-500 text-white"
                            : "bg-zinc-800 border-zinc-700 text-zinc-400"
                        }`}
                      >
                        {p.icon} {p.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 text-sm mb-2">Content Types</label>
                  <div className="flex flex-wrap gap-2">
                    {contentTypes.map((t) => (
                      <button
                        key={t.value}
                        onClick={() => toggleType(t.value)}
                        className={`px-3 py-2 rounded-lg border transition-colors ${
                          genTypes.includes(t.value)
                            ? "bg-indigo-600/20 border-indigo-500 text-white"
                            : "bg-zinc-800 border-zinc-700 text-zinc-400"
                        }`}
                      >
                        {t.icon} {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 text-sm mb-2">Tone</label>
                  <div className="flex flex-wrap gap-2">
                    {tones.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => toggleTone(t.id)}
                        className={`px-3 py-2 rounded-lg border transition-colors ${
                          genTones.includes(t.id)
                            ? "bg-indigo-600/20 border-indigo-500 text-white"
                            : "bg-zinc-800 border-zinc-700 text-zinc-400"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 text-sm mb-2">
                    Number of Ideas: {genCount}
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="25"
                    value={genCount}
                    onChange={(e) => setGenCount(Number(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                </div>

                <button
                  onClick={generateIdeas}
                  disabled={generating}
                  className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {generating ? "Generating..." : `Generate ${genCount} Ideas`}
                </button>
              </div>
            </div>
          </div>

          {/* Categories Preview */}
          <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
            <h3 className="text-lg font-semibold text-white mb-4">Content Categories</h3>
            <div className="grid grid-cols-2 gap-3">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="p-4 bg-zinc-800/50 rounded-lg"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{cat.icon}</span>
                    <span className="font-medium text-white">{cat.name}</span>
                  </div>
                  <div className="text-xs text-zinc-500">
                    {stats?.byCategory[cat.id] || 0} ideas
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Library Tab */}
      {activeTab === "library" && (
        <div className="space-y-4">
          {ideas.length === 0 ? (
            <div className="bg-zinc-900/50 rounded-xl p-12 border border-zinc-800 text-center">
              <div className="text-5xl mb-4">💡</div>
              <h3 className="text-lg font-semibold text-white mb-2">No Ideas Yet</h3>
              <p className="text-zinc-400 mb-6">Generate your first batch of content ideas</p>
              <button
                onClick={() => setActiveTab("generate")}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Generate Ideas
              </button>
            </div>
          ) : (
            ideas.map((idea) => (
              <div
                key={idea.id}
                className={`bg-zinc-900/50 rounded-xl p-6 border transition-colors cursor-pointer ${
                  idea.isSaved ? "border-yellow-500/30" : "border-zinc-800"
                } hover:border-zinc-600`}
                onClick={() => setSelectedIdea(idea)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getCategoryIcon(idea.category)}</span>
                    <div>
                      <h3 className="font-semibold text-white">{idea.title}</h3>
                      <p className="text-sm text-zinc-400">
                        {platforms.find((p) => p.id === idea.platform)?.name} • {idea.type}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs ${getEngagementColor(idea.estimatedEngagement)}`}>
                      {idea.estimatedEngagement} engagement
                    </span>
                    <span className={`px-2 py-1 rounded text-xs ${getDifficultyColor(idea.difficulty)}`}>
                      {idea.difficulty}
                    </span>
                  </div>
                </div>

                <p className="text-zinc-400 text-sm mb-3">{idea.description}</p>

                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {idea.hashtags.slice(0, 3).map((tag) => (
                      <span key={tag} className="px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    {!idea.isSaved && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          saveIdea(idea.id);
                        }}
                        className="px-3 py-1.5 bg-zinc-800 text-zinc-300 rounded text-sm hover:bg-zinc-700"
                      >
                        Save
                      </button>
                    )}
                    {!idea.isUsed && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markUsed(idea.id);
                        }}
                        className="px-3 py-1.5 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700"
                      >
                        Use This
                      </button>
                    )}
                    {idea.isUsed && (
                      <span className="px-3 py-1.5 bg-green-500/20 text-green-400 rounded text-sm">
                        Used
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Saved Tab */}
      {activeTab === "saved" && (
        <div className="space-y-4">
          {savedIdeas.length === 0 ? (
            <div className="bg-zinc-900/50 rounded-xl p-12 border border-zinc-800 text-center">
              <div className="text-5xl mb-4">⭐</div>
              <h3 className="text-lg font-semibold text-white mb-2">No Saved Ideas</h3>
              <p className="text-zinc-400">Save ideas from the library to access them later</p>
            </div>
          ) : (
            savedIdeas.map((idea) => (
              <div
                key={idea.id}
                className="bg-zinc-900/50 rounded-xl p-6 border border-yellow-500/30"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getCategoryIcon(idea.category)}</span>
                    <div>
                      <h3 className="font-semibold text-white">{idea.title}</h3>
                      <p className="text-sm text-zinc-400">
                        {platforms.find((p) => p.id === idea.platform)?.name} • {idea.type}
                      </p>
                    </div>
                  </div>
                  {!idea.isUsed && (
                    <button
                      onClick={() => markUsed(idea.id)}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                      Use This
                    </button>
                  )}
                </div>

                <p className="text-zinc-400 text-sm mb-3">{idea.hook}</p>

                <div className="bg-zinc-800/50 rounded-lg p-4 mb-3">
                  <div className="text-sm font-medium text-white mb-2">Outline:</div>
                  <ul className="text-sm text-zinc-400 space-y-1">
                    {idea.outline.map((item, i) => (
                      <li key={i}>• {item}</li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center gap-4 text-sm text-zinc-500">
                  <span>⏱️ {idea.timeToCreate} min</span>
                  <span>📅 Best at {idea.bestTimeToPost}</span>
                  <span>🎯 {idea.callToAction}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Pillars Tab */}
      {activeTab === "pillars" && (
        <div className="space-y-6">
          <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
            <h3 className="text-lg font-semibold text-white mb-4">Your Content Pillars</h3>
            <p className="text-zinc-400 text-sm mb-6">
              Content pillars help you maintain a balanced content mix. Define your pillars and their target percentages.
            </p>

            <div className="space-y-4">
              {pillars.map((pillar) => (
                <div
                  key={pillar.id}
                  className="p-4 bg-zinc-800/50 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: pillar.color }}
                      />
                      <span className="font-medium text-white">{pillar.name}</span>
                    </div>
                    <span className="text-indigo-400 font-semibold">{pillar.percentage}%</span>
                  </div>
                  <p className="text-sm text-zinc-400 mb-2">{pillar.description}</p>
                  <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pillar.percentage}%`,
                        backgroundColor: pillar.color,
                      }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-1 mt-3">
                    {pillar.examples.map((ex, i) => (
                      <span key={i} className="px-2 py-0.5 bg-zinc-700 text-zinc-300 rounded text-xs">
                        {ex}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Idea Detail Modal */}
      {selectedIdea && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-zinc-700">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{getCategoryIcon(selectedIdea.category)}</span>
                <div>
                  <h2 className="text-xl font-semibold text-white">{selectedIdea.title}</h2>
                  <p className="text-zinc-400">
                    {platforms.find((p) => p.id === selectedIdea.platform)?.name} • {selectedIdea.type}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedIdea(null)}
                className="p-2 text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-sm text-zinc-500 mb-1">Hook</div>
                <p className="text-white font-medium">{selectedIdea.hook}</p>
              </div>

              <div>
                <div className="text-sm text-zinc-500 mb-1">Outline</div>
                <ul className="text-white space-y-1">
                  {selectedIdea.outline.map((item, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-indigo-400">{i + 1}.</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-zinc-500 mb-1">Time to Create</div>
                  <p className="text-white">{selectedIdea.timeToCreate} minutes</p>
                </div>
                <div>
                  <div className="text-sm text-zinc-500 mb-1">Best Time to Post</div>
                  <p className="text-white">{selectedIdea.bestTimeToPost}</p>
                </div>
                <div>
                  <div className="text-sm text-zinc-500 mb-1">Target Audience</div>
                  <p className="text-white">{selectedIdea.targetAudience}</p>
                </div>
                <div>
                  <div className="text-sm text-zinc-500 mb-1">Call to Action</div>
                  <p className="text-white">{selectedIdea.callToAction}</p>
                </div>
              </div>

              <div>
                <div className="text-sm text-zinc-500 mb-2">Hashtags</div>
                <div className="flex flex-wrap gap-2">
                  {selectedIdea.hashtags.map((tag) => (
                    <span key={tag} className="px-3 py-1 bg-zinc-800 text-zinc-300 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-zinc-700">
                {!selectedIdea.isSaved && (
                  <button
                    onClick={() => {
                      saveIdea(selectedIdea.id);
                      setSelectedIdea({ ...selectedIdea, isSaved: true });
                    }}
                    className="flex-1 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700"
                  >
                    ⭐ Save Idea
                  </button>
                )}
                {!selectedIdea.isUsed && (
                  <button
                    onClick={() => {
                      markUsed(selectedIdea.id);
                      setSelectedIdea({ ...selectedIdea, isUsed: true });
                    }}
                    className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    ✓ Use This Idea
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
