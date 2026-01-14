import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createPage,
  updatePage,
  deletePage,
  getUserPages,
  getPage,
  addLink,
  updateLink,
  deleteLink,
  reorderLinks,
  getPageAnalytics,
  isSlugAvailable,
  themePresets,
} from "@/lib/link-in-bio";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const pageId = searchParams.get("pageId");

    if (action === "themes") {
      return NextResponse.json(themePresets);
    }

    if (action === "check-slug") {
      const slug = searchParams.get("slug");
      if (!slug) {
        return NextResponse.json({ error: "Slug required" }, { status: 400 });
      }
      const available = await isSlugAvailable(slug, pageId || undefined);
      return NextResponse.json({ available });
    }

    if (action === "analytics" && pageId) {
      const analytics = await getPageAnalytics(session.user.id, pageId);
      return NextResponse.json(analytics);
    }

    if (pageId) {
      const page = await getPage(session.user.id, pageId);
      if (!page) {
        return NextResponse.json({ error: "Page not found" }, { status: 404 });
      }
      return NextResponse.json(page);
    }

    // Get all pages
    const pages = await getUserPages(session.user.id);
    return NextResponse.json(pages);
  } catch (error) {
    console.error("Link-in-bio error:", error);
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
    const { action } = body;

    // Add a link
    if (action === "add-link") {
      const { pageId, title, url, icon, thumbnail, position } = body;
      if (!pageId || !title || !url) {
        return NextResponse.json(
          { error: "Page ID, title, and URL are required" },
          { status: 400 }
        );
      }
      const link = await addLink(session.user.id, {
        pageId,
        title,
        url,
        icon,
        thumbnail,
        position,
      });
      return NextResponse.json(link);
    }

    // Reorder links
    if (action === "reorder-links") {
      const { pageId, linkIds } = body;
      if (!pageId || !linkIds || !Array.isArray(linkIds)) {
        return NextResponse.json(
          { error: "Page ID and link IDs array are required" },
          { status: 400 }
        );
      }
      const links = await reorderLinks(session.user.id, pageId, linkIds);
      return NextResponse.json(links);
    }

    // Create new page
    const { slug, title, bio, avatarUrl, theme, primaryColor, secondaryColor, backgroundColor, textColor, buttonStyle, fontFamily } = body;

    if (!slug || !title) {
      return NextResponse.json(
        { error: "Slug and title are required" },
        { status: 400 }
      );
    }

    const page = await createPage(session.user.id, {
      slug,
      title,
      bio,
      avatarUrl,
      theme,
      primaryColor,
      secondaryColor,
      backgroundColor,
      textColor,
      buttonStyle,
      fontFamily,
    });

    return NextResponse.json(page);
  } catch (error) {
    console.error("Link-in-bio error:", error);
    const message = error instanceof Error ? error.message : "Failed to process request";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, linkId, pageId, ...data } = body;

    // Update a link
    if (action === "update-link" && linkId) {
      const link = await updateLink(session.user.id, linkId, data);
      return NextResponse.json(link);
    }

    // Update page
    if (!pageId) {
      return NextResponse.json({ error: "Page ID required" }, { status: 400 });
    }

    const page = await updatePage(session.user.id, pageId, data);
    return NextResponse.json(page);
  } catch (error) {
    console.error("Link-in-bio error:", error);
    const message = error instanceof Error ? error.message : "Failed to update";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const pageId = searchParams.get("pageId");
    const linkId = searchParams.get("linkId");

    // Delete link
    if (linkId) {
      await deleteLink(session.user.id, linkId);
      return NextResponse.json({ success: true });
    }

    // Delete page
    if (!pageId) {
      return NextResponse.json({ error: "Page ID or Link ID required" }, { status: 400 });
    }

    await deletePage(session.user.id, pageId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Link-in-bio error:", error);
    const message = error instanceof Error ? error.message : "Failed to delete";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
