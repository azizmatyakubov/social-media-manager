"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";

interface Variant {
  id: string;
  name: string;
  content: string;
  impressions: number;
  engagements: number;
  clicks: number;
}

interface ABTest {
  id: string;
  name: string;
  description: string | null;
  platform: string;
  status: string;
  metric: string;
  duration: number;
  winnerId: string | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  variants: Variant[];
}

interface TestResult {
  variant: string;
  content: string;
  impressions: number;
  engagements: number;
  clicks: number;
  engagementRate: string;
  clickRate: string;
  isWinner: boolean;
}

interface DetailedResults {
  test: {
    id: string;
    name: string;
    status: string;
    metric: string;
    startedAt: string | null;
    endedAt: string | null;
  };
  results: TestResult[];
  statisticalSignificance: string;
}

type ViewMode = "all" | "draft" | "running" | "completed";

export default function ABTestsPage() {
  const { data: session, status } = useSession();
  const [tests, setTests] = useState<ABTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [selectedTest, setSelectedTest] = useState<ABTest | null>(null);
  const [testResults, setTestResults] = useState<DetailedResults | null>(null);
  const [loadingResults, setLoadingResults] = useState(false);
  const [newTest, setNewTest] = useState({
    name: "",
    description: "",
    content: "",
    platform: "X",
    metric: "engagement",
    duration: 24,
    numVariants: 2,
  });
  const [generatedVariants, setGeneratedVariants] = useState<Array<{ name: string; content: string }>>([]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchTests();
    }
  }, [status]);

  useEffect(() => {
    if (selectedTest && (selectedTest.status === "RUNNING" || selectedTest.status === "COMPLETED")) {
      fetchTestResults(selectedTest.id);
    }
  }, [selectedTest]);

  if (status === "loading") return <div className="p-8">Loading...</div>;
  if (status === "unauthenticated") redirect("/login");

  async function fetchTests() {
    try {
      const res = await fetch("/api/ab-tests");
      const data = await res.json();
      setTests(data);
    } catch (error) {
      console.error("Failed to fetch tests:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchTestResults(testId: string) {
    setLoadingResults(true);
    try {
      const res = await fetch(`/api/ab-tests?testId=${testId}`);
      const data = await res.json();
      setTestResults(data);
    } catch (error) {
      console.error("Failed to fetch results:", error);
    } finally {
      setLoadingResults(false);
    }
  }

  async function generateVariants() {
    if (!newTest.content) return;
    setGenerating(true);

    try {
      const res = await fetch("/api/ab-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-variants",
          content: newTest.content,
          platform: newTest.platform,
          numVariants: newTest.numVariants,
        }),
      });

      const data = await res.json();
      setGeneratedVariants(data.variants || []);
    } catch (error) {
      console.error("Failed to generate variants:", error);
    } finally {
      setGenerating(false);
    }
  }

  async function createTest() {
    if (generatedVariants.length < 2) {
      alert("Generate at least 2 variants first");
      return;
    }

    const res = await fetch("/api/ab-tests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        name: newTest.name,
        description: newTest.description,
        platform: newTest.platform,
        metric: newTest.metric,
        duration: newTest.duration,
        variants: generatedVariants,
      }),
    });

    if (res.ok) {
      setShowCreateModal(false);
      setNewTest({
        name: "",
        description: "",
        content: "",
        platform: "X",
        metric: "engagement",
        duration: 24,
        numVariants: 2,
      });
      setGeneratedVariants([]);
      fetchTests();
    }
  }

  async function startTest(testId: string) {
    await fetch("/api/ab-tests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start", testId }),
    });
    fetchTests();
  }

  async function completeTest(testId: string) {
    await fetch("/api/ab-tests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete", testId }),
    });
    fetchTests();
    if (selectedTest?.id === testId) {
      fetchTestResults(testId);
    }
  }

  async function cancelTest(testId: string) {
    if (!confirm("Are you sure you want to cancel this test?")) return;
    await fetch("/api/ab-tests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel", testId }),
    });
    fetchTests();
  }

  function getFilteredTests() {
    if (viewMode === "all") return tests;
    const statusMap: Record<string, string> = {
      draft: "DRAFT",
      running: "RUNNING",
      completed: "COMPLETED",
    };
    return tests.filter(t => t.status === statusMap[viewMode]);
  }

  function getTestStats() {
    return {
      total: tests.length,
      draft: tests.filter(t => t.status === "DRAFT").length,
      running: tests.filter(t => t.status === "RUNNING").length,
      completed: tests.filter(t => t.status === "COMPLETED").length,
    };
  }

  function renderResultsChart(results: TestResult[]) {
    if (!results || results.length === 0) return null;

    const maxEngagement = Math.max(...results.map(r => parseFloat(r.engagementRate))) || 1;
    const maxImpressions = Math.max(...results.map(r => r.impressions)) || 1;

    return (
      <div className="space-y-6">
        {/* Engagement Rate Comparison */}
        <div>
          <h4 className="font-medium mb-3">Engagement Rate Comparison</h4>
          <div className="space-y-3">
            {results.map((result, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-20 text-sm font-medium">
                  Variant {result.variant}
                  {result.isWinner && <span className="text-green-500 ml-1">*</span>}
                </div>
                <div className="flex-1 h-8 bg-[var(--x-bg-secondary)] rounded overflow-hidden">
                  <div
                    className={`h-full ${result.isWinner ? "bg-green-500" : "bg-[var(--x-blue)]"} transition-all duration-500`}
                    style={{ width: `${(parseFloat(result.engagementRate) / maxEngagement) * 100}%` }}
                  ></div>
                </div>
                <div className="w-16 text-right text-sm font-medium">
                  {result.engagementRate}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Impressions Comparison */}
        <div>
          <h4 className="font-medium mb-3">Impressions Comparison</h4>
          <div className="space-y-3">
            {results.map((result, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-20 text-sm font-medium">
                  Variant {result.variant}
                </div>
                <div className="flex-1 h-8 bg-[var(--x-bg-secondary)] rounded overflow-hidden">
                  <div
                    className={`h-full bg-purple-500 transition-all duration-500`}
                    style={{ width: `${(result.impressions / maxImpressions) * 100}%` }}
                  ></div>
                </div>
                <div className="w-16 text-right text-sm font-medium">
                  {result.impressions.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detailed Stats Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--x-border)]">
                <th className="text-left py-3 px-2">Variant</th>
                <th className="text-right py-3 px-2">Impressions</th>
                <th className="text-right py-3 px-2">Engagements</th>
                <th className="text-right py-3 px-2">Clicks</th>
                <th className="text-right py-3 px-2">Eng. Rate</th>
                <th className="text-right py-3 px-2">Click Rate</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result, i) => (
                <tr key={i} className={`border-b border-[var(--x-border)] ${result.isWinner ? "bg-green-500/10" : ""}`}>
                  <td className="py-3 px-2 font-medium">
                    {result.variant}
                    {result.isWinner && <span className="x-badge x-badge-green ml-2">Winner</span>}
                  </td>
                  <td className="text-right py-3 px-2">{result.impressions.toLocaleString()}</td>
                  <td className="text-right py-3 px-2">{result.engagements.toLocaleString()}</td>
                  <td className="text-right py-3 px-2">{result.clicks.toLocaleString()}</td>
                  <td className="text-right py-3 px-2">{result.engagementRate}%</td>
                  <td className="text-right py-3 px-2">{result.clickRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const stats = getTestStats();
  const filteredTests = getFilteredTests();

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">A/B Testing</h1>
          <p className="text-[var(--x-text-secondary)]">
            Test different post variations to find what works best
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
        >
          New Test
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="x-card p-4">
          <p className="text-sm text-[var(--x-text-secondary)]">Total Tests</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="x-card p-4">
          <p className="text-sm text-[var(--x-text-secondary)]">Draft</p>
          <p className="text-2xl font-bold">{stats.draft}</p>
        </div>
        <div className="x-card p-4">
          <p className="text-sm text-[var(--x-text-secondary)]">Running</p>
          <p className="text-2xl font-bold text-[var(--x-blue)]">{stats.running}</p>
        </div>
        <div className="x-card p-4">
          <p className="text-sm text-[var(--x-text-secondary)]">Completed</p>
          <p className="text-2xl font-bold text-green-500">{stats.completed}</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 border-b border-[var(--x-border)]">
        {(["all", "draft", "running", "completed"] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => {
              setViewMode(mode);
              setSelectedTest(null);
            }}
            className={`px-4 py-2 -mb-px border-b-2 transition-colors capitalize ${
              viewMode === mode
                ? "border-[var(--x-blue)] text-[var(--x-blue)]"
                : "border-transparent text-[var(--x-text-secondary)] hover:text-[var(--x-text-primary)]"
            }`}
          >
            {mode} {mode !== "all" && `(${stats[mode]})`}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tests List */}
        <div className="lg:col-span-1">
          {loading ? (
            <div className="text-center py-12 text-[var(--x-text-secondary)]">
              Loading tests...
            </div>
          ) : filteredTests.length === 0 ? (
            <div className="x-card p-8 text-center">
              <p className="text-[var(--x-text-secondary)] mb-4">
                {viewMode === "all"
                  ? "No A/B tests yet. Create one to start optimizing."
                  : `No ${viewMode} tests.`}
              </p>
              {viewMode === "all" && (
                <button onClick={() => setShowCreateModal(true)} className="btn-primary">
                  Create First Test
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTests.map((test) => (
                <div
                  key={test.id}
                  onClick={() => setSelectedTest(test)}
                  className={`x-card p-4 cursor-pointer transition-colors ${
                    selectedTest?.id === test.id
                      ? "border-[var(--x-blue)] bg-[var(--x-blue)]/5"
                      : "hover:border-[var(--x-blue)]/50"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold">{test.name}</h3>
                    <span className={`x-badge ${
                      test.status === "RUNNING" ? "x-badge-blue" :
                      test.status === "COMPLETED" ? "x-badge-green" : ""
                    }`}>
                      {test.status}
                    </span>
                  </div>
                  <div className="text-sm text-[var(--x-text-secondary)]">
                    {test.variants.length} variants | {test.metric} | {test.duration}h
                  </div>
                  {test.winnerId && (
                    <div className="mt-2 text-sm text-green-500">
                      Winner: Variant {test.variants.find(v => v.id === test.winnerId)?.name}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Test Details */}
        <div className="lg:col-span-2">
          {selectedTest ? (
            <div className="x-card p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-bold">{selectedTest.name}</h2>
                  {selectedTest.description && (
                    <p className="text-[var(--x-text-secondary)] mt-1">
                      {selectedTest.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`x-badge ${
                    selectedTest.status === "RUNNING" ? "x-badge-blue" :
                    selectedTest.status === "COMPLETED" ? "x-badge-green" : ""
                  }`}>
                    {selectedTest.status}
                  </span>
                  {selectedTest.status === "DRAFT" && (
                    <>
                      <button
                        onClick={() => startTest(selectedTest.id)}
                        className="btn-primary text-sm"
                      >
                        Start Test
                      </button>
                      <button
                        onClick={() => cancelTest(selectedTest.id)}
                        className="btn-secondary text-sm"
                      >
                        Delete
                      </button>
                    </>
                  )}
                  {selectedTest.status === "RUNNING" && (
                    <button
                      onClick={() => completeTest(selectedTest.id)}
                      className="btn-secondary text-sm"
                    >
                      End Test
                    </button>
                  )}
                </div>
              </div>

              {/* Test Info */}
              <div className="grid grid-cols-4 gap-4 mb-6 p-4 bg-[var(--x-bg-secondary)] rounded-lg">
                <div>
                  <p className="text-xs text-[var(--x-text-secondary)]">Platform</p>
                  <p className="font-medium">{selectedTest.platform}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--x-text-secondary)]">Success Metric</p>
                  <p className="font-medium capitalize">{selectedTest.metric}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--x-text-secondary)]">Duration</p>
                  <p className="font-medium">{selectedTest.duration} hours</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--x-text-secondary)]">Variants</p>
                  <p className="font-medium">{selectedTest.variants.length}</p>
                </div>
              </div>

              {/* Results or Variants */}
              {selectedTest.status === "RUNNING" || selectedTest.status === "COMPLETED" ? (
                <div>
                  <h3 className="font-bold mb-4">Results</h3>
                  {loadingResults ? (
                    <div className="text-center py-8 text-[var(--x-text-secondary)]">
                      Loading results...
                    </div>
                  ) : testResults ? (
                    <div className="space-y-6">
                      {/* Statistical Significance */}
                      <div className={`p-4 rounded-lg ${
                        testResults.statisticalSignificance.includes("confidence")
                          ? "bg-green-500/10 border border-green-500"
                          : "bg-yellow-500/10 border border-yellow-500"
                      }`}>
                        <p className="font-medium">Statistical Significance</p>
                        <p className="text-sm text-[var(--x-text-secondary)]">
                          {testResults.statisticalSignificance}
                        </p>
                      </div>

                      {renderResultsChart(testResults.results)}

                      {/* Variant Content */}
                      <div>
                        <h4 className="font-medium mb-3">Variant Content</h4>
                        <div className="space-y-3">
                          {testResults.results.map((result, i) => (
                            <div
                              key={i}
                              className={`p-4 rounded-lg ${
                                result.isWinner
                                  ? "border-2 border-green-500 bg-green-500/5"
                                  : "bg-[var(--x-bg-secondary)]"
                              }`}
                            >
                              <div className="flex justify-between items-center mb-2">
                                <span className="font-bold">Variant {result.variant}</span>
                                {result.isWinner && (
                                  <span className="x-badge x-badge-green">Winner</span>
                                )}
                              </div>
                              <p className="text-sm">{result.content}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[var(--x-text-secondary)]">No results available yet.</p>
                  )}
                </div>
              ) : (
                <div>
                  <h3 className="font-bold mb-4">Variants</h3>
                  <div className="space-y-3">
                    {selectedTest.variants.map((variant) => (
                      <div key={variant.id} className="p-4 bg-[var(--x-bg-secondary)] rounded-lg">
                        <span className="font-bold">Variant {variant.name}</span>
                        <p className="text-sm mt-2">{variant.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="x-card p-12 text-center">
              <div className="text-6xl mb-4 opacity-20">A|B</div>
              <p className="text-[var(--x-text-secondary)]">
                Select a test to view details
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create Test Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 x-modal-overlay flex items-center justify-center z-50">
          <div className="x-modal p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Create A/B Test</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Test Name</label>
                <input
                  type="text"
                  placeholder="e.g., Hook style comparison"
                  value={newTest.name}
                  onChange={(e) => setNewTest({ ...newTest, name: e.target.value })}
                  className="x-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description (optional)</label>
                <input
                  type="text"
                  placeholder="What are you testing?"
                  value={newTest.description}
                  onChange={(e) => setNewTest({ ...newTest, description: e.target.value })}
                  className="x-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Original Content</label>
                <textarea
                  placeholder="Enter your base post content..."
                  value={newTest.content}
                  onChange={(e) => setNewTest({ ...newTest, content: e.target.value })}
                  className="x-input"
                  rows={4}
                />
                <p className="text-xs text-[var(--x-text-secondary)] mt-1">
                  AI will generate variations of this content for testing
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Success Metric</label>
                  <select
                    value={newTest.metric}
                    onChange={(e) => setNewTest({ ...newTest, metric: e.target.value })}
                    className="x-input"
                  >
                    <option value="engagement">Engagement Rate</option>
                    <option value="clicks">Click-through Rate</option>
                    <option value="impressions">Impressions</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Duration (hours)</label>
                  <select
                    value={newTest.duration}
                    onChange={(e) => setNewTest({ ...newTest, duration: parseInt(e.target.value) })}
                    className="x-input"
                  >
                    <option value={12}>12 hours</option>
                    <option value={24}>24 hours</option>
                    <option value={48}>48 hours</option>
                    <option value={72}>72 hours</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Variants</label>
                  <select
                    value={newTest.numVariants}
                    onChange={(e) => setNewTest({ ...newTest, numVariants: parseInt(e.target.value) })}
                    className="x-input"
                  >
                    <option value={2}>2 variants</option>
                    <option value={3}>3 variants</option>
                    <option value={4}>4 variants</option>
                  </select>
                </div>
              </div>

              <button
                onClick={generateVariants}
                disabled={!newTest.content || generating}
                className="btn-secondary w-full"
              >
                {generating ? "Generating variants with AI..." : "Generate Variants with AI"}
              </button>

              {generatedVariants.length > 0 && (
                <div className="space-y-3 mt-4">
                  <h4 className="font-bold">Generated Variants</h4>
                  <p className="text-sm text-[var(--x-text-secondary)]">
                    Edit the variants below if needed, then create the test.
                  </p>
                  {generatedVariants.map((v, i) => (
                    <div key={i} className="p-4 bg-[var(--x-bg-secondary)] rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold">Variant {v.name}</span>
                        <span className="text-xs text-[var(--x-text-secondary)]">
                          {v.content.length} characters
                        </span>
                      </div>
                      <textarea
                        value={v.content}
                        onChange={(e) => {
                          const updated = [...generatedVariants];
                          updated[i].content = e.target.value;
                          setGeneratedVariants(updated);
                        }}
                        className="x-input"
                        rows={3}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setGeneratedVariants([]);
                  setNewTest({
                    name: "",
                    description: "",
                    content: "",
                    platform: "X",
                    metric: "engagement",
                    duration: 24,
                    numVariants: 2,
                  });
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={createTest}
                disabled={!newTest.name || generatedVariants.length < 2}
                className="btn-primary"
              >
                Create Test
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
