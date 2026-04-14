export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
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

    // Determine current_stage value:
    // - If HR passes a specific node subtype (from pipeline dropdown), use that
    // - Otherwise keep existing or null
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
      },
      req,
    });

    // DO NOT trigger pipeline execution on manual status changes
    // Pipeline only runs when candidate completes actions (assessment, interview)

    return NextResponse.json({ success: true, application });
  } catch (error: any) {
    console.error("Update application error:", error);
    return NextResponse.json(
      { error: "Failed to update" },
      { status: 500 }
    );
  }
}