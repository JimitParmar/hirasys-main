"use client";

import React, { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { PipelineNodeData } from "@/types";
import {
  Filter, Gauge, Percent, Settings2, Zap, UserCheck, Clock, Pause,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const iconMap: Record<string, React.ElementType> = {
  Filter, Gauge, Percent, Settings2, Zap, UserCheck, Clock, Pause,
};

export const FilterNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as unknown as PipelineNodeData;
  const IconComp = iconMap[nodeData.icon || "Filter"] || Filter;

  const getFilterSummary = () => {
    const config = nodeData.config as any;
    switch (nodeData.subtype) {
      case "top_n": return `Top ${config?.n || 50} candidates`;
      case "score_gate": return `Score ≥ ${config?.minScore || 70}`;
      case "percentage": return `Top ${config?.percentage || 25}%`;
      case "hybrid": return `Fast-track ≥${config?.fastTrackThreshold || 85}, batch top ${config?.batchN || 40}`;
      case "human_approval": return `${config?.approverRole || "HR"} approves`;
      case "multi_criteria": return `${config?.rules?.length || 0} criteria (${config?.mode || "all"})`;
      default: return "";
    }
  };

  return (
    <div
      className={`
        px-4 py-3 rounded-xl border-2 bg-amber-50 shadow-md min-w-[200px]
        transition-all duration-200 border-dashed
        ${selected ? "border-amber-500 shadow-amber-100 shadow-lg" : "border-amber-300 hover:border-amber-400"}
      `}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-amber-400 !border-2 !border-white"
      />

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
          <IconComp className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-slate-700">{nodeData.label}</span>
            <Badge className="bg-green-100 text-green-700 text-[10px] hover:bg-green-100">
              FREE
            </Badge>
          </div>
          <div className="text-[11px] text-amber-600 font-medium">
            {getFilterSummary()}
          </div>
        </div>
      </div>

      {/* Pass/Reject outputs */}
      <Handle
        type="source"
        position={Position.Right}
        id="pass"
        className="!w-3 !h-3 !bg-green-400 !border-2 !border-white !top-[35%]"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="reject"
        className="!w-3 !h-3 !bg-red-400 !border-2 !border-white !top-[65%]"
      />

      {/* Labels for outputs */}
      <div className="absolute -right-1 top-[35%] -translate-y-1/2 translate-x-full text-[10px] text-green-600 font-medium pl-2">
        Pass ✓
      </div>
      <div className="absolute -right-1 top-[65%] -translate-y-1/2 translate-x-full text-[10px] text-red-500 font-medium pl-2">
        Filter ✗
      </div>
    </div>
  );
});

FilterNode.displayName = "FilterNode";