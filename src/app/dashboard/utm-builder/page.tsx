"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

interface UTMLink {
  id: string;
  originalUrl: string;
  fullUrl: string;
  shortCode: string | null;
  source: string;
  medium: string;
  campaign: string;
  term: string | null;
  content: string | null;
  clicks: number;
  createdAt: string;
}

interface UTMPreset {
  id: string;
  name: string;
  source: string;
  medium: string;
  campaign: string;
  term: string | null;
  content: string | null;
  usageCount: number;
}

interface Analytics {
  totalLinks: number;
  totalClicks: number;
  bySource: { name: string; count: number; clicks: number }[];
  byMedium: { name: string; count: number; clicks: number }[];
  byCampaign: { name: string; count: number; clicks: number }[];
}

const defaultSources = [
  { value: "twitter", label: "Twitter/X" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
  { value: "email", label: "Email" },
  { value: "newsletter", label: "Newsletter" },
];

const defaultMediums = [
  { value: "social", label: "Social Media" },
  { value: "organic", label: "Organic" },
  { value: "cpc", label: "Cost Per Click" },
  { value: "email", label: "Email" },
  { value: "referral", label: "Referral" },
  { value: "affiliate", label: "Affiliate" },
];

export default function UTMBuilderPage() {
  const [activeTab, setActiveTab] = useState<"builder" | "links" | "presets" | "analytics">("builder");

  // Form state
  const [url, setUrl] = useState("");
  const [source, setSource] = useState("");
  const [medium, setMedium] = useState("");
  const [campaign, setCampaign] = useState("");
  const [term, setTerm] = useState("");
  const [content, setContent] = useState("");
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [error, setError] = useState("");

  // Data
  const [links, setLinks] = useState<UTMLink[]>([]);
  const [presets, setPresets] = useState<UTMPreset[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  // Preset form
  const [showPresetForm, setShowPresetForm] = useState(false);
  const [presetName, setPresetName] = useState("");

  // Copy state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [linksRes, presetsRes, analyticsRes] = await Promise.all([
        fetch("/api/utm?action=links"),
        fetch("/api/utm?action=presets"),
        fetch("/api/utm?action=analytics"),
      ]);

      const [linksData, presetsData, analyticsData] = await Promise.all([
        linksRes.json(),
        presetsRes.json(),
        analyticsRes.json(),
      ]);

      setLinks(linksData.links || []);
      setPresets(presetsData.presets || []);
      setAnalytics(analyticsData.analytics);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleBuildUrl = async (save: boolean = false) => {
    setError("");
    setGeneratedUrl("");

    if (!url) {
      setError("Please enter a URL");
      return;
    }

    if (!source || !medium || !campaign) {
      setError("Source, Medium, and Campaign are required");
      return;
    }

    try {
      const action = save ? "create-link" : "build";
      const res = await fetch("/api/utm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          url,
          source: source.toLowerCase().replace(/\s+/g, "_"),
          medium: medium.toLowerCase().replace(/\s+/g, "_"),
          campaign: campaign.toLowerCase().replace(/\s+/g, "_"),
          term: term ? term.toLowerCase().replace(/\s+/g, "+") : undefined,
          content: content ? content.toLowerCase().replace(/\s+/g, "_") : undefined,
          createShortCode: save,
        }),
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      if (save) {
        setGeneratedUrl(data.link.fullUrl);
        fetchData();
      } else {
        setGeneratedUrl(data.url);
      }
    } catch {
      setError("Failed to build URL");
    }
  };

  const handleApplyPreset = (preset: UTMPreset) => {
    setSource(preset.source);
    setMedium(preset.medium);
    setCampaign(preset.campaign);
    setTerm(preset.term || "");
    setContent(preset.content || "");

    // Track usage
    fetch("/api/utm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "use-preset", presetId: preset.id }),
    }).catch(() => {});
  };

  const handleSavePreset = async () => {
    if (!presetName || !source || !medium || !campaign) {
      setError("Name, Source, Medium, and Campaign are required for a preset");
      return;
    }

    try {
      await fetch("/api/utm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-preset",
          name: presetName,
          source: source.toLowerCase().replace(/\s+/g, "_"),
          medium: medium.toLowerCase().replace(/\s+/g, "_"),
          campaign: campaign.toLowerCase().replace(/\s+/g, "_"),
          term: term || undefined,
          content: content || undefined,
        }),
      });

      setShowPresetForm(false);
      setPresetName("");
      fetchData();
    } catch {
      setError("Failed to save preset");
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    if (!confirm("Delete this link?")) return;
    try {
      await fetch("/api/utm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete-link", linkId }),
      });
      fetchData();
    } catch {
      console.error("Failed to delete link");
    }
  };

  const handleDeletePreset = async (presetId: string) => {
    if (!confirm("Delete this preset?")) return;
    try {
      await fetch("/api/utm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete-preset", presetId }),
      });
      fetchData();
    } catch {
      console.error("Failed to delete preset");
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearForm = () => {
    setUrl("");
    setSource("");
    setMedium("");
    setCampaign("");
    setTerm("");
    setContent("");
    setGeneratedUrl("");
    setError("");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">UTM Link Builder</h1>
          <p className="text-zinc-400 mt-1">
            Create trackable links for your campaigns
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-white/10 pb-2">
          {[
            { id: "builder", label: "Builder", icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" },
            { id: "links", label: "My Links", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
            { id: "presets", label: "Presets", icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" },
            { id: "analytics", label: "Analytics", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                activeTab === tab.id
                  ? "bg-white/10 text-white"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
              </svg>
              {tab.label}
            </button>
          ))}
        </div>

        {loading && activeTab !== "builder" ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Builder Tab */}
            {activeTab === "builder" && (
              <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 space-y-6">
                  {/* URL Input */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Destination URL <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://example.com/landing-page"
                      className="w-full px-4 py-3 bg-zinc-900/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* UTM Parameters */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Campaign Source <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={source}
                          onChange={(e) => setSource(e.target.value)}
                          placeholder="e.g., twitter, newsletter"
                          className="w-full px-4 py-2.5 bg-zinc-900/50 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          list="source-suggestions"
                        />
                        <datalist id="source-suggestions">
                          {defaultSources.map((s) => (
                            <option key={s.value} value={s.value} />
                          ))}
                        </datalist>
                      </div>
                      <p className="text-xs text-zinc-500 mt-1">utm_source: Where traffic comes from</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Campaign Medium <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={medium}
                        onChange={(e) => setMedium(e.target.value)}
                        placeholder="e.g., social, email, cpc"
                        className="w-full px-4 py-2.5 bg-zinc-900/50 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        list="medium-suggestions"
                      />
                      <datalist id="medium-suggestions">
                        {defaultMediums.map((m) => (
                          <option key={m.value} value={m.value} />
                        ))}
                      </datalist>
                      <p className="text-xs text-zinc-500 mt-1">utm_medium: Marketing medium type</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Campaign Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={campaign}
                        onChange={(e) => setCampaign(e.target.value)}
                        placeholder="e.g., spring_sale, product_launch"
                        className="w-full px-4 py-2.5 bg-zinc-900/50 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <p className="text-xs text-zinc-500 mt-1">utm_campaign: Campaign identifier</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Campaign Term <span className="text-zinc-500">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={term}
                        onChange={(e) => setTerm(e.target.value)}
                        placeholder="e.g., running shoes"
                        className="w-full px-4 py-2.5 bg-zinc-900/50 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <p className="text-xs text-zinc-500 mt-1">utm_term: Paid search keywords</p>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-2">
                        Campaign Content <span className="text-zinc-500">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="e.g., header_cta, sidebar_banner"
                        className="w-full px-4 py-2.5 bg-zinc-900/50 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <p className="text-xs text-zinc-500 mt-1">utm_content: Differentiate similar content/links</p>
                    </div>
                  </div>

                  {/* Error */}
                  {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                      {error}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleBuildUrl(false)}
                      className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-medium transition"
                    >
                      Generate URL
                    </button>
                    <button
                      onClick={() => handleBuildUrl(true)}
                      className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-medium transition"
                    >
                      Save Link
                    </button>
                    <button
                      onClick={() => setShowPresetForm(true)}
                      className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-medium transition"
                      title="Save as Preset"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                    </button>
                    <button
                      onClick={clearForm}
                      className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-medium transition text-zinc-400"
                    >
                      Clear
                    </button>
                  </div>

                  {/* Generated URL */}
                  {generatedUrl && (
                    <div className="bg-zinc-900/50 rounded-xl border border-white/10 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Generated URL</span>
                        <button
                          onClick={() => copyToClipboard(generatedUrl, "generated")}
                          className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-sm transition flex items-center gap-1"
                        >
                          {copiedId === "generated" ? (
                            <>
                              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Copied!
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              Copy
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-sm break-all text-indigo-400 bg-zinc-800/50 p-3 rounded-lg font-mono">
                        {generatedUrl}
                      </p>
                    </div>
                  )}
                </div>

                {/* Sidebar - Presets */}
                <div className="space-y-4">
                  <div className="bg-zinc-900/50 rounded-xl border border-white/5 p-4">
                    <h3 className="font-semibold mb-3">Quick Presets</h3>
                    {presets.length === 0 ? (
                      <p className="text-sm text-zinc-400">No presets yet. Save your first one!</p>
                    ) : (
                      <div className="space-y-2">
                        {presets.slice(0, 5).map((preset) => (
                          <button
                            key={preset.id}
                            onClick={() => handleApplyPreset(preset)}
                            className="w-full text-left p-3 bg-white/5 hover:bg-white/10 rounded-lg transition"
                          >
                            <p className="font-medium text-sm">{preset.name}</p>
                            <p className="text-xs text-zinc-500 mt-1">
                              {preset.source} / {preset.medium} / {preset.campaign}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-zinc-900/50 rounded-xl border border-white/5 p-4">
                    <h3 className="font-semibold mb-3">UTM Guide</h3>
                    <div className="space-y-3 text-sm text-zinc-400">
                      <div>
                        <p className="font-medium text-white">Source</p>
                        <p>Identifies which site sent the traffic (google, facebook, newsletter)</p>
                      </div>
                      <div>
                        <p className="font-medium text-white">Medium</p>
                        <p>Identifies the marketing medium (cpc, social, email, organic)</p>
                      </div>
                      <div>
                        <p className="font-medium text-white">Campaign</p>
                        <p>Identifies a specific campaign (spring_sale, new_product)</p>
                      </div>
                      <div>
                        <p className="font-medium text-white">Term</p>
                        <p>Identifies paid search keywords</p>
                      </div>
                      <div>
                        <p className="font-medium text-white">Content</p>
                        <p>Differentiates similar content or links</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Links Tab */}
            {activeTab === "links" && (
              <div className="space-y-4">
                {links.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 mx-auto text-zinc-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <h3 className="text-lg font-medium mb-2">No Saved Links Yet</h3>
                    <p className="text-zinc-400 mb-4">Create and save your first UTM link</p>
                    <button
                      onClick={() => setActiveTab("builder")}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition"
                    >
                      Build a Link
                    </button>
                  </div>
                ) : (
                  <div className="bg-zinc-900/50 rounded-xl border border-white/5 overflow-hidden">
                    <table className="w-full">
                      <thead className="border-b border-white/5">
                        <tr>
                          <th className="text-left text-xs font-medium text-zinc-400 p-4">URL</th>
                          <th className="text-left text-xs font-medium text-zinc-400 p-4">Campaign</th>
                          <th className="text-left text-xs font-medium text-zinc-400 p-4">Source</th>
                          <th className="text-left text-xs font-medium text-zinc-400 p-4">Clicks</th>
                          <th className="text-left text-xs font-medium text-zinc-400 p-4">Created</th>
                          <th className="text-right text-xs font-medium text-zinc-400 p-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {links.map((link) => (
                          <tr key={link.id} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                            <td className="p-4">
                              <p className="text-sm truncate max-w-xs" title={link.originalUrl}>
                                {link.originalUrl}
                              </p>
                            </td>
                            <td className="p-4">
                              <span className="px-2 py-1 bg-indigo-500/20 text-indigo-400 rounded text-xs">
                                {link.campaign}
                              </span>
                            </td>
                            <td className="p-4 text-sm text-zinc-400">{link.source}</td>
                            <td className="p-4 font-medium">{link.clicks}</td>
                            <td className="p-4 text-sm text-zinc-400">
                              {new Date(link.createdAt).toLocaleDateString()}
                            </td>
                            <td className="p-4">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => copyToClipboard(link.fullUrl, link.id)}
                                  className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition"
                                  title="Copy URL"
                                >
                                  {copiedId === link.id ? (
                                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  ) : (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                  )}
                                </button>
                                <button
                                  onClick={() => handleDeleteLink(link.id)}
                                  className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition"
                                  title="Delete"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Presets Tab */}
            {activeTab === "presets" && (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setActiveTab("builder");
                      setShowPresetForm(true);
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Preset
                  </button>
                </div>

                {presets.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 mx-auto text-zinc-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                    <h3 className="text-lg font-medium mb-2">No Presets Yet</h3>
                    <p className="text-zinc-400">Save your frequently used UTM configurations</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {presets.map((preset) => (
                      <div
                        key={preset.id}
                        className="bg-zinc-900/50 rounded-xl border border-white/5 p-4 hover:border-white/10 transition"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold">{preset.name}</h3>
                            <div className="flex flex-wrap gap-2 mt-2">
                              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">
                                {preset.source}
                              </span>
                              <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">
                                {preset.medium}
                              </span>
                              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs">
                                {preset.campaign}
                              </span>
                              {preset.term && (
                                <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs">
                                  {preset.term}
                                </span>
                              )}
                              {preset.content && (
                                <span className="px-2 py-0.5 bg-pink-500/20 text-pink-400 rounded text-xs">
                                  {preset.content}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-zinc-500 mt-2">
                              Used {preset.usageCount} times
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                handleApplyPreset(preset);
                                setActiveTab("builder");
                              }}
                              className="px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 rounded-lg text-sm transition"
                            >
                              Use
                            </button>
                            <button
                              onClick={() => handleDeletePreset(preset.id)}
                              className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition"
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

            {/* Analytics Tab */}
            {activeTab === "analytics" && analytics && (
              <div className="space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-900/50 rounded-xl p-4 border border-white/5">
                    <p className="text-sm text-zinc-400">Total Links</p>
                    <p className="text-2xl font-bold mt-1">{analytics.totalLinks}</p>
                  </div>
                  <div className="bg-zinc-900/50 rounded-xl p-4 border border-white/5">
                    <p className="text-sm text-zinc-400">Total Clicks</p>
                    <p className="text-2xl font-bold mt-1">{analytics.totalClicks}</p>
                  </div>
                </div>

                {/* By Source */}
                <div className="bg-zinc-900/50 rounded-xl border border-white/5 p-4">
                  <h3 className="font-semibold mb-4">By Source</h3>
                  {analytics.bySource.length === 0 ? (
                    <p className="text-zinc-400 text-sm">No data yet</p>
                  ) : (
                    <div className="space-y-3">
                      {analytics.bySource.slice(0, 5).map((item) => (
                        <div key={item.name} className="flex items-center justify-between">
                          <span className="font-medium">{item.name}</span>
                          <div className="flex items-center gap-4 text-sm text-zinc-400">
                            <span>{item.count} links</span>
                            <span className="text-indigo-400">{item.clicks} clicks</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* By Campaign */}
                <div className="bg-zinc-900/50 rounded-xl border border-white/5 p-4">
                  <h3 className="font-semibold mb-4">By Campaign</h3>
                  {analytics.byCampaign.length === 0 ? (
                    <p className="text-zinc-400 text-sm">No data yet</p>
                  ) : (
                    <div className="space-y-3">
                      {analytics.byCampaign.slice(0, 5).map((item) => (
                        <div key={item.name} className="flex items-center justify-between">
                          <span className="font-medium">{item.name}</span>
                          <div className="flex items-center gap-4 text-sm text-zinc-400">
                            <span>{item.count} links</span>
                            <span className="text-indigo-400">{item.clicks} clicks</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Save Preset Modal */}
        {showPresetForm && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 rounded-2xl w-full max-w-md">
              <div className="p-6 border-b border-white/10">
                <h2 className="text-xl font-semibold">Save as Preset</h2>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Preset Name</label>
                  <input
                    type="text"
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    placeholder="e.g., Twitter Campaign"
                    className="w-full px-4 py-2 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-3 text-sm">
                  <p className="text-zinc-400 mb-2">Current values:</p>
                  <p>Source: <span className="text-white">{source || "-"}</span></p>
                  <p>Medium: <span className="text-white">{medium || "-"}</span></p>
                  <p>Campaign: <span className="text-white">{campaign || "-"}</span></p>
                </div>
              </div>
              <div className="p-6 border-t border-white/10 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowPresetForm(false);
                    setPresetName("");
                  }}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg font-medium transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePreset}
                  disabled={!presetName || !source || !medium || !campaign}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 disabled:cursor-not-allowed rounded-lg font-medium transition"
                >
                  Save Preset
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
