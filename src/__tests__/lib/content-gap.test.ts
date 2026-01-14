import { describe, it, expect, beforeEach } from "@jest/globals";
import { createMockUserId } from "../utils/test-helpers";

describe("Content Gap Analyzer", () => {
  let userId: string;

  beforeEach(() => {
    userId = createMockUserId();
  });

  describe("Content Gaps", () => {
    describe("getUserContentGaps", () => {
      it("should return content gaps for a user", async () => {
        const { getUserContentGaps } = await import("@/lib/content-gap");

        const gaps = getUserContentGaps(userId);

        expect(gaps).toBeDefined();
        expect(Array.isArray(gaps)).toBe(true);
      });
    });

    describe("createContentGap", () => {
      it("should create a new content gap", async () => {
        const { createContentGap } = await import("@/lib/content-gap");

        const gap = createContentGap(userId, {
          topic: "Product tutorials",
          description: "Lack of video tutorials for product features",
          priority: "high",
          difficulty: "medium",
          category: "education",
          suggestedFormats: ["video", "blog"],
          estimatedImpact: 85,
        });

        expect(gap).toBeDefined();
        expect(gap.id).toBeDefined();
        expect(gap.userId).toBe(userId);
        expect(gap.topic).toBe("Product tutorials");
        expect(gap.priority).toBe("high");
        expect(gap.status).toBe("identified");
      });

      it("should create gap with default values", async () => {
        const { createContentGap } = await import("@/lib/content-gap");

        const gap = createContentGap(userId, {
          topic: "Basic Gap",
          description: "Simple gap",
          priority: "low",
          difficulty: "low",
        });

        expect(gap.status).toBe("identified");
        expect(gap.createdAt).toBeDefined();
      });
    });

    describe("getContentGap", () => {
      it("should return a specific content gap", async () => {
        const { createContentGap, getContentGap } = await import("@/lib/content-gap");

        const created = createContentGap(userId, {
          topic: "Find Me",
          description: "Test gap",
          priority: "medium",
          difficulty: "low",
        });

        const retrieved = getContentGap(created.id);

        expect(retrieved).toBeDefined();
        expect(retrieved?.id).toBe(created.id);
        expect(retrieved?.topic).toBe("Find Me");
      });

      it("should return undefined for non-existent gap", async () => {
        const { getContentGap } = await import("@/lib/content-gap");

        const result = getContentGap("non-existent-id");

        expect(result).toBeUndefined();
      });
    });

    describe("updateContentGap", () => {
      it("should update content gap properties", async () => {
        const { createContentGap, updateContentGap } = await import("@/lib/content-gap");

        const gap = createContentGap(userId, {
          topic: "Original Topic",
          description: "Original description",
          priority: "low",
          difficulty: "low",
        });

        const updated = updateContentGap(gap.id, userId, {
          topic: "Updated Topic",
          priority: "high",
          status: "planned",
        });

        expect(updated?.topic).toBe("Updated Topic");
        expect(updated?.priority).toBe("high");
        expect(updated?.status).toBe("planned");
      });

      it("should update gap status through workflow", async () => {
        const { createContentGap, updateContentGap } = await import("@/lib/content-gap");

        const gap = createContentGap(userId, {
          topic: "Status Test",
          description: "Testing status updates",
          priority: "medium",
          difficulty: "medium",
        });

        // Move through workflow
        let updated = updateContentGap(gap.id, userId, { status: "planned" });
        expect(updated?.status).toBe("planned");

        updated = updateContentGap(gap.id, userId, { status: "in_progress" });
        expect(updated?.status).toBe("in_progress");

        updated = updateContentGap(gap.id, userId, { status: "covered" });
        expect(updated?.status).toBe("covered");
      });
    });

    describe("deleteContentGap", () => {
      it("should delete a content gap", async () => {
        const { createContentGap, deleteContentGap, getContentGap } = await import("@/lib/content-gap");

        const gap = createContentGap(userId, {
          topic: "To Delete",
          description: "Will be deleted",
          priority: "low",
          difficulty: "low",
        });

        const result = deleteContentGap(gap.id, userId);
        const retrieved = getContentGap(gap.id);

        expect(result).toBe(true);
        expect(retrieved).toBeUndefined();
      });

      it("should return false for unauthorized deletion", async () => {
        const { createContentGap, deleteContentGap } = await import("@/lib/content-gap");

        const gap = createContentGap(userId, {
          topic: "Protected Gap",
          description: "Cannot delete",
          priority: "high",
          difficulty: "high",
        });

        const result = deleteContentGap(gap.id, "different-user");

        expect(result).toBe(false);
      });
    });
  });

  describe("Content Analyses", () => {
    describe("getUserAnalyses", () => {
      it("should return analyses for a user", async () => {
        const { getUserAnalyses } = await import("@/lib/content-gap");

        const analyses = getUserAnalyses(userId);

        expect(analyses).toBeDefined();
        expect(Array.isArray(analyses)).toBe(true);
      });
    });

    describe("createAnalysis", () => {
      it("should create a new analysis", async () => {
        const { createAnalysis } = await import("@/lib/content-gap");

        const analysis = createAnalysis(userId, "competitor", {
          platforms: ["instagram", "twitter"],
          competitorIds: ["comp1", "comp2"],
        });

        expect(analysis).toBeDefined();
        expect(analysis.id).toBeDefined();
        expect(analysis.userId).toBe(userId);
        expect(analysis.type).toBe("competitor");
      });

      it("should create self-analysis", async () => {
        const { createAnalysis } = await import("@/lib/content-gap");

        const analysis = createAnalysis(userId, "self");

        expect(analysis).toBeDefined();
        expect(analysis.type).toBe("self");
      });

      it("should create industry analysis", async () => {
        const { createAnalysis } = await import("@/lib/content-gap");

        const analysis = createAnalysis(userId, "industry", {
          industry: "technology",
        });

        expect(analysis).toBeDefined();
        expect(analysis.type).toBe("industry");
      });
    });

    describe("getAnalysis", () => {
      it("should return a specific analysis", async () => {
        const { createAnalysis, getAnalysis } = await import("@/lib/content-gap");

        const created = createAnalysis(userId, "self");
        const retrieved = getAnalysis(created.id);

        expect(retrieved).toBeDefined();
        expect(retrieved?.id).toBe(created.id);
      });
    });

    describe("deleteAnalysis", () => {
      it("should delete an analysis", async () => {
        const { createAnalysis, deleteAnalysis, getAnalysis } = await import("@/lib/content-gap");

        const analysis = createAnalysis(userId, "competitor");
        const result = deleteAnalysis(analysis.id, userId);
        const retrieved = getAnalysis(analysis.id);

        expect(result).toBe(true);
        expect(retrieved).toBeUndefined();
      });
    });
  });

  describe("Gap Reports", () => {
    describe("getUserReports", () => {
      it("should return reports for a user", async () => {
        const { getUserReports } = await import("@/lib/content-gap");

        const reports = getUserReports(userId);

        expect(reports).toBeDefined();
        expect(Array.isArray(reports)).toBe(true);
      });
    });

    describe("generateGapReport", () => {
      it("should generate a gap report", async () => {
        const { generateGapReport, createContentGap } = await import("@/lib/content-gap");

        // Create some gaps first
        createContentGap(userId, {
          topic: "Gap 1",
          description: "First gap",
          priority: "high",
          difficulty: "low",
        });
        createContentGap(userId, {
          topic: "Gap 2",
          description: "Second gap",
          priority: "medium",
          difficulty: "medium",
        });

        const report = await generateGapReport(userId, {
          includeAnalysis: true,
          includeRecommendations: true,
        });

        expect(report).toBeDefined();
        expect(report.id).toBeDefined();
        expect(report.userId).toBe(userId);
        expect(report.summary).toBeDefined();
        expect(report.recommendations).toBeDefined();
      });

      it("should include topic coverage in report", async () => {
        const { generateGapReport } = await import("@/lib/content-gap");

        const report = await generateGapReport(userId, {
          includeAnalysis: true,
        });

        expect(report.topicCoverage).toBeDefined();
        expect(Array.isArray(report.topicCoverage)).toBe(true);
      });

      it("should include format distribution in report", async () => {
        const { generateGapReport } = await import("@/lib/content-gap");

        const report = await generateGapReport(userId, {
          includeAnalysis: true,
        });

        expect(report.formatDistribution).toBeDefined();
        expect(Array.isArray(report.formatDistribution)).toBe(true);
      });
    });

    describe("getReport", () => {
      it("should return a specific report", async () => {
        const { generateGapReport, getReport } = await import("@/lib/content-gap");

        const created = await generateGapReport(userId, {});
        const retrieved = getReport(created.id);

        expect(retrieved).toBeDefined();
        expect(retrieved?.id).toBe(created.id);
      });
    });

    describe("deleteReport", () => {
      it("should delete a report", async () => {
        const { generateGapReport, deleteReport, getReport } = await import("@/lib/content-gap");

        const report = await generateGapReport(userId, {});
        const result = deleteReport(report.id, userId);
        const retrieved = getReport(report.id);

        expect(result).toBe(true);
        expect(retrieved).toBeUndefined();
      });
    });
  });

  describe("Statistics", () => {
    describe("getGapAnalyzerStats", () => {
      it("should return content gap statistics", async () => {
        const { getGapAnalyzerStats } = await import("@/lib/content-gap");

        const stats = getGapAnalyzerStats(userId);

        expect(stats).toBeDefined();
        expect(stats.totalGaps).toBeGreaterThanOrEqual(0);
        expect(stats.byStatus).toBeDefined();
        expect(stats.byPriority).toBeDefined();
        expect(stats.totalAnalyses).toBeGreaterThanOrEqual(0);
        expect(stats.totalReports).toBeGreaterThanOrEqual(0);
      });

      it("should track gaps by status", async () => {
        const { getGapAnalyzerStats, createContentGap, updateContentGap } = await import("@/lib/content-gap");

        const gap = createContentGap(userId, {
          topic: "Status Track",
          description: "Track status",
          priority: "medium",
          difficulty: "medium",
        });

        updateContentGap(gap.id, userId, { status: "covered" });

        const stats = getGapAnalyzerStats(userId);

        expect(stats.byStatus).toBeDefined();
        expect(stats.byStatus.covered).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe("Constants", () => {
    it("should export content categories", async () => {
      const { CONTENT_CATEGORIES } = await import("@/lib/content-gap");

      expect(CONTENT_CATEGORIES).toBeDefined();
      expect(Array.isArray(CONTENT_CATEGORIES)).toBe(true);
      expect(CONTENT_CATEGORIES.length).toBeGreaterThan(0);
    });

    it("should export gap statuses", async () => {
      const { GAP_STATUSES } = await import("@/lib/content-gap");

      expect(GAP_STATUSES).toBeDefined();
      expect(Array.isArray(GAP_STATUSES)).toBe(true);
      expect(GAP_STATUSES).toContain("identified");
      expect(GAP_STATUSES).toContain("planned");
      expect(GAP_STATUSES).toContain("in_progress");
      expect(GAP_STATUSES).toContain("covered");
    });

    it("should export gap priorities", async () => {
      const { GAP_PRIORITIES } = await import("@/lib/content-gap");

      expect(GAP_PRIORITIES).toBeDefined();
      expect(Array.isArray(GAP_PRIORITIES)).toBe(true);
      expect(GAP_PRIORITIES).toContain("low");
      expect(GAP_PRIORITIES).toContain("medium");
      expect(GAP_PRIORITIES).toContain("high");
      expect(GAP_PRIORITIES).toContain("urgent");
    });

    it("should export gap difficulties", async () => {
      const { GAP_DIFFICULTIES } = await import("@/lib/content-gap");

      expect(GAP_DIFFICULTIES).toBeDefined();
      expect(Array.isArray(GAP_DIFFICULTIES)).toBe(true);
      expect(GAP_DIFFICULTIES).toContain("low");
      expect(GAP_DIFFICULTIES).toContain("medium");
      expect(GAP_DIFFICULTIES).toContain("high");
    });

    it("should export analysis types", async () => {
      const { ANALYSIS_TYPES } = await import("@/lib/content-gap");

      expect(ANALYSIS_TYPES).toBeDefined();
      expect(Array.isArray(ANALYSIS_TYPES)).toBe(true);
      expect(ANALYSIS_TYPES).toContain("competitor");
      expect(ANALYSIS_TYPES).toContain("industry");
      expect(ANALYSIS_TYPES).toContain("self");
    });
  });
});
