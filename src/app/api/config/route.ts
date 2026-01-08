import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = await prisma.postingConfig.findUnique({
    where: { userId: session.user.id },
  });

  return NextResponse.json(config);
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { instructions, tone, topics, postingTime, timezone, isActive } = body;

    const config = await prisma.postingConfig.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        instructions: instructions || "",
        tone: tone || "professional",
        topics: topics || [],
        postingTime: postingTime || "09:00",
        timezone: timezone || "UTC",
        isActive: isActive || false,
      },
      update: {
        instructions,
        tone,
        topics,
        postingTime,
        timezone,
        isActive,
      },
    });

    return NextResponse.json(config);
  } catch (error) {
    console.error("Config update error:", error);
    return NextResponse.json(
      { error: "Failed to update config" },
      { status: 500 }
    );
  }
}
