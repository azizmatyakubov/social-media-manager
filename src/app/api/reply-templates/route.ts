import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createReplyTemplate,
  updateReplyTemplate,
  deleteReplyTemplate,
  getReplyTemplates,
  getTemplateByShortcut,
  useTemplate,
  toggleFavorite,
  getTemplateCategories,
  applyVariables,
  templateSuggestions,
  createDefaultTemplates,
} from "@/lib/reply-templates";
import { Platform } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (action === "categories") {
      const categories = await getTemplateCategories(session.user.id);
      return NextResponse.json(categories);
    }

    if (action === "suggestions") {
      return NextResponse.json(templateSuggestions);
    }

    if (action === "by-shortcut") {
      const shortcut = searchParams.get("shortcut");
      if (!shortcut) {
        return NextResponse.json({ error: "Shortcut required" }, { status: 400 });
      }
      const template = await getTemplateByShortcut(session.user.id, shortcut);
      return NextResponse.json(template);
    }

    if (action === "create-defaults") {
      const templates = await createDefaultTemplates(session.user.id);
      return NextResponse.json(templates);
    }

    // Get templates with optional filters
    const category = searchParams.get("category") || undefined;
    const platform = searchParams.get("platform") as Platform | undefined;
    const favoritesOnly = searchParams.get("favorites") === "true";
    const search = searchParams.get("search") || undefined;
    const limit = parseInt(searchParams.get("limit") || "100");

    const templates = await getReplyTemplates(session.user.id, {
      category,
      platform,
      favoritesOnly,
      search,
      limit,
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error("Reply templates error:", error);
    return NextResponse.json(
      { error: "Failed to fetch templates" },
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

    if (action === "use") {
      const { templateId } = body;
      if (!templateId) {
        return NextResponse.json({ error: "Template ID required" }, { status: 400 });
      }
      const template = await useTemplate(session.user.id, templateId);
      return NextResponse.json(template);
    }

    if (action === "toggle-favorite") {
      const { templateId } = body;
      if (!templateId) {
        return NextResponse.json({ error: "Template ID required" }, { status: 400 });
      }
      const template = await toggleFavorite(session.user.id, templateId);
      return NextResponse.json(template);
    }

    if (action === "apply-variables") {
      const { content, variables } = body;
      if (!content || !variables) {
        return NextResponse.json(
          { error: "Content and variables required" },
          { status: 400 }
        );
      }
      const result = applyVariables(content, variables);
      return NextResponse.json({ content: result });
    }

    // Create new template
    const { name, content, category, shortcut, tone, platform, variables } = body;

    if (!name || !content) {
      return NextResponse.json(
        { error: "Name and content are required" },
        { status: 400 }
      );
    }

    const template = await createReplyTemplate(session.user.id, {
      name,
      content,
      category,
      shortcut,
      tone,
      platform,
      variables,
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error("Reply templates error:", error);
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
    const { templateId, ...updateData } = body;

    if (!templateId) {
      return NextResponse.json({ error: "Template ID required" }, { status: 400 });
    }

    const template = await updateReplyTemplate(
      session.user.id,
      templateId,
      updateData
    );

    return NextResponse.json(template);
  } catch (error) {
    console.error("Reply templates error:", error);
    const message = error instanceof Error ? error.message : "Failed to update template";
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
    const templateId = searchParams.get("id");

    if (!templateId) {
      return NextResponse.json({ error: "Template ID required" }, { status: 400 });
    }

    await deleteReplyTemplate(session.user.id, templateId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reply templates error:", error);
    const message = error instanceof Error ? error.message : "Failed to delete template";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
