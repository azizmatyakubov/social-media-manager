import { prisma } from "./prisma";

// Types
export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "CHANGES_REQUESTED" | "CANCELLED";
export type Priority = "low" | "normal" | "high" | "urgent";

export interface ApprovalRequestInput {
  postId: string;
  workspaceId?: string;
  priority?: Priority;
  dueDate?: Date;
  notes?: string;
}

export interface ApprovalCommentInput {
  requestId: string;
  content: string;
  type?: "comment" | "change_request" | "approval" | "rejection";
}

export interface ApprovalRequestWithPost {
  id: string;
  workspaceId: string | null;
  postId: string;
  requesterId: string;
  status: ApprovalStatus;
  priority: string;
  dueDate: Date | null;
  notes: string | null;
  submittedAt: Date;
  reviewedAt: Date | null;
  reviewedBy: string | null;
  createdAt: Date;
  post: {
    id: string;
    content: string;
    platform: string;
    status: string;
    scheduledFor: Date | null;
    mediaUrls: string[];
    user: {
      id: string;
      name: string | null;
      email: string;
    };
  };
  comments: {
    id: string;
    userId: string;
    userName: string;
    content: string;
    type: string;
    createdAt: Date;
  }[];
}

// Create approval request
export async function createApprovalRequest(
  userId: string,
  data: ApprovalRequestInput
): Promise<ApprovalRequestWithPost> {
  // Check if post exists and belongs to user or their workspace
  const post = await prisma.post.findFirst({
    where: { id: data.postId, userId },
  });

  if (!post) {
    throw new Error("Post not found");
  }

  // Check if there's already a pending request
  const existing = await prisma.approvalRequest.findUnique({
    where: { postId: data.postId },
  });

  if (existing && existing.status === "PENDING") {
    throw new Error("Approval request already pending for this post");
  }

  // Update post approval status
  await prisma.post.update({
    where: { id: data.postId },
    data: { approvalStatus: "PENDING" },
  });

  const request = await prisma.approvalRequest.upsert({
    where: { postId: data.postId },
    update: {
      status: "PENDING",
      priority: data.priority || "normal",
      dueDate: data.dueDate,
      notes: data.notes,
      submittedAt: new Date(),
      reviewedAt: null,
      reviewedBy: null,
    },
    create: {
      postId: data.postId,
      requesterId: userId,
      workspaceId: data.workspaceId,
      priority: data.priority || "normal",
      dueDate: data.dueDate,
      notes: data.notes,
    },
    include: {
      post: {
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
      comments: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return {
    ...request,
    status: request.status as ApprovalStatus,
  };
}

// Get approval requests
export async function getApprovalRequests(
  userId: string,
  options?: {
    workspaceId?: string;
    status?: ApprovalStatus;
    priority?: Priority;
    requesterId?: string;
    isReviewer?: boolean; // If true, get requests where user can review
    limit?: number;
    offset?: number;
  }
): Promise<ApprovalRequestWithPost[]> {
  const where: Record<string, unknown> = {};

  if (options?.workspaceId) {
    where.workspaceId = options.workspaceId;
  }

  if (options?.status) {
    where.status = options.status;
  }

  if (options?.priority) {
    where.priority = options.priority;
  }

  if (options?.requesterId) {
    where.requesterId = options.requesterId;
  }

  // If viewing as reviewer, show all pending requests from workspace
  // If viewing as requester, show only their requests
  if (!options?.isReviewer) {
    where.requesterId = userId;
  }

  const requests = await prisma.approvalRequest.findMany({
    where,
    orderBy: [
      { status: "asc" },
      { priority: "desc" },
      { dueDate: "asc" },
      { submittedAt: "desc" },
    ],
    take: options?.limit ?? 50,
    skip: options?.offset ?? 0,
    include: {
      post: {
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
      comments: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  return requests.map((r) => ({
    ...r,
    status: r.status as ApprovalStatus,
  }));
}

// Get single approval request
export async function getApprovalRequest(
  requestId: string,
  userId: string
): Promise<ApprovalRequestWithPost | null> {
  const request = await prisma.approvalRequest.findUnique({
    where: { id: requestId },
    include: {
      post: {
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
      comments: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!request) return null;

  return {
    ...request,
    status: request.status as ApprovalStatus,
  };
}

// Approve request
export async function approveRequest(
  requestId: string,
  reviewerId: string,
  reviewerName: string,
  comment?: string
) {
  const request = await prisma.approvalRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    throw new Error("Request not found");
  }

  if (request.status !== "PENDING" && request.status !== "CHANGES_REQUESTED") {
    throw new Error("Request is not pending approval");
  }

  // Update request
  await prisma.approvalRequest.update({
    where: { id: requestId },
    data: {
      status: "APPROVED",
      reviewedAt: new Date(),
      reviewedBy: reviewerId,
    },
  });

  // Update post
  await prisma.post.update({
    where: { id: request.postId },
    data: {
      approvalStatus: "APPROVED",
      approvedBy: reviewerId,
      approvedAt: new Date(),
    },
  });

  // Add comment if provided
  if (comment) {
    await prisma.approvalComment.create({
      data: {
        requestId,
        userId: reviewerId,
        userName: reviewerName,
        content: comment,
        type: "approval",
      },
    });
  }

  return { success: true };
}

// Reject request
export async function rejectRequest(
  requestId: string,
  reviewerId: string,
  reviewerName: string,
  reason: string
) {
  const request = await prisma.approvalRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    throw new Error("Request not found");
  }

  if (request.status !== "PENDING" && request.status !== "CHANGES_REQUESTED") {
    throw new Error("Request is not pending approval");
  }

  // Update request
  await prisma.approvalRequest.update({
    where: { id: requestId },
    data: {
      status: "REJECTED",
      reviewedAt: new Date(),
      reviewedBy: reviewerId,
    },
  });

  // Update post
  await prisma.post.update({
    where: { id: request.postId },
    data: {
      approvalStatus: "REJECTED",
    },
  });

  // Add comment
  await prisma.approvalComment.create({
    data: {
      requestId,
      userId: reviewerId,
      userName: reviewerName,
      content: reason,
      type: "rejection",
    },
  });

  return { success: true };
}

// Request changes
export async function requestChanges(
  requestId: string,
  reviewerId: string,
  reviewerName: string,
  feedback: string
) {
  const request = await prisma.approvalRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    throw new Error("Request not found");
  }

  if (request.status !== "PENDING") {
    throw new Error("Request is not pending approval");
  }

  // Update request
  await prisma.approvalRequest.update({
    where: { id: requestId },
    data: {
      status: "CHANGES_REQUESTED",
      reviewedAt: new Date(),
      reviewedBy: reviewerId,
    },
  });

  // Update post
  await prisma.post.update({
    where: { id: request.postId },
    data: {
      approvalStatus: "CHANGES_REQUESTED",
    },
  });

  // Add comment
  await prisma.approvalComment.create({
    data: {
      requestId,
      userId: reviewerId,
      userName: reviewerName,
      content: feedback,
      type: "change_request",
    },
  });

  return { success: true };
}

// Add comment
export async function addApprovalComment(
  userId: string,
  userName: string,
  data: ApprovalCommentInput
) {
  return prisma.approvalComment.create({
    data: {
      requestId: data.requestId,
      userId,
      userName,
      content: data.content,
      type: data.type || "comment",
    },
  });
}

// Cancel request
export async function cancelRequest(requestId: string, userId: string) {
  const request = await prisma.approvalRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    throw new Error("Request not found");
  }

  if (request.requesterId !== userId) {
    throw new Error("Only the requester can cancel");
  }

  if (request.status !== "PENDING" && request.status !== "CHANGES_REQUESTED") {
    throw new Error("Request cannot be cancelled");
  }

  await prisma.approvalRequest.update({
    where: { id: requestId },
    data: { status: "CANCELLED" },
  });

  await prisma.post.update({
    where: { id: request.postId },
    data: { approvalStatus: "CANCELLED" },
  });

  return { success: true };
}

// Resubmit after changes
export async function resubmitRequest(
  requestId: string,
  userId: string,
  notes?: string
) {
  const request = await prisma.approvalRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    throw new Error("Request not found");
  }

  if (request.requesterId !== userId) {
    throw new Error("Only the requester can resubmit");
  }

  if (request.status !== "CHANGES_REQUESTED" && request.status !== "REJECTED") {
    throw new Error("Request cannot be resubmitted");
  }

  await prisma.approvalRequest.update({
    where: { id: requestId },
    data: {
      status: "PENDING",
      submittedAt: new Date(),
      reviewedAt: null,
      reviewedBy: null,
      notes: notes || request.notes,
    },
  });

  await prisma.post.update({
    where: { id: request.postId },
    data: { approvalStatus: "PENDING" },
  });

  return { success: true };
}

// Get approval stats
export async function getApprovalStats(userId: string, workspaceId?: string) {
  const where: Record<string, unknown> = {};
  if (workspaceId) {
    where.workspaceId = workspaceId;
  }

  const [total, pending, approved, rejected, changesRequested] = await Promise.all([
    prisma.approvalRequest.count({ where }),
    prisma.approvalRequest.count({ where: { ...where, status: "PENDING" } }),
    prisma.approvalRequest.count({ where: { ...where, status: "APPROVED" } }),
    prisma.approvalRequest.count({ where: { ...where, status: "REJECTED" } }),
    prisma.approvalRequest.count({ where: { ...where, status: "CHANGES_REQUESTED" } }),
  ]);

  // Get average approval time
  const approvedRequests = await prisma.approvalRequest.findMany({
    where: { ...where, status: "APPROVED", reviewedAt: { not: null } },
    select: { submittedAt: true, reviewedAt: true },
    take: 100,
  });

  let avgApprovalTime = 0;
  if (approvedRequests.length > 0) {
    const totalTime = approvedRequests.reduce((sum, r) => {
      if (r.reviewedAt) {
        return sum + (r.reviewedAt.getTime() - r.submittedAt.getTime());
      }
      return sum;
    }, 0);
    avgApprovalTime = Math.round(totalTime / approvedRequests.length / 1000 / 60); // minutes
  }

  // Get overdue count
  const overdue = await prisma.approvalRequest.count({
    where: {
      ...where,
      status: "PENDING",
      dueDate: { lt: new Date() },
    },
  });

  return {
    total,
    pending,
    approved,
    rejected,
    changesRequested,
    avgApprovalTimeMinutes: avgApprovalTime,
    overdue,
  };
}

// Get pending requests for user to review
export async function getPendingForReview(
  userId: string,
  workspaceId?: string
): Promise<ApprovalRequestWithPost[]> {
  const where: Record<string, unknown> = {
    status: "PENDING",
    requesterId: { not: userId }, // Don't show own requests
  };

  if (workspaceId) {
    where.workspaceId = workspaceId;
  }

  const requests = await prisma.approvalRequest.findMany({
    where,
    orderBy: [
      { priority: "desc" },
      { dueDate: "asc" },
      { submittedAt: "asc" },
    ],
    include: {
      post: {
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
      comments: {
        orderBy: { createdAt: "desc" },
        take: 3,
      },
    },
  });

  return requests.map((r) => ({
    ...r,
    status: r.status as ApprovalStatus,
  }));
}

// Bulk approve requests
export async function bulkApprove(
  requestIds: string[],
  reviewerId: string,
  reviewerName: string
) {
  const results = await Promise.all(
    requestIds.map((id) => approveRequest(id, reviewerId, reviewerName))
  );

  return { approved: results.length };
}
