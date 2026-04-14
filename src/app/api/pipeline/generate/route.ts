export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { aiJSON } from "@/lib/ai";
import { NODE_CATALOG, NodeCatalogItem } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (
      !session ||
      !["HR", "ADMIN"].includes((session.user as any).role)
    ) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { prompt } = await req.json();

    if (!prompt || prompt.trim().length < 10) {
      return NextResponse.json(
        {
          error:
            "Please describe the hiring process you need (at least 10 characters)",
        },
        { status: 400 }
      );
    }

    console.log("=== AI PIPELINE GENERATION ===");
    console.log("Prompt:", prompt);

    // Build dynamic node reference from actual catalog
    const stageNodes = NODE_CATALOG.filter((n) => n.category === "stage");
    const filterNodes = NODE_CATALOG.filter((n) => n.category === "filter");
    const actionNodes = NODE_CATALOG.filter((n) => n.category === "action");

    const stageRef = stageNodes
      .map(
        (n) =>
          `- ${n.subtype}: ${n.description}. Cost: $${n.costPerUnit}. Default config: ${JSON.stringify(n.defaultConfig)}`
      )
      .join("\n");

    const filterRef = filterNodes
      .map(
        (n) =>
          `- ${n.subtype}: ${n.description}. FREE. Default config keys: ${Object.keys(n.defaultConfig).join(", ")}`
      )
      .join("\n");

    const actionRef = actionNodes
      .map((n) => `- ${n.subtype}: ${n.description}. Cost: $${n.costPerUnit}`)
      .join("\n");

    const result = await aiJSON<{
      name: string;
      description: string;
      steps: {
        type: "stage" | "filter" | "action";
        subtype: string;
        label: string;
        config: Record<string, any>;
      }[];
      estimatedApplicants: number;
      reasoning: string;
    }>(
      `You are an expert hiring pipeline designer for Hirasys, an AI-powered hiring platform.

Given an HR's description, design a complete hiring pipeline as a FLAT ORDERED LIST of steps.
The system will automatically add a "Job Posting" source at the start and an "Extend Offer" exit at the end.
You must NOT include those — only design the middle steps.

═══════════════════════════════════════
AVAILABLE STAGE NODES (type: "stage"):
═══════════════════════════════════════
${stageRef}

═══════════════════════════════════════
AVAILABLE FILTER NODES (type: "filter") — ALL FREE:
═══════════════════════════════════════
${filterRef}

═══════════════════════════════════════
AVAILABLE ACTION NODES (type: "action") — optional, add between stages:
═══════════════════════════════════════
${actionRef}

═══════════════════════════════════════
BANNED — DO NOT USE THESE AS STEPS:
═══════════════════════════════════════
- "job_posting" (added automatically as source)
- "offer" (added automatically as exit)
- "rejection" (added automatically as exit)
- "onboarding" (added automatically as exit)
- "archive" (added automatically as exit)
- Any made-up subtype not listed above
- Do NOT create steps with labels like "Job Offer", "Extend Offer", "Final Decision", "Hire Candidate", "Onboarding"

═══════════════════════════════════════
STRUCTURAL RULES:
═══════════════════════════════════════
1. FIRST step MUST be: { type: "stage", subtype: "ai_resume_screen" }
2. SECOND step MUST be a filter (score_gate recommended, minScore 50-65)
3. After EVERY stage node, add a filter node to eliminate low performers
4. NEVER put two stage nodes in a row without a filter between them
5. NEVER put two filter nodes in a row
6. LAST step must be a stage (e.g., f2f_interview or panel_interview) — NOT a filter
7. Action nodes (send_email, notification) can be inserted anywhere without breaking the stage→filter alternation
8. Use 5-10 steps total (stages + filters + optional actions)

═══════════════════════════════════════
INTERVIEW TYPE LOGIC:
═══════════════════════════════════════
- TECHNICAL roles (developer, engineer, SDE, data scientist, DevOps, backend, frontend, fullstack):
  → Use coding_assessment + ai_technical_interview
  → ai_technical_interview config: { interviewMode: "technical", difficulty: "progressive", adaptive: true, useResumeContext: true }

- NON-TECHNICAL roles (product manager, designer, marketing, HR, sales, support, recruiter, analyst):
  → Use mcq_assessment + ai_behavioral_interview
  → ai_behavioral_interview config: { interviewMode: "behavioral", difficulty: "progressive", adaptive: true, useResumeContext: true }
  → Do NOT use coding_assessment or ai_technical_interview

- MIXED/LEADERSHIP roles (tech lead, engineering manager, CTO, VP Engineering):
  → Use coding_assessment + ai_technical_interview + ai_behavioral_interview
  → Or use ai_technical_interview with interviewMode: "mixed"

- If user says "behavioral", "soft skills", "culture fit", "no technical":
  → MUST use ai_behavioral_interview, NOT ai_technical_interview

═══════════════════════════════════════
FILTER CONFIGURATION GUIDANCE:
═══════════════════════════════════════
- After ai_resume_screen: score_gate { minScore: 50-60, scoreSource: "resume_score" } — lenient
- After coding_assessment: score_gate { minScore: 60-70, scoreSource: "assessment_score" }
- After mcq_assessment: score_gate { minScore: 55-65, scoreSource: "assessment_score" }
- After ai_technical_interview: score_gate { minScore: 65-75, scoreSource: "interview_score" } or percentage { percentage: 30-50 }
- After ai_behavioral_interview: score_gate { minScore: 60-70, scoreSource: "interview_score" }
- Before final stage: top_n { n: 10-30 } or percentage { percentage: 20-40 } to narrow the field
- Use hybrid filter for high-volume roles (500+ applicants)
- Use human_approval before final interview for senior/executive roles

═══════════════════════════════════════
ASSESSMENT CONFIGURATION:
═══════════════════════════════════════
- coding_assessment: { duration: 60-120, difficulty: "easy"|"medium"|"hard", questionCount: 2-5, languages: ["javascript","python","sql","typescript"], questionMode: "auto" }
- mcq_assessment: { duration: 20-45, difficulty: "easy"|"medium"|"hard", questionCount: 15-30, questionMode: "auto" }
- Always set questionMode: "auto" so questions are generated from the job description

═══════════════════════════════════════
EXAMPLE OUTPUT for "Senior React Developer":
═══════════════════════════════════════
{
  "name": "Senior React Developer Pipeline",
  "description": "Technical pipeline for experienced React engineers",
  "steps": [
    { "type": "stage", "subtype": "ai_resume_screen", "label": "Resume Screening", "config": { "criteria": ["skills_match", "experience", "education"] } },
    { "type": "filter", "subtype": "score_gate", "label": "Resume Filter", "config": { "minScore": 55, "scoreSource": "resume_score" } },
    { "type": "stage", "subtype": "coding_assessment", "label": "React Coding Challenge", "config": { "duration": 90, "difficulty": "medium", "questionCount": 3, "languages": ["javascript", "typescript"], "questionMode": "auto" } },
    { "type": "filter", "subtype": "score_gate", "label": "Coding Score Gate", "config": { "minScore": 65, "scoreSource": "assessment_score" } },
    { "type": "stage", "subtype": "ai_technical_interview", "label": "Technical Deep Dive", "config": { "maxQuestions": 10, "duration": 30, "difficulty": "progressive", "interviewMode": "technical", "adaptive": true, "useResumeContext": true } },
    { "type": "filter", "subtype": "percentage", "label": "Top 30% Filter", "config": { "percentage": 30, "rankBy": "interview_score" } },
    { "type": "action", "subtype": "send_email", "label": "Interview Invite Email", "config": { "emailType": "ai_personalized" } },
    { "type": "stage", "subtype": "f2f_interview", "label": "Team Interview", "config": { "duration": 60, "interviewType": "technical" } }
  ],
  "estimatedApplicants": 300,
  "reasoning": "This is a senior technical role. We start with AI resume screening, then a coding challenge to test practical React/JS skills, followed by an adaptive AI technical interview covering system design and algorithms. A percentage filter narrows to the top 30% before the final team interview."
}

RESPOND WITH ONLY THE JSON OBJECT. No markdown, no code blocks, no explanation outside the JSON.`,
      `Design a hiring pipeline for:\n\n"${prompt}"\n\nChoose the right interview types based on whether this is technical, non-technical, or mixed. Alternate between stages and filters. End with a stage, not a filter.`
    );

    console.log("AI generated:", result.name);
    console.log(
      "Raw steps:",
      result.steps?.map((s) => `${s.type}:${s.subtype}`).join(" → ")
    );

    // Validate and clean
    const cleanedSteps = validateAndCleanSteps(result.steps || []);

    console.log(
      "Cleaned:",
      cleanedSteps
        .map(
          (s) =>
            `${s.type === "filter" ? "⚡" : s.type === "action" ? "📧" : "📦"} ${s.subtype}`
        )
        .join(" → ")
    );

    // Convert to React Flow
    const { nodes, edges } = convertToReactFlow(cleanedSteps);

    return NextResponse.json({
      success: true,
      pipeline: {
        name: result.name,
        description: result.description,
        reasoning: result.reasoning,
        estimatedApplicants: result.estimatedApplicants || 500,
      },
      nodes,
      edges,
    });
  } catch (error: any) {
    console.error("Pipeline generation error:", error);
    return NextResponse.json(
      { error: `Generation failed: ${error.message}` },
      { status: 500 }
    );
  }
}

// ==========================================
// VALID SUBTYPES — derived from actual catalog
// ==========================================

const VALID_SUBTYPES_BY_TYPE: Record<string, Set<string>> = {
  stage: new Set(
    NODE_CATALOG.filter((n) => n.category === "stage").map((n) => n.subtype)
  ),
  filter: new Set(
    NODE_CATALOG.filter((n) => n.category === "filter").map((n) => n.subtype)
  ),
  action: new Set(
    NODE_CATALOG.filter((n) => n.category === "action").map((n) => n.subtype)
  ),
  logic: new Set(
    NODE_CATALOG.filter((n) => n.category === "logic").map((n) => n.subtype)
  ),
};

// All valid subtypes the AI can use
const ALL_VALID_SUBTYPES = new Set([
  ...VALID_SUBTYPES_BY_TYPE.stage,
  ...VALID_SUBTYPES_BY_TYPE.filter,
  ...VALID_SUBTYPES_BY_TYPE.action,
  ...VALID_SUBTYPES_BY_TYPE.logic,
]);

// Subtypes that are auto-added (source/exit) — AI must NOT use these
const AUTO_SUBTYPES = new Set([
  "job_posting",
  "referral_import",
  "bulk_upload",
  "offer",
  "rejection",
  "onboarding",
  "archive",
]);

// Labels that suggest the AI hallucinated an exit node as a stage
const BANNED_LABEL_PATTERNS = [
  "offer",
  "extend offer",
  "job offer",
  "make offer",
  "final decision",
  "hire candidate",
  "onboarding",
  "start onboarding",
  "rejection",
  "reject",
  "archive",
];

// ==========================================
// VALIDATE & CLEAN AI OUTPUT
// ==========================================

interface CleanStep {
  type: "stage" | "filter" | "action";
  subtype: string;
  label: string;
  config: Record<string, any>;
}

function validateAndCleanSteps(rawSteps: any[]): CleanStep[] {
  const cleaned: CleanStep[] = [];

  for (const step of rawSteps) {
    if (!step || !step.subtype) continue;

    const subtype = step.subtype.toLowerCase().trim();
    const label = (step.label || "").trim();
    const labelLower = label.toLowerCase();

    // ── SKIP: auto-added subtypes ──
    if (AUTO_SUBTYPES.has(subtype)) {
      console.log(
        `  ⛔ Removed auto-subtype: "${label}" (${subtype})`
      );
      continue;
    }

    // ── SKIP: hallucinated exit-like labels on non-exit nodes ──
    if (
      BANNED_LABEL_PATTERNS.some(
        (pattern) =>
          labelLower === pattern ||
          labelLower.startsWith(pattern + " ") ||
          labelLower.endsWith(" " + pattern)
      )
    ) {
      // Only skip if subtype isn't a legit stage
      if (!VALID_SUBTYPES_BY_TYPE.stage.has(subtype)) {
        console.log(
          `  ⛔ Removed hallucinated node: "${label}" (${subtype})`
        );
        continue;
      }
      // If it IS a valid stage subtype but has a bad label, fix the label
      console.log(
        `  🔧 Fixing bad label: "${label}" → using catalog label for ${subtype}`
      );
      const catalog = NODE_CATALOG.find((n) => n.subtype === subtype);
      step.label = catalog?.label || subtype.replace(/_/g, " ");
    }

    // ── SKIP: unknown subtypes ──
    if (!ALL_VALID_SUBTYPES.has(subtype)) {
      console.log(`  ⚠️ Unknown subtype: "${subtype}" — skipped`);
      continue;
    }

    // ── Determine correct type from catalog ──
    let type: "stage" | "filter" | "action";
    if (VALID_SUBTYPES_BY_TYPE.stage.has(subtype)) {
      type = "stage";
    } else if (VALID_SUBTYPES_BY_TYPE.filter.has(subtype)) {
      type = "filter";
    } else if (VALID_SUBTYPES_BY_TYPE.action.has(subtype)) {
      type = "action";
    } else if (VALID_SUBTYPES_BY_TYPE.logic.has(subtype)) {
      // Treat logic nodes as action (pass-through) for linear pipelines
      type = "action";
    } else {
      continue;
    }

    // ── SKIP: duplicate subtype in a row ──
    const last = cleaned[cleaned.length - 1];
    if (last && last.subtype === subtype) {
      console.log(`  ⚠️ Duplicate subtype: ${subtype} — skipped`);
      continue;
    }

    // ── FIX: two stages in a row → insert default filter ──
    if (type === "stage" && last?.type === "stage") {
      console.log(
        `  🔧 Missing filter before "${label}" — inserting score_gate`
      );

      // Choose appropriate scoreSource based on previous stage
      let scoreSource = "auto";
      if (last.subtype === "ai_resume_screen")
        scoreSource = "resume_score";
      else if (
        last.subtype === "coding_assessment" ||
        last.subtype === "mcq_assessment" ||
        last.subtype === "subjective_assessment"
      )
        scoreSource = "assessment_score";
      else if (
        last.subtype === "ai_technical_interview" ||
        last.subtype === "ai_behavioral_interview"
      )
        scoreSource = "interview_score";

      cleaned.push({
        type: "filter",
        subtype: "score_gate",
        label: `${last.label} Filter`,
        config: { minScore: 60, scoreSource },
      });
    }

    // ── FIX: two filters in a row → skip the second ──
    if (type === "filter") {
      const lastNonAction = [...cleaned]
        .reverse()
        .find((s) => s.type !== "action");
      if (lastNonAction?.type === "filter") {
        console.log(
          `  ⚠️ Two filters in a row: "${label}" — skipped`
        );
        continue;
      }
    }

    // ── Get catalog defaults ──
    const catalog = NODE_CATALOG.find((n) => n.subtype === subtype);

    cleaned.push({
      type,
      subtype,
      label: step.label || catalog?.label || subtype.replace(/_/g, " "),
      config: {
        ...(catalog?.defaultConfig || {}),
        ...(step.config || {}),
      },
    });
  }

  // ==========================================
  // POST-PROCESSING: Ensure structure is valid
  // ==========================================

  // 1. Must start with ai_resume_screen
  if (
    cleaned.length === 0 ||
    cleaned[0].subtype !== "ai_resume_screen"
  ) {
    const catalog = NODE_CATALOG.find(
      (n) => n.subtype === "ai_resume_screen"
    )!;
    cleaned.unshift({
      type: "stage",
      subtype: "ai_resume_screen",
      label: "Resume Screening",
      config: {
        ...catalog.defaultConfig,
        criteria: ["skills_match", "experience", "education"],
      },
    });
  }

  // 2. Must have a filter after resume screen (position 1)
  if (cleaned.length >= 2 && cleaned[1].type !== "filter") {
    cleaned.splice(1, 0, {
      type: "filter",
      subtype: "score_gate",
      label: "Resume Score Filter",
      config: { minScore: 55, scoreSource: "resume_score" },
    });
  } else if (cleaned.length === 1) {
    cleaned.push({
      type: "filter",
      subtype: "score_gate",
      label: "Resume Score Filter",
      config: { minScore: 55, scoreSource: "resume_score" },
    });
  }

  // 3. Last non-action step must be a stage
  const lastNonAction = [...cleaned]
    .reverse()
    .find((s) => s.type !== "action");
  if (lastNonAction && lastNonAction.type === "filter") {
    // Check if there's already a F2F or panel interview
    const hasF2F = cleaned.some(
      (s) =>
        s.subtype === "f2f_interview" ||
        s.subtype === "panel_interview"
    );
    const catalog = NODE_CATALOG.find(
      (n) => n.subtype === "f2f_interview"
    )!;
    if (!hasF2F) {
      cleaned.push({
        type: "stage",
        subtype: "f2f_interview",
        label: "Final Interview",
        config: { ...catalog.defaultConfig },
      });
    }
  }

  // 4. Must have at least 3 steps (resume + filter + something)
  if (cleaned.length < 3) {
    const hasCoding = cleaned.some(
      (s) => s.subtype === "coding_assessment"
    );
    const hasMCQ = cleaned.some(
      (s) => s.subtype === "mcq_assessment"
    );

    if (!hasCoding && !hasMCQ) {
      const catalog = NODE_CATALOG.find(
        (n) => n.subtype === "mcq_assessment"
      )!;
      cleaned.push({
        type: "stage",
        subtype: "mcq_assessment",
        label: "Assessment",
        config: { ...catalog.defaultConfig, questionMode: "auto" },
      });
      cleaned.push({
        type: "filter",
        subtype: "score_gate",
        label: "Assessment Filter",
        config: { minScore: 60, scoreSource: "assessment_score" },
      });
    }

    const hasF2F = cleaned.some(
      (s) =>
        s.subtype === "f2f_interview" ||
        s.subtype === "panel_interview"
    );
    if (!hasF2F) {
      const catalog = NODE_CATALOG.find(
        (n) => n.subtype === "f2f_interview"
      )!;
      cleaned.push({
        type: "stage",
        subtype: "f2f_interview",
        label: "Team Interview",
        config: { ...catalog.defaultConfig },
      });
    }
  }

  // 5. Final check: make sure it still ends with a stage
  const finalStep = cleaned[cleaned.length - 1];
  if (finalStep && finalStep.type === "filter") {
    const catalog = NODE_CATALOG.find(
      (n) => n.subtype === "f2f_interview"
    )!;
    cleaned.push({
      type: "stage",
      subtype: "f2f_interview",
      label: "Final Interview",
      config: { ...catalog.defaultConfig },
    });
  }

  return cleaned;
}

// ==========================================
// CONVERT TO REACT FLOW
// ==========================================

function convertToReactFlow(steps: CleanStep[]) {
  const nodes: any[] = [];
  const edges: any[] = [];

  // Build catalog lookup
  const catalogMap: Record<string, NodeCatalogItem> = {};
  NODE_CATALOG.forEach((n) => {
    catalogMap[n.subtype] = n;
  });

  // Layout
  const X_START = 80;
  const X_GAP = 400;
  const Y_MAIN = 250;

  let currentX = X_START;

  // ==========================================
  // SOURCE: Job Posting
  // ==========================================
  const sourceCatalog = catalogMap["job_posting"];
  const sourceId = `job_posting_${Date.now()}`;
  nodes.push({
    id: sourceId,
    type: "source",
    position: { x: currentX, y: Y_MAIN },
    data: {
      id: sourceId,
      type: "source",
      subtype: "job_posting",
      label: "Job Posting",
      config: {},
      costPerUnit: sourceCatalog?.costPerUnit || 0.5,
      icon: sourceCatalog?.icon || "Briefcase",
      color: sourceCatalog?.color || "#10B981",
    },
  });

  let lastNodeId = sourceId;
  let lastNodeType = "source";
  currentX += X_GAP;

  // ==========================================
  // ALL STEPS
  // ==========================================

  
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const catalog = catalogMap[step.subtype];
    const nodeId = `${step.subtype}_${Date.now()}_${i}`;

    // Determine React Flow node type
    let rfNodeType: string;
    switch (step.type) {
      case "stage":
        rfNodeType = "stage";
        break;
      case "filter":
        rfNodeType = "filter";
        break;
      case "action":
        rfNodeType = "action";
        break;
      default:
        rfNodeType = "stage";
    }

    nodes.push({
      id: nodeId,
      type: rfNodeType,
      position: { x: currentX, y: Y_MAIN },
      data: {
        id: nodeId,
        type: step.type,
        subtype: step.subtype,
        label: step.label,
        config: step.config,
        costPerUnit: catalog?.costPerUnit || 0,
        icon: catalog?.icon || "Box",
        color: catalog?.color || "#6366F1",
        description: catalog?.description || "",
      },
    });

    // Edge from previous node
    const edge: any = {
      id: `e_${lastNodeId}_${nodeId}`,
      source: lastNodeId,
      target: nodeId,
    };

    // Filters have "pass" and "fail" handles — connect from "pass"
    if (lastNodeType === "filter") {
      edge.sourceHandle = "pass";
    }

    edges.push(edge);

    lastNodeId = nodeId;
    lastNodeType = step.type;
    currentX += X_GAP;
  }

  // ==========================================
  // EXIT: Extend Offer
  // ==========================================
  const offerCatalog = catalogMap["offer"];
  const offerId = `offer_${Date.now()}`;
  nodes.push({
    id: offerId,
    type: "exit",
    position: { x: currentX, y: Y_MAIN },
    data: {
      id: offerId,
      type: "exit",
      subtype: "offer",
      label: "Extend Offer",
      config: {},
      costPerUnit: offerCatalog?.costPerUnit || 2.0,
      icon: offerCatalog?.icon || "Award",
      color: offerCatalog?.color || "#EC4899",
      description: offerCatalog?.description || "",
    },
  });

  const finalEdge: any = {
    id: `e_${lastNodeId}_${offerId}`,
    source: lastNodeId,
    target: offerId,
  };

  if (lastNodeType === "filter") {
    finalEdge.sourceHandle = "pass";
  }

  edges.push(finalEdge);

  return { nodes, edges };
}