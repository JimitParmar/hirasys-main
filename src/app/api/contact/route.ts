import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

// Simple rate limiter
const rateLimit = new Map<string, { count: number; resetTime: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const maxRequests = 5;

  const entry = rateLimit.get(ip);

  if (!entry || now > entry.resetTime) {
    rateLimit.set(ip, { count: 1, resetTime: now + windowMs });
    return false;
  }

  if (entry.count >= maxRequests) return true;

  entry.count++;
  return false;
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function POST(req: NextRequest) {
  // Rate limit check
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Try again in 15 minutes." },
      { status: 429 }
    );
  }

  try {
    const { name, email, company, subject, message, type } = await req.json();

    // Validate
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email" },
        { status: 400 }
      );
    }

    const typeLabels: Record<string, string> = {
      general: "General Question",
      demo: "Demo Request",
      support: "Support / Bug Report",
      partnership: "Partnership / Integration",
    };

    const typeLabel = typeLabels[type] || "General";

    // ---- Email to you (support@hirasys.in) ----
    await transporter.sendMail({
      from: `"Hirasys Contact Form" <${process.env.GMAIL_USER}>`,
      to: "support@hirasys.in",
      replyTo: email,
      subject: `[${typeLabel}] ${subject}`,
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 600px;">
          
          <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 16px;">
            <h2 style="margin: 0 0 16px; color: #0f172a; font-size: 16px;">
              New message from ${name}
            </h2>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 6px 0; color: #64748b; width: 90px;">Type</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${typeLabel}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Name</td>
                <td style="padding: 6px 0; color: #0f172a;">${name}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Email</td>
                <td style="padding: 6px 0;">
                  <a href="mailto:${email}" style="color: #0245EF;">${email}</a>
                </td>
              </tr>
              ${company ? `
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Company</td>
                <td style="padding: 6px 0; color: #0f172a;">${company}</td>
              </tr>` : ""}
            </table>
          </div>

          <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;">
            <p style="margin: 0 0 8px; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">
              Message
            </p>
            <p style="margin: 0; color: #0f172a; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${message}</p>
          </div>

          <p style="color: #94a3b8; font-size: 11px; margin-top: 12px;">
            Hit reply to respond directly to ${name}
          </p>
        </div>
      `,
    });

    // ---- Confirmation email to the person ----
    await transporter.sendMail({
      from: `"Hirasys" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: `Got your message — ${subject}`,
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 500px;">
          <p style="color: #0f172a; font-size: 15px; line-height: 1.6;">
            Hey ${name},
          </p>
          
          <p style="color: #475569; font-size: 14px; line-height: 1.6;">
            We received your message and will get back to you within 24 hours.
          </p>

          <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0 0 4px; color: #94a3b8; font-size: 12px;">Your message:</p>
            <p style="margin: 0; color: #334155; font-size: 14px; white-space: pre-wrap;">${message}</p>
          </div>

          <p style="color: #475569; font-size: 14px; line-height: 1.6;">
            Feel free to reply to this email if you want to add anything.
          </p>

          <p style="color: #475569; font-size: 14px; margin-top: 24px;">
            — Team Hirasys
          </p>

          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #cbd5e1; font-size: 11px;">
            Hirasys · Hiring, intelligently assisted
          </p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json(
      { error: "Failed to send" },
      { status: 500 }
    );
  }
}