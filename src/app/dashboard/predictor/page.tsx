"use client";

import { useState } from "react";
import {
  TrendingUp,
  Sparkles,
  Target,
  Clock,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Copy,
  Wand2,
  ArrowRight,
  Zap,
  Heart,
  MessageCircle,
  Share2,
  Plus,
  Trash2,
} from "lucide-react";

interface PerformancePrediction {
  overallScore: number;
  engagementPrediction: {
    likes: { low: number; expected: number; high: number };
    comments: { low: number; expected: number; high: number };
    shares: { low: number; expected: number; high: number };
    engagementRate: { low: number; expected: number; high: number };
  };
  viralPotential: "low" | "medium" | "high" | "very_high";
  factors: {
    category: string;
    score: number;
    impact: "positive" | "neutral" | "negative";
    feedback: string;
  }[];
  recommendations: {
    priority: "high" | "medium" | "low";
    area: string;
    suggestion: string;
    potentialImpact: string;
  }[];
  bestTimeToPost: string[];
}

interface ContentElement {
  element: string;
  score: number;
  feedback: string;
}

interface ViralityFactor {
  factor: string;
  present: boolean;
  weight: number;
}

const PLATFORMS = ["X", "Instagram", "LinkedIn", "TikTok", "YouTube", "Facebook"];
const CONTENT_TYPES = ["text", "image", "video", "carousel", "story", "reel"];

export default function PredictorPage() {
  const [activeTab, setActiveTab] = useState<"predict" | "compare" | "improve">("predict");

  // Predict tab state
  const [content, setContent] = useState("");
  const [platform, setPlatform] = useState("X");
  const [contentType, setContentType] = useState("text");
  const [hashtags, setHashtags] = useState("");
  const [prediction, setPrediction] = useState<PerformancePrediction | null>(null);
  const [viralityFactors, setViralityFactors] = useState<ViralityFactor[]>([]);
  const [elements, setElements] = useState<ContentElement[]>([]);
  const [isPredicting, setIsPredicting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Compare tab state
  const [variations, setVariations] = useState<string[]>(["", ""]);
  const [comparePlatform, setComparePlatform] = useState("X");
  const [comparison, setComparison] = useState<{
    rankings: { content: string; score: number; strengths: string[]; weaknesses: string[] }[];
    winner: number;
    recommendation: string;
  } | null>(null);
  const [isComparing, setIsComparing] = useState(false);

  // Improve tab state
  const [improveContent, setImproveContent] = useState("");
  const [improvePlatform, setImprovePlatform] = useState("X");
  const [targetScore, setTargetScore] = useState(80);
  const [improvements, setImprovements] = useState<{
    improvedContent: string;
    changes: { original: string; improved: string; reason: string }[];
    predictedScoreIncrease: number;
  } | null>(null);
  const [isImproving, setIsImproving] = useState(false);

  const handlePredict = async () => {
    if (!content) return;

    setIsPredicting(true);
    try {
      const response = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "predict",
          content,
          platform,
          contentType,
          hashtags: hashtags.split(",").map((h) => h.trim()).filter(Boolean),
        }),
      });

      const data = await response.json();
      if (data.prediction) {
        setPrediction(data.prediction);
      }
      if (data.viralityFactors) {
        setViralityFactors(data.viralityFactors);
      }
    } catch (error) {
      console.error("Failed to predict:", error);
    } finally {
      setIsPredicting(false);
    }
  };

  const handleAnalyzeElements = async () => {
    if (!content) return;

    setIsAnalyzing(true);
    try {
      const response = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "analyze-elements",
          content,
          platform,
        }),
      });

      const data = await response.json();
      if (data.elements) {
        setElements(data.elements);
      }
    } catch (error) {
      console.error("Failed to analyze elements:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCompare = async () => {
    const validVariations = variations.filter((v) => v.trim());
    if (validVariations.length < 2) return;

    setIsComparing(true);
    try {
      const response = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "compare",
          variations: validVariations,
          platform: comparePlatform,
        }),
      });

      const data = await response.json();
      if (data.comparison) {
        setComparison(data.comparison);
      }
    } catch (error) {
      console.error("Failed to compare:", error);
    } finally {
      setIsComparing(false);
    }
  };

  const handleImprove = async () => {
    if (!improveContent) return;

    setIsImproving(true);
    try {
      const response = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "improve",
          content: improveContent,
          platform: improvePlatform,
          targetScore,
        }),
      });

      const data = await response.json();
      if (data.improvements) {
        setImprovements(data.improvements);
      }
    } catch (error) {
      console.error("Failed to improve:", error);
    } finally {
      setIsImproving(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-yellow-400";
    if (score >= 40) return "text-orange-400";
    return "text-red-400";
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return "bg-green-400";
    if (score >= 60) return "bg-yellow-400";
    if (score >= 40) return "bg-orange-400";
    return "bg-red-400";
  };

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case "positive":
        return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case "negative":
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
    }
  };

  const getViralPotentialColor = (potential: string) => {
    switch (potential) {
      case "very_high":
        return "text-green-400 bg-green-400/10";
      case "high":
        return "text-emerald-400 bg-emerald-400/10";
      case "medium":
        return "text-yellow-400 bg-yellow-400/10";
      default:
        return "text-red-400 bg-red-400/10";
    }
  };

  const addVariation = () => {
    setVariations([...variations, ""]);
  };

  const removeVariation = (index: number) => {
    if (variations.length <= 2) return;
    setVariations(variations.filter((_, i) => i !== index));
  };

  const updateVariation = (index: number, value: string) => {
    const newVariations = [...variations];
    newVariations[index] = value;
    setVariations(newVariations);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-indigo-400" />
            Content Performance Predictor
          </h1>
          <p className="text-zinc-400 mt-1">Predict and optimize your content before publishing</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-800">
        <nav className="flex gap-4">
          {[
            { id: "predict", label: "Predict", icon: TrendingUp },
            { id: "compare", label: "Compare Variations", icon: BarChart3 },
            { id: "improve", label: "AI Improve", icon: Wand2 },
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

      {/* Predict Tab */}
      {activeTab === "predict" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Panel */}
          <div className="space-y-6">
            <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
              <h3 className="text-lg font-semibold text-white mb-4">Content to Analyze</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Your Content</label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Paste your post content here..."
                    rows={6}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-zinc-500 mt-1">{content.length} characters</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-zinc-400 mb-2">Platform</label>
                    <select
                      value={platform}
                      onChange={(e) => setPlatform(e.target.value)}
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {PLATFORMS.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-zinc-400 mb-2">Content Type</label>
                    <select
                      value={contentType}
                      onChange={(e) => setContentType(e.target.value)}
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {CONTENT_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Hashtags (comma-separated)</label>
                  <input
                    type="text"
                    value={hashtags}
                    onChange={(e) => setHashtags(e.target.value)}
                    placeholder="#marketing, #socialmedia, #content"
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4">
                <button
                  onClick={handlePredict}
                  disabled={!content || isPredicting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50"
                >
                  <TrendingUp className="w-4 h-4" />
                  {isPredicting ? "Predicting..." : "Predict Performance"}
                </button>
                <button
                  onClick={handleAnalyzeElements}
                  disabled={!content || isAnalyzing}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  {isAnalyzing ? "..." : "Deep Analysis"}
                </button>
              </div>
            </div>

            {/* Virality Factors */}
            {viralityFactors.length > 0 && (
              <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
                <h3 className="text-lg font-semibold text-white mb-4">Virality Checklist</h3>
                <div className="space-y-2">
                  {viralityFactors.map((factor) => (
                    <div
                      key={factor.factor}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        factor.present ? "bg-green-500/10" : "bg-zinc-800"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {factor.present ? (
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-zinc-500" />
                        )}
                        <span className={factor.present ? "text-white" : "text-zinc-400"}>
                          {factor.factor}
                        </span>
                      </div>
                      <span className="text-xs text-zinc-500">+{factor.weight}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Results Panel */}
          <div className="space-y-6">
            {prediction ? (
              <>
                {/* Overall Score */}
                <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Prediction Results</h3>
                    <span className={`px-3 py-1 rounded-full text-sm ${getViralPotentialColor(prediction.viralPotential)}`}>
                      {prediction.viralPotential.replace("_", " ")} viral potential
                    </span>
                  </div>

                  <div className="flex items-center justify-center mb-6">
                    <div className="relative w-32 h-32">
                      <svg className="w-32 h-32 transform -rotate-90">
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="none"
                          className="text-zinc-700"
                        />
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="none"
                          strokeDasharray={`${prediction.overallScore * 3.52} 352`}
                          className={getScoreColor(prediction.overallScore)}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className={`text-3xl font-bold ${getScoreColor(prediction.overallScore)}`}>
                          {prediction.overallScore}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Engagement Predictions */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-zinc-800 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Heart className="w-4 h-4 text-red-400" />
                        <span className="text-sm text-zinc-400">Likes</span>
                      </div>
                      <p className="text-xl font-bold text-white">
                        {prediction.engagementPrediction.likes.expected.toLocaleString()}
                      </p>
                      <p className="text-xs text-zinc-500">
                        Range: {prediction.engagementPrediction.likes.low} - {prediction.engagementPrediction.likes.high}
                      </p>
                    </div>

                    <div className="bg-zinc-800 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageCircle className="w-4 h-4 text-blue-400" />
                        <span className="text-sm text-zinc-400">Comments</span>
                      </div>
                      <p className="text-xl font-bold text-white">
                        {prediction.engagementPrediction.comments.expected.toLocaleString()}
                      </p>
                      <p className="text-xs text-zinc-500">
                        Range: {prediction.engagementPrediction.comments.low} - {prediction.engagementPrediction.comments.high}
                      </p>
                    </div>

                    <div className="bg-zinc-800 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Share2 className="w-4 h-4 text-green-400" />
                        <span className="text-sm text-zinc-400">Shares</span>
                      </div>
                      <p className="text-xl font-bold text-white">
                        {prediction.engagementPrediction.shares.expected.toLocaleString()}
                      </p>
                      <p className="text-xs text-zinc-500">
                        Range: {prediction.engagementPrediction.shares.low} - {prediction.engagementPrediction.shares.high}
                      </p>
                    </div>

                    <div className="bg-zinc-800 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-4 h-4 text-purple-400" />
                        <span className="text-sm text-zinc-400">Engagement Rate</span>
                      </div>
                      <p className="text-xl font-bold text-white">
                        {prediction.engagementPrediction.engagementRate.expected}%
                      </p>
                      <p className="text-xs text-zinc-500">
                        Range: {prediction.engagementPrediction.engagementRate.low}% - {prediction.engagementPrediction.engagementRate.high}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Factors */}
                {prediction.factors.length > 0 && (
                  <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
                    <h3 className="text-lg font-semibold text-white mb-4">Analysis Factors</h3>
                    <div className="space-y-3">
                      {prediction.factors.map((factor, index) => (
                        <div key={index} className="flex items-start gap-3">
                          {getImpactIcon(factor.impact)}
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-white">{factor.category}</span>
                              <span className={`text-sm ${getScoreColor(factor.score)}`}>
                                {factor.score}/100
                              </span>
                            </div>
                            <p className="text-sm text-zinc-400 mt-1">{factor.feedback}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {prediction.recommendations.length > 0 && (
                  <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
                    <h3 className="text-lg font-semibold text-white mb-4">Recommendations</h3>
                    <div className="space-y-3">
                      {prediction.recommendations.map((rec, index) => (
                        <div
                          key={index}
                          className={`p-3 rounded-lg ${
                            rec.priority === "high"
                              ? "bg-red-500/10 border border-red-500/20"
                              : rec.priority === "medium"
                              ? "bg-yellow-500/10 border border-yellow-500/20"
                              : "bg-zinc-800"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Zap className={`w-4 h-4 ${
                              rec.priority === "high"
                                ? "text-red-400"
                                : rec.priority === "medium"
                                ? "text-yellow-400"
                                : "text-zinc-400"
                            }`} />
                            <span className="font-medium text-white">{rec.area}</span>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              rec.priority === "high"
                                ? "bg-red-500/20 text-red-300"
                                : rec.priority === "medium"
                                ? "bg-yellow-500/20 text-yellow-300"
                                : "bg-zinc-700 text-zinc-300"
                            }`}>
                              {rec.priority}
                            </span>
                          </div>
                          <p className="text-sm text-zinc-300">{rec.suggestion}</p>
                          <p className="text-xs text-zinc-500 mt-1">Impact: {rec.potentialImpact}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Best Times */}
                {prediction.bestTimeToPost.length > 0 && (
                  <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-indigo-400" />
                      Best Times to Post
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {prediction.bestTimeToPost.map((time, index) => (
                        <span
                          key={index}
                          className="px-4 py-2 bg-indigo-500/20 text-indigo-300 rounded-lg"
                        >
                          {time}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800 text-center py-16">
                <TrendingUp className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
                <p className="text-zinc-400">Enter your content and click &quot;Predict Performance&quot; to see results</p>
              </div>
            )}

            {/* Element Analysis */}
            {elements.length > 0 && (
              <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
                <h3 className="text-lg font-semibold text-white mb-4">Content Element Analysis</h3>
                <div className="space-y-3">
                  {elements.map((element, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white">{element.element}</span>
                        <span className={`text-sm font-medium ${getScoreColor(element.score)}`}>
                          {element.score}/100
                        </span>
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getScoreBg(element.score)} transition-all`}
                          style={{ width: `${element.score}%` }}
                        />
                      </div>
                      <p className="text-xs text-zinc-400">{element.feedback}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Compare Tab */}
      {activeTab === "compare" && (
        <div className="space-y-6">
          <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Compare Content Variations</h3>
              <button
                onClick={addVariation}
                className="flex items-center gap-2 px-3 py-2 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700"
              >
                <Plus className="w-4 h-4" />
                Add Variation
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-zinc-400 mb-2">Platform</label>
              <select
                value={comparePlatform}
                onChange={(e) => setComparePlatform(e.target.value)}
                className="w-full max-w-xs px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {variations.map((variation, index) => (
                <div key={index} className="relative">
                  <label className="block text-sm text-zinc-400 mb-2">
                    Variation {index + 1}
                    {comparison && comparison.winner === index && (
                      <span className="ml-2 px-2 py-0.5 bg-green-500/20 text-green-300 rounded text-xs">
                        Winner
                      </span>
                    )}
                  </label>
                  <textarea
                    value={variation}
                    onChange={(e) => updateVariation(index, e.target.value)}
                    placeholder={`Enter variation ${index + 1}...`}
                    rows={5}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {variations.length > 2 && (
                    <button
                      onClick={() => removeVariation(index)}
                      className="absolute top-0 right-0 p-1 text-zinc-500 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={handleCompare}
              disabled={variations.filter((v) => v.trim()).length < 2 || isComparing}
              className="mt-4 flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50"
            >
              <BarChart3 className="w-4 h-4" />
              {isComparing ? "Comparing..." : "Compare Variations"}
            </button>
          </div>

          {/* Comparison Results */}
          {comparison && (
            <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
              <h3 className="text-lg font-semibold text-white mb-4">Comparison Results</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {comparison.rankings.map((ranking, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${
                      comparison.winner === index
                        ? "bg-green-500/10 border-green-500/30"
                        : "bg-zinc-800 border-zinc-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-white">Variation {index + 1}</span>
                      <span className={`text-lg font-bold ${getScoreColor(ranking.score)}`}>
                        {ranking.score}/100
                      </span>
                    </div>

                    {ranking.strengths.length > 0 && (
                      <div className="mb-2">
                        <p className="text-xs text-zinc-500 mb-1">Strengths:</p>
                        <ul className="space-y-1">
                          {ranking.strengths.map((s, i) => (
                            <li key={i} className="text-sm text-green-300 flex items-start gap-1">
                              <CheckCircle2 className="w-3 h-3 mt-1 flex-shrink-0" />
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {ranking.weaknesses.length > 0 && (
                      <div>
                        <p className="text-xs text-zinc-500 mb-1">Weaknesses:</p>
                        <ul className="space-y-1">
                          {ranking.weaknesses.map((w, i) => (
                            <li key={i} className="text-sm text-red-300 flex items-start gap-1">
                              <XCircle className="w-3 h-3 mt-1 flex-shrink-0" />
                              {w}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="p-4 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                <p className="text-sm text-indigo-300">{comparison.recommendation}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Improve Tab */}
      {activeTab === "improve" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
            <h3 className="text-lg font-semibold text-white mb-4">AI Content Improver</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Content to Improve</label>
                <textarea
                  value={improveContent}
                  onChange={(e) => setImproveContent(e.target.value)}
                  placeholder="Paste your content here..."
                  rows={8}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Platform</label>
                  <select
                    value={improvePlatform}
                    onChange={(e) => setImprovePlatform(e.target.value)}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {PLATFORMS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Target Score</label>
                  <input
                    type="number"
                    value={targetScore}
                    onChange={(e) => setTargetScore(parseInt(e.target.value) || 80)}
                    min={50}
                    max={100}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <button
                onClick={handleImprove}
                disabled={!improveContent || isImproving}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50"
              >
                <Wand2 className="w-4 h-4" />
                {isImproving ? "Improving..." : "Improve Content"}
              </button>
            </div>
          </div>

          <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Improved Version</h3>
              {improvements && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigator.clipboard.writeText(improvements.improvedContent)}
                    className="text-zinc-400 hover:text-white"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {improvements ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                    <span className="text-green-300">
                      +{improvements.predictedScoreIncrease}% predicted improvement
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-zinc-400 mb-2">Improved Content:</p>
                  <div className="bg-zinc-800 rounded-lg p-4 text-zinc-300 whitespace-pre-wrap">
                    {improvements.improvedContent}
                  </div>
                </div>

                {improvements.changes.length > 0 && (
                  <div>
                    <p className="text-sm text-zinc-400 mb-2">Changes Made:</p>
                    <div className="space-y-2">
                      {improvements.changes.map((change, index) => (
                        <div key={index} className="bg-zinc-800 rounded-lg p-3">
                          <div className="flex items-start gap-2 text-sm">
                            <span className="text-red-400 line-through">{change.original}</span>
                            <ArrowRight className="w-4 h-4 text-zinc-500 mt-1 flex-shrink-0" />
                            <span className="text-green-400">{change.improved}</span>
                          </div>
                          <p className="text-xs text-zinc-500 mt-1">{change.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-16">
                <Wand2 className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                <p className="text-zinc-400">Improved content will appear here</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
