"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";

interface Post {
  id: string;
  content: string;
  status: string;
  scheduledFor: string | null;
  likes: number;
  retweets: number;
  xAccount?: { xUsername: string } | null;
  linkedInAccount?: { name: string } | null;
  instagramAccount?: { username: string } | null;
}

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  description: string | null;
  postsPerDay: number;
  preferredTimes: string[];
  preferredDays: string[];
  shuffleQueue: boolean;
  recycleContent: boolean;
  isActive: boolean;
  totalPosts: number;
  _count: { posts: number };
  posts: Array<{
    id: string;
    content: string;
    status: string;
    scheduledFor: string | null;
    likes: number;
    retweets: number;
  }>;
}

interface CategoryStats {
  totalPosts: number;
  pendingPosts: number;
  scheduledPosts: number;
  postedPosts: number;
  failedPosts: number;
  totalLikes: number;
  totalRetweets: number;
  totalReplies: number;
  totalImpressions: number;
  avgEngagementRate: number;
  topPerformingPost: {
    id: string;
    content: string;
    likes: number;
    retweets: number;
    replies: number;
    impressions: number;
  } | null;
}

const COLORS = [
  "#3B82F6", // blue
  "#10B981", // green
  "#F59E0B", // amber
  "#EF4444", // red
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#06B6D4", // cyan
  "#F97316", // orange
];

const ICONS = [
  { value: "folder", label: "Folder" },
  { value: "star", label: "Star" },
  { value: "heart", label: "Heart" },
  { value: "fire", label: "Fire" },
  { value: "bolt", label: "Bolt" },
  { value: "sparkles", label: "Sparkles" },
  { value: "megaphone", label: "Megaphone" },
  { value: "lightbulb", label: "Lightbulb" },
];

const DAYS = [
  { value: "monday", label: "Mon" },
  { value: "tuesday", label: "Tue" },
  { value: "wednesday", label: "Wed" },
  { value: "thursday", label: "Thu" },
  { value: "friday", label: "Fri" },
  { value: "saturday", label: "Sat" },
  { value: "sunday", label: "Sun" },
];

export default function CategoriesPage() {
  const { data: session, status } = useSession();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPostsModal, setShowPostsModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categoryPosts, setCategoryPosts] = useState<{ posts: Post[]; total: number }>({ posts: [], total: 0 });
  const [categoryStats, setCategoryStats] = useState<CategoryStats | null>(null);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [shuffling, setShuffling] = useState(false);
  const [draggedPost, setDraggedPost] = useState<Post | null>(null);
  const [newCategory, setNewCategory] = useState({
    name: "",
    color: COLORS[0],
    icon: "",
    description: "",
    postsPerDay: 1,
    preferredTimes: ["09:00"],
    preferredDays: [] as string[],
    shuffleQueue: false,
    recycleContent: false,
  });

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      setCategories(data);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      fetchCategories();
    }
  }, [status, fetchCategories]);

  if (status === "loading") return <div className="p-8">Loading...</div>;
  if (status === "unauthenticated") redirect("/login");

  async function createCategory() {
    if (!newCategory.name) return;

    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCategory),
      });

      if (res.ok) {
        setShowCreateModal(false);
        setNewCategory({
          name: "",
          color: COLORS[0],
          icon: "",
          description: "",
          postsPerDay: 1,
          preferredTimes: ["09:00"],
          preferredDays: [],
          shuffleQueue: false,
          recycleContent: false,
        });
        fetchCategories();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to create category");
      }
    } catch (error) {
      console.error("Failed to create category:", error);
    }
  }

  async function updateCategory() {
    if (!selectedCategory) return;

    try {
      const res = await fetch("/api/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: selectedCategory.id,
          name: selectedCategory.name,
          color: selectedCategory.color,
          icon: selectedCategory.icon,
          description: selectedCategory.description,
          postsPerDay: selectedCategory.postsPerDay,
          preferredTimes: selectedCategory.preferredTimes,
          preferredDays: selectedCategory.preferredDays,
          shuffleQueue: selectedCategory.shuffleQueue,
          recycleContent: selectedCategory.recycleContent,
          isActive: selectedCategory.isActive,
        }),
      });

      if (res.ok) {
        setShowEditModal(false);
        fetchCategories();
      }
    } catch (error) {
      console.error("Failed to update category:", error);
    }
  }

  async function deleteCategory(categoryId: string) {
    if (!confirm("Delete this category? Posts will be unassigned but not deleted.")) return;

    try {
      await fetch(`/api/categories?categoryId=${categoryId}`, {
        method: "DELETE",
      });
      fetchCategories();
    } catch (error) {
      console.error("Failed to delete category:", error);
    }
  }

  async function fetchCategoryPosts(categoryId: string) {
    setLoadingPosts(true);
    try {
      const res = await fetch(`/api/categories/${categoryId}/posts`);
      const data = await res.json();
      setCategoryPosts(data);
    } catch (error) {
      console.error("Failed to fetch category posts:", error);
    } finally {
      setLoadingPosts(false);
    }
  }

  async function fetchCategoryStats(categoryId: string) {
    setLoadingStats(true);
    try {
      const res = await fetch(`/api/categories?categoryId=${categoryId}&includeStats=true`);
      const data = await res.json();
      setCategoryStats(data);
    } catch (error) {
      console.error("Failed to fetch category stats:", error);
    } finally {
      setLoadingStats(false);
    }
  }

  async function shuffleQueue(categoryId: string) {
    setShuffling(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "shuffle", categoryId }),
      });
      const data = await res.json();
      if (data.shuffled) {
        if (selectedCategory?.id === categoryId) {
          fetchCategoryPosts(categoryId);
        }
      }
      alert(data.message);
    } catch (error) {
      console.error("Failed to shuffle queue:", error);
    } finally {
      setShuffling(false);
    }
  }

  async function removePostFromCategory(postId: string, categoryId: string) {
    try {
      await fetch(`/api/categories/${categoryId}/posts?postId=${postId}`, {
        method: "DELETE",
      });
      fetchCategoryPosts(categoryId);
      fetchCategories();
    } catch (error) {
      console.error("Failed to remove post:", error);
    }
  }

  async function movePostToCategory(postId: string, fromCategoryId: string | null, toCategoryId: string) {
    try {
      await fetch(`/api/categories/${toCategoryId}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "move",
          postId,
          fromCategoryId,
        }),
      });
      fetchCategories();
      if (selectedCategory) {
        fetchCategoryPosts(selectedCategory.id);
      }
    } catch (error) {
      console.error("Failed to move post:", error);
    }
  }

  function openPostsModal(category: Category) {
    setSelectedCategory(category);
    setShowPostsModal(true);
    fetchCategoryPosts(category.id);
  }

  function openStatsModal(category: Category) {
    setSelectedCategory(category);
    setShowStatsModal(true);
    fetchCategoryStats(category.id);
  }

  function openEditModal(category: Category) {
    setSelectedCategory({ ...category });
    setShowEditModal(true);
  }

  function handleDragStart(e: React.DragEvent, post: Post) {
    setDraggedPost(post);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  function handleDrop(e: React.DragEvent, targetCategory: Category) {
    e.preventDefault();
    if (draggedPost && selectedCategory && targetCategory.id !== selectedCategory.id) {
      movePostToCategory(draggedPost.id, selectedCategory.id, targetCategory.id);
    }
    setDraggedPost(null);
  }

  function addPreferredTime() {
    if (showCreateModal) {
      setNewCategory({
        ...newCategory,
        preferredTimes: [...newCategory.preferredTimes, "12:00"],
      });
    } else if (selectedCategory) {
      setSelectedCategory({
        ...selectedCategory,
        preferredTimes: [...selectedCategory.preferredTimes, "12:00"],
      });
    }
  }

  function removePreferredTime(index: number) {
    if (showCreateModal) {
      setNewCategory({
        ...newCategory,
        preferredTimes: newCategory.preferredTimes.filter((_, i) => i !== index),
      });
    } else if (selectedCategory) {
      setSelectedCategory({
        ...selectedCategory,
        preferredTimes: selectedCategory.preferredTimes.filter((_, i) => i !== index),
      });
    }
  }

  function updatePreferredTime(index: number, value: string) {
    if (showCreateModal) {
      const times = [...newCategory.preferredTimes];
      times[index] = value;
      setNewCategory({ ...newCategory, preferredTimes: times });
    } else if (selectedCategory) {
      const times = [...selectedCategory.preferredTimes];
      times[index] = value;
      setSelectedCategory({ ...selectedCategory, preferredTimes: times });
    }
  }

  function toggleDay(day: string) {
    if (showCreateModal) {
      const days = newCategory.preferredDays.includes(day)
        ? newCategory.preferredDays.filter((d) => d !== day)
        : [...newCategory.preferredDays, day];
      setNewCategory({ ...newCategory, preferredDays: days });
    } else if (selectedCategory) {
      const days = selectedCategory.preferredDays.includes(day)
        ? selectedCategory.preferredDays.filter((d) => d !== day)
        : [...selectedCategory.preferredDays, day];
      setSelectedCategory({ ...selectedCategory, preferredDays: days });
    }
  }

  function getIconSvg(icon: string | null) {
    switch (icon) {
      case "star":
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        );
      case "heart":
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
          </svg>
        );
      case "fire":
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
          </svg>
        );
      case "bolt":
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
          </svg>
        );
      case "sparkles":
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
          </svg>
        );
      case "megaphone":
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
          </svg>
        );
      case "lightbulb":
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
          </svg>
        );
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "POSTED":
        return "x-badge-green";
      case "SCHEDULED":
        return "x-badge-blue";
      case "FAILED":
        return "x-badge-red";
      default:
        return "";
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Content Categories</h1>
          <p className="text-[var(--x-text-secondary)]">
            Organize your posts into categories with custom schedules
          </p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary">
          New Category
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[var(--x-text-secondary)]">
          Loading categories...
        </div>
      ) : categories.length === 0 ? (
        <div className="x-card p-12 text-center">
          <p className="text-[var(--x-text-secondary)] mb-4">
            No categories yet. Create one to organize your content.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => (
            <div
              key={category.id}
              className="x-card p-4 relative overflow-hidden"
              style={{ borderTop: `4px solid ${category.color}` }}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, category)}
            >
              {/* Color accent */}
              <div
                className="absolute top-0 right-0 w-20 h-20 opacity-10"
                style={{ background: `radial-gradient(circle at top right, ${category.color}, transparent)` }}
              />

              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span style={{ color: category.color }}>{getIconSvg(category.icon)}</span>
                  <h3 className="font-bold">{category.name}</h3>
                </div>
                <div className="flex items-center gap-1">
                  {!category.isActive && (
                    <span className="x-badge">Paused</span>
                  )}
                  <span className="x-badge">{category._count.posts} posts</span>
                </div>
              </div>

              {category.description && (
                <p className="text-sm text-[var(--x-text-secondary)] mb-3">{category.description}</p>
              )}

              {/* Settings summary */}
              <div className="text-xs text-[var(--x-text-tertiary)] space-y-1 mb-4">
                <p>{category.postsPerDay} post{category.postsPerDay > 1 ? "s" : ""}/day</p>
                {category.preferredTimes.length > 0 && (
                  <p>Times: {category.preferredTimes.join(", ")}</p>
                )}
                {category.preferredDays.length > 0 && (
                  <p>Days: {category.preferredDays.map((d) => d.slice(0, 3)).join(", ")}</p>
                )}
                <div className="flex gap-2 mt-2">
                  {category.shuffleQueue && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-[var(--x-bg-elevated)]">
                      Shuffle
                    </span>
                  )}
                  {category.recycleContent && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-[var(--x-bg-elevated)]">
                      Recycle
                    </span>
                  )}
                </div>
              </div>

              {/* Recent posts preview */}
              {category.posts.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium mb-2">Recent posts:</p>
                  <div className="space-y-1">
                    {category.posts.slice(0, 2).map((post) => (
                      <div
                        key={post.id}
                        className="text-xs p-2 bg-[var(--x-bg-secondary)] rounded truncate"
                      >
                        {post.content.slice(0, 60)}...
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => openPostsModal(category)}
                  className="btn-secondary text-xs py-1 px-2"
                >
                  View Posts
                </button>
                <button
                  onClick={() => openStatsModal(category)}
                  className="btn-secondary text-xs py-1 px-2"
                >
                  Stats
                </button>
                <button
                  onClick={() => openEditModal(category)}
                  className="btn-secondary text-xs py-1 px-2"
                >
                  Edit
                </button>
                <button
                  onClick={() => shuffleQueue(category.id)}
                  disabled={shuffling}
                  className="btn-secondary text-xs py-1 px-2"
                >
                  Shuffle
                </button>
                <button
                  onClick={() => deleteCategory(category.id)}
                  className="text-red-500 text-xs py-1 px-2 hover:bg-red-500/10 rounded"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Category Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 x-modal-overlay flex items-center justify-center z-50">
          <div className="x-modal p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Create Category</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  placeholder="e.g., Tips & Tricks"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  className="x-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description (optional)</label>
                <textarea
                  placeholder="What type of content goes here?"
                  value={newCategory.description}
                  onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                  className="x-input"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewCategory({ ...newCategory, color })}
                      className={`w-8 h-8 rounded-full ${
                        newCategory.color === color ? "ring-2 ring-offset-2 ring-offset-[var(--x-bg)]" : ""
                      }`}
                      style={{ backgroundColor: color, "--tw-ring-color": color } as React.CSSProperties}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Icon (optional)</label>
                <div className="flex gap-2 flex-wrap">
                  {ICONS.map((icon) => (
                    <button
                      key={icon.value}
                      onClick={() => setNewCategory({ ...newCategory, icon: icon.value })}
                      className={`p-2 rounded ${
                        newCategory.icon === icon.value
                          ? "bg-[var(--x-blue)] text-white"
                          : "bg-[var(--x-bg-secondary)]"
                      }`}
                      title={icon.label}
                    >
                      {getIconSvg(icon.value)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Posts per day</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={newCategory.postsPerDay}
                  onChange={(e) => setNewCategory({ ...newCategory, postsPerDay: parseInt(e.target.value) || 1 })}
                  className="x-input w-24"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Preferred posting times</label>
                <div className="space-y-2">
                  {newCategory.preferredTimes.map((time, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="time"
                        value={time}
                        onChange={(e) => updatePreferredTime(index, e.target.value)}
                        className="x-input flex-1"
                      />
                      {newCategory.preferredTimes.length > 1 && (
                        <button
                          onClick={() => removePreferredTime(index)}
                          className="text-red-500 p-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                  <button onClick={addPreferredTime} className="btn-secondary text-sm">
                    + Add Time
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Preferred days</label>
                <div className="flex gap-2 flex-wrap">
                  {DAYS.map((day) => (
                    <button
                      key={day.value}
                      onClick={() => toggleDay(day.value)}
                      className={`px-3 py-1 rounded text-sm ${
                        newCategory.preferredDays.includes(day.value)
                          ? "bg-[var(--x-blue)] text-white"
                          : "bg-[var(--x-bg-secondary)]"
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-[var(--x-text-tertiary)] mt-1">
                  Leave empty to post any day
                </p>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newCategory.shuffleQueue}
                    onChange={(e) => setNewCategory({ ...newCategory, shuffleQueue: e.target.checked })}
                  />
                  <span className="text-sm">Shuffle queue (random order)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newCategory.recycleContent}
                    onChange={(e) => setNewCategory({ ...newCategory, recycleContent: e.target.checked })}
                  />
                  <span className="text-sm">Recycle evergreen content</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowCreateModal(false)} className="btn-secondary">
                Cancel
              </button>
              <button onClick={createCategory} className="btn-primary">
                Create Category
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {showEditModal && selectedCategory && (
        <div className="fixed inset-0 x-modal-overlay flex items-center justify-center z-50">
          <div className="x-modal p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Edit Category</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={selectedCategory.name}
                  onChange={(e) => setSelectedCategory({ ...selectedCategory, name: e.target.value })}
                  className="x-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={selectedCategory.description || ""}
                  onChange={(e) => setSelectedCategory({ ...selectedCategory, description: e.target.value })}
                  className="x-input"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedCategory({ ...selectedCategory, color })}
                      className={`w-8 h-8 rounded-full ${
                        selectedCategory.color === color ? "ring-2 ring-offset-2 ring-offset-[var(--x-bg)]" : ""
                      }`}
                      style={{ backgroundColor: color, "--tw-ring-color": color } as React.CSSProperties}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Icon</label>
                <div className="flex gap-2 flex-wrap">
                  {ICONS.map((icon) => (
                    <button
                      key={icon.value}
                      onClick={() => setSelectedCategory({ ...selectedCategory, icon: icon.value })}
                      className={`p-2 rounded ${
                        selectedCategory.icon === icon.value
                          ? "bg-[var(--x-blue)] text-white"
                          : "bg-[var(--x-bg-secondary)]"
                      }`}
                      title={icon.label}
                    >
                      {getIconSvg(icon.value)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Posts per day</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={selectedCategory.postsPerDay}
                  onChange={(e) => setSelectedCategory({ ...selectedCategory, postsPerDay: parseInt(e.target.value) || 1 })}
                  className="x-input w-24"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Preferred posting times</label>
                <div className="space-y-2">
                  {selectedCategory.preferredTimes.map((time, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="time"
                        value={time}
                        onChange={(e) => updatePreferredTime(index, e.target.value)}
                        className="x-input flex-1"
                      />
                      {selectedCategory.preferredTimes.length > 0 && (
                        <button onClick={() => removePreferredTime(index)} className="text-red-500 p-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                  <button onClick={addPreferredTime} className="btn-secondary text-sm">
                    + Add Time
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Preferred days</label>
                <div className="flex gap-2 flex-wrap">
                  {DAYS.map((day) => (
                    <button
                      key={day.value}
                      onClick={() => toggleDay(day.value)}
                      className={`px-3 py-1 rounded text-sm ${
                        selectedCategory.preferredDays.includes(day.value)
                          ? "bg-[var(--x-blue)] text-white"
                          : "bg-[var(--x-bg-secondary)]"
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedCategory.shuffleQueue}
                    onChange={(e) => setSelectedCategory({ ...selectedCategory, shuffleQueue: e.target.checked })}
                  />
                  <span className="text-sm">Shuffle queue (random order)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedCategory.recycleContent}
                    onChange={(e) => setSelectedCategory({ ...selectedCategory, recycleContent: e.target.checked })}
                  />
                  <span className="text-sm">Recycle evergreen content</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedCategory.isActive}
                    onChange={(e) => setSelectedCategory({ ...selectedCategory, isActive: e.target.checked })}
                  />
                  <span className="text-sm">Active (enable posting)</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowEditModal(false)} className="btn-secondary">
                Cancel
              </button>
              <button onClick={updateCategory} className="btn-primary">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Posts Modal */}
      {showPostsModal && selectedCategory && (
        <div className="fixed inset-0 x-modal-overlay flex items-center justify-center z-50">
          <div className="x-modal p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold" style={{ color: selectedCategory.color }}>
                {selectedCategory.name} - Posts
              </h2>
              <span className="text-sm text-[var(--x-text-secondary)]">
                {categoryPosts.total} total posts
              </span>
            </div>

            <p className="text-sm text-[var(--x-text-secondary)] mb-4">
              Drag posts to other category cards to move them.
            </p>

            {loadingPosts ? (
              <div className="text-center py-8 text-[var(--x-text-secondary)]">
                Loading posts...
              </div>
            ) : categoryPosts.posts.length === 0 ? (
              <div className="text-center py-8 text-[var(--x-text-secondary)]">
                No posts in this category yet.
              </div>
            ) : (
              <div className="space-y-3">
                {categoryPosts.posts.map((post) => (
                  <div
                    key={post.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, post)}
                    className="p-4 bg-[var(--x-bg-secondary)] rounded-lg cursor-move hover:bg-[var(--x-bg-elevated)] transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`x-badge ${getStatusBadge(post.status)}`}>
                          {post.status}
                        </span>
                        {post.scheduledFor && (
                          <span className="text-xs text-[var(--x-text-secondary)]">
                            {new Date(post.scheduledFor).toLocaleString()}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => removePostFromCategory(post.id, selectedCategory.id)}
                        className="text-red-500 text-xs hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                    <p className="text-sm mb-2">{post.content}</p>
                    <div className="flex gap-3 text-xs text-[var(--x-text-tertiary)]">
                      <span>{post.likes} likes</span>
                      <span>{post.retweets} retweets</span>
                      {post.xAccount && <span>@{post.xAccount.xUsername}</span>}
                      {post.linkedInAccount && <span>{post.linkedInAccount.name}</span>}
                      {post.instagramAccount && <span>@{post.instagramAccount.username}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end mt-6">
              <button onClick={() => setShowPostsModal(false)} className="btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Modal */}
      {showStatsModal && selectedCategory && (
        <div className="fixed inset-0 x-modal-overlay flex items-center justify-center z-50">
          <div className="x-modal p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4" style={{ color: selectedCategory.color }}>
              {selectedCategory.name} - Analytics
            </h2>

            {loadingStats ? (
              <div className="text-center py-8 text-[var(--x-text-secondary)]">
                Loading stats...
              </div>
            ) : categoryStats ? (
              <div className="space-y-6">
                {/* Post counts */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-[var(--x-bg-secondary)] rounded-lg text-center">
                    <p className="text-2xl font-bold">{categoryStats.totalPosts}</p>
                    <p className="text-xs text-[var(--x-text-secondary)]">Total Posts</p>
                  </div>
                  <div className="p-4 bg-[var(--x-bg-secondary)] rounded-lg text-center">
                    <p className="text-2xl font-bold text-yellow-500">{categoryStats.pendingPosts}</p>
                    <p className="text-xs text-[var(--x-text-secondary)]">Pending</p>
                  </div>
                  <div className="p-4 bg-[var(--x-bg-secondary)] rounded-lg text-center">
                    <p className="text-2xl font-bold text-blue-500">{categoryStats.scheduledPosts}</p>
                    <p className="text-xs text-[var(--x-text-secondary)]">Scheduled</p>
                  </div>
                  <div className="p-4 bg-[var(--x-bg-secondary)] rounded-lg text-center">
                    <p className="text-2xl font-bold text-green-500">{categoryStats.postedPosts}</p>
                    <p className="text-xs text-[var(--x-text-secondary)]">Posted</p>
                  </div>
                </div>

                {/* Engagement metrics */}
                <div>
                  <h3 className="font-bold mb-3">Engagement Metrics</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-[var(--x-bg-secondary)] rounded-lg text-center">
                      <p className="text-2xl font-bold">{categoryStats.totalLikes.toLocaleString()}</p>
                      <p className="text-xs text-[var(--x-text-secondary)]">Total Likes</p>
                    </div>
                    <div className="p-4 bg-[var(--x-bg-secondary)] rounded-lg text-center">
                      <p className="text-2xl font-bold">{categoryStats.totalRetweets.toLocaleString()}</p>
                      <p className="text-xs text-[var(--x-text-secondary)]">Total Retweets</p>
                    </div>
                    <div className="p-4 bg-[var(--x-bg-secondary)] rounded-lg text-center">
                      <p className="text-2xl font-bold">{categoryStats.totalReplies.toLocaleString()}</p>
                      <p className="text-xs text-[var(--x-text-secondary)]">Total Replies</p>
                    </div>
                    <div className="p-4 bg-[var(--x-bg-secondary)] rounded-lg text-center">
                      <p className="text-2xl font-bold">{categoryStats.totalImpressions.toLocaleString()}</p>
                      <p className="text-xs text-[var(--x-text-secondary)]">Total Impressions</p>
                    </div>
                  </div>
                </div>

                {/* Engagement rate */}
                <div className="p-4 bg-[var(--x-bg-secondary)] rounded-lg">
                  <p className="text-sm text-[var(--x-text-secondary)] mb-1">Average Engagement Rate</p>
                  <p className="text-3xl font-bold" style={{ color: selectedCategory.color }}>
                    {categoryStats.avgEngagementRate}%
                  </p>
                </div>

                {/* Top performing post */}
                {categoryStats.topPerformingPost && (
                  <div>
                    <h3 className="font-bold mb-3">Top Performing Post</h3>
                    <div className="p-4 bg-[var(--x-bg-secondary)] rounded-lg">
                      <p className="mb-3">{categoryStats.topPerformingPost.content}</p>
                      <div className="flex gap-4 text-sm text-[var(--x-text-secondary)]">
                        <span>{categoryStats.topPerformingPost.likes} likes</span>
                        <span>{categoryStats.topPerformingPost.retweets} retweets</span>
                        <span>{categoryStats.topPerformingPost.replies} replies</span>
                        <span>{categoryStats.topPerformingPost.impressions} impressions</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-[var(--x-text-secondary)]">
                No stats available.
              </div>
            )}

            <div className="flex justify-end mt-6">
              <button onClick={() => setShowStatsModal(false)} className="btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
