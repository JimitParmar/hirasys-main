import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const result = await query("SELECT NOW() as time");
    const users = await query("SELECT COUNT(*) as count FROM users");
    const jobs = await query("SELECT COUNT(*) as count FROM jobs");

    return NextResponse.json({
      status: "ok",
      database: "connected",
      time: result.rows[0].time,
      counts: {
        users: parseInt(users.rows[0].count),
        jobs: parseInt(jobs.rows[0].count),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: "error", error: error.message },
      { status: 500 }
    );
  }
}