import Razorpay from "razorpay";
import crypto from "crypto";
import { query, queryOne } from "./db";
import { getCompanySubscription } from "./billing";

// ==========================================
// RAZORPAY INSTANCE
// ==========================================
let razorpayInstance: Razorpay | null = null;

function getRazorpay(): Razorpay {
  if (!razorpayInstance) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error("Razorpay credentials not configured");
    }
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpayInstance;
}

// ==========================================
// CREATE ORDER (for one-time plan purchase)
// ==========================================
export async function createRazorpayOrder(params: {
  companyId: string;
  planSlug: string;
  billingCycle: "monthly" | "yearly";
  userId: string;
  userEmail: string;
  userName: string;
}): Promise<{
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  prefill: { name: string; email: string };
}> {
  const plan = await queryOne(
    "SELECT * FROM billing_plans WHERE slug = $1 AND is_active = true",
    [params.planSlug]
  );

  if (!plan) throw new Error("Plan not found");

  const amount =
    params.billingCycle === "yearly"
      ? parseFloat(plan.price_yearly) || 0
      : parseFloat(plan.price_monthly) || 0;

  if (amount <= 0) {
    throw new Error("Cannot create payment for free plan");
  }

  // Amount in paise (Razorpay uses smallest currency unit)
  const amountInPaise = Math.round(amount * 100);
  const currency = plan.currency || "USD";

  const razorpay = getRazorpay();

  const order = await razorpay.orders.create({
    amount: amountInPaise,
    currency: currency,
    receipt: `order_${params.companyId}_${Date.now()}`,
    notes: {
      company_id: params.companyId,
      plan_slug: params.planSlug,
      plan_name: plan.name,
      billing_cycle: params.billingCycle,
      user_id: params.userId,
    },
  });

  // Store pending order in DB
  await query(
    `INSERT INTO payment_orders (
      id, company_id, user_id, plan_id, plan_slug,
      billing_cycle, amount, currency, provider,
      provider_order_id, status, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'razorpay', $9, 'CREATED', $10)`,
    [
      crypto.randomUUID(),
      params.companyId,
      params.userId,
      plan.id,
      params.planSlug,
      params.billingCycle,
      amount,
      currency,
      order.id,
      JSON.stringify({
        plan_name: plan.name,
        credits_included: plan.credits_included,
      }),
    ]
  );

  return {
    orderId: order.id,
    amount: amountInPaise,
    currency,
    keyId: process.env.RAZORPAY_KEY_ID!,
    prefill: {
      name: params.userName,
      email: params.userEmail,
    },
  };
}

// ==========================================
// CREATE RAZORPAY SUBSCRIPTION (recurring)
// ==========================================
export async function createRazorpaySubscription(params: {
  companyId: string;
  planSlug: string;
  billingCycle: "monthly" | "yearly";
  userId: string;
  userEmail: string;
  userName: string;
}): Promise<{
  subscriptionId: string;
  shortUrl: string;
  keyId: string;
}> {
  const plan = await queryOne(
    "SELECT * FROM billing_plans WHERE slug = $1 AND is_active = true",
    [params.planSlug]
  );

  if (!plan) throw new Error("Plan not found");

  // Check if plan has a Razorpay plan_id stored
  let razorpayPlanId = plan.razorpay_plan_id;

  if (!razorpayPlanId) {
    // Create a Razorpay Plan
    const razorpay = getRazorpay();
    const amount =
      params.billingCycle === "yearly"
        ? parseFloat(plan.price_yearly) || 0
        : parseFloat(plan.price_monthly) || 0;

    const period = params.billingCycle === "yearly" ? "yearly" : "monthly";

    const rzpPlan = await razorpay.plans.create({
      period,
      interval: 1,
      item: {
        name: `${plan.name} Plan (${params.billingCycle})`,
        amount: Math.round(amount * 100),
        currency: plan.currency || "USD",
        description: `${plan.name} — ${params.billingCycle} billing`,
      },
    });

    razorpayPlanId = rzpPlan.id;

    // Store for reuse
    await query(
      "UPDATE billing_plans SET razorpay_plan_id = $2 WHERE id = $1",
      [plan.id, razorpayPlanId]
    );
  }

  const razorpay = getRazorpay();

  const subscription = await razorpay.subscriptions.create({
    plan_id: razorpayPlanId,
    total_count: params.billingCycle === "yearly" ? 1 : 12,
    quantity: 1,
    customer_notify: 1,
    notes: {
      company_id: params.companyId,
      plan_slug: params.planSlug,
      user_id: params.userId,
      billing_cycle: params.billingCycle,
    },
  });

  // Store pending subscription
  await query(
    `INSERT INTO payment_orders (
      id, company_id, user_id, plan_id, plan_slug,
      billing_cycle, amount, currency, provider,
      provider_order_id, provider_subscription_id, status, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'razorpay', $9, $10, 'CREATED', $11)`,
    [
      crypto.randomUUID(),
      params.companyId,
      params.userId,
      plan.id,
      params.planSlug,
      params.billingCycle,
      params.billingCycle === "yearly"
        ? parseFloat(plan.price_yearly)
        : parseFloat(plan.price_monthly),
      plan.currency || "USD",
      subscription.id,
      subscription.id,
      JSON.stringify({
        plan_name: plan.name,
        short_url: subscription.short_url,
      }),
    ]
  );

  return {
    subscriptionId: subscription.id,
    shortUrl: subscription.short_url || "",
    keyId: process.env.RAZORPAY_KEY_ID!,
  };
}

// ==========================================
// VERIFY RAZORPAY PAYMENT SIGNATURE
// ==========================================
export function verifyRazorpaySignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) throw new Error("Razorpay secret not configured");

  const body = `${params.orderId}|${params.paymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  return expectedSignature === params.signature;
}

// ==========================================
// VERIFY RAZORPAY WEBHOOK SIGNATURE
// ==========================================
export function verifyRazorpayWebhook(
  body: string,
  signature: string
): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  return expectedSignature === signature;
}

// ==========================================
// ACTIVATE PLAN AFTER PAYMENT
// ==========================================
export async function activatePlanAfterPayment(params: {
  companyId: string;
  planSlug: string;
  billingCycle: string;
  paymentId: string;
  orderId: string;
  subscriptionId?: string;
}): Promise<any> {
  const plan = await queryOne(
    "SELECT * FROM billing_plans WHERE slug = $1",
    [params.planSlug]
  );

  if (!plan) throw new Error("Plan not found");

  const creditsIncluded = parseFloat(plan.credits_included) || 0;
  const periodInterval =
    params.billingCycle === "yearly" ? "365 days" : "30 days";

  // Check if subscription exists
  const existingSub = await queryOne(
    "SELECT * FROM company_subscriptions WHERE company_id = $1",
    [params.companyId]
  );

  if (existingSub) {
    await query(
      `UPDATE company_subscriptions
       SET plan_id = $2,
           status = 'ACTIVE',
           billing_cycle = $3,
           credits_used = 0,
           credits_remaining = $4,
           current_period_start = NOW(),
           current_period_end = NOW() + INTERVAL '${periodInterval}',
           razorpay_subscription_id = $5,
           payment_method = $6,
           updated_at = NOW()
       WHERE company_id = $1`,
      [
        params.companyId,
        plan.id,
        params.billingCycle.toUpperCase(),
        creditsIncluded,
        params.subscriptionId || null,
        JSON.stringify({
          provider: "razorpay",
          payment_id: params.paymentId,
          order_id: params.orderId,
        }),
      ]
    );
  } else {
    await query(
      `INSERT INTO company_subscriptions (
        company_id, plan_id, status, billing_cycle,
        credits_used, credits_remaining,
        current_period_start, current_period_end,
        razorpay_subscription_id, payment_method
      ) VALUES ($1, $2, 'ACTIVE', $3, 0, $4, NOW(), NOW() + INTERVAL '${periodInterval}', $5, $6)`,
      [
        params.companyId,
        plan.id,
        params.billingCycle.toUpperCase(),
        creditsIncluded,
        params.subscriptionId || null,
        JSON.stringify({
          provider: "razorpay",
          payment_id: params.paymentId,
          order_id: params.orderId,
        }),
      ]
    );
  }

  // Update payment order status
  await query(
    `UPDATE payment_orders
     SET status = 'PAID', provider_payment_id = $2, paid_at = NOW()
     WHERE provider_order_id = $1 OR provider_subscription_id = $1`,
    [params.orderId, params.paymentId]
  );

  // Generate invoice
  const amount =
    params.billingCycle === "yearly"
      ? parseFloat(plan.price_yearly)
      : parseFloat(plan.price_monthly);

  await query(
    `INSERT INTO invoices (
      company_id, period_start, period_end, plan_name,
      base_amount, usage_amount, credits_applied, total_amount,
      status, payment_id, line_items
    ) VALUES ($1, NOW(), NOW() + INTERVAL '${periodInterval}', $2, $3, 0, 0, $3, 'PAID', $4, $5)`,
    [
      params.companyId,
      plan.name,
      amount,
      params.paymentId,
      JSON.stringify([
        {
          description: `${plan.name} Plan — ${params.billingCycle}`,
          amount,
        },
      ]),
    ]
  );

  return await getCompanySubscription(params.companyId);
}

// ==========================================
// FETCH PAYMENT DETAILS
// ==========================================
export async function getPaymentDetails(paymentId: string) {
  try {
    const razorpay = getRazorpay();
    return await razorpay.payments.fetch(paymentId);
  } catch {
    return null;
  }
}

// ==========================================
// CANCEL RAZORPAY SUBSCRIPTION
// ==========================================
export async function cancelRazorpaySubscription(
  subscriptionId: string
): Promise<boolean> {
  try {
    const razorpay = getRazorpay();
    await razorpay.subscriptions.cancel(subscriptionId, false);
    return true;
  } catch (err) {
    console.error("Failed to cancel Razorpay subscription:", err);
    return false;
  }
}

// ==========================================
// REFUND PAYMENT
// ==========================================
export async function refundPayment(
  paymentId: string,
  amount?: number
): Promise<boolean> {
  try {
    const razorpay = getRazorpay();
    const refundParams: any = {};
    if (amount) refundParams.amount = Math.round(amount * 100);
    await razorpay.payments.refund(paymentId, refundParams);
    return true;
  } catch (err) {
    console.error("Refund failed:", err);
    return false;
  }
}