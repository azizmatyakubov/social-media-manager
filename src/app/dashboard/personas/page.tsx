"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

interface Persona {
  id: string;
  name: string;
  avatar: string;
  tagline: string;
  demographics: {
    ageRange: [number, number];
    gender: string;
    location: string[];
    occupation: string;
    industry: string;
  };
  psychographics: {
    values: string[];
    interests: string[];
    personality: string[];
    motivations: string[];
  };
  painPoints: string[];
  goals: string[];
  platforms: {
    platform: string;
    usage: string;
    engagementLevel: string;
  }[];
  contentPreferences: {
    formats: string[];
    tone: string[];
    bestTimes: string[];
  };
  score: number;
  status: "draft" | "active" | "archived";
  source: string;
  updatedAt: string;
}

interface PersonaTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  popularity: number;
}

interface Insight {
  id: string;
  personaId: string;
  type: string;
  title: string;
  description: string;
  actionable: string;
  priority: string;
}

interface Stats {
  totalPersonas: number;
  activePersonas: number;
  aiGenerated: number;
  totalInsights: number;
  avgScore: number;
}

export default function PersonasPage() {
  const [activeTab, setActiveTab] = useState<"personas" | "generate" | "templates">("personas");
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [templates, setTemplates] = useState<PersonaTemplate[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [personaInsights, setPersonaInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Generate form state
  const [businessType, setBusinessType] = useState("B2B SaaS");
  const [targetAudience, setTargetAudience] = useState("");
  const [industry, setIndustry] = useState("");
  const [productDescription, setProductDescription] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedPersona) {
      loadInsights(selectedPersona.id);
    }
  }, [selectedPersona]);

  const loadData = async () => {
    try {
      const [personasRes, templatesRes, statsRes] = await Promise.all([
        fetch("/api/audience-personas?action=personas"),
        fetch("/api/audience-personas?action=templates"),
        fetch("/api/audience-personas?action=stats"),
      ]);

      const [personasData, templatesData, statsData] = await Promise.all([
        personasRes.json(),
        templatesRes.json(),
        statsRes.json(),
      ]);

      setPersonas(personasData.personas || []);
      setTemplates(templatesData.templates || []);
      setStats(statsData.stats);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadInsights = async (personaId: string) => {
    try {
      const res = await fetch(`/api/audience-personas?action=insights&personaId=${personaId}`);
      const data = await res.json();
      setPersonaInsights(data.insights || []);
    } catch (error) {
      console.error("Error loading insights:", error);
    }
  };

  const generatePersona = async () => {
    if (!targetAudience || !industry) return;

    setGenerating(true);
    try {
      const res = await fetch("/api/audience-personas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          businessType,
          targetAudience,
          industry,
          productDescription,
        }),
      });

      const data = await res.json();
      if (data.persona) {
        setPersonas([data.persona, ...personas]);
        setSelectedPersona(data.persona);
        setActiveTab("personas");
        loadData();
      }
    } catch (error) {
      console.error("Error generating persona:", error);
    } finally {
      setGenerating(false);
    }
  };

  const createFromTemplate = async (templateId: string) => {
    try {
      const res = await fetch("/api/audience-personas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create-from-template", templateId }),
      });

      const data = await res.json();
      if (data.persona) {
        setPersonas([data.persona, ...personas]);
        setSelectedPersona(data.persona);
        setActiveTab("personas");
      }
    } catch (error) {
      console.error("Error creating from template:", error);
    }
  };

  const duplicatePersona = async (personaId: string) => {
    try {
      const res = await fetch("/api/audience-personas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "duplicate", personaId }),
      });

      const data = await res.json();
      if (data.persona) {
        setPersonas([data.persona, ...personas]);
      }
    } catch (error) {
      console.error("Error duplicating persona:", error);
    }
  };

  const togglePersonaStatus = async (personaId: string, currentStatus: string) => {
    const action = currentStatus === "active" ? "archive" : "activate";
    try {
      const res = await fetch("/api/audience-personas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, personaId }),
      });

      const data = await res.json();
      if (data.persona) {
        setPersonas(personas.map((p) => (p.id === personaId ? data.persona : p)));
        if (selectedPersona?.id === personaId) {
          setSelectedPersona(data.persona);
        }
      }
    } catch (error) {
      console.error("Error updating persona:", error);
    }
  };

  const deletePersona = async (personaId: string) => {
    try {
      await fetch("/api/audience-personas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", personaId }),
      });
      setPersonas(personas.filter((p) => p.id !== personaId));
      if (selectedPersona?.id === personaId) {
        setSelectedPersona(null);
      }
      loadData();
    } catch (error) {
      console.error("Error deleting persona:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-green-400 bg-green-500/20";
      case "draft":
        return "text-yellow-400 bg-yellow-500/20";
      case "archived":
        return "text-zinc-400 bg-zinc-500/20";
      default:
        return "text-zinc-400 bg-zinc-500/20";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-red-400 bg-red-500/20";
      case "medium":
        return "text-yellow-400 bg-yellow-500/20";
      default:
        return "text-zinc-400 bg-zinc-500/20";
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      b2b: "text-blue-400 bg-blue-500/20",
      b2c: "text-green-400 bg-green-500/20",
      ecommerce: "text-orange-400 bg-orange-500/20",
      saas: "text-purple-400 bg-purple-500/20",
      creator: "text-pink-400 bg-pink-500/20",
      agency: "text-cyan-400 bg-cyan-500/20",
    };
    return colors[category] || "text-zinc-400 bg-zinc-500/20";
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
            <h1 className="text-2xl font-bold">Audience Personas</h1>
            <p className="text-zinc-400 mt-1">AI-powered audience personas for targeted content</p>
          </div>
          <button
            onClick={() => setActiveTab("generate")}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-medium transition flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Generate Persona
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-4 bg-zinc-900/50 rounded-xl border border-white/5">
              <p className="text-zinc-400 text-sm">Total Personas</p>
              <p className="text-2xl font-bold mt-1">{stats.totalPersonas}</p>
            </div>
            <div className="p-4 bg-zinc-900/50 rounded-xl border border-white/5">
              <p className="text-zinc-400 text-sm">Active</p>
              <p className="text-2xl font-bold mt-1">{stats.activePersonas}</p>
            </div>
            <div className="p-4 bg-zinc-900/50 rounded-xl border border-white/5">
              <p className="text-zinc-400 text-sm">AI Generated</p>
              <p className="text-2xl font-bold mt-1">{stats.aiGenerated}</p>
            </div>
            <div className="p-4 bg-zinc-900/50 rounded-xl border border-white/5">
              <p className="text-zinc-400 text-sm">Insights</p>
              <p className="text-2xl font-bold mt-1">{stats.totalInsights}</p>
            </div>
            <div className="p-4 bg-zinc-900/50 rounded-xl border border-white/5">
              <p className="text-zinc-400 text-sm">Avg Score</p>
              <p className="text-2xl font-bold mt-1">{stats.avgScore}%</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 border-b border-white/10 pb-4">
          {[
            { id: "personas", label: "My Personas" },
            { id: "generate", label: "Generate New" },
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

        {/* Personas Tab */}
        {activeTab === "personas" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Persona List */}
            <div className="space-y-4">
              {personas.map((persona) => (
                <button
                  key={persona.id}
                  onClick={() => setSelectedPersona(persona)}
                  className={`w-full p-4 rounded-xl border text-left transition ${
                    selectedPersona?.id === persona.id
                      ? "bg-indigo-500/10 border-indigo-500"
                      : "bg-zinc-900/50 border-white/5 hover:border-white/10"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-lg">
                      {persona.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium truncate">{persona.name}</h4>
                        <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(persona.status)}`}>
                          {persona.status}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-400 truncate">{persona.tagline}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-zinc-500">
                          {persona.demographics.ageRange[0]}-{persona.demographics.ageRange[1]} yrs
                        </span>
                        <span className="text-xs text-zinc-500">•</span>
                        <span className="text-xs text-zinc-500">{persona.demographics.industry}</span>
                        <span className="ml-auto text-xs font-medium text-indigo-400">
                          {persona.score}% match
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}

              {personas.length === 0 && (
                <div className="text-center py-12 text-zinc-500">
                  <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p>No personas yet</p>
                  <p className="text-sm mt-1">Generate your first audience persona</p>
                </div>
              )}
            </div>

            {/* Persona Detail */}
            <div className="lg:col-span-2">
              {selectedPersona ? (
                <div className="space-y-6">
                  {/* Header */}
                  <div className="p-6 bg-zinc-900/50 rounded-xl border border-white/5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-2xl">
                          {selectedPersona.avatar}
                        </div>
                        <div>
                          <h2 className="text-xl font-bold">{selectedPersona.name}</h2>
                          <p className="text-zinc-400">{selectedPersona.tagline}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => duplicatePersona(selectedPersona.id)}
                          className="p-2 hover:bg-white/10 rounded-lg transition"
                          title="Duplicate"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => togglePersonaStatus(selectedPersona.id, selectedPersona.status)}
                          className="p-2 hover:bg-white/10 rounded-lg transition"
                          title={selectedPersona.status === "active" ? "Archive" : "Activate"}
                        >
                          {selectedPersona.status === "active" ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                        </button>
                        <button
                          onClick={() => deletePersona(selectedPersona.id)}
                          className="p-2 hover:bg-white/10 rounded-lg transition text-red-400"
                          title="Delete"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-4 gap-4">
                      <div className="p-3 bg-zinc-800/50 rounded-lg text-center">
                        <p className="text-2xl font-bold text-indigo-400">{selectedPersona.score}%</p>
                        <p className="text-xs text-zinc-400">Match Score</p>
                      </div>
                      <div className="p-3 bg-zinc-800/50 rounded-lg text-center">
                        <p className="text-2xl font-bold">{selectedPersona.platforms.length}</p>
                        <p className="text-xs text-zinc-400">Platforms</p>
                      </div>
                      <div className="p-3 bg-zinc-800/50 rounded-lg text-center">
                        <p className="text-2xl font-bold">{selectedPersona.painPoints.length}</p>
                        <p className="text-xs text-zinc-400">Pain Points</p>
                      </div>
                      <div className="p-3 bg-zinc-800/50 rounded-lg text-center">
                        <p className="text-2xl font-bold">{personaInsights.length}</p>
                        <p className="text-xs text-zinc-400">Insights</p>
                      </div>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Demographics */}
                    <div className="p-4 bg-zinc-900/50 rounded-xl border border-white/5">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Demographics
                      </h3>
                      <div className="space-y-2 text-sm">
                        <p><span className="text-zinc-400">Age:</span> {selectedPersona.demographics.ageRange[0]}-{selectedPersona.demographics.ageRange[1]}</p>
                        <p><span className="text-zinc-400">Gender:</span> {selectedPersona.demographics.gender}</p>
                        <p><span className="text-zinc-400">Occupation:</span> {selectedPersona.demographics.occupation}</p>
                        <p><span className="text-zinc-400">Industry:</span> {selectedPersona.demographics.industry}</p>
                        <p><span className="text-zinc-400">Location:</span> {selectedPersona.demographics.location.join(", ")}</p>
                      </div>
                    </div>

                    {/* Psychographics */}
                    <div className="p-4 bg-zinc-900/50 rounded-xl border border-white/5">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        Psychographics
                      </h3>
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-zinc-400 mb-1">Values</p>
                          <div className="flex flex-wrap gap-1">
                            {selectedPersona.psychographics.values.slice(0, 4).map((v) => (
                              <span key={v} className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs">{v}</span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-zinc-400 mb-1">Personality</p>
                          <div className="flex flex-wrap gap-1">
                            {selectedPersona.psychographics.personality.map((p) => (
                              <span key={p} className="px-2 py-0.5 bg-zinc-700 rounded text-xs">{p}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Pain Points */}
                    <div className="p-4 bg-zinc-900/50 rounded-xl border border-white/5">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Pain Points
                      </h3>
                      <ul className="space-y-1 text-sm">
                        {selectedPersona.painPoints.slice(0, 5).map((point, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-red-400 mt-1">•</span>
                            <span className="text-zinc-300">{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Goals */}
                    <div className="p-4 bg-zinc-900/50 rounded-xl border border-white/5">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                        Goals
                      </h3>
                      <ul className="space-y-1 text-sm">
                        {selectedPersona.goals.slice(0, 5).map((goal, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-green-400 mt-1">•</span>
                            <span className="text-zinc-300">{goal}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Insights */}
                  {personaInsights.length > 0 && (
                    <div className="p-4 bg-zinc-900/50 rounded-xl border border-white/5">
                      <h3 className="font-semibold mb-3">Content Insights</h3>
                      <div className="space-y-3">
                        {personaInsights.map((insight) => (
                          <div key={insight.id} className="p-3 bg-zinc-800/50 rounded-lg">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-sm">{insight.title}</span>
                              <span className={`px-2 py-0.5 rounded text-xs ${getPriorityColor(insight.priority)}`}>
                                {insight.priority}
                              </span>
                            </div>
                            <p className="text-sm text-zinc-400">{insight.description}</p>
                            {insight.actionable && (
                              <p className="text-sm text-indigo-400 mt-2">
                                → {insight.actionable}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-96 text-zinc-500">
                  <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <p>Select a persona to view details</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Generate Tab */}
        {activeTab === "generate" && (
          <div className="max-w-2xl mx-auto">
            <div className="p-6 bg-zinc-900/50 rounded-xl border border-white/5">
              <h3 className="text-lg font-semibold mb-4">Generate AI Persona</h3>
              <p className="text-zinc-400 text-sm mb-6">
                Describe your business and target audience to generate a detailed persona with AI.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Business Type</label>
                  <select
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value)}
                    className="w-full px-4 py-2 bg-zinc-800 rounded-lg border border-white/10 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="B2B SaaS">B2B SaaS</option>
                    <option value="B2B Services">B2B Services</option>
                    <option value="B2C E-commerce">B2C E-commerce</option>
                    <option value="B2C Services">B2C Services</option>
                    <option value="D2C Brand">D2C Brand</option>
                    <option value="Agency">Agency</option>
                    <option value="Creator/Influencer">Creator/Influencer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Target Audience *</label>
                  <input
                    type="text"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    placeholder="e.g., Marketing managers, Small business owners"
                    className="w-full px-4 py-2 bg-zinc-800 rounded-lg border border-white/10 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Industry *</label>
                  <input
                    type="text"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="e.g., Technology, Healthcare, Retail"
                    className="w-full px-4 py-2 bg-zinc-800 rounded-lg border border-white/10 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Product/Service Description</label>
                  <textarea
                    value={productDescription}
                    onChange={(e) => setProductDescription(e.target.value)}
                    placeholder="Briefly describe what you offer..."
                    rows={3}
                    className="w-full px-4 py-2 bg-zinc-800 rounded-lg border border-white/10 focus:border-indigo-500 focus:outline-none resize-none"
                  />
                </div>

                <button
                  onClick={generatePersona}
                  disabled={!targetAudience || !industry || generating}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-medium transition flex items-center justify-center gap-2"
                >
                  {generating ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Generating Persona...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Generate Persona
                    </>
                  )}
                </button>
              </div>
            </div>
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
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2 py-1 rounded text-xs ${getCategoryColor(template.category)}`}>
                    {template.category.toUpperCase()}
                  </span>
                  <div className="flex items-center gap-1 text-yellow-400">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    <span className="text-xs">{template.popularity}%</span>
                  </div>
                </div>
                <h4 className="font-medium mb-1">{template.name}</h4>
                <p className="text-zinc-400 text-sm mb-4">{template.description}</p>
                <button
                  onClick={() => createFromTemplate(template.id)}
                  className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition"
                >
                  Use This Template
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
