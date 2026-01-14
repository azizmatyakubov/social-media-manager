import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createTestimonial,
  getUserTestimonials,
  getTestimonial,
  updateTestimonial,
  deleteTestimonial,
  featureTestimonial,
  approveTestimonial,
  rejectTestimonial,
  createWidget,
  getUserWidgets,
  getWidget,
  updateWidget,
  deleteWidget,
  createRequest,
  getUserRequests,
  sendRequest,
  completeRequest,
  importFromTwitter,
  importFromReview,
  getSocialProofStats,
  REQUEST_TEMPLATES,
  WIDGET_TYPES,
  TESTIMONIAL_SOURCES,
} from "@/lib/testimonials";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    switch (action) {
      case "testimonials": {
        const status = searchParams.get("status");
        const source = searchParams.get("source");
        const minRating = searchParams.get("minRating");
        const featured = searchParams.get("featured") === "true";

        const testimonials = getUserTestimonials(session.user.id, {
          status: status || undefined,
          source: source || undefined,
          minRating: minRating ? parseInt(minRating) : undefined,
          featured: featured || undefined,
        });

        return NextResponse.json({ testimonials });
      }

      case "testimonial": {
        const testimonialId = searchParams.get("testimonialId");
        if (!testimonialId) {
          return NextResponse.json({ error: "Testimonial ID required" }, { status: 400 });
        }

        const testimonial = getTestimonial(testimonialId, session.user.id);
        if (!testimonial) {
          return NextResponse.json({ error: "Testimonial not found" }, { status: 404 });
        }

        return NextResponse.json({ testimonial });
      }

      case "widgets": {
        const widgets = getUserWidgets(session.user.id);
        return NextResponse.json({ widgets });
      }

      case "widget": {
        const widgetId = searchParams.get("widgetId");
        if (!widgetId) {
          return NextResponse.json({ error: "Widget ID required" }, { status: 400 });
        }

        const widget = getWidget(widgetId, session.user.id);
        if (!widget) {
          return NextResponse.json({ error: "Widget not found" }, { status: 404 });
        }

        return NextResponse.json({ widget });
      }

      case "requests": {
        const requests = getUserRequests(session.user.id);
        return NextResponse.json({ requests });
      }

      case "stats": {
        const stats = getSocialProofStats(session.user.id);
        return NextResponse.json({ stats });
      }

      case "templates": {
        return NextResponse.json({ templates: REQUEST_TEMPLATES });
      }

      case "widget-types": {
        return NextResponse.json({ widgetTypes: WIDGET_TYPES });
      }

      case "sources": {
        return NextResponse.json({ sources: TESTIMONIAL_SOURCES });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Testimonials GET error:", error);
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
        const { source, type, content, author, metadata, displaySettings } = data;

        if (!source || !type || !content?.text) {
          return NextResponse.json(
            { error: "Source, type, and content text required" },
            { status: 400 }
          );
        }

        const testimonial = createTestimonial(session.user.id, {
          source,
          type,
          content,
          author: author || { name: "Anonymous" },
          metadata: {
            tags: metadata?.tags || [],
            sentiment: metadata?.sentiment || "positive",
            language: metadata?.language || "en",
            date: metadata?.date ? new Date(metadata.date) : new Date(),
            productOrService: metadata?.productOrService,
            campaign: metadata?.campaign,
          },
          status: "pending",
          displaySettings: displaySettings || {
            showAvatar: true,
            showCompany: true,
            showDate: true,
            showRating: true,
            showSource: true,
          },
        });

        return NextResponse.json({ testimonial });
      }

      case "update": {
        const { testimonialId, ...updates } = data;

        if (!testimonialId) {
          return NextResponse.json({ error: "Testimonial ID required" }, { status: 400 });
        }

        const testimonial = updateTestimonial(testimonialId, session.user.id, updates);
        if (!testimonial) {
          return NextResponse.json({ error: "Testimonial not found" }, { status: 404 });
        }

        return NextResponse.json({ testimonial });
      }

      case "delete": {
        const { testimonialId } = data;

        if (!testimonialId) {
          return NextResponse.json({ error: "Testimonial ID required" }, { status: 400 });
        }

        const deleted = deleteTestimonial(testimonialId, session.user.id);
        if (!deleted) {
          return NextResponse.json({ error: "Testimonial not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
      }

      case "feature": {
        const { testimonialId } = data;

        if (!testimonialId) {
          return NextResponse.json({ error: "Testimonial ID required" }, { status: 400 });
        }

        const testimonial = featureTestimonial(testimonialId, session.user.id);
        if (!testimonial) {
          return NextResponse.json({ error: "Testimonial not found" }, { status: 404 });
        }

        return NextResponse.json({ testimonial });
      }

      case "approve": {
        const { testimonialId } = data;

        if (!testimonialId) {
          return NextResponse.json({ error: "Testimonial ID required" }, { status: 400 });
        }

        const testimonial = approveTestimonial(testimonialId, session.user.id);
        if (!testimonial) {
          return NextResponse.json({ error: "Testimonial not found" }, { status: 404 });
        }

        return NextResponse.json({ testimonial });
      }

      case "reject": {
        const { testimonialId } = data;

        if (!testimonialId) {
          return NextResponse.json({ error: "Testimonial ID required" }, { status: 400 });
        }

        const testimonial = rejectTestimonial(testimonialId, session.user.id);
        if (!testimonial) {
          return NextResponse.json({ error: "Testimonial not found" }, { status: 404 });
        }

        return NextResponse.json({ testimonial });
      }

      case "import-twitter": {
        const { tweetUrl } = data;

        if (!tweetUrl) {
          return NextResponse.json({ error: "Tweet URL required" }, { status: 400 });
        }

        const testimonial = await importFromTwitter(session.user.id, tweetUrl);
        if (!testimonial) {
          return NextResponse.json({ error: "Failed to import tweet" }, { status: 500 });
        }

        return NextResponse.json({ testimonial });
      }

      case "import-review": {
        const { source, text, rating, authorName, date } = data;

        if (!source || !text || !rating || !authorName) {
          return NextResponse.json(
            { error: "Source, text, rating, and author name required" },
            { status: 400 }
          );
        }

        const testimonial = await importFromReview(session.user.id, source, {
          text,
          rating,
          authorName,
          date: date ? new Date(date) : new Date(),
        });

        return NextResponse.json({ testimonial });
      }

      case "create-widget": {
        const { name, type, theme, layout, filters } = data;

        if (!name || !type) {
          return NextResponse.json(
            { error: "Name and type required" },
            { status: 400 }
          );
        }

        const widget = createWidget(session.user.id, {
          name,
          type,
          theme: theme || {
            backgroundColor: "#ffffff",
            textColor: "#1f2937",
            accentColor: "#6366f1",
            borderRadius: 12,
            fontFamily: "Inter",
            darkMode: false,
          },
          layout: layout || {
            columns: 3,
            gap: 16,
            maxItems: 9,
            autoRotate: true,
            rotationSpeed: 5,
          },
          filters: filters || {
            minRating: 4,
            sources: [],
            tags: [],
            featured: false,
          },
        });

        return NextResponse.json({ widget });
      }

      case "update-widget": {
        const { widgetId, ...updates } = data;

        if (!widgetId) {
          return NextResponse.json({ error: "Widget ID required" }, { status: 400 });
        }

        const widget = updateWidget(widgetId, session.user.id, updates);
        if (!widget) {
          return NextResponse.json({ error: "Widget not found" }, { status: 404 });
        }

        return NextResponse.json({ widget });
      }

      case "delete-widget": {
        const { widgetId } = data;

        if (!widgetId) {
          return NextResponse.json({ error: "Widget ID required" }, { status: 400 });
        }

        const deleted = deleteWidget(widgetId, session.user.id);
        if (!deleted) {
          return NextResponse.json({ error: "Widget not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
      }

      case "create-request": {
        const { recipientEmail, recipientName, template, customMessage, productOrService, incentive, expiresAt } = data;

        if (!recipientEmail || !recipientName || !template) {
          return NextResponse.json(
            { error: "Recipient email, name, and template required" },
            { status: 400 }
          );
        }

        const request = createRequest(session.user.id, {
          recipientEmail,
          recipientName,
          template,
          customMessage,
          productOrService,
          incentive,
          expiresAt: expiresAt ? new Date(expiresAt) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });

        return NextResponse.json({ request });
      }

      case "send-request": {
        const { requestId } = data;

        if (!requestId) {
          return NextResponse.json({ error: "Request ID required" }, { status: 400 });
        }

        const request = sendRequest(requestId, session.user.id);
        if (!request) {
          return NextResponse.json({ error: "Request not found" }, { status: 404 });
        }

        return NextResponse.json({ request });
      }

      case "bulk-status": {
        const { testimonialIds, status } = data;

        if (!testimonialIds || testimonialIds.length === 0 || !status) {
          return NextResponse.json(
            { error: "Testimonial IDs and status required" },
            { status: 400 }
          );
        }

        const updated: string[] = [];
        for (const id of testimonialIds) {
          const result = updateTestimonial(id, session.user.id, { status });
          if (result) updated.push(id);
        }

        return NextResponse.json({ updated });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Testimonials POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process request" },
      { status: 500 }
    );
  }
}
