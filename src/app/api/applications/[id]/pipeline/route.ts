import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const application = await queryOne(
      `SELECT a.*, j.pipeline_id, j.title as job_title
       FROM applications a
       JOIN jobs j ON a.job_id = j.id
       WHERE a.id = $1`,
      [id]
    );

    if (!application) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!application.pipeline_id) {
      return NextResponse.json({ stages: [], message: "No pipeline linked" });
    }

    const pipeline = await queryOne(
      "SELECT * FROM pipelines WHERE id = $1",
      [application.pipeline_id]
    );

    if (!pipeline) {
      return NextResponse.json({ stages: [], message: "Pipeline not found" });
    }

    let nodes: any[] = [];
    try {
      nodes = typeof pipeline.nodes === "string"
        ? JSON.parse(pipeline.nodes)
        : pipeline.nodes || [];
    } catch {
      nodes = [];
    }

    let edges: any[] = [];
    try {
      edges = typeof pipeline.edges === "string"
        ? JSON.parse(pipeline.edges)
        : pipeline.edges || [];
    } catch {
      edges = [];
    }

    // Build adjacency — only follow pass paths
    const adjMap = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    for (const node of nodes) {
      adjMap.set(node.id, []);
      inDegree.set(node.id, 0);
    }

    for (const edge of edges) {
      if (!edge.sourceHandle || edge.sourceHandle === "pass") {
        const targets = adjMap.get(edge.source) || [];
        targets.push(edge.target);
        adjMap.set(edge.source, targets);
        inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
      }
    }

    // Topological sort
    const queue: string[] = [];
    for (const [nodeId, degree] of inDegree.entries()) {
      if (degree === 0) queue.push(nodeId);
    }

    const orderedNodeIds: string[] = [];
    while (queue.length > 0) {
      const current = queue.shift()!;
      orderedNodeIds.push(current);
      for (const next of (adjMap.get(current) || [])) {
        const newDegree = (inDegree.get(next) || 1) - 1;
        inDegree.set(next, newDegree);
        if (newDegree === 0) queue.push(next);
      }
    }

    // ==========================================
    // ONLY STAGE NODES — no source, filter, logic, action, exit
    // ==========================================
    const stageNodes = orderedNodeIds
      .map((nodeId) => nodes.find((n: any) => n.id === nodeId))
      .filter((node: any) => {
        if (!node?.data) return false;
        // ONLY show stage nodes to candidates
        return node.data.type === "stage";
      })
      .map((node: any, index: number) => ({
        id: node.id,
        label: getCandidateFriendlyLabel(node.data.subtype, node.data.label),
        subtype: node.data.subtype,
        icon: getCandidateFriendlyIcon(node.data.subtype),
        color: node.data.color,
        order: index,
        description: getCandidateDescription(node.data.subtype),
      }));

    // ==========================================
    // ALWAYS ADD "Job Offered" AS FINAL STAGE
    // ==========================================
    const stages = [
      // First stage: "Application Received"
      {
        id: "stage_applied",
        label: "Application Received",
        subtype: "applied",
        icon: "Briefcase",
        color: "#10B981",
        order: 0,
        description: "Your application has been received and is being processed",
      },
      // Middle: actual stage nodes
      ...stageNodes.map((s, i) => ({ ...s, order: i + 1 })),
      // Last stage: always "Job Offered"
      {
        id: "stage_offer",
        label: "Job Offered",
        subtype: "offer",
        icon: "Award",
        color: "#10B981",
        order: stageNodes.length + 1,
        description: "Congratulations! You've received a job offer",
      },
    ];

    // Determine current stage index
    const currentStageIndex = mapStatusToStageIndex(
      application.status,
      stages
    );

    return NextResponse.json({
      stages,
      currentStageIndex,
      totalStages: stages.length,
      applicationStatus: application.status,
    });
  } catch (error: any) {
    console.error("Pipeline stages error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

// ==========================================
// Candidate-friendly labels
// (don't expose internal names like "ai_resume_screen")
// ==========================================
function getCandidateFriendlyLabel(subtype: string, fallback: string): string {
  const labels: Record<string, string> = {
    ai_resume_screen: "Resume Review",
    coding_assessment: "Coding Challenge",
    mcq_assessment: "Technical Quiz",
    subjective_assessment: "Written Assessment",
    ai_technical_interview: "Technical Interview",
    ai_behavioral_interview: "Behavioral Interview",
    f2f_interview: "Team Interview",
    panel_interview: "Panel Interview",
  };
  return labels[subtype] || fallback;
}

function getCandidateFriendlyIcon(subtype: string): string {
  const icons: Record<string, string> = {
    ai_resume_screen: "FileSearch",
    coding_assessment: "Code",
    mcq_assessment: "ListChecks",
    subjective_assessment: "FileText",
    ai_technical_interview: "Bot",
    ai_behavioral_interview: "MessageSquare",
    f2f_interview: "Video",
    panel_interview: "Users",
  };
  return icons[subtype] || "Briefcase";
}

function getCandidateDescription(subtype: string): string {
  const descriptions: Record<string, string> = {
    ai_resume_screen: "Your resume is being reviewed against job requirements",
    coding_assessment: "Complete a timed coding challenge to showcase your skills",
    mcq_assessment: "Answer technical multiple-choice questions",
    subjective_assessment: "Complete a written assessment",
    ai_technical_interview: "Have a technical conversation about your experience",
    ai_behavioral_interview: "Discuss your approach to work situations",
    f2f_interview: "Meet the team in a face-to-face interview",
    panel_interview: "Present to and discuss with multiple team members",
  };
  return descriptions[subtype] || "This stage is being processed";
}

function mapStatusToStageIndex(status: string, stages: any[]): number {
  // First stage (index 0) is always "Application Received"
  // Last stage is always "Job Offered"
  // Middle stages are the actual pipeline stages

  switch (status) {
    case "APPLIED":
      return 0; // Application Received

    case "SCREENING": {
      // Find resume review stage
      const idx = stages.findIndex((s) => s.subtype === "ai_resume_screen");
      return idx >= 0 ? idx : 1;
    }

    case "ASSESSMENT": {
      const idx = stages.findIndex((s) =>
        ["coding_assessment", "mcq_assessment", "subjective_assessment"].includes(s.subtype)
      );
      return idx >= 0 ? idx : Math.min(2, stages.length - 2);
    }

    case "AI_INTERVIEW": {
      const idx = stages.findIndex((s) =>
        ["ai_technical_interview", "ai_behavioral_interview"].includes(s.subtype)
      );
      return idx >= 0 ? idx : Math.min(3, stages.length - 2);
    }

    case "F2F_INTERVIEW": {
      const idx = stages.findIndex((s) =>
        ["f2f_interview", "panel_interview"].includes(s.subtype)
      );
      return idx >= 0 ? idx : Math.min(4, stages.length - 2);
    }

    case "UNDER_REVIEW":
      return stages.length - 2; // Second to last

    case "OFFERED":
    case "HIRED":
      return stages.length - 1; // Last stage = "Job Offered"

    case "REJECTED":
      return -1; // Special handling in UI

    default:
      return 0;
  }
}