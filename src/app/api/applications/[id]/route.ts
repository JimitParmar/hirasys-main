export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, queryMany } from "@/lib/db";
import { getSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !["HR", "ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { id } = await params;
    const body = await req.json();
    const { status, currentNodeId, currentNodeSubtype } = body;

    // Fetch old application with candidate + job info for audit context
    const oldApp = await queryOne(
      `SELECT a.*,
        u.first_name as candidate_first_name,
        u.last_name as candidate_last_name,
        u.email as candidate_email,
        j.title as job_title
       FROM applications a
       LEFT JOIN users u ON a.candidate_id = u.id
       LEFT JOIN jobs j ON a.job_id = j.id
       WHERE a.id = $1`,
      [id]
    );

    if (!oldApp) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    const oldStatus = oldApp.status;

    // Determine current_stage value
    const currentStage = currentNodeSubtype || oldApp.current_stage || null;

    const application = await queryOne(
      `UPDATE applications
       SET status = $2, current_stage = $3, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id, status, currentStage]
    );

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    // ==========================================
    // CLEAR OLD STAGE DATA when moving back
    // ==========================================
    const stageOrder = [
      "APPLIED",
      "SCREENING",
      "ASSESSMENT",
      "AI_INTERVIEW",
      "F2F_INTERVIEW",
      "UNDER_REVIEW",
      "OFFERED",
      "HIRED",
      "ONBOARDING",
    ];

    const oldIndex = stageOrder.indexOf(oldStatus);
    const newIndex = stageOrder.indexOf(status);
    const isMovingBack = newIndex < oldIndex && newIndex >= 0 && oldIndex >= 0;

    // Also clear if moving TO any stage that has completable data
    // (even if moving forward — HR might want a redo)
    const clearableStatuses = [
      "SCREENING",
      "ASSESSMENT",
      "AI_INTERVIEW",
      "F2F_INTERVIEW",
    ];
    const shouldClear = isMovingBack || (
      clearableStatuses.includes(status) &&
      oldStatus !== status
    );

    if (shouldClear) {
      const clearedItems: string[] = [];

      // Clear data for the target stage AND all stages after it
      // (if moving back from F2F to ASSESSMENT, clear both assessment and interview data)
      const targetIndex = stageOrder.indexOf(status);

      // Clear assessment submissions if moving to or before ASSESSMENT
      if (targetIndex <= stageOrder.indexOf("ASSESSMENT")) {
        const deleted = await query(
          "DELETE FROM submissions WHERE application_id = $1",
          [id]
        );
        if ((deleted as any).rowCount > 0) {
          clearedItems.push(`${(deleted as any).rowCount} submission(s)`);
        }
      }

      // Clear AI interviews if moving to or before AI_INTERVIEW
      if (targetIndex <= stageOrder.indexOf("AI_INTERVIEW")) {
        const deleted = await query(
          "DELETE FROM ai_interviews WHERE application_id = $1",
          [id]
        );
        if ((deleted as any).rowCount > 0) {
          clearedItems.push(`${(deleted as any).rowCount} AI interview(s)`);
        }
      }

      // Clear F2F interviews + feedback if moving to or before F2F_INTERVIEW
      if (targetIndex <= stageOrder.indexOf("F2F_INTERVIEW")) {
        // Delete feedback first (references interview)
        const f2fs = await queryMany(
          "SELECT id FROM f2f_interviews WHERE application_id = $1",
          [id]
        );
        for (const f2f of f2fs) {
          await query(
            "DELETE FROM interview_feedback WHERE interview_id = $1",
            [f2f.id]
          );
        }
        const deleted = await query(
          "DELETE FROM f2f_interviews WHERE application_id = $1",
          [id]
        );
        if ((deleted as any).rowCount > 0) {
          clearedItems.push(`${(deleted as any).rowCount} F2F interview(s)`);
        }
      }

      // Clear ratings (scores are now invalid)
      if (targetIndex <= stageOrder.indexOf("UNDER_REVIEW")) {
        await query(
          "DELETE FROM ratings WHERE application_id = $1",
          [id]
        );
      }

      // Reset resume score if moving back to SCREENING or APPLIED
      if (targetIndex <= stageOrder.indexOf("SCREENING") && currentNodeSubtype === "ai_resume_screen") {
        await query(
          "UPDATE applications SET resume_score = 0, resume_parsed = NULL WHERE id = $1",
          [id]
        );
        clearedItems.push("resume score");
      }

      if (clearedItems.length > 0) {
        console.log(
          `[Stage Reset] Application ${id}: ${oldStatus} → ${status}. Cleared: ${clearedItems.join(", ")}`
        );
      }
    }

    // ==========================================
    // AUDIT — log after successful update
    // ==========================================
    const candidateName =
      `${oldApp.candidate_first_name || ""} ${oldApp.candidate_last_name || ""}`.trim() ||
      oldApp.candidate_email ||
      "Unknown";

    await logAudit({
      userId,
      action:
        status === "REJECTED"
          ? "APPLICATION_REJECTED"
          : "APPLICATION_STATUS_CHANGED",
      resourceType: "application",
      resourceId: id,
      resourceName: `${candidateName} → ${oldApp.job_title || ""}`,
      details: {
        candidateName,
        candidateEmail: oldApp.candidate_email,
        jobTitle: oldApp.job_title,
        oldStatus,
        newStatus: status,
        ...(currentNodeSubtype && { nodeSubtype: currentNodeSubtype }),
        ...(currentNodeId && { nodeId: currentNodeId }),
        ...(shouldClear && { stageDataCleared: true }),
      },
      req,
    });

    return NextResponse.json({ success: true, application });
  } catch (error: any) {
    console.error("Update application error:", error);
    return NextResponse.json(
      { error: "Failed to update" },
      { status: 500 }
    );
  }
}