"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";

interface QuoteTemplate {
  id: string;
  name: string;
  backgroundColor: string;
  backgroundImage?: string | null;
  textColor: string;
  fontFamily: string;
  fontSize: number;
  padding: number;
  borderRadius: number;
  showLogo: boolean;
  logoUrl?: string | null;
  showUsername: boolean;
  width: number;
  height: number;
  isDefault?: boolean;
}

interface Font {
  name: string;
  value: string;
  category: string;
}

const PRESET_GRADIENTS = [
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
  "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
  "linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%)",
  "linear-gradient(135deg, #f12711 0%, #f5af19 100%)",
  "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
  "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
];

const PRESET_COLORS = [
  "#1DA1F2",
  "#0077B5",
  "#E4405F",
  "#000000",
  "#FFFFFF",
  "#1a1a1a",
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEAA7",
  "#DDA0DD",
];

const DIMENSIONS_PRESETS = [
  { name: "Twitter/X", width: 1200, height: 675 },
  { name: "Instagram Square", width: 1080, height: 1080 },
  { name: "Instagram Story", width: 1080, height: 1920 },
  { name: "LinkedIn", width: 1200, height: 627 },
  { name: "Facebook", width: 1200, height: 630 },
];

export default function QuoteGeneratorPage() {
  const { data: session, status } = useSession();

  // State
  const [quoteText, setQuoteText] = useState("");
  const [username, setUsername] = useState("");
  const [templates, setTemplates] = useState<QuoteTemplate[]>([]);
  const [defaultTemplates, setDefaultTemplates] = useState<QuoteTemplate[]>([]);
  const [fonts, setFonts] = useState<Font[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<QuoteTemplate | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"templates" | "customize">("templates");
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");

  // Custom template settings
  const [customSettings, setCustomSettings] = useState({
    backgroundColor: "#1DA1F2",
    textColor: "#FFFFFF",
    fontFamily: "Inter",
    fontSize: 32,
    padding: 60,
    showUsername: true,
    showLogo: false,
    logoUrl: "",
    width: 1200,
    height: 675,
  });

  // Fetch initial data
  useEffect(() => {
    if (status === "authenticated") {
      fetchData();
    }
  }, [status]);

  // Auto-generate preview when text or settings change
  useEffect(() => {
    if (quoteText.trim()) {
      const debounce = setTimeout(() => {
        generatePreview();
      }, 500);
      return () => clearTimeout(debounce);
    } else {
      setPreviewUrl(null);
    }
  }, [quoteText, username, selectedTemplate, customSettings, activeTab]);

  if (status === "loading") return <div className="p-8">Loading...</div>;
  if (status === "unauthenticated") redirect("/login");

  async function fetchData() {
    try {
      const [templatesRes, generatorRes] = await Promise.all([
        fetch("/api/quote-generator/templates"),
        fetch("/api/quote-generator"),
      ]);

      if (templatesRes.ok) {
        const data = await templatesRes.json();
        setTemplates(data.templates || []);
        setDefaultTemplates(data.defaultTemplates || []);
        if (data.defaultTemplates?.length > 0) {
          setSelectedTemplate(data.defaultTemplates[0]);
        }
      }

      if (generatorRes.ok) {
        const data = await generatorRes.json();
        setFonts(data.fonts || []);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function generatePreview() {
    if (!quoteText.trim()) return;

    try {
      const body: Record<string, unknown> = {
        action: "preview",
        text: quoteText,
        username: username || session?.user?.name || undefined,
      };

      if (activeTab === "templates" && selectedTemplate) {
        if (selectedTemplate.isDefault) {
          body.template = selectedTemplate;
        } else {
          body.templateId = selectedTemplate.id;
        }
      } else {
        body.template = customSettings;
      }

      const res = await fetch("/api/quote-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        setPreviewUrl(data.dataUrl);
      }
    } catch (error) {
      console.error("Preview failed:", error);
    }
  }

  async function handleDownload() {
    if (!quoteText.trim()) return;

    setGenerating(true);
    try {
      const body: Record<string, unknown> = {
        action: "download",
        text: quoteText,
        username: username || session?.user?.name || undefined,
      };

      if (activeTab === "templates" && selectedTemplate) {
        if (selectedTemplate.isDefault) {
          body.template = selectedTemplate;
        } else {
          body.templateId = selectedTemplate.id;
        }
      } else {
        body.template = customSettings;
      }

      const res = await fetch("/api/quote-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        // Create download link
        const link = document.createElement("a");
        link.href = data.imageUrl;
        link.download = `quote-${Date.now()}.svg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error("Download failed:", error);
    } finally {
      setGenerating(false);
    }
  }

  async function handleUseInPost() {
    if (!quoteText.trim()) return;

    setGenerating(true);
    try {
      const body: Record<string, unknown> = {
        action: "generate",
        text: quoteText,
        username: username || session?.user?.name || undefined,
        saveToStorage: true,
      };

      if (activeTab === "templates" && selectedTemplate) {
        if (selectedTemplate.isDefault) {
          body.template = selectedTemplate;
        } else {
          body.templateId = selectedTemplate.id;
        }
      } else {
        body.template = customSettings;
      }

      const res = await fetch("/api/quote-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        // Store the image URL in sessionStorage for the composer to use
        sessionStorage.setItem("quoteImageUrl", data.imageUrl);
        // Redirect to compose page
        window.location.href = "/dashboard?action=compose&media=" + encodeURIComponent(data.imageUrl);
      }
    } catch (error) {
      console.error("Use in post failed:", error);
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveTemplate() {
    if (!newTemplateName.trim()) return;

    setSaving(true);
    try {
      const res = await fetch("/api/quote-generator/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTemplateName,
          ...customSettings,
        }),
      });

      if (res.ok) {
        const newTemplate = await res.json();
        setTemplates([newTemplate, ...templates]);
        setShowSaveTemplateModal(false);
        setNewTemplateName("");
        setSelectedTemplate(newTemplate);
        setActiveTab("templates");
      }
    } catch (error) {
      console.error("Save template failed:", error);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTemplate(templateId: string) {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      const res = await fetch(`/api/quote-generator/templates?templateId=${templateId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setTemplates(templates.filter((t) => t.id !== templateId));
        if (selectedTemplate?.id === templateId) {
          setSelectedTemplate(defaultTemplates[0] || null);
        }
      }
    } catch (error) {
      console.error("Delete template failed:", error);
    }
  }

  function getTemplatePreviewStyle(template: QuoteTemplate): React.CSSProperties {
    return {
      background: template.backgroundColor,
      color: template.textColor,
      fontFamily: template.fontFamily,
    };
  }

  const allTemplates = [...templates, ...defaultTemplates];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Quote Image Generator</h1>
        <p className="text-[var(--x-text-secondary)]">
          Create beautiful quote images for your social media posts
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Input & Settings */}
        <div className="space-y-6">
          {/* Quote Text Input */}
          <div className="x-card p-6">
            <h2 className="font-bold mb-4">Quote Text</h2>
            <textarea
              placeholder="Enter your quote here..."
              value={quoteText}
              onChange={(e) => setQuoteText(e.target.value)}
              className="x-input"
              rows={4}
              maxLength={500}
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-sm text-[var(--x-text-secondary)]">
                {quoteText.length}/500 characters
              </span>
            </div>

            {/* Username Input */}
            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">
                Username (optional)
              </label>
              <input
                type="text"
                placeholder="@username"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace("@", ""))}
                className="x-input"
              />
            </div>
          </div>

          {/* Template Selection / Customization Tabs */}
          <div className="x-card p-6">
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setActiveTab("templates")}
                className={`x-tab ${activeTab === "templates" ? "active" : ""}`}
              >
                Templates
              </button>
              <button
                onClick={() => setActiveTab("customize")}
                className={`x-tab ${activeTab === "customize" ? "active" : ""}`}
              >
                Customize
              </button>
            </div>

            {activeTab === "templates" ? (
              <div>
                {loading ? (
                  <div className="text-center py-8 text-[var(--x-text-secondary)]">
                    Loading templates...
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto">
                    {allTemplates.map((template) => (
                      <div
                        key={template.id}
                        onClick={() => setSelectedTemplate(template)}
                        className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                          selectedTemplate?.id === template.id
                            ? "border-[var(--x-blue)] ring-2 ring-[var(--x-blue)] ring-opacity-50"
                            : "border-[var(--x-border)] hover:border-[var(--x-blue)]"
                        }`}
                      >
                        <div
                          className="aspect-video flex items-center justify-center p-3"
                          style={getTemplatePreviewStyle(template)}
                        >
                          <span className="text-xs text-center font-medium opacity-80 line-clamp-2">
                            {template.name}
                          </span>
                        </div>
                        {!template.isDefault && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTemplate(template.id);
                            }}
                            className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                          >
                            x
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Background Color/Gradient */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Background
                  </label>
                  <div className="space-y-2">
                    {/* Solid Colors */}
                    <div className="flex flex-wrap gap-2">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color}
                          onClick={() =>
                            setCustomSettings({ ...customSettings, backgroundColor: color })
                          }
                          className={`w-8 h-8 rounded-lg border-2 ${
                            customSettings.backgroundColor === color
                              ? "border-[var(--x-blue)] ring-2 ring-[var(--x-blue)]"
                              : "border-[var(--x-border)]"
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    {/* Gradients */}
                    <div className="flex flex-wrap gap-2">
                      {PRESET_GRADIENTS.map((gradient) => (
                        <button
                          key={gradient}
                          onClick={() =>
                            setCustomSettings({ ...customSettings, backgroundColor: gradient })
                          }
                          className={`w-8 h-8 rounded-lg border-2 ${
                            customSettings.backgroundColor === gradient
                              ? "border-[var(--x-blue)] ring-2 ring-[var(--x-blue)]"
                              : "border-[var(--x-border)]"
                          }`}
                          style={{ background: gradient }}
                        />
                      ))}
                    </div>
                    {/* Custom Color Input */}
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={customSettings.backgroundColor.startsWith("#") ? customSettings.backgroundColor : "#1DA1F2"}
                        onChange={(e) =>
                          setCustomSettings({ ...customSettings, backgroundColor: e.target.value })
                        }
                        className="w-10 h-10 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={customSettings.backgroundColor}
                        onChange={(e) =>
                          setCustomSettings({ ...customSettings, backgroundColor: e.target.value })
                        }
                        className="x-input flex-1"
                        placeholder="Color or CSS gradient"
                      />
                    </div>
                  </div>
                </div>

                {/* Text Color */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Text Color
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={customSettings.textColor}
                      onChange={(e) =>
                        setCustomSettings({ ...customSettings, textColor: e.target.value })
                      }
                      className="w-10 h-10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={customSettings.textColor}
                      onChange={(e) =>
                        setCustomSettings({ ...customSettings, textColor: e.target.value })
                      }
                      className="x-input flex-1"
                    />
                  </div>
                </div>

                {/* Font Family */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Font Family
                  </label>
                  <select
                    value={customSettings.fontFamily}
                    onChange={(e) =>
                      setCustomSettings({ ...customSettings, fontFamily: e.target.value })
                    }
                    className="x-input"
                  >
                    {fonts.map((font) => (
                      <option key={font.value} value={font.value}>
                        {font.name} ({font.category})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Font Size */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Font Size: {customSettings.fontSize}px
                  </label>
                  <input
                    type="range"
                    min="16"
                    max="64"
                    value={customSettings.fontSize}
                    onChange={(e) =>
                      setCustomSettings({ ...customSettings, fontSize: parseInt(e.target.value) })
                    }
                    className="w-full"
                  />
                </div>

                {/* Padding */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Padding: {customSettings.padding}px
                  </label>
                  <input
                    type="range"
                    min="20"
                    max="120"
                    value={customSettings.padding}
                    onChange={(e) =>
                      setCustomSettings({ ...customSettings, padding: parseInt(e.target.value) })
                    }
                    className="w-full"
                  />
                </div>

                {/* Dimensions */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Dimensions
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {DIMENSIONS_PRESETS.map((preset) => (
                      <button
                        key={preset.name}
                        onClick={() =>
                          setCustomSettings({
                            ...customSettings,
                            width: preset.width,
                            height: preset.height,
                          })
                        }
                        className={`px-3 py-1 text-sm rounded-lg border ${
                          customSettings.width === preset.width &&
                          customSettings.height === preset.height
                            ? "bg-[var(--x-blue)] text-white border-[var(--x-blue)]"
                            : "border-[var(--x-border)] hover:border-[var(--x-blue)]"
                        }`}
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={customSettings.width}
                      onChange={(e) =>
                        setCustomSettings({ ...customSettings, width: parseInt(e.target.value) || 1200 })
                      }
                      className="x-input flex-1"
                      placeholder="Width"
                    />
                    <span className="self-center">x</span>
                    <input
                      type="number"
                      value={customSettings.height}
                      onChange={(e) =>
                        setCustomSettings({ ...customSettings, height: parseInt(e.target.value) || 675 })
                      }
                      className="x-input flex-1"
                      placeholder="Height"
                    />
                  </div>
                </div>

                {/* Show Username Toggle */}
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Show Username</label>
                  <button
                    onClick={() =>
                      setCustomSettings({
                        ...customSettings,
                        showUsername: !customSettings.showUsername,
                      })
                    }
                    className={`w-12 h-6 rounded-full relative transition-colors ${
                      customSettings.showUsername
                        ? "bg-[var(--x-blue)]"
                        : "bg-[var(--x-border)]"
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        customSettings.showUsername ? "translate-x-7" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* Save as Template Button */}
                <button
                  onClick={() => setShowSaveTemplateModal(true)}
                  className="w-full btn-secondary"
                >
                  Save as Template
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Preview & Actions */}
        <div className="space-y-6">
          {/* Preview */}
          <div className="x-card p-6">
            <h2 className="font-bold mb-4">Preview</h2>
            <div
              className="w-full rounded-lg overflow-hidden bg-[var(--x-bg-secondary)] flex items-center justify-center"
              style={{
                aspectRatio: `${
                  activeTab === "templates" && selectedTemplate
                    ? selectedTemplate.width / selectedTemplate.height
                    : customSettings.width / customSettings.height
                }`,
                minHeight: "200px",
              }}
            >
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Quote preview"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-[var(--x-text-secondary)] text-center p-8">
                  <p>Enter a quote to see the preview</p>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="x-card p-6 space-y-3">
            <button
              onClick={handleDownload}
              disabled={!quoteText.trim() || generating}
              className="w-full btn-secondary flex items-center justify-center gap-2"
            >
              {generating ? (
                "Processing..."
              ) : (
                <>
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
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  Download Image
                </>
              )}
            </button>

            <button
              onClick={handleUseInPost}
              disabled={!quoteText.trim() || generating}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              {generating ? (
                "Processing..."
              ) : (
                <>
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
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Use in Post
                </>
              )}
            </button>
          </div>

          {/* Template Info */}
          {selectedTemplate && activeTab === "templates" && (
            <div className="x-card p-4">
              <h3 className="font-medium">{selectedTemplate.name}</h3>
              <p className="text-sm text-[var(--x-text-secondary)] mt-1">
                {selectedTemplate.width}x{selectedTemplate.height} - {selectedTemplate.fontFamily}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Save Template Modal */}
      {showSaveTemplateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="x-card p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Save Template</h2>
            <input
              type="text"
              placeholder="Template name"
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              className="x-input w-full mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSaveTemplateModal(false);
                  setNewTemplateName("");
                }}
                className="flex-1 btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTemplate}
                disabled={!newTemplateName.trim() || saving}
                className="flex-1 btn-primary"
              >
                {saving ? "Saving..." : "Save Template"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
