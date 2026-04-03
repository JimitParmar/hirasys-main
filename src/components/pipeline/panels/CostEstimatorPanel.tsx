"use client";

import React from "react";
import { DetailedCostEstimate } from "@/modules/pipeline/cost-estimator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { X, TrendingDown, DollarSign, Users, ArrowDown } from "lucide-react";

interface CostEstimatorPanelProps {
  estimate: DetailedCostEstimate;
  applicants: number;
  onApplicantsChange: (n: number) => void;
  onClose: () => void;
}

export function CostEstimatorPanel({
  estimate,
  applicants,
  onApplicantsChange,
  onClose,
}: CostEstimatorPanelProps) {
  return (
    <div className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden w-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
        <div>
          <h3 className="font-semibold text-sm">Cost Estimator</h3>
          <p className="text-xs opacity-80">Real-time pipeline cost preview</p>
        </div>
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="max-h-[500px]">
        <div className="p-4 space-y-4">
          {/* Applicant Input */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-500">
              Expected applicants
            </Label>
            <Input
              type="number"
              value={applicants}
              onChange={(e) => onApplicantsChange(parseInt(e.target.value) || 100)}
              className="h-9"
              min={1}
            />
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-indigo-50 rounded-lg p-3 text-center">
              <DollarSign className="w-4 h-4 text-indigo-500 mx-auto mb-1" />
              <div className="text-lg font-bold text-indigo-700">${estimate.totalCost}</div>
              <div className="text-[10px] text-indigo-500">Total Cost</div>
            </div>
            <div className="bg-emerald-50 rounded-lg p-3 text-center">
              <Users className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
              <div className="text-lg font-bold text-emerald-700">${estimate.perHireCost}</div>
              <div className="text-[10px] text-emerald-500">Per Hire (est. {estimate.estimatedHires})</div>
            </div>
          </div>

          {/* Savings */}
          {estimate.savingsVsNoFilters > 0 && (
            <div className="bg-green-50 border border-green-100 rounded-lg p-3 flex items-center gap-3">
              <TrendingDown className="w-5 h-5 text-green-600 shrink-0" />
              <div>
                <div className="text-sm font-semibold text-green-700">
                  Filters save ${estimate.savingsVsNoFilters}
                </div>
                <div className="text-xs text-green-600">
                  {estimate.savingsPercentage}% cheaper than running all candidates through every stage
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

            {estimate.stageBreakdown.map((stage, i) => (
              <div
                key={stage.nodeId}
                className={`flex items-center justify-between p-2 rounded-lg text-xs ${
                  stage.isFree ? "bg-amber-50" : "bg-slate-50"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-700 truncate">{stage.label}</div>
                  <div className="text-slate-400">
                    {stage.estimatedReaching} candidates
                    {stage.estimatedReaching !== stage.estimatedCompleting && (
                      <span> → {stage.estimatedCompleting} complete</span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  {stage.isFree ? (
                    <Badge className="bg-green-100 text-green-700 text-[10px] hover:bg-green-100">
                      FREE
                    </Badge>
                  ) : (
                    <span className="font-semibold text-slate-700">${stage.estimatedCost}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <Separator />

          {/* Funnel Visualization */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Candidate Funnel
            </Label>

            {estimate.funnelStages.map((stage, i) => {
              const widthPercent = Math.max(10, (stage.passing / applicants) * 100);
              return (
                <div key={stage.nodeId} className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>{stage.label}</span>
                    <span>
                      {stage.passing}
                      {stage.filtered > 0 && (
                        <span className="text-red-400 ml-1">(-{stage.filtered})</span>
                      )}
                      {stage.dropoff > 0 && (
                        <span className="text-orange-400 ml-1">(~{stage.dropoff} no-show)</span>
                      )}
                    </span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full transition-all duration-500"
                      style={{ width: `${widthPercent}%` }}
                    />
                  </div>
                  {i < estimate.funnelStages.length - 1 && (
                    <div className="flex justify-center">
                      <ArrowDown className="w-3 h-3 text-slate-300" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pro Plan Note */}
          <div className="bg-indigo-50 rounded-lg p-3">
            <p className="text-xs text-indigo-700">
              💡 <strong>Pro plan</strong> ($299/mo) includes $500 credit.{" "}
              {estimate.totalCost <= 500 ? (
                <span className="text-green-600 font-medium">
                  This pipeline is fully covered! ✅
                </span>
              ) : (
                <span>
                  Estimated overage: ${Math.round((estimate.totalCost - 500) * 100) / 100}
                </span>
              )}
            </p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}