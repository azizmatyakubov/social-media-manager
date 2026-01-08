import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createABTest,
  startABTest,
  getUserABTests,
  getABTestResults,
  completeABTest,
  cancelABTest,
  generateABVariants,
} from "@/lib/ab-testing";
import { ABTestStatus, Platform } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const testId = searchParams.get("testId");
    const status = searchParams.get("status") as ABTestStatus | null;

    if (testId) {
      const results = await getABTestResults(testId);
      return NextResponse.json(results);
    }

    const tests = await getUserABTests(session.user.id, status || undefined);
    return NextResponse.json(tests);
  } catch (error) {
    console.error("A/B tests fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch A/B tests" },
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

    if (action === "generate-variants") {
      const { content, platform, numVariants } = body;
      const variants = await generateABVariants(
        content,
        platform || Platform.X,
        numVariants || 2
      );
      return NextResponse.json({ variants });
    }

    if (action === "create") {
      const test = await createABTest({
        userId: session.user.id,
        name: body.name,
        description: body.description,
        platform: body.platform || Platform.X,
        metric: body.metric || "engagement",
        duration: body.duration || 24,
        variants: body.variants,
      });
      return NextResponse.json(test);
    }

    if (action === "start") {
      const result = await startABTest(body.testId, body.xAccountId);
      return NextResponse.json(result);
    }

    if (action === "complete") {
      const result = await completeABTest(body.testId);
      return NextResponse.json(result);
    }

    if (action === "cancel") {
      const result = await cancelABTest(body.testId);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("A/B test action error:", error);
    return NextResponse.json(
      { error: "Failed to process A/B test action" },
      { status: 500 }
    );
  }
}
