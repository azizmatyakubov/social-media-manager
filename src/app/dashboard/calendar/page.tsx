"use client";

import { useState, useEffect, useRef } from "react";

interface Post {
  id: string;
  content: string;
  platform: string;
  status: string;
  scheduledFor: string | null;
  postedAt: string | null;
}

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
  slots: CalendarSlot[];
}

type ViewMode = "month" | "week" | "list";

const platformColors: Record<string, string> = {
  X: "bg-zinc-700",
  LINKEDIN: "bg-blue-600",
  INSTAGRAM: "bg-pink-500",
  TIKTOK: "bg-black",
  YOUTUBE: "bg-red-600",
};

export default function CalendarPage() {
  const [view, setView] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [selectedCalendar, setSelectedCalendar] = useState<string | null>(null);
  const [scheduledPosts, setScheduledPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [draggedPost, setDraggedPost] = useState<Post | null>(null);
  const [newCalendar, setNewCalendar] = useState({
    name: "",
    description: "",
    postsPerDay: 3,
    contentThemes: "",
  });
  const [newPost, setNewPost] = useState({
    content: "",
    platform: "X",
    scheduledTime: "09:00",
  });

  useEffect(() => {
    fetchCalendars();
    fetchScheduledPosts();
  }, []);

  useEffect(() => {
    fetchScheduledPosts();
  }, [currentDate]);

  const fetchCalendars = async () => {
    try {
      const res = await fetch("/api/calendar");
      const data = await res.json();
      setCalendars(Array.isArray(data) ? data : []);
      if (data.length > 0) {
        setSelectedCalendar(data[0].id);
      }
    } catch (error) {
      console.error("Failed to fetch calendars:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchScheduledPosts = async () => {
    try {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const res = await fetch(
        `/api/posts?status=SCHEDULED&startDate=${startOfMonth.toISOString()}&endDate=${endOfMonth.toISOString()}`
      );
      if (res.ok) {
        const data = await res.json();
        setScheduledPosts(Array.isArray(data) ? data : data.posts || []);
      }
    } catch (error) {
      console.error("Failed to fetch posts:", error);
    }
  };

  const createCalendar = async () => {
    const res = await fetch("/api/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newCalendar.name,
        description: newCalendar.description,
        postsPerDay: newCalendar.postsPerDay,
        contentThemes: newCalendar.contentThemes
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      }),
    });

    if (res.ok) {
      setShowCreateModal(false);
      setNewCalendar({ name: "", description: "", postsPerDay: 3, contentThemes: "" });
      fetchCalendars();
    }
  };

  const generateContent = async () => {
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

      fetchScheduledPosts();
    } catch (error) {
      console.error("Failed to generate content:", error);
    } finally {
      setGenerating(false);
    }
  };

  const schedulePost = async () => {
    if (!selectedDate || !newPost.content) return;

    const scheduledFor = new Date(selectedDate);
    const [hours, minutes] = newPost.scheduledTime.split(":").map(Number);
    scheduledFor.setHours(hours, minutes, 0, 0);

    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newPost.content,
          platform: newPost.platform,
          scheduledFor: scheduledFor.toISOString(),
          status: "SCHEDULED",
        }),
      });

      if (res.ok) {
        setShowPostModal(false);
        setNewPost({ content: "", platform: "X", scheduledTime: "09:00" });
        setSelectedDate(null);
        fetchScheduledPosts();
      }
    } catch (error) {
      console.error("Failed to schedule post:", error);
    }
  };

  const updatePostSchedule = async (postId: string, newDate: Date) => {
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledFor: newDate.toISOString(),
        }),
      });

      if (res.ok) {
        fetchScheduledPosts();
      }
    } catch (error) {
      console.error("Failed to update post:", error);
    }
  };

  // Navigation
  const navigateMonth = (direction: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1));
  };

  const navigateWeek = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + direction * 7);
    setCurrentDate(newDate);
  };

  // Get days for month view
  const getMonthDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    // Add empty slots for days before the first day
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  // Get days for week view
  const getWeekDays = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  };

  // Get posts for a specific day
  const getPostsForDay = (date: Date) => {
    return scheduledPosts.filter((post) => {
      if (!post.scheduledFor) return false;
      const postDate = new Date(post.scheduledFor);
      return (
        postDate.getDate() === date.getDate() &&
        postDate.getMonth() === date.getMonth() &&
        postDate.getFullYear() === date.getFullYear()
      );
    });
  };

  // Drag and drop handlers
  const handleDragStart = (post: Post) => {
    setDraggedPost(post);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    if (draggedPost) {
      const newScheduledDate = new Date(date);
      const originalDate = new Date(draggedPost.scheduledFor!);
      newScheduledDate.setHours(originalDate.getHours(), originalDate.getMinutes());
      updatePostSchedule(draggedPost.id, newScheduledDate);
      setDraggedPost(null);
    }
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Content Calendar</h1>
          <p className="text-zinc-400 mt-1">
            Plan and schedule your content
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-white/10 rounded-lg font-medium hover:bg-white/20 transition-colors"
          >
            New Calendar
          </button>
          <button
            onClick={generateContent}
            disabled={!selectedCalendar || generating}
            className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {generating ? "Generating..." : "Generate Week"}
          </button>
        </div>
      </div>

      {/* Calendar Navigation */}
      <div className="flex items-center justify-between p-4 bg-zinc-900/50 border border-white/10 rounded-xl">
        <div className="flex items-center gap-4">
          <button
            onClick={() => view === "month" ? navigateMonth(-1) : navigateWeek(-1)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-xl font-bold min-w-[200px] text-center">
            {view === "month"
              ? `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`
              : `Week of ${currentDate.toLocaleDateString()}`}
          </h2>
          <button
            onClick={() => view === "month" ? navigateMonth(1) : navigateWeek(1)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1.5 text-sm bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
          >
            Today
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex bg-white/5 rounded-lg p-1">
            {[
              { id: "month", label: "Month" },
              { id: "week", label: "Week" },
              { id: "list", label: "List" },
            ].map((v) => (
              <button
                key={v.id}
                onClick={() => setView(v.id as ViewMode)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  view === v.id ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          {/* Calendar Selector */}
          {calendars.length > 0 && (
            <select
              value={selectedCalendar || ""}
              onChange={(e) => setSelectedCalendar(e.target.value)}
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            >
              {calendars.map((cal) => (
                <option key={cal.id} value={cal.id}>
                  {cal.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Month View */}
      {view === "month" && (
        <div className="bg-zinc-900/50 border border-white/10 rounded-xl overflow-hidden">
          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b border-white/10">
            {dayNames.map((day) => (
              <div key={day} className="p-3 text-center text-sm font-medium text-zinc-400">
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7">
            {getMonthDays().map((date, index) => {
              const posts = date ? getPostsForDay(date) : [];
              return (
                <div
                  key={index}
                  className={`min-h-[120px] border-b border-r border-white/5 p-2 ${
                    !date ? "bg-zinc-950/50" : ""
                  } ${date && isToday(date) ? "bg-indigo-500/10" : ""}`}
                  onDragOver={date ? handleDragOver : undefined}
                  onDrop={date ? (e) => handleDrop(e, date) : undefined}
                  onClick={() => {
                    if (date) {
                      setSelectedDate(date);
                      setShowPostModal(true);
                    }
                  }}
                >
                  {date && (
                    <>
                      <div
                        className={`text-sm mb-1 ${
                          isToday(date)
                            ? "w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center font-bold"
                            : "text-zinc-400"
                        }`}
                      >
                        {date.getDate()}
                      </div>
                      <div className="space-y-1">
                        {posts.slice(0, 3).map((post) => (
                          <div
                            key={post.id}
                            draggable
                            onDragStart={() => handleDragStart(post)}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPost(post);
                            }}
                            className={`p-1.5 text-xs rounded cursor-move truncate ${
                              platformColors[post.platform] || "bg-zinc-700"
                            }`}
                          >
                            <span className="opacity-70">{formatTime(post.scheduledFor!)}</span>{" "}
                            {post.content.slice(0, 30)}...
                          </div>
                        ))}
                        {posts.length > 3 && (
                          <div className="text-xs text-zinc-500 pl-1">
                            +{posts.length - 3} more
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Week View */}
      {view === "week" && (
        <div className="bg-zinc-900/50 border border-white/10 rounded-xl overflow-hidden">
          <div className="grid grid-cols-7">
            {getWeekDays().map((date) => {
              const posts = getPostsForDay(date);
              return (
                <div
                  key={date.toISOString()}
                  className={`min-h-[400px] border-r border-white/5 ${
                    isToday(date) ? "bg-indigo-500/10" : ""
                  }`}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, date)}
                >
                  <div className="p-3 border-b border-white/10 text-center sticky top-0 bg-zinc-900/80 backdrop-blur">
                    <div className="text-xs text-zinc-400">{dayNames[date.getDay()]}</div>
                    <div
                      className={`text-lg font-bold ${
                        isToday(date)
                          ? "w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center mx-auto"
                          : ""
                      }`}
                    >
                      {date.getDate()}
                    </div>
                  </div>
                  <div className="p-2 space-y-2">
                    {posts.map((post) => (
                      <div
                        key={post.id}
                        draggable
                        onDragStart={() => handleDragStart(post)}
                        onClick={() => setSelectedPost(post)}
                        className={`p-2 rounded-lg cursor-move ${
                          platformColors[post.platform] || "bg-zinc-700"
                        }`}
                      >
                        <div className="text-xs opacity-70 mb-1">
                          {formatTime(post.scheduledFor!)}
                        </div>
                        <p className="text-sm line-clamp-3">{post.content}</p>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        setSelectedDate(date);
                        setShowPostModal(true);
                      }}
                      className="w-full p-2 border border-dashed border-white/10 rounded-lg text-sm text-zinc-500 hover:border-white/30 hover:text-white transition-colors"
                    >
                      + Add post
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* List View */}
      {view === "list" && (
        <div className="space-y-3">
          {scheduledPosts.length === 0 ? (
            <div className="text-center py-12 bg-zinc-900/50 border border-white/10 rounded-xl">
              <p className="text-zinc-400">No scheduled posts for this period</p>
            </div>
          ) : (
            scheduledPosts
              .sort((a, b) => new Date(a.scheduledFor!).getTime() - new Date(b.scheduledFor!).getTime())
              .map((post) => (
                <div
                  key={post.id}
                  className="p-4 bg-zinc-900/50 border border-white/10 rounded-xl flex items-start gap-4 hover:border-white/20 transition-colors cursor-pointer"
                  onClick={() => setSelectedPost(post)}
                >
                  <div
                    className={`w-2 h-full rounded-full ${
                      platformColors[post.platform] || "bg-zinc-700"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm text-zinc-400">
                        {new Date(post.scheduledFor!).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <span className="text-sm text-zinc-400">
                        {formatTime(post.scheduledFor!)}
                      </span>
                      <span className="px-2 py-0.5 text-xs rounded-full bg-white/10">
                        {post.platform}
                      </span>
                    </div>
                    <p className="text-sm line-clamp-2">{post.content}</p>
                  </div>
                </div>
              ))
          )}
        </div>
      )}

      {/* Create Calendar Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-white/10 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Create Calendar</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">Name</label>
                <input
                  type="text"
                  value={newCalendar.name}
                  onChange={(e) => setNewCalendar({ ...newCalendar, name: e.target.value })}
                  placeholder="My Content Calendar"
                  className="w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">Description</label>
                <textarea
                  value={newCalendar.description}
                  onChange={(e) => setNewCalendar({ ...newCalendar, description: e.target.value })}
                  placeholder="Optional description..."
                  rows={2}
                  className="w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">Posts per day</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={newCalendar.postsPerDay}
                  onChange={(e) => setNewCalendar({ ...newCalendar, postsPerDay: parseInt(e.target.value) })}
                  className="w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">Content themes</label>
                <input
                  type="text"
                  value={newCalendar.contentThemes}
                  onChange={(e) => setNewCalendar({ ...newCalendar, contentThemes: e.target.value })}
                  placeholder="tech, tips, insights..."
                  className="w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <p className="text-xs text-zinc-500 mt-1">Comma-separated themes</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-2.5 bg-white/10 rounded-lg font-medium hover:bg-white/20 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createCalendar}
                className="flex-1 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Post Modal */}
      {showPostModal && selectedDate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-white/10 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">
              Schedule Post for {selectedDate.toLocaleDateString()}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">Content</label>
                <textarea
                  value={newPost.content}
                  onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                  placeholder="What's on your mind?"
                  rows={4}
                  className="w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1.5">Platform</label>
                  <select
                    value={newPost.platform}
                    onChange={(e) => setNewPost({ ...newPost, platform: e.target.value })}
                    className="w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="X">X (Twitter)</option>
                    <option value="LINKEDIN">LinkedIn</option>
                    <option value="INSTAGRAM">Instagram</option>
                    <option value="TIKTOK">TikTok</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1.5">Time</label>
                  <input
                    type="time"
                    value={newPost.scheduledTime}
                    onChange={(e) => setNewPost({ ...newPost, scheduledTime: e.target.value })}
                    className="w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowPostModal(false);
                  setSelectedDate(null);
                }}
                className="flex-1 py-2.5 bg-white/10 rounded-lg font-medium hover:bg-white/20 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={schedulePost}
                disabled={!newPost.content}
                className="flex-1 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post Detail Modal */}
      {selectedPost && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-white/10 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-bold">Scheduled Post</h2>
              <button
                onClick={() => setSelectedPost(null)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <span className={`px-2 py-0.5 rounded-full ${platformColors[selectedPost.platform]}`}>
                  {selectedPost.platform}
                </span>
                <span>
                  {new Date(selectedPost.scheduledFor!).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{selectedPost.content}</p>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setSelectedPost(null)}
                className="flex-1 py-2.5 bg-white/10 rounded-lg font-medium hover:bg-white/20 transition-colors"
              >
                Close
              </button>
              <a
                href={`/dashboard/compose?edit=${selectedPost.id}`}
                className="flex-1 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg font-medium hover:opacity-90 transition-opacity text-center"
              >
                Edit Post
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
