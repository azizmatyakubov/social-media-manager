import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getYouTubeAuthUrl,
  publishYouTubeShort,
  getYouTubeAnalytics,
  getYouTubeChannel,
  getYouTubeVideos,
  checkAndRefreshYouTubeToken,
  deleteYouTubeVideo,
  updateYouTubeVideo,
} from "@/lib/platforms/youtube";

const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/youtube/callback`;

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accounts = await prisma.youTubeAccount.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        youtubeId: true,
        channelName: true,
        channelUrl: true,
        isDefault: true,
        createdAt: true,
      },
    });

    return NextResponse.json(accounts);
  } catch (error) {
    console.error("YouTube accounts fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch YouTube accounts" },
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

      const authUrl = getYouTubeAuthUrl(REDIRECT_URI, state);
      return NextResponse.json({ url: authUrl });
    }

    if (action === "publish") {
      const { accountId, videoUrl, title, description } = body;

      if (!videoUrl || !title) {
        return NextResponse.json(
          { error: "Video URL and title are required" },
          { status: 400 }
        );
      }

      const account = await prisma.youTubeAccount.findUnique({
        where: { id: accountId },
      });

      if (!account || account.userId !== session.user.id) {
        return NextResponse.json({ error: "Account not found" }, { status: 404 });
      }

      const accessToken = await checkAndRefreshYouTubeToken(accountId);

      const result = await publishYouTubeShort(
        accessToken,
        videoUrl,
        title,
        description
      );

      return NextResponse.json(result);
    }

    if (action === "analytics") {
      const { accountId, videoId } = body;

      const account = await prisma.youTubeAccount.findUnique({
        where: { id: accountId },
      });

      if (!account || account.userId !== session.user.id) {
        return NextResponse.json({ error: "Account not found" }, { status: 404 });
      }

      const accessToken = await checkAndRefreshYouTubeToken(accountId);
      const stats = await getYouTubeAnalytics(accessToken, videoId);

      return NextResponse.json(stats);
    }

    if (action === "channel") {
      const { accountId } = body;

      const account = await prisma.youTubeAccount.findUnique({
        where: { id: accountId },
      });

      if (!account || account.userId !== session.user.id) {
        return NextResponse.json({ error: "Account not found" }, { status: 404 });
      }

      const accessToken = await checkAndRefreshYouTubeToken(accountId);
      const channel = await getYouTubeChannel(accessToken);

      return NextResponse.json(channel);
    }

    if (action === "videos") {
      const { accountId, maxResults, pageToken } = body;

      const account = await prisma.youTubeAccount.findUnique({
        where: { id: accountId },
      });

      if (!account || account.userId !== session.user.id) {
        return NextResponse.json({ error: "Account not found" }, { status: 404 });
      }

      const accessToken = await checkAndRefreshYouTubeToken(accountId);
      const videos = await getYouTubeVideos(
        accessToken,
        account.youtubeId,
        maxResults,
        pageToken
      );

      return NextResponse.json(videos);
    }

    if (action === "updateVideo") {
      const { accountId, videoId, title, description } = body;

      if (!videoId || !title) {
        return NextResponse.json(
          { error: "Video ID and title are required" },
          { status: 400 }
        );
      }

      const account = await prisma.youTubeAccount.findUnique({
        where: { id: accountId },
      });

      if (!account || account.userId !== session.user.id) {
        return NextResponse.json({ error: "Account not found" }, { status: 404 });
      }

      const accessToken = await checkAndRefreshYouTubeToken(accountId);
      const result = await updateYouTubeVideo(
        accessToken,
        videoId,
        title,
        description
      );

      return NextResponse.json(result);
    }

    if (action === "deleteVideo") {
      const { accountId, videoId } = body;

      if (!videoId) {
        return NextResponse.json(
          { error: "Video ID is required" },
          { status: 400 }
        );
      }

      const account = await prisma.youTubeAccount.findUnique({
        where: { id: accountId },
      });

      if (!account || account.userId !== session.user.id) {
        return NextResponse.json({ error: "Account not found" }, { status: 404 });
      }

      const accessToken = await checkAndRefreshYouTubeToken(accountId);
      await deleteYouTubeVideo(accessToken, videoId);

      return NextResponse.json({ success: true });
    }

    if (action === "setDefault") {
      const { accountId } = body;

      // Remove default from all accounts
      await prisma.youTubeAccount.updateMany({
        where: { userId: session.user.id },
        data: { isDefault: false },
      });

      // Set new default
      await prisma.youTubeAccount.update({
        where: { id: accountId },
        data: { isDefault: true },
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("YouTube action error:", error);
    return NextResponse.json(
      { error: "Failed to process YouTube action" },
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

    const account = await prisma.youTubeAccount.findUnique({
      where: { id: accountId },
    });

    if (!account || account.userId !== session.user.id) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    await prisma.youTubeAccount.delete({
      where: { id: accountId },
    });

    // If this was the default account, set another one as default
    if (account.isDefault) {
      const remainingAccount = await prisma.youTubeAccount.findFirst({
        where: { userId: session.user.id },
      });

      if (remainingAccount) {
        await prisma.youTubeAccount.update({
          where: { id: remainingAccount.id },
          data: { isDefault: true },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("YouTube disconnect error:", error);
    return NextResponse.json(
      { error: "Failed to disconnect YouTube account" },
      { status: 500 }
    );
  }
}
