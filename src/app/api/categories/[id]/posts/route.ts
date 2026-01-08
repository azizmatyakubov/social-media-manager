import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getPostsByCategory,
  assignPostToCategory,
  bulkAssignPosts,
  movePostToCategory,
  reorderCategoryPosts,
} from "@/lib/content-categories";
import { PostStatus } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: categoryId } = await params;
    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status") as PostStatus | null;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const orderBy = (searchParams.get("orderBy") || "createdAt") as
      | "createdAt"
      | "scheduledFor"
      | "likes"
      | "impressions";
    const order = (searchParams.get("order") || "desc") as "asc" | "desc";

    const result = await getPostsByCategory(categoryId, {
      status: status || undefined,
      limit,
      offset,
      orderBy,
      order,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Category posts fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch category posts" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: categoryId } = await params;
    const body = await request.json();
    const { action, postId, postIds, fromCategoryId, order } = body;

    // Handle different actions
    switch (action) {
      case "assign":
        // Assign a single post to this category
        if (!postId) {
          return NextResponse.json(
            { error: "Post ID is required" },
            { status: 400 }
          );
        }
        const assignedPost = await assignPostToCategory(postId, categoryId);
        return NextResponse.json(assignedPost);

      case "bulk-assign":
        // Bulk assign multiple posts to this category
        if (!postIds || !Array.isArray(postIds) || postIds.length === 0) {
          return NextResponse.json(
            { error: "Post IDs array is required" },
            { status: 400 }
          );
        }
        const bulkResult = await bulkAssignPosts(postIds, categoryId);
        return NextResponse.json(bulkResult);

      case "move":
        // Move a post from another category to this one
        if (!postId) {
          return NextResponse.json(
            { error: "Post ID is required" },
            { status: 400 }
          );
        }
        const moveResult = await movePostToCategory(postId, fromCategoryId || null, categoryId);
        return NextResponse.json(moveResult);

      case "reorder":
        // Reorder posts within this category
        if (!order || !Array.isArray(order) || order.length === 0) {
          return NextResponse.json(
            { error: "Order array is required" },
            { status: 400 }
          );
        }
        const reorderResult = await reorderCategoryPosts(categoryId, order);
        return NextResponse.json(reorderResult);

      default:
        // Default action: assign single post
        if (!postId) {
          return NextResponse.json(
            { error: "Post ID is required" },
            { status: 400 }
          );
        }
        const defaultResult = await assignPostToCategory(postId, categoryId);
        return NextResponse.json(defaultResult);
    }
  } catch (error) {
    console.error("Category posts action error:", error);
    return NextResponse.json(
      { error: "Failed to process category posts action" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: categoryId } = await params;
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get("postId");

    if (!postId) {
      return NextResponse.json(
        { error: "Post ID is required" },
        { status: 400 }
      );
    }

    // Remove post from category (set categoryId to null)
    const post = await assignPostToCategory(postId, null);

    // Update the category's post count would be handled by assignPostToCategory
    // but we should also update the original category count
    const { prisma } = await import("@/lib/prisma");
    const count = await prisma.post.count({ where: { categoryId } });
    await prisma.contentCategory.update({
      where: { id: categoryId },
      data: { totalPosts: count },
    });

    return NextResponse.json({ success: true, post });
  } catch (error) {
    console.error("Category post remove error:", error);
    return NextResponse.json(
      { error: "Failed to remove post from category" },
      { status: 500 }
    );
  }
}
