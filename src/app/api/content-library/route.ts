import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createAsset,
  updateAsset,
  deleteAsset,
  deleteAssets,
  getAssets,
  getAsset,
  incrementAssetUsage,
  bulkUpdateAssets,
  createFolder,
  updateFolder,
  deleteFolder,
  getFolders,
  getFolder,
  getLibraryStats,
  getAllTags,
  searchAssets,
  getAssetTypeFromMime,
  type AssetType,
} from "@/lib/content-library";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    switch (action) {
      case "assets": {
        const folderId = searchParams.get("folderId");
        const type = searchParams.get("type") as AssetType | null;
        const search = searchParams.get("search") || undefined;
        const tags = searchParams.get("tags")?.split(",").filter(Boolean);
        const sortBy = searchParams.get("sortBy") as "name" | "createdAt" | "size" | "usageCount" | null;
        const sortOrder = searchParams.get("sortOrder") as "asc" | "desc" | null;
        const limit = searchParams.get("limit");
        const offset = searchParams.get("offset");

        const assets = await getAssets(session.user.id, {
          folderId: folderId === "null" ? null : folderId || undefined,
          type: type || undefined,
          search,
          tags,
          sortBy: sortBy || undefined,
          sortOrder: sortOrder || undefined,
          limit: limit ? parseInt(limit) : undefined,
          offset: offset ? parseInt(offset) : undefined,
        });

        return NextResponse.json({ assets });
      }

      case "asset": {
        const assetId = searchParams.get("assetId");
        if (!assetId) {
          return NextResponse.json({ error: "Asset ID required" }, { status: 400 });
        }
        const asset = await getAsset(assetId, session.user.id);
        return NextResponse.json({ asset });
      }

      case "folders": {
        const parentId = searchParams.get("parentId");
        const folders = await getFolders(
          session.user.id,
          parentId === "null" ? null : parentId || undefined
        );
        return NextResponse.json({ folders });
      }

      case "folder": {
        const folderId = searchParams.get("folderId");
        if (!folderId) {
          return NextResponse.json({ error: "Folder ID required" }, { status: 400 });
        }
        const folder = await getFolder(folderId, session.user.id);
        return NextResponse.json({ folder });
      }

      case "stats": {
        const stats = await getLibraryStats(session.user.id);
        return NextResponse.json({ stats });
      }

      case "tags": {
        const tags = await getAllTags(session.user.id);
        return NextResponse.json({ tags });
      }

      case "search": {
        const query = searchParams.get("query");
        if (!query) {
          return NextResponse.json({ error: "Query required" }, { status: 400 });
        }
        const limit = searchParams.get("limit");
        const results = await searchAssets(
          session.user.id,
          query,
          limit ? parseInt(limit) : undefined
        );
        return NextResponse.json({ results });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Content library GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch data" },
      { status: 500 }
    );
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
      case "create-asset": {
        const { name, url, type, mimeType, size, width, height, duration, folderId, tags, altText } = data;

        if (!name || !url) {
          return NextResponse.json({ error: "Name and URL required" }, { status: 400 });
        }

        const assetType = type || (mimeType ? getAssetTypeFromMime(mimeType) : "IMAGE");

        const asset = await createAsset(session.user.id, {
          name,
          url,
          type: assetType,
          mimeType,
          size,
          width,
          height,
          duration,
          folderId,
          tags,
          altText,
        });

        return NextResponse.json({ asset });
      }

      case "update-asset": {
        const { assetId, ...updateData } = data;
        if (!assetId) {
          return NextResponse.json({ error: "Asset ID required" }, { status: 400 });
        }
        const asset = await updateAsset(assetId, session.user.id, updateData);
        return NextResponse.json({ asset });
      }

      case "delete-asset": {
        const { assetId } = data;
        if (!assetId) {
          return NextResponse.json({ error: "Asset ID required" }, { status: 400 });
        }
        await deleteAsset(assetId, session.user.id);
        return NextResponse.json({ success: true });
      }

      case "delete-assets": {
        const { assetIds } = data;
        if (!assetIds || !Array.isArray(assetIds)) {
          return NextResponse.json({ error: "Asset IDs array required" }, { status: 400 });
        }
        await deleteAssets(assetIds, session.user.id);
        return NextResponse.json({ success: true });
      }

      case "use-asset": {
        const { assetId } = data;
        if (!assetId) {
          return NextResponse.json({ error: "Asset ID required" }, { status: 400 });
        }
        await incrementAssetUsage(assetId);
        return NextResponse.json({ success: true });
      }

      case "bulk-update": {
        const { assetIds, folderId, addTags, removeTags } = data;
        if (!assetIds || !Array.isArray(assetIds)) {
          return NextResponse.json({ error: "Asset IDs array required" }, { status: 400 });
        }
        const result = await bulkUpdateAssets(assetIds, session.user.id, {
          folderId,
          addTags,
          removeTags,
        });
        return NextResponse.json({ result });
      }

      case "create-folder": {
        const { name, color, parentId } = data;
        if (!name) {
          return NextResponse.json({ error: "Name required" }, { status: 400 });
        }
        const folder = await createFolder(session.user.id, { name, color, parentId });
        return NextResponse.json({ folder });
      }

      case "update-folder": {
        const { folderId, ...updateData } = data;
        if (!folderId) {
          return NextResponse.json({ error: "Folder ID required" }, { status: 400 });
        }
        const folder = await updateFolder(folderId, session.user.id, updateData);
        return NextResponse.json({ folder });
      }

      case "delete-folder": {
        const { folderId } = data;
        if (!folderId) {
          return NextResponse.json({ error: "Folder ID required" }, { status: 400 });
        }
        await deleteFolder(folderId, session.user.id);
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Content library POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process request" },
      { status: 500 }
    );
  }
}
