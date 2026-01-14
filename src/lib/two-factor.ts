import { createHmac, randomBytes } from "crypto";
import { prisma } from "./prisma";

const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function generateBase32Secret(length = 32): string {
  const randomBytesBuffer = randomBytes(length);
  let secret = "";
  for (let i = 0; i < length; i++) {
    secret += BASE32_CHARS[randomBytesBuffer[i] % 32];
  }
  return secret;
}

function base32Decode(encoded: string): Buffer {
  const cleaned = encoded.replace(/=+$/, "").toUpperCase();
  let bits = "";

  for (const char of cleaned) {
    const val = BASE32_CHARS.indexOf(char);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, "0");
  }

  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substr(i, 8), 2));
  }

  return Buffer.from(bytes);
}

function generateTOTP(secret: string, timestamp?: number): string {
  const time = Math.floor((timestamp || Date.now()) / 1000 / 30);
  const timeBuffer = Buffer.alloc(8);
  timeBuffer.writeBigInt64BE(BigInt(time));

  const decodedSecret = base32Decode(secret);
  const hmac = createHmac("sha1", decodedSecret);
  hmac.update(timeBuffer);
  const hash = hmac.digest();

  const offset = hash[hash.length - 1] & 0xf;
  const code =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);

  return (code % 1000000).toString().padStart(6, "0");
}

export function verifyTOTP(secret: string, token: string): boolean {
  // Check current and previous/next time window for clock drift
  const now = Date.now();
  for (let i = -1; i <= 1; i++) {
    const time = now + i * 30 * 1000;
    if (generateTOTP(secret, time) === token) {
      return true;
    }
  }
  return false;
}

export function generateBackupCodes(count = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = randomBytes(5).toString("hex").toUpperCase();
    codes.push(`${code.slice(0, 4)}-${code.slice(4, 8)}`);
  }
  return codes;
}

export async function setupTwoFactor(userId: string): Promise<{
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const secret = generateBase32Secret();
  const backupCodes = generateBackupCodes();

  // Store the secret temporarily (not enabled yet)
  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorSecret: secret,
      twoFactorBackupCodes: backupCodes.map((code) => hashBackupCode(code)),
    },
  });

  const appName = "SocialMediaManager";
  const otpauthUrl = `otpauth://totp/${encodeURIComponent(appName)}:${encodeURIComponent(
    user.email
  )}?secret=${secret}&issuer=${encodeURIComponent(appName)}`;

  // QR code URL using Google Charts API
  const qrCodeUrl = `https://chart.googleapis.com/chart?cht=qr&chs=200x200&chl=${encodeURIComponent(
    otpauthUrl
  )}`;

  return {
    secret,
    qrCodeUrl,
    backupCodes,
  };
}

export async function enableTwoFactor(
  userId: string,
  token: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorSecret: true },
  });

  if (!user || !user.twoFactorSecret) {
    throw new Error("2FA not set up");
  }

  if (!verifyTOTP(user.twoFactorSecret, token)) {
    return false;
  }

  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorEnabled: true },
  });

  return true;
}

export async function disableTwoFactor(
  userId: string,
  token: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorSecret: true, twoFactorEnabled: true },
  });

  if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
    throw new Error("2FA not enabled");
  }

  if (!verifyTOTP(user.twoFactorSecret, token)) {
    return false;
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorBackupCodes: [],
    },
  });

  return true;
}

function hashBackupCode(code: string): string {
  const hmac = createHmac("sha256", process.env.NEXTAUTH_SECRET || "secret");
  hmac.update(code.replace(/-/g, "").toUpperCase());
  return hmac.digest("hex");
}

export async function verifyTwoFactorCode(
  userId: string,
  code: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      twoFactorSecret: true,
      twoFactorEnabled: true,
      twoFactorBackupCodes: true,
    },
  });

  if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
    return false;
  }

  // Check TOTP code
  if (verifyTOTP(user.twoFactorSecret, code)) {
    return true;
  }

  // Check backup codes
  const normalizedCode = code.replace(/-/g, "").toUpperCase();
  const hashedCode = hashBackupCode(normalizedCode);

  const backupCodeIndex = user.twoFactorBackupCodes.indexOf(hashedCode);
  if (backupCodeIndex !== -1) {
    // Remove used backup code
    const updatedCodes = [...user.twoFactorBackupCodes];
    updatedCodes.splice(backupCodeIndex, 1);

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorBackupCodes: updatedCodes },
    });

    return true;
  }

  return false;
}

export async function regenerateBackupCodes(userId: string): Promise<string[]> {
  const backupCodes = generateBackupCodes();

  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorBackupCodes: backupCodes.map((code) => hashBackupCode(code)),
    },
  });

  return backupCodes;
}

export async function isTwoFactorEnabled(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorEnabled: true },
  });

  return user?.twoFactorEnabled || false;
}

export async function getUserTwoFactorStatus(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      twoFactorEnabled: true,
      twoFactorBackupCodes: true,
    },
  });

  return {
    enabled: user?.twoFactorEnabled || false,
    backupCodesRemaining: user?.twoFactorBackupCodes.length || 0,
  };
}
