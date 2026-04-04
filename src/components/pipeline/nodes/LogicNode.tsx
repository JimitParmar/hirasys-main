"use client";

import React, { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { PipelineNodeData } from "@/types";
import { GitBranch, Split, Merge, Timer, Pencil } from "lucide-react";
import { openNodeConfig } from "../PipelineBuilder";

const iconMap: Record<string, React.ElementType> = { GitBranch, Split, Merge, Timer };

export const LogicNode = memo(({ id, data, selected }: NodeProps) => {
  const nodeData = data as unknown as PipelineNodeData;
  const IconComp = iconMap[nodeData.icon || "GitBranch"] || GitBranch;
  return (
    <div className="relative flex flex-col items-center group">
      <div onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => {
  e.stopPropagation();
  // Tell parent not to close on pane click
  const wrapper = document.querySelector("[data-edit-guard]");
  if (wrapper) wrapper.setAttribute("data-just-edited", "true");
  openNodeConfig(id);
}} className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-white border-2 border-purple-300 shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-purple-50 hover:border-purple-400 hover:scale-110 z-50 cursor-pointer nopan nodrag">
        <Pencil className="w-2.5 h-2.5 text-purple-600 pointer-events-none" />
      </div>
      <div className={`w-16 h-16 rounded-full border-2 bg-purple-50 shadow-md flex items-center justify-center transition-all ${selected ? "border-purple-500 shadow-purple-100 shadow-lg" : "border-purple-300 hover:border-purple-400 hover:shadow-lg"}`}>
        <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-purple-400 !border-2 !border-white" />
        <IconComp className="w-6 h-6 text-purple-600" />
        <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-purple-400 !border-2 !border-white" />
      </div>
      <span className="text-[10px] text-purple-600 font-medium mt-1">{nodeData.label}</span>
    </div>
  );
});
LogicNode.displayName = "LogicNode";