import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    console.log("🗑️ Resetting database...");

    // Clear references first
    await query("UPDATE pipelines SET linked_job_id = NULL");
    await query("UPDATE jobs SET pipeline_id = NULL");

    // Delete in order (children before parents)
    await query("DELETE FROM notifications");
    await query("DELETE FROM ratings");
    await query("DELETE FROM submissions");
    await query("DELETE FROM ai_interviews");
    await query("DELETE FROM applications");
    await query("DELETE FROM assessments");
    await query("DELETE FROM jobs");
    await query("DELETE FROM pipelines");
    await query("DELETE FROM users");

    console.log("🗑️ Reset complete!");

    return NextResponse.json({
      success: true,
      message: "All data deleted. Run /api/seed to create fresh data.",
    });
  } catch (error: any) {
    console.error("Reset error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}