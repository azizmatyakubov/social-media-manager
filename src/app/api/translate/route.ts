import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  detectLanguage,
  translateContent,
  batchTranslate,
  localizeForPlatform,
  suggestAlternativeTranslations,
  saveToTranslationMemory,
  getUserTranslationMemories,
  searchTranslationMemory,
  deleteTranslationMemory,
  createTranslationProject,
  getUserTranslationProjects,
  getTranslationProject,
  addContentToProject,
  updateContentTranslation,
  autoTranslateProject,
  deleteTranslationProject,
  getProjectStats,
  SUPPORTED_LANGUAGES,
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
      case "languages": {
        return NextResponse.json({ languages: SUPPORTED_LANGUAGES });
      }

      case "language": {
        const code = searchParams.get("code");
        if (!code) {
          return NextResponse.json({ error: "Language code required" }, { status: 400 });
        }
        const language = getLanguageByCode(code);
        return NextResponse.json({ language });
      }

      case "memories": {
        const memories = getUserTranslationMemories(session.user.id);
        return NextResponse.json({ memories });
      }

      case "search-memory": {
        const phrase = searchParams.get("phrase");
        const sourceLang = searchParams.get("sourceLang") || "en";

        if (!phrase) {
          return NextResponse.json({ error: "Search phrase required" }, { status: 400 });
        }

        const memory = searchTranslationMemory(session.user.id, phrase, sourceLang);
        return NextResponse.json({ memory });
      }

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

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Translate GET error:", error);
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
      case "detect": {
        const { text } = data;

        if (!text) {
          return NextResponse.json({ error: "Text required" }, { status: 400 });
        }

        const detection = await detectLanguage(text);
        return NextResponse.json(detection);
      }

      case "translate": {
        const { text, targetLanguage, sourceLanguage, platform, preserveHashtags, preserveMentions, adaptTone, maxLength } = data;

        if (!text || !targetLanguage) {
          return NextResponse.json(
            { error: "Text and target language required" },
            { status: 400 }
          );
        }

        const result = await translateContent(text, targetLanguage, {
          sourceLanguage,
          platform,
          preserveHashtags,
          preserveMentions,
          adaptTone,
          maxLength,
        });

        // Save to translation memory
        saveToTranslationMemory(
          session.user.id,
          text,
          result.originalLanguage,
          { [targetLanguage]: result.translatedText }
        );

        return NextResponse.json({ translation: result });
      }

      case "batch-translate": {
        const { texts, targetLanguages, sourceLanguage, platform } = data;

        if (!texts || !targetLanguages || !Array.isArray(texts) || !Array.isArray(targetLanguages)) {
          return NextResponse.json(
            { error: "Texts array and target languages array required" },
            { status: 400 }
          );
        }

        const results = await batchTranslate(texts, targetLanguages, {
          sourceLanguage,
          platform,
        });

        return NextResponse.json({ translations: results });
      }

      case "localize": {
        const { text, platform, targetLanguage } = data;

        if (!text || !platform || !targetLanguage) {
          return NextResponse.json(
            { error: "Text, platform, and target language required" },
            { status: 400 }
          );
        }

        const result = await localizeForPlatform(text, platform, targetLanguage);
        return NextResponse.json(result);
      }

      case "alternatives": {
        const { text, targetLanguage, count } = data;

        if (!text || !targetLanguage) {
          return NextResponse.json(
            { error: "Text and target language required" },
            { status: 400 }
          );
        }

        const result = await suggestAlternativeTranslations(text, targetLanguage, count);
        return NextResponse.json(result);
      }

      case "save-memory": {
        const { sourcePhrase, sourceLanguage, translations } = data;

        if (!sourcePhrase || !sourceLanguage || !translations) {
          return NextResponse.json(
            { error: "Source phrase, source language, and translations required" },
            { status: 400 }
          );
        }

        const memory = saveToTranslationMemory(
          session.user.id,
          sourcePhrase,
          sourceLanguage,
          translations
        );

        return NextResponse.json({ memory });
      }

      case "delete-memory": {
        const { memoryId } = data;

        if (!memoryId) {
          return NextResponse.json({ error: "Memory ID required" }, { status: 400 });
        }

        const deleted = deleteTranslationMemory(memoryId, session.user.id);
        if (!deleted) {
          return NextResponse.json({ error: "Memory not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
      }

      case "create-project": {
        const { name, description, sourceLanguage, targetLanguages } = data;

        if (!name || !sourceLanguage || !targetLanguages || !Array.isArray(targetLanguages)) {
          return NextResponse.json(
            { error: "Name, source language, and target languages required" },
            { status: 400 }
          );
        }

        const project = createTranslationProject(session.user.id, {
          name,
          description,
          sourceLanguage,
          targetLanguages,
        });

        return NextResponse.json({ project });
      }

      case "add-content": {
        const { projectId, originalText, platform, contentType } = data;

        if (!projectId || !originalText) {
          return NextResponse.json(
            { error: "Project ID and original text required" },
            { status: 400 }
          );
        }

        const project = addContentToProject(projectId, session.user.id, originalText, platform, contentType);
        if (!project) {
          return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        return NextResponse.json({ project });
      }

      case "update-translation": {
        const { projectId, contentId, language, translatedText, status } = data;

        if (!projectId || !contentId || !language || !translatedText) {
          return NextResponse.json(
            { error: "Project ID, content ID, language, and translated text required" },
            { status: 400 }
          );
        }

        const project = updateContentTranslation(
          projectId,
          session.user.id,
          contentId,
          language,
          translatedText,
          status
        );

        if (!project) {
          return NextResponse.json({ error: "Project or content not found" }, { status: 404 });
        }

        return NextResponse.json({ project });
      }

      case "auto-translate-project": {
        const { projectId } = data;

        if (!projectId) {
          return NextResponse.json({ error: "Project ID required" }, { status: 400 });
        }

        const project = await autoTranslateProject(projectId, session.user.id);
        if (!project) {
          return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        const stats = getProjectStats(project);
        return NextResponse.json({ project, stats });
      }

      case "delete-project": {
        const { projectId } = data;

        if (!projectId) {
          return NextResponse.json({ error: "Project ID required" }, { status: 400 });
        }

        const deleted = deleteTranslationProject(projectId, session.user.id);
        if (!deleted) {
          return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
      }

      case "quick-translate": {
        const { text, targetLanguages } = data;

        if (!text || !targetLanguages || !Array.isArray(targetLanguages)) {
          return NextResponse.json(
            { error: "Text and target languages array required" },
            { status: 400 }
          );
        }

        const results: Record<string, any> = {};
        for (const lang of targetLanguages) {
          const result = await translateContent(text, lang);
          results[lang] = result;
        }

        return NextResponse.json({ translations: results });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Translate POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process request" },
      { status: 500 }
    );
  }
}
