// Collaboration Workspace for Teams

export interface Workspace {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  icon: string;
  color: string;
  members: WorkspaceMember[];
  channels: string[];
  settings: WorkspaceSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceMember {
  userId: string;
  name: string;
  email: string;
  avatar?: string;
  role: "owner" | "admin" | "editor" | "viewer";
  status: "active" | "pending" | "inactive";
  joinedAt: Date;
  lastActiveAt: Date;
}

export interface WorkspaceSettings {
  allowGuestAccess: boolean;
  defaultRole: "editor" | "viewer";
  notifyOnMention: boolean;
  notifyOnComment: boolean;
  notifyOnTaskAssignment: boolean;
  autoArchiveDays: number;
}

export interface Channel {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  type: "general" | "project" | "campaign" | "content" | "private";
  isPrivate: boolean;
  members: string[];
  pinnedItems: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  channelId: string;
  workspaceId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  type: "text" | "file" | "image" | "link" | "system";
  attachments: MessageAttachment[];
  mentions: string[];
  reactions: MessageReaction[];
  threadId?: string;
  threadCount?: number;
  isPinned: boolean;
  isEdited: boolean;
  editedAt?: Date;
  createdAt: Date;
}

export interface MessageAttachment {
  id: string;
  type: "file" | "image" | "video" | "link";
  name: string;
  url: string;
  size?: number;
  mimeType?: string;
  thumbnail?: string;
}

export interface MessageReaction {
  emoji: string;
  count: number;
  users: string[];
}

export interface SharedContent {
  id: string;
  workspaceId: string;
  channelId?: string;
  type: "draft" | "post" | "template" | "asset" | "document";
  title: string;
  content: string;
  mediaUrls: string[];
  platforms: string[];
  status: "draft" | "review" | "approved" | "scheduled" | "published";
  createdBy: string;
  assignedTo?: string;
  reviewers: string[];
  comments: ContentComment[];
  version: number;
  tags: string[];
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContentComment {
  id: string;
  contentId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  text: string;
  mentions: string[];
  isResolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
  position?: {
    start: number;
    end: number;
  };
  createdAt: Date;
}

export interface CollabTask {
  id: string;
  workspaceId: string;
  channelId?: string;
  title: string;
  description: string;
  type: "content" | "review" | "approval" | "feedback" | "other";
  priority: "low" | "medium" | "high" | "urgent";
  status: "todo" | "in_progress" | "review" | "completed" | "cancelled";
  assignedTo: string;
  assignedBy: string;
  relatedContentId?: string;
  dueDate?: Date;
  completedAt?: Date;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Activity {
  id: string;
  workspaceId: string;
  channelId?: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  type: ActivityType;
  action: string;
  targetType: "message" | "content" | "task" | "member" | "channel" | "workspace";
  targetId: string;
  targetName: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export type ActivityType =
  | "message_sent"
  | "message_edited"
  | "content_created"
  | "content_updated"
  | "content_approved"
  | "content_rejected"
  | "content_published"
  | "task_created"
  | "task_assigned"
  | "task_completed"
  | "member_joined"
  | "member_left"
  | "member_role_changed"
  | "channel_created"
  | "comment_added"
  | "mention_created";

// In-memory storage
const workspaces = new Map<string, Workspace>();
const channels = new Map<string, Channel>();
const messages = new Map<string, Message>();
const sharedContent = new Map<string, SharedContent>();
const tasks = new Map<string, CollabTask>();
const activities = new Map<string, Activity>();

// Initialize with demo data
function initDemoData() {
  // Create demo workspace
  const demoWorkspace: Workspace = {
    id: "ws-1",
    name: "Marketing Team",
    description: "Main workspace for marketing campaigns and content",
    ownerId: "user-1",
    icon: "M",
    color: "#6366f1",
    members: [
      {
        userId: "user-1",
        name: "John Smith",
        email: "john@example.com",
        role: "owner",
        status: "active",
        joinedAt: new Date("2024-01-01"),
        lastActiveAt: new Date(),
      },
      {
        userId: "user-2",
        name: "Sarah Johnson",
        email: "sarah@example.com",
        role: "admin",
        status: "active",
        joinedAt: new Date("2024-01-05"),
        lastActiveAt: new Date(),
      },
      {
        userId: "user-3",
        name: "Mike Chen",
        email: "mike@example.com",
        role: "editor",
        status: "active",
        joinedAt: new Date("2024-01-10"),
        lastActiveAt: new Date(),
      },
      {
        userId: "user-4",
        name: "Emily Davis",
        email: "emily@example.com",
        role: "editor",
        status: "active",
        joinedAt: new Date("2024-02-01"),
        lastActiveAt: new Date(),
      },
      {
        userId: "user-5",
        name: "Alex Turner",
        email: "alex@example.com",
        role: "viewer",
        status: "pending",
        joinedAt: new Date("2024-03-01"),
        lastActiveAt: new Date(),
      },
    ],
    channels: ["ch-1", "ch-2", "ch-3", "ch-4"],
    settings: {
      allowGuestAccess: false,
      defaultRole: "editor",
      notifyOnMention: true,
      notifyOnComment: true,
      notifyOnTaskAssignment: true,
      autoArchiveDays: 30,
    },
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date(),
  };
  workspaces.set(demoWorkspace.id, demoWorkspace);

  // Create demo channels
  const demoChannels: Channel[] = [
    {
      id: "ch-1",
      workspaceId: "ws-1",
      name: "General",
      description: "General discussions and announcements",
      type: "general",
      isPrivate: false,
      members: ["user-1", "user-2", "user-3", "user-4", "user-5"],
      pinnedItems: [],
      createdBy: "user-1",
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date(),
    },
    {
      id: "ch-2",
      workspaceId: "ws-1",
      name: "Q1 Campaign",
      description: "Planning and coordination for Q1 marketing campaign",
      type: "campaign",
      isPrivate: false,
      members: ["user-1", "user-2", "user-3"],
      pinnedItems: [],
      createdBy: "user-2",
      createdAt: new Date("2024-01-15"),
      updatedAt: new Date(),
    },
    {
      id: "ch-3",
      workspaceId: "ws-1",
      name: "Content Ideas",
      description: "Share and discuss content ideas",
      type: "content",
      isPrivate: false,
      members: ["user-1", "user-2", "user-3", "user-4"],
      pinnedItems: [],
      createdBy: "user-3",
      createdAt: new Date("2024-02-01"),
      updatedAt: new Date(),
    },
    {
      id: "ch-4",
      workspaceId: "ws-1",
      name: "Leadership",
      description: "Private channel for leadership discussions",
      type: "private",
      isPrivate: true,
      members: ["user-1", "user-2"],
      pinnedItems: [],
      createdBy: "user-1",
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date(),
    },
  ];
  demoChannels.forEach((ch) => channels.set(ch.id, ch));

  // Create demo messages
  const demoMessages: Message[] = [
    {
      id: "msg-1",
      channelId: "ch-1",
      workspaceId: "ws-1",
      authorId: "user-1",
      authorName: "John Smith",
      content: "Welcome to the Marketing Team workspace! Let's make this quarter amazing. 🚀",
      type: "text",
      attachments: [],
      mentions: [],
      reactions: [{ emoji: "🎉", count: 3, users: ["user-2", "user-3", "user-4"] }],
      isPinned: true,
      isEdited: false,
      createdAt: new Date("2024-01-01T09:00:00"),
    },
    {
      id: "msg-2",
      channelId: "ch-1",
      workspaceId: "ws-1",
      authorId: "user-2",
      authorName: "Sarah Johnson",
      content: "Thanks John! Excited to be part of this team. I've started working on the Q1 campaign strategy.",
      type: "text",
      attachments: [],
      mentions: [],
      reactions: [{ emoji: "👍", count: 2, users: ["user-1", "user-3"] }],
      isPinned: false,
      isEdited: false,
      createdAt: new Date("2024-01-01T09:15:00"),
    },
    {
      id: "msg-3",
      channelId: "ch-2",
      workspaceId: "ws-1",
      authorId: "user-2",
      authorName: "Sarah Johnson",
      content: "@Mike Chen can you review the latest draft for the product launch post? I've uploaded it to shared content.",
      type: "text",
      attachments: [],
      mentions: ["user-3"],
      reactions: [],
      isPinned: false,
      isEdited: false,
      createdAt: new Date("2024-01-20T14:30:00"),
    },
    {
      id: "msg-4",
      channelId: "ch-2",
      workspaceId: "ws-1",
      authorId: "user-3",
      authorName: "Mike Chen",
      content: "Sure! I'll take a look this afternoon and leave my feedback as comments.",
      type: "text",
      attachments: [],
      mentions: [],
      reactions: [{ emoji: "✅", count: 1, users: ["user-2"] }],
      isPinned: false,
      isEdited: false,
      createdAt: new Date("2024-01-20T14:45:00"),
    },
    {
      id: "msg-5",
      channelId: "ch-3",
      workspaceId: "ws-1",
      authorId: "user-4",
      authorName: "Emily Davis",
      content: "Here's a carousel idea I've been working on - 5 tips for better engagement on Instagram. What do you all think?",
      type: "text",
      attachments: [
        {
          id: "att-1",
          type: "image",
          name: "carousel-mockup.png",
          url: "/uploads/carousel-mockup.png",
        },
      ],
      mentions: [],
      reactions: [
        { emoji: "❤️", count: 2, users: ["user-1", "user-2"] },
        { emoji: "🔥", count: 1, users: ["user-3"] },
      ],
      isPinned: false,
      isEdited: false,
      createdAt: new Date("2024-02-05T10:00:00"),
    },
  ];
  demoMessages.forEach((msg) => messages.set(msg.id, msg));

  // Create demo shared content
  const demoContent: SharedContent[] = [
    {
      id: "sc-1",
      workspaceId: "ws-1",
      channelId: "ch-2",
      type: "draft",
      title: "Product Launch Announcement",
      content: "🚀 Big news! We're thrilled to announce the launch of our new product that will revolutionize how you manage social media...",
      mediaUrls: [],
      platforms: ["twitter", "linkedin", "instagram"],
      status: "review",
      createdBy: "user-2",
      assignedTo: "user-3",
      reviewers: ["user-1", "user-3"],
      comments: [
        {
          id: "cmt-1",
          contentId: "sc-1",
          authorId: "user-3",
          authorName: "Mike Chen",
          text: "Love the opening! Maybe we can add some specific features to highlight?",
          mentions: [],
          isResolved: false,
          createdAt: new Date("2024-01-20T15:00:00"),
        },
      ],
      version: 2,
      tags: ["launch", "product", "announcement"],
      dueDate: new Date("2024-02-01"),
      createdAt: new Date("2024-01-18"),
      updatedAt: new Date("2024-01-20"),
    },
    {
      id: "sc-2",
      workspaceId: "ws-1",
      channelId: "ch-3",
      type: "draft",
      title: "5 Tips for Better Instagram Engagement",
      content: "📱 Want to boost your Instagram engagement? Here are 5 proven strategies:\n\n1. Post at peak times\n2. Use relevant hashtags\n3. Engage with your audience\n4. Share valuable content\n5. Be consistent",
      mediaUrls: ["/uploads/carousel-mockup.png"],
      platforms: ["instagram"],
      status: "draft",
      createdBy: "user-4",
      reviewers: [],
      comments: [],
      version: 1,
      tags: ["instagram", "tips", "engagement"],
      createdAt: new Date("2024-02-05"),
      updatedAt: new Date("2024-02-05"),
    },
    {
      id: "sc-3",
      workspaceId: "ws-1",
      type: "template",
      title: "Weekly Tip Template",
      content: "💡 Tip of the week: [TIP]\n\n[EXPLANATION]\n\nTry this out and let us know how it goes! 👇",
      mediaUrls: [],
      platforms: ["twitter", "linkedin"],
      status: "approved",
      createdBy: "user-1",
      reviewers: [],
      comments: [],
      version: 1,
      tags: ["template", "weekly", "tips"],
      createdAt: new Date("2024-01-10"),
      updatedAt: new Date("2024-01-10"),
    },
  ];
  demoContent.forEach((c) => sharedContent.set(c.id, c));

  // Create demo tasks
  const demoTasks: CollabTask[] = [
    {
      id: "task-1",
      workspaceId: "ws-1",
      channelId: "ch-2",
      title: "Review product launch draft",
      description: "Review and provide feedback on the product launch announcement",
      type: "review",
      priority: "high",
      status: "in_progress",
      assignedTo: "user-3",
      assignedBy: "user-2",
      relatedContentId: "sc-1",
      dueDate: new Date("2024-01-25"),
      tags: ["review", "urgent"],
      createdAt: new Date("2024-01-20"),
      updatedAt: new Date("2024-01-20"),
    },
    {
      id: "task-2",
      workspaceId: "ws-1",
      channelId: "ch-3",
      title: "Create carousel graphics",
      description: "Design graphics for the Instagram engagement tips carousel",
      type: "content",
      priority: "medium",
      status: "todo",
      assignedTo: "user-4",
      assignedBy: "user-2",
      relatedContentId: "sc-2",
      dueDate: new Date("2024-02-10"),
      tags: ["design", "instagram"],
      createdAt: new Date("2024-02-05"),
      updatedAt: new Date("2024-02-05"),
    },
    {
      id: "task-3",
      workspaceId: "ws-1",
      title: "Approve Q1 content calendar",
      description: "Final approval on the Q1 content calendar before scheduling",
      type: "approval",
      priority: "high",
      status: "todo",
      assignedTo: "user-1",
      assignedBy: "user-2",
      dueDate: new Date("2024-01-28"),
      tags: ["approval", "calendar"],
      createdAt: new Date("2024-01-22"),
      updatedAt: new Date("2024-01-22"),
    },
    {
      id: "task-4",
      workspaceId: "ws-1",
      title: "Schedule February posts",
      description: "Schedule all approved posts for February",
      type: "content",
      priority: "medium",
      status: "completed",
      assignedTo: "user-3",
      assignedBy: "user-1",
      completedAt: new Date("2024-01-30"),
      tags: ["scheduling"],
      createdAt: new Date("2024-01-25"),
      updatedAt: new Date("2024-01-30"),
    },
  ];
  demoTasks.forEach((t) => tasks.set(t.id, t));

  // Create demo activities
  const demoActivities: Activity[] = [
    {
      id: "act-1",
      workspaceId: "ws-1",
      userId: "user-4",
      userName: "Emily Davis",
      type: "content_created",
      action: "created new content",
      targetType: "content",
      targetId: "sc-2",
      targetName: "5 Tips for Better Instagram Engagement",
      createdAt: new Date("2024-02-05T10:00:00"),
    },
    {
      id: "act-2",
      workspaceId: "ws-1",
      channelId: "ch-2",
      userId: "user-3",
      userName: "Mike Chen",
      type: "comment_added",
      action: "commented on",
      targetType: "content",
      targetId: "sc-1",
      targetName: "Product Launch Announcement",
      createdAt: new Date("2024-01-20T15:00:00"),
    },
    {
      id: "act-3",
      workspaceId: "ws-1",
      userId: "user-2",
      userName: "Sarah Johnson",
      type: "task_assigned",
      action: "assigned task to Mike Chen",
      targetType: "task",
      targetId: "task-1",
      targetName: "Review product launch draft",
      createdAt: new Date("2024-01-20T14:30:00"),
    },
    {
      id: "act-4",
      workspaceId: "ws-1",
      userId: "user-3",
      userName: "Mike Chen",
      type: "task_completed",
      action: "completed task",
      targetType: "task",
      targetId: "task-4",
      targetName: "Schedule February posts",
      createdAt: new Date("2024-01-30T16:00:00"),
    },
    {
      id: "act-5",
      workspaceId: "ws-1",
      userId: "user-5",
      userName: "Alex Turner",
      type: "member_joined",
      action: "joined the workspace",
      targetType: "workspace",
      targetId: "ws-1",
      targetName: "Marketing Team",
      createdAt: new Date("2024-03-01T09:00:00"),
    },
  ];
  demoActivities.forEach((a) => activities.set(a.id, a));
}

// Initialize demo data
initDemoData();

// Workspace functions
export function getUserWorkspaces(userId: string): Workspace[] {
  return Array.from(workspaces.values()).filter((ws) =>
    ws.members.some((m) => m.userId === userId)
  );
}

export function getWorkspace(workspaceId: string): Workspace | undefined {
  return workspaces.get(workspaceId);
}

export function createWorkspace(
  userId: string,
  data: {
    name: string;
    description: string;
    icon?: string;
    color?: string;
  }
): Workspace {
  const workspace: Workspace = {
    id: `ws-${Date.now()}`,
    name: data.name,
    description: data.description,
    ownerId: userId,
    icon: data.icon || data.name.charAt(0).toUpperCase(),
    color: data.color || "#6366f1",
    members: [
      {
        userId,
        name: "You",
        email: "",
        role: "owner",
        status: "active",
        joinedAt: new Date(),
        lastActiveAt: new Date(),
      },
    ],
    channels: [],
    settings: {
      allowGuestAccess: false,
      defaultRole: "editor",
      notifyOnMention: true,
      notifyOnComment: true,
      notifyOnTaskAssignment: true,
      autoArchiveDays: 30,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  workspaces.set(workspace.id, workspace);

  // Create default general channel
  const generalChannel = createChannel(userId, workspace.id, {
    name: "General",
    description: "General discussions",
    type: "general",
    isPrivate: false,
  });

  workspace.channels.push(generalChannel.id);

  return workspace;
}

export function updateWorkspace(
  workspaceId: string,
  userId: string,
  updates: Partial<Pick<Workspace, "name" | "description" | "icon" | "color" | "settings">>
): Workspace | null {
  const workspace = workspaces.get(workspaceId);
  if (!workspace) return null;

  const member = workspace.members.find((m) => m.userId === userId);
  if (!member || !["owner", "admin"].includes(member.role)) return null;

  Object.assign(workspace, updates, { updatedAt: new Date() });
  return workspace;
}

export function inviteMember(
  workspaceId: string,
  userId: string,
  inviteData: { email: string; name: string; role: "admin" | "editor" | "viewer" }
): WorkspaceMember | null {
  const workspace = workspaces.get(workspaceId);
  if (!workspace) return null;

  const member = workspace.members.find((m) => m.userId === userId);
  if (!member || !["owner", "admin"].includes(member.role)) return null;

  const newMember: WorkspaceMember = {
    userId: `user-${Date.now()}`,
    name: inviteData.name,
    email: inviteData.email,
    role: inviteData.role,
    status: "pending",
    joinedAt: new Date(),
    lastActiveAt: new Date(),
  };

  workspace.members.push(newMember);
  workspace.updatedAt = new Date();

  return newMember;
}

export function updateMemberRole(
  workspaceId: string,
  userId: string,
  targetUserId: string,
  newRole: "admin" | "editor" | "viewer"
): boolean {
  const workspace = workspaces.get(workspaceId);
  if (!workspace) return false;

  const member = workspace.members.find((m) => m.userId === userId);
  if (!member || !["owner", "admin"].includes(member.role)) return false;

  const targetMember = workspace.members.find((m) => m.userId === targetUserId);
  if (!targetMember || targetMember.role === "owner") return false;

  targetMember.role = newRole;
  workspace.updatedAt = new Date();

  return true;
}

export function removeMember(workspaceId: string, userId: string, targetUserId: string): boolean {
  const workspace = workspaces.get(workspaceId);
  if (!workspace) return false;

  const member = workspace.members.find((m) => m.userId === userId);
  if (!member || !["owner", "admin"].includes(member.role)) return false;

  const targetIndex = workspace.members.findIndex((m) => m.userId === targetUserId);
  if (targetIndex === -1) return false;
  if (workspace.members[targetIndex].role === "owner") return false;

  workspace.members.splice(targetIndex, 1);
  workspace.updatedAt = new Date();

  return true;
}

// Channel functions
export function getWorkspaceChannels(workspaceId: string, userId: string): Channel[] {
  return Array.from(channels.values()).filter(
    (ch) =>
      ch.workspaceId === workspaceId &&
      (!ch.isPrivate || ch.members.includes(userId))
  );
}

export function getChannel(channelId: string): Channel | undefined {
  return channels.get(channelId);
}

export function createChannel(
  userId: string,
  workspaceId: string,
  data: {
    name: string;
    description: string;
    type: Channel["type"];
    isPrivate: boolean;
    members?: string[];
  }
): Channel {
  const channel: Channel = {
    id: `ch-${Date.now()}`,
    workspaceId,
    name: data.name,
    description: data.description,
    type: data.type,
    isPrivate: data.isPrivate,
    members: data.members || [userId],
    pinnedItems: [],
    createdBy: userId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  channels.set(channel.id, channel);
  return channel;
}

export function updateChannel(
  channelId: string,
  userId: string,
  updates: Partial<Pick<Channel, "name" | "description" | "isPrivate">>
): Channel | null {
  const channel = channels.get(channelId);
  if (!channel) return null;

  Object.assign(channel, updates, { updatedAt: new Date() });
  return channel;
}

export function addChannelMember(channelId: string, targetUserId: string): boolean {
  const channel = channels.get(channelId);
  if (!channel) return false;

  if (!channel.members.includes(targetUserId)) {
    channel.members.push(targetUserId);
    channel.updatedAt = new Date();
  }

  return true;
}

export function removeChannelMember(channelId: string, targetUserId: string): boolean {
  const channel = channels.get(channelId);
  if (!channel) return false;

  const index = channel.members.indexOf(targetUserId);
  if (index > -1) {
    channel.members.splice(index, 1);
    channel.updatedAt = new Date();
  }

  return true;
}

// Message functions
export function getChannelMessages(
  channelId: string,
  options?: { limit?: number; before?: Date }
): Message[] {
  let msgs = Array.from(messages.values())
    .filter((msg) => msg.channelId === channelId && !msg.threadId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  if (options?.before) {
    msgs = msgs.filter((msg) => msg.createdAt < options.before!);
  }

  if (options?.limit) {
    msgs = msgs.slice(0, options.limit);
  }

  return msgs.reverse();
}

export function getThreadMessages(threadId: string): Message[] {
  return Array.from(messages.values())
    .filter((msg) => msg.threadId === threadId)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

export function sendMessage(
  userId: string,
  userName: string,
  channelId: string,
  workspaceId: string,
  data: {
    content: string;
    type?: Message["type"];
    attachments?: MessageAttachment[];
    mentions?: string[];
    threadId?: string;
  }
): Message {
  const message: Message = {
    id: `msg-${Date.now()}`,
    channelId,
    workspaceId,
    authorId: userId,
    authorName: userName,
    content: data.content,
    type: data.type || "text",
    attachments: data.attachments || [],
    mentions: data.mentions || [],
    reactions: [],
    threadId: data.threadId,
    isPinned: false,
    isEdited: false,
    createdAt: new Date(),
  };

  messages.set(message.id, message);

  // Update thread count if this is a thread reply
  if (data.threadId) {
    const parentMsg = messages.get(data.threadId);
    if (parentMsg) {
      parentMsg.threadCount = (parentMsg.threadCount || 0) + 1;
    }
  }

  // Create activity
  createActivity(workspaceId, channelId, userId, userName, {
    type: "message_sent",
    action: "sent a message in",
    targetType: "channel",
    targetId: channelId,
    targetName: channels.get(channelId)?.name || "channel",
  });

  return message;
}

export function editMessage(messageId: string, userId: string, newContent: string): Message | null {
  const message = messages.get(messageId);
  if (!message || message.authorId !== userId) return null;

  message.content = newContent;
  message.isEdited = true;
  message.editedAt = new Date();

  return message;
}

export function deleteMessage(messageId: string, userId: string): boolean {
  const message = messages.get(messageId);
  if (!message || message.authorId !== userId) return false;

  messages.delete(messageId);
  return true;
}

export function addReaction(messageId: string, userId: string, emoji: string): Message | null {
  const message = messages.get(messageId);
  if (!message) return null;

  const existingReaction = message.reactions.find((r) => r.emoji === emoji);
  if (existingReaction) {
    if (!existingReaction.users.includes(userId)) {
      existingReaction.users.push(userId);
      existingReaction.count++;
    }
  } else {
    message.reactions.push({ emoji, count: 1, users: [userId] });
  }

  return message;
}

export function removeReaction(messageId: string, userId: string, emoji: string): Message | null {
  const message = messages.get(messageId);
  if (!message) return null;

  const reactionIndex = message.reactions.findIndex((r) => r.emoji === emoji);
  if (reactionIndex > -1) {
    const reaction = message.reactions[reactionIndex];
    const userIndex = reaction.users.indexOf(userId);
    if (userIndex > -1) {
      reaction.users.splice(userIndex, 1);
      reaction.count--;
      if (reaction.count === 0) {
        message.reactions.splice(reactionIndex, 1);
      }
    }
  }

  return message;
}

export function pinMessage(messageId: string): Message | null {
  const message = messages.get(messageId);
  if (!message) return null;

  message.isPinned = true;
  return message;
}

export function unpinMessage(messageId: string): Message | null {
  const message = messages.get(messageId);
  if (!message) return null;

  message.isPinned = false;
  return message;
}

// Shared Content functions
export function getWorkspaceContent(
  workspaceId: string,
  options?: {
    type?: SharedContent["type"];
    status?: SharedContent["status"];
    channelId?: string;
  }
): SharedContent[] {
  let content = Array.from(sharedContent.values()).filter(
    (c) => c.workspaceId === workspaceId
  );

  if (options?.type) {
    content = content.filter((c) => c.type === options.type);
  }

  if (options?.status) {
    content = content.filter((c) => c.status === options.status);
  }

  if (options?.channelId) {
    content = content.filter((c) => c.channelId === options.channelId);
  }

  return content.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

export function getContent(contentId: string): SharedContent | undefined {
  return sharedContent.get(contentId);
}

export function createContent(
  userId: string,
  workspaceId: string,
  data: {
    channelId?: string;
    type: SharedContent["type"];
    title: string;
    content: string;
    mediaUrls?: string[];
    platforms?: string[];
    tags?: string[];
    dueDate?: Date;
  }
): SharedContent {
  const content: SharedContent = {
    id: `sc-${Date.now()}`,
    workspaceId,
    channelId: data.channelId,
    type: data.type,
    title: data.title,
    content: data.content,
    mediaUrls: data.mediaUrls || [],
    platforms: data.platforms || [],
    status: "draft",
    createdBy: userId,
    reviewers: [],
    comments: [],
    version: 1,
    tags: data.tags || [],
    dueDate: data.dueDate,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  sharedContent.set(content.id, content);

  // Create activity
  createActivity(workspaceId, data.channelId, userId, "User", {
    type: "content_created",
    action: "created new content",
    targetType: "content",
    targetId: content.id,
    targetName: content.title,
  });

  return content;
}

export function updateContent(
  contentId: string,
  userId: string,
  updates: Partial<
    Pick<
      SharedContent,
      "title" | "content" | "mediaUrls" | "platforms" | "status" | "assignedTo" | "reviewers" | "tags" | "dueDate"
    >
  >
): SharedContent | null {
  const content = sharedContent.get(contentId);
  if (!content) return null;

  Object.assign(content, updates, {
    updatedAt: new Date(),
    version: content.version + 1,
  });

  return content;
}

export function addContentComment(
  contentId: string,
  userId: string,
  userName: string,
  data: {
    text: string;
    mentions?: string[];
    position?: { start: number; end: number };
  }
): ContentComment | null {
  const content = sharedContent.get(contentId);
  if (!content) return null;

  const comment: ContentComment = {
    id: `cmt-${Date.now()}`,
    contentId,
    authorId: userId,
    authorName: userName,
    text: data.text,
    mentions: data.mentions || [],
    isResolved: false,
    position: data.position,
    createdAt: new Date(),
  };

  content.comments.push(comment);
  content.updatedAt = new Date();

  // Create activity
  createActivity(content.workspaceId, content.channelId, userId, userName, {
    type: "comment_added",
    action: "commented on",
    targetType: "content",
    targetId: contentId,
    targetName: content.title,
  });

  return comment;
}

export function resolveComment(contentId: string, commentId: string, userId: string): boolean {
  const content = sharedContent.get(contentId);
  if (!content) return false;

  const comment = content.comments.find((c) => c.id === commentId);
  if (!comment) return false;

  comment.isResolved = true;
  comment.resolvedBy = userId;
  comment.resolvedAt = new Date();

  return true;
}

export function approveContent(contentId: string, userId: string, userName: string): SharedContent | null {
  const content = sharedContent.get(contentId);
  if (!content) return null;

  content.status = "approved";
  content.updatedAt = new Date();

  createActivity(content.workspaceId, content.channelId, userId, userName, {
    type: "content_approved",
    action: "approved",
    targetType: "content",
    targetId: contentId,
    targetName: content.title,
  });

  return content;
}

export function rejectContent(contentId: string, userId: string, userName: string): SharedContent | null {
  const content = sharedContent.get(contentId);
  if (!content) return null;

  content.status = "draft";
  content.updatedAt = new Date();

  createActivity(content.workspaceId, content.channelId, userId, userName, {
    type: "content_rejected",
    action: "requested changes on",
    targetType: "content",
    targetId: contentId,
    targetName: content.title,
  });

  return content;
}

// Task functions
export function getWorkspaceTasks(
  workspaceId: string,
  options?: {
    status?: CollabTask["status"];
    assignedTo?: string;
    priority?: CollabTask["priority"];
  }
): CollabTask[] {
  let taskList = Array.from(tasks.values()).filter((t) => t.workspaceId === workspaceId);

  if (options?.status) {
    taskList = taskList.filter((t) => t.status === options.status);
  }

  if (options?.assignedTo) {
    taskList = taskList.filter((t) => t.assignedTo === options.assignedTo);
  }

  if (options?.priority) {
    taskList = taskList.filter((t) => t.priority === options.priority);
  }

  return taskList.sort((a, b) => {
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

export function getTask(taskId: string): CollabTask | undefined {
  return tasks.get(taskId);
}

export function createTask(
  userId: string,
  userName: string,
  workspaceId: string,
  data: {
    channelId?: string;
    title: string;
    description: string;
    type: CollabTask["type"];
    priority: CollabTask["priority"];
    assignedTo: string;
    relatedContentId?: string;
    dueDate?: Date;
    tags?: string[];
  }
): CollabTask {
  const task: CollabTask = {
    id: `task-${Date.now()}`,
    workspaceId,
    channelId: data.channelId,
    title: data.title,
    description: data.description,
    type: data.type,
    priority: data.priority,
    status: "todo",
    assignedTo: data.assignedTo,
    assignedBy: userId,
    relatedContentId: data.relatedContentId,
    dueDate: data.dueDate,
    tags: data.tags || [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  tasks.set(task.id, task);

  createActivity(workspaceId, data.channelId, userId, userName, {
    type: "task_assigned",
    action: `assigned task to ${data.assignedTo}`,
    targetType: "task",
    targetId: task.id,
    targetName: task.title,
  });

  return task;
}

export function updateTask(
  taskId: string,
  updates: Partial<
    Pick<CollabTask, "title" | "description" | "priority" | "status" | "assignedTo" | "dueDate" | "tags">
  >
): CollabTask | null {
  const task = tasks.get(taskId);
  if (!task) return null;

  const wasCompleted = task.status === "completed";
  Object.assign(task, updates, { updatedAt: new Date() });

  if (!wasCompleted && task.status === "completed") {
    task.completedAt = new Date();
  }

  return task;
}

export function completeTask(taskId: string, userId: string, userName: string): CollabTask | null {
  const task = tasks.get(taskId);
  if (!task) return null;

  task.status = "completed";
  task.completedAt = new Date();
  task.updatedAt = new Date();

  createActivity(task.workspaceId, task.channelId, userId, userName, {
    type: "task_completed",
    action: "completed task",
    targetType: "task",
    targetId: taskId,
    targetName: task.title,
  });

  return task;
}

export function deleteTask(taskId: string): boolean {
  return tasks.delete(taskId);
}

// Activity functions
export function getWorkspaceActivities(
  workspaceId: string,
  options?: { limit?: number; channelId?: string; userId?: string }
): Activity[] {
  let activityList = Array.from(activities.values()).filter(
    (a) => a.workspaceId === workspaceId
  );

  if (options?.channelId) {
    activityList = activityList.filter((a) => a.channelId === options.channelId);
  }

  if (options?.userId) {
    activityList = activityList.filter((a) => a.userId === options.userId);
  }

  activityList = activityList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  if (options?.limit) {
    activityList = activityList.slice(0, options.limit);
  }

  return activityList;
}

function createActivity(
  workspaceId: string,
  channelId: string | undefined,
  userId: string,
  userName: string,
  data: {
    type: ActivityType;
    action: string;
    targetType: Activity["targetType"];
    targetId: string;
    targetName: string;
    metadata?: Record<string, unknown>;
  }
): Activity {
  const activity: Activity = {
    id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    workspaceId,
    channelId,
    userId,
    userName,
    type: data.type,
    action: data.action,
    targetType: data.targetType,
    targetId: data.targetId,
    targetName: data.targetName,
    metadata: data.metadata,
    createdAt: new Date(),
  };

  activities.set(activity.id, activity);
  return activity;
}

// Stats and analytics
export function getCollaborationStats(workspaceId: string): {
  totalMembers: number;
  activeMembers: number;
  totalChannels: number;
  totalMessages: number;
  totalContent: number;
  pendingTasks: number;
  completedTasks: number;
  recentActivity: number;
} {
  const workspace = workspaces.get(workspaceId);
  if (!workspace) {
    return {
      totalMembers: 0,
      activeMembers: 0,
      totalChannels: 0,
      totalMessages: 0,
      totalContent: 0,
      pendingTasks: 0,
      completedTasks: 0,
      recentActivity: 0,
    };
  }

  const wsChannels = Array.from(channels.values()).filter(
    (ch) => ch.workspaceId === workspaceId
  );
  const wsMessages = Array.from(messages.values()).filter(
    (msg) => msg.workspaceId === workspaceId
  );
  const wsContent = Array.from(sharedContent.values()).filter(
    (c) => c.workspaceId === workspaceId
  );
  const wsTasks = Array.from(tasks.values()).filter((t) => t.workspaceId === workspaceId);
  const wsActivities = Array.from(activities.values()).filter(
    (a) => a.workspaceId === workspaceId
  );

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  return {
    totalMembers: workspace.members.length,
    activeMembers: workspace.members.filter((m) => m.status === "active").length,
    totalChannels: wsChannels.length,
    totalMessages: wsMessages.length,
    totalContent: wsContent.length,
    pendingTasks: wsTasks.filter((t) => t.status !== "completed" && t.status !== "cancelled")
      .length,
    completedTasks: wsTasks.filter((t) => t.status === "completed").length,
    recentActivity: wsActivities.filter((a) => a.createdAt > sevenDaysAgo).length,
  };
}

// Search functions
export function searchWorkspace(
  workspaceId: string,
  query: string
): {
  messages: Message[];
  content: SharedContent[];
  tasks: CollabTask[];
} {
  const lowerQuery = query.toLowerCase();

  const matchingMessages = Array.from(messages.values()).filter(
    (msg) =>
      msg.workspaceId === workspaceId &&
      msg.content.toLowerCase().includes(lowerQuery)
  );

  const matchingContent = Array.from(sharedContent.values()).filter(
    (c) =>
      c.workspaceId === workspaceId &&
      (c.title.toLowerCase().includes(lowerQuery) ||
        c.content.toLowerCase().includes(lowerQuery))
  );

  const matchingTasks = Array.from(tasks.values()).filter(
    (t) =>
      t.workspaceId === workspaceId &&
      (t.title.toLowerCase().includes(lowerQuery) ||
        t.description.toLowerCase().includes(lowerQuery))
  );

  return {
    messages: matchingMessages.slice(0, 10),
    content: matchingContent.slice(0, 10),
    tasks: matchingTasks.slice(0, 10),
  };
}

// Export types and constants
export const TASK_TYPES = ["content", "review", "approval", "feedback", "other"] as const;
export const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export const TASK_STATUSES = ["todo", "in_progress", "review", "completed", "cancelled"] as const;
export const CONTENT_TYPES = ["draft", "post", "template", "asset", "document"] as const;
export const CONTENT_STATUSES = ["draft", "review", "approved", "scheduled", "published"] as const;
export const CHANNEL_TYPES = ["general", "project", "campaign", "content", "private"] as const;
export const MEMBER_ROLES = ["owner", "admin", "editor", "viewer"] as const;
