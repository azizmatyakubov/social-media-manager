"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";

interface CompetitorSnapshot {
  followers: number;
  following: number;
  engagementRate: number;
  postsPerDay: number;
  avgLikes: number;
}

interface Competitor {
  id: string;
  username: string;
  name: string | null;
  platform: string;
  createdAt: string;
  snapshots: CompetitorSnapshot[];
}

export default function CompetitorsPage() {
  const { data: session, status } = useSession();
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCompetitor, setNewCompetitor] = useState({ username: "", name: "" });
  const [insights, setInsights] = useState<string[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      fetchCompetitors();
    }
  }, [status]);

  if (status === "loading") return <div className="p-8">Loading...</div>;
  if (status === "unauthenticated") redirect("/login");

  async function fetchCompetitors() {
    try {
      const res = await fetch("/api/competitors");
      const data = await res.json();
      setCompetitors(data);
    } catch (error) {
      console.error("Failed to fetch competitors:", error);
    } finally {
      setLoading(false);
    }
  }

  async function addCompetitor() {
    if (!newCompetitor.username) return;

    const res = await fetch("/api/competitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: newCompetitor.username,
        name: newCompetitor.name || undefined,
        platform: "X",
      }),
    });

    if (res.ok) {
      setShowAddModal(false);
      setNewCompetitor({ username: "", name: "" });
      fetchCompetitors();
    } else {
      const error = await res.json();
      alert(error.error || "Failed to add competitor");
    }
  }

  async function removeCompetitor(id: string) {
    if (!confirm("Remove this competitor?")) return;

    await fetch(`/api/competitors?competitorId=${id}`, {
      method: "DELETE",
    });
    fetchCompetitors();
  }

  async function getInsights() {
    setLoadingInsights(true);
    try {
      const res = await fetch("/api/competitors?action=insights");
      const data = await res.json();
      setInsights(data.insights || []);
    } catch (error) {
      console.error("Failed to get insights:", error);
    } finally {
      setLoadingInsights(false);
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Competitor Tracking</h1>
          <p className="text-[var(--x-text-secondary)]">
            Monitor competitors and learn from their strategies
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={getInsights}
            disabled={loadingInsights || competitors.length === 0}
            className="btn-secondary"
          >
            {loadingInsights ? "Analyzing..." : "Get AI Insights"}
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            Add Competitor
          </button>
        </div>
      </div>

      {/* AI Insights */}
      {insights.length > 0 && (
        <div className="x-card p-6 mb-8">
          <h3 className="font-bold mb-4">AI Insights</h3>
          <ul className="space-y-2">
            {insights.map((insight, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-[var(--x-blue)]">•</span>
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Competitors List */}
      {loading ? (
        <div className="text-center py-12 text-[var(--x-text-secondary)]">
          Loading competitors...
        </div>
      ) : competitors.length === 0 ? (
        <div className="x-card p-12 text-center">
          <p className="text-[var(--x-text-secondary)] mb-4">
            No competitors tracked yet. Add some to start monitoring.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {competitors.map((competitor) => {
            const snapshot = competitor.snapshots[0];
            return (
              <div key={competitor.id} className="x-card p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg">
                      {competitor.name || competitor.username}
                    </h3>
                    <p className="text-[var(--x-text-secondary)]">
                      @{competitor.username}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="x-badge">{competitor.platform}</span>
                    <button
                      onClick={() => removeCompetitor(competitor.id)}
                      className="text-[var(--x-text-secondary)] hover:text-red-500"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {snapshot ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-2xl font-bold">
                        {snapshot.followers.toLocaleString()}
                      </p>
                      <p className="text-sm text-[var(--x-text-secondary)]">
                        Followers
                      </p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {snapshot.engagementRate.toFixed(2)}%
                      </p>
                      <p className="text-sm text-[var(--x-text-secondary)]">
                        Engagement
                      </p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {snapshot.postsPerDay.toFixed(1)}
                      </p>
                      <p className="text-sm text-[var(--x-text-secondary)]">
                        Posts/Day
                      </p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {snapshot.avgLikes.toFixed(0)}
                      </p>
                      <p className="text-sm text-[var(--x-text-secondary)]">
                        Avg Likes
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-[var(--x-text-secondary)] text-sm">
                    No data yet. Data will be collected over time.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Competitor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 x-modal-overlay flex items-center justify-center z-50">
          <div className="x-modal p-6">
            <h2 className="text-xl font-bold mb-4">Add Competitor</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Username (without @)"
                value={newCompetitor.username}
                onChange={(e) =>
                  setNewCompetitor({ ...newCompetitor, username: e.target.value })
                }
                className="x-input"
              />
              <input
                type="text"
                placeholder="Display name (optional)"
                value={newCompetitor.name}
                onChange={(e) =>
                  setNewCompetitor({ ...newCompetitor, name: e.target.value })
                }
                className="x-input"
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button onClick={addCompetitor} className="btn-primary">
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
