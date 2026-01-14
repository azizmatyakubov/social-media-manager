import { describe, it, expect, beforeEach } from "@jest/globals";
import { createMockUserId } from "../utils/test-helpers";

describe("White-label Agency Dashboard", () => {
  let userId: string;

  beforeEach(() => {
    userId = createMockUserId();
  });

  describe("Agency Settings", () => {
    describe("getAgencySettings", () => {
      it("should return null for user without agency", async () => {
        const { getAgencySettings } = await import("@/lib/agency");

        const settings = getAgencySettings(userId);

        expect(settings).toBeNull();
      });

      it("should return agency settings for user", async () => {
        const { createAgencySettings, getAgencySettings } = await import("@/lib/agency");

        createAgencySettings(userId, {
          agencyName: "Test Agency",
          primaryColor: "#4F46E5",
          secondaryColor: "#7C3AED",
          contactEmail: "contact@testagency.com",
          enableWhiteLabel: true,
          hideAutoPostBranding: false,
        });

        const settings = getAgencySettings(userId);

        expect(settings).toBeDefined();
        expect(settings?.agencyName).toBe("Test Agency");
      });
    });

    describe("createAgencySettings", () => {
      it("should create new agency settings", async () => {
        const { createAgencySettings } = await import("@/lib/agency");

        const settings = createAgencySettings(userId, {
          agencyName: "Digital Marketing Pro",
          primaryColor: "#4F46E5",
          secondaryColor: "#7C3AED",
          contactEmail: "contact@digitalmarketingpro.com",
          customDomain: "app.digitalmarketingpro.com",
          enableWhiteLabel: true,
          hideAutoPostBranding: true,
          website: "https://digitalmarketingpro.com",
        });

        expect(settings).toBeDefined();
        expect(settings.id).toBeDefined();
        expect(settings.userId).toBe(userId);
        expect(settings.agencyName).toBe("Digital Marketing Pro");
        expect(settings.enableWhiteLabel).toBe(true);
      });

      it("should create agency with custom branding", async () => {
        const { createAgencySettings } = await import("@/lib/agency");

        const settings = createAgencySettings(userId, {
          agencyName: "Creative Agency",
          primaryColor: "#FF5722",
          secondaryColor: "#FF9800",
          contactEmail: "hello@creative.agency",
          logo: "/custom-logo.png",
          enableWhiteLabel: true,
          hideAutoPostBranding: true,
          customFooterText: "Powered by Creative Agency",
        });

        expect(settings.primaryColor).toBe("#FF5722");
        expect(settings.logo).toBe("/custom-logo.png");
        expect(settings.customFooterText).toBe("Powered by Creative Agency");
      });
    });

    describe("updateAgencySettings", () => {
      it("should update agency settings", async () => {
        const { createAgencySettings, updateAgencySettings } = await import("@/lib/agency");

        createAgencySettings(userId, {
          agencyName: "Original Name",
          primaryColor: "#000000",
          secondaryColor: "#FFFFFF",
          contactEmail: "contact@original.com",
          enableWhiteLabel: false,
          hideAutoPostBranding: false,
        });

        const updated = updateAgencySettings(userId, {
          agencyName: "Updated Name",
          enableWhiteLabel: true,
        });

        expect(updated?.agencyName).toBe("Updated Name");
        expect(updated?.enableWhiteLabel).toBe(true);
      });
    });
  });

  describe("Client Operations", () => {
    describe("getAgencyClients", () => {
      it("should return clients for agency", async () => {
        const { createAgencySettings, getAgencyClients } = await import("@/lib/agency");

        const settings = createAgencySettings(userId, {
          agencyName: "Client Test Agency",
          primaryColor: "#000",
          secondaryColor: "#FFF",
          contactEmail: "test@agency.com",
          enableWhiteLabel: true,
          hideAutoPostBranding: false,
        });

        const clients = getAgencyClients(settings.id);

        expect(clients).toBeDefined();
        expect(Array.isArray(clients)).toBe(true);
      });
    });

    describe("createClientAccount", () => {
      it("should create a new client account", async () => {
        const { createAgencySettings, createClientAccount } = await import("@/lib/agency");

        const settings = createAgencySettings(userId, {
          agencyName: "Add Client Test",
          primaryColor: "#000",
          secondaryColor: "#FFF",
          contactEmail: "test@agency.com",
          enableWhiteLabel: true,
          hideAutoPostBranding: false,
        });

        const client = createClientAccount(settings.id, {
          name: "Acme Corp",
          email: "contact@acme.com",
          industry: "technology",
          status: "active",
          connectedPlatforms: ["instagram", "twitter"],
          tags: ["tech", "enterprise"],
          assignedTeamMembers: [],
          accessLevel: "full",
        });

        expect(client).toBeDefined();
        expect(client.id).toBeDefined();
        expect(client.agencyId).toBe(settings.id);
        expect(client.name).toBe("Acme Corp");
        expect(client.status).toBe("active");
      });

      it("should initialize client metrics", async () => {
        const { createAgencySettings, createClientAccount } = await import("@/lib/agency");

        const settings = createAgencySettings(userId, {
          agencyName: "Metrics Client Test",
          primaryColor: "#000",
          secondaryColor: "#FFF",
          contactEmail: "test@agency.com",
          enableWhiteLabel: true,
          hideAutoPostBranding: false,
        });

        const client = createClientAccount(settings.id, {
          name: "Metrics Client",
          email: "metrics@client.com",
          status: "active",
          connectedPlatforms: [],
          tags: [],
          assignedTeamMembers: [],
          accessLevel: "limited",
        });

        expect(client.metrics).toBeDefined();
        expect(client.metrics.totalPosts).toBe(0);
        expect(client.metrics.totalEngagement).toBe(0);
        expect(client.metrics.totalFollowers).toBe(0);
      });
    });

    describe("getClientAccount", () => {
      it("should return a specific client account", async () => {
        const { createAgencySettings, createClientAccount, getClientAccount } = await import("@/lib/agency");

        const settings = createAgencySettings(userId, {
          agencyName: "Get Client Test",
          primaryColor: "#000",
          secondaryColor: "#FFF",
          contactEmail: "test@agency.com",
          enableWhiteLabel: true,
          hideAutoPostBranding: false,
        });

        const client = createClientAccount(settings.id, {
          name: "Get Me Client",
          email: "getme@client.com",
          status: "active",
          connectedPlatforms: [],
          tags: [],
          assignedTeamMembers: [],
          accessLevel: "view_only",
        });

        const retrieved = getClientAccount(client.id, settings.id);

        expect(retrieved).toBeDefined();
        expect(retrieved?.id).toBe(client.id);
        expect(retrieved?.name).toBe("Get Me Client");
      });
    });

    describe("updateClientAccount", () => {
      it("should update client account", async () => {
        const { createAgencySettings, createClientAccount, updateClientAccount } = await import("@/lib/agency");

        const settings = createAgencySettings(userId, {
          agencyName: "Update Client Test",
          primaryColor: "#000",
          secondaryColor: "#FFF",
          contactEmail: "test@agency.com",
          enableWhiteLabel: true,
          hideAutoPostBranding: false,
        });

        const client = createClientAccount(settings.id, {
          name: "Original Client",
          email: "original@client.com",
          status: "active",
          connectedPlatforms: [],
          tags: [],
          assignedTeamMembers: [],
          accessLevel: "limited",
        });

        const updated = updateClientAccount(client.id, settings.id, {
          name: "Updated Client",
          accessLevel: "full",
        });

        expect(updated?.name).toBe("Updated Client");
        expect(updated?.accessLevel).toBe("full");
      });
    });

    describe("deleteClientAccount", () => {
      it("should delete a client account", async () => {
        const { createAgencySettings, createClientAccount, deleteClientAccount, getClientAccount } = await import("@/lib/agency");

        const settings = createAgencySettings(userId, {
          agencyName: "Delete Client Test",
          primaryColor: "#000",
          secondaryColor: "#FFF",
          contactEmail: "test@agency.com",
          enableWhiteLabel: true,
          hideAutoPostBranding: false,
        });

        const client = createClientAccount(settings.id, {
          name: "To Delete",
          email: "delete@client.com",
          status: "active",
          connectedPlatforms: [],
          tags: [],
          assignedTeamMembers: [],
          accessLevel: "view_only",
        });

        const result = deleteClientAccount(client.id, settings.id);
        const deleted = getClientAccount(client.id, settings.id);

        expect(result).toBe(true);
        expect(deleted).toBeNull();
      });
    });
  });

  describe("Client Invites", () => {
    describe("createClientInvite", () => {
      it("should create a client invite", async () => {
        const { createAgencySettings, createClientInvite } = await import("@/lib/agency");

        const settings = createAgencySettings(userId, {
          agencyName: "Invite Test",
          primaryColor: "#000",
          secondaryColor: "#FFF",
          contactEmail: "test@agency.com",
          enableWhiteLabel: true,
          hideAutoPostBranding: false,
        });

        const invite = createClientInvite(settings.id, {
          email: "newclient@company.com",
          name: "New Client",
          accessLevel: "full",
        });

        expect(invite).toBeDefined();
        expect(invite.id).toBeDefined();
        expect(invite.agencyId).toBe(settings.id);
        expect(invite.email).toBe("newclient@company.com");
        expect(invite.status).toBe("pending");
      });
    });

    describe("getAgencyInvites", () => {
      it("should return all invites for agency", async () => {
        const { createAgencySettings, getAgencyInvites } = await import("@/lib/agency");

        const settings = createAgencySettings(userId, {
          agencyName: "List Invites Test",
          primaryColor: "#000",
          secondaryColor: "#FFF",
          contactEmail: "test@agency.com",
          enableWhiteLabel: true,
          hideAutoPostBranding: false,
        });

        const invites = getAgencyInvites(settings.id);

        expect(invites).toBeDefined();
        expect(Array.isArray(invites)).toBe(true);
      });
    });

    describe("revokeInvite", () => {
      it("should revoke an invite", async () => {
        const { createAgencySettings, createClientInvite, revokeInvite } = await import("@/lib/agency");

        const settings = createAgencySettings(userId, {
          agencyName: "Revoke Invite Test",
          primaryColor: "#000",
          secondaryColor: "#FFF",
          contactEmail: "test@agency.com",
          enableWhiteLabel: true,
          hideAutoPostBranding: false,
        });

        const invite = createClientInvite(settings.id, {
          email: "revoke@client.com",
          name: "To Revoke",
          accessLevel: "limited",
        });

        const result = revokeInvite(invite.id, settings.id);

        expect(result).toBe(true);
      });
    });
  });

  describe("Team Members", () => {
    describe("getAgencyTeam", () => {
      it("should return agency team members", async () => {
        const { createAgencySettings, getAgencyTeam } = await import("@/lib/agency");

        const settings = createAgencySettings(userId, {
          agencyName: "Team Test",
          primaryColor: "#000",
          secondaryColor: "#FFF",
          contactEmail: "test@agency.com",
          enableWhiteLabel: true,
          hideAutoPostBranding: false,
        });

        const members = getAgencyTeam(settings.id);

        expect(members).toBeDefined();
        expect(Array.isArray(members)).toBe(true);
      });
    });

    describe("addTeamMember", () => {
      it("should add a team member", async () => {
        const { createAgencySettings, addTeamMember } = await import("@/lib/agency");

        const settings = createAgencySettings(userId, {
          agencyName: "Add Member Test",
          primaryColor: "#000",
          secondaryColor: "#FFF",
          contactEmail: "test@agency.com",
          enableWhiteLabel: true,
          hideAutoPostBranding: false,
        });

        const member = addTeamMember(settings.id, {
          email: "team@member.com",
          name: "Team Member",
          role: "manager",
          permissions: ["view_clients", "edit_content"],
          assignedClients: [],
          status: "active",
        });

        expect(member).toBeDefined();
        expect(member.id).toBeDefined();
        expect(member.agencyId).toBe(settings.id);
        expect(member.role).toBe("manager");
        expect(member.permissions).toContain("view_clients");
      });
    });

    describe("updateTeamMember", () => {
      it("should update team member role", async () => {
        const { createAgencySettings, addTeamMember, updateTeamMember } = await import("@/lib/agency");

        const settings = createAgencySettings(userId, {
          agencyName: "Update Member Test",
          primaryColor: "#000",
          secondaryColor: "#FFF",
          contactEmail: "test@agency.com",
          enableWhiteLabel: true,
          hideAutoPostBranding: false,
        });

        const member = addTeamMember(settings.id, {
          email: "update@member.com",
          name: "To Update",
          role: "member",
          permissions: [],
          assignedClients: [],
          status: "active",
        });

        const updated = updateTeamMember(member.id, settings.id, {
          role: "admin",
          permissions: ["full_access"],
        });

        expect(updated?.role).toBe("admin");
        expect(updated?.permissions).toContain("full_access");
      });
    });

    describe("removeTeamMember", () => {
      it("should remove a team member", async () => {
        const { createAgencySettings, addTeamMember, removeTeamMember, getAgencyTeam } = await import("@/lib/agency");

        const settings = createAgencySettings(userId, {
          agencyName: "Remove Member Test",
          primaryColor: "#000",
          secondaryColor: "#FFF",
          contactEmail: "test@agency.com",
          enableWhiteLabel: true,
          hideAutoPostBranding: false,
        });

        const member = addTeamMember(settings.id, {
          email: "remove@member.com",
          name: "To Remove",
          role: "member",
          permissions: [],
          assignedClients: [],
          status: "active",
        });

        const initialCount = getAgencyTeam(settings.id).length;
        const result = removeTeamMember(member.id, settings.id);
        const afterCount = getAgencyTeam(settings.id).length;

        expect(result).toBe(true);
        expect(afterCount).toBeLessThan(initialCount);
      });
    });
  });

  describe("Reports", () => {
    describe("createAgencyReport", () => {
      it("should create an agency report", async () => {
        const { createAgencySettings, createClientAccount, createAgencyReport } = await import("@/lib/agency");

        const settings = createAgencySettings(userId, {
          agencyName: "Report Test",
          primaryColor: "#000",
          secondaryColor: "#FFF",
          contactEmail: "test@agency.com",
          enableWhiteLabel: true,
          hideAutoPostBranding: false,
        });

        const client = createClientAccount(settings.id, {
          name: "Report Client",
          email: "report@client.com",
          status: "active",
          connectedPlatforms: [],
          tags: [],
          assignedTeamMembers: [],
          accessLevel: "full",
        });

        const report = createAgencyReport(settings.id, {
          name: "Q1 Performance Report",
          type: "performance",
          dateRange: { start: new Date(), end: new Date() },
          clientId: client.id,
          recipients: ["client@email.com"],
        });

        expect(report).toBeDefined();
        expect(report.id).toBeDefined();
        expect(report.name).toBe("Q1 Performance Report");
        expect(report.type).toBe("performance");
      });
    });

    describe("getAgencyReports", () => {
      it("should return all agency reports", async () => {
        const { createAgencySettings, getAgencyReports } = await import("@/lib/agency");

        const settings = createAgencySettings(userId, {
          agencyName: "Reports List Test",
          primaryColor: "#000",
          secondaryColor: "#FFF",
          contactEmail: "test@agency.com",
          enableWhiteLabel: true,
          hideAutoPostBranding: false,
        });

        const reports = getAgencyReports(settings.id);

        expect(reports).toBeDefined();
        expect(Array.isArray(reports)).toBe(true);
      });
    });
  });

  describe("Statistics", () => {
    describe("getAgencyDashboardMetrics", () => {
      it("should return agency dashboard metrics", async () => {
        const { createAgencySettings, getAgencyDashboardMetrics } = await import("@/lib/agency");

        const settings = createAgencySettings(userId, {
          agencyName: "Stats Test",
          primaryColor: "#000",
          secondaryColor: "#FFF",
          contactEmail: "test@agency.com",
          enableWhiteLabel: true,
          hideAutoPostBranding: false,
        });

        const metrics = getAgencyDashboardMetrics(settings.id);

        expect(metrics).toBeDefined();
        expect(metrics.totalClients).toBeGreaterThanOrEqual(0);
        expect(metrics.activeClients).toBeGreaterThanOrEqual(0);
        expect(metrics.totalTeamMembers).toBeGreaterThanOrEqual(0);
        expect(metrics.clientsByIndustry).toBeDefined();
        expect(metrics.recentActivity).toBeDefined();
      });
    });
  });

  describe("Constants", () => {
    it("should export team roles", async () => {
      const { TEAM_ROLES } = await import("@/lib/agency");

      expect(TEAM_ROLES).toBeDefined();
      expect(Array.isArray(TEAM_ROLES)).toBe(true);
    });

    it("should export client access levels", async () => {
      const { CLIENT_ACCESS_LEVELS } = await import("@/lib/agency");

      expect(CLIENT_ACCESS_LEVELS).toBeDefined();
      expect(Array.isArray(CLIENT_ACCESS_LEVELS)).toBe(true);
    });

    it("should export industries", async () => {
      const { INDUSTRIES } = await import("@/lib/agency");

      expect(INDUSTRIES).toBeDefined();
      expect(Array.isArray(INDUSTRIES)).toBe(true);
    });
  });
});
