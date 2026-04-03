import { db } from "@/lib/db";
import { PipelineNodeData, TopNFilterConfig, ScoreGateConfig, HybridFilterConfig, PercentageFilterConfig, MultiCriteriaConfig } from "@/types";

interface NodeResult {
  nodeId: string;
  status: "pending" | "completed" | "failed" | "waiting" | "skipped";
  score?: number;
  data?: any;
  completedAt?: Date;
  cost?: number;
}

interface CandidateInPipeline {
  applicationId: string;
  candidateId: string;
  scores: Record<string, number>; // nodeId -> score
}

export class PipelineEngine {
  private pipelineId: string;
  private nodes: PipelineNodeData[];
  private edges: { source: string; target: string; type?: string }[];
  private adjacencyList: Map<string, string[]>;
  private reverseAdjacency: Map<string, string[]>;

  constructor(
    pipelineId: string,
    nodes: PipelineNodeData[],
    edges: { source: string; target: string; type?: string }[]
  ) {
    this.pipelineId = pipelineId;
    this.nodes = nodes;
    this.edges = edges;
    this.adjacencyList = new Map();
    this.reverseAdjacency = new Map();

    // Build adjacency lists
    for (const edge of edges) {
      if (!this.adjacencyList.has(edge.source)) {
        this.adjacencyList.set(edge.source, []);
      }
      this.adjacencyList.get(edge.source)!.push(edge.target);

      if (!this.reverseAdjacency.has(edge.target)) {
        this.reverseAdjacency.set(edge.target, []);
      }
      this.reverseAdjacency.get(edge.target)!.push(edge.source);
    }
  }

  getNode(nodeId: string): PipelineNodeData | undefined {
    return this.nodes.find((n) => n.id === nodeId);
  }

  getNextNodes(nodeId: string): string[] {
    return this.adjacencyList.get(nodeId) || [];
  }

  getPreviousNodes(nodeId: string): string[] {
    return this.reverseAdjacency.get(nodeId) || [];
  }

  getStartNode(): PipelineNodeData | undefined {
    return this.nodes.find((n) => n.type === "source");
  }

  // Get topological ordering of nodes
  getExecutionOrder(): string[] {
    const visited = new Set<string>();
    const order: string[] = [];

    const dfs = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const next = this.getNextNodes(nodeId);
      for (const n of next) {
        dfs(n);
      }
      order.unshift(nodeId);
    };

    const start = this.getStartNode();
    if (start) dfs(start.id);

    return order;
  }

  // ==========================================
  // FILTER EVALUATION
  // ==========================================

  async evaluateFilter(
    nodeId: string,
    jobId: string,
    candidates: CandidateInPipeline[]
  ): Promise<{ passed: string[]; filtered: string[] }> {
    const node = this.getNode(nodeId);
    if (!node || node.type !== "filter") {
      throw new Error(`Node ${nodeId} is not a filter`);
    }

    switch (node.subtype) {
      case "top_n":
        return this.evaluateTopN(node, candidates);
      case "score_gate":
        return this.evaluateScoreGate(node, candidates);
      case "percentage":
        return this.evaluatePercentage(node, candidates);
      case "multi_criteria":
        return this.evaluateMultiCriteria(node, candidates);
      case "hybrid":
        return this.evaluateHybrid(node, candidates);
      default:
        // Default: pass all through
        return {
          passed: candidates.map((c) => c.applicationId),
          filtered: [],
        };
    }
  }

  private evaluateTopN(
    node: PipelineNodeData,
    candidates: CandidateInPipeline[]
  ): { passed: string[]; filtered: string[] } {
    const config = node.config as TopNFilterConfig;
    const n = config.n;

    // Get the score to rank by
    const prevNodes = this.getPreviousNodes(node.id);
    const rankByNodeId = prevNodes[0]; // Use previous node's score

    // Sort by score descending
    const sorted = [...candidates].sort((a, b) => {
      const scoreA = this.getCandidateScore(a, config.rankBy, rankByNodeId);
      const scoreB = this.getCandidateScore(b, config.rankBy, rankByNodeId);

      if (scoreB !== scoreA) return scoreB - scoreA;

      // Tiebreaker
      if (config.tiebreaker) {
        const tieA = this.getCandidateScore(a, config.tiebreaker, rankByNodeId);
        const tieB = this.getCandidateScore(b, config.tiebreaker, rankByNodeId);
        return tieB - tieA;
      }

      return 0;
    });

    const passed = sorted.slice(0, n).map((c) => c.applicationId);
    const filtered = sorted.slice(n).map((c) => c.applicationId);

    return { passed, filtered };
  }

  private evaluateScoreGate(
    node: PipelineNodeData,
    candidates: CandidateInPipeline[]
  ): { passed: string[]; filtered: string[] } {
    const config = node.config as ScoreGateConfig;
    const prevNodes = this.getPreviousNodes(node.id);
    const rankByNodeId = prevNodes[0];

    const passed: string[] = [];
    const filtered: string[] = [];

    for (const candidate of candidates) {
      const score = this.getCandidateScore(candidate, config.scoreSource, rankByNodeId);
      if (score >= config.minScore) {
        passed.push(candidate.applicationId);
      } else {
        filtered.push(candidate.applicationId);
      }
    }

    return { passed, filtered };
  }

  private evaluatePercentage(
    node: PipelineNodeData,
    candidates: CandidateInPipeline[]
  ): { passed: string[]; filtered: string[] } {
    const config = node.config as PercentageFilterConfig;
    const prevNodes = this.getPreviousNodes(node.id);
    const rankByNodeId = prevNodes[0];

    const sorted = [...candidates].sort((a, b) => {
      const scoreA = this.getCandidateScore(a, config.rankBy, rankByNodeId);
      const scoreB = this.getCandidateScore(b, config.rankBy, rankByNodeId);
      return scoreB - scoreA;
    });

    let n = Math.ceil(sorted.length * (config.percentage / 100));
    n = Math.max(n, config.minPass);
    n = Math.min(n, config.maxPass, sorted.length);

    const passed = sorted.slice(0, n).map((c) => c.applicationId);
    const filtered = sorted.slice(n).map((c) => c.applicationId);

    return { passed, filtered };
  }

  private evaluateMultiCriteria(
    node: PipelineNodeData,
    candidates: CandidateInPipeline[]
  ): { passed: string[]; filtered: string[] } {
    const config = node.config as MultiCriteriaConfig;
    const passed: string[] = [];
    const filtered: string[] = [];

    for (const candidate of candidates) {
      const results = config.rules.map((rule) => {
        const value = this.getCandidateField(candidate, rule.field);
        return this.evaluateRule(value, rule.operator, rule.value);
      });

      const passes =
        config.mode === "all"
          ? results.every(Boolean)
          : results.some(Boolean);

      if (passes) {
        passed.push(candidate.applicationId);
      } else {
        filtered.push(candidate.applicationId);
      }
    }

    return { passed, filtered };
  }

  private evaluateHybrid(
    node: PipelineNodeData,
    candidates: CandidateInPipeline[]
  ): { passed: string[]; filtered: string[] } {
    const config = node.config as HybridFilterConfig;
    const prevNodes = this.getPreviousNodes(node.id);
    const rankByNodeId = prevNodes[0];

    const fastTracked: string[] = [];
    const batchPool: CandidateInPipeline[] = [];

    // Phase 1: Fast-track high performers
    for (const candidate of candidates) {
      const score = this.getCandidateScore(candidate, config.rankBy, rankByNodeId);
      if (score >= config.fastTrackThreshold) {
        fastTracked.push(candidate.applicationId);
      } else {
        batchPool.push(candidate);
      }
    }

    // Phase 2: Batch filter the rest
    const sorted = batchPool.sort((a, b) => {
      const scoreA = this.getCandidateScore(a, config.rankBy, rankByNodeId);
      const scoreB = this.getCandidateScore(b, config.rankBy, rankByNodeId);
      return scoreB - scoreA;
    });

    const remainingSlots = Math.max(0, config.batchN - fastTracked.length);
    const batchPassed = sorted.slice(0, remainingSlots).map((c) => c.applicationId);
    const batchFiltered = sorted.slice(remainingSlots).map((c) => c.applicationId);

    return {
      passed: [...fastTracked, ...batchPassed],
      filtered: batchFiltered,
    };
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  private getCandidateScore(
    candidate: CandidateInPipeline,
    scoreType: string,
    previousNodeId: string
  ): number {
    switch (scoreType) {
      case "previous_stage_score":
        return candidate.scores[previousNodeId] || 0;
      case "resume_score":
        return candidate.scores["resume_score"] || 0;
      case "overall_score":
        const scores = Object.values(candidate.scores);
        return scores.length > 0
          ? scores.reduce((a, b) => a + b, 0) / scores.length
          : 0;
      default:
        return candidate.scores[scoreType] || 0;
    }
  }

  private getCandidateField(candidate: CandidateInPipeline, field: string): any {
    return candidate.scores[field] || (candidate as any)[field] || 0;
  }

  private evaluateRule(value: any, operator: string, target: any): boolean {
    switch (operator) {
      case "gte": return value >= target;
      case "lte": return value <= target;
      case "eq": return value === target;
      case "contains":
        return Array.isArray(value)
          ? value.includes(target)
          : String(value).includes(String(target));
      case "in":
        return Array.isArray(target) ? target.includes(value) : false;
      default: return false;
    }
  }

  // ==========================================
  // COST ESTIMATION
  // ==========================================

  estimateCost(totalApplicants: number): {
    totalCost: number;
    perHireCost: number;
    breakdown: {
      nodeId: string;
      label: string;
      estimatedVolume: number;
      costPerUnit: number;
      totalCost: number;
    }[];
    savingsVsNoFilters: number;
  } {
    const executionOrder = this.getExecutionOrder();
    const breakdown: any[] = [];
    let currentVolume = totalApplicants;
    let costWithFilters = 0;
    let costWithoutFilters = 0;

    for (const nodeId of executionOrder) {
      const node = this.getNode(nodeId);
      if (!node) continue;

      if (node.type === "stage" || node.type === "action" || node.type === "exit") {
        const nodeCost = currentVolume * node.costPerUnit;
        costWithFilters += nodeCost;
        costWithoutFilters += totalApplicants * node.costPerUnit;

        breakdown.push({
          nodeId: node.id,
          label: node.label,
          estimatedVolume: Math.round(currentVolume),
          costPerUnit: node.costPerUnit,
          totalCost: Math.round(nodeCost * 100) / 100,
        });
      }

      if (node.type === "filter") {
        // Estimate how many pass through
        const passRate = this.estimateFilterPassRate(node, currentVolume);
        const filteredOut = currentVolume - passRate;

        breakdown.push({
          nodeId: node.id,
          label: `🟡 ${node.label}`,
          estimatedVolume: Math.round(currentVolume),
          costPerUnit: 0,
          totalCost: 0,
          note: `${Math.round(currentVolume)} → ${Math.round(passRate)} (${Math.round(filteredOut)} filtered)`,
        });

        currentVolume = passRate;
      }
    }

    // Estimate hires (roughly 0.3-0.5% of applicants, min 1)
    const estimatedHires = Math.max(1, Math.round(totalApplicants * 0.004));

    return {
      totalCost: Math.round(costWithFilters * 100) / 100,
      perHireCost: Math.round((costWithFilters / estimatedHires) * 100) / 100,
      breakdown,
      savingsVsNoFilters: Math.round((costWithoutFilters - costWithFilters) * 100) / 100,
    };
  }

  private estimateFilterPassRate(node: PipelineNodeData, currentVolume: number): number {
    switch (node.subtype) {
      case "top_n":
        return Math.min((node.config as TopNFilterConfig).n, currentVolume);
      case "score_gate":
        // Assume ~40-60% pass a score gate
        return Math.round(currentVolume * 0.5);
      case "percentage":
        return Math.round(currentVolume * ((node.config as PercentageFilterConfig).percentage / 100));
      case "hybrid": {
        const config = node.config as HybridFilterConfig;
        const fastTracked = Math.round(currentVolume * 0.15); // ~15% fast-track
        const batchPassed = Math.min(config.batchN - fastTracked, currentVolume - fastTracked);
        return fastTracked + Math.max(0, batchPassed);
      }
      case "human_approval":
        return Math.round(currentVolume * 0.6); // ~60% approved
      case "multi_criteria":
        return Math.round(currentVolume * 0.4); // ~40% pass
      default:
        return currentVolume;
    }
  }

  // ==========================================
  // PIPELINE ADVANCEMENT
  // ==========================================

  async advanceCandidate(
    applicationId: string,
    currentNodeId: string,
    result: NodeResult
  ): Promise<{ nextNodeId: string | null; action: string }> {
    // Save result
    const execution = await db.pipelineExecution.findFirst({
      where: { applicationId, pipelineId: this.pipelineId },
    });

    if (!execution) throw new Error("Execution not found");

    const nodeResults = (execution.nodeResults as Record<string, any>) || {};
    nodeResults[currentNodeId] = result;

    const nextNodes = this.getNextNodes(currentNodeId);
    let nextNodeId: string | null = null;
    let action = "complete";

    if (nextNodes.length > 0) {
      const nextNode = this.getNode(nextNodes[0]);

      if (nextNode?.type === "filter") {
        // Check if this is a realtime or batch filter
        if (this.isRealtimeFilter(nextNode)) {
          // Evaluate immediately
          action = "evaluate_filter";
          nextNodeId = nextNode.id;
        } else {
          // Add to batch
          action = "add_to_batch";
          nextNodeId = nextNode.id;
        }
      } else {
        nextNodeId = nextNodes[0];
        action = "advance";
      }
    }

    await db.pipelineExecution.update({
      where: { id: execution.id },
      data: {
        currentNodeId: nextNodeId,
        nodeResults: nodeResults,
        status: nextNodeId ? "RUNNING" : "COMPLETED",
        completedAt: nextNodeId ? undefined : new Date(),
      },
    });

    return { nextNodeId, action };
  }

  private isRealtimeFilter(node: PipelineNodeData): boolean {
    return ["score_gate", "multi_criteria"].includes(node.subtype);
  }
}