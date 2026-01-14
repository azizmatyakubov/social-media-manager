"use client";

import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

type AssetType = "IMAGE" | "VIDEO" | "GIF" | "DOCUMENT";

interface Asset {
  id: string;
  name: string;
  url: string;
  type: AssetType;
  mimeType: string | null;
  size: number | null;
  width: number | null;
  height: number | null;
  tags: string[];
  altText: string | null;
  usageCount: number;
  lastUsedAt: string | null;
  folderId: string | null;
  createdAt: string;
  folder?: Folder | null;
}

interface Folder {
  id: string;
  name: string;
  color: string;
  parentId: string | null;
  _count?: { assets: number; children: number };
}

interface Stats {
  totalAssets: number;
  imageCount: number;
  videoCount: number;
  gifCount: number;
  documentCount: number;
  totalFolders: number;
  totalSizeMB: number;
  recentAssets: Asset[];
  mostUsed: Asset[];
}

interface Tag {
  tag: string;
  count: number;
}

const assetTypes: { id: AssetType | "ALL"; name: string; icon: string }[] = [
  { id: "ALL", name: "All", icon: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" },
  { id: "IMAGE", name: "Images", icon: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { id: "VIDEO", name: "Videos", icon: "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" },
  { id: "GIF", name: "GIFs", icon: "M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" },
  { id: "DOCUMENT", name: "Documents", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
];

const folderColors = [
  "#6366F1", "#8B5CF6", "#EC4899", "#EF4444", "#F59E0B",
  "#10B981", "#06B6D4", "#3B82F6", "#6B7280", "#78716C",
];

export default function ContentLibraryPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());

  // Filters
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<AssetType | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showAssetModal, setShowAssetModal] = useState<Asset | null>(null);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);

  // Form state
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState("#6366F1");
  const [uploadUrl, setUploadUrl] = useState("");
  const [uploadName, setUploadName] = useState("");
  const [uploadTags, setUploadTags] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, [currentFolder, typeFilter, selectedTags]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchQuery) {
        searchAssets();
      } else {
        fetchAssets();
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchAssets(), fetchFolders(), fetchStats(), fetchTags()]);
    setLoading(false);
  };

  const fetchAssets = async () => {
    try {
      const params = new URLSearchParams({ action: "assets" });
      if (currentFolder !== null) params.append("folderId", currentFolder || "null");
      if (typeFilter !== "ALL") params.append("type", typeFilter);
      if (selectedTags.length > 0) params.append("tags", selectedTags.join(","));

      const res = await fetch(`/api/content-library?${params}`);
      const data = await res.json();
      setAssets(data.assets || []);
    } catch (error) {
      console.error("Failed to fetch assets:", error);
    }
  };

  const fetchFolders = async () => {
    try {
      const params = new URLSearchParams({ action: "folders" });
      if (currentFolder) params.append("parentId", currentFolder);

      const res = await fetch(`/api/content-library?${params}`);
      const data = await res.json();
      setFolders(data.folders || []);
    } catch (error) {
      console.error("Failed to fetch folders:", error);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/content-library?action=stats");
      const data = await res.json();
      setStats(data.stats);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  const fetchTags = async () => {
    try {
      const res = await fetch("/api/content-library?action=tags");
      const data = await res.json();
      setTags(data.tags || []);
    } catch (error) {
      console.error("Failed to fetch tags:", error);
    }
  };

  const searchAssets = async () => {
    try {
      const res = await fetch(`/api/content-library?action=search&query=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setAssets(data.results || []);
    } catch (error) {
      console.error("Search failed:", error);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      await fetch("/api/content-library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: editingFolder ? "update-folder" : "create-folder",
          folderId: editingFolder?.id,
          name: newFolderName,
          color: newFolderColor,
          parentId: currentFolder,
        }),
      });

      setShowFolderModal(false);
      setNewFolderName("");
      setNewFolderColor("#6366F1");
      setEditingFolder(null);
      fetchFolders();
    } catch (error) {
      console.error("Failed to create folder:", error);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm("Delete this folder? Assets will be moved to the root.")) return;

    try {
      await fetch("/api/content-library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete-folder", folderId }),
      });
      fetchData();
    } catch (error) {
      console.error("Failed to delete folder:", error);
    }
  };

  const handleUploadByUrl = async () => {
    if (!uploadUrl.trim()) return;

    try {
      await fetch("/api/content-library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-asset",
          name: uploadName || uploadUrl.split("/").pop() || "Untitled",
          url: uploadUrl,
          type: "IMAGE",
          folderId: currentFolder,
          tags: uploadTags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean),
        }),
      });

      setShowUploadModal(false);
      setUploadUrl("");
      setUploadName("");
      setUploadTags("");
      fetchData();
    } catch (error) {
      console.error("Failed to upload:", error);
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    if (!confirm("Delete this asset?")) return;

    try {
      await fetch("/api/content-library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete-asset", assetId }),
      });
      setShowAssetModal(null);
      fetchData();
    } catch (error) {
      console.error("Failed to delete asset:", error);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedAssets.size === 0) return;
    if (!confirm(`Delete ${selectedAssets.size} selected assets?`)) return;

    try {
      await fetch("/api/content-library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete-assets",
          assetIds: Array.from(selectedAssets),
        }),
      });
      setSelectedAssets(new Set());
      fetchData();
    } catch (error) {
      console.error("Failed to delete assets:", error);
    }
  };

  const handleBulkMove = async (folderId: string | null) => {
    if (selectedAssets.size === 0) return;

    try {
      await fetch("/api/content-library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bulk-update",
          assetIds: Array.from(selectedAssets),
          folderId,
        }),
      });
      setSelectedAssets(new Set());
      fetchData();
    } catch (error) {
      console.error("Failed to move assets:", error);
    }
  };

  const copyAssetUrl = async (url: string) => {
    await navigator.clipboard.writeText(url);
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const getTypeIcon = (type: AssetType) => {
    const icons: Record<AssetType, string> = {
      IMAGE: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
      VIDEO: "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z",
      GIF: "M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z",
      DOCUMENT: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    };
    return icons[type];
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Content Library</h1>
            <p className="text-zinc-400 mt-1">
              Organize and manage your media assets
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowFolderModal(true)}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg font-medium transition flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
              New Folder
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload
            </button>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-5 gap-4">
            <div className="bg-zinc-900/50 rounded-xl p-4 border border-white/5">
              <p className="text-sm text-zinc-400">Total Assets</p>
              <p className="text-2xl font-bold mt-1">{stats.totalAssets}</p>
            </div>
            <div className="bg-zinc-900/50 rounded-xl p-4 border border-white/5">
              <p className="text-sm text-zinc-400">Images</p>
              <p className="text-2xl font-bold mt-1">{stats.imageCount}</p>
            </div>
            <div className="bg-zinc-900/50 rounded-xl p-4 border border-white/5">
              <p className="text-sm text-zinc-400">Videos</p>
              <p className="text-2xl font-bold mt-1">{stats.videoCount}</p>
            </div>
            <div className="bg-zinc-900/50 rounded-xl p-4 border border-white/5">
              <p className="text-sm text-zinc-400">Folders</p>
              <p className="text-2xl font-bold mt-1">{stats.totalFolders}</p>
            </div>
            <div className="bg-zinc-900/50 rounded-xl p-4 border border-white/5">
              <p className="text-sm text-zinc-400">Total Size</p>
              <p className="text-2xl font-bold mt-1">{stats.totalSizeMB} MB</p>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search assets..."
              className="w-full pl-10 pr-4 py-2 bg-zinc-900/50 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Type filter */}
          <div className="flex gap-1 bg-zinc-900/50 rounded-lg p-1">
            {assetTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setTypeFilter(type.id)}
                className={`px-3 py-1.5 rounded-md text-sm transition ${
                  typeFilter === type.id
                    ? "bg-indigo-600 text-white"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {type.name}
              </button>
            ))}
          </div>

          {/* View mode */}
          <div className="flex gap-1 bg-zinc-900/50 rounded-lg p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-md transition ${
                viewMode === "grid" ? "bg-white/10 text-white" : "text-zinc-400"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-md transition ${
                viewMode === "list" ? "bg-white/10 text-white" : "text-zinc-400"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
          </div>

          {/* Bulk actions */}
          {selectedAssets.size > 0 && (
            <div className="flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
              <span className="text-sm">{selectedAssets.size} selected</span>
              <button
                onClick={handleBulkDelete}
                className="p-1 hover:bg-red-500/20 text-red-400 rounded"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              <button
                onClick={() => setSelectedAssets(new Set())}
                className="text-xs text-zinc-400 hover:text-white"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Breadcrumb */}
        {currentFolder && (
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={() => setCurrentFolder(null)}
              className="text-zinc-400 hover:text-white transition"
            >
              Library
            </button>
            <span className="text-zinc-600">/</span>
            <span className="text-white">Current Folder</span>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-6">
            {/* Main content */}
            <div className="col-span-3">
              {/* Folders */}
              {folders.length > 0 && !searchQuery && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-zinc-400 mb-3">Folders</h3>
                  <div className="grid grid-cols-4 gap-3">
                    {folders.map((folder) => (
                      <div
                        key={folder.id}
                        className="bg-zinc-900/50 rounded-xl border border-white/5 p-4 hover:border-white/10 transition cursor-pointer group"
                        onClick={() => setCurrentFolder(folder.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: `${folder.color}20` }}
                            >
                              <svg className="w-6 h-6" style={{ color: folder.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                              </svg>
                            </div>
                            <div>
                              <p className="font-medium">{folder.name}</p>
                              <p className="text-xs text-zinc-500">{folder._count?.assets || 0} items</p>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingFolder(folder);
                              setNewFolderName(folder.name);
                              setNewFolderColor(folder.color);
                              setShowFolderModal(true);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded transition"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Assets */}
              <div>
                <h3 className="text-sm font-medium text-zinc-400 mb-3">
                  {searchQuery ? `Search Results (${assets.length})` : `Assets (${assets.length})`}
                </h3>

                {assets.length === 0 ? (
                  <div className="text-center py-12 bg-zinc-900/50 rounded-xl border border-white/5">
                    <svg className="w-16 h-16 mx-auto text-zinc-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <h3 className="text-lg font-medium mb-2">No Assets Yet</h3>
                    <p className="text-zinc-400 mb-4">Upload your first asset to get started</p>
                    <button
                      onClick={() => setShowUploadModal(true)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition"
                    >
                      Upload Asset
                    </button>
                  </div>
                ) : viewMode === "grid" ? (
                  <div className="grid grid-cols-4 gap-4">
                    {assets.map((asset) => (
                      <div
                        key={asset.id}
                        className={`bg-zinc-900/50 rounded-xl border overflow-hidden group cursor-pointer transition ${
                          selectedAssets.has(asset.id)
                            ? "border-indigo-500 ring-2 ring-indigo-500/20"
                            : "border-white/5 hover:border-white/10"
                        }`}
                        onClick={() => setShowAssetModal(asset)}
                      >
                        <div className="aspect-square relative bg-zinc-800">
                          {asset.type === "IMAGE" || asset.type === "GIF" ? (
                            <img
                              src={asset.url}
                              alt={asset.altText || asset.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <svg className="w-12 h-12 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={getTypeIcon(asset.type)} />
                              </svg>
                            </div>
                          )}
                          <div className="absolute top-2 left-2">
                            <input
                              type="checkbox"
                              checked={selectedAssets.has(asset.id)}
                              onChange={(e) => {
                                e.stopPropagation();
                                const newSelected = new Set(selectedAssets);
                                if (e.target.checked) {
                                  newSelected.add(asset.id);
                                } else {
                                  newSelected.delete(asset.id);
                                }
                                setSelectedAssets(newSelected);
                              }}
                              className="w-5 h-5 rounded border-zinc-600 bg-zinc-800/80 text-indigo-600 focus:ring-indigo-500 opacity-0 group-hover:opacity-100 transition"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>
                        <div className="p-3">
                          <p className="font-medium text-sm truncate">{asset.name}</p>
                          <p className="text-xs text-zinc-500 mt-1">{formatSize(asset.size)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-zinc-900/50 rounded-xl border border-white/5 overflow-hidden">
                    <table className="w-full">
                      <thead className="border-b border-white/5">
                        <tr>
                          <th className="w-10 p-3"></th>
                          <th className="text-left text-xs font-medium text-zinc-400 p-3">Name</th>
                          <th className="text-left text-xs font-medium text-zinc-400 p-3">Type</th>
                          <th className="text-left text-xs font-medium text-zinc-400 p-3">Size</th>
                          <th className="text-left text-xs font-medium text-zinc-400 p-3">Used</th>
                          <th className="text-left text-xs font-medium text-zinc-400 p-3">Added</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assets.map((asset) => (
                          <tr
                            key={asset.id}
                            className="border-b border-white/5 last:border-0 hover:bg-white/5 cursor-pointer"
                            onClick={() => setShowAssetModal(asset)}
                          >
                            <td className="p-3">
                              <input
                                type="checkbox"
                                checked={selectedAssets.has(asset.id)}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  const newSelected = new Set(selectedAssets);
                                  if (e.target.checked) {
                                    newSelected.add(asset.id);
                                  } else {
                                    newSelected.delete(asset.id);
                                  }
                                  setSelectedAssets(newSelected);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="rounded border-zinc-600 bg-zinc-800 text-indigo-600"
                              />
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded bg-zinc-800 overflow-hidden flex-shrink-0">
                                  {asset.type === "IMAGE" ? (
                                    <img src={asset.url} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <svg className="w-5 h-5 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={getTypeIcon(asset.type)} />
                                      </svg>
                                    </div>
                                  )}
                                </div>
                                <span className="font-medium text-sm truncate">{asset.name}</span>
                              </div>
                            </td>
                            <td className="p-3 text-sm text-zinc-400">{asset.type}</td>
                            <td className="p-3 text-sm text-zinc-400">{formatSize(asset.size)}</td>
                            <td className="p-3 text-sm text-zinc-400">{asset.usageCount}x</td>
                            <td className="p-3 text-sm text-zinc-400">
                              {new Date(asset.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <div className="bg-zinc-900/50 rounded-xl border border-white/5 p-4">
                <h3 className="font-semibold mb-3">Tags</h3>
                {tags.length === 0 ? (
                  <p className="text-sm text-zinc-400">No tags yet</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {tags.slice(0, 15).map((tag) => (
                      <button
                        key={tag.tag}
                        onClick={() => {
                          setSelectedTags((prev) =>
                            prev.includes(tag.tag)
                              ? prev.filter((t) => t !== tag.tag)
                              : [...prev, tag.tag]
                          );
                        }}
                        className={`px-2 py-1 rounded text-xs transition ${
                          selectedTags.includes(tag.tag)
                            ? "bg-indigo-600 text-white"
                            : "bg-white/5 text-zinc-400 hover:bg-white/10"
                        }`}
                      >
                        {tag.tag} ({tag.count})
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 rounded-2xl w-full max-w-md">
              <div className="p-6 border-b border-white/10">
                <h2 className="text-xl font-semibold">Add Asset</h2>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Image URL</label>
                  <input
                    type="url"
                    value={uploadUrl}
                    onChange={(e) => setUploadUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="w-full px-4 py-2 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Name (optional)</label>
                  <input
                    type="text"
                    value={uploadName}
                    onChange={(e) => setUploadName(e.target.value)}
                    placeholder="My Image"
                    className="w-full px-4 py-2 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Tags (comma separated)</label>
                  <input
                    type="text"
                    value={uploadTags}
                    onChange={(e) => setUploadTags(e.target.value)}
                    placeholder="product, hero, banner"
                    className="w-full px-4 py-2 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="p-6 border-t border-white/10 flex justify-end gap-3">
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg font-medium transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUploadByUrl}
                  disabled={!uploadUrl}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 rounded-lg font-medium transition"
                >
                  Add Asset
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Folder Modal */}
        {showFolderModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 rounded-2xl w-full max-w-md">
              <div className="p-6 border-b border-white/10">
                <h2 className="text-xl font-semibold">
                  {editingFolder ? "Edit Folder" : "New Folder"}
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Folder Name</label>
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="My Folder"
                    className="w-full px-4 py-2 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Color</label>
                  <div className="flex gap-2">
                    {folderColors.map((color) => (
                      <button
                        key={color}
                        onClick={() => setNewFolderColor(color)}
                        className={`w-8 h-8 rounded-lg transition ${
                          newFolderColor === color ? "ring-2 ring-white ring-offset-2 ring-offset-zinc-900" : ""
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                {editingFolder && (
                  <button
                    onClick={() => {
                      handleDeleteFolder(editingFolder.id);
                      setShowFolderModal(false);
                      setEditingFolder(null);
                    }}
                    className="text-red-400 text-sm hover:underline"
                  >
                    Delete folder
                  </button>
                )}
              </div>
              <div className="p-6 border-t border-white/10 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowFolderModal(false);
                    setEditingFolder(null);
                    setNewFolderName("");
                    setNewFolderColor("#6366F1");
                  }}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg font-medium transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateFolder}
                  disabled={!newFolderName}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 rounded-lg font-medium transition"
                >
                  {editingFolder ? "Save" : "Create"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Asset Detail Modal */}
        {showAssetModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-xl font-semibold">{showAssetModal.name}</h2>
                <button
                  onClick={() => setShowAssetModal(null)}
                  className="p-2 hover:bg-white/10 rounded-lg transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6">
                {showAssetModal.type === "IMAGE" || showAssetModal.type === "GIF" ? (
                  <img
                    src={showAssetModal.url}
                    alt={showAssetModal.altText || showAssetModal.name}
                    className="w-full rounded-lg mb-6"
                  />
                ) : (
                  <div className="w-full aspect-video bg-zinc-800 rounded-lg mb-6 flex items-center justify-center">
                    <svg className="w-16 h-16 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={getTypeIcon(showAssetModal.type)} />
                    </svg>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-zinc-400">Type</p>
                    <p className="font-medium">{showAssetModal.type}</p>
                  </div>
                  <div>
                    <p className="text-zinc-400">Size</p>
                    <p className="font-medium">{formatSize(showAssetModal.size)}</p>
                  </div>
                  {showAssetModal.width && showAssetModal.height && (
                    <div>
                      <p className="text-zinc-400">Dimensions</p>
                      <p className="font-medium">{showAssetModal.width} x {showAssetModal.height}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-zinc-400">Used</p>
                    <p className="font-medium">{showAssetModal.usageCount} times</p>
                  </div>
                </div>

                {showAssetModal.tags.length > 0 && (
                  <div className="mt-4">
                    <p className="text-zinc-400 text-sm mb-2">Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {showAssetModal.tags.map((tag) => (
                        <span key={tag} className="px-2 py-1 bg-white/5 rounded text-sm">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => copyAssetUrl(showAssetModal.url)}
                    className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded-lg font-medium transition"
                  >
                    Copy URL
                  </button>
                  <button
                    onClick={() => handleDeleteAsset(showAssetModal.id)}
                    className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg font-medium transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
