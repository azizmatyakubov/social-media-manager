"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";

interface CalendarSlot {
  id: string;
  date: string;
  time: string;
  platform: string;
  content: string | null;
  suggestedContent: string | null;
  contentTheme: string | null;
  status: string;
}

interface Calendar {
  id: string;
  name: string;
  description: string | null;
  postsPerDay: number;
  preferredTimes: string[];
  contentThemes: string[];
  _count: { slots: number };
}

export default function CalendarPage() {
  const { data: session, status } = useSession();
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [selectedCalendar, setSelectedCalendar] = useState<string | null>(null);
  const [slots, setSlots] = useState<CalendarSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCalendar, setNewCalendar] = useState({
    name: "",
    description: "",
    postsPerDay: 3,
    contentThemes: "",
  });

  useEffect(() => {
    if (status === "authenticated") {
      fetchCalendars();
    }
  }, [status]);

  useEffect(() => {
    if (selectedCalendar) {
      fetchSlots();
    }
  }, [selectedCalendar]);

  if (status === "loading") return <div className="p-8">Loading...</div>;
  if (status === "unauthenticated") redirect("/login");

  async function fetchCalendars() {
    try {
      const res = await fetch("/api/calendar");
      const data = await res.json();
      setCalendars(data);
      if (data.length > 0) {
        setSelectedCalendar(data[0].id);
      }
    } catch (error) {
      console.error("Failed to fetch calendars:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchSlots() {
    if (!selectedCalendar) return;
    const startDate = new Date();
    const endDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    const res = await fetch(
      `/api/calendar?calendarId=${selectedCalendar}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
    );
    const data = await res.json();
    setSlots(data?.slots || []);
  }

  async function createCalendar() {
    const res = await fetch("/api/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newCalendar.name,
        description: newCalendar.description,
        postsPerDay: newCalendar.postsPerDay,
        contentThemes: newCalendar.contentThemes.split(",").map((t) => t.trim()).filter(Boolean),
      }),
    });

    if (res.ok) {
      setShowCreateModal(false);
      setNewCalendar({ name: "", description: "", postsPerDay: 3, contentThemes: "" });
      fetchCalendars();
    }
  }

  async function generateContent() {
    if (!selectedCalendar) return;
    setGenerating(true);

    try {
      const startDate = new Date();
      const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          calendarId: selectedCalendar,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          postsPerDay: 3,
          platforms: ["X"],
          themes: ["tech", "productivity", "insights"],
        }),
      });

      fetchSlots();
    } catch (error) {
      console.error("Failed to generate content:", error);
    } finally {
      setGenerating(false);
    }
  }

  async function approveSlot(slotId: string, content: string) {
    await fetch("/api/calendar/slots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve", slotId, content }),
    });
    fetchSlots();
  }

  const groupedSlots = slots.reduce((acc, slot) => {
    const date = new Date(slot.date).toLocaleDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(slot);
    return acc;
  }, {} as Record<string, CalendarSlot[]>);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Content Calendar</h1>
          <p className="text-[var(--x-text-secondary)]">
            Plan and schedule your content with AI assistance
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-secondary"
          >
            New Calendar
          </button>
          <button
            onClick={generateContent}
            disabled={!selectedCalendar || generating}
            className="btn-primary"
          >
            {generating ? "Generating..." : "Generate Week"}
          </button>
        </div>
      </div>

      {/* Calendar selector */}
      {calendars.length > 0 && (
        <div className="mb-6">
          <select
            value={selectedCalendar || ""}
            onChange={(e) => setSelectedCalendar(e.target.value)}
            className="x-input max-w-xs"
          >
            {calendars.map((cal) => (
              <option key={cal.id} value={cal.id}>
                {cal.name} ({cal._count.slots} slots)
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Calendar grid */}
      {loading ? (
        <div className="text-center py-12 text-[var(--x-text-secondary)]">
          Loading calendar...
        </div>
      ) : Object.keys(groupedSlots).length === 0 ? (
        <div className="x-card p-12 text-center">
          <p className="text-[var(--x-text-secondary)] mb-4">
            No content scheduled. Generate content to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedSlots).map(([date, daySlots]) => (
            <div key={date} className="x-card p-4">
              <h3 className="font-bold mb-4">{date}</h3>
              <div className="space-y-3">
                {daySlots.map((slot) => (
                  <div
                    key={slot.id}
                    className="p-4 bg-[var(--x-bg-secondary)] rounded-lg"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-[var(--x-text-secondary)]">
                          {slot.time}
                        </span>
                        <span className="x-badge">{slot.platform}</span>
                        <span
                          className={`x-badge ${
                            slot.status === "FILLED"
                              ? "x-badge-green"
                              : slot.status === "SUGGESTED"
                              ? "x-badge-blue"
                              : ""
                          }`}
                        >
                          {slot.status}
                        </span>
                      </div>
                      {slot.status === "SUGGESTED" && (
                        <button
                          onClick={() =>
                            approveSlot(slot.id, slot.suggestedContent || "")
                          }
                          className="btn-primary text-sm"
                        >
                          Approve
                        </button>
                      )}
                    </div>
                    <p className="text-sm">
                      {slot.content || slot.suggestedContent || "No content"}
                    </p>
                    {slot.contentTheme && (
                      <p className="text-xs text-[var(--x-text-tertiary)] mt-2">
                        Theme: {slot.contentTheme}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Calendar Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 x-modal-overlay flex items-center justify-center z-50">
          <div className="x-modal p-6">
            <h2 className="text-xl font-bold mb-4">Create Calendar</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Calendar name"
                value={newCalendar.name}
                onChange={(e) =>
                  setNewCalendar({ ...newCalendar, name: e.target.value })
                }
                className="x-input"
              />
              <textarea
                placeholder="Description (optional)"
                value={newCalendar.description}
                onChange={(e) =>
                  setNewCalendar({ ...newCalendar, description: e.target.value })
                }
                className="x-input"
                rows={2}
              />
              <div>
                <label className="block text-sm mb-1">Posts per day</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={newCalendar.postsPerDay}
                  onChange={(e) =>
                    setNewCalendar({
                      ...newCalendar,
                      postsPerDay: parseInt(e.target.value),
                    })
                  }
                  className="x-input"
                />
              </div>
              <input
                type="text"
                placeholder="Content themes (comma-separated)"
                value={newCalendar.contentThemes}
                onChange={(e) =>
                  setNewCalendar({ ...newCalendar, contentThemes: e.target.value })
                }
                className="x-input"
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button onClick={createCalendar} className="btn-primary">
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
