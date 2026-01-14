import { describe, it, expect, beforeEach } from "@jest/globals";
import { createMockUserId } from "../utils/test-helpers";

describe("Social Media ROI Calculator", () => {
  let userId: string;

  beforeEach(() => {
    userId = createMockUserId();
  });

  describe("ROI Calculations", () => {
    describe("calculateROI", () => {
      it("should calculate basic ROI", async () => {
        const { calculateROI } = await import("@/lib/roi-calculator");

        const investment = {
          adSpend: 5000,
          contentCreation: 0,
          tools: 0,
          labor: 0,
          influencer: 0,
          other: 0,
        };

        const results = {
          impressions: 100000,
          reach: 50000,
          engagement: 5000,
          clicks: 2000,
          leads: 100,
          conversions: 50,
          revenue: 15000,
        };

        const metrics = calculateROI(investment, results);

        expect(metrics).toBeDefined();
        expect(metrics.totalInvestment).toBe(5000);
        expect(metrics.totalRevenue).toBe(15000);
        expect(metrics.roi).toBe(200); // (15000-5000)/5000 * 100
      });

      it("should handle negative ROI", async () => {
        const { calculateROI } = await import("@/lib/roi-calculator");

        const investment = {
          adSpend: 10000,
          contentCreation: 0,
          tools: 0,
          labor: 0,
          influencer: 0,
          other: 0,
        };

        const results = {
          impressions: 50000,
          reach: 25000,
          engagement: 1000,
          clicks: 500,
          leads: 20,
          conversions: 5,
          revenue: 5000,
        };

        const metrics = calculateROI(investment, results);

        expect(metrics.roi).toBe(-50);
      });

      it("should calculate cost per lead", async () => {
        const { calculateROI } = await import("@/lib/roi-calculator");

        const investment = {
          adSpend: 1000,
          contentCreation: 500,
          tools: 200,
          labor: 300,
          influencer: 0,
          other: 0,
        };

        const results = {
          impressions: 50000,
          reach: 25000,
          engagement: 2000,
          clicks: 1000,
          leads: 100,
          conversions: 25,
          revenue: 5000,
        };

        const metrics = calculateROI(investment, results);

        expect(metrics.costPerLead).toBe(20); // 2000/100
        expect(metrics.costPerAcquisition).toBe(80); // 2000/25
      });

      it("should calculate social media value", async () => {
        const { calculateROI } = await import("@/lib/roi-calculator");

        const investment = {
          adSpend: 5000,
          contentCreation: 0,
          tools: 0,
          labor: 0,
          influencer: 0,
          other: 0,
        };

        const results = {
          impressions: 100000,
          reach: 50000,
          engagement: 10000,
          clicks: 5000,
          leads: 200,
          conversions: 50,
          revenue: 10000,
        };

        const metrics = calculateROI(investment, results, 100); // $100 CLV

        expect(metrics.socialMediaValue).toBeGreaterThan(0);
        expect(metrics.customerLifetimeValue).toBe(100);
      });
    });

    describe("calculatePlatformROI", () => {
      it("should calculate ROI grouped by platform", async () => {
        const { calculatePlatformROI, createCampaignROI, getUserCampaignROIs } = await import("@/lib/roi-calculator");

        // Create campaigns for different platforms
        createCampaignROI(userId, {
          name: "Instagram Campaign",
          platform: "instagram",
          investment: 3000,
          revenue: 9000,
          leads: 50,
          conversions: 20,
          startDate: new Date(),
        });

        createCampaignROI(userId, {
          name: "Twitter Campaign",
          platform: "twitter",
          investment: 2000,
          revenue: 4000,
          leads: 30,
          conversions: 10,
          startDate: new Date(),
        });

        const campaigns = getUserCampaignROIs(userId);
        const platformROI = calculatePlatformROI(campaigns);

        expect(platformROI).toBeDefined();
        expect(typeof platformROI).toBe("object");
      });
    });
  });

  describe("ROI Insights", () => {
    describe("getROIInsights", () => {
      it("should generate insights from metrics", async () => {
        const { calculateROI, getROIInsights } = await import("@/lib/roi-calculator");

        const investment = {
          adSpend: 5000,
          contentCreation: 0,
          tools: 0,
          labor: 0,
          influencer: 0,
          other: 0,
        };

        const results = {
          impressions: 100000,
          reach: 50000,
          engagement: 5000,
          clicks: 2000,
          leads: 100,
          conversions: 50,
          revenue: 20000,
        };

        const metrics = calculateROI(investment, results);
        const insights = getROIInsights(metrics);

        expect(insights).toBeDefined();
        expect(insights.summary).toBeDefined();
        expect(Array.isArray(insights.suggestions)).toBe(true);
        expect(insights.healthScore).toBeGreaterThanOrEqual(0);
        expect(insights.healthScore).toBeLessThanOrEqual(100);
      });
    });
  });

  describe("Campaign ROI Management", () => {
    describe("createCampaignROI", () => {
      it("should create a campaign ROI record", async () => {
        const { createCampaignROI } = await import("@/lib/roi-calculator");

        const campaign = createCampaignROI(userId, {
          name: "Q1 Campaign",
          platform: "instagram",
          investment: 5000,
          revenue: 15000,
          leads: 100,
          conversions: 50,
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        });

        expect(campaign).toBeDefined();
        expect(campaign.id).toBeDefined();
        expect(campaign.userId).toBe(userId);
        expect(campaign.name).toBe("Q1 Campaign");
        expect(campaign.platform).toBe("instagram");
      });
    });

    describe("getUserCampaignROIs", () => {
      it("should return campaigns for a user", async () => {
        const { createCampaignROI, getUserCampaignROIs } = await import("@/lib/roi-calculator");

        createCampaignROI(userId, {
          name: "Test Campaign",
          platform: "facebook",
          investment: 1000,
          revenue: 3000,
          leads: 20,
          conversions: 10,
          startDate: new Date(),
        });

        const campaigns = getUserCampaignROIs(userId);

        expect(campaigns).toBeDefined();
        expect(Array.isArray(campaigns)).toBe(true);
        expect(campaigns.length).toBeGreaterThan(0);
      });
    });

    describe("getCampaignROI", () => {
      it("should return a specific campaign", async () => {
        const { createCampaignROI, getCampaignROI } = await import("@/lib/roi-calculator");

        const created = createCampaignROI(userId, {
          name: "Specific Campaign",
          platform: "linkedin",
          investment: 2000,
          revenue: 6000,
          leads: 40,
          conversions: 15,
          startDate: new Date(),
        });

        const campaign = getCampaignROI(created.id, userId);

        expect(campaign).toBeDefined();
        expect(campaign?.id).toBe(created.id);
        expect(campaign?.name).toBe("Specific Campaign");
      });
    });

    describe("updateCampaignROI", () => {
      it("should update campaign data", async () => {
        const { createCampaignROI, updateCampaignROI } = await import("@/lib/roi-calculator");

        const campaign = createCampaignROI(userId, {
          name: "Original Name",
          platform: "instagram",
          investment: 1000,
          revenue: 2000,
          leads: 10,
          conversions: 5,
          startDate: new Date(),
        });

        const updated = updateCampaignROI(campaign.id, userId, {
          name: "Updated Name",
          results: {
            impressions: 50000,
            reach: 25000,
            engagement: 3000,
            clicks: 1500,
            leads: 50,
            conversions: 20,
            revenue: 8000,
          },
        });

        expect(updated?.name).toBe("Updated Name");
        expect(updated?.results.leads).toBe(50);
        expect(updated?.results.revenue).toBe(8000);
      });
    });

    describe("deleteCampaignROI", () => {
      it("should delete a campaign", async () => {
        const { createCampaignROI, deleteCampaignROI, getCampaignROI } = await import("@/lib/roi-calculator");

        const campaign = createCampaignROI(userId, {
          name: "To Delete",
          platform: "twitter",
          investment: 500,
          revenue: 1000,
          leads: 5,
          conversions: 2,
          startDate: new Date(),
        });

        const result = deleteCampaignROI(campaign.id, userId);
        const deleted = getCampaignROI(campaign.id, userId);

        expect(result).toBe(true);
        expect(deleted).toBeNull();
      });
    });
  });

  describe("ROI Goals", () => {
    describe("createROIGoal", () => {
      it("should create an ROI goal", async () => {
        const { createROIGoal } = await import("@/lib/roi-calculator");

        const goal = createROIGoal(userId, {
          name: "Q2 ROI Target",
          type: "roi",
          targetROI: 150,
          deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        });

        expect(goal).toBeDefined();
        expect(goal.id).toBeDefined();
        expect(goal.userId).toBe(userId);
        expect(goal.name).toBe("Q2 ROI Target");
      });
    });

    describe("getUserROIGoals", () => {
      it("should return user goals", async () => {
        const { createROIGoal, getUserROIGoals } = await import("@/lib/roi-calculator");

        createROIGoal(userId, {
          name: "Test Goal",
          type: "revenue",
          targetROI: 100,
        });

        const goals = getUserROIGoals(userId);

        expect(goals).toBeDefined();
        expect(Array.isArray(goals)).toBe(true);
      });
    });

    describe("updateGoalProgress", () => {
      it("should update goal progress", async () => {
        const { createROIGoal, updateGoalProgress } = await import("@/lib/roi-calculator");

        const goal = createROIGoal(userId, {
          name: "Progress Goal",
          type: "roi",
          targetROI: 200,
        });

        const updated = updateGoalProgress(goal.id, userId, 75);

        expect(updated?.currentProgress).toBe(75);
      });
    });

    describe("deleteROIGoal", () => {
      it("should delete a goal", async () => {
        const { createROIGoal, deleteROIGoal, getUserROIGoals } = await import("@/lib/roi-calculator");

        const goal = createROIGoal(userId, {
          name: "To Delete Goal",
          type: "roi",
          targetROI: 100,
        });

        const initialGoals = getUserROIGoals(userId);
        const result = deleteROIGoal(goal.id, userId);
        const afterGoals = getUserROIGoals(userId);

        expect(result).toBe(true);
        expect(afterGoals.length).toBeLessThan(initialGoals.length);
      });
    });
  });

  describe("Constants", () => {
    it("should export industry benchmarks", async () => {
      const { INDUSTRY_BENCHMARKS } = await import("@/lib/roi-calculator");

      expect(INDUSTRY_BENCHMARKS).toBeDefined();
      expect(typeof INDUSTRY_BENCHMARKS).toBe("object");
      expect(Object.keys(INDUSTRY_BENCHMARKS).length).toBeGreaterThan(0);
    });
  });
});
