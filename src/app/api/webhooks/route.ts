import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createWebhook,
  updateWebhook,
  deleteWebhook,
  getWebhookLogs,
  getWorkspaceWebhooks,
  WEBHOOK_EVENTS,
  WebhookEvent,
} from "@/lib/integrations";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    const webhookId = searchParams.get("webhookId");
    const action = searchParams.get("action");

    if (action === "events") {
      return NextResponse.json({ events: WEBHOOK_EVENTS });
    }

    if (action === "logs" && webhookId) {
      const limit = parseInt(searchParams.get("limit") || "50");
      const logs = await getWebhookLogs(webhookId, limit);
      return NextResponse.json(logs);
    }

    if (workspaceId) {
      const webhooks = await getWorkspaceWebhooks(workspaceId);
      return NextResponse.json(webhooks);
    }

    // Get all webhooks for user's workspaces
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: session.user.id },
      select: { workspaceId: true },
    });

    const workspaceIds = memberships.map((m) => m.workspaceId);

    const webhooks = await prisma.webhook.findMany({
      where: {
        workspaceId: { in: workspaceIds },
      },
      include: {
        workspace: {
          select: { name: true },
        },
        _count: { select: { logs: true } },
      },
    });

    return NextResponse.json(webhooks);
  } catch (error) {
    console.error("Webhooks fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch webhooks" },
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
    const { name, url, events, workspaceId } = body;

    if (!name || !url || !events || events.length === 0) {
      return NextResponse.json(
        { error: "Name, URL, and events are required" },
        { status: 400 }
      );
    }

    // Validate events
    const validEvents = events.filter((e: string) =>
      WEBHOOK_EVENTS.includes(e as WebhookEvent)
    );

    if (validEvents.length !== events.length) {
      return NextResponse.json({ error: "Invalid event types" }, { status: 400 });
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    const webhook = await createWebhook({
      workspaceId,
      name,
      url,
      events: validEvents,
    });

    return NextResponse.json(webhook);
  } catch (error) {
    console.error("Webhook create error:", error);
    return NextResponse.json(
      { error: "Failed to create webhook" },
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
    const { webhookId, name, url, events, isActive } = body;

    if (!webhookId) {
      return NextResponse.json({ error: "Webhook ID is required" }, { status: 400 });
    }

    const webhook = await updateWebhook(webhookId, {
      name,
      url,
      events,
      isActive,
    });

    return NextResponse.json(webhook);
  } catch (error) {
    console.error("Webhook update error:", error);
    return NextResponse.json(
      { error: "Failed to update webhook" },
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
    const webhookId = searchParams.get("webhookId");

    if (!webhookId) {
      return NextResponse.json({ error: "Webhook ID is required" }, { status: 400 });
    }

    await deleteWebhook(webhookId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete webhook" },
      { status: 500 }
    );
  }
}
