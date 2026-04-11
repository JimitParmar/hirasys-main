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
        ${selected
          ? "border-[#0245EF] shadow-[#D1DEFF] shadow-lg"
          : "border-slate-200 hover:border-[#4775FF] hover:shadow-lg"
        }
      `}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-[#0245EF] !border-2 !border-white"
      />

      {/* Edit Button */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          openNodeConfig(id);
        }}
        className="
          absolute -top-2 -right-2 w-7 h-7 rounded-full
          bg-white border-2 border-slate-200 shadow-sm
          flex items-center justify-center
          opacity-0 group-hover:opacity-100 transition-all duration-200
          hover:bg-[#EBF0FF] hover:border-[#0245EF] hover:scale-110
          z-50 cursor-pointer select-none nopan nodrag
        "
        title="Configure node"
      >
        <Pencil className="w-3 h-3 text-[#0245EF] pointer-events-none" />
      </div>

      {/* Node content */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${nodeData.color}15` }}
        >
          <IconComp className="w-5 h-5" style={{ color: nodeData.color }} />
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-sm text-slate-700 truncate">
            {nodeData.label}
          </div>
          <div className="text-[11px] text-slate-400">
            ${nodeData.costPerUnit}/candidate
          </div>
        </div>
      </div>

      {/* Config preview tags */}
      {(nodeData.config?.duration || nodeData.config?.difficulty || nodeData.config?.maxQuestions) && (
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400 flex-wrap">
          {nodeData.config?.duration && (
            <span className="bg-slate-100 px-1.5 py-0.5 rounded">
              ⏱ {nodeData.config.duration} min
            </span>
          )}
          {nodeData.config?.difficulty && (
            <span className="bg-slate-100 px-1.5 py-0.5 rounded capitalize">
              📊 {nodeData.config.difficulty}
            </span>
          )}
          {nodeData.config?.languages?.length > 0 && (
            <span className="bg-slate-100 px-1.5 py-0.5 rounded">
              💻 {nodeData.config.languages.length} lang
            </span>
          )}
          {nodeData.config?.maxQuestions && (
            <span className="bg-slate-100 px-1.5 py-0.5 rounded">
              🤖 {nodeData.config.maxQuestions} Q
            </span>
          )}
          {nodeData.config?.interviewMode && (
            <span className="bg-slate-100 px-1.5 py-0.5 rounded capitalize">
              {nodeData.config.interviewMode}
            </span>
          )}
        </div>
      )}

      {/* Assessment status — Auto vs Preset vs Missing */}
      {(nodeData.subtype === "coding_assessment" || nodeData.subtype === "mcq_assessment") && (
        <div className={`mt-2 flex items-center gap-1.5 text-[10px] px-2 py-1 rounded ${
          nodeData.config?.questionMode === "auto"
            ? "text-[#0245EF] bg-[#EBF0FF]"
            : nodeData.config?.questions?.length > 0
              ? "text-emerald-600 bg-emerald-50"
              : "text-amber-600 bg-amber-50"
        }`}>
          {nodeData.config?.questionMode === "auto" ? (
            <>
              <span>🤖</span>
              <span>Auto-generates from job description</span>
            </>
          ) : nodeData.config?.questions?.length > 0 ? (
            <>
              <span>✅</span>
              <span>{nodeData.config.questions.length} preset questions</span>
            </>
          ) : (
            <>
              <span>⚠️</span>
              <span>No questions — click ✏️ to configure</span>
            </>
          )}
        </div>
      )}

      {/* AI Interview config preview */}
      {(nodeData.subtype === "ai_technical_interview" || nodeData.subtype === "ai_behavioral_interview") && (
        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-[#0245EF] bg-[#EBF0FF] px-2 py-1 rounded">
          <span>🤖</span>
          <span>
            {nodeData.config?.maxQuestions || 10} questions •
            {" "}{nodeData.config?.interviewMode || "technical"} •
            {" "}{nodeData.config?.adaptive !== false ? "adaptive" : "fixed"}
          </span>
        </div>
      )}

      {/* Resume screen indicator */}
      {nodeData.subtype === "ai_resume_screen" && (
        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-[#0245EF] bg-[#EBF0FF] px-2 py-1 rounded">
          <span>📄</span>
          <span>AI scores resume against job requirements</span>
        </div>
      )}

      {/* F2F/Panel indicator */}
      {(nodeData.subtype === "f2f_interview" || nodeData.subtype === "panel_interview") && (
        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-500 bg-slate-50 px-2 py-1 rounded">
          <span>📅</span>
          <span>
            {nodeData.config?.duration || 60} min •
            {" "}{nodeData.config?.interviewType || "technical"}
            {nodeData.subtype === "panel_interview" && ` • ${nodeData.config?.panelSize || 3} panelists`}
          </span>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-[#0245EF] !border-2 !border-white"
      />
    </div>
  );
});

StageNode.displayName = "StageNode";