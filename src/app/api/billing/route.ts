export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, queryMany } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getUsageSummary, getCompanySubscription, NODE_COSTS } from "@/lib/billing";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Only admins can view billing" }, { status: 403 });
    }

    const companyId = (session.user as any).companyId;
    if (!companyId) {
      return NextResponse.json({ error: "No company" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (action === "plans") {
      const plans = await queryMany(
        "SELECT * FROM billing_plans WHERE is_active = true ORDER BY price_monthly ASC"
      );
      return NextResponse.json({ plans });
    }

    if (action === "invoices") {
      const invoices = await queryMany(
        "SELECT * FROM invoices WHERE company_id = $1 ORDER BY created_at DESC LIMIT 12",
        [companyId]
      );
      return NextResponse.json({ invoices });
    }

    if (action === "usage_detail") {
      const records = await queryMany(
        `SELECT ur.*, j.title as job_title, u.first_name, u.last_name
         FROM usage_records ur
         LEFT JOIN jobs j ON ur.job_id = j.id
         LEFT JOIN users u ON ur.user_id = u.id
         WHERE ur.company_id = $1
         ORDER BY ur.created_at DESC
         LIMIT 100`,
        [companyId]
      );
      return NextResponse.json({ records });
    }

    // Default: billing overview
    const subscription = await getCompanySubscription(companyId);
    const usage = await getUsageSummary(companyId);

    // Get daily usage for chart
    const dailyUsage = await queryMany(
      `SELECT DATE(created_at) as date, SUM(total_cost) as cost, COUNT(*) as count
       FROM usage_records
       WHERE company_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [companyId]
    );

    // Calculate billing
    let features = subscription?.features || {};
    try { if (typeof features === "string") features = JSON.parse(features); } catch {}

    const creditsIncluded = parseFloat(subscription?.credits_included) || 0;
    const creditsUsed = parseFloat(subscription?.credits_used) || 0;
    const creditsRemaining = Math.max(0, creditsIncluded - creditsUsed);
    const overage = Math.max(0, creditsUsed - creditsIncluded);
    const baseCost = parseFloat(subscription?.price_monthly) || 0;
    const totalDue = baseCost + overage;

    return NextResponse.json({
      subscription: {
        ...subscription,
        features,
      },
      billing: {
        planName: subscription?.plan_name || "Free",
        planSlug: subscription?.plan_slug || "free",
        baseCost,
        creditsIncluded,
        creditsUsed: Math.round(creditsUsed * 100) / 100,
        creditsRemaining: Math.round(creditsRemaining * 100) / 100,
        overage: Math.round(overage * 100) / 100,
        totalDue: Math.round(totalDue * 100) / 100,
        billingCycle: subscription?.billing_cycle || "MONTHLY",
        periodEnd: subscription?.current_period_end,
      },
      usage,
      dailyUsage: dailyUsage.map((d: any) => ({
        date: d.date,
        cost: parseFloat(d.cost),
        count: parseInt(d.count),
      })),
      nodeCosts: NODE_COSTS,
    });
  } catch (error: any) {
    console.error("Billing error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST — upgrade plan or process payment
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Only admins" }, { status: 403 });
    }

    const companyId = (session.user as any).companyId;
    const { action, planSlug } = await req.json();

    if (action === "upgrade") {
      const plan = await queryOne(
        "SELECT * FROM billing_plans WHERE slug = $1 AND is_active = true",
        [planSlug]
      );
      if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

      const existing = await queryOne(
        "SELECT id FROM company_subscriptions WHERE company_id = $1",
        [companyId]
      );

      if (existing) {
        await query(
          `UPDATE company_subscriptions
           SET plan_id = $2, credits_remaining = $3, credits_used = 0,
               current_period_start = NOW(), current_period_end = NOW() + INTERVAL '30 days',
               status = 'ACTIVE', updated_at = NOW()
           WHERE company_id = $1`,
          [companyId, plan.id, plan.credits_included]
        );
      } else {
        await query(
          `INSERT INTO company_subscriptions (company_id, plan_id, credits_remaining)
           VALUES ($1, $2, $3)`,
          [companyId, plan.id, plan.credits_included]
        );
      }

      return NextResponse.json({
        success: true,
        message: `Upgraded to ${plan.name}! $${plan.credits_included} credits added.`,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}