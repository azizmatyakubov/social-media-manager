import { describe, it, expect, beforeEach } from "@jest/globals";
import { createMockUserId, createFutureDate } from "../utils/test-helpers";

describe("Goals Tracker", () => {
  let userId: string;

  beforeEach(() => {
    userId = createMockUserId();
  });

  describe("Goal CRUD Operations", () => {
    describe("getUserGoals", () => {
      it("should return goals for a user", async () => {
        const { getUserGoals } = await import("@/lib/goals-tracker");

        const goals = getUserGoals(userId);

        expect(goals).toBeDefined();
        expect(Array.isArray(goals)).toBe(true);
      });

      it("should filter goals by status", async () => {
        const { getUserGoals, createGoal } = await import("@/lib/goals-tracker");

        const deadline = createFutureDate(30);
        createGoal(userId, {
          name: "Active Goal",
          description: "Test description",
          category: "growth",
          type: "reach_target",
          platform: "instagram",
          metric: "followers",
          targetValue: 1000,
          startValue: 500,
          startDate: new Date(),
          endDate: deadline,
          milestones: [],
          status: "active",
          priority: "medium",
          notifications: { onMilestone: true, onProgress: true, dailyReminder: false, weeklyReport: true },
        });

        const activeGoals = getUserGoals(userId, "active");

        activeGoals.forEach((goal) => {
          expect(goal.status).toBe("active");
        });
      });
    });

    describe("createGoal", () => {
      it("should create a new goal", async () => {
        const { createGoal } = await import("@/lib/goals-tracker");

        const deadline = createFutureDate(30);
        const goal = createGoal(userId, {
          name: "Reach 10K Followers",
          description: "Grow Instagram following",
          category: "growth",
          type: "reach_target",
          platform: "instagram",
          metric: "followers",
          targetValue: 10000,
          startValue: 5000,
          startDate: new Date(),
          endDate: deadline,
          milestones: [],
          status: "active",
          priority: "high",
          notifications: { onMilestone: true, onProgress: true, dailyReminder: false, weeklyReport: true },
        });

        expect(goal).toBeDefined();
        expect(goal.id).toBeDefined();
        expect(goal.userId).toBe(userId);
        expect(goal.name).toBe("Reach 10K Followers");
        expect(goal.targetValue).toBe(10000);
        expect(goal.currentValue).toBe(5000);
        expect(goal.status).toBe("active");
        expect(goal.priority).toBe("high");
      });

      it("should initialize progress at 0", async () => {
        const { createGoal } = await import("@/lib/goals-tracker");

        const goal = createGoal(userId, {
          name: "Test Goal",
          description: "Testing",
          category: "engagement",
          type: "reach_target",
          platform: "twitter",
          metric: "engagement",
          targetValue: 100,
          startValue: 50,
          startDate: new Date(),
          endDate: createFutureDate(14),
          milestones: [],
          status: "active",
          priority: "medium",
          notifications: { onMilestone: true, onProgress: true, dailyReminder: false, weeklyReport: true },
        });

        expect(goal.progress).toBe(0);
      });

      it("should create goal with milestones", async () => {
        const { createGoal } = await import("@/lib/goals-tracker");

        const goal = createGoal(userId, {
          name: "Milestone Goal",
          description: "Goal with milestones",
          category: "growth",
          type: "reach_target",
          platform: "instagram",
          metric: "followers",
          targetValue: 1000,
          startValue: 0,
          startDate: new Date(),
          endDate: createFutureDate(60),
          milestones: [
            { id: "m1", name: "250 followers", targetValue: 250, isAchieved: false },
            { id: "m2", name: "500 followers", targetValue: 500, isAchieved: false },
            { id: "m3", name: "750 followers", targetValue: 750, isAchieved: false },
          ],
          status: "active",
          priority: "medium",
          notifications: { onMilestone: true, onProgress: true, dailyReminder: false, weeklyReport: true },
        });

        expect(goal.milestones).toHaveLength(3);
        goal.milestones.forEach((m) => {
          expect(m.id).toBeDefined();
          expect(m.isAchieved).toBe(false);
        });
      });
    });

    describe("getGoal", () => {
      it("should return a specific goal", async () => {
        const { createGoal, getGoal } = await import("@/lib/goals-tracker");

        const created = createGoal(userId, {
          name: "Test Goal",
          description: "Testing",
          category: "content",
          type: "reach_target",
          platform: "all",
          metric: "posts",
          targetValue: 100,
          startValue: 0,
          startDate: new Date(),
          endDate: createFutureDate(7),
          milestones: [],
          status: "active",
          priority: "medium",
          notifications: { onMilestone: true, onProgress: true, dailyReminder: false, weeklyReport: true },
        });

        const retrieved = getGoal(created.id);

        expect(retrieved).toBeDefined();
        expect(retrieved?.id).toBe(created.id);
      });

      it("should return null for non-existent goal", async () => {
        const { getGoal } = await import("@/lib/goals-tracker");

        const result = getGoal("non-existent-id");

        expect(result).toBeNull();
      });
    });

    describe("updateGoal", () => {
      it("should update goal properties", async () => {
        const { createGoal, updateGoal } = await import("@/lib/goals-tracker");

        const goal = createGoal(userId, {
          name: "Original Name",
          description: "Original description",
          category: "content",
          type: "reach_target",
          platform: "all",
          metric: "posts",
          targetValue: 100,
          startValue: 0,
          startDate: new Date(),
          endDate: createFutureDate(14),
          milestones: [],
          status: "active",
          priority: "medium",
          notifications: { onMilestone: true, onProgress: true, dailyReminder: false, weeklyReport: true },
        });

        const updated = updateGoal(goal.id, userId, {
          name: "Updated Name",
          currentValue: 25,
        });

        expect(updated?.name).toBe("Updated Name");
        expect(updated?.currentValue).toBe(25);
      });

      it("should update progress when currentValue changes", async () => {
        const { createGoal, updateGoal } = await import("@/lib/goals-tracker");

        const goal = createGoal(userId, {
          name: "Progress Test",
          description: "Testing progress",
          category: "content",
          type: "reach_target",
          platform: "all",
          metric: "posts",
          targetValue: 100,
          startValue: 0,
          startDate: new Date(),
          endDate: createFutureDate(7),
          milestones: [],
          status: "active",
          priority: "medium",
          notifications: { onMilestone: true, onProgress: true, dailyReminder: false, weeklyReport: true },
        });

        const updated = updateGoal(goal.id, userId, {
          currentValue: 50,
        });

        expect(updated?.progress).toBe(50);
      });

      it("should mark goal as completed when target reached", async () => {
        const { createGoal, updateGoal } = await import("@/lib/goals-tracker");

        const goal = createGoal(userId, {
          name: "Almost Done",
          description: "Nearly complete",
          category: "content",
          type: "reach_target",
          platform: "all",
          metric: "posts",
          targetValue: 100,
          startValue: 0,
          startDate: new Date(),
          endDate: createFutureDate(7),
          milestones: [],
          status: "active",
          priority: "medium",
          notifications: { onMilestone: true, onProgress: true, dailyReminder: false, weeklyReport: true },
        });

        const updated = updateGoal(goal.id, userId, {
          currentValue: 100,
        });

        expect(updated?.status).toBe("completed");
      });
    });

    describe("deleteGoal", () => {
      it("should delete a goal", async () => {
        const { createGoal, deleteGoal, getGoal } = await import("@/lib/goals-tracker");

        const goal = createGoal(userId, {
          name: "To Delete",
          description: "Will be deleted",
          category: "content",
          type: "reach_target",
          platform: "all",
          metric: "posts",
          targetValue: 100,
          startValue: 0,
          startDate: new Date(),
          endDate: createFutureDate(7),
          milestones: [],
          status: "active",
          priority: "medium",
          notifications: { onMilestone: true, onProgress: true, dailyReminder: false, weeklyReport: true },
        });

        const result = deleteGoal(goal.id, userId);
        const retrieved = getGoal(goal.id);

        expect(result).toBe(true);
        expect(retrieved).toBeNull();
      });

      it("should return false for unauthorized delete", async () => {
        const { createGoal, deleteGoal } = await import("@/lib/goals-tracker");

        const goal = createGoal(userId, {
          name: "Protected Goal",
          description: "Cannot delete",
          category: "content",
          type: "reach_target",
          platform: "all",
          metric: "posts",
          targetValue: 100,
          startValue: 0,
          startDate: new Date(),
          endDate: createFutureDate(7),
          milestones: [],
          status: "active",
          priority: "medium",
          notifications: { onMilestone: true, onProgress: true, dailyReminder: false, weeklyReport: true },
        });

        const result = deleteGoal(goal.id, "different-user");

        expect(result).toBe(false);
      });
    });
  });

  describe("Milestone Operations", () => {
    describe("addMilestone", () => {
      it("should add a milestone to a goal", async () => {
        const { createGoal, addMilestone } = await import("@/lib/goals-tracker");

        const goal = createGoal(userId, {
          name: "Goal with Milestones",
          description: "Testing milestones",
          category: "growth",
          type: "reach_target",
          platform: "instagram",
          metric: "followers",
          targetValue: 1000,
          startValue: 0,
          startDate: new Date(),
          endDate: createFutureDate(60),
          milestones: [],
          status: "active",
          priority: "medium",
          notifications: { onMilestone: true, onProgress: true, dailyReminder: false, weeklyReport: true },
        });

        const updated = addMilestone(goal.id, userId, {
          name: "First 100",
          targetValue: 100,
        });

        expect(updated?.milestones.length).toBeGreaterThan(0);
        const milestone = updated?.milestones.find((m) => m.name === "First 100");
        expect(milestone).toBeDefined();
      });
    });
  });

  describe("Templates", () => {
    describe("getGoalTemplates", () => {
      it("should return goal templates", async () => {
        const { getGoalTemplates } = await import("@/lib/goals-tracker");

        const templates = getGoalTemplates();

        expect(templates).toBeDefined();
        expect(Array.isArray(templates)).toBe(true);
        expect(templates.length).toBeGreaterThan(0);

        templates.forEach((template) => {
          expect(template.id).toBeDefined();
          expect(template.name).toBeDefined();
          expect(template.description).toBeDefined();
          expect(template.metric).toBeDefined();
          expect(template.suggestedTarget).toBeDefined();
          expect(template.suggestedDuration).toBeDefined();
        });
      });
    });

    describe("createGoalFromTemplate", () => {
      it("should create goal from template", async () => {
        const { getGoalTemplates, createGoalFromTemplate } = await import("@/lib/goals-tracker");

        const templates = getGoalTemplates();
        const template = templates[0];

        const goal = createGoalFromTemplate(userId, template.id, {
          platform: "instagram",
        });

        expect(goal).toBeDefined();
        expect(goal?.metric).toBe(template.metric);
      });
    });
  });

  describe("Statistics", () => {
    describe("getGoalStats", () => {
      it("should return goal statistics", async () => {
        const { getGoalStats } = await import("@/lib/goals-tracker");

        const stats = getGoalStats(userId);

        expect(stats).toBeDefined();
        expect(stats.totalGoals).toBeGreaterThanOrEqual(0);
        expect(stats.activeGoals).toBeGreaterThanOrEqual(0);
        expect(stats.completedGoals).toBeGreaterThanOrEqual(0);
        expect(stats.avgProgress).toBeGreaterThanOrEqual(0);
        expect(stats.onTrackGoals).toBeGreaterThanOrEqual(0);
        expect(stats.atRiskGoals).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe("Constants", () => {
    it("should export goal metrics", async () => {
      const { GOAL_METRICS } = await import("@/lib/goals-tracker");

      expect(GOAL_METRICS).toBeDefined();
      expect(Array.isArray(GOAL_METRICS)).toBe(true);
      expect(GOAL_METRICS.length).toBeGreaterThan(0);
    });

    it("should export goal categories", async () => {
      const { GOAL_CATEGORIES } = await import("@/lib/goals-tracker");

      expect(GOAL_CATEGORIES).toBeDefined();
      expect(Array.isArray(GOAL_CATEGORIES)).toBe(true);
      expect(GOAL_CATEGORIES.length).toBeGreaterThan(0);
    });
  });
});
