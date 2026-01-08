import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getTikTokAuthUrl,
  publishTikTokVideo,
  getTikTokAnalytics,
  getTikTokProfile,
  getTikTokVideos,
  checkAndRefreshTikTokToken,
} from "@/lib/platforms/tiktok";

const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/tiktok/callback`;

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accounts = await prisma.tikTokAccount.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        tiktokId: true,
        username: true,
        displayName: true,
        isDefault: true,
        createdAt: true,
      },
    });

    return NextResponse.json(accounts);
  } catch (error) {
    console.error("TikTok accounts fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch TikTok accounts" },
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

    if (action === "connect") {
      const state = Buffer.from(
        JSON.stringify({
          userId: session.user.id,
          timestamp: Date.now(),
        })
      ).toString("base64");

      const authUrl = getTikTokAuthUrl(REDIRECT_URI, state);
      return NextResponse.json({ url: authUrl });
    }

    if (action === "publish") {
      const { accountId, videoUrl, caption, hashtags } = body;

      const account = await prisma.tikTokAccount.findUnique({
        where: { id: accountId },
      });

      if (!account || account.userId !== session.user.id) {
        return NextResponse.json({ error: "Account not found" }, { status: 404 });
      }

      const accessToken = await checkAndRefreshTikTokToken(accountId);

      const result = await publishTikTokVideo(
        accessToken,
        videoUrl,
        caption,
        hashtags
      );

      return NextResponse.json(result);
    }

    if (action === "analytics") {
      const { accountId, videoId } = body;

      const account = await prisma.tikTokAccount.findUnique({
        where: { id: accountId },
      });

      if (!account || account.userId !== session.user.id) {
        return NextResponse.json({ error: "Account not found" }, { status: 404 });
      }

      const accessToken = await checkAndRefreshTikTokToken(accountId);
      const stats = await getTikTokAnalytics(accessToken, videoId);

      return NextResponse.json(stats);
    }

    if (action === "profile") {
      const { accountId } = body;

      const account = await prisma.tikTokAccount.findUnique({
        where: { id: accountId },
      });

      if (!account || account.userId !== session.user.id) {
        return NextResponse.json({ error: "Account not found" }, { status: 404 });
      }

      const accessToken = await checkAndRefreshTikTokToken(accountId);
      const profile = await getTikTokProfile(accessToken);

      return NextResponse.json(profile);
    }

    if (action === "videos") {
      const { accountId, cursor, maxCount } = body;

      const account = await prisma.tikTokAccount.findUnique({
        where: { id: accountId },
      });

      if (!account || account.userId !== session.user.id) {
        return NextResponse.json({ error: "Account not found" }, { status: 404 });
      }

      const accessToken = await checkAndRefreshTikTokToken(accountId);
      const videos = await getTikTokVideos(accessToken, cursor, maxCount);

      return NextResponse.json(videos);
    }

    if (action === "setDefault") {
      const { accountId } = body;

      // Remove default from all accounts
      await prisma.tikTokAccount.updateMany({
        where: { userId: session.user.id },
        data: { isDefault: false },
      });

      // Set new default
      await prisma.tikTokAccount.update({
        where: { id: accountId },
        data: { isDefault: true },
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("TikTok action error:", error);
    return NextResponse.json(
      { error: "Failed to process TikTok action" },
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

    const account = await prisma.tikTokAccount.findUnique({
      where: { id: accountId },
    });

    if (!account || account.userId !== session.user.id) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    await prisma.tikTokAccount.delete({
      where: { id: accountId },
    });

    // If this was the default account, set another one as default
    if (account.isDefault) {
      const remainingAccount = await prisma.tikTokAccount.findFirst({
        where: { userId: session.user.id },
      });

      if (remainingAccount) {
        await prisma.tikTokAccount.update({
          where: { id: remainingAccount.id },
          data: { isDefault: true },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("TikTok disconnect error:", error);
    return NextResponse.json(
      { error: "Failed to disconnect TikTok account" },
      { status: 500 }
    );
  }
}
