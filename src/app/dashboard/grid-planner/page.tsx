"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";

interface GridPost {
  position: number;
  imageUrl: string | null;
  postId: string | null;
  scheduledFor: string | null;
  caption?: string | null;
  aspectRatio?: "square" | "portrait" | "landscape";
}

interface GridPlan {
  id: string;
  posts: GridPost[];
}

interface InstagramAccount {
  id: string;
  username: string;
  instagramId: string;
  isDefault: boolean;
}

interface PublishedPost {
  id: string;
  mediaUrl: string;
  caption?: string;
  timestamp: string;
  permalink?: string;
  likeCount?: number;
  commentsCount?: number;
}

interface ColorHarmony {
  score: number;
  suggestions: string[];
}

export default function GridPlannerPage() {
  const { data: session, status } = useSession();
  const [accounts, setAccounts] = useState<InstagramAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [plan, setPlan] = useState<GridPlan | null>(null);
  const [publishedPosts, setPublishedPosts] = useState<PublishedPost[]>([]);
  const [harmony, setHarmony] = useState<ColorHarmony | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewMode, setPreviewMode] = useState(false);
  const [draggedPosition, setDraggedPosition] = useState<number | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<number | null>(null);
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [publishing, setPublishing] = useState<number | null>(null);
  const [aspectRatio, setAspectRatio] = useState<"square" | "portrait" | "landscape">("square");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "authenticated") {
      fetchAccounts();
    }
  }, [status]);

  useEffect(() => {
    if (selectedAccount) {
      fetchGridPlan();
      fetchPublishedPosts();
    }
  }, [selectedAccount]);

  if (status === "loading") return <div className="p-8">Loading...</div>;
  if (status === "unauthenticated") redirect("/login");

  async function fetchAccounts() {
    try {
      const res = await fetch("/api/grid-planner");
      const data = await res.json();
      setAccounts(data.accounts || []);
      const defaultAccount = data.accounts?.find((a: InstagramAccount) => a.isDefault);
      if (defaultAccount) {
        setSelectedAccount(defaultAccount.id);
      } else if (data.accounts?.length > 0) {
        setSelectedAccount(data.accounts[0].id);
      }
    } catch (error) {
      console.error("Failed to fetch accounts:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchGridPlan() {
    if (!selectedAccount) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/grid-planner?instagramAccountId=${selectedAccount}`);
      const data = await res.json();
      setPlan(data.plan);
      setHarmony(data.harmony);
    } catch (error) {
      console.error("Failed to fetch grid plan:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchPublishedPosts() {
    if (!selectedAccount) return;
    try {
      const res = await fetch(
        `/api/grid-planner?instagramAccountId=${selectedAccount}&action=published`
      );
      const data = await res.json();
      setPublishedPosts(data.published || []);
    } catch (error) {
      console.error("Failed to fetch published posts:", error);
    }
  }

  async function updateGridCell(
    position: number,
    imageUrl: string | null,
    scheduledFor: string | null,
    caption?: string | null,
    newAspectRatio?: "square" | "portrait" | "landscape"
  ) {
    if (!plan) return;

    try {
      const res = await fetch("/api/grid-planner", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: plan.id,
          position,
          imageUrl,
          scheduledFor,
          caption,
          aspectRatio: newAspectRatio || aspectRatio,
        }),
      });

      const data = await res.json();
      if (data.plan) {
        setPlan(data.plan);
        setHarmony(data.harmony);
      }
    } catch (error) {
      console.error("Failed to update grid cell:", error);
    }
  }

  async function clearCell(position: number) {
    if (!plan) return;

    try {
      const res = await fetch("/api/grid-planner", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: plan.id,
          position,
          action: "clear",
        }),
      });

      const data = await res.json();
      if (data.plan) {
        setPlan(data.plan);
        setHarmony(data.harmony);
      }
    } catch (error) {
      console.error("Failed to clear cell:", error);
    }
  }

  async function handleReorder(fromPosition: number, toPosition: number) {
    if (!plan || fromPosition === toPosition) return;

    try {
      const res = await fetch("/api/grid-planner/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: plan.id,
          positions: [{ from: fromPosition, to: toPosition }],
        }),
      });

      const data = await res.json();
      if (data.plan) {
        setPlan(data.plan);
        setHarmony(data.harmony);
      }
    } catch (error) {
      console.error("Failed to reorder grid:", error);
    }
  }

  async function publishPost(position: number) {
    if (!plan) return;
    setPublishing(position);

    try {
      const res = await fetch("/api/grid-planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "publish",
          instagramAccountId: selectedAccount,
          planId: plan.id,
          position,
        }),
      });

      const data = await res.json();
      if (data.success) {
        fetchGridPlan();
        fetchPublishedPosts();
      } else {
        alert(data.error || "Failed to publish");
      }
    } catch (error) {
      console.error("Failed to publish:", error);
    } finally {
      setPublishing(null);
    }
  }

  function handleDragStart(position: number) {
    setDraggedPosition(position);
  }

  function handleDragOver(e: React.DragEvent, position: number) {
    e.preventDefault();
    setDragOverPosition(position);
  }

  function handleDragEnd() {
    if (draggedPosition !== null && dragOverPosition !== null) {
      handleReorder(draggedPosition, dragOverPosition);
    }
    setDraggedPosition(null);
    setDragOverPosition(null);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || selectedCell === null) return;

    // In production, you'd upload to cloud storage and get a URL
    // For now, we'll use a placeholder or local URL
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // Note: In production, upload to cloud and use the returned URL
      updateGridCell(selectedCell, dataUrl, null);
      setShowUploadModal(false);
      setSelectedCell(null);
    };
    reader.readAsDataURL(file);
  }

  function getPostAtPosition(position: number): GridPost | undefined {
    return plan?.posts.find((p) => p.position === position);
  }

  function getAspectRatioClass(ratio: string) {
    switch (ratio) {
      case "portrait":
        return "aspect-[4/5]";
      case "landscape":
        return "aspect-[1.91/1]";
      default:
        return "aspect-square";
    }
  }

  const selectedPost = selectedCell !== null ? getPostAtPosition(selectedCell) : null;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Instagram Grid Planner</h1>
          <p className="text-[var(--x-text-secondary)]">
            Plan and visualize your Instagram feed before posting
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Account Selector */}
          {accounts.length > 1 && (
            <select
              value={selectedAccount || ""}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="x-input max-w-[200px]"
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  @{account.username}
                </option>
              ))}
            </select>
          )}
          {accounts.length === 1 && (
            <span className="text-[var(--x-text-secondary)]">
              @{accounts[0].username}
            </span>
          )}
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className={`btn-secondary ${previewMode ? "ring-2 ring-blue-500" : ""}`}
          >
            {previewMode ? "Edit Mode" : "Preview Mode"}
          </button>
        </div>
      </div>

      {accounts.length === 0 ? (
        <div className="x-card p-12 text-center">
          <div className="text-6xl mb-4">
            <svg className="w-16 h-16 mx-auto text-[var(--x-text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold mb-2">No Instagram Account Connected</h3>
          <p className="text-[var(--x-text-secondary)] mb-4">
            Connect your Instagram Business or Creator account to start planning your grid.
          </p>
          <a href="/dashboard/integrations" className="btn-primary inline-block">
            Connect Instagram
          </a>
        </div>
      ) : loading && !plan ? (
        <div className="text-center py-12 text-[var(--x-text-secondary)]">
          Loading grid planner...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Grid Section */}
          <div className="lg:col-span-2">
            {/* Color Harmony Indicator */}
            {harmony && (
              <div className="x-card p-4 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Grid Harmony Score</span>
                  <span
                    className={`font-bold ${
                      harmony.score >= 80
                        ? "text-green-500"
                        : harmony.score >= 60
                        ? "text-yellow-500"
                        : "text-red-500"
                    }`}
                  >
                    {harmony.score}/100
                  </span>
                </div>
                <div className="w-full bg-[var(--x-bg-secondary)] rounded-full h-2 mb-3">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${
                      harmony.score >= 80
                        ? "bg-green-500"
                        : harmony.score >= 60
                        ? "bg-yellow-500"
                        : "bg-red-500"
                    }`}
                    style={{ width: `${harmony.score}%` }}
                  />
                </div>
                {harmony.suggestions.length > 0 && (
                  <div className="text-sm text-[var(--x-text-secondary)]">
                    {harmony.suggestions.map((s, i) => (
                      <p key={i} className="flex items-start gap-2">
                        <span className="text-yellow-500">*</span>
                        {s}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Aspect Ratio Selector */}
            <div className="flex items-center gap-4 mb-4">
              <span className="text-sm text-[var(--x-text-secondary)]">Default aspect ratio:</span>
              <div className="flex gap-2">
                {(["square", "portrait", "landscape"] as const).map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    className={`px-3 py-1.5 rounded-lg text-sm capitalize transition-colors ${
                      aspectRatio === ratio
                        ? "bg-blue-500 text-white"
                        : "bg-[var(--x-bg-secondary)] hover:bg-[var(--x-bg-hover)]"
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid Preview (Instagram Profile Style) */}
            <div className="x-card p-4 mb-6">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[var(--x-border)]">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[3px]">
                  <div className="w-full h-full rounded-full bg-[var(--x-bg-primary)] p-[2px]">
                    <div className="w-full h-full rounded-full bg-[var(--x-bg-secondary)] flex items-center justify-center text-xl font-bold">
                      {accounts.find((a) => a.id === selectedAccount)?.username?.[0]?.toUpperCase() || "?"}
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-bold">
                    @{accounts.find((a) => a.id === selectedAccount)?.username}
                  </h3>
                  <p className="text-sm text-[var(--x-text-secondary)]">
                    {previewMode ? "Preview Mode" : "Grid Planning Mode"}
                  </p>
                </div>
              </div>

              {/* 3x3 Grid */}
              <div className="grid grid-cols-3 gap-1">
                {Array.from({ length: 9 }, (_, i) => {
                  const post = getPostAtPosition(i);
                  const isDragging = draggedPosition === i;
                  const isDragOver = dragOverPosition === i;

                  return (
                    <div
                      key={i}
                      draggable={!previewMode && !!post?.imageUrl}
                      onDragStart={() => handleDragStart(i)}
                      onDragOver={(e) => handleDragOver(e, i)}
                      onDragEnd={handleDragEnd}
                      onClick={() => {
                        if (!previewMode) {
                          setSelectedCell(i);
                          if (!post?.imageUrl) {
                            setShowUploadModal(true);
                          }
                        }
                      }}
                      className={`
                        relative aspect-square bg-[var(--x-bg-secondary)] cursor-pointer
                        overflow-hidden group transition-all duration-200
                        ${isDragging ? "opacity-50 scale-95" : ""}
                        ${isDragOver ? "ring-2 ring-blue-500 ring-inset" : ""}
                        ${selectedCell === i ? "ring-2 ring-blue-500" : ""}
                        ${!previewMode ? "hover:brightness-90" : ""}
                      `}
                    >
                      {post?.imageUrl ? (
                        <>
                          <img
                            src={post.imageUrl}
                            alt={`Grid position ${i + 1}`}
                            className="w-full h-full object-cover"
                          />
                          {/* Hover Overlay */}
                          {!previewMode && (
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedCell(i);
                                  setShowScheduleModal(true);
                                }}
                                className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                                title="Schedule"
                              >
                                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  publishPost(i);
                                }}
                                disabled={publishing === i}
                                className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors disabled:opacity-50"
                                title="Publish Now"
                              >
                                {publishing === i ? (
                                  <svg className="w-5 h-5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                  </svg>
                                ) : (
                                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                  </svg>
                                )}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  clearCell(i);
                                }}
                                className="p-2 bg-white/20 rounded-full hover:bg-red-500/50 transition-colors"
                                title="Remove"
                              >
                                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          )}
                          {/* Scheduled Badge */}
                          {post.scheduledFor && (
                            <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                              Scheduled
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-[var(--x-text-tertiary)]">
                          <svg className="w-8 h-8 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                          </svg>
                          <span className="text-xs">Add Image</span>
                        </div>
                      )}
                      {/* Position Number */}
                      <div className="absolute bottom-1 left-1 text-xs bg-black/50 text-white px-1.5 py-0.5 rounded">
                        {i + 1}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Published Grid */}
            <div>
              <h2 className="text-lg font-bold mb-4">Currently Live on Instagram</h2>
              {publishedPosts.length === 0 ? (
                <div className="x-card p-8 text-center text-[var(--x-text-secondary)]">
                  No published posts yet
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1">
                  {publishedPosts.slice(0, 9).map((post, i) => (
                    <a
                      key={post.id}
                      href={post.permalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative aspect-square bg-[var(--x-bg-secondary)] overflow-hidden group"
                    >
                      <img
                        src={post.mediaUrl}
                        alt={post.caption || `Post ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white text-sm">
                        {post.likeCount !== undefined && (
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                            </svg>
                            {post.likeCount}
                          </span>
                        )}
                        {post.commentsCount !== undefined && (
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z" />
                            </svg>
                            {post.commentsCount}
                          </span>
                        )}
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Selected Cell Details */}
            {selectedCell !== null && selectedPost && (
              <div className="x-card p-4">
                <h3 className="font-bold mb-3">Position {selectedCell + 1} Details</h3>
                {selectedPost.imageUrl ? (
                  <>
                    <div className={`rounded-lg overflow-hidden mb-4 ${getAspectRatioClass(selectedPost.aspectRatio || "square")}`}>
                      <img
                        src={selectedPost.imageUrl}
                        alt="Selected post"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm text-[var(--x-text-secondary)] mb-1">
                          Caption
                        </label>
                        <textarea
                          value={selectedPost.caption || ""}
                          onChange={(e) =>
                            updateGridCell(
                              selectedCell,
                              selectedPost.imageUrl,
                              selectedPost.scheduledFor,
                              e.target.value
                            )
                          }
                          placeholder="Write a caption..."
                          className="x-input"
                          rows={3}
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--x-text-secondary)] mb-1">
                          Aspect Ratio
                        </label>
                        <select
                          value={selectedPost.aspectRatio || "square"}
                          onChange={(e) =>
                            updateGridCell(
                              selectedCell,
                              selectedPost.imageUrl,
                              selectedPost.scheduledFor,
                              selectedPost.caption,
                              e.target.value as "square" | "portrait" | "landscape"
                            )
                          }
                          className="x-input"
                        >
                          <option value="square">Square (1:1)</option>
                          <option value="portrait">Portrait (4:5)</option>
                          <option value="landscape">Landscape (1.91:1)</option>
                        </select>
                      </div>
                      {selectedPost.scheduledFor && (
                        <div>
                          <label className="block text-sm text-[var(--x-text-secondary)] mb-1">
                            Scheduled For
                          </label>
                          <p className="text-sm">
                            {new Date(selectedPost.scheduledFor).toLocaleString()}
                          </p>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowScheduleModal(true)}
                          className="btn-secondary flex-1"
                        >
                          Schedule
                        </button>
                        <button
                          onClick={() => publishPost(selectedCell)}
                          disabled={publishing === selectedCell}
                          className="btn-primary flex-1"
                        >
                          {publishing === selectedCell ? "Publishing..." : "Publish Now"}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-[var(--x-text-secondary)] mb-4">
                      No image selected for this position
                    </p>
                    <button
                      onClick={() => setShowUploadModal(true)}
                      className="btn-primary"
                    >
                      Add Image
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Tips */}
            <div className="x-card p-4">
              <h3 className="font-bold mb-3">Tips for a Great Grid</h3>
              <ul className="space-y-2 text-sm text-[var(--x-text-secondary)]">
                <li className="flex items-start gap-2">
                  <span className="text-blue-500">*</span>
                  Drag and drop to rearrange posts
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500">*</span>
                  Click an empty cell to add an image
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500">*</span>
                  Hover over a post for quick actions
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500">*</span>
                  Use Preview Mode to see the final look
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500">*</span>
                  Aim for consistent colors and themes
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && selectedCell !== null && (
        <div className="fixed inset-0 x-modal-overlay flex items-center justify-center z-50">
          <div className="x-modal p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Add Image to Position {selectedCell + 1}</h2>
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[var(--x-border)] rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
              >
                <svg className="w-12 h-12 mx-auto mb-3 text-[var(--x-text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-[var(--x-text-secondary)]">
                  Click to upload or drag and drop
                </p>
                <p className="text-sm text-[var(--x-text-tertiary)] mt-1">
                  PNG, JPG up to 10MB
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="text-center text-[var(--x-text-secondary)]">or</div>
              <input
                type="text"
                placeholder="Paste image URL..."
                className="x-input"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const url = (e.target as HTMLInputElement).value;
                    if (url) {
                      updateGridCell(selectedCell, url, null);
                      setShowUploadModal(false);
                      setSelectedCell(null);
                    }
                  }
                }}
              />
              <a
                href="/dashboard/images"
                className="block text-center text-blue-500 hover:underline"
              >
                Or generate an image with AI
              </a>
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setSelectedCell(null);
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && selectedCell !== null && selectedPost && (
        <div className="fixed inset-0 x-modal-overlay flex items-center justify-center z-50">
          <div className="x-modal p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Schedule Post</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[var(--x-text-secondary)] mb-1">
                  Date and Time
                </label>
                <input
                  type="datetime-local"
                  className="x-input"
                  defaultValue={
                    selectedPost.scheduledFor
                      ? new Date(selectedPost.scheduledFor).toISOString().slice(0, 16)
                      : ""
                  }
                  onChange={(e) => {
                    if (e.target.value) {
                      updateGridCell(
                        selectedCell,
                        selectedPost.imageUrl,
                        new Date(e.target.value).toISOString(),
                        selectedPost.caption
                      );
                    }
                  }}
                />
              </div>
              <div>
                <label className="block text-sm text-[var(--x-text-secondary)] mb-1">
                  Caption
                </label>
                <textarea
                  value={selectedPost.caption || ""}
                  onChange={(e) =>
                    updateGridCell(
                      selectedCell,
                      selectedPost.imageUrl,
                      selectedPost.scheduledFor,
                      e.target.value
                    )
                  }
                  placeholder="Write a caption..."
                  className="x-input"
                  rows={4}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowScheduleModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="btn-primary"
              >
                Save Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
