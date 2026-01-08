import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    viralTweet: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    savedViralTweet: {
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      findFirst: jest.fn(),
    },
    $queryRaw: jest.fn(),
  },
}));

// Mock OpenAI
jest.mock("openai", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  patterns: ["pattern1", "pattern2"],
                  suggestions: ["suggestion1"],
                }),
              },
            },
          ],
        }),
      },
    },
  })),
}));

describe("Viral Library", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("searchViralTweets", () => {
    it("should search tweets with query", async () => {
      const { prisma } = await import("@/lib/prisma");
      const mockTweets = [
        {
          id: "tweet1",
          content: "Viral tweet content",
          likes: 10000,
          retweets: 5000,
          engagementRate: 5.5,
          category: "BUSINESS",
          authorUsername: "viraluser",
        },
      ];

      (prisma.viralTweet.findMany as jest.Mock).mockResolvedValue(mockTweets);
      (prisma.viralTweet.count as jest.Mock).mockResolvedValue(1);

      const { searchViralTweets } = await import("@/lib/viral-library");
      const result = await searchViralTweets("viral", {}, 1, 20, "user123");

      expect(result.tweets).toHaveLength(1);
      expect(result.tweets[0].likes).toBe(10000);
    });

    it("should filter by category", async () => {
      const { prisma } = await import("@/lib/prisma");
      (prisma.viralTweet.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.viralTweet.count as jest.Mock).mockResolvedValue(0);

      const { searchViralTweets } = await import("@/lib/viral-library");
      await searchViralTweets("", { category: "TECH" }, 1, 20, "user123");

      expect(prisma.viralTweet.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: "TECH",
          }),
        })
      );
    });

    it("should filter by minimum likes", async () => {
      const { prisma } = await import("@/lib/prisma");
      (prisma.viralTweet.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.viralTweet.count as jest.Mock).mockResolvedValue(0);

      const { searchViralTweets } = await import("@/lib/viral-library");
      await searchViralTweets("", { minLikes: 10000 }, 1, 20, "user123");

      expect(prisma.viralTweet.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            likes: { gte: 10000 },
          }),
        })
      );
    });
  });

  describe("getTrendingViralTweets", () => {
    it("should get trending tweets sorted by viral score", async () => {
      const { prisma } = await import("@/lib/prisma");
      const mockTweets = [
        { id: "1", viralScore: 95, likes: 50000 },
        { id: "2", viralScore: 90, likes: 40000 },
      ];

      (prisma.viralTweet.findMany as jest.Mock).mockResolvedValue(mockTweets);

      const { getTrendingViralTweets } = await import("@/lib/viral-library");
      const tweets = await getTrendingViralTweets(20, "user123");

      expect(prisma.viralTweet.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { viralScore: "desc" },
        })
      );
    });
  });

  describe("getViralTweetsByCategory", () => {
    it("should get tweets by category", async () => {
      const { prisma } = await import("@/lib/prisma");
      (prisma.viralTweet.findMany as jest.Mock).mockResolvedValue([]);

      const { getViralTweetsByCategory } = await import("@/lib/viral-library");
      await getViralTweetsByCategory("MOTIVATION", 20, "user123");

      expect(prisma.viralTweet.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { category: "MOTIVATION" },
        })
      );
    });
  });

  describe("getInspirationForTopic", () => {
    it("should get AI-powered inspiration for a topic", async () => {
      const { prisma } = await import("@/lib/prisma");
      (prisma.viralTweet.findMany as jest.Mock).mockResolvedValue([
        { id: "1", content: "Example viral tweet about AI", likes: 50000 },
      ]);

      const { getInspirationForTopic } = await import("@/lib/viral-library");
      const inspiration = await getInspirationForTopic("artificial intelligence", "user123");

      expect(inspiration).toBeDefined();
      expect(inspiration.relatedTweets).toBeDefined();
    });
  });

  describe("getCategoryStats", () => {
    it("should return category statistics", async () => {
      const { prisma } = await import("@/lib/prisma");
      (prisma.viralTweet.groupBy as jest.Mock).mockResolvedValue([
        { category: "TECH", _count: { _all: 100 }, _avg: { likes: 5000 } },
        { category: "BUSINESS", _count: { _all: 80 }, _avg: { likes: 4000 } },
      ]);

      const { getCategoryStats } = await import("@/lib/viral-library");
      const stats = await getCategoryStats();

      expect(stats).toHaveLength(2);
      expect(stats[0].category).toBe("TECH");
    });
  });
});
