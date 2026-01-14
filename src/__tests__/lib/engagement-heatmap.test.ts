import { describe, it, expect, beforeEach } from "@jest/globals";
import { createMockUserId } from "../utils/test-helpers";

describe("Engagement Heatmap", () => {
  let userId: string;

  beforeEach(() => {
    userId = createMockUserId();
  });

  describe("getEngagementAnalytics", () => {
    it("should return analytics for a user and platform", async () => {
      const { getEngagementAnalytics } = await import("@/lib/engagement-heatmap");

      const analytics = getEngagementAnalytics(userId, "instagram", "30d");

      expect(analytics).toBeDefined();
      expect(analytics.platform).toBe("instagram");
      expect(analytics.period).toBe("30d");
      expect(analytics.heatmapData).toBeDefined();
      expect(Array.isArray(analytics.heatmapData)).toBe(true);
    });

    it("should generate heatmap data with correct structure", async () => {
      const { getEngagementAnalytics } = await import("@/lib/engagement-heatmap");

      const analytics = getEngagementAnalytics(userId, "twitter", "7d");

      expect(analytics.heatmapData.length).toBeGreaterThan(0);
      analytics.heatmapData.forEach((cell) => {
        expect(cell.hour).toBeGreaterThanOrEqual(0);
        expect(cell.hour).toBeLessThan(24);
        expect(cell.day).toBeGreaterThanOrEqual(0);
        expect(cell.day).toBeLessThan(7);
        expect(cell.value).toBeGreaterThanOrEqual(0);
        expect(cell.posts).toBeGreaterThanOrEqual(0);
        expect(cell.avgLikes).toBeGreaterThanOrEqual(0);
        expect(cell.avgComments).toBeGreaterThanOrEqual(0);
        expect(cell.avgShares).toBeGreaterThanOrEqual(0);
        expect(cell.avgReach).toBeGreaterThanOrEqual(0);
      });
    });

    it("should generate best times list", async () => {
      const { getEngagementAnalytics } = await import("@/lib/engagement-heatmap");

      const analytics = getEngagementAnalytics(userId, "linkedin", "30d");

      expect(analytics.bestTimes).toBeDefined();
      expect(Array.isArray(analytics.bestTimes)).toBe(true);
      expect(analytics.bestTimes.length).toBeGreaterThan(0);

      analytics.bestTimes.forEach((time) => {
        expect(time.day).toBeDefined();
        expect(time.hour).toBeDefined();
        expect(time.score).toBeGreaterThanOrEqual(0);
        expect(time.avgEngagement).toBeGreaterThanOrEqual(0);
        expect(["high", "medium", "low"]).toContain(time.confidence);
      });
    });

    it("should generate worst times list", async () => {
      const { getEngagementAnalytics } = await import("@/lib/engagement-heatmap");

      const analytics = getEngagementAnalytics(userId, "facebook", "30d");

      expect(analytics.worstTimes).toBeDefined();
      expect(Array.isArray(analytics.worstTimes)).toBe(true);
      expect(analytics.worstTimes.length).toBeGreaterThan(0);
    });

    it("should generate insights", async () => {
      const { getEngagementAnalytics } = await import("@/lib/engagement-heatmap");

      const analytics = getEngagementAnalytics(userId, "instagram", "30d");

      expect(analytics.insights).toBeDefined();
      expect(Array.isArray(analytics.insights)).toBe(true);

      analytics.insights.forEach((insight) => {
        expect(insight.id).toBeDefined();
        expect(["peak", "trend", "anomaly", "recommendation"]).toContain(insight.type);
        expect(insight.title).toBeDefined();
        expect(insight.description).toBeDefined();
        expect(typeof insight.actionable).toBe("boolean");
        expect(["high", "medium", "low"]).toContain(insight.impact);
      });
    });

    it("should generate summary with correct structure", async () => {
      const { getEngagementAnalytics } = await import("@/lib/engagement-heatmap");

      const analytics = getEngagementAnalytics(userId, "tiktok", "30d");

      expect(analytics.summary).toBeDefined();
      expect(analytics.summary.totalPosts).toBeGreaterThanOrEqual(0);
      expect(analytics.summary.totalEngagements).toBeGreaterThanOrEqual(0);
      expect(analytics.summary.avgEngagementRate).toBeGreaterThanOrEqual(0);
      expect(analytics.summary.peakDay).toBeDefined();
      expect(analytics.summary.peakHour).toBeDefined();
      expect(analytics.summary.lowestDay).toBeDefined();
      expect(analytics.summary.lowestHour).toBeDefined();
      expect(analytics.summary.weekdayVsWeekend).toBeDefined();
      expect(analytics.summary.morningVsEvening).toBeDefined();
    });
  });

  describe("getAllPlatformAnalytics", () => {
    it("should return analytics for all platforms", async () => {
      const { getAllPlatformAnalytics } = await import("@/lib/engagement-heatmap");

      const allAnalytics = getAllPlatformAnalytics(userId);

      expect(allAnalytics).toBeDefined();
      expect(Array.isArray(allAnalytics)).toBe(true);
      expect(allAnalytics.length).toBeGreaterThan(0);

      allAnalytics.forEach((analytics) => {
        expect(analytics.platform).toBeDefined();
        expect(analytics.heatmapData).toBeDefined();
      });
    });
  });

  describe("getHeatmapComparison", () => {
    it("should compare heatmaps between two periods", async () => {
      const { getHeatmapComparison } = await import("@/lib/engagement-heatmap");

      const comparison = getHeatmapComparison(userId, "instagram", "7d", "30d");

      expect(comparison).toBeDefined();
      expect(comparison.platform).toBe("instagram");
      expect(comparison.period1).toBeDefined();
      expect(comparison.period2).toBeDefined();
      expect(comparison.changes).toBeDefined();
    });
  });

  describe("getOptimalPostingSchedule", () => {
    it("should return optimal posting schedule", async () => {
      const { getOptimalPostingSchedule } = await import("@/lib/engagement-heatmap");

      const schedule = getOptimalPostingSchedule(userId, "instagram");

      expect(schedule).toBeDefined();
      expect(schedule.slots).toBeDefined();
      expect(Array.isArray(schedule.slots)).toBe(true);
      expect(schedule.weeklyPlan).toBeDefined();
    });

    it("should include time slots with proper structure", async () => {
      const { getOptimalPostingSchedule } = await import("@/lib/engagement-heatmap");

      const schedule = getOptimalPostingSchedule(userId, "twitter");

      schedule.slots.forEach((slot) => {
        expect(slot.day).toBeDefined();
        expect(slot.hour).toBeDefined();
        expect(slot.score).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe("getEngagementStats", () => {
    it("should return engagement statistics", async () => {
      const { getEngagementStats } = await import("@/lib/engagement-heatmap");

      const stats = getEngagementStats(userId);

      expect(stats).toBeDefined();
      expect(stats.overallScore).toBeGreaterThanOrEqual(0);
      expect(stats.platformBreakdown).toBeDefined();
      expect(stats.weeklyTrend).toBeDefined();
    });
  });

  describe("Constants", () => {
    it("should export PLATFORMS constant", async () => {
      const { PLATFORMS } = await import("@/lib/engagement-heatmap");

      expect(PLATFORMS).toBeDefined();
      expect(Array.isArray(PLATFORMS)).toBe(true);
      expect(PLATFORMS.length).toBeGreaterThan(0);
    });

    it("should export PERIODS constant", async () => {
      const { PERIODS } = await import("@/lib/engagement-heatmap");

      expect(PERIODS).toBeDefined();
      expect(Array.isArray(PERIODS)).toBe(true);
    });
  });
});
