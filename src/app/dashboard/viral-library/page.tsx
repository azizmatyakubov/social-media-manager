"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { redirect, useRouter } from "next/navigation";

interface ViralTweet {
  id: string;
  tweetId: string;
  authorId: string;
  authorUsername: string;
  authorName: string;
  authorFollowers: number;
  authorVerified: boolean;
  content: string;
  mediaUrls: string[];
  likes: number;
  retweets: number;
  replies: number;
  impressions: number;
  engagementRate: number;
  viralScore: number;
  category: string | null;
  topics: string[];
  hashtags: string[];
  tweetedAt: string;
  collectedAt: string;
  isSaved?: boolean;
  notes?: string | null;
  savedAt?: string;
}

interface InspirationResult {
  similarTweets: ViralTweet[];
  suggestions: string[];
  contentIdeas: string[];
}

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "motivation", label: "Motivation" },
  { value: "tech", label: "Tech" },
  { value: "marketing", label: "Marketing" },
  { value: "humor", label: "Humor" },
  { value: "business", label: "Business" },
  { value: "productivity", label: "Productivity" },
  { value: "startup", label: "Startup" },
  { value: "finance", label: "Finance" },
  { value: "health", label: "Health" },
  { value: "lifestyle", label: "Lifestyle" },
  { value: "education", label: "Education" },
];

const SORT_OPTIONS = [
  { value: "viralScore", label: "Viral Score" },
  { value: "likes", label: "Likes" },
  { value: "retweets", label: "Retweets" },
  { value: "engagementRate", label: "Engagement Rate" },
  { value: "tweetedAt", label: "Date" },
];

export default function ViralLibraryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // State
  const [tweets, setTweets] = useState<ViralTweet[]>([]);
  const [trendingTweets, setTrendingTweets] = useState<ViralTweet[]>([]);
  const [savedTweets, setSavedTweets] = useState<ViralTweet[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"browse" | "trending" | "saved">("browse");
  const [activeCategory, setActiveCategory] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  // Filter state
  const [filters, setFilters] = useState({
    minLikes: "",
    sortBy: "viralScore",
    sortOrder: "desc",
    authorVerified: false,
    dateFrom: "",
    dateTo: "",
  });

  // Inspiration state
  const [showInspirationModal, setShowInspirationModal] = useState(false);
  const [inspirationTopic, setInspirationTopic] = useState("");
  const [inspirationResult, setInspirationResult] = useState<InspirationResult | null>(null);
  const [loadingInspiration, setLoadingInspiration] = useState(false);

  // Selected tweet for actions
  const [selectedTweet, setSelectedTweet] = useState<ViralTweet | null>(null);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (status === "authenticated") {
      if (activeTab === "browse") {
        fetchTweets();
      } else if (activeTab === "trending") {
        fetchTrendingTweets();
      } else if (activeTab === "saved") {
        fetchSavedTweets();
      }
    }
  }, [status, activeTab, activeCategory, page, filters]);

  // Debounced search
  useEffect(() => {
    if (status === "authenticated" && activeTab === "browse") {
      const timeout = setTimeout(() => {
        setPage(1);
        fetchTweets();
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [searchQuery]);

  if (status === "loading") return <div className="p-8">Loading...</div>;
  if (status === "unauthenticated") redirect("/login");

  async function fetchTweets() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("query", searchQuery);
      if (activeCategory !== "all") params.set("category", activeCategory);
      if (filters.minLikes) params.set("minLikes", filters.minLikes);
      if (filters.sortBy) params.set("sortBy", filters.sortBy);
      if (filters.sortOrder) params.set("sortOrder", filters.sortOrder);
      if (filters.authorVerified) params.set("authorVerified", "true");
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.set("dateTo", filters.dateTo);
      params.set("page", page.toString());
      params.set("limit", "20");

      const res = await fetch(`/api/viral-library?${params.toString()}`);
      const data = await res.json();

      if (page === 1) {
        setTweets(data.tweets || []);
      } else {
        setTweets((prev) => [...prev, ...(data.tweets || [])]);
      }
      setHasMore(data.hasMore || false);
      setTotal(data.total || 0);
    } catch (error) {
      console.error("Failed to fetch tweets:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchTrendingTweets() {
    setLoading(true);
    try {
      const res = await fetch("/api/viral-library?action=trending&limit=30");
      const data = await res.json();
      setTrendingTweets(data.tweets || []);
    } catch (error) {
      console.error("Failed to fetch trending tweets:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchSavedTweets() {
    setLoading(true);
    try {
      const res = await fetch("/api/viral-library/saved");
      const data = await res.json();
      setSavedTweets(data.tweets || []);
    } catch (error) {
      console.error("Failed to fetch saved tweets:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveTweet(tweet: ViralTweet, withNotes: boolean = false) {
    if (withNotes) {
      setSelectedTweet(tweet);
      setNotes("");
      setShowNotesModal(true);
      return;
    }

    try {
      const res = await fetch("/api/viral-library/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ viralTweetId: tweet.id }),
      });

      if (res.ok) {
        // Update the tweet's saved status in all lists
        updateTweetSavedStatus(tweet.id, true);
      }
    } catch (error) {
      console.error("Failed to save tweet:", error);
    }
  }

  async function handleSaveWithNotes() {
    if (!selectedTweet) return;

    try {
      const res = await fetch("/api/viral-library/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          viralTweetId: selectedTweet.id,
          notes: notes,
        }),
      });

      if (res.ok) {
        updateTweetSavedStatus(selectedTweet.id, true);
        setShowNotesModal(false);
        setSelectedTweet(null);
        setNotes("");
      }
    } catch (error) {
      console.error("Failed to save tweet:", error);
    }
  }

  async function handleUnsaveTweet(tweetId: string) {
    try {
      const res = await fetch(`/api/viral-library/saved?viralTweetId=${tweetId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        updateTweetSavedStatus(tweetId, false);
        if (activeTab === "saved") {
          setSavedTweets((prev) => prev.filter((t) => t.id !== tweetId));
        }
      }
    } catch (error) {
      console.error("Failed to unsave tweet:", error);
    }
  }

  function updateTweetSavedStatus(tweetId: string, isSaved: boolean) {
    setTweets((prev) =>
      prev.map((t) => (t.id === tweetId ? { ...t, isSaved } : t))
    );
    setTrendingTweets((prev) =>
      prev.map((t) => (t.id === tweetId ? { ...t, isSaved } : t))
    );
  }

  async function handleGetInspiration() {
    if (!inspirationTopic.trim()) return;

    setLoadingInspiration(true);
    try {
      const res = await fetch(
        `/api/viral-library?action=inspiration&topic=${encodeURIComponent(inspirationTopic)}`
      );
      const data = await res.json();
      setInspirationResult(data);
    } catch (error) {
      console.error("Failed to get inspiration:", error);
    } finally {
      setLoadingInspiration(false);
    }
  }

  function handleUseAsInspiration(content: string) {
    // Navigate to composer with content pre-filled
    const encodedContent = encodeURIComponent(content);
    router.push(`/dashboard?inspiration=${encodedContent}`);
  }

  function formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  const displayedTweets =
    activeTab === "browse"
      ? tweets
      : activeTab === "trending"
      ? trendingTweets
      : savedTweets;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold">Viral Tweet Library</h1>
          <p className="text-[var(--x-text-secondary)]">
            Browse viral tweets for inspiration and save your favorites
          </p>
        </div>
        <button
          onClick={() => setShowInspirationModal(true)}
          className="btn-primary"
        >
          Get AI Inspiration
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => {
            setActiveTab("browse");
            setPage(1);
          }}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === "browse"
              ? "bg-[var(--x-blue)] text-white"
              : "bg-[var(--x-bg-secondary)] hover:bg-[var(--x-border)]"
          }`}
        >
          Browse
        </button>
        <button
          onClick={() => setActiveTab("trending")}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === "trending"
              ? "bg-[var(--x-blue)] text-white"
              : "bg-[var(--x-bg-secondary)] hover:bg-[var(--x-border)]"
          }`}
        >
          Trending
        </button>
        <button
          onClick={() => setActiveTab("saved")}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === "saved"
              ? "bg-[var(--x-blue)] text-white"
              : "bg-[var(--x-bg-secondary)] hover:bg-[var(--x-border)]"
          }`}
        >
          Saved ({savedTweets.length})
        </button>
      </div>

      {/* Search and Filters (only for browse tab) */}
      {activeTab === "browse" && (
        <div className="mb-6 space-y-4">
          {/* Search Bar */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search viral tweets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="x-input w-full pl-10"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--x-text-secondary)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`btn-secondary flex items-center gap-2 ${
                showFilters ? "bg-[var(--x-border)]" : ""
              }`}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              Filters
            </button>
            <div className="flex border rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode("grid")}
                className={`px-3 py-2 ${
                  viewMode === "grid"
                    ? "bg-[var(--x-blue)] text-white"
                    : "bg-[var(--x-bg-secondary)]"
                }`}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`px-3 py-2 ${
                  viewMode === "list"
                    ? "bg-[var(--x-blue)] text-white"
                    : "bg-[var(--x-bg-secondary)]"
                }`}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => {
                  setActiveCategory(cat.value);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  activeCategory === cat.value
                    ? "bg-[var(--x-blue)] text-white"
                    : "bg-[var(--x-bg-secondary)] hover:bg-[var(--x-border)]"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="x-card p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm text-[var(--x-text-secondary)] mb-1 block">
                  Min Likes
                </label>
                <input
                  type="number"
                  placeholder="e.g., 1000"
                  value={filters.minLikes}
                  onChange={(e) =>
                    setFilters({ ...filters, minLikes: e.target.value })
                  }
                  className="x-input"
                />
              </div>
              <div>
                <label className="text-sm text-[var(--x-text-secondary)] mb-1 block">
                  Sort By
                </label>
                <select
                  value={filters.sortBy}
                  onChange={(e) =>
                    setFilters({ ...filters, sortBy: e.target.value })
                  }
                  className="x-input"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-[var(--x-text-secondary)] mb-1 block">
                  From Date
                </label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) =>
                    setFilters({ ...filters, dateFrom: e.target.value })
                  }
                  className="x-input"
                />
              </div>
              <div>
                <label className="text-sm text-[var(--x-text-secondary)] mb-1 block">
                  To Date
                </label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) =>
                    setFilters({ ...filters, dateTo: e.target.value })
                  }
                  className="x-input"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="verified"
                  checked={filters.authorVerified}
                  onChange={(e) =>
                    setFilters({ ...filters, authorVerified: e.target.checked })
                  }
                  className="w-4 h-4"
                />
                <label htmlFor="verified" className="text-sm">
                  Verified authors only
                </label>
              </div>
            </div>
          )}

          {/* Results count */}
          {total > 0 && (
            <p className="text-sm text-[var(--x-text-secondary)]">
              Showing {displayedTweets.length} of {total} tweets
            </p>
          )}
        </div>
      )}

      {/* Loading State */}
      {loading && displayedTweets.length === 0 ? (
        <div className="text-center py-12 text-[var(--x-text-secondary)]">
          Loading viral tweets...
        </div>
      ) : displayedTweets.length === 0 ? (
        <div className="x-card p-12 text-center">
          <p className="text-[var(--x-text-secondary)]">
            {activeTab === "saved"
              ? "No saved tweets yet. Browse and save tweets for later inspiration."
              : "No tweets found. Try adjusting your search or filters."}
          </p>
        </div>
      ) : (
        <>
          {/* Tweet Grid/List */}
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                : "space-y-4"
            }
          >
            {displayedTweets.map((tweet) => (
              <div
                key={tweet.id}
                className={`x-card p-4 ${
                  viewMode === "list" ? "flex gap-4" : ""
                }`}
              >
                {/* Author Info */}
                <div className={viewMode === "list" ? "flex-shrink-0" : "mb-3"}>
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-[var(--x-bg-secondary)] flex items-center justify-center">
                      <span className="font-bold text-sm">
                        {tweet.authorName.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-sm">
                          {tweet.authorName}
                        </span>
                        {tweet.authorVerified && (
                          <svg
                            className="w-4 h-4 text-[var(--x-blue)]"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z" />
                          </svg>
                        )}
                      </div>
                      <span className="text-xs text-[var(--x-text-secondary)]">
                        @{tweet.authorUsername} - {formatNumber(tweet.authorFollowers)} followers
                      </span>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className={viewMode === "list" ? "flex-1" : ""}>
                  <p className="mb-3 whitespace-pre-wrap">{tweet.content}</p>

                  {/* Topics & Category */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {tweet.category && (
                      <span className="x-badge text-xs">{tweet.category}</span>
                    )}
                    {tweet.topics.slice(0, 3).map((topic) => (
                      <span
                        key={topic}
                        className="text-xs px-2 py-0.5 bg-[var(--x-bg-secondary)] rounded"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm text-[var(--x-text-secondary)] mb-3">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {formatNumber(tweet.likes)}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {formatNumber(tweet.retweets)}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {formatNumber(tweet.replies)}
                    </span>
                    <span className="ml-auto text-xs">
                      {tweet.engagementRate.toFixed(2)}% engagement
                    </span>
                  </div>

                  {/* Viral Score Bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span>Viral Score</span>
                      <span className="font-bold">{tweet.viralScore}/100</span>
                    </div>
                    <div className="h-1.5 bg-[var(--x-bg-secondary)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[var(--x-blue)] to-[var(--x-green)]"
                        style={{ width: `${tweet.viralScore}%` }}
                      />
                    </div>
                  </div>

                  {/* Date and Notes */}
                  <div className="flex justify-between items-center text-xs text-[var(--x-text-secondary)] mb-3">
                    <span>{formatDate(tweet.tweetedAt)}</span>
                    {tweet.notes && (
                      <span className="italic">Note: {tweet.notes}</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUseAsInspiration(tweet.content)}
                      className="btn-primary text-sm flex-1"
                    >
                      Use as Inspiration
                    </button>
                    {tweet.isSaved ? (
                      <button
                        onClick={() => handleUnsaveTweet(tweet.id)}
                        className="btn-secondary text-sm px-3"
                        title="Unsave"
                      >
                        <svg
                          className="w-5 h-5 text-[var(--x-blue)]"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                        </svg>
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => handleSaveTweet(tweet)}
                          className="btn-secondary text-sm px-3"
                          title="Save"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleSaveTweet(tweet, true)}
                          className="btn-secondary text-sm px-3"
                          title="Save with notes"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Load More */}
          {activeTab === "browse" && hasMore && (
            <div className="text-center mt-8">
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={loading}
                className="btn-secondary"
              >
                {loading ? "Loading..." : "Load More"}
              </button>
            </div>
          )}
        </>
      )}

      {/* Notes Modal */}
      {showNotesModal && selectedTweet && (
        <div className="fixed inset-0 x-modal-overlay flex items-center justify-center z-50">
          <div className="x-modal p-6 max-w-lg w-full">
            <h2 className="text-xl font-bold mb-4">Add Notes</h2>
            <p className="text-sm text-[var(--x-text-secondary)] mb-4">
              Save this tweet with your notes for future reference.
            </p>
            <div className="p-3 bg-[var(--x-bg-secondary)] rounded-lg mb-4 text-sm">
              {selectedTweet.content.slice(0, 150)}
              {selectedTweet.content.length > 150 && "..."}
            </div>
            <textarea
              placeholder="Your notes about this tweet..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="x-input w-full"
              rows={3}
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  setShowNotesModal(false);
                  setSelectedTweet(null);
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button onClick={handleSaveWithNotes} className="btn-primary">
                Save with Notes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inspiration Modal */}
      {showInspirationModal && (
        <div className="fixed inset-0 x-modal-overlay flex items-center justify-center z-50">
          <div className="x-modal p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">AI Content Inspiration</h2>
            <p className="text-sm text-[var(--x-text-secondary)] mb-4">
              Enter a topic to get AI-generated content ideas and find similar viral tweets.
            </p>

            <div className="flex gap-3 mb-6">
              <input
                type="text"
                placeholder="Enter a topic (e.g., productivity, AI, startups)"
                value={inspirationTopic}
                onChange={(e) => setInspirationTopic(e.target.value)}
                className="x-input flex-1"
                onKeyDown={(e) => e.key === "Enter" && handleGetInspiration()}
              />
              <button
                onClick={handleGetInspiration}
                disabled={loadingInspiration || !inspirationTopic.trim()}
                className="btn-primary"
              >
                {loadingInspiration ? "Generating..." : "Get Ideas"}
              </button>
            </div>

            {inspirationResult && (
              <div className="space-y-6">
                {/* AI Suggestions */}
                {inspirationResult.suggestions.length > 0 && (
                  <div>
                    <h3 className="font-bold mb-3">AI Tweet Suggestions</h3>
                    <div className="space-y-3">
                      {inspirationResult.suggestions.map((suggestion, i) => (
                        <div
                          key={i}
                          className="p-4 bg-[var(--x-bg-secondary)] rounded-lg"
                        >
                          <p className="mb-3">{suggestion}</p>
                          <button
                            onClick={() => handleUseAsInspiration(suggestion)}
                            className="btn-primary text-sm"
                          >
                            Use This
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Content Ideas */}
                {inspirationResult.contentIdeas.length > 0 && (
                  <div>
                    <h3 className="font-bold mb-3">Content Ideas</h3>
                    <ul className="space-y-2">
                      {inspirationResult.contentIdeas.map((idea, i) => (
                        <li key={i} className="flex gap-2 text-sm">
                          <span className="text-[var(--x-blue)]">-</span>
                          <span>{idea}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Similar Tweets */}
                {inspirationResult.similarTweets.length > 0 && (
                  <div>
                    <h3 className="font-bold mb-3">Similar Viral Tweets</h3>
                    <div className="space-y-3">
                      {inspirationResult.similarTweets.slice(0, 5).map((tweet) => (
                        <div
                          key={tweet.id}
                          className="p-4 bg-[var(--x-bg-secondary)] rounded-lg"
                        >
                          <p className="text-sm mb-2">{tweet.content}</p>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-[var(--x-text-secondary)]">
                              {formatNumber(tweet.likes)} likes - @{tweet.authorUsername}
                            </span>
                            <button
                              onClick={() => handleUseAsInspiration(tweet.content)}
                              className="btn-secondary text-xs"
                            >
                              Use as Inspiration
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end mt-6">
              <button
                onClick={() => {
                  setShowInspirationModal(false);
                  setInspirationResult(null);
                  setInspirationTopic("");
                }}
                className="btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
