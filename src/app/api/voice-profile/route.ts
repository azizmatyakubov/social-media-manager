import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getVoiceProfile, updateVoiceProfile } from "@/lib/voice-learning";
import { hasFeatureAccess } from "@/lib/subscription";

// GET - Retrieve voice profile
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check feature access
    const hasAccess = await hasFeatureAccess(session.user.id, "AI Voice Learning");
    if (!hasAccess) {
      return NextResponse.json(
        { error: "AI Voice Learning requires Creator plan or higher" },
        { status: 403 }
      );
    }

    const profile = await getVoiceProfile(session.user.id);

    return NextResponse.json({
      profile,
      hasProfile: !!profile,
    });
  } catch (error) {
    console.error("Get voice profile error:", error);
    return NextResponse.json(
      { error: "Failed to get voice profile" },
      { status: 500 }
    );
  }
}

// POST - Analyze and update voice profile
export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check feature access
    const hasAccess = await hasFeatureAccess(session.user.id, "AI Voice Learning");
    if (!hasAccess) {
      return NextResponse.json(
        { error: "AI Voice Learning requires Creator plan or higher" },
        { status: 403 }
      );
    }

    const profile = await updateVoiceProfile(session.user.id);

    if (!profile) {
      return NextResponse.json(
        { error: "Not enough posts to analyze. You need at least 5 published posts." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      profile,
      message: "Voice profile updated successfully",
    });
  } catch (error) {
    console.error("Update voice profile error:", error);
    return NextResponse.json(
      { error: "Failed to update voice profile" },
      { status: 500 }
    );
  }
}
