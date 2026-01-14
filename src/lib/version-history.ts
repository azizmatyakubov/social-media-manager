export interface ContentVersion {
  id: string;
  contentId: string;
  userId: string;
  versionNumber: number;
  content: {
    text: string;
    media?: {
      type: "image" | "video" | "gif";
      url: string;
      altText?: string;
    }[];
    hashtags?: string[];
    mentions?: string[];
    links?: string[];
  };
  metadata: {
    platforms: string[];
    scheduledFor?: Date;
    status: "draft" | "scheduled" | "published";
    characterCount: number;
  };
  changes: {
    type: "created" | "edited" | "media_added" | "media_removed" | "scheduled" | "restored";
    description: string;
    diff?: {
      added: string[];
      removed: string[];
      modified: string[];
    };
  };
  author: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: Date;
  restoredFrom?: string; // Version ID if this was restored from another version
}

export interface ContentItem {
  id: string;
  userId: string;
  title?: string;
  currentVersion: number;
  type: "post" | "thread" | "story" | "reel";
  platforms: string[];
  status: "draft" | "scheduled" | "published" | "archived";
  publishedAt?: Date;
  versionCount: number;
  lastEditedAt: Date;
  createdAt: Date;
}

export interface VersionComparison {
  versionA: ContentVersion;
  versionB: ContentVersion;
  textDiff: {
    type: "added" | "removed" | "unchanged";
    value: string;
  }[];
  changes: {
    field: string;
    oldValue: string;
    newValue: string;
  }[];
}

export interface VersionStats {
  totalContent: number;
  totalVersions: number;
  avgVersionsPerContent: number;
  mostEditedContent: { id: string; title: string; versionCount: number }[];
  recentActivity: ContentVersion[];
  versionsByDay: { date: string; count: number }[];
}

// In-memory storage
const contentVersions = new Map<string, ContentVersion>();
const contentItems = new Map<string, ContentItem>();
const userContent = new Map<string, Set<string>>();
const contentVersionsIndex = new Map<string, Set<string>>(); // contentId -> version IDs

// Content Item CRUD
export function createContentItem(
  userId: string,
  data: {
    title?: string;
    type: ContentItem["type"];
    platforms: string[];
    initialContent: ContentVersion["content"];
    status?: ContentItem["status"];
  },
  author: ContentVersion["author"]
): { content: ContentItem; version: ContentVersion } {
  const contentId = crypto.randomUUID();

  const content: ContentItem = {
    id: contentId,
    userId,
    title: data.title,
    currentVersion: 1,
    type: data.type,
    platforms: data.platforms,
    status: data.status || "draft",
    versionCount: 1,
    lastEditedAt: new Date(),
    createdAt: new Date(),
  };

  contentItems.set(contentId, content);

  if (!userContent.has(userId)) {
    userContent.set(userId, new Set());
  }
  userContent.get(userId)!.add(contentId);

  // Create initial version
  const version = createVersion(contentId, userId, {
    content: data.initialContent,
    metadata: {
      platforms: data.platforms,
      status: data.status || "draft",
      characterCount: data.initialContent.text.length,
    },
    changes: {
      type: "created",
      description: "Initial version created",
    },
    author,
  });

  return { content, version };
}

export function getUserContent(userId: string): ContentItem[] {
  const contentIds = userContent.get(userId);
  if (!contentIds) return [];

  return Array.from(contentIds)
    .map((id) => contentItems.get(id))
    .filter((c): c is ContentItem => c !== undefined)
    .sort((a, b) => b.lastEditedAt.getTime() - a.lastEditedAt.getTime());
}

export function getContentItem(contentId: string, userId: string): ContentItem | null {
  const content = contentItems.get(contentId);
  if (!content || content.userId !== userId) return null;
  return content;
}

export function updateContentItem(
  contentId: string,
  userId: string,
  updates: Partial<Pick<ContentItem, "title" | "status" | "platforms">>
): ContentItem | null {
  const content = contentItems.get(contentId);
  if (!content || content.userId !== userId) return null;

  const updated: ContentItem = {
    ...content,
    ...updates,
    lastEditedAt: new Date(),
  };

  contentItems.set(contentId, updated);
  return updated;
}

export function deleteContentItem(contentId: string, userId: string): boolean {
  const content = contentItems.get(contentId);
  if (!content || content.userId !== userId) return false;

  // Delete all versions
  const versionIds = contentVersionsIndex.get(contentId);
  if (versionIds) {
    for (const versionId of versionIds) {
      contentVersions.delete(versionId);
    }
    contentVersionsIndex.delete(contentId);
  }

  contentItems.delete(contentId);
  userContent.get(userId)?.delete(contentId);
  return true;
}

// Version CRUD
export function createVersion(
  contentId: string,
  userId: string,
  data: {
    content: ContentVersion["content"];
    metadata: ContentVersion["metadata"];
    changes: ContentVersion["changes"];
    author: ContentVersion["author"];
    restoredFrom?: string;
  }
): ContentVersion {
  const content = contentItems.get(contentId);
  const versionNumber = content ? content.currentVersion : 1;

  const version: ContentVersion = {
    id: crypto.randomUUID(),
    contentId,
    userId,
    versionNumber,
    content: data.content,
    metadata: data.metadata,
    changes: data.changes,
    author: data.author,
    createdAt: new Date(),
    restoredFrom: data.restoredFrom,
  };

  contentVersions.set(version.id, version);

  if (!contentVersionsIndex.has(contentId)) {
    contentVersionsIndex.set(contentId, new Set());
  }
  contentVersionsIndex.get(contentId)!.add(version.id);

  // Update content item
  if (content) {
    content.currentVersion = versionNumber + 1;
    content.versionCount++;
    content.lastEditedAt = new Date();
    contentItems.set(contentId, content);
  }

  return version;
}

export function getContentVersions(contentId: string, userId: string): ContentVersion[] {
  const content = contentItems.get(contentId);
  if (!content || content.userId !== userId) return [];

  const versionIds = contentVersionsIndex.get(contentId);
  if (!versionIds) return [];

  return Array.from(versionIds)
    .map((id) => contentVersions.get(id))
    .filter((v): v is ContentVersion => v !== undefined)
    .sort((a, b) => b.versionNumber - a.versionNumber);
}

export function getVersion(versionId: string, userId: string): ContentVersion | null {
  const version = contentVersions.get(versionId);
  if (!version || version.userId !== userId) return null;
  return version;
}

export function getLatestVersion(contentId: string, userId: string): ContentVersion | null {
  const versions = getContentVersions(contentId, userId);
  return versions.length > 0 ? versions[0] : null;
}

// Edit content (creates new version)
export function editContent(
  contentId: string,
  userId: string,
  newContent: ContentVersion["content"],
  author: ContentVersion["author"],
  description?: string
): ContentVersion | null {
  const content = contentItems.get(contentId);
  if (!content || content.userId !== userId) return null;

  const latestVersion = getLatestVersion(contentId, userId);

  // Calculate diff
  const diff = calculateDiff(latestVersion?.content, newContent);

  const version = createVersion(contentId, userId, {
    content: newContent,
    metadata: {
      platforms: content.platforms,
      status: content.status,
      characterCount: newContent.text.length,
    },
    changes: {
      type: "edited",
      description: description || "Content updated",
      diff,
    },
    author,
  });

  return version;
}

// Restore previous version
export function restoreVersion(
  versionId: string,
  userId: string,
  author: ContentVersion["author"]
): ContentVersion | null {
  const version = contentVersions.get(versionId);
  if (!version || version.userId !== userId) return null;

  const content = contentItems.get(version.contentId);
  if (!content) return null;

  const restoredVersion = createVersion(version.contentId, userId, {
    content: version.content,
    metadata: version.metadata,
    changes: {
      type: "restored",
      description: `Restored from version ${version.versionNumber}`,
    },
    author,
    restoredFrom: versionId,
  });

  return restoredVersion;
}

// Compare two versions
export function compareVersions(
  versionAId: string,
  versionBId: string,
  userId: string
): VersionComparison | null {
  const versionA = contentVersions.get(versionAId);
  const versionB = contentVersions.get(versionBId);

  if (!versionA || !versionB || versionA.userId !== userId || versionB.userId !== userId) {
    return null;
  }

  // Simple word-based diff
  const textDiff = createTextDiff(versionA.content.text, versionB.content.text);

  const changes: { field: string; oldValue: string; newValue: string }[] = [];

  // Compare platforms
  if (JSON.stringify(versionA.metadata.platforms) !== JSON.stringify(versionB.metadata.platforms)) {
    changes.push({
      field: "platforms",
      oldValue: versionA.metadata.platforms.join(", "),
      newValue: versionB.metadata.platforms.join(", "),
    });
  }

  // Compare status
  if (versionA.metadata.status !== versionB.metadata.status) {
    changes.push({
      field: "status",
      oldValue: versionA.metadata.status,
      newValue: versionB.metadata.status,
    });
  }

  // Compare hashtags
  const hashtagsA = versionA.content.hashtags?.join(", ") || "";
  const hashtagsB = versionB.content.hashtags?.join(", ") || "";
  if (hashtagsA !== hashtagsB) {
    changes.push({
      field: "hashtags",
      oldValue: hashtagsA,
      newValue: hashtagsB,
    });
  }

  // Compare media count
  const mediaA = versionA.content.media?.length || 0;
  const mediaB = versionB.content.media?.length || 0;
  if (mediaA !== mediaB) {
    changes.push({
      field: "media",
      oldValue: `${mediaA} item(s)`,
      newValue: `${mediaB} item(s)`,
    });
  }

  return {
    versionA,
    versionB,
    textDiff,
    changes,
  };
}

// Calculate diff between content objects
function calculateDiff(
  oldContent: ContentVersion["content"] | undefined,
  newContent: ContentVersion["content"]
): { added: string[]; removed: string[]; modified: string[] } {
  const added: string[] = [];
  const removed: string[] = [];
  const modified: string[] = [];

  if (!oldContent) {
    return { added: ["Initial content"], removed: [], modified: [] };
  }

  // Text changes
  if (oldContent.text !== newContent.text) {
    modified.push("text");
  }

  // Hashtag changes
  const oldHashtags = new Set(oldContent.hashtags || []);
  const newHashtags = new Set(newContent.hashtags || []);
  for (const tag of newHashtags) {
    if (!oldHashtags.has(tag)) added.push(`hashtag: ${tag}`);
  }
  for (const tag of oldHashtags) {
    if (!newHashtags.has(tag)) removed.push(`hashtag: ${tag}`);
  }

  // Media changes
  const oldMediaCount = oldContent.media?.length || 0;
  const newMediaCount = newContent.media?.length || 0;
  if (newMediaCount > oldMediaCount) {
    added.push(`${newMediaCount - oldMediaCount} media item(s)`);
  } else if (newMediaCount < oldMediaCount) {
    removed.push(`${oldMediaCount - newMediaCount} media item(s)`);
  }

  return { added, removed, modified };
}

// Create simple text diff
function createTextDiff(
  oldText: string,
  newText: string
): { type: "added" | "removed" | "unchanged"; value: string }[] {
  const oldWords = oldText.split(/\s+/);
  const newWords = newText.split(/\s+/);
  const result: { type: "added" | "removed" | "unchanged"; value: string }[] = [];

  const oldSet = new Set(oldWords);
  const newSet = new Set(newWords);

  // Find unchanged, added, removed
  let unchangedBuffer = "";
  let addedBuffer = "";
  let removedBuffer = "";

  const maxLen = Math.max(oldWords.length, newWords.length);
  for (let i = 0; i < maxLen; i++) {
    const oldWord = oldWords[i] || "";
    const newWord = newWords[i] || "";

    if (oldWord === newWord) {
      if (removedBuffer) {
        result.push({ type: "removed", value: removedBuffer.trim() });
        removedBuffer = "";
      }
      if (addedBuffer) {
        result.push({ type: "added", value: addedBuffer.trim() });
        addedBuffer = "";
      }
      unchangedBuffer += " " + oldWord;
    } else {
      if (unchangedBuffer) {
        result.push({ type: "unchanged", value: unchangedBuffer.trim() });
        unchangedBuffer = "";
      }
      if (oldWord && !newSet.has(oldWord)) {
        removedBuffer += " " + oldWord;
      }
      if (newWord && !oldSet.has(newWord)) {
        addedBuffer += " " + newWord;
      }
    }
  }

  // Flush buffers
  if (unchangedBuffer) {
    result.push({ type: "unchanged", value: unchangedBuffer.trim() });
  }
  if (removedBuffer) {
    result.push({ type: "removed", value: removedBuffer.trim() });
  }
  if (addedBuffer) {
    result.push({ type: "added", value: addedBuffer.trim() });
  }

  return result.filter((r) => r.value);
}

// Get version stats
export function getVersionStats(userId: string): VersionStats {
  const contents = getUserContent(userId);

  let totalVersions = 0;
  const mostEditedContent: { id: string; title: string; versionCount: number }[] = [];

  for (const content of contents) {
    totalVersions += content.versionCount;
    mostEditedContent.push({
      id: content.id,
      title: content.title || `Untitled ${content.type}`,
      versionCount: content.versionCount,
    });
  }

  mostEditedContent.sort((a, b) => b.versionCount - a.versionCount);

  // Get recent activity
  const allVersionIds: string[] = [];
  for (const content of contents) {
    const versionIds = contentVersionsIndex.get(content.id);
    if (versionIds) {
      allVersionIds.push(...versionIds);
    }
  }

  const recentActivity = allVersionIds
    .map((id) => contentVersions.get(id))
    .filter((v): v is ContentVersion => v !== undefined)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 10);

  // Versions by day (last 7 days)
  const versionsByDay: { date: string; count: number }[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toLocaleDateString();

    const count = recentActivity.filter((v) => {
      const vDate = new Date(v.createdAt).toLocaleDateString();
      return vDate === dateStr;
    }).length;

    versionsByDay.push({ date: dateStr, count });
  }

  return {
    totalContent: contents.length,
    totalVersions,
    avgVersionsPerContent: contents.length > 0 ? totalVersions / contents.length : 0,
    mostEditedContent: mostEditedContent.slice(0, 5),
    recentActivity,
    versionsByDay,
  };
}

// Search versions
export function searchVersions(
  userId: string,
  query: string
): ContentVersion[] {
  const contents = getUserContent(userId);
  const results: ContentVersion[] = [];
  const lowerQuery = query.toLowerCase();

  for (const content of contents) {
    const versions = getContentVersions(content.id, userId);
    for (const version of versions) {
      if (
        version.content.text.toLowerCase().includes(lowerQuery) ||
        version.content.hashtags?.some((h) => h.toLowerCase().includes(lowerQuery)) ||
        version.changes.description.toLowerCase().includes(lowerQuery)
      ) {
        results.push(version);
      }
    }
  }

  return results.slice(0, 50);
}

export const CONTENT_TYPES = [
  { value: "post", label: "Post", icon: "📝" },
  { value: "thread", label: "Thread", icon: "🧵" },
  { value: "story", label: "Story", icon: "📖" },
  { value: "reel", label: "Reel", icon: "🎬" },
] as const;

export const CHANGE_TYPES = [
  { value: "created", label: "Created", color: "green" },
  { value: "edited", label: "Edited", color: "blue" },
  { value: "media_added", label: "Media Added", color: "purple" },
  { value: "media_removed", label: "Media Removed", color: "orange" },
  { value: "scheduled", label: "Scheduled", color: "cyan" },
  { value: "restored", label: "Restored", color: "yellow" },
] as const;
