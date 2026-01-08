import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { approveSlot, publishSlotAsPost } from "@/lib/content-calendar";
import { SlotStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const calendarId = searchParams.get("calendarId");
    const date = searchParams.get("date");
    const status = searchParams.get("status") as SlotStatus | null;

    const slots = await prisma.calendarSlot.findMany({
      where: {
        ...(calendarId && { calendarId }),
        ...(date && { date: new Date(date) }),
        ...(status && { status }),
        calendar: {
          userId: session.user.id,
        },
      },
      orderBy: [{ date: "asc" }, { time: "asc" }],
    });

    return NextResponse.json(slots);
  } catch (error) {
    console.error("Slots fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch slots" },
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
    const { action, slotId, content } = body;

    if (action === "approve") {
      const slot = await approveSlot(slotId, content);
      return NextResponse.json(slot);
    }

    if (action === "publish") {
      const post = await publishSlotAsPost(slotId, session.user.id);
      return NextResponse.json(post);
    }

    if (action === "skip") {
      const slot = await prisma.calendarSlot.update({
        where: { id: slotId },
        data: { status: SlotStatus.SKIPPED },
      });
      return NextResponse.json(slot);
    }

    // Create new slot
    const slot = await prisma.calendarSlot.create({
      data: {
        calendarId: body.calendarId,
        date: new Date(body.date),
        time: body.time,
        platform: body.platform,
        content: body.content,
        contentTheme: body.contentTheme,
        status: body.content ? SlotStatus.FILLED : SlotStatus.EMPTY,
      },
    });

    return NextResponse.json(slot);
  } catch (error) {
    console.error("Slot action error:", error);
    return NextResponse.json(
      { error: "Failed to process slot action" },
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
    const { slotId, ...updates } = body;

    const slot = await prisma.calendarSlot.update({
      where: { id: slotId },
      data: {
        ...(updates.content !== undefined && { content: updates.content }),
        ...(updates.date && { date: new Date(updates.date) }),
        ...(updates.time && { time: updates.time }),
        ...(updates.status && { status: updates.status }),
        ...(updates.platform && { platform: updates.platform }),
      },
    });

    return NextResponse.json(slot);
  } catch (error) {
    console.error("Slot update error:", error);
    return NextResponse.json(
      { error: "Failed to update slot" },
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
    const slotId = searchParams.get("slotId");

    if (!slotId) {
      return NextResponse.json({ error: "Slot ID required" }, { status: 400 });
    }

    await prisma.calendarSlot.delete({
      where: { id: slotId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Slot delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete slot" },
      { status: 500 }
    );
  }
}
