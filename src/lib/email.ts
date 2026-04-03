import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  try {
    const data = await resend.emails.send({
      from: "Hirasys <notifications@hirasys.ai>",
      to,
      subject,
      html,
    });
    return { success: true, data };
  } catch (error) {
    console.error("Email send error:", error);
    return { success: false, error };
  }
}

export function buildFeedbackEmail(
  candidateName: string,
  jobTitle: string,
  company: string,
  strengths: string[],
  improvements: { area: string; tip: string }[],
  skillScores: { skill: string; score: number }[],
  recommendedJobs: { title: string; company: string; match: number; url: string }[]
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #4F46E5, #7C3AED); padding: 32px; color: white; border-radius: 12px 12px 0 0; }
        .content { padding: 32px; background: #fff; }
        .section { margin: 24px 0; }
        .strength { display: flex; align-items: center; padding: 8px 0; }
        .strength::before { content: "🟢"; margin-right: 8px; }
        .improvement { background: #F1F5F9; padding: 16px; border-radius: 8px; margin: 12px 0; }
        .improvement-area { font-weight: 600; color: #4F46E5; }
        .skill-bar { background: #E2E8F0; height: 8px; border-radius: 4px; margin: 4px 0; }
        .skill-fill { background: #4F46E5; height: 100%; border-radius: 4px; }
        .job-card { border: 1px solid #E2E8F0; padding: 16px; border-radius: 8px; margin: 8px 0; }
        .match-badge { background: #10B981; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; }
        .footer { padding: 24px; background: #F8FAFC; text-align: center; font-size: 14px; color: #94A3B8; border-radius: 0 0 12px 12px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1 style="margin:0;font-size:24px;">Your Application Update</h1>
        <p style="margin:8px 0 0;opacity:0.9;">${jobTitle} at ${company}</p>
      </div>
      <div class="content">
        <p>Hi ${candidateName},</p>
        <p>Thank you for your interest in the ${jobTitle} role at ${company}. After careful review, we've decided to move forward with other candidates at this time.</p>
        <p>We want to help you grow. Here's personalized guidance based on our evaluation:</p>

        <div class="section">
          <h3>💪 Your Strengths</h3>
          ${strengths.map((s) => `<div class="strength">${s}</div>`).join("")}
        </div>

        <div class="section">
          <h3>📈 Areas to Develop</h3>
          ${improvements
            .map(
              (i) => `
            <div class="improvement">
              <div class="improvement-area">🔵 ${i.area}</div>
              <div style="margin-top:8px;">${i.tip}</div>
            </div>
          `
            )
            .join("")}
        </div>

        <div class="section">
          <h3>📊 Your Skill Profile</h3>
          ${skillScores
            .map(
              (s) => `
            <div style="margin:12px 0;">
              <div style="display:flex;justify-content:space-between;">
                <span>${s.skill}</span>
                <span>${s.score}%</span>
              </div>
              <div class="skill-bar">
                <div class="skill-fill" style="width:${s.score}%"></div>
              </div>
            </div>
          `
            )
            .join("")}
        </div>

        ${
          recommendedJobs.length > 0
            ? `
          <div class="section">
            <h3>🎯 Recommended Jobs for You</h3>
            ${recommendedJobs
              .map(
                (j) => `
              <div class="job-card">
                <strong>${j.title}</strong> at ${j.company}
                <span class="match-badge">${j.match}% match</span>
                <div style="margin-top:8px;">
                  <a href="${j.url}" style="color:#4F46E5;">View & Apply →</a>
                </div>
              </div>
            `
              )
              .join("")}
          </div>
        `
            : ""
        }

        <p style="font-size:13px;color:#94A3B8;margin-top:24px;">
          ⚠️ This is general skill guidance based on the job requirements. It does not compare you to other specific candidates.
        </p>
      </div>
      <div class="footer">
        <p>Keep your Hirasys profile updated for more opportunities.</p>
        <p>Hirasys — Hiring, Intelligently Assisted</p>
      </div>
    </body>
    </html>
  `;
}