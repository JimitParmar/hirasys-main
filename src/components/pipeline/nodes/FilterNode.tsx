"use client";

import React, { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { PipelineNodeData } from "@/types";
import { Filter, Gauge, Percent, Settings2, Zap, UserCheck, Clock, Pause, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { openNodeConfig } from "../PipelineBuilder";

const iconMap: Record<string, React.ElementType> = { Filter, Gauge, Percent, Settings2, Zap, UserCheck, Clock, Pause };

export const FilterNode = memo(({ id, data, selected }: NodeProps) => {
  const nodeData = data as unknown as PipelineNodeData;
  const IconComp = iconMap[nodeData.icon || "Filter"] || Filter;

  const getFilterSummary = () => {
    const c = nodeData.config as any;
    switch (nodeData.subtype) {
      case "top_n": return `Top ${c?.n || 50} candidates`;
      case "score_gate": return `Score ≥ ${c?.minScore || 70}`;
      case "percentage": return `Top ${c?.percentage || 25}%`;
      case "hybrid": return `Fast ≥${c?.fastTrackThreshold || 85}, batch ${c?.batchN || 40}`;
      case "human_approval": return `${c?.approverRole || "HR"} reviews`;
      case "multi_criteria": return `${c?.rules?.length || 0} rules (${c?.mode || "all"})`;
      case "time_gate": return `Batch every ${c?.waitDays || 7} days`;
      case "waitlist": return `Hold top ${c?.capacity || 20}`;
      default: return "Configure →";
    }
  };

  return (
    <div
      className={`
        relative px-4 py-3 rounded-xl border-2 bg-amber-50 shadow-md min-w-[220px]
        transition-all duration-200 border-dashed group
        ${selected ? "border-amber-500 shadow-amber-100 shadow-lg" : "border-amber-300 hover:border-amber-400 hover:shadow-lg"}
      `}
    >
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-amber-400 !border-2 !border-white" />

      <div
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
  e.stopPropagation();
  // Tell parent not to close on pane click
  const wrapper = document.querySelector("[data-edit-guard]");
  if (wrapper) wrapper.setAttribute("data-just-edited", "true");
  openNodeConfig(id);
}}
        className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-white border-2 border-amber-300 shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-amber-50 hover:border-amber-400 hover:scale-110 z-50 cursor-pointer nopan nodrag"
      >
        <Pencil className="w-3 h-3 text-amber-600 pointer-events-none" />
      </div>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
          <IconComp className="w-5 h-5 text-amber-600" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-slate-700 truncate">{nodeData.label}</span>
            <Badge className="bg-green-100 text-green-700 text-[10px] hover:bg-green-100 shrink-0">FREE</Badge>
          </div>
          <div className="text-[11px] text-amber-600 font-medium truncate">{getFilterSummary()}</div>
        </div>
      </div>

      {nodeData.config?.fastTrack?.enabled && (
        <div className="mt-2 text-[10px] text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full inline-block">⚡ Fast-track ≥{nodeData.config.fastTrack.threshold}</div>
      )}
      {nodeData.config?.filtered?.waitlist && (
        <div className="mt-1 text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full inline-block">📋 Waitlist: {nodeData.config.filtered.waitlistSize || 20}</div>
      )}

      <Handle type="source" position={Position.Right} id="pass" className="!w-3 !h-3 !bg-green-400 !border-2 !border-white" style={{ top: "35%" }} />
      <Handle type="source" position={Position.Right} id="reject" className="!w-3 !h-3 !bg-red-400 !border-2 !border-white" style={{ top: "65%" }} />
      <div className="absolute -right-1 top-[35%] -translate-y-1/2 translate-x-full text-[9px] text-green-600 font-semibold pl-3 pointer-events-none">Pass ✓</div>
      <div className="absolute -right-1 top-[65%] -translate-y-1/2 translate-x-full text-[9px] text-red-500 font-semibold pl-3 pointer-events-none">Reject ✗</div>
    </div>
  );
});
FilterNode.displayName = "FilterNode";