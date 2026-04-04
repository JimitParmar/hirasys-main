"use client";

import React, { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { PipelineNodeData } from "@/types";
import { Briefcase, Pencil } from "lucide-react";
import { openNodeConfig } from "../PipelineBuilder";

export const SourceNode = memo(({ id, data, selected }: NodeProps) => {
  const nodeData = data as unknown as PipelineNodeData;
  return (
    <div className={`relative px-4 py-3 rounded-xl border-2 bg-emerald-50 shadow-md min-w-[180px] transition-all duration-200 group ${selected ? "border-emerald-500 shadow-emerald-100 shadow-lg" : "border-emerald-300 hover:border-emerald-400 hover:shadow-lg"}`}>
      <div onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => {
  e.stopPropagation();
  // Tell parent not to close on pane click
  const wrapper = document.querySelector("[data-edit-guard]");
  if (wrapper) wrapper.setAttribute("data-just-edited", "true");
  openNodeConfig(id);
}} className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-white border-2 border-emerald-300 shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-emerald-50 hover:border-emerald-400 hover:scale-110 z-50 cursor-pointer nopan nodrag">
        <Pencil className="w-3 h-3 text-emerald-600 pointer-events-none" />
      </div>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0"><Briefcase className="w-5 h-5 text-emerald-600" /></div>
        <div>
          <div className="font-semibold text-sm text-slate-700">{nodeData.label}</div>
          <div className="text-[11px] text-emerald-600">🟢 Entry point</div>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-emerald-400 !border-2 !border-white" />
    </div>
  );
});
SourceNode.displayName = "SourceNode";