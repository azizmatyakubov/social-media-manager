import { prisma } from "./prisma";
import { WorkspaceRole, Prisma } from "@prisma/client";
import crypto from "crypto";

export async function createWorkspace(
  ownerId: string,
  data: {
    name: string;
    description?: string;
    requireApproval?: boolean;
  }
) {
  const slug = generateSlug(data.name);

  const workspace = await prisma.workspace.create({
    data: {
      name: data.name,
      slug,
      description: data.description,
      ownerId,
      requireApproval: data.requireApproval || false,
    },
  });

  // Add owner as a member
  await prisma.workspaceMember.create({
    data: {
      workspaceId: workspace.id,
      userId: ownerId,
      role: WorkspaceRole.OWNER,
    },
  });

  await logActivity(ownerId, workspace.id, "workspace.created", "workspace", workspace.id);

  return workspace;
}

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const suffix = crypto.randomBytes(4).toString("hex");
  return `${base}-${suffix}`;
}

export async function inviteMember(
  workspaceId: string,
  inviterId: string,
  email: string,
  role: WorkspaceRole = WorkspaceRole.MEMBER
) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const invite = await prisma.workspaceInvite.create({
    data: {
      workspaceId,
      email,
      role,
      token,
      expiresAt,
    },
  });

  await logActivity(inviterId, workspaceId, "member.invited", "invite", invite.id, { email, role });

  return invite;
}

export async function acceptInvite(token: string, userId: string) {
  const invite = await prisma.workspaceInvite.findUnique({
    where: { token },
    include: { workspace: true },
  });

  if (!invite) {
    throw new Error("Invalid invite token");
  }

  if (invite.expiresAt < new Date()) {
    throw new Error("Invite has expired");
  }

  if (invite.acceptedAt) {
    throw new Error("Invite has already been used");
  }

  // Check if already a member
  const existingMember = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: invite.workspaceId,
        userId,
      },
    },
  });

  if (existingMember) {
    throw new Error("Already a member of this workspace");
  }

  // Create membership
  const member = await prisma.workspaceMember.create({
    data: {
      workspaceId: invite.workspaceId,
      userId,
      role: invite.role,
    },
  });

  // Mark invite as accepted
  await prisma.workspaceInvite.update({
    where: { id: invite.id },
    data: { acceptedAt: new Date() },
  });

  await logActivity(userId, invite.workspaceId, "member.joined", "member", member.id);

  return member;
}

export async function removeMember(workspaceId: string, memberId: string, removerId: string) {
  const member = await prisma.workspaceMember.findUnique({
    where: { id: memberId },
  });

  if (!member) {
    throw new Error("Member not found");
  }

  if (member.role === WorkspaceRole.OWNER) {
    throw new Error("Cannot remove workspace owner");
  }

  await prisma.workspaceMember.delete({
    where: { id: memberId },
  });

  await logActivity(removerId, workspaceId, "member.removed", "member", memberId);
}

export async function updateMemberRole(
  workspaceId: string,
  memberId: string,
  newRole: WorkspaceRole,
  updaterId: string
) {
  const member = await prisma.workspaceMember.findUnique({
    where: { id: memberId },
  });

  if (!member) {
    throw new Error("Member not found");
  }

  if (member.role === WorkspaceRole.OWNER) {
    throw new Error("Cannot change owner role");
  }

  const updated = await prisma.workspaceMember.update({
    where: { id: memberId },
    data: { role: newRole },
  });

  await logActivity(updaterId, workspaceId, "member.role_updated", "member", memberId, {
    oldRole: member.role,
    newRole,
  });

  return updated;
}

export async function createApprovalRequest(workspaceId: string, postId: string, requesterId: string) {
  const request = await prisma.approvalRequest.create({
    data: {
      workspaceId,
      postId,
      requesterId,
    },
  });

  await logActivity(requesterId, workspaceId, "approval.requested", "post", postId);

  return request;
}

export async function reviewApprovalRequest(
  requestId: string,
  reviewerId: string,
  approved: boolean,
  comment?: string
) {
  const request = await prisma.approvalRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    throw new Error("Approval request not found");
  }

  const status = approved ? "APPROVED" : "REJECTED";

  const updated = await prisma.approvalRequest.update({
    where: { id: requestId },
    data: {
      status,
      reviewerId,
      reviewedAt: new Date(),
      comment,
    },
  });

  // Update post approval status
  await prisma.post.update({
    where: { id: request.postId },
    data: {
      approvalStatus: status,
      approvedBy: approved ? reviewerId : null,
      approvedAt: approved ? new Date() : null,
    },
  });

  await logActivity(
    reviewerId,
    request.workspaceId,
    approved ? "approval.approved" : "approval.rejected",
    "post",
    request.postId,
    { comment }
  );

  return updated;
}

export async function logActivity(
  userId: string,
  workspaceId: string | null,
  action: string,
  entityType: string,
  entityId?: string,
  metadata?: Record<string, unknown>
) {
  return prisma.activityLog.create({
    data: {
      userId,
      workspaceId,
      action,
      entityType,
      entityId,
      metadata: metadata as Prisma.InputJsonValue | undefined,
    },
  });
}

export async function getWorkspaceWithMembers(workspaceId: string) {
  return prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      },
      invites: {
        where: {
          acceptedAt: null,
          expiresAt: { gt: new Date() },
        },
      },
    },
  });
}

export async function getUserWorkspaces(userId: string) {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    include: {
      workspace: {
        include: {
          _count: {
            select: { members: true },
          },
        },
      },
    },
  });

  return memberships.map((m) => ({
    ...m.workspace,
    role: m.role,
    memberCount: m.workspace._count.members,
  }));
}

export async function getActivityLog(
  workspaceId: string,
  options: { limit?: number; offset?: number } = {}
) {
  return prisma.activityLog.findMany({
    where: { workspaceId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: options.limit || 50,
    skip: options.offset || 0,
  });
}

export function canPerformAction(role: WorkspaceRole, action: string): boolean {
  const permissions: Record<string, WorkspaceRole[]> = {
    "post.create": [WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.EDITOR, WorkspaceRole.MEMBER],
    "post.edit": [WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.EDITOR],
    "post.delete": [WorkspaceRole.OWNER, WorkspaceRole.ADMIN],
    "post.publish": [WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.EDITOR],
    "post.approve": [WorkspaceRole.OWNER, WorkspaceRole.ADMIN],
    "member.invite": [WorkspaceRole.OWNER, WorkspaceRole.ADMIN],
    "member.remove": [WorkspaceRole.OWNER, WorkspaceRole.ADMIN],
    "member.update_role": [WorkspaceRole.OWNER, WorkspaceRole.ADMIN],
    "settings.update": [WorkspaceRole.OWNER, WorkspaceRole.ADMIN],
    "workspace.delete": [WorkspaceRole.OWNER],
  };

  return permissions[action]?.includes(role) || false;
}
