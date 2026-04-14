export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, queryMany } from "@/lib/db";
import { getSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";

// ==========================================
// GET — Fetch F2F interviews
// ==========================================
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const applicationId = searchParams.get("applicationId");

    if (applicationId) {
      const interviews = await queryMany(
        `SELECT f.*,
          u.first_name as interviewer_first_name,
          u.last_name as interviewer_last_name,
          u.email as interviewer_email
         FROM f2f_interviews f
         LEFT JOIN users u ON f.interviewer_id = u.id
         WHERE f.application_id = $1
         ORDER BY f.scheduled_at ASC`,
        [applicationId]
      );

      const formatted = interviews.map((i: any) => {
        let metadata = i.metadata;
        try {
          if (typeof metadata === "string") metadata = JSON.parse(metadata);
        } catch {
          metadata = {};
        }
        return { ...i, metadata };
      });

      return NextResponse.json({ interviews: formatted });
    }

    return NextResponse.json({ interviews: [] });
  } catch (error: any) {
    console.error("F2F fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

// ==========================================
// HELPERS — Shared across POST and PUT
// ==========================================

async function fetchPerformanceData(applicationId: string): Promise<string> {
  try {
    const app = await queryOne(
      "SELECT resume_score FROM applications WHERE id = $1",
      [applicationId]
    );
    const resumeScore = parseFloat(app?.resume_score) || 0;

    const assessments = await queryMany(
      `SELECT total_score, max_score, percentage, time_taken, assessment_id
       FROM submissions
       WHERE application_id = $1 AND status = 'GRADED'
       ORDER BY created_at DESC`,
      [applicationId]
    );

    const aiInterviews = await queryMany(
      `SELECT type, overall_score, score_breakdown, analysis, strengths, weaknesses
       FROM ai_interviews
       WHERE application_id = $1 AND status = 'COMPLETED'
       ORDER BY created_at DESC`,
      [applicationId]
    );

    const rows: string[] = [];

    if (resumeScore > 0) {
      const color =
        resumeScore >= 70
          ? "#059669"
          : resumeScore >= 40
            ? "#D97706"
            : "#DC2626";
      rows.push(
        `<tr>
          <td style="padding:8px 12px;font-size:13px;color:#64748B;border-bottom:1px solid #F1F5F9;">📄 Resume Match</td>
          <td style="padding:8px 12px;font-size:13px;font-weight:700;color:${color};border-bottom:1px solid #F1F5F9;text-align:right;">${Math.round(resumeScore)}%</td>
        </tr>`
      );
    }

    for (const sub of assessments) {
      const pct = parseFloat(sub.percentage) || 0;
      const color =
        pct >= 70 ? "#059669" : pct >= 40 ? "#D97706" : "#DC2626";
      const timeStr = sub.time_taken
        ? ` (${Math.floor(sub.time_taken / 60)}m ${sub.time_taken % 60}s)`
        : "";
      rows.push(
        `<tr>
          <td style="padding:8px 12px;font-size:13px;color:#64748B;border-bottom:1px solid #F1F5F9;">💻 Assessment${timeStr}</td>
          <td style="padding:8px 12px;font-size:13px;font-weight:700;color:${color};border-bottom:1px solid #F1F5F9;text-align:right;">${Math.round(pct)}% (${sub.total_score}/${sub.max_score})</td>
        </tr>`
      );
    }

    for (const ai of aiInterviews) {
      const score = parseFloat(ai.overall_score) || 0;
      const color =
        score >= 70 ? "#059669" : score >= 40 ? "#D97706" : "#DC2626";

      let breakdown = ai.score_breakdown;
      try {
        if (typeof breakdown === "string")
          breakdown = JSON.parse(breakdown);
      } catch {
        breakdown = {};
      }

      let subScores = "";
      if (breakdown) {
        const parts: string[] = [];
        if (breakdown.technicalScore)
          parts.push(`Tech: ${breakdown.technicalScore}`);
        if (breakdown.communicationScore)
          parts.push(`Comm: ${breakdown.communicationScore}`);
        if (breakdown.problemSolvingScore)
          parts.push(`PS: ${breakdown.problemSolvingScore}`);
        if (parts.length > 0)
          subScores = ` <span style="font-weight:normal;color:#94A3B8;font-size:11px;">(${parts.join(" · ")})</span>`;
      }

      rows.push(
        `<tr>
          <td style="padding:8px 12px;font-size:13px;color:#64748B;border-bottom:1px solid #F1F5F9;">🤖 AI ${(ai.type || "Technical").charAt(0).toUpperCase() + (ai.type || "technical").slice(1)} Interview</td>
          <td style="padding:8px 12px;font-size:13px;font-weight:700;color:${color};border-bottom:1px solid #F1F5F9;text-align:right;">${Math.round(score)}/100${subScores}</td>
        </tr>`
      );

      let strengths = ai.strengths || [];
      let weaknesses = ai.weaknesses || [];
      try {
        if (typeof strengths === "string")
          strengths = JSON.parse(strengths);
        if (typeof weaknesses === "string")
          weaknesses = JSON.parse(weaknesses);
      } catch {}

      if (
        (Array.isArray(strengths) && strengths.length > 0) ||
        (Array.isArray(weaknesses) && weaknesses.length > 0)
      ) {
        let swHtml =
          '<tr><td colspan="2" style="padding:4px 12px 8px;border-bottom:1px solid #F1F5F9;">';
        if (Array.isArray(strengths) && strengths.length > 0) {
          swHtml += `<span style="font-size:11px;color:#059669;">💪 ${strengths.slice(0, 3).join(" · ")}</span>`;
        }
        if (Array.isArray(weaknesses) && weaknesses.length > 0) {
          swHtml += `<br/><span style="font-size:11px;color:#D97706;">📈 ${weaknesses.slice(0, 3).join(" · ")}</span>`;
        }
        swHtml += "</td></tr>";
        rows.push(swHtml);
      }

      if (ai.analysis) {
        rows.push(
          `<tr><td colspan="2" style="padding:4px 12px 8px;border-bottom:1px solid #F1F5F9;">
            <span style="font-size:11px;color:#64748B;">📝 ${String(ai.analysis).substring(0, 200)}${String(ai.analysis).length > 200 ? "..." : ""}</span>
          </td></tr>`
        );
      }
    }

    if (rows.length > 0) {
      return `
        <div style="margin-top:16px;padding:16px;background:#F0FDF4;border-radius:8px;border:1px solid #BBF7D0;">
          <h3 style="margin:0 0 10px;font-size:14px;color:#166534;">📊 Candidate Performance Summary</h3>
          <table style="width:100%;border-collapse:collapse;background:white;border-radius:6px;overflow:hidden;border:1px solid #E2E8F0;">
            <thead>
              <tr style="background:#F8FAFC;">
                <th style="padding:8px 12px;text-align:left;font-size:11px;color:#94A3B8;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #E2E8F0;">Stage</th>
                <th style="padding:8px 12px;text-align:right;font-size:11px;color:#94A3B8;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #E2E8F0;">Score</th>
              </tr>
            </thead>
            <tbody>${rows.join("")}</tbody>
          </table>
        </div>
      `;
    }

    return "";
  } catch (err) {
    console.error("Failed to fetch performance data:", err);
    return "";
  }
}

function makeAbsoluteUrl(url: string | null, appUrl: string): string | null {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  if (url.startsWith("/")) return `${appUrl}${url}`;
  return `${appUrl}/${url}`;
}

function buildResumeHighlights(resumeParsed: any): string {
  let highlights = "";
  let parsed = resumeParsed;
  try {
    if (typeof parsed === "string") parsed = JSON.parse(parsed);
  } catch {
    return "";
  }
  if (!parsed) return "";

  const skills = parsed.matchedSkills || parsed.skills || [];
  if (skills.length > 0) {
    highlights += `\n• Skills: ${skills.slice(0, 10).join(", ")}`;
  }
  if (parsed.experience) {
    highlights += `\n• Experience: ${parsed.experience}`;
  }
  if (parsed.education) {
    highlights += `\n• Education: ${parsed.education}`;
  }
  return highlights;
}

function buildInterviewEmailHtml(params: {
  recipientName: string;
  isCandidate: boolean;
  isExternal: boolean;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string | null;
  jobTitle: string;
  companyName: string;
  hrName: string;
  interviewType: string;
  dateStr: string;
  timeStr: string;
  endTimeStr: string;
  duration: number;
  interviewerNames: string;
  meetingLink: string | null;
  notes: string | null;
  absoluteResumeUrl: string | null;
  resumeText: string | null;
  resumeHighlights: string;
  performanceHtml: string;
  appUrl: string;
  applicationId: string;
  isReschedule?: boolean;
  changesSummary?: string;
}): string {
  const p = params;

  let resumeSection = "";
  if (!p.isCandidate) {
    resumeSection = `
      <div style="margin-top:16px;padding:16px;background:#F8FAFC;border-radius:8px;border:1px solid #E2E8F0;">
        <h3 style="margin:0 0 8px;font-size:14px;color:#334155;">📄 Candidate: ${p.candidateName}</h3>
        <p style="margin:2px 0;font-size:13px;color:#64748B;">✉️ ${p.candidateEmail}</p>
        ${p.candidatePhone ? `<p style="margin:2px 0;font-size:13px;color:#64748B;">📱 ${p.candidatePhone}</p>` : ""}
        ${
          p.resumeHighlights
            ? `<div style="margin-top:8px;padding:10px;background:white;border-radius:6px;border:1px solid #E2E8F0;">
                <p style="margin:0;font-size:12px;font-weight:600;color:#475569;">Key Highlights:</p>
                <pre style="margin:4px 0 0;font-size:12px;color:#64748B;white-space:pre-wrap;font-family:inherit;">${p.resumeHighlights}</pre>
              </div>`
            : ""
        }
        ${
          p.absoluteResumeUrl
            ? `<p style="margin-top:10px;">
                <a href="${p.absoluteResumeUrl}" style="display:inline-block;padding:8px 16px;background:#0245EF;color:white;text-decoration:none;border-radius:6px;font-size:12px;font-weight:600;">
                  📎 Download Resume
                </a>
              </p>`
            : ""
        }
        ${
          p.resumeText && !p.absoluteResumeUrl
            ? `<details style="margin-top:10px;">
                <summary style="cursor:pointer;color:#0245EF;font-size:13px;font-weight:600;">📄 View Resume Text</summary>
                <pre style="margin-top:8px;padding:12px;background:white;border-radius:6px;border:1px solid #E2E8F0;font-size:11px;color:#475569;white-space:pre-wrap;max-height:400px;overflow-y:auto;font-family:inherit;">${p.resumeText.substring(0, 3000)}${p.resumeText.length > 3000 ? "\n\n... (truncated)" : ""}</pre>
              </details>`
            : ""
        }
      </div>
      ${p.performanceHtml}
    `;
  }

  const headerBg = p.isReschedule
    ? "background:#FEF3C7;border-bottom:2px solid #F59E0B;"
    : "background:linear-gradient(135deg,#0245EF,#0237BF);";
  const headerColor = p.isReschedule ? "#92400E" : "white";
  const subColor = p.isReschedule
    ? "#B45309"
    : "rgba(255,255,255,0.8)";
  const title = p.isReschedule
    ? "📅 Interview Rescheduled"
    : p.isCandidate
      ? "📅 Interview Scheduled"
      : "📅 Interview Assignment";

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;color:#334155;">
      <div style="padding:24px;${headerBg}border-radius:12px 12px 0 0;">
        <h1 style="margin:0;font-size:20px;color:${headerColor};">${title}</h1>
        <p style="margin:4px 0 0;font-size:14px;color:${subColor};">${p.companyName}</p>
      </div>

      <div style="padding:24px;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 12px 12px;">
        <p style="margin:0 0 16px;font-size:15px;">Hi ${p.recipientName},</p>

        <p style="margin:0 0 20px;font-size:14px;color:#64748B;">
          ${
            p.isCandidate
              ? `Your <strong>${p.interviewType}</strong> interview for <strong>${p.jobTitle}</strong> has been ${p.isReschedule ? "rescheduled" : "scheduled"}.`
              : `You've been assigned to interview <strong>${p.candidateName}</strong> for the <strong>${p.jobTitle}</strong> position.`
          }
        </p>

        ${
          p.changesSummary
            ? `<div style="padding:10px;background:#FFFBEB;border-radius:8px;border:1px solid #FDE68A;margin-bottom:16px;">
                <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#92400E;">What changed:</p>
                <ul style="margin:0;padding-left:16px;font-size:12px;color:#92400E;">${p.changesSummary}</ul>
              </div>`
            : ""
        }

        <div style="padding:16px;background:#F8FAFC;border-radius:8px;border:1px solid #E2E8F0;margin-bottom:16px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:6px 0;font-size:13px;color:#94A3B8;width:100px;">📆 Date</td>
              <td style="padding:6px 0;font-size:13px;color:#334155;font-weight:600;">${p.dateStr}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:13px;color:#94A3B8;">🕐 Time</td>
              <td style="padding:6px 0;font-size:13px;color:#334155;font-weight:600;">${p.timeStr} — ${p.endTimeStr} (${p.duration} min)</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:13px;color:#94A3B8;">🎯 Type</td>
              <td style="padding:6px 0;font-size:13px;color:#334155;text-transform:capitalize;">${p.interviewType}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:13px;color:#94A3B8;">👥 Panel</td>
              <td style="padding:6px 0;font-size:13px;color:#334155;">${p.interviewerNames}</td>
            </tr>
            ${
              p.meetingLink
                ? `<tr>
                    <td style="padding:6px 0;font-size:13px;color:#94A3B8;">🔗 Meeting</td>
                    <td style="padding:6px 0;font-size:13px;"><a href="${p.meetingLink}" style="color:#0245EF;text-decoration:none;font-weight:600;">Join Meeting</a></td>
                  </tr>`
                : ""
            }
          </table>
        </div>

        ${
          p.meetingLink
            ? `<a href="${p.meetingLink}" style="display:inline-block;padding:12px 24px;background:#0245EF;color:white;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;margin-bottom:16px;">🔗 Join Meeting</a>`
            : ""
        }

        ${
          p.notes
            ? `<div style="margin:16px 0;padding:12px;background:#FFFBEB;border-radius:8px;border:1px solid #FDE68A;">
                <p style="margin:0;font-size:13px;color:#92400E;">📝 <strong>Notes:</strong> ${p.notes}</p>
              </div>`
            : ""
        }

        ${resumeSection}

        <hr style="border:none;border-top:1px solid #E2E8F0;margin:20px 0;" />

        <p style="margin:0;font-size:12px;color:#94A3B8;">
          ${
            p.isCandidate
              ? `Track your application at <a href="${p.appUrl}/applications" style="color:#0245EF;">your dashboard</a>.`
              : p.isExternal
                ? `Scheduled by ${p.hrName} at ${p.companyName}. <a href="${p.appUrl}" style="color:#0245EF;">Visit Hirasys</a>.`
                : `View full details on your <a href="${p.appUrl}/hr/candidates/${p.applicationId}" style="color:#0245EF;">HR dashboard</a>.`
          }
        </p>
      </div>
    </div>
  `;
}

async function sendInterviewEmails(params: {
  interviewers: any[];
  candidate: any;
  application: any;
  appResume: any;
  scheduledDate: Date;
  endDate: Date;
  duration: number;
  interviewType: string;
  meetingLink: string | null;
  notes: string | null;
  companyName: string;
  hrName: string;
  appUrl: string;
  applicationId: string;
  isReschedule?: boolean;
  changesSummary?: string;
}) {
  const p = params;
  const candidateName =
    `${p.candidate?.first_name || ""} ${p.candidate?.last_name || ""}`.trim() ||
    "Candidate";
  const candidateEmail = p.candidate?.email || "";

  const dateStr = p.scheduledDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const timeStr = p.scheduledDate.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  const endTimeStr = p.endDate.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  const interviewerNames = p.interviewers
    .map((i: any) => i.name)
    .join(", ");

  const absoluteResumeUrl = makeAbsoluteUrl(
    p.appResume?.resume_url || p.candidate?.resume_url,
    p.appUrl
  );
  const resumeText = p.appResume?.resume_text || p.candidate?.resume_text || null;
  const resumeHighlights = buildResumeHighlights(p.appResume?.resume_parsed);
  const performanceHtml = await fetchPerformanceData(p.applicationId);

  const emailParams = {
    candidateName,
    candidateEmail,
    candidatePhone: p.candidate?.phone || null,
    jobTitle: p.application?.job_title || "",
    companyName: p.companyName,
    hrName: p.hrName,
    interviewType: p.interviewType,
    dateStr,
    timeStr,
    endTimeStr,
    duration: p.duration,
    interviewerNames,
    meetingLink: p.meetingLink,
    notes: p.notes,
    absoluteResumeUrl,
    resumeText,
    resumeHighlights,
    performanceHtml,
    appUrl: p.appUrl,
    applicationId: p.applicationId,
    isReschedule: p.isReschedule,
    changesSummary: p.changesSummary,
  };

  const sendEmail = async (
    to: string,
    recipientName: string,
    isCandidate: boolean,
    isExternal: boolean
  ) => {
    try {
      const { Resend } = await import("resend");
      const resend = process.env.RESEND_API_KEY
        ? new Resend(process.env.RESEND_API_KEY)
        : null;
      if (!resend) {
        console.warn("No RESEND_API_KEY — skipping email to", to);
        return;
      }

      const actionWord = p.isReschedule ? "Rescheduled" : "Scheduled";
      const subject = isCandidate
        ? `Interview ${actionWord} — ${emailParams.jobTitle} at ${p.companyName}`
        : `Interview ${p.isReschedule ? "Update" : "Assignment"}: ${candidateName} — ${emailParams.jobTitle}`;

      const html = buildInterviewEmailHtml({
        ...emailParams,
        recipientName,
        isCandidate,
        isExternal,
      });

      await resend.emails.send({
        from:
          process.env.FROM_EMAIL || "Hirasys <noreply@hirasys.ai>",
        to,
        subject,
        html,
      });

      console.log(`✅ Interview email sent to ${to}`);
    } catch (err) {
      console.error(`❌ Email to ${to} failed:`, err);
    }
  };

  // 1. Email candidate
  if (candidateEmail) {
    await sendEmail(
      candidateEmail,
      p.candidate?.first_name || "there",
      true,
      false
    );
  }

  // 2. Email ALL interviewers
  for (const interviewer of p.interviewers) {
    let interviewerEmail = interviewer.email;
    let interviewerFirstName =
      interviewer.name?.split(" ")[0] || interviewer.name;
    let isSystemUser = false;

    if (interviewer.id) {
      const systemUser = await queryOne(
        "SELECT email, first_name FROM users WHERE id = $1",
        [interviewer.id]
      );
      if (systemUser) {
        interviewerEmail = systemUser.email;
        interviewerFirstName =
          systemUser.first_name || interviewerFirstName;
        isSystemUser = true;
      }
    }

    if (interviewerEmail) {
      await sendEmail(
        interviewerEmail,
        interviewerFirstName,
        false,
        !isSystemUser
      );
    } else {
      console.warn(
        `⚠️ No email for interviewer: ${interviewer.name}`
      );
    }
  }
}

// ==========================================
// POST — Schedule F2F interview
// ==========================================
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (
      !session ||
      !["HR", "ADMIN"].includes((session.user as any).role)
    ) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id;
    const body = await req.json();
    const {
      applicationId,
      scheduledAt,
      duration,
      meetingLink,
      interviewType,
      notes,
      interviewers,
    } = body;

    if (!applicationId || !scheduledAt) {
      return NextResponse.json(
        { error: "applicationId and scheduledAt required" },
        { status: 400 }
      );
    }

    if (!interviewers || interviewers.length === 0) {
      return NextResponse.json(
        { error: "At least one interviewer required" },
        { status: 400 }
      );
    }

    // Get application + job + HR info
    const application = await queryOne(
      `SELECT a.*, j.title as job_title, j.department,
              u.company, u.first_name as hr_first_name, u.last_name as hr_last_name, u.email as hr_email
       FROM applications a
       JOIN jobs j ON a.job_id = j.id
       LEFT JOIN users u ON j.posted_by = u.id
       WHERE a.id = $1`,
      [applicationId]
    );

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    // Get candidate
    const candidate = await queryOne(
      "SELECT id, email, first_name, last_name, resume_url, resume_text, phone FROM users WHERE id = $1",
      [application.candidate_id]
    );

    // Get application resume
    const appResume = await queryOne(
      "SELECT resume_url, resume_text, resume_parsed FROM applications WHERE id = $1",
      [applicationId]
    );

    const candidateName =
      `${candidate?.first_name || ""} ${candidate?.last_name || ""}`.trim() ||
      "Candidate";

    // Create interview
    const primaryInterviewer = interviewers[0];
    const interviewerId = primaryInterviewer.id || userId;

    const interview = await queryOne(
      `INSERT INTO f2f_interviews (
        application_id, candidate_id, interviewer_id,
        scheduled_at, duration, meeting_link, interview_type, notes, status, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING', $9)
      RETURNING *`,
      [
        applicationId,
        application.candidate_id,
        interviewerId,
        new Date(scheduledAt),
        duration || 60,
        meetingLink || null,
        interviewType || "technical",
        notes || null,
        JSON.stringify({
          interviewers,
          scheduledBy: userId,
          panelSize: interviewers.length,
        }),
      ]
    );

    if (!interview) {
      return NextResponse.json(
        { error: "Failed to create interview" },
        { status: 500 }
      );
    }

    // Update application status
    await query(
      "UPDATE applications SET status = 'F2F_INTERVIEW', updated_at = NOW() WHERE id = $1",
      [applicationId]
    );

    const scheduledDate = new Date(scheduledAt);
    const endDate = new Date(
      scheduledDate.getTime() + (duration || 60) * 60 * 1000
    );
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const companyName =
      application.company ||
      (session.user as any).company ||
      "the hiring team";
    const hrName =
      `${application.hr_first_name || ""} ${application.hr_last_name || ""}`.trim() ||
      "HR Team";

    // Send emails to all participants
    await sendInterviewEmails({
      interviewers,
      candidate,
      application,
      appResume,
      scheduledDate,
      endDate,
      duration: duration || 60,
      interviewType: interviewType || "technical",
      meetingLink: meetingLink || null,
      notes: notes || null,
      companyName,
      hrName,
      appUrl,
      applicationId,
    });

    // In-app notifications
    const interviewerNames = interviewers
      .map((i: any) => i.name)
      .join(", ");

    await query(
      `INSERT INTO notifications (user_id, type, title, message, link)
       VALUES ($1, 'INTERVIEW_SCHEDULED', '📅 Interview Scheduled', $2, '/applications')`,
      [
        application.candidate_id,
        `Your ${interviewType || "technical"} interview for ${application.job_title} is scheduled for ${scheduledDate.toLocaleDateString()} at ${scheduledDate.toLocaleTimeString()}. Interviewer${interviewers.length > 1 ? "s" : ""}: ${interviewerNames}.`,
      ]
    );

    for (const interviewer of interviewers) {
      if (interviewer.id) {
        await query(
          `INSERT INTO notifications (user_id, type, title, message, link)
           VALUES ($1, 'INTERVIEW_SCHEDULED', '📅 Interview Assigned', $2, '/hr/dashboard')`,
          [
            interviewer.id,
            `You've been assigned to interview ${candidateName} for ${application.job_title} on ${scheduledDate.toLocaleDateString()}.`,
          ]
        );
      }
    }

    // Audit
    await logAudit({
      userId,
      action: "F2F_SCHEDULED",
      resourceType: "f2f_interview",
      resourceId: interview.id,
      resourceName: `${candidateName} — ${application.job_title}`,
      details: {
        applicationId,
        candidateName,
        candidateEmail: candidate?.email,
        jobTitle: application.job_title,
        scheduledAt,
        duration: duration || 60,
        interviewType: interviewType || "technical",
        interviewers: interviewers.map((i: any) => ({
          name: i.name,
          email: i.email || "system user",
          role: i.role,
        })),
        meetingLink: meetingLink ? "provided" : "none",
      },
      req,
    });

    return NextResponse.json(
      { success: true, interview },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("F2F scheduling error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// ==========================================
// PUT — Edit, Cancel, or Submit Feedback
// ==========================================
export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id;
    const body = await req.json();
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // ==========================================
    // EDIT / RESCHEDULE
    // ==========================================
    if (body.action === "edit") {
      const {
        interviewId,
        scheduledAt,
        duration,
        meetingLink,
        interviewType,
        notes,
        interviewers,
      } = body;

      if (!interviewId) {
        return NextResponse.json(
          { error: "interviewId required" },
          { status: 400 }
        );
      }

      const existing = await queryOne(
        "SELECT * FROM f2f_interviews WHERE id = $1",
        [interviewId]
      );

      if (!existing) {
        return NextResponse.json(
          { error: "Interview not found" },
          { status: 404 }
        );
      }

      // Build update
      const updates: string[] = [];
      const values: any[] = [];
      let idx = 2;

      if (scheduledAt) {
        updates.push(`scheduled_at = $${idx}`);
        values.push(new Date(scheduledAt));
        idx++;
      }
      if (duration) {
        updates.push(`duration = $${idx}`);
        values.push(duration);
        idx++;
      }
      if (meetingLink !== undefined) {
        updates.push(`meeting_link = $${idx}`);
        values.push(meetingLink || null);
        idx++;
      }
      if (interviewType) {
        updates.push(`interview_type = $${idx}`);
        values.push(interviewType);
        idx++;
      }
      if (notes !== undefined) {
        updates.push(`notes = $${idx}`);
        values.push(notes || null);
        idx++;
      }
      if (interviewers) {
        const primary = interviewers[0];
        if (primary?.id) {
          updates.push(`interviewer_id = $${idx}`);
          values.push(primary.id);
          idx++;
        }
        updates.push(`metadata = $${idx}`);
        values.push(
          JSON.stringify({
            interviewers,
            scheduledBy: userId,
            panelSize: interviewers.length,
            lastEditedAt: new Date().toISOString(),
            lastEditedBy: userId,
          })
        );
        idx++;
      }

      updates.push("updated_at = NOW()");

      if (updates.length === 1) {
        return NextResponse.json(
          { error: "Nothing to update" },
          { status: 400 }
        );
      }

      const interview = await queryOne(
        `UPDATE f2f_interviews SET ${updates.join(", ")} WHERE id = $1 RETURNING *`,
        [interviewId, ...values]
      );

      if (!interview) {
        return NextResponse.json(
          { error: "Failed to update" },
          { status: 500 }
        );
      }

      // Get context
      const application = await queryOne(
        `SELECT a.candidate_id, j.title as job_title, j.department,
                u.company, u.email as hr_email, u.first_name as hr_first_name, u.last_name as hr_last_name
         FROM applications a
         JOIN jobs j ON a.job_id = j.id
         LEFT JOIN users u ON j.posted_by = u.id
         WHERE a.id = $1`,
        [existing.application_id]
      );

      const candidate = await queryOne(
        "SELECT email, first_name, last_name, phone, resume_url, resume_text FROM users WHERE id = $1",
        [application?.candidate_id]
      );

      const appResume = await queryOne(
        "SELECT resume_url, resume_text, resume_parsed FROM applications WHERE id = $1",
        [existing.application_id]
      );

      const candidateName =
        `${candidate?.first_name || ""} ${candidate?.last_name || ""}`.trim() ||
        "Candidate";
      const companyName =
        application?.company ||
        (session.user as any).company ||
        "the team";
      const hrName =
        `${application?.hr_first_name || ""} ${application?.hr_last_name || ""}`.trim() ||
        "HR Team";

      const newScheduledDate = scheduledAt
        ? new Date(scheduledAt)
        : new Date(existing.scheduled_at);
      const newDuration = duration || existing.duration || 60;
      const newEndDate = new Date(
        newScheduledDate.getTime() + newDuration * 60 * 1000
      );
      const newMeetingLink =
        meetingLink !== undefined ? meetingLink : existing.meeting_link;
      const newInterviewType =
        interviewType || existing.interview_type || "technical";
      const newNotes =
        notes !== undefined ? notes : existing.notes;
      const interviewerList = interviewers || [];

      // Detect changes for email
      const oldDate = new Date(existing.scheduled_at);
      const dateChanged =
        scheduledAt && oldDate.getTime() !== newScheduledDate.getTime();
      const isReschedule = !!dateChanged;

      let changesSummary = "";
      if (dateChanged) {
        changesSummary += `<li>📅 <strong>New date:</strong> ${newScheduledDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} at ${newScheduledDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}</li>`;
        changesSummary += `<li style="color:#94A3B8;text-decoration:line-through;">Was: ${oldDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} at ${oldDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}</li>`;
      }
      if (duration && existing.duration !== duration) {
        changesSummary += `<li>⏱ <strong>Duration:</strong> ${newDuration} min</li>`;
      }
      if (
        meetingLink !== undefined &&
        existing.meeting_link !== meetingLink
      ) {
        changesSummary += `<li>🔗 <strong>Meeting link:</strong> ${newMeetingLink ? "updated" : "removed"}</li>`;
      }

      // Send emails
      await sendInterviewEmails({
        interviewers: interviewerList,
        candidate,
        application,
        appResume,
        scheduledDate: newScheduledDate,
        endDate: newEndDate,
        duration: newDuration,
        interviewType: newInterviewType,
        meetingLink: newMeetingLink,
        notes: newNotes,
        companyName,
        hrName,
        appUrl,
        applicationId: existing.application_id,
        isReschedule,
        changesSummary: changesSummary || undefined,
      });

      // In-app notifications
      if (application?.candidate_id) {
        await query(
          `INSERT INTO notifications (user_id, type, title, message, link)
           VALUES ($1, 'INTERVIEW_SCHEDULED', $2, $3, '/applications')`,
          [
            application.candidate_id,
            `📅 Interview ${isReschedule ? "Rescheduled" : "Updated"}`,
            `Your interview for ${application.job_title} has been ${isReschedule ? "rescheduled to" : "updated —"} ${newScheduledDate.toLocaleDateString()} at ${newScheduledDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}.`,
          ]
        );
      }

      for (const interviewer of interviewerList) {
        if (interviewer.id) {
          await query(
            `INSERT INTO notifications (user_id, type, title, message, link)
             VALUES ($1, 'INTERVIEW_SCHEDULED', $2, $3, '/hr/dashboard')`,
            [
              interviewer.id,
              `📅 Interview ${isReschedule ? "Rescheduled" : "Updated"}`,
              `Interview with ${candidateName} for ${application?.job_title} has been ${isReschedule ? "rescheduled" : "updated"}.`,
            ]
          );
        }
      }

      // Audit
      await logAudit({
        userId,
        action: isReschedule ? "F2F_RESCHEDULED" : "F2F_UPDATED",
        resourceType: "f2f_interview",
        resourceId: interviewId,
        resourceName: `${candidateName} — ${application?.job_title || ""}`,
        details: {
          applicationId: existing.application_id,
          dateChanged,
          interviewerCount: interviewerList.length,
          emailsSent: true,
        },
        req,
      });

      return NextResponse.json({ success: true, interview });
    }

    // ==========================================
    // CANCEL
    // ==========================================
    if (body.action === "cancel") {
      const { interviewId } = body;

      if (!interviewId) {
        return NextResponse.json(
          { error: "interviewId required" },
          { status: 400 }
        );
      }

      const existing = await queryOne(
        "SELECT * FROM f2f_interviews WHERE id = $1",
        [interviewId]
      );

      if (!existing) {
        return NextResponse.json(
          { error: "Interview not found" },
          { status: 404 }
        );
      }

      if (existing.status === "CANCELLED") {
        return NextResponse.json(
          { error: "Already cancelled" },
          { status: 400 }
        );
      }

      const interview = await queryOne(
        "UPDATE f2f_interviews SET status = 'CANCELLED', updated_at = NOW() WHERE id = $1 RETURNING *",
        [interviewId]
      );
            // ==========================================
      // REVERT APPLICATION STATUS
      // Check if there are any other non-cancelled interviews
      // If not, move application back to the previous stage
      // ==========================================
      const otherActiveInterviews = await queryOne(
        `SELECT id FROM f2f_interviews
         WHERE application_id = $1 AND id != $2 AND status NOT IN ('CANCELLED')
         LIMIT 1`,
        [interview.application_id, interviewId]
      );

      if (!otherActiveInterviews) {
        // No other active interviews — figure out what stage to revert to
        // Check what the candidate has completed
        const hasCompletedAIInterview = await queryOne(
          `SELECT id FROM ai_interviews
           WHERE application_id = $1 AND status = 'COMPLETED' LIMIT 1`,
          [interview.application_id]
        );

        const hasCompletedAssessment = await queryOne(
          `SELECT id FROM submissions
           WHERE application_id = $1 AND status = 'GRADED' LIMIT 1`,
          [interview.application_id]
        );

        let revertStatus = "SCREENING"; // default fallback

        if (hasCompletedAIInterview) {
          revertStatus = "UNDER_REVIEW";
        } else if (hasCompletedAssessment) {
          revertStatus = "AI_INTERVIEW";
        }

        await query(
          "UPDATE applications SET status = $2, updated_at = NOW() WHERE id = $1 AND status = 'F2F_INTERVIEW'",
          [interview.application_id, revertStatus]
        );

        console.log(
          `Application ${interview.application_id} reverted from F2F_INTERVIEW to ${revertStatus}`
        );
      }

      // Get context
      const application = await queryOne(
        `SELECT a.candidate_id, j.title as job_title, u.company
         FROM applications a
         JOIN jobs j ON a.job_id = j.id
         LEFT JOIN users u ON j.posted_by = u.id
         WHERE a.id = $1`,
        [interview.application_id]
      );

      const candidate = await queryOne(
        "SELECT email, first_name FROM users WHERE id = $1",
        [application?.candidate_id]
      );

      const candidateName =
        `${candidate?.first_name || ""}`.trim() || "Candidate";
      const companyName = application?.company || "the team";

      // Email candidate
      if (candidate?.email && application?.candidate_id) {
        try {
          const { Resend } = await import("resend");
          const resend = process.env.RESEND_API_KEY
            ? new Resend(process.env.RESEND_API_KEY)
            : null;
          if (resend) {
            await resend.emails.send({
              from:
                process.env.FROM_EMAIL ||
                "Hirasys <noreply@hirasys.ai>",
              to: candidate.email,
              subject: `Interview Cancelled — ${application.job_title}`,
              html: `
                <div style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;color:#334155;">
                  <div style="padding:20px;background:#FEF2F2;border-radius:12px 12px 0 0;border-bottom:2px solid #DC2626;">
                    <h1 style="margin:0;font-size:18px;color:#991B1B;">📅 Interview Cancelled</h1>
                    <p style="margin:4px 0 0;font-size:13px;color:#B91C1C;">${companyName}</p>
                  </div>
                  <div style="padding:20px;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 12px 12px;">
                    <p>Hi ${candidate.first_name || "there"},</p>
                    <p style="font-size:14px;color:#64748B;">Your interview for <strong>${application.job_title}</strong> scheduled on ${new Date(interview.scheduled_at).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} has been cancelled.</p>
                    <p style="font-size:14px;color:#64748B;">You'll be notified about next steps through your <a href="${appUrl}/applications" style="color:#0245EF;">application tracker</a>.</p>
                    <p style="font-size:12px;color:#94A3B8;">— The ${companyName} Team</p>
                  </div>
                </div>
              `,
            });
          }
        } catch (err) {
          console.error("Cancellation email failed:", err);
        }

        await query(
          `INSERT INTO notifications (user_id, type, title, message, link)
           VALUES ($1, 'APPLICATION_UPDATE', '📅 Interview Cancelled', $2, '/applications')`,
          [
            application.candidate_id,
            `Your interview for ${application.job_title} has been cancelled.`,
          ]
        );
      }

      // Email interviewers
      let metadata = existing.metadata || {};
      try {
        if (typeof metadata === "string")
          metadata = JSON.parse(metadata);
      } catch {
        metadata = {};
      }

      for (const interviewer of metadata.interviewers || []) {
        let email = interviewer.email;
        if (interviewer.id) {
          const u = await queryOne(
            "SELECT email, first_name FROM users WHERE id = $1",
            [interviewer.id]
          );
          if (u) email = u.email;

          await query(
            `INSERT INTO notifications (user_id, type, title, message, link)
             VALUES ($1, 'APPLICATION_UPDATE', '📅 Interview Cancelled', $2, '/hr/dashboard')`,
            [
              interviewer.id,
              `Interview with ${candidateName} for ${application?.job_title} has been cancelled.`,
            ]
          );
        }

        if (email) {
          try {
            const { Resend } = await import("resend");
            const resend = process.env.RESEND_API_KEY
              ? new Resend(process.env.RESEND_API_KEY)
              : null;
            if (resend) {
              await resend.emails.send({
                from:
                  process.env.FROM_EMAIL ||
                  "Hirasys <noreply@hirasys.ai>",
                to: email,
                subject: `Interview Cancelled: ${candidateName} — ${application?.job_title}`,
                html: `
                  <div style="font-family:-apple-system,sans-serif;max-width:500px;margin:0 auto;color:#334155;">
                    <p>Hi ${interviewer.name?.split(" ")[0] || "there"},</p>
                    <p>The interview with <strong>${candidateName}</strong> for <strong>${application?.job_title}</strong> scheduled on ${new Date(interview.scheduled_at).toLocaleDateString()} has been <strong style="color:#DC2626;">cancelled</strong>.</p>
                    <p style="color:#94A3B8;font-size:12px;">— ${companyName}</p>
                  </div>
                `,
              });
            }
          } catch (err) {
            console.error(
              `Cancellation email to ${email} failed:`,
              err
            );
          }
        }
      }

      // Audit
      await logAudit({
        userId,
        action: "F2F_CANCELLED",
        resourceType: "f2f_interview",
        resourceId: interviewId,
        resourceName: `${candidateName} — ${application?.job_title || ""}`,
        details: {
          applicationId: interview.application_id,
          originalScheduledAt: interview.scheduled_at,
        },
        req,
      });

      return NextResponse.json({ success: true, interview });
    }

    // ==========================================
    // SUBMIT FEEDBACK
    // ==========================================
    if (body.action === "feedback") {
      const {
        interviewId,
        technicalScore,
        communicationScore,
        problemSolvingScore,
        cultureFitScore,
        recommendation,
        strengths,
        concerns,
        notes: feedbackNotes,
      } = body;

      if (!interviewId) {
        return NextResponse.json(
          { error: "interviewId required" },
          { status: 400 }
        );
      }

      const existing = await queryOne(
        "SELECT * FROM f2f_interviews WHERE id = $1",
        [interviewId]
      );

      if (!existing) {
        return NextResponse.json(
          { error: "Interview not found" },
          { status: 404 }
        );
      }

      const overallScore = Math.round(
        ((technicalScore || 0) +
          (communicationScore || 0) +
          (problemSolvingScore || 0) +
          (cultureFitScore || 0)) /
          4
      );

      await query(
        "UPDATE f2f_interviews SET status = 'COMPLETED', updated_at = NOW() WHERE id = $1",
        [interviewId]
      );

      const feedback = await queryOne(
        `INSERT INTO interview_feedback (
          interview_id, interviewer_id,
          technical_score, communication_score, problem_solving_score, culture_fit_score,
          overall_score, recommendation, strengths, concerns, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          interviewId,
          userId,
          technicalScore || 0,
          communicationScore || 0,
          problemSolvingScore || 0,
          cultureFitScore || 0,
          overallScore,
          recommendation || "maybe",
          strengths || null,
          concerns || null,
          feedbackNotes || null,
        ]
      );

      // Get context for audit
      const application = await queryOne(
        `SELECT a.candidate_id, j.title as job_title
         FROM applications a JOIN jobs j ON a.job_id = j.id
         WHERE a.id = $1`,
        [existing.application_id]
      );

      const candidate = await queryOne(
        "SELECT first_name, last_name FROM users WHERE id = $1",
        [application?.candidate_id]
      );

      const candidateName =
        `${candidate?.first_name || ""} ${candidate?.last_name || ""}`.trim() ||
        "Candidate";

      // Trigger pipeline
      try {
        await fetch(`${appUrl}/api/pipeline/execute`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            applicationId: existing.application_id,
            trigger: "f2f_completed",
          }),
        });
      } catch (err) {
        console.error("Pipeline trigger failed:", err);
      }

      // Audit
      await logAudit({
        userId,
        action: "F2F_FEEDBACK_SUBMITTED",
        resourceType: "f2f_interview",
        resourceId: interviewId,
        resourceName: `${candidateName} — ${application?.job_title || ""}`,
        details: {
          overallScore,
          recommendation,
          technicalScore,
          communicationScore,
          problemSolvingScore,
          cultureFitScore,
        },
        req,
      });

      return NextResponse.json({ success: true, feedback });
    }

    return NextResponse.json(
      {
        error:
          "Invalid action. Use 'edit', 'cancel', or 'feedback'",
      },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("F2F update error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}