import { NextRequest, NextResponse } from "next/server";
import {
  exchangeInstagramCode,
  getInstagramProfile,
  saveInstagramAccount,
} from "@/lib/platforms/instagram";

const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/instagram/callback`;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?instagram_error=${error}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?instagram_error=missing_params`
      );
    }

    let stateData: { userId: string; timestamp: number };
    try {
      stateData = JSON.parse(Buffer.from(state, "base64").toString());
    } catch {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?instagram_error=invalid_state`
      );
    }

    if (Date.now() - stateData.timestamp > 5 * 60 * 1000) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?instagram_error=state_expired`
      );
    }

    const tokens = await exchangeInstagramCode(code, REDIRECT_URI);
    const profile = await getInstagramProfile(tokens.accessToken);
    await saveInstagramAccount(stateData.userId, tokens, profile);

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?instagram_success=true`
    );
  } catch (error) {
    console.error("Instagram callback error:", error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?instagram_error=callback_failed`
    );
  }
}
