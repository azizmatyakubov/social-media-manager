import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    rssFeed: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    rssFeedItem: {
      findMany: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    },
    post: {
      create: jest.fn(),
    },
  },
}));

describe("RSS Feeds", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("validateFeedUrl", () => {
    it("should validate a valid RSS feed URL", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () =>
          Promise.resolve(`
          <?xml version="1.0" encoding="UTF-8"?>
          <rss version="2.0">
            <channel>
              <title>Test Feed</title>
              <description>A test RSS feed</description>
              <item>
                <title>Test Article</title>
                <link>https://example.com/article</link>
              </item>
            </channel>
          </rss>
        `),
      });

      const { validateFeedUrl } = await import("@/lib/rss-feeds");
      const result = await validateFeedUrl("https://example.com/feed.xml");

      expect(result.valid).toBe(true);
      expect(result.feedInfo?.title).toBe("Test Feed");
    });

    it("should reject invalid XML", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve("Not valid XML"),
      });

      const { validateFeedUrl } = await import("@/lib/rss-feeds");
      const result = await validateFeedUrl("https://example.com/invalid.xml");

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should handle fetch errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { validateFeedUrl } = await import("@/lib/rss-feeds");
      const result = await validateFeedUrl("https://example.com/feed.xml");

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Failed to fetch");
    });
  });

  describe("addRssFeed", () => {
    it("should add a new RSS feed", async () => {
      const { prisma } = await import("@/lib/prisma");
      const mockFeed = {
        id: "feed1",
        feedUrl: "https://example.com/feed.xml",
        name: "Test Feed",
        platforms: ["X"],
        autoPost: true,
      };

      (prisma.rssFeed.create as jest.Mock).mockResolvedValue(mockFeed);

      const { addRssFeed } = await import("@/lib/rss-feeds");
      const feed = await addRssFeed("user123", "https://example.com/feed.xml", {
        name: "Test Feed",
        platforms: ["X" as any],
        autoPost: true,
      });

      expect(feed.id).toBe("feed1");
      expect(prisma.rssFeed.create).toHaveBeenCalled();
    });
  });

  describe("getRssFeeds", () => {
    it("should return all RSS feeds for a user", async () => {
      const { prisma } = await import("@/lib/prisma");
      const mockFeeds = [
        { id: "feed1", name: "Feed 1", feedUrl: "https://example.com/feed1.xml" },
        { id: "feed2", name: "Feed 2", feedUrl: "https://example.com/feed2.xml" },
      ];

      (prisma.rssFeed.findMany as jest.Mock).mockResolvedValue(mockFeeds);

      const { getRssFeeds } = await import("@/lib/rss-feeds");
      const feeds = await getRssFeeds("user123");

      expect(feeds).toHaveLength(2);
    });
  });

  describe("updateRssFeed", () => {
    it("should update an RSS feed", async () => {
      const { prisma } = await import("@/lib/prisma");
      (prisma.rssFeed.update as jest.Mock).mockResolvedValue({
        id: "feed1",
        autoPost: false,
      });

      const { updateRssFeed } = await import("@/lib/rss-feeds");
      const feed = await updateRssFeed("feed1", { autoPost: false });

      expect(prisma.rssFeed.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "feed1" },
          data: expect.objectContaining({ autoPost: false }),
        })
      );
    });
  });

  describe("deleteRssFeed", () => {
    it("should delete an RSS feed", async () => {
      const { prisma } = await import("@/lib/prisma");
      (prisma.rssFeed.delete as jest.Mock).mockResolvedValue({ id: "feed1" });

      const { deleteRssFeed } = await import("@/lib/rss-feeds");
      await deleteRssFeed("feed1");

      expect(prisma.rssFeed.delete).toHaveBeenCalledWith({
        where: { id: "feed1" },
      });
    });
  });

  describe("getFeedStats", () => {
    it("should return feed statistics", async () => {
      const { prisma } = await import("@/lib/prisma");
      (prisma.rssFeed.findUnique as jest.Mock).mockResolvedValue({
        id: "feed1",
        name: "Test Feed",
        lastFetched: new Date(),
        _count: { items: 50, posts: 30 },
      });

      const { getFeedStats } = await import("@/lib/rss-feeds");
      const stats = await getFeedStats("feed1");

      expect(stats).toBeDefined();
    });
  });
});
