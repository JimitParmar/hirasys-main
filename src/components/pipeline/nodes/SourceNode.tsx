"use client";

import React, { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { PipelineNodeData } from "@/types";
import { Briefcase } from "lucide-react";

export const SourceNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as unknown as PipelineNodeData;

  return (
    <div
      className={`
        px-4 py-3 rounded-xl border-2 bg-emerald-50 shadow-md min-w-[180px]
        transition-all duration-200
        ${selected ? "border-emerald-500 shadow-emerald-100 shadow-lg" : "border-emerald-300 hover:border-emerald-400"}
      `}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
          <Briefcase className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <div className="font-semibold text-sm text-slate-700">{nodeData.label}</div>
          <div className="text-[11px] text-emerald-600">Entry point</div>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-emerald-400 !border-2 !border-white"
      />
    </div>
  );
});

SourceNode.displayName = "SourceNode";