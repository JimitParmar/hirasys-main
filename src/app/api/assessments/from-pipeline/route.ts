import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { getSession } from "@/lib/session";

// Get assessment data from pipeline node config
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const applicationId = searchParams.get("applicationId");
    const nodeSubtype = searchParams.get("nodeSubtype"); // "coding_assessment" or "mcq_assessment"

    if (!applicationId) {
      return NextResponse.json({ error: "applicationId required" }, { status: 400 });
    }

    // Get application → job → pipeline
    const application = await queryOne(
      `SELECT a.*, j.pipeline_id, j.title as job_title, j.skills as job_skills
       FROM applications a
       JOIN jobs j ON a.job_id = j.id
       WHERE a.id = $1`,
      [applicationId]
    );

    if (!application || !application.pipeline_id) {
      return NextResponse.json({ error: "No pipeline linked" }, { status: 404 });
    }

    const pipeline = await queryOne(
      "SELECT * FROM pipelines WHERE id = $1",
      [application.pipeline_id]
    );

    if (!pipeline) {
      return NextResponse.json({ error: "Pipeline not found" }, { status: 404 });
    }

    // Find the assessment node in pipeline
    let nodes: any[] = [];
    try {
      nodes = typeof pipeline.nodes === "string"
        ? JSON.parse(pipeline.nodes)
        : pipeline.nodes || [];
    } catch {
      nodes = [];
    }

    // Find the matching assessment node
    const targetSubtype = nodeSubtype || "coding_assessment";
    const assessmentNode = nodes.find(
      (n: any) => n.data?.subtype === targetSubtype
    );

    if (!assessmentNode) {
      return NextResponse.json({
        error: `No ${targetSubtype} node found in pipeline`,
      }, { status: 404 });
    }

    const nodeConfig = assessmentNode.data?.config || {};

    return NextResponse.json({
      assessment: {
        id: assessmentNode.id,
        title: assessmentNode.data?.label || "Assessment",
        type: targetSubtype === "mcq_assessment" ? "MCQ" : "CODING",
        duration: nodeConfig.duration || 60,
        questions: nodeConfig.questions || [],
        difficulty: nodeConfig.difficulty || "medium",
        languages: nodeConfig.languages || ["javascript", "python"],
        totalPoints: (nodeConfig.questions || []).reduce(
          (sum: number, q: any) => sum + (q.points || 10), 0
        ),
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