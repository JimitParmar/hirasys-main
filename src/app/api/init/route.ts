export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/init-db";

export async function GET() {
  try {
    await initializeDatabase();
    return NextResponse.json({ success: true, message: "Database initialized" });
  } catch (error: any) {
    console.error("Init error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}