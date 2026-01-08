import { NextRequest, NextResponse } from "next/server";
import {
  exchangeTikTokCode,
  getTikTokProfile,
  saveTikTokAccount,
} from "@/lib/platforms/tiktok";

const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/tiktok/callback`;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    if (error) {
      console.error("TikTok OAuth error:", error, errorDescription);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?tiktok_error=${encodeURIComponent(
          errorDescription || error
        )}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?tiktok_error=missing_params`
      );
    }

    // Decode state
    let stateData: { userId: string; timestamp: number };
    try {
      stateData = JSON.parse(Buffer.from(state, "base64").toString());
    } catch {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?tiktok_error=invalid_state`
      );
    }

    // Check state timestamp (5 minute expiry)
    if (Date.now() - stateData.timestamp > 5 * 60 * 1000) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?tiktok_error=state_expired`
      );
    }

    // Exchange code for tokens
    const tokens = await exchangeTikTokCode(code, REDIRECT_URI);

    // Get profile
    const profile = await getTikTokProfile(tokens.accessToken);

    // Save account
    await saveTikTokAccount(stateData.userId, tokens, profile);

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?tiktok_success=true`
    );
  } catch (error) {
    console.error("TikTok callback error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "callback_failed";
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?tiktok_error=${encodeURIComponent(
        errorMessage
      )}`
    );
  }
}
