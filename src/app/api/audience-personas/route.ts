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
  generatePersonaFromData,
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
        const category = searchParams.get("category");
        let templates = PERSONA_TEMPLATES;
        if (category) {
          templates = templates.filter((t) => t.category === category);
        }
        return NextResponse.json({ templates });
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
          personaStatuses: PERSONA_STATUSES,
          insightTypes: INSIGHT_TYPES,
        });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Audience personas GET error:", error);
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
        const persona = createPersona(session.user.id, data);
        return NextResponse.json({ persona });
      }

      case "update": {
        const { personaId, ...updates } = data;
        if (!personaId) {
          return NextResponse.json({ error: "Persona ID required" }, { status: 400 });
        }
        const persona = updatePersona(personaId, session.user.id, updates);
        if (!persona) {
          return NextResponse.json({ error: "Persona not found or unauthorized" }, { status: 404 });
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
          return NextResponse.json({ error: "Persona not found or unauthorized" }, { status: 404 });
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
          return NextResponse.json({ error: "Persona not found or unauthorized" }, { status: 404 });
        }
        return NextResponse.json({ persona });
      }

      case "generate": {
        const { businessType, targetAudience, industry, productDescription } = data;
        if (!businessType || !targetAudience || !industry) {
          return NextResponse.json(
            { error: "Business type, target audience, and industry required" },
            { status: 400 }
          );
        }
        const persona = await generatePersonaFromData(session.user.id, {
          businessType,
          targetAudience,
          industry,
          productDescription: productDescription || "",
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

      case "add-insight": {
        const { personaId, type, title, description, actionable, priority } = data;
        if (!personaId || !type || !title || !description) {
          return NextResponse.json(
            { error: "Persona ID, type, title, and description required" },
            { status: 400 }
          );
        }
        const insight = addInsight(personaId, {
          type,
          title,
          description,
          actionable: actionable || "",
          priority: priority || "medium",
        });
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

      case "archive": {
        const { personaId } = data;
        if (!personaId) {
          return NextResponse.json({ error: "Persona ID required" }, { status: 400 });
        }
        const persona = updatePersona(personaId, session.user.id, { status: "archived" });
        if (!persona) {
          return NextResponse.json({ error: "Persona not found or unauthorized" }, { status: 404 });
        }
        return NextResponse.json({ persona });
      }

      case "activate": {
        const { personaId } = data;
        if (!personaId) {
          return NextResponse.json({ error: "Persona ID required" }, { status: 400 });
        }
        const persona = updatePersona(personaId, session.user.id, { status: "active" });
        if (!persona) {
          return NextResponse.json({ error: "Persona not found or unauthorized" }, { status: 404 });
        }
        return NextResponse.json({ persona });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Audience personas POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process request" },
      { status: 500 }
    );
  }
}
