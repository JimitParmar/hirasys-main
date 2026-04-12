import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.FROM_EMAIL || "Hirasys <noreply@hirasys.ai>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const APP_NAME = "Hirasys";

// Brand colors
const BRAND = {
  primary: "#0245EF",
  primaryDark: "#0237BF",
  primaryLight: "#EBF0FF",
  text: "#1E293B",
  textLight: "#64748B",
  bg: "#F8FAFC",
  white: "#FFFFFF",
  green: "#10B981",
  red: "#EF4444",
  amber: "#F59E0B",
};

// ==========================================
// BASE TEMPLATE
// ==========================================
function baseTemplate(content: string, preheader?: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${preheader ? `<span style="display:none;font-size:1px;color:#fff;max-height:0px;overflow:hidden;">${preheader}</span>` : ""}
</head>
<body style="margin:0;padding:0;background-color:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.bg};padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <!-- Header -->
        <tr><td style="padding:0 24px 24px;">
          <table width="100%"><tr>
            <td style="font-size:24px;font-weight:bold;color:${BRAND.primary};">
              ${APP_NAME}
            </td>
            <td align="right" style="font-size:12px;color:${BRAND.textLight};">
              Hiring, Intelligently Assisted
            </td>
          </tr></table>
        </td></tr>
        <!-- Content -->
        <tr><td>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.white};border-radius:12px;border:1px solid #E2E8F0;overflow:hidden;">
            <tr><td style="padding:32px 24px;">
              ${content}
            </td></tr>
          </table>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:24px;text-align:center;">
          <p style="margin:0;font-size:12px;color:${BRAND.textLight};">
            ${APP_NAME} — Where rejection comes with a roadmap
          </p>
          <p style="margin:8px 0 0;font-size:11px;color:#94A3B8;">
            <a href="${APP_URL}" style="color:${BRAND.primary};text-decoration:none;">${APP_URL}</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ==========================================
// BUTTON COMPONENT
// ==========================================
function button(text: string, url: string, color: string = BRAND.primary): string {
  return `<table cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td>
    <a href="${url}" style="display:inline-block;padding:14px 32px;background-color:${color};color:${BRAND.white};text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">${text}</a>
  </td></tr></table>`;
}

// ==========================================
// SEND EMAIL
// ==========================================
async function send(to: string, subject: string, html: string): Promise<boolean> {
  if (!resend) {
    console.log(`[Email] Would send to ${to}: ${subject}`);
    console.log(`[Email] No RESEND_API_KEY — skipping`);
    return false;
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });
    console.log(`[Email] Sent to ${to}: ${subject}`);
    return true;
  } catch (err: any) {
    console.error(`[Email] Failed to ${to}:`, err.message);
    return false;
  }
}

// ==========================================
// EMAIL TEMPLATES
// ==========================================

export async function sendTeamInvite(params: {
  to: string;
  inviterName: string;
  companyName: string;
  role: string;
  inviteUrl: string;
}) {
  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:20px;color:${BRAND.text};">You're Invited! 🎉</h2>
    <p style="margin:0 0 16px;color:${BRAND.textLight};font-size:14px;">
      <strong>${params.inviterName}</strong> has invited you to join
      <strong>${params.companyName}</strong> on ${APP_NAME} as <strong>${params.role}</strong>.
    </p>
    <div style="background:${BRAND.primaryLight};border-radius:8px;padding:16px;margin:16px 0;">
      <p style="margin:0;font-size:13px;color:${BRAND.primary};">
        <strong>What is ${APP_NAME}?</strong><br>
        An AI-powered hiring platform with visual pipeline builder, integrated coding IDE, and AI interviews.
      </p>
    </div>
    ${button("Accept Invitation →", params.inviteUrl)}
    <p style="margin:0;font-size:12px;color:#94A3B8;">
      This invitation expires in 7 days.<br>
      Link: <a href="${params.inviteUrl}" style="color:${BRAND.primary};word-break:break-all;">${params.inviteUrl}</a>
    </p>
  `, `${params.inviterName} invited you to ${params.companyName} on ${APP_NAME}`);

  return send(params.to, `You're invited to join ${params.companyName} on ${APP_NAME}`, html);
}

export async function sendInterviewScheduled(params: {
  to: string;
  candidateName: string;
  jobTitle: string;
  companyName: string;
  date: string;
  time: string;
  duration: number;
  interviewType: string;
  meetingLink?: string;
  interviewers: string[];
  notes?: string;
}) {
  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:20px;color:${BRAND.text};">Interview Scheduled 📅</h2>
    <p style="margin:0 0 16px;color:${BRAND.textLight};font-size:14px;">
      Hi ${params.candidateName}, your interview for <strong>${params.jobTitle}</strong>
      at <strong>${params.companyName}</strong> has been scheduled.
    </p>
    <table width="100%" style="background:${BRAND.bg};border-radius:8px;padding:16px;margin:16px 0;border:1px solid #E2E8F0;">
      <tr><td style="padding:8px 16px;">
        <p style="margin:0 0 8px;font-size:14px;"><strong>📅 Date:</strong> ${params.date}</p>
        <p style="margin:0 0 8px;font-size:14px;"><strong>🕐 Time:</strong> ${params.time}</p>
        <p style="margin:0 0 8px;font-size:14px;"><strong>⏱ Duration:</strong> ${params.duration} minutes</p>
        <p style="margin:0 0 8px;font-size:14px;"><strong>📋 Type:</strong> ${params.interviewType}</p>
        ${params.interviewers.length > 0 ? `<p style="margin:0 0 8px;font-size:14px;"><strong>👥 Panel:</strong> ${params.interviewers.join(", ")}</p>` : ""}
        ${params.notes ? `<p style="margin:0;font-size:13px;color:${BRAND.textLight};">📝 ${params.notes}</p>` : ""}
      </td></tr>
    </table>
    ${params.meetingLink ? button("Join Meeting →", params.meetingLink, BRAND.green) : ""}
    ${button("View in Dashboard →", `${APP_URL}/applications`)}
  `, `Interview scheduled for ${params.jobTitle}`);

  return send(params.to, `📅 Interview Scheduled — ${params.jobTitle} at ${params.companyName}`, html);
}

export async function sendStageAdvanced(params: {
  to: string;
  candidateName: string;
  jobTitle: string;
  companyName: string;
  stageName: string;
  stageDescription: string;
  actionUrl?: string;
  actionLabel?: string;
}) {
  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:20px;color:${BRAND.text};">Great News! 🚀</h2>
    <p style="margin:0 0 16px;color:${BRAND.textLight};font-size:14px;">
      Hi ${params.candidateName}, your application for <strong>${params.jobTitle}</strong>
      at <strong>${params.companyName}</strong> has moved forward!
    </p>
    <div style="background:${BRAND.primaryLight};border-radius:8px;padding:16px;margin:16px 0;">
      <p style="margin:0 0 4px;font-size:16px;font-weight:600;color:${BRAND.primary};">
        Next Step: ${params.stageName}
      </p>
      <p style="margin:0;font-size:13px;color:${BRAND.textLight};">
        ${params.stageDescription}
      </p>
    </div>
    ${button(params.actionLabel || "View Application →", params.actionUrl || `${APP_URL}/applications`)}
  `, `Your application for ${params.jobTitle} has advanced!`);

  return send(params.to, `🚀 You've advanced — ${params.stageName} for ${params.jobTitle}`, html);
}

export async function sendRejectionWithFeedback(params: {
  to: string;
  candidateName: string;
  jobTitle: string;
  companyName: string;
  feedbackUrl: string;
}) {
  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:20px;color:${BRAND.text};">Application Update</h2>
    <p style="margin:0 0 16px;color:${BRAND.textLight};font-size:14px;">
      Hi ${params.candidateName}, thank you for your interest in <strong>${params.jobTitle}</strong>
      at <strong>${params.companyName}</strong>.
    </p>
    <p style="margin:0 0 16px;color:${BRAND.textLight};font-size:14px;">
      After careful review, we've decided to move forward with other candidates. However, we believe in helping you grow.
    </p>
    <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#166534;">
        💡 We've prepared personalized feedback for you
      </p>
      <p style="margin:0;font-size:13px;color:#15803D;">
        See your strengths, areas to improve, and recommended resources.
      </p>
    </div>
    ${button("View Your Feedback →", params.feedbackUrl, BRAND.green)}
    <p style="margin:16px 0 0;font-size:13px;color:${BRAND.textLight};">
      Keep growing — the right opportunity is out there for you! 💪
    </p>
  `, `Feedback available for your ${params.jobTitle} application`);

  return send(params.to, `Your application update + personalized feedback — ${params.jobTitle}`, html);
}

export async function sendOfferExtended(params: {
  to: string;
  candidateName: string;
  jobTitle: string;
  companyName: string;
}) {
  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:24px;color:${BRAND.text};">Congratulations! 🎉🎉🎉</h2>
    <p style="margin:0 0 16px;color:${BRAND.textLight};font-size:14px;">
      Hi ${params.candidateName}, we're thrilled to inform you that you've received an offer for
      <strong>${params.jobTitle}</strong> at <strong>${params.companyName}</strong>!
    </p>
    <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:24px;margin:16px 0;text-align:center;">
      <p style="margin:0;font-size:48px;">🎉</p>
      <p style="margin:8px 0 0;font-size:18px;font-weight:700;color:#166534;">
        You got the job!
      </p>
    </div>
    ${button("View Details →", `${APP_URL}/applications`, BRAND.green)}
    <p style="margin:16px 0 0;font-size:13px;color:${BRAND.textLight};">
      Check your application dashboard for next steps.
    </p>
  `, `🎉 Offer from ${params.companyName}!`);

  return send(params.to, `🎉 Congratulations! Offer for ${params.jobTitle} at ${params.companyName}`, html);
}

export async function sendNewApplication(params: {
  to: string;
  hrName: string;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  resumeScore: number;
  jobUrl: string;
}) {
  const scoreColor = params.resumeScore >= 70 ? BRAND.green : params.resumeScore >= 40 ? BRAND.amber : BRAND.red;

  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:20px;color:${BRAND.text};">New Application 📋</h2>
    <p style="margin:0 0 16px;color:${BRAND.textLight};font-size:14px;">
      Hi ${params.hrName}, a new candidate has applied for <strong>${params.jobTitle}</strong>.
    </p>
    <table width="100%" style="background:${BRAND.bg};border-radius:8px;border:1px solid #E2E8F0;margin:16px 0;">
      <tr><td style="padding:16px;">
        <p style="margin:0 0 8px;font-size:14px;"><strong>${params.candidateName}</strong></p>
        <p style="margin:0 0 8px;font-size:13px;color:${BRAND.textLight};">${params.candidateEmail}</p>
        <p style="margin:0;font-size:14px;">
          Resume Match: <strong style="color:${scoreColor};font-size:18px;">${Math.round(params.resumeScore)}%</strong>
        </p>
      </td></tr>
    </table>
    ${button("Review Application →", params.jobUrl)}
  `, `New application for ${params.jobTitle}`);

  return send(params.to, `📋 New Application — ${params.candidateName} for ${params.jobTitle}`, html);
}

export async function sendAssessmentReady(params: {
  to: string;
  candidateName: string;
  jobTitle: string;
  companyName: string;
  assessmentType: string;
  duration: number;
}) {
  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:20px;color:${BRAND.text};">Assessment Ready! 📝</h2>
    <p style="margin:0 0 16px;color:${BRAND.textLight};font-size:14px;">
      Hi ${params.candidateName}, your ${params.assessmentType} for <strong>${params.jobTitle}</strong>
      at <strong>${params.companyName}</strong> is ready.
    </p>
    <div style="background:${BRAND.primaryLight};border-radius:8px;padding:16px;margin:16px 0;">
      <p style="margin:0 0 4px;font-size:14px;color:${BRAND.primary};"><strong>⏱ Duration:</strong> ${params.duration} minutes</p>
      <p style="margin:0;font-size:13px;color:${BRAND.textLight};">Make sure you have a stable internet connection and a quiet environment.</p>
    </div>
    ${button("Start Assessment →", `${APP_URL}/applications`)}
    <p style="margin:16px 0 0;font-size:12px;color:#94A3B8;">
      You can start anytime. The timer begins when you click start.
    </p>
  `, `Assessment ready for ${params.jobTitle}`);

  return send(params.to, `📝 Assessment Ready — ${params.jobTitle} at ${params.companyName}`, html);
}