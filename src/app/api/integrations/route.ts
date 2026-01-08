import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createIntegration,
  deleteIntegration,
  getUserIntegrations,
} from "@/lib/integrations";
import { IntegrationType } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const integrations = await getUserIntegrations(session.user.id);
    return NextResponse.json(integrations);
  } catch (error) {
    console.error("Integrations fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch integrations" },
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
    const { type, config, credentials } = body;

    if (!type) {
      return NextResponse.json({ error: "Integration type is required" }, { status: 400 });
    }

    const integration = await createIntegration(
      session.user.id,
      type as IntegrationType,
      config || {},
      credentials
    );

    return NextResponse.json(integration);
  } catch (error) {
    console.error("Integration create error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create integration" },
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
    const type = searchParams.get("type") as IntegrationType | null;

    if (!type) {
      return NextResponse.json({ error: "Integration type is required" }, { status: 400 });
    }

    await deleteIntegration(session.user.id, type);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Integration delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete integration" },
      { status: 500 }
    );
  }
}
