import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  parseCSV,
  transformCSVToPosts,
  createBulkPosts,
  generateSampleCSV,
  getBulkUploadStats,
  validatePosts,
} from "@/lib/bulk-scheduler";
import { Platform, PostStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    switch (action) {
      case "sample-csv": {
        const csv = generateSampleCSV();
        return new NextResponse(csv, {
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": 'attachment; filename="sample-posts.csv"',
          },
        });
      }

      case "stats": {
        const stats = await getBulkUploadStats(session.user.id);
        return NextResponse.json({ stats });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Bulk schedule GET error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
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
      case "parse": {
        const { csvContent } = data;
        if (!csvContent) {
          return NextResponse.json({ error: "CSV content required" }, { status: 400 });
        }

        try {
          const parsed = parseCSV(csvContent);
          return NextResponse.json({ parsed });
        } catch (err) {
          return NextResponse.json(
            { error: err instanceof Error ? err.message : "Failed to parse CSV" },
            { status: 400 }
          );
        }
      }

      case "preview": {
        const { rows, mapping, defaultPlatform } = data;

        if (!rows || !Array.isArray(rows)) {
          return NextResponse.json({ error: "Rows array required" }, { status: 400 });
        }

        if (!mapping || !mapping.content) {
          return NextResponse.json({ error: "Column mapping with content field required" }, { status: 400 });
        }

        const { posts, errors } = transformCSVToPosts(
          rows,
          mapping,
          defaultPlatform as Platform | undefined
        );

        // Validate posts
        const validation = validatePosts(posts);

        return NextResponse.json({
          posts,
          errors: [...errors, ...validation.errors.map((e) => ({ row: e.index + 2, error: e.error }))],
          warnings: validation.warnings.map((w) => ({ row: w.index + 2, warning: w.warning })),
          valid: validation.valid && errors.length === 0,
        });
      }

      case "upload": {
        const { posts, accountIds, defaultStatus } = data;

        if (!posts || !Array.isArray(posts) || posts.length === 0) {
          return NextResponse.json({ error: "Posts array required" }, { status: 400 });
        }

        // Validate before upload
        const validation = validatePosts(posts);
        if (!validation.valid) {
          return NextResponse.json({
            error: "Validation failed",
            errors: validation.errors,
          }, { status: 400 });
        }

        const result = await createBulkPosts(session.user.id, posts, {
          accountIds: accountIds as Record<Platform, string> | undefined,
          defaultStatus: (defaultStatus as PostStatus) || "DRAFT",
        });

        return NextResponse.json({ result });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Bulk schedule POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process request" },
      { status: 500 }
    );
  }
}
