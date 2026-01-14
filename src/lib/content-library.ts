import { prisma } from "./prisma";

// Types
export type AssetType = "IMAGE" | "VIDEO" | "GIF" | "DOCUMENT";

export interface AssetInput {
  name: string;
  url: string;
  type: AssetType;
  mimeType?: string;
  size?: number;
  width?: number;
  height?: number;
  duration?: number;
  folderId?: string;
  tags?: string[];
  altText?: string;
}

export interface FolderInput {
  name: string;
  color?: string;
  parentId?: string;
}

// Asset CRUD
export async function createAsset(userId: string, data: AssetInput) {
  return prisma.mediaAsset.create({
    data: {
      userId,
      name: data.name,
      url: data.url,
      type: data.type,
      mimeType: data.mimeType,
      size: data.size,
      width: data.width,
      height: data.height,
      duration: data.duration,
      folderId: data.folderId,
      tags: data.tags || [],
      altText: data.altText,
    },
  });
}

export async function updateAsset(
  assetId: string,
  userId: string,
  data: Partial<AssetInput>
) {
  return prisma.mediaAsset.update({
    where: { id: assetId, userId },
    data,
  });
}

export async function deleteAsset(assetId: string, userId: string) {
  return prisma.mediaAsset.delete({
    where: { id: assetId, userId },
  });
}

export async function deleteAssets(assetIds: string[], userId: string) {
  return prisma.mediaAsset.deleteMany({
    where: {
      id: { in: assetIds },
      userId,
    },
  });
}

// Get assets with filtering and pagination
export async function getAssets(
  userId: string,
  options?: {
    folderId?: string | null;
    type?: AssetType;
    search?: string;
    tags?: string[];
    sortBy?: "name" | "createdAt" | "size" | "usageCount";
    sortOrder?: "asc" | "desc";
    limit?: number;
    offset?: number;
  }
) {
  const where: Record<string, unknown> = { userId };

  if (options?.folderId !== undefined) {
    where.folderId = options.folderId;
  }

  if (options?.type) {
    where.type = options.type;
  }

  if (options?.search) {
    where.OR = [
      { name: { contains: options.search, mode: "insensitive" } },
      { tags: { has: options.search.toLowerCase() } },
      { altText: { contains: options.search, mode: "insensitive" } },
    ];
  }

  if (options?.tags && options.tags.length > 0) {
    where.tags = { hasEvery: options.tags };
  }

  const orderBy: Record<string, string> = {};
  if (options?.sortBy) {
    orderBy[options.sortBy] = options.sortOrder || "desc";
  } else {
    orderBy.createdAt = "desc";
  }

  return prisma.mediaAsset.findMany({
    where,
    orderBy,
    take: options?.limit ?? 50,
    skip: options?.offset ?? 0,
    include: {
      folder: true,
    },
  });
}

// Get single asset
export async function getAsset(assetId: string, userId: string) {
  return prisma.mediaAsset.findFirst({
    where: { id: assetId, userId },
    include: { folder: true },
  });
}

// Increment usage count
export async function incrementAssetUsage(assetId: string) {
  return prisma.mediaAsset.update({
    where: { id: assetId },
    data: {
      usageCount: { increment: 1 },
      lastUsedAt: new Date(),
    },
  });
}

// Bulk update assets (move to folder, add tags)
export async function bulkUpdateAssets(
  assetIds: string[],
  userId: string,
  data: { folderId?: string | null; addTags?: string[]; removeTags?: string[] }
) {
  // Get current assets to handle tag operations
  if (data.addTags || data.removeTags) {
    const assets = await prisma.mediaAsset.findMany({
      where: { id: { in: assetIds }, userId },
      select: { id: true, tags: true },
    });

    for (const asset of assets) {
      let newTags = [...asset.tags];

      if (data.addTags) {
        newTags = [...new Set([...newTags, ...data.addTags])];
      }

      if (data.removeTags) {
        newTags = newTags.filter((t) => !data.removeTags?.includes(t));
      }

      await prisma.mediaAsset.update({
        where: { id: asset.id },
        data: {
          tags: newTags,
          ...(data.folderId !== undefined ? { folderId: data.folderId } : {}),
        },
      });
    }

    return { updated: assets.length };
  }

  // Just update folder
  if (data.folderId !== undefined) {
    return prisma.mediaAsset.updateMany({
      where: { id: { in: assetIds }, userId },
      data: { folderId: data.folderId },
    });
  }

  return { updated: 0 };
}

// Folder CRUD
export async function createFolder(userId: string, data: FolderInput) {
  return prisma.mediaFolder.create({
    data: {
      userId,
      name: data.name,
      color: data.color || "#6366F1",
      parentId: data.parentId,
    },
  });
}

export async function updateFolder(
  folderId: string,
  userId: string,
  data: Partial<FolderInput>
) {
  return prisma.mediaFolder.update({
    where: { id: folderId, userId },
    data,
  });
}

export async function deleteFolder(folderId: string, userId: string) {
  // Move assets to root first
  await prisma.mediaAsset.updateMany({
    where: { folderId, userId },
    data: { folderId: null },
  });

  // Move subfolders to root
  await prisma.mediaFolder.updateMany({
    where: { parentId: folderId, userId },
    data: { parentId: null },
  });

  return prisma.mediaFolder.delete({
    where: { id: folderId, userId },
  });
}

export async function getFolders(userId: string, parentId?: string | null) {
  const where: Record<string, unknown> = { userId };

  if (parentId !== undefined) {
    where.parentId = parentId;
  }

  return prisma.mediaFolder.findMany({
    where,
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { assets: true, children: true },
      },
    },
  });
}

// Get folder with assets
export async function getFolder(folderId: string, userId: string) {
  return prisma.mediaFolder.findFirst({
    where: { id: folderId, userId },
    include: {
      assets: {
        orderBy: { createdAt: "desc" },
        take: 100,
      },
      children: {
        include: {
          _count: {
            select: { assets: true },
          },
        },
      },
      parent: true,
    },
  });
}

// Get library statistics
export async function getLibraryStats(userId: string) {
  const [
    totalAssets,
    imageCount,
    videoCount,
    gifCount,
    totalFolders,
    recentAssets,
    totalSize,
    mostUsed,
  ] = await Promise.all([
    prisma.mediaAsset.count({ where: { userId } }),
    prisma.mediaAsset.count({ where: { userId, type: "IMAGE" } }),
    prisma.mediaAsset.count({ where: { userId, type: "VIDEO" } }),
    prisma.mediaAsset.count({ where: { userId, type: "GIF" } }),
    prisma.mediaFolder.count({ where: { userId } }),
    prisma.mediaAsset.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, url: true, type: true, createdAt: true },
    }),
    prisma.mediaAsset.aggregate({
      where: { userId },
      _sum: { size: true },
    }),
    prisma.mediaAsset.findMany({
      where: { userId, usageCount: { gt: 0 } },
      orderBy: { usageCount: "desc" },
      take: 5,
      select: { id: true, name: true, url: true, type: true, usageCount: true },
    }),
  ]);

  return {
    totalAssets,
    imageCount,
    videoCount,
    gifCount,
    documentCount: totalAssets - imageCount - videoCount - gifCount,
    totalFolders,
    recentAssets,
    totalSizeBytes: totalSize._sum.size || 0,
    totalSizeMB: Math.round((totalSize._sum.size || 0) / 1024 / 1024 * 100) / 100,
    mostUsed,
  };
}

// Get all unique tags
export async function getAllTags(userId: string) {
  const assets = await prisma.mediaAsset.findMany({
    where: { userId },
    select: { tags: true },
  });

  const tagCounts: Record<string, number> = {};
  assets.forEach((asset) => {
    asset.tags.forEach((tag) => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });

  return Object.entries(tagCounts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}

// Search assets globally
export async function searchAssets(userId: string, query: string, limit: number = 20) {
  return prisma.mediaAsset.findMany({
    where: {
      userId,
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { tags: { has: query.toLowerCase() } },
        { altText: { contains: query, mode: "insensitive" } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

// Helper to determine asset type from mime type
export function getAssetTypeFromMime(mimeType: string): AssetType {
  if (mimeType.startsWith("image/gif")) return "GIF";
  if (mimeType.startsWith("image/")) return "IMAGE";
  if (mimeType.startsWith("video/")) return "VIDEO";
  return "DOCUMENT";
}

// Format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
