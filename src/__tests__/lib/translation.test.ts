import { describe, it, expect, beforeEach } from "@jest/globals";
import { createMockUserId } from "../utils/test-helpers";

describe("Multi-language Content Translation", () => {
  let userId: string;

  beforeEach(() => {
    userId = createMockUserId();
  });

  describe("Translation Memory", () => {
    describe("saveToTranslationMemory", () => {
      it("should save a translation to memory", async () => {
        const { saveToTranslationMemory } = await import("@/lib/translation");

        const memory = saveToTranslationMemory(
          userId,
          "Hello world",
          "en",
          { es: "Hola mundo", fr: "Bonjour le monde" }
        );

        expect(memory).toBeDefined();
        expect(memory.id).toBeDefined();
        expect(memory.userId).toBe(userId);
        expect(memory.sourcePhrase).toBe("Hello world");
        expect(memory.sourceLanguage).toBe("en");
        expect(memory.translations.es).toBe("Hola mundo");
        expect(memory.translations.fr).toBe("Bonjour le monde");
        expect(memory.usageCount).toBe(1);
      });

      it("should update existing memory and increment usage count", async () => {
        const { saveToTranslationMemory } = await import("@/lib/translation");

        // First save
        saveToTranslationMemory(userId, "Test phrase", "en", { es: "Frase de prueba" });

        // Second save with same phrase
        const updated = saveToTranslationMemory(userId, "Test phrase", "en", { de: "Testphrase" });

        expect(updated.usageCount).toBe(2);
        expect(updated.translations.es).toBe("Frase de prueba");
        expect(updated.translations.de).toBe("Testphrase");
      });
    });

    describe("getUserTranslationMemories", () => {
      it("should return user's translation memories", async () => {
        const { saveToTranslationMemory, getUserTranslationMemories } = await import("@/lib/translation");

        saveToTranslationMemory(userId, "Good morning", "en", { es: "Buenos días" });
        saveToTranslationMemory(userId, "Good night", "en", { es: "Buenas noches" });

        const memories = getUserTranslationMemories(userId);

        expect(memories).toBeDefined();
        expect(Array.isArray(memories)).toBe(true);
        expect(memories.length).toBeGreaterThanOrEqual(2);
      });

      it("should sort by usage count descending", async () => {
        const { saveToTranslationMemory, getUserTranslationMemories } = await import("@/lib/translation");

        // Create a phrase and use it multiple times
        saveToTranslationMemory(userId, "Popular phrase", "en", { es: "Frase popular" });
        saveToTranslationMemory(userId, "Popular phrase", "en", { fr: "Phrase populaire" });
        saveToTranslationMemory(userId, "Rare phrase", "en", { es: "Frase rara" });

        const memories = getUserTranslationMemories(userId);

        // Popular phrase should come first due to higher usage count
        const popularIndex = memories.findIndex(m => m.sourcePhrase === "Popular phrase");
        const rareIndex = memories.findIndex(m => m.sourcePhrase === "Rare phrase");

        if (popularIndex !== -1 && rareIndex !== -1) {
          expect(popularIndex).toBeLessThan(rareIndex);
        }
      });
    });

    describe("searchTranslationMemory", () => {
      it("should find matching translation memory", async () => {
        const { saveToTranslationMemory, searchTranslationMemory } = await import("@/lib/translation");

        saveToTranslationMemory(userId, "Welcome to our store", "en", { es: "Bienvenido a nuestra tienda" });

        const result = searchTranslationMemory(userId, "Welcome", "en");

        expect(result).toBeDefined();
        expect(result?.sourcePhrase).toContain("Welcome");
      });

      it("should return null if not found", async () => {
        const { searchTranslationMemory } = await import("@/lib/translation");

        const result = searchTranslationMemory(userId, "nonexistent phrase", "en");

        expect(result).toBeNull();
      });
    });

    describe("deleteTranslationMemory", () => {
      it("should delete a translation memory", async () => {
        const { saveToTranslationMemory, deleteTranslationMemory, getUserTranslationMemories } = await import("@/lib/translation");

        const memory = saveToTranslationMemory(userId, "To be deleted", "en", { es: "Para borrar" });
        const initialCount = getUserTranslationMemories(userId).length;

        const result = deleteTranslationMemory(memory.id, userId);
        const afterCount = getUserTranslationMemories(userId).length;

        expect(result).toBe(true);
        expect(afterCount).toBeLessThan(initialCount);
      });

      it("should return false for unauthorized deletion", async () => {
        const { saveToTranslationMemory, deleteTranslationMemory } = await import("@/lib/translation");

        const memory = saveToTranslationMemory(userId, "Protected", "en", { es: "Protegido" });

        const result = deleteTranslationMemory(memory.id, "different-user");

        expect(result).toBe(false);
      });
    });
  });

  describe("Translation Projects", () => {
    describe("createTranslationProject", () => {
      it("should create a new translation project", async () => {
        const { createTranslationProject } = await import("@/lib/translation");

        const project = createTranslationProject(userId, {
          name: "Website Localization",
          description: "Translate website content",
          sourceLanguage: "en",
          targetLanguages: ["es", "fr", "de"],
        });

        expect(project).toBeDefined();
        expect(project.id).toBeDefined();
        expect(project.userId).toBe(userId);
        expect(project.name).toBe("Website Localization");
        expect(project.sourceLanguage).toBe("en");
        expect(project.targetLanguages).toContain("es");
        expect(project.targetLanguages).toContain("fr");
        expect(project.targetLanguages).toContain("de");
        expect(project.content).toHaveLength(0);
      });
    });

    describe("getUserTranslationProjects", () => {
      it("should return user's translation projects", async () => {
        const { createTranslationProject, getUserTranslationProjects } = await import("@/lib/translation");

        createTranslationProject(userId, {
          name: "Project 1",
          sourceLanguage: "en",
          targetLanguages: ["es"],
        });

        const projects = getUserTranslationProjects(userId);

        expect(projects).toBeDefined();
        expect(Array.isArray(projects)).toBe(true);
        expect(projects.length).toBeGreaterThan(0);
      });
    });

    describe("getTranslationProject", () => {
      it("should return a specific project", async () => {
        const { createTranslationProject, getTranslationProject } = await import("@/lib/translation");

        const created = createTranslationProject(userId, {
          name: "Specific Project",
          sourceLanguage: "en",
          targetLanguages: ["ja"],
        });

        const project = getTranslationProject(created.id, userId);

        expect(project).toBeDefined();
        expect(project?.id).toBe(created.id);
        expect(project?.name).toBe("Specific Project");
      });

      it("should return null for unauthorized access", async () => {
        const { createTranslationProject, getTranslationProject } = await import("@/lib/translation");

        const created = createTranslationProject(userId, {
          name: "Private Project",
          sourceLanguage: "en",
          targetLanguages: ["ko"],
        });

        const project = getTranslationProject(created.id, "different-user");

        expect(project).toBeNull();
      });
    });

    describe("addContentToProject", () => {
      it("should add content to a project", async () => {
        const { createTranslationProject, addContentToProject } = await import("@/lib/translation");

        const project = createTranslationProject(userId, {
          name: "Content Project",
          sourceLanguage: "en",
          targetLanguages: ["es", "fr"],
        });

        const updated = addContentToProject(
          project.id,
          userId,
          "Welcome to our website!",
          "website",
          "heading"
        );

        expect(updated).toBeDefined();
        expect(updated?.content).toHaveLength(1);
        expect(updated?.content[0].originalText).toBe("Welcome to our website!");
        expect(updated?.content[0].platform).toBe("website");
        expect(updated?.content[0].contentType).toBe("heading");
        // Each target language should have pending translation
        expect(updated?.content[0].translations.es.status).toBe("pending");
        expect(updated?.content[0].translations.fr.status).toBe("pending");
      });
    });

    describe("updateContentTranslation", () => {
      it("should update a content translation", async () => {
        const { createTranslationProject, addContentToProject, updateContentTranslation } = await import("@/lib/translation");

        const project = createTranslationProject(userId, {
          name: "Translation Project",
          sourceLanguage: "en",
          targetLanguages: ["es"],
        });

        const withContent = addContentToProject(project.id, userId, "Hello world");
        const contentId = withContent?.content[0].id;

        const updated = updateContentTranslation(
          project.id,
          userId,
          contentId!,
          "es",
          "Hola mundo",
          "translated"
        );

        expect(updated).toBeDefined();
        expect(updated?.content[0].translations.es.text).toBe("Hola mundo");
        expect(updated?.content[0].translations.es.status).toBe("translated");
        expect(updated?.content[0].translations.es.translatedAt).toBeDefined();
      });
    });

    describe("deleteTranslationProject", () => {
      it("should delete a translation project", async () => {
        const { createTranslationProject, deleteTranslationProject, getTranslationProject } = await import("@/lib/translation");

        const project = createTranslationProject(userId, {
          name: "To Delete",
          sourceLanguage: "en",
          targetLanguages: ["es"],
        });

        const result = deleteTranslationProject(project.id, userId);
        const deleted = getTranslationProject(project.id, userId);

        expect(result).toBe(true);
        expect(deleted).toBeNull();
      });
    });

    describe("getProjectStats", () => {
      it("should return project statistics", async () => {
        const { createTranslationProject, addContentToProject, updateContentTranslation, getProjectStats } = await import("@/lib/translation");

        const project = createTranslationProject(userId, {
          name: "Stats Project",
          sourceLanguage: "en",
          targetLanguages: ["es", "fr"],
        });

        addContentToProject(project.id, userId, "Content 1");
        const withContent = addContentToProject(project.id, userId, "Content 2");

        // Translate one item
        if (withContent && withContent.content.length > 0) {
          updateContentTranslation(project.id, userId, withContent.content[0].id, "es", "Contenido 1", "translated");
        }

        const stats = getProjectStats(withContent!);

        expect(stats).toBeDefined();
        expect(stats.totalContent).toBe(2);
        expect(stats.byLanguage).toBeDefined();
        expect(stats.byLanguage.es).toBeDefined();
        expect(stats.byLanguage.fr).toBeDefined();
        expect(stats.completionPercentage).toBeGreaterThanOrEqual(0);
        expect(stats.completionPercentage).toBeLessThanOrEqual(100);
      });
    });
  });

  describe("Language Utilities", () => {
    describe("getLanguageByCode", () => {
      it("should return language info by code", async () => {
        const { getLanguageByCode } = await import("@/lib/translation");

        const english = getLanguageByCode("en");
        const spanish = getLanguageByCode("es");
        const arabic = getLanguageByCode("ar");

        expect(english).toBeDefined();
        expect(english?.name).toBe("English");
        expect(english?.nativeName).toBe("English");

        expect(spanish).toBeDefined();
        expect(spanish?.name).toBe("Spanish");

        expect(arabic).toBeDefined();
        expect(arabic?.rtl).toBe(true);
      });

      it("should return undefined for unknown code", async () => {
        const { getLanguageByCode } = await import("@/lib/translation");

        const result = getLanguageByCode("xyz");

        expect(result).toBeUndefined();
      });
    });
  });

  describe("Constants", () => {
    it("should export supported languages", async () => {
      const { SUPPORTED_LANGUAGES } = await import("@/lib/translation");

      expect(SUPPORTED_LANGUAGES).toBeDefined();
      expect(Array.isArray(SUPPORTED_LANGUAGES)).toBe(true);
      expect(SUPPORTED_LANGUAGES.length).toBeGreaterThan(0);

      SUPPORTED_LANGUAGES.forEach((lang) => {
        expect(lang.code).toBeDefined();
        expect(lang.name).toBeDefined();
        expect(lang.nativeName).toBeDefined();
        expect(typeof lang.rtl).toBe("boolean");
        expect(typeof lang.supported).toBe("boolean");
      });
    });

    it("should include major languages", async () => {
      const { SUPPORTED_LANGUAGES } = await import("@/lib/translation");

      const codes = SUPPORTED_LANGUAGES.map(l => l.code);

      expect(codes).toContain("en");
      expect(codes).toContain("es");
      expect(codes).toContain("fr");
      expect(codes).toContain("de");
      expect(codes).toContain("ja");
      expect(codes).toContain("zh");
      expect(codes).toContain("ar");
    });

    it("should have RTL languages marked correctly", async () => {
      const { SUPPORTED_LANGUAGES } = await import("@/lib/translation");

      const arabic = SUPPORTED_LANGUAGES.find(l => l.code === "ar");
      const hebrew = SUPPORTED_LANGUAGES.find(l => l.code === "he");
      const english = SUPPORTED_LANGUAGES.find(l => l.code === "en");

      expect(arabic?.rtl).toBe(true);
      expect(hebrew?.rtl).toBe(true);
      expect(english?.rtl).toBe(false);
    });
  });
});
