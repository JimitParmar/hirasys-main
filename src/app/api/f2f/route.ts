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

      // Parse metadata for each interview
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
// POST — Schedule F2F interview
// ==========================================
// ==========================================
// POST — Schedule F2F interview
// ==========================================
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["HR", "ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    // Get application + job info
    const application = await queryOne(
      `SELECT a.*, j.title as job_title, j.department, j.description as job_description,
              u.company, u.first_name as hr_first_name, u.last_name as hr_last_name, u.email as hr_email
       FROM applications a
       JOIN jobs j ON a.job_id = j.id
       LEFT JOIN users u ON j.posted_by = u.id
       WHERE a.id = $1`,
      [applicationId]
    );

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    // Get candidate info + resume
    const candidate = await queryOne(
      "SELECT id, email, first_name, last_name, resume_url, resume_text, phone FROM users WHERE id = $1",
      [application.candidate_id]
    );

    // Get candidate's resume from application (might have application-specific resume)
    const appResume = await queryOne(
      "SELECT resume_url, resume_text, resume_parsed FROM applications WHERE id = $1",
      [applicationId]
    );

    const candidateName =
      `${candidate?.first_name || ""} ${candidate?.last_name || ""}`.trim() ||
      "Candidate";
    const candidateEmail = candidate?.email || "";
    const resumeUrl = appResume?.resume_url || candidate?.resume_url || null;
    const resumeText = appResume?.resume_text || candidate?.resume_text || null;

    // Parse resume highlights for email
    let resumeHighlights = "";
    if (appResume?.resume_parsed) {
      let parsed = appResume.resume_parsed;
      try {
        if (typeof parsed === "string") parsed = JSON.parse(parsed);
      } catch {}

      if (parsed) {
        const skills = parsed.matchedSkills || parsed.skills || [];
        const experience = parsed.experience || parsed.yearsOfExperience || "";
        const education = parsed.education || "";

        if (skills.length > 0) {
          resumeHighlights += `\n• Skills: ${skills.slice(0, 10).join(", ")}`;
        }
        if (experience) {
          resumeHighlights += `\n• Experience: ${experience}`;
        }
        if (education) {
          resumeHighlights += `\n• Education: ${education}`;
        }
      }
    }

    // Use first interviewer as primary
    const primaryInterviewer = interviewers[0];
    const interviewerId = primaryInterviewer.id || userId;

    const interview = await queryOne(
      `INSERT INTO f2f_interviews (
        application_id, candidate_id, interviewer_id,
        scheduled_at, duration, meeting_link, interview_type, notes, status,
        metadata
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

    const interviewerNames = interviewers
      .map((i: any) => i.name)
      .join(", ");

    // ==========================================
    // BUILD RICH EMAIL CONTENT
    // ==========================================
    const buildInterviewEmailHtml = (params: {
      recipientName: string;
      isCandidate: boolean;
      isExternal: boolean;
    }) => {
      const { recipientName, isCandidate, isExternal } = params;

      // Calendar details
      const dateStr = scheduledDate.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
      const timeStr = scheduledDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      const endTimeStr = endDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      // Build resume section for interviewers
      let resumeSection = "";
      if (!isCandidate) {
        resumeSection = `
          <div style="margin-top: 20px; padding: 16px; background: #F8FAFC; border-radius: 8px; border: 1px solid #E2E8F0;">
            <h3 style="margin: 0 0 8px 0; font-size: 14px; color: #334155;">📄 Candidate Profile: ${candidateName}</h3>
            <p style="margin: 4px 0; font-size: 13px; color: #64748B;">Email: ${candidateEmail}</p>
            ${candidate?.phone ? `<p style="margin: 4px 0; font-size: 13px; color: #64748B;">Phone: ${candidate.phone}</p>` : ""}
            ${
              resumeHighlights
                ? `<div style="margin-top: 8px; padding: 10px; background: white; border-radius: 6px; border: 1px solid #E2E8F0;">
                     <p style="margin: 0; font-size: 12px; font-weight: 600; color: #475569;">Key Highlights:</p>
                     <pre style="margin: 4px 0 0 0; font-size: 12px; color: #64748B; white-space: pre-wrap; font-family: inherit;">${resumeHighlights}</pre>
                   </div>`
                : ""
            }
            ${
              resumeUrl
                ? `<p style="margin-top: 10px;"><a href="${resumeUrl}" style="color: #0245EF; text-decoration: none; font-size: 13px;">📎 Download Full Resume</a></p>`
                : ""
            }
            ${
              resumeText && !resumeUrl
                ? `<details style="margin-top: 10px;">
                     <summary style="cursor: pointer; color: #0245EF; font-size: 13px;">📄 View Resume Text</summary>
                     <pre style="margin-top: 8px; padding: 12px; background: white; border-radius: 6px; border: 1px solid #E2E8F0; font-size: 11px; color: #475569; white-space: pre-wrap; max-height: 400px; overflow-y: auto; font-family: inherit;">${resumeText.substring(0, 3000)}${resumeText.length > 3000 ? "\n\n... (truncated)" : ""}</pre>
                   </details>`
                : ""
            }
          </div>
        `;
      }

      // Job context for interviewers
      let jobSection = "";
      if (!isCandidate) {
        jobSection = `
          <div style="margin-top: 16px; padding: 12px; background: #EBF0FF; border-radius: 8px; border: 1px solid #A3BDFF;">
            <p style="margin: 0; font-size: 13px; color: #0245EF; font-weight: 600;">💼 Position: ${application.job_title}</p>
            ${application.department ? `<p style="margin: 4px 0 0; font-size: 12px; color: #4775FF;">Department: ${application.department}</p>` : ""}
          </div>
        `;
      }

      return `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; color: #334155;">
          <div style="padding: 24px; background: linear-gradient(135deg, #0245EF, #0237BF); border-radius: 12px 12px 0 0;">
            <h1 style="margin: 0; font-size: 20px; color: white;">📅 Interview ${isCandidate ? "Scheduled" : "Assignment"}</h1>
            <p style="margin: 4px 0 0; font-size: 14px; color: rgba(255,255,255,0.8);">${companyName}</p>
          </div>

          <div style="padding: 24px; border: 1px solid #E2E8F0; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="margin: 0 0 16px; font-size: 15px; color: #334155;">Hi ${recipientName},</p>

            <p style="margin: 0 0 20px; font-size: 14px; color: #64748B;">
              ${
                isCandidate
                  ? `Your <strong>${interviewType || "technical"}</strong> interview for <strong>${application.job_title}</strong> has been scheduled.`
                  : `You've been assigned to interview <strong>${candidateName}</strong> for the <strong>${application.job_title}</strong> position.`
              }
            </p>

            <!-- Calendar Card -->
            <div style="padding: 16px; background: #F8FAFC; border-radius: 8px; border: 1px solid #E2E8F0; margin-bottom: 16px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #94A3B8; width: 100px;">📆 Date</td>
                  <td style="padding: 6px 0; font-size: 13px; color: #334155; font-weight: 600;">${dateStr}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #94A3B8;">🕐 Time</td>
                  <td style="padding: 6px 0; font-size: 13px; color: #334155; font-weight: 600;">${timeStr} — ${endTimeStr} (${duration || 60} min)</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #94A3B8;">🎯 Type</td>
                  <td style="padding: 6px 0; font-size: 13px; color: #334155; text-transform: capitalize;">${interviewType || "Technical"}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #94A3B8;">👥 Panel</td>
                  <td style="padding: 6px 0; font-size: 13px; color: #334155;">${interviewerNames}</td>
                </tr>
                ${
                  meetingLink
                    ? `<tr>
                        <td style="padding: 6px 0; font-size: 13px; color: #94A3B8;">🔗 Meeting</td>
                        <td style="padding: 6px 0; font-size: 13px;"><a href="${meetingLink}" style="color: #0245EF; text-decoration: none; font-weight: 600;">Join Meeting</a></td>
                      </tr>`
                    : ""
                }
              </table>
            </div>

            ${
              meetingLink
                ? `<a href="${meetingLink}" style="display: inline-block; padding: 12px 24px; background: #0245EF; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; margin-bottom: 16px;">🔗 Join Meeting</a>`
                : ""
            }

            ${notes ? `<div style="margin: 16px 0; padding: 12px; background: #FFFBEB; border-radius: 8px; border: 1px solid #FDE68A;"><p style="margin: 0; font-size: 13px; color: #92400E;">📝 <strong>Notes:</strong> ${notes}</p></div>` : ""}

            ${jobSection}
            ${resumeSection}

            <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 20px 0;" />

            <p style="margin: 0; font-size: 12px; color: #94A3B8;">
              ${
                isCandidate
                  ? `Track your application at <a href="${appUrl}/applications" style="color: #0245EF;">your dashboard</a>.`
                  : isExternal
                    ? `This interview was scheduled by ${hrName} at ${companyName}.`
                    : `View candidate details on your <a href="${appUrl}/hr/dashboard" style="color: #0245EF;">HR dashboard</a>.`
              }
            </p>
          </div>
        </div>
      `;
    };

    // ==========================================
    // Generate ICS calendar attachment
    // ==========================================
    const generateICS = (params: {
      summary: string;
      description: string;
      location: string;
      startDate: Date;
      endDate: Date;
      organizerEmail: string;
      attendees: { email: string; name: string }[];
    }) => {
      const pad = (n: number) => String(n).padStart(2, "0");
      const formatDate = (d: Date) =>
        `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;

      const uid = `${interview.id}@hirasys.ai`;
      const now = formatDate(new Date());
      const start = formatDate(params.startDate);
      const end = formatDate(params.endDate);

      const attendeeLines = params.attendees
        .map(
          (a) =>
            `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;CN=${a.name};X-NUM-GUESTS=0:mailto:${a.email}`
        )
        .join("\r\n");

      // Escape special chars for ICS
      const escapeICS = (text: string) =>
        text
          .replace(/\\/g, "\\\\")
          .replace(/;/g, "\\;")
          .replace(/,/g, "\\,")
          .replace(/\n/g, "\\n");

      return [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Hirasys//Interview//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:REQUEST",
        "BEGIN:VEVENT",
        `UID:${uid}`,
        `DTSTAMP:${now}`,
        `DTSTART:${start}`,
        `DTEND:${end}`,
        `SUMMARY:${escapeICS(params.summary)}`,
        `DESCRIPTION:${escapeICS(params.description)}`,
        `LOCATION:${escapeICS(params.location)}`,
        `ORGANIZER;CN=${companyName}:mailto:${params.organizerEmail}`,
        attendeeLines,
        "STATUS:CONFIRMED",
        `SEQUENCE:0`,
        "BEGIN:VALARM",
        "TRIGGER:-PT15M",
        "ACTION:DISPLAY",
        "DESCRIPTION:Interview in 15 minutes",
        "END:VALARM",
        "END:VEVENT",
        "END:VCALENDAR",
      ].join("\r\n");
    };

    // Build attendee list for ICS
    const allAttendees = [
      { email: candidateEmail, name: candidateName },
      ...interviewers.map((i: any) => ({
        email: i.email || `${i.name.toLowerCase().replace(/\s+/g, ".")}@unknown.com`,
        name: i.name,
      })),
    ];

    const icsContent = generateICS({
      summary: `Interview: ${candidateName} — ${application.job_title}`,
      description: `${interviewType || "Technical"} interview for ${application.job_title} at ${companyName}.\n\nCandidate: ${candidateName} (${candidateEmail})\nInterviewers: ${interviewerNames}\n\n${notes || ""}${resumeHighlights ? `\n\nCandidate Highlights:${resumeHighlights}` : ""}${resumeUrl ? `\n\nResume: ${resumeUrl}` : ""}`,
      location: meetingLink || "To be confirmed",
      startDate: scheduledDate,
      endDate,
      organizerEmail:
        application.hr_email ||
        (session.user as any).email ||
        "noreply@hirasys.ai",
      attendees: allAttendees,
    });

    // ==========================================
    // SEND EMAILS TO ALL PARTICIPANTS
    // ==========================================
    const sendInterviewEmail = async (params: {
      to: string;
      recipientName: string;
      isCandidate: boolean;
      isExternal: boolean;
    }) => {
      try {
        const { Resend } = await import("resend");
        const resend = process.env.RESEND_API_KEY
          ? new Resend(process.env.RESEND_API_KEY)
          : null;

        if (!resend) {
          console.warn("No RESEND_API_KEY — skipping email to", params.to);
          return;
        }

        const subject = params.isCandidate
          ? `Interview Scheduled — ${application.job_title} at ${companyName}`
          : `Interview Assignment: ${candidateName} — ${application.job_title}`;

        await resend.emails.send({
          from:
            process.env.FROM_EMAIL || "Hirasys <noreply@hirasys.ai>",
          to: params.to,
          subject,
          html: buildInterviewEmailHtml({
            recipientName: params.recipientName,
            isCandidate: params.isCandidate,
            isExternal: params.isExternal,
          }),
          attachments: [
            {
              filename: "interview.ics",
              content: Buffer.from(icsContent).toString("base64"),
              contentType: "text/calendar; method=REQUEST",
            },
          ],
        });

        console.log(`✅ Interview email sent to ${params.to}`);
      } catch (err) {
        console.error(`❌ Email to ${params.to} failed:`, err);
      }
    };

    // 1. Email to candidate
    if (candidateEmail) {
      await sendInterviewEmail({
        to: candidateEmail,
        recipientName: candidate?.first_name || "there",
        isCandidate: true,
        isExternal: false,
      });
    }

    // 2. Email to EVERY interviewer (system users AND external)
    for (const interviewer of interviewers) {
      let interviewerEmail = interviewer.email;
      let interviewerFirstName = interviewer.name?.split(" ")[0] || interviewer.name;
      let isSystemUser = false;

      // If interviewer has an ID, they're a system user — fetch their email
      if (interviewer.id) {
        const systemUser = await queryOne(
          "SELECT email, first_name FROM users WHERE id = $1",
          [interviewer.id]
        );
        if (systemUser) {
          interviewerEmail = systemUser.email;
          interviewerFirstName = systemUser.first_name || interviewerFirstName;
          isSystemUser = true;
        }
      }

      if (interviewerEmail) {
        await sendInterviewEmail({
          to: interviewerEmail,
          recipientName: interviewerFirstName,
          isCandidate: false,
          isExternal: !isSystemUser,
        });
      } else {
        console.warn(
          `⚠️ No email for interviewer: ${interviewer.name} — skipping`
        );
      }

      // In-app notification for system users
      if (interviewer.id) {
        await query(
          `INSERT INTO notifications (user_id, type, title, message, link)
           VALUES ($1, 'INTERVIEW_SCHEDULED', '📅 Interview Assigned', $2, '/hr/dashboard')`,
          [
            interviewer.id,
            `You've been assigned to interview ${candidateName} for ${application.job_title} on ${scheduledDate.toLocaleDateString()} at ${scheduledDate.toLocaleTimeString()}.`,
          ]
        );
      }
    }

    // In-app notification for candidate
    await query(
      `INSERT INTO notifications (user_id, type, title, message, link)
       VALUES ($1, 'INTERVIEW_SCHEDULED', '📅 Interview Scheduled', $2, '/applications')`,
      [
        application.candidate_id,
        `Your ${interviewType || "technical"} interview for ${application.job_title} is scheduled for ${scheduledDate.toLocaleDateString()} at ${scheduledDate.toLocaleTimeString()}. Interviewer${interviewers.length > 1 ? "s" : ""}: ${interviewerNames}.`,
      ]
    );

    // ✅ AUDIT
    await logAudit({
      userId,
      action: "F2F_SCHEDULED",
      resourceType: "f2f_interview",
      resourceId: interview.id,
      resourceName: `${candidateName} — ${application.job_title}`,
      details: {
        applicationId,
        candidateName,
        candidateEmail,
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
        resumeAttached: !!(resumeUrl || resumeText),
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
// PUT — Edit interview, Cancel, or Submit feedback
// ==========================================
export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // ==========================================
    // EDIT INTERVIEW
    // ==========================================
    // ==========================================
// EDIT INTERVIEW — with email notifications
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

  // Build dynamic update
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
    const primaryInterviewer = interviewers[0];
    if (primaryInterviewer?.id) {
      updates.push(`interviewer_id = $${idx}`);
      values.push(primaryInterviewer.id);
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
      { error: "Failed to update interview" },
      { status: 500 }
    );
  }

  // Get application, candidate, and job info
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
    "SELECT email, first_name, last_name, phone, resume_url FROM users WHERE id = $1",
    [application?.candidate_id]
  );

  // Get resume info for interviewer emails
  const appResume = await queryOne(
    "SELECT resume_url, resume_text, resume_parsed FROM applications WHERE id = $1",
    [existing.application_id]
  );

  const candidateName =
    `${candidate?.first_name || ""} ${candidate?.last_name || ""}`.trim() ||
    "Candidate";
  const candidateEmail = candidate?.email || "";
  const companyName =
    application?.company || (session.user as any).company || "the team";
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
  const newMeetingLink = meetingLink !== undefined ? meetingLink : existing.meeting_link;
  const newInterviewType = interviewType || existing.interview_type || "technical";
  const newNotes = notes !== undefined ? notes : existing.notes;
  const interviewerList = interviewers || [];

  // Build resume highlights
  let resumeHighlights = "";
  const resumeUrl = appResume?.resume_url || candidate?.resume_url || null;
  if (appResume?.resume_parsed) {
    let parsed = appResume.resume_parsed;
    try {
      if (typeof parsed === "string") parsed = JSON.parse(parsed);
    } catch {}
    if (parsed) {
      const skills = parsed.matchedSkills || parsed.skills || [];
      if (skills.length > 0) {
        resumeHighlights += `\n• Skills: ${skills.slice(0, 10).join(", ")}`;
      }
      if (parsed.experience) resumeHighlights += `\n• Experience: ${parsed.experience}`;
    }
  }

  // Detect what changed for the email subject
  const oldDate = new Date(existing.scheduled_at);
  const dateChanged = scheduledAt && oldDate.getTime() !== newScheduledDate.getTime();
  const isReschedule = dateChanged;

  // ==========================================
  // SEND RESCHEDULE/UPDATE EMAILS
  // ==========================================
  const sendUpdateEmail = async (params: {
    to: string;
    recipientName: string;
    isCandidate: boolean;
  }) => {
    try {
      const { Resend } = await import("resend");
      const resend = process.env.RESEND_API_KEY
        ? new Resend(process.env.RESEND_API_KEY)
        : null;
      if (!resend) return;

      const dateStr = newScheduledDate.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
      const timeStr = newScheduledDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      const endTimeStr = newEndDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      const subject = isReschedule
        ? `Interview Rescheduled — ${application?.job_title} at ${companyName}`
        : `Interview Updated — ${application?.job_title} at ${companyName}`;

      // Build change summary
      let changesSummary = "";
      if (dateChanged) {
        changesSummary += `<li>📅 <strong>New date:</strong> ${dateStr} at ${timeStr}</li>`;
        changesSummary += `<li style="color: #94A3B8; text-decoration: line-through;">Was: ${oldDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} at ${oldDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}</li>`;
      }
      if (duration && existing.duration !== duration) {
        changesSummary += `<li>⏱ <strong>Duration:</strong> ${newDuration} min</li>`;
      }
      if (meetingLink !== undefined && existing.meeting_link !== meetingLink) {
        changesSummary += `<li>🔗 <strong>Meeting link:</strong> ${newMeetingLink ? "updated" : "removed"}</li>`;
      }

      // Resume section for interviewers
      let resumeSection = "";
      if (!params.isCandidate) {
        resumeSection = `
          <div style="margin-top: 16px; padding: 12px; background: #F8FAFC; border-radius: 8px; border: 1px solid #E2E8F0;">
            <h3 style="margin: 0 0 6px; font-size: 13px; color: #334155;">📄 Candidate: ${candidateName}</h3>
            <p style="margin: 2px 0; font-size: 12px; color: #64748B;">${candidateEmail}${candidate?.phone ? ` • ${candidate.phone}` : ""}</p>
            ${resumeHighlights ? `<pre style="margin: 6px 0 0; font-size: 11px; color: #64748B; white-space: pre-wrap; font-family: inherit;">${resumeHighlights}</pre>` : ""}
            ${resumeUrl ? `<p style="margin-top: 8px;"><a href="${resumeUrl}" style="color: #0245EF; font-size: 12px;">📎 Download Resume</a></p>` : ""}
          </div>
        `;
      }

      await resend.emails.send({
        from: process.env.FROM_EMAIL || "Hirasys <noreply@hirasys.ai>",
        to: params.to,
        subject,
        html: `
          <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; color: #334155;">
            <div style="padding: 20px; background: ${isReschedule ? "#FEF3C7" : "#EBF0FF"}; border-radius: 12px 12px 0 0; border-bottom: 2px solid ${isReschedule ? "#F59E0B" : "#0245EF"};">
              <h1 style="margin: 0; font-size: 18px; color: ${isReschedule ? "#92400E" : "#0245EF"};">
                ${isReschedule ? "📅 Interview Rescheduled" : "📝 Interview Updated"}
              </h1>
              <p style="margin: 4px 0 0; font-size: 13px; color: ${isReschedule ? "#B45309" : "#4775FF"};">${companyName}</p>
            </div>

            <div style="padding: 20px; border: 1px solid #E2E8F0; border-top: none; border-radius: 0 0 12px 12px;">
              <p style="margin: 0 0 12px; font-size: 14px;">Hi ${params.recipientName},</p>

              <p style="margin: 0 0 16px; font-size: 13px; color: #64748B;">
                ${params.isCandidate
                  ? `Your interview for <strong>${application?.job_title}</strong> has been ${isReschedule ? "rescheduled" : "updated"}.`
                  : `The interview with <strong>${candidateName}</strong> for <strong>${application?.job_title}</strong> has been ${isReschedule ? "rescheduled" : "updated"}.`
                }
              </p>

              ${changesSummary ? `<div style="padding: 10px; background: #FFFBEB; border-radius: 8px; border: 1px solid #FDE68A; margin-bottom: 16px;"><p style="margin: 0 0 6px; font-size: 12px; font-weight: 600; color: #92400E;">What changed:</p><ul style="margin: 0; padding-left: 16px; font-size: 12px; color: #92400E;">${changesSummary}</ul></div>` : ""}

              <div style="padding: 12px; background: #F8FAFC; border-radius: 8px; border: 1px solid #E2E8F0; margin-bottom: 16px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr><td style="padding: 4px 0; font-size: 12px; color: #94A3B8; width: 80px;">📆 Date</td><td style="padding: 4px 0; font-size: 12px; font-weight: 600; color: #334155;">${dateStr}</td></tr>
                  <tr><td style="padding: 4px 0; font-size: 12px; color: #94A3B8;">🕐 Time</td><td style="padding: 4px 0; font-size: 12px; font-weight: 600; color: #334155;">${timeStr} — ${endTimeStr} (${newDuration} min)</td></tr>
                  <tr><td style="padding: 4px 0; font-size: 12px; color: #94A3B8;">🎯 Type</td><td style="padding: 4px 0; font-size: 12px; color: #334155; text-transform: capitalize;">${newInterviewType}</td></tr>
                  <tr><td style="padding: 4px 0; font-size: 12px; color: #94A3B8;">👥 Panel</td><td style="padding: 4px 0; font-size: 12px; color: #334155;">${interviewerList.map((i: any) => i.name).join(", ") || "TBD"}</td></tr>
                  ${newMeetingLink ? `<tr><td style="padding: 4px 0; font-size: 12px; color: #94A3B8;">🔗 Link</td><td style="padding: 4px 0; font-size: 12px;"><a href="${newMeetingLink}" style="color: #0245EF;">Join Meeting</a></td></tr>` : ""}
                </table>
              </div>

              ${newMeetingLink ? `<a href="${newMeetingLink}" style="display: inline-block; padding: 10px 20px; background: #0245EF; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 13px; margin-bottom: 12px;">🔗 Join Meeting</a>` : ""}

              ${newNotes ? `<div style="margin: 12px 0; padding: 10px; background: #F0FFF4; border-radius: 8px; border: 1px solid #BBF7D0;"><p style="margin: 0; font-size: 12px; color: #166534;">📝 ${newNotes}</p></div>` : ""}

              ${resumeSection}

              <p style="margin-top: 16px; font-size: 11px; color: #94A3B8;">
                Updated by ${hrName} at ${companyName}.
              </p>
            </div>
          </div>
        `,
      });

      console.log(`✅ Reschedule email sent to ${params.to}`);
    } catch (err) {
      console.error(`❌ Reschedule email to ${params.to} failed:`, err);
    }
  };

  // ==========================================
  // SEND TO ALL PARTICIPANTS
  // ==========================================

  // 1. Candidate
  if (candidateEmail && application?.candidate_id) {
    await sendUpdateEmail({
      to: candidateEmail,
      recipientName: candidate?.first_name || "there",
      isCandidate: true,
    });

    // In-app notification
    await query(
      `INSERT INTO notifications (user_id, type, title, message, link)
       VALUES ($1, 'INTERVIEW_SCHEDULED', '📅 Interview ${isReschedule ? "Rescheduled" : "Updated"}', $2, '/applications')`,
      [
        application.candidate_id,
        `Your interview for ${application.job_title} has been ${isReschedule ? "rescheduled to" : "updated —"} ${newScheduledDate.toLocaleDateString()} at ${newScheduledDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}.`,
      ]
    );
  }

  // 2. All interviewers
  for (const interviewer of interviewerList) {
    let interviewerEmail = interviewer.email;
    let interviewerFirstName =
      interviewer.name?.split(" ")[0] || interviewer.name;

    // System user — fetch email
    if (interviewer.id) {
      const systemUser = await queryOne(
        "SELECT email, first_name FROM users WHERE id = $1",
        [interviewer.id]
      );
      if (systemUser) {
        interviewerEmail = systemUser.email;
        interviewerFirstName =
          systemUser.first_name || interviewerFirstName;
      }

      // In-app notification
      await query(
        `INSERT INTO notifications (user_id, type, title, message, link)
         VALUES ($1, 'INTERVIEW_SCHEDULED', '📅 Interview ${isReschedule ? "Rescheduled" : "Updated"}', $2, '/hr/dashboard')`,
        [
          interviewer.id,
          `Interview with ${candidateName} for ${application?.job_title} has been ${isReschedule ? "rescheduled" : "updated"}.`,
        ]
      );
    }

    if (interviewerEmail) {
      await sendUpdateEmail({
        to: interviewerEmail,
        recipientName: interviewerFirstName,
        isCandidate: false,
      });
    }
  }

  // Audit
  const changes: Record<string, any> = {};
  if (dateChanged) {
    changes.scheduledAt = {
      from: existing.scheduled_at,
      to: scheduledAt,
    };
  }
  if (duration && existing.duration !== duration) {
    changes.duration = { from: existing.duration, to: duration };
  }
  if (interviewType && existing.interview_type !== interviewType) {
    changes.interviewType = {
      from: existing.interview_type,
      to: interviewType,
    };
  }

  await logAudit({
    userId,
    action: isReschedule ? "F2F_RESCHEDULED" : "F2F_UPDATED",
    resourceType: "f2f_interview",
    resourceId: interviewId,
    resourceName: `${candidateName} — ${application?.job_title || ""}`,
    details: {
      ...(Object.keys(changes).length > 0 ? changes : {}),
      interviewerCount: interviewerList.length,
      emailsSent: true,
    },
    req,
  });

  return NextResponse.json({ success: true, interview });
}

    // ==========================================
    // CANCEL INTERVIEW
    // ==========================================
    if (body.action === "cancel") {
      const { interviewId } = body;

      if (!interviewId) {
        return NextResponse.json(
          { error: "interviewId required" },
          { status: 400 }
        );
      }

      // Fetch before updating so we have the old data
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
          { error: "Interview is already cancelled" },
          { status: 400 }
        );
      }

      const interview = await queryOne(
        "UPDATE f2f_interviews SET status = 'CANCELLED', updated_at = NOW() WHERE id = $1 RETURNING *",
        [interviewId]
      );

      // Get candidate info
      const application = await queryOne(
        `SELECT a.candidate_id, j.title as job_title, u.company
         FROM applications a
         JOIN jobs j ON a.job_id = j.id
         LEFT JOIN users u ON j.posted_by = u.id
         WHERE a.id = $1`,
        [interview.application_id]
      );

      const candidate = await queryOne(
        "SELECT email, first_name, last_name FROM users WHERE id = $1",
        [application?.candidate_id]
      );

      const candidateName =
        `${candidate?.first_name || ""} ${candidate?.last_name || ""}`.trim() ||
        "Candidate";

      // Notify candidate
      if (application?.candidate_id) {
        await query(
          `INSERT INTO notifications (user_id, type, title, message, link)
           VALUES ($1, 'APPLICATION_UPDATE', '📅 Interview Cancelled', $2, '/applications')`,
          [
            application.candidate_id,
            `Your interview for ${application.job_title} scheduled on ${new Date(interview.scheduled_at).toLocaleDateString()} has been cancelled. You'll be notified about next steps.`,
          ]
        );

        // Send cancellation email
        if (candidate?.email) {
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
                html: `<p>Hi ${candidate.first_name || "there"},</p>
                       <p>Your interview for <strong>${application.job_title}</strong> at <strong>${application.company || "the company"}</strong> scheduled on ${new Date(interview.scheduled_at).toLocaleDateString()} has been cancelled.</p>
                       <p>You'll be notified about next steps through your <a href="${appUrl}/applications">application tracker</a>.</p>
                       <p>— The ${application.company || "Hirasys"} Team</p>`,
              });
            }
          } catch (emailErr) {
            console.error("Cancellation email failed:", emailErr);
          }
        }
      }

      // ✅ AUDIT
      await logAudit({
        userId,
        action: "F2F_CANCELLED",
        resourceType: "f2f_interview",
        resourceId: interviewId,
        resourceName: `${candidateName} — ${application?.job_title || ""}`,
        details: {
          applicationId: interview.application_id,
          candidateName,
          candidateEmail: candidate?.email,
          jobTitle: application?.job_title,
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

      // Mark interview as completed
      await query(
        "UPDATE f2f_interviews SET status = 'COMPLETED', updated_at = NOW() WHERE id = $1",
        [interviewId]
      );

      // Save feedback
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
         FROM applications a
         JOIN jobs j ON a.job_id = j.id
         WHERE a.id = $1`,
        [existing.application_id]
      );

      const candidate = await queryOne(
        "SELECT first_name, last_name, email FROM users WHERE id = $1",
        [application?.candidate_id]
      );

      const candidateName =
        `${candidate?.first_name || ""} ${candidate?.last_name || ""}`.trim() ||
        "Candidate";

      // Trigger pipeline execution
      if (existing.application_id) {
        try {
          await fetch(`${appUrl}/api/pipeline/execute`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              applicationId: existing.application_id,
              trigger: "f2f_completed",
            }),
          });
        } catch (pipelineErr) {
          console.error("Pipeline trigger failed:", pipelineErr);
        }
      }

      // ✅ AUDIT
      await logAudit({
        userId,
        action: "F2F_FEEDBACK_SUBMITTED",
        resourceType: "f2f_interview",
        resourceId: interviewId,
        resourceName: `${candidateName} — ${application?.job_title || ""}`,
        details: {
          candidateName,
          jobTitle: application?.job_title,
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
      { error: "Invalid action. Use 'edit', 'cancel', or 'feedback'" },
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