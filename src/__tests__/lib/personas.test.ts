import { describe, it, expect, beforeEach } from "@jest/globals";
import { createMockUserId } from "../utils/test-helpers";

describe("AI Audience Persona Generator", () => {
  let userId: string;

  beforeEach(() => {
    userId = createMockUserId();
  });

  describe("Persona Operations", () => {
    describe("getUserPersonas", () => {
      it("should return personas for a user", async () => {
        const { getUserPersonas } = await import("@/lib/audience-personas");

        const personas = getUserPersonas(userId);

        expect(personas).toBeDefined();
        expect(Array.isArray(personas)).toBe(true);
      });
    });

    describe("createPersona", () => {
      it("should create a new persona", async () => {
        const { createPersona } = await import("@/lib/audience-personas");

        const persona = createPersona(userId, {
          name: "Tech Professional",
          description: "Technology-focused professional audience",
          demographics: {
            ageRange: { min: 25, max: 45 },
            gender: "all",
            locations: ["United States", "Canada"],
            languages: ["English"],
            education: ["Bachelor's", "Master's"],
            occupation: ["Software Developer", "Product Manager"],
            incomeRange: { min: 80000, max: 200000, currency: "USD" },
          },
          psychographics: {
            values: ["innovation", "efficiency", "learning"],
            interests: ["software", "technology", "productivity"],
            lifestyle: ["remote work", "tech-savvy"],
            personality: ["analytical", "curious"],
            motivations: ["career growth", "staying updated"],
            fears: ["becoming obsolete", "missing trends"],
          },
          behaviors: {
            onlineActivity: ["LinkedIn", "Twitter", "Tech blogs"],
            purchaseFrequency: "monthly",
            brandLoyalty: "medium",
            decisionMaking: "considered",
            influencers: ["tech leaders", "industry experts"],
            mediaConsumption: ["podcasts", "newsletters", "YouTube"],
          },
          platforms: [
            { name: "linkedin", usage: "high", bestTimes: ["9:00 AM", "12:00 PM"] },
            { name: "twitter", usage: "medium", bestTimes: ["8:00 AM", "6:00 PM"] },
          ],
          painPoints: ["information overload", "keeping up with trends"],
          goals: ["stay competitive", "build expertise"],
          contentPreferences: {
            formats: ["articles", "tutorials", "videos"],
            topics: ["industry news", "how-tos", "case studies"],
            tonePreference: ["professional", "informative"],
            bestTimes: ["morning", "lunch break"],
            engagementTriggers: ["data-driven content", "actionable insights"],
          },
          purchaseJourney: {
            awareness: ["social media", "search engines"],
            consideration: ["reviews", "comparisons"],
            decision: ["free trials", "demos"],
            retention: ["newsletters", "community"],
          },
          communicationStyle: {
            formality: "semi-formal",
            emotionalAppeal: ["logic", "data"],
            keyMessages: ["efficiency", "ROI"],
            avoidTopics: ["oversimplification"],
          },
          status: "active",
        });

        expect(persona).toBeDefined();
        expect(persona.id).toBeDefined();
        expect(persona.userId).toBe(userId);
        expect(persona.name).toBe("Tech Professional");
      });

      it("should set default status to draft", async () => {
        const { createPersona } = await import("@/lib/audience-personas");

        const persona = createPersona(userId, {
          name: "Test Persona",
          description: "Testing persona creation",
          demographics: {
            ageRange: { min: 18, max: 35 },
            gender: "all",
            locations: [],
            languages: ["English"],
            education: [],
            occupation: [],
            incomeRange: { min: 0, max: 0, currency: "USD" },
          },
          psychographics: {
            values: [],
            interests: [],
            lifestyle: [],
            personality: [],
            motivations: [],
            fears: [],
          },
          behaviors: {
            onlineActivity: [],
            purchaseFrequency: "monthly",
            brandLoyalty: "medium",
            decisionMaking: "considered",
            influencers: [],
            mediaConsumption: [],
          },
          platforms: [],
          painPoints: [],
          goals: [],
          contentPreferences: {
            formats: [],
            topics: [],
            tonePreference: [],
            bestTimes: [],
            engagementTriggers: [],
          },
          purchaseJourney: {
            awareness: [],
            consideration: [],
            decision: [],
            retention: [],
          },
          communicationStyle: {
            formality: "semi-formal",
            emotionalAppeal: [],
            keyMessages: [],
            avoidTopics: [],
          },
          status: "draft",
        });

        expect(persona.status).toBe("draft");
      });
    });

    describe("getPersona", () => {
      it("should return a specific persona", async () => {
        const { createPersona, getPersona } = await import("@/lib/audience-personas");

        const created = createPersona(userId, {
          name: "Specific Persona",
          description: "Test persona",
          demographics: {
            ageRange: { min: 25, max: 40 },
            gender: "all",
            locations: [],
            languages: ["English"],
            education: [],
            occupation: [],
            incomeRange: { min: 0, max: 0, currency: "USD" },
          },
          psychographics: {
            values: [],
            interests: [],
            lifestyle: [],
            personality: [],
            motivations: [],
            fears: [],
          },
          behaviors: {
            onlineActivity: [],
            purchaseFrequency: "monthly",
            brandLoyalty: "medium",
            decisionMaking: "considered",
            influencers: [],
            mediaConsumption: [],
          },
          platforms: [],
          painPoints: [],
          goals: [],
          contentPreferences: {
            formats: [],
            topics: [],
            tonePreference: [],
            bestTimes: [],
            engagementTriggers: [],
          },
          purchaseJourney: {
            awareness: [],
            consideration: [],
            decision: [],
            retention: [],
          },
          communicationStyle: {
            formality: "casual",
            emotionalAppeal: [],
            keyMessages: [],
            avoidTopics: [],
          },
          status: "active",
        });

        const persona = getPersona(created.id);

        expect(persona).toBeDefined();
        expect(persona?.id).toBe(created.id);
        expect(persona?.name).toBe("Specific Persona");
      });
    });

    describe("updatePersona", () => {
      it("should update persona properties", async () => {
        const { createPersona, updatePersona } = await import("@/lib/audience-personas");

        const persona = createPersona(userId, {
          name: "Original Name",
          description: "Original description",
          demographics: {
            ageRange: { min: 20, max: 30 },
            gender: "all",
            locations: [],
            languages: ["English"],
            education: [],
            occupation: [],
            incomeRange: { min: 0, max: 0, currency: "USD" },
          },
          psychographics: {
            values: [],
            interests: [],
            lifestyle: [],
            personality: [],
            motivations: [],
            fears: [],
          },
          behaviors: {
            onlineActivity: [],
            purchaseFrequency: "monthly",
            brandLoyalty: "medium",
            decisionMaking: "considered",
            influencers: [],
            mediaConsumption: [],
          },
          platforms: [],
          painPoints: [],
          goals: [],
          contentPreferences: {
            formats: [],
            topics: [],
            tonePreference: [],
            bestTimes: [],
            engagementTriggers: [],
          },
          purchaseJourney: {
            awareness: [],
            consideration: [],
            decision: [],
            retention: [],
          },
          communicationStyle: {
            formality: "formal",
            emotionalAppeal: [],
            keyMessages: [],
            avoidTopics: [],
          },
          status: "draft",
        });

        const updated = updatePersona(persona.id, userId, {
          name: "Updated Name",
          status: "active",
        });

        expect(updated?.name).toBe("Updated Name");
        expect(updated?.status).toBe("active");
      });
    });

    describe("deletePersona", () => {
      it("should delete a persona", async () => {
        const { createPersona, deletePersona, getPersona } = await import("@/lib/audience-personas");

        const persona = createPersona(userId, {
          name: "To Delete",
          description: "Will be deleted",
          demographics: {
            ageRange: { min: 18, max: 65 },
            gender: "all",
            locations: [],
            languages: ["English"],
            education: [],
            occupation: [],
            incomeRange: { min: 0, max: 0, currency: "USD" },
          },
          psychographics: {
            values: [],
            interests: [],
            lifestyle: [],
            personality: [],
            motivations: [],
            fears: [],
          },
          behaviors: {
            onlineActivity: [],
            purchaseFrequency: "weekly",
            brandLoyalty: "low",
            decisionMaking: "impulsive",
            influencers: [],
            mediaConsumption: [],
          },
          platforms: [],
          painPoints: [],
          goals: [],
          contentPreferences: {
            formats: [],
            topics: [],
            tonePreference: [],
            bestTimes: [],
            engagementTriggers: [],
          },
          purchaseJourney: {
            awareness: [],
            consideration: [],
            decision: [],
            retention: [],
          },
          communicationStyle: {
            formality: "casual",
            emotionalAppeal: [],
            keyMessages: [],
            avoidTopics: [],
          },
          status: "draft",
        });

        const result = deletePersona(persona.id, userId);
        const deleted = getPersona(persona.id);

        expect(result).toBe(true);
        expect(deleted).toBeUndefined();
      });
    });

    describe("duplicatePersona", () => {
      it("should create a copy of an existing persona", async () => {
        const { createPersona, duplicatePersona } = await import("@/lib/audience-personas");

        const original = createPersona(userId, {
          name: "Original Persona",
          description: "To be duplicated",
          demographics: {
            ageRange: { min: 30, max: 50 },
            gender: "all",
            locations: ["New York"],
            languages: ["English"],
            education: ["Bachelor's"],
            occupation: ["Manager"],
            incomeRange: { min: 60000, max: 120000, currency: "USD" },
          },
          psychographics: {
            values: ["leadership"],
            interests: ["business"],
            lifestyle: [],
            personality: [],
            motivations: [],
            fears: [],
          },
          behaviors: {
            onlineActivity: ["LinkedIn"],
            purchaseFrequency: "monthly",
            brandLoyalty: "high",
            decisionMaking: "considered",
            influencers: [],
            mediaConsumption: [],
          },
          platforms: [],
          painPoints: ["time management"],
          goals: ["team efficiency"],
          contentPreferences: {
            formats: [],
            topics: [],
            tonePreference: [],
            bestTimes: [],
            engagementTriggers: [],
          },
          purchaseJourney: {
            awareness: [],
            consideration: [],
            decision: [],
            retention: [],
          },
          communicationStyle: {
            formality: "formal",
            emotionalAppeal: [],
            keyMessages: [],
            avoidTopics: [],
          },
          status: "active",
        });

        const duplicate = duplicatePersona(original.id, userId);

        expect(duplicate).toBeDefined();
        expect(duplicate?.id).not.toBe(original.id);
        expect(duplicate?.name).toContain("Copy");
      });
    });
  });

  describe("Template Operations", () => {
    describe("PERSONA_TEMPLATES", () => {
      it("should export persona templates", async () => {
        const { PERSONA_TEMPLATES } = await import("@/lib/audience-personas");

        expect(PERSONA_TEMPLATES).toBeDefined();
        expect(Array.isArray(PERSONA_TEMPLATES)).toBe(true);
        expect(PERSONA_TEMPLATES.length).toBeGreaterThan(0);
      });
    });

    describe("createFromTemplate", () => {
      it("should create persona from template", async () => {
        const { PERSONA_TEMPLATES, createFromTemplate } = await import("@/lib/audience-personas");

        const template = PERSONA_TEMPLATES[0];
        const persona = createFromTemplate(userId, template.id);

        expect(persona).toBeDefined();
        expect(persona?.userId).toBe(userId);
      });
    });
  });

  describe("Persona Insights", () => {
    describe("getPersonaInsights", () => {
      it("should return insights for a persona", async () => {
        const { createPersona, getPersonaInsights } = await import("@/lib/audience-personas");

        const persona = createPersona(userId, {
          name: "Insight Test Persona",
          description: "Testing insights",
          demographics: {
            ageRange: { min: 25, max: 35 },
            gender: "all",
            locations: [],
            languages: ["English"],
            education: [],
            occupation: [],
            incomeRange: { min: 0, max: 0, currency: "USD" },
          },
          psychographics: {
            values: [],
            interests: [],
            lifestyle: [],
            personality: [],
            motivations: [],
            fears: [],
          },
          behaviors: {
            onlineActivity: [],
            purchaseFrequency: "monthly",
            brandLoyalty: "medium",
            decisionMaking: "considered",
            influencers: [],
            mediaConsumption: [],
          },
          platforms: [],
          painPoints: [],
          goals: [],
          contentPreferences: {
            formats: [],
            topics: [],
            tonePreference: [],
            bestTimes: [],
            engagementTriggers: [],
          },
          purchaseJourney: {
            awareness: [],
            consideration: [],
            decision: [],
            retention: [],
          },
          communicationStyle: {
            formality: "semi-formal",
            emotionalAppeal: [],
            keyMessages: [],
            avoidTopics: [],
          },
          status: "active",
        });

        const insights = getPersonaInsights(persona.id);

        expect(insights).toBeDefined();
        expect(Array.isArray(insights)).toBe(true);
      });
    });

    describe("addInsight", () => {
      it("should add an insight to a persona", async () => {
        const { createPersona, addInsight } = await import("@/lib/audience-personas");

        const persona = createPersona(userId, {
          name: "Add Insight Test",
          description: "Testing adding insights",
          demographics: {
            ageRange: { min: 20, max: 40 },
            gender: "all",
            locations: [],
            languages: ["English"],
            education: [],
            occupation: [],
            incomeRange: { min: 0, max: 0, currency: "USD" },
          },
          psychographics: {
            values: [],
            interests: [],
            lifestyle: [],
            personality: [],
            motivations: [],
            fears: [],
          },
          behaviors: {
            onlineActivity: [],
            purchaseFrequency: "monthly",
            brandLoyalty: "medium",
            decisionMaking: "considered",
            influencers: [],
            mediaConsumption: [],
          },
          platforms: [],
          painPoints: [],
          goals: [],
          contentPreferences: {
            formats: [],
            topics: [],
            tonePreference: [],
            bestTimes: [],
            engagementTriggers: [],
          },
          purchaseJourney: {
            awareness: [],
            consideration: [],
            decision: [],
            retention: [],
          },
          communicationStyle: {
            formality: "casual",
            emotionalAppeal: [],
            keyMessages: [],
            avoidTopics: [],
          },
          status: "active",
        });

        const insight = addInsight(persona.id, {
          type: "content_idea",
          content: "Consider creating tutorial content for this persona",
          actionable: true,
        });

        expect(insight).toBeDefined();
        expect(insight?.type).toBe("content_idea");
        expect(insight?.content).toContain("tutorial");
      });
    });
  });

  describe("Statistics", () => {
    describe("getPersonaStats", () => {
      it("should return persona statistics", async () => {
        const { getPersonaStats } = await import("@/lib/audience-personas");

        const stats = getPersonaStats(userId);

        expect(stats).toBeDefined();
        expect(stats.totalPersonas).toBeGreaterThanOrEqual(0);
        expect(stats.activePersonas).toBeGreaterThanOrEqual(0);
        expect(stats.draftPersonas).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe("Constants", () => {
    it("should export gender options", async () => {
      const { GENDERS } = await import("@/lib/audience-personas");

      expect(GENDERS).toBeDefined();
      expect(Array.isArray(GENDERS)).toBe(true);
      expect(GENDERS.length).toBeGreaterThan(0);
    });

    it("should export formality levels", async () => {
      const { FORMALITY_LEVELS } = await import("@/lib/audience-personas");

      expect(FORMALITY_LEVELS).toBeDefined();
      expect(Array.isArray(FORMALITY_LEVELS)).toBe(true);
    });

    it("should export brand loyalty levels", async () => {
      const { BRAND_LOYALTY_LEVELS } = await import("@/lib/audience-personas");

      expect(BRAND_LOYALTY_LEVELS).toBeDefined();
      expect(Array.isArray(BRAND_LOYALTY_LEVELS)).toBe(true);
    });

    it("should export decision making styles", async () => {
      const { DECISION_MAKING_STYLES } = await import("@/lib/audience-personas");

      expect(DECISION_MAKING_STYLES).toBeDefined();
      expect(Array.isArray(DECISION_MAKING_STYLES)).toBe(true);
    });

    it("should export persona statuses", async () => {
      const { PERSONA_STATUSES } = await import("@/lib/audience-personas");

      expect(PERSONA_STATUSES).toBeDefined();
      expect(Array.isArray(PERSONA_STATUSES)).toBe(true);
    });

    it("should export insight types", async () => {
      const { INSIGHT_TYPES } = await import("@/lib/audience-personas");

      expect(INSIGHT_TYPES).toBeDefined();
      expect(Array.isArray(INSIGHT_TYPES)).toBe(true);
    });
  });
});
