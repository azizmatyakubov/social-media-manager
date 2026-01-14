import { describe, it, expect, beforeEach } from "@jest/globals";
import { createMockUserId, createFutureDate } from "../utils/test-helpers";

describe("Ad Pricing Calculator", () => {
  let userId: string;

  beforeEach(() => {
    userId = createMockUserId();
  });

  describe("Campaign Operations", () => {
    describe("getUserCampaigns", () => {
      it("should return campaigns for a user", async () => {
        const { getUserCampaigns } = await import("@/lib/ad-pricing");

        const campaigns = getUserCampaigns(userId);

        expect(campaigns).toBeDefined();
        expect(Array.isArray(campaigns)).toBe(true);
      });
    });

    describe("createCampaign", () => {
      it("should create a new ad campaign", async () => {
        const { createCampaign } = await import("@/lib/ad-pricing");

        const startDate = new Date();
        const endDate = createFutureDate(30);

        const campaign = createCampaign(userId, {
          name: "Summer Sale Campaign",
          platform: "instagram",
          objective: "conversions",
          budget: {
            total: 5000,
            daily: 150,
            currency: "USD",
          },
          schedule: {
            startDate,
            endDate,
          },
          targetAudience: {
            ageRange: { min: 25, max: 45 },
            genders: ["all"],
            locations: ["United States"],
            interests: ["shopping", "fashion"],
          },
        });

        expect(campaign).toBeDefined();
        expect(campaign.id).toBeDefined();
        expect(campaign.name).toBe("Summer Sale Campaign");
        expect(campaign.platform).toBe("instagram");
        expect(campaign.budget.total).toBe(5000);
        expect(campaign.status).toBe("draft");
      });

      it("should calculate projections on creation", async () => {
        const { createCampaign } = await import("@/lib/ad-pricing");

        const campaign = createCampaign(userId, {
          name: "Test Campaign",
          platform: "facebook",
          objective: "traffic",
          budget: {
            total: 1000,
            daily: 50,
            currency: "USD",
          },
          schedule: {
            startDate: new Date(),
            endDate: createFutureDate(20),
          },
        });

        expect(campaign.projections).toBeDefined();
        expect(campaign.projections.estimatedReach).toBeGreaterThan(0);
        expect(campaign.projections.estimatedImpressions).toBeGreaterThan(0);
        expect(campaign.projections.estimatedClicks).toBeGreaterThan(0);
      });
    });

    describe("getCampaign", () => {
      it("should return a specific campaign", async () => {
        const { createCampaign, getCampaign } = await import("@/lib/ad-pricing");

        const created = createCampaign(userId, {
          name: "Find Me",
          platform: "twitter",
          objective: "awareness",
          budget: {
            total: 2000,
            daily: 100,
            currency: "USD",
          },
          schedule: {
            startDate: new Date(),
            endDate: createFutureDate(20),
          },
        });

        const retrieved = getCampaign(created.id);

        expect(retrieved).toBeDefined();
        expect(retrieved?.id).toBe(created.id);
      });

      it("should return null for non-existent campaign", async () => {
        const { getCampaign } = await import("@/lib/ad-pricing");

        const result = getCampaign("non-existent-id");

        expect(result).toBeNull();
      });
    });

    describe("updateCampaign", () => {
      it("should update campaign properties", async () => {
        const { createCampaign, updateCampaign } = await import("@/lib/ad-pricing");

        const campaign = createCampaign(userId, {
          name: "Original",
          platform: "linkedin",
          objective: "leads",
          budget: {
            total: 3000,
            daily: 100,
            currency: "USD",
          },
          schedule: {
            startDate: new Date(),
            endDate: createFutureDate(30),
          },
        });

        const updated = updateCampaign(campaign.id, userId, {
          name: "Updated Campaign",
        });

        expect(updated?.name).toBe("Updated Campaign");
      });

      it("should update campaign status", async () => {
        const { createCampaign, updateCampaign } = await import("@/lib/ad-pricing");

        const campaign = createCampaign(userId, {
          name: "Status Test",
          platform: "instagram",
          objective: "conversions",
          budget: {
            total: 1000,
            daily: 50,
            currency: "USD",
          },
          schedule: {
            startDate: new Date(),
            endDate: createFutureDate(20),
          },
        });

        const updated = updateCampaign(campaign.id, userId, {
          status: "active",
        });

        expect(updated?.status).toBe("active");
      });
    });

    describe("deleteCampaign", () => {
      it("should delete a campaign", async () => {
        const { createCampaign, deleteCampaign, getCampaign } = await import("@/lib/ad-pricing");

        const campaign = createCampaign(userId, {
          name: "To Delete",
          platform: "tiktok",
          objective: "engagement",
          budget: {
            total: 500,
            daily: 25,
            currency: "USD",
          },
          schedule: {
            startDate: new Date(),
            endDate: createFutureDate(20),
          },
        });

        const result = deleteCampaign(campaign.id, userId);
        const retrieved = getCampaign(campaign.id);

        expect(result).toBe(true);
        expect(retrieved).toBeNull();
      });
    });
  });

  describe("Budget Recommendations", () => {
    describe("calculateBudgetRecommendation", () => {
      it("should recommend budget based on goals", async () => {
        const { calculateBudgetRecommendation } = await import("@/lib/ad-pricing");

        const recommendation = calculateBudgetRecommendation({
          platform: "instagram",
          objective: "conversions",
          targetReach: 100000,
          targetClicks: 5000,
          duration: 30,
        });

        expect(recommendation).toBeDefined();
        expect(recommendation.recommendedBudget).toBeGreaterThan(0);
        expect(recommendation.recommendedDailyBudget).toBeGreaterThan(0);
        expect(recommendation.confidence).toBeDefined();
        expect(recommendation.breakdown).toBeDefined();
      });

      it("should provide budget for different objectives", async () => {
        const { calculateBudgetRecommendation } = await import("@/lib/ad-pricing");

        const awarenessRec = calculateBudgetRecommendation({
          platform: "facebook",
          objective: "awareness",
          targetReach: 50000,
          duration: 14,
        });

        const conversionsRec = calculateBudgetRecommendation({
          platform: "facebook",
          objective: "conversions",
          targetReach: 50000,
          duration: 14,
        });

        expect(awarenessRec.recommendedBudget).toBeDefined();
        expect(conversionsRec.recommendedBudget).toBeDefined();
      });
    });
  });

  describe("Pricing Scenarios", () => {
    describe("generatePricingScenarios", () => {
      it("should generate multiple pricing scenarios", async () => {
        const { generatePricingScenarios } = await import("@/lib/ad-pricing");

        const scenarios = generatePricingScenarios({
          platform: "facebook",
          objective: "traffic",
          baseBudget: 1000,
          duration: 14,
        });

        expect(scenarios).toBeDefined();
        expect(Array.isArray(scenarios)).toBe(true);
        expect(scenarios.length).toBeGreaterThan(1);

        scenarios.forEach((scenario) => {
          expect(scenario.id).toBeDefined();
          expect(scenario.name).toBeDefined();
          expect(scenario.budget).toBeGreaterThan(0);
          expect(scenario.projections).toBeDefined();
        });
      });

      it("should include conservative and aggressive scenarios", async () => {
        const { generatePricingScenarios } = await import("@/lib/ad-pricing");

        const scenarios = generatePricingScenarios({
          platform: "instagram",
          objective: "conversions",
          baseBudget: 5000,
          duration: 30,
        });

        const budgets = scenarios.map((s) => s.budget);
        const minBudget = Math.min(...budgets);
        const maxBudget = Math.max(...budgets);

        expect(maxBudget).toBeGreaterThan(minBudget);
      });
    });
  });

  describe("Platform Rates", () => {
    describe("getPlatformRates", () => {
      it("should return rates for all platforms", async () => {
        const { getPlatformRates } = await import("@/lib/ad-pricing");

        const rates = getPlatformRates();

        expect(rates).toBeDefined();
        expect(Array.isArray(rates)).toBe(true);
        expect(rates.length).toBeGreaterThan(0);

        rates.forEach((platformRate) => {
          expect(platformRate.platform).toBeDefined();
          expect(platformRate.cpmRange).toBeDefined();
          expect(platformRate.cpcRange).toBeDefined();
          expect(platformRate.ctrAvg).toBeDefined();
        });
      });

      it("should include rates for major platforms", async () => {
        const { getPlatformRates } = await import("@/lib/ad-pricing");

        const rates = getPlatformRates();
        const platforms = rates.map((r) => r.platform);

        expect(platforms).toContain("instagram");
        expect(platforms).toContain("facebook");
        expect(platforms).toContain("twitter");
        expect(platforms).toContain("linkedin");
      });
    });
  });

  describe("Industry Benchmarks", () => {
    describe("getIndustryBenchmarks", () => {
      it("should return benchmarks for all industries", async () => {
        const { getIndustryBenchmarks } = await import("@/lib/ad-pricing");

        const benchmarks = getIndustryBenchmarks();

        expect(benchmarks).toBeDefined();
        expect(Array.isArray(benchmarks)).toBe(true);
        expect(benchmarks.length).toBeGreaterThan(0);

        benchmarks.forEach((benchmark) => {
          expect(benchmark.industry).toBeDefined();
          expect(benchmark.avgCPC).toBeGreaterThan(0);
          expect(benchmark.avgCPM).toBeGreaterThan(0);
          expect(benchmark.avgCTR).toBeGreaterThan(0);
          expect(benchmark.avgConversionRate).toBeGreaterThan(0);
        });
      });

      it("should filter benchmarks by platform", async () => {
        const { getIndustryBenchmarks } = await import("@/lib/ad-pricing");

        const benchmarks = getIndustryBenchmarks("instagram");

        expect(benchmarks).toBeDefined();
        expect(Array.isArray(benchmarks)).toBe(true);
      });

      it("should filter benchmarks by industry", async () => {
        const { getIndustryBenchmarks } = await import("@/lib/ad-pricing");

        const benchmarks = getIndustryBenchmarks(undefined, "technology");

        expect(benchmarks).toBeDefined();
        expect(Array.isArray(benchmarks)).toBe(true);
        benchmarks.forEach((b) => {
          expect(b.industry).toBe("technology");
        });
      });
    });
  });

  describe("Statistics", () => {
    describe("getAdPricingStats", () => {
      it("should return ad pricing statistics", async () => {
        const { getAdPricingStats } = await import("@/lib/ad-pricing");

        const stats = getAdPricingStats(userId);

        expect(stats).toBeDefined();
        expect(stats.totalCampaigns).toBeGreaterThanOrEqual(0);
        expect(stats.activeCampaigns).toBeGreaterThanOrEqual(0);
        expect(stats.totalBudget).toBeGreaterThanOrEqual(0);
        expect(stats.totalSpent).toBeGreaterThanOrEqual(0);
        expect(stats.avgCPC).toBeGreaterThanOrEqual(0);
        expect(stats.avgCPM).toBeGreaterThanOrEqual(0);
        expect(stats.totalReach).toBeGreaterThanOrEqual(0);
        expect(stats.totalClicks).toBeGreaterThanOrEqual(0);
      });

      it("should update stats after creating campaigns", async () => {
        const { getAdPricingStats, createCampaign } = await import("@/lib/ad-pricing");

        createCampaign(userId, {
          name: "Stats Test",
          platform: "instagram",
          objective: "awareness",
          budget: {
            total: 1000,
            daily: 50,
            currency: "USD",
          },
          schedule: {
            startDate: new Date(),
            endDate: createFutureDate(20),
          },
        });

        const stats = getAdPricingStats(userId);

        expect(stats.totalCampaigns).toBeGreaterThanOrEqual(1);
        expect(stats.totalBudget).toBeGreaterThanOrEqual(1000);
      });
    });
  });

  describe("Constants", () => {
    it("should export ad objectives", async () => {
      const { AD_OBJECTIVES } = await import("@/lib/ad-pricing");

      expect(AD_OBJECTIVES).toBeDefined();
      expect(Array.isArray(AD_OBJECTIVES)).toBe(true);
      expect(AD_OBJECTIVES.length).toBeGreaterThan(0);

      AD_OBJECTIVES.forEach((obj) => {
        expect(obj.value).toBeDefined();
        expect(obj.label).toBeDefined();
        expect(obj.description).toBeDefined();
      });

      const values = AD_OBJECTIVES.map((o) => o.value);
      expect(values).toContain("awareness");
      expect(values).toContain("traffic");
      expect(values).toContain("engagement");
      expect(values).toContain("leads");
      expect(values).toContain("conversions");
    });

    it("should export industries", async () => {
      const { INDUSTRIES } = await import("@/lib/ad-pricing");

      expect(INDUSTRIES).toBeDefined();
      expect(Array.isArray(INDUSTRIES)).toBe(true);
      expect(INDUSTRIES.length).toBeGreaterThan(0);
    });
  });
});
