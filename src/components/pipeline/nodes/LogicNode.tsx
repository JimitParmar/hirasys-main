"use client";

import React, { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { PipelineNodeData } from "@/types";
import { GitBranch, Split, Merge, Timer } from "lucide-react";

const iconMap: Record<string, React.ElementType> = { GitBranch, Split, Merge, Timer };

export const LogicNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as unknown as PipelineNodeData;
  const IconComp = iconMap[nodeData.icon || "GitBranch"] || GitBranch;

  return (
    <div
      className={`
        w-16 h-16 rounded-full border-2 bg-purple-50 shadow-md
        flex items-center justify-center transition-all duration-200
        ${selected ? "border-purple-500 shadow-purple-100 shadow-lg" : "border-purple-300 hover:border-purple-400"}
      `}
    >
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-purple-400 !border-2 !border-white" />
      <IconComp className="w-6 h-6 text-purple-600" />
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-purple-400 !border-2 !border-white" />
    </div>
  );
});

LogicNode.displayName = "LogicNode";