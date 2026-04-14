"use client";

import { Shield, AlertTriangle, Eye } from "lucide-react";

interface ProctoringBannerProps {
  warnings: number;
  maxWarnings: number;
  tabSwitches: number;
  copyAttempts: number;
}

export function ProctoringBanner({
  warnings,
  maxWarnings,
  tabSwitches,
  copyAttempts,
}: ProctoringBannerProps) {
  if (warnings === 0) {
    return (
      <div className="bg-emerald-900/30 border-b border-emerald-700/50 px-4 py-1.5 flex items-center justify-center gap-2 text-xs text-emerald-400">
        <Shield className="w-3 h-3" />
        <span>Proctored assessment — your activity is being monitored</span>
      </div>
    );
  }

  const isHigh = warnings >= maxWarnings - 1;

  return (
    <div
      className={`border-b px-4 py-1.5 flex items-center justify-between text-xs ${
        isHigh
          ? "bg-red-900/50 border-red-700/50 text-red-400"
          : "bg-amber-900/30 border-amber-700/50 text-amber-400"
      }`}
    >
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-3 h-3" />
        <span>
          {isHigh
            ? "⚠️ Final warning — further violations will be flagged for review"
            : `Activity warning: ${warnings}/${maxWarnings} violations detected`}
        </span>
      </div>
      <div className="flex items-center gap-3">
        {tabSwitches > 0 && (
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {tabSwitches} tab switch{tabSwitches !== 1 ? "es" : ""}
          </span>
        )}
        {copyAttempts > 0 && (
          <span>
            {copyAttempts} copy attempt{copyAttempts !== 1 ? "s" : ""}
          </span>
        )}
      </div>
    </div>
  );
}