import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    gridPlan: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    post: {
      create: jest.fn(),
    },
  },
}));

// Mock Instagram platform
jest.mock("@/lib/platforms/instagram", () => ({
  publishInstagramPost: jest.fn().mockResolvedValue({
    id: "ig-post-123",
    permalink: "https://instagram.com/p/abc123",
  }),
}));

describe("Grid Planner", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getGridPlan", () => {
    it("should return grid plan for a user", async () => {
      const { prisma } = await import("@/lib/prisma");
      const mockPlan = {
        id: "plan1",
        userId: "user123",
        instagramAccountId: "ig123",
        posts: [
          { position: 0, imageUrl: "https://example.com/img1.jpg", postId: null, scheduledFor: null },
          { position: 1, imageUrl: null, postId: null, scheduledFor: null },
        ],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.gridPlan.findFirst as jest.Mock).mockResolvedValue(mockPlan);

      const { getGridPlan } = await import("@/lib/grid-planner");
      const plan = await getGridPlan("user123", "ig123");

      expect(plan).toBeDefined();
      expect(plan?.posts).toHaveLength(2);
    });

    it("should return null if no plan exists", async () => {
      const { prisma } = await import("@/lib/prisma");
      (prisma.gridPlan.findFirst as jest.Mock).mockResolvedValue(null);

      const { getGridPlan } = await import("@/lib/grid-planner");
      const plan = await getGridPlan("user123", "ig123");

      expect(plan).toBeNull();
    });
  });

  describe("createGridPlan", () => {
    it("should create a new grid plan with empty grid", async () => {
      const { prisma } = await import("@/lib/prisma");
      const mockPlan = {
        id: "plan1",
        userId: "user123",
        instagramAccountId: "ig123",
        posts: Array(9).fill({ position: 0, imageUrl: null, postId: null, scheduledFor: null }),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.gridPlan.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
      (prisma.gridPlan.create as jest.Mock).mockResolvedValue(mockPlan);

      const { createGridPlan } = await import("@/lib/grid-planner");
      const plan = await createGridPlan("user123", "ig123");

      expect(plan.posts).toHaveLength(9);
      expect(prisma.gridPlan.create).toHaveBeenCalled();
    });
  });

  describe("updateGridPosition", () => {
    it("should update a specific position in the grid", async () => {
      const { prisma } = await import("@/lib/prisma");
      const mockPlan = {
        id: "plan1",
        posts: [
          { position: 0, imageUrl: null, postId: null, scheduledFor: null },
          { position: 1, imageUrl: null, postId: null, scheduledFor: null },
        ],
      };

      (prisma.gridPlan.findUnique as jest.Mock).mockResolvedValue(mockPlan);
      (prisma.gridPlan.update as jest.Mock).mockResolvedValue({
        ...mockPlan,
        posts: [
          { position: 0, imageUrl: "https://example.com/new.jpg", postId: null, scheduledFor: null },
          { position: 1, imageUrl: null, postId: null, scheduledFor: null },
        ],
      });

      const { updateGridPosition } = await import("@/lib/grid-planner");
      const plan = await updateGridPosition(
        "plan1",
        0,
        "https://example.com/new.jpg",
        null,
        "Test caption",
        "square"
      );

      expect(prisma.gridPlan.update).toHaveBeenCalled();
    });
  });

  describe("reorderGrid", () => {
    it("should swap positions in the grid", async () => {
      const { prisma } = await import("@/lib/prisma");
      const mockPlan = {
        id: "plan1",
        posts: [
          { position: 0, imageUrl: "img1.jpg", postId: null, scheduledFor: null },
          { position: 1, imageUrl: "img2.jpg", postId: null, scheduledFor: null },
          { position: 2, imageUrl: null, postId: null, scheduledFor: null },
        ],
      };

      (prisma.gridPlan.findUnique as jest.Mock).mockResolvedValue(mockPlan);
      (prisma.gridPlan.update as jest.Mock).mockResolvedValue(mockPlan);

      const { reorderGrid } = await import("@/lib/grid-planner");
      await reorderGrid("plan1", [{ from: 0, to: 1 }]);

      expect(prisma.gridPlan.update).toHaveBeenCalled();
    });
  });

  describe("calculateColorHarmony", () => {
    it("should calculate color harmony score for grid", async () => {
      const mockPlan = {
        id: "plan1",
        posts: [
          { position: 0, imageUrl: "img1.jpg", dominantColor: "#FF0000" },
          { position: 1, imageUrl: "img2.jpg", dominantColor: "#FF3333" },
          { position: 2, imageUrl: "img3.jpg", dominantColor: "#FF6666" },
        ],
      };

      const { calculateColorHarmony } = await import("@/lib/grid-planner");
      const score = await calculateColorHarmony(mockPlan as any);

      expect(typeof score).toBe("number");
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });
});
