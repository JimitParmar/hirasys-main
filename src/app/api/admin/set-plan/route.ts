import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";

export async function POST(req: NextRequest) {
  // Only allow in development
   const secret = req.headers.get("x-admin-secret");

  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 403 });
  }

  const { companyId, planSlug } = await req.json();

  if (!companyId || !planSlug) {
    return NextResponse.json(
      { error: "companyId and planSlug required" },
      { status: 400 }
    );
  }

  const plan = await queryOne(
    "SELECT id, name FROM billing_plans WHERE slug = $1",
    [planSlug]
  );

  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  await queryOne(
    `INSERT INTO company_subscriptions (
      company_id, plan_id, status, billing_cycle,
      current_period_start, current_period_end,
      credits_used, credits_remaining
    )
    VALUES ($1, $2, 'ACTIVE', 'MONTHLY', NOW(), NOW() + INTERVAL '100 years', 0, 999999)
    ON CONFLICT (company_id) DO UPDATE SET
      plan_id = $2,
      status = 'ACTIVE',
      current_period_end = NOW() + INTERVAL '100 years',
      credits_remaining = 999999,
      updated_at = NOW()`,
    [companyId, plan.id]
  );

  return NextResponse.json({
    success: true,
    message: `Set ${planSlug} plan for company ${companyId}`,
    plan: plan.name,
  });
}