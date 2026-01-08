import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    post: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    autoDmRule: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn(),
    },
    autoDmLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

// Mock X platform
jest.mock("@/lib/platforms/x", () => ({
  sendDirectMessage: jest.fn().mockResolvedValue({ success: true }),
  retweet: jest.fn().mockResolvedValue({ success: true }),
}));

describe("Auto-Retweet Evergreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getEvergreenPosts", () => {
    it("should return evergreen posts for a user", async () => {
      const { prisma } = await import("@/lib/prisma");
      const mockPosts = [
        {
          id: "post1",
          content: "Evergreen content",
          isEvergreen: true,
          autoRetweet: true,
          likes: 100,
          retweets: 50,
          recycleCount: 2,
        },
      ];

      (prisma.post.findMany as jest.Mock).mockResolvedValue(mockPosts);

      const { getEvergreenPosts } = await import("@/lib/auto-engagement");
      const posts = await getEvergreenPosts("user123");

      expect(posts).toHaveLength(1);
      expect(posts[0].isEvergreen).toBe(true);
    });
  });

  describe("checkRetweetEligibility", () => {
    it("should return eligible for posts meeting criteria", async () => {
      const { prisma } = await import("@/lib/prisma");
      const mockPost = {
        id: "post1",
        likes: 100,
        retweets: 50,
        lastRecycled: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), // 35 days ago
        recycleCount: 2,
      };

      (prisma.post.findUnique as jest.Mock).mockResolvedValue(mockPost);

      const { checkRetweetEligibility } = await import("@/lib/auto-engagement");
      const eligibility = await checkRetweetEligibility("post1");

      expect(eligibility.eligible).toBe(true);
    });

    it("should return ineligible for recently retweeted posts", async () => {
      const { prisma } = await import("@/lib/prisma");
      const mockPost = {
        id: "post1",
        likes: 100,
        retweets: 50,
        lastRecycled: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        recycleCount: 2,
      };

      (prisma.post.findUnique as jest.Mock).mockResolvedValue(mockPost);

      const { checkRetweetEligibility } = await import("@/lib/auto-engagement");
      const eligibility = await checkRetweetEligibility("post1");

      expect(eligibility.eligible).toBe(false);
      expect(eligibility.reason).toContain("minimum interval");
    });
  });

  describe("scheduleAutoRetweet", () => {
    it("should schedule auto-retweet for a post", async () => {
      const { prisma } = await import("@/lib/prisma");
      (prisma.post.update as jest.Mock).mockResolvedValue({
        id: "post1",
        autoRetweet: true,
      });

      const { scheduleAutoRetweet } = await import("@/lib/auto-engagement");
      const result = await scheduleAutoRetweet("post1", 30, 10);

      expect(result.success).toBe(true);
      expect(prisma.post.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "post1" },
        })
      );
    });
  });
});

describe("Auto DM on Keyword", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getAutoDmRules", () => {
    it("should return auto-DM rules for a user", async () => {
      const { prisma } = await import("@/lib/prisma");
      const mockRules = [
        {
          id: "rule1",
          keywords: ["interested", "info"],
          dmTemplate: "Thanks for your interest! Here's more info...",
          isActive: true,
        },
      ];

      (prisma.autoDmRule.findMany as jest.Mock).mockResolvedValue(mockRules);

      const { getAutoDmRules } = await import("@/lib/auto-engagement");
      const rules = await getAutoDmRules("user123");

      expect(rules).toHaveLength(1);
      expect(rules[0].keywords).toContain("interested");
    });
  });

  describe("createAutoDmRule", () => {
    it("should create a new auto-DM rule", async () => {
      const { prisma } = await import("@/lib/prisma");
      const newRule = {
        id: "rule1",
        keywords: ["buy", "purchase"],
        dmTemplate: "Thanks for your interest! DM me for details.",
        isActive: true,
      };

      (prisma.autoDmRule.create as jest.Mock).mockResolvedValue(newRule);

      const { createAutoDmRule } = await import("@/lib/auto-engagement");
      const result = await createAutoDmRule("user123", {
        keywords: ["buy", "purchase"],
        dmTemplate: "Thanks for your interest! DM me for details.",
      });

      expect(result.id).toBe("rule1");
      expect(prisma.autoDmRule.create).toHaveBeenCalled();
    });
  });

  describe("processCommentForAutoDm", () => {
    it("should send DM when comment matches keyword", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { sendDirectMessage } = await import("@/lib/platforms/x");

      const mockRules = [
        {
          id: "rule1",
          keywords: ["interested", "info"],
          dmTemplate: "Thanks for your interest!",
          isActive: true,
        },
      ];

      (prisma.autoDmRule.findMany as jest.Mock).mockResolvedValue(mockRules);
      (prisma.autoDmLog.count as jest.Mock).mockResolvedValue(0);
      (prisma.autoDmLog.create as jest.Mock).mockResolvedValue({ id: "log1" });

      const { processCommentForAutoDm } = await import("@/lib/auto-engagement");
      const result = await processCommentForAutoDm("user123", {
        commentId: "comment1",
        content: "I'm really interested in this!",
        authorId: "author123",
        authorUsername: "testuser",
      });

      expect(result.dmSent).toBe(true);
      expect(sendDirectMessage).toHaveBeenCalled();
    });

    it("should not send DM when no keyword matches", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { sendDirectMessage } = await import("@/lib/platforms/x");

      const mockRules = [
        {
          id: "rule1",
          keywords: ["interested", "info"],
          dmTemplate: "Thanks for your interest!",
          isActive: true,
        },
      ];

      (prisma.autoDmRule.findMany as jest.Mock).mockResolvedValue(mockRules);

      const { processCommentForAutoDm } = await import("@/lib/auto-engagement");
      const result = await processCommentForAutoDm("user123", {
        commentId: "comment1",
        content: "This looks cool!",
        authorId: "author123",
        authorUsername: "testuser",
      });

      expect(result.dmSent).toBe(false);
      expect(sendDirectMessage).not.toHaveBeenCalled();
    });
  });
});
