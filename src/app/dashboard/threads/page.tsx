"use client";

import { useState, useEffect } from "react";

interface ThreadPost {
  id: string;
  content: string;
  characterCount: number;
}

interface SavedThread {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  posts: { content: string; status: string; platformPostId?: string }[];
}

export default function ThreadsPage() {
  const [posts, setPosts] = useState<ThreadPost[]>([
    { id: "1", content: "", characterCount: 0 },
    { id: "2", content: "", characterCount: 0 },
  ]);
  const [threadTitle, setThreadTitle] = useState("");
  const [savedThreads, setSavedThreads] = useState<SavedThread[]>([]);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<"compose" | "saved">("compose");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [topic, setTopic] = useState("");

  useEffect(() => {
    fetchSavedThreads();
  }, []);

  const fetchSavedThreads = async () => {
    try {
      const res = await fetch("/api/threads");
      if (res.ok) {
        const data = await res.json();
        setSavedThreads(data);
      }
    } catch (err) {
      console.error("Failed to fetch threads:", err);
    }
  };

  const addPost = () => {
    setPosts([
      ...posts,
      { id: Date.now().toString(), content: "", characterCount: 0 },
    ]);
  };

  const removePost = (id: string) => {
    if (posts.length <= 2) return;
    setPosts(posts.filter((p) => p.id !== id));
  };

  const updatePost = (id: string, content: string) => {
    setPosts(
      posts.map((p) =>
        p.id === id ? { ...p, content, characterCount: content.length } : p
      )
    );
  };

  const generateThread = async () => {
    if (!topic.trim()) {
      setError("Please enter a topic for the thread");
      return;
    }

    setGenerating(true);
    setError("");

    try {
      const res = await fetch("/api/threads/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, postCount: posts.length }),
      });

      if (!res.ok) {
        throw new Error("Failed to generate thread");
      }

      const data = await res.json();
      if (data.posts && Array.isArray(data.posts)) {
        setPosts(
          data.posts.map((content: string, i: number) => ({
            id: (i + 1).toString(),
            content,
            characterCount: content.length,
          }))
        );
        setThreadTitle(data.title || topic);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const saveThread = async () => {
    const validPosts = posts.filter((p) => p.content.trim());
    if (validPosts.length < 2) {
      setError("Thread must have at least 2 posts with content");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: threadTitle || "Untitled Thread",
          posts: validPosts.map((p) => ({ content: p.content })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save thread");
      }

      setSuccess("Thread saved successfully!");
      fetchSavedThreads();

      // Reset form
      setPosts([
        { id: "1", content: "", characterCount: 0 },
        { id: "2", content: "", characterCount: 0 },
      ]);
      setThreadTitle("");
      setTopic("");

      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  const publishThread = async (threadId?: string) => {
    setPublishing(true);
    setError("");

    try {
      let id = threadId;

      // If no threadId, save first then publish
      if (!id) {
        const validPosts = posts.filter((p) => p.content.trim());
        if (validPosts.length < 2) {
          setError("Thread must have at least 2 posts with content");
          setPublishing(false);
          return;
        }

        const saveRes = await fetch("/api/threads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: threadTitle || "Untitled Thread",
            posts: validPosts.map((p) => ({ content: p.content })),
          }),
        });

        if (!saveRes.ok) {
          throw new Error("Failed to save thread");
        }

        const saved = await saveRes.json();
        id = saved.id;
      }

      const res = await fetch("/api/threads/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId: id }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to publish thread");
      }

      setSuccess(`Thread published! View it here: ${data.firstTweetUrl}`);
      fetchSavedThreads();

      // Reset form
      setPosts([
        { id: "1", content: "", characterCount: 0 },
        { id: "2", content: "", characterCount: 0 },
      ]);
      setThreadTitle("");
      setTopic("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to publish");
    } finally {
      setPublishing(false);
    }
  };

  const getTotalCharacters = () => posts.reduce((sum, p) => sum + p.characterCount, 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "POSTED":
        return "bg-green-500/10 text-green-400";
      case "FAILED":
        return "bg-red-500/10 text-red-400";
      case "SCHEDULED":
        return "bg-amber-500/10 text-amber-400";
      default:
        return "bg-zinc-500/10 text-zinc-400";
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Thread Composer</h1>
          <p className="text-zinc-400 text-sm mt-0.5">
            Create engaging threads that tell a story
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("compose")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === "compose"
                ? "bg-white text-black"
                : "bg-zinc-800/50 text-zinc-400 hover:text-white"
            }`}
          >
            Compose
          </button>
          <button
            onClick={() => setActiveTab("saved")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === "saved"
                ? "bg-white text-black"
                : "bg-zinc-800/50 text-zinc-400 hover:text-white"
            }`}
          >
            Saved ({savedThreads.length})
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
          {success}
        </div>
      )}

      {activeTab === "compose" ? (
        <>
          {/* AI Generation */}
          <div className="rounded-xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 p-5">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <span className="text-lg">AI Thread Generator</span>
            </h3>
            <div className="flex gap-3">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Enter a topic (e.g., '10 tips for better sleep')"
                className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-indigo-500/50"
              />
              <button
                onClick={generateThread}
                disabled={generating}
                className="px-5 py-2.5 bg-indigo-500 text-white rounded-lg font-medium hover:bg-indigo-600 transition disabled:opacity-50"
              >
                {generating ? "Generating..." : "Generate"}
              </button>
            </div>
          </div>

          {/* Thread Title */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Thread Title (for your reference)
            </label>
            <input
              type="text"
              value={threadTitle}
              onChange={(e) => setThreadTitle(e.target.value)}
              placeholder="e.g., Tips for productivity"
              className="w-full px-4 py-3 bg-zinc-900/50 border border-white/5 rounded-xl focus:outline-none focus:border-indigo-500/50"
            />
          </div>

          {/* Thread Posts */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Thread Posts ({posts.length})</h3>
              <span className="text-sm text-zinc-400">
                Total: {getTotalCharacters()} characters
              </span>
            </div>

            {posts.map((post, index) => (
              <div
                key={post.id}
                className="rounded-xl bg-zinc-900/50 border border-white/5 p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 text-xs flex items-center justify-center font-medium">
                      {index + 1}
                    </span>
                    <span className="text-sm text-zinc-400">
                      {index === 0 ? "Hook (first tweet)" : `Tweet ${index + 1}`}
                    </span>
                  </span>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-sm ${
                        post.characterCount > 280
                          ? "text-red-400"
                          : post.characterCount > 250
                          ? "text-amber-400"
                          : "text-zinc-500"
                      }`}
                    >
                      {post.characterCount}/280
                    </span>
                    {posts.length > 2 && (
                      <button
                        onClick={() => removePost(post.id)}
                        className="text-zinc-500 hover:text-red-400 transition"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                <textarea
                  value={post.content}
                  onChange={(e) => updatePost(post.id, e.target.value)}
                  placeholder={
                    index === 0
                      ? "Start with a strong hook to grab attention..."
                      : "Continue your story..."
                  }
                  rows={3}
                  className={`w-full bg-transparent border-none focus:outline-none resize-none ${
                    post.characterCount > 280 ? "text-red-400" : ""
                  }`}
                />
              </div>
            ))}

            <button
              onClick={addPost}
              className="w-full py-3 border border-dashed border-white/10 rounded-xl text-zinc-400 hover:text-white hover:border-white/20 transition flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
              Add another tweet
            </button>
          </div>

          {/* Tips */}
          <div className="rounded-xl bg-zinc-900/50 border border-white/5 p-5">
            <h4 className="font-semibold mb-3">Thread Writing Tips</h4>
            <ul className="space-y-2 text-sm text-zinc-400">
              <li className="flex items-start gap-2">
                <span className="text-indigo-400">1.</span>
                <span>Start with a strong hook - make people want to read more</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400">2.</span>
                <span>Each tweet should be valuable on its own</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400">3.</span>
                <span>Use numbers and lists for easy scanning</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400">4.</span>
                <span>End with a call-to-action (follow, retweet, etc.)</span>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={saveThread}
              disabled={loading}
              className="flex-1 py-3 bg-zinc-800 text-white rounded-xl font-medium hover:bg-zinc-700 transition disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Draft"}
            </button>
            <button
              onClick={() => publishThread()}
              disabled={publishing}
              className="flex-1 py-3 bg-indigo-500 text-white rounded-xl font-medium hover:bg-indigo-600 transition disabled:opacity-50"
            >
              {publishing ? "Publishing..." : "Publish Now"}
            </button>
          </div>
        </>
      ) : (
        /* Saved Threads */
        <div className="space-y-4">
          {savedThreads.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">📝</div>
              <h3 className="text-lg font-semibold mb-2">No saved threads</h3>
              <p className="text-zinc-400">Create your first thread above!</p>
            </div>
          ) : (
            savedThreads.map((thread) => (
              <div
                key={thread.id}
                className="rounded-xl bg-zinc-900/50 border border-white/5 p-5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">{thread.title}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(thread.status)}`}>
                        {thread.status}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {thread.posts.length} tweets
                      </span>
                      <span className="text-xs text-zinc-500">
                        {new Date(thread.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {thread.status === "PENDING" && (
                    <button
                      onClick={() => publishThread(thread.id)}
                      disabled={publishing}
                      className="px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 transition disabled:opacity-50"
                    >
                      Publish
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {thread.posts.slice(0, 2).map((post, i) => (
                    <div key={i} className="p-3 bg-zinc-800/50 rounded-lg">
                      <p className="text-sm text-zinc-300 line-clamp-2">{post.content}</p>
                    </div>
                  ))}
                  {thread.posts.length > 2 && (
                    <p className="text-xs text-zinc-500 text-center">
                      + {thread.posts.length - 2} more tweets
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
