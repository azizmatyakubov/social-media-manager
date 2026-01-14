"use client";

import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

interface Workspace {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  members: WorkspaceMember[];
  channels: string[];
}

interface WorkspaceMember {
  userId: string;
  name: string;
  email: string;
  avatar?: string;
  role: "owner" | "admin" | "editor" | "viewer";
  status: "active" | "pending" | "inactive";
  lastActiveAt: Date;
}

interface Channel {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  type: "general" | "project" | "campaign" | "content" | "private";
  isPrivate: boolean;
  members: string[];
}

interface Message {
  id: string;
  channelId: string;
  authorId: string;
  authorName: string;
  content: string;
  type: string;
  attachments: { id: string; type: string; name: string; url: string }[];
  mentions: string[];
  reactions: { emoji: string; count: number; users: string[] }[];
  threadCount?: number;
  isPinned: boolean;
  isEdited: boolean;
  createdAt: string;
}

interface SharedContent {
  id: string;
  type: string;
  title: string;
  content: string;
  platforms: string[];
  status: string;
  createdBy: string;
  assignedTo?: string;
  comments: { id: string; authorName: string; text: string; isResolved: boolean }[];
  version: number;
  tags: string[];
  dueDate?: string;
  updatedAt: string;
}

interface CollabTask {
  id: string;
  title: string;
  description: string;
  type: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "todo" | "in_progress" | "review" | "completed" | "cancelled";
  assignedTo: string;
  dueDate?: string;
  tags: string[];
}

interface Activity {
  id: string;
  userName: string;
  type: string;
  action: string;
  targetName: string;
  createdAt: string;
}

interface Stats {
  totalMembers: number;
  activeMembers: number;
  totalChannels: number;
  totalMessages: number;
  totalContent: number;
  pendingTasks: number;
  completedTasks: number;
  recentActivity: number;
}

export default function CollaborationPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "channels" | "content" | "tasks" | "members">("overview");
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sharedContent, setSharedContent] = useState<SharedContent[]>([]);
  const [tasks, setTasks] = useState<CollabTask[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [messageInput, setMessageInput] = useState("");
  const [showNewChannelModal, setShowNewChannelModal] = useState(false);
  const [showNewContentModal, setShowNewContentModal] = useState(false);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadWorkspaces();
  }, []);

  useEffect(() => {
    if (selectedWorkspace) {
      loadWorkspaceData(selectedWorkspace.id);
    }
  }, [selectedWorkspace]);

  useEffect(() => {
    if (selectedChannel) {
      loadMessages(selectedChannel.id);
    }
  }, [selectedChannel]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadWorkspaces = async () => {
    try {
      const res = await fetch("/api/collaboration?action=workspaces");
      const data = await res.json();
      setWorkspaces(data.workspaces || []);
      if (data.workspaces?.length > 0) {
        setSelectedWorkspace(data.workspaces[0]);
      }
    } catch (error) {
      console.error("Error loading workspaces:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadWorkspaceData = async (workspaceId: string) => {
    try {
      const [channelsRes, contentRes, tasksRes, activitiesRes, statsRes] = await Promise.all([
        fetch(`/api/collaboration?action=channels&workspaceId=${workspaceId}`),
        fetch(`/api/collaboration?action=content&workspaceId=${workspaceId}`),
        fetch(`/api/collaboration?action=tasks&workspaceId=${workspaceId}`),
        fetch(`/api/collaboration?action=activities&workspaceId=${workspaceId}&limit=20`),
        fetch(`/api/collaboration?action=stats&workspaceId=${workspaceId}`),
      ]);

      const [channelsData, contentData, tasksData, activitiesData, statsData] = await Promise.all([
        channelsRes.json(),
        contentRes.json(),
        tasksRes.json(),
        activitiesRes.json(),
        statsRes.json(),
      ]);

      setChannels(channelsData.channels || []);
      setSharedContent(contentData.content || []);
      setTasks(tasksData.tasks || []);
      setActivities(activitiesData.activities || []);
      setStats(statsData.stats);

      if (channelsData.channels?.length > 0 && !selectedChannel) {
        setSelectedChannel(channelsData.channels[0]);
      }
    } catch (error) {
      console.error("Error loading workspace data:", error);
    }
  };

  const loadMessages = async (channelId: string) => {
    try {
      const res = await fetch(`/api/collaboration?action=messages&channelId=${channelId}&limit=50`);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  const sendMessage = async () => {
    if (!messageInput.trim() || !selectedChannel || !selectedWorkspace) return;

    try {
      const res = await fetch("/api/collaboration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send-message",
          channelId: selectedChannel.id,
          workspaceId: selectedWorkspace.id,
          content: messageInput,
        }),
      });
      const data = await res.json();
      if (data.message) {
        setMessages([...messages, data.message]);
        setMessageInput("");
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const createChannel = async (name: string, description: string, type: string, isPrivate: boolean) => {
    if (!selectedWorkspace) return;

    try {
      const res = await fetch("/api/collaboration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-channel",
          workspaceId: selectedWorkspace.id,
          name,
          description,
          type,
          isPrivate,
        }),
      });
      const data = await res.json();
      if (data.channel) {
        setChannels([...channels, data.channel]);
        setShowNewChannelModal(false);
      }
    } catch (error) {
      console.error("Error creating channel:", error);
    }
  };

  const createContent = async (title: string, content: string, type: string, platforms: string[]) => {
    if (!selectedWorkspace) return;

    try {
      const res = await fetch("/api/collaboration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-content",
          workspaceId: selectedWorkspace.id,
          channelId: selectedChannel?.id,
          title,
          content,
          type,
          platforms,
        }),
      });
      const data = await res.json();
      if (data.content) {
        setSharedContent([data.content, ...sharedContent]);
        setShowNewContentModal(false);
      }
    } catch (error) {
      console.error("Error creating content:", error);
    }
  };

  const createTask = async (title: string, description: string, type: string, priority: string, assignedTo: string) => {
    if (!selectedWorkspace) return;

    try {
      const res = await fetch("/api/collaboration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-task",
          workspaceId: selectedWorkspace.id,
          title,
          description,
          type,
          priority,
          assignedTo,
        }),
      });
      const data = await res.json();
      if (data.task) {
        setTasks([data.task, ...tasks]);
        setShowNewTaskModal(false);
      }
    } catch (error) {
      console.error("Error creating task:", error);
    }
  };

  const completeTask = async (taskId: string) => {
    try {
      const res = await fetch("/api/collaboration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete-task", taskId }),
      });
      const data = await res.json();
      if (data.task) {
        setTasks(tasks.map((t) => (t.id === taskId ? data.task : t)));
      }
    } catch (error) {
      console.error("Error completing task:", error);
    }
  };

  const inviteMember = async (email: string, name: string, role: string) => {
    if (!selectedWorkspace) return;

    try {
      await fetch("/api/collaboration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "invite-member",
          workspaceId: selectedWorkspace.id,
          email,
          name,
          role,
        }),
      });
      loadWorkspaces();
      setShowInviteModal(false);
    } catch (error) {
      console.error("Error inviting member:", error);
    }
  };

  const addReaction = async (messageId: string, emoji: string) => {
    try {
      const res = await fetch("/api/collaboration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add-reaction", messageId, emoji }),
      });
      const data = await res.json();
      if (data.message) {
        setMessages(messages.map((m) => (m.id === messageId ? data.message : m)));
      }
    } catch (error) {
      console.error("Error adding reaction:", error);
    }
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (days === 1) {
      return "Yesterday";
    } else if (days < 7) {
      return d.toLocaleDateString([], { weekday: "short" });
    }
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "text-red-400 bg-red-500/20";
      case "high":
        return "text-orange-400 bg-orange-500/20";
      case "medium":
        return "text-yellow-400 bg-yellow-500/20";
      default:
        return "text-zinc-400 bg-zinc-500/20";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-400 bg-green-500/20";
      case "in_progress":
        return "text-blue-400 bg-blue-500/20";
      case "review":
        return "text-purple-400 bg-purple-500/20";
      default:
        return "text-zinc-400 bg-zinc-500/20";
    }
  };

  const getChannelIcon = (type: string, isPrivate: boolean) => {
    if (isPrivate) {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      );
    }
    switch (type) {
      case "campaign":
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2z" />
          </svg>
        );
      case "content":
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case "project":
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
          </svg>
        );
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Collaboration Workspace</h1>
            <p className="text-zinc-400 mt-1">Work together with your team on content and campaigns</p>
          </div>
          <div className="flex items-center gap-3">
            {selectedWorkspace && (
              <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900/50 rounded-xl border border-white/5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: selectedWorkspace.color }}
                >
                  {selectedWorkspace.icon}
                </div>
                <span className="font-medium">{selectedWorkspace.name}</span>
              </div>
            )}
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-medium transition flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Invite
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-white/10 pb-4">
          {[
            { id: "overview", label: "Overview" },
            { id: "channels", label: "Channels" },
            { id: "content", label: "Shared Content" },
            { id: "tasks", label: "Tasks" },
            { id: "members", label: "Members" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                activeTab === tab.id
                  ? "bg-indigo-600 text-white"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Stats */}
            {stats && (
              <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-zinc-900/50 rounded-xl border border-white/5">
                  <p className="text-zinc-400 text-sm">Team Members</p>
                  <p className="text-2xl font-bold mt-1">{stats.totalMembers}</p>
                  <p className="text-green-400 text-xs mt-1">{stats.activeMembers} active</p>
                </div>
                <div className="p-4 bg-zinc-900/50 rounded-xl border border-white/5">
                  <p className="text-zinc-400 text-sm">Channels</p>
                  <p className="text-2xl font-bold mt-1">{stats.totalChannels}</p>
                </div>
                <div className="p-4 bg-zinc-900/50 rounded-xl border border-white/5">
                  <p className="text-zinc-400 text-sm">Pending Tasks</p>
                  <p className="text-2xl font-bold mt-1">{stats.pendingTasks}</p>
                  <p className="text-green-400 text-xs mt-1">{stats.completedTasks} completed</p>
                </div>
                <div className="p-4 bg-zinc-900/50 rounded-xl border border-white/5">
                  <p className="text-zinc-400 text-sm">Content Items</p>
                  <p className="text-2xl font-bold mt-1">{stats.totalContent}</p>
                </div>
              </div>
            )}

            {/* Recent Activity */}
            <div className="lg:col-span-2 p-6 bg-zinc-900/50 rounded-xl border border-white/5">
              <h3 className="font-semibold mb-4">Recent Activity</h3>
              <div className="space-y-4">
                {activities.slice(0, 8).map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-indigo-400 text-xs font-bold">
                        {activity.userName.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">{activity.userName}</span>{" "}
                        <span className="text-zinc-400">{activity.action}</span>{" "}
                        <span className="text-indigo-400">{activity.targetName}</span>
                      </p>
                      <p className="text-xs text-zinc-500">{formatDate(activity.createdAt)}</p>
                    </div>
                  </div>
                ))}
                {activities.length === 0 && (
                  <p className="text-zinc-500 text-center py-4">No recent activity</p>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="p-6 bg-zinc-900/50 rounded-xl border border-white/5">
              <h3 className="font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => setShowNewChannelModal(true)}
                  className="w-full p-3 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg text-left transition flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                    </svg>
                  </div>
                  <span>Create Channel</span>
                </button>
                <button
                  onClick={() => setShowNewContentModal(true)}
                  className="w-full p-3 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg text-left transition flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <span>Share Content</span>
                </button>
                <button
                  onClick={() => setShowNewTaskModal(true)}
                  className="w-full p-3 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg text-left transition flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                  </div>
                  <span>Assign Task</span>
                </button>
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="w-full p-3 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg text-left transition flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                  </div>
                  <span>Invite Member</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Channels Tab */}
        {activeTab === "channels" && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Channel List */}
            <div className="p-4 bg-zinc-900/50 rounded-xl border border-white/5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Channels</h3>
                <button
                  onClick={() => setShowNewChannelModal(true)}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </button>
              </div>
              <div className="space-y-1">
                {channels.map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => setSelectedChannel(channel)}
                    className={`w-full p-2 rounded-lg text-left transition flex items-center gap-2 ${
                      selectedChannel?.id === channel.id
                        ? "bg-indigo-500/20 text-indigo-400"
                        : "hover:bg-white/5 text-zinc-400"
                    }`}
                  >
                    {getChannelIcon(channel.type, channel.isPrivate)}
                    <span className="truncate">{channel.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Messages */}
            <div className="lg:col-span-3 flex flex-col bg-zinc-900/50 rounded-xl border border-white/5 h-[600px]">
              {selectedChannel ? (
                <>
                  <div className="p-4 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      {getChannelIcon(selectedChannel.type, selectedChannel.isPrivate)}
                      <h3 className="font-semibold">{selectedChannel.name}</h3>
                    </div>
                    <p className="text-zinc-400 text-sm mt-1">{selectedChannel.description}</p>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((message) => (
                      <div key={message.id} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-indigo-400 text-xs font-bold">
                            {message.authorName.charAt(0)}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{message.authorName}</span>
                            <span className="text-xs text-zinc-500">
                              {formatDate(message.createdAt)}
                            </span>
                            {message.isPinned && (
                              <span className="text-xs text-yellow-400">Pinned</span>
                            )}
                            {message.isEdited && (
                              <span className="text-xs text-zinc-500">(edited)</span>
                            )}
                          </div>
                          <p className="text-zinc-300 mt-1">{message.content}</p>

                          {message.attachments.length > 0 && (
                            <div className="flex gap-2 mt-2">
                              {message.attachments.map((att) => (
                                <div
                                  key={att.id}
                                  className="px-3 py-1.5 bg-zinc-800 rounded-lg text-sm flex items-center gap-2"
                                >
                                  <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                  </svg>
                                  {att.name}
                                </div>
                              ))}
                            </div>
                          )}

                          {message.reactions.length > 0 && (
                            <div className="flex gap-2 mt-2">
                              {message.reactions.map((reaction, idx) => (
                                <button
                                  key={idx}
                                  className="px-2 py-0.5 bg-zinc-800 rounded-full text-sm flex items-center gap-1 hover:bg-zinc-700 transition"
                                >
                                  <span>{reaction.emoji}</span>
                                  <span className="text-zinc-400">{reaction.count}</span>
                                </button>
                              ))}
                            </div>
                          )}

                          <div className="flex gap-1 mt-2">
                            {["👍", "❤️", "😄", "🎉"].map((emoji) => (
                              <button
                                key={emoji}
                                onClick={() => addReaction(message.id, emoji)}
                                className="p-1 hover:bg-white/10 rounded transition opacity-0 group-hover:opacity-100"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="p-4 border-t border-white/5">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                        placeholder={`Message #${selectedChannel.name}`}
                        className="flex-1 px-4 py-2 bg-zinc-800 rounded-lg border border-white/10 focus:border-indigo-500 focus:outline-none"
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!messageInput.trim()}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-zinc-500">
                  Select a channel to view messages
                </div>
              )}
            </div>
          </div>
        )}

        {/* Content Tab */}
        {activeTab === "content" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() => setShowNewContentModal(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                New Content
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sharedContent.map((content) => (
                <div
                  key={content.id}
                  className="p-4 bg-zinc-900/50 rounded-xl border border-white/5 hover:border-white/10 transition"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(content.status)}`}>
                      {content.status.replace("_", " ")}
                    </span>
                    <span className="text-xs text-zinc-500">v{content.version}</span>
                  </div>
                  <h4 className="font-medium mb-2">{content.title}</h4>
                  <p className="text-zinc-400 text-sm line-clamp-3">{content.content}</p>
                  <div className="flex items-center gap-2 mt-3">
                    {content.platforms.map((platform) => (
                      <span
                        key={platform}
                        className="px-2 py-0.5 bg-zinc-800 rounded text-xs text-zinc-400"
                      >
                        {platform}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                      <span className="text-xs text-zinc-500">{content.comments.length} comments</span>
                    </div>
                    <span className="text-xs text-zinc-500">{formatDate(content.updatedAt)}</span>
                  </div>
                </div>
              ))}
            </div>

            {sharedContent.length === 0 && (
              <div className="text-center py-12 text-zinc-500">
                <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p>No shared content yet</p>
                <p className="text-sm mt-1">Create content to collaborate with your team</p>
              </div>
            )}
          </div>
        )}

        {/* Tasks Tab */}
        {activeTab === "tasks" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() => setShowNewTaskModal(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                New Task
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {["todo", "in_progress", "review", "completed"].map((status) => (
                <div key={status} className="space-y-3">
                  <h3 className="font-medium text-zinc-400 capitalize flex items-center gap-2">
                    {status.replace("_", " ")}
                    <span className="text-xs bg-zinc-800 px-2 py-0.5 rounded-full">
                      {tasks.filter((t) => t.status === status).length}
                    </span>
                  </h3>
                  <div className="space-y-3">
                    {tasks
                      .filter((t) => t.status === status)
                      .map((task) => (
                        <div
                          key={task.id}
                          className="p-3 bg-zinc-900/50 rounded-xl border border-white/5"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className={`px-2 py-0.5 rounded text-xs ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </span>
                            {task.status !== "completed" && (
                              <button
                                onClick={() => completeTask(task.id)}
                                className="p-1 hover:bg-white/10 rounded transition"
                                title="Mark complete"
                              >
                                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                            )}
                          </div>
                          <h4 className="font-medium text-sm">{task.title}</h4>
                          <p className="text-zinc-400 text-xs mt-1 line-clamp-2">{task.description}</p>
                          {task.dueDate && (
                            <p className="text-xs text-zinc-500 mt-2">
                              Due: {new Date(task.dueDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Members Tab */}
        {activeTab === "members" && selectedWorkspace && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() => setShowInviteModal(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Invite Member
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedWorkspace.members.map((member) => (
                <div
                  key={member.userId}
                  className="p-4 bg-zinc-900/50 rounded-xl border border-white/5 flex items-center gap-4"
                >
                  <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center">
                    <span className="text-indigo-400 font-bold">
                      {member.name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium truncate">{member.name}</h4>
                      {member.status === "pending" && (
                        <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs">
                          Pending
                        </span>
                      )}
                    </div>
                    <p className="text-zinc-400 text-sm truncate">{member.email}</p>
                    <p className="text-xs text-zinc-500 mt-1 capitalize">{member.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* New Channel Modal */}
      {showNewChannelModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-xl border border-white/10 p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Create Channel</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                createChannel(
                  (form.elements.namedItem("name") as HTMLInputElement).value,
                  (form.elements.namedItem("description") as HTMLInputElement).value,
                  (form.elements.namedItem("type") as HTMLSelectElement).value,
                  (form.elements.namedItem("isPrivate") as HTMLInputElement).checked
                );
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Name</label>
                <input
                  name="name"
                  required
                  className="w-full px-4 py-2 bg-zinc-800 rounded-lg border border-white/10 focus:border-indigo-500 focus:outline-none"
                  placeholder="e.g., Q2 Campaign"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Description</label>
                <input
                  name="description"
                  className="w-full px-4 py-2 bg-zinc-800 rounded-lg border border-white/10 focus:border-indigo-500 focus:outline-none"
                  placeholder="What's this channel for?"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Type</label>
                <select
                  name="type"
                  className="w-full px-4 py-2 bg-zinc-800 rounded-lg border border-white/10 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="general">General</option>
                  <option value="project">Project</option>
                  <option value="campaign">Campaign</option>
                  <option value="content">Content</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="isPrivate"
                  id="isPrivate"
                  className="rounded border-white/10 bg-zinc-800"
                />
                <label htmlFor="isPrivate" className="text-sm text-zinc-400">
                  Make this channel private
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewChannelModal(false)}
                  className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Content Modal */}
      {showNewContentModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-xl border border-white/10 p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold mb-4">Share Content</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const platformCheckboxes = form.querySelectorAll<HTMLInputElement>('input[name="platforms"]:checked');
                const platforms = Array.from(platformCheckboxes).map((cb) => cb.value);
                createContent(
                  (form.elements.namedItem("title") as HTMLInputElement).value,
                  (form.elements.namedItem("content") as HTMLTextAreaElement).value,
                  (form.elements.namedItem("type") as HTMLSelectElement).value,
                  platforms
                );
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Title</label>
                <input
                  name="title"
                  required
                  className="w-full px-4 py-2 bg-zinc-800 rounded-lg border border-white/10 focus:border-indigo-500 focus:outline-none"
                  placeholder="Content title"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Type</label>
                <select
                  name="type"
                  className="w-full px-4 py-2 bg-zinc-800 rounded-lg border border-white/10 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="draft">Draft</option>
                  <option value="post">Post</option>
                  <option value="template">Template</option>
                  <option value="document">Document</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Content</label>
                <textarea
                  name="content"
                  required
                  rows={4}
                  className="w-full px-4 py-2 bg-zinc-800 rounded-lg border border-white/10 focus:border-indigo-500 focus:outline-none resize-none"
                  placeholder="Write your content..."
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Platforms</label>
                <div className="flex flex-wrap gap-3">
                  {["twitter", "linkedin", "instagram", "facebook", "tiktok"].map((platform) => (
                    <label key={platform} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="platforms"
                        value={platform}
                        className="rounded border-white/10 bg-zinc-800"
                      />
                      <span className="text-sm capitalize">{platform}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewContentModal(false)}
                  className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition"
                >
                  Share
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Task Modal */}
      {showNewTaskModal && selectedWorkspace && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-xl border border-white/10 p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Create Task</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                createTask(
                  (form.elements.namedItem("title") as HTMLInputElement).value,
                  (form.elements.namedItem("description") as HTMLTextAreaElement).value,
                  (form.elements.namedItem("type") as HTMLSelectElement).value,
                  (form.elements.namedItem("priority") as HTMLSelectElement).value,
                  (form.elements.namedItem("assignedTo") as HTMLSelectElement).value
                );
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Title</label>
                <input
                  name="title"
                  required
                  className="w-full px-4 py-2 bg-zinc-800 rounded-lg border border-white/10 focus:border-indigo-500 focus:outline-none"
                  placeholder="Task title"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Description</label>
                <textarea
                  name="description"
                  rows={3}
                  className="w-full px-4 py-2 bg-zinc-800 rounded-lg border border-white/10 focus:border-indigo-500 focus:outline-none resize-none"
                  placeholder="Task details..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Type</label>
                  <select
                    name="type"
                    className="w-full px-4 py-2 bg-zinc-800 rounded-lg border border-white/10 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="content">Content</option>
                    <option value="review">Review</option>
                    <option value="approval">Approval</option>
                    <option value="feedback">Feedback</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Priority</label>
                  <select
                    name="priority"
                    className="w-full px-4 py-2 bg-zinc-800 rounded-lg border border-white/10 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Assign To</label>
                <select
                  name="assignedTo"
                  className="w-full px-4 py-2 bg-zinc-800 rounded-lg border border-white/10 focus:border-indigo-500 focus:outline-none"
                >
                  {selectedWorkspace.members.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewTaskModal(false)}
                  className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-xl border border-white/10 p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Invite Team Member</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                inviteMember(
                  (form.elements.namedItem("email") as HTMLInputElement).value,
                  (form.elements.namedItem("name") as HTMLInputElement).value,
                  (form.elements.namedItem("role") as HTMLSelectElement).value
                );
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Name</label>
                <input
                  name="name"
                  required
                  className="w-full px-4 py-2 bg-zinc-800 rounded-lg border border-white/10 focus:border-indigo-500 focus:outline-none"
                  placeholder="Team member name"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Email</label>
                <input
                  name="email"
                  type="email"
                  required
                  className="w-full px-4 py-2 bg-zinc-800 rounded-lg border border-white/10 focus:border-indigo-500 focus:outline-none"
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Role</label>
                <select
                  name="role"
                  className="w-full px-4 py-2 bg-zinc-800 rounded-lg border border-white/10 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition"
                >
                  Send Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
