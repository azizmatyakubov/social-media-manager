import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getUserContentSources,
  getContentSource,
  createContentSource,
  deleteContentSource,
  getUserRemixProjects,
  getRemixProject,
  createRemixProject,
  updateRemixProject,
  addSourceToProject,
  removeSourceFromProject,
  setProjectTemplate,
  deleteRemixProject,
  generateRemix,
  getProjectOutputs,
  getOutput,
  updateOutputStatus,
  deleteOutput,
  getRemixTemplates,
  getTemplate,
  getRemixStats,
  SOURCE_TYPES,
  OUTPUT_FORMATS,
  TEMPLATE_CATEGORIES,
} from "@/lib/content-remix";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    switch (action) {
      case "sources": {
        const sources = getUserContentSources(session.user.id);
        return NextResponse.json({ sources });
      }

      case "source": {
        const sourceId = searchParams.get("sourceId");
        if (!sourceId) {
          return NextResponse.json({ error: "Source ID required" }, { status: 400 });
        }
        const source = getContentSource(sourceId);
        if (!source) {
          return NextResponse.json({ error: "Source not found" }, { status: 404 });
        }
        return NextResponse.json({ source });
      }

      case "projects": {
        const projects = getUserRemixProjects(session.user.id);
        return NextResponse.json({ projects });
      }

      case "project": {
        const projectId = searchParams.get("projectId");
        if (!projectId) {
          return NextResponse.json({ error: "Project ID required" }, { status: 400 });
        }
        const project = getRemixProject(projectId);
        if (!project) {
          return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }
        return NextResponse.json({ project });
      }

      case "outputs": {
        const projectId = searchParams.get("projectId");
        if (!projectId) {
          return NextResponse.json({ error: "Project ID required" }, { status: 400 });
        }
        const outputs = getProjectOutputs(projectId);
        return NextResponse.json({ outputs });
      }

      case "output": {
        const outputId = searchParams.get("outputId");
        if (!outputId) {
          return NextResponse.json({ error: "Output ID required" }, { status: 400 });
        }
        const output = getOutput(outputId);
        if (!output) {
          return NextResponse.json({ error: "Output not found" }, { status: 404 });
        }
        return NextResponse.json({ output });
      }

      case "templates": {
        const category = searchParams.get("category");
        const templates = getRemixTemplates(category as any || undefined);
        return NextResponse.json({ templates });
      }

      case "template": {
        const templateId = searchParams.get("templateId");
        if (!templateId) {
          return NextResponse.json({ error: "Template ID required" }, { status: 400 });
        }
        const template = getTemplate(templateId);
        if (!template) {
          return NextResponse.json({ error: "Template not found" }, { status: 404 });
        }
        return NextResponse.json({ template });
      }

      case "stats": {
        const stats = getRemixStats(session.user.id);
        return NextResponse.json({ stats });
      }

      case "source-types": {
        return NextResponse.json({ sourceTypes: SOURCE_TYPES });
      }

      case "output-formats": {
        return NextResponse.json({ outputFormats: OUTPUT_FORMATS });
      }

      case "template-categories": {
        return NextResponse.json({ templateCategories: TEMPLATE_CATEGORIES });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Content remix GET error:", error);
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
      case "create-source": {
        const { type, title, content, platform, metadata } = data;
        if (!type || !title || !content) {
          return NextResponse.json(
            { error: "Type, title, and content required" },
            { status: 400 }
          );
        }
        const source = createContentSource(session.user.id, {
          type,
          title,
          content,
          platform,
          metadata,
        });
        return NextResponse.json({ source });
      }

      case "delete-source": {
        const { sourceId } = data;
        if (!sourceId) {
          return NextResponse.json({ error: "Source ID required" }, { status: 400 });
        }
        const success = deleteContentSource(sourceId, session.user.id);
        if (!success) {
          return NextResponse.json({ error: "Source not found or unauthorized" }, { status: 404 });
        }
        return NextResponse.json({ success: true });
      }

      case "create-project": {
        const { name, sourceIds, templateId } = data;
        if (!name) {
          return NextResponse.json({ error: "Name required" }, { status: 400 });
        }
        const project = createRemixProject(session.user.id, {
          name,
          sourceIds: sourceIds || [],
          templateId,
        });
        return NextResponse.json({ project });
      }

      case "update-project": {
        const { projectId, ...updates } = data;
        if (!projectId) {
          return NextResponse.json({ error: "Project ID required" }, { status: 400 });
        }
        const project = updateRemixProject(projectId, session.user.id, updates);
        if (!project) {
          return NextResponse.json({ error: "Project not found or unauthorized" }, { status: 404 });
        }
        return NextResponse.json({ project });
      }

      case "add-source-to-project": {
        const { projectId, sourceId } = data;
        if (!projectId || !sourceId) {
          return NextResponse.json(
            { error: "Project ID and source ID required" },
            { status: 400 }
          );
        }
        const project = addSourceToProject(projectId, session.user.id, sourceId);
        if (!project) {
          return NextResponse.json({ error: "Project or source not found" }, { status: 404 });
        }
        return NextResponse.json({ project });
      }

      case "remove-source-from-project": {
        const { projectId, sourceId } = data;
        if (!projectId || !sourceId) {
          return NextResponse.json(
            { error: "Project ID and source ID required" },
            { status: 400 }
          );
        }
        const project = removeSourceFromProject(projectId, session.user.id, sourceId);
        if (!project) {
          return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }
        return NextResponse.json({ project });
      }

      case "set-template": {
        const { projectId, templateId } = data;
        if (!projectId || !templateId) {
          return NextResponse.json(
            { error: "Project ID and template ID required" },
            { status: 400 }
          );
        }
        const project = setProjectTemplate(projectId, session.user.id, templateId);
        if (!project) {
          return NextResponse.json({ error: "Project or template not found" }, { status: 404 });
        }
        return NextResponse.json({ project });
      }

      case "delete-project": {
        const { projectId } = data;
        if (!projectId) {
          return NextResponse.json({ error: "Project ID required" }, { status: 400 });
        }
        const success = deleteRemixProject(projectId, session.user.id);
        if (!success) {
          return NextResponse.json({ error: "Project not found or unauthorized" }, { status: 404 });
        }
        return NextResponse.json({ success: true });
      }

      case "generate-remix": {
        const { projectId, format, variationCount, mashupConfig } = data;
        if (!projectId) {
          return NextResponse.json({ error: "Project ID required" }, { status: 400 });
        }
        const output = await generateRemix(projectId, session.user.id, {
          format,
          variationCount,
          mashupConfig,
        });
        if (!output) {
          return NextResponse.json(
            { error: "Failed to generate remix - check project has sources" },
            { status: 400 }
          );
        }
        return NextResponse.json({ output });
      }

      case "update-output-status": {
        const { outputId, status } = data;
        if (!outputId || !status) {
          return NextResponse.json(
            { error: "Output ID and status required" },
            { status: 400 }
          );
        }
        const output = updateOutputStatus(outputId, status);
        if (!output) {
          return NextResponse.json({ error: "Output not found" }, { status: 404 });
        }
        return NextResponse.json({ output });
      }

      case "delete-output": {
        const { outputId } = data;
        if (!outputId) {
          return NextResponse.json({ error: "Output ID required" }, { status: 400 });
        }
        const success = deleteOutput(outputId);
        if (!success) {
          return NextResponse.json({ error: "Output not found" }, { status: 404 });
        }
        return NextResponse.json({ success: true });
      }

      case "quick-remix": {
        // Quick remix without creating a project
        const { content, title, type, templateId, outputFormat } = data;
        if (!content) {
          return NextResponse.json({ error: "Content required" }, { status: 400 });
        }

        // Create temporary source
        const source = createContentSource(session.user.id, {
          type: type || "text",
          title: title || "Quick Remix",
          content,
        });

        // Create temporary project
        const project = createRemixProject(session.user.id, {
          name: "Quick Remix",
          sourceIds: [source.id],
          templateId,
        });

        // Generate remix
        const output = await generateRemix(project.id, session.user.id, {
          format: outputFormat,
        });

        return NextResponse.json({ output, project });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Content remix POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process request" },
      { status: 500 }
    );
  }
}
