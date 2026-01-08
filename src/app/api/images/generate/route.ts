import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  generateImage,
  generateImageForPost,
  generateVariations,
  getUserGeneratedImages,
  suggestImagePrompts,
  generateWithPreset,
  IMAGE_STYLE_PRESETS,
} from "@/lib/image-generation";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    const images = await getUserGeneratedImages(session.user.id, { limit, offset });
    return NextResponse.json(images);
  } catch (error) {
    console.error("Images fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch generated images" },
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

    if (action === "generate") {
      const { prompt, size, style, quality } = body;

      if (!prompt) {
        return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
      }

      const image = await generateImage(session.user.id, {
        prompt,
        size,
        style,
        quality,
      });

      return NextResponse.json(image);
    }

    if (action === "generate-for-post") {
      const { postContent, style } = body;

      if (!postContent) {
        return NextResponse.json({ error: "Post content is required" }, { status: 400 });
      }

      const image = await generateImageForPost(session.user.id, postContent, style);
      return NextResponse.json(image);
    }

    if (action === "generate-variations") {
      const { prompt, count } = body;

      if (!prompt) {
        return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
      }

      const images = await generateVariations(session.user.id, prompt, count);
      return NextResponse.json({ images });
    }

    if (action === "generate-with-preset") {
      const { prompt, preset } = body;

      if (!prompt || !preset) {
        return NextResponse.json({ error: "Prompt and preset are required" }, { status: 400 });
      }

      if (!(preset in IMAGE_STYLE_PRESETS)) {
        return NextResponse.json({ error: "Invalid preset" }, { status: 400 });
      }

      const image = await generateWithPreset(
        session.user.id,
        prompt,
        preset as keyof typeof IMAGE_STYLE_PRESETS
      );

      return NextResponse.json(image);
    }

    if (action === "suggest-prompts") {
      const { postContent } = body;

      if (!postContent) {
        return NextResponse.json({ error: "Post content is required" }, { status: 400 });
      }

      const suggestions = await suggestImagePrompts(postContent);
      return NextResponse.json({ suggestions });
    }

    if (action === "get-presets") {
      return NextResponse.json({ presets: Object.keys(IMAGE_STYLE_PRESETS) });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Image generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate image" },
      { status: 500 }
    );
  }
}
