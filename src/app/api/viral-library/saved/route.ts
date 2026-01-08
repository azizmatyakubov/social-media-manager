import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  saveViralTweet,
  getSavedViralTweets,
  removeSavedViralTweet,
  markSavedTweetAsUsed,
} from "@/lib/viral-library";

/**
 * GET: Fetch user's saved viral tweets
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const result = await getSavedViralTweets(session.user.id, page, limit);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Get saved viral tweets error:", error);
    return NextResponse.json(
      { error: "Failed to fetch saved tweets" },
      { status: 500 }
    );
  }
}

/**
 * POST: Save a viral tweet to user's collection
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { viralTweetId, notes, action } = body;

    if (!viralTweetId) {
      return NextResponse.json(
        { error: "Viral tweet ID is required" },
        { status: 400 }
      );
    }

    // Handle "mark as used" action
    if (action === "markUsed") {
      const success = await markSavedTweetAsUsed(session.user.id, viralTweetId);
      if (!success) {
        return NextResponse.json(
          { error: "Saved tweet not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true });
    }

    // Default: Save the tweet
    const result = await saveViralTweet(session.user.id, viralTweetId, notes);

    return NextResponse.json({
      success: true,
      id: result.id,
      savedAt: result.savedAt,
    });
  } catch (error) {
    console.error("Save viral tweet error:", error);

    if (error instanceof Error && error.message === "Viral tweet not found") {
      return NextResponse.json(
        { error: "Viral tweet not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Failed to save viral tweet" },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Remove a viral tweet from user's saved collection
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const viralTweetId = searchParams.get("viralTweetId");

    if (!viralTweetId) {
      return NextResponse.json(
        { error: "Viral tweet ID is required" },
        { status: 400 }
      );
    }

    const success = await removeSavedViralTweet(session.user.id, viralTweetId);

    if (!success) {
      return NextResponse.json(
        { error: "Saved tweet not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Remove saved viral tweet error:", error);
    return NextResponse.json(
      { error: "Failed to remove saved tweet" },
      { status: 500 }
    );
  }
}
