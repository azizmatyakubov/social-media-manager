import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createReport,
  getReports,
  getReport,
  updateReport,
  deleteReport,
  generateReport,
  getReportData,
  scheduleReport,
  sendReportEmail,
} from "@/lib/brand-reports";
import { Platform, ReportType } from "@prisma/client";

// GET /api/reports - Get all reports or specific report data
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get("reportId");
    const action = searchParams.get("action");

    if (reportId) {
      // Get specific report
      const report = await getReport(reportId);

      if (!report || report.userId !== session.user.id) {
        return NextResponse.json({ error: "Report not found" }, { status: 404 });
      }

      if (action === "data") {
        // Get report data with date range
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");

        const dateRange = startDate && endDate
          ? { startDate: new Date(startDate), endDate: new Date(endDate) }
          : undefined;

        const data = await getReportData(reportId, dateRange);
        return NextResponse.json(data);
      }

      return NextResponse.json(report);
    }

    // Get all reports for user
    const reports = await getReports(session.user.id);
    return NextResponse.json(reports);
  } catch (error) {
    console.error("Reports GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 }
    );
  }
}

// POST /api/reports - Create new report or perform actions
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, reportId, ...data } = body;

    if (action === "generate") {
      // Generate report
      if (!reportId) {
        return NextResponse.json({ error: "Report ID required" }, { status: 400 });
      }

      const report = await getReport(reportId);
      if (!report || report.userId !== session.user.id) {
        return NextResponse.json({ error: "Report not found" }, { status: 404 });
      }

      const result = await generateReport(reportId);
      return NextResponse.json(result);
    }

    if (action === "schedule") {
      // Schedule report
      if (!reportId) {
        return NextResponse.json({ error: "Report ID required" }, { status: 400 });
      }

      const report = await getReport(reportId);
      if (!report || report.userId !== session.user.id) {
        return NextResponse.json({ error: "Report not found" }, { status: 404 });
      }

      const { day, time, emailRecipients } = data;
      if (!day || !time) {
        return NextResponse.json({ error: "Day and time required" }, { status: 400 });
      }

      const result = await scheduleReport(reportId, { day, time, emailRecipients });
      return NextResponse.json(result);
    }

    if (action === "send") {
      // Send report via email
      if (!reportId) {
        return NextResponse.json({ error: "Report ID required" }, { status: 400 });
      }

      const report = await getReport(reportId);
      if (!report || report.userId !== session.user.id) {
        return NextResponse.json({ error: "Report not found" }, { status: 404 });
      }

      const { recipients } = data;
      const result = await sendReportEmail(reportId, recipients);
      return NextResponse.json(result);
    }

    // Create new report
    const {
      name,
      reportType,
      platforms,
      logoUrl,
      companyName,
      primaryColor,
      secondaryColor,
      showWatermark,
      startDate,
      endDate,
      autoGenerate,
      scheduleDay,
      scheduleTime,
      emailRecipients,
    } = data;

    if (!name) {
      return NextResponse.json({ error: "Report name required" }, { status: 400 });
    }

    // Validate report type
    const validReportTypes: ReportType[] = ["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "CUSTOM"];
    if (reportType && !validReportTypes.includes(reportType)) {
      return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
    }

    // Validate platforms
    const validPlatforms: Platform[] = ["X", "LINKEDIN", "INSTAGRAM", "TIKTOK", "YOUTUBE", "PINTEREST", "BLUESKY", "THREADS"];
    if (platforms) {
      const invalidPlatforms = platforms.filter((p: string) => !validPlatforms.includes(p as Platform));
      if (invalidPlatforms.length > 0) {
        return NextResponse.json({ error: `Invalid platforms: ${invalidPlatforms.join(", ")}` }, { status: 400 });
      }
    }

    const report = await createReport(session.user.id, {
      name,
      reportType: reportType || "WEEKLY",
      platforms: platforms || ["X"],
      logoUrl,
      companyName,
      primaryColor,
      secondaryColor,
      showWatermark,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      autoGenerate,
      scheduleDay,
      scheduleTime,
      emailRecipients,
    });

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    console.error("Reports POST error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}

// PATCH /api/reports - Update report
export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { reportId, ...updates } = body;

    if (!reportId) {
      return NextResponse.json({ error: "Report ID required" }, { status: 400 });
    }

    const report = await getReport(reportId);
    if (!report || report.userId !== session.user.id) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Process date fields
    if (updates.startDate) {
      updates.startDate = new Date(updates.startDate);
    }
    if (updates.endDate) {
      updates.endDate = new Date(updates.endDate);
    }

    const updatedReport = await updateReport(reportId, updates);
    return NextResponse.json(updatedReport);
  } catch (error) {
    console.error("Reports PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update report" },
      { status: 500 }
    );
  }
}

// DELETE /api/reports - Delete report
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get("reportId");

    if (!reportId) {
      return NextResponse.json({ error: "Report ID required" }, { status: 400 });
    }

    const report = await getReport(reportId);
    if (!report || report.userId !== session.user.id) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    await deleteReport(reportId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reports DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete report" },
      { status: 500 }
    );
  }
}
