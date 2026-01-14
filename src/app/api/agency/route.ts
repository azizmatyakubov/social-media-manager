import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createAgencySettings,
  getAgencySettings,
  updateAgencySettings,
  createClientAccount,
  getAgencyClients,
  getClientAccount,
  updateClientAccount,
  deleteClientAccount,
  createClientInvite,
  getAgencyInvites,
  revokeInvite,
  addTeamMember,
  getAgencyTeam,
  updateTeamMember,
  removeTeamMember,
  createAgencyReport,
  getAgencyReports,
  getAgencyDashboardMetrics,
  CLIENT_ACCESS_LEVELS,
  TEAM_ROLES,
  INDUSTRIES,
} from "@/lib/agency";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    switch (action) {
      case "settings": {
        const settings = getAgencySettings(session.user.id);
        return NextResponse.json({ settings });
      }

      case "clients": {
        const clients = getAgencyClients(session.user.id);
        return NextResponse.json({ clients });
      }

      case "client": {
        const clientId = searchParams.get("clientId");
        if (!clientId) {
          return NextResponse.json({ error: "Client ID required" }, { status: 400 });
        }

        const client = getClientAccount(clientId, session.user.id);
        if (!client) {
          return NextResponse.json({ error: "Client not found" }, { status: 404 });
        }

        return NextResponse.json({ client });
      }

      case "invites": {
        const invites = getAgencyInvites(session.user.id);
        return NextResponse.json({ invites });
      }

      case "team": {
        const team = getAgencyTeam(session.user.id);
        return NextResponse.json({ team });
      }

      case "reports": {
        const reports = getAgencyReports(session.user.id);
        return NextResponse.json({ reports });
      }

      case "dashboard": {
        const metrics = getAgencyDashboardMetrics(session.user.id);
        return NextResponse.json({ metrics });
      }

      case "access-levels": {
        return NextResponse.json({ accessLevels: CLIENT_ACCESS_LEVELS });
      }

      case "roles": {
        return NextResponse.json({ roles: TEAM_ROLES });
      }

      case "industries": {
        return NextResponse.json({ industries: INDUSTRIES });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Agency GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch data" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case "create-settings": {
        const { agencyName, primaryColor, secondaryColor, contactEmail, enableWhiteLabel, hideAutoPostBranding } = data;

        if (!agencyName || !contactEmail) {
          return NextResponse.json(
            { error: "Agency name and contact email required" },
            { status: 400 }
          );
        }

        const settings = createAgencySettings(session.user.id, {
          agencyName,
          primaryColor: primaryColor || "#6366f1",
          secondaryColor: secondaryColor || "#8b5cf6",
          contactEmail,
          enableWhiteLabel: enableWhiteLabel ?? false,
          hideAutoPostBranding: hideAutoPostBranding ?? false,
        });

        return NextResponse.json({ settings });
      }

      case "update-settings": {
        const settings = updateAgencySettings(session.user.id, data);
        if (!settings) {
          return NextResponse.json({ error: "Settings not found" }, { status: 404 });
        }

        return NextResponse.json({ settings });
      }

      case "create-client": {
        const { name, email, company, industry, tags, accessLevel, notes, monthlyBudget } = data;

        if (!name || !email) {
          return NextResponse.json(
            { error: "Name and email required" },
            { status: 400 }
          );
        }

        const client = createClientAccount(session.user.id, {
          name,
          email,
          company,
          industry,
          status: "active",
          connectedPlatforms: [],
          monthlyBudget,
          notes,
          tags: tags || [],
          assignedTeamMembers: [],
          accessLevel: accessLevel || "limited",
        });

        return NextResponse.json({ client });
      }

      case "update-client": {
        const { clientId, ...updates } = data;

        if (!clientId) {
          return NextResponse.json({ error: "Client ID required" }, { status: 400 });
        }

        const client = updateClientAccount(clientId, session.user.id, updates);
        if (!client) {
          return NextResponse.json({ error: "Client not found" }, { status: 404 });
        }

        return NextResponse.json({ client });
      }

      case "delete-client": {
        const { clientId } = data;

        if (!clientId) {
          return NextResponse.json({ error: "Client ID required" }, { status: 400 });
        }

        const deleted = deleteClientAccount(clientId, session.user.id);
        if (!deleted) {
          return NextResponse.json({ error: "Client not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
      }

      case "invite-client": {
        const { email, name, accessLevel } = data;

        if (!email || !name) {
          return NextResponse.json(
            { error: "Email and name required" },
            { status: 400 }
          );
        }

        const invite = createClientInvite(session.user.id, {
          email,
          name,
          accessLevel: accessLevel || "limited",
        });

        return NextResponse.json({ invite });
      }

      case "revoke-invite": {
        const { inviteId } = data;

        if (!inviteId) {
          return NextResponse.json({ error: "Invite ID required" }, { status: 400 });
        }

        const revoked = revokeInvite(inviteId, session.user.id);
        if (!revoked) {
          return NextResponse.json({ error: "Invite not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
      }

      case "add-team-member": {
        const { name, email, role, permissions, assignedClients } = data;

        if (!name || !email || !role) {
          return NextResponse.json(
            { error: "Name, email, and role required" },
            { status: 400 }
          );
        }

        const member = addTeamMember(session.user.id, {
          name,
          email,
          role,
          permissions: permissions || [],
          assignedClients: assignedClients || [],
          status: "invited",
        });

        return NextResponse.json({ member });
      }

      case "update-team-member": {
        const { memberId, ...updates } = data;

        if (!memberId) {
          return NextResponse.json({ error: "Member ID required" }, { status: 400 });
        }

        const member = updateTeamMember(memberId, session.user.id, updates);
        if (!member) {
          return NextResponse.json({ error: "Member not found" }, { status: 404 });
        }

        return NextResponse.json({ member });
      }

      case "remove-team-member": {
        const { memberId } = data;

        if (!memberId) {
          return NextResponse.json({ error: "Member ID required" }, { status: 400 });
        }

        const removed = removeTeamMember(memberId, session.user.id);
        if (!removed) {
          return NextResponse.json({ error: "Member not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
      }

      case "create-report": {
        const { name, type, clientId, dateRange, recipients } = data;

        if (!name || !type) {
          return NextResponse.json(
            { error: "Name and type required" },
            { status: 400 }
          );
        }

        const report = createAgencyReport(session.user.id, {
          name,
          type,
          clientId,
          dateRange: dateRange || {
            start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            end: new Date(),
          },
          metrics: {},
          recipients: recipients || [],
        });

        return NextResponse.json({ report });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Agency POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process request" },
      { status: 500 }
    );
  }
}
