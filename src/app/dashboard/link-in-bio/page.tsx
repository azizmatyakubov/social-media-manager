"use client";

import { useState, useEffect } from "react";

interface Link {
  id: string;
  title: string;
  url: string;
  icon: string | null;
  thumbnail: string | null;
  position: number;
  clicks: number;
  isVisible: boolean;
  isActive: boolean;
}

interface Page {
  id: string;
  slug: string;
  title: string;
  bio: string | null;
  avatarUrl: string | null;
  backgroundImage: string | null;
  theme: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  buttonStyle: string;
  fontFamily: string;
  socialLinks: Record<string, string> | null;
  totalViews: number;
  totalClicks: number;
  isPublished: boolean;
  links: Link[];
}

const themes = [
  { id: "default", name: "Default", primary: "#6366F1", secondary: "#8B5CF6", bg: "#000000", text: "#FFFFFF" },
  { id: "minimal", name: "Minimal", primary: "#18181B", secondary: "#27272A", bg: "#FFFFFF", text: "#18181B" },
  { id: "gradient", name: "Gradient", primary: "#EC4899", secondary: "#8B5CF6", bg: "#0F0F0F", text: "#FFFFFF" },
  { id: "dark", name: "Dark", primary: "#3B82F6", secondary: "#1D4ED8", bg: "#09090B", text: "#FAFAFA" },
  { id: "neon", name: "Neon", primary: "#22D3EE", secondary: "#A855F7", bg: "#020617", text: "#F0FDFA" },
  { id: "forest", name: "Forest", primary: "#22C55E", secondary: "#16A34A", bg: "#052E16", text: "#F0FDF4" },
  { id: "sunset", name: "Sunset", primary: "#F97316", secondary: "#EF4444", bg: "#1C1917", text: "#FFF7ED" },
];

const buttonStyles = [
  { id: "rounded", name: "Rounded" },
  { id: "pill", name: "Pill" },
  { id: "square", name: "Square" },
];

const socialPlatforms = [
  { id: "twitter", name: "X (Twitter)" },
  { id: "instagram", name: "Instagram" },
  { id: "youtube", name: "YouTube" },
  { id: "linkedin", name: "LinkedIn" },
  { id: "tiktok", name: "TikTok" },
  { id: "github", name: "GitHub" },
  { id: "email", name: "Email" },
  { id: "website", name: "Website" },
];

export default function LinkInBioPage() {
  const [pages, setPages] = useState<Page[]>([]);
  const [activePage, setActivePage] = useState<Page | null>(null);
  const [activeTab, setActiveTab] = useState<"design" | "links" | "settings" | "analytics">("design");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddLinkModal, setShowAddLinkModal] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Create form state
  const [createForm, setCreateForm] = useState({ slug: "", title: "" });

  // Link form state
  const [linkForm, setLinkForm] = useState({ title: "", url: "", icon: "" });

  // Social links form
  const [socialLinksForm, setSocialLinksForm] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchPages();
  }, []);

  useEffect(() => {
    if (activePage) {
      setSocialLinksForm(activePage.socialLinks || {});
    }
  }, [activePage]);

  const fetchPages = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/link-in-bio");
      if (response.ok) {
        const data = await response.json();
        setPages(data);
        if (data.length > 0 && !activePage) {
          setActivePage(data[0]);
        }
      }
    } catch (error) {
      console.error("Failed to fetch pages:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePage = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/link-in-bio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });

      if (response.ok) {
        const newPage = await response.json();
        setPages([newPage, ...pages]);
        setActivePage(newPage);
        setShowCreateModal(false);
        setCreateForm({ slug: "", title: "" });
        setMessage({ type: "success", text: "Page created!" });
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to create page",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePage = async (updates: Partial<Page>) => {
    if (!activePage) return;
    setIsSaving(true);

    try {
      const response = await fetch("/api/link-in-bio", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId: activePage.id, ...updates }),
      });

      if (response.ok) {
        const updatedPage = await response.json();
        setActivePage(updatedPage);
        setPages(pages.map((p) => (p.id === updatedPage.id ? updatedPage : p)));
        setMessage({ type: "success", text: "Saved!" });
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to save",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePage) return;
    setIsSaving(true);

    try {
      const response = await fetch("/api/link-in-bio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add-link",
          pageId: activePage.id,
          ...linkForm,
        }),
      });

      if (response.ok) {
        await fetchPages();
        const updated = pages.find((p) => p.id === activePage.id);
        if (updated) setActivePage(updated);
        setShowAddLinkModal(false);
        setLinkForm({ title: "", url: "", icon: "" });
        setMessage({ type: "success", text: "Link added!" });
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to add link",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    try {
      const response = await fetch(`/api/link-in-bio?linkId=${linkId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchPages();
        setMessage({ type: "success", text: "Link deleted!" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to delete link" });
    }
  };

  const handleToggleLinkVisibility = async (linkId: string, isVisible: boolean) => {
    try {
      await fetch("/api/link-in-bio", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-link",
          linkId,
          isVisible: !isVisible,
        }),
      });
      fetchPages();
    } catch (error) {
      console.error("Failed to toggle visibility:", error);
    }
  };

  const handleThemeSelect = (theme: typeof themes[0]) => {
    handleUpdatePage({
      theme: theme.id,
      primaryColor: theme.primary,
      secondaryColor: theme.secondary,
      backgroundColor: theme.bg,
      textColor: theme.text,
    });
  };

  const handleSaveSocialLinks = () => {
    handleUpdatePage({ socialLinks: socialLinksForm });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Link in Bio</h1>
          <p className="text-zinc-400 mt-1">
            Create a landing page with all your important links
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Page
        </button>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === "success"
              ? "bg-green-500/10 border border-green-500/20 text-green-400"
              : "bg-red-500/10 border border-red-500/20 text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}

      {pages.length === 0 ? (
        <div className="text-center py-16 bg-zinc-900/50 border border-white/10 rounded-xl">
          <svg
            className="w-16 h-16 mx-auto text-zinc-600 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
            />
          </svg>
          <h3 className="text-lg font-medium mb-2">Create Your Link Page</h3>
          <p className="text-zinc-400 mb-6 max-w-md mx-auto">
            Build a beautiful landing page with all your important links.
            Perfect for your social media bio.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            Create Your Page
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar - Page List */}
          <div className="col-span-3 space-y-3">
            <p className="text-sm font-medium text-zinc-500 px-1">Your Pages</p>
            {pages.map((page) => (
              <button
                key={page.id}
                onClick={() => setActivePage(page)}
                className={`w-full p-3 rounded-xl text-left transition-all ${
                  activePage?.id === page.id
                    ? "bg-white/10 border border-white/20"
                    : "hover:bg-white/5 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold"
                    style={{
                      background: `linear-gradient(135deg, ${page.primaryColor}, ${page.secondaryColor})`,
                    }}
                  >
                    {page.title.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{page.title}</p>
                    <p className="text-xs text-zinc-500">/{page.slug}</p>
                  </div>
                  {page.isPublished && (
                    <span className="w-2 h-2 rounded-full bg-green-400" />
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Main Content */}
          {activePage && (
            <div className="col-span-9 space-y-6">
              {/* Page URL */}
              <div className="flex items-center gap-4 p-4 bg-zinc-900/50 border border-white/10 rounded-xl">
                <span className="text-zinc-500">Your page:</span>
                <code className="flex-1 px-3 py-2 bg-black/50 rounded-lg text-sm">
                  {typeof window !== "undefined" ? window.location.origin : ""}/l/{activePage.slug}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${window.location.origin}/l/${activePage.slug}`
                    );
                    setMessage({ type: "success", text: "URL copied!" });
                  }}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                </button>
                <a
                  href={`/l/${activePage.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-white/10 rounded-lg text-sm font-medium hover:bg-white/20 transition-colors"
                >
                  Preview
                </a>
                <button
                  onClick={() => handleUpdatePage({ isPublished: !activePage.isPublished })}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activePage.isPublished
                      ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                      : "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30"
                  }`}
                >
                  {activePage.isPublished ? "Published" : "Draft"}
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 border-b border-white/10 pb-4">
                {[
                  { id: "design", label: "Design" },
                  { id: "links", label: "Links" },
                  { id: "settings", label: "Settings" },
                  { id: "analytics", label: "Analytics" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? "bg-white/10 text-white"
                        : "text-zinc-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Design Tab */}
              {activeTab === "design" && (
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-6">
                    {/* Profile */}
                    <div className="p-6 bg-zinc-900/50 border border-white/10 rounded-xl space-y-4">
                      <h3 className="font-medium">Profile</h3>
                      <div>
                        <label className="block text-sm text-zinc-400 mb-1.5">Title</label>
                        <input
                          type="text"
                          value={activePage.title}
                          onChange={(e) => setActivePage({ ...activePage, title: e.target.value })}
                          onBlur={(e) => handleUpdatePage({ title: e.target.value })}
                          className="w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-zinc-400 mb-1.5">Bio</label>
                        <textarea
                          value={activePage.bio || ""}
                          onChange={(e) => setActivePage({ ...activePage, bio: e.target.value })}
                          onBlur={(e) => handleUpdatePage({ bio: e.target.value })}
                          rows={3}
                          className="w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-zinc-400 mb-1.5">Avatar URL</label>
                        <input
                          type="text"
                          value={activePage.avatarUrl || ""}
                          onChange={(e) => setActivePage({ ...activePage, avatarUrl: e.target.value })}
                          onBlur={(e) => handleUpdatePage({ avatarUrl: e.target.value })}
                          placeholder="https://..."
                          className="w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    {/* Themes */}
                    <div className="p-6 bg-zinc-900/50 border border-white/10 rounded-xl space-y-4">
                      <h3 className="font-medium">Theme</h3>
                      <div className="grid grid-cols-4 gap-2">
                        {themes.map((theme) => (
                          <button
                            key={theme.id}
                            onClick={() => handleThemeSelect(theme)}
                            className={`p-2 rounded-lg border transition-all ${
                              activePage.theme === theme.id
                                ? "border-indigo-500 ring-2 ring-indigo-500/20"
                                : "border-white/10 hover:border-white/20"
                            }`}
                          >
                            <div
                              className="w-full h-8 rounded mb-2"
                              style={{
                                background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
                              }}
                            />
                            <p className="text-xs text-center">{theme.name}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Button Style */}
                    <div className="p-6 bg-zinc-900/50 border border-white/10 rounded-xl space-y-4">
                      <h3 className="font-medium">Button Style</h3>
                      <div className="flex gap-2">
                        {buttonStyles.map((style) => (
                          <button
                            key={style.id}
                            onClick={() => handleUpdatePage({ buttonStyle: style.id })}
                            className={`flex-1 p-3 border transition-all ${
                              activePage.buttonStyle === style.id
                                ? "border-indigo-500 bg-indigo-500/10"
                                : "border-white/10 hover:border-white/20"
                            } ${style.id === "rounded" ? "rounded-xl" : style.id === "pill" ? "rounded-full" : ""}`}
                          >
                            {style.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Preview */}
                  <div className="sticky top-6">
                    <div className="p-4 bg-zinc-900/50 border border-white/10 rounded-xl">
                      <p className="text-sm text-zinc-400 mb-3">Preview</p>
                      <div
                        className="rounded-xl overflow-hidden"
                        style={{ backgroundColor: activePage.backgroundColor }}
                      >
                        <div className="p-6 text-center">
                          {activePage.avatarUrl ? (
                            <img
                              src={activePage.avatarUrl}
                              alt=""
                              className="w-16 h-16 rounded-full mx-auto mb-3 object-cover"
                            />
                          ) : (
                            <div
                              className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-xl font-bold"
                              style={{
                                background: `linear-gradient(135deg, ${activePage.primaryColor}, ${activePage.secondaryColor})`,
                                color: activePage.textColor,
                              }}
                            >
                              {activePage.title.charAt(0)}
                            </div>
                          )}
                          <h3 className="font-bold" style={{ color: activePage.textColor }}>
                            {activePage.title}
                          </h3>
                          {activePage.bio && (
                            <p className="text-xs mt-1 opacity-70" style={{ color: activePage.textColor }}>
                              {activePage.bio}
                            </p>
                          )}
                          <div className="space-y-2 mt-4">
                            {activePage.links.slice(0, 3).map((link) => (
                              <div
                                key={link.id}
                                className={`p-2.5 text-sm font-medium ${
                                  activePage.buttonStyle === "rounded"
                                    ? "rounded-xl"
                                    : activePage.buttonStyle === "pill"
                                    ? "rounded-full"
                                    : ""
                                }`}
                                style={{
                                  background: `linear-gradient(135deg, ${activePage.primaryColor}, ${activePage.secondaryColor})`,
                                  color: activePage.textColor,
                                }}
                              >
                                {link.title}
                              </div>
                            ))}
                            {activePage.links.length > 3 && (
                              <p className="text-xs opacity-50" style={{ color: activePage.textColor }}>
                                +{activePage.links.length - 3} more links
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Links Tab */}
              {activeTab === "links" && (
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <button
                      onClick={() => setShowAddLinkModal(true)}
                      className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Link
                    </button>
                  </div>

                  {activePage.links.length === 0 ? (
                    <div className="text-center py-12 bg-zinc-900/50 border border-white/10 rounded-xl">
                      <p className="text-zinc-400">No links yet. Add your first link!</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {activePage.links.map((link) => (
                        <div
                          key={link.id}
                          className="flex items-center gap-4 p-4 bg-zinc-900/50 border border-white/10 rounded-xl"
                        >
                          <div className="p-2 bg-white/5 rounded-lg cursor-move">
                            <svg className="w-5 h-5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 8h16M4 16h16" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{link.title}</p>
                            <p className="text-sm text-zinc-500 truncate">{link.url}</p>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-zinc-500">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            {link.clicks}
                          </div>
                          <button
                            onClick={() => handleToggleLinkVisibility(link.id, link.isVisible)}
                            className={`p-2 rounded-lg transition-colors ${
                              link.isVisible ? "text-green-400" : "text-zinc-500"
                            }`}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              {link.isVisible ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                              )}
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteLink(link.id)}
                            className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Settings Tab */}
              {activeTab === "settings" && (
                <div className="grid grid-cols-2 gap-6">
                  {/* Social Links */}
                  <div className="p-6 bg-zinc-900/50 border border-white/10 rounded-xl space-y-4">
                    <h3 className="font-medium">Social Links</h3>
                    <p className="text-sm text-zinc-400">Add your social media links to display as icons.</p>
                    {socialPlatforms.map((platform) => (
                      <div key={platform.id}>
                        <label className="block text-sm text-zinc-400 mb-1.5">{platform.name}</label>
                        <input
                          type="text"
                          value={socialLinksForm[platform.id] || ""}
                          onChange={(e) =>
                            setSocialLinksForm({ ...socialLinksForm, [platform.id]: e.target.value })
                          }
                          placeholder={`https://${platform.id}.com/...`}
                          className="w-full px-4 py-2 bg-black/50 border border-white/10 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>
                    ))}
                    <button
                      onClick={handleSaveSocialLinks}
                      disabled={isSaving}
                      className="w-full py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {isSaving ? "Saving..." : "Save Social Links"}
                    </button>
                  </div>

                  {/* SEO */}
                  <div className="p-6 bg-zinc-900/50 border border-white/10 rounded-xl space-y-4">
                    <h3 className="font-medium">SEO Settings</h3>
                    <div>
                      <label className="block text-sm text-zinc-400 mb-1.5">Meta Title</label>
                      <input
                        type="text"
                        value={activePage.metaTitle || ""}
                        onChange={(e) => setActivePage({ ...activePage, metaTitle: e.target.value })}
                        onBlur={(e) => handleUpdatePage({ metaTitle: e.target.value })}
                        placeholder="Page title for search engines"
                        className="w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-zinc-400 mb-1.5">Meta Description</label>
                      <textarea
                        value={activePage.metaDescription || ""}
                        onChange={(e) => setActivePage({ ...activePage, metaDescription: e.target.value })}
                        onBlur={(e) => handleUpdatePage({ metaDescription: e.target.value })}
                        placeholder="Description for search engines"
                        rows={3}
                        className="w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Analytics Tab */}
              {activeTab === "analytics" && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-6 bg-zinc-900/50 border border-white/10 rounded-xl text-center">
                    <p className="text-3xl font-bold">{activePage.totalViews}</p>
                    <p className="text-sm text-zinc-400 mt-1">Total Views</p>
                  </div>
                  <div className="p-6 bg-zinc-900/50 border border-white/10 rounded-xl text-center">
                    <p className="text-3xl font-bold">{activePage.totalClicks}</p>
                    <p className="text-sm text-zinc-400 mt-1">Total Clicks</p>
                  </div>
                  <div className="p-6 bg-zinc-900/50 border border-white/10 rounded-xl text-center">
                    <p className="text-3xl font-bold">
                      {activePage.totalViews > 0
                        ? ((activePage.totalClicks / activePage.totalViews) * 100).toFixed(1)
                        : 0}%
                    </p>
                    <p className="text-sm text-zinc-400 mt-1">Click Rate</p>
                  </div>
                  <div className="col-span-3 p-6 bg-zinc-900/50 border border-white/10 rounded-xl">
                    <h3 className="font-medium mb-4">Top Links</h3>
                    <div className="space-y-3">
                      {activePage.links
                        .sort((a, b) => b.clicks - a.clicks)
                        .slice(0, 5)
                        .map((link, i) => (
                          <div key={link.id} className="flex items-center gap-3">
                            <span className="text-zinc-500 text-sm w-4">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <p className="truncate">{link.title}</p>
                            </div>
                            <span className="text-zinc-400">{link.clicks} clicks</span>
                          </div>
                        ))}
                      {activePage.links.length === 0 && (
                        <p className="text-zinc-500 text-center py-4">No links yet</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Create Page Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-white/10 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Create New Page</h2>
            <form onSubmit={handleCreatePage} className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">Page URL</label>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 text-sm">/l/</span>
                  <input
                    type="text"
                    value={createForm.slug}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, "") })
                    }
                    placeholder="your-name"
                    className="flex-1 px-4 py-2.5 bg-black/50 border border-white/10 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  />
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  Letters, numbers, hyphens, and underscores only
                </p>
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">Display Name</label>
                <input
                  type="text"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  placeholder="Your Name"
                  className="w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 bg-white/10 rounded-lg font-medium hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isSaving ? "Creating..." : "Create Page"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Link Modal */}
      {showAddLinkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-white/10 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Add Link</h2>
            <form onSubmit={handleAddLink} className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">Title</label>
                <input
                  type="text"
                  value={linkForm.title}
                  onChange={(e) => setLinkForm({ ...linkForm, title: e.target.value })}
                  placeholder="My Website"
                  className="w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">URL</label>
                <input
                  type="url"
                  value={linkForm.url}
                  onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">Icon (emoji, optional)</label>
                <input
                  type="text"
                  value={linkForm.icon}
                  onChange={(e) => setLinkForm({ ...linkForm, icon: e.target.value })}
                  placeholder="🔗"
                  className="w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddLinkModal(false)}
                  className="flex-1 py-2.5 bg-white/10 rounded-lg font-medium hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isSaving ? "Adding..." : "Add Link"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
