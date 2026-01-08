import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - Get notification settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get or create settings
    let settings = await prisma.notificationSettings.findUnique({
      where: { userId: session.user.id },
    });

    if (!settings) {
      settings = await prisma.notificationSettings.create({
        data: { userId: session.user.id },
      });
    }

    return NextResponse.json({
      settings: {
        postPublished: settings.postPublished,
        postFailed: settings.postFailed,
        weeklyDigest: settings.weeklyDigest,
        engagementAlerts: settings.engagementAlerts,
        trendingAlerts: settings.trendingAlerts,
        recycleReminders: settings.recycleReminders,
        digestDay: settings.digestDay,
        digestTime: settings.digestTime,
        timezone: settings.timezone,
        unsubscribedAll: settings.unsubscribedAll,
      },
    });
  } catch (error) {
    console.error("Get notification settings error:", error);
    return NextResponse.json(
      { error: "Failed to get notification settings" },
      { status: 500 }
    );
  }
}

// PATCH - Update notification settings
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updates = await request.json();

    // Validate allowed fields
    const allowedFields = [
      "postPublished",
      "postFailed",
      "weeklyDigest",
      "engagementAlerts",
      "trendingAlerts",
      "recycleReminders",
      "digestDay",
      "digestTime",
      "timezone",
      "unsubscribedAll",
    ];

    const validUpdates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in updates) {
        validUpdates[key] = updates[key];
      }
    }

    const settings = await prisma.notificationSettings.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        ...validUpdates,
      },
      update: validUpdates,
    });

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error("Update notification settings error:", error);
    return NextResponse.json(
      { error: "Failed to update notification settings" },
      { status: 500 }
    );
  }
}
