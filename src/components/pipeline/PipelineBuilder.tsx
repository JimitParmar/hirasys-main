"use client";

import React, { useCallback, useRef, useState, useReducer } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  ReactFlowProvider,
  useReactFlow,
  NodeTypes,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PipelineNodeData, NODE_CATALOG } from "@/types";
import { StageNode } from "./nodes/StageNode";
import { FilterNode } from "./nodes/FilterNode";
import { LogicNode } from "./nodes/LogicNode";
import { SourceNode } from "./nodes/SourceNode";
import { ActionNode } from "./nodes/ActionNode";
import { ExitNode } from "./nodes/ExitNode";
import { NodePalette } from "./NodePalette";
import { NodeConfigPanel } from "./panels/NodeConfigPanel";
import { CostEstimatorPanel } from "./panels/CostEstimatorPanel";
import { AIGenerateDialog } from "./AIGenerateDialog";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import {
  Save,
  DollarSign,
  LayoutTemplate,
  Wand2,
  Lock,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { estimatePipelineCost } from "@/modules/pipeline/cost-estimator";
import toast from "react-hot-toast";
import Link from "next/link";

const nodeTypes: NodeTypes = {
  source: SourceNode,
  stage: StageNode,
  filter: FilterNode,
  logic: LogicNode,
  action: ActionNode,
  exit: ExitNode,
};

let _forceUpdate: (() => void) | null = null;
let _editingNodeId: string | null = null;

export function openNodeConfig(nodeId: string) {
  _editingNodeId = nodeId;
  if (_forceUpdate) _forceUpdate();
}

export function closeNodeConfig() {
  _editingNodeId = null;
  if (_forceUpdate) _forceUpdate();
}

interface PipelineBuilderProps {
  pipelineId?: string;
  initialNodes?: Node[];
  initialEdges?: Edge[];
  onSave?: (nodes: Node[], edges: Edge[]) => void;
}

function PipelineBuilderInner({
  initialNodes,
  initialEdges,
  onSave,
}: PipelineBuilderProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState(
    initialNodes || []
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    initialEdges || []
  );
  const [showPalette, setShowPalette] = useState(false);
  const [showCostPanel, setShowCostPanel] = useState(false);
  const [showAIGenerate, setShowAIGenerate] = useState(false);
  const [palettePosition, setPalettePosition] = useState({
    x: 0,
    y: 0,
  });
  const [estimatedApplicants, setEstimatedApplicants] = useState(500);
  const [estimatedHires, setEstimatedHires] = useState(2);

  // Plan limits
  const {
    canAddNode,
    hasFeature,
    isFree,
    planName,
    getNodeLimit,
    loading: planLoading,
  } = usePlanLimits();

  // Force re-render trick
  const [, forceRender] = useReducer((x: number) => x + 1, 0);
  _forceUpdate = forceRender;

  const justClickedEdit = useRef(false);

  const editingNode = _editingNodeId
    ? nodes.find((n) => n.id === _editingNodeId)
    : null;

  // Count current node types for the status bar
  const assessmentCount = nodes.filter(
    (n) =>
      n.data?.subtype === "coding_assessment" ||
      n.data?.subtype === "mcq_assessment" ||
      n.data?.subtype === "subjective_assessment"
  ).length;

  const aiInterviewCount = nodes.filter(
    (n) =>
      n.data?.subtype === "ai_technical_interview" ||
      n.data?.subtype === "ai_behavioral_interview"
  ).length;

  const totalNodeCount = nodes.filter(
    (n) => n.data?.type !== "source" && n.data?.type !== "exit"
  ).length;

  // Handle edge connections
  const onConnect = useCallback(
    (connection: Connection) => {
      const sourceNode = nodes.find(
        (n) => n.id === connection.source
      );
      let edgeColor = "#94A3B8";
      if (sourceNode?.type === "filter") {
        edgeColor =
          connection.sourceHandle === "reject"
            ? "#EF4444"
            : "#10B981";
      } else if (sourceNode?.type === "source") {
        edgeColor = "#10B981";
      } else if (sourceNode?.type === "logic") {
        edgeColor = "#8B5CF6";
      }
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            id: `e_${Date.now()}`,
            animated: true,
            style: { stroke: edgeColor, strokeWidth: 2 },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: edgeColor,
              width: 20,
              height: 20,
            },
          },
          eds
        )
      );
    },
    [nodes, setEdges]
  );

  // Right-click → palette
  const onPaneContextMenu = useCallback(
    (event: MouseEvent | React.MouseEvent) => {
      event.preventDefault();
      closeNodeConfig();
      setPalettePosition({
        x: event.clientX,
        y: event.clientY,
      });
      setShowPalette(true);
    },
    []
  );

  // ==========================================
  // ADD NODE — with plan limit check
  // ==========================================
  const addNode = useCallback(
    (catalogItem: (typeof NODE_CATALOG)[0]) => {
      // Check plan limits before adding
      const check = canAddNode(catalogItem.subtype, nodes);

      if (!check.allowed) {
        toast(check.message || "Upgrade required to add this node.", {
          icon: "🔒",
          duration: 5000,
          style: {
            background: "#FEF3C7",
            color: "#92400E",
            border: "1px solid #FDE68A",
          },
        });
        setShowPalette(false);
        return;
      }

      const position = screenToFlowPosition({
        x: palettePosition.x,
        y: palettePosition.y,
      });
      const nodeId = `${catalogItem.subtype}_${Date.now()}`;
      setNodes((nds) => [
        ...nds,
        {
          id: nodeId,
          type: catalogItem.category,
          position,
          selectable: true,
          data: {
            id: nodeId,
            type: catalogItem.category,
            subtype: catalogItem.subtype,
            label: catalogItem.label,
            config: JSON.parse(
              JSON.stringify(catalogItem.defaultConfig)
            ),
            costPerUnit: catalogItem.costPerUnit,
            description: catalogItem.description,
            icon: catalogItem.icon,
            color: catalogItem.color,
          } as PipelineNodeData,
        },
      ]);
      setShowPalette(false);
      toast.success(`Added ${catalogItem.label}`);
    },
    [
      screenToFlowPosition,
      palettePosition,
      setNodes,
      canAddNode,
      nodes,
    ]
  );

  // Pane click → close panels
  const onPaneClick = useCallback(() => {
    if (justClickedEdit.current) {
      justClickedEdit.current = false;
      return;
    }
    closeNodeConfig();
    setShowPalette(false);
  }, []);

  // Update node from config panel
  const onNodeConfigChange = useCallback(
    (nodeId: string, newData: Partial<PipelineNodeData>) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id !== nodeId
            ? n
            : { ...n, data: { ...n.data, ...newData } }
        )
      );
    },
    [setNodes]
  );

  // Delete node
  const deleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) =>
        eds.filter(
          (e) => e.source !== nodeId && e.target !== nodeId
        )
      );
      closeNodeConfig();
      toast.success("Node removed");
    },
    [setNodes, setEdges]
  );

  // Save
  const handleSave = useCallback(() => {
    onSave?.(nodes, edges);
  }, [nodes, edges, onSave]);

  // ==========================================
  // AI GENERATE — with feature check
  // ==========================================
  const handleOpenAIGenerate = useCallback(() => {
    if (!hasFeature("aiGenerate")) {
      toast(
        "AI Pipeline Generation requires the Pro plan. Upgrade to unlock.",
        {
          icon: "🔒",
          duration: 5000,
          style: {
            background: "#FEF3C7",
            color: "#92400E",
            border: "1px solid #FDE68A",
          },
        }
      );
      return;
    }
    setShowAIGenerate(true);
  }, [hasFeature]);

  // AI Generate — replace canvas
  const handleAIGenerated = useCallback(
    (newNodes: any[], newEdges: any[], name: string) => {
      setNodes(newNodes);
      setEdges(
        newEdges.map((e: any) => ({
          ...e,
          animated: true,
          style: {
            strokeWidth: 2,
            stroke:
              e.sourceHandle === "reject"
                ? "#EF4444"
                : "#94A3B8",
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color:
              e.sourceHandle === "reject"
                ? "#EF4444"
                : "#94A3B8",
          },
        }))
      );
      toast.success(
        `"${name}" loaded with ${newNodes.length} nodes!`
      );
    },
    [setNodes, setEdges]
  );

  // Cost estimation
  const getCost = () => {
    if (nodes.length === 0)
      return {
        totalCost: 0,
        perHireCost: 0,
        estimatedHires,
        stageBreakdown: [],
        funnelStages: [],
        savingsVsNoFilters: 0,
        savingsPercentage: 0,
        monthlyEstimate: 0,
      };
    try {
      return estimatePipelineCost(
        nodes.map((n) => n.data as PipelineNodeData),
        edges.map((e) => ({
          source: e.source,
          target: e.target,
        })),
        estimatedApplicants,
        estimatedHires
      );
    } catch {
      return {
        totalCost: 0,
        perHireCost: 0,
        estimatedHires,
        stageBreakdown: [],
        funnelStages: [],
        savingsVsNoFilters: 0,
        savingsPercentage: 0,
        monthlyEstimate: 0,
      };
    }
  };
  const costEstimate = getCost();

  // Plan limit display helpers
  const assessmentLimit = getNodeLimit("assessment");
  const aiInterviewLimit = getNodeLimit("aiInterview");
  const totalNodeLimit = getNodeLimit("total");

  return (
    <div className="w-full h-full relative" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneContextMenu={onPaneContextMenu}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        className="bg-slate-50"
        deleteKeyCode={["Backspace", "Delete"]}
        nodesDraggable
        nodesConnectable
        elementsSelectable
        defaultEdgeOptions={{
          animated: true,
          style: { strokeWidth: 2, stroke: "#94A3B8" },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: "#94A3B8",
          },
        }}
      >
        <Background gap={15} size={1} color="#E2E8F0" />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={(n) =>
            (n.data as PipelineNodeData)?.color || "#94A3B8"
          }
          maskColor="rgba(0,0,0,0.08)"
        />

        {/* Toolbar */}
        <Panel
          position="top-left"
          className="flex gap-2 items-center"
        >
          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            className="bg-[#0245EF] hover:bg-[#0237BF]"
          >
            <Save className="w-4 h-4 mr-2" /> Save
          </Button>

          {/* AI Generate — with lock */}
          <Button
            variant="default"
            size="sm"
            onClick={handleOpenAIGenerate}
            className={
              hasFeature("aiGenerate")
                ? "bg-purple-600 hover:bg-purple-700"
                : "bg-slate-400 hover:bg-slate-500"
            }
          >
            {hasFeature("aiGenerate") ? (
              <Wand2 className="w-4 h-4 mr-2" />
            ) : (
              <Lock className="w-4 h-4 mr-2" />
            )}
            AI Generate
            {!hasFeature("aiGenerate") && (
              <Badge className="ml-1.5 text-[8px] bg-amber-500 text-white px-1 py-0">
                PRO
              </Badge>
            )}
          </Button>

          <Button
            variant={showCostPanel ? "default" : "outline"}
            size="sm"
            onClick={() => setShowCostPanel(!showCostPanel)}
            className={
              showCostPanel
                ? "bg-emerald-600 hover:bg-emerald-700"
                : ""
            }
          >
            <DollarSign className="w-4 h-4 mr-2" />
            {nodes.length > 0
              ? `$${costEstimate.totalCost}`
              : "Costs"}
          </Button>

          <Button variant="outline" size="sm">
            <LayoutTemplate className="w-4 h-4 mr-2" />{" "}
            Templates
          </Button>
        </Panel>

        {/* Plan Limits Status Bar */}
        {isFree && nodes.length > 0 && (
          <Panel position="top-right">
            <div className="bg-white border border-amber-200 rounded-lg shadow-sm p-2.5 space-y-1.5 w-56">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
                  Free Plan Limits
                </span>
                <Link href="/hr/billing">
                  <Button
                    size="sm"
                    className="h-5 text-[9px] bg-[#0245EF] hover:bg-[#0237BF] px-2"
                  >
                    Upgrade
                  </Button>
                </Link>
              </div>

              <LimitBar
                label="Assessments"
                current={assessmentCount}
                max={assessmentLimit}
              />
              <LimitBar
                label="AI Interviews"
                current={aiInterviewCount}
                max={aiInterviewLimit}
              />
              <LimitBar
                label="Total Nodes"
                current={totalNodeCount}
                max={totalNodeLimit}
              />
            </div>
          </Panel>
        )}

        {/* Cost Panel */}
        {showCostPanel && (
          <Panel position="top-right">
            <div className={isFree ? "w-80 mt-32" : "w-80"}>
              <CostEstimatorPanel
                estimate={costEstimate}
                applicants={estimatedApplicants}
                hires={estimatedHires}
                onApplicantsChange={setEstimatedApplicants}
                onHiresChange={setEstimatedHires}
                onClose={() => setShowCostPanel(false)}
              />
            </div>
          </Panel>
        )}

        {/* Bottom hint */}
        <Panel position="bottom-center">
          <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border text-xs text-slate-500 flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono">
                Right Click
              </kbd>{" "}
              Add
            </span>
            <span className="text-slate-300">|</span>
            <span>Hover → ✏️ Configure</span>
            <span className="text-slate-300">|</span>
            <span>
              {nodes.length} nodes • {edges.length} edges
            </span>
            {isFree && (
              <>
                <span className="text-slate-300">|</span>
                <span className="text-amber-600 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Free Plan
                </span>
              </>
            )}
          </div>
        </Panel>
      </ReactFlow>

      {/* Node Palette — with lock indicators */}
      {showPalette && (
        <NodePaletteWithLimits
          position={palettePosition}
          onSelect={addNode}
          onClose={() => setShowPalette(false)}
          canAddNode={canAddNode}
          currentNodes={nodes}
          planName={planName}
        />
      )}

      {/* Config Panel */}
      {editingNode && editingNode.data && (
        <div
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            height: "100vh",
            zIndex: 9999,
          }}
        >
          <NodeConfigPanel
            key={editingNode.id}
            node={editingNode}
            onChange={onNodeConfigChange}
            onDelete={deleteNode}
            onClose={() => closeNodeConfig()}
          />
        </div>
      )}

      {/* AI Generate Dialog */}
      <AIGenerateDialog
        open={showAIGenerate}
        onOpenChange={setShowAIGenerate}
        onGenerated={handleAIGenerated}
      />
    </div>
  );
}

// ==========================================
// LIMIT BAR — shows usage vs limit
// ==========================================

function LimitBar({
  label,
  current,
  max,
}: {
  label: string;
  current: number;
  max: number | "unlimited";
}) {
  if (max === "unlimited") return null;

  const percentage = max > 0 ? Math.min(100, (current / max) * 100) : 0;
  const atLimit = current >= max;

  return (
    <div>
      <div className="flex items-center justify-between text-[10px] mb-0.5">
        <span
          className={
            atLimit ? "text-red-600 font-medium" : "text-slate-500"
          }
        >
          {label}
        </span>
        <span
          className={`font-mono font-bold ${atLimit ? "text-red-600" : "text-slate-700"}`}
        >
          {current}/{max}
        </span>
      </div>
      <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            atLimit
              ? "bg-red-500"
              : percentage > 60
                ? "bg-amber-500"
                : "bg-[#0245EF]"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// ==========================================
// NODE PALETTE WITH LOCK INDICATORS
// ==========================================

function NodePaletteWithLimits({
  position,
  onSelect,
  onClose,
  canAddNode,
  currentNodes,
  planName,
}: {
  position: { x: number; y: number };
  onSelect: (item: (typeof NODE_CATALOG)[0]) => void;
  onClose: () => void;
  canAddNode: (
    subtype: string,
    nodes: any[]
  ) => { allowed: boolean; message?: string };
  currentNodes: any[];
  planName: string;
}) {
  const categories = [
    { key: "source", label: "Source", color: "#10B981" },
    { key: "stage", label: "Stages", color: "#0245EF" },
    { key: "filter", label: "Filters (Free)", color: "#F59E0B" },
    { key: "logic", label: "Logic", color: "#8B5CF6" },
    { key: "action", label: "Actions", color: "#EF4444" },
    { key: "exit", label: "Exit", color: "#EC4899" },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50"
        onClick={onClose}
      />

      {/* Palette */}
      <div
        className="fixed z-50 bg-white rounded-xl shadow-2xl border border-slate-200 p-3 w-72 max-h-[500px] overflow-y-auto"
        style={{
          left: Math.min(position.x, window.innerWidth - 300),
          top: Math.min(position.y, window.innerHeight - 520),
        }}
      >
        <p className="text-xs font-semibold text-slate-500 mb-2 px-1">
          Add Node
        </p>

        {categories.map((cat) => {
          const items = NODE_CATALOG.filter(
            (n) => n.category === cat.key
          );
          if (items.length === 0) return null;

          return (
            <div key={cat.key} className="mb-2">
              <p
                className="text-[10px] font-bold uppercase tracking-wider px-1 mb-1"
                style={{ color: cat.color }}
              >
                {cat.label}
              </p>
              <div className="space-y-0.5">
                {items.map((item) => {
                  const check = canAddNode(
                    item.subtype,
                    currentNodes
                  );
                  const isLocked = !check.allowed;

                  return (
                    <button
                      key={item.subtype}
                      onClick={() => {
                        if (isLocked) {
                          toast(
                            check.message ||
                              "Upgrade required",
                            {
                              icon: "🔒",
                              duration: 4000,
                              style: {
                                background: "#FEF3C7",
                                color: "#92400E",
                                border:
                                  "1px solid #FDE68A",
                              },
                            }
                          );
                        } else {
                          onSelect(item);
                        }
                      }}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all ${
                        isLocked
                          ? "opacity-50 cursor-not-allowed hover:bg-amber-50"
                          : "hover:bg-slate-50 cursor-pointer"
                      }`}
                    >
                      <div
                        className="w-6 h-6 rounded flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: `${item.color}15`,
                        }}
                      >
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{
                            backgroundColor: item.color,
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-700 truncate">
                          {item.label}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {item.description}
                        </p>
                      </div>
                      {isLocked && (
                        <div className="flex items-center gap-1 shrink-0">
                          <Lock className="w-3 h-3 text-amber-500" />
                          <Badge className="text-[8px] bg-amber-100 text-amber-700 px-1 py-0 h-3.5">
                            PRO
                          </Badge>
                        </div>
                      )}
                      {!isLocked &&
                        item.costPerUnit === 0 && (
                          <Badge className="text-[8px] bg-emerald-100 text-emerald-700 px-1 py-0 h-3.5 shrink-0">
                            FREE
                          </Badge>
                        )}
                      {!isLocked &&
                        item.costPerUnit > 0 && (
                          <span className="text-[9px] text-slate-400 font-mono shrink-0">
                            ${item.costPerUnit}
                          </span>
                        )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

export function PipelineBuilder(props: PipelineBuilderProps) {
  return (
    <ReactFlowProvider>
      <PipelineBuilderInner {...props} />
    </ReactFlowProvider>
  );
}