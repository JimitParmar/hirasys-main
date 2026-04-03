"use client";

import React, { useCallback, useRef, useState, useMemo } from "react";
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
import { PipelineNodeData, NODE_CATALOG, NodeCategory } from "@/types";
import { StageNode } from "./nodes/StageNode";
import { FilterNode } from "./nodes/FilterNode";
import { LogicNode } from "./nodes/LogicNode";
import { SourceNode } from "./nodes/SourceNode";
import { ActionNode } from "./nodes/ActionNode";
import { ExitNode } from "./nodes/ExitNode";
import { NodePalette } from "./NodePalette";
import { NodeConfigPanel } from "./panels/NodeConfigPanel";
import { CostEstimatorPanel } from "./panels/CostEstimatorPanel";
import { Save, Play, DollarSign, LayoutTemplate, Undo2, Redo2 } from "lucide-react";
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

const defaultEdgeOptions = {
  animated: true,
  markerEnd: { type: MarkerType.ArrowClosed },
  style: { strokeWidth: 2 },
};

interface PipelineBuilderProps {
  pipelineId?: string;
  initialNodes?: Node<PipelineNodeData>[];
  initialEdges?: Edge[];
}

function PipelineBuilderInner({ pipelineId, initialNodes, initialEdges }: PipelineBuilderProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<PipelineNodeData>>(initialNodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges || []);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showPalette, setShowPalette] = useState(false);
  const [showCostPanel, setShowCostPanel] = useState(false);
  const [palettePosition, setPalettePosition] = useState({ x: 0, y: 0 });
  const [estimatedApplicants, setEstimatedApplicants] = useState(500);

  const onConnect = useCallback(
    (connection: Connection) => {
      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);

      // Color edges based on source type
      const edgeColor = sourceNode?.data?.type === "filter" ? "#F59E0B" : "#94A3B8";

      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            animated: true,
            style: { stroke: edgeColor, strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor },
          },
          eds
        )
      );
    },
    [nodes, setEdges]
  );

  // Right-click to add nodes
  const onPaneContextMenu = useCallback(
    (event: React.MouseEvent | MouseEvent) => {
      event.preventDefault();
      setPalettePosition({ x: event.clientX, y: event.clientY });
      setShowPalette(true);
    },
    []
  );

  const addNode = useCallback(
    (catalogItem: (typeof NODE_CATALOG)[0]) => {
      const position = screenToFlowPosition({
        x: palettePosition.x,
        y: palettePosition.y,
      });

      const newNode: Node<PipelineNodeData> = {
        id: `${catalogItem.subtype}_${Date.now()}`,
        type: catalogItem.category,
        position,
        data: {
  id: `${catalogItem.subtype}_${Date.now()}`,
  type: catalogItem.category,
  subtype: catalogItem.subtype,
  label: catalogItem.label,
  config: { ...catalogItem.defaultConfig },
  costPerUnit: catalogItem.costPerUnit,
  description: catalogItem.description,
  icon: catalogItem.icon,
  color: catalogItem.color,
}
      };

      setNodes((nds) => [...nds, newNode]);
      setShowPalette(false);
      toast.success(`Added ${catalogItem.label}`);
    },
    [screenToFlowPosition, palettePosition, setNodes]
  );

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setShowPalette(false);
  }, []);

  const onNodeConfigChange = useCallback(
    (nodeId: string, newData: Partial<PipelineNodeData>) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, ...newData } } : n
        )
      );
    },
    [setNodes]
  );

  const deleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) =>
        eds.filter((e) => e.source !== nodeId && e.target !== nodeId)
      );
      setSelectedNode(null);
      toast.success("Node removed");
    },
    [setNodes, setEdges]
  );

  const handleSave = useCallback(() => {
  toast.success("Pipeline saved!");
}, []);

  // Cost estimation
  const costEstimate = useMemo(() => {
    const pipelineNodes = nodes.map((n) => n.data as unknown as PipelineNodeData);
    const pipelineEdges = edges.map((e) => ({
      source: e.source,
      target: e.target,
    }));
    return estimatePipelineCost(pipelineNodes, pipelineEdges, estimatedApplicants);
  }, [nodes, edges, estimatedApplicants]);

  return (
    <div className="w-full h-[calc(100vh-64px)] relative" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneContextMenu={onPaneContextMenu}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        className="bg-slate-50"
      >
        <Background gap={15} size={1} color="#E2E8F0" />
        <Controls />
        <MiniMap
          nodeColor={(n) => {
            const data = n.data as unknown as PipelineNodeData;
            return data?.color || "#94A3B8";
          }}
          maskColor="rgba(0,0,0,0.1)"
        />

        {/* Top Toolbar */}
        <Panel position="top-left" className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Save Pipeline
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowCostPanel(!showCostPanel)}>
            <DollarSign className="w-4 h-4 mr-2" />
            Cost: ${costEstimate.totalCost}
          </Button>
          <Button variant="outline" size="sm">
            <LayoutTemplate className="w-4 h-4 mr-2" />
            Templates
          </Button>
        </Panel>

        {/* Right-click hint */}
        <Panel position="bottom-center">
          <div className="bg-white/80 backdrop-blur px-4 py-2 rounded-full shadow-sm text-sm text-slate-500">
            Right-click to add nodes • Drag to connect • Click node to configure
          </div>
        </Panel>

        {/* Cost Estimator Panel */}
        {showCostPanel && (
          <Panel position="top-right" className="w-80">
            <CostEstimatorPanel
              estimate={costEstimate}
              applicants={estimatedApplicants}
              onApplicantsChange={setEstimatedApplicants}
              onClose={() => setShowCostPanel(false)}
            />
          </Panel>
        )}
      </ReactFlow>

      {/* Right-click Node Palette */}
      {showPalette && (
        <NodePalette
          position={palettePosition}
          onSelect={addNode}
          onClose={() => setShowPalette(false)}
        />
      )}

      {/* Node Configuration Panel */}
      {selectedNode && (
        <NodeConfigPanel
          node={selectedNode}
          onChange={onNodeConfigChange}
          onDelete={deleteNode}
          onClose={() => setSelectedNode(null)}
        />
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