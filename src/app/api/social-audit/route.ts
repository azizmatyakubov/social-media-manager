import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getUserAudits,
  getAudit,
  startAudit,
  deleteAudit,
  updateActionItem,
  getAuditTemplates,
  getAuditTemplate,
  getAuditStats,
  exportAuditReport,
  CATEGORIES,
} from "@/lib/social-audit";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    switch (action) {
      case "audits": {
        const audits = getUserAudits(session.user.id);
        return NextResponse.json({ audits });
      }

      case "audit": {
        const auditId = searchParams.get("auditId");
        if (!auditId) {
          return NextResponse.json({ error: "Audit ID required" }, { status: 400 });
        }
        const audit = getAudit(auditId);
        if (!audit) {
          return NextResponse.json({ error: "Audit not found" }, { status: 404 });
        }
        return NextResponse.json({ audit });
      }

      case "templates": {
        const templates = getAuditTemplates();
        return NextResponse.json({ templates });
      }

      case "template": {
        const templateId = searchParams.get("templateId");
        if (!templateId) {
          return NextResponse.json({ error: "Template ID required" }, { status: 400 });
        }
        const template = getAuditTemplate(templateId);
        if (!template) {
          return NextResponse.json({ error: "Template not found" }, { status: 404 });
        }
        return NextResponse.json({ template });
      }

      case "stats": {
        const stats = getAuditStats(session.user.id);
        return NextResponse.json({ stats });
      }

      case "export": {
        const auditId = searchParams.get("auditId");
        if (!auditId) {
          return NextResponse.json({ error: "Audit ID required" }, { status: 400 });
        }
        const audit = getAudit(auditId);
        if (!audit) {
          return NextResponse.json({ error: "Audit not found" }, { status: 404 });
        }
        const report = exportAuditReport(audit);
        return NextResponse.json({ report });
      }

      case "constants": {
        return NextResponse.json({
          categories: CATEGORIES,
          platforms: ["instagram", "twitter", "facebook", "linkedin", "tiktok", "youtube", "pinterest"],
        });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Social audit GET error:", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
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
      case "start-audit": {
        const { name, templateId, platforms, profiles } = data;
        if (!name || !templateId || !platforms || platforms.length === 0) {
          return NextResponse.json(
            { error: "Name, template, and platforms required" },
            { status: 400 }
          );
        }
        const audit = startAudit(session.user.id, {
          name,
          templateId,
          platforms,
          profiles: profiles || [],
        });
        return NextResponse.json({ audit });
      }

      case "delete-audit": {
        const { auditId } = data;
        if (!auditId) {
          return NextResponse.json({ error: "Audit ID required" }, { status: 400 });
        }
        const success = deleteAudit(auditId, session.user.id);
        if (!success) {
          return NextResponse.json(
            { error: "Audit not found or unauthorized" },
            { status: 404 }
          );
        }
        return NextResponse.json({ success: true });
      }

      case "update-action": {
        const { auditId, actionId, completed } = data;
        if (!auditId || !actionId || completed === undefined) {
          return NextResponse.json(
            { error: "Audit ID, action ID, and completed status required" },
            { status: 400 }
          );
        }
        const audit = updateActionItem(auditId, session.user.id, actionId, completed);
        if (!audit) {
          return NextResponse.json(
            { error: "Audit or action not found" },
            { status: 404 }
          );
        }
        return NextResponse.json({ audit });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Social audit POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process request" },
      { status: 500 }
    );
  }
}
