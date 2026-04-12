export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, queryMany } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getAuditUser, logAudit } from "@/lib/audit";

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
        } catch { metadata = {}; }
        return { ...i, metadata };
      });

      return NextResponse.json({ interviews: formatted });
    }

    return NextResponse.json({ interviews: [] });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

// POST — schedule f2f interview
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["HR", "ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      applicationId, scheduledAt, duration, meetingLink,
      interviewType, notes, interviewers,
    } = body;
    
    if (!applicationId || !scheduledAt) {
      return NextResponse.json({ error: "applicationId and scheduledAt required" }, { status: 400 });
    }

    if (!interviewers || interviewers.length === 0) {
      return NextResponse.json({ error: "At least one interviewer required" }, { status: 400 });
    }

    const application = await queryOne(
      `SELECT a.*, j.title as job_title
       FROM applications a JOIN jobs j ON a.job_id = j.id
       WHERE a.id = $1`,
      [applicationId]
    );

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    // Use the first interviewer as the primary, store all in metadata
    const primaryInterviewer = interviewers[0];
    const interviewerId = primaryInterviewer.id || (session.user as any).id;

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
          scheduledBy: (session.user as any).id,
          panelSize: interviewers.length,
        }),
      ]
    );

    // Update application status
    await query(
      "UPDATE applications SET status = 'F2F_INTERVIEW', updated_at = NOW() WHERE id = $1",
      [applicationId]
    );
    await logAudit({
  ...getAuditUser(session),
  action: "F2F_SCHEDULED",
  resourceType: "f2f_interview",
  resourceId: interview.id,
  details: { applicationId, scheduledAt, interviewers: interviewers?.length },
});
    // Build interviewer names list
    const interviewerNames = interviewers.map((i: any) => i.name).join(", ");

    // Notify candidate
    await query(
      `INSERT INTO notifications (user_id, type, title, message, link)
       VALUES ($1, 'INTERVIEW_SCHEDULED', '📅 Interview Scheduled',
         $2, '/applications')`,
      [
        application.candidate_id,
        `Your ${interviewType} interview for ${application.job_title} is scheduled for ${new Date(scheduledAt).toLocaleDateString()} at ${new Date(scheduledAt).toLocaleTimeString()}. Interviewer${interviewers.length > 1 ? "s" : ""}: ${interviewerNames}.${meetingLink ? " Meeting link: " + meetingLink : ""}`,
      ]
    );

    // Notify each interviewer who is in the system
    for (const interviewer of interviewers) {
      if (interviewer.id) {
        await query(
          `INSERT INTO notifications (user_id, type, title, message, link)
           VALUES ($1, 'INTERVIEW_SCHEDULED', '📅 Interview Assigned',
             $2, '/hr/dashboard')`,
          [
            interviewer.id,
            `You've been assigned to interview a candidate for ${application.job_title} on ${new Date(scheduledAt).toLocaleDateString()} at ${new Date(scheduledAt).toLocaleTimeString()}.`,
          ]
        );
      }
    }

    return NextResponse.json({ success: true, interview }, { status: 201 });
  } catch (error: any) {
    console.error("F2F scheduling error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT — submit feedback
export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // ==========================================
    // EDIT INTERVIEW
    // ==========================================
    if (body.action === "edit") {
      const {
        interviewId, scheduledAt, duration, meetingLink,
        interviewType, notes, interviewers,
      } = body;

      if (!interviewId) {
        return NextResponse.json({ error: "interviewId required" }, { status: 400 });
      }

      const existing = await queryOne(
        "SELECT * FROM f2f_interviews WHERE id = $1",
        [interviewId]
      );

      if (!existing) {
        return NextResponse.json({ error: "Interview not found" }, { status: 404 });
      }

      // Build update fields
      const updates: string[] = [];
      const values: any[] = [];
      let idx = 2; // $1 is interviewId

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
        values.push(JSON.stringify({
          interviewers,
          scheduledBy: (session.user as any).id,
          panelSize: interviewers.length,
          lastEditedAt: new Date().toISOString(),
          lastEditedBy: (session.user as any).id,
        }));
        idx++;
      }

      updates.push("updated_at = NOW()");

      if (updates.length === 1) {
        return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
      }

      const interview = await queryOne(
        `UPDATE f2f_interviews SET ${updates.join(", ")} WHERE id = $1 RETURNING *`,
        [interviewId, ...values]
      );

      // Notify candidate about reschedule
      const application = await queryOne(
        `SELECT a.candidate_id, j.title as job_title
         FROM applications a JOIN jobs j ON a.job_id = j.id
         WHERE a.id = $1`,
        [existing.application_id]
      );

      if (application) {
        const newDate = scheduledAt ? new Date(scheduledAt) : new Date(existing.scheduled_at);
        await query(
          `INSERT INTO notifications (user_id, type, title, message, link)
           VALUES ($1, 'INTERVIEW_SCHEDULED', '📅 Interview Updated',
             $2, '/applications')`,
          [
            application.candidate_id,
            `Your interview for ${application.job_title} has been rescheduled to ${newDate.toLocaleDateString()} at ${newDate.toLocaleTimeString()}.`,
          ]
        );
      }

      return NextResponse.json({ success: true, interview });
    }

    // ==========================================
    // CANCEL INTERVIEW
    // ==========================================
    if (body.action === "cancel") {
      const { interviewId } = body;

      const interview = await queryOne(
        "UPDATE f2f_interviews SET status = 'CANCELLED', updated_at = NOW() WHERE id = $1 RETURNING *",
        [interviewId]
      );

      if (!interview) {
        return NextResponse.json({ error: "Interview not found" }, { status: 404 });
      }

      // Notify candidate
      const application = await queryOne(
        `SELECT a.candidate_id, j.title as job_title
         FROM applications a JOIN jobs j ON a.job_id = j.id
         WHERE a.id = $1`,
        [interview.application_id]
      );

      if (application) {
        await query(
          `INSERT INTO notifications (user_id, type, title, message, link)
           VALUES ($1, 'APPLICATION_UPDATE', '📅 Interview Cancelled',
             $2, '/applications')`,
          [
            application.candidate_id,
            `Your interview for ${application.job_title} scheduled on ${new Date(interview.scheduled_at).toLocaleDateString()} has been cancelled. You'll be notified about next steps.`,
          ]
        );
      }

      return NextResponse.json({ success: true, interview });
    }

    // ==========================================
    // SUBMIT FEEDBACK (existing)
    // ==========================================
    if (body.action === "feedback") {
      const {
        interviewId, technicalScore, communicationScore,
        problemSolvingScore, cultureFitScore, recommendation,
        strengths, concerns, notes: feedbackNotes,
      } = body;

      const overallScore = Math.round(
        ((technicalScore || 0) + (communicationScore || 0) +
         (problemSolvingScore || 0) + (cultureFitScore || 0)) / 4
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
          interviewId, (session.user as any).id,
          technicalScore || 0, communicationScore || 0,
          problemSolvingScore || 0, cultureFitScore || 0,
          overallScore, recommendation || "maybe",
          strengths || null, concerns || null, feedbackNotes || null,
        ]
      );

      const interview = await queryOne(
        "SELECT * FROM f2f_interviews WHERE id = $1",
        [interviewId]
      );

      if (interview?.application_id) {
        try {
          await fetch(
            `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/pipeline/execute`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                applicationId: interview.application_id,
                trigger: "f2f_completed",
              }),
            }
          );
        } catch {}
      }

      return NextResponse.json({ success: true, feedback });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("F2F update error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}