import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getUserIdeas,
  getIdea,
  generateNewIdeas,
  saveIdea,
  markIdeaUsed,
  rateIdea,
  deleteIdea,
  getUserSessions,
  getSession,
  getUserPillars,
  createPillar,
  updatePillar,
  deletePillar,
  getIdeaStats,
  IDEA_CATEGORIES,
  CONTENT_TONES,
  CONTENT_TYPES,
  NICHES,
} from "@/lib/idea-generator";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    switch (action) {
      case "ideas": {
        const saved = searchParams.get("saved");
        const used = searchParams.get("used");
        const ideas = getUserIdeas(session.user.id, {
          saved: saved ? saved === "true" : undefined,
          used: used ? used === "true" : undefined,
        });
        return NextResponse.json({ ideas });
      }

      case "idea": {
        const ideaId = searchParams.get("ideaId");
        if (!ideaId) {
          return NextResponse.json({ error: "Idea ID required" }, { status: 400 });
        }
        const idea = getIdea(ideaId);
        if (!idea) {
          return NextResponse.json({ error: "Idea not found" }, { status: 404 });
        }
        return NextResponse.json({ idea });
      }

      case "sessions": {
        const sessions = getUserSessions(session.user.id);
        return NextResponse.json({ sessions });
      }

      case "session": {
        const sessionId = searchParams.get("sessionId");
        if (!sessionId) {
          return NextResponse.json({ error: "Session ID required" }, { status: 400 });
        }
        const ideaSession = getSession(sessionId);
        if (!ideaSession) {
          return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }
        return NextResponse.json({ session: ideaSession });
      }

      case "pillars": {
        const pillars = getUserPillars(session.user.id);
        return NextResponse.json({ pillars });
      }

      case "stats": {
        const stats = getIdeaStats(session.user.id);
        return NextResponse.json({ stats });
      }

      case "constants": {
        return NextResponse.json({
          categories: IDEA_CATEGORIES,
          tones: CONTENT_TONES,
          contentTypes: CONTENT_TYPES,
          niches: NICHES,
          platforms: ["instagram", "twitter", "facebook", "linkedin", "tiktok", "youtube", "pinterest"],
        });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Ideas GET error:", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
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
        const { niche, platforms, contentTypes, tones, count, sessionName } = data;
        if (!niche || !platforms || platforms.length === 0) {
          return NextResponse.json(
            { error: "Niche and platforms required" },
            { status: 400 }
          );
        }

        const ideaSession = generateNewIdeas(session.user.id, {
          niche,
          platforms,
          contentTypes: contentTypes || ["post", "carousel"],
          tones: tones || ["professional"],
          count: count || 10,
          sessionName,
        });

        return NextResponse.json({ session: ideaSession });
      }

      case "save": {
        const { ideaId } = data;
        if (!ideaId) {
          return NextResponse.json({ error: "Idea ID required" }, { status: 400 });
        }
        const idea = saveIdea(ideaId, session.user.id);
        if (!idea) {
          return NextResponse.json(
            { error: "Idea not found or unauthorized" },
            { status: 404 }
          );
        }
        return NextResponse.json({ idea });
      }

      case "mark-used": {
        const { ideaId } = data;
        if (!ideaId) {
          return NextResponse.json({ error: "Idea ID required" }, { status: 400 });
        }
        const idea = markIdeaUsed(ideaId, session.user.id);
        if (!idea) {
          return NextResponse.json(
            { error: "Idea not found or unauthorized" },
            { status: 404 }
          );
        }
        return NextResponse.json({ idea });
      }

      case "rate": {
        const { ideaId, rating } = data;
        if (!ideaId || rating === undefined) {
          return NextResponse.json(
            { error: "Idea ID and rating required" },
            { status: 400 }
          );
        }
        const idea = rateIdea(ideaId, session.user.id, rating);
        if (!idea) {
          return NextResponse.json(
            { error: "Idea not found or unauthorized" },
            { status: 404 }
          );
        }
        return NextResponse.json({ idea });
      }

      case "delete": {
        const { ideaId } = data;
        if (!ideaId) {
          return NextResponse.json({ error: "Idea ID required" }, { status: 400 });
        }
        const success = deleteIdea(ideaId, session.user.id);
        if (!success) {
          return NextResponse.json(
            { error: "Idea not found or unauthorized" },
            { status: 404 }
          );
        }
        return NextResponse.json({ success: true });
      }

      case "create-pillar": {
        const { name, description, percentage, color, keywords, examples } = data;
        if (!name || percentage === undefined) {
          return NextResponse.json(
            { error: "Name and percentage required" },
            { status: 400 }
          );
        }
        const pillar = createPillar(session.user.id, {
          name,
          description: description || "",
          percentage,
          color: color || "#4F46E5",
          keywords: keywords || [],
          examples: examples || [],
        });
        return NextResponse.json({ pillar });
      }

      case "update-pillar": {
        const { pillarId, ...updates } = data;
        if (!pillarId) {
          return NextResponse.json({ error: "Pillar ID required" }, { status: 400 });
        }
        const pillar = updatePillar(pillarId, session.user.id, updates);
        if (!pillar) {
          return NextResponse.json(
            { error: "Pillar not found or unauthorized" },
            { status: 404 }
          );
        }
        return NextResponse.json({ pillar });
      }

      case "delete-pillar": {
        const { pillarId } = data;
        if (!pillarId) {
          return NextResponse.json({ error: "Pillar ID required" }, { status: 400 });
        }
        const success = deletePillar(pillarId, session.user.id);
        if (!success) {
          return NextResponse.json(
            { error: "Pillar not found or unauthorized" },
            { status: 404 }
          );
        }
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Ideas POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process request" },
      { status: 500 }
    );
  }
}
