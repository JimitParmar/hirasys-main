"use client";

import React, { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { PipelineNodeData } from "@/types";
import {
  FileSearch, Code, ListChecks, Bot, MessageSquare, Video, Users,
} from "lucide-react";

const iconMap: Record<string, React.ElementType> = {
  FileSearch, Code, ListChecks, Bot, MessageSquare, Video, Users,
};

export const StageNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as unknown as PipelineNodeData;
  const IconComp = iconMap[nodeData.icon || "Code"] || Code;

  return (
    <div
      className={`
        px-4 py-3 rounded-xl border-2 bg-white shadow-md min-w-[180px]
        transition-all duration-200
        ${selected ? "border-blue-500 shadow-blue-100 shadow-lg" : "border-slate-200 hover:border-blue-300"}
      `}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-blue-400 !border-2 !border-white"
      />

      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${nodeData.color}15` }}
        >
          <IconComp className="w-5 h-5" style={{ color: nodeData.color }} />
        </div>
        <div>
          <div className="font-semibold text-sm text-slate-700">{nodeData.label}</div>
          <div className="text-[11px] text-slate-400">
            ${nodeData.costPerUnit}/candidate
          </div>
        </div>
      </div>

      {/* Config preview */}
      {nodeData.config?.duration && (
        <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1">
          ⏱ {nodeData.config.duration} min
          {nodeData.config?.difficulty && (
            <span className="ml-2">📊 {nodeData.config.difficulty}</span>
          )}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-blue-400 !border-2 !border-white"
      />
    </div>
  );
});

StageNode.displayName = "StageNode";