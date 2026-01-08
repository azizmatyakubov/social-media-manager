import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { exchangeCodeForTokens, getXUser } from "@/lib/x-client";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { canPerformAction } from "@/lib/subscription";

export async function GET(request: Request) {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:4001";

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.redirect(new URL("/login", baseUrl));
    }

    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");
    const errorDescription = url.searchParams.get("error_description");

    if (error) {
      console.error("X OAuth error:", error, errorDescription);
      return NextResponse.redirect(
        new URL(`/dashboard/settings?error=x_auth_denied&message=${encodeURIComponent(errorDescription || error)}`, baseUrl)
      );
    }

    const cookieStore = await cookies();
    const storedState = cookieStore.get("x_oauth_state")?.value;
    const codeVerifier = cookieStore.get("x_code_verifier")?.value;

    if (!code) {
      console.error("No authorization code received");
      return NextResponse.redirect(
        new URL("/dashboard/settings?error=no_code", baseUrl)
      );
    }

    if (!state || state !== storedState) {
      console.error("State mismatch:", { state, storedState });
      return NextResponse.redirect(
        new URL("/dashboard/settings?error=invalid_state", baseUrl)
      );
    }

    if (!codeVerifier) {
      console.error("No code verifier found");
      return NextResponse.redirect(
        new URL("/dashboard/settings?error=no_verifier", baseUrl)
      );
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code, codeVerifier);

    // Get user info
    const xUser = await getXUser(tokens.access_token);

    // Check if this X account is already connected (to any user)
    const existingAccount = await prisma.xAccount.findUnique({
      where: { xUserId: xUser.id },
    });

    if (existingAccount && existingAccount.userId !== session.user.id) {
      return NextResponse.redirect(
        new URL("/dashboard/settings?error=x_connect_failed&message=This X account is already connected to another user", baseUrl)
      );
    }

    // Check account limits for new connections
    if (!existingAccount) {
      const usageCheck = await canPerformAction(session.user.id, "X_ACCOUNTS");
      const currentAccounts = await prisma.xAccount.count({
        where: { userId: session.user.id },
      });

      if (usageCheck.limit !== -1 && currentAccounts >= usageCheck.limit) {
        return NextResponse.redirect(
          new URL(`/dashboard/settings?error=x_connect_failed&message=You've reached your X account limit (${usageCheck.limit}). Upgrade to add more.`, baseUrl)
        );
      }
    }

    // Check if user has any accounts (for setting default)
    const hasAccounts = await prisma.xAccount.count({
      where: { userId: session.user.id },
    });

    // Store in database (upsert by xUserId for reconnection)
    await prisma.xAccount.upsert({
      where: { xUserId: xUser.id },
      create: {
        userId: session.user.id,
        xUserId: xUser.id,
        xUsername: xUser.username,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || "",
        tokenExpiresAt: new Date(Date.now() + (tokens.expires_in || 7200) * 1000),
        isDefault: hasAccounts === 0, // First account is default
      },
      update: {
        xUsername: xUser.username,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || "",
        tokenExpiresAt: new Date(Date.now() + (tokens.expires_in || 7200) * 1000),
      },
    });

    // Clean up cookies
    cookieStore.delete("x_oauth_state");
    cookieStore.delete("x_code_verifier");

    return NextResponse.redirect(
      new URL("/dashboard/settings?success=x_connected", baseUrl)
    );
  } catch (err) {
    console.error("X OAuth callback error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.redirect(
      new URL(`/dashboard/settings?error=x_auth_failed&message=${encodeURIComponent(errorMessage)}`, baseUrl)
    );
  }
}
