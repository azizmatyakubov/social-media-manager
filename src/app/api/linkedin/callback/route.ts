import { NextRequest, NextResponse } from "next/server";
import {
  exchangeLinkedInCode,
  getLinkedInProfile,
  saveLinkedInAccount,
} from "@/lib/platforms/linkedin";

const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/linkedin/callback`;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?linkedin_error=${error}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?linkedin_error=missing_params`
      );
    }

    // Decode state
    let stateData: { userId: string; timestamp: number };
    try {
      stateData = JSON.parse(Buffer.from(state, "base64").toString());
    } catch {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?linkedin_error=invalid_state`
      );
    }

    // Check state timestamp (5 minute expiry)
    if (Date.now() - stateData.timestamp > 5 * 60 * 1000) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?linkedin_error=state_expired`
      );
    }

    // Exchange code for tokens
    const tokens = await exchangeLinkedInCode(code, REDIRECT_URI);

    // Get profile
    const profile = await getLinkedInProfile(tokens.accessToken);

    // Save account
    await saveLinkedInAccount(stateData.userId, tokens, profile);

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?linkedin_success=true`
    );
  } catch (error) {
    console.error("LinkedIn callback error:", error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?linkedin_error=callback_failed`
    );
  }
}
