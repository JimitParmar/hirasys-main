import { PipelineNodeData, NODE_CATALOG } from "@/types";
import { PipelineEngine } from "./engine";

export interface DetailedCostEstimate {
  totalCost: number;
  perHireCost: number;
  estimatedHires: number;
  stageBreakdown: StageEstimate[];
  funnelStages: FunnelStage[];
  savingsVsNoFilters: number;
  savingsPercentage: number;
  monthlyEstimate: number; // If posting this job monthly
}

export interface StageEstimate {
  nodeId: string;
  label: string;
  type: string;
  estimatedReaching: number;
  estimatedCompleting: number; // accounting for drop-offs
  costPerUnit: number;
  estimatedCost: number;
  isFree: boolean;
}

export interface FunnelStage {
  nodeId: string;
  label: string;
  entering: number;
  passing: number;
  filtered: number;
  dropoff: number; // candidates who don't show up
}

// Average completion rates by stage type
const COMPLETION_RATES: Record<string, number> = {
  ai_resume_screen: 1.0,    // Automatic, 100% processed
  coding_assessment: 0.85,   // ~15% don't start/complete
  mcq_assessment: 0.90,      // ~10% don't complete
  subjective_assessment: 0.80,
  ai_technical_interview: 0.90,
  ai_behavioral_interview: 0.92,
  f2f_interview: 0.95,       // High completion (already invested)
  panel_interview: 0.95,
};

export function estimatePipelineCost(
  nodes: PipelineNodeData[],
  edges: { source: string; target: string }[],
  totalApplicants: number
): DetailedCostEstimate {
  const engine = new PipelineEngine("estimate", nodes, edges);
  const executionOrder = engine.getExecutionOrder();

  let currentVolume = totalApplicants;
  const stageBreakdown: StageEstimate[] = [];
  const funnelStages: FunnelStage[] = [];
  let totalCostWithFilters = 0;
  let totalCostWithout = 0;

  for (const nodeId of executionOrder) {
    const node = engine.getNode(nodeId);
    if (!node) continue;

    if (node.type === "source") {
      funnelStages.push({
        nodeId: node.id,
        label: node.label,
        entering: totalApplicants,
        passing: totalApplicants,
        filtered: 0,
        dropoff: 0,
      });
      continue;
    }

    if (node.type === "stage") {
      const completionRate = COMPLETION_RATES[node.subtype] || 0.90;
      const completing = Math.round(currentVolume * completionRate);
      const dropoff = currentVolume - completing;
      const cost = completing * node.costPerUnit;

      totalCostWithFilters += cost;
      totalCostWithout += totalApplicants * node.costPerUnit;

      stageBreakdown.push({
        nodeId: node.id,
        label: node.label,
        type: node.subtype,
        estimatedReaching: Math.round(currentVolume),
        estimatedCompleting: completing,
        costPerUnit: node.costPerUnit,
        estimatedCost: Math.round(cost * 100) / 100,
        isFree: false,
      });

      funnelStages.push({
        nodeId: node.id,
        label: node.label,
        entering: Math.round(currentVolume),
        passing: completing,
        filtered: 0,
        dropoff,
      });

      currentVolume = completing;
    }

    if (node.type === "filter") {
      const passingCount = estimateFilterOutput(node, currentVolume);
      const filtered = currentVolume - passingCount;

      stageBreakdown.push({
        nodeId: node.id,
        label: `🟡 ${node.label}`,
        type: node.subtype,
        estimatedReaching: Math.round(currentVolume),
        estimatedCompleting: passingCount,
        costPerUnit: 0,
        estimatedCost: 0,
        isFree: true,
      });

      funnelStages.push({
        nodeId: node.id,
        label: node.label,
        entering: Math.round(currentVolume),
        passing: passingCount,
        filtered,
        dropoff: 0,
      });

      currentVolume = passingCount;
    }

    if (node.type === "action" || node.type === "exit") {
      const cost = currentVolume * node.costPerUnit;
      totalCostWithFilters += cost;
      totalCostWithout += totalApplicants * node.costPerUnit;

      stageBreakdown.push({
        nodeId: node.id,
        label: node.label,
        type: node.subtype,
        estimatedReaching: Math.round(currentVolume),
        estimatedCompleting: Math.round(currentVolume),
        costPerUnit: node.costPerUnit,
        estimatedCost: Math.round(cost * 100) / 100,
        isFree: node.costPerUnit === 0,
      });
    }
  }

  const estimatedHires = Math.max(1, Math.round(totalApplicants * 0.004));
  const savings = totalCostWithout - totalCostWithFilters;

  return {
    totalCost: Math.round(totalCostWithFilters * 100) / 100,
    perHireCost: Math.round((totalCostWithFilters / estimatedHires) * 100) / 100,
    estimatedHires,
    stageBreakdown,
    funnelStages,
    savingsVsNoFilters: Math.round(savings * 100) / 100,
    savingsPercentage: totalCostWithout > 0 ? Math.round((savings / totalCostWithout) * 100) : 0,
    monthlyEstimate: Math.round(totalCostWithFilters * 100) / 100,
  };
}

function estimateFilterOutput(node: PipelineNodeData, currentVolume: number): number {
  const config = node.config as any;

  switch (node.subtype) {
    case "top_n":
      return Math.min(config.n || 50, currentVolume);
    case "score_gate":
      return Math.round(currentVolume * 0.5); // ~50% pass a gate
    case "percentage":
      return Math.min(
        Math.max(
          Math.round(currentVolume * ((config.percentage || 25) / 100)),
          config.minPass || 1
        ),
        config.maxPass || currentVolume
      );
    case "hybrid": {
      const fastTracked = Math.round(currentVolume * 0.15);
      const batchN = config.batchN || 40;
      return Math.min(fastTracked + batchN, currentVolume);
    }
    case "human_approval":
      return Math.round(currentVolume * 0.6);
    case "multi_criteria":
      return Math.round(currentVolume * 0.4);
    case "waitlist":
      return Math.min(config.capacity || 20, currentVolume);
    case "time_gate":
      return Math.round(currentVolume * 0.5);
    default:
      return currentVolume;
  }
}