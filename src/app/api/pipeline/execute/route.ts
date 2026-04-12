import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, queryMany } from "@/lib/db";
import { trackUsage } from "@/lib/billing";
import { getUserCompanyId } from "@/lib/company";

// Import these dynamically to avoid circular dependencies
async function calculateRating(applicationId: string) {
  const mod = await import("../../ratings/route");
  return mod.calculateRating(applicationId);
}

async function generateFeedback(applicationId: string) {
  const mod = await import("../../feedback/route");
  return mod.generateFeedback(applicationId);
}

// ==========================================
// MAIN PIPELINE EXECUTOR
// ==========================================

export async function POST(req: NextRequest) {
  
  try {
    const { applicationId, trigger } = await req.json();

    console.log("\n=== PIPELINE EXECUTION ===");
    console.log("Application:", applicationId, "Trigger:", trigger);

    const validTriggers = [
      "application_submitted",
      "assessment_completed",
      "interview_completed",
      "f2f_completed",
      "seed_application",
    ];
    if (trigger && !validTriggers.includes(trigger)) {
      console.log("Skipping — invalid trigger:", trigger);
      return NextResponse.json({ action: "skipped", reason: `Trigger "${trigger}" not auto-executable` });
    }
    // Get application + job + pipeline
    const application = await queryOne(
      `SELECT a.*, j.pipeline_id, j.title as job_title, j.id as job_id,
        u.first_name as candidate_first_name
       FROM applications a
       JOIN jobs j ON a.job_id = j.id
       LEFT JOIN users u ON a.candidate_id = u.id
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
    console.log("Pipeline:", orderedNodes.map((n: any) => `${n.data?.subtype}(${n.data?.type})`).join(" → "));

    // Find current position
    const currentStatus = application.status;
    console.log("Current status:", currentStatus);

    const currentNodeIndex = findCurrentNodeIndex(orderedNodes, currentStatus);
    console.log("Current node index:", currentNodeIndex, "of", orderedNodes.length);

    // Process from current position forward
    let nextIndex = currentNodeIndex + 1;
    const actionsTaken: string[] = [];

    while (nextIndex < orderedNodes.length) {
      const node = orderedNodes[nextIndex];
      const nodeType = node.data?.type;
      const nodeSubtype = node.data?.subtype;

      console.log(`\n  [${nextIndex}] Processing: ${nodeSubtype} (${nodeType})`);

      // ==========================================
      // STAGE NODES
      // ==========================================
      if (nodeType === "stage") {
        const stageStatus = subtypeToStatus(nodeSubtype);
        const isCompleted = await isStageCompleted(applicationId, nodeSubtype);

        if (isCompleted) {
          console.log(`  ✅ Already completed: ${nodeSubtype}`);
          nextIndex++;
          continue;
        }

        // AI Resume Screen — auto-completes (scoring done during application)
        if (nodeSubtype === "ai_resume_screen") {
          const resumeScore = parseFloat(application.resume_score) || 0;
          console.log(`  📄 Resume Screen: score = ${resumeScore}%`);

          await query(
            `UPDATE applications
             SET status = 'SCREENING', current_stage = $2, updated_at = NOW()
             WHERE id = $1 AND status IN ('APPLIED', 'SCREENING')`,
            [applicationId, nodeSubtype]
          );

          actionsTaken.push(`screened:${resumeScore}`);
          nextIndex++;
          continue;
        }

        // Coding/MCQ Assessment — candidate needs to take it
       if (nodeSubtype === "coding_assessment") {
          console.log(`  ⏸️ Waiting for candidate: coding_assessment`);
          if (stageStatus) {
            await query(
              "UPDATE applications SET status = $2, current_stage = $3, updated_at = NOW() WHERE id = $1",
              [applicationId, stageStatus, nodeSubtype]
            );
            await createNotification(
              application.candidate_id,
              "ASSESSMENT_AVAILABLE",
              "📝 Coding Challenge Ready",
              `Your coding challenge for ${application.job_title} is ready. Complete it to advance.`,
              "/applications"
            );
            actionsTaken.push(`waiting:${stageStatus}`);
          }
          break;
        }

        // MCQ Assessment — candidate must take it
        if (nodeSubtype === "mcq_assessment") {
          console.log(`  ⏸️ Waiting for candidate: mcq_assessment`);
          if (stageStatus) {
            await query(
              "UPDATE applications SET status = $2, current_stage = $3, updated_at = NOW() WHERE id = $1",
              [applicationId, stageStatus, nodeSubtype]
            );
            await createNotification(
              application.candidate_id,
              "ASSESSMENT_AVAILABLE",
              "📝 Quiz Ready",
              `Your knowledge quiz for ${application.job_title} is ready. Complete it to advance.`,
              "/applications"
            );
            actionsTaken.push(`waiting:${stageStatus}`);
          }
          break;
        }

        // AI Interview — candidate needs to take it
        if (nodeSubtype === "ai_technical_interview" || nodeSubtype === "ai_behavioral_interview") {
          if (stageStatus) {
            console.log(`  ➡️ Waiting for candidate: ${nodeSubtype}`);
            await query(
              "UPDATE applications SET status = $2, current_stage = $3, updated_at = NOW() WHERE id = $1",
              [applicationId, stageStatus, nodeSubtype]
            );

            await createNotification(
              application.candidate_id,
              "STAGE_ADVANCED",
              "🤖 AI Interview Ready",
              `Your AI interview for ${application.job_title} is ready. Start when you're prepared.`,
              "/applications"
            );

            actionsTaken.push(`waiting:${stageStatus}`);
          }
          break; // STOP — candidate needs to complete
        }

        // F2F Interview — HR needs to schedule
        if (nodeSubtype === "f2f_interview" || nodeSubtype === "panel_interview") {
          if (stageStatus) {
            console.log(`  ➡️ Waiting for HR to schedule: ${nodeSubtype}`);
            await query(
              "UPDATE applications SET status = $2, current_stage = $3, updated_at = NOW() WHERE id = $1",
              [applicationId, stageStatus, nodeSubtype]
            );

            // Notify HR
            const hr = await queryOne("SELECT posted_by FROM jobs WHERE id = $1", [application.job_id]);
            if (hr?.posted_by) {
              await createNotification(
                hr.posted_by,
                "STAGE_ADVANCED",
                "📅 Schedule Interview",
                `${application.candidate_first_name || "A candidate"} is ready for F2F interview for ${application.job_title}.`,
                `/hr/jobs/${application.job_id}`
              );
            }

            await createNotification(
              application.candidate_id,
              "STAGE_ADVANCED",
              "🎯 Moving Forward!",
              `You've advanced to the interview stage for ${application.job_title}! The team will schedule your interview soon.`,
              "/applications"
            );

            actionsTaken.push(`waiting:${stageStatus}`);
          }
          break; // STOP — HR needs to schedule
        }

        // Any other stage — advance
        if (stageStatus) {
          console.log(`  ➡️ Advancing to: ${stageStatus}`);
          await query(
            "UPDATE applications SET status = $2, current_stage = $3, updated_at = NOW() WHERE id = $1",
            [applicationId, stageStatus, nodeSubtype]
          );

          await createNotification(
            application.candidate_id,
            "STAGE_ADVANCED",
            `Next: ${getStageLabel(nodeSubtype)}`,
            `Your application for ${application.job_title} has advanced to ${getStageLabel(nodeSubtype)}.`,
            "/applications"
          );

          actionsTaken.push(`advanced:${stageStatus}`);
        }
        break;
      }

      // ==========================================
      // FILTER NODES
      // ==========================================
      if (nodeType === "filter") {
        const passed = await evaluateFilter(node, applicationId, application.job_id);

        if (!passed) {
          console.log(`  ❌ REJECTED by filter: ${nodeSubtype}`);

          await query(
            "UPDATE applications SET status = 'REJECTED', updated_at = NOW() WHERE id = $1",
            [applicationId]
          );

          try { await calculateRating(applicationId); } catch (e) { console.error("Rating failed:", e); }
          try { await generateFeedback(applicationId); } catch (e) { console.error("Feedback failed:", e); }

          await createNotification(
            application.candidate_id,
            "REJECTION",
            "Application Update",
            `Thank you for applying to ${application.job_title}. We have personalized feedback for you.`,
            `/feedback/${applicationId}`
          );

          actionsTaken.push(`rejected:${nodeSubtype}`);

          console.log("\nActions:", actionsTaken.join(", "));
          console.log("=== END PIPELINE ===\n");

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

          console.log("\nActions:", actionsTaken.join(", "));
          console.log("=== END PIPELINE ===\n");

          return NextResponse.json({ action: "offered", actionsTaken });
        }

        if (nodeSubtype === "rejection") {
          console.log("  ❌ Rejection node");
          await query(
            "UPDATE applications SET status = 'REJECTED', updated_at = NOW() WHERE id = $1",
            [applicationId]
          );

          try { await calculateRating(applicationId); } catch {}
          try { await generateFeedback(applicationId); } catch {}

          actionsTaken.push("rejected:exit_node");

          console.log("\nActions:", actionsTaken.join(", "));
          console.log("=== END PIPELINE ===\n");

          return NextResponse.json({ action: "rejected", actionsTaken });
        }

        if (nodeSubtype === "onboarding") {
          await query(
            "UPDATE applications SET status = 'HIRED', updated_at = NOW() WHERE id = $1",
            [applicationId]
          );
          actionsTaken.push("hired");
          break;
        }

        break;
      }

      // Logic/Action nodes — skip through
      console.log(`  ⏭️ Skipping: ${nodeSubtype} (${nodeType})`);
      nextIndex++;
    }

    // Calculate rating after any changes
    try { await calculateRating(applicationId); } catch {}

    console.log("\nActions:", actionsTaken.join(", ") || "none");
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
// NODE ORDERING — Topological Sort
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

// ==========================================
// FIND CURRENT POSITION IN PIPELINE
// ==========================================

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

  if (status === "APPLIED") return 0;
  if (status === "SCREENING") return 1;

  return -1;
}

// ==========================================
// STAGE COMPLETION CHECK
// ==========================================

async function isStageCompleted(applicationId: string, subtype: string): Promise<boolean> {
  if (subtype === "ai_resume_screen") {
    const app = await queryOne(
      "SELECT resume_score FROM applications WHERE id = $1",
      [applicationId]
    );
    return app?.resume_score !== null && app?.resume_score !== undefined;
  }

  if (subtype === "coding_assessment" || subtype === "mcq_assessment") {
    // Check for a GRADED submission specifically for this application
    const sub = await queryOne(
      `SELECT id, status FROM submissions 
       WHERE application_id = $1 AND status = 'GRADED'
       LIMIT 1`,
      [applicationId]
    );
    return !!sub;
  }

  if (subtype === "ai_technical_interview" || subtype === "ai_behavioral_interview") {
    const int = await queryOne(
      `SELECT id, status FROM ai_interviews 
       WHERE application_id = $1 AND status = 'COMPLETED'
       LIMIT 1`,
      [applicationId]
    );
    return !!int;
  }

  if (subtype === "f2f_interview" || subtype === "panel_interview") {
    const f2f = await queryOne(
      `SELECT id, status FROM f2f_interviews 
       WHERE application_id = $1 AND status = 'COMPLETED'
       LIMIT 1`,
      [applicationId]
    );
    return !!f2f;
  }

  return false;
}

// ==========================================
// FILTER EVALUATION — ALL SCORES AS PERCENTAGES
// ==========================================

async function evaluateFilter(
  filterNode: any,
  applicationId: string,
  jobId: string
): Promise<boolean> {
  const config = filterNode.data?.config || {};
  const subtype = filterNode.data?.subtype;

  const app = await queryOne("SELECT * FROM applications WHERE id = $1", [applicationId]);
  if (!app) {
    console.log("    ❌ Application not found");
    return false;
  }

  const submission = await queryOne(
    "SELECT * FROM submissions WHERE application_id = $1 AND status = 'GRADED' ORDER BY percentage DESC LIMIT 1",
    [applicationId]
  );

  const interview = await queryOne(
    "SELECT * FROM ai_interviews WHERE application_id = $1 AND status = 'COMPLETED' ORDER BY overall_score DESC LIMIT 1",
    [applicationId]
  );

  // ALL scores as PERCENTAGES (0-100)
  const resumeScore = parseFloat(app.resume_score) || 0;

  // Assessment — use percentage, NOT raw score
  let assessmentScore = 0;
  if (submission) {
    const pct = parseFloat(submission.percentage);
    const total = parseFloat(submission.total_score);
    const max = parseFloat(submission.max_score);

    if (pct > 0) {
      assessmentScore = pct;
    } else if (max > 0) {
      assessmentScore = (total / max) * 100;
    }
  }

  // Interview — already 0-100
  const interviewScore = interview ? parseFloat(interview.overall_score) || 0 : 0;

  // Choose which score based on config
  let scoreToEvaluate = 0;

  if (config.scoreSource === "resume_score") {
    scoreToEvaluate = resumeScore;
  } else if (config.scoreSource === "assessment_score") {
    scoreToEvaluate = assessmentScore;
  } else if (config.scoreSource === "interview_score") {
    scoreToEvaluate = interviewScore;
  } else {
    // Default: most recent completed stage percentage
    scoreToEvaluate = interviewScore || assessmentScore || resumeScore;
  }

  console.log("    ┌── FILTER ─────────────────────────────");
  console.log(`    │ Type: ${subtype}`);
  console.log(`    │ Resume: ${resumeScore}%`);
  console.log(`    │ Assessment: ${assessmentScore}% (raw: ${submission?.total_score || 0}/${submission?.max_score || 0})`);
  console.log(`    │ Interview: ${interviewScore}%`);
  console.log(`    │ Source: ${config.scoreSource || "auto (latest)"}`);
  console.log(`    │ Evaluating: ${scoreToEvaluate}%`);

  let passed = false;

  switch (subtype) {
    case "score_gate": {
      const minScore = parseFloat(config.minScore) || 70;
      passed = scoreToEvaluate >= minScore;
      console.log(`    │ Gate: ${scoreToEvaluate}% >= ${minScore}% → ${passed ? "✅" : "❌"}`);
      break;
    }

    case "top_n": {
      const allScores = await getAllCandidatePercentages(jobId);
      const n = parseInt(config.n) || 50;
      const sorted = allScores.sort((a, b) => b.score - a.score);
      const topN = sorted.slice(0, n);
      passed = topN.some((a) => a.id === applicationId);
      const cutoff = topN.length > 0 ? topN[topN.length - 1].score : 0;
      console.log(`    │ Top-${n}: ${sorted.length} candidates, cutoff=${cutoff}%`);
      console.log(`    │ This: ${scoreToEvaluate}% → ${passed ? "✅" : "❌"}`);
      break;
    }

    case "percentage": {
      const allScores = await getAllCandidatePercentages(jobId);
      const sorted = allScores.sort((a, b) => b.score - a.score);
      const pct = parseFloat(config.percentage) || 25;
      const minPass = parseInt(config.minPass) || 1;
      const n = Math.max(Math.ceil(sorted.length * (pct / 100)), minPass);
      passed = sorted.slice(0, n).some((a) => a.id === applicationId);
      console.log(`    │ Top ${pct}%: n=${n} of ${sorted.length} → ${passed ? "✅" : "❌"}`);
      break;
    }

    case "hybrid": {
      const threshold = parseFloat(config.fastTrackThreshold) || 85;
      if (scoreToEvaluate >= threshold) {
        passed = true;
        console.log(`    │ Hybrid: Fast-track ${scoreToEvaluate}% >= ${threshold}% → ✅`);
      } else {
        const allScores = await getAllCandidatePercentages(jobId);
        const sorted = allScores.sort((a, b) => b.score - a.score);
        const batchN = parseInt(config.batchN) || 40;
        passed = sorted.slice(0, batchN).some((a) => a.id === applicationId);
        console.log(`    │ Hybrid: Batch top-${batchN} → ${passed ? "✅" : "❌"}`);
      }
      break;
    }

    case "human_approval":
      passed = true;
      console.log("    │ Human approval: auto-pass (HR decides)");
      break;

    case "multi_criteria": {
      const rules = config.rules || [];
      const mode = config.mode || "all";
      const values: Record<string, number> = {
        resume_score: resumeScore,
        assessment_score: assessmentScore,
        interview_score: interviewScore,
      };
      const results = rules.map((r: any) => {
        const v = values[r.field] || 0;
        let result = false;
        if (r.operator === "gte") result = v >= parseFloat(r.value);
        else if (r.operator === "lte") result = v <= parseFloat(r.value);
        else result = v === parseFloat(r.value);
        console.log(`    │ ${r.field}(${v}%) ${r.operator} ${r.value} = ${result}`);
        return result;
      });
      passed = mode === "all" ? results.every(Boolean) : results.some(Boolean);
      console.log(`    │ Multi (${mode}) → ${passed ? "✅" : "❌"}`);
      break;
    }

    default:
      passed = true;
      console.log(`    │ Unknown: ${subtype} → auto-pass`);
  }

  console.log("    └──────────────────────────────────────");
  return passed;
}

// ==========================================
// GET ALL CANDIDATE PERCENTAGE SCORES
// ==========================================

async function getAllCandidatePercentages(jobId: string) {
  const allApps = await queryMany(
    `SELECT
      a.id,
      COALESCE(a.resume_score, 0)::float as resume_score,
      (
        SELECT CASE
          WHEN s.max_score > 0 AND s.percentage > 0 THEN s.percentage
          WHEN s.max_score > 0 THEN (s.total_score::float / s.max_score) * 100
          ELSE 0
        END
        FROM submissions s
        WHERE s.application_id = a.id AND s.status = 'GRADED'
        ORDER BY
          CASE WHEN s.max_score > 0 THEN (s.total_score::float / s.max_score) ELSE 0 END DESC
        LIMIT 1
      ) as assessment_pct,
      (
        SELECT COALESCE(overall_score, 0)::float
        FROM ai_interviews
        WHERE application_id = a.id AND status = 'COMPLETED'
        ORDER BY overall_score DESC
        LIMIT 1
      ) as interview_pct
     FROM applications a
     WHERE a.job_id = $1 AND a.status NOT IN ('REJECTED', 'WITHDRAWN')`,
    [jobId]
  );

  return allApps.map((a: any) => {
    const resume = parseFloat(a.resume_score) || 0;
    const assessment = parseFloat(a.assessment_pct) || 0;
    const interview = parseFloat(a.interview_pct) || 0;
    const score = interview || assessment || resume;
    return { id: a.id, score, resume, assessment, interview };
  });
}

// ==========================================
// HELPERS
// ==========================================

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
  userId: string,
  type: string,
  title: string,
  message: string,
  link: string
) {
  try {
    await query(
      `INSERT INTO notifications (user_id, type, title, message, link)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, type, title, message, link]
    );
  } catch (err) {
    console.error("Notification failed:", err);
  }
}