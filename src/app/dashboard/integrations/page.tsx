"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";

interface Integration {
  id: string;
  type: string;
  name: string;
  isActive: boolean;
  lastSyncAt: string | null;
  config: Record<string, unknown>;
}

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  lastTriggeredAt: string | null;
  _count?: { logs: number };
}

const INTEGRATION_TYPES = [
  { type: "NOTION", name: "Notion", description: "Sync content with Notion databases" },
  { type: "SLACK", name: "Slack", description: "Get notifications in Slack" },
  { type: "DISCORD", name: "Discord", description: "Post updates to Discord" },
  { type: "GOOGLE_SHEETS", name: "Google Sheets", description: "Export data to spreadsheets" },
  { type: "ZAPIER", name: "Zapier", description: "Connect with 5000+ apps" },
];

const WEBHOOK_EVENTS = [
  "post.created",
  "post.published",
  "post.failed",
  "post.scheduled",
  "mention.received",
  "analytics.daily",
];

export default function IntegrationsPage() {
  const { data: session, status } = useSession();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [newWebhook, setNewWebhook] = useState({
    name: "",
    url: "",
    events: [] as string[],
  });

  useEffect(() => {
    if (status === "authenticated") {
      fetchData();
    }
  }, [status]);

  if (status === "loading") return <div className="p-8">Loading...</div>;
  if (status === "unauthenticated") redirect("/login");

  async function fetchData() {
    try {
      const [intRes, webhookRes] = await Promise.all([
        fetch("/api/integrations"),
        fetch("/api/webhooks"),
      ]);
      setIntegrations(await intRes.json());
      setWebhooks(await webhookRes.json());
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleIntegration(type: string, isActive: boolean) {
    if (isActive) {
      await fetch(`/api/integrations?type=${type}`, { method: "DELETE" });
    } else {
      // In production, this would open OAuth flow or config modal
      await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, config: {} }),
      });
    }
    fetchData();
  }

  async function createWebhook() {
    if (!newWebhook.name || !newWebhook.url || newWebhook.events.length === 0) {
      alert("Please fill all fields");
      return;
    }

    await fetch("/api/webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newWebhook),
    });

    setShowWebhookModal(false);
    setNewWebhook({ name: "", url: "", events: [] });
    fetchData();
  }

  async function toggleWebhook(webhookId: string, isActive: boolean) {
    await fetch("/api/webhooks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ webhookId, isActive: !isActive }),
    });
    fetchData();
  }

  async function deleteWebhook(webhookId: string) {
    if (!confirm("Delete this webhook?")) return;
    await fetch(`/api/webhooks?webhookId=${webhookId}`, { method: "DELETE" });
    fetchData();
  }

  const activeIntegrations = new Set(integrations.map((i) => i.type));

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Integrations</h1>
        <p className="text-[var(--x-text-secondary)]">
          Connect your favorite tools and automate workflows
        </p>
      </div>

      {/* Integrations */}
      <div className="x-card p-6 mb-8">
        <h3 className="font-bold mb-4">Available Integrations</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {INTEGRATION_TYPES.map((int) => {
            const isActive = activeIntegrations.has(int.type);
            return (
              <div
                key={int.type}
                className={`p-4 rounded-lg border ${
                  isActive
                    ? "border-[var(--x-blue)] bg-[var(--x-blue)]/10"
                    : "border-[var(--x-border)] bg-[var(--x-bg-secondary)]"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold">{int.name}</h4>
                    <p className="text-sm text-[var(--x-text-secondary)]">
                      {int.description}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleIntegration(int.type, isActive)}
                    className={isActive ? "btn-secondary text-sm" : "btn-primary text-sm"}
                  >
                    {isActive ? "Disconnect" : "Connect"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Webhooks */}
      <div className="x-card p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold">Webhooks</h3>
          <button
            onClick={() => setShowWebhookModal(true)}
            className="btn-primary"
          >
            Add Webhook
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-[var(--x-text-secondary)]">
            Loading...
          </div>
        ) : webhooks.length === 0 ? (
          <div className="text-center py-8 text-[var(--x-text-secondary)]">
            No webhooks configured. Add one to receive event notifications.
          </div>
        ) : (
          <div className="space-y-3">
            {webhooks.map((webhook) => (
              <div
                key={webhook.id}
                className="p-4 bg-[var(--x-bg-secondary)] rounded-lg"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold">{webhook.name}</h4>
                      <span
                        className={`x-badge text-xs ${
                          webhook.isActive ? "x-badge-green" : ""
                        }`}
                      >
                        {webhook.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--x-text-secondary)] mb-2">
                      {webhook.url}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {webhook.events.map((event) => (
                        <span key={event} className="x-badge text-xs">
                          {event}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleWebhook(webhook.id, webhook.isActive)}
                      className="btn-secondary text-sm"
                    >
                      {webhook.isActive ? "Disable" : "Enable"}
                    </button>
                    <button
                      onClick={() => deleteWebhook(webhook.id)}
                      className="text-red-500 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                {webhook.lastTriggeredAt && (
                  <p className="text-xs text-[var(--x-text-secondary)] mt-2">
                    Last triggered: {new Date(webhook.lastTriggeredAt).toLocaleString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Webhook Modal */}
      {showWebhookModal && (
        <div className="fixed inset-0 x-modal-overlay flex items-center justify-center z-50">
          <div className="x-modal p-6 max-w-lg w-full">
            <h2 className="text-xl font-bold mb-4">Add Webhook</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Webhook name"
                value={newWebhook.name}
                onChange={(e) =>
                  setNewWebhook({ ...newWebhook, name: e.target.value })
                }
                className="x-input"
              />
              <input
                type="url"
                placeholder="Webhook URL (https://...)"
                value={newWebhook.url}
                onChange={(e) =>
                  setNewWebhook({ ...newWebhook, url: e.target.value })
                }
                className="x-input"
              />
              <div>
                <label className="block text-sm text-[var(--x-text-secondary)] mb-2">
                  Events to trigger
                </label>
                <div className="flex flex-wrap gap-2">
                  {WEBHOOK_EVENTS.map((event) => (
                    <button
                      key={event}
                      onClick={() => {
                        const events = newWebhook.events.includes(event)
                          ? newWebhook.events.filter((e) => e !== event)
                          : [...newWebhook.events, event];
                        setNewWebhook({ ...newWebhook, events });
                      }}
                      className={`x-badge cursor-pointer ${
                        newWebhook.events.includes(event) ? "x-badge-blue" : ""
                      }`}
                    >
                      {event}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowWebhookModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button onClick={createWebhook} className="btn-primary">
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
