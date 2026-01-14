import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface TranslationResult {
  originalText: string;
  originalLanguage: string;
  translatedText: string;
  targetLanguage: string;
  confidence: number;
  localizations: {
    hashtags: string[];
    emojis: string[];
    culturalNotes: string[];
  };
}

export interface TranslationMemory {
  id: string;
  userId: string;
  sourcePhrase: string;
  sourceLanguage: string;
  translations: Record<string, string>; // language code -> translation
  createdAt: Date;
  usageCount: number;
}

export interface TranslationProject {
  id: string;
  userId: string;
  name: string;
  description?: string;
  sourceLanguage: string;
  targetLanguages: string[];
  content: TranslationContent[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TranslationContent {
  id: string;
  projectId: string;
  originalText: string;
  translations: Record<string, {
    text: string;
    status: "pending" | "translated" | "reviewed" | "approved";
    translatedAt?: Date;
    reviewedBy?: string;
  }>;
  platform?: string;
  contentType?: string;
}

export interface LanguageInfo {
  code: string;
  name: string;
  nativeName: string;
  rtl: boolean;
  supported: boolean;
}

// In-memory storage
const translationMemories = new Map<string, TranslationMemory>();
const userMemories = new Map<string, Set<string>>();
const translationProjects = new Map<string, TranslationProject>();
const userProjects = new Map<string, Set<string>>();

// Supported languages
export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: "en", name: "English", nativeName: "English", rtl: false, supported: true },
  { code: "es", name: "Spanish", nativeName: "Español", rtl: false, supported: true },
  { code: "fr", name: "French", nativeName: "Français", rtl: false, supported: true },
  { code: "de", name: "German", nativeName: "Deutsch", rtl: false, supported: true },
  { code: "it", name: "Italian", nativeName: "Italiano", rtl: false, supported: true },
  { code: "pt", name: "Portuguese", nativeName: "Português", rtl: false, supported: true },
  { code: "nl", name: "Dutch", nativeName: "Nederlands", rtl: false, supported: true },
  { code: "ru", name: "Russian", nativeName: "Русский", rtl: false, supported: true },
  { code: "ja", name: "Japanese", nativeName: "日本語", rtl: false, supported: true },
  { code: "ko", name: "Korean", nativeName: "한국어", rtl: false, supported: true },
  { code: "zh", name: "Chinese (Simplified)", nativeName: "简体中文", rtl: false, supported: true },
  { code: "zh-TW", name: "Chinese (Traditional)", nativeName: "繁體中文", rtl: false, supported: true },
  { code: "ar", name: "Arabic", nativeName: "العربية", rtl: true, supported: true },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", rtl: false, supported: true },
  { code: "tr", name: "Turkish", nativeName: "Türkçe", rtl: false, supported: true },
  { code: "pl", name: "Polish", nativeName: "Polski", rtl: false, supported: true },
  { code: "sv", name: "Swedish", nativeName: "Svenska", rtl: false, supported: true },
  { code: "da", name: "Danish", nativeName: "Dansk", rtl: false, supported: true },
  { code: "no", name: "Norwegian", nativeName: "Norsk", rtl: false, supported: true },
  { code: "fi", name: "Finnish", nativeName: "Suomi", rtl: false, supported: true },
  { code: "th", name: "Thai", nativeName: "ไทย", rtl: false, supported: true },
  { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt", rtl: false, supported: true },
  { code: "id", name: "Indonesian", nativeName: "Bahasa Indonesia", rtl: false, supported: true },
  { code: "ms", name: "Malay", nativeName: "Bahasa Melayu", rtl: false, supported: true },
  { code: "he", name: "Hebrew", nativeName: "עברית", rtl: true, supported: true },
];

export async function detectLanguage(text: string): Promise<{
  language: string;
  languageName: string;
  confidence: number;
}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Detect the language of the given text. Return JSON: { "language": "<ISO 639-1 code>", "languageName": "<full name>", "confidence": <0-1> }`,
        },
        { role: "user", content: text },
      ],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content || '{"language": "en", "languageName": "English", "confidence": 0.5}');
  } catch (error) {
    return { language: "en", languageName: "English", confidence: 0.5 };
  }
}

export async function translateContent(
  text: string,
  targetLanguage: string,
  options: {
    sourceLanguage?: string;
    platform?: string;
    preserveHashtags?: boolean;
    preserveMentions?: boolean;
    adaptTone?: boolean;
    maxLength?: number;
  } = {}
): Promise<TranslationResult> {
  const {
    sourceLanguage,
    platform = "general",
    preserveHashtags = true,
    preserveMentions = true,
    adaptTone = true,
    maxLength,
  } = options;

  try {
    // Detect source language if not provided
    let detectedLang = sourceLanguage || "en";
    if (!sourceLanguage) {
      const detected = await detectLanguage(text);
      detectedLang = detected.language;
    }

    const targetLangInfo = SUPPORTED_LANGUAGES.find((l) => l.code === targetLanguage);

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert translator specializing in social media content localization.

          Target language: ${targetLanguage} (${targetLangInfo?.name || targetLanguage})
          Platform: ${platform}
          ${preserveHashtags ? "Preserve hashtags in the original language but also provide localized hashtag suggestions." : ""}
          ${preserveMentions ? "Preserve @mentions exactly as they are." : ""}
          ${adaptTone ? "Adapt the tone and cultural references for the target audience." : ""}
          ${maxLength ? `Keep the translation under ${maxLength} characters.` : ""}

          Return JSON: {
            "translatedText": "...",
            "confidence": <0-1>,
            "localizations": {
              "hashtags": ["#localized1", ...],
              "emojis": ["suggested emojis if culturally different"],
              "culturalNotes": ["any cultural adaptations made"]
            }
          }`,
        },
        { role: "user", content: text },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    return {
      originalText: text,
      originalLanguage: detectedLang,
      translatedText: result.translatedText || text,
      targetLanguage,
      confidence: result.confidence || 0.8,
      localizations: result.localizations || { hashtags: [], emojis: [], culturalNotes: [] },
    };
  } catch (error) {
    return {
      originalText: text,
      originalLanguage: sourceLanguage || "en",
      translatedText: text,
      targetLanguage,
      confidence: 0,
      localizations: { hashtags: [], emojis: [], culturalNotes: [] },
    };
  }
}

export async function batchTranslate(
  texts: string[],
  targetLanguages: string[],
  options: {
    sourceLanguage?: string;
    platform?: string;
  } = {}
): Promise<Record<string, TranslationResult[]>> {
  const results: Record<string, TranslationResult[]> = {};

  for (const lang of targetLanguages) {
    results[lang] = [];
    for (const text of texts) {
      const translation = await translateContent(text, lang, options);
      results[lang].push(translation);
    }
  }

  return results;
}

export async function localizeForPlatform(
  text: string,
  platform: string,
  targetLanguage: string
): Promise<{
  localizedText: string;
  characterCount: number;
  warnings: string[];
  suggestions: string[];
}> {
  const platformLimits: Record<string, number> = {
    twitter: 280,
    instagram: 2200,
    facebook: 63206,
    linkedin: 3000,
    tiktok: 2200,
  };

  const limit = platformLimits[platform] || 5000;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Localize the content for ${platform} in ${targetLanguage}.

          Character limit: ${limit}

          Consider:
          - Platform-specific conventions
          - Cultural relevance
          - Hashtag and emoji usage patterns
          - Call-to-action localization

          Return JSON: {
            "localizedText": "...",
            "warnings": ["any issues"],
            "suggestions": ["improvements"]
          }`,
        },
        { role: "user", content: text },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    const localizedText = result.localizedText || text;

    const warnings = result.warnings || [];
    if (localizedText.length > limit) {
      warnings.push(`Text exceeds ${platform} character limit (${localizedText.length}/${limit})`);
    }

    return {
      localizedText,
      characterCount: localizedText.length,
      warnings,
      suggestions: result.suggestions || [],
    };
  } catch (error) {
    return {
      localizedText: text,
      characterCount: text.length,
      warnings: ["Translation failed"],
      suggestions: [],
    };
  }
}

export async function suggestAlternativeTranslations(
  text: string,
  targetLanguage: string,
  count: number = 3
): Promise<{
  alternatives: { text: string; style: string; formality: string }[];
}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Provide ${count} alternative translations for the text in ${targetLanguage}.

          Vary by:
          - Formality (formal, neutral, casual)
          - Style (creative, direct, engaging)

          Return JSON: {
            "alternatives": [
              { "text": "...", "style": "...", "formality": "..." },
              ...
            ]
          }`,
        },
        { role: "user", content: text },
      ],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content || '{"alternatives": []}');
  } catch (error) {
    return { alternatives: [] };
  }
}

// Translation Memory CRUD
export function saveToTranslationMemory(
  userId: string,
  sourcePhrase: string,
  sourceLanguage: string,
  translations: Record<string, string>
): TranslationMemory {
  // Check if already exists
  const existingMemories = getUserTranslationMemories(userId);
  const existing = existingMemories.find(
    (m) => m.sourcePhrase.toLowerCase() === sourcePhrase.toLowerCase() && m.sourceLanguage === sourceLanguage
  );

  if (existing) {
    // Update existing
    existing.translations = { ...existing.translations, ...translations };
    existing.usageCount++;
    translationMemories.set(existing.id, existing);
    return existing;
  }

  const memory: TranslationMemory = {
    id: crypto.randomUUID(),
    userId,
    sourcePhrase,
    sourceLanguage,
    translations,
    createdAt: new Date(),
    usageCount: 1,
  };

  translationMemories.set(memory.id, memory);

  if (!userMemories.has(userId)) {
    userMemories.set(userId, new Set());
  }
  userMemories.get(userId)!.add(memory.id);

  return memory;
}

export function getUserTranslationMemories(userId: string): TranslationMemory[] {
  const memoryIds = userMemories.get(userId);
  if (!memoryIds) return [];

  return Array.from(memoryIds)
    .map((id) => translationMemories.get(id))
    .filter((m): m is TranslationMemory => m !== undefined)
    .sort((a, b) => b.usageCount - a.usageCount);
}

export function searchTranslationMemory(
  userId: string,
  searchPhrase: string,
  sourceLanguage: string
): TranslationMemory | null {
  const memories = getUserTranslationMemories(userId);
  return memories.find(
    (m) =>
      m.sourcePhrase.toLowerCase().includes(searchPhrase.toLowerCase()) &&
      m.sourceLanguage === sourceLanguage
  ) || null;
}

export function deleteTranslationMemory(memoryId: string, userId: string): boolean {
  const memory = translationMemories.get(memoryId);
  if (!memory || memory.userId !== userId) return false;

  translationMemories.delete(memoryId);
  userMemories.get(userId)?.delete(memoryId);
  return true;
}

// Translation Project CRUD
export function createTranslationProject(
  userId: string,
  data: Omit<TranslationProject, "id" | "userId" | "content" | "createdAt" | "updatedAt">
): TranslationProject {
  const project: TranslationProject = {
    id: crypto.randomUUID(),
    userId,
    ...data,
    content: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  translationProjects.set(project.id, project);

  if (!userProjects.has(userId)) {
    userProjects.set(userId, new Set());
  }
  userProjects.get(userId)!.add(project.id);

  return project;
}

export function getUserTranslationProjects(userId: string): TranslationProject[] {
  const projectIds = userProjects.get(userId);
  if (!projectIds) return [];

  return Array.from(projectIds)
    .map((id) => translationProjects.get(id))
    .filter((p): p is TranslationProject => p !== undefined)
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

export function getTranslationProject(projectId: string, userId: string): TranslationProject | null {
  const project = translationProjects.get(projectId);
  if (!project || project.userId !== userId) return null;
  return project;
}

export function addContentToProject(
  projectId: string,
  userId: string,
  originalText: string,
  platform?: string,
  contentType?: string
): TranslationProject | null {
  const project = translationProjects.get(projectId);
  if (!project || project.userId !== userId) return null;

  const content: TranslationContent = {
    id: crypto.randomUUID(),
    projectId,
    originalText,
    translations: {},
    platform,
    contentType,
  };

  // Initialize translations for each target language
  for (const lang of project.targetLanguages) {
    content.translations[lang] = {
      text: "",
      status: "pending",
    };
  }

  project.content.push(content);
  project.updatedAt = new Date();
  translationProjects.set(projectId, project);

  return project;
}

export function updateContentTranslation(
  projectId: string,
  userId: string,
  contentId: string,
  language: string,
  translatedText: string,
  status: "pending" | "translated" | "reviewed" | "approved" = "translated"
): TranslationProject | null {
  const project = translationProjects.get(projectId);
  if (!project || project.userId !== userId) return null;

  const content = project.content.find((c) => c.id === contentId);
  if (!content) return null;

  content.translations[language] = {
    text: translatedText,
    status,
    translatedAt: new Date(),
  };

  project.updatedAt = new Date();
  translationProjects.set(projectId, project);

  return project;
}

export async function autoTranslateProject(
  projectId: string,
  userId: string
): Promise<TranslationProject | null> {
  const project = translationProjects.get(projectId);
  if (!project || project.userId !== userId) return null;

  for (const content of project.content) {
    for (const lang of project.targetLanguages) {
      if (content.translations[lang].status === "pending") {
        const result = await translateContent(content.originalText, lang, {
          sourceLanguage: project.sourceLanguage,
          platform: content.platform,
        });

        content.translations[lang] = {
          text: result.translatedText,
          status: "translated",
          translatedAt: new Date(),
        };
      }
    }
  }

  project.updatedAt = new Date();
  translationProjects.set(projectId, project);

  return project;
}

export function deleteTranslationProject(projectId: string, userId: string): boolean {
  const project = translationProjects.get(projectId);
  if (!project || project.userId !== userId) return false;

  translationProjects.delete(projectId);
  userProjects.get(userId)?.delete(projectId);
  return true;
}

export function getProjectStats(project: TranslationProject): {
  totalContent: number;
  byLanguage: Record<string, { pending: number; translated: number; reviewed: number; approved: number }>;
  completionPercentage: number;
} {
  const stats: Record<string, { pending: number; translated: number; reviewed: number; approved: number }> = {};

  for (const lang of project.targetLanguages) {
    stats[lang] = { pending: 0, translated: 0, reviewed: 0, approved: 0 };
  }

  for (const content of project.content) {
    for (const [lang, translation] of Object.entries(content.translations)) {
      if (stats[lang]) {
        stats[lang][translation.status]++;
      }
    }
  }

  const totalItems = project.content.length * project.targetLanguages.length;
  const completedItems = Object.values(stats).reduce(
    (sum, s) => sum + s.translated + s.reviewed + s.approved,
    0
  );

  return {
    totalContent: project.content.length,
    byLanguage: stats,
    completionPercentage: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
  };
}

export function getLanguageByCode(code: string): LanguageInfo | undefined {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code);
}
