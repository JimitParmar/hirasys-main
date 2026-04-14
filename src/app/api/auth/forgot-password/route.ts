export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { queryOne, query } from "@/lib/db";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const user = await queryOne(
      "SELECT id, email, first_name FROM users WHERE LOWER(email) = LOWER($1)",
      [email.trim()]
    );

    // Always return success (don't leak whether email exists)
    if (!user) {
      return NextResponse.json({
        success: true,
        message: "If an account exists, a reset link has been sent.",
      });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store reset token
    await query(
      `INSERT INTO password_resets (user_id, token, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id)
       DO UPDATE SET token = $2, expires_at = $3, created_at = NOW()`,
      [user.id, token, expiresAt]
    );

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;

    // Send email
    try {
      const { Resend } = await import("resend");
      const resend = process.env.RESEND_API_KEY
        ? new Resend(process.env.RESEND_API_KEY)
        : null;
      if (resend) {
        await resend.emails.send({
          from: process.env.FROM_EMAIL || "Hirasys <noreply@hirasys.ai>",
          to: user.email,
          subject: "Reset Your Password",
          html: `
            <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
              <h2 style="color: #0245EF;">Reset Your Password</h2>
              <p>Hi ${user.first_name || "there"},</p>
              <p>Click the button below to reset your password. This link expires in 1 hour.</p>
              <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #0245EF; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
                Reset Password
              </a>
              <p style="color: #94A3B8; font-size: 12px; margin-top: 20px;">
                If you didn't request this, ignore this email.
              </p>
            </div>
          `,
        });
      }
    } catch (err) {
      console.error("Reset email failed:", err);
    }

    return NextResponse.json({
      success: true,
      message: "If an account exists, a reset link has been sent.",
    });
  } catch (error: any) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}