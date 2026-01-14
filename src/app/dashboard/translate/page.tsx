"use client";

import { useState, useEffect } from "react";
import {
  LanguageIcon,
  GlobeAltIcon,
  DocumentDuplicateIcon,
  SparklesIcon,
  ArrowsRightLeftIcon,
  FolderIcon,
  BookOpenIcon,
  PlusIcon,
  CheckCircleIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

interface LanguageInfo {
  code: string;
  name: string;
  nativeName: string;
  rtl: boolean;
  supported: boolean;
}

interface TranslationResult {
  originalText: string;
  originalLanguage: string;
  translatedText: string;
  targetLanguage: string;
  confidence: number;
  localizations: {
    hashtags: string[];
    emojis: string[];
    culturalNotes: string[];
  };
}

interface TranslationProject {
  id: string;
  name: string;
  description?: string;
  sourceLanguage: string;
  targetLanguages: string[];
  content: any[];
  createdAt: string;
  updatedAt: string;
}

interface TranslationMemory {
  id: string;
  sourcePhrase: string;
  sourceLanguage: string;
  translations: Record<string, string>;
  usageCount: number;
}

const PLATFORMS = [
  { value: "twitter", label: "X (Twitter)", limit: 280 },
  { value: "instagram", label: "Instagram", limit: 2200 },
  { value: "facebook", label: "Facebook", limit: 63206 },
  { value: "linkedin", label: "LinkedIn", limit: 3000 },
  { value: "tiktok", label: "TikTok", limit: 2200 },
];

export default function TranslatePage() {
  const [activeTab, setActiveTab] = useState<"translate" | "projects" | "memory">("translate");
  const [languages, setLanguages] = useState<LanguageInfo[]>([]);
  const [projects, setProjects] = useState<TranslationProject[]>([]);
  const [memories, setMemories] = useState<TranslationMemory[]>([]);
  const [loading, setLoading] = useState(false);

  // Translate form
  const [sourceText, setSourceText] = useState("");
  const [sourceLanguage, setSourceLanguage] = useState("auto");
  const [targetLanguage, setTargetLanguage] = useState("es");
  const [platform, setPlatform] = useState("general");
  const [translationResult, setTranslationResult] = useState<TranslationResult | null>(null);
  const [alternatives, setAlternatives] = useState<{ text: string; style: string; formality: string }[]>([]);

  // Multi-translate
  const [multiTargets, setMultiTargets] = useState<string[]>(["es", "fr", "de"]);
  const [multiResults, setMultiResults] = useState<Record<string, TranslationResult>>({});

  // Project form
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectSourceLang, setProjectSourceLang] = useState("en");
  const [projectTargetLangs, setProjectTargetLangs] = useState<string[]>([]);
  const [selectedProject, setSelectedProject] = useState<TranslationProject | null>(null);
  const [newContent, setNewContent] = useState("");

  useEffect(() => {
    fetchLanguages();
    fetchProjects();
    fetchMemories();
  }, []);

  const fetchLanguages = async () => {
    try {
      const response = await fetch("/api/translate?action=languages");
      const data = await response.json();
      setLanguages(data.languages || []);
    } catch (error) {
      console.error("Failed to fetch languages:", error);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await fetch("/api/translate?action=projects");
      const data = await response.json();
      setProjects(data.projects || []);
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    }
  };

  const fetchMemories = async () => {
    try {
      const response = await fetch("/api/translate?action=memories");
      const data = await response.json();
      setMemories(data.memories || []);
    } catch (error) {
      console.error("Failed to fetch memories:", error);
    }
  };

  const translateText = async () => {
    if (!sourceText || !targetLanguage) return;

    setLoading(true);
    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "translate",
          text: sourceText,
          targetLanguage,
          sourceLanguage: sourceLanguage === "auto" ? undefined : sourceLanguage,
          platform: platform !== "general" ? platform : undefined,
          preserveHashtags: true,
          preserveMentions: true,
          adaptTone: true,
        }),
      });

      const data = await response.json();
      setTranslationResult(data.translation);
      setAlternatives([]);
    } catch (error) {
      console.error("Failed to translate:", error);
    } finally {
      setLoading(false);
    }
  };

  const getAlternatives = async () => {
    if (!sourceText || !targetLanguage) return;

    setLoading(true);
    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "alternatives",
          text: sourceText,
          targetLanguage,
          count: 3,
        }),
      });

      const data = await response.json();
      setAlternatives(data.alternatives || []);
    } catch (error) {
      console.error("Failed to get alternatives:", error);
    } finally {
      setLoading(false);
    }
  };

  const quickTranslate = async () => {
    if (!sourceText || multiTargets.length === 0) return;

    setLoading(true);
    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "quick-translate",
          text: sourceText,
          targetLanguages: multiTargets,
        }),
      });

      const data = await response.json();
      setMultiResults(data.translations || {});
    } catch (error) {
      console.error("Failed to quick translate:", error);
    } finally {
      setLoading(false);
    }
  };

  const createProject = async () => {
    if (!projectName || projectTargetLangs.length === 0) return;

    setLoading(true);
    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-project",
          name: projectName,
          description: projectDescription,
          sourceLanguage: projectSourceLang,
          targetLanguages: projectTargetLangs,
        }),
      });

      if (response.ok) {
        await fetchProjects();
        setProjectName("");
        setProjectDescription("");
        setProjectTargetLangs([]);
      }
    } catch (error) {
      console.error("Failed to create project:", error);
    } finally {
      setLoading(false);
    }
  };

  const addContentToProject = async () => {
    if (!selectedProject || !newContent) return;

    setLoading(true);
    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add-content",
          projectId: selectedProject.id,
          originalText: newContent,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedProject(data.project);
        setNewContent("");
        await fetchProjects();
      }
    } catch (error) {
      console.error("Failed to add content:", error);
    } finally {
      setLoading(false);
    }
  };

  const autoTranslateProject = async () => {
    if (!selectedProject) return;

    setLoading(true);
    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "auto-translate-project",
          projectId: selectedProject.id,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedProject(data.project);
        await fetchProjects();
      }
    } catch (error) {
      console.error("Failed to auto-translate:", error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getLanguageName = (code: string) => {
    return languages.find((l) => l.code === code)?.name || code;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <LanguageIcon className="w-7 h-7 text-indigo-400" />
          Content Translation
        </h1>
        <p className="text-zinc-400 mt-1">
          Translate and localize your content for global audiences
        </p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-zinc-900/50 p-1 rounded-lg w-fit">
        {[
          { id: "translate", label: "Translate", icon: ArrowsRightLeftIcon },
          { id: "projects", label: "Projects", icon: FolderIcon },
          { id: "memory", label: "Memory", icon: BookOpenIcon },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
              activeTab === id
                ? "bg-indigo-600 text-white"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Translate Tab */}
      {activeTab === "translate" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Translation Form */}
          <div className="space-y-6">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <GlobeAltIcon className="w-5 h-5 text-indigo-400" />
                Single Translation
              </h2>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">From</label>
                    <select
                      value={sourceLanguage}
                      onChange={(e) => setSourceLanguage(e.target.value)}
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="auto">Auto-detect</option>
                      {languages.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.name} ({lang.nativeName})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">To</label>
                    <select
                      value={targetLanguage}
                      onChange={(e) => setTargetLanguage(e.target.value)}
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                    >
                      {languages.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.name} ({lang.nativeName})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Platform (optional)</label>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="general">General</option>
                    {PLATFORMS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label} ({p.limit} chars)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Source Text</label>
                  <textarea
                    value={sourceText}
                    onChange={(e) => setSourceText(e.target.value)}
                    rows={5}
                    placeholder="Enter text to translate..."
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                  />
                  <p className="text-xs text-zinc-500 mt-1">{sourceText.length} characters</p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={translateText}
                    disabled={loading || !sourceText}
                    className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {loading ? "Translating..." : "Translate"}
                  </button>
                  <button
                    onClick={getAlternatives}
                    disabled={loading || !sourceText}
                    className="px-4 py-3 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 disabled:opacity-50"
                  >
                    <SparklesIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Multi-language */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <DocumentDuplicateIcon className="w-5 h-5 text-green-400" />
                Multi-language Translation
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Target Languages</label>
                  <div className="flex flex-wrap gap-2">
                    {languages.slice(0, 12).map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setMultiTargets((prev) =>
                            prev.includes(lang.code)
                              ? prev.filter((l) => l !== lang.code)
                              : [...prev, lang.code]
                          );
                        }}
                        className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                          multiTargets.includes(lang.code)
                            ? "bg-indigo-600 text-white"
                            : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                        }`}
                      >
                        {lang.name}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={quickTranslate}
                  disabled={loading || !sourceText || multiTargets.length === 0}
                  className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? "Translating..." : `Translate to ${multiTargets.length} Languages`}
                </button>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="space-y-6">
            {/* Single Translation Result */}
            {translationResult && (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white">Translation Result</h2>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-zinc-500">Confidence:</span>
                    <span className={`font-medium ${
                      translationResult.confidence > 0.8 ? "text-green-400" :
                      translationResult.confidence > 0.5 ? "text-yellow-400" : "text-red-400"
                    }`}>
                      {Math.round(translationResult.confidence * 100)}%
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-zinc-500">
                        {getLanguageName(translationResult.originalLanguage)} → {getLanguageName(translationResult.targetLanguage)}
                      </span>
                      <button
                        onClick={() => copyToClipboard(translationResult.translatedText)}
                        className="text-xs text-indigo-400 hover:text-indigo-300"
                      >
                        Copy
                      </button>
                    </div>
                    <div className="p-4 bg-zinc-800/50 rounded-lg">
                      <p className="text-white">{translationResult.translatedText}</p>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">
                      {translationResult.translatedText.length} characters
                    </p>
                  </div>

                  {translationResult.localizations.hashtags.length > 0 && (
                    <div>
                      <p className="text-xs text-zinc-500 mb-2">Localized Hashtags</p>
                      <div className="flex flex-wrap gap-2">
                        {translationResult.localizations.hashtags.map((tag, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded text-sm cursor-pointer hover:bg-indigo-500/30"
                            onClick={() => copyToClipboard(tag)}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {translationResult.localizations.culturalNotes.length > 0 && (
                    <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                      <p className="text-xs text-yellow-400 font-medium mb-1">Cultural Notes</p>
                      <ul className="text-sm text-zinc-300 space-y-1">
                        {translationResult.localizations.culturalNotes.map((note, i) => (
                          <li key={i}>• {note}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Alternatives */}
            {alternatives.length > 0 && (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Alternative Translations</h2>
                <div className="space-y-3">
                  {alternatives.map((alt, i) => (
                    <div key={i} className="p-4 bg-zinc-800/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 bg-zinc-700 rounded text-xs text-zinc-300">
                          {alt.style}
                        </span>
                        <span className="px-2 py-0.5 bg-zinc-700 rounded text-xs text-zinc-300">
                          {alt.formality}
                        </span>
                      </div>
                      <p className="text-white text-sm">{alt.text}</p>
                      <button
                        onClick={() => copyToClipboard(alt.text)}
                        className="text-xs text-indigo-400 hover:text-indigo-300 mt-2"
                      >
                        Copy
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Multi-language Results */}
            {Object.keys(multiResults).length > 0 && (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Multi-language Results</h2>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {Object.entries(multiResults).map(([lang, result]) => (
                    <div key={lang} className="p-4 bg-zinc-800/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-indigo-400">
                          {getLanguageName(lang)}
                        </span>
                        <button
                          onClick={() => copyToClipboard(result.translatedText)}
                          className="text-xs text-zinc-400 hover:text-white"
                        >
                          Copy
                        </button>
                      </div>
                      <p className="text-white text-sm">{result.translatedText}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Projects Tab */}
      {activeTab === "projects" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create Project */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <PlusIcon className="w-5 h-5 text-indigo-400" />
              Create Project
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Project Name</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g., Q1 Campaign"
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Description (optional)</label>
                <input
                  type="text"
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="Project description..."
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Source Language</label>
                <select
                  value={projectSourceLang}
                  onChange={(e) => setProjectSourceLang(e.target.value)}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                >
                  {languages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Target Languages</label>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {languages.filter((l) => l.code !== projectSourceLang).map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setProjectTargetLangs((prev) =>
                          prev.includes(lang.code)
                            ? prev.filter((l) => l !== lang.code)
                            : [...prev, lang.code]
                        );
                      }}
                      className={`px-2 py-1 rounded text-xs transition-colors ${
                        projectTargetLangs.includes(lang.code)
                          ? "bg-indigo-600 text-white"
                          : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                      }`}
                    >
                      {lang.name}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={createProject}
                disabled={loading || !projectName || projectTargetLangs.length === 0}
                className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                Create Project
              </button>
            </div>
          </div>

          {/* Project List */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Your Projects</h2>

            {projects.length === 0 ? (
              <p className="text-zinc-500 text-center py-8">No projects yet</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    onClick={() => setSelectedProject(project)}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      selectedProject?.id === project.id
                        ? "bg-indigo-500/10 border-indigo-500/30"
                        : "bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800"
                    }`}
                  >
                    <h3 className="text-white font-medium">{project.name}</h3>
                    {project.description && (
                      <p className="text-sm text-zinc-400 mt-1">{project.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-zinc-500">
                        {getLanguageName(project.sourceLanguage)} →
                      </span>
                      <div className="flex gap-1">
                        {project.targetLanguages.slice(0, 3).map((lang) => (
                          <span
                            key={lang}
                            className="px-1.5 py-0.5 bg-zinc-700 rounded text-xs text-zinc-300"
                          >
                            {lang}
                          </span>
                        ))}
                        {project.targetLanguages.length > 3 && (
                          <span className="text-xs text-zinc-500">
                            +{project.targetLanguages.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2 text-xs text-zinc-500">
                      <span>{project.content.length} items</span>
                      <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Project Details */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            {selectedProject ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <h2 className="text-lg font-semibold text-white">{selectedProject.name}</h2>
                  <button
                    onClick={autoTranslateProject}
                    disabled={loading || selectedProject.content.length === 0}
                    className="px-3 py-1.5 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {loading ? "Translating..." : "Auto-Translate All"}
                  </button>
                </div>

                {/* Add Content */}
                <div className="space-y-2">
                  <textarea
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    rows={3}
                    placeholder="Add content to translate..."
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={addContentToProject}
                    disabled={loading || !newContent}
                    className="w-full px-3 py-2 bg-zinc-700 text-white rounded text-sm hover:bg-zinc-600 disabled:opacity-50"
                  >
                    Add Content
                  </button>
                </div>

                {/* Content List */}
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {selectedProject.content.map((content: any) => (
                    <div key={content.id} className="p-3 bg-zinc-800/50 rounded-lg">
                      <p className="text-sm text-white mb-2">{content.originalText}</p>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(content.translations).map(([lang, trans]: [string, any]) => (
                          <span
                            key={lang}
                            className={`px-2 py-0.5 rounded text-xs ${
                              trans.status === "approved" ? "bg-green-500/20 text-green-400" :
                              trans.status === "translated" ? "bg-blue-500/20 text-blue-400" :
                              "bg-zinc-700 text-zinc-400"
                            }`}
                          >
                            {lang}: {trans.status}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-zinc-500 text-center py-8">Select a project to view details</p>
            )}
          </div>
        </div>
      )}

      {/* Memory Tab */}
      {activeTab === "memory" && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <BookOpenIcon className="w-5 h-5 text-indigo-400" />
            Translation Memory
          </h2>

          <p className="text-zinc-400 text-sm mb-4">
            Your translation history is saved here for consistency. Frequently used translations appear at the top.
          </p>

          {memories.length === 0 ? (
            <p className="text-zinc-500 text-center py-8">No translations saved yet. Start translating to build your memory.</p>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {memories.map((memory) => (
                <div key={memory.id} className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-zinc-700 rounded text-xs text-zinc-300">
                        {getLanguageName(memory.sourceLanguage)}
                      </span>
                      <span className="text-xs text-zinc-500">Used {memory.usageCount}x</span>
                    </div>
                  </div>
                  <p className="text-white text-sm mb-2">{memory.sourcePhrase}</p>
                  <div className="space-y-1">
                    {Object.entries(memory.translations).map(([lang, text]) => (
                      <div key={lang} className="flex items-start gap-2 text-sm">
                        <span className="text-indigo-400 font-medium min-w-[30px]">{lang}:</span>
                        <span className="text-zinc-300">{text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
