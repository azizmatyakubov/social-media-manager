import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    tikTokAccount: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    youTubeAccount: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    pinterestAccount: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    blueskyAccount: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

describe("TikTok Platform", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getTikTokAuthUrl", () => {
    it("should generate a valid OAuth URL", async () => {
      const { getTikTokAuthUrl } = await import("@/lib/platforms/tiktok");
      const url = getTikTokAuthUrl("http://localhost:3000/callback", "test-state");

      expect(url).toContain("open-api.tiktok.com");
      expect(url).toContain("client_key=");
      expect(url).toContain("state=test-state");
    });
  });

  describe("exchangeTikTokCode", () => {
    it("should exchange code for tokens", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              access_token: "tiktok-access-token",
              refresh_token: "tiktok-refresh-token",
              open_id: "tiktok-user-id",
              expires_in: 86400,
            },
          }),
      });

      const { exchangeTikTokCode } = await import("@/lib/platforms/tiktok");
      const tokens = await exchangeTikTokCode("auth-code");

      expect(tokens.accessToken).toBe("tiktok-access-token");
      expect(tokens.refreshToken).toBe("tiktok-refresh-token");
    });
  });

  describe("getTikTokProfile", () => {
    it("should fetch user profile", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              user: {
                display_name: "Test User",
                avatar_url: "https://example.com/avatar.jpg",
                follower_count: 1000,
                following_count: 500,
              },
            },
          }),
      });

      const { getTikTokProfile } = await import("@/lib/platforms/tiktok");
      const profile = await getTikTokProfile("access-token");

      expect(profile.displayName).toBe("Test User");
      expect(profile.followerCount).toBe(1000);
    });
  });
});

describe("YouTube Platform", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getYouTubeAuthUrl", () => {
    it("should generate a valid OAuth URL", async () => {
      const { getYouTubeAuthUrl } = await import("@/lib/platforms/youtube");
      const url = getYouTubeAuthUrl("http://localhost:3000/callback", "test-state");

      expect(url).toContain("accounts.google.com");
      expect(url).toContain("client_id=");
      expect(url).toContain("state=test-state");
      expect(url).toContain("youtube");
    });
  });

  describe("exchangeYouTubeCode", () => {
    it("should exchange code for tokens", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: "youtube-access-token",
            refresh_token: "youtube-refresh-token",
            expires_in: 3600,
          }),
      });

      const { exchangeYouTubeCode } = await import("@/lib/platforms/youtube");
      const tokens = await exchangeYouTubeCode("auth-code", "http://localhost:3000/callback");

      expect(tokens.accessToken).toBe("youtube-access-token");
      expect(tokens.refreshToken).toBe("youtube-refresh-token");
    });
  });

  describe("getYouTubeChannel", () => {
    it("should fetch channel info", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            items: [
              {
                id: "channel123",
                snippet: {
                  title: "Test Channel",
                  thumbnails: { default: { url: "https://example.com/thumb.jpg" } },
                },
                statistics: {
                  subscriberCount: "10000",
                  videoCount: "50",
                  viewCount: "100000",
                },
              },
            ],
          }),
      });

      const { getYouTubeChannel } = await import("@/lib/platforms/youtube");
      const channel = await getYouTubeChannel("access-token");

      expect(channel.title).toBe("Test Channel");
      expect(channel.subscriberCount).toBe(10000);
    });
  });
});

describe("Pinterest Platform", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getPinterestAuthUrl", () => {
    it("should generate a valid OAuth URL", async () => {
      const { getPinterestAuthUrl } = await import("@/lib/platforms/pinterest");
      const url = getPinterestAuthUrl("http://localhost:3000/callback", "test-state");

      expect(url).toContain("pinterest.com");
      expect(url).toContain("client_id=");
      expect(url).toContain("state=test-state");
    });
  });
});

describe("Bluesky Platform", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("loginToBluesky", () => {
    it("should authenticate with handle and password", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            did: "did:plc:12345",
            handle: "test.bsky.social",
            accessJwt: "access-jwt",
            refreshJwt: "refresh-jwt",
          }),
      });

      const { loginToBluesky } = await import("@/lib/platforms/bluesky");
      const session = await loginToBluesky("test.bsky.social", "password123");

      expect(session.did).toBe("did:plc:12345");
      expect(session.accessJwt).toBe("access-jwt");
    });
  });

  describe("createBlueskyPost", () => {
    it("should create a post", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            uri: "at://did:plc:12345/app.bsky.feed.post/abc123",
            cid: "bafyreig...",
          }),
      });

      const { createBlueskyPost } = await import("@/lib/platforms/bluesky");
      const post = await createBlueskyPost("access-jwt", "did:plc:12345", "Hello Bluesky!");

      expect(post.uri).toContain("app.bsky.feed.post");
    });
  });
});
