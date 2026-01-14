import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  setupTwoFactor,
  enableTwoFactor,
  disableTwoFactor,
  verifyTwoFactorCode,
  regenerateBackupCodes,
  getUserTwoFactorStatus,
} from "@/lib/two-factor";
import { authApiMiddleware } from "@/lib/api-middleware";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const status = await getUserTwoFactorStatus(session.user.id);
    return NextResponse.json(status);
  } catch (error) {
    console.error("2FA status error:", error);
    return NextResponse.json(
      { error: "Failed to get 2FA status" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const middleware = await authApiMiddleware(request);
  if (!middleware.success) {
    return middleware.response;
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, code } = body;

    if (action === "setup") {
      const result = await setupTwoFactor(session.user.id);
      return NextResponse.json({
        secret: result.secret,
        qrCodeUrl: result.qrCodeUrl,
        backupCodes: result.backupCodes,
      });
    }

    if (action === "enable") {
      if (!code) {
        return NextResponse.json(
          { error: "Verification code is required" },
          { status: 400 }
        );
      }

      const success = await enableTwoFactor(session.user.id, code);
      if (!success) {
        return NextResponse.json(
          { error: "Invalid verification code" },
          { status: 400 }
        );
      }

      return NextResponse.json({ success: true, message: "2FA enabled successfully" });
    }

    if (action === "disable") {
      if (!code) {
        return NextResponse.json(
          { error: "Verification code is required" },
          { status: 400 }
        );
      }

      const success = await disableTwoFactor(session.user.id, code);
      if (!success) {
        return NextResponse.json(
          { error: "Invalid verification code" },
          { status: 400 }
        );
      }

      return NextResponse.json({ success: true, message: "2FA disabled successfully" });
    }

    if (action === "verify") {
      if (!code) {
        return NextResponse.json(
          { error: "Verification code is required" },
          { status: 400 }
        );
      }

      const valid = await verifyTwoFactorCode(session.user.id, code);
      return NextResponse.json({ valid });
    }

    if (action === "regenerate-backup-codes") {
      if (!code) {
        return NextResponse.json(
          { error: "Verification code is required" },
          { status: 400 }
        );
      }

      const valid = await verifyTwoFactorCode(session.user.id, code);
      if (!valid) {
        return NextResponse.json(
          { error: "Invalid verification code" },
          { status: 400 }
        );
      }

      const backupCodes = await regenerateBackupCodes(session.user.id);
      return NextResponse.json({ backupCodes });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("2FA action error:", error);
    return NextResponse.json(
      { error: "Failed to process 2FA action" },
      { status: 500 }
    );
  }
}
