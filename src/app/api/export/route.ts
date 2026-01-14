import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  exportPosts,
  exportAnalytics,
  exportAccountData,
  exportAllData,
  toCSV,
  toJSON,
  generateFilename,
  getDataSizeEstimate,
} from "@/lib/data-export";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    // Get data size estimate
    if (action === "estimate") {
      const estimate = await getDataSizeEstimate(session.user.id);
      return NextResponse.json(estimate);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Failed to process export request" },
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
    const { type, format, startDate, endDate } = body;

    if (!type || !format) {
      return NextResponse.json(
        { error: "Type and format are required" },
        { status: 400 }
      );
    }

    if (!["posts", "analytics", "account", "full"].includes(type)) {
      return NextResponse.json({ error: "Invalid export type" }, { status: 400 });
    }

    if (!["csv", "json"].includes(format)) {
      return NextResponse.json({ error: "Invalid format" }, { status: 400 });
    }

    const options = {
      format: format as "csv" | "json",
      dateRange:
        startDate && endDate
          ? {
              start: new Date(startDate),
              end: new Date(endDate),
            }
          : undefined,
    };

    let data: unknown;
    let filename: string;
    let content: string;
    let contentType: string;

    switch (type) {
      case "posts":
        data = await exportPosts(session.user.id, options);
        filename = generateFilename("posts", format);
        break;

      case "analytics":
        data = await exportAnalytics(session.user.id, options);
        filename = generateFilename("analytics", format);
        break;

      case "account":
        data = await exportAccountData(session.user.id);
        filename = generateFilename("account", format);
        break;

      case "full":
        data = await exportAllData(session.user.id, options);
        filename = generateFilename("full", format);
        break;

      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    // Convert to appropriate format
    if (format === "csv") {
      if (type === "full") {
        // For full export in CSV, we'll export posts only (main data)
        const fullData = data as { posts: Record<string, unknown>[] };
        content = toCSV(fullData.posts);
      } else if (type === "account") {
        // Account data is a single object, wrap in array
        content = toCSV([data as Record<string, unknown>]);
      } else {
        content = toCSV(data as Record<string, unknown>[]);
      }
      contentType = "text/csv";
    } else {
      content = toJSON(data);
      contentType = "application/json";
    }

    // Return the file
    return new NextResponse(content, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Failed to export data" },
      { status: 500 }
    );
  }
}
