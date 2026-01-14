import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getUserReports,
  getReport,
  createReport,
  updateReport,
  deleteReport,
  addWidget,
  removeWidget,
  reorderWidgets,
  getWidgetData,
  getReportData,
  duplicateReport,
  getReportTemplates,
  AVAILABLE_METRICS,
  type ReportWidget,
} from "@/lib/reports";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    switch (action) {
      case "list": {
        const reports = await getUserReports(session.user.id);
        return NextResponse.json({ reports });
      }

      case "get": {
        const reportId = searchParams.get("reportId");
        if (!reportId) {
          return NextResponse.json({ error: "Report ID required" }, { status: 400 });
        }

        const report = await getReport(reportId, session.user.id);
        if (!report) {
          return NextResponse.json({ error: "Report not found" }, { status: 404 });
        }

        return NextResponse.json({ report });
      }

      case "data": {
        const reportId = searchParams.get("reportId");
        if (!reportId) {
          return NextResponse.json({ error: "Report ID required" }, { status: 400 });
        }

        const report = await getReport(reportId, session.user.id);
        if (!report) {
          return NextResponse.json({ error: "Report not found" }, { status: 404 });
        }

        const data = await getReportData(session.user.id, report);
        return NextResponse.json({ data });
      }

      case "widget-data": {
        const widgetJson = searchParams.get("widget");
        if (!widgetJson) {
          return NextResponse.json({ error: "Widget data required" }, { status: 400 });
        }

        const widget = JSON.parse(widgetJson) as ReportWidget;
        const data = await getWidgetData(session.user.id, widget);
        return NextResponse.json({ data });
      }

      case "metrics": {
        return NextResponse.json({ metrics: AVAILABLE_METRICS });
      }

      case "templates": {
        const templates = getReportTemplates();
        return NextResponse.json({ templates });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Custom Reports GET error:", error);
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
      case "create": {
        const { name, description, widgets, isPublic } = data;

        if (!name) {
          return NextResponse.json({ error: "Name required" }, { status: 400 });
        }

        const report = await createReport(session.user.id, {
          name,
          description,
          widgets,
          isPublic,
        });

        return NextResponse.json({ report });
      }

      case "create-from-template": {
        const { templateIndex, name } = data;
        const templates = getReportTemplates();

        if (templateIndex === undefined || templateIndex < 0 || templateIndex >= templates.length) {
          return NextResponse.json({ error: "Invalid template" }, { status: 400 });
        }

        const template = templates[templateIndex];
        const report = await createReport(session.user.id, {
          name: name || template.name,
          description: template.description,
          widgets: template.widgets.map((w) => ({ ...w, id: crypto.randomUUID() })),
          isPublic: false,
        });

        return NextResponse.json({ report });
      }

      case "update": {
        const { reportId, ...updateData } = data;
        if (!reportId) {
          return NextResponse.json({ error: "Report ID required" }, { status: 400 });
        }

        const report = await updateReport(reportId, session.user.id, updateData);
        if (!report) {
          return NextResponse.json({ error: "Report not found" }, { status: 404 });
        }

        return NextResponse.json({ report });
      }

      case "delete": {
        const { reportId } = data;
        if (!reportId) {
          return NextResponse.json({ error: "Report ID required" }, { status: 400 });
        }

        const deleted = await deleteReport(reportId, session.user.id);
        if (!deleted) {
          return NextResponse.json({ error: "Report not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
      }

      case "duplicate": {
        const { reportId, newName } = data;
        if (!reportId) {
          return NextResponse.json({ error: "Report ID required" }, { status: 400 });
        }

        const report = await duplicateReport(reportId, session.user.id, newName);
        if (!report) {
          return NextResponse.json({ error: "Report not found" }, { status: 404 });
        }

        return NextResponse.json({ report });
      }

      case "add-widget": {
        const { reportId, widget } = data;
        if (!reportId || !widget) {
          return NextResponse.json({ error: "Report ID and widget required" }, { status: 400 });
        }

        const report = await addWidget(reportId, session.user.id, widget);
        if (!report) {
          return NextResponse.json({ error: "Report not found" }, { status: 404 });
        }

        return NextResponse.json({ report });
      }

      case "remove-widget": {
        const { reportId, widgetId } = data;
        if (!reportId || !widgetId) {
          return NextResponse.json({ error: "Report ID and widget ID required" }, { status: 400 });
        }

        const report = await removeWidget(reportId, session.user.id, widgetId);
        if (!report) {
          return NextResponse.json({ error: "Report not found" }, { status: 404 });
        }

        return NextResponse.json({ report });
      }

      case "reorder-widgets": {
        const { reportId, widgetOrder } = data;
        if (!reportId || !widgetOrder) {
          return NextResponse.json({ error: "Report ID and widget order required" }, { status: 400 });
        }

        const report = await reorderWidgets(reportId, session.user.id, widgetOrder);
        if (!report) {
          return NextResponse.json({ error: "Report not found" }, { status: 404 });
        }

        return NextResponse.json({ report });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Custom Reports POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process request" },
      { status: 500 }
    );
  }
}
