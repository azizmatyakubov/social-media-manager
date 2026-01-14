import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getUserWorkspaces,
  getWorkspace,
  createWorkspace,
  updateWorkspace,
  inviteMember,
  updateMemberRole,
  removeMember,
  getWorkspaceChannels,
  getChannel,
  createChannel,
  updateChannel,
  addChannelMember,
  removeChannelMember,
  getChannelMessages,
  getThreadMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  addReaction,
  removeReaction,
  pinMessage,
  unpinMessage,
  getWorkspaceContent,
  getContent,
  createContent,
  updateContent,
  addContentComment,
  resolveComment,
  approveContent,
  rejectContent,
  getWorkspaceTasks,
  getTask,
  createTask,
  updateTask,
  completeTask,
  deleteTask,
  getWorkspaceActivities,
  getCollaborationStats,
  searchWorkspace,
  TASK_TYPES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  CONTENT_TYPES,
  CONTENT_STATUSES,
  CHANNEL_TYPES,
  MEMBER_ROLES,
} from "@/lib/collaboration";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    switch (action) {
      case "workspaces": {
        const workspaces = getUserWorkspaces(session.user.id);
        return NextResponse.json({ workspaces });
      }

      case "workspace": {
        const workspaceId = searchParams.get("workspaceId");
        if (!workspaceId) {
          return NextResponse.json({ error: "Workspace ID required" }, { status: 400 });
        }
        const workspace = getWorkspace(workspaceId);
        if (!workspace) {
          return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
        }
        return NextResponse.json({ workspace });
      }

      case "channels": {
        const workspaceId = searchParams.get("workspaceId");
        if (!workspaceId) {
          return NextResponse.json({ error: "Workspace ID required" }, { status: 400 });
        }
        const channels = getWorkspaceChannels(workspaceId, session.user.id);
        return NextResponse.json({ channels });
      }

      case "channel": {
        const channelId = searchParams.get("channelId");
        if (!channelId) {
          return NextResponse.json({ error: "Channel ID required" }, { status: 400 });
        }
        const channel = getChannel(channelId);
        if (!channel) {
          return NextResponse.json({ error: "Channel not found" }, { status: 404 });
        }
        return NextResponse.json({ channel });
      }

      case "messages": {
        const channelId = searchParams.get("channelId");
        const limit = searchParams.get("limit");
        const before = searchParams.get("before");

        if (!channelId) {
          return NextResponse.json({ error: "Channel ID required" }, { status: 400 });
        }

        const messages = getChannelMessages(channelId, {
          limit: limit ? parseInt(limit) : 50,
          before: before ? new Date(before) : undefined,
        });
        return NextResponse.json({ messages });
      }

      case "thread": {
        const threadId = searchParams.get("threadId");
        if (!threadId) {
          return NextResponse.json({ error: "Thread ID required" }, { status: 400 });
        }
        const messages = getThreadMessages(threadId);
        return NextResponse.json({ messages });
      }

      case "content": {
        const workspaceId = searchParams.get("workspaceId");
        const type = searchParams.get("type");
        const status = searchParams.get("status");
        const channelId = searchParams.get("channelId");

        if (!workspaceId) {
          return NextResponse.json({ error: "Workspace ID required" }, { status: 400 });
        }

        const content = getWorkspaceContent(workspaceId, {
          type: type as any || undefined,
          status: status as any || undefined,
          channelId: channelId || undefined,
        });
        return NextResponse.json({ content });
      }

      case "content-item": {
        const contentId = searchParams.get("contentId");
        if (!contentId) {
          return NextResponse.json({ error: "Content ID required" }, { status: 400 });
        }
        const content = getContent(contentId);
        if (!content) {
          return NextResponse.json({ error: "Content not found" }, { status: 404 });
        }
        return NextResponse.json({ content });
      }

      case "tasks": {
        const workspaceId = searchParams.get("workspaceId");
        const status = searchParams.get("status");
        const assignedTo = searchParams.get("assignedTo");
        const priority = searchParams.get("priority");

        if (!workspaceId) {
          return NextResponse.json({ error: "Workspace ID required" }, { status: 400 });
        }

        const tasks = getWorkspaceTasks(workspaceId, {
          status: status as any || undefined,
          assignedTo: assignedTo || undefined,
          priority: priority as any || undefined,
        });
        return NextResponse.json({ tasks });
      }

      case "task": {
        const taskId = searchParams.get("taskId");
        if (!taskId) {
          return NextResponse.json({ error: "Task ID required" }, { status: 400 });
        }
        const task = getTask(taskId);
        if (!task) {
          return NextResponse.json({ error: "Task not found" }, { status: 404 });
        }
        return NextResponse.json({ task });
      }

      case "activities": {
        const workspaceId = searchParams.get("workspaceId");
        const limit = searchParams.get("limit");
        const channelId = searchParams.get("channelId");
        const userId = searchParams.get("userId");

        if (!workspaceId) {
          return NextResponse.json({ error: "Workspace ID required" }, { status: 400 });
        }

        const activities = getWorkspaceActivities(workspaceId, {
          limit: limit ? parseInt(limit) : 20,
          channelId: channelId || undefined,
          userId: userId || undefined,
        });
        return NextResponse.json({ activities });
      }

      case "stats": {
        const workspaceId = searchParams.get("workspaceId");
        if (!workspaceId) {
          return NextResponse.json({ error: "Workspace ID required" }, { status: 400 });
        }
        const stats = getCollaborationStats(workspaceId);
        return NextResponse.json({ stats });
      }

      case "search": {
        const workspaceId = searchParams.get("workspaceId");
        const query = searchParams.get("query");

        if (!workspaceId || !query) {
          return NextResponse.json(
            { error: "Workspace ID and query required" },
            { status: 400 }
          );
        }

        const results = searchWorkspace(workspaceId, query);
        return NextResponse.json({ results });
      }

      case "constants": {
        return NextResponse.json({
          taskTypes: TASK_TYPES,
          taskPriorities: TASK_PRIORITIES,
          taskStatuses: TASK_STATUSES,
          contentTypes: CONTENT_TYPES,
          contentStatuses: CONTENT_STATUSES,
          channelTypes: CHANNEL_TYPES,
          memberRoles: MEMBER_ROLES,
        });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Collaboration GET error:", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      // Workspace actions
      case "create-workspace": {
        const { name, description, icon, color } = data;
        if (!name) {
          return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }
        const workspace = createWorkspace(session.user.id, {
          name,
          description: description || "",
          icon,
          color,
        });
        return NextResponse.json({ workspace });
      }

      case "update-workspace": {
        const { workspaceId, ...updates } = data;
        if (!workspaceId) {
          return NextResponse.json({ error: "Workspace ID required" }, { status: 400 });
        }
        const workspace = updateWorkspace(workspaceId, session.user.id, updates);
        if (!workspace) {
          return NextResponse.json({ error: "Workspace not found or unauthorized" }, { status: 404 });
        }
        return NextResponse.json({ workspace });
      }

      case "invite-member": {
        const { workspaceId, email, name, role } = data;
        if (!workspaceId || !email || !name) {
          return NextResponse.json(
            { error: "Workspace ID, email, and name required" },
            { status: 400 }
          );
        }
        const member = inviteMember(workspaceId, session.user.id, {
          email,
          name,
          role: role || "editor",
        });
        if (!member) {
          return NextResponse.json({ error: "Failed to invite member" }, { status: 400 });
        }
        return NextResponse.json({ member });
      }

      case "update-member-role": {
        const { workspaceId, targetUserId, newRole } = data;
        if (!workspaceId || !targetUserId || !newRole) {
          return NextResponse.json(
            { error: "Workspace ID, target user ID, and role required" },
            { status: 400 }
          );
        }
        const success = updateMemberRole(workspaceId, session.user.id, targetUserId, newRole);
        if (!success) {
          return NextResponse.json({ error: "Failed to update role" }, { status: 400 });
        }
        return NextResponse.json({ success: true });
      }

      case "remove-member": {
        const { workspaceId, targetUserId } = data;
        if (!workspaceId || !targetUserId) {
          return NextResponse.json(
            { error: "Workspace ID and target user ID required" },
            { status: 400 }
          );
        }
        const success = removeMember(workspaceId, session.user.id, targetUserId);
        if (!success) {
          return NextResponse.json({ error: "Failed to remove member" }, { status: 400 });
        }
        return NextResponse.json({ success: true });
      }

      // Channel actions
      case "create-channel": {
        const { workspaceId, name, description, type, isPrivate, members } = data;
        if (!workspaceId || !name) {
          return NextResponse.json(
            { error: "Workspace ID and name required" },
            { status: 400 }
          );
        }
        const channel = createChannel(session.user.id, workspaceId, {
          name,
          description: description || "",
          type: type || "general",
          isPrivate: isPrivate || false,
          members,
        });
        return NextResponse.json({ channel });
      }

      case "update-channel": {
        const { channelId, ...updates } = data;
        if (!channelId) {
          return NextResponse.json({ error: "Channel ID required" }, { status: 400 });
        }
        const channel = updateChannel(channelId, session.user.id, updates);
        if (!channel) {
          return NextResponse.json({ error: "Channel not found" }, { status: 404 });
        }
        return NextResponse.json({ channel });
      }

      case "add-channel-member": {
        const { channelId, targetUserId } = data;
        if (!channelId || !targetUserId) {
          return NextResponse.json(
            { error: "Channel ID and user ID required" },
            { status: 400 }
          );
        }
        const success = addChannelMember(channelId, targetUserId);
        return NextResponse.json({ success });
      }

      case "remove-channel-member": {
        const { channelId, targetUserId } = data;
        if (!channelId || !targetUserId) {
          return NextResponse.json(
            { error: "Channel ID and user ID required" },
            { status: 400 }
          );
        }
        const success = removeChannelMember(channelId, targetUserId);
        return NextResponse.json({ success });
      }

      // Message actions
      case "send-message": {
        const { channelId, workspaceId, content, type, attachments, mentions, threadId } = data;
        if (!channelId || !workspaceId || !content) {
          return NextResponse.json(
            { error: "Channel ID, workspace ID, and content required" },
            { status: 400 }
          );
        }
        const message = sendMessage(
          session.user.id,
          session.user.name || "User",
          channelId,
          workspaceId,
          { content, type, attachments, mentions, threadId }
        );
        return NextResponse.json({ message });
      }

      case "edit-message": {
        const { messageId, content } = data;
        if (!messageId || !content) {
          return NextResponse.json(
            { error: "Message ID and content required" },
            { status: 400 }
          );
        }
        const message = editMessage(messageId, session.user.id, content);
        if (!message) {
          return NextResponse.json({ error: "Message not found or unauthorized" }, { status: 404 });
        }
        return NextResponse.json({ message });
      }

      case "delete-message": {
        const { messageId } = data;
        if (!messageId) {
          return NextResponse.json({ error: "Message ID required" }, { status: 400 });
        }
        const success = deleteMessage(messageId, session.user.id);
        if (!success) {
          return NextResponse.json({ error: "Message not found or unauthorized" }, { status: 404 });
        }
        return NextResponse.json({ success: true });
      }

      case "add-reaction": {
        const { messageId, emoji } = data;
        if (!messageId || !emoji) {
          return NextResponse.json(
            { error: "Message ID and emoji required" },
            { status: 400 }
          );
        }
        const message = addReaction(messageId, session.user.id, emoji);
        if (!message) {
          return NextResponse.json({ error: "Message not found" }, { status: 404 });
        }
        return NextResponse.json({ message });
      }

      case "remove-reaction": {
        const { messageId, emoji } = data;
        if (!messageId || !emoji) {
          return NextResponse.json(
            { error: "Message ID and emoji required" },
            { status: 400 }
          );
        }
        const message = removeReaction(messageId, session.user.id, emoji);
        if (!message) {
          return NextResponse.json({ error: "Message not found" }, { status: 404 });
        }
        return NextResponse.json({ message });
      }

      case "pin-message": {
        const { messageId } = data;
        if (!messageId) {
          return NextResponse.json({ error: "Message ID required" }, { status: 400 });
        }
        const message = pinMessage(messageId);
        if (!message) {
          return NextResponse.json({ error: "Message not found" }, { status: 404 });
        }
        return NextResponse.json({ message });
      }

      case "unpin-message": {
        const { messageId } = data;
        if (!messageId) {
          return NextResponse.json({ error: "Message ID required" }, { status: 400 });
        }
        const message = unpinMessage(messageId);
        if (!message) {
          return NextResponse.json({ error: "Message not found" }, { status: 404 });
        }
        return NextResponse.json({ message });
      }

      // Content actions
      case "create-content": {
        const { workspaceId, channelId, type, title, content, mediaUrls, platforms, tags, dueDate } =
          data;
        if (!workspaceId || !type || !title || !content) {
          return NextResponse.json(
            { error: "Workspace ID, type, title, and content required" },
            { status: 400 }
          );
        }
        const newContent = createContent(session.user.id, workspaceId, {
          channelId,
          type,
          title,
          content,
          mediaUrls,
          platforms,
          tags,
          dueDate: dueDate ? new Date(dueDate) : undefined,
        });
        return NextResponse.json({ content: newContent });
      }

      case "update-content": {
        const { contentId, ...updates } = data;
        if (!contentId) {
          return NextResponse.json({ error: "Content ID required" }, { status: 400 });
        }
        if (updates.dueDate) {
          updates.dueDate = new Date(updates.dueDate);
        }
        const content = updateContent(contentId, session.user.id, updates);
        if (!content) {
          return NextResponse.json({ error: "Content not found" }, { status: 404 });
        }
        return NextResponse.json({ content });
      }

      case "add-comment": {
        const { contentId, text, mentions, position } = data;
        if (!contentId || !text) {
          return NextResponse.json(
            { error: "Content ID and text required" },
            { status: 400 }
          );
        }
        const comment = addContentComment(
          contentId,
          session.user.id,
          session.user.name || "User",
          { text, mentions, position }
        );
        if (!comment) {
          return NextResponse.json({ error: "Content not found" }, { status: 404 });
        }
        return NextResponse.json({ comment });
      }

      case "resolve-comment": {
        const { contentId, commentId } = data;
        if (!contentId || !commentId) {
          return NextResponse.json(
            { error: "Content ID and comment ID required" },
            { status: 400 }
          );
        }
        const success = resolveComment(contentId, commentId, session.user.id);
        if (!success) {
          return NextResponse.json({ error: "Content or comment not found" }, { status: 404 });
        }
        return NextResponse.json({ success: true });
      }

      case "approve-content": {
        const { contentId } = data;
        if (!contentId) {
          return NextResponse.json({ error: "Content ID required" }, { status: 400 });
        }
        const content = approveContent(contentId, session.user.id, session.user.name || "User");
        if (!content) {
          return NextResponse.json({ error: "Content not found" }, { status: 404 });
        }
        return NextResponse.json({ content });
      }

      case "reject-content": {
        const { contentId } = data;
        if (!contentId) {
          return NextResponse.json({ error: "Content ID required" }, { status: 400 });
        }
        const content = rejectContent(contentId, session.user.id, session.user.name || "User");
        if (!content) {
          return NextResponse.json({ error: "Content not found" }, { status: 404 });
        }
        return NextResponse.json({ content });
      }

      // Task actions
      case "create-task": {
        const {
          workspaceId,
          channelId,
          title,
          description,
          type,
          priority,
          assignedTo,
          relatedContentId,
          dueDate,
          tags,
        } = data;
        if (!workspaceId || !title || !assignedTo) {
          return NextResponse.json(
            { error: "Workspace ID, title, and assignee required" },
            { status: 400 }
          );
        }
        const task = createTask(session.user.id, session.user.name || "User", workspaceId, {
          channelId,
          title,
          description: description || "",
          type: type || "other",
          priority: priority || "medium",
          assignedTo,
          relatedContentId,
          dueDate: dueDate ? new Date(dueDate) : undefined,
          tags,
        });
        return NextResponse.json({ task });
      }

      case "update-task": {
        const { taskId, ...updates } = data;
        if (!taskId) {
          return NextResponse.json({ error: "Task ID required" }, { status: 400 });
        }
        if (updates.dueDate) {
          updates.dueDate = new Date(updates.dueDate);
        }
        const task = updateTask(taskId, updates);
        if (!task) {
          return NextResponse.json({ error: "Task not found" }, { status: 404 });
        }
        return NextResponse.json({ task });
      }

      case "complete-task": {
        const { taskId } = data;
        if (!taskId) {
          return NextResponse.json({ error: "Task ID required" }, { status: 400 });
        }
        const task = completeTask(taskId, session.user.id, session.user.name || "User");
        if (!task) {
          return NextResponse.json({ error: "Task not found" }, { status: 404 });
        }
        return NextResponse.json({ task });
      }

      case "delete-task": {
        const { taskId } = data;
        if (!taskId) {
          return NextResponse.json({ error: "Task ID required" }, { status: 400 });
        }
        const success = deleteTask(taskId);
        if (!success) {
          return NextResponse.json({ error: "Task not found" }, { status: 404 });
        }
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Collaboration POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process request" },
      { status: 500 }
    );
  }
}
