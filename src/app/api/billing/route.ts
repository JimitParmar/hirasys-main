export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, queryMany } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getUserCompanyId } from "@/lib/company";
import {
  getCompanySubscription,
  getUsageSummary,
  getDailyUsage,
  getInvoices,
  checkPlanLimits,
  checkFeatureAccess,
  trackUsage,
  NODE_COSTS,
} from "@/lib/billing";
import {
  createRazorpayOrder,
  verifyRazorpaySignature,
  activatePlanAfterPayment,
  cancelRazorpaySubscription,
} from "@/lib/payment";


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
      return NextResponse.json(
        { error: "No company found. Please set up your company first." },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    // GET PLANS
    if (action === "plans") {
      const plans = await queryMany(
        "SELECT * FROM billing_plans WHERE is_active = true ORDER BY price_monthly ASC"
      );
      return NextResponse.json({ plans });
    }

    // GET INVOICES
    if (action === "invoices") {
      const invoices = await getInvoices(companyId);
      return NextResponse.json({ invoices });
    }

    // CHECK LIMITS
    if (action === "check_limits") {
      const check = searchParams.get("check") || "";
      const current = parseInt(searchParams.get("current") || "0");
      const result = await checkPlanLimits(companyId, check, current);
      return NextResponse.json(result);
    }

    // CHECK FEATURE
    if (action === "check_feature") {
      const feature = searchParams.get("feature") || "";
      const result = await checkFeatureAccess(companyId, feature);
      return NextResponse.json(result);
    }

    // PAYMENT HISTORY
    if (action === "payments") {
      const payments = await queryMany(
        `SELECT * FROM payment_orders
         WHERE company_id = $1
         ORDER BY created_at DESC
         LIMIT 50`,
        [companyId]
      );
      return NextResponse.json({ payments });
    }

    // DEFAULT — Full billing dashboard
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

    let paymentMethod = subscription.payment_method || null;
    try {
      if (typeof paymentMethod === "string")
        paymentMethod = JSON.parse(paymentMethod);
    } catch {
      paymentMethod = null;
    }

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
        paymentMethod,
        razorpaySubscriptionId:
          subscription.razorpay_subscription_id || null,
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
          paymentId: inv.payment_id,
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
    const userEmail = (session.user as any).email || "";
    const userName =
      `${(session.user as any).firstName || ""} ${(session.user as any).lastName || ""}`.trim() ||
      "User";

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
    // CREATE CHECKOUT — Initiates Razorpay order
    // ==========================================
    if (action === "create_checkout") {
  const { planSlug, billingCycle = "monthly" } = body;

  if (!planSlug) {
    return NextResponse.json(
      { error: "planSlug required" },
      { status: 400 }
    );
  }

  const plan = await queryOne(
    "SELECT * FROM billing_plans WHERE slug = $1",
    [planSlug]
  );

  if (!plan) {
    return NextResponse.json(
      { error: "Plan not found" },
      { status: 404 }
    );
  }

  const price =
    billingCycle === "yearly"
      ? parseFloat(plan.price_yearly)
      : parseFloat(plan.price_monthly);

  // Free plan — activate directly
  if (price <= 0) {
    try {
      await activatePlanAfterPayment({
        companyId,
        planSlug,
        billingCycle,
        paymentId: "free_plan",
        orderId: "free_plan",
      });
    } catch {}

    return NextResponse.json({
      type: "free",
      message: `Switched to ${plan.name} plan`,
    });
  }

  // Paid plan — create Razorpay order
      // Paid plan — create Razorpay order
    try {
      const userInfo = await queryOne(
        "SELECT email, first_name, last_name FROM users WHERE id = $1",
        [userId]
      );

      console.log("[Billing] Creating Razorpay order:", {
        companyId,
        planSlug,
        billingCycle,
        currency: plan.currency,
        amount: billingCycle === "yearly"
          ? plan.price_yearly
          : plan.price_monthly,
      });

      const order = await createRazorpayOrder({
        companyId,
        planSlug,
        billingCycle,
        userId,
        userEmail: userInfo?.email || userEmail || "",
        userName:
          `${userInfo?.first_name || ""} ${userInfo?.last_name || ""}`.trim() ||
          "User",
      });

      return NextResponse.json({
        type: "razorpay",
        order,
      });
    } catch (err: any) {
      console.error("[Billing] Razorpay order failed:", {
        message: err.message,
        stack: err.stack?.substring(0, 300),
        statusCode: err.statusCode,
        error: err.error,
      });

      return NextResponse.json(
        {
          error: `Payment initialization failed: ${err.message || err.error?.description || "Check Razorpay configuration"}`,
        },
        { status: 500 }
      );
    }
}

    // ==========================================
    // VERIFY PAYMENT — After Razorpay checkout
    // ==========================================
    if (action === "verify_payment") {
      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        planSlug,
        billingCycle = "monthly",
      } = body;

      if (
        !razorpay_order_id ||
        !razorpay_payment_id ||
        !razorpay_signature
      ) {
        return NextResponse.json(
          { error: "Missing payment verification parameters" },
          { status: 400 }
        );
      }

      // Verify signature
      const isValid = verifyRazorpaySignature({
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
      });

      if (!isValid) {
        // Mark order as failed
        await query(
          `UPDATE payment_orders SET status = 'FAILED', updated_at = NOW()
           WHERE provider_order_id = $1`,
          [razorpay_order_id]
        );

        return NextResponse.json(
          { error: "Payment verification failed — invalid signature" },
          { status: 400 }
        );
      }

      // Activate plan
      try {
        const subscription = await activatePlanAfterPayment({
          companyId,
          planSlug,
          billingCycle,
          paymentId: razorpay_payment_id,
          orderId: razorpay_order_id,
        });

        return NextResponse.json({
          success: true,
          message: `Successfully upgraded to ${subscription?.plan_name || planSlug}!`,
          subscription: {
            planSlug: subscription?.plan_slug,
            planName: subscription?.plan_name,
          },
        });
      } catch (err: any) {
        console.error("Plan activation failed:", err);
        return NextResponse.json(
          { error: `Plan activation failed: ${err.message}` },
          { status: 500 }
        );
      }
    }

    // ==========================================
    // CANCEL SUBSCRIPTION
    // ==========================================
    if (action === "cancel") {
      const sub = await getCompanySubscription(companyId);
      if (!sub) {
        return NextResponse.json(
          { error: "No active subscription" },
          { status: 404 }
        );
      }

      if (sub.plan_slug === "free") {
        return NextResponse.json(
          { error: "Cannot cancel free plan" },
          { status: 400 }
        );
      }

      // Cancel Razorpay subscription if exists
      if (sub.razorpay_subscription_id) {
        await cancelRazorpaySubscription(sub.razorpay_subscription_id);
      }

      // Downgrade to free at end of period
      const freePlan = await queryOne(
        "SELECT id FROM billing_plans WHERE slug = 'free'"
      );

      if (freePlan) {
        await query(
          `UPDATE company_subscriptions
           SET plan_id = $2, status = 'CANCELLED',
               razorpay_subscription_id = NULL,
               updated_at = NOW()
           WHERE company_id = $1`,
          [companyId, freePlan.id]
        );
      }

      return NextResponse.json({
        message:
          "Subscription cancelled. You'll keep access until the end of your billing period, then revert to Free.",
        periodEnd: sub.current_period_end,
      });
    }

    // ==========================================
    // TRACK USAGE (testing/manual)
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