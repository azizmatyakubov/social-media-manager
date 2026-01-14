import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  SUPPORTED_LANGUAGES,
  saveToTranslationMemory,
  getUserTranslationMemories,
  searchTranslationMemory,
  deleteTranslationMemory,
  createTranslationProject,
  getUserTranslationProjects,
  getTranslationProject,
  addContentToProject,
  updateContentTranslation,
  deleteTranslationProject,
  getProjectStats,
  getLanguageByCode,
} from "@/lib/translation";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    switch (action) {
      case "projects": {
        const projects = getUserTranslationProjects(session.user.id);
        return NextResponse.json({ projects });
      }

      case "project": {
        const projectId = searchParams.get("projectId");
        if (!projectId) {
          return NextResponse.json({ error: "Project ID required" }, { status: 400 });
        }
        const project = getTranslationProject(projectId, session.user.id);
        if (!project) {
          return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }
        const stats = getProjectStats(project);
        return NextResponse.json({ project, stats });
      }

      case "memories": {
        const memories = getUserTranslationMemories(session.user.id);
        return NextResponse.json({ memories });
      }

      case "search-memory": {
        const query = searchParams.get("query");
        const sourceLanguage = searchParams.get("sourceLanguage");
        const targetLanguage = searchParams.get("targetLanguage");
        if (!query) {
          return NextResponse.json({ error: "Query required" }, { status: 400 });
        }
        const results = searchTranslationMemory(
          session.user.id,
          query,
          sourceLanguage || undefined,
          targetLanguage || undefined
        );
        return NextResponse.json({ results });
      }

      case "languages": {
        return NextResponse.json({ languages: SUPPORTED_LANGUAGES });
      }

      case "language": {
        const code = searchParams.get("code");
        if (!code) {
          return NextResponse.json({ error: "Language code required" }, { status: 400 });
        }
        const language = getLanguageByCode(code);
        if (!language) {
          return NextResponse.json({ error: "Language not found" }, { status: 404 });
        }
        return NextResponse.json({ language });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Translation GET error:", error);
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
      case "create-project": {
        const { name, description, sourceLanguage, targetLanguages, platform, dueDate } = data;
        if (!name || !sourceLanguage || !targetLanguages || targetLanguages.length === 0) {
          return NextResponse.json(
            { error: "Name, source language, and target languages required" },
            { status: 400 }
          );
        }
        const project = createTranslationProject(session.user.id, {
          name,
          description: description || "",
          sourceLanguage,
          targetLanguages,
          platform,
          dueDate: dueDate ? new Date(dueDate) : undefined,
        });
        return NextResponse.json({ project });
      }

      case "add-content": {
        const { projectId, originalText, contentType, metadata } = data;
        if (!projectId || !originalText) {
          return NextResponse.json(
            { error: "Project ID and original text required" },
            { status: 400 }
          );
        }
        const project = addContentToProject(
          projectId,
          session.user.id,
          originalText,
          contentType,
          metadata
        );
        if (!project) {
          return NextResponse.json(
            { error: "Project not found or unauthorized" },
            { status: 404 }
          );
        }
        return NextResponse.json({ project });
      }

      case "update-translation": {
        const { projectId, contentId, languageCode, translatedText, status, reviewedBy } = data;
        if (!projectId || !contentId || !languageCode) {
          return NextResponse.json(
            { error: "Project ID, content ID, and language code required" },
            { status: 400 }
          );
        }
        const project = updateContentTranslation(
          projectId,
          session.user.id,
          contentId,
          languageCode,
          { translatedText, status, reviewedBy }
        );
        if (!project) {
          return NextResponse.json(
            { error: "Project not found or unauthorized" },
            { status: 404 }
          );
        }
        return NextResponse.json({ project });
      }

      case "delete-project": {
        const { projectId } = data;
        if (!projectId) {
          return NextResponse.json({ error: "Project ID required" }, { status: 400 });
        }
        const success = deleteTranslationProject(projectId, session.user.id);
        if (!success) {
          return NextResponse.json(
            { error: "Project not found or unauthorized" },
            { status: 404 }
          );
        }
        return NextResponse.json({ success: true });
      }

      case "save-memory": {
        const { sourceText, translatedText, sourceLanguage, targetLanguage, context, platform } = data;
        if (!sourceText || !translatedText || !sourceLanguage || !targetLanguage) {
          return NextResponse.json(
            { error: "Source text, translated text, and languages required" },
            { status: 400 }
          );
        }
        const memory = saveToTranslationMemory(session.user.id, {
          sourceText,
          translatedText,
          sourceLanguage,
          targetLanguage,
          context,
          platform,
        });
        return NextResponse.json({ memory });
      }

      case "delete-memory": {
        const { memoryId } = data;
        if (!memoryId) {
          return NextResponse.json({ error: "Memory ID required" }, { status: 400 });
        }
        const success = deleteTranslationMemory(memoryId, session.user.id);
        if (!success) {
          return NextResponse.json(
            { error: "Memory not found or unauthorized" },
            { status: 404 }
          );
        }
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Translation POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process request" },
      { status: 500 }
    );
  }
}
