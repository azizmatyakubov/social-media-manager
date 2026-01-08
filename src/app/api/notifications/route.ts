import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { queueEmail } from "@/lib/email";
import { NotificationType, EmailStatus, Prisma } from "@prisma/client";

// GET - Get notification history
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
    const offset = parseInt(searchParams.get("offset") || "0");
    const status = searchParams.get("status") as EmailStatus | null;

    const where: Prisma.EmailNotificationWhereInput = { userId: session.user.id };
    if (status && Object.values(EmailStatus).includes(status)) {
      where.status = status;
    }

    const [notifications, total] = await Promise.all([
      prisma.emailNotification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        select: {
          id: true,
          type: true,
          subject: true,
          status: true,
          sentAt: true,
          createdAt: true,
        },
      }),
      prisma.emailNotification.count({ where }),
    ]);

    return NextResponse.json({
      notifications,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + notifications.length < total,
      },
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    return NextResponse.json(
      { error: "Failed to get notifications" },
      { status: 500 }
    );
  }
}

// POST - Trigger a test notification or specific notification
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { type, data } = await request.json();

    // Validate notification type
    const validTypes: NotificationType[] = [
      "POST_PUBLISHED",
      "POST_FAILED",
      "WEEKLY_DIGEST",
      "ENGAGEMENT_ALERT",
      "TRENDING_ALERT",
      "RECYCLE_REMINDER",
      "WELCOME",
      "SUBSCRIPTION_CHANGE",
    ];

    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: "Invalid notification type" },
        { status: 400 }
      );
    }

    // Queue the notification
    const notificationId = await queueEmail(
      session.user.id,
      type as NotificationType,
      data || {}
    );

    if (!notificationId) {
      return NextResponse.json(
        { error: "Notification not sent (may be disabled in settings)" },
        { status: 200 }
      );
    }

    return NextResponse.json({
      success: true,
      notificationId,
      message: "Notification queued successfully",
    });
  } catch (error) {
    console.error("Queue notification error:", error);
    return NextResponse.json(
      { error: "Failed to queue notification" },
      { status: 500 }
    );
  }
}
