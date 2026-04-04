"use client";

import React, { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { PipelineNodeData } from "@/types";
import { Mail, Bell, Globe, Pencil } from "lucide-react";
import { openNodeConfig } from "../PipelineBuilder";

const iconMap: Record<string, React.ElementType> = { Mail, Bell, Globe };

export const ActionNode = memo(({ id, data, selected }: NodeProps) => {
  const nodeData = data as unknown as PipelineNodeData;
  const IconComp = iconMap[nodeData.icon || "Bell"] || Bell;
  return (
    <div className={`relative px-3 py-2 rounded-lg border-2 bg-red-50 shadow-sm min-w-[150px] transition-all group ${selected ? "border-red-400 shadow-red-100 shadow-lg" : "border-red-200 hover:border-red-300 hover:shadow-md"}`}>
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-red-400 !border-2 !border-white" />
      <div onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => {
  e.stopPropagation();
  // Tell parent not to close on pane click
  const wrapper = document.querySelector("[data-edit-guard]");
  if (wrapper) wrapper.setAttribute("data-just-edited", "true");
  openNodeConfig(id);
}}className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white border-2 border-red-200 shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 hover:border-red-300 hover:scale-110 z-50 cursor-pointer nopan nodrag">
        <Pencil className="w-2.5 h-2.5 text-red-500 pointer-events-none" />
      </div>
      <div className="flex items-center gap-2">
        <IconComp className="w-4 h-4 text-red-500 shrink-0" />
        <div className="min-w-0">
          <span className="text-xs font-medium text-slate-600 truncate block">{nodeData.label}</span>
          {nodeData.costPerUnit > 0 && <span className="text-[10px] text-slate-400">${nodeData.costPerUnit}/use</span>}
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-red-400 !border-2 !border-white" />
    </div>
  );
});
ActionNode.displayName = "ActionNode";