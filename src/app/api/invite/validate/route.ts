export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) return NextResponse.json({ error: "Token required" }, { status: 400 });

  const invitation = await queryOne(
    `SELECT i.*, c.name as company_name
     FROM invitations i
     LEFT JOIN companies c ON i.company_id = c.id
     WHERE i.token = $1`,
    [token]
  );

  if (!invitation) return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  if (invitation.status !== "PENDING") return NextResponse.json({ error: "Invitation already used" }, { status: 400 });
  if (new Date(invitation.expires_at) < new Date()) return NextResponse.json({ error: "Invitation expired" }, { status: 400 });

  return NextResponse.json({ invitation });
}