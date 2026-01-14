"use client";

import { useState, useEffect } from "react";

interface ReplyTemplate {
  id: string;
  name: string;
  content: string;
  category: string;
  shortcut: string | null;
  variables: string[];
  tone: string;
  platform: string | null;
  usedCount: number;
  lastUsedAt: string | null;
  isFavorite: boolean;
  isActive: boolean;
  createdAt: string;
}

interface Category {
  name: string;
  count: number;
}

const categoryColors: Record<string, string> = {
  general: "bg-zinc-500",
  thanks: "bg-green-500",
  support: "bg-blue-500",
  sales: "bg-purple-500",
  greeting: "bg-yellow-500",
};

const tones = [
  { value: "friendly", label: "Friendly" },
  { value: "professional", label: "Professional" },
  { value: "witty", label: "Witty" },
  { value: "helpful", label: "Helpful" },
  { value: "casual", label: "Casual" },
];

const categories = [
  { value: "general", label: "General" },
  { value: "thanks", label: "Thank You" },
  { value: "support", label: "Support" },
  { value: "sales", label: "Sales" },
  { value: "greeting", label: "Greeting" },
];

export default function ReplyTemplatesPage() {
  const [templates, setTemplates] = useState<ReplyTemplate[]>([]);
  const [categoryStats, setCategoryStats] = useState<Category[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "favorites" | "create">("all");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<ReplyTemplate | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    content: "",
    category: "general",
    shortcut: "",
    tone: "friendly",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Preview state
  const [previewVariables, setPreviewVariables] = useState<Record<string, string>>({});
  const [previewContent, setPreviewContent] = useState("");

  useEffect(() => {
    fetchTemplates();
    fetchCategories();
  }, [selectedCategory, searchQuery]);

  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (selectedCategory) params.set("category", selectedCategory);
      if (searchQuery) params.set("search", searchQuery);
      if (activeTab === "favorites") params.set("favorites", "true");

      const response = await fetch(`/api/reply-templates?${params}`);
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error("Failed to fetch templates:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/reply-templates?action=categories");
      if (response.ok) {
        const data = await response.json();
        setCategoryStats(data);
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  const handleCreateDefaults = async () => {
    try {
      const response = await fetch("/api/reply-templates?action=create-defaults");
      if (response.ok) {
        fetchTemplates();
        fetchCategories();
        setMessage({ type: "success", text: "Default templates created!" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to create default templates" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const method = editingTemplate ? "PUT" : "POST";
      const body = editingTemplate
        ? { templateId: editingTemplate.id, ...formData }
        : formData;

      const response = await fetch("/api/reply-templates", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        setMessage({
          type: "success",
          text: editingTemplate ? "Template updated!" : "Template created!",
        });
        setFormData({ name: "", content: "", category: "general", shortcut: "", tone: "friendly" });
        setEditingTemplate(null);
        setActiveTab("all");
        fetchTemplates();
        fetchCategories();
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to save template",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleFavorite = async (templateId: string) => {
    try {
      await fetch("/api/reply-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle-favorite", templateId }),
      });
      fetchTemplates();
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
    }
  };

  const handleDelete = async (templateId: string) => {
    try {
      const response = await fetch(`/api/reply-templates?id=${templateId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setShowDeleteConfirm(null);
        fetchTemplates();
        fetchCategories();
      }
    } catch (error) {
      console.error("Failed to delete template:", error);
    }
  };

  const handleCopy = async (template: ReplyTemplate) => {
    try {
      await navigator.clipboard.writeText(template.content);
      // Track usage
      await fetch("/api/reply-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "use", templateId: template.id }),
      });
      setMessage({ type: "success", text: "Template copied to clipboard!" });
      fetchTemplates();
    } catch (error) {
      setMessage({ type: "error", text: "Failed to copy template" });
    }
  };

  const handleEdit = (template: ReplyTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      content: template.content,
      category: template.category,
      shortcut: template.shortcut || "",
      tone: template.tone,
    });
    setActiveTab("create");
  };

  // Extract variables from content for preview
  const extractVariables = (content: string): string[] => {
    const matches = content.match(/\{(\w+)\}/g) || [];
    return [...new Set(matches.map((v) => v.replace(/[{}]/g, "")))];
  };

  // Update preview when form content or variables change
  useEffect(() => {
    const variables = extractVariables(formData.content);
    const newPreviewVars: Record<string, string> = {};
    variables.forEach((v) => {
      newPreviewVars[v] = previewVariables[v] || "";
    });
    setPreviewVariables(newPreviewVars);
  }, [formData.content]);

  useEffect(() => {
    let content = formData.content;
    Object.entries(previewVariables).forEach(([key, value]) => {
      content = content.replace(new RegExp(`\\{${key}\\}`, "g"), value || `{${key}}`);
    });
    setPreviewContent(content);
  }, [formData.content, previewVariables]);

  const filteredTemplates =
    activeTab === "favorites"
      ? templates.filter((t) => t.isFavorite)
      : templates;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reply Templates</h1>
          <p className="text-zinc-400 mt-1">
            Quick responses for common interactions
          </p>
        </div>
        <button
          onClick={() => {
            setEditingTemplate(null);
            setFormData({ name: "", content: "", category: "general", shortcut: "", tone: "friendly" });
            setActiveTab("create");
          }}
          className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Template
        </button>
      </div>

      {/* Category Stats */}
      <div className="grid grid-cols-5 gap-3">
        {categories.map((cat) => {
          const stat = categoryStats.find((s) => s.name === cat.value);
          return (
            <button
              key={cat.value}
              onClick={() =>
                setSelectedCategory(selectedCategory === cat.value ? null : cat.value)
              }
              className={`p-3 rounded-xl border text-center transition-all ${
                selectedCategory === cat.value
                  ? "border-indigo-500 bg-indigo-500/10"
                  : "border-white/10 hover:border-white/20"
              }`}
            >
              <div
                className={`w-3 h-3 rounded-full mx-auto mb-2 ${
                  categoryColors[cat.value] || "bg-zinc-500"
                }`}
              />
              <p className="text-sm font-medium">{cat.label}</p>
              <p className="text-xs text-zinc-500">{stat?.count || 0} templates</p>
            </button>
          );
        })}
      </div>

      {/* Tabs & Search */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-2">
          {[
            { id: "all", label: "All Templates" },
            { id: "favorites", label: "Favorites" },
            { id: "create", label: editingTemplate ? "Edit Template" : "Create New" },
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
        {activeTab !== "create" && (
          <div className="relative flex-1 max-w-xs">
            <svg
              className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
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
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-zinc-900/50 border border-white/10 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        )}
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

      {/* Content */}
      {activeTab === "create" ? (
        <div className="grid grid-cols-2 gap-6">
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-6 bg-zinc-900/50 border border-white/10 rounded-xl space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Template Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Thank you response"
                  className="w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Content
                  <span className="text-zinc-500 font-normal ml-2">
                    Use {"{name}"}, {"{product}"} for variables
                  </span>
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Thanks for reaching out, {name}! I appreciate..."
                  rows={4}
                  className="w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  required
                />
                <p className="text-xs text-zinc-500 mt-1">
                  {formData.content.length} characters
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    {categories.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Tone</label>
                  <select
                    value={formData.tone}
                    onChange={(e) => setFormData({ ...formData, tone: e.target.value })}
                    className="w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    {tones.map((tone) => (
                      <option key={tone.value} value={tone.value}>
                        {tone.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Shortcut
                  <span className="text-zinc-500 font-normal ml-2">(optional)</span>
                </label>
                <input
                  type="text"
                  value={formData.shortcut}
                  onChange={(e) => setFormData({ ...formData, shortcut: e.target.value })}
                  placeholder="/thanks"
                  className="w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Type this shortcut to quickly insert this template
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : editingTemplate ? "Update Template" : "Create Template"}
                </button>
                {editingTemplate && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTemplate(null);
                      setFormData({ name: "", content: "", category: "general", shortcut: "", tone: "friendly" });
                    }}
                    className="px-4 py-2.5 bg-white/5 rounded-lg font-medium hover:bg-white/10 transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </form>

          {/* Preview */}
          <div className="space-y-4">
            <div className="p-6 bg-zinc-900/50 border border-white/10 rounded-xl">
              <h3 className="font-medium mb-4">Preview</h3>

              {/* Variable inputs */}
              {Object.keys(previewVariables).length > 0 && (
                <div className="space-y-3 mb-4 pb-4 border-b border-white/10">
                  {Object.keys(previewVariables).map((variable) => (
                    <div key={variable}>
                      <label className="block text-xs text-zinc-500 mb-1">
                        {"{"}
                        {variable}
                        {"}"}
                      </label>
                      <input
                        type="text"
                        value={previewVariables[variable]}
                        onChange={(e) =>
                          setPreviewVariables({
                            ...previewVariables,
                            [variable]: e.target.value,
                          })
                        }
                        placeholder={`Enter ${variable}...`}
                        className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="p-4 bg-black/50 rounded-lg">
                <p className="text-sm whitespace-pre-wrap">
                  {previewContent || "Your template preview will appear here..."}
                </p>
              </div>
            </div>

            {/* Tips */}
            <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
              <h4 className="font-medium text-indigo-400 mb-2">Tips</h4>
              <ul className="text-sm text-zinc-400 space-y-1">
                <li>• Use variables like {"{name}"} for personalization</li>
                <li>• Keep templates concise and scannable</li>
                <li>• Add shortcuts for frequently used responses</li>
                <li>• Categorize templates for easy discovery</li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-zinc-400 mt-3">Loading templates...</p>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-12 bg-zinc-900/50 border border-white/10 rounded-xl">
              <svg
                className="w-12 h-12 mx-auto text-zinc-600 mb-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-zinc-400 mb-4">
                {activeTab === "favorites"
                  ? "No favorite templates yet"
                  : "No templates found"}
              </p>
              {activeTab !== "favorites" && templates.length === 0 && (
                <button
                  onClick={handleCreateDefaults}
                  className="px-4 py-2 bg-white/10 rounded-lg text-sm font-medium hover:bg-white/20 transition-colors"
                >
                  Create Default Templates
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  className="p-4 bg-zinc-900/50 border border-white/10 rounded-xl hover:border-white/20 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium truncate">{template.name}</h3>
                        {template.shortcut && (
                          <span className="px-2 py-0.5 bg-white/10 rounded text-xs text-zinc-400">
                            {template.shortcut}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            categoryColors[template.category] || "bg-zinc-500"
                          }`}
                        />
                        <span className="text-xs text-zinc-500 capitalize">
                          {template.category}
                        </span>
                        <span className="text-zinc-600">•</span>
                        <span className="text-xs text-zinc-500 capitalize">
                          {template.tone}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleFavorite(template.id)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        template.isFavorite
                          ? "text-yellow-400"
                          : "text-zinc-500 hover:text-yellow-400"
                      }`}
                    >
                      <svg
                        className="w-5 h-5"
                        fill={template.isFavorite ? "currentColor" : "none"}
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                        />
                      </svg>
                    </button>
                  </div>

                  <p className="text-sm text-zinc-400 line-clamp-3 mb-3">
                    {template.content}
                  </p>

                  {template.variables.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {template.variables.map((v) => (
                        <span
                          key={v}
                          className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-400 rounded text-xs"
                        >
                          {"{"}
                          {v}
                          {"}"}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-white/5">
                    <span className="text-xs text-zinc-500">
                      Used {template.usedCount} times
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleCopy(template)}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                        title="Copy"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleEdit(template)}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(template.id)}
                        className="p-1.5 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Delete confirmation */}
                  {showDeleteConfirm === template.id && (
                    <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <p className="text-sm text-red-400 mb-2">Delete this template?</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDelete(template.id)}
                          className="flex-1 py-1.5 bg-red-500/20 text-red-400 rounded text-sm font-medium hover:bg-red-500/30 transition-colors"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(null)}
                          className="flex-1 py-1.5 bg-white/10 rounded text-sm font-medium hover:bg-white/20 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
