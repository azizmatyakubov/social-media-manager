import { describe, it, expect, beforeEach } from "@jest/globals";
import { createMockUserId } from "../utils/test-helpers";

describe("Crisis Management Alert System", () => {
  let userId: string;

  beforeEach(() => {
    userId = createMockUserId();
  });

  describe("Alert Rules", () => {
    describe("getUserAlertRules", () => {
      it("should return alert rules for a user", async () => {
        const { getUserAlertRules } = await import("@/lib/crisis-management");

        const rules = getUserAlertRules(userId);

        expect(rules).toBeDefined();
        expect(Array.isArray(rules)).toBe(true);
      });
    });

    describe("createAlertRule", () => {
      it("should create a new alert rule", async () => {
        const { createAlertRule } = await import("@/lib/crisis-management");

        const rule = createAlertRule(userId, {
          name: "Negative Sentiment Alert",
          type: "sentiment_drop",
          conditions: [{ field: "sentiment", operator: "less_than", value: -0.5 }],
          severity: "high",
          platforms: ["twitter", "facebook"],
          isEnabled: true,
          autoRespond: false,
        });

        expect(rule).toBeDefined();
        expect(rule.id).toBeDefined();
        expect(rule.userId).toBe(userId);
        expect(rule.name).toBe("Negative Sentiment Alert");
        expect(rule.severity).toBe("high");
        expect(rule.isEnabled).toBe(true);
      });

      it("should create alert rule with auto-respond", async () => {
        const { createAlertRule } = await import("@/lib/crisis-management");

        const rule = createAlertRule(userId, {
          name: "Auto Response Rule",
          type: "mention_spike",
          conditions: [],
          severity: "medium",
          platforms: ["instagram"],
          isEnabled: true,
          autoRespond: true,
        });

        expect(rule.autoRespond).toBe(true);
      });
    });

    describe("updateAlertRule", () => {
      it("should update alert rule", async () => {
        const { createAlertRule, updateAlertRule } = await import("@/lib/crisis-management");

        const rule = createAlertRule(userId, {
          name: "Original Rule",
          type: "keyword_detection",
          conditions: [],
          severity: "low",
          platforms: [],
          isEnabled: true,
          autoRespond: false,
        });

        const updated = updateAlertRule(rule.id, userId, {
          name: "Updated Rule",
          severity: "high",
        });

        expect(updated?.name).toBe("Updated Rule");
        expect(updated?.severity).toBe("high");
      });

      it("should toggle rule enabled status", async () => {
        const { createAlertRule, updateAlertRule } = await import("@/lib/crisis-management");

        const rule = createAlertRule(userId, {
          name: "Toggle Test",
          type: "negative_review",
          conditions: [],
          severity: "medium",
          platforms: [],
          isEnabled: true,
          autoRespond: false,
        });

        const updated = updateAlertRule(rule.id, userId, {
          isEnabled: false,
        });

        expect(updated?.isEnabled).toBe(false);
      });
    });

    describe("deleteAlertRule", () => {
      it("should delete an alert rule", async () => {
        const { createAlertRule, deleteAlertRule, getUserAlertRules } = await import("@/lib/crisis-management");

        const rule = createAlertRule(userId, {
          name: "To Delete",
          type: "brand_mention",
          conditions: [],
          severity: "low",
          platforms: [],
          isEnabled: true,
          autoRespond: false,
        });

        const initialCount = getUserAlertRules(userId).length;
        const result = deleteAlertRule(rule.id, userId);
        const afterCount = getUserAlertRules(userId).length;

        expect(result).toBe(true);
        expect(afterCount).toBeLessThan(initialCount);
      });
    });
  });

  describe("Crisis Alerts", () => {
    describe("getUserCrisisAlerts", () => {
      it("should return crisis alerts for a user", async () => {
        const { getUserCrisisAlerts } = await import("@/lib/crisis-management");

        const alerts = getUserCrisisAlerts(userId);

        expect(alerts).toBeDefined();
        expect(Array.isArray(alerts)).toBe(true);
      });
    });

    describe("createCrisisAlert", () => {
      it("should create a new crisis alert", async () => {
        const { createCrisisAlert } = await import("@/lib/crisis-management");

        const alert = createCrisisAlert(userId, {
          type: "negative_mention",
          severity: "high",
          platform: "twitter",
          title: "Negative viral tweet",
          description: "A negative tweet about our brand is going viral",
          sourceContent: "@brand your product is terrible!",
          sourceUrl: "https://twitter.com/user/status/123",
          sourceAuthor: "@angryuser",
          affectedAccounts: ["main_account"],
        });

        expect(alert).toBeDefined();
        expect(alert.id).toBeDefined();
        expect(alert.userId).toBe(userId);
        expect(alert.type).toBe("negative_mention");
        expect(alert.severity).toBe("high");
        expect(alert.status).toBe("new");
      });
    });

    describe("getCrisisAlert", () => {
      it("should return a specific crisis alert", async () => {
        const { createCrisisAlert, getCrisisAlert } = await import("@/lib/crisis-management");

        const created = createCrisisAlert(userId, {
          type: "pr_crisis",
          severity: "critical",
          platform: "facebook",
          title: "PR Crisis",
          description: "Major PR issue detected",
          affectedAccounts: [],
        });

        const alert = getCrisisAlert(created.id, userId);

        expect(alert).toBeDefined();
        expect(alert?.id).toBe(created.id);
        expect(alert?.title).toBe("PR Crisis");
      });
    });

    describe("updateCrisisAlert", () => {
      it("should update crisis alert status", async () => {
        const { createCrisisAlert, updateCrisisAlert } = await import("@/lib/crisis-management");

        const alert = createCrisisAlert(userId, {
          type: "complaint_surge",
          severity: "medium",
          platform: "instagram",
          title: "Complaint Surge",
          description: "Increased complaints detected",
          affectedAccounts: [],
        });

        const updated = updateCrisisAlert(alert.id, userId, {
          status: "investigating",
          assignedTo: "crisis-team",
        });

        expect(updated?.status).toBe("investigating");
        expect(updated?.assignedTo).toBe("crisis-team");
      });
    });

    describe("addCrisisNote", () => {
      it("should add a note to a crisis alert", async () => {
        const { createCrisisAlert, addCrisisNote } = await import("@/lib/crisis-management");

        const alert = createCrisisAlert(userId, {
          type: "data_breach",
          severity: "critical",
          platform: "all",
          title: "Data Breach Alert",
          description: "Potential data breach detected",
          affectedAccounts: [],
        });

        const updated = addCrisisNote(alert.id, userId, "Investigating the source of the breach");

        expect(updated).toBeDefined();
        expect(updated?.notes.length).toBeGreaterThan(0);
        expect(updated?.notes[0].content).toContain("Investigating");
      });
    });

    describe("addCrisisResponse", () => {
      it("should add a response to a crisis alert", async () => {
        const { createCrisisAlert, addCrisisResponse } = await import("@/lib/crisis-management");

        const alert = createCrisisAlert(userId, {
          type: "negative_review",
          severity: "medium",
          platform: "twitter",
          title: "Negative Review Response Needed",
          description: "Customer complaint needs response",
          affectedAccounts: [],
        });

        const updated = addCrisisResponse(alert.id, userId, {
          type: "public_statement",
          content: "We apologize for the inconvenience and are working to resolve this.",
          sentBy: "PR Team",
          platform: "twitter",
          success: true,
        });

        expect(updated).toBeDefined();
        expect(updated?.responses.length).toBeGreaterThan(0);
        expect(updated?.responses[0].type).toBe("public_statement");
      });
    });

    describe("deleteCrisisAlert", () => {
      it("should delete a crisis alert", async () => {
        const { createCrisisAlert, deleteCrisisAlert, getCrisisAlert } = await import("@/lib/crisis-management");

        const alert = createCrisisAlert(userId, {
          type: "spam_attack",
          severity: "low",
          platform: "instagram",
          title: "Spam Attack",
          description: "Bot spam detected",
          affectedAccounts: [],
        });

        const result = deleteCrisisAlert(alert.id, userId);
        const deleted = getCrisisAlert(alert.id, userId);

        expect(result).toBe(true);
        expect(deleted).toBeNull();
      });
    });
  });

  describe("Response Templates", () => {
    describe("getUserResponseTemplates", () => {
      it("should return response templates for user", async () => {
        const { getUserResponseTemplates } = await import("@/lib/crisis-management");

        const templates = getUserResponseTemplates(userId);

        expect(templates).toBeDefined();
        expect(Array.isArray(templates)).toBe(true);
      });
    });

    describe("createResponseTemplate", () => {
      it("should create a response template", async () => {
        const { createResponseTemplate } = await import("@/lib/crisis-management");

        const template = createResponseTemplate(userId, {
          name: "Apology Template",
          content: "We sincerely apologize for the inconvenience. We are working to resolve this issue.",
          category: "apology",
          tone: "professional",
          platforms: ["twitter", "facebook"],
          variables: ["customer_name", "issue_description"],
          isDefault: false,
        });

        expect(template).toBeDefined();
        expect(template.id).toBeDefined();
        expect(template.userId).toBe(userId);
        expect(template.name).toBe("Apology Template");
        expect(template.category).toBe("apology");
      });
    });

    describe("deleteResponseTemplate", () => {
      it("should delete a response template", async () => {
        const { createResponseTemplate, deleteResponseTemplate, getUserResponseTemplates } = await import("@/lib/crisis-management");

        const template = createResponseTemplate(userId, {
          name: "To Delete",
          content: "Template content",
          category: "general",
          tone: "friendly",
          platforms: [],
          variables: [],
          isDefault: false,
        });

        const initialCount = getUserResponseTemplates(userId).length;
        const result = deleteResponseTemplate(template.id, userId);
        const afterCount = getUserResponseTemplates(userId).length;

        expect(result).toBe(true);
        expect(afterCount).toBeLessThan(initialCount);
      });
    });
  });

  describe("Crisis Detection", () => {
    describe("detectCrisisSeverity", () => {
      it("should detect severity from content", async () => {
        const { detectCrisisSeverity } = await import("@/lib/crisis-management");

        const severity = detectCrisisSeverity(
          "This is terrible! I'm never buying from you again! #boycott",
          { likes: 10000, shares: 5000, comments: 2000 },
          "twitter"
        );

        expect(severity).toBeDefined();
        expect(["low", "medium", "high", "critical"]).toContain(severity);
      });

      it("should detect low severity for minor issues", async () => {
        const { detectCrisisSeverity } = await import("@/lib/crisis-management");

        const severity = detectCrisisSeverity(
          "The shipping was a bit slow",
          { likes: 5, shares: 0, comments: 1 },
          "facebook"
        );

        expect(["low", "medium"]).toContain(severity);
      });
    });
  });

  describe("Statistics", () => {
    describe("getCrisisMetrics", () => {
      it("should return crisis metrics", async () => {
        const { getCrisisMetrics } = await import("@/lib/crisis-management");

        const metrics = getCrisisMetrics(userId);

        expect(metrics).toBeDefined();
        expect(metrics.totalAlerts).toBeGreaterThanOrEqual(0);
        expect(metrics.activeAlerts).toBeGreaterThanOrEqual(0);
        expect(metrics.resolvedAlerts).toBeGreaterThanOrEqual(0);
        expect(metrics.avgResponseTime).toBeGreaterThanOrEqual(0);
        expect(metrics.bySeverity).toBeDefined();
        expect(metrics.byPlatform).toBeDefined();
        expect(metrics.byType).toBeDefined();
      });
    });
  });

  describe("Constants", () => {
    it("should export alert type labels", async () => {
      const { ALERT_TYPE_LABELS } = await import("@/lib/crisis-management");

      expect(ALERT_TYPE_LABELS).toBeDefined();
      expect(typeof ALERT_TYPE_LABELS).toBe("object");
    });

    it("should export severity colors", async () => {
      const { SEVERITY_COLORS } = await import("@/lib/crisis-management");

      expect(SEVERITY_COLORS).toBeDefined();
      expect(SEVERITY_COLORS.low).toBeDefined();
      expect(SEVERITY_COLORS.medium).toBeDefined();
      expect(SEVERITY_COLORS.high).toBeDefined();
      expect(SEVERITY_COLORS.critical).toBeDefined();
    });

    it("should export status labels", async () => {
      const { STATUS_LABELS } = await import("@/lib/crisis-management");

      expect(STATUS_LABELS).toBeDefined();
      expect(typeof STATUS_LABELS).toBe("object");
    });

    it("should export default templates", async () => {
      const { DEFAULT_TEMPLATES } = await import("@/lib/crisis-management");

      expect(DEFAULT_TEMPLATES).toBeDefined();
      expect(Array.isArray(DEFAULT_TEMPLATES)).toBe(true);
    });
  });
});
