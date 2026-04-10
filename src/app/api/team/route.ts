import { NextRequest, NextResponse } from "next/server";
import { queryMany } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !["HR", "ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all HR, ADMIN, and INTERVIEWER users as potential interviewers
    const members = await queryMany(
      `SELECT id, first_name, last_name, email, role, department, company
       FROM users
       WHERE role IN ('HR', 'ADMIN', 'INTERVIEWER')
       AND is_active = true
       ORDER BY first_name ASC`
    );

    return NextResponse.json({ members });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}