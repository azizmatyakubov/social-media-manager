"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";

interface HashtagSuggestion {
  hashtag: string;
  relevance: number;
  estimatedReach: string;
  category: string;
}

interface HashtagSet {
  primary: string[];
  secondary: string[];
  niche: string[];
}

interface TrendingHashtag {
  hashtag: string;
  trend: "rising" | "stable" | "declining";
  category: string;
}

interface HashtagAnalysis {
  hashtag: string;
  category: string;
  popularity: string;
  competition: string;
  recommendedFor: string[];
  relatedHashtags: string[];
}

interface Strategy {
  strategy: string;
  recommended: HashtagSet;
  tips: string[];
  avoidList: string[];
}

interface UserHashtag {
  hashtag: string;
  count: number;
}

type ViewMode = "search" | "trending" | "analyze" | "strategy" | "saved";

const PLATFORMS = ["X", "INSTAGRAM", "LINKEDIN", "TIKTOK"];

const CATEGORIES = [
  "All",
  "Technology",
  "Business",
  "Marketing",
  "Lifestyle",
  "Health",
  "Finance",
  "Entertainment",
  "Sports",
];

export default function HashtagsPage() {
  const { data: session, status } = useSession();
  const [viewMode, setViewMode] = useState<ViewMode>("search");
  const [platform, setPlatform] = useState("X");
  const [loading, setLoading] = useState(false);

  // Search state
  const [searchInput, setSearchInput] = useState("");
  const [searchType, setSearchType] = useState<"content" | "topic">("topic");
  const [suggestions, setSuggestions] = useState<HashtagSuggestion[]>([]);
  const [topicHashtags, setTopicHashtags] = useState<HashtagSet | null>(null);

  // Trending state
  const [trendingCategory, setTrendingCategory] = useState("All");
  const [trending, setTrending] = useState<TrendingHashtag[]>([]);

  // Analyze state
  const [analyzeInput, setAnalyzeInput] = useState("");
  const [analysis, setAnalysis] = useState<HashtagAnalysis | null>(null);

  // Strategy state
  const [niche, setNiche] = useState("");
  const [accountSize, setAccountSize] = useState<"small" | "medium" | "large">("small");
  const [goals, setGoals] = useState<string[]>([]);
  const [strategy, setStrategy] = useState<Strategy | null>(null);

  // Saved state
  const [savedHashtags, setSavedHashtags] = useState<string[]>([]);
  const [userTopHashtags, setUserTopHashtags] = useState<UserHashtag[]>([]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchUserTopHashtags();
    }
  }, [status]);

  if (status === "loading") return <div className="p-8">Loading...</div>;
  if (status === "unauthenticated") redirect("/login");

  async function fetchUserTopHashtags() {
    try {
      const res = await fetch("/api/hashtags?action=user-top");
      const data = await res.json();
      setUserTopHashtags(data);
    } catch (error) {
      console.error("Failed to fetch user hashtags:", error);
    }
  }

  async function searchHashtags() {
    if (!searchInput) return;
    setLoading(true);

    try {
      if (searchType === "content") {
        const res = await fetch("/api/hashtags", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "suggest-for-content",
            content: searchInput,
            platform,
          }),
        });
        const data = await res.json();
        setSuggestions(data.suggestions || []);
        setTopicHashtags(null);
      } else {
        const res = await fetch("/api/hashtags", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "get-for-topic",
            topic: searchInput,
            platform,
          }),
        });
        const data = await res.json();
        setTopicHashtags(data);
        setSuggestions([]);
      }
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchTrending() {
    setLoading(true);
    try {
      const res = await fetch("/api/hashtags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "trending",
          platform,
          category: trendingCategory !== "All" ? trendingCategory : undefined,
        }),
      });
      const data = await res.json();
      setTrending(data.trending || []);
    } catch (error) {
      console.error("Failed to fetch trending:", error);
    } finally {
      setLoading(false);
    }
  }

  async function analyzeHashtag() {
    if (!analyzeInput) return;
    setLoading(true);

    try {
      const res = await fetch("/api/hashtags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "analyze",
          hashtag: analyzeInput,
        }),
      });
      const data = await res.json();
      setAnalysis(data);
    } catch (error) {
      console.error("Analysis failed:", error);
    } finally {
      setLoading(false);
    }
  }

  async function generateStrategy() {
    if (!niche || goals.length === 0) return;
    setLoading(true);

    try {
      const res = await fetch("/api/hashtags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "strategy",
          niche,
          accountSize,
          goals,
        }),
      });
      const data = await res.json();
      setStrategy(data);
    } catch (error) {
      console.error("Strategy generation failed:", error);
    } finally {
      setLoading(false);
    }
  }

  function saveHashtag(hashtag: string) {
    if (!savedHashtags.includes(hashtag)) {
      setSavedHashtags([...savedHashtags, hashtag]);
    }
  }

  function removeHashtag(hashtag: string) {
    setSavedHashtags(savedHashtags.filter((h) => h !== hashtag));
  }

  function copyHashtags(hashtags: string[]) {
    navigator.clipboard.writeText(hashtags.join(" "));
  }

  function getTrendIcon(trend: string) {
    if (trend === "rising") return "&#8593;";
    if (trend === "declining") return "&#8595;";
    return "&#8594;";
  }

  function getTrendColor(trend: string) {
    if (trend === "rising") return "text-green-500";
    if (trend === "declining") return "text-red-500";
    return "text-yellow-500";
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold">Hashtag Research</h1>
          <p className="text-[var(--x-text-secondary)]">
            Find the best hashtags to grow your reach
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="x-input w-auto"
          >
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="flex gap-2 mb-6 border-b border-[var(--x-border)]">
        {(["search", "trending", "analyze", "strategy", "saved"] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`px-4 py-2 -mb-px border-b-2 transition-colors capitalize ${
              viewMode === mode
                ? "border-[var(--x-blue)] text-[var(--x-blue)]"
                : "border-transparent text-[var(--x-text-secondary)] hover:text-[var(--x-text-primary)]"
            }`}
          >
            {mode === "saved" ? `Saved (${savedHashtags.length})` : mode}
          </button>
        ))}
      </div>

      {/* Search View */}
      {viewMode === "search" && (
        <div className="space-y-6">
          <div className="x-card p-6">
            <div className="flex gap-4 mb-4">
              <button
                onClick={() => setSearchType("topic")}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  searchType === "topic"
                    ? "bg-[var(--x-blue)] text-white"
                    : "bg-[var(--x-bg-secondary)]"
                }`}
              >
                Search by Topic
              </button>
              <button
                onClick={() => setSearchType("content")}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  searchType === "content"
                    ? "bg-[var(--x-blue)] text-white"
                    : "bg-[var(--x-bg-secondary)]"
                }`}
              >
                Suggest for Content
              </button>
            </div>

            {searchType === "topic" ? (
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Enter a topic (e.g., AI marketing, fitness tips)"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="x-input flex-1"
                  onKeyDown={(e) => e.key === "Enter" && searchHashtags()}
                />
                <button
                  onClick={searchHashtags}
                  disabled={!searchInput || loading}
                  className="btn-primary"
                >
                  {loading ? "Searching..." : "Find Hashtags"}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <textarea
                  placeholder="Paste your content here to get hashtag suggestions..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="x-input"
                  rows={4}
                />
                <button
                  onClick={searchHashtags}
                  disabled={!searchInput || loading}
                  className="btn-primary w-full"
                >
                  {loading ? "Analyzing..." : "Get Hashtag Suggestions"}
                </button>
              </div>
            )}
          </div>

          {/* Topic Results */}
          {topicHashtags && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {["primary", "secondary", "niche"].map((type) => (
                <div key={type} className="x-card p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold capitalize">{type} Hashtags</h3>
                    <button
                      onClick={() => copyHashtags(topicHashtags[type as keyof HashtagSet])}
                      className="text-sm text-[var(--x-blue)]"
                    >
                      Copy All
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {topicHashtags[type as keyof HashtagSet].map((tag) => (
                      <button
                        key={tag}
                        onClick={() => saveHashtag(tag)}
                        className={`px-3 py-1 rounded-full text-sm transition-colors ${
                          savedHashtags.includes(tag)
                            ? "bg-[var(--x-blue)] text-white"
                            : "bg-[var(--x-bg-secondary)] hover:bg-[var(--x-blue)]/20"
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-[var(--x-text-secondary)] mt-3">
                    {type === "primary" && "High-volume hashtags for broad reach"}
                    {type === "secondary" && "Medium-volume hashtags for balance"}
                    {type === "niche" && "Targeted hashtags for engagement"}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Content Suggestions */}
          {suggestions.length > 0 && (
            <div className="x-card p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold">Suggested Hashtags</h3>
                <button
                  onClick={() => copyHashtags(suggestions.map((s) => s.hashtag))}
                  className="btn-secondary text-sm"
                >
                  Copy All
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--x-border)]">
                      <th className="text-left py-3">Hashtag</th>
                      <th className="text-left py-3">Category</th>
                      <th className="text-center py-3">Relevance</th>
                      <th className="text-right py-3">Est. Reach</th>
                      <th className="text-right py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suggestions.map((suggestion, i) => (
                      <tr key={i} className="border-b border-[var(--x-border)]">
                        <td className="py-3 font-medium">{suggestion.hashtag}</td>
                        <td className="py-3 text-[var(--x-text-secondary)]">
                          {suggestion.category}
                        </td>
                        <td className="py-3 text-center">
                          <div className="w-full bg-[var(--x-bg-secondary)] rounded-full h-2">
                            <div
                              className="bg-[var(--x-blue)] h-2 rounded-full"
                              style={{ width: `${suggestion.relevance}%` }}
                            ></div>
                          </div>
                        </td>
                        <td className="py-3 text-right">{suggestion.estimatedReach}</td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => saveHashtag(suggestion.hashtag)}
                            className={`text-sm ${
                              savedHashtags.includes(suggestion.hashtag)
                                ? "text-green-500"
                                : "text-[var(--x-blue)]"
                            }`}
                          >
                            {savedHashtags.includes(suggestion.hashtag) ? "Saved" : "Save"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Trending View */}
      {viewMode === "trending" && (
        <div className="space-y-6">
          <div className="x-card p-6">
            <div className="flex gap-4 items-center">
              <select
                value={trendingCategory}
                onChange={(e) => setTrendingCategory(e.target.value)}
                className="x-input w-auto"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <button
                onClick={fetchTrending}
                disabled={loading}
                className="btn-primary"
              >
                {loading ? "Loading..." : "Get Trending Hashtags"}
              </button>
            </div>
          </div>

          {trending.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {trending.map((item, i) => (
                <div key={i} className="x-card p-4 flex justify-between items-center">
                  <div>
                    <p className="font-medium">{item.hashtag}</p>
                    <p className="text-sm text-[var(--x-text-secondary)]">{item.category}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-lg ${getTrendColor(item.trend)}`}
                      dangerouslySetInnerHTML={{ __html: getTrendIcon(item.trend) }}
                    />
                    <button
                      onClick={() => saveHashtag(item.hashtag)}
                      className={`text-sm ${
                        savedHashtags.includes(item.hashtag) ? "text-green-500" : "text-[var(--x-blue)]"
                      }`}
                    >
                      {savedHashtags.includes(item.hashtag) ? "Saved" : "Save"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Analyze View */}
      {viewMode === "analyze" && (
        <div className="space-y-6">
          <div className="x-card p-6">
            <h3 className="font-bold mb-4">Analyze a Hashtag</h3>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Enter a hashtag (e.g., #marketing)"
                value={analyzeInput}
                onChange={(e) => setAnalyzeInput(e.target.value)}
                className="x-input flex-1"
                onKeyDown={(e) => e.key === "Enter" && analyzeHashtag()}
              />
              <button
                onClick={analyzeHashtag}
                disabled={!analyzeInput || loading}
                className="btn-primary"
              >
                {loading ? "Analyzing..." : "Analyze"}
              </button>
            </div>
          </div>

          {analysis && (
            <div className="x-card p-6">
              <h3 className="text-2xl font-bold mb-6">{analysis.hashtag}</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="p-4 bg-[var(--x-bg-secondary)] rounded-lg">
                  <p className="text-sm text-[var(--x-text-secondary)]">Category</p>
                  <p className="text-xl font-bold capitalize">{analysis.category}</p>
                </div>
                <div className="p-4 bg-[var(--x-bg-secondary)] rounded-lg">
                  <p className="text-sm text-[var(--x-text-secondary)]">Popularity</p>
                  <p className={`text-xl font-bold capitalize ${
                    analysis.popularity === "high" ? "text-green-500" :
                    analysis.popularity === "low" ? "text-yellow-500" : ""
                  }`}>
                    {analysis.popularity}
                  </p>
                </div>
                <div className="p-4 bg-[var(--x-bg-secondary)] rounded-lg">
                  <p className="text-sm text-[var(--x-text-secondary)]">Competition</p>
                  <p className={`text-xl font-bold capitalize ${
                    analysis.competition === "high" ? "text-red-500" :
                    analysis.competition === "low" ? "text-green-500" : ""
                  }`}>
                    {analysis.competition}
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="font-medium mb-3">Recommended For</h4>
                <div className="flex flex-wrap gap-2">
                  {analysis.recommendedFor.map((rec, i) => (
                    <span key={i} className="px-3 py-1 bg-[var(--x-bg-secondary)] rounded-full text-sm">
                      {rec}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium">Related Hashtags</h4>
                  <button
                    onClick={() => copyHashtags(analysis.relatedHashtags)}
                    className="text-sm text-[var(--x-blue)]"
                  >
                    Copy All
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {analysis.relatedHashtags.map((tag, i) => (
                    <button
                      key={i}
                      onClick={() => saveHashtag(tag)}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        savedHashtags.includes(tag)
                          ? "bg-[var(--x-blue)] text-white"
                          : "bg-[var(--x-bg-secondary)] hover:bg-[var(--x-blue)]/20"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Strategy View */}
      {viewMode === "strategy" && (
        <div className="space-y-6">
          <div className="x-card p-6">
            <h3 className="font-bold mb-4">Generate Hashtag Strategy</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">Your Niche</label>
                <input
                  type="text"
                  placeholder="e.g., SaaS marketing, fitness coaching"
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  className="x-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Account Size</label>
                <select
                  value={accountSize}
                  onChange={(e) => setAccountSize(e.target.value as "small" | "medium" | "large")}
                  className="x-input"
                >
                  <option value="small">Small (&lt;10K followers)</option>
                  <option value="medium">Medium (10K-100K followers)</option>
                  <option value="large">Large (100K+ followers)</option>
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Goals (select all that apply)</label>
              <div className="flex flex-wrap gap-2">
                {["Grow followers", "Increase engagement", "Drive traffic", "Build community", "Establish authority", "Generate leads"].map((goal) => (
                  <button
                    key={goal}
                    onClick={() =>
                      setGoals(
                        goals.includes(goal)
                          ? goals.filter((g) => g !== goal)
                          : [...goals, goal]
                      )
                    }
                    className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                      goals.includes(goal)
                        ? "bg-[var(--x-blue)] text-white"
                        : "bg-[var(--x-bg-secondary)]"
                    }`}
                  >
                    {goal}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={generateStrategy}
              disabled={!niche || goals.length === 0 || loading}
              className="btn-primary w-full"
            >
              {loading ? "Generating Strategy..." : "Generate Strategy"}
            </button>
          </div>

          {strategy && (
            <div className="space-y-6">
              <div className="x-card p-6">
                <h3 className="font-bold mb-4">Your Hashtag Strategy</h3>
                <p className="text-[var(--x-text-secondary)]">{strategy.strategy}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {["primary", "secondary", "niche"].map((type) => (
                  <div key={type} className="x-card p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-bold capitalize">{type}</h4>
                      <button
                        onClick={() => copyHashtags(strategy.recommended[type as keyof HashtagSet])}
                        className="text-sm text-[var(--x-blue)]"
                      >
                        Copy
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {strategy.recommended[type as keyof HashtagSet].map((tag) => (
                        <button
                          key={tag}
                          onClick={() => saveHashtag(tag)}
                          className={`px-3 py-1 rounded-full text-sm transition-colors ${
                            savedHashtags.includes(tag)
                              ? "bg-[var(--x-blue)] text-white"
                              : "bg-[var(--x-bg-secondary)] hover:bg-[var(--x-blue)]/20"
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="x-card p-6">
                  <h4 className="font-bold mb-4">Tips</h4>
                  <ul className="space-y-2">
                    {strategy.tips.map((tip, i) => (
                      <li key={i} className="flex gap-2 text-sm">
                        <span className="text-[var(--x-blue)]">&#x2022;</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="x-card p-6">
                  <h4 className="font-bold mb-4 text-red-500">Hashtags to Avoid</h4>
                  <div className="flex flex-wrap gap-2">
                    {strategy.avoidList.map((tag, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-red-500/10 text-red-500 rounded-full text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Saved View */}
      {viewMode === "saved" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="x-card p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold">Saved Hashtags</h3>
              {savedHashtags.length > 0 && (
                <button
                  onClick={() => copyHashtags(savedHashtags)}
                  className="btn-secondary text-sm"
                >
                  Copy All ({savedHashtags.length})
                </button>
              )}
            </div>
            {savedHashtags.length === 0 ? (
              <p className="text-[var(--x-text-secondary)]">
                No saved hashtags yet. Save hashtags from search or trending to build your collection.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {savedHashtags.map((tag) => (
                  <div
                    key={tag}
                    className="flex items-center gap-2 px-3 py-1 bg-[var(--x-bg-secondary)] rounded-full"
                  >
                    <span className="text-sm">{tag}</span>
                    <button
                      onClick={() => removeHashtag(tag)}
                      className="text-[var(--x-text-secondary)] hover:text-red-500"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="x-card p-6">
            <h3 className="font-bold mb-4">Your Most Used Hashtags</h3>
            {userTopHashtags.length === 0 ? (
              <p className="text-[var(--x-text-secondary)]">
                Start posting with hashtags to see your most used ones here.
              </p>
            ) : (
              <div className="space-y-2">
                {userTopHashtags.slice(0, 10).map((item, i) => (
                  <div key={i} className="flex justify-between items-center p-2 hover:bg-[var(--x-bg-secondary)] rounded">
                    <span className="font-medium">{item.hashtag}</span>
                    <span className="text-sm text-[var(--x-text-secondary)]">
                      Used {item.count} times
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
