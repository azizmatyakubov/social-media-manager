"use client";

import { useState, useEffect } from "react";

interface AdCampaign {
  id: string;
  name: string;
  platform: string;
  objective: string;
  budget: {
    type: string;
    amount: number;
    currency: string;
  };
  projections: CampaignProjections;
  status: string;
  createdAt: Date;
}

interface CampaignProjections {
  impressions: { min: number; max: number };
  reach: { min: number; max: number };
  clicks: { min: number; max: number };
  ctr: { min: number; max: number };
  cpc: { min: number; max: number };
  cpm: { min: number; max: number };
  conversions: { min: number; max: number };
  costPerConversion: { min: number; max: number };
  roas: { min: number; max: number };
  totalSpend: number;
}

interface PlatformRate {
  platform: string;
  avgCPM: number;
  avgCPC: number;
  avgCTR: number;
  avgConversionRate: number;
  minBudget: number;
  competitionLevel: string;
}

interface BudgetRecommendation {
  minBudget: number;
  recommendedBudget: number;
  optimalBudget: number;
  reasoning: string;
  expectedResults: {
    impressions: number;
    clicks: number;
    conversions: number;
    roi: number;
  };
}

interface PricingScenario {
  id: string;
  name: string;
  budget: number;
  projections: CampaignProjections;
  comparison: {
    impressionsPerDollar: number;
    clicksPerDollar: number;
    conversionsPerDollar: number;
    efficiency: number;
  };
}

interface IndustryBenchmark {
  industry: string;
  platform: string;
  avgCPM: number;
  avgCPC: number;
  avgCTR: number;
  avgConversionRate: number;
  avgROAS: number;
}

interface AdStats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalBudget: number;
  projectedImpressions: number;
  projectedConversions: number;
  avgCPC: number;
  avgROAS: number;
}

export default function AdPricingPage() {
  const [activeTab, setActiveTab] = useState<"calculator" | "campaigns" | "benchmarks" | "scenarios">("calculator");
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [platformRates, setPlatformRates] = useState<PlatformRate[]>([]);
  const [benchmarks, setBenchmarks] = useState<IndustryBenchmark[]>([]);
  const [stats, setStats] = useState<AdStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Calculator form
  const [calcPlatform, setCalcPlatform] = useState("facebook");
  const [calcObjective, setCalcObjective] = useState("conversions");
  const [calcTargetReach, setCalcTargetReach] = useState(100000);
  const [calcIndustry, setCalcIndustry] = useState("");
  const [recommendation, setRecommendation] = useState<BudgetRecommendation | null>(null);
  const [calculating, setCalculating] = useState(false);

  // Scenarios
  const [scenarioBudget, setScenarioBudget] = useState(50);
  const [scenarioDays, setScenarioDays] = useState(30);
  const [scenarios, setScenarios] = useState<PricingScenario[]>([]);

  const platforms = [
    { id: "facebook", name: "Facebook", icon: "📘" },
    { id: "instagram", name: "Instagram", icon: "📸" },
    { id: "twitter", name: "X (Twitter)", icon: "𝕏" },
    { id: "linkedin", name: "LinkedIn", icon: "💼" },
    { id: "tiktok", name: "TikTok", icon: "🎵" },
    { id: "youtube", name: "YouTube", icon: "▶️" },
    { id: "pinterest", name: "Pinterest", icon: "📌" },
  ];

  const objectives = [
    { value: "awareness", label: "Brand Awareness" },
    { value: "reach", label: "Reach" },
    { value: "traffic", label: "Traffic" },
    { value: "engagement", label: "Engagement" },
    { value: "app_installs", label: "App Installs" },
    { value: "video_views", label: "Video Views" },
    { value: "lead_generation", label: "Lead Generation" },
    { value: "conversions", label: "Conversions" },
    { value: "catalog_sales", label: "Catalog Sales" },
  ];

  const industries = [
    "E-commerce",
    "SaaS",
    "Retail",
    "Finance",
    "Healthcare",
    "Education",
    "Travel",
    "Real Estate",
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [campaignsRes, ratesRes, benchmarksRes, statsRes] = await Promise.all([
        fetch("/api/ad-pricing?action=campaigns"),
        fetch("/api/ad-pricing?action=platform-rates"),
        fetch("/api/ad-pricing?action=benchmarks"),
        fetch("/api/ad-pricing?action=stats"),
      ]);

      if (campaignsRes.ok) {
        const data = await campaignsRes.json();
        setCampaigns(data.campaigns);
      }

      if (ratesRes.ok) {
        const data = await ratesRes.json();
        setPlatformRates(data.rates);
      }

      if (benchmarksRes.ok) {
        const data = await benchmarksRes.json();
        setBenchmarks(data.benchmarks);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats);
      }
    } catch (err) {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const calculateBudget = async () => {
    try {
      setCalculating(true);
      const response = await fetch("/api/ad-pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "calculate-budget",
          platform: calcPlatform,
          objective: calcObjective,
          targetReach: calcTargetReach,
          industry: calcIndustry || undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setRecommendation(data.recommendation);
      }
    } catch (err) {
      setError("Failed to calculate budget");
    } finally {
      setCalculating(false);
    }
  };

  const generateScenarios = async () => {
    try {
      const response = await fetch("/api/ad-pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-scenarios",
          platform: calcPlatform,
          objective: calcObjective,
          baseBudget: scenarioBudget,
          days: scenarioDays,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setScenarios(data.scenarios);
        setActiveTab("scenarios");
      }
    } catch (err) {
      setError("Failed to generate scenarios");
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toFixed(0);
  };

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  const getCompetitionColor = (level: string) => {
    switch (level) {
      case "low":
        return "bg-green-500/20 text-green-400";
      case "medium":
        return "bg-yellow-500/20 text-yellow-400";
      default:
        return "bg-red-500/20 text-red-400";
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-zinc-400">Loading ad pricing calculator...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Ad Pricing Calculator</h1>
        <p className="text-zinc-400">
          Calculate optimal ad budgets and compare pricing scenarios across platforms
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400">
          {error}
          <button onClick={() => setError("")} className="ml-4 text-red-300 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
            <div className="text-zinc-400 text-sm mb-1">Total Budget</div>
            <div className="text-2xl font-bold text-white">${stats.totalBudget.toLocaleString()}</div>
          </div>
          <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
            <div className="text-zinc-400 text-sm mb-1">Projected Impressions</div>
            <div className="text-2xl font-bold text-indigo-400">{formatNumber(stats.projectedImpressions)}</div>
          </div>
          <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
            <div className="text-zinc-400 text-sm mb-1">Avg CPC</div>
            <div className="text-2xl font-bold text-green-400">${stats.avgCPC}</div>
          </div>
          <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
            <div className="text-zinc-400 text-sm mb-1">Avg ROAS</div>
            <div className="text-2xl font-bold text-purple-400">{stats.avgROAS}x</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-zinc-800 pb-4">
        {[
          { id: "calculator", label: "Budget Calculator" },
          { id: "scenarios", label: "Pricing Scenarios" },
          { id: "benchmarks", label: "Industry Benchmarks" },
          { id: "campaigns", label: "My Campaigns" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-indigo-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Calculator Tab */}
      {activeTab === "calculator" && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Calculator Form */}
          <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
            <h3 className="text-lg font-semibold text-white mb-4">Calculate Optimal Budget</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-zinc-400 text-sm mb-2">Platform</label>
                <div className="grid grid-cols-4 gap-2">
                  {platforms.map((platform) => (
                    <button
                      key={platform.id}
                      onClick={() => setCalcPlatform(platform.id)}
                      className={`p-3 rounded-lg border text-center transition-colors ${
                        calcPlatform === platform.id
                          ? "bg-indigo-600/20 border-indigo-500 text-white"
                          : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600"
                      }`}
                    >
                      <div className="text-xl mb-1">{platform.icon}</div>
                      <div className="text-xs">{platform.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 text-sm mb-2">Campaign Objective</label>
                <select
                  value={calcObjective}
                  onChange={(e) => setCalcObjective(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                >
                  {objectives.map((obj) => (
                    <option key={obj.value} value={obj.value}>
                      {obj.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 text-sm mb-2">
                  Target Reach: {formatNumber(calcTargetReach)}
                </label>
                <input
                  type="range"
                  min="10000"
                  max="10000000"
                  step="10000"
                  value={calcTargetReach}
                  onChange={(e) => setCalcTargetReach(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
                <div className="flex justify-between text-xs text-zinc-500 mt-1">
                  <span>10K</span>
                  <span>10M</span>
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 text-sm mb-2">Industry (Optional)</label>
                <select
                  value={calcIndustry}
                  onChange={(e) => setCalcIndustry(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Select industry...</option>
                  {industries.map((ind) => (
                    <option key={ind} value={ind}>
                      {ind}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={calculateBudget}
                disabled={calculating}
                className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {calculating ? "Calculating..." : "Calculate Budget"}
              </button>
            </div>
          </div>

          {/* Results */}
          <div className="space-y-6">
            {recommendation ? (
              <>
                <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
                  <h3 className="text-lg font-semibold text-white mb-4">Budget Recommendation</h3>

                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center p-4 bg-zinc-800/50 rounded-lg">
                      <div className="text-zinc-400 text-sm mb-1">Minimum</div>
                      <div className="text-xl font-bold text-yellow-400">
                        ${recommendation.minBudget.toLocaleString()}
                      </div>
                    </div>
                    <div className="text-center p-4 bg-indigo-600/20 rounded-lg border border-indigo-500/30">
                      <div className="text-indigo-300 text-sm mb-1">Recommended</div>
                      <div className="text-2xl font-bold text-indigo-400">
                        ${recommendation.recommendedBudget.toLocaleString()}
                      </div>
                    </div>
                    <div className="text-center p-4 bg-zinc-800/50 rounded-lg">
                      <div className="text-zinc-400 text-sm mb-1">Optimal</div>
                      <div className="text-xl font-bold text-green-400">
                        ${recommendation.optimalBudget.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <p className="text-zinc-400 text-sm mb-4">{recommendation.reasoning}</p>

                  <div className="border-t border-zinc-700 pt-4">
                    <h4 className="text-sm font-medium text-white mb-3">Expected Results</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Impressions</span>
                        <span className="text-white">
                          {formatNumber(recommendation.expectedResults.impressions)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Clicks</span>
                        <span className="text-white">
                          {formatNumber(recommendation.expectedResults.clicks)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Conversions</span>
                        <span className="text-white">
                          {recommendation.expectedResults.conversions}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Expected ROAS</span>
                        <span className="text-green-400">
                          {recommendation.expectedResults.roi}x
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Generate Scenarios */}
                <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
                  <h3 className="text-lg font-semibold text-white mb-4">Compare Scenarios</h3>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-zinc-400 text-sm mb-2">Daily Budget</label>
                      <input
                        type="number"
                        value={scenarioBudget}
                        onChange={(e) => setScenarioBudget(Number(e.target.value))}
                        className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-400 text-sm mb-2">Campaign Days</label>
                      <input
                        type="number"
                        value={scenarioDays}
                        onChange={(e) => setScenarioDays(Number(e.target.value))}
                        className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                      />
                    </div>
                  </div>

                  <button
                    onClick={generateScenarios}
                    className="w-full py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 transition-colors"
                  >
                    Generate Pricing Scenarios
                  </button>
                </div>
              </>
            ) : (
              <div className="bg-zinc-900/50 rounded-xl p-12 border border-zinc-800 text-center">
                <div className="text-5xl mb-4">💰</div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Calculate Your Optimal Budget
                </h3>
                <p className="text-zinc-400">
                  Select your platform, objective, and target reach to get personalized budget recommendations
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Scenarios Tab */}
      {activeTab === "scenarios" && (
        <div className="space-y-6">
          {scenarios.length > 0 ? (
            <>
              <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
                <h3 className="text-lg font-semibold text-white mb-4">Budget Comparison Scenarios</h3>
                <p className="text-zinc-400 text-sm mb-6">
                  Compare different budget levels to find the best balance of cost and performance
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-zinc-400 text-sm border-b border-zinc-700">
                        <th className="pb-3 font-medium">Scenario</th>
                        <th className="pb-3 font-medium">Total Budget</th>
                        <th className="pb-3 font-medium">Impressions</th>
                        <th className="pb-3 font-medium">Clicks</th>
                        <th className="pb-3 font-medium">Conversions</th>
                        <th className="pb-3 font-medium">CPM</th>
                        <th className="pb-3 font-medium">CPC</th>
                        <th className="pb-3 font-medium">Efficiency</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scenarios.map((scenario, index) => (
                        <tr
                          key={scenario.id}
                          className={`border-b border-zinc-800 ${
                            scenario.name === "Recommended" ? "bg-indigo-600/10" : ""
                          }`}
                        >
                          <td className="py-4">
                            <span className={`font-medium ${
                              scenario.name === "Recommended" ? "text-indigo-400" : "text-white"
                            }`}>
                              {scenario.name}
                            </span>
                          </td>
                          <td className="py-4 text-white font-medium">
                            ${scenario.budget.toLocaleString()}
                          </td>
                          <td className="py-4 text-zinc-300">
                            {formatNumber((scenario.projections.impressions.min + scenario.projections.impressions.max) / 2)}
                          </td>
                          <td className="py-4 text-zinc-300">
                            {formatNumber((scenario.projections.clicks.min + scenario.projections.clicks.max) / 2)}
                          </td>
                          <td className="py-4 text-zinc-300">
                            {Math.round((scenario.projections.conversions.min + scenario.projections.conversions.max) / 2)}
                          </td>
                          <td className="py-4 text-zinc-300">
                            ${((scenario.projections.cpm.min + scenario.projections.cpm.max) / 2).toFixed(2)}
                          </td>
                          <td className="py-4 text-zinc-300">
                            ${((scenario.projections.cpc.min + scenario.projections.cpc.max) / 2).toFixed(2)}
                          </td>
                          <td className="py-4">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-zinc-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-indigo-500"
                                  style={{ width: `${scenario.comparison.efficiency}%` }}
                                />
                              </div>
                              <span className="text-zinc-400 text-sm">
                                {scenario.comparison.efficiency}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Scenario Details */}
              <div className="grid md:grid-cols-3 gap-4">
                {scenarios.slice(1, 4).map((scenario) => (
                  <div
                    key={scenario.id}
                    className={`rounded-xl p-6 border ${
                      scenario.name === "Recommended"
                        ? "bg-indigo-600/20 border-indigo-500/50"
                        : "bg-zinc-900/50 border-zinc-800"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-white">{scenario.name}</h4>
                      {scenario.name === "Recommended" && (
                        <span className="px-2 py-1 bg-indigo-500 text-white text-xs rounded">
                          Best Value
                        </span>
                      )}
                    </div>

                    <div className="text-3xl font-bold text-white mb-4">
                      ${scenario.budget.toLocaleString()}
                    </div>

                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Impressions/Dollar</span>
                        <span className="text-white">
                          {scenario.comparison.impressionsPerDollar.toFixed(1)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Clicks/Dollar</span>
                        <span className="text-white">
                          {scenario.comparison.clicksPerDollar.toFixed(3)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">ROAS</span>
                        <span className="text-green-400">
                          {((scenario.projections.roas.min + scenario.projections.roas.max) / 2).toFixed(1)}x
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="bg-zinc-900/50 rounded-xl p-12 border border-zinc-800 text-center">
              <div className="text-5xl mb-4">📊</div>
              <h3 className="text-lg font-semibold text-white mb-2">No Scenarios Generated</h3>
              <p className="text-zinc-400 mb-6">
                Use the Budget Calculator to generate pricing scenarios
              </p>
              <button
                onClick={() => setActiveTab("calculator")}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Go to Calculator
              </button>
            </div>
          )}
        </div>
      )}

      {/* Benchmarks Tab */}
      {activeTab === "benchmarks" && (
        <div className="space-y-6">
          {/* Platform Rates */}
          <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
            <h3 className="text-lg font-semibold text-white mb-4">Platform Average Rates</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-zinc-400 text-sm border-b border-zinc-700">
                    <th className="pb-3 font-medium">Platform</th>
                    <th className="pb-3 font-medium">Avg CPM</th>
                    <th className="pb-3 font-medium">Avg CPC</th>
                    <th className="pb-3 font-medium">Avg CTR</th>
                    <th className="pb-3 font-medium">Conv Rate</th>
                    <th className="pb-3 font-medium">Min Budget</th>
                    <th className="pb-3 font-medium">Competition</th>
                  </tr>
                </thead>
                <tbody>
                  {platformRates.map((rate) => (
                    <tr key={rate.platform} className="border-b border-zinc-800">
                      <td className="py-4 font-medium text-white">{rate.platform}</td>
                      <td className="py-4 text-zinc-300">${rate.avgCPM.toFixed(2)}</td>
                      <td className="py-4 text-zinc-300">${rate.avgCPC.toFixed(2)}</td>
                      <td className="py-4 text-zinc-300">{rate.avgCTR.toFixed(2)}%</td>
                      <td className="py-4 text-zinc-300">{rate.avgConversionRate.toFixed(2)}%</td>
                      <td className="py-4 text-zinc-300">${rate.minBudget}</td>
                      <td className="py-4">
                        <span className={`px-2 py-1 rounded text-xs ${getCompetitionColor(rate.competitionLevel)}`}>
                          {rate.competitionLevel}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Industry Benchmarks */}
          <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
            <h3 className="text-lg font-semibold text-white mb-4">Industry Benchmarks</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-zinc-400 text-sm border-b border-zinc-700">
                    <th className="pb-3 font-medium">Industry</th>
                    <th className="pb-3 font-medium">Platform</th>
                    <th className="pb-3 font-medium">Avg CPM</th>
                    <th className="pb-3 font-medium">Avg CPC</th>
                    <th className="pb-3 font-medium">Avg CTR</th>
                    <th className="pb-3 font-medium">Conv Rate</th>
                    <th className="pb-3 font-medium">Avg ROAS</th>
                  </tr>
                </thead>
                <tbody>
                  {benchmarks.map((benchmark, index) => (
                    <tr key={index} className="border-b border-zinc-800">
                      <td className="py-4 font-medium text-white">{benchmark.industry}</td>
                      <td className="py-4 text-zinc-300 capitalize">{benchmark.platform}</td>
                      <td className="py-4 text-zinc-300">${benchmark.avgCPM.toFixed(2)}</td>
                      <td className="py-4 text-zinc-300">${benchmark.avgCPC.toFixed(2)}</td>
                      <td className="py-4 text-zinc-300">{benchmark.avgCTR.toFixed(2)}%</td>
                      <td className="py-4 text-zinc-300">{benchmark.avgConversionRate.toFixed(2)}%</td>
                      <td className="py-4 text-green-400">{benchmark.avgROAS}x</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Campaigns Tab */}
      {activeTab === "campaigns" && (
        <div className="space-y-4">
          {campaigns.length === 0 ? (
            <div className="bg-zinc-900/50 rounded-xl p-12 border border-zinc-800 text-center">
              <div className="text-5xl mb-4">📈</div>
              <h3 className="text-lg font-semibold text-white mb-2">No Campaigns Yet</h3>
              <p className="text-zinc-400">
                Use the calculator to plan your first ad campaign
              </p>
            </div>
          ) : (
            campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-white">{campaign.name}</h3>
                    <p className="text-sm text-zinc-400">
                      {campaign.platform} • {campaign.objective}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs ${
                    campaign.status === "active"
                      ? "bg-green-500/20 text-green-400"
                      : campaign.status === "draft"
                      ? "bg-zinc-500/20 text-zinc-400"
                      : "bg-yellow-500/20 text-yellow-400"
                  }`}>
                    {campaign.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-zinc-400 text-sm">Budget</div>
                    <div className="text-white font-medium">
                      ${campaign.budget.amount}/{campaign.budget.type}
                    </div>
                  </div>
                  <div>
                    <div className="text-zinc-400 text-sm">Est. Impressions</div>
                    <div className="text-white font-medium">
                      {formatNumber((campaign.projections.impressions.min + campaign.projections.impressions.max) / 2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-zinc-400 text-sm">Est. Clicks</div>
                    <div className="text-white font-medium">
                      {formatNumber((campaign.projections.clicks.min + campaign.projections.clicks.max) / 2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-zinc-400 text-sm">Est. ROAS</div>
                    <div className="text-green-400 font-medium">
                      {((campaign.projections.roas.min + campaign.projections.roas.max) / 2).toFixed(1)}x
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
