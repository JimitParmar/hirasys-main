export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { verifyRazorpayWebhook, activatePlanAfterPayment } from "@/lib/payment";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature") || "";

    // Verify webhook signature
    if (process.env.RAZORPAY_WEBHOOK_SECRET) {
      const isValid = verifyRazorpayWebhook(rawBody, signature);
      if (!isValid) {
        console.error("Invalid Razorpay webhook signature");
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 400 }
        );
      }
    }

    const event = JSON.parse(rawBody);
    const eventType = event.event;

    console.log("Razorpay webhook:", eventType);

    // ==========================================
    // PAYMENT CAPTURED
    // ==========================================
    if (eventType === "payment.captured") {
      const payment = event.payload?.payment?.entity;
      if (!payment) return NextResponse.json({ status: "no_payment" });

      const orderId = payment.order_id;
      const paymentId = payment.id;

      // Find the pending order
      const order = await queryOne(
        "SELECT * FROM payment_orders WHERE provider_order_id = $1",
        [orderId]
      );

      if (!order) {
        console.log("No matching order found for:", orderId);
        return NextResponse.json({ status: "order_not_found" });
      }

      if (order.status === "PAID") {
        console.log("Order already paid:", orderId);
        return NextResponse.json({ status: "already_paid" });
      }

      // Activate
      await activatePlanAfterPayment({
        companyId: order.company_id,
        planSlug: order.plan_slug,
        billingCycle: order.billing_cycle?.toLowerCase() || "monthly",
        paymentId,
        orderId,
      });

      console.log(
        `✅ Payment captured: ${paymentId} for company ${order.company_id} → ${order.plan_slug}`
      );

      return NextResponse.json({ status: "activated" });
    }

    // ==========================================
    // PAYMENT FAILED
    // ==========================================
    if (eventType === "payment.failed") {
      const payment = event.payload?.payment?.entity;
      if (payment?.order_id) {
        await query(
          `UPDATE payment_orders SET status = 'FAILED', updated_at = NOW()
           WHERE provider_order_id = $1`,
          [payment.order_id]
        );
        console.log("❌ Payment failed for order:", payment.order_id);
      }
      return NextResponse.json({ status: "noted" });
    }

    // ==========================================
    // SUBSCRIPTION CHARGED
    // ==========================================
    if (eventType === "subscription.charged") {
      const subscription = event.payload?.subscription?.entity;
      const payment = event.payload?.payment?.entity;

      if (subscription && payment) {
        const notes = subscription.notes || {};
        const companyId = notes.company_id;
        const planSlug = notes.plan_slug;

        if (companyId && planSlug) {
          await activatePlanAfterPayment({
            companyId,
            planSlug,
            billingCycle: notes.billing_cycle || "monthly",
            paymentId: payment.id,
            orderId: subscription.id,
            subscriptionId: subscription.id,
          });

          console.log(
            `✅ Subscription charged: ${subscription.id} → ${planSlug}`
          );
        }
      }
      return NextResponse.json({ status: "processed" });
    }

    // ==========================================
    // SUBSCRIPTION CANCELLED
    // ==========================================
    if (
      eventType === "subscription.cancelled" ||
      eventType === "subscription.halted"
    ) {
      const subscription = event.payload?.subscription?.entity;
      if (subscription) {
        const notes = subscription.notes || {};
        const companyId = notes.company_id;

        if (companyId) {
          const freePlan = await queryOne(
            "SELECT id FROM billing_plans WHERE slug = 'free'"
          );
          if (freePlan) {
            await query(
              `UPDATE company_subscriptions
               SET plan_id = $2, status = 'CANCELLED',
                   razorpay_subscription_id = NULL, updated_at = NOW()
               WHERE company_id = $1`,
              [companyId, freePlan.id]
            );
          }
          console.log(
            `⚠️ Subscription ${eventType}: ${subscription.id} → reverted to free`
          );
        }
      }
      return NextResponse.json({ status: "processed" });
    }

    // ==========================================
    // REFUND
    // ==========================================
    if (eventType === "refund.created") {
      const refund = event.payload?.refund?.entity;
      if (refund?.payment_id) {
        await query(
          `UPDATE payment_orders SET status = 'REFUNDED', updated_at = NOW()
           WHERE provider_payment_id = $1`,
          [refund.payment_id]
        );
        console.log(`💰 Refund processed for payment: ${refund.payment_id}`);
      }
      return NextResponse.json({ status: "processed" });
    }

    return NextResponse.json({ status: "ignored", event: eventType });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}