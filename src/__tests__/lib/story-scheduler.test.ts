import { describe, it, expect, beforeEach } from "@jest/globals";
import { createMockUserId, createFutureDate } from "../utils/test-helpers";

describe("Story Scheduler", () => {
  let userId: string;

  beforeEach(() => {
    userId = createMockUserId();
  });

  describe("Story CRUD Operations", () => {
    describe("getUserStories", () => {
      it("should return stories for a user", async () => {
        const { getUserStories } = await import("@/lib/story-scheduler");

        const stories = getUserStories(userId);

        expect(stories).toBeDefined();
        expect(Array.isArray(stories)).toBe(true);
      });

      it("should filter stories by platform", async () => {
        const { getUserStories, createStory } = await import("@/lib/story-scheduler");

        // Create stories for different platforms
        createStory(userId, {
          type: "story",
          platform: "instagram",
          media: { id: "m1", type: "image", url: "/test.jpg", width: 1080, height: 1920, size: 1000 },
        });
        createStory(userId, {
          type: "reel",
          platform: "tiktok",
          media: { id: "m2", type: "video", url: "/test.mp4", width: 1080, height: 1920, size: 5000 },
        });

        const instagramStories = getUserStories(userId, { platform: "instagram" });

        instagramStories.forEach((story) => {
          expect(story.platform).toBe("instagram");
        });
      });

      it("should filter stories by type", async () => {
        const { getUserStories, createStory } = await import("@/lib/story-scheduler");

        createStory(userId, {
          type: "story",
          platform: "instagram",
          media: { id: "m1", type: "image", url: "/test.jpg", width: 1080, height: 1920, size: 1000 },
        });
        createStory(userId, {
          type: "reel",
          platform: "instagram",
          media: { id: "m2", type: "video", url: "/test.mp4", width: 1080, height: 1920, size: 5000 },
        });

        const reels = getUserStories(userId, { type: "reel" });

        reels.forEach((story) => {
          expect(story.type).toBe("reel");
        });
      });

      it("should filter stories by status", async () => {
        const { getUserStories } = await import("@/lib/story-scheduler");

        const scheduledStories = getUserStories(userId, { status: "scheduled" });

        scheduledStories.forEach((story) => {
          expect(story.status).toBe("scheduled");
        });
      });
    });

    describe("createStory", () => {
      it("should create a new story", async () => {
        const { createStory } = await import("@/lib/story-scheduler");

        const story = createStory(userId, {
          type: "story",
          platform: "instagram",
          media: {
            id: "media1",
            type: "image",
            url: "/test-image.jpg",
            width: 1080,
            height: 1920,
            size: 1024000,
          },
          caption: "Test caption",
          hashtags: ["test", "demo"],
        });

        expect(story).toBeDefined();
        expect(story.id).toBeDefined();
        expect(story.userId).toBe(userId);
        expect(story.type).toBe("story");
        expect(story.platform).toBe("instagram");
        expect(story.status).toBe("draft");
        expect(story.caption).toBe("Test caption");
        expect(story.hashtags).toEqual(["test", "demo"]);
      });

      it("should create scheduled story when scheduledAt is provided", async () => {
        const { createStory } = await import("@/lib/story-scheduler");

        const scheduledAt = createFutureDate(1);
        const story = createStory(userId, {
          type: "reel",
          platform: "tiktok",
          media: {
            id: "media2",
            type: "video",
            url: "/test-video.mp4",
            duration: 30,
            width: 1080,
            height: 1920,
            size: 15000000,
          },
          scheduledAt,
        });

        expect(story.status).toBe("scheduled");
        expect(story.scheduledAt).toBeDefined();
      });

      it("should create story with overlays", async () => {
        const { createStory } = await import("@/lib/story-scheduler");

        const story = createStory(userId, {
          type: "story",
          platform: "instagram",
          media: {
            id: "media3",
            type: "image",
            url: "/test.jpg",
            width: 1080,
            height: 1920,
            size: 1000000,
          },
          overlays: [
            {
              id: "overlay1",
              type: "text",
              content: "Hello World",
              position: { x: 50, y: 50 },
              style: { fontSize: 24, color: "#ffffff" },
            },
            {
              id: "overlay2",
              type: "poll",
              content: "Yes or No?",
              position: { x: 50, y: 70 },
            },
          ],
        });

        expect(story.overlays).toHaveLength(2);
        expect(story.overlays[0].type).toBe("text");
        expect(story.overlays[1].type).toBe("poll");
      });
    });

    describe("getStory", () => {
      it("should return a specific story by ID", async () => {
        const { createStory, getStory } = await import("@/lib/story-scheduler");

        const created = createStory(userId, {
          type: "story",
          platform: "facebook",
          media: { id: "m1", type: "image", url: "/test.jpg", width: 1080, height: 1920, size: 1000 },
        });

        const retrieved = getStory(created.id);

        expect(retrieved).toBeDefined();
        expect(retrieved?.id).toBe(created.id);
      });

      it("should return null for non-existent story", async () => {
        const { getStory } = await import("@/lib/story-scheduler");

        const result = getStory("non-existent-id");

        expect(result).toBeNull();
      });
    });

    describe("updateStory", () => {
      it("should update story properties", async () => {
        const { createStory, updateStory } = await import("@/lib/story-scheduler");

        const story = createStory(userId, {
          type: "story",
          platform: "instagram",
          media: { id: "m1", type: "image", url: "/test.jpg", width: 1080, height: 1920, size: 1000 },
          caption: "Original caption",
        });

        const updated = updateStory(story.id, userId, {
          caption: "Updated caption",
          hashtags: ["updated", "tags"],
        });

        expect(updated).toBeDefined();
        expect(updated?.caption).toBe("Updated caption");
        expect(updated?.hashtags).toEqual(["updated", "tags"]);
      });

      it("should return null for unauthorized update", async () => {
        const { createStory, updateStory } = await import("@/lib/story-scheduler");

        const story = createStory(userId, {
          type: "story",
          platform: "instagram",
          media: { id: "m1", type: "image", url: "/test.jpg", width: 1080, height: 1920, size: 1000 },
        });

        const result = updateStory(story.id, "different-user", { caption: "Hacked!" });

        expect(result).toBeNull();
      });
    });

    describe("deleteStory", () => {
      it("should delete a story", async () => {
        const { createStory, deleteStory, getStory } = await import("@/lib/story-scheduler");

        const story = createStory(userId, {
          type: "story",
          platform: "instagram",
          media: { id: "m1", type: "image", url: "/test.jpg", width: 1080, height: 1920, size: 1000 },
        });

        const result = deleteStory(story.id, userId);
        const retrieved = getStory(story.id);

        expect(result).toBe(true);
        expect(retrieved).toBeNull();
      });

      it("should return false for unauthorized delete", async () => {
        const { createStory, deleteStory } = await import("@/lib/story-scheduler");

        const story = createStory(userId, {
          type: "story",
          platform: "instagram",
          media: { id: "m1", type: "image", url: "/test.jpg", width: 1080, height: 1920, size: 1000 },
        });

        const result = deleteStory(story.id, "different-user");

        expect(result).toBe(false);
      });
    });

    describe("scheduleStory", () => {
      it("should schedule a draft story", async () => {
        const { createStory, scheduleStory } = await import("@/lib/story-scheduler");

        const story = createStory(userId, {
          type: "story",
          platform: "instagram",
          media: { id: "m1", type: "image", url: "/test.jpg", width: 1080, height: 1920, size: 1000 },
        });

        const scheduledAt = createFutureDate(2);
        const scheduled = scheduleStory(story.id, userId, scheduledAt);

        expect(scheduled).toBeDefined();
        expect(scheduled?.status).toBe("scheduled");
        expect(scheduled?.scheduledAt).toBeDefined();
      });
    });

    describe("publishStory", () => {
      it("should publish a story", async () => {
        const { createStory, publishStory } = await import("@/lib/story-scheduler");

        const story = createStory(userId, {
          type: "story",
          platform: "instagram",
          media: { id: "m1", type: "image", url: "/test.jpg", width: 1080, height: 1920, size: 1000 },
        });

        const published = publishStory(story.id, userId);

        expect(published).toBeDefined();
        expect(published?.status).toBe("published");
        expect(published?.publishedAt).toBeDefined();
      });

      it("should set expiration for stories (not reels)", async () => {
        const { createStory, publishStory } = await import("@/lib/story-scheduler");

        const story = createStory(userId, {
          type: "story",
          platform: "instagram",
          media: { id: "m1", type: "image", url: "/test.jpg", width: 1080, height: 1920, size: 1000 },
        });

        const published = publishStory(story.id, userId);

        expect(published?.expiresAt).toBeDefined();
      });
    });
  });

  describe("Series Operations", () => {
    describe("createSeries", () => {
      it("should create a story series", async () => {
        const { createStory, createSeries } = await import("@/lib/story-scheduler");

        const story1 = createStory(userId, {
          type: "story",
          platform: "instagram",
          media: { id: "m1", type: "image", url: "/1.jpg", width: 1080, height: 1920, size: 1000 },
        });
        const story2 = createStory(userId, {
          type: "story",
          platform: "instagram",
          media: { id: "m2", type: "image", url: "/2.jpg", width: 1080, height: 1920, size: 1000 },
        });

        const series = createSeries(userId, {
          name: "Test Series",
          description: "A test story series",
          platform: "instagram",
          type: "story",
          stories: [story1.id, story2.id],
          interval: 60,
        });

        expect(series).toBeDefined();
        expect(series.id).toBeDefined();
        expect(series.name).toBe("Test Series");
        expect(series.stories).toHaveLength(2);
        expect(series.interval).toBe(60);
        expect(series.status).toBe("draft");
      });

      it("should create scheduled series", async () => {
        const { createSeries } = await import("@/lib/story-scheduler");

        const scheduledStartAt = createFutureDate(1);
        const series = createSeries(userId, {
          name: "Scheduled Series",
          platform: "instagram",
          type: "story",
          stories: ["story1", "story2"],
          interval: 120,
          scheduledStartAt,
        });

        expect(series.status).toBe("scheduled");
        expect(series.scheduledStartAt).toBeDefined();
      });
    });

    describe("getUserSeries", () => {
      it("should return all series for a user", async () => {
        const { getUserSeries, createSeries } = await import("@/lib/story-scheduler");

        createSeries(userId, {
          name: "Series 1",
          platform: "instagram",
          type: "story",
          stories: ["s1"],
          interval: 60,
        });

        const seriesList = getUserSeries(userId);

        expect(seriesList).toBeDefined();
        expect(Array.isArray(seriesList)).toBe(true);
      });
    });

    describe("updateSeries", () => {
      it("should update series properties", async () => {
        const { createSeries, updateSeries } = await import("@/lib/story-scheduler");

        const series = createSeries(userId, {
          name: "Original Name",
          platform: "instagram",
          type: "story",
          stories: ["s1"],
          interval: 60,
        });

        const updated = updateSeries(series.id, userId, {
          name: "Updated Name",
          interval: 120,
        });

        expect(updated?.name).toBe("Updated Name");
        expect(updated?.interval).toBe(120);
      });
    });

    describe("deleteSeries", () => {
      it("should delete a series", async () => {
        const { createSeries, deleteSeries, getSeries } = await import("@/lib/story-scheduler");

        const series = createSeries(userId, {
          name: "To Delete",
          platform: "instagram",
          type: "story",
          stories: ["s1"],
          interval: 60,
        });

        const result = deleteSeries(series.id, userId);
        const retrieved = getSeries(series.id);

        expect(result).toBe(true);
        expect(retrieved).toBeNull();
      });
    });
  });

  describe("Template Operations", () => {
    describe("createTemplate", () => {
      it("should create a story template", async () => {
        const { createTemplate } = await import("@/lib/story-scheduler");

        const template = createTemplate(userId, {
          name: "Product Announcement",
          type: "story",
          platform: "instagram",
          overlays: [
            {
              id: "o1",
              type: "text",
              content: "NEW PRODUCT",
              position: { x: 50, y: 20 },
            },
          ],
          defaultHashtags: ["new", "product"],
          category: "Product Launch",
        });

        expect(template).toBeDefined();
        expect(template.id).toBeDefined();
        expect(template.name).toBe("Product Announcement");
        expect(template.overlays).toHaveLength(1);
        expect(template.usageCount).toBe(0);
      });
    });

    describe("getUserTemplates", () => {
      it("should return templates for a user", async () => {
        const { getUserTemplates } = await import("@/lib/story-scheduler");

        const templates = getUserTemplates(userId);

        expect(templates).toBeDefined();
        expect(Array.isArray(templates)).toBe(true);
      });

      it("should filter templates by platform", async () => {
        const { getUserTemplates, createTemplate } = await import("@/lib/story-scheduler");

        createTemplate(userId, {
          name: "IG Template",
          type: "story",
          platform: "instagram",
          overlays: [],
        });
        createTemplate(userId, {
          name: "TT Template",
          type: "reel",
          platform: "tiktok",
          overlays: [],
        });

        const igTemplates = getUserTemplates(userId, "instagram");

        igTemplates.forEach((t) => {
          expect(t.platform).toBe("instagram");
        });
      });
    });

    describe("useTemplate", () => {
      it("should increment usage count", async () => {
        const { createTemplate, useTemplate } = await import("@/lib/story-scheduler");

        const template = createTemplate(userId, {
          name: "Test Template",
          type: "story",
          platform: "instagram",
          overlays: [],
        });

        expect(template.usageCount).toBe(0);

        const used = useTemplate(template.id);

        expect(used?.usageCount).toBe(1);
      });
    });
  });

  describe("Draft Operations", () => {
    describe("saveDraft", () => {
      it("should save a draft", async () => {
        const { saveDraft } = await import("@/lib/story-scheduler");

        const draft = saveDraft(userId, {
          platform: "instagram",
          type: "story",
          overlays: [],
          caption: "Work in progress",
          hashtags: ["wip"],
        });

        expect(draft).toBeDefined();
        expect(draft.id).toBeDefined();
        expect(draft.caption).toBe("Work in progress");
        expect(draft.lastSavedAt).toBeDefined();
      });
    });

    describe("getUserDrafts", () => {
      it("should return drafts for a user", async () => {
        const { saveDraft, getUserDrafts } = await import("@/lib/story-scheduler");

        saveDraft(userId, {
          platform: "instagram",
          type: "story",
          overlays: [],
        });

        const drafts = getUserDrafts(userId);

        expect(drafts).toBeDefined();
        expect(Array.isArray(drafts)).toBe(true);
      });
    });

    describe("deleteDraft", () => {
      it("should delete a draft", async () => {
        const { saveDraft, deleteDraft, getUserDrafts } = await import("@/lib/story-scheduler");

        const draft = saveDraft(userId, {
          platform: "instagram",
          type: "story",
          overlays: [],
        });

        const result = deleteDraft(draft.id, userId);

        expect(result).toBe(true);
      });
    });
  });

  describe("Stats and Analytics", () => {
    describe("getStoryStats", () => {
      it("should return story statistics", async () => {
        const { getStoryStats } = await import("@/lib/story-scheduler");

        const stats = getStoryStats(userId);

        expect(stats).toBeDefined();
        expect(stats.totalStories).toBeGreaterThanOrEqual(0);
        expect(stats.scheduledStories).toBeGreaterThanOrEqual(0);
        expect(stats.publishedStories).toBeGreaterThanOrEqual(0);
        expect(stats.drafts).toBeGreaterThanOrEqual(0);
        expect(stats.series).toBeGreaterThanOrEqual(0);
        expect(stats.templates).toBeGreaterThanOrEqual(0);
        expect(stats.avgViews).toBeGreaterThanOrEqual(0);
        expect(stats.bestPerformingTime).toBeDefined();
        expect(stats.topPlatform).toBeDefined();
      });
    });

    describe("getUpcomingStories", () => {
      it("should return upcoming scheduled stories", async () => {
        const { getUpcomingStories, createStory } = await import("@/lib/story-scheduler");

        createStory(userId, {
          type: "story",
          platform: "instagram",
          media: { id: "m1", type: "image", url: "/test.jpg", width: 1080, height: 1920, size: 1000 },
          scheduledAt: createFutureDate(1),
        });

        const upcoming = getUpcomingStories(userId, 5);

        expect(upcoming).toBeDefined();
        expect(Array.isArray(upcoming)).toBe(true);
        upcoming.forEach((story) => {
          expect(story.status).toBe("scheduled");
        });
      });
    });

    describe("getRecentlyPublished", () => {
      it("should return recently published stories", async () => {
        const { getRecentlyPublished } = await import("@/lib/story-scheduler");

        const recent = getRecentlyPublished(userId, 5);

        expect(recent).toBeDefined();
        expect(Array.isArray(recent)).toBe(true);
        recent.forEach((story) => {
          expect(story.status).toBe("published");
        });
      });
    });

    describe("getOptimalPostingTimes", () => {
      it("should return optimal posting times for a platform", async () => {
        const { getOptimalPostingTimes } = await import("@/lib/story-scheduler");

        const times = getOptimalPostingTimes(userId, "instagram");

        expect(times).toBeDefined();
        expect(Array.isArray(times)).toBe(true);
        expect(times.length).toBe(7); // One for each day

        times.forEach((dayTimes) => {
          expect(dayTimes.day).toBeDefined();
          expect(dayTimes.times).toBeDefined();
          expect(Array.isArray(dayTimes.times)).toBe(true);
        });
      });

      it("should return different times for different platforms", async () => {
        const { getOptimalPostingTimes } = await import("@/lib/story-scheduler");

        const igTimes = getOptimalPostingTimes(userId, "instagram");
        const ttTimes = getOptimalPostingTimes(userId, "tiktok");

        expect(igTimes).not.toEqual(ttTimes);
      });
    });
  });

  describe("Platform Requirements", () => {
    it("should export platform requirements", async () => {
      const { PLATFORM_REQUIREMENTS } = await import("@/lib/story-scheduler");

      expect(PLATFORM_REQUIREMENTS).toBeDefined();
      expect(PLATFORM_REQUIREMENTS.instagram).toBeDefined();
      expect(PLATFORM_REQUIREMENTS.tiktok).toBeDefined();
      expect(PLATFORM_REQUIREMENTS.facebook).toBeDefined();
      expect(PLATFORM_REQUIREMENTS.youtube).toBeDefined();

      // Check structure
      Object.values(PLATFORM_REQUIREMENTS).forEach((req) => {
        expect(req.storyDuration).toBeGreaterThan(0);
        expect(req.reelDuration.min).toBeGreaterThan(0);
        expect(req.reelDuration.max).toBeGreaterThan(req.reelDuration.min);
        expect(req.aspectRatio).toBeDefined();
        expect(req.maxFileSize).toBeGreaterThan(0);
        expect(Array.isArray(req.supportedFormats)).toBe(true);
        expect(Array.isArray(req.features)).toBe(true);
      });
    });
  });

  describe("Constants", () => {
    it("should export story categories", async () => {
      const { STORY_CATEGORIES } = await import("@/lib/story-scheduler");

      expect(STORY_CATEGORIES).toBeDefined();
      expect(Array.isArray(STORY_CATEGORIES)).toBe(true);
      expect(STORY_CATEGORIES.length).toBeGreaterThan(0);
    });

    it("should export overlay stickers", async () => {
      const { OVERLAY_STICKERS } = await import("@/lib/story-scheduler");

      expect(OVERLAY_STICKERS).toBeDefined();
      expect(Array.isArray(OVERLAY_STICKERS)).toBe(true);

      OVERLAY_STICKERS.forEach((sticker) => {
        expect(sticker.id).toBeDefined();
        expect(sticker.name).toBeDefined();
        expect(sticker.icon).toBeDefined();
      });
    });
  });
});
