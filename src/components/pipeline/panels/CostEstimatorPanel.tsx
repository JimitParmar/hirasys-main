"use client";

import React from "react";
import { DetailedCostEstimate } from "@/modules/pipeline/cost-estimator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  X,
  TrendingDown,
  DollarSign,
  Users,
  ArrowDown,
  UserPlus,
} from "lucide-react";

interface CostEstimatorPanelProps {
  estimate: DetailedCostEstimate;
  applicants: number;
  hires: number;
  onApplicantsChange: (n: number) => void;
  onHiresChange: (n: number) => void;
  onClose: () => void;
}

export function CostEstimatorPanel({
  estimate,
  applicants,
  hires,
  onApplicantsChange,
  onHiresChange,
  onClose,
}: CostEstimatorPanelProps) {
  const perHireCost =
    hires > 0
      ? Math.round((estimate.totalCost / hires) * 100) / 100
      : estimate.totalCost;

  return (
    <div className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden w-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#0245EF] to-purple-600 text-white">
        <div>
          <h3 className="font-semibold text-sm">💰 Cost Estimator</h3>
          <p className="text-xs opacity-80">Real-time pipeline cost preview</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20 h-8 w-8"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="max-h-[500px]">
        <div className="p-4 space-y-4">
          {/* Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                <Users className="w-3 h-3" />
                Expected Applicants
              </Label>
              <Input
                type="number"
                value={applicants}
                onChange={(e) =>
                  onApplicantsChange(parseInt(e.target.value) || 1)
                }
                className="h-9 font-mono"
                min={1}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                <UserPlus className="w-3 h-3" />
                Planning to Hire
              </Label>
              <Input
                type="number"
                value={hires}
                onChange={(e) =>
                  onHiresChange(parseInt(e.target.value) || 1)
                }
                className="h-9 font-mono"
                min={1}
              />
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#EBF0FF] rounded-lg p-3 text-center">
              <DollarSign className="w-4 h-4 text-[#0245EF] mx-auto mb-1" />
              <div className="text-xl font-bold text-[#0237BF]">
                ${estimate.totalCost}
              </div>
              <div className="text-[10px] text-[#0245EF]">
                Total Pipeline Cost
              </div>
            </div>
            <div className="bg-emerald-50 rounded-lg p-3 text-center">
              <UserPlus className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
              <div className="text-xl font-bold text-emerald-700">
                ${perHireCost}
              </div>
              <div className="text-[10px] text-emerald-500">
                Per Hire ({hires} hire{hires > 1 ? "s" : ""})
              </div>
            </div>
          </div>

          {/* Savings Banner */}
          {estimate.savingsVsNoFilters > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-3">
              <TrendingDown className="w-5 h-5 text-green-600 shrink-0" />
              <div>
                <div className="text-sm font-semibold text-green-700">
                  Filters save ${estimate.savingsVsNoFilters}
                </div>
                <div className="text-[11px] text-green-600">
                  {estimate.savingsPercentage}% cheaper than no filters
                </div>
              </div>
            </div>
          )}

          <Separator />

          {/* Stage Breakdown */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Stage Breakdown
            </Label>

            {estimate.stageBreakdown.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-4">
                Add nodes to see cost breakdown
              </p>
            )}

            {estimate.stageBreakdown.map((stage) => (
              <div
                key={stage.nodeId}
                className={`flex items-center justify-between p-2.5 rounded-lg text-xs ${
                  stage.isFree ? "bg-amber-50 border border-amber-100" : "bg-slate-50"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-700 truncate">
                    {stage.label}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {stage.estimatedReaching} reach
                    {stage.estimatedReaching !== stage.estimatedCompleting &&
                      ` → ${stage.estimatedCompleting} complete`}
                    {!stage.isFree &&
                      ` × $${stage.costPerUnit}`}
                  </div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  {stage.isFree ? (
                    <Badge className="bg-green-100 text-green-700 text-[10px] hover:bg-green-100">
                      FREE
                    </Badge>
                  ) : (
                    <span className="font-bold text-slate-700 font-mono">
                      ${stage.estimatedCost}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {estimate.funnelStages.length > 0 && (
            <>
              <Separator />

              {/* Funnel Visualization */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Candidate Funnel
                </Label>

                {estimate.funnelStages.map((stage, i) => {
                  const widthPercent = Math.max(
                    8,
                    (stage.passing / Math.max(applicants, 1)) * 100
                  );
                  return (
                    <div key={stage.nodeId}>
                      <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                        <span className="truncate mr-2">{stage.label}</span>
                        <span className="shrink-0 font-mono">
                          {stage.passing}
                          {stage.filtered > 0 && (
                            <span className="text-red-400">
                              {" "}(-{stage.filtered})
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#4775FF] to-purple-400 rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${widthPercent}%` }}
                        />
                      </div>
                      {i < estimate.funnelStages.length - 1 && (
                        <div className="flex justify-center py-0.5">
                          <ArrowDown className="w-3 h-3 text-slate-300" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <Separator />

          {/* Comparison with competitors */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-[#D1DEFF] rounded-lg p-3 space-y-2">
            <p className="text-xs font-semibold text-[#0237BF]">
              💡 How this compares
            </p>
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between text-slate-600">
                <span>Greenhouse + HackerRank + HireVue</span>
                <span className="font-mono font-semibold">
                  ~${Math.round(hires * 600)}
                </span>
              </div>
              <div className="flex justify-between text-[#0237BF] font-semibold">
                <span>Hirasys (this pipeline)</span>
                <span className="font-mono">${estimate.totalCost}</span>
              </div>
              <div className="flex justify-between text-green-600 font-semibold">
                <span>You save</span>
                <span className="font-mono">
                  ${Math.max(0, Math.round(hires * 600) - estimate.totalCost)} (
                  {Math.round(
                    ((hires * 600 - estimate.totalCost) /
                      Math.max(1, hires * 600)) *
                      100
                  )}
                  %)
                </span>
              </div>
            </div>
          </div>

          {/* Pro plan note */}
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-xs text-slate-600">
              <strong>Pro plan</strong> ($299/mo) includes $500 credit.{" "}
              {estimate.totalCost <= 500 ? (
                <span className="text-green-600 font-semibold">
                  Fully covered! ✅
                </span>
              ) : (
                <span>
                  Overage:{" "}
                  <span className="font-mono font-semibold">
                    ${Math.round((estimate.totalCost - 500) * 100) / 100}
                  </span>
                </span>
              )}
            </p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}