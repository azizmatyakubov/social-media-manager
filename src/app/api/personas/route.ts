import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getUserPersonas,
  getPersona,
  createPersona,
  updatePersona,
  deletePersona,
  duplicatePersona,
  createFromTemplate,
  getPersonaInsights,
  addInsight,
  deleteInsight,
  getPersonaStats,
  PERSONA_TEMPLATES,
  GENDERS,
  FORMALITY_LEVELS,
  BRAND_LOYALTY_LEVELS,
  DECISION_MAKING_STYLES,
  PERSONA_STATUSES,
  INSIGHT_TYPES,
} from "@/lib/audience-personas";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    switch (action) {
      case "personas": {
        const personas = getUserPersonas(session.user.id);
        return NextResponse.json({ personas });
      }

      case "persona": {
        const personaId = searchParams.get("personaId");
        if (!personaId) {
          return NextResponse.json({ error: "Persona ID required" }, { status: 400 });
        }
        const persona = getPersona(personaId);
        if (!persona) {
          return NextResponse.json({ error: "Persona not found" }, { status: 404 });
        }
        return NextResponse.json({ persona });
      }

      case "insights": {
        const personaId = searchParams.get("personaId");
        if (!personaId) {
          return NextResponse.json({ error: "Persona ID required" }, { status: 400 });
        }
        const insights = getPersonaInsights(personaId);
        return NextResponse.json({ insights });
      }

      case "templates": {
        return NextResponse.json({ templates: PERSONA_TEMPLATES });
      }

      case "stats": {
        const stats = getPersonaStats(session.user.id);
        return NextResponse.json({ stats });
      }

      case "constants": {
        return NextResponse.json({
          genders: GENDERS,
          formalityLevels: FORMALITY_LEVELS,
          brandLoyaltyLevels: BRAND_LOYALTY_LEVELS,
          decisionMakingStyles: DECISION_MAKING_STYLES,
          statuses: PERSONA_STATUSES,
          insightTypes: INSIGHT_TYPES,
          platforms: ["instagram", "twitter", "facebook", "linkedin", "tiktok", "youtube", "pinterest"],
        });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Personas GET error:", error);
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
      case "create": {
        const {
          name,
          description,
          avatar,
          demographics,
          psychographics,
          behaviors,
          platforms,
          painPoints,
          goals,
          contentPreferences,
          purchaseJourney,
          communicationStyle,
          status,
        } = data;
        if (!name) {
          return NextResponse.json({ error: "Name required" }, { status: 400 });
        }
        const persona = createPersona(session.user.id, {
          name,
          description: description || "",
          avatar,
          demographics: demographics || {
            ageRange: { min: 18, max: 65 },
            gender: "all",
            locations: [],
            languages: ["English"],
            education: [],
            occupation: [],
            incomeRange: { min: 0, max: 0, currency: "USD" },
          },
          psychographics: psychographics || {
            values: [],
            interests: [],
            lifestyle: [],
            personality: [],
            motivations: [],
            fears: [],
          },
          behaviors: behaviors || {
            onlineActivity: [],
            purchaseFrequency: "monthly",
            brandLoyalty: "medium",
            decisionMaking: "considered",
            influencers: [],
            mediaConsumption: [],
          },
          platforms: platforms || [],
          painPoints: painPoints || [],
          goals: goals || [],
          contentPreferences: contentPreferences || {
            formats: [],
            topics: [],
            tonePreference: [],
            bestTimes: [],
            engagementTriggers: [],
          },
          purchaseJourney: purchaseJourney || {
            awareness: [],
            consideration: [],
            decision: [],
            retention: [],
          },
          communicationStyle: communicationStyle || {
            formality: "semi-formal",
            emotionalAppeal: [],
            keyMessages: [],
            avoidTopics: [],
          },
          status: status || "draft",
        });
        return NextResponse.json({ persona });
      }

      case "create-from-template": {
        const { templateId } = data;
        if (!templateId) {
          return NextResponse.json({ error: "Template ID required" }, { status: 400 });
        }
        const persona = createFromTemplate(session.user.id, templateId);
        if (!persona) {
          return NextResponse.json({ error: "Template not found" }, { status: 404 });
        }
        return NextResponse.json({ persona });
      }

      case "update": {
        const { personaId, ...updates } = data;
        if (!personaId) {
          return NextResponse.json({ error: "Persona ID required" }, { status: 400 });
        }
        const persona = updatePersona(personaId, session.user.id, updates);
        if (!persona) {
          return NextResponse.json(
            { error: "Persona not found or unauthorized" },
            { status: 404 }
          );
        }
        return NextResponse.json({ persona });
      }

      case "delete": {
        const { personaId } = data;
        if (!personaId) {
          return NextResponse.json({ error: "Persona ID required" }, { status: 400 });
        }
        const success = deletePersona(personaId, session.user.id);
        if (!success) {
          return NextResponse.json(
            { error: "Persona not found or unauthorized" },
            { status: 404 }
          );
        }
        return NextResponse.json({ success: true });
      }

      case "duplicate": {
        const { personaId } = data;
        if (!personaId) {
          return NextResponse.json({ error: "Persona ID required" }, { status: 400 });
        }
        const persona = duplicatePersona(personaId, session.user.id);
        if (!persona) {
          return NextResponse.json(
            { error: "Persona not found or unauthorized" },
            { status: 404 }
          );
        }
        return NextResponse.json({ persona });
      }

      case "add-insight": {
        const { personaId, type, content, source, actionable } = data;
        if (!personaId || !type || !content) {
          return NextResponse.json(
            { error: "Persona ID, type, and content required" },
            { status: 400 }
          );
        }
        const insight = addInsight(personaId, {
          type,
          content,
          source,
          actionable: actionable || false,
        });
        if (!insight) {
          return NextResponse.json({ error: "Persona not found" }, { status: 404 });
        }
        return NextResponse.json({ insight });
      }

      case "delete-insight": {
        const { insightId } = data;
        if (!insightId) {
          return NextResponse.json({ error: "Insight ID required" }, { status: 400 });
        }
        const success = deleteInsight(insightId);
        if (!success) {
          return NextResponse.json({ error: "Insight not found" }, { status: 404 });
        }
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Personas POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process request" },
      { status: 500 }
    );
  }
}
