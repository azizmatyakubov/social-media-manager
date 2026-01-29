import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    contentCategory: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    post: {
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    conditionalRule: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    quoteTemplate: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    aiStrategy: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    brandReport: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    websiteVisit: {
      create: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
      count: jest.fn(),
    },
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
                  strategy: "Test strategy",
                  recommendations: ["rec1", "rec2"],
                }),
              },
            },
          ],
        }),
      },
    },
  })),
}));

describe("Content Categories", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getCategories", () => {
    it("should return all categories for a user", async () => {
      const { prisma } = await import("@/lib/prisma");
      const mockCategories = [
        { id: "cat1", name: "Marketing", color: "#FF0000", postCount: 10 },
        { id: "cat2", name: "Product", color: "#00FF00", postCount: 5 },
      ];

      (prisma.contentCategory.findMany as jest.Mock).mockResolvedValue(mockCategories);

      const { getCategories } = await import("@/lib/content-categories");
      const categories = await getCategories("user123");

      expect(categories).toHaveLength(2);
    });
  });

  describe("createCategory", () => {
    it("should create a new category", async () => {
      const { prisma } = await import("@/lib/prisma");
      (prisma.contentCategory.create as jest.Mock).mockResolvedValue({
        id: "cat1",
        name: "New Category",
        color: "#FF0000",
      });

      const { createCategory } = await import("@/lib/content-categories");
      const category = await createCategory("user123", {
        name: "New Category",
        color: "#FF0000",
      });

      expect(category.name).toBe("New Category");
    });
  });

  describe("assignPostToCategory", () => {
    it("should assign a post to a category", async () => {
      const { prisma } = await import("@/lib/prisma");
      (prisma.post.update as jest.Mock).mockResolvedValue({
        id: "post1",
        categoryId: "cat1",
      });

      const { assignPostToCategory } = await import("@/lib/content-categories");
      const result = await assignPostToCategory("post1", "cat1");

      expect(result.categoryId).toBe("cat1");
    });
  });
});

describe("Conditional Posting", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getConditionalRules", () => {
    it("should return all conditional rules for a user", async () => {
      const { prisma } = await import("@/lib/prisma");
      const mockRules = [
        {
          id: "rule1",
          name: "High engagement follow-up",
          triggerType: "ENGAGEMENT_THRESHOLD",
          triggerValue: { minLikes: 100 },
          action: "POST",
          isActive: true,
        },
      ];

      (prisma.conditionalRule.findMany as jest.Mock).mockResolvedValue(mockRules);

      const { getConditionalRules } = await import("@/lib/conditional-posting");
      const rules = await getConditionalRules("user123");

      expect(rules).toHaveLength(1);
      expect(rules[0].triggerType).toBe("ENGAGEMENT_THRESHOLD");
    });
  });

  describe("createConditionalRule", () => {
    it("should create a new conditional rule", async () => {
      const { prisma } = await import("@/lib/prisma");
      (prisma.conditionalRule.create as jest.Mock).mockResolvedValue({
        id: "rule1",
        name: "Follow-up rule",
        triggerType: "ENGAGEMENT_THRESHOLD",
        isActive: true,
      });

      const { createConditionalRule } = await import("@/lib/conditional-posting");
      const rule = await createConditionalRule("user123", {
        name: "Follow-up rule",
        triggerType: "ENGAGEMENT_THRESHOLD",
        triggerValue: { minLikes: 100 },
        action: "POST",
        actionContent: "Thanks for the love!",
      });

      expect(rule.name).toBe("Follow-up rule");
    });
  });

  describe("evaluateCondition", () => {
    it("should return true when condition is met", async () => {
      const { evaluateCondition } = await import("@/lib/conditional-posting");

      const rule = {
        triggerType: "ENGAGEMENT_THRESHOLD",
        triggerValue: { minLikes: 100 },
      };

      const post = {
        likes: 150,
        retweets: 50,
      };

      const result = await evaluateCondition(rule as any, post as any);
      expect(result).toBe(true);
    });

    it("should return false when condition is not met", async () => {
      const { evaluateCondition } = await import("@/lib/conditional-posting");

      const rule = {
        triggerType: "ENGAGEMENT_THRESHOLD",
        triggerValue: { minLikes: 100 },
      };

      const post = {
        likes: 50,
        retweets: 10,
      };

      const result = await evaluateCondition(rule as any, post as any);
      expect(result).toBe(false);
    });
  });
});

describe("Quote Generator", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getQuoteTemplates", () => {
    it("should return all quote templates for a user", async () => {
      const { prisma } = await import("@/lib/prisma");
      const mockTemplates = [
        {
          id: "template1",
          name: "Minimal",
          backgroundColor: "#FFFFFF",
          textColor: "#000000",
          fontFamily: "Inter",
        },
      ];

      (prisma.quoteTemplate.findMany as jest.Mock).mockResolvedValue(mockTemplates);

      const { getQuoteTemplates } = await import("@/lib/quote-generator");
      const templates = await getQuoteTemplates("user123");

      expect(templates).toHaveLength(1);
    });
  });

  describe("generateQuoteImage", () => {
    it("should generate an SVG quote image", async () => {
      const { generateQuoteImage } = await import("@/lib/quote-generator");

      const result = await generateQuoteImage({
        quote: "Success is not final, failure is not fatal.",
        author: "Winston Churchill",
        template: {
          backgroundColor: "#1a1a2e",
          textColor: "#ffffff",
          fontFamily: "Georgia",
        },
      });

      expect(result).toContain("<svg");
      expect(result).toContain("Success is not final");
      expect(result).toContain("Winston Churchill");
    });
  });
});

describe("AI Copilot", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("generateStrategy", () => {
    it("should generate an AI-powered content strategy", async () => {
      const { generateStrategy } = await import("@/lib/ai-copilot");

      const strategy = await generateStrategy("user123", {
        businessType: "SaaS",
        targetAudience: "Small business owners",
        goals: ["Brand awareness", "Lead generation"],
        platforms: ["X", "LINKEDIN"],
      });

      expect(strategy).toBeDefined();
      expect(strategy.recommendations).toBeDefined();
    });
  });

  describe("getContentPillars", () => {
    it("should return content pillars for a strategy", async () => {
      const { prisma } = await import("@/lib/prisma");
      (prisma.aiStrategy.findUnique as jest.Mock).mockResolvedValue({
        id: "strategy1",
        contentPillars: ["Education", "Entertainment", "Inspiration"],
      });

      const { getContentPillars } = await import("@/lib/ai-copilot");
      const pillars = await getContentPillars("strategy1");

      expect(pillars).toHaveLength(3);
      expect(pillars).toContain("Education");
    });
  });
});

describe("Brand Reports", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("generateReport", () => {
    it("should generate a brand report", async () => {
      const { prisma } = await import("@/lib/prisma");
      (prisma.post.findMany as jest.Mock).mockResolvedValue([
        { likes: 100, retweets: 50, platform: "X" },
        { likes: 200, retweets: 100, platform: "LINKEDIN" },
      ]);

      const { generateReport } = await import("@/lib/brand-reports");

      const report = await generateReport("user123", {
        dateRange: { start: new Date(), end: new Date() },
        platforms: ["X", "LINKEDIN"],
        metrics: ["engagement", "reach"],
      });

      expect(report).toBeDefined();
      expect(report.metrics).toBeDefined();
    });
  });
});

describe("Website Analytics", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("trackPageView", () => {
    it("should track a page view", async () => {
      const { prisma } = await import("@/lib/prisma");
      (prisma.websiteVisit.create as jest.Mock).mockResolvedValue({
        id: "visit1",
        page: "/blog/article",
        referrer: "https://twitter.com",
      });

      const { trackPageView } = await import("@/lib/website-analytics");

      const result = await trackPageView("user123", {
        page: "/blog/article",
        referrer: "https://twitter.com",
        userAgent: "Mozilla/5.0",
      });

      expect(result.id).toBe("visit1");
    });
  });

  describe("getAnalytics", () => {
    it("should return website analytics", async () => {
      const { prisma } = await import("@/lib/prisma");
      (prisma.websiteVisit.groupBy as jest.Mock).mockResolvedValue([
        { page: "/", _count: { _all: 100 } },
        { page: "/blog", _count: { _all: 50 } },
      ]);
      (prisma.websiteVisit.count as jest.Mock).mockResolvedValue(150);

      const { getAnalytics } = await import("@/lib/website-analytics");

      const analytics = await getAnalytics("user123", {
        startDate: new Date(),
        endDate: new Date(),
      });

      expect(analytics.totalVisits).toBe(150);
    });
  });

  describe("getSocialBreakdown", () => {
    it("should return traffic breakdown by social platform", async () => {
      const { prisma } = await import("@/lib/prisma");
      (prisma.websiteVisit.findMany as jest.Mock).mockResolvedValue([
        { referrer: "https://twitter.com/user/status/123" },
        { referrer: "https://linkedin.com/feed" },
        { referrer: "https://twitter.com/user/status/456" },
      ]);

      const { getSocialBreakdown } = await import("@/lib/website-analytics");

      const breakdown = await getSocialBreakdown("user123", {
        startDate: new Date(),
        endDate: new Date(),
      });

      expect(breakdown.twitter).toBe(2);
      expect(breakdown.linkedin).toBe(1);
    });
  });
});
