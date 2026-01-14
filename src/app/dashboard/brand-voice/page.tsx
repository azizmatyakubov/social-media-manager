"use client";

import { useState, useEffect } from "react";
import {
  MessageSquare,
  Plus,
  Trash2,
  Settings,
  Sparkles,
  Check,
  X,
  AlertTriangle,
  Wand2,
  Copy,
  FileText,
  Target,
  Zap,
  RefreshCw,
} from "lucide-react";

interface BrandVoiceProfile {
  id: string;
  userId: string;
  name: string;
  description?: string;
  tone: string[];
  personality: string[];
  vocabulary: {
    preferred: string[];
    avoid: string[];
  };
  writingStyle: {
    sentenceLength: "short" | "medium" | "long" | "varied";
    formality: "casual" | "professional" | "formal" | "friendly";
    useEmojis: boolean;
    useHashtags: boolean;
    callToAction: string[];
  };
  sampleContent: string[];
  guidelines: string[];
  createdAt: string;
  updatedAt: string;
}

interface VoiceConsistencyCheck {
  score: number;
  overallFeedback: string;
  toneAlignment: {
    score: number;
    feedback: string;
    suggestions: string[];
  };
  vocabularyAlignment: {
    score: number;
    flaggedWords: string[];
    suggestions: string[];
  };
  styleAlignment: {
    score: number;
    feedback: string;
    suggestions: string[];
  };
  improvedVersion?: string;
}

interface ContentAnalysis {
  detectedTone: string[];
  detectedPersonality: string[];
  readabilityScore: number;
  sentimentScore: number;
  formality: string;
  uniqueWords: string[];
  commonPhrases: string[];
  emojiUsage: boolean;
  hashtagUsage: boolean;
  averageSentenceLength: number;
}

const TONE_OPTIONS = [
  "Professional",
  "Casual",
  "Friendly",
  "Authoritative",
  "Playful",
  "Serious",
  "Inspiring",
  "Educational",
  "Humorous",
  "Empathetic",
  "Bold",
  "Conversational",
];

const PERSONALITY_OPTIONS = [
  "Innovative",
  "Reliable",
  "Caring",
  "Bold",
  "Sophisticated",
  "Down-to-earth",
  "Adventurous",
  "Trustworthy",
  "Creative",
  "Passionate",
  "Expert",
  "Approachable",
];

const PLATFORMS = [
  { value: "X", label: "X (Twitter)" },
  { value: "LINKEDIN", label: "LinkedIn" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "TIKTOK", label: "TikTok" },
  { value: "FACEBOOK", label: "Facebook" },
];

export default function BrandVoicePage() {
  const [activeTab, setActiveTab] = useState<"profiles" | "check" | "generate" | "analyze">("profiles");
  const [profiles, setProfiles] = useState<BrandVoiceProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<BrandVoiceProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Consistency check state
  const [checkContent, setCheckContent] = useState("");
  const [consistencyResult, setConsistencyResult] = useState<VoiceConsistencyCheck | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  // Generate content state
  const [generateTopic, setGenerateTopic] = useState("");
  const [generatePlatform, setGeneratePlatform] = useState("X");
  const [generatedContent, setGeneratedContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Analyze state
  const [analyzeContent, setAnalyzeContent] = useState("");
  const [analysisResult, setAnalysisResult] = useState<ContentAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Profile form state
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: "",
    description: "",
    tone: [] as string[],
    personality: [] as string[],
    preferredWords: "",
    avoidWords: "",
    sentenceLength: "medium" as const,
    formality: "professional" as const,
    useEmojis: false,
    useHashtags: true,
    callToAction: "",
    guidelines: "",
    sampleContent: "",
  });

  // Auto-generate profile state
  const [autoGenerateSamples, setAutoGenerateSamples] = useState("");
  const [autoGenerateName, setAutoGenerateName] = useState("");

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/brand-voice?action=profiles");
      const data = await response.json();
      if (data.profiles) {
        setProfiles(data.profiles);
        if (data.profiles.length > 0 && !selectedProfile) {
          setSelectedProfile(data.profiles[0]);
        }
      }
    } catch (error) {
      console.error("Failed to fetch profiles:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProfile = async () => {
    if (!profileForm.name) return;

    setIsCreating(true);
    try {
      const response = await fetch("/api/brand-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-profile",
          name: profileForm.name,
          description: profileForm.description,
          tone: profileForm.tone,
          personality: profileForm.personality,
          vocabulary: {
            preferred: profileForm.preferredWords.split(",").map((w) => w.trim()).filter(Boolean),
            avoid: profileForm.avoidWords.split(",").map((w) => w.trim()).filter(Boolean),
          },
          writingStyle: {
            sentenceLength: profileForm.sentenceLength,
            formality: profileForm.formality,
            useEmojis: profileForm.useEmojis,
            useHashtags: profileForm.useHashtags,
            callToAction: profileForm.callToAction.split(",").map((w) => w.trim()).filter(Boolean),
          },
          guidelines: profileForm.guidelines.split("\n").filter(Boolean),
          sampleContent: profileForm.sampleContent.split("---").map((s) => s.trim()).filter(Boolean),
        }),
      });

      const data = await response.json();
      if (data.profile) {
        setProfiles([data.profile, ...profiles]);
        setSelectedProfile(data.profile);
        setShowProfileForm(false);
        resetProfileForm();
      }
    } catch (error) {
      console.error("Failed to create profile:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleAutoGenerateProfile = async () => {
    if (!autoGenerateSamples || !autoGenerateName) return;

    setIsCreating(true);
    try {
      const samples = autoGenerateSamples.split("---").map((s) => s.trim()).filter(Boolean);
      const response = await fetch("/api/brand-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "auto-generate-profile",
          content: samples,
          name: autoGenerateName,
        }),
      });

      const data = await response.json();
      if (data.profile) {
        setProfiles([data.profile, ...profiles]);
        setSelectedProfile(data.profile);
        setAutoGenerateSamples("");
        setAutoGenerateName("");
      }
    } catch (error) {
      console.error("Failed to auto-generate profile:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteProfile = async (profileId: string) => {
    try {
      const response = await fetch("/api/brand-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete-profile",
          profileId,
        }),
      });

      if (response.ok) {
        setProfiles(profiles.filter((p) => p.id !== profileId));
        if (selectedProfile?.id === profileId) {
          setSelectedProfile(profiles.length > 1 ? profiles.find((p) => p.id !== profileId) || null : null);
        }
      }
    } catch (error) {
      console.error("Failed to delete profile:", error);
    }
  };

  const handleCheckConsistency = async () => {
    if (!checkContent || !selectedProfile) return;

    setIsChecking(true);
    try {
      const response = await fetch("/api/brand-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "check-consistency",
          content: checkContent,
          profileId: selectedProfile.id,
        }),
      });

      const data = await response.json();
      if (data.result) {
        setConsistencyResult(data.result);
      }
    } catch (error) {
      console.error("Failed to check consistency:", error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleGenerateContent = async () => {
    if (!generateTopic || !selectedProfile) return;

    setIsGenerating(true);
    try {
      const response = await fetch("/api/brand-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-content",
          topic: generateTopic,
          profileId: selectedProfile.id,
          platform: generatePlatform,
        }),
      });

      const data = await response.json();
      if (data.content) {
        setGeneratedContent(data.content);
      }
    } catch (error) {
      console.error("Failed to generate content:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnalyzeContent = async () => {
    if (!analyzeContent) return;

    setIsAnalyzing(true);
    try {
      const samples = analyzeContent.split("---").map((s) => s.trim()).filter(Boolean);
      const response = await fetch("/api/brand-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "analyze",
          content: samples,
        }),
      });

      const data = await response.json();
      if (data.analysis) {
        setAnalysisResult(data.analysis);
      }
    } catch (error) {
      console.error("Failed to analyze content:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetProfileForm = () => {
    setProfileForm({
      name: "",
      description: "",
      tone: [],
      personality: [],
      preferredWords: "",
      avoidWords: "",
      sentenceLength: "medium",
      formality: "professional",
      useEmojis: false,
      useHashtags: true,
      callToAction: "",
      guidelines: "",
      sampleContent: "",
    });
  };

  const toggleTone = (tone: string) => {
    setProfileForm((prev) => ({
      ...prev,
      tone: prev.tone.includes(tone)
        ? prev.tone.filter((t) => t !== tone)
        : [...prev.tone, tone],
    }));
  };

  const togglePersonality = (personality: string) => {
    setProfileForm((prev) => ({
      ...prev,
      personality: prev.personality.includes(personality)
        ? prev.personality.filter((p) => p !== personality)
        : [...prev.personality, personality],
    }));
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-yellow-400";
    return "text-red-400";
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return "bg-green-400/10";
    if (score >= 60) return "bg-yellow-400/10";
    return "bg-red-400/10";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-indigo-400" />
            Brand Voice Analyzer
          </h1>
          <p className="text-zinc-400 mt-1">Define, analyze, and maintain consistent brand voice</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-800">
        <nav className="flex gap-4">
          {[
            { id: "profiles", label: "Voice Profiles", icon: Settings },
            { id: "check", label: "Consistency Check", icon: Target },
            { id: "generate", label: "Generate Content", icon: Wand2 },
            { id: "analyze", label: "Analyze Voice", icon: Sparkles },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-indigo-500 text-white"
                  : "border-transparent text-zinc-400 hover:text-white"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Profiles Tab */}
      {activeTab === "profiles" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile List */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white">Your Profiles</h3>
                <button
                  onClick={() => setShowProfileForm(true)}
                  className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {isLoading ? (
                <div className="text-center py-8 text-zinc-400">Loading profiles...</div>
              ) : profiles.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                  <p className="text-zinc-400">No profiles yet. Create one to get started!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {profiles.map((profile) => (
                    <button
                      key={profile.id}
                      onClick={() => setSelectedProfile(profile)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        selectedProfile?.id === profile.id
                          ? "bg-indigo-600 text-white"
                          : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                      }`}
                    >
                      <p className="font-medium">{profile.name}</p>
                      <p className="text-sm opacity-70 truncate">
                        {profile.tone.slice(0, 3).join(", ")}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Auto-Generate Profile */}
            <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <h3 className="font-semibold text-white">Auto-Generate Profile</h3>
              </div>
              <p className="text-sm text-zinc-400 mb-4">
                Paste your existing content samples and we&apos;ll analyze your brand voice automatically.
              </p>
              <div className="space-y-3">
                <input
                  type="text"
                  value={autoGenerateName}
                  onChange={(e) => setAutoGenerateName(e.target.value)}
                  placeholder="Profile name"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <textarea
                  value={autoGenerateSamples}
                  onChange={(e) => setAutoGenerateSamples(e.target.value)}
                  placeholder="Paste content samples separated by ---"
                  rows={4}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={handleAutoGenerateProfile}
                  disabled={!autoGenerateSamples || !autoGenerateName || isCreating}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  {isCreating ? "Generating..." : "Generate Profile"}
                </button>
              </div>
            </div>
          </div>

          {/* Profile Details */}
          <div className="lg:col-span-2">
            {selectedProfile ? (
              <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-semibold text-white">{selectedProfile.name}</h3>
                    {selectedProfile.description && (
                      <p className="text-zinc-400 mt-1">{selectedProfile.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteProfile(selectedProfile.id)}
                    className="p-2 bg-zinc-800 text-red-400 rounded-lg hover:bg-zinc-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {/* Tone */}
                  <div>
                    <h4 className="text-sm font-medium text-zinc-400 mb-2">Tone</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedProfile.tone.map((t) => (
                        <span key={t} className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-lg text-sm">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Personality */}
                  <div>
                    <h4 className="text-sm font-medium text-zinc-400 mb-2">Personality</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedProfile.personality.map((p) => (
                        <span key={p} className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-lg text-sm">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Writing Style */}
                  <div className="col-span-2">
                    <h4 className="text-sm font-medium text-zinc-400 mb-2">Writing Style</h4>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="bg-zinc-800 rounded-lg p-3">
                        <p className="text-xs text-zinc-500">Sentence Length</p>
                        <p className="text-white capitalize">{selectedProfile.writingStyle.sentenceLength}</p>
                      </div>
                      <div className="bg-zinc-800 rounded-lg p-3">
                        <p className="text-xs text-zinc-500">Formality</p>
                        <p className="text-white capitalize">{selectedProfile.writingStyle.formality}</p>
                      </div>
                      <div className="bg-zinc-800 rounded-lg p-3">
                        <p className="text-xs text-zinc-500">Emojis</p>
                        <p className="text-white">{selectedProfile.writingStyle.useEmojis ? "Yes" : "No"}</p>
                      </div>
                      <div className="bg-zinc-800 rounded-lg p-3">
                        <p className="text-xs text-zinc-500">Hashtags</p>
                        <p className="text-white">{selectedProfile.writingStyle.useHashtags ? "Yes" : "No"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Vocabulary */}
                  <div>
                    <h4 className="text-sm font-medium text-zinc-400 mb-2">Preferred Words</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedProfile.vocabulary.preferred.length > 0 ? (
                        selectedProfile.vocabulary.preferred.map((w) => (
                          <span key={w} className="px-2 py-0.5 bg-green-500/20 text-green-300 rounded text-xs">
                            {w}
                          </span>
                        ))
                      ) : (
                        <span className="text-zinc-500 text-sm">No preferred words set</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-zinc-400 mb-2">Words to Avoid</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedProfile.vocabulary.avoid.length > 0 ? (
                        selectedProfile.vocabulary.avoid.map((w) => (
                          <span key={w} className="px-2 py-0.5 bg-red-500/20 text-red-300 rounded text-xs">
                            {w}
                          </span>
                        ))
                      ) : (
                        <span className="text-zinc-500 text-sm">No words to avoid set</span>
                      )}
                    </div>
                  </div>

                  {/* Guidelines */}
                  {selectedProfile.guidelines.length > 0 && (
                    <div className="col-span-2">
                      <h4 className="text-sm font-medium text-zinc-400 mb-2">Guidelines</h4>
                      <ul className="space-y-1">
                        {selectedProfile.guidelines.map((g, i) => (
                          <li key={i} className="text-sm text-zinc-300 flex items-start gap-2">
                            <Check className="w-4 h-4 text-green-400 mt-0.5" />
                            {g}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Sample Content */}
                  {selectedProfile.sampleContent.length > 0 && (
                    <div className="col-span-2">
                      <h4 className="text-sm font-medium text-zinc-400 mb-2">Sample Content ({selectedProfile.sampleContent.length})</h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {selectedProfile.sampleContent.slice(0, 3).map((content, i) => (
                          <div key={i} className="bg-zinc-800 rounded-lg p-3 text-sm text-zinc-300">
                            {content.length > 150 ? content.slice(0, 150) + "..." : content}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800 text-center py-12">
                <MessageSquare className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                <p className="text-zinc-400">Select a profile to view details</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Consistency Check Tab */}
      {activeTab === "check" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
            <h3 className="text-lg font-semibold text-white mb-4">Check Content Consistency</h3>

            {!selectedProfile ? (
              <div className="text-center py-8">
                <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                <p className="text-zinc-400">Please select a brand voice profile first</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Using Profile</label>
                  <div className="px-4 py-2 bg-zinc-800 rounded-lg text-white">
                    {selectedProfile.name}
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Content to Check</label>
                  <textarea
                    value={checkContent}
                    onChange={(e) => setCheckContent(e.target.value)}
                    placeholder="Paste the content you want to check for brand voice consistency..."
                    rows={8}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <button
                  onClick={handleCheckConsistency}
                  disabled={!checkContent || isChecking}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50"
                >
                  <Target className="w-4 h-4" />
                  {isChecking ? "Checking..." : "Check Consistency"}
                </button>
              </div>
            )}
          </div>

          <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
            <h3 className="text-lg font-semibold text-white mb-4">Results</h3>

            {consistencyResult ? (
              <div className="space-y-4">
                {/* Overall Score */}
                <div className={`p-4 rounded-lg ${getScoreBg(consistencyResult.score)}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-zinc-400">Overall Score</span>
                    <span className={`text-2xl font-bold ${getScoreColor(consistencyResult.score)}`}>
                      {consistencyResult.score}%
                    </span>
                  </div>
                  <p className="text-sm text-zinc-300">{consistencyResult.overallFeedback}</p>
                </div>

                {/* Detailed Scores */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-zinc-800 rounded-lg p-3">
                    <p className="text-xs text-zinc-500 mb-1">Tone</p>
                    <p className={`text-xl font-bold ${getScoreColor(consistencyResult.toneAlignment.score)}`}>
                      {consistencyResult.toneAlignment.score}%
                    </p>
                  </div>
                  <div className="bg-zinc-800 rounded-lg p-3">
                    <p className="text-xs text-zinc-500 mb-1">Vocabulary</p>
                    <p className={`text-xl font-bold ${getScoreColor(consistencyResult.vocabularyAlignment.score)}`}>
                      {consistencyResult.vocabularyAlignment.score}%
                    </p>
                  </div>
                  <div className="bg-zinc-800 rounded-lg p-3">
                    <p className="text-xs text-zinc-500 mb-1">Style</p>
                    <p className={`text-xl font-bold ${getScoreColor(consistencyResult.styleAlignment.score)}`}>
                      {consistencyResult.styleAlignment.score}%
                    </p>
                  </div>
                </div>

                {/* Flagged Words */}
                {consistencyResult.vocabularyAlignment.flaggedWords.length > 0 && (
                  <div>
                    <p className="text-sm text-zinc-400 mb-2">Flagged Words</p>
                    <div className="flex flex-wrap gap-2">
                      {consistencyResult.vocabularyAlignment.flaggedWords.map((word) => (
                        <span key={word} className="px-2 py-1 bg-red-500/20 text-red-300 rounded text-sm">
                          {word}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggestions */}
                {consistencyResult.toneAlignment.suggestions.length > 0 && (
                  <div>
                    <p className="text-sm text-zinc-400 mb-2">Suggestions</p>
                    <ul className="space-y-1">
                      {consistencyResult.toneAlignment.suggestions.map((suggestion, i) => (
                        <li key={i} className="text-sm text-zinc-300 flex items-start gap-2">
                          <Zap className="w-4 h-4 text-yellow-400 mt-0.5" />
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Improved Version */}
                {consistencyResult.improvedVersion && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-zinc-400">Improved Version</p>
                      <button
                        onClick={() => navigator.clipboard.writeText(consistencyResult.improvedVersion || "")}
                        className="text-zinc-400 hover:text-white"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="bg-zinc-800 rounded-lg p-4 text-sm text-zinc-300">
                      {consistencyResult.improvedVersion}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <Target className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                <p className="text-zinc-400">Check content to see consistency results</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Generate Content Tab */}
      {activeTab === "generate" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
            <h3 className="text-lg font-semibold text-white mb-4">Generate On-Brand Content</h3>

            {!selectedProfile ? (
              <div className="text-center py-8">
                <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                <p className="text-zinc-400">Please select a brand voice profile first</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Using Profile</label>
                  <div className="px-4 py-2 bg-zinc-800 rounded-lg text-white">
                    {selectedProfile.name}
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Platform</label>
                  <select
                    value={generatePlatform}
                    onChange={(e) => setGeneratePlatform(e.target.value)}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {PLATFORMS.map((platform) => (
                      <option key={platform.value} value={platform.value}>
                        {platform.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Topic / Brief</label>
                  <textarea
                    value={generateTopic}
                    onChange={(e) => setGenerateTopic(e.target.value)}
                    placeholder="Describe what you want to post about..."
                    rows={4}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <button
                  onClick={handleGenerateContent}
                  disabled={!generateTopic || isGenerating}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50"
                >
                  <Wand2 className="w-4 h-4" />
                  {isGenerating ? "Generating..." : "Generate Content"}
                </button>
              </div>
            )}
          </div>

          <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Generated Content</h3>
              {generatedContent && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigator.clipboard.writeText(generatedContent)}
                    className="text-zinc-400 hover:text-white"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleGenerateContent}
                    disabled={isGenerating}
                    className="text-zinc-400 hover:text-white"
                  >
                    <RefreshCw className={`w-4 h-4 ${isGenerating ? "animate-spin" : ""}`} />
                  </button>
                </div>
              )}
            </div>

            {generatedContent ? (
              <div className="bg-zinc-800 rounded-lg p-4 text-zinc-300 whitespace-pre-wrap">
                {generatedContent}
              </div>
            ) : (
              <div className="text-center py-12">
                <Wand2 className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                <p className="text-zinc-400">Generated content will appear here</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Analyze Tab */}
      {activeTab === "analyze" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
            <h3 className="text-lg font-semibold text-white mb-4">Analyze Content Voice</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">
                  Content Samples (separate with ---)
                </label>
                <textarea
                  value={analyzeContent}
                  onChange={(e) => setAnalyzeContent(e.target.value)}
                  placeholder="Paste your content samples here...&#10;---&#10;Another sample...&#10;---&#10;Third sample..."
                  rows={10}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                onClick={handleAnalyzeContent}
                disabled={!analyzeContent || isAnalyzing}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                {isAnalyzing ? "Analyzing..." : "Analyze Voice"}
              </button>
            </div>
          </div>

          <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
            <h3 className="text-lg font-semibold text-white mb-4">Analysis Results</h3>

            {analysisResult ? (
              <div className="space-y-4">
                {/* Detected Tone */}
                <div>
                  <p className="text-sm text-zinc-400 mb-2">Detected Tone</p>
                  <div className="flex flex-wrap gap-2">
                    {analysisResult.detectedTone.map((tone) => (
                      <span key={tone} className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-lg text-sm">
                        {tone}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Detected Personality */}
                <div>
                  <p className="text-sm text-zinc-400 mb-2">Detected Personality</p>
                  <div className="flex flex-wrap gap-2">
                    {analysisResult.detectedPersonality.map((p) => (
                      <span key={p} className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-lg text-sm">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-800 rounded-lg p-3">
                    <p className="text-xs text-zinc-500">Readability</p>
                    <p className="text-xl font-bold text-white">{analysisResult.readabilityScore}%</p>
                  </div>
                  <div className="bg-zinc-800 rounded-lg p-3">
                    <p className="text-xs text-zinc-500">Sentiment</p>
                    <p className={`text-xl font-bold ${
                      analysisResult.sentimentScore > 0 ? "text-green-400" :
                      analysisResult.sentimentScore < 0 ? "text-red-400" : "text-zinc-400"
                    }`}>
                      {analysisResult.sentimentScore > 0 ? "Positive" :
                       analysisResult.sentimentScore < 0 ? "Negative" : "Neutral"}
                    </p>
                  </div>
                  <div className="bg-zinc-800 rounded-lg p-3">
                    <p className="text-xs text-zinc-500">Formality</p>
                    <p className="text-xl font-bold text-white capitalize">{analysisResult.formality}</p>
                  </div>
                  <div className="bg-zinc-800 rounded-lg p-3">
                    <p className="text-xs text-zinc-500">Uses Emojis</p>
                    <p className="text-xl font-bold text-white">{analysisResult.emojiUsage ? "Yes" : "No"}</p>
                  </div>
                </div>

                {/* Unique Words */}
                {analysisResult.uniqueWords.length > 0 && (
                  <div>
                    <p className="text-sm text-zinc-400 mb-2">Unique Words/Phrases</p>
                    <div className="flex flex-wrap gap-1">
                      {analysisResult.uniqueWords.slice(0, 10).map((word) => (
                        <span key={word} className="px-2 py-0.5 bg-zinc-700 rounded text-xs text-zinc-300">
                          {word}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <Sparkles className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                <p className="text-zinc-400">Analysis results will appear here</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Profile Modal */}
      {showProfileForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-8">
          <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-2xl border border-zinc-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Create Brand Voice Profile</h3>
              <button onClick={() => setShowProfileForm(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Profile Name</label>
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    placeholder="e.g., Main Brand Voice"
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Description</label>
                  <input
                    type="text"
                    value={profileForm.description}
                    onChange={(e) => setProfileForm({ ...profileForm, description: e.target.value })}
                    placeholder="Brief description"
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">Tone</label>
                <div className="flex flex-wrap gap-2">
                  {TONE_OPTIONS.map((tone) => (
                    <button
                      key={tone}
                      onClick={() => toggleTone(tone)}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        profileForm.tone.includes(tone)
                          ? "bg-indigo-600 text-white"
                          : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                      }`}
                    >
                      {tone}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">Personality</label>
                <div className="flex flex-wrap gap-2">
                  {PERSONALITY_OPTIONS.map((p) => (
                    <button
                      key={p}
                      onClick={() => togglePersonality(p)}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        profileForm.personality.includes(p)
                          ? "bg-purple-600 text-white"
                          : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Preferred Words (comma-separated)</label>
                  <input
                    type="text"
                    value={profileForm.preferredWords}
                    onChange={(e) => setProfileForm({ ...profileForm, preferredWords: e.target.value })}
                    placeholder="innovative, powerful, seamless"
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Words to Avoid (comma-separated)</label>
                  <input
                    type="text"
                    value={profileForm.avoidWords}
                    onChange={(e) => setProfileForm({ ...profileForm, avoidWords: e.target.value })}
                    placeholder="cheap, basic, simple"
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Sentence Length</label>
                  <select
                    value={profileForm.sentenceLength}
                    onChange={(e) => setProfileForm({ ...profileForm, sentenceLength: e.target.value as any })}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="short">Short</option>
                    <option value="medium">Medium</option>
                    <option value="long">Long</option>
                    <option value="varied">Varied</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Formality</label>
                  <select
                    value={profileForm.formality}
                    onChange={(e) => setProfileForm({ ...profileForm, formality: e.target.value as any })}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="casual">Casual</option>
                    <option value="friendly">Friendly</option>
                    <option value="professional">Professional</option>
                    <option value="formal">Formal</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profileForm.useEmojis}
                    onChange={(e) => setProfileForm({ ...profileForm, useEmojis: e.target.checked })}
                    className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-zinc-300">Use Emojis</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profileForm.useHashtags}
                    onChange={(e) => setProfileForm({ ...profileForm, useHashtags: e.target.checked })}
                    className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-zinc-300">Use Hashtags</span>
                </label>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">Guidelines (one per line)</label>
                <textarea
                  value={profileForm.guidelines}
                  onChange={(e) => setProfileForm({ ...profileForm, guidelines: e.target.value })}
                  placeholder="Always start with a question&#10;End with a clear CTA&#10;Keep paragraphs short"
                  rows={3}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">Sample Content (separate with ---)</label>
                <textarea
                  value={profileForm.sampleContent}
                  onChange={(e) => setProfileForm({ ...profileForm, sampleContent: e.target.value })}
                  placeholder="Paste example posts that represent your brand voice...&#10;---&#10;Another example..."
                  rows={4}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 mt-6">
              <button
                onClick={() => setShowProfileForm(false)}
                className="flex-1 px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProfile}
                disabled={!profileForm.name || profileForm.tone.length === 0 || isCreating}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50"
              >
                {isCreating ? "Creating..." : "Create Profile"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
