export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, queryMany } from "@/lib/db";
import { getSession } from "@/lib/session";
import {
  generateProctoringReport,
  ProctoringEvent,
} from "@/lib/proctor";

// ==========================================
// POST — Store proctoring events
// ==========================================
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { submissionId, events } = await req.json();

    if (!submissionId || !events?.length) {
      return NextResponse.json({ error: "submissionId and events required" }, { status: 400 });
    }

    // Verify submission belongs to this user
    const submission = await queryOne(
      "SELECT id, candidate_id FROM submissions WHERE id = $1",
      [submissionId]
    );

    if (!submission || submission.candidate_id !== userId) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    // Append events to existing proctoring data
    const existing = await queryOne(
      "SELECT proctoring_events FROM submissions WHERE id = $1",
      [submissionId]
    );

    let existingEvents: ProctoringEvent[] = [];
    if (existing?.proctoring_events) {
      try {
        existingEvents =
          typeof existing.proctoring_events === "string"
            ? JSON.parse(existing.proctoring_events)
            : existing.proctoring_events;
      } catch {}
    }

    const allEvents = [...existingEvents, ...events];

    // Generate summary report
    const report = generateProctoringReport(allEvents);

    await query(
      `UPDATE submissions
       SET proctoring_events = $2,
           proctoring_summary = $3
       WHERE id = $1`,
      [
        submissionId,
        JSON.stringify(allEvents),
        JSON.stringify(report.summary),
      ]
    );

    return NextResponse.json({
      success: true,
      eventCount: allEvents.length,
      summary: report.summary,
    });
  } catch (error: any) {
    console.error("Proctoring save error:", error);
    return NextResponse.json(
      { error: "Failed to save proctoring data" },
      { status: 500 }
    );
  }
}

// ==========================================
// GET — Retrieve proctoring report (HR only)
// ==========================================
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["HR", "ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const submissionId = searchParams.get("submissionId");

    if (!submissionId) {
      return NextResponse.json(
        { error: "submissionId required" },
        { status: 400 }
      );
    }

    const submission = await queryOne(
      `SELECT s.proctoring_events, s.proctoring_summary,
              s.candidate_id, s.assessment_id, s.status,
              u.first_name, u.last_name, u.email
       FROM submissions s
       LEFT JOIN users u ON s.candidate_id = u.id
       WHERE s.id = $1`,
      [submissionId]
    );

    if (!submission) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    let events: ProctoringEvent[] = [];
    try {
      events =
        typeof submission.proctoring_events === "string"
          ? JSON.parse(submission.proctoring_events)
          : submission.proctoring_events || [];
    } catch {}

    let summary = submission.proctoring_summary;
    try {
      if (typeof summary === "string") summary = JSON.parse(summary);
    } catch {
      summary = null;
    }

    // Regenerate if no summary
    if (!summary && events.length > 0) {
      const report = generateProctoringReport(events);
      summary = report.summary;
    }

    return NextResponse.json({
      candidate: {
        name: `${submission.first_name || ""} ${submission.last_name || ""}`.trim(),
        email: submission.email,
      },
      events,
      summary: summary || {
        tabSwitches: 0,
        copyPasteAttempts: 0,
        rightClicks: 0,
        devtoolsOpened: 0,
        fullscreenExits: 0,
        totalViolations: 0,
        suspicionLevel: "low",
        duration: 0,
        idleTime: 0,
      },
    });
  } catch (error: any) {
    console.error("Proctoring fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch proctoring data" },
      { status: 500 }
    );
  }
}