export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { queryOne } from "@/lib/db";

export async function GET() {
  const checks: Record<string, any> = {
    status: "ok",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
  };

  // Database
  try {
    const result = await queryOne("SELECT NOW() as time, current_database() as db");
    checks.database = {
      status: "connected",
      time: result?.time,
      name: result?.db,
    };
  } catch (err: any) {
    checks.database = { status: "error", error: err.message };
    checks.status = "degraded";
  }

  // AI
  checks.ai = {
    gemini: !!process.env.GEMINI_API_KEY,
  };

  // Email
  checks.email = {
    resend: !!process.env.RESEND_API_KEY,
  };

  // Payments
  checks.payments = {
    razorpay: !!process.env.RAZORPAY_KEY_ID,
  };

  // Table counts
  try {
    const tables = ["users", "jobs", "applications", "pipelines", "companies"];
    checks.tables = {};
    for (const table of tables) {
      const result = await queryOne(`SELECT COUNT(*)::int as count FROM ${table}`);
      checks.tables[table] = result?.count || 0;
    }
  } catch {}

  const statusCode = checks.status === "ok" ? 200 : 503;
  return NextResponse.json(checks, { status: statusCode });
}