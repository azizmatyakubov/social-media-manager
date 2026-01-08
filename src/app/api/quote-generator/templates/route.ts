import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getDefaultTemplates,
  QuoteTemplateData,
} from "@/lib/quote-generator";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeDefaults = searchParams.get("includeDefaults") !== "false";

    // Get user's custom templates
    const userTemplates = await getTemplates(session.user.id);

    // Get default templates
    const defaultTemplates = includeDefaults ? await getDefaultTemplates() : [];

    return NextResponse.json({
      templates: userTemplates,
      defaultTemplates,
    });
  } catch (error) {
    console.error("Templates GET error:", error);
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
    const {
      name,
      backgroundColor,
      backgroundImage,
      textColor,
      fontFamily,
      fontSize,
      padding,
      borderRadius,
      showLogo,
      logoUrl,
      showUsername,
      width,
      height,
    } = body;

    // Validate required fields
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Template name is required" },
        { status: 400 }
      );
    }

    const templateData: QuoteTemplateData = {
      name: name.trim(),
      backgroundColor: backgroundColor || "#1DA1F2",
      backgroundImage: backgroundImage || null,
      textColor: textColor || "#FFFFFF",
      fontFamily: fontFamily || "Inter",
      fontSize: fontSize || 32,
      padding: padding || 60,
      borderRadius: borderRadius || 0,
      showLogo: showLogo || false,
      logoUrl: logoUrl || null,
      showUsername: showUsername ?? true,
      width: width || 1200,
      height: height || 675,
    };

    const template = await createTemplate(session.user.id, templateData);

    return NextResponse.json(template);
  } catch (error) {
    console.error("Templates POST error:", error);
    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { templateId, ...updates } = body;

    if (!templateId) {
      return NextResponse.json(
        { error: "Template ID is required" },
        { status: 400 }
      );
    }

    // Verify ownership
    const { prisma } = await import("@/lib/prisma");
    const existingTemplate = await prisma.quoteTemplate.findUnique({
      where: { id: templateId },
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    if (existingTemplate.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Not authorized to update this template" },
        { status: 403 }
      );
    }

    // Filter out undefined values
    const validUpdates: Partial<QuoteTemplateData> = {};
    const allowedFields = [
      "name",
      "backgroundColor",
      "backgroundImage",
      "textColor",
      "fontFamily",
      "fontSize",
      "padding",
      "borderRadius",
      "showLogo",
      "logoUrl",
      "showUsername",
      "width",
      "height",
    ];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        (validUpdates as Record<string, unknown>)[field] = updates[field];
      }
    }

    const template = await updateTemplate(templateId, validUpdates);

    return NextResponse.json(template);
  } catch (error) {
    console.error("Templates PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update template" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get("templateId");

    if (!templateId) {
      return NextResponse.json(
        { error: "Template ID is required" },
        { status: 400 }
      );
    }

    // Verify ownership
    const { prisma } = await import("@/lib/prisma");
    const existingTemplate = await prisma.quoteTemplate.findUnique({
      where: { id: templateId },
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    if (existingTemplate.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Not authorized to delete this template" },
        { status: 403 }
      );
    }

    await deleteTemplate(templateId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Templates DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete template" },
      { status: 500 }
    );
  }
}
