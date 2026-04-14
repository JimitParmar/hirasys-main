export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

export async function GET() {
  const checks: Record<string, any> = {};

  checks.keyId = process.env.RAZORPAY_KEY_ID
    ? `${process.env.RAZORPAY_KEY_ID.substring(0, 15)}...`
    : "MISSING";
  checks.keySecret = process.env.RAZORPAY_KEY_SECRET
    ? "SET (hidden)"
    : "MISSING";
  checks.publicKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
    ? `${process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID.substring(0, 15)}...`
    : "MISSING";

  try {
    const Razorpay = (await import("razorpay")).default;
    const rz = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    // Create a tiny test order (₹1)
    const order = await rz.orders.create({
      amount: 100,
      currency: "INR",
      receipt: "test_" + Date.now(),
    });

    checks.connection = "OK";
    checks.testOrderId = order.id;
    checks.currency = "INR works";
  } catch (err: any) {
    checks.connection = "FAILED";
    checks.error = err.message || err.error?.description || JSON.stringify(err);
  }

  return NextResponse.json(checks);
}