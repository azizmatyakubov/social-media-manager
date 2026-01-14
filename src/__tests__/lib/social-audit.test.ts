import { describe, it, expect, beforeEach } from "@jest/globals";
import { createMockUserId } from "../utils/test-helpers";

describe("Social Media Audit", () => {
  let userId: string;

  beforeEach(() => {
    userId = createMockUserId();
  });

  describe("Audit Operations", () => {
    describe("getUserAudits", () => {
      it("should return audits for a user", async () => {
        const { getUserAudits } = await import("@/lib/social-audit");

        const audits = getUserAudits(userId);

        expect(audits).toBeDefined();
        expect(Array.isArray(audits)).toBe(true);
      });
    });

    describe("startAudit", () => {
      it("should start a new audit", async () => {
        const { startAudit } = await import("@/lib/social-audit");

        const audit = startAudit(userId, {
          platforms: ["instagram", "twitter"],
          includeCompetitors: true,
        });

        expect(audit).toBeDefined();
        expect(audit.id).toBeDefined();
        expect(audit.userId).toBe(userId);
        expect(audit.status).toBe("completed");
        expect(audit.platforms).toContain("instagram");
        expect(audit.platforms).toContain("twitter");
      });

      it("should generate audit score", async () => {
        const { startAudit } = await import("@/lib/social-audit");

        const audit = startAudit(userId, {
          platforms: ["instagram"],
        });

        expect(audit.overallScore).toBeGreaterThanOrEqual(0);
        expect(audit.overallScore).toBeLessThanOrEqual(100);
      });

      it("should generate profile audits for each platform", async () => {
        const { startAudit } = await import("@/lib/social-audit");

        const audit = startAudit(userId, {
          platforms: ["instagram", "linkedin", "twitter"],
        });

        expect(audit.profiles).toHaveLength(3);

        audit.profiles.forEach((profile) => {
          expect(profile.platform).toBeDefined();
          expect(profile.score).toBeGreaterThanOrEqual(0);
          expect(profile.score).toBeLessThanOrEqual(100);
          expect(profile.metrics).toBeDefined();
        });
      });

      it("should generate audit categories", async () => {
        const { startAudit } = await import("@/lib/social-audit");

        const audit = startAudit(userId, {
          platforms: ["instagram"],
        });

        expect(audit.categories).toBeDefined();
        expect(Array.isArray(audit.categories)).toBe(true);
        expect(audit.categories.length).toBeGreaterThan(0);

        audit.categories.forEach((category) => {
          expect(category.name).toBeDefined();
          expect(category.score).toBeGreaterThanOrEqual(0);
          expect(category.score).toBeLessThanOrEqual(100);
          expect(category.weight).toBeGreaterThan(0);
          expect(category.items).toBeDefined();
        });
      });

      it("should identify issues", async () => {
        const { startAudit } = await import("@/lib/social-audit");

        const audit = startAudit(userId, {
          platforms: ["instagram", "twitter"],
        });

        expect(audit.issues).toBeDefined();
        expect(Array.isArray(audit.issues)).toBe(true);

        audit.issues.forEach((issue) => {
          expect(issue.id).toBeDefined();
          expect(["critical", "warning", "info"]).toContain(issue.severity);
          expect(issue.title).toBeDefined();
          expect(issue.description).toBeDefined();
          expect(issue.recommendation).toBeDefined();
        });
      });

      it("should generate action plan", async () => {
        const { startAudit } = await import("@/lib/social-audit");

        const audit = startAudit(userId, {
          platforms: ["instagram"],
        });

        expect(audit.actionPlan).toBeDefined();
        expect(Array.isArray(audit.actionPlan)).toBe(true);

        audit.actionPlan.forEach((action) => {
          expect(action.id).toBeDefined();
          expect(action.title).toBeDefined();
          expect(action.description).toBeDefined();
          expect(["high", "medium", "low"]).toContain(action.priority);
          expect(action.completed).toBe(false);
        });
      });

      it("should include benchmarks", async () => {
        const { startAudit } = await import("@/lib/social-audit");

        const audit = startAudit(userId, {
          platforms: ["instagram"],
        });

        expect(audit.benchmarks).toBeDefined();
        expect(Array.isArray(audit.benchmarks)).toBe(true);

        audit.benchmarks.forEach((benchmark) => {
          expect(benchmark.metric).toBeDefined();
          expect(benchmark.yourValue).toBeGreaterThanOrEqual(0);
          expect(benchmark.industryAvg).toBeGreaterThan(0);
          expect(benchmark.topPerformers).toBeGreaterThan(0);
        });
      });
    });

    describe("getAudit", () => {
      it("should return a specific audit", async () => {
        const { startAudit, getAudit } = await import("@/lib/social-audit");

        const created = startAudit(userId, {
          platforms: ["instagram"],
        });

        const retrieved = getAudit(created.id);

        expect(retrieved).toBeDefined();
        expect(retrieved?.id).toBe(created.id);
      });

      it("should return null for non-existent audit", async () => {
        const { getAudit } = await import("@/lib/social-audit");

        const result = getAudit("non-existent-id");

        expect(result).toBeNull();
      });
    });

    describe("deleteAudit", () => {
      it("should delete an audit", async () => {
        const { startAudit, deleteAudit, getAudit } = await import("@/lib/social-audit");

        const audit = startAudit(userId, {
          platforms: ["twitter"],
        });

        const result = deleteAudit(audit.id, userId);
        const retrieved = getAudit(audit.id);

        expect(result).toBe(true);
        expect(retrieved).toBeNull();
      });

      it("should return false for unauthorized deletion", async () => {
        const { startAudit, deleteAudit } = await import("@/lib/social-audit");

        const audit = startAudit(userId, {
          platforms: ["instagram"],
        });

        const result = deleteAudit(audit.id, "different-user");

        expect(result).toBe(false);
      });
    });
  });

  describe("Action Plan", () => {
    describe("updateActionItem", () => {
      it("should mark action item as completed", async () => {
        const { startAudit, updateActionItem } = await import("@/lib/social-audit");

        const audit = startAudit(userId, {
          platforms: ["instagram"],
        });

        const actionId = audit.actionPlan[0]?.id;
        if (actionId) {
          const updated = updateActionItem(audit.id, actionId, userId, {
            completed: true,
          });

          const action = updated?.actionPlan.find((a) => a.id === actionId);
          expect(action?.completed).toBe(true);
          expect(action?.completedAt).toBeDefined();
        }
      });

      it("should add notes to action item", async () => {
        const { startAudit, updateActionItem } = await import("@/lib/social-audit");

        const audit = startAudit(userId, {
          platforms: ["instagram"],
        });

        const actionId = audit.actionPlan[0]?.id;
        if (actionId) {
          const updated = updateActionItem(audit.id, actionId, userId, {
            notes: "Started working on this",
          });

          const action = updated?.actionPlan.find((a) => a.id === actionId);
          expect(action?.notes).toBe("Started working on this");
        }
      });

      it("should return null for unauthorized update", async () => {
        const { startAudit, updateActionItem } = await import("@/lib/social-audit");

        const audit = startAudit(userId, {
          platforms: ["instagram"],
        });

        const actionId = audit.actionPlan[0]?.id;
        if (actionId) {
          const updated = updateActionItem(audit.id, actionId, "different-user", {
            completed: true,
          });

          expect(updated).toBeNull();
        }
      });
    });
  });

  describe("Templates", () => {
    describe("getAuditTemplates", () => {
      it("should return audit templates", async () => {
        const { getAuditTemplates } = await import("@/lib/social-audit");

        const templates = getAuditTemplates();

        expect(templates).toBeDefined();
        expect(Array.isArray(templates)).toBe(true);
        expect(templates.length).toBeGreaterThan(0);

        templates.forEach((template) => {
          expect(template.id).toBeDefined();
          expect(template.name).toBeDefined();
          expect(template.description).toBeDefined();
          expect(template.platforms).toBeDefined();
        });
      });
    });

    describe("getAuditTemplate", () => {
      it("should return a specific template", async () => {
        const { getAuditTemplates, getAuditTemplate } = await import("@/lib/social-audit");

        const templates = getAuditTemplates();
        if (templates.length > 0) {
          const template = getAuditTemplate(templates[0].id);

          expect(template).toBeDefined();
          expect(template?.id).toBe(templates[0].id);
        }
      });

      it("should return null for non-existent template", async () => {
        const { getAuditTemplate } = await import("@/lib/social-audit");

        const result = getAuditTemplate("non-existent-id");

        expect(result).toBeNull();
      });
    });
  });

  describe("Export", () => {
    describe("exportAuditReport", () => {
      it("should export audit as report string", async () => {
        const { startAudit, exportAuditReport } = await import("@/lib/social-audit");

        const audit = startAudit(userId, {
          platforms: ["instagram"],
        });

        const report = exportAuditReport(audit);

        expect(report).toBeDefined();
        expect(typeof report).toBe("string");
        expect(report.length).toBeGreaterThan(0);
      });

      it("should include audit details in export", async () => {
        const { startAudit, exportAuditReport } = await import("@/lib/social-audit");

        const audit = startAudit(userId, {
          platforms: ["instagram", "twitter"],
        });

        const report = exportAuditReport(audit);

        // Report should contain key audit information
        expect(report).toContain("Score");
      });
    });
  });

  describe("Statistics", () => {
    describe("getAuditStats", () => {
      it("should return audit statistics", async () => {
        const { getAuditStats } = await import("@/lib/social-audit");

        const stats = getAuditStats(userId);

        expect(stats).toBeDefined();
        expect(stats.totalAudits).toBeGreaterThanOrEqual(0);
        expect(stats.avgScore).toBeGreaterThanOrEqual(0);
        expect(stats.avgScore).toBeLessThanOrEqual(100);
        expect(stats.issuesFound).toBeGreaterThanOrEqual(0);
        expect(stats.issuesResolved).toBeGreaterThanOrEqual(0);
        expect(stats.actionsCompleted).toBeGreaterThanOrEqual(0);
        expect(stats.totalActions).toBeGreaterThanOrEqual(0);
      });

      it("should update stats after creating audit", async () => {
        const { getAuditStats, startAudit } = await import("@/lib/social-audit");

        startAudit(userId, {
          platforms: ["instagram"],
        });

        const stats = getAuditStats(userId);

        expect(stats.totalAudits).toBeGreaterThanOrEqual(1);
      });

      it("should track action completion", async () => {
        const { getAuditStats, startAudit, updateActionItem } = await import("@/lib/social-audit");

        const audit = startAudit(userId, {
          platforms: ["instagram"],
        });

        const actionId = audit.actionPlan[0]?.id;
        if (actionId) {
          updateActionItem(audit.id, actionId, userId, { completed: true });
        }

        const stats = getAuditStats(userId);

        expect(stats.actionsCompleted).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe("Constants", () => {
    it("should export audit categories", async () => {
      const { AUDIT_CATEGORIES } = await import("@/lib/social-audit");

      expect(AUDIT_CATEGORIES).toBeDefined();
      expect(Array.isArray(AUDIT_CATEGORIES)).toBe(true);
      expect(AUDIT_CATEGORIES.length).toBeGreaterThan(0);
    });
  });
});
