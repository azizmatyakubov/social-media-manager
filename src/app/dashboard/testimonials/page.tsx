"use client";

import { useState, useEffect } from "react";

interface Testimonial {
  id: string;
  source: string;
  type: string;
  content: {
    text: string;
    rating?: number;
    media?: { type: string; url: string }[];
    originalUrl?: string;
  };
  author: {
    name: string;
    username?: string;
    avatar?: string;
    company?: string;
    title?: string;
    followers?: number;
    verified?: boolean;
  };
  metadata: {
    productOrService?: string;
    tags: string[];
    sentiment: string;
    date: string;
  };
  status: "pending" | "approved" | "rejected" | "featured";
  displaySettings: {
    showAvatar: boolean;
    showCompany: boolean;
    showDate: boolean;
    showRating: boolean;
    showSource: boolean;
  };
  analytics: {
    views: number;
    clicks: number;
    conversions: number;
  };
  createdAt: string;
}

interface Widget {
  id: string;
  name: string;
  type: string;
  theme: {
    backgroundColor: string;
    textColor: string;
    accentColor: string;
    darkMode: boolean;
  };
  embedCode: string;
  analytics: {
    impressions: number;
    engagements: number;
    clicks: number;
  };
  createdAt: string;
}

interface Stats {
  totalTestimonials: number;
  approvedTestimonials: number;
  featuredTestimonials: number;
  avgRating: number;
  bySource: Record<string, number>;
  byRating: Record<number, number>;
  sentimentBreakdown: { positive: number; neutral: number; negative: number };
  widgetImpressions: number;
}

export default function TestimonialsPage() {
  const [activeTab, setActiveTab] = useState<"testimonials" | "widgets" | "collect" | "analytics">("testimonials");
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showWidgetModal, setShowWidgetModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedTestimonials, setSelectedTestimonials] = useState<string[]>([]);

  // Form states
  const [newTestimonial, setNewTestimonial] = useState({
    source: "manual",
    type: "text",
    text: "",
    rating: 5,
    authorName: "",
    authorCompany: "",
    authorTitle: "",
    tags: [] as string[],
  });

  const [newWidget, setNewWidget] = useState({
    name: "",
    type: "carousel",
    backgroundColor: "#ffffff",
    textColor: "#1f2937",
    accentColor: "#6366f1",
    darkMode: false,
  });

  const [importUrl, setImportUrl] = useState("");
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const loadData = async () => {
    try {
      const statusParam = statusFilter ? `&status=${statusFilter}` : "";
      const [testimonialsRes, widgetsRes, statsRes] = await Promise.all([
        fetch(`/api/testimonials?action=testimonials${statusParam}`),
        fetch("/api/testimonials?action=widgets"),
        fetch("/api/testimonials?action=stats"),
      ]);

      const [testimonialsData, widgetsData, statsData] = await Promise.all([
        testimonialsRes.json(),
        widgetsRes.json(),
        statsRes.json(),
      ]);

      setTestimonials(testimonialsData.testimonials || []);
      setWidgets(widgetsData.widgets || []);
      setStats(statsData.stats || null);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  const createTestimonial = async () => {
    if (!newTestimonial.text.trim() || !newTestimonial.authorName.trim()) return;

    try {
      const res = await fetch("/api/testimonials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          source: newTestimonial.source,
          type: newTestimonial.type,
          content: {
            text: newTestimonial.text,
            rating: newTestimonial.rating,
          },
          author: {
            name: newTestimonial.authorName,
            company: newTestimonial.authorCompany || undefined,
            title: newTestimonial.authorTitle || undefined,
          },
          metadata: {
            tags: newTestimonial.tags,
            sentiment: "positive",
            language: "en",
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setTestimonials([data.testimonial, ...testimonials]);
        setShowAddModal(false);
        resetTestimonialForm();
        loadData();
      }
    } catch (error) {
      console.error("Failed to create testimonial:", error);
    }
  };

  const updateTestimonialStatus = async (id: string, status: string) => {
    try {
      const res = await fetch("/api/testimonials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: status === "featured" ? "feature" : status === "approved" ? "approve" : "reject", testimonialId: id }),
      });

      if (res.ok) {
        const data = await res.json();
        setTestimonials(testimonials.map((t) => (t.id === id ? data.testimonial : t)));
        loadData();
      }
    } catch (error) {
      console.error("Failed to update testimonial:", error);
    }
  };

  const deleteTestimonial = async (id: string) => {
    try {
      const res = await fetch("/api/testimonials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", testimonialId: id }),
      });

      if (res.ok) {
        setTestimonials(testimonials.filter((t) => t.id !== id));
        loadData();
      }
    } catch (error) {
      console.error("Failed to delete testimonial:", error);
    }
  };

  const bulkUpdateStatus = async (status: string) => {
    if (selectedTestimonials.length === 0) return;

    try {
      const res = await fetch("/api/testimonials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "bulk-status", testimonialIds: selectedTestimonials, status }),
      });

      if (res.ok) {
        loadData();
        setSelectedTestimonials([]);
      }
    } catch (error) {
      console.error("Failed to bulk update:", error);
    }
  };

  const importFromTwitter = async () => {
    if (!importUrl.trim()) return;

    try {
      const res = await fetch("/api/testimonials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import-twitter", tweetUrl: importUrl }),
      });

      if (res.ok) {
        const data = await res.json();
        setTestimonials([data.testimonial, ...testimonials]);
        setShowImportModal(false);
        setImportUrl("");
        loadData();
      }
    } catch (error) {
      console.error("Failed to import:", error);
    }
  };

  const createWidget = async () => {
    if (!newWidget.name.trim()) return;

    try {
      const res = await fetch("/api/testimonials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-widget",
          name: newWidget.name,
          type: newWidget.type,
          theme: {
            backgroundColor: newWidget.backgroundColor,
            textColor: newWidget.textColor,
            accentColor: newWidget.accentColor,
            darkMode: newWidget.darkMode,
            borderRadius: 12,
            fontFamily: "Inter",
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setWidgets([data.widget, ...widgets]);
        setShowWidgetModal(false);
        resetWidgetForm();
      }
    } catch (error) {
      console.error("Failed to create widget:", error);
    }
  };

  const deleteWidget = async (id: string) => {
    try {
      const res = await fetch("/api/testimonials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete-widget", widgetId: id }),
      });

      if (res.ok) {
        setWidgets(widgets.filter((w) => w.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete widget:", error);
    }
  };

  const copyEmbedCode = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  const resetTestimonialForm = () => {
    setNewTestimonial({
      source: "manual",
      type: "text",
      text: "",
      rating: 5,
      authorName: "",
      authorCompany: "",
      authorTitle: "",
      tags: [],
    });
    setTagInput("");
  };

  const resetWidgetForm = () => {
    setNewWidget({
      name: "",
      type: "carousel",
      backgroundColor: "#ffffff",
      textColor: "#1f2937",
      accentColor: "#6366f1",
      darkMode: false,
    });
  };

  const addTag = () => {
    if (tagInput.trim() && !newTestimonial.tags.includes(tagInput.trim())) {
      setNewTestimonial({ ...newTestimonial, tags: [...newTestimonial.tags, tagInput.trim()] });
      setTagInput("");
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case "twitter": return "𝕏";
      case "instagram": return "📷";
      case "facebook": return "📘";
      case "linkedin": return "in";
      case "email": return "✉️";
      case "review_site": return "⭐";
      default: return "✏️";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-500/20 text-yellow-400";
      case "approved": return "bg-green-500/20 text-green-400";
      case "rejected": return "bg-red-500/20 text-red-400";
      case "featured": return "bg-purple-500/20 text-purple-400";
      default: return "bg-zinc-500/20 text-zinc-400";
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={i < rating ? "text-yellow-400" : "text-zinc-600"}>★</span>
    ));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Social Proof & Testimonials</h1>
          <p className="text-zinc-400 mt-1">Collect, manage, and display customer testimonials</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Testimonial
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <div className="text-sm text-zinc-400">Total Testimonials</div>
            <div className="text-2xl font-bold mt-1">{stats.totalTestimonials}</div>
          </div>
          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <div className="text-sm text-zinc-400">Approved</div>
            <div className="text-2xl font-bold mt-1 text-green-400">{stats.approvedTestimonials}</div>
          </div>
          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <div className="text-sm text-zinc-400">Avg Rating</div>
            <div className="text-2xl font-bold mt-1 flex items-center gap-1">
              <span className="text-yellow-400">★</span> {stats.avgRating.toFixed(1)}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <div className="text-sm text-zinc-400">Widget Impressions</div>
            <div className="text-2xl font-bold mt-1">{stats.widgetImpressions.toLocaleString()}</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-zinc-800 pb-2">
        {(["testimonials", "widgets", "collect", "analytics"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg capitalize transition ${
              activeTab === tab
                ? "bg-indigo-600 text-white"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Testimonials Tab */}
      {activeTab === "testimonials" && (
        <div className="space-y-4">
          {/* Filters & Bulk Actions */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="featured">Featured</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            {selectedTestimonials.length > 0 && (
              <div className="flex gap-2">
                <span className="text-sm text-zinc-400">{selectedTestimonials.length} selected</span>
                <button
                  onClick={() => bulkUpdateStatus("approved")}
                  className="px-3 py-1 text-sm bg-green-500/20 text-green-400 rounded hover:bg-green-500/30"
                >
                  Approve All
                </button>
                <button
                  onClick={() => bulkUpdateStatus("rejected")}
                  className="px-3 py-1 text-sm bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
                >
                  Reject All
                </button>
              </div>
            )}
          </div>

          {/* Testimonials List */}
          {testimonials.length === 0 ? (
            <div className="p-12 rounded-xl bg-zinc-900/50 border border-zinc-800 text-center">
              <svg className="w-16 h-16 text-zinc-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-zinc-400">No testimonials yet</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                Add Your First Testimonial
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {testimonials.map((testimonial) => (
                <div key={testimonial.id} className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedTestimonials.includes(testimonial.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTestimonials([...selectedTestimonials, testimonial.id]);
                        } else {
                          setSelectedTestimonials(selectedTestimonials.filter((id) => id !== testimonial.id));
                        }
                      }}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">{getSourceIcon(testimonial.source)}</span>
                        <span className={`px-2 py-0.5 text-xs rounded ${getStatusColor(testimonial.status)}`}>
                          {testimonial.status}
                        </span>
                        {testimonial.content.rating && (
                          <span className="text-sm">{renderStars(testimonial.content.rating)}</span>
                        )}
                      </div>
                      <p className="text-white mb-2">"{testimonial.content.text}"</p>
                      <div className="flex items-center gap-2 text-sm text-zinc-400">
                        <span className="font-medium text-zinc-300">{testimonial.author.name}</span>
                        {testimonial.author.company && (
                          <>
                            <span>-</span>
                            <span>{testimonial.author.company}</span>
                          </>
                        )}
                      </div>
                      {testimonial.metadata.tags.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {testimonial.metadata.tags.map((tag) => (
                            <span key={tag} className="px-2 py-0.5 text-xs rounded bg-zinc-800 text-zinc-400">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-zinc-800">
                    <span className="text-xs text-zinc-500">
                      {new Date(testimonial.createdAt).toLocaleDateString()}
                    </span>
                    <div className="flex gap-1">
                      {testimonial.status !== "featured" && (
                        <button
                          onClick={() => updateTestimonialStatus(testimonial.id, "featured")}
                          className="px-2 py-1 text-xs bg-purple-500/20 text-purple-400 rounded hover:bg-purple-500/30"
                        >
                          Feature
                        </button>
                      )}
                      {testimonial.status !== "approved" && testimonial.status !== "featured" && (
                        <button
                          onClick={() => updateTestimonialStatus(testimonial.id, "approved")}
                          className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded hover:bg-green-500/30"
                        >
                          Approve
                        </button>
                      )}
                      {testimonial.status !== "rejected" && (
                        <button
                          onClick={() => updateTestimonialStatus(testimonial.id, "rejected")}
                          className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
                        >
                          Reject
                        </button>
                      )}
                      <button
                        onClick={() => deleteTestimonial(testimonial.id)}
                        className="p-1 text-zinc-400 hover:text-red-400"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Widgets Tab */}
      {activeTab === "widgets" && (
        <div className="space-y-4">
          <button
            onClick={() => setShowWidgetModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Widget
          </button>

          {widgets.length === 0 ? (
            <div className="p-12 rounded-xl bg-zinc-900/50 border border-zinc-800 text-center">
              <p className="text-zinc-400">No widgets created yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {widgets.map((widget) => (
                <div key={widget.id} className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium">{widget.name}</h3>
                    <span className="px-2 py-0.5 text-xs rounded bg-zinc-800 capitalize">{widget.type}</span>
                  </div>
                  <div className="flex gap-2 mb-3">
                    <div
                      className="w-6 h-6 rounded"
                      style={{ backgroundColor: widget.theme.backgroundColor }}
                      title="Background"
                    />
                    <div
                      className="w-6 h-6 rounded"
                      style={{ backgroundColor: widget.theme.accentColor }}
                      title="Accent"
                    />
                  </div>
                  <div className="text-sm text-zinc-400 mb-3">
                    {widget.analytics.impressions.toLocaleString()} impressions
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyEmbedCode(widget.embedCode)}
                      className="flex-1 px-3 py-1.5 text-sm bg-zinc-800 rounded hover:bg-zinc-700 transition"
                    >
                      Copy Embed
                    </button>
                    <button
                      onClick={() => deleteWidget(widget.id)}
                      className="p-1.5 text-zinc-400 hover:text-red-400"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Collect Tab */}
      {activeTab === "collect" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800">
              <div className="w-12 h-12 rounded-lg bg-indigo-500/20 flex items-center justify-center text-2xl mb-4">
                ✉️
              </div>
              <h3 className="font-semibold mb-2">Email Request</h3>
              <p className="text-sm text-zinc-400 mb-4">Send personalized emails to customers requesting testimonials</p>
              <button className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
                Send Request
              </button>
            </div>

            <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800">
              <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center text-2xl mb-4">
                🔗
              </div>
              <h3 className="font-semibold mb-2">Shareable Form</h3>
              <p className="text-sm text-zinc-400 mb-4">Create a public form where customers can submit testimonials</p>
              <button className="w-full px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition">
                Create Form
              </button>
            </div>

            <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800">
              <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center text-2xl mb-4">
                🔍
              </div>
              <h3 className="font-semibold mb-2">Social Scan</h3>
              <p className="text-sm text-zinc-400 mb-4">Automatically find mentions and reviews across social media</p>
              <button className="w-full px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition">
                Start Scan
              </button>
            </div>
          </div>

          <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <h3 className="font-semibold mb-4">Quick Import</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="Paste a tweet, post, or review URL..."
                className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={importFromTwitter}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === "analytics" && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <h2 className="text-lg font-semibold mb-4">By Source</h2>
            <div className="space-y-3">
              {Object.entries(stats.bySource).map(([source, count]) => (
                <div key={source} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{getSourceIcon(source)}</span>
                    <span className="capitalize">{source.replace("_", " ")}</span>
                  </div>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <h2 className="text-lg font-semibold mb-4">Rating Distribution</h2>
            <div className="space-y-3">
              {[5, 4, 3, 2, 1].map((rating) => (
                <div key={rating} className="flex items-center gap-3">
                  <span className="w-12 text-yellow-400">{renderStars(rating)}</span>
                  <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-500 rounded-full"
                      style={{
                        width: `${((stats.byRating[rating] || 0) / Math.max(stats.totalTestimonials, 1)) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm text-zinc-400">{stats.byRating[rating] || 0}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <h2 className="text-lg font-semibold mb-4">Sentiment</h2>
            <div className="flex gap-4">
              <div className="flex-1 text-center p-4 rounded-lg bg-green-500/10">
                <div className="text-2xl font-bold text-green-400">{stats.sentimentBreakdown.positive}</div>
                <div className="text-sm text-zinc-400">Positive</div>
              </div>
              <div className="flex-1 text-center p-4 rounded-lg bg-zinc-500/10">
                <div className="text-2xl font-bold text-zinc-400">{stats.sentimentBreakdown.neutral}</div>
                <div className="text-sm text-zinc-400">Neutral</div>
              </div>
              <div className="flex-1 text-center p-4 rounded-lg bg-red-500/10">
                <div className="text-2xl font-bold text-red-400">{stats.sentimentBreakdown.negative}</div>
                <div className="text-sm text-zinc-400">Negative</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Testimonial Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-zinc-800">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Add Testimonial</h2>
                <button onClick={() => { setShowAddModal(false); resetTestimonialForm(); }} className="p-2 text-zinc-400 hover:text-white">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Testimonial Text</label>
                <textarea
                  value={newTestimonial.text}
                  onChange={(e) => setNewTestimonial({ ...newTestimonial, text: e.target.value })}
                  placeholder="Enter the testimonial..."
                  rows={4}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Author Name</label>
                  <input
                    type="text"
                    value={newTestimonial.authorName}
                    onChange={(e) => setNewTestimonial({ ...newTestimonial, authorName: e.target.value })}
                    placeholder="John Doe"
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Company</label>
                  <input
                    type="text"
                    value={newTestimonial.authorCompany}
                    onChange={(e) => setNewTestimonial({ ...newTestimonial, authorCompany: e.target.value })}
                    placeholder="Acme Inc"
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Rating</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setNewTestimonial({ ...newTestimonial, rating: star })}
                      className={`text-2xl ${star <= newTestimonial.rating ? "text-yellow-400" : "text-zinc-600"}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Tags</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                    placeholder="Add tag"
                    className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                  <button onClick={addTag} className="px-4 py-2 bg-zinc-700 rounded-lg">Add</button>
                </div>
                {newTestimonial.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {newTestimonial.tags.map((tag) => (
                      <span key={tag} className="px-2 py-1 bg-zinc-800 rounded flex items-center gap-1">
                        {tag}
                        <button onClick={() => setNewTestimonial({ ...newTestimonial, tags: newTestimonial.tags.filter((t) => t !== tag) })}>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-zinc-800 flex justify-end gap-3">
              <button onClick={() => { setShowAddModal(false); resetTestimonialForm(); }} className="px-4 py-2 text-zinc-400 hover:text-white">Cancel</button>
              <button
                onClick={createTestimonial}
                disabled={!newTestimonial.text.trim() || !newTestimonial.authorName.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                Add Testimonial
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Widget Modal */}
      {showWidgetModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 w-full max-w-lg">
            <div className="p-6 border-b border-zinc-800">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Create Widget</h2>
                <button onClick={() => { setShowWidgetModal(false); resetWidgetForm(); }} className="p-2 text-zinc-400 hover:text-white">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Widget Name</label>
                <input
                  type="text"
                  value={newWidget.name}
                  onChange={(e) => setNewWidget({ ...newWidget, name: e.target.value })}
                  placeholder="e.g., Homepage Carousel"
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Widget Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {["carousel", "grid", "list", "wall", "single", "slider"].map((type) => (
                    <button
                      key={type}
                      onClick={() => setNewWidget({ ...newWidget, type })}
                      className={`p-2 rounded-lg border capitalize transition ${
                        newWidget.type === type
                          ? "bg-indigo-600 border-indigo-600"
                          : "bg-zinc-800 border-zinc-700 hover:border-indigo-500"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Background</label>
                  <input
                    type="color"
                    value={newWidget.backgroundColor}
                    onChange={(e) => setNewWidget({ ...newWidget, backgroundColor: e.target.value })}
                    className="w-full h-10 rounded-lg cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Text</label>
                  <input
                    type="color"
                    value={newWidget.textColor}
                    onChange={(e) => setNewWidget({ ...newWidget, textColor: e.target.value })}
                    className="w-full h-10 rounded-lg cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Accent</label>
                  <input
                    type="color"
                    value={newWidget.accentColor}
                    onChange={(e) => setNewWidget({ ...newWidget, accentColor: e.target.value })}
                    className="w-full h-10 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-zinc-800 flex justify-end gap-3">
              <button onClick={() => { setShowWidgetModal(false); resetWidgetForm(); }} className="px-4 py-2 text-zinc-400 hover:text-white">Cancel</button>
              <button
                onClick={createWidget}
                disabled={!newWidget.name.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                Create Widget
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 w-full max-w-lg">
            <div className="p-6 border-b border-zinc-800">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Import Testimonial</h2>
                <button onClick={() => { setShowImportModal(false); setImportUrl(""); }} className="p-2 text-zinc-400 hover:text-white">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              <label className="block text-sm font-medium text-zinc-300 mb-2">URL</label>
              <input
                type="text"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="Paste tweet, post, or review URL..."
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:border-indigo-500"
              />
              <p className="text-sm text-zinc-500 mt-2">Supports: Twitter/X, Instagram, Facebook, LinkedIn, Google Reviews, G2, Capterra</p>
            </div>

            <div className="p-6 border-t border-zinc-800 flex justify-end gap-3">
              <button onClick={() => { setShowImportModal(false); setImportUrl(""); }} className="px-4 py-2 text-zinc-400 hover:text-white">Cancel</button>
              <button
                onClick={importFromTwitter}
                disabled={!importUrl.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
