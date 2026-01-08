import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getXAuthUrl } from "@/lib/x-client";
import { cookies } from "next/headers";

function generateRandomString(length: number) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.redirect(new URL("/login", process.env.NEXTAUTH_URL || "http://localhost:4001"));
    }

    // Check if X credentials are configured
    if (!process.env.X_CLIENT_ID || !process.env.X_CLIENT_SECRET) {
      console.error("X_CLIENT_ID or X_CLIENT_SECRET not configured");
      return NextResponse.redirect(
        new URL("/dashboard/settings?error=x_not_configured", process.env.NEXTAUTH_URL || "http://localhost:4001")
      );
    }

    const state = generateRandomString(32);
    const codeVerifier = generateRandomString(64);

    const cookieStore = await cookies();
    cookieStore.set("x_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 10,
      path: "/",
    });
    cookieStore.set("x_code_verifier", codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 10,
      path: "/",
    });

    const authUrl = getXAuthUrl(state, codeVerifier);
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("X connect error:", error);
    return NextResponse.redirect(
      new URL("/dashboard/settings?error=x_connect_failed", process.env.NEXTAUTH_URL || "http://localhost:4001")
    );
  }
}
