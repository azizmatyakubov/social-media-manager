import { describe, it, expect, beforeEach } from "@jest/globals";
import { createMockUserId } from "../utils/test-helpers";

describe("Idea Generator", () => {
  let userId: string;

  beforeEach(() => {
    userId = createMockUserId();
  });

  describe("Idea Generation", () => {
    describe("generateNewIdeas", () => {
      it("should generate ideas for a user", async () => {
        const { generateNewIdeas } = await import("@/lib/idea-generator");

        const session = generateNewIdeas(userId, {
          niche: "technology",
          platforms: ["instagram", "twitter"],
          contentTypes: ["post", "carousel"],
          tones: ["professional", "educational"],
          count: 5,
        });

        expect(session).toBeDefined();
        expect(session.id).toBeDefined();
        expect(session.userId).toBe(userId);
        expect(session.ideas.length).toBeGreaterThan(0);
      });

      it("should generate ideas with correct niche", async () => {
        const { generateNewIdeas } = await import("@/lib/idea-generator");

        const session = generateNewIdeas(userId, {
          niche: "fitness",
          platforms: ["instagram"],
          contentTypes: ["post"],
          tones: ["motivational"],
          count: 3,
        });

        session.ideas.forEach((idea) => {
          expect(idea.niche).toBe("fitness");
        });
      });

      it("should generate ideas for specified platforms", async () => {
        const { generateNewIdeas } = await import("@/lib/idea-generator");

        const session = generateNewIdeas(userId, {
          niche: "business",
          platforms: ["linkedin"],
          contentTypes: ["post"],
          tones: ["professional"],
          count: 3,
        });

        session.ideas.forEach((idea) => {
          expect(idea.platforms).toContain("linkedin");
        });
      });

      it("should create session with name", async () => {
        const { generateNewIdeas } = await import("@/lib/idea-generator");

        const session = generateNewIdeas(userId, {
          niche: "marketing",
          platforms: ["twitter"],
          contentTypes: ["thread"],
          tones: ["educational"],
          count: 5,
          sessionName: "Marketing Ideas Q1",
        });

        expect(session.name).toBe("Marketing Ideas Q1");
      });

      it("should generate ideas with categories", async () => {
        const { generateNewIdeas } = await import("@/lib/idea-generator");

        const session = generateNewIdeas(userId, {
          niche: "technology",
          platforms: ["instagram"],
          contentTypes: ["post"],
          tones: ["professional"],
          count: 5,
        });

        session.ideas.forEach((idea) => {
          expect(idea.category).toBeDefined();
        });
      });
    });
  });

  describe("Idea CRUD Operations", () => {
    describe("getUserIdeas", () => {
      it("should return ideas for a user", async () => {
        const { getUserIdeas, generateNewIdeas } = await import("@/lib/idea-generator");

        generateNewIdeas(userId, {
          niche: "technology",
          platforms: ["twitter"],
          contentTypes: ["post"],
          tones: ["casual"],
          count: 3,
        });

        const ideas = getUserIdeas(userId);

        expect(ideas).toBeDefined();
        expect(Array.isArray(ideas)).toBe(true);
        expect(ideas.length).toBeGreaterThan(0);
      });

      it("should filter saved ideas", async () => {
        const { getUserIdeas, generateNewIdeas, saveIdea } = await import("@/lib/idea-generator");

        const session = generateNewIdeas(userId, {
          niche: "technology",
          platforms: ["twitter"],
          contentTypes: ["post"],
          tones: ["casual"],
          count: 3,
        });

        saveIdea(session.ideas[0].id, userId);

        const savedIdeas = getUserIdeas(userId, { saved: true });

        savedIdeas.forEach((idea) => {
          expect(idea.saved).toBe(true);
        });
      });

      it("should filter used ideas", async () => {
        const { getUserIdeas, generateNewIdeas, markIdeaUsed } = await import("@/lib/idea-generator");

        const session = generateNewIdeas(userId, {
          niche: "technology",
          platforms: ["twitter"],
          contentTypes: ["post"],
          tones: ["casual"],
          count: 3,
        });

        markIdeaUsed(session.ideas[0].id, userId);

        const usedIdeas = getUserIdeas(userId, { used: true });

        usedIdeas.forEach((idea) => {
          expect(idea.used).toBe(true);
        });
      });
    });

    describe("getIdea", () => {
      it("should return a specific idea", async () => {
        const { getIdea, generateNewIdeas } = await import("@/lib/idea-generator");

        const session = generateNewIdeas(userId, {
          niche: "fitness",
          platforms: ["instagram"],
          contentTypes: ["post"],
          tones: ["motivational"],
          count: 1,
        });

        const ideaId = session.ideas[0].id;
        const retrieved = getIdea(ideaId);

        expect(retrieved).toBeDefined();
        expect(retrieved?.id).toBe(ideaId);
      });

      it("should return null for non-existent idea", async () => {
        const { getIdea } = await import("@/lib/idea-generator");

        const result = getIdea("non-existent-id");

        expect(result).toBeNull();
      });
    });

    describe("saveIdea", () => {
      it("should save an idea", async () => {
        const { saveIdea, generateNewIdeas, getIdea } = await import("@/lib/idea-generator");

        const session = generateNewIdeas(userId, {
          niche: "business",
          platforms: ["linkedin"],
          contentTypes: ["post"],
          tones: ["professional"],
          count: 1,
        });

        const ideaId = session.ideas[0].id;
        const saved = saveIdea(ideaId, userId);

        expect(saved?.saved).toBe(true);

        const retrieved = getIdea(ideaId);
        expect(retrieved?.saved).toBe(true);
      });
    });

    describe("markIdeaUsed", () => {
      it("should mark idea as used", async () => {
        const { markIdeaUsed, generateNewIdeas, getIdea } = await import("@/lib/idea-generator");

        const session = generateNewIdeas(userId, {
          niche: "marketing",
          platforms: ["twitter"],
          contentTypes: ["thread"],
          tones: ["educational"],
          count: 1,
        });

        const ideaId = session.ideas[0].id;
        const used = markIdeaUsed(ideaId, userId);

        expect(used?.used).toBe(true);
        expect(used?.usedAt).toBeDefined();

        const retrieved = getIdea(ideaId);
        expect(retrieved?.used).toBe(true);
      });
    });

    describe("rateIdea", () => {
      it("should rate an idea", async () => {
        const { rateIdea, generateNewIdeas, getIdea } = await import("@/lib/idea-generator");

        const session = generateNewIdeas(userId, {
          niche: "technology",
          platforms: ["instagram"],
          contentTypes: ["post"],
          tones: ["casual"],
          count: 1,
        });

        const ideaId = session.ideas[0].id;
        const rated = rateIdea(ideaId, userId, 5);

        expect(rated?.rating).toBe(5);

        const retrieved = getIdea(ideaId);
        expect(retrieved?.rating).toBe(5);
      });

      it("should validate rating range", async () => {
        const { rateIdea, generateNewIdeas } = await import("@/lib/idea-generator");

        const session = generateNewIdeas(userId, {
          niche: "technology",
          platforms: ["instagram"],
          contentTypes: ["post"],
          tones: ["casual"],
          count: 1,
        });

        const ideaId = session.ideas[0].id;

        // Rating should be between 1-5
        const rated = rateIdea(ideaId, userId, 3);
        expect(rated?.rating).toBeGreaterThanOrEqual(1);
        expect(rated?.rating).toBeLessThanOrEqual(5);
      });
    });

    describe("deleteIdea", () => {
      it("should delete an idea", async () => {
        const { deleteIdea, generateNewIdeas, getIdea } = await import("@/lib/idea-generator");

        const session = generateNewIdeas(userId, {
          niche: "fitness",
          platforms: ["tiktok"],
          contentTypes: ["video"],
          tones: ["energetic"],
          count: 1,
        });

        const ideaId = session.ideas[0].id;
        const result = deleteIdea(ideaId, userId);

        expect(result).toBe(true);

        const retrieved = getIdea(ideaId);
        expect(retrieved).toBeNull();
      });
    });
  });

  describe("Session Operations", () => {
    describe("getUserSessions", () => {
      it("should return sessions for a user", async () => {
        const { getUserSessions, generateNewIdeas } = await import("@/lib/idea-generator");

        generateNewIdeas(userId, {
          niche: "technology",
          platforms: ["twitter"],
          contentTypes: ["post"],
          tones: ["casual"],
          count: 3,
        });

        const sessions = getUserSessions(userId);

        expect(sessions).toBeDefined();
        expect(Array.isArray(sessions)).toBe(true);
        expect(sessions.length).toBeGreaterThan(0);
      });
    });

    describe("getSession", () => {
      it("should return a specific session", async () => {
        const { getSession, generateNewIdeas } = await import("@/lib/idea-generator");

        const created = generateNewIdeas(userId, {
          niche: "business",
          platforms: ["linkedin"],
          contentTypes: ["article"],
          tones: ["professional"],
          count: 5,
        });

        const retrieved = getSession(created.id);

        expect(retrieved).toBeDefined();
        expect(retrieved?.id).toBe(created.id);
        expect(retrieved?.ideas.length).toBe(5);
      });
    });
  });

  describe("Content Pillars", () => {
    describe("getUserPillars", () => {
      it("should return pillars for a user", async () => {
        const { getUserPillars } = await import("@/lib/idea-generator");

        const pillars = getUserPillars(userId);

        expect(pillars).toBeDefined();
        expect(Array.isArray(pillars)).toBe(true);
      });
    });

    describe("createPillar", () => {
      it("should create a content pillar", async () => {
        const { createPillar } = await import("@/lib/idea-generator");

        const pillar = createPillar(userId, {
          name: "Education",
          description: "Educational content about our industry",
          percentage: 30,
          color: "#4F46E5",
          keywords: ["tips", "how-to", "tutorial"],
          examples: ["5 Tips for...", "How to..."],
        });

        expect(pillar).toBeDefined();
        expect(pillar.id).toBeDefined();
        expect(pillar.name).toBe("Education");
        expect(pillar.percentage).toBe(30);
        expect(pillar.keywords).toHaveLength(3);
      });
    });

    describe("updatePillar", () => {
      it("should update a pillar", async () => {
        const { createPillar, updatePillar } = await import("@/lib/idea-generator");

        const pillar = createPillar(userId, {
          name: "Original Name",
          description: "Description",
          percentage: 25,
          color: "#000000",
          keywords: [],
          examples: [],
        });

        const updated = updatePillar(pillar.id, userId, {
          name: "Updated Name",
          percentage: 35,
        });

        expect(updated?.name).toBe("Updated Name");
        expect(updated?.percentage).toBe(35);
      });
    });

    describe("deletePillar", () => {
      it("should delete a pillar", async () => {
        const { createPillar, deletePillar, getUserPillars } = await import("@/lib/idea-generator");

        const pillar = createPillar(userId, {
          name: "To Delete",
          description: "Will be deleted",
          percentage: 10,
          color: "#FF0000",
          keywords: [],
          examples: [],
        });

        const result = deletePillar(pillar.id, userId);

        expect(result).toBe(true);
      });
    });
  });

  describe("Statistics", () => {
    describe("getIdeaStats", () => {
      it("should return idea statistics", async () => {
        const { getIdeaStats, generateNewIdeas } = await import("@/lib/idea-generator");

        generateNewIdeas(userId, {
          niche: "technology",
          platforms: ["twitter"],
          contentTypes: ["post"],
          tones: ["casual"],
          count: 5,
        });

        const stats = getIdeaStats(userId);

        expect(stats).toBeDefined();
        expect(stats.totalIdeas).toBeGreaterThanOrEqual(0);
        expect(stats.savedIdeas).toBeGreaterThanOrEqual(0);
        expect(stats.usedIdeas).toBeGreaterThanOrEqual(0);
        expect(stats.avgRating).toBeGreaterThanOrEqual(0);
        expect(stats.totalSessions).toBeGreaterThanOrEqual(0);
        expect(stats.ideasByCategory).toBeDefined();
        expect(stats.ideasByPlatform).toBeDefined();
      });
    });
  });

  describe("Constants", () => {
    it("should export idea categories", async () => {
      const { IDEA_CATEGORIES } = await import("@/lib/idea-generator");

      expect(IDEA_CATEGORIES).toBeDefined();
      expect(Array.isArray(IDEA_CATEGORIES)).toBe(true);
      expect(IDEA_CATEGORIES.length).toBeGreaterThan(0);
    });

    it("should export content tones", async () => {
      const { CONTENT_TONES } = await import("@/lib/idea-generator");

      expect(CONTENT_TONES).toBeDefined();
      expect(Array.isArray(CONTENT_TONES)).toBe(true);
      expect(CONTENT_TONES.length).toBeGreaterThan(0);
    });

    it("should export content types", async () => {
      const { CONTENT_TYPES } = await import("@/lib/idea-generator");

      expect(CONTENT_TYPES).toBeDefined();
      expect(Array.isArray(CONTENT_TYPES)).toBe(true);
      expect(CONTENT_TYPES.length).toBeGreaterThan(0);
    });

    it("should export niches", async () => {
      const { NICHES } = await import("@/lib/idea-generator");

      expect(NICHES).toBeDefined();
      expect(Array.isArray(NICHES)).toBe(true);
      expect(NICHES.length).toBeGreaterThan(0);
    });
  });

  describe("Idea Structure", () => {
    it("should generate ideas with complete structure", async () => {
      const { generateNewIdeas } = await import("@/lib/idea-generator");

      const session = generateNewIdeas(userId, {
        niche: "technology",
        platforms: ["instagram", "twitter"],
        contentTypes: ["post"],
        tones: ["professional"],
        count: 1,
      });

      const idea = session.ideas[0];

      expect(idea.id).toBeDefined();
      expect(idea.title).toBeDefined();
      expect(idea.description).toBeDefined();
      expect(idea.category).toBeDefined();
      expect(idea.niche).toBeDefined();
      expect(idea.platforms).toBeDefined();
      expect(Array.isArray(idea.platforms)).toBe(true);
      expect(idea.contentType).toBeDefined();
      expect(idea.tone).toBeDefined();
      expect(idea.hooks).toBeDefined();
      expect(Array.isArray(idea.hooks)).toBe(true);
      expect(idea.hashtags).toBeDefined();
      expect(Array.isArray(idea.hashtags)).toBe(true);
      expect(idea.saved).toBe(false);
      expect(idea.used).toBe(false);
      expect(idea.createdAt).toBeDefined();
    });
  });
});
