import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getLinkedInAuthUrl,
  exchangeLinkedInCode,
  getLinkedInProfile,
  saveLinkedInAccount,
  publishLinkedInPost,
} from "@/lib/platforms/linkedin";

const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/linkedin/callback`;

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accounts = await prisma.linkedInAccount.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        linkedInId: true,
        name: true,
        email: true,
        profileUrl: true,
        isDefault: true,
        createdAt: true,
      },
    });

    return NextResponse.json(accounts);
  } catch (error) {
    console.error("LinkedIn accounts fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch LinkedIn accounts" },
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

      const authUrl = getLinkedInAuthUrl(REDIRECT_URI, state);
      return NextResponse.json({ url: authUrl });
    }

    if (action === "publish") {
      const { accountId, content, mediaUrls } = body;

      const account = await prisma.linkedInAccount.findUnique({
        where: { id: accountId },
      });

      if (!account || account.userId !== session.user.id) {
        return NextResponse.json({ error: "Account not found" }, { status: 404 });
      }

      const result = await publishLinkedInPost(
        account.accessToken,
        account.linkedInId,
        content,
        mediaUrls
      );

      return NextResponse.json(result);
    }

    if (action === "setDefault") {
      const { accountId } = body;

      // Remove default from all accounts
      await prisma.linkedInAccount.updateMany({
        where: { userId: session.user.id },
        data: { isDefault: false },
      });

      // Set new default
      await prisma.linkedInAccount.update({
        where: { id: accountId },
        data: { isDefault: true },
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("LinkedIn action error:", error);
    return NextResponse.json(
      { error: "Failed to process LinkedIn action" },
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

    const account = await prisma.linkedInAccount.findUnique({
      where: { id: accountId },
    });

    if (!account || account.userId !== session.user.id) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    await prisma.linkedInAccount.delete({
      where: { id: accountId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("LinkedIn disconnect error:", error);
    return NextResponse.json(
      { error: "Failed to disconnect LinkedIn account" },
      { status: 500 }
    );
  }
}
