import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-admin-secret");

  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await query(`
    SELECT 
      c.id,
      c.name,
      c.domain,
      COALESCE(bp.slug, 'free') as plan_slug,
      COALESCE(bp.name, 'Free') as plan_name,
      COALESCE(cs.credits_remaining, 0) as credits_remaining,
      COALESCE(cs.current_period_end::text, '') as period_end,
      (SELECT COUNT(*) FROM users u WHERE u.company_id = c.id AND u.role != 'CANDIDATE') as member_count
    FROM companies c
    LEFT JOIN company_subscriptions cs ON cs.company_id = c.id
    LEFT JOIN billing_plans bp ON bp.id = cs.plan_id
    ORDER BY c.created_at DESC
  `);

  return NextResponse.json({ companies: result.rows });
}