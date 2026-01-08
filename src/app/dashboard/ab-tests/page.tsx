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

export default function ABTestsPage() {
  const { data: session, status } = useSession();
  const [tests, setTests] = useState<ABTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [newTest, setNewTest] = useState({
    name: "",
    description: "",
    content: "",
    platform: "X",
    metric: "engagement",
    duration: 24,
  });
  const [generatedVariants, setGeneratedVariants] = useState<Array<{ name: string; content: string }>>([]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchTests();
    }
  }, [status]);

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
          numVariants: 2,
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
      setNewTest({ name: "", description: "", content: "", platform: "X", metric: "engagement", duration: 24 });
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
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
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

      {loading ? (
        <div className="text-center py-12 text-[var(--x-text-secondary)]">
          Loading tests...
        </div>
      ) : tests.length === 0 ? (
        <div className="x-card p-12 text-center">
          <p className="text-[var(--x-text-secondary)] mb-4">
            No A/B tests yet. Create one to start optimizing your content.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {tests.map((test) => (
            <div key={test.id} className="x-card p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg">{test.name}</h3>
                  {test.description && (
                    <p className="text-sm text-[var(--x-text-secondary)]">
                      {test.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`x-badge ${
                    test.status === "RUNNING" ? "x-badge-blue" :
                    test.status === "COMPLETED" ? "x-badge-green" : ""
                  }`}>
                    {test.status}
                  </span>
                  {test.status === "DRAFT" && (
                    <button
                      onClick={() => startTest(test.id)}
                      className="btn-primary text-sm"
                    >
                      Start
                    </button>
                  )}
                  {test.status === "RUNNING" && (
                    <button
                      onClick={() => completeTest(test.id)}
                      className="btn-secondary text-sm"
                    >
                      End Test
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {test.variants.map((variant) => (
                  <div
                    key={variant.id}
                    className={`p-4 rounded-lg ${
                      test.winnerId === variant.id
                        ? "border-2 border-[var(--x-green)] bg-[var(--x-bg-secondary)]"
                        : "bg-[var(--x-bg-secondary)]"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold">Variant {variant.name}</span>
                      {test.winnerId === variant.id && (
                        <span className="x-badge x-badge-green">Winner</span>
                      )}
                    </div>
                    <p className="text-sm mb-3">{variant.content}</p>
                    <div className="flex gap-4 text-xs text-[var(--x-text-secondary)]">
                      <span>Impressions: {variant.impressions}</span>
                      <span>Engagements: {variant.engagements}</span>
                      <span>Clicks: {variant.clicks}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex gap-4 text-sm text-[var(--x-text-secondary)]">
                <span>Platform: {test.platform}</span>
                <span>Metric: {test.metric}</span>
                <span>Duration: {test.duration}h</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Test Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 x-modal-overlay flex items-center justify-center z-50">
          <div className="x-modal p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Create A/B Test</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Test name"
                value={newTest.name}
                onChange={(e) => setNewTest({ ...newTest, name: e.target.value })}
                className="x-input"
              />
              <textarea
                placeholder="Your original post content"
                value={newTest.content}
                onChange={(e) => setNewTest({ ...newTest, content: e.target.value })}
                className="x-input"
                rows={3}
              />
              <div className="flex gap-3">
                <select
                  value={newTest.metric}
                  onChange={(e) => setNewTest({ ...newTest, metric: e.target.value })}
                  className="x-input"
                >
                  <option value="engagement">Engagement</option>
                  <option value="clicks">Clicks</option>
                  <option value="impressions">Impressions</option>
                </select>
                <input
                  type="number"
                  placeholder="Duration (hours)"
                  value={newTest.duration}
                  onChange={(e) => setNewTest({ ...newTest, duration: parseInt(e.target.value) })}
                  className="x-input"
                />
              </div>

              <button
                onClick={generateVariants}
                disabled={!newTest.content || generating}
                className="btn-secondary w-full"
              >
                {generating ? "Generating..." : "Generate Variants with AI"}
              </button>

              {generatedVariants.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-bold">Generated Variants:</h4>
                  {generatedVariants.map((v, i) => (
                    <div key={i} className="p-3 bg-[var(--x-bg-secondary)] rounded-lg">
                      <span className="font-bold text-sm">Variant {v.name}</span>
                      <textarea
                        value={v.content}
                        onChange={(e) => {
                          const updated = [...generatedVariants];
                          updated[i].content = e.target.value;
                          setGeneratedVariants(updated);
                        }}
                        className="x-input mt-2"
                        rows={2}
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
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={createTest}
                disabled={generatedVariants.length < 2}
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
