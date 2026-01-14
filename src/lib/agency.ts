export interface AgencySettings {
  id: string;
  userId: string;
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
  customFooterText?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientAccount {
  id: string;
  agencyId: string;
  name: string;
  email: string;
  company?: string;
  industry?: string;
  status: "active" | "inactive" | "pending" | "suspended";
  connectedPlatforms: string[];
  monthlyBudget?: number;
  contractStartDate?: Date;
  contractEndDate?: Date;
  notes?: string;
  tags: string[];
  assignedTeamMembers: string[];
  accessLevel: "full" | "limited" | "view_only";
  customBranding?: {
    logo?: string;
    primaryColor?: string;
  };
  metrics: {
    totalPosts: number;
    totalEngagement: number;
    totalFollowers: number;
    lastActivityAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientInvite {
  id: string;
  agencyId: string;
  email: string;
  name: string;
  accessLevel: "full" | "limited" | "view_only";
  status: "pending" | "accepted" | "expired" | "revoked";
  expiresAt: Date;
  createdAt: Date;
  acceptedAt?: Date;
}

export interface AgencyReport {
  id: string;
  agencyId: string;
  clientId?: string;
  name: string;
  type: "performance" | "engagement" | "growth" | "roi" | "custom";
  dateRange: {
    start: Date;
    end: Date;
  };
  metrics: Record<string, any>;
  generated: boolean;
  generatedAt?: Date;
  scheduledFor?: Date;
  recipients: string[];
  createdAt: Date;
}

export interface TeamMember {
  id: string;
  agencyId: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "member";
  permissions: string[];
  assignedClients: string[];
  status: "active" | "invited" | "inactive";
  createdAt: Date;
}

// In-memory storage
const agencySettings = new Map<string, AgencySettings>();
const clientAccounts = new Map<string, ClientAccount>();
const agencyClients = new Map<string, Set<string>>();
const clientInvites = new Map<string, ClientInvite>();
const agencyReports = new Map<string, AgencyReport>();
const teamMembers = new Map<string, TeamMember>();
const agencyTeam = new Map<string, Set<string>>();

// Agency Settings CRUD
export function createAgencySettings(
  userId: string,
  data: Omit<AgencySettings, "id" | "userId" | "createdAt" | "updatedAt">
): AgencySettings {
  const settings: AgencySettings = {
    id: crypto.randomUUID(),
    userId,
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  agencySettings.set(userId, settings);
  return settings;
}

export function getAgencySettings(userId: string): AgencySettings | null {
  return agencySettings.get(userId) || null;
}

export function updateAgencySettings(
  userId: string,
  updates: Partial<Omit<AgencySettings, "id" | "userId" | "createdAt" | "updatedAt">>
): AgencySettings | null {
  const settings = agencySettings.get(userId);
  if (!settings) return null;

  const updated: AgencySettings = {
    ...settings,
    ...updates,
    updatedAt: new Date(),
  };

  agencySettings.set(userId, updated);
  return updated;
}

// Client Account CRUD
export function createClientAccount(
  agencyId: string,
  data: Omit<ClientAccount, "id" | "agencyId" | "metrics" | "createdAt" | "updatedAt">
): ClientAccount {
  const client: ClientAccount = {
    id: crypto.randomUUID(),
    agencyId,
    ...data,
    metrics: {
      totalPosts: 0,
      totalEngagement: 0,
      totalFollowers: 0,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  clientAccounts.set(client.id, client);

  if (!agencyClients.has(agencyId)) {
    agencyClients.set(agencyId, new Set());
  }
  agencyClients.get(agencyId)!.add(client.id);

  return client;
}

export function getAgencyClients(agencyId: string): ClientAccount[] {
  const clientIds = agencyClients.get(agencyId);
  if (!clientIds) return [];

  return Array.from(clientIds)
    .map((id) => clientAccounts.get(id))
    .filter((c): c is ClientAccount => c !== undefined)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function getClientAccount(clientId: string, agencyId: string): ClientAccount | null {
  const client = clientAccounts.get(clientId);
  if (!client || client.agencyId !== agencyId) return null;
  return client;
}

export function updateClientAccount(
  clientId: string,
  agencyId: string,
  updates: Partial<Omit<ClientAccount, "id" | "agencyId" | "createdAt" | "updatedAt">>
): ClientAccount | null {
  const client = clientAccounts.get(clientId);
  if (!client || client.agencyId !== agencyId) return null;

  const updated: ClientAccount = {
    ...client,
    ...updates,
    updatedAt: new Date(),
  };

  clientAccounts.set(clientId, updated);
  return updated;
}

export function deleteClientAccount(clientId: string, agencyId: string): boolean {
  const client = clientAccounts.get(clientId);
  if (!client || client.agencyId !== agencyId) return false;

  clientAccounts.delete(clientId);
  agencyClients.get(agencyId)?.delete(clientId);
  return true;
}

// Client Invites
export function createClientInvite(
  agencyId: string,
  data: Omit<ClientInvite, "id" | "agencyId" | "status" | "expiresAt" | "createdAt">
): ClientInvite {
  const invite: ClientInvite = {
    id: crypto.randomUUID(),
    agencyId,
    ...data,
    status: "pending",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    createdAt: new Date(),
  };

  clientInvites.set(invite.id, invite);
  return invite;
}

export function getAgencyInvites(agencyId: string): ClientInvite[] {
  return Array.from(clientInvites.values())
    .filter((i) => i.agencyId === agencyId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function revokeInvite(inviteId: string, agencyId: string): boolean {
  const invite = clientInvites.get(inviteId);
  if (!invite || invite.agencyId !== agencyId) return false;

  invite.status = "revoked";
  clientInvites.set(inviteId, invite);
  return true;
}

// Team Members
export function addTeamMember(
  agencyId: string,
  data: Omit<TeamMember, "id" | "agencyId" | "createdAt">
): TeamMember {
  const member: TeamMember = {
    id: crypto.randomUUID(),
    agencyId,
    ...data,
    createdAt: new Date(),
  };

  teamMembers.set(member.id, member);

  if (!agencyTeam.has(agencyId)) {
    agencyTeam.set(agencyId, new Set());
  }
  agencyTeam.get(agencyId)!.add(member.id);

  return member;
}

export function getAgencyTeam(agencyId: string): TeamMember[] {
  const memberIds = agencyTeam.get(agencyId);
  if (!memberIds) return [];

  return Array.from(memberIds)
    .map((id) => teamMembers.get(id))
    .filter((m): m is TeamMember => m !== undefined);
}

export function updateTeamMember(
  memberId: string,
  agencyId: string,
  updates: Partial<Omit<TeamMember, "id" | "agencyId" | "createdAt">>
): TeamMember | null {
  const member = teamMembers.get(memberId);
  if (!member || member.agencyId !== agencyId) return null;

  const updated: TeamMember = { ...member, ...updates };
  teamMembers.set(memberId, updated);
  return updated;
}

export function removeTeamMember(memberId: string, agencyId: string): boolean {
  const member = teamMembers.get(memberId);
  if (!member || member.agencyId !== agencyId) return false;

  teamMembers.delete(memberId);
  agencyTeam.get(agencyId)?.delete(memberId);
  return true;
}

// Reports
export function createAgencyReport(
  agencyId: string,
  data: Omit<AgencyReport, "id" | "agencyId" | "generated" | "createdAt">
): AgencyReport {
  const report: AgencyReport = {
    id: crypto.randomUUID(),
    agencyId,
    ...data,
    generated: false,
    createdAt: new Date(),
  };

  agencyReports.set(report.id, report);
  return report;
}

export function getAgencyReports(agencyId: string): AgencyReport[] {
  return Array.from(agencyReports.values())
    .filter((r) => r.agencyId === agencyId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

// Analytics
export function getAgencyDashboardMetrics(agencyId: string): {
  totalClients: number;
  activeClients: number;
  totalPosts: number;
  totalEngagement: number;
  totalFollowers: number;
  clientsByStatus: Record<string, number>;
  clientsByIndustry: Record<string, number>;
  recentActivity: { type: string; client: string; date: Date }[];
  monthlyGrowth: { month: string; clients: number; posts: number }[];
} {
  const clients = getAgencyClients(agencyId);

  const activeClients = clients.filter((c) => c.status === "active").length;
  const totalPosts = clients.reduce((sum, c) => sum + c.metrics.totalPosts, 0);
  const totalEngagement = clients.reduce((sum, c) => sum + c.metrics.totalEngagement, 0);
  const totalFollowers = clients.reduce((sum, c) => sum + c.metrics.totalFollowers, 0);

  const clientsByStatus: Record<string, number> = {};
  const clientsByIndustry: Record<string, number> = {};

  for (const client of clients) {
    clientsByStatus[client.status] = (clientsByStatus[client.status] || 0) + 1;
    if (client.industry) {
      clientsByIndustry[client.industry] = (clientsByIndustry[client.industry] || 0) + 1;
    }
  }

  // Mock recent activity
  const recentActivity = clients.slice(0, 5).map((c) => ({
    type: "post",
    client: c.name,
    date: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
  }));

  // Mock monthly growth
  const monthlyGrowth = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    monthlyGrowth.push({
      month: date.toLocaleDateString(undefined, { month: "short" }),
      clients: Math.floor(clients.length * (1 - i * 0.1)),
      posts: Math.floor(totalPosts * (1 - i * 0.15)),
    });
  }

  return {
    totalClients: clients.length,
    activeClients,
    totalPosts,
    totalEngagement,
    totalFollowers,
    clientsByStatus,
    clientsByIndustry,
    recentActivity,
    monthlyGrowth,
  };
}

export const CLIENT_ACCESS_LEVELS = [
  { value: "full", label: "Full Access", description: "Can manage all aspects of their account" },
  { value: "limited", label: "Limited Access", description: "Can create content but not manage settings" },
  { value: "view_only", label: "View Only", description: "Can only view analytics and content" },
] as const;

export const TEAM_ROLES = [
  { value: "admin", label: "Admin", description: "Full access to agency settings and all clients" },
  { value: "manager", label: "Manager", description: "Can manage assigned clients and team" },
  { value: "member", label: "Member", description: "Can work on assigned client accounts" },
] as const;

export const INDUSTRIES = [
  "Technology",
  "Healthcare",
  "Finance",
  "Retail",
  "E-commerce",
  "Real Estate",
  "Education",
  "Entertainment",
  "Food & Beverage",
  "Travel",
  "Fashion",
  "Automotive",
  "Non-profit",
  "Other",
];
