import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    inboxMessage: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
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
          choices: [{ message: { content: "Suggested reply" } }],
        }),
      },
    },
  })),
}));

describe("Social Inbox", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("fetchInboxMessages", () => {
    it("should fetch messages with default filters", async () => {
      const { prisma } = await import("@/lib/prisma");
      const mockMessages = [
        {
          id: "msg1",
          platform: "X",
          messageType: "COMMENT",
          content: "Test message",
          senderUsername: "testuser",
          status: "UNREAD",
          createdAt: new Date(),
        },
      ];

      (prisma.inboxMessage.findMany as jest.Mock).mockResolvedValue(mockMessages);

      const { fetchInboxMessages } = await import("@/lib/social-inbox");
      const result = await fetchInboxMessages("user123", {});

      expect(prisma.inboxMessage.findMany).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it("should filter by platform", async () => {
      const { prisma } = await import("@/lib/prisma");
      (prisma.inboxMessage.findMany as jest.Mock).mockResolvedValue([]);

      const { fetchInboxMessages } = await import("@/lib/social-inbox");
      await fetchInboxMessages("user123", { platform: "X" as any });

      expect(prisma.inboxMessage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            platform: "X",
          }),
        })
      );
    });

    it("should filter by status", async () => {
      const { prisma } = await import("@/lib/prisma");
      (prisma.inboxMessage.findMany as jest.Mock).mockResolvedValue([]);

      const { fetchInboxMessages } = await import("@/lib/social-inbox");
      await fetchInboxMessages("user123", { status: "UNREAD" as any });

      expect(prisma.inboxMessage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: "UNREAD",
          }),
        })
      );
    });
  });

  describe("getInboxStats", () => {
    it("should return inbox statistics", async () => {
      const { prisma } = await import("@/lib/prisma");
      (prisma.inboxMessage.aggregate as jest.Mock).mockResolvedValue({
        _count: { _all: 100 },
      });
      (prisma.inboxMessage.groupBy as jest.Mock).mockResolvedValue([
        { platform: "X", _count: { _all: 50 } },
        { platform: "LINKEDIN", _count: { _all: 50 } },
      ]);

      const { getInboxStats } = await import("@/lib/social-inbox");
      const stats = await getInboxStats("user123");

      expect(stats).toBeDefined();
    });
  });

  describe("updateMessageStatus", () => {
    it("should update message status", async () => {
      const { prisma } = await import("@/lib/prisma");
      (prisma.inboxMessage.update as jest.Mock).mockResolvedValue({
        id: "msg1",
        status: "READ",
      });

      const { updateMessageStatus } = await import("@/lib/social-inbox");
      const result = await updateMessageStatus("msg1", "READ" as any, "user123");

      expect(result.success).toBe(true);
    });
  });

  describe("generateSuggestedReplies", () => {
    it("should generate AI-powered reply suggestions", async () => {
      const { prisma } = await import("@/lib/prisma");
      (prisma.inboxMessage.findUnique as jest.Mock) = jest.fn().mockResolvedValue({
        id: "msg1",
        content: "How do I reset my password?",
        senderUsername: "testuser",
        platform: "X",
      });

      const { generateSuggestedReplies } = await import("@/lib/social-inbox");
      const suggestions = await generateSuggestedReplies("msg1", ["friendly", "professional"]);

      expect(suggestions).toBeDefined();
    });
  });
});
