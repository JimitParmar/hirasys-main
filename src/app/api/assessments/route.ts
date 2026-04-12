export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, queryMany } from "@/lib/db";
import { getSession } from "@/lib/session";

// GET — list assessments
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId");
    const id = searchParams.get("id");

    if (id) {
      const assessment = await queryOne(
        "SELECT * FROM assessments WHERE id = $1",
        [id]
      );
      if (!assessment) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      // Parse questions
      let questions = assessment.questions;
      if (typeof questions === "string") {
        questions = JSON.parse(questions);
      }

      // For candidates: hide test case expected outputs for hidden tests
      const role = (session.user as any).role;
      if (role === "CANDIDATE") {
        questions = questions.map((q: any) => ({
          ...q,
          testCases: q.testCases?.map((tc: any) => ({
            ...tc,
            expectedOutput: tc.isHidden ? "[hidden]" : tc.expectedOutput,
          })),
        }));
      }

      return NextResponse.json({
        assessment: { ...assessment, questions },
      });
    }

    let assessments;
    if (jobId) {
      assessments = await queryMany(
        "SELECT * FROM assessments WHERE job_id = $1 ORDER BY created_at DESC",
        [jobId]
      );
    } else {
      assessments = await queryMany(
        "SELECT a.*, j.title as job_title FROM assessments a LEFT JOIN jobs j ON a.job_id = j.id ORDER BY a.created_at DESC"
      );
    }

    return NextResponse.json({ assessments });
  } catch (error: any) {
    console.error("Assessment fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

// POST — create assessment
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["HR", "ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const assessment = await queryOne(
      `INSERT INTO assessments (job_id, title, description, type, duration, total_points, passing_score, questions, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        body.jobId,
        body.title,
        body.description || null,
        body.type || "CODING",
        body.duration || 60,
        body.totalPoints || 100,
        body.passingScore || 60,
        JSON.stringify(body.questions || []),
        (session.user as any).id,
      ]
    );

    return NextResponse.json({ success: true, assessment }, { status: 201 });
  } catch (error: any) {
    console.error("Assessment creation error:", error);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}