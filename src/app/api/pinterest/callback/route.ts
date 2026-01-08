import { NextRequest, NextResponse } from "next/server";
import {
  exchangePinterestCode,
  getPinterestProfile,
  savePinterestAccount,
} from "@/lib/platforms/pinterest";

const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/pinterest/callback`;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?pinterest_error=${error}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?pinterest_error=missing_params`
      );
    }

    // Decode and validate state
    let stateData: { userId: string; timestamp: number };
    try {
      stateData = JSON.parse(Buffer.from(state, "base64").toString());
    } catch {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?pinterest_error=invalid_state`
      );
    }

    // Check state timestamp (5 minute expiry)
    if (Date.now() - stateData.timestamp > 5 * 60 * 1000) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?pinterest_error=state_expired`
      );
    }

    // Exchange code for tokens
    const tokens = await exchangePinterestCode(code, REDIRECT_URI);

    // Get user profile
    const profile = await getPinterestProfile(tokens.accessToken);

    // Save account to database
    await savePinterestAccount(stateData.userId, tokens, profile);

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?pinterest_success=true`
    );
  } catch (error) {
    console.error("Pinterest callback error:", error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?pinterest_error=callback_failed`
    );
  }
}
