import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const checks: {
    status: "healthy" | "unhealthy";
    database: "connected" | "disconnected";
    timestamp: string;
    uptime: number;
    version: string;
  } = {
    status: "healthy",
    database: "disconnected",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || "0.1.0",
  };

  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "connected";
  } catch {
    checks.database = "disconnected";
    checks.status = "unhealthy";
  }

  const statusCode = checks.status === "healthy" ? 200 : 503;

  return NextResponse.json(checks, { status: statusCode });
}
