import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  generateCaption,
  generateCaptionBatch,
  improveCaption,
  generateHookVariations,
  generateHashtags,
  getPlatformTips,
  platformConfigs,
  type Platform,
  type CaptionTone,
  type ContentType,
} from "@/lib/ai-captions";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    switch (action) {
      case "platform-tips": {
        const platform = searchParams.get("platform") as Platform;
        if (!platform || !platformConfigs[platform]) {
          return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
        }
        const tips = getPlatformTips(platform);
        return NextResponse.json({ tips });
      }

      case "platform-config": {
        const platform = searchParams.get("platform") as Platform;
        if (platform && platformConfigs[platform]) {
          return NextResponse.json({ config: platformConfigs[platform] });
        }
        return NextResponse.json({ configs: platformConfigs });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("AI Captions GET error:", error);
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
      case "generate": {
        const {
          platform,
          topic,
          tone,
          contentType,
          keywords,
          imageDescription,
          productInfo,
          includeHashtags,
          includeEmojis,
          includeCallToAction,
          targetAudience,
          brandVoice,
          language,
        } = data;

        if (!platform || !topic || !tone) {
          return NextResponse.json(
            { error: "Platform, topic, and tone are required" },
            { status: 400 }
          );
        }

        if (!platformConfigs[platform as Platform]) {
          return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
        }

        const result = await generateCaption({
          platform: platform as Platform,
          topic,
          tone: tone as CaptionTone,
          contentType: (contentType || "text") as ContentType,
          keywords,
          imageDescription,
          productInfo,
          includeHashtags,
          includeEmojis,
          includeCallToAction,
          targetAudience,
          brandVoice,
          language,
        });

        return NextResponse.json({ result });
      }

      case "generate-batch": {
        const { platforms, topic, tone, contentType, ...rest } = data;

        if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
          return NextResponse.json({ error: "Platforms array required" }, { status: 400 });
        }

        if (!topic || !tone) {
          return NextResponse.json({ error: "Topic and tone required" }, { status: 400 });
        }

        const results = await generateCaptionBatch(
          {
            topic,
            tone: tone as CaptionTone,
            contentType: (contentType || "text") as ContentType,
            ...rest,
          },
          platforms as Platform[]
        );

        return NextResponse.json({ results });
      }

      case "improve": {
        const { caption, platform, improvements } = data;

        if (!caption || !platform || !improvements || !Array.isArray(improvements)) {
          return NextResponse.json(
            { error: "Caption, platform, and improvements array required" },
            { status: 400 }
          );
        }

        const result = await improveCaption(
          caption,
          platform as Platform,
          improvements
        );

        return NextResponse.json({ result });
      }

      case "generate-hooks": {
        const { topic, platform, count } = data;

        if (!topic || !platform) {
          return NextResponse.json({ error: "Topic and platform required" }, { status: 400 });
        }

        const result = await generateHookVariations(
          topic,
          platform as Platform,
          count || 5
        );

        return NextResponse.json({ result });
      }

      case "generate-hashtags": {
        const { topic, platform, count } = data;

        if (!topic || !platform) {
          return NextResponse.json({ error: "Topic and platform required" }, { status: 400 });
        }

        const result = await generateHashtags(
          topic,
          platform as Platform,
          count || 10
        );

        return NextResponse.json({ result });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("AI Captions POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate caption" },
      { status: 500 }
    );
  }
}
