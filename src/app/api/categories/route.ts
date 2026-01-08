import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
  getCategoryStats,
  shuffleCategoryQueue,
} from "@/lib/content-categories";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");
    const includeStats = searchParams.get("includeStats") === "true";

    if (categoryId && includeStats) {
      const stats = await getCategoryStats(categoryId);
      return NextResponse.json(stats);
    }

    const categories = await getCategories(session.user.id);
    return NextResponse.json(categories);
  } catch (error) {
    console.error("Categories fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
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

    // Handle special actions
    if (action === "shuffle" && data.categoryId) {
      const result = await shuffleCategoryQueue(data.categoryId);
      return NextResponse.json(result);
    }

    // Create new category
    if (!data.name) {
      return NextResponse.json(
        { error: "Category name is required" },
        { status: 400 }
      );
    }

    const category = await createCategory(session.user.id, {
      name: data.name,
      color: data.color,
      icon: data.icon,
      description: data.description,
      postsPerDay: data.postsPerDay,
      preferredTimes: data.preferredTimes,
      preferredDays: data.preferredDays,
      shuffleQueue: data.shuffleQueue,
      recycleContent: data.recycleContent,
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error("Category create error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to create category";

    // Handle unique constraint error
    if (errorMessage.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "A category with this name already exists" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { categoryId, ...updates } = body;

    if (!categoryId) {
      return NextResponse.json(
        { error: "Category ID is required" },
        { status: 400 }
      );
    }

    const category = await updateCategory(categoryId, updates);
    return NextResponse.json(category);
  } catch (error) {
    console.error("Category update error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to update category";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");

    if (!categoryId) {
      return NextResponse.json(
        { error: "Category ID is required" },
        { status: 400 }
      );
    }

    await deleteCategory(categoryId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Category delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 }
    );
  }
}
