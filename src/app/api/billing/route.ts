export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { queryMany } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getUserCompanyId } from "@/lib/company";
import {
  getCompanySubscription,
  getUsageSummary,
  getDailyUsage,
  upgradePlan,
  getInvoices,
  checkPlanLimits,
  checkFeatureAccess,
  trackUsage,
  NODE_COSTS,
} from "@/lib/billing";

// ==========================================
// GET — Fetch billing data
// ==========================================
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const companyId = await getUserCompanyId(userId);

    if (!companyId) {
      // Use userId as fallback company ID for solo users
      return NextResponse.json(
        { error: "No company found. Please set up your company first." },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    // ==========================================
    // GET PLANS
    // ==========================================
    if (action === "plans") {
      const plans = await queryMany(
        "SELECT * FROM billing_plans WHERE is_active = true ORDER BY price_monthly ASC"
      );
      return NextResponse.json({ plans });
    }

    // ==========================================
    // GET INVOICES
    // ==========================================
    if (action === "invoices") {
      const invoices = await getInvoices(companyId);
      return NextResponse.json({ invoices });
    }

    // ==========================================
    // CHECK LIMITS
    // ==========================================
    if (action === "check_limits") {
      const check = searchParams.get("check") || "";
      const current = parseInt(searchParams.get("current") || "0");
      const result = await checkPlanLimits(companyId, check, current);
      return NextResponse.json(result);
    }

    // ==========================================
    // CHECK FEATURE
    // ==========================================
    if (action === "check_feature") {
      const feature = searchParams.get("feature") || "";
      const result = await checkFeatureAccess(companyId, feature);
      return NextResponse.json(result);
    }

    // ==========================================
    // DEFAULT — Full billing dashboard data
    // ==========================================
    const subscription = await getCompanySubscription(companyId);

    if (!subscription) {
      return NextResponse.json({
        billing: {
          planSlug: "free",
          planName: "Free",
          baseCost: 0,
          billingCycle: "MONTHLY",
          creditsIncluded: 0,
          creditsUsed: 0,
          creditsRemaining: 0,
          overage: 0,
          totalDue: 0,
          periodStart: new Date().toISOString(),
          periodEnd: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          ).toISOString(),
          features: {},
          limits: {},
        },
        usage: { items: [], totalCost: 0, totalUnits: 0 },
        dailyUsage: [],
        invoices: [],
        nodeCosts: NODE_COSTS,
      });
    }

    // Parse fields
    const creditsIncluded = parseFloat(subscription.credits_included) || 0;
    const creditsUsed = parseFloat(subscription.credits_used) || 0;
    const creditsRemaining = Math.max(0, creditsIncluded - creditsUsed);
    const baseCost = parseFloat(subscription.price_monthly) || 0;
    const overage = Math.max(0, creditsUsed - creditsIncluded);
    const totalDue = baseCost + overage;

    let features = subscription.features || {};
    try {
      if (typeof features === "string") features = JSON.parse(features);
    } catch {
      features = {};
    }

    let limits = subscription.plan_limits || {};
    try {
      if (typeof limits === "string") limits = JSON.parse(limits);
    } catch {
      limits = {};
    }

    // Get usage for current period
    const usage = await getUsageSummary(
      companyId,
      new Date(subscription.current_period_start),
      new Date(subscription.current_period_end)
    );

    const dailyUsage = await getDailyUsage(companyId, 30);
    const invoices = await getInvoices(companyId);

    return NextResponse.json({
      billing: {
        planSlug: subscription.plan_slug,
        planName: subscription.plan_name,
        baseCost: Math.round(baseCost * 100) / 100,
        billingCycle: subscription.billing_cycle || "MONTHLY",
        creditsIncluded: Math.round(creditsIncluded * 100) / 100,
        creditsUsed: Math.round(creditsUsed * 100) / 100,
        creditsRemaining: Math.round(creditsRemaining * 100) / 100,
        overage: Math.round(overage * 100) / 100,
        totalDue: Math.round(totalDue * 100) / 100,
        periodStart: subscription.current_period_start,
        periodEnd: subscription.current_period_end,
        subscriptionId: subscription.id,
        status: subscription.status,
        features,
        limits,
      },
      usage,
      dailyUsage,
      invoices: invoices.map((inv: any) => {
        let lineItems = inv.line_items || [];
        try {
          if (typeof lineItems === "string")
            lineItems = JSON.parse(lineItems);
        } catch {
          lineItems = [];
        }
        return {
          id: inv.id,
          periodStart: inv.period_start,
          periodEnd: inv.period_end,
          planName: inv.plan_name,
          baseAmount: parseFloat(inv.base_amount) || 0,
          usageAmount: parseFloat(inv.usage_amount) || 0,
          creditsApplied: parseFloat(inv.credits_applied) || 0,
          totalAmount: parseFloat(inv.total_amount) || 0,
          status: inv.status,
          lineItems,
          createdAt: inv.created_at,
        };
      }),
      nodeCosts: NODE_COSTS,
    });
  } catch (error: any) {
    console.error("Billing GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch billing data" },
      { status: 500 }
    );
  }
}

// ==========================================
// POST — Billing actions
// ==========================================
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const role = (session.user as any).role;

    if (role !== "ADMIN" && role !== "HR") {
      return NextResponse.json(
        { error: "Only admins/HR can manage billing" },
        { status: 403 }
      );
    }

    const companyId = await getUserCompanyId(userId);
    if (!companyId) {
      return NextResponse.json(
        { error: "No company found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const action = body.action;

    // ==========================================
    // UPGRADE PLAN
    // ==========================================
    if (action === "upgrade") {
      const { planSlug } = body;

      if (!planSlug) {
        return NextResponse.json(
          { error: "planSlug required" },
          { status: 400 }
        );
      }

      try {
        const subscription = await upgradePlan(companyId, planSlug);
        return NextResponse.json({
          message: `Successfully switched to ${subscription?.plan_name || planSlug} plan!`,
          subscription: {
            planSlug: subscription?.plan_slug,
            planName: subscription?.plan_name,
            creditsIncluded: subscription?.credits_included,
          },
        });
      } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
    }

    // ==========================================
    // TRACK USAGE (for testing/manual)
    // ==========================================
    if (action === "track_usage") {
      const { nodeType, jobId, applicationId } = body;

      if (!nodeType) {
        return NextResponse.json(
          { error: "nodeType required" },
          { status: 400 }
        );
      }

      await trackUsage({
        companyId,
        userId,
        nodeType,
        jobId,
        applicationId,
      });

      return NextResponse.json({ message: "Usage tracked successfully" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Billing POST error:", error);
    return NextResponse.json(
      { error: `Billing operation failed: ${error.message}` },
      { status: 500 }
    );
  }
}