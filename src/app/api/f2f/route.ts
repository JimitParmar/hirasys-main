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

    // Get application info
    const application = await queryOne(
      `SELECT a.*, j.title as job_title, u.company
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

    // Get candidate info
    const candidate = await queryOne(
      "SELECT id, email, first_name, last_name FROM users WHERE id = $1",
      [application.candidate_id]
    );

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

    const interviewerNames = interviewers
      .map((i: any) => i.name)
      .join(", ");
    const scheduledDate = new Date(scheduledAt);
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const candidateName =
      `${candidate?.first_name || ""} ${candidate?.last_name || ""}`.trim() ||
      "Candidate";

    // In-app notification for candidate
    await query(
      `INSERT INTO notifications (user_id, type, title, message, link)
       VALUES ($1, 'INTERVIEW_SCHEDULED', '📅 Interview Scheduled', $2, '/applications')`,
      [
        application.candidate_id,
        `Your ${interviewType || "technical"} interview for ${application.job_title} is scheduled for ${scheduledDate.toLocaleDateString()} at ${scheduledDate.toLocaleTimeString()}. Interviewer${interviewers.length > 1 ? "s" : ""}: ${interviewerNames}.`,
      ]
    );

    // Send email to candidate
    if (candidate?.email) {
      try {
        const { sendInterviewScheduled } = await import("@/lib/email");
        await sendInterviewScheduled({
          to: candidate.email,
          candidateName: candidate.first_name || "there",
          jobTitle: application.job_title,
          companyName:
            application.company ||
            (session.user as any).company ||
            "",
          date: scheduledDate.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          }),
          time: scheduledDate.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }),
          duration: duration || 60,
          interviewType: interviewType || "technical",
          meetingLink: meetingLink || undefined,
          interviewers: interviewers.map((i: any) => i.name),
          notes: notes || undefined,
        });
      } catch (emailErr) {
        console.error("Interview email to candidate failed:", emailErr);
      }
    }

    // Notify each interviewer who is in the system
    for (const interviewer of interviewers) {
      if (interviewer.id) {
        // In-app notification
        await query(
          `INSERT INTO notifications (user_id, type, title, message, link)
           VALUES ($1, 'INTERVIEW_SCHEDULED', '📅 Interview Assigned', $2, '/hr/dashboard')`,
          [
            interviewer.id,
            `You've been assigned to interview ${candidateName} for ${application.job_title} on ${scheduledDate.toLocaleDateString()} at ${scheduledDate.toLocaleTimeString()}.`,
          ]
        );

        // Email to interviewer
        try {
          const interviewerUser = await queryOne(
            "SELECT email, first_name FROM users WHERE id = $1",
            [interviewer.id]
          );
          if (interviewerUser?.email) {
            const { sendInterviewScheduled } = await import(
              "@/lib/email"
            );
            await sendInterviewScheduled({
              to: interviewerUser.email,
              candidateName,
              jobTitle: application.job_title,
              companyName: application.company || "",
              date: scheduledDate.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              }),
              time: scheduledDate.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              }),
              duration: duration || 60,
              interviewType: interviewType || "technical",
              meetingLink: meetingLink || undefined,
              interviewers: interviewers.map((i: any) => i.name),
              notes: notes || undefined,
            });
          }
        } catch (emailErr) {
          console.error(
            `Interview email to interviewer ${interviewer.name} failed:`,
            emailErr
          );
        }
      }
    }

    // ✅ AUDIT — after successful scheduling
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

      // Get application and candidate info
      const application = await queryOne(
        `SELECT a.candidate_id, j.title as job_title, u.company
         FROM applications a
         JOIN jobs j ON a.job_id = j.id
         LEFT JOIN users u ON j.posted_by = u.id
         WHERE a.id = $1`,
        [existing.application_id]
      );

      const candidate = await queryOne(
        "SELECT email, first_name, last_name FROM users WHERE id = $1",
        [application?.candidate_id]
      );

      const candidateName =
        `${candidate?.first_name || ""} ${candidate?.last_name || ""}`.trim() ||
        "Candidate";

      // Notify candidate about reschedule
      if (application?.candidate_id) {
        const newDate = scheduledAt
          ? new Date(scheduledAt)
          : new Date(existing.scheduled_at);

        await query(
          `INSERT INTO notifications (user_id, type, title, message, link)
           VALUES ($1, 'INTERVIEW_SCHEDULED', '📅 Interview Updated', $2, '/applications')`,
          [
            application.candidate_id,
            `Your interview for ${application.job_title} has been rescheduled to ${newDate.toLocaleDateString()} at ${newDate.toLocaleTimeString()}.`,
          ]
        );

        // Send email
        if (candidate?.email) {
          try {
            const { sendInterviewScheduled } = await import(
              "@/lib/email"
            );
            await sendInterviewScheduled({
              to: candidate.email,
              candidateName: candidate.first_name || "there",
              jobTitle: application.job_title || "",
              companyName: application.company || "",
              date: newDate.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              }),
              time: newDate.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              }),
              duration: duration || existing.duration || 60,
              interviewType:
                interviewType || existing.interview_type || "technical",
              meetingLink:
                meetingLink || existing.meeting_link || undefined,
              interviewers: (interviewers || []).map(
                (i: any) => i.name
              ),
              notes: notes || existing.notes || undefined,
            });
          } catch (emailErr) {
            console.error("Reschedule email failed:", emailErr);
          }
        }
      }

      // Build change details
      const changes: Record<string, any> = {};
      if (scheduledAt && String(existing.scheduled_at) !== String(scheduledAt)) {
        changes.scheduledAt = { from: existing.scheduled_at, to: scheduledAt };
      }
      if (duration && existing.duration !== duration) {
        changes.duration = { from: existing.duration, to: duration };
      }
      if (interviewType && existing.interview_type !== interviewType) {
        changes.interviewType = { from: existing.interview_type, to: interviewType };
      }

      // ✅ AUDIT
      await logAudit({
        userId,
        action: "F2F_UPDATED",
        resourceType: "f2f_interview",
        resourceId: interviewId,
        resourceName: `${candidateName} — ${application?.job_title || ""}`,
        details: {
          ...(Object.keys(changes).length > 0 ? changes : {}),
          interviewerCount: interviewers?.length,
          applicationId: existing.application_id,
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