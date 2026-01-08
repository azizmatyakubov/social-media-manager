import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createCalendar,
  generateCalendarContent,
  getCalendarWithSlots,
} from "@/lib/content-calendar";
import { Platform } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const calendarId = searchParams.get("calendarId");

    if (calendarId) {
      const startDate = new Date(searchParams.get("startDate") || new Date());
      const endDate = new Date(searchParams.get("endDate") || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

      const calendar = await getCalendarWithSlots(calendarId, startDate, endDate);
      return NextResponse.json(calendar);
    }

    const calendars = await prisma.contentCalendar.findMany({
      where: { userId: session.user.id },
      include: {
        _count: { select: { slots: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(calendars);
  } catch (error) {
    console.error("Calendar fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch calendars" },
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
    const { action, ...data } = body;

    if (action === "generate") {
      const { calendarId, startDate, endDate, postsPerDay, platforms, themes } = data;

      const slots = await generateCalendarContent(session.user.id, calendarId, {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        postsPerDay: postsPerDay || 3,
        platforms: platforms || [Platform.X],
        themes: themes || ["general"],
        timezone: data.timezone || "UTC",
      });

      return NextResponse.json({ slots, count: slots.length });
    }

    const calendar = await createCalendar(session.user.id, {
      name: data.name,
      description: data.description,
      timezone: data.timezone,
      postsPerDay: data.postsPerDay,
      preferredTimes: data.preferredTimes,
      contentThemes: data.contentThemes,
      autoGenerate: data.autoGenerate,
    });

    return NextResponse.json(calendar);
  } catch (error) {
    console.error("Calendar create error:", error);
    return NextResponse.json(
      { error: "Failed to create calendar" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { calendarId, ...updates } = body;

    const calendar = await prisma.contentCalendar.update({
      where: { id: calendarId },
      data: updates,
    });

    return NextResponse.json(calendar);
  } catch (error) {
    console.error("Calendar update error:", error);
    return NextResponse.json(
      { error: "Failed to update calendar" },
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
    const calendarId = searchParams.get("calendarId");

    if (!calendarId) {
      return NextResponse.json({ error: "Calendar ID required" }, { status: 400 });
    }

    await prisma.contentCalendar.delete({
      where: { id: calendarId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Calendar delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete calendar" },
      { status: 500 }
    );
  }
}
