"use client";

import React, { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { PipelineNodeData } from "@/types";
import { Mail, Bell, Globe } from "lucide-react";

const iconMap: Record<string, React.ElementType> = { Mail, Bell, Globe };

export const ActionNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as unknown as PipelineNodeData;
  const IconComp = iconMap[nodeData.icon || "Bell"] || Bell;

  return (
    <div
      className={`
        px-3 py-2 rounded-lg border-2 bg-red-50 shadow-sm min-w-[140px]
        transition-all duration-200
        ${selected ? "border-red-400 shadow-red-100 shadow-lg" : "border-red-200 hover:border-red-300"}
      `}
    >
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-red-400 !border-2 !border-white" />
      <div className="flex items-center gap-2">
        <IconComp className="w-4 h-4 text-red-500" />
        <span className="text-xs font-medium text-slate-600">{nodeData.label}</span>
      </div>
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-red-400 !border-2 !border-white" />
    </div>
  );
});

ActionNode.displayName = "ActionNode";