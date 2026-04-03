"use client";

import React, { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { PipelineNodeData } from "@/types";
import { Award, XCircle, Rocket, Archive } from "lucide-react";

const iconMap: Record<string, React.ElementType> = { Award, XCircle, Rocket, Archive };

export const ExitNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as unknown as PipelineNodeData;
  const IconComp = iconMap[nodeData.icon || "Award"] || Award;
  const isPositive = nodeData.subtype === "offer" || nodeData.subtype === "onboarding";

  return (
    <div
      className={`
        px-4 py-3 rounded-2xl border-2 shadow-md min-w-[160px]
        transition-all duration-200
        ${isPositive ? "bg-gradient-to-br from-emerald-50 to-green-50" : "bg-gradient-to-br from-rose-50 to-pink-50"}
        ${selected
          ? isPositive
            ? "border-emerald-500 shadow-emerald-100 shadow-lg"
            : "border-rose-500 shadow-rose-100 shadow-lg"
          : isPositive
            ? "border-emerald-300 hover:border-emerald-400"
            : "border-rose-300 hover:border-rose-400"
        }
      `}
    >
      <Handle
        type="target"
        position={Position.Left}
        className={`!w-3 !h-3 !border-2 !border-white ${isPositive ? "!bg-emerald-400" : "!bg-rose-400"}`}
      />

      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center ${
            isPositive ? "bg-emerald-100" : "bg-rose-100"
          }`}
        >
          <IconComp
            className={`w-5 h-5 ${isPositive ? "text-emerald-600" : "text-rose-600"}`}
          />
        </div>
        <div>
          <div className="font-semibold text-sm text-slate-700">{nodeData.label}</div>
          <div className={`text-[11px] font-medium ${isPositive ? "text-emerald-600" : "text-rose-500"}`}>
            {isPositive ? "✨ Pipeline End" : "Pipeline End"}
          </div>
          {nodeData.costPerUnit > 0 && (
            <div className="text-[10px] text-slate-400">
              ${nodeData.costPerUnit}/candidate
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

ExitNode.displayName = "ExitNode";