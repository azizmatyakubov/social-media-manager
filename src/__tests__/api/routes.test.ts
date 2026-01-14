import { describe, it, expect, beforeEach, jest } from "@jest/globals";

// Mock next-auth
jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

// Mock auth options
jest.mock("@/lib/auth", () => ({
  authOptions: {},
}));

describe("API Routes", () => {
  const mockUserId = "test-user-123";
  const mockSession = {
    user: {
      id: mockUserId,
      email: "test@example.com",
      name: "Test User",
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Engagement Heatmap API", () => {
    it("should return 401 for unauthenticated requests", async () => {
      const { getServerSession } = await import("next-auth");
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const { GET } = await import("@/app/api/engagement-heatmap/route");
      const request = new Request("http://localhost:3000/api/engagement-heatmap?action=analytics");

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return analytics for authenticated user", async () => {
      const { getServerSession } = await import("next-auth");
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const { GET } = await import("@/app/api/engagement-heatmap/route");
      const request = new Request(
        "http://localhost:3000/api/engagement-heatmap?action=analytics&platform=instagram&dateRange=30d"
      );

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.analytics).toBeDefined();
      expect(data.analytics.platform).toBe("instagram");
    });

    it("should return optimal schedule", async () => {
      const { getServerSession } = await import("next-auth");
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const { GET } = await import("@/app/api/engagement-heatmap/route");
      const request = new Request(
        "http://localhost:3000/api/engagement-heatmap?action=optimal-schedule&postsPerDay=3"
      );

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.schedule).toBeDefined();
      expect(Array.isArray(data.schedule)).toBe(true);
    });

    it("should return constants", async () => {
      const { getServerSession } = await import("next-auth");
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const { GET } = await import("@/app/api/engagement-heatmap/route");
      const request = new Request("http://localhost:3000/api/engagement-heatmap?action=constants");

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.platforms).toBeDefined();
      expect(data.days).toBeDefined();
      expect(data.hours).toBeDefined();
    });

    it("should handle invalid action", async () => {
      const { getServerSession } = await import("next-auth");
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const { GET } = await import("@/app/api/engagement-heatmap/route");
      const request = new Request("http://localhost:3000/api/engagement-heatmap?action=invalid");

      const response = await GET(request as any);

      expect(response.status).toBe(400);
    });
  });

  describe("Stories API", () => {
    it("should return stories for authenticated user", async () => {
      const { getServerSession } = await import("next-auth");
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const { GET } = await import("@/app/api/stories/route");
      const request = new Request("http://localhost:3000/api/stories?action=stories");

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.stories).toBeDefined();
      expect(Array.isArray(data.stories)).toBe(true);
    });

    it("should return stats", async () => {
      const { getServerSession } = await import("next-auth");
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const { GET } = await import("@/app/api/stories/route");
      const request = new Request("http://localhost:3000/api/stories?action=stats");

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.stats).toBeDefined();
      expect(data.stats.totalStories).toBeDefined();
    });

    it("should return templates", async () => {
      const { getServerSession } = await import("next-auth");
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const { GET } = await import("@/app/api/stories/route");
      const request = new Request("http://localhost:3000/api/stories?action=templates");

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.templates).toBeDefined();
    });

    it("should create a story", async () => {
      const { getServerSession } = await import("next-auth");
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const { POST } = await import("@/app/api/stories/route");
      const request = new Request("http://localhost:3000/api/stories", {
        method: "POST",
        body: JSON.stringify({
          action: "create",
          type: "story",
          platform: "instagram",
          media: {
            id: "test_media",
            type: "image",
            url: "/test.jpg",
            width: 1080,
            height: 1920,
            size: 1000000,
          },
          caption: "Test caption",
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.story).toBeDefined();
      expect(data.story.id).toBeDefined();
    });

    it("should return error for missing required fields", async () => {
      const { getServerSession } = await import("next-auth");
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const { POST } = await import("@/app/api/stories/route");
      const request = new Request("http://localhost:3000/api/stories", {
        method: "POST",
        body: JSON.stringify({
          action: "create",
          type: "story",
          // Missing platform and media
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request as any);

      expect(response.status).toBe(400);
    });
  });

  describe("Ideas API", () => {
    it("should return ideas for authenticated user", async () => {
      const { getServerSession } = await import("next-auth");
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const { GET } = await import("@/app/api/ideas/route");
      const request = new Request("http://localhost:3000/api/ideas?action=ideas");

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ideas).toBeDefined();
    });

    it("should return constants", async () => {
      const { getServerSession } = await import("next-auth");
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const { GET } = await import("@/app/api/ideas/route");
      const request = new Request("http://localhost:3000/api/ideas?action=constants");

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.categories).toBeDefined();
      expect(data.tones).toBeDefined();
      expect(data.contentTypes).toBeDefined();
      expect(data.niches).toBeDefined();
    });

    it("should generate ideas", async () => {
      const { getServerSession } = await import("next-auth");
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const { POST } = await import("@/app/api/ideas/route");
      const request = new Request("http://localhost:3000/api/ideas", {
        method: "POST",
        body: JSON.stringify({
          action: "generate",
          niche: "technology",
          platforms: ["twitter", "linkedin"],
          contentTypes: ["post"],
          tones: ["professional"],
          count: 5,
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.session).toBeDefined();
      expect(data.session.ideas).toBeDefined();
    });

    it("should return error when niche or platforms missing", async () => {
      const { getServerSession } = await import("next-auth");
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const { POST } = await import("@/app/api/ideas/route");
      const request = new Request("http://localhost:3000/api/ideas", {
        method: "POST",
        body: JSON.stringify({
          action: "generate",
          // Missing niche and platforms
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request as any);

      expect(response.status).toBe(400);
    });
  });

  describe("Goals API", () => {
    it("should return goals for authenticated user", async () => {
      const { getServerSession } = await import("next-auth");
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const { GET } = await import("@/app/api/goals/route");
      const request = new Request("http://localhost:3000/api/goals?action=goals");

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.goals).toBeDefined();
    });

    it("should return templates", async () => {
      const { getServerSession } = await import("next-auth");
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const { GET } = await import("@/app/api/goals/route");
      const request = new Request("http://localhost:3000/api/goals?action=templates");

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.templates).toBeDefined();
    });

    it("should create a goal", async () => {
      const { getServerSession } = await import("next-auth");
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const { POST } = await import("@/app/api/goals/route");
      const request = new Request("http://localhost:3000/api/goals", {
        method: "POST",
        body: JSON.stringify({
          action: "create",
          title: "Reach 10K followers",
          targetValue: 10000,
          currentValue: 5000,
          metric: "followers",
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.goal).toBeDefined();
      expect(data.goal.title).toBe("Reach 10K followers");
    });
  });

  describe("Common API Patterns", () => {
    it("should return 401 for all routes when unauthenticated", async () => {
      const { getServerSession } = await import("next-auth");
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const routes = [
        { import: "@/app/api/engagement-heatmap/route", action: "analytics" },
        { import: "@/app/api/stories/route", action: "stories" },
        { import: "@/app/api/ideas/route", action: "ideas" },
        { import: "@/app/api/goals/route", action: "goals" },
      ];

      for (const route of routes) {
        const module = await import(route.import);
        const request = new Request(`http://localhost:3000/api/test?action=${route.action}`);
        const response = await module.GET(request as any);

        expect(response.status).toBe(401);
      }
    });
  });
});
