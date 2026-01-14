"use client";

import { useState, useEffect } from "react";
import {
  BuildingOfficeIcon,
  UserGroupIcon,
  ChartBarIcon,
  CogIcon,
  PlusIcon,
  EnvelopeIcon,
  PaintBrushIcon,
  UserPlusIcon,
  DocumentChartBarIcon,
  TagIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

interface AgencySettings {
  id: string;
  agencyName: string;
  logo?: string;
  primaryColor: string;
  secondaryColor: string;
  customDomain?: string;
  contactEmail: string;
  supportEmail?: string;
  website?: string;
  enableWhiteLabel: boolean;
  hideAutoPostBranding: boolean;
}

interface ClientAccount {
  id: string;
  name: string;
  email: string;
  company?: string;
  industry?: string;
  status: "active" | "inactive" | "pending" | "suspended";
  connectedPlatforms: string[];
  monthlyBudget?: number;
  tags: string[];
  accessLevel: "full" | "limited" | "view_only";
  metrics: {
    totalPosts: number;
    totalEngagement: number;
    totalFollowers: number;
  };
  createdAt: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "member";
  assignedClients: string[];
  status: "active" | "invited" | "inactive";
}

interface DashboardMetrics {
  totalClients: number;
  activeClients: number;
  totalPosts: number;
  totalEngagement: number;
  totalFollowers: number;
  clientsByStatus: Record<string, number>;
  clientsByIndustry: Record<string, number>;
  monthlyGrowth: { month: string; clients: number; posts: number }[];
}

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  active: { bg: "bg-green-500/20", text: "text-green-400" },
  inactive: { bg: "bg-zinc-500/20", text: "text-zinc-400" },
  pending: { bg: "bg-yellow-500/20", text: "text-yellow-400" },
  suspended: { bg: "bg-red-500/20", text: "text-red-400" },
  invited: { bg: "bg-blue-500/20", text: "text-blue-400" },
};

const INDUSTRIES = [
  "Technology", "Healthcare", "Finance", "Retail", "E-commerce",
  "Real Estate", "Education", "Entertainment", "Food & Beverage",
  "Travel", "Fashion", "Automotive", "Non-profit", "Other",
];

export default function AgencyPage() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "clients" | "team" | "settings">("dashboard");
  const [settings, setSettings] = useState<AgencySettings | null>(null);
  const [clients, setClients] = useState<ClientAccount[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [showCreateSettings, setShowCreateSettings] = useState(false);

  // Form states
  const [agencyName, setAgencyName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#6366f1");
  const [secondaryColor, setSecondaryColor] = useState("#8b5cf6");
  const [contactEmail, setContactEmail] = useState("");
  const [enableWhiteLabel, setEnableWhiteLabel] = useState(false);

  // Client form
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [clientIndustry, setClientIndustry] = useState("");
  const [clientAccessLevel, setClientAccessLevel] = useState<"full" | "limited" | "view_only">("limited");

  // Team form
  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState<"admin" | "manager" | "member">("member");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [settingsRes, clientsRes, teamRes, metricsRes] = await Promise.all([
        fetch("/api/agency?action=settings"),
        fetch("/api/agency?action=clients"),
        fetch("/api/agency?action=team"),
        fetch("/api/agency?action=dashboard"),
      ]);

      const settingsData = await settingsRes.json();
      const clientsData = await clientsRes.json();
      const teamData = await teamRes.json();
      const metricsData = await metricsRes.json();

      setSettings(settingsData.settings || null);
      setClients(clientsData.clients || []);
      setTeam(teamData.team || []);
      setMetrics(metricsData.metrics || null);

      if (!settingsData.settings) {
        setShowCreateSettings(true);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    }
  };

  const createSettings = async () => {
    if (!agencyName || !contactEmail) return;

    setLoading(true);
    try {
      const response = await fetch("/api/agency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-settings",
          agencyName,
          primaryColor,
          secondaryColor,
          contactEmail,
          enableWhiteLabel,
          hideAutoPostBranding: false,
        }),
      });

      if (response.ok) {
        await fetchData();
        setShowCreateSettings(false);
      }
    } catch (error) {
      console.error("Failed to create settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updates: Partial<AgencySettings>) => {
    setLoading(true);
    try {
      const response = await fetch("/api/agency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update-settings", ...updates }),
      });

      if (response.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error("Failed to update settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const createClient = async () => {
    if (!clientName || !clientEmail) return;

    setLoading(true);
    try {
      const response = await fetch("/api/agency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-client",
          name: clientName,
          email: clientEmail,
          company: clientCompany,
          industry: clientIndustry,
          accessLevel: clientAccessLevel,
          tags: [],
        }),
      });

      if (response.ok) {
        await fetchData();
        setShowCreateClient(false);
        setClientName("");
        setClientEmail("");
        setClientCompany("");
        setClientIndustry("");
      }
    } catch (error) {
      console.error("Failed to create client:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateClientStatus = async (clientId: string, status: string) => {
    try {
      await fetch("/api/agency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update-client", clientId, status }),
      });
      await fetchData();
    } catch (error) {
      console.error("Failed to update client:", error);
    }
  };

  const deleteClient = async (clientId: string) => {
    if (!confirm("Are you sure you want to delete this client?")) return;

    try {
      await fetch("/api/agency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete-client", clientId }),
      });
      await fetchData();
    } catch (error) {
      console.error("Failed to delete client:", error);
    }
  };

  const addTeamMember = async () => {
    if (!memberName || !memberEmail) return;

    setLoading(true);
    try {
      const response = await fetch("/api/agency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add-team-member",
          name: memberName,
          email: memberEmail,
          role: memberRole,
        }),
      });

      if (response.ok) {
        await fetchData();
        setMemberName("");
        setMemberEmail("");
      }
    } catch (error) {
      console.error("Failed to add team member:", error);
    } finally {
      setLoading(false);
    }
  };

  // Setup modal
  if (showCreateSettings && !settings) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <BuildingOfficeIcon className="w-12 h-12 text-indigo-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white">Set Up Your Agency</h2>
            <p className="text-zinc-400 mt-2">
              Configure your agency profile to start managing clients
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Agency Name</label>
              <input
                type="text"
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
                placeholder="Your Agency Name"
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Contact Email</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="contact@youragency.com"
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Primary Color</label>
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-full h-10 rounded-lg cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Secondary Color</label>
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="w-full h-10 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="whiteLabel"
                checked={enableWhiteLabel}
                onChange={(e) => setEnableWhiteLabel(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-indigo-600"
              />
              <label htmlFor="whiteLabel" className="text-sm text-zinc-300">
                Enable white-label mode
              </label>
            </div>

            <button
              onClick={createSettings}
              disabled={loading || !agencyName || !contactEmail}
              className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Agency Profile"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BuildingOfficeIcon className="w-7 h-7 text-indigo-400" />
            {settings?.agencyName || "Agency Dashboard"}
          </h1>
          <p className="text-zinc-400 mt-1">
            Manage your clients and team from one place
          </p>
        </div>

        {activeTab === "clients" && (
          <button
            onClick={() => setShowCreateClient(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <PlusIcon className="w-4 h-4" />
            Add Client
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-zinc-900/50 p-1 rounded-lg w-fit">
        {[
          { id: "dashboard", label: "Dashboard", icon: ChartBarIcon },
          { id: "clients", label: "Clients", icon: UserGroupIcon },
          { id: "team", label: "Team", icon: UserPlusIcon },
          { id: "settings", label: "Settings", icon: CogIcon },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
              activeTab === id
                ? "bg-indigo-600 text-white"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Dashboard Tab */}
      {activeTab === "dashboard" && metrics && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
              <p className="text-zinc-400 text-sm">Total Clients</p>
              <p className="text-2xl font-bold text-white mt-1">{metrics.totalClients}</p>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
              <p className="text-zinc-400 text-sm">Active Clients</p>
              <p className="text-2xl font-bold text-green-400 mt-1">{metrics.activeClients}</p>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
              <p className="text-zinc-400 text-sm">Total Posts</p>
              <p className="text-2xl font-bold text-indigo-400 mt-1">{metrics.totalPosts}</p>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
              <p className="text-zinc-400 text-sm">Engagement</p>
              <p className="text-2xl font-bold text-yellow-400 mt-1">{metrics.totalEngagement}</p>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
              <p className="text-zinc-400 text-sm">Followers</p>
              <p className="text-2xl font-bold text-pink-400 mt-1">{metrics.totalFollowers}</p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Growth Chart */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Growth Trend</h2>
              <div className="flex items-end gap-2 h-40">
                {metrics.monthlyGrowth.map((item, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-indigo-500/50 rounded-t"
                      style={{ height: `${(item.posts / Math.max(...metrics.monthlyGrowth.map(m => m.posts))) * 100}%` }}
                    />
                    <span className="text-xs text-zinc-500">{item.month}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Industry Breakdown */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Clients by Industry</h2>
              <div className="space-y-3">
                {Object.entries(metrics.clientsByIndustry).map(([industry, count]) => (
                  <div key={industry} className="flex items-center justify-between">
                    <span className="text-zinc-300">{industry}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500"
                          style={{ width: `${(count / metrics.totalClients) * 100}%` }}
                        />
                      </div>
                      <span className="text-zinc-400 text-sm w-8">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clients Tab */}
      {activeTab === "clients" && (
        <div className="space-y-4">
          {clients.length === 0 ? (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-12 text-center">
              <UserGroupIcon className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No clients yet</h3>
              <p className="text-zinc-400 mb-4">Add your first client to get started</p>
              <button
                onClick={() => setShowCreateClient(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Add Client
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {clients.map((client) => (
                <div
                  key={client.id}
                  className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-white font-medium">{client.name}</h3>
                      <p className="text-sm text-zinc-400">{client.email}</p>
                      {client.company && (
                        <p className="text-xs text-zinc-500 mt-1">{client.company}</p>
                      )}
                    </div>
                    <span className={`px-2 py-1 rounded text-xs ${STATUS_STYLES[client.status].bg} ${STATUS_STYLES[client.status].text}`}>
                      {client.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {client.industry && (
                      <span className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-300">
                        {client.industry}
                      </span>
                    )}
                    <span className="px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded text-xs">
                      {client.accessLevel} access
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                    <div className="p-2 bg-zinc-800/50 rounded">
                      <p className="text-lg font-bold text-white">{client.metrics.totalPosts}</p>
                      <p className="text-xs text-zinc-500">Posts</p>
                    </div>
                    <div className="p-2 bg-zinc-800/50 rounded">
                      <p className="text-lg font-bold text-white">{client.metrics.totalEngagement}</p>
                      <p className="text-xs text-zinc-500">Engagement</p>
                    </div>
                    <div className="p-2 bg-zinc-800/50 rounded">
                      <p className="text-lg font-bold text-white">{client.metrics.totalFollowers}</p>
                      <p className="text-xs text-zinc-500">Followers</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <select
                      value={client.status}
                      onChange={(e) => updateClientStatus(client.id, e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="suspended">Suspended</option>
                    </select>
                    <button
                      onClick={() => deleteClient(client.id)}
                      className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded text-sm hover:bg-red-500/30"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Team Tab */}
      {activeTab === "team" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add Team Member */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <UserPlusIcon className="w-5 h-5 text-indigo-400" />
              Add Team Member
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Name</label>
                <input
                  type="text"
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Email</label>
                <input
                  type="email"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Role</label>
                <select
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value as any)}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="member">Member</option>
                </select>
              </div>

              <button
                onClick={addTeamMember}
                disabled={loading || !memberName || !memberEmail}
                className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                Send Invite
              </button>
            </div>
          </div>

          {/* Team List */}
          <div className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Team Members</h2>

            {team.length === 0 ? (
              <p className="text-zinc-500 text-center py-8">No team members yet</p>
            ) : (
              <div className="space-y-3">
                {team.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center font-medium text-indigo-300">
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-white font-medium">{member.name}</p>
                        <p className="text-sm text-zinc-400">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded text-xs capitalize ${
                        member.role === "admin" ? "bg-purple-500/20 text-purple-400" :
                        member.role === "manager" ? "bg-blue-500/20 text-blue-400" :
                        "bg-zinc-700 text-zinc-300"
                      }`}>
                        {member.role}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs ${STATUS_STYLES[member.status].bg} ${STATUS_STYLES[member.status].text}`}>
                        {member.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === "settings" && settings && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Branding */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <PaintBrushIcon className="w-5 h-5 text-indigo-400" />
              Branding
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Agency Name</label>
                <input
                  type="text"
                  value={settings.agencyName}
                  onChange={(e) => updateSettings({ agencyName: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Primary Color</label>
                  <input
                    type="color"
                    value={settings.primaryColor}
                    onChange={(e) => updateSettings({ primaryColor: e.target.value })}
                    className="w-full h-10 rounded-lg cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Secondary Color</label>
                  <input
                    type="color"
                    value={settings.secondaryColor}
                    onChange={(e) => updateSettings({ secondaryColor: e.target.value })}
                    className="w-full h-10 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="whiteLabel"
                  checked={settings.enableWhiteLabel}
                  onChange={(e) => updateSettings({ enableWhiteLabel: e.target.checked })}
                  className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-indigo-600"
                />
                <label htmlFor="whiteLabel" className="text-sm text-zinc-300">
                  Enable white-label mode
                </label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="hideBranding"
                  checked={settings.hideAutoPostBranding}
                  onChange={(e) => updateSettings({ hideAutoPostBranding: e.target.checked })}
                  className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-indigo-600"
                />
                <label htmlFor="hideBranding" className="text-sm text-zinc-300">
                  Hide AutoPost branding
                </label>
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <EnvelopeIcon className="w-5 h-5 text-indigo-400" />
              Contact Information
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Contact Email</label>
                <input
                  type="email"
                  value={settings.contactEmail}
                  onChange={(e) => updateSettings({ contactEmail: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Support Email</label>
                <input
                  type="email"
                  value={settings.supportEmail || ""}
                  onChange={(e) => updateSettings({ supportEmail: e.target.value })}
                  placeholder="support@youragency.com"
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Website</label>
                <input
                  type="url"
                  value={settings.website || ""}
                  onChange={(e) => updateSettings({ website: e.target.value })}
                  placeholder="https://youragency.com"
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Custom Domain</label>
                <input
                  type="text"
                  value={settings.customDomain || ""}
                  onChange={(e) => updateSettings({ customDomain: e.target.value })}
                  placeholder="app.youragency.com"
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Contact support to set up your custom domain
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Client Modal */}
      {showCreateClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md">
            <div className="p-6 border-b border-zinc-800">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Add New Client</h2>
                <button
                  onClick={() => setShowCreateClient(false)}
                  className="text-zinc-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Name</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Client Name"
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Email</label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="client@example.com"
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Company</label>
                <input
                  type="text"
                  value={clientCompany}
                  onChange={(e) => setClientCompany(e.target.value)}
                  placeholder="Company Name"
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Industry</label>
                <select
                  value={clientIndustry}
                  onChange={(e) => setClientIndustry(e.target.value)}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Select Industry</option>
                  {INDUSTRIES.map((industry) => (
                    <option key={industry} value={industry}>{industry}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Access Level</label>
                <select
                  value={clientAccessLevel}
                  onChange={(e) => setClientAccessLevel(e.target.value as any)}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="full">Full Access</option>
                  <option value="limited">Limited Access</option>
                  <option value="view_only">View Only</option>
                </select>
              </div>
            </div>

            <div className="p-6 border-t border-zinc-800 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateClient(false)}
                className="px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700"
              >
                Cancel
              </button>
              <button
                onClick={createClient}
                disabled={loading || !clientName || !clientEmail}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? "Creating..." : "Add Client"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
