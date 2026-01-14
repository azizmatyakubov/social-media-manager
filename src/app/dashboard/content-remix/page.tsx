"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

interface ContentSource {
  id: string;
  type: string;
  title: string;
  content: string;
  platform?: string;
  createdAt: string;
}

interface RemixTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  inputTypes: string[];
  outputFormat: {
    type: string;
    platform: string;
    characterLimit?: number;
    slidesRange?: [number, number];
  };
  popularity: number;
}

interface RemixProject {
  id: string;
  name: string;
  sources: ContentSource[];
  template?: RemixTemplate;
  outputs: RemixOutput[];
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface RemixOutput {
  id: string;
  projectId: string;
  format: {
    type: string;
    platform: string;
  };
  content: string | string[];
  variations: string[][];
  metadata?: {
    estimatedEngagement?: number;
    wordCount?: number;
    hashtags?: string[];
  };
  status: string;
  createdAt: string;
}

interface Stats {
  totalSources: number;
  totalProjects: number;
  totalOutputs: number;
  completedProjects: number;
  approvedOutputs: number;
  mostUsedTemplate: string | null;
}

export default function ContentRemixPage() {
  const [activeTab, setActiveTab] = useState<"remix" | "sources" | "projects" | "templates">("remix");
  const [sources, setSources] = useState<ContentSource[]>([]);
  const [templates, setTemplates] = useState<RemixTemplate[]>([]);
  const [projects, setProjects] = useState<RemixProject[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Quick remix state
  const [quickRemixContent, setQuickRemixContent] = useState("");
  const [quickRemixTitle, setQuickRemixTitle] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<RemixTemplate | null>(null);
  const [generatedOutput, setGeneratedOutput] = useState<RemixOutput | null>(null);

  // Modal states
  const [showNewSourceModal, setShowNewSourceModal] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<RemixProject | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [sourcesRes, templatesRes, projectsRes, statsRes] = await Promise.all([
        fetch("/api/content-remix?action=sources"),
        fetch("/api/content-remix?action=templates"),
        fetch("/api/content-remix?action=projects"),
        fetch("/api/content-remix?action=stats"),
      ]);

      const [sourcesData, templatesData, projectsData, statsData] = await Promise.all([
        sourcesRes.json(),
        templatesRes.json(),
        projectsRes.json(),
        statsRes.json(),
      ]);

      setSources(sourcesData.sources || []);
      setTemplates(templatesData.templates || []);
      setProjects(projectsData.projects || []);
      setStats(statsData.stats);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickRemix = async () => {
    if (!quickRemixContent.trim()) return;

    setGenerating(true);
    try {
      const res = await fetch("/api/content-remix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "quick-remix",
          content: quickRemixContent,
          title: quickRemixTitle || "Quick Remix",
          type: "text",
          templateId: selectedTemplate?.id,
          outputFormat: selectedTemplate?.outputFormat,
        }),
      });

      const data = await res.json();
      if (data.output) {
        setGeneratedOutput(data.output);
        loadData(); // Refresh to show new source/project
      }
    } catch (error) {
      console.error("Error generating remix:", error);
    } finally {
      setGenerating(false);
    }
  };

  const createSource = async (type: string, title: string, content: string, platform?: string) => {
    try {
      const res = await fetch("/api/content-remix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-source",
          type,
          title,
          content,
          platform,
        }),
      });

      const data = await res.json();
      if (data.source) {
        setSources([data.source, ...sources]);
        setShowNewSourceModal(false);
      }
    } catch (error) {
      console.error("Error creating source:", error);
    }
  };

  const deleteSource = async (sourceId: string) => {
    try {
      await fetch("/api/content-remix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete-source", sourceId }),
      });
      setSources(sources.filter((s) => s.id !== sourceId));
    } catch (error) {
      console.error("Error deleting source:", error);
    }
  };

  const createProject = async (name: string, sourceIds: string[], templateId?: string) => {
    try {
      const res = await fetch("/api/content-remix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-project",
          name,
          sourceIds,
          templateId,
        }),
      });

      const data = await res.json();
      if (data.project) {
        setProjects([data.project, ...projects]);
        setShowNewProjectModal(false);
      }
    } catch (error) {
      console.error("Error creating project:", error);
    }
  };

  const generateProjectRemix = async (projectId: string) => {
    setGenerating(true);
    try {
      const res = await fetch("/api/content-remix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate-remix", projectId }),
      });

      const data = await res.json();
      if (data.output) {
        loadData();
        setSelectedProject(projects.find((p) => p.id === projectId) || null);
      }
    } catch (error) {
      console.error("Error generating remix:", error);
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "transform":
        return "text-blue-400 bg-blue-500/20";
      case "expand":
        return "text-green-400 bg-green-500/20";
      case "condense":
        return "text-orange-400 bg-orange-500/20";
      case "mashup":
        return "text-purple-400 bg-purple-500/20";
      case "repurpose":
        return "text-pink-400 bg-pink-500/20";
      default:
        return "text-zinc-400 bg-zinc-500/20";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "article":
        return "📝";
      case "video_script":
        return "🎬";
      case "thread":
        return "🧵";
      case "transcript":
        return "🎙️";
      case "post":
        return "📱";
      default:
        return "📄";
    }
  };

  const formatOutputType = (type: string) => {
    return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Content Remix</h1>
            <p className="text-zinc-400 mt-1">Transform and repurpose your content for different platforms</p>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-4 bg-zinc-900/50 rounded-xl border border-white/5">
              <p className="text-zinc-400 text-sm">Sources</p>
              <p className="text-2xl font-bold mt-1">{stats.totalSources}</p>
            </div>
            <div className="p-4 bg-zinc-900/50 rounded-xl border border-white/5">
              <p className="text-zinc-400 text-sm">Projects</p>
              <p className="text-2xl font-bold mt-1">{stats.totalProjects}</p>
            </div>
            <div className="p-4 bg-zinc-900/50 rounded-xl border border-white/5">
              <p className="text-zinc-400 text-sm">Remixes Created</p>
              <p className="text-2xl font-bold mt-1">{stats.totalOutputs}</p>
            </div>
            <div className="p-4 bg-zinc-900/50 rounded-xl border border-white/5">
              <p className="text-zinc-400 text-sm">Approved</p>
              <p className="text-2xl font-bold mt-1">{stats.approvedOutputs}</p>
            </div>
            <div className="p-4 bg-zinc-900/50 rounded-xl border border-white/5">
              <p className="text-zinc-400 text-sm">Favorite Template</p>
              <p className="text-sm font-medium mt-1 truncate">{stats.mostUsedTemplate || "None yet"}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 border-b border-white/10 pb-4">
          {[
            { id: "remix", label: "Quick Remix" },
            { id: "sources", label: "Content Sources" },
            { id: "projects", label: "Projects" },
            { id: "templates", label: "Templates" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                activeTab === tab.id
                  ? "bg-indigo-600 text-white"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Quick Remix Tab */}
        {activeTab === "remix" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input */}
            <div className="space-y-4">
              <div className="p-6 bg-zinc-900/50 rounded-xl border border-white/5">
                <h3 className="font-semibold mb-4">Paste Your Content</h3>
                <input
                  type="text"
                  value={quickRemixTitle}
                  onChange={(e) => setQuickRemixTitle(e.target.value)}
                  placeholder="Content title (optional)"
                  className="w-full px-4 py-2 mb-4 bg-zinc-800 rounded-lg border border-white/10 focus:border-indigo-500 focus:outline-none"
                />
                <textarea
                  value={quickRemixContent}
                  onChange={(e) => setQuickRemixContent(e.target.value)}
                  placeholder="Paste your blog post, video script, article, or any content you want to repurpose..."
                  rows={12}
                  className="w-full px-4 py-3 bg-zinc-800 rounded-lg border border-white/10 focus:border-indigo-500 focus:outline-none resize-none"
                />
                <p className="text-xs text-zinc-500 mt-2">
                  {quickRemixContent.length} characters • ~{Math.ceil(quickRemixContent.split(" ").filter(Boolean).length / 200)} min read
                </p>
              </div>

              {/* Template Selection */}
              <div className="p-6 bg-zinc-900/50 rounded-xl border border-white/5">
                <h3 className="font-semibold mb-4">Choose a Template</h3>
                <div className="grid grid-cols-2 gap-3">
                  {templates.slice(0, 6).map((template) => (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template)}
                      className={`p-3 rounded-lg text-left transition border ${
                        selectedTemplate?.id === template.id
                          ? "border-indigo-500 bg-indigo-500/10"
                          : "border-white/5 bg-zinc-800/50 hover:bg-zinc-800"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{template.name}</span>
                        <span className={`px-1.5 py-0.5 rounded text-xs ${getCategoryColor(template.category)}`}>
                          {template.category}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 line-clamp-2">{template.description}</p>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setActiveTab("templates")}
                  className="w-full mt-3 py-2 text-sm text-zinc-400 hover:text-white transition"
                >
                  View all templates →
                </button>
              </div>

              <button
                onClick={handleQuickRemix}
                disabled={!quickRemixContent.trim() || generating}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-medium transition flex items-center justify-center gap-2"
              >
                {generating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Generate Remix
                  </>
                )}
              </button>
            </div>

            {/* Output */}
            <div className="p-6 bg-zinc-900/50 rounded-xl border border-white/5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Generated Output</h3>
                {generatedOutput && (
                  <span className={`px-2 py-1 rounded text-xs ${getCategoryColor(generatedOutput.format.type)}`}>
                    {formatOutputType(generatedOutput.format.type)}
                  </span>
                )}
              </div>

              {generatedOutput ? (
                <div className="space-y-4">
                  {/* Metadata */}
                  {generatedOutput.metadata && (
                    <div className="flex flex-wrap gap-2 p-3 bg-zinc-800/50 rounded-lg">
                      {generatedOutput.metadata.estimatedEngagement && (
                        <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">
                          {generatedOutput.metadata.estimatedEngagement}% engagement potential
                        </span>
                      )}
                      {generatedOutput.metadata.wordCount && (
                        <span className="px-2 py-1 bg-zinc-700 rounded text-xs">
                          {generatedOutput.metadata.wordCount} words
                        </span>
                      )}
                      {generatedOutput.metadata.hashtags?.map((tag) => (
                        <span key={tag} className="px-2 py-1 bg-indigo-500/20 text-indigo-400 rounded text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Content */}
                  <div className="max-h-[400px] overflow-y-auto space-y-3">
                    {Array.isArray(generatedOutput.content) ? (
                      generatedOutput.content.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-zinc-800 rounded-lg group relative"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-indigo-400 text-xs font-mono">
                              {idx + 1}/{generatedOutput.content.length}
                            </span>
                            <button
                              onClick={() => copyToClipboard(item)}
                              className="p-1 hover:bg-white/10 rounded transition opacity-0 group-hover:opacity-100"
                              title="Copy"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                          </div>
                          <p className="text-sm mt-1 whitespace-pre-wrap">{item}</p>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 bg-zinc-800 rounded-lg relative group">
                        <button
                          onClick={() => copyToClipboard(generatedOutput.content as string)}
                          className="absolute top-2 right-2 p-1 hover:bg-white/10 rounded transition opacity-0 group-hover:opacity-100"
                          title="Copy"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                        <p className="text-sm whitespace-pre-wrap">{generatedOutput.content}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-4 border-t border-white/5">
                    <button
                      onClick={() =>
                        copyToClipboard(
                          Array.isArray(generatedOutput.content)
                            ? generatedOutput.content.join("\n\n")
                            : generatedOutput.content
                        )
                      }
                      className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy All
                    </button>
                    <button
                      onClick={handleQuickRemix}
                      className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm transition flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Regenerate
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
                  <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <p className="text-center">Paste content and select a template to generate your remix</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sources Tab */}
        {activeTab === "sources" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() => setShowNewSourceModal(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Source
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sources.map((source) => (
                <div
                  key={source.id}
                  className="p-4 bg-zinc-900/50 rounded-xl border border-white/5 hover:border-white/10 transition"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-2xl">{getTypeIcon(source.type)}</span>
                    <button
                      onClick={() => deleteSource(source.id)}
                      className="p-1 hover:bg-white/10 rounded transition text-zinc-400 hover:text-red-400"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  <h4 className="font-medium mb-1">{source.title}</h4>
                  <p className="text-zinc-400 text-sm line-clamp-3">{source.content}</p>
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5">
                    <span className="text-xs text-zinc-500 capitalize">{source.type.replace("_", " ")}</span>
                    <span className="text-xs text-zinc-500">
                      {new Date(source.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {sources.length === 0 && (
              <div className="text-center py-12 text-zinc-500">
                <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p>No content sources yet</p>
                <p className="text-sm mt-1">Add your first piece of content to remix</p>
              </div>
            )}
          </div>
        )}

        {/* Projects Tab */}
        {activeTab === "projects" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() => setShowNewProjectModal(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                New Project
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="p-4 bg-zinc-900/50 rounded-xl border border-white/5"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium">{project.name}</h4>
                      <p className="text-xs text-zinc-500">
                        {project.sources.length} sources • {project.outputs.length} outputs
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        project.status === "completed"
                          ? "bg-green-500/20 text-green-400"
                          : project.status === "processing"
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-zinc-500/20 text-zinc-400"
                      }`}
                    >
                      {project.status}
                    </span>
                  </div>

                  {project.template && (
                    <div className="p-2 bg-zinc-800/50 rounded-lg mb-3">
                      <p className="text-xs text-zinc-400">Template: {project.template.name}</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => generateProjectRemix(project.id)}
                      disabled={generating || project.sources.length === 0}
                      className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg text-sm transition"
                    >
                      Generate Remix
                    </button>
                    <button
                      onClick={() => setSelectedProject(project)}
                      className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {projects.length === 0 && (
              <div className="text-center py-12 text-zinc-500">
                <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <p>No remix projects yet</p>
                <p className="text-sm mt-1">Create a project to organize your remixes</p>
              </div>
            )}
          </div>
        )}

        {/* Templates Tab */}
        {activeTab === "templates" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <div
                key={template.id}
                className="p-4 bg-zinc-900/50 rounded-xl border border-white/5 hover:border-white/10 transition"
              >
                <div className="flex items-start justify-between mb-2">
                  <span className={`px-2 py-1 rounded text-xs ${getCategoryColor(template.category)}`}>
                    {template.category}
                  </span>
                  <div className="flex items-center gap-1 text-yellow-400">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    <span className="text-xs">{template.popularity}%</span>
                  </div>
                </div>
                <h4 className="font-medium mb-1">{template.name}</h4>
                <p className="text-zinc-400 text-sm mb-3">{template.description}</p>
                <div className="flex flex-wrap gap-1 mb-3">
                  {template.inputTypes.map((type) => (
                    <span key={type} className="px-2 py-0.5 bg-zinc-800 rounded text-xs text-zinc-400">
                      {type}
                    </span>
                  ))}
                  <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 rounded text-xs">
                    → {formatOutputType(template.outputFormat.type)}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setSelectedTemplate(template);
                    setActiveTab("remix");
                  }}
                  className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition"
                >
                  Use Template
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Source Modal */}
      {showNewSourceModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-xl border border-white/10 p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold mb-4">Add Content Source</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                createSource(
                  (form.elements.namedItem("type") as HTMLSelectElement).value,
                  (form.elements.namedItem("title") as HTMLInputElement).value,
                  (form.elements.namedItem("content") as HTMLTextAreaElement).value,
                  (form.elements.namedItem("platform") as HTMLInputElement).value || undefined
                );
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Type</label>
                  <select
                    name="type"
                    className="w-full px-4 py-2 bg-zinc-800 rounded-lg border border-white/10 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="text">Text</option>
                    <option value="article">Article</option>
                    <option value="post">Social Post</option>
                    <option value="thread">Thread</option>
                    <option value="video_script">Video Script</option>
                    <option value="transcript">Transcript</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Platform (optional)</label>
                  <input
                    name="platform"
                    className="w-full px-4 py-2 bg-zinc-800 rounded-lg border border-white/10 focus:border-indigo-500 focus:outline-none"
                    placeholder="e.g., blog, youtube"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Title</label>
                <input
                  name="title"
                  required
                  className="w-full px-4 py-2 bg-zinc-800 rounded-lg border border-white/10 focus:border-indigo-500 focus:outline-none"
                  placeholder="Content title"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Content</label>
                <textarea
                  name="content"
                  required
                  rows={8}
                  className="w-full px-4 py-2 bg-zinc-800 rounded-lg border border-white/10 focus:border-indigo-500 focus:outline-none resize-none"
                  placeholder="Paste your content here..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewSourceModal(false)}
                  className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition"
                >
                  Add Source
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Project Modal */}
      {showNewProjectModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-xl border border-white/10 p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold mb-4">Create Remix Project</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const sourceCheckboxes = form.querySelectorAll<HTMLInputElement>('input[name="sources"]:checked');
                const sourceIds = Array.from(sourceCheckboxes).map((cb) => cb.value);
                createProject(
                  (form.elements.namedItem("name") as HTMLInputElement).value,
                  sourceIds,
                  (form.elements.namedItem("template") as HTMLSelectElement).value || undefined
                );
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Project Name</label>
                <input
                  name="name"
                  required
                  className="w-full px-4 py-2 bg-zinc-800 rounded-lg border border-white/10 focus:border-indigo-500 focus:outline-none"
                  placeholder="e.g., Q1 Content Campaign"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Template (optional)</label>
                <select
                  name="template"
                  className="w-full px-4 py-2 bg-zinc-800 rounded-lg border border-white/10 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">Select a template...</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Content Sources</label>
                <div className="max-h-48 overflow-y-auto space-y-2 p-3 bg-zinc-800/50 rounded-lg">
                  {sources.length > 0 ? (
                    sources.map((source) => (
                      <label key={source.id} className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          name="sources"
                          value={source.id}
                          className="mt-1 rounded border-white/10 bg-zinc-800"
                        />
                        <div>
                          <p className="text-sm font-medium">{source.title}</p>
                          <p className="text-xs text-zinc-500 capitalize">{source.type.replace("_", " ")}</p>
                        </div>
                      </label>
                    ))
                  ) : (
                    <p className="text-sm text-zinc-500 text-center py-4">
                      No sources available. Add content sources first.
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewProjectModal(false)}
                  className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Project Detail Modal */}
      {selectedProject && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-xl border border-white/10 p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">{selectedProject.name}</h3>
                <p className="text-sm text-zinc-400">
                  {selectedProject.sources.length} sources • {selectedProject.outputs.length} outputs
                </p>
              </div>
              <button
                onClick={() => setSelectedProject(null)}
                className="p-2 hover:bg-white/10 rounded-lg transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {selectedProject.outputs.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-medium">Generated Outputs</h4>
                {selectedProject.outputs.map((output) => (
                  <div key={output.id} className="p-4 bg-zinc-800/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-2 py-1 rounded text-xs ${getCategoryColor(output.format.type)}`}>
                        {formatOutputType(output.format.type)}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {new Date(output.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {Array.isArray(output.content) ? (
                        <div className="space-y-2">
                          {output.content.slice(0, 3).map((item, idx) => (
                            <p key={idx} className="text-sm text-zinc-300">{item}</p>
                          ))}
                          {output.content.length > 3 && (
                            <p className="text-xs text-zinc-500">
                              +{output.content.length - 3} more items
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-zinc-300 line-clamp-5">{output.content}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  generateProjectRemix(selectedProject.id);
                }}
                disabled={generating}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition"
              >
                {generating ? "Generating..." : "Generate New Remix"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
