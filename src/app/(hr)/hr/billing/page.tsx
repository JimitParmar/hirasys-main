"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  ArrowLeft, Loader2, CreditCard, TrendingUp, DollarSign,
  Zap, CheckCircle, ArrowRight, BarChart3, Receipt,
  FileText, Calendar,
} from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";
import Link from "next/link";

export default function BillingPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<any[]>([]);
  const [upgrading, setUpgrading] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if ((user as any)?.role !== "ADMIN") {
        router.push("/hr/dashboard");
      } else {
        fetchBilling();
        fetchPlans();
      }
    }
  }, [authLoading, user]);

  const fetchBilling = async () => {
    try {
      const res = await fetch("/api/billing");
      const d = await res.json();
      setData(d);
    } catch {} finally { setLoading(false); }
  };

  const fetchPlans = async () => {
    try {
      const res = await fetch("/api/billing?action=plans");
      const d = await res.json();
      setPlans(d.plans || []);
    } catch {}
  };

  const upgradePlan = async (slug: string) => {
    setUpgrading(slug);
    try {
      const res = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "upgrade", planSlug: slug }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      toast.success(d.message);
      fetchBilling();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUpgrading(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0245EF]" />
      </div>
    );
  }

  const billing = data?.billing || {};
  const usage = data?.usage || { items: [], totalCost: 0 };
  const dailyUsage = data?.dailyUsage || [];

  const creditsPercent = billing.creditsIncluded > 0
    ? Math.min(100, (billing.creditsUsed / billing.creditsIncluded) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto h-12 flex items-center gap-3">
          <Link href="/hr/dashboard">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <CreditCard className="w-5 h-5 text-[#0245EF]" />
          <span className="text-sm font-semibold text-slate-800">Billing & Usage</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Current Plan */}
        <Card className="border-[#A3BDFF] bg-gradient-to-r from-[#EBF0FF] to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-[#0245EF] text-white text-sm px-3 py-1">
                    {billing.planName || "Free"} Plan
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {billing.billingCycle}
                  </Badge>
                </div>
                <p className="text-3xl font-bold text-slate-800 mt-2">
                  ${billing.baseCost || 0}
                  <span className="text-sm font-normal text-slate-400">/month</span>
                </p>
                {billing.periodEnd && (
                  <p className="text-xs text-slate-400 mt-1">
                    Current period ends {formatDate(billing.periodEnd)}
                  </p>
                )}
              </div>

              <div className="text-right">
                <p className="text-sm text-slate-500">This month&apos;s usage</p>
                <p className="text-2xl font-bold text-[#0245EF]">
                  ${billing.creditsUsed || 0}
                </p>
                {billing.overage > 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    ${billing.overage} overage
                  </p>
                )}
              </div>
            </div>

            {/* Credits bar */}
            {billing.creditsIncluded > 0 && (
              <div className="mt-4">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Credits: ${billing.creditsUsed} / ${billing.creditsIncluded} used</span>
                  <span>${billing.creditsRemaining} remaining</span>
                </div>
                <div className="h-3 bg-white rounded-full border">
                  <div
                    className={`h-full rounded-full transition-all ${
                      creditsPercent > 90 ? "bg-red-500" :
                      creditsPercent > 70 ? "bg-amber-500" : "bg-[#0245EF]"
                    }`}
                    style={{ width: `${creditsPercent}%` }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <DollarSign className="w-5 h-5 text-[#0245EF] mx-auto mb-1" />
              <p className="text-xl font-bold text-slate-800">${billing.totalDue || 0}</p>
              <p className="text-[10px] text-slate-400">Total Due</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <BarChart3 className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
              <p className="text-xl font-bold text-slate-800">{usage.totalUnits || 0}</p>
              <p className="text-[10px] text-slate-400">Operations</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-5 h-5 text-purple-500 mx-auto mb-1" />
              <p className="text-xl font-bold text-slate-800">${usage.totalCost || 0}</p>
              <p className="text-[10px] text-slate-400">Usage Cost</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Zap className="w-5 h-5 text-amber-500 mx-auto mb-1" />
              <p className="text-xl font-bold text-slate-800">${billing.creditsRemaining || 0}</p>
              <p className="text-[10px] text-slate-400">Credits Left</p>
            </CardContent>
          </Card>
        </div>

        {/* Usage Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Receipt className="w-5 h-5 text-[#0245EF]" />
              Usage Breakdown
            </CardTitle>
            <CardDescription>This billing period</CardDescription>
          </CardHeader>
          <CardContent>
            {usage.items.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No usage recorded yet</p>
            ) : (
              <div className="space-y-2">
                {usage.items.map((item: any) => (
                  <div key={item.nodeType} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-slate-700">{item.label}</p>
                      <p className="text-xs text-slate-400">
                        {item.totalUnits} × ${item.unitCost} per use
                      </p>
                    </div>
                    <p className="text-sm font-bold text-slate-800">${item.totalCost.toFixed(2)}</p>
                  </div>
                ))}

                <div className="flex items-center justify-between p-3 bg-[#EBF0FF] rounded-lg border border-[#A3BDFF] mt-3">
                  <p className="text-sm font-semibold text-[#0245EF]">Total Usage</p>
                  <p className="text-lg font-bold text-[#0245EF]">${usage.totalCost}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pricing Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Plans</CardTitle>
            <CardDescription>Upgrade to unlock more features and credits</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {plans.map((plan: any) => {
                let features = plan.features;
                try { if (typeof features === "string") features = JSON.parse(features); } catch {}

                const isCurrent = billing.planSlug === plan.slug;
                const isUpgrade = (plan.price_monthly || 0) > (billing.baseCost || 0);

                return (
                  <div
                    key={plan.id}
                    className={`rounded-xl border-2 p-5 ${
                      isCurrent
                        ? "border-[#0245EF] bg-[#EBF0FF]"
                        : "border-slate-200"
                    }`}
                  >
                    <h3 className="font-semibold text-slate-800">{plan.name}</h3>
                    <p className="text-2xl font-bold mt-1">
                      ${plan.price_monthly}
                      <span className="text-sm font-normal text-slate-400">/mo</span>
                    </p>

                    {plan.credits_included > 0 && (
                      <p className="text-xs text-[#0245EF] mt-1">
                        ${plan.credits_included} credits included
                      </p>
                    )}

                    <div className="mt-4 space-y-1.5">
                      {Object.entries(features || {}).slice(0, 5).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-2 text-xs">
                          <CheckCircle className={`w-3 h-3 ${isCurrent ? "text-[#0245EF]" : "text-emerald-500"}`} />
                          <span className="text-slate-600 capitalize">
                            {key.replace(/_/g, " ")}: {typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4">
                      {isCurrent ? (
                        <Button disabled className="w-full" variant="outline" size="sm">
                          Current Plan
                        </Button>
                      ) : isUpgrade ? (
                        <Button
                          className="w-full bg-[#0245EF] hover:bg-[#0237BF]"
                          size="sm"
                          onClick={() => upgradePlan(plan.slug)}
                          disabled={upgrading === plan.slug}
                        >
                          {upgrading === plan.slug ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-1" />
                          ) : (
                            <ArrowRight className="w-4 h-4 mr-1" />
                          )}
                          Upgrade
                        </Button>
                      ) : (
                        <Button variant="outline" className="w-full" size="sm" disabled>
                          Downgrade
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Rate Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Rate Card</CardTitle>
            <CardDescription>Per-use costs for each pipeline node</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(data?.nodeCosts || {}).map(([key, info]: [string, any]) => (
                <div key={key} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-sm">
                  <span className="text-slate-600">{info.label}</span>
                  <span className="font-mono font-medium text-slate-800">${info.cost}</span>
                </div>
              ))}
              <div className="flex items-center justify-between p-2 bg-emerald-50 rounded-lg text-sm col-span-2">
                <span className="text-emerald-700 font-medium">All Filter Nodes</span>
                <span className="font-mono font-bold text-emerald-700">FREE</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}