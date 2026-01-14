"use client";

import { useState, useEffect } from "react";
import {
  DollarSign,
  TrendingUp,
  Calculator,
  Target,
  Plus,
  Trash2,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from "lucide-react";

interface ROIMetrics {
  totalInvestment: number;
  totalRevenue: number;
  roi: number;
  costPerLead: number;
  costPerAcquisition: number;
  customerLifetimeValue: number;
  socialMediaValue: number;
}

interface CampaignROI {
  id: string;
  name: string;
  platform: string;
  startDate: string;
  endDate: string;
  investment: {
    adSpend: number;
    contentCreation: number;
    tools: number;
    labor: number;
    influencer: number;
    other: number;
  };
  results: {
    impressions: number;
    reach: number;
    engagement: number;
    clicks: number;
    leads: number;
    conversions: number;
    revenue: number;
  };
  metrics?: ROIMetrics;
  createdAt: string;
}

interface ROIGoal {
  id: string;
  name: string;
  targetROI: number;
  targetRevenue: number;
  targetLeads: number;
  targetConversions: number;
  deadline: string;
  currentProgress: number;
  status: "on_track" | "at_risk" | "behind" | "achieved";
}

interface Summary {
  totalCampaigns: number;
  totalInvestment: number;
  totalRevenue: number;
  overallROI: number;
  totalLeads: number;
  totalConversions: number;
  costPerLead: number;
  costPerConversion: number;
}

const PLATFORMS = ["Instagram", "Facebook", "X", "LinkedIn", "TikTok", "YouTube", "Pinterest"];

const INDUSTRY_BENCHMARKS: Record<string, { avgROI: number; avgCPL: number; avgCPA: number }> = {
  ecommerce: { avgROI: 95, avgCPL: 38, avgCPA: 45 },
  saas: { avgROI: 120, avgCPL: 45, avgCPA: 75 },
  healthcare: { avgROI: 75, avgCPL: 52, avgCPA: 90 },
  finance: { avgROI: 85, avgCPL: 48, avgCPA: 85 },
  education: { avgROI: 110, avgCPL: 32, avgCPA: 55 },
  retail: { avgROI: 80, avgCPL: 35, avgCPA: 50 },
  technology: { avgROI: 130, avgCPL: 42, avgCPA: 70 },
};

export default function ROICalculatorPage() {
  const [activeTab, setActiveTab] = useState<"calculator" | "campaigns" | "goals">("calculator");
  const [campaigns, setCampaigns] = useState<CampaignROI[]>([]);
  const [goals, setGoals] = useState<ROIGoal[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [platformROI, setPlatformROI] = useState<Record<string, ROIMetrics>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Calculator state
  const [investment, setInvestment] = useState({
    adSpend: 0,
    contentCreation: 0,
    tools: 0,
    labor: 0,
    influencer: 0,
    other: 0,
  });
  const [results, setResults] = useState({
    impressions: 0,
    reach: 0,
    engagement: 0,
    clicks: 0,
    leads: 0,
    conversions: 0,
    revenue: 0,
  });
  const [customerLifetimeValue, setCustomerLifetimeValue] = useState(100);
  const [calculatedMetrics, setCalculatedMetrics] = useState<ROIMetrics | null>(null);
  const [insights, setInsights] = useState<{ summary: string; suggestions: string[]; healthScore: number } | null>(null);
  const [selectedIndustry, setSelectedIndustry] = useState("ecommerce");

  // Campaign form state
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [campaignName, setCampaignName] = useState("");
  const [campaignPlatform, setCampaignPlatform] = useState("Instagram");

  // Goal form state
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalName, setGoalName] = useState("");
  const [goalTargetROI, setGoalTargetROI] = useState(100);
  const [goalTargetRevenue, setGoalTargetRevenue] = useState(10000);
  const [goalDeadline, setGoalDeadline] = useState("");

  useEffect(() => {
    fetchCampaigns();
    fetchGoals();
    fetchSummary();
    fetchPlatformROI();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const response = await fetch("/api/roi?action=campaigns");
      const data = await response.json();
      if (data.campaigns) {
        setCampaigns(data.campaigns);
      }
    } catch (error) {
      console.error("Failed to fetch campaigns:", error);
    }
  };

  const fetchGoals = async () => {
    try {
      const response = await fetch("/api/roi?action=goals");
      const data = await response.json();
      if (data.goals) {
        setGoals(data.goals);
      }
    } catch (error) {
      console.error("Failed to fetch goals:", error);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await fetch("/api/roi?action=summary");
      const data = await response.json();
      if (data.summary) {
        setSummary(data.summary);
      }
    } catch (error) {
      console.error("Failed to fetch summary:", error);
    }
  };

  const fetchPlatformROI = async () => {
    try {
      const response = await fetch("/api/roi?action=platform-roi");
      const data = await response.json();
      if (data.platformROI) {
        setPlatformROI(data.platformROI);
      }
    } catch (error) {
      console.error("Failed to fetch platform ROI:", error);
    }
  };

  const handleCalculate = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/roi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "calculate",
          investment,
          results,
          customerLifetimeValue,
        }),
      });

      const data = await response.json();
      if (data.metrics) {
        setCalculatedMetrics(data.metrics);
      }
      if (data.insights) {
        setInsights(data.insights);
      }
    } catch (error) {
      console.error("Failed to calculate ROI:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCampaign = async () => {
    if (!campaignName) return;

    try {
      const response = await fetch("/api/roi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-campaign",
          name: campaignName,
          platform: campaignPlatform,
          investment,
          results,
        }),
      });

      const data = await response.json();
      if (data.campaign) {
        setCampaigns([data.campaign, ...campaigns]);
        setShowCampaignForm(false);
        setCampaignName("");
        fetchSummary();
        fetchPlatformROI();
      }
    } catch (error) {
      console.error("Failed to create campaign:", error);
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    try {
      await fetch("/api/roi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete-campaign",
          campaignId,
        }),
      });

      setCampaigns(campaigns.filter((c) => c.id !== campaignId));
      fetchSummary();
      fetchPlatformROI();
    } catch (error) {
      console.error("Failed to delete campaign:", error);
    }
  };

  const handleCreateGoal = async () => {
    if (!goalName || !goalDeadline) return;

    try {
      const response = await fetch("/api/roi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-goal",
          name: goalName,
          targetROI: goalTargetROI,
          targetRevenue: goalTargetRevenue,
          deadline: goalDeadline,
        }),
      });

      const data = await response.json();
      if (data.goal) {
        setGoals([...goals, data.goal]);
        setShowGoalForm(false);
        setGoalName("");
        setGoalDeadline("");
      }
    } catch (error) {
      console.error("Failed to create goal:", error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getROIColor = (roi: number) => {
    if (roi >= 100) return "text-green-400";
    if (roi >= 50) return "text-yellow-400";
    if (roi >= 0) return "text-orange-400";
    return "text-red-400";
  };

  const getStatusColor = (status: ROIGoal["status"]) => {
    switch (status) {
      case "achieved":
        return "text-green-400 bg-green-400/10";
      case "on_track":
        return "text-blue-400 bg-blue-400/10";
      case "at_risk":
        return "text-yellow-400 bg-yellow-400/10";
      case "behind":
        return "text-red-400 bg-red-400/10";
    }
  };

  const totalInvestment = Object.values(investment).reduce((sum, val) => sum + val, 0);
  const benchmark = INDUSTRY_BENCHMARKS[selectedIndustry];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-indigo-400" />
            Social Media ROI Calculator
          </h1>
          <p className="text-zinc-400 mt-1">Track and optimize your social media return on investment</p>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Total Investment</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(summary.totalInvestment)}</p>
              </div>
              <div className="p-3 bg-red-500/10 rounded-lg">
                <DollarSign className="w-5 h-5 text-red-400" />
              </div>
            </div>
          </div>

          <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Total Revenue</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(summary.totalRevenue)}</p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Overall ROI</p>
                <p className={`text-2xl font-bold ${getROIColor(summary.overallROI)}`}>
                  {summary.overallROI}%
                </p>
              </div>
              <div className={`p-3 rounded-lg ${summary.overallROI >= 0 ? "bg-green-500/10" : "bg-red-500/10"}`}>
                {summary.overallROI >= 0 ? (
                  <ArrowUpRight className="w-5 h-5 text-green-400" />
                ) : (
                  <ArrowDownRight className="w-5 h-5 text-red-400" />
                )}
              </div>
            </div>
          </div>

          <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Conversions</p>
                <p className="text-2xl font-bold text-white">{summary.totalConversions}</p>
              </div>
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <Target className="w-5 h-5 text-purple-400" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-zinc-800">
        <nav className="flex gap-4">
          {[
            { id: "calculator", label: "Calculator", icon: Calculator },
            { id: "campaigns", label: "Campaigns", icon: BarChart3 },
            { id: "goals", label: "Goals", icon: Target },
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

      {/* Calculator Tab */}
      {activeTab === "calculator" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Panel */}
          <div className="space-y-6">
            {/* Investment */}
            <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
              <h3 className="text-lg font-semibold text-white mb-4">Investment</h3>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(investment).map(([key, value]) => (
                  <div key={key}>
                    <label className="block text-sm text-zinc-400 mb-2 capitalize">
                      {key.replace(/([A-Z])/g, " $1")}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                      <input
                        type="number"
                        value={value}
                        onChange={(e) => setInvestment({ ...investment, [key]: parseFloat(e.target.value) || 0 })}
                        className="w-full pl-8 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-zinc-700">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Total Investment</span>
                  <span className="text-xl font-bold text-white">{formatCurrency(totalInvestment)}</span>
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
              <h3 className="text-lg font-semibold text-white mb-4">Results</h3>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(results).map(([key, value]) => (
                  <div key={key}>
                    <label className="block text-sm text-zinc-400 mb-2 capitalize">{key}</label>
                    <input
                      type="number"
                      value={value}
                      onChange={(e) => setResults({ ...results, [key]: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Settings */}
            <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
              <h3 className="text-lg font-semibold text-white mb-4">Settings</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Customer Lifetime Value</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                    <input
                      type="number"
                      value={customerLifetimeValue}
                      onChange={(e) => setCustomerLifetimeValue(parseFloat(e.target.value) || 0)}
                      className="w-full pl-8 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Industry Benchmark</label>
                  <select
                    value={selectedIndustry}
                    onChange={(e) => setSelectedIndustry(e.target.value)}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {Object.keys(INDUSTRY_BENCHMARKS).map((industry) => (
                      <option key={industry} value={industry} className="capitalize">
                        {industry.replace("-", " ")}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={handleCalculate}
                disabled={isLoading}
                className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50"
              >
                <Calculator className="w-4 h-4" />
                {isLoading ? "Calculating..." : "Calculate ROI"}
              </button>
            </div>
          </div>

          {/* Results Panel */}
          <div className="space-y-6">
            {calculatedMetrics ? (
              <>
                {/* ROI Score */}
                <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
                  <div className="text-center mb-6">
                    <p className="text-sm text-zinc-400 mb-2">Return on Investment</p>
                    <p className={`text-5xl font-bold ${getROIColor(calculatedMetrics.roi)}`}>
                      {calculatedMetrics.roi}%
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-zinc-800 rounded-lg p-3">
                      <p className="text-xs text-zinc-500">Cost per Lead</p>
                      <p className="text-lg font-bold text-white">{formatCurrency(calculatedMetrics.costPerLead)}</p>
                      {benchmark && (
                        <p className={`text-xs ${calculatedMetrics.costPerLead <= benchmark.avgCPL ? "text-green-400" : "text-red-400"}`}>
                          Benchmark: {formatCurrency(benchmark.avgCPL)}
                        </p>
                      )}
                    </div>

                    <div className="bg-zinc-800 rounded-lg p-3">
                      <p className="text-xs text-zinc-500">Cost per Acquisition</p>
                      <p className="text-lg font-bold text-white">{formatCurrency(calculatedMetrics.costPerAcquisition)}</p>
                      {benchmark && (
                        <p className={`text-xs ${calculatedMetrics.costPerAcquisition <= benchmark.avgCPA ? "text-green-400" : "text-red-400"}`}>
                          Benchmark: {formatCurrency(benchmark.avgCPA)}
                        </p>
                      )}
                    </div>

                    <div className="bg-zinc-800 rounded-lg p-3">
                      <p className="text-xs text-zinc-500">Total Investment</p>
                      <p className="text-lg font-bold text-white">{formatCurrency(calculatedMetrics.totalInvestment)}</p>
                    </div>

                    <div className="bg-zinc-800 rounded-lg p-3">
                      <p className="text-xs text-zinc-500">Total Revenue</p>
                      <p className="text-lg font-bold text-white">{formatCurrency(calculatedMetrics.totalRevenue)}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-zinc-700">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Social Media Value</span>
                      <span className="text-xl font-bold text-green-400">
                        {formatCurrency(calculatedMetrics.socialMediaValue)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Insights */}
                {insights && (
                  <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
                    <h3 className="text-lg font-semibold text-white mb-4">Insights</h3>

                    <div className={`p-4 rounded-lg mb-4 ${
                      insights.healthScore >= 70 ? "bg-green-500/10" : insights.healthScore >= 50 ? "bg-yellow-500/10" : "bg-red-500/10"
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-zinc-400">Health Score</span>
                        <span className={`text-xl font-bold ${
                          insights.healthScore >= 70 ? "text-green-400" : insights.healthScore >= 50 ? "text-yellow-400" : "text-red-400"
                        }`}>
                          {insights.healthScore}/100
                        </span>
                      </div>
                      <p className="text-sm text-zinc-300">{insights.summary}</p>
                    </div>

                    {insights.suggestions.length > 0 && (
                      <div>
                        <p className="text-sm text-zinc-400 mb-2">Recommendations</p>
                        <ul className="space-y-2">
                          {insights.suggestions.map((suggestion, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm text-zinc-300">
                              <Zap className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                              {suggestion}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Save as Campaign */}
                <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
                  <h3 className="text-lg font-semibold text-white mb-4">Save as Campaign</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                      placeholder="Campaign name"
                      className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <select
                      value={campaignPlatform}
                      onChange={(e) => setCampaignPlatform(e.target.value)}
                      className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {PLATFORMS.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={handleCreateCampaign}
                    disabled={!campaignName}
                    className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    Save Campaign
                  </button>
                </div>
              </>
            ) : (
              <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800 text-center py-16">
                <Calculator className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
                <p className="text-zinc-400">Enter your investment and results, then click &quot;Calculate ROI&quot;</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Campaigns Tab */}
      {activeTab === "campaigns" && (
        <div className="space-y-6">
          {/* Platform ROI Overview */}
          {Object.keys(platformROI).length > 0 && (
            <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
              <h3 className="text-lg font-semibold text-white mb-4">ROI by Platform</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(platformROI).map(([platform, metrics]) => (
                  <div key={platform} className="bg-zinc-800 rounded-lg p-4">
                    <p className="text-sm text-zinc-400 mb-1">{platform}</p>
                    <p className={`text-2xl font-bold ${getROIColor(metrics.roi)}`}>{metrics.roi}%</p>
                    <p className="text-xs text-zinc-500">
                      {formatCurrency(metrics.totalInvestment)} invested
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Campaigns List */}
          <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
            <h3 className="text-lg font-semibold text-white mb-4">Campaign History</h3>

            {campaigns.length === 0 ? (
              <div className="text-center py-12">
                <BarChart3 className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                <p className="text-zinc-400">No campaigns yet. Save a calculation as a campaign to start tracking.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {campaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className="bg-zinc-800 rounded-lg p-4 border border-zinc-700"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-white">{campaign.name}</h4>
                        <p className="text-sm text-zinc-400">{campaign.platform}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className={`text-xl font-bold ${getROIColor(campaign.metrics?.roi || 0)}`}>
                            {campaign.metrics?.roi || 0}% ROI
                          </p>
                          <p className="text-xs text-zinc-500">
                            {formatCurrency(campaign.metrics?.totalRevenue || 0)} revenue
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteCampaign(campaign.id)}
                          className="p-2 text-zinc-500 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-zinc-500">Investment</p>
                        <p className="text-white">{formatCurrency(campaign.metrics?.totalInvestment || 0)}</p>
                      </div>
                      <div>
                        <p className="text-zinc-500">Leads</p>
                        <p className="text-white">{campaign.results.leads}</p>
                      </div>
                      <div>
                        <p className="text-zinc-500">Conversions</p>
                        <p className="text-white">{campaign.results.conversions}</p>
                      </div>
                      <div>
                        <p className="text-zinc-500">Cost/Acquisition</p>
                        <p className="text-white">{formatCurrency(campaign.metrics?.costPerAcquisition || 0)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Goals Tab */}
      {activeTab === "goals" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">ROI Goals</h3>
            <button
              onClick={() => setShowGoalForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500"
            >
              <Plus className="w-4 h-4" />
              Add Goal
            </button>
          </div>

          {goals.length === 0 ? (
            <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800 text-center py-12">
              <Target className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-zinc-400">No goals set. Create a goal to track your ROI targets.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {goals.map((goal) => (
                <div
                  key={goal.id}
                  className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-medium text-white">{goal.name}</h4>
                      <p className="text-sm text-zinc-400">
                        Due: {new Date(goal.deadline).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs ${getStatusColor(goal.status)}`}>
                      {goal.status.replace("_", " ")}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-zinc-400">Progress</span>
                        <span className="text-white">{goal.currentProgress}%</span>
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            goal.status === "achieved" ? "bg-green-400" :
                            goal.status === "on_track" ? "bg-blue-400" :
                            goal.status === "at_risk" ? "bg-yellow-400" : "bg-red-400"
                          }`}
                          style={{ width: `${Math.min(100, goal.currentProgress)}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="bg-zinc-800 rounded p-2">
                        <p className="text-zinc-500">Target ROI</p>
                        <p className="text-white font-medium">{goal.targetROI}%</p>
                      </div>
                      <div className="bg-zinc-800 rounded p-2">
                        <p className="text-zinc-500">Target Revenue</p>
                        <p className="text-white font-medium">{formatCurrency(goal.targetRevenue)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Goal Form Modal */}
          {showGoalForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-md border border-zinc-800">
                <h3 className="text-lg font-semibold text-white mb-4">Create ROI Goal</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-zinc-400 mb-2">Goal Name</label>
                    <input
                      type="text"
                      value={goalName}
                      onChange={(e) => setGoalName(e.target.value)}
                      placeholder="e.g., Q1 Social Media ROI"
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-zinc-400 mb-2">Target ROI (%)</label>
                      <input
                        type="number"
                        value={goalTargetROI}
                        onChange={(e) => setGoalTargetROI(parseInt(e.target.value) || 0)}
                        className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-zinc-400 mb-2">Target Revenue</label>
                      <input
                        type="number"
                        value={goalTargetRevenue}
                        onChange={(e) => setGoalTargetRevenue(parseInt(e.target.value) || 0)}
                        className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-zinc-400 mb-2">Deadline</label>
                    <input
                      type="date"
                      value={goalDeadline}
                      onChange={(e) => setGoalDeadline(e.target.value)}
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-6">
                  <button
                    onClick={() => setShowGoalForm(false)}
                    className="flex-1 px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateGoal}
                    disabled={!goalName || !goalDeadline}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50"
                  >
                    Create Goal
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
