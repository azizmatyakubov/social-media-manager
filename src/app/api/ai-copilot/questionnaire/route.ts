import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { startStrategyQuestionnaire } from "@/lib/ai-copilot";

// GET: Retrieve the questionnaire structure
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const questionnaire = startStrategyQuestionnaire();
    return NextResponse.json({ steps: questionnaire });
  } catch (error) {
    console.error("Questionnaire GET error:", error);
    return NextResponse.json(
      { error: "Failed to get questionnaire" },
      { status: 500 }
    );
  }
}
