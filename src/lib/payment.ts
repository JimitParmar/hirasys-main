import crypto from "crypto";
import { query, queryOne } from "./db";
import { getCompanySubscription } from "./billing";

// ==========================================
// RAZORPAY INSTANCE
// ==========================================
let razorpayInstance: any = null;

async function getRazorpay() {
  if (!razorpayInstance) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error(
        "Razorpay not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET."
      );
    }

    const Razorpay = (await import("razorpay")).default;
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpayInstance;
}

// ==========================================
// CREATE ORDER
// ==========================================
export async function createRazorpayOrder(params: {
  companyId: string;
  planSlug: string;
  billingCycle: "monthly" | "yearly";
  userId: string;
  userEmail: string;
  userName: string;
}) {
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

  const currency = plan.currency || "INR";
  const amountInSmallestUnit = Math.round(amount * 100);

  const razorpay = await getRazorpay();

  const order = await razorpay.orders.create({
    amount: amountInSmallestUnit,
    currency,
    receipt: `order_${params.companyId.substring(0, 8)}_${Date.now()}`,
    notes: {
      company_id: params.companyId,
      plan_slug: params.planSlug,
      plan_name: plan.name,
      billing_cycle: params.billingCycle,
      user_id: params.userId,
    },
  });

  // Store pending order
  try {
    await query(
      `INSERT INTO payment_orders (
        company_id, user_id, plan_id, plan_slug,
        billing_cycle, amount, currency, provider,
        provider_order_id, status, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'razorpay', $8, 'CREATED', $9)`,
      [
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
  } catch (err) {
    console.error("Failed to store payment order (non-critical):", err);
  }

  return {
    orderId: order.id,
    amount: amountInSmallestUnit,
    currency,
    keyId: process.env.RAZORPAY_KEY_ID!,
    prefill: {
      name: params.userName,
      email: params.userEmail,
    },
  };
}

// ==========================================
// VERIFY SIGNATURE
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
// VERIFY WEBHOOK
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
}) {
  const plan = await queryOne(
    "SELECT * FROM billing_plans WHERE slug = $1",
    [params.planSlug]
  );

  if (!plan) throw new Error("Plan not found");

  const creditsIncluded = parseFloat(plan.credits_included) || 0;
  const periodInterval =
    params.billingCycle === "yearly" ? "365 days" : "30 days";

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
  try {
    await query(
      `UPDATE payment_orders
       SET status = 'PAID', provider_payment_id = $2, paid_at = NOW()
       WHERE provider_order_id = $1`,
      [params.orderId, params.paymentId]
    );
  } catch {}

  // Generate invoice
  try {
    const amount =
      params.billingCycle === "yearly"
        ? parseFloat(plan.price_yearly)
        : parseFloat(plan.price_monthly);

    await query(
      `INSERT INTO invoices (
        company_id, period_start, period_end, plan_name,
        base_amount, total_amount, status, payment_id, line_items
      ) VALUES ($1, NOW(), NOW() + INTERVAL '${periodInterval}', $2, $3, $3, 'PAID', $4, $5)`,
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
  } catch (err) {
    console.error("Invoice generation failed:", err);
  }

  return await getCompanySubscription(params.companyId);
}

// ==========================================
// CANCEL SUBSCRIPTION
// ==========================================
export async function cancelRazorpaySubscription(
  subscriptionId: string
): Promise<boolean> {
  try {
    const razorpay = await getRazorpay();
    await razorpay.subscriptions.cancel(subscriptionId, false);
    return true;
  } catch (err) {
    console.error("Failed to cancel Razorpay subscription:", err);
    return false;
  }
}