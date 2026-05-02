import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-admin-secret");

  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { companyId, credits } = await req.json();

  if (!companyId || credits === undefined) {
    return NextResponse.json(
      { error: "companyId and credits required" },
      { status: 400 }
    );
  }

  const result = await query(
    `UPDATE company_subscriptions 
     SET credits_remaining = $1, updated_at = NOW()
     WHERE company_id = $2`,
    [credits, companyId]
  );

  if (result.rowCount === 0) {
    return NextResponse.json(
      { error: "No subscription found. Set a plan first." },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, credits });
}