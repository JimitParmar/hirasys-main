import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, queryMany } from "@/lib/db";
import { calculateRating } from "../../ratings/route";
import { generateFeedback } from "../../feedback/route";

export async function POST(req: NextRequest) {
  try {
    const { applicationId, trigger } = await req.json();

    console.log("\n=== PIPELINE EXECUTION ===");
    console.log("Application:", applicationId, "Trigger:", trigger);

    // Get application + job + pipeline
    const application = await queryOne(
      `SELECT a.*, j.pipeline_id, j.title as job_title, j.id as job_id
       FROM applications a
       JOIN jobs j ON a.job_id = j.id
       WHERE a.id = $1`,
      [applicationId]
    );

    if (!application) {
      console.log("Application not found");
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    if (!application.pipeline_id) {
      console.log("No pipeline linked");
      return NextResponse.json({ action: "no_pipeline" });
    }

    const pipeline = await queryOne(
      "SELECT * FROM pipelines WHERE id = $1",
      [application.pipeline_id]
    );

    if (!pipeline) {
      console.log("Pipeline not found");
      return NextResponse.json({ error: "Pipeline not found" }, { status: 404 });
    }

    let nodes: any[] = [];
    let edges: any[] = [];
    try {
      nodes = typeof pipeline.nodes === "string" ? JSON.parse(pipeline.nodes) : pipeline.nodes || [];
      edges = typeof pipeline.edges === "string" ? JSON.parse(pipeline.edges) : pipeline.edges || [];
    } catch {}

    if (nodes.length === 0) {
      console.log("Empty pipeline");
      return NextResponse.json({ action: "empty_pipeline" });
    }

    // Get ordered nodes
    const orderedNodes = getOrderedNodes(nodes, edges);
    console.log("Pipeline flow:", orderedNodes.map((n: any) => `${n.data?.subtype}(${n.data?.type})`).join(" → "));

    // Get current status
    const currentStatus = application.status;
    console.log("Current status:", currentStatus);

    // Find where we are in the pipeline
    const currentNodeIndex = findCurrentNodeIndex(orderedNodes, currentStatus);
    console.log("Current node index:", currentNodeIndex, "of", orderedNodes.length);

    // Process from current position forward
    let nextIndex = currentNodeIndex + 1;
    let actionsTaken: string[] = [];

    while (nextIndex < orderedNodes.length) {
      const node = orderedNodes[nextIndex];
      const nodeType = node.data?.type;
      const nodeSubtype = node.data?.subtype;
      const nodeConfig = node.data?.config || {};

      console.log(`\n  [${nextIndex}] Processing: ${nodeSubtype} (${nodeType})`);

      // ==========================================
      // STAGE NODES — Check if candidate can proceed
      // ==========================================
      if (nodeType === "stage") {
        const stageStatus = subtypeToStatus(nodeSubtype);

        // Check if this stage is already completed
        const isCompleted = await isStageCompleted(applicationId, nodeSubtype);

        if (isCompleted) {
          console.log(`  ✅ Already completed: ${nodeSubtype}`);
          nextIndex++;
          continue;
        }

        // Special case: AI Resume Screen — already done during application
        if (nodeSubtype === "ai_resume_screen") {
          // Resume was scored during application, mark as done
          if (application.resume_score > 0) {
            console.log(`  ✅ Resume already scored: ${application.resume_score}%`);
            await query(
              "UPDATE applications SET status = 'SCREENING', current_stage = $2, updated_at = NOW() WHERE id = $1 AND (status = 'APPLIED' OR status = 'SCREENING')",
              [applicationId, nodeSubtype]
            );
            actionsTaken.push(`resume_screened:${application.resume_score}`);
            nextIndex++;
            continue;
          }
        }

        // For other stages — advance candidate to this stage and STOP
        // (candidate needs to complete it)
        if (stageStatus) {
          console.log(`  ➡️ Advancing to: ${stageStatus}`);
          await query(
            "UPDATE applications SET status = $2, current_stage = $3, updated_at = NOW() WHERE id = $1",
            [applicationId, stageStatus, nodeSubtype]
          );

          // Notify candidate
          await createNotification(
            application.candidate_id,
            "STAGE_ADVANCED",
            `Next Step: ${getStageLabel(nodeSubtype)}`,
            `Your application for ${application.job_title} has moved to the ${getStageLabel(nodeSubtype)} stage.`,
            "/applications"
          );

          actionsTaken.push(`advanced:${stageStatus}`);
        }

        // STOP here — candidate needs to complete this stage
        break;
      }

      // ==========================================
      // FILTER NODES — Evaluate and pass/fail
      // ==========================================
      if (nodeType === "filter") {
        const passed = await evaluateFilter(node, applicationId, application.job_id);

        if (!passed) {
          console.log(`  ❌ REJECTED by filter: ${nodeSubtype}`);

          await query(
            "UPDATE applications SET status = 'REJECTED', updated_at = NOW() WHERE id = $1",
            [applicationId]
          );

          // Calculate rating
          try { await calculateRating(applicationId); } catch (e) { console.error("Rating failed:", e); }

          // Generate feedback
          try { await generateFeedback(applicationId); } catch (e) { console.error("Feedback failed:", e); }

          // Notify candidate
          await createNotification(
            application.candidate_id,
            "REJECTION",
            "Application Update",
            `Thank you for applying to ${application.job_title}. We have an update for you.`,
            `/feedback/${applicationId}`
          );

          actionsTaken.push(`rejected:${nodeSubtype}`);

          return NextResponse.json({
            action: "rejected",
            filter: nodeSubtype,
            actionsTaken,
          });
        }

        console.log(`  ✅ Passed filter: ${nodeSubtype}`);
        actionsTaken.push(`passed_filter:${nodeSubtype}`);
        nextIndex++;
        continue;
      }

      // ==========================================
      // EXIT NODES
      // ==========================================
      if (nodeType === "exit") {
        if (nodeSubtype === "offer") {
          console.log("  🎉 OFFER!");
          await query(
            "UPDATE applications SET status = 'OFFERED', updated_at = NOW() WHERE id = $1",
            [applicationId]
          );

          try { await calculateRating(applicationId); } catch {}

          await createNotification(
            application.candidate_id,
            "OFFER_EXTENDED",
            "🎉 Congratulations!",
            `You've received an offer for ${application.job_title}!`,
            "/applications"
          );

          actionsTaken.push("offered");
          return NextResponse.json({ action: "offered", actionsTaken });
        }

        if (nodeSubtype === "rejection") {
          await query(
            "UPDATE applications SET status = 'REJECTED', updated_at = NOW() WHERE id = $1",
            [applicationId]
          );
          try { await calculateRating(applicationId); } catch {}
          try { await generateFeedback(applicationId); } catch {}
          actionsTaken.push("rejected:exit_node");
          return NextResponse.json({ action: "rejected", actionsTaken });
        }

        break;
      }

      // Logic/Action nodes — skip through
      console.log(`  ⏭️ Skipping: ${nodeSubtype} (${nodeType})`);
      nextIndex++;
    }

    // Calculate rating after any changes
    try { await calculateRating(applicationId); } catch {}

    console.log("\nActions taken:", actionsTaken.join(", "));
    console.log("=== END PIPELINE ===\n");

    return NextResponse.json({
      action: actionsTaken.length > 0 ? "processed" : "no_change",
      actionsTaken,
    });
  } catch (error: any) {
    console.error("Pipeline execution error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ==========================================
// HELPERS
// ==========================================

function getOrderedNodes(nodes: any[], edges: any[]) {
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

  const queue: string[] = [];
  for (const [id, degree] of inDegree.entries()) {
    if (degree === 0) queue.push(id);
  }

  const ordered: any[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const node = nodes.find((n: any) => n.id === current);
    if (node) ordered.push(node);
    for (const next of (adjMap.get(current) || [])) {
      const newDeg = (inDegree.get(next) || 1) - 1;
      inDegree.set(next, newDeg);
      if (newDeg === 0) queue.push(next);
    }
  }

  return ordered;
}

function findCurrentNodeIndex(orderedNodes: any[], status: string): number {
  const statusMap: Record<string, string[]> = {
    APPLIED: ["job_posting"],
    SCREENING: ["ai_resume_screen"],
    ASSESSMENT: ["coding_assessment", "mcq_assessment"],
    AI_INTERVIEW: ["ai_technical_interview", "ai_behavioral_interview"],
    F2F_INTERVIEW: ["f2f_interview", "panel_interview"],
    UNDER_REVIEW: [],
    OFFERED: ["offer"],
    HIRED: ["onboarding"],
  };

  const subtypes = statusMap[status] || [];

  for (let i = 0; i < orderedNodes.length; i++) {
    const subtype = orderedNodes[i].data?.subtype;
    if (subtypes.includes(subtype)) return i;
  }

  // If status is APPLIED, we're at the very start
  if (status === "APPLIED") return 0;

  return -1;
}

async function isStageCompleted(applicationId: string, subtype: string): Promise<boolean> {
  if (subtype === "coding_assessment" || subtype === "mcq_assessment") {
    const sub = await queryOne(
      "SELECT id FROM submissions WHERE application_id = $1 AND status = 'GRADED'",
      [applicationId]
    );
    return !!sub;
  }

  if (subtype === "ai_technical_interview" || subtype === "ai_behavioral_interview") {
    const int = await queryOne(
      "SELECT id FROM ai_interviews WHERE application_id = $1 AND status = 'COMPLETED'",
      [applicationId]
    );
    return !!int;
  }

  return false;
}

async function evaluateFilter(
  filterNode: any,
  applicationId: string,
  jobId: string
): Promise<boolean> {
  const config = filterNode.data?.config || {};
  const subtype = filterNode.data?.subtype;

  const app = await queryOne("SELECT * FROM applications WHERE id = $1", [applicationId]);
  if (!app) return false;

  const submission = await queryOne(
    "SELECT * FROM submissions WHERE application_id = $1 AND status = 'GRADED' LIMIT 1",
    [applicationId]
  );

  const interview = await queryOne(
    "SELECT * FROM ai_interviews WHERE application_id = $1 AND status = 'COMPLETED' LIMIT 1",
    [applicationId]
  );

  const resumeScore = app.resume_score || 0;
  const assessmentScore = submission ? parseFloat(submission.percentage) || 0 : 0;
  const interviewScore = interview ? parseFloat(interview.overall_score) || 0 : 0;
  const latestScore = interviewScore || assessmentScore || resumeScore;

  console.log(`    Filter ${subtype}: resume=${resumeScore} assess=${assessmentScore} interview=${interviewScore} latest=${latestScore}`);

  switch (subtype) {
    case "score_gate":
      return latestScore >= (config.minScore || 70);

    case "top_n": {
      const allApps = await queryMany(
        `SELECT a.id, a.resume_score,
          (SELECT percentage FROM submissions WHERE application_id = a.id AND status = 'GRADED' LIMIT 1) as ascore,
          (SELECT overall_score FROM ai_interviews WHERE application_id = a.id AND status = 'COMPLETED' LIMIT 1) as iscore
         FROM applications a WHERE a.job_id = $1 AND a.status NOT IN ('REJECTED','WITHDRAWN')`,
        [jobId]
      );
      const scored = allApps.map((a: any) => ({
        id: a.id,
        score: parseFloat(a.iscore) || parseFloat(a.ascore) || parseFloat(a.resume_score) || 0,
      })).sort((a: any, b: any) => b.score - a.score);

      const topN = scored.slice(0, config.n || 50);
      return topN.some((a: any) => a.id === applicationId);
    }

    case "percentage": {
      const allApps = await queryMany(
        `SELECT a.id, a.resume_score,
          (SELECT percentage FROM submissions WHERE application_id = a.id AND status = 'GRADED' LIMIT 1) as ascore
         FROM applications a WHERE a.job_id = $1 AND a.status NOT IN ('REJECTED','WITHDRAWN')`,
        [jobId]
      );
      const scored = allApps.map((a: any) => ({
        id: a.id,
        score: parseFloat(a.ascore) || parseFloat(a.resume_score) || 0,
      })).sort((a: any, b: any) => b.score - a.score);

      const n = Math.max(Math.ceil(scored.length * ((config.percentage || 25) / 100)), config.minPass || 1);
      return scored.slice(0, n).some((a: any) => a.id === applicationId);
    }

    case "hybrid": {
      if (latestScore >= (config.fastTrackThreshold || 85)) return true;

      const allApps = await queryMany(
        `SELECT a.id, a.resume_score,
          (SELECT percentage FROM submissions WHERE application_id = a.id AND status = 'GRADED' LIMIT 1) as ascore
         FROM applications a WHERE a.job_id = $1 AND a.status NOT IN ('REJECTED','WITHDRAWN')`,
        [jobId]
      );
      const scored = allApps.map((a: any) => ({
        id: a.id,
        score: parseFloat(a.ascore) || parseFloat(a.resume_score) || 0,
      })).sort((a: any, b: any) => b.score - a.score);

      return scored.slice(0, config.batchN || 40).some((a: any) => a.id === applicationId);
    }

    case "human_approval":
      return true; // Passes — HR decides manually

    case "multi_criteria": {
      const rules = config.rules || [];
      const mode = config.mode || "all";
      const values: Record<string, number> = { resume_score: resumeScore, assessment_score: assessmentScore, interview_score: interviewScore };
      const results = rules.map((r: any) => {
        const v = values[r.field] || 0;
        if (r.operator === "gte") return v >= r.value;
        if (r.operator === "lte") return v <= r.value;
        return v === r.value;
      });
      return mode === "all" ? results.every(Boolean) : results.some(Boolean);
    }

    default:
      return true;
  }
}

function subtypeToStatus(subtype: string): string | null {
  const map: Record<string, string> = {
    ai_resume_screen: "SCREENING",
    coding_assessment: "ASSESSMENT",
    mcq_assessment: "ASSESSMENT",
    ai_technical_interview: "AI_INTERVIEW",
    ai_behavioral_interview: "AI_INTERVIEW",
    f2f_interview: "F2F_INTERVIEW",
    panel_interview: "F2F_INTERVIEW",
  };
  return map[subtype] || null;
}

function getStageLabel(subtype: string): string {
  const map: Record<string, string> = {
    ai_resume_screen: "Resume Review",
    coding_assessment: "Coding Challenge",
    mcq_assessment: "Technical Quiz",
    ai_technical_interview: "AI Technical Interview",
    ai_behavioral_interview: "AI Behavioral Interview",
    f2f_interview: "Team Interview",
    panel_interview: "Panel Interview",
  };
  return map[subtype] || subtype;
}

async function createNotification(
  userId: string, type: string, title: string, message: string, link: string
) {
  try {
    await query(
      `INSERT INTO notifications (user_id, type, title, message, link)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, type, title, message, link]
    );
  } catch (err) {
    console.error("Notification creation failed:", err);
  }
}