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
import { Save, DollarSign, LayoutTemplate } from "lucide-react";
import { estimatePipelineCost } from "@/modules/pipeline/cost-estimator";
import toast from "react-hot-toast";

const nodeTypes: NodeTypes = {
  source: SourceNode,
  stage: StageNode,
  filter: FilterNode,
  logic: LogicNode,
  action: ActionNode,
  exit: ExitNode,
};

// Module-level: stores the forceUpdate function
let _forceUpdate: (() => void) | null = null;
let _getNodes: (() => Node[]) | null = null;
let _editingNodeId: string | null = null;

export function openNodeConfig(nodeId: string) {
  console.log("openNodeConfig:", nodeId);
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

function PipelineBuilderInner({ initialNodes, initialEdges, onSave }: PipelineBuilderProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges || []);
  const [showPalette, setShowPalette] = useState(false);
  const [showCostPanel, setShowCostPanel] = useState(false);
  const [palettePosition, setPalettePosition] = useState({ x: 0, y: 0 });
  const [estimatedApplicants, setEstimatedApplicants] = useState(500);
  const [estimatedHires, setEstimatedHires] = useState(2);

  // Force re-render trick
  const [, forceRender] = useReducer((x: number) => x + 1, 0);
  _forceUpdate = forceRender;

  // Track if edit was just clicked to prevent pane click from clearing
  const justClickedEdit = useRef(false);

  // Find the editing node from current nodes
  const editingNode = _editingNodeId ? nodes.find((n) => n.id === _editingNodeId) : null;

  // Connections
  const onConnect = useCallback(
    (connection: Connection) => {
      const sourceNode = nodes.find((n) => n.id === connection.source);
      let edgeColor = "#94A3B8";
      if (sourceNode?.type === "filter") {
        edgeColor = connection.sourceHandle === "reject" ? "#EF4444" : "#10B981";
      } else if (sourceNode?.type === "source") {
        edgeColor = "#10B981";
      } else if (sourceNode?.type === "logic") {
        edgeColor = "#8B5CF6";
      }
      setEdges((eds) =>
        addEdge({
          ...connection,
          id: `e_${Date.now()}`,
          animated: true,
          style: { stroke: edgeColor, strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor, width: 20, height: 20 },
        }, eds)
      );
    },
    [nodes, setEdges]
  );

  const onPaneContextMenu = useCallback(
    (event: MouseEvent | React.MouseEvent) => {
      event.preventDefault();
      closeNodeConfig();
      setPalettePosition({ x: event.clientX, y: event.clientY });
      setShowPalette(true);
    },
    []
  );

  const addNode = useCallback(
    (catalogItem: (typeof NODE_CATALOG)[0]) => {
      const position = screenToFlowPosition({ x: palettePosition.x, y: palettePosition.y });
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
            config: JSON.parse(JSON.stringify(catalogItem.defaultConfig)),
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
    [screenToFlowPosition, palettePosition, setNodes]
  );

  const onPaneClick = useCallback(() => {
    // Don't close if edit button was just clicked
    if (justClickedEdit.current) {
      justClickedEdit.current = false;
      return;
    }
    closeNodeConfig();
    setShowPalette(false);
  }, []);

  const onNodeConfigChange = useCallback(
    (nodeId: string, newData: Partial<PipelineNodeData>) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id !== nodeId ? n : { ...n, data: { ...n.data, ...newData } }
        )
      );
    },
    [setNodes]
  );

  const deleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
      closeNodeConfig();
      toast.success("Node removed");
    },
    [setNodes, setEdges]
  );

  const handleSave = useCallback(() => {
    onSave?.(nodes, edges);
    toast.success("Pipeline saved!");
  }, [nodes, edges, onSave]);

  const getCost = () => {
    if (nodes.length === 0)
      return { totalCost: 0, perHireCost: 0, estimatedHires, stageBreakdown: [], funnelStages: [], savingsVsNoFilters: 0, savingsPercentage: 0, monthlyEstimate: 0 };
    try {
      return estimatePipelineCost(
        nodes.map((n) => n.data as PipelineNodeData),
        edges.map((e) => ({ source: e.source, target: e.target })),
        estimatedApplicants
      );
    } catch {
      return { totalCost: 0, perHireCost: 0, estimatedHires, stageBreakdown: [], funnelStages: [], savingsVsNoFilters: 0, savingsPercentage: 0, monthlyEstimate: 0 };
    }
  };
  const costEstimate = getCost();

  // Intercept edit clicks to set flag
  const handleEditClick = useCallback(() => {
    justClickedEdit.current = true;
  }, []);

  return (
    <div
      className="w-full h-full relative"
      ref={reactFlowWrapper}
      onClickCapture={() => {
        // This fires before React Flow's pane click
        // If an edit button set justClickedEdit, we keep it
      }}
    >
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
          markerEnd: { type: MarkerType.ArrowClosed, color: "#94A3B8" },
        }}
      >
        <Background gap={15} size={1} color="#E2E8F0" />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={(n) => (n.data as PipelineNodeData)?.color || "#94A3B8"}
          maskColor="rgba(0,0,0,0.08)"
        />

        <Panel position="top-left" className="flex gap-2 items-center">
          <Button variant="default" size="sm" onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700">
            <Save className="w-4 h-4 mr-2" /> Save
          </Button>
          <Button
            variant={showCostPanel ? "default" : "outline"} size="sm"
            onClick={() => setShowCostPanel(!showCostPanel)}
            className={showCostPanel ? "bg-emerald-600 hover:bg-emerald-700" : ""}
          >
            <DollarSign className="w-4 h-4 mr-2" />
            {nodes.length > 0 ? `$${costEstimate.totalCost}` : "Costs"}
          </Button>
          <Button variant="outline" size="sm">
            <LayoutTemplate className="w-4 h-4 mr-2" /> Templates
          </Button>
        </Panel>

        {showCostPanel && (
          <Panel position="top-right">
            <div className="w-80">
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

        <Panel position="bottom-center">
          <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border text-xs text-slate-500 flex items-center gap-3">
            <span><kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono">Right Click</kbd> Add</span>
            <span className="text-slate-300">|</span>
            <span>Hover → ✏️ Configure</span>
            <span className="text-slate-300">|</span>
            <span>{nodes.length} nodes • {edges.length} edges</span>
          </div>
        </Panel>
      </ReactFlow>

      {showPalette && (
        <NodePalette
          position={palettePosition}
          onSelect={addNode}
          onClose={() => setShowPalette(false)}
        />
      )}

      {/* CONFIG PANEL — rendered based on module-level _editingNodeId */}
      {editingNode && (
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
    </div>
  );
}

export function PipelineBuilder(props: PipelineBuilderProps) {
  return (
    <ReactFlowProvider>
      <PipelineBuilderInner {...props} />
    </ReactFlowProvider>
  );
}