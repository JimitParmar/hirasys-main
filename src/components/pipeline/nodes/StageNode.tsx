"use client";

import React, { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { PipelineNodeData } from "@/types";
import {
  FileSearch, Code, ListChecks, Bot, MessageSquare, Video, Users,
  Pencil,
} from "lucide-react";
import { openNodeConfig } from "../PipelineBuilder";

const iconMap: Record<string, React.ElementType> = {
  FileSearch, Code, ListChecks, Bot, MessageSquare, Video, Users,
};

export const StageNode = memo(({ id, data, selected }: NodeProps) => {
  const nodeData = data as unknown as PipelineNodeData;
  const IconComp = iconMap[nodeData.icon || "Code"] || Code;

  return (
    <div
      className={`
        relative px-4 py-3 rounded-xl border-2 bg-white shadow-md min-w-[200px]
        transition-all duration-200 group
        ${selected ? "border-blue-500 shadow-blue-100 shadow-lg" : "border-slate-200 hover:border-blue-300 hover:shadow-lg"}
      `}
    >
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-blue-400 !border-2 !border-white" />

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
        className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-white border-2 border-slate-200 shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-blue-50 hover:border-blue-400 hover:scale-110 z-50 cursor-pointer nopan nodrag"
      >
        <Pencil className="w-3 h-3 text-blue-500 pointer-events-none" />
      </div>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${nodeData.color}15` }}>
          <IconComp className="w-5 h-5" style={{ color: nodeData.color }} />
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-sm text-slate-700 truncate">{nodeData.label}</div>
          <div className="text-[11px] text-slate-400">${nodeData.costPerUnit}/candidate</div>
        </div>
      </div>

      {(nodeData.config?.duration || nodeData.config?.difficulty) && (
        <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-400 flex-wrap">
          {nodeData.config?.duration && <span className="bg-slate-100 px-1.5 py-0.5 rounded">⏱ {nodeData.config.duration} min</span>}
          {nodeData.config?.difficulty && <span className="bg-slate-100 px-1.5 py-0.5 rounded capitalize">📊 {nodeData.config.difficulty}</span>}
          {nodeData.config?.languages?.length > 0 && <span className="bg-slate-100 px-1.5 py-0.5 rounded">💻 {nodeData.config.languages.length} lang</span>}
        </div>
      )}

      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-blue-400 !border-2 !border-white" />
    </div>
  );
});
StageNode.displayName = "StageNode";