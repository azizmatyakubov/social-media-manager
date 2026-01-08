import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getPinterestAuthUrl,
  createPin,
  getBoards,
  getPinAnalytics,
  getPinterestProfile,
  refreshPinterestToken,
} from "@/lib/platforms/pinterest";

const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/pinterest/callback`;

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    // Get boards for a specific account
    if (action === "boards") {
      const accountId = searchParams.get("accountId");
      if (!accountId) {
        return NextResponse.json({ error: "Account ID required" }, { status: 400 });
      }

      const account = await prisma.pinterestAccount.findUnique({
        where: { id: accountId },
      });

      if (!account || account.userId !== session.user.id) {
        return NextResponse.json({ error: "Account not found" }, { status: 404 });
      }

      const boards = await getBoards(account.accessToken);
      return NextResponse.json(boards);
    }

    // Get analytics for a specific pin
    if (action === "analytics") {
      const accountId = searchParams.get("accountId");
      const pinId = searchParams.get("pinId");

      if (!accountId || !pinId) {
        return NextResponse.json(
          { error: "Account ID and Pin ID required" },
          { status: 400 }
        );
      }

      const account = await prisma.pinterestAccount.findUnique({
        where: { id: accountId },
      });

      if (!account || account.userId !== session.user.id) {
        return NextResponse.json({ error: "Account not found" }, { status: 404 });
      }

      const analytics = await getPinAnalytics(account.accessToken, pinId);
      return NextResponse.json(analytics);
    }

    // Default: Get all Pinterest accounts
    const accounts = await prisma.pinterestAccount.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        pinterestId: true,
        username: true,
        isDefault: true,
        createdAt: true,
      },
    });

    return NextResponse.json(accounts);
  } catch (error) {
    console.error("Pinterest accounts fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch Pinterest data" },
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

    // Generate OAuth URL for connecting account
    if (action === "connect") {
      const state = Buffer.from(
        JSON.stringify({
          userId: session.user.id,
          timestamp: Date.now(),
        })
      ).toString("base64");

      const authUrl = getPinterestAuthUrl(REDIRECT_URI, state);
      return NextResponse.json({ url: authUrl });
    }

    // Create a new pin
    if (action === "createPin") {
      const { accountId, boardId, imageUrl, title, description, link } = body;

      if (!accountId || !boardId || !imageUrl || !title) {
        return NextResponse.json(
          { error: "Missing required fields" },
          { status: 400 }
        );
      }

      const account = await prisma.pinterestAccount.findUnique({
        where: { id: accountId },
      });

      if (!account || account.userId !== session.user.id) {
        return NextResponse.json({ error: "Account not found" }, { status: 404 });
      }

      // Check if token needs refresh
      let accessToken = account.accessToken;
      if (account.tokenExpiresAt && account.tokenExpiresAt < new Date()) {
        if (!account.refreshToken) {
          return NextResponse.json(
            { error: "Token expired, please reconnect" },
            { status: 401 }
          );
        }
        const tokens = await refreshPinterestToken(account.refreshToken);
        await prisma.pinterestAccount.update({
          where: { id: accountId },
          data: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            tokenExpiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
          },
        });
        accessToken = tokens.accessToken;
      }

      const result = await createPin(
        accessToken,
        boardId,
        imageUrl,
        title,
        description || "",
        link
      );

      return NextResponse.json(result);
    }

    // Get user profile
    if (action === "profile") {
      const { accountId } = body;

      const account = await prisma.pinterestAccount.findUnique({
        where: { id: accountId },
      });

      if (!account || account.userId !== session.user.id) {
        return NextResponse.json({ error: "Account not found" }, { status: 404 });
      }

      const profile = await getPinterestProfile(account.accessToken);
      return NextResponse.json(profile);
    }

    // Set default account
    if (action === "setDefault") {
      const { accountId } = body;

      await prisma.pinterestAccount.updateMany({
        where: { userId: session.user.id },
        data: { isDefault: false },
      });

      await prisma.pinterestAccount.update({
        where: { id: accountId },
        data: { isDefault: true },
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Pinterest action error:", error);
    return NextResponse.json(
      { error: "Failed to process Pinterest action" },
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

    const account = await prisma.pinterestAccount.findUnique({
      where: { id: accountId },
    });

    if (!account || account.userId !== session.user.id) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    await prisma.pinterestAccount.delete({
      where: { id: accountId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Pinterest disconnect error:", error);
    return NextResponse.json(
      { error: "Failed to disconnect Pinterest account" },
      { status: 500 }
    );
  }
}
