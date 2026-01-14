import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  generateHooks,
  improveHook,
  getHookTemplates,
  analyzeHook,
  HookType,
} from "@/lib/hook-generator";
import { hasFeatureAccess } from "@/lib/subscription";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check feature access
    const hasAccess = await hasFeatureAccess(session.user.id, "AI Content Generation");
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Hook Generator requires Creator plan or higher" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, topic, tone, hookTypes, count, includeFullPost, hook, niche, post } = body;

    // Get user's voice profile for personalization
    const voiceProfile = await prisma.voiceProfile.findUnique({
      where: { userId: session.user.id },
      select: { styleAnalysis: true, commonPhrases: true },
    });

    switch (action) {
      case "generate": {
        if (!topic) {
          return NextResponse.json({ error: "Topic is required" }, { status: 400 });
        }

        const hooks = await generateHooks({
          topic,
          tone: tone || "professional",
          hookTypes: hookTypes as HookType[],
          count: count || 5,
          includeFullPost: includeFullPost || false,
          voiceProfile,
        });

        return NextResponse.json({ hooks });
      }

      case "improve": {
        if (!hook) {
          return NextResponse.json({ error: "Hook is required" }, { status: 400 });
        }

        const result = await improveHook(hook, body.feedback);
        return NextResponse.json(result);
      }

      case "templates": {
        if (!niche) {
          return NextResponse.json({ error: "Niche is required" }, { status: 400 });
        }

        const templates = await getHookTemplates(niche);
        return NextResponse.json(templates);
      }

      case "analyze": {
        if (!post) {
          return NextResponse.json({ error: "Post is required" }, { status: 400 });
        }

        const analysis = await analyzeHook(post);
        return NextResponse.json(analysis);
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Hook generator error:", error);
    return NextResponse.json(
      { error: "Failed to process hook request" },
      { status: 500 }
    );
  }
}
