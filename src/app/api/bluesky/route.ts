import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  loginBluesky,
  refreshBlueskySession,
  createBlueskyPost,
  getBlueskyProfile,
  getBlueskyFeed,
  uploadBlueskyImage,
  saveBlueskyAccount,
} from "@/lib/platforms/bluesky";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    // Get feed for a specific account
    if (action === "feed") {
      const accountId = searchParams.get("accountId");
      if (!accountId) {
        return NextResponse.json({ error: "Account ID required" }, { status: 400 });
      }

      const account = await prisma.blueskyAccount.findUnique({
        where: { id: accountId },
      });

      if (!account || account.userId !== session.user.id) {
        return NextResponse.json({ error: "Account not found" }, { status: 404 });
      }

      const blueskySession = {
        did: account.did,
        handle: account.handle,
        accessJwt: account.accessJwt,
        refreshJwt: account.refreshJwt || "",
      };

      const feed = await getBlueskyFeed(blueskySession);
      return NextResponse.json(feed);
    }

    // Get profile for a specific account
    if (action === "profile") {
      const accountId = searchParams.get("accountId");
      if (!accountId) {
        return NextResponse.json({ error: "Account ID required" }, { status: 400 });
      }

      const account = await prisma.blueskyAccount.findUnique({
        where: { id: accountId },
      });

      if (!account || account.userId !== session.user.id) {
        return NextResponse.json({ error: "Account not found" }, { status: 404 });
      }

      const blueskySession = {
        did: account.did,
        handle: account.handle,
        accessJwt: account.accessJwt,
        refreshJwt: account.refreshJwt || "",
      };

      const profile = await getBlueskyProfile(blueskySession);
      return NextResponse.json(profile);
    }

    // Default: Get all Bluesky accounts
    const accounts = await prisma.blueskyAccount.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        did: true,
        handle: true,
        displayName: true,
        isDefault: true,
        createdAt: true,
      },
    });

    return NextResponse.json(accounts);
  } catch (error) {
    console.error("Bluesky accounts fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch Bluesky data" },
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
    const { action } = body;

    // Login with handle and app password
    if (action === "login") {
      const { identifier, password } = body;

      if (!identifier || !password) {
        return NextResponse.json(
          { error: "Handle and app password are required" },
          { status: 400 }
        );
      }

      // Login to Bluesky
      const blueskySession = await loginBluesky(identifier, password);

      // Get profile
      const profile = await getBlueskyProfile(blueskySession);

      // Save account
      const savedAccount = await saveBlueskyAccount(
        session.user.id,
        blueskySession,
        profile
      );

      return NextResponse.json({
        success: true,
        account: {
          id: savedAccount.id,
          handle: savedAccount.handle,
          displayName: savedAccount.displayName,
        },
      });
    }

    // Create a new post (skeet)
    if (action === "post") {
      const { accountId, text, images } = body;

      if (!accountId || !text) {
        return NextResponse.json(
          { error: "Account ID and text are required" },
          { status: 400 }
        );
      }

      const account = await prisma.blueskyAccount.findUnique({
        where: { id: accountId },
      });

      if (!account || account.userId !== session.user.id) {
        return NextResponse.json({ error: "Account not found" }, { status: 404 });
      }

      let blueskySession = {
        did: account.did,
        handle: account.handle,
        accessJwt: account.accessJwt,
        refreshJwt: account.refreshJwt || "",
      };

      // Try to create post, refresh session if needed
      try {
        const result = await createBlueskyPost(blueskySession, text, images);
        return NextResponse.json(result);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        // If token expired, try to refresh
        if (errorMessage.includes("ExpiredToken") && account.refreshJwt) {
          const refreshedSession = await refreshBlueskySession(account.refreshJwt);

          // Update tokens in database
          await prisma.blueskyAccount.update({
            where: { id: accountId },
            data: {
              accessJwt: refreshedSession.accessJwt,
              refreshJwt: refreshedSession.refreshJwt,
            },
          });

          blueskySession = refreshedSession;
          const result = await createBlueskyPost(blueskySession, text, images);
          return NextResponse.json(result);
        }
        throw error;
      }
    }

    // Upload image
    if (action === "uploadImage") {
      const { accountId } = body;

      if (!accountId) {
        return NextResponse.json(
          { error: "Account ID is required" },
          { status: 400 }
        );
      }

      const account = await prisma.blueskyAccount.findUnique({
        where: { id: accountId },
      });

      if (!account || account.userId !== session.user.id) {
        return NextResponse.json({ error: "Account not found" }, { status: 404 });
      }

      // For image upload, the actual blob needs to be sent separately
      // This endpoint returns the session info needed for upload
      return NextResponse.json({
        did: account.did,
        handle: account.handle,
        accessJwt: account.accessJwt,
      });
    }

    // Refresh session tokens
    if (action === "refresh") {
      const { accountId } = body;

      if (!accountId) {
        return NextResponse.json(
          { error: "Account ID is required" },
          { status: 400 }
        );
      }

      const account = await prisma.blueskyAccount.findUnique({
        where: { id: accountId },
      });

      if (!account || account.userId !== session.user.id) {
        return NextResponse.json({ error: "Account not found" }, { status: 404 });
      }

      if (!account.refreshJwt) {
        return NextResponse.json(
          { error: "No refresh token available" },
          { status: 400 }
        );
      }

      const refreshedSession = await refreshBlueskySession(account.refreshJwt);

      // Update tokens in database
      await prisma.blueskyAccount.update({
        where: { id: accountId },
        data: {
          accessJwt: refreshedSession.accessJwt,
          refreshJwt: refreshedSession.refreshJwt,
        },
      });

      return NextResponse.json({ success: true });
    }

    // Set default account
    if (action === "setDefault") {
      const { accountId } = body;

      await prisma.blueskyAccount.updateMany({
        where: { userId: session.user.id },
        data: { isDefault: false },
      });

      await prisma.blueskyAccount.update({
        where: { id: accountId },
        data: { isDefault: true },
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Bluesky action error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to process Bluesky action: ${errorMessage}` },
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
    const accountId = searchParams.get("accountId");

    if (!accountId) {
      return NextResponse.json({ error: "Account ID required" }, { status: 400 });
    }

    const account = await prisma.blueskyAccount.findUnique({
      where: { id: accountId },
    });

    if (!account || account.userId !== session.user.id) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    await prisma.blueskyAccount.delete({
      where: { id: accountId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Bluesky disconnect error:", error);
    return NextResponse.json(
      { error: "Failed to disconnect Bluesky account" },
      { status: 500 }
    );
  }
}
