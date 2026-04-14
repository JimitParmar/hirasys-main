"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";

interface UpgradePromptProps {
  feature: string;
  message?: string;
  currentPlan?: string;
  inline?: boolean;
}

export function UpgradePrompt({
  feature,
  message,
  currentPlan,
  inline = false,
}: UpgradePromptProps) {
  if (inline) {
    return (
      <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
        <Lock className="w-3 h-3 shrink-0" />
        <span>{message || `${feature} requires a paid plan.`}</span>
        <Link href="/hr/billing">
          <Button
            size="sm"
            className="h-6 text-[10px] bg-[#0245EF] hover:bg-[#0237BF] ml-auto"
          >
            Upgrade
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="border-2 border-dashed border-amber-200 bg-amber-50/50 rounded-xl p-6 text-center">
      <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mx-auto mb-3">
        <Lock className="w-6 h-6 text-amber-600" />
      </div>
      <h3 className="font-semibold text-slate-800 mb-1">
        {feature}
      </h3>
      <p className="text-sm text-slate-500 mb-4">
        {message ||
          "This feature is not available on your current plan."}
      </p>
      {currentPlan && (
        <Badge variant="outline" className="mb-3 text-xs">
          Current: {currentPlan}
        </Badge>
      )}
      <Link href="/hr/billing" className="block">
        <Button className="bg-[#0245EF] hover:bg-[#0237BF]">
          <Sparkles className="w-4 h-4 mr-2" />
          Upgrade Plan
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </Link>
    </div>
  );
}

export function PlanBadge({
  plan,
}: {
  plan: string;
}) {
  const config: Record<string, { bg: string; label: string }> = {
    free: { bg: "bg-slate-100 text-slate-600", label: "Free" },
    pro: { bg: "bg-[#EBF0FF] text-[#0245EF]", label: "Pro" },
    enterprise: {
      bg: "bg-purple-100 text-purple-700",
      label: "Enterprise",
    },
  };

  const c = config[plan] || config.free;

  return (
    <Badge className={`text-[10px] ${c.bg}`}>{c.label}</Badge>
  );
}