import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const applicationId = searchParams.get("applicationId");
    const nodeSubtype = searchParams.get("nodeSubtype");

    if (!applicationId) return NextResponse.json({ error: "applicationId required" }, { status: 400 });

    // Get application → job → pipeline
    const application = await queryOne(
      `SELECT a.*, j.pipeline_id, j.title as job_title, j.description as job_description,
        j.skills as job_skills, j.requirements as job_requirements
       FROM applications a
       JOIN jobs j ON a.job_id = j.id
       WHERE a.id = $1`,
      [applicationId]
    );

    if (!application || !application.pipeline_id) {
      return NextResponse.json({ error: "No pipeline linked" }, { status: 404 });
    }

    const pipeline = await queryOne("SELECT * FROM pipelines WHERE id = $1", [application.pipeline_id]);
    if (!pipeline) return NextResponse.json({ error: "Pipeline not found" }, { status: 404 });

    let nodes: any[] = [];
    try {
      nodes = typeof pipeline.nodes === "string" ? JSON.parse(pipeline.nodes) : pipeline.nodes || [];
    } catch { nodes = []; }

    const targetSubtype = nodeSubtype || "coding_assessment";
    const assessmentNode = nodes.find((n: any) => n.data?.subtype === targetSubtype);

    if (!assessmentNode) {
      return NextResponse.json({ error: `No ${targetSubtype} node found` }, { status: 404 });
    }

    const nodeConfig = assessmentNode.data?.config || {};
    let questions = nodeConfig.questions || [];
    const questionMode = nodeConfig.questionMode || "auto";

    // ==========================================
    // AUTO MODE — Generate questions from job description at runtime
    // ==========================================
    if (questionMode === "auto" || questions.length === 0) {
      console.log("Auto-generating questions for:", application.job_title);

      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const genRes = await fetch(`${appUrl}/api/assessments/generate-for-node`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: targetSubtype === "mcq_assessment" ? "mcq" : "coding",
            difficulty: nodeConfig.difficulty || "medium",
            questionCount: nodeConfig.questionCount || 3,
            languages: nodeConfig.languages || ["javascript", "python"],
            jobContext: {
              title: application.job_title,
              description: application.job_description,
              skills: application.job_skills || [],
              requirements: application.job_requirements || [],
            },
          }),
        });

        const genData = await genRes.json();
        if (genData.questions?.length > 0) {
          questions = genData.questions;
          console.log(`Generated ${questions.length} questions for "${application.job_title}"`);
        }
      } catch (err) {
        console.error("Auto-generation failed, using preset if available:", err);
      }

      // If STILL no questions, return error
      if (questions.length === 0) {
        return NextResponse.json({
          error: "No questions available. HR needs to generate questions in the pipeline builder.",
        }, { status: 404 });
      }
    }

    return NextResponse.json({
      assessment: {
        id: assessmentNode.id,
        title: assessmentNode.data?.label || "Assessment",
        type: targetSubtype === "mcq_assessment" ? "MCQ" : "CODING",
        duration: nodeConfig.duration || 60,
        questions,
        difficulty: nodeConfig.difficulty || "medium",
        languages: nodeConfig.languages || ["javascript", "python"],
        totalPoints: questions.reduce((sum: number, q: any) => sum + (q.points || 10), 0),
        questionMode,
      },
      application: {
        id: application.id,
        jobTitle: application.job_title,
      },
    });
  } catch (error: any) {
    console.error("Pipeline assessment fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}