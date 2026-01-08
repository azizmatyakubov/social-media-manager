import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canPerformAction } from "@/lib/subscription";

// GET - List all X accounts
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accounts = await prisma.xAccount.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        xUserId: true,
        xUsername: true,
        isDefault: true,
        createdAt: true,
      },
      orderBy: [
        { isDefault: "desc" },
        { createdAt: "asc" },
      ],
    });

    // Get usage limits
    const usageCheck = await canPerformAction(session.user.id, "X_ACCOUNTS");

    return NextResponse.json({
      accounts,
      usage: {
        current: accounts.length,
        limit: usageCheck.limit,
        canAddMore: usageCheck.limit === -1 || accounts.length < usageCheck.limit,
      },
    });
  } catch (error) {
    console.error("Get X accounts error:", error);
    return NextResponse.json(
      { error: "Failed to get X accounts" },
      { status: 500 }
    );
  }
}

// PATCH - Set default account
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { accountId } = await request.json();

    if (!accountId) {
      return NextResponse.json({ error: "Account ID is required" }, { status: 400 });
    }

    // Verify account belongs to user
    const account = await prisma.xAccount.findFirst({
      where: { id: accountId, userId: session.user.id },
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Set all accounts as non-default first
    await prisma.xAccount.updateMany({
      where: { userId: session.user.id },
      data: { isDefault: false },
    });

    // Set the selected account as default
    await prisma.xAccount.update({
      where: { id: accountId },
      data: { isDefault: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Set default account error:", error);
    return NextResponse.json(
      { error: "Failed to set default account" },
      { status: 500 }
    );
  }
}

// DELETE - Remove an X account
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("accountId");

    if (!accountId) {
      return NextResponse.json({ error: "Account ID is required" }, { status: 400 });
    }

    // Verify account belongs to user
    const account = await prisma.xAccount.findFirst({
      where: { id: accountId, userId: session.user.id },
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Delete the account
    await prisma.xAccount.delete({
      where: { id: accountId },
    });

    // If deleted account was default, set another as default
    if (account.isDefault) {
      const remainingAccount = await prisma.xAccount.findFirst({
        where: { userId: session.user.id },
      });

      if (remainingAccount) {
        await prisma.xAccount.update({
          where: { id: remainingAccount.id },
          data: { isDefault: true },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete X account error:", error);
    return NextResponse.json(
      { error: "Failed to delete X account" },
      { status: 500 }
    );
  }
}
