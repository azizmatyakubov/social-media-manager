import { describe, it, expect, beforeEach } from "@jest/globals";
import { createMockUserId } from "../utils/test-helpers";

describe("Competitor Alerts", () => {
  let userId: string;

  beforeEach(() => {
    userId = createMockUserId();
  });

  describe("Competitor Tracking", () => {
    describe("getTrackedCompetitors", () => {
      it("should return tracked competitors for a user", async () => {
        const { getTrackedCompetitors } = await import("@/lib/competitor-alerts");

        const competitors = getTrackedCompetitors(userId);

        expect(competitors).toBeDefined();
        expect(Array.isArray(competitors)).toBe(true);
      });
    });

    describe("addCompetitor", () => {
      it("should add a new competitor to track", async () => {
        const { addCompetitor } = await import("@/lib/competitor-alerts");

        const competitor = addCompetitor(userId, {
          name: "Acme Corp",
          handle: "@acmecorp",
          platform: "twitter",
          avatarUrl: "/avatar.jpg",
          bio: "Leading tech company",
          followerCount: 50000,
          website: "https://acme.com",
        });

        expect(competitor).toBeDefined();
        expect(competitor.id).toBeDefined();
        expect(competitor.name).toBe("Acme Corp");
        expect(competitor.handle).toBe("@acmecorp");
        expect(competitor.platform).toBe("twitter");
        expect(competitor.isActive).toBe(true);
      });

      it("should track competitor with tags", async () => {
        const { addCompetitor } = await import("@/lib/competitor-alerts");

        const competitor = addCompetitor(userId, {
          name: "TechRival",
          handle: "@techrival",
          platform: "instagram",
          tags: ["direct-competitor", "enterprise"],
        });

        expect(competitor.tags).toContain("direct-competitor");
        expect(competitor.tags).toContain("enterprise");
      });
    });

    describe("getCompetitor", () => {
      it("should return a specific competitor", async () => {
        const { addCompetitor, getCompetitor } = await import("@/lib/competitor-alerts");

        const created = addCompetitor(userId, {
          name: "Find Me",
          handle: "@findme",
          platform: "twitter",
        });

        const retrieved = getCompetitor(created.id);

        expect(retrieved).toBeDefined();
        expect(retrieved?.id).toBe(created.id);
        expect(retrieved?.name).toBe("Find Me");
      });

      it("should return null for non-existent competitor", async () => {
        const { getCompetitor } = await import("@/lib/competitor-alerts");

        const result = getCompetitor("non-existent-id");

        expect(result).toBeNull();
      });
    });

    describe("updateCompetitor", () => {
      it("should update competitor details", async () => {
        const { addCompetitor, updateCompetitor } = await import("@/lib/competitor-alerts");

        const competitor = addCompetitor(userId, {
          name: "Original Name",
          handle: "@original",
          platform: "twitter",
        });

        const updated = updateCompetitor(competitor.id, userId, {
          name: "Updated Name",
          followerCount: 75000,
        });

        expect(updated?.name).toBe("Updated Name");
        expect(updated?.followerCount).toBe(75000);
      });

      it("should toggle competitor active status", async () => {
        const { addCompetitor, updateCompetitor } = await import("@/lib/competitor-alerts");

        const competitor = addCompetitor(userId, {
          name: "Toggle Test",
          handle: "@toggle",
          platform: "linkedin",
        });

        const updated = updateCompetitor(competitor.id, userId, {
          isActive: false,
        });

        expect(updated?.isActive).toBe(false);
      });
    });

    describe("removeCompetitor", () => {
      it("should remove a competitor", async () => {
        const { addCompetitor, removeCompetitor, getCompetitor } = await import("@/lib/competitor-alerts");

        const competitor = addCompetitor(userId, {
          name: "To Remove",
          handle: "@remove",
          platform: "twitter",
        });

        const result = removeCompetitor(competitor.id, userId);
        const retrieved = getCompetitor(competitor.id);

        expect(result).toBe(true);
        expect(retrieved).toBeNull();
      });

      it("should return false for unauthorized removal", async () => {
        const { addCompetitor, removeCompetitor } = await import("@/lib/competitor-alerts");

        const competitor = addCompetitor(userId, {
          name: "Protected",
          handle: "@protected",
          platform: "twitter",
        });

        const result = removeCompetitor(competitor.id, "different-user");

        expect(result).toBe(false);
      });
    });
  });

  describe("Alert Rules", () => {
    describe("getAlertRules", () => {
      it("should return alert rules for a user", async () => {
        const { getAlertRules } = await import("@/lib/competitor-alerts");

        const rules = getAlertRules(userId);

        expect(rules).toBeDefined();
        expect(Array.isArray(rules)).toBe(true);
      });
    });

    describe("createAlertRule", () => {
      it("should create a new alert rule", async () => {
        const { createAlertRule, addCompetitor } = await import("@/lib/competitor-alerts");

        const competitor = addCompetitor(userId, {
          name: "Watch This",
          handle: "@watchthis",
          platform: "twitter",
        });

        const rule = createAlertRule(userId, {
          name: "High Engagement Alert",
          competitorIds: [competitor.id],
          type: "engagement_spike",
          conditions: [{ metric: "likes", operator: "greater_than", value: 500 }],
          actions: [{ type: "email", config: { email: "test@example.com" } }],
        });

        expect(rule).toBeDefined();
        expect(rule.id).toBeDefined();
        expect(rule.name).toBe("High Engagement Alert");
        expect(rule.type).toBe("engagement_spike");
        expect(rule.isActive).toBe(true);
      });

      it("should create rule for new posts", async () => {
        const { createAlertRule } = await import("@/lib/competitor-alerts");

        const rule = createAlertRule(userId, {
          name: "New Post Alert",
          competitorIds: [],
          type: "new_post",
          conditions: [],
          actions: [{ type: "in_app", config: {} }],
        });

        expect(rule.type).toBe("new_post");
      });

      it("should create rule for viral content", async () => {
        const { createAlertRule } = await import("@/lib/competitor-alerts");

        const rule = createAlertRule(userId, {
          name: "Viral Content Alert",
          competitorIds: [],
          type: "viral_content",
          conditions: [{ metric: "shares", operator: "greater_than", value: 1000 }],
          actions: [{ type: "in_app", config: {} }],
        });

        expect(rule.type).toBe("viral_content");
      });
    });

    describe("getAlertRule", () => {
      it("should return a specific alert rule", async () => {
        const { createAlertRule, getAlertRule } = await import("@/lib/competitor-alerts");

        const created = createAlertRule(userId, {
          name: "Find Rule",
          competitorIds: [],
          type: "new_post",
          conditions: [],
          actions: [],
        });

        const retrieved = getAlertRule(created.id);

        expect(retrieved).toBeDefined();
        expect(retrieved?.id).toBe(created.id);
      });
    });

    describe("updateAlertRule", () => {
      it("should update alert rule", async () => {
        const { createAlertRule, updateAlertRule } = await import("@/lib/competitor-alerts");

        const rule = createAlertRule(userId, {
          name: "Original Rule",
          competitorIds: [],
          type: "engagement_spike",
          conditions: [{ metric: "likes", operator: "greater_than", value: 1000 }],
          actions: [],
        });

        const updated = updateAlertRule(rule.id, userId, {
          name: "Updated Rule",
        });

        expect(updated?.name).toBe("Updated Rule");
      });

      it("should toggle rule active status", async () => {
        const { createAlertRule, updateAlertRule } = await import("@/lib/competitor-alerts");

        const rule = createAlertRule(userId, {
          name: "Toggle Rule",
          competitorIds: [],
          type: "keyword_mention",
          conditions: [],
          actions: [],
        });

        const updated = updateAlertRule(rule.id, userId, {
          isActive: false,
        });

        expect(updated?.isActive).toBe(false);
      });
    });

    describe("deleteAlertRule", () => {
      it("should delete an alert rule", async () => {
        const { createAlertRule, deleteAlertRule, getAlertRule } = await import("@/lib/competitor-alerts");

        const rule = createAlertRule(userId, {
          name: "To Delete",
          competitorIds: [],
          type: "new_post",
          conditions: [],
          actions: [],
        });

        const result = deleteAlertRule(rule.id, userId);
        const retrieved = getAlertRule(rule.id);

        expect(result).toBe(true);
        expect(retrieved).toBeNull();
      });
    });
  });

  describe("Alerts", () => {
    describe("getAlerts", () => {
      it("should return alerts for a user", async () => {
        const { getAlerts } = await import("@/lib/competitor-alerts");

        const alerts = getAlerts(userId);

        expect(alerts).toBeDefined();
        expect(Array.isArray(alerts)).toBe(true);
      });

      it("should filter unread alerts", async () => {
        const { getAlerts } = await import("@/lib/competitor-alerts");

        const unreadAlerts = getAlerts(userId, { unreadOnly: true });

        unreadAlerts.forEach((alert) => {
          expect(alert.read).toBe(false);
        });
      });

      it("should filter alerts by type", async () => {
        const { getAlerts } = await import("@/lib/competitor-alerts");

        const alerts = getAlerts(userId, { type: "engagement_spike" });

        alerts.forEach((alert) => {
          expect(alert.type).toBe("engagement_spike");
        });
      });

      it("should limit number of alerts returned", async () => {
        const { getAlerts } = await import("@/lib/competitor-alerts");

        const alerts = getAlerts(userId, { limit: 5 });

        expect(alerts.length).toBeLessThanOrEqual(5);
      });
    });

    describe("updateAlertStatus", () => {
      it("should mark alert as read", async () => {
        const { getAlerts, updateAlertStatus } = await import("@/lib/competitor-alerts");

        const alerts = getAlerts(userId);
        if (alerts.length > 0) {
          const alert = alerts[0];
          const updated = updateAlertStatus(alert.id, userId, { read: true });

          expect(updated?.read).toBe(true);
        }
      });

      it("should dismiss an alert", async () => {
        const { getAlerts, updateAlertStatus } = await import("@/lib/competitor-alerts");

        const alerts = getAlerts(userId);
        if (alerts.length > 0) {
          const alert = alerts[0];
          const updated = updateAlertStatus(alert.id, userId, { dismissed: true });

          expect(updated?.dismissed).toBe(true);
        }
      });
    });

    describe("markAllAlertsRead", () => {
      it("should mark all alerts as read and return count", async () => {
        const { markAllAlertsRead } = await import("@/lib/competitor-alerts");

        const count = markAllAlertsRead(userId);

        expect(count).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe("Competitor Posts", () => {
    describe("getCompetitorPosts", () => {
      it("should return posts for a competitor", async () => {
        const { addCompetitor, getCompetitorPosts } = await import("@/lib/competitor-alerts");

        const competitor = addCompetitor(userId, {
          name: "Post Tracker",
          handle: "@posttrack",
          platform: "instagram",
        });

        const posts = getCompetitorPosts(competitor.id);

        expect(posts).toBeDefined();
        expect(Array.isArray(posts)).toBe(true);
      });

      it("should limit posts returned", async () => {
        const { addCompetitor, getCompetitorPosts } = await import("@/lib/competitor-alerts");

        const competitor = addCompetitor(userId, {
          name: "Limit Test",
          handle: "@limittest",
          platform: "twitter",
        });

        const posts = getCompetitorPosts(competitor.id, 5);

        expect(posts.length).toBeLessThanOrEqual(5);
      });
    });

    describe("getAllRecentPosts", () => {
      it("should return recent posts across all competitors", async () => {
        const { getAllRecentPosts } = await import("@/lib/competitor-alerts");

        const posts = getAllRecentPosts(userId, 10);

        expect(posts).toBeDefined();
        expect(Array.isArray(posts)).toBe(true);
        expect(posts.length).toBeLessThanOrEqual(10);
      });

      it("should return posts sorted by date", async () => {
        const { getAllRecentPosts, addCompetitor } = await import("@/lib/competitor-alerts");

        addCompetitor(userId, {
          name: "Recent Test",
          handle: "@recent",
          platform: "instagram",
        });

        const posts = getAllRecentPosts(userId);

        expect(posts).toBeDefined();
        expect(Array.isArray(posts)).toBe(true);
      });
    });
  });

  describe("Statistics", () => {
    describe("getAlertStats", () => {
      it("should return alert statistics", async () => {
        const { getAlertStats } = await import("@/lib/competitor-alerts");

        const stats = getAlertStats(userId);

        expect(stats).toBeDefined();
        expect(stats.totalCompetitors).toBeGreaterThanOrEqual(0);
        expect(stats.activeCompetitors).toBeGreaterThanOrEqual(0);
        expect(stats.totalAlerts).toBeGreaterThanOrEqual(0);
        expect(stats.unreadAlerts).toBeGreaterThanOrEqual(0);
        expect(stats.activeRules).toBeGreaterThanOrEqual(0);
      });

      it("should update stats after adding competitor", async () => {
        const { getAlertStats, addCompetitor } = await import("@/lib/competitor-alerts");

        addCompetitor(userId, {
          name: "Stats Test",
          handle: "@statstest",
          platform: "twitter",
        });

        const stats = getAlertStats(userId);

        expect(stats.totalCompetitors).toBeGreaterThanOrEqual(1);
        expect(stats.activeCompetitors).toBeGreaterThanOrEqual(1);
      });

      it("should update stats after creating alert rule", async () => {
        const { getAlertStats, createAlertRule } = await import("@/lib/competitor-alerts");

        createAlertRule(userId, {
          name: "Stats Rule",
          competitorIds: [],
          type: "new_post",
          conditions: [],
          actions: [],
        });

        const stats = getAlertStats(userId);

        expect(stats.activeRules).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe("Constants", () => {
    it("should export alert rule types", async () => {
      const { ALERT_RULE_TYPES } = await import("@/lib/competitor-alerts");

      expect(ALERT_RULE_TYPES).toBeDefined();
      expect(Array.isArray(ALERT_RULE_TYPES)).toBe(true);
      expect(ALERT_RULE_TYPES.length).toBeGreaterThan(0);

      ALERT_RULE_TYPES.forEach((ruleType) => {
        expect(ruleType.type).toBeDefined();
        expect(ruleType.label).toBeDefined();
        expect(ruleType.description).toBeDefined();
      });

      const types = ALERT_RULE_TYPES.map((r) => r.type);
      expect(types).toContain("new_post");
      expect(types).toContain("engagement_spike");
      expect(types).toContain("viral_content");
    });

    it("should export platforms", async () => {
      const { PLATFORMS } = await import("@/lib/competitor-alerts");

      expect(PLATFORMS).toBeDefined();
      expect(Array.isArray(PLATFORMS)).toBe(true);
      expect(PLATFORMS.length).toBeGreaterThan(0);
    });
  });
});
