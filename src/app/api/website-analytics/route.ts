import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  trackPageView,
  getWebsiteAnalytics,
  getTrafficSources,
  getSocialTrafficBreakdown,
  getTrackedDomains,
  generateTrackingCode,
} from "@/lib/website-analytics";

// GET /api/website-analytics - Get analytics data
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get("domain");
    const action = searchParams.get("action");

    // Get list of tracked domains
    if (action === "domains") {
      const domains = await getTrackedDomains(session.user.id);
      return NextResponse.json({ domains });
    }

    // Get tracking code
    if (action === "tracking-code") {
      if (!domain) {
        return NextResponse.json({ error: "Domain required" }, { status: 400 });
      }
      const code = generateTrackingCode(session.user.id, domain);
      return NextResponse.json({ code, domain });
    }

    // Get traffic sources breakdown
    if (action === "traffic-sources") {
      if (!domain) {
        return NextResponse.json({ error: "Domain required" }, { status: 400 });
      }

      const startDate = searchParams.get("startDate");
      const endDate = searchParams.get("endDate");
      const dateRange = startDate && endDate
        ? { startDate: new Date(startDate), endDate: new Date(endDate) }
        : undefined;

      const sources = await getTrafficSources(session.user.id, domain, dateRange);
      return NextResponse.json(sources);
    }

    // Get social traffic breakdown
    if (action === "social-breakdown") {
      if (!domain) {
        return NextResponse.json({ error: "Domain required" }, { status: 400 });
      }

      const startDate = searchParams.get("startDate");
      const endDate = searchParams.get("endDate");
      const dateRange = startDate && endDate
        ? { startDate: new Date(startDate), endDate: new Date(endDate) }
        : undefined;

      const breakdown = await getSocialTrafficBreakdown(session.user.id, domain, dateRange);
      return NextResponse.json(breakdown);
    }

    // Get full analytics for domain
    if (!domain) {
      return NextResponse.json({ error: "Domain required" }, { status: 400 });
    }

    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const dateRange = startDate && endDate
      ? { startDate: new Date(startDate), endDate: new Date(endDate) }
      : undefined;

    const analytics = await getWebsiteAnalytics(session.user.id, domain, dateRange);
    return NextResponse.json(analytics);
  } catch (error) {
    console.error("Website analytics GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}

// POST /api/website-analytics - Record page view (tracking pixel endpoint)
export async function POST(request: NextRequest) {
  try {
    // Allow both JSON and beacon data
    let body;
    const contentType = request.headers.get("content-type");

    if (contentType?.includes("application/json")) {
      body = await request.json();
    } else {
      // Handle beacon data (text/plain)
      const text = await request.text();
      try {
        body = JSON.parse(text);
      } catch {
        return NextResponse.json({ error: "Invalid data" }, { status: 400 });
      }
    }

    const { userId, domain, path, referrer, sessionId, sessionDuration, bounced, update } = body;

    if (!userId || !domain || !path) {
      return NextResponse.json(
        { error: "userId, domain, and path are required" },
        { status: 400 }
      );
    }

    // Track the page view
    await trackPageView(userId, {
      domain,
      path,
      referrer,
      sessionId,
      sessionDuration: sessionDuration ? parseInt(sessionDuration, 10) : undefined,
      bounced: bounced !== undefined ? Boolean(bounced) : undefined,
    });

    // Return a 1x1 transparent GIF for tracking pixel support
    if (request.headers.get("accept")?.includes("image")) {
      const gif = Buffer.from(
        "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
        "base64"
      );
      return new NextResponse(gif, {
        headers: {
          "Content-Type": "image/gif",
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Website analytics POST error:", error);
    // Still return success for tracking to avoid breaking user experience
    return NextResponse.json({ success: true });
  }
}

// OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}
