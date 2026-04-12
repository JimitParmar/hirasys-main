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

Given an HR's description, design a complete hiring pipeline.

AVAILABLE STAGE NODES:
- ai_resume_screen: AI screens resumes against job requirements
- coding_assessment: Timed coding test with IDE (config: {duration, difficulty, questionCount, languages, questionMode: "auto"})
- mcq_assessment: Multiple choice quiz (config: {duration, difficulty, questionCount, questionMode: "auto"})
- ai_technical_interview: AI conducts TECHNICAL interview — coding, system design, algorithms (config: {maxQuestions, duration, difficulty, interviewMode: "technical", adaptive: true})
- ai_behavioral_interview: AI conducts BEHAVIORAL interview — leadership, teamwork, communication (config: {maxQuestions, duration, difficulty, interviewMode: "behavioral", adaptive: true})
- f2f_interview: Face-to-face interview with team (config: {duration, interviewType})
- panel_interview: Multiple interviewers evaluate candidate (config: {duration, panelSize, interviewType})

AVAILABLE FILTER NODES (all FREE):
- score_gate: Only candidates above score threshold pass (config: {minScore: 0-100})
- top_n: Only top N candidates pass (config: {n: number})
- percentage: Only top X% pass (config: {percentage: 0-100})
- hybrid: Fast-track high scorers + batch filter rest
- human_approval: HR manually reviews

EXIT NODES:
- offer: Extend job offer
- rejection: Reject with feedback

CRITICAL RULES FOR INTERVIEW TYPE:
1. For TECHNICAL roles (developer, engineer, data scientist, DevOps):
   → Use ai_technical_interview with interviewMode: "technical"
   → Include coding_assessment
2. For NON-TECHNICAL roles (product manager, designer, marketing, HR, sales, support):
   → Use ai_behavioral_interview with interviewMode: "behavioral"
   → Use mcq_assessment instead of coding_assessment
   → Focus on case studies, communication, leadership
3. For MIXED roles (tech lead, engineering manager, CTO):
   → Use BOTH ai_technical_interview AND ai_behavioral_interview
   → Or use ai_technical_interview with interviewMode: "mixed"
4. When user specifically says "no technical" or "behavioral" or "case study":
   → MUST use ai_behavioral_interview, NOT ai_technical_interview

OTHER RULES:
5. ALWAYS start with ai_resume_screen
6. ALWAYS add a filter after screening
7. ALWAYS end with offer node
8. For assessment nodes, set questionMode: "auto" so questions generate from JD
9. Score gate minScore: 40-60 lenient, 60-80 moderate, 80+ strict
10. Keep pipelines practical — 4-7 stages ideal

Return JSON:
{
  "name": "Pipeline name",
  "description": "Brief description",
  "nodes": [
    {
      "subtype": "ai_resume_screen",
      "label": "Resume Screening",
      "config": { "criteria": ["skills_match", "experience"] }
    },
    {
      "subtype": "mcq_assessment",
      "label": "Knowledge Quiz",
      "config": { "duration": 30, "difficulty": "medium", "questionCount": 20, "questionMode": "auto" }
    },
    {
      "subtype": "ai_behavioral_interview",
      "label": "Behavioral Interview",
      "config": { "maxQuestions": 8, "duration": 25, "difficulty": "progressive", "interviewMode": "behavioral", "adaptive": true, "useResumeContext": true }
    }
  ],
  "filters": [...],
  "estimatedApplicants": 500,
  "reasoning": "This is a non-technical role so we focus on behavioral assessment..."
}`,
        `Design a hiring pipeline for:\n\n"${prompt}"\n\nPay close attention to whether this is a technical or non-technical role. Choose the right interview type accordingly.`
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