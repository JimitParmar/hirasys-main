import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { aiJSON } from "@/lib/ai";
import { NODE_CATALOG } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["HR", "ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { prompt } = await req.json();

    if (!prompt || prompt.trim().length < 10) {
      return NextResponse.json(
        { error: "Please describe the hiring process you need (at least 10 characters)" },
        { status: 400 }
      );
    }

    console.log("=== AI PIPELINE GENERATION ===");
    console.log("Prompt:", prompt);

    // Get available node types for AI context
    const availableNodes = NODE_CATALOG.map((n) => ({
      subtype: n.subtype,
      category: n.category,
      label: n.label,
      description: n.description,
      costPerUnit: n.costPerUnit,
    }));

    const result = await aiJSON<{
      name: string;
      description: string;
      nodes: {
        subtype: string;
        label: string;
        config: Record<string, any>;
      }[];
      filters: {
        afterNode: string;
        type: string;
        config: Record<string, any>;
      }[];
      estimatedApplicants: number;
      reasoning: string;
    }>(
      `You are an expert hiring pipeline designer for Hirasys, an AI-powered hiring platform.

Given an HR's description of what they need, design a complete hiring pipeline.

AVAILABLE STAGE NODES (candidate does something):
- ai_resume_screen: AI screens resumes against job requirements
- coding_assessment: Timed coding test with IDE (languages: javascript, python, typescript, sql)
- mcq_assessment: Multiple choice technical quiz
- ai_technical_interview: AI conducts adaptive technical interview
- ai_behavioral_interview: AI conducts behavioral/culture fit interview
- f2f_interview: Face-to-face interview with team (HR schedules)
- panel_interview: Multiple interviewers evaluate candidate

AVAILABLE FILTER NODES (control candidate flow, all FREE):
- score_gate: Only candidates above a score threshold pass (config: {minScore: 0-100})
- top_n: Only top N candidates pass (config: {n: number})
- percentage: Only top X% pass (config: {percentage: 0-100})
- hybrid: Fast-track high scorers + batch filter rest (config: {fastTrackThreshold: 0-100, batchN: number})
- human_approval: HR manually reviews and approves

EXIT NODES:
- offer: Extend job offer
- rejection: Reject with personalized feedback

RULES:
1. ALWAYS start with ai_resume_screen (first stage after entry)
2. ALWAYS add a filter after ai_resume_screen to control volume
3. ALWAYS end with offer node
4. Add filters between stages to progressively narrow candidates
5. For technical roles: include coding_assessment
6. For non-technical roles: skip coding, use mcq or behavioral
7. For senior roles: add more stages (system design, panel)
8. For junior/intern: simpler pipeline (screen, basic test, interview)
9. For high-volume roles: add stricter filters
10. Score gate minScore: 40-60 for lenient, 60-80 for moderate, 80+ for strict
11. Be practical — don't add too many stages (4-7 total stages ideal)

Return JSON:
{
  "name": "Pipeline name",
  "description": "Brief description",
  "nodes": [
    {
      "subtype": "ai_resume_screen",
      "label": "Resume Screening",
      "config": { "criteria": ["skills_match", "experience", "education"] }
    },
    {
      "subtype": "coding_assessment",
      "label": "Coding Challenge",
      "config": {
        "duration": 90,
        "difficulty": "medium",
        "questionCount": 3,
        "languages": ["javascript", "python"]
      }
    }
  ],
  "filters": [
    {
      "afterNode": "ai_resume_screen",
      "type": "score_gate",
      "config": { "minScore": 50, "scoreSource": "previous_stage_score", "filtered": { "rejectEmail": true, "emailType": "ai_personalized", "waitlist": false, "addToTalentPool": false } }
    },
    {
      "afterNode": "coding_assessment",
      "type": "top_n",
      "config": { "n": 20, "rankBy": "previous_stage_score", "batchMode": "all_complete", "filtered": { "rejectEmail": true, "emailType": "ai_personalized", "waitlist": true, "waitlistSize": 10, "addToTalentPool": false } }
    }
  ],
  "estimatedApplicants": 500,
  "reasoning": "Why this pipeline was designed this way"
}`,
      `Design a hiring pipeline for this request:\n\n"${prompt}"\n\nConsider the role level, skills needed, expected volume, and create an appropriate pipeline.`
    );

    console.log("AI generated pipeline:", result.name);
    console.log("Nodes:", result.nodes?.length, "Filters:", result.filters?.length);

    // Convert AI output to React Flow nodes and edges
    const { nodes, edges } = convertToReactFlow(result);

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
// Convert AI output to React Flow format
// ==========================================

function convertToReactFlow(aiResult: any) {
  const nodes: any[] = [];
  const edges: any[] = [];

  // Increased spacing for better readability
  const X_START = 80;
  const X_GAP_STAGE = 350;    // Gap between stage nodes
  const X_GAP_FILTER = 320;   // Gap for filter nodes (slightly less)
  const Y_CENTER = 250;
  const Y_REJECT = 450;       // Y position for reject path

  let currentX = X_START;
  let nodeIndex = 0;

  // Node type to catalog mapping
  const catalogMap: Record<string, any> = {};
  NODE_CATALOG.forEach((n) => {
    catalogMap[n.subtype] = n;
  });

  // 1. Source node
  const sourceId = `source_${Date.now()}`;
  nodes.push({
    id: sourceId,
    type: "source",
    position: { x: currentX, y: Y_CENTER },
    data: {
      id: sourceId,
      type: "source",
      subtype: "job_posting",
      label: "Job Posting",
      config: {},
      costPerUnit: 0.5,
      icon: "Briefcase",
      color: "#10B981",
    },
  });

  let lastNodeId = sourceId;
  currentX += X_GAP_STAGE;

  // 2. Process stage nodes with filters
  const stageNodes = aiResult.nodes || [];
  const filters = aiResult.filters || [];

  for (let i = 0; i < stageNodes.length; i++) {
    const stage = stageNodes[i];
    const catalog = catalogMap[stage.subtype];
    if (!catalog) continue;

    // Check if there's a filter after the PREVIOUS stage
    if (i > 0) {
      const prevStage = stageNodes[i - 1];
      const filterForPrev = filters.find(
        (f: any) => f.afterNode === prevStage.subtype
      );

      if (filterForPrev) {
        const filterCatalog = catalogMap[filterForPrev.type];
        if (filterCatalog) {
          const filterId = `filter_${Date.now()}_${i}`;

          nodes.push({
            id: filterId,
            type: "filter",
            position: { x: currentX, y: Y_CENTER },
            data: {
              id: filterId,
              type: "filter",
              subtype: filterForPrev.type,
              label: filterForPrev.label || filterCatalog.label,
              config: {
                ...filterCatalog.defaultConfig,
                ...filterForPrev.config,
              },
              costPerUnit: 0,
              icon: filterCatalog.icon,
              color: filterCatalog.color,
            },
          });

          edges.push({
            id: `e_${lastNodeId}_${filterId}`,
            source: lastNodeId,
            target: filterId,
            sourceHandle: lastNodeId.startsWith("filter_") ? "pass" : undefined,
          });

          lastNodeId = filterId;
          currentX += X_GAP_FILTER;
        }
      }
    }

    // Check for filter right after resume screen (first stage)
    if (i === 0) {
      const filterAfterFirst = filters.find(
        (f: any) => f.afterNode === stage.subtype
      );

      // Add stage first
      const stageId = `${stage.subtype}_${Date.now()}_${nodeIndex}`;
      nodes.push({
        id: stageId,
        type: "stage",
        position: { x: currentX, y: Y_CENTER },
        data: {
          id: stageId,
          type: "stage",
          subtype: stage.subtype,
          label: stage.label || catalog.label,
          config: { ...catalog.defaultConfig, ...stage.config },
          costPerUnit: catalog.costPerUnit,
          icon: catalog.icon,
          color: catalog.color,
        },
      });

      edges.push({
        id: `e_${lastNodeId}_${stageId}`,
        source: lastNodeId,
        target: stageId,
        sourceHandle: lastNodeId.startsWith("filter_") ? "pass" : undefined,
      });

      lastNodeId = stageId;
      currentX += X_GAP_STAGE;
      nodeIndex++;

      // Now add filter after first stage if exists
      if (filterAfterFirst) {
        const filterCatalog = catalogMap[filterAfterFirst.type];
        if (filterCatalog) {
          const filterId = `filter_${Date.now()}_first`;

          nodes.push({
            id: filterId,
            type: "filter",
            position: { x: currentX, y: Y_CENTER },
            data: {
              id: filterId,
              type: "filter",
              subtype: filterAfterFirst.type,
              label: filterAfterFirst.label || filterCatalog.label,
              config: {
                ...filterCatalog.defaultConfig,
                ...filterAfterFirst.config,
              },
              costPerUnit: 0,
              icon: filterCatalog.icon,
              color: filterCatalog.color,
            },
          });

          edges.push({
            id: `e_${lastNodeId}_${filterId}`,
            source: lastNodeId,
            target: filterId,
          });

          lastNodeId = filterId;
          currentX += X_GAP_FILTER;
        }
      }

      continue; // Already added, skip to next
    }

    // Add stage node
    const stageId = `${stage.subtype}_${Date.now()}_${nodeIndex}`;
    nodes.push({
      id: stageId,
      type: "stage",
      position: { x: currentX, y: Y_CENTER },
      data: {
        id: stageId,
        type: "stage",
        subtype: stage.subtype,
        label: stage.label || catalog.label,
        config: { ...catalog.defaultConfig, ...stage.config },
        costPerUnit: catalog.costPerUnit,
        icon: catalog.icon,
        color: catalog.color,
      },
    });

    edges.push({
      id: `e_${lastNodeId}_${stageId}`,
      source: lastNodeId,
      target: stageId,
      sourceHandle: lastNodeId.startsWith("filter_") ? "pass" : undefined,
    });

    lastNodeId = stageId;
    currentX += X_GAP_STAGE;
    nodeIndex++;
  }

  // Check for filter after last stage
  const lastStage = stageNodes[stageNodes.length - 1];
  if (lastStage) {
    const finalFilter = filters.find((f: any) => f.afterNode === lastStage.subtype);
    if (finalFilter) {
      const filterCatalog = catalogMap[finalFilter.type];
      if (filterCatalog) {
        const filterId = `filter_final_${Date.now()}`;
        nodes.push({
          id: filterId,
          type: "filter",
          position: { x: currentX, y: Y_CENTER },
          data: {
            id: filterId,
            type: "filter",
            subtype: finalFilter.type,
            label: finalFilter.label || filterCatalog.label,
            config: { ...filterCatalog.defaultConfig, ...finalFilter.config },
            costPerUnit: 0,
            icon: filterCatalog.icon,
            color: filterCatalog.color,
          },
        });
        edges.push({
          id: `e_${lastNodeId}_${filterId}`,
          source: lastNodeId,
          target: filterId,
          sourceHandle: lastNodeId.startsWith("filter_") ? "pass" : undefined,
        });
        lastNodeId = filterId;
        currentX += X_GAP_FILTER;
      }
    }
  }

  // 3. Offer exit node
  const offerId = `offer_${Date.now()}`;
  nodes.push({
    id: offerId,
    type: "exit",
    position: { x: currentX, y: Y_CENTER },
    data: {
      id: offerId,
      type: "exit",
      subtype: "offer",
      label: "Extend Offer",
      config: {},
      costPerUnit: 2.0,
      icon: "Award",
      color: "#EC4899",
    },
  });

  edges.push({
    id: `e_${lastNodeId}_${offerId}`,
    source: lastNodeId,
    target: offerId,
    sourceHandle: lastNodeId.startsWith("filter_") ? "pass" : undefined,
  });

  return { nodes, edges };
}