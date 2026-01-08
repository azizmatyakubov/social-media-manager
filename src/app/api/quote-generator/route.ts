import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  generateQuoteImage,
  uploadToStorage,
  incrementTemplateUsage,
  getDefaultTemplates,
  AVAILABLE_FONTS,
  DEFAULT_TEMPLATES,
} from "@/lib/quote-generator";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Return available fonts and default templates for the UI
    const defaultTemplates = await getDefaultTemplates();

    return NextResponse.json({
      fonts: AVAILABLE_FONTS,
      defaultTemplates,
    });
  } catch (error) {
    console.error("Quote generator GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch quote generator data" },
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

    // Generate quote image
    if (action === "generate") {
      const { text, templateId, template, username, saveToStorage } = body;

      if (!text || typeof text !== "string" || text.trim().length === 0) {
        return NextResponse.json(
          { error: "Quote text is required" },
          { status: 400 }
        );
      }

      if (text.length > 500) {
        return NextResponse.json(
          { error: "Quote text must be 500 characters or less" },
          { status: 400 }
        );
      }

      const { svg, buffer } = await generateQuoteImage({
        text: text.trim(),
        templateId,
        template,
        username,
      });

      // Track template usage
      if (templateId) {
        await incrementTemplateUsage(templateId);
      }

      // Save to storage if requested
      let imageUrl: string | null = null;
      if (saveToStorage) {
        imageUrl = await uploadToStorage(buffer, "svg");
      }

      // Return SVG as data URL for preview
      const dataUrl = `data:image/svg+xml;base64,${buffer.toString("base64")}`;

      return NextResponse.json({
        svg,
        dataUrl,
        imageUrl,
      });
    }

    // Get preview (without saving)
    if (action === "preview") {
      const { text, templateId, template, username } = body;

      if (!text || typeof text !== "string" || text.trim().length === 0) {
        return NextResponse.json(
          { error: "Quote text is required" },
          { status: 400 }
        );
      }

      const { svg, buffer } = await generateQuoteImage({
        text: text.trim(),
        templateId,
        template,
        username,
      });

      const dataUrl = `data:image/svg+xml;base64,${buffer.toString("base64")}`;

      return NextResponse.json({
        dataUrl,
      });
    }

    // Download image
    if (action === "download") {
      const { text, templateId, template, username } = body;

      if (!text || typeof text !== "string" || text.trim().length === 0) {
        return NextResponse.json(
          { error: "Quote text is required" },
          { status: 400 }
        );
      }

      const { buffer } = await generateQuoteImage({
        text: text.trim(),
        templateId,
        template,
        username,
      });

      // Save and return URL
      const imageUrl = await uploadToStorage(buffer, "svg");

      // Track template usage
      if (templateId) {
        await incrementTemplateUsage(templateId);
      }

      return NextResponse.json({
        imageUrl,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Quote generator POST error:", error);
    return NextResponse.json(
      { error: "Failed to generate quote image" },
      { status: 500 }
    );
  }
}
