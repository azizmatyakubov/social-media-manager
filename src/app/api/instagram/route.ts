import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getInstagramAuthUrl,
  publishInstagramPost,
  publishInstagramCarousel,
  publishInstagramReel,
} from "@/lib/platforms/instagram";

const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/instagram/callback`;

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accounts = await prisma.instagramAccount.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        instagramId: true,
        username: true,
        accountType: true,
        isDefault: true,
        createdAt: true,
      },
    });

    return NextResponse.json(accounts);
  } catch (error) {
    console.error("Instagram accounts fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch Instagram accounts" },
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
      const state = Buffer.from(JSON.stringify({
        userId: session.user.id,
        timestamp: Date.now(),
      })).toString("base64");

      const authUrl = getInstagramAuthUrl(REDIRECT_URI, state);
      return NextResponse.json({ url: authUrl });
    }

    if (action === "publish") {
      const { accountId, caption, imageUrls, mediaType } = body;

      const account = await prisma.instagramAccount.findUnique({
        where: { id: accountId },
      });

      if (!account || account.userId !== session.user.id) {
        return NextResponse.json({ error: "Account not found" }, { status: 404 });
      }

      let result;

      if (mediaType === "carousel" && imageUrls.length > 1) {
        result = await publishInstagramCarousel(
          account.accessToken,
          account.instagramId,
          imageUrls,
          caption
        );
      } else if (mediaType === "reel") {
        result = await publishInstagramReel(
          account.accessToken,
          account.instagramId,
          imageUrls[0],
          caption
        );
      } else {
        result = await publishInstagramPost(
          account.accessToken,
          account.instagramId,
          imageUrls[0],
          caption
        );
      }

      return NextResponse.json(result);
    }

    if (action === "setDefault") {
      const { accountId } = body;

      await prisma.instagramAccount.updateMany({
        where: { userId: session.user.id },
        data: { isDefault: false },
      });

      await prisma.instagramAccount.update({
        where: { id: accountId },
        data: { isDefault: true },
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Instagram action error:", error);
    return NextResponse.json(
      { error: "Failed to process Instagram action" },
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

    const account = await prisma.instagramAccount.findUnique({
      where: { id: accountId },
    });

    if (!account || account.userId !== session.user.id) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    await prisma.instagramAccount.delete({
      where: { id: accountId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Instagram disconnect error:", error);
    return NextResponse.json(
      { error: "Failed to disconnect Instagram account" },
      { status: 500 }
    );
  }
}
