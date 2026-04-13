"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  ArrowLeft,
  Loader2,
  CreditCard,
  TrendingUp,
  DollarSign,
  Zap,
  CheckCircle,
  ArrowRight,
  BarChart3,
  Receipt,
  FileText,
  Calendar,
  XCircle,
  AlertTriangle,
  Download,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtCurrency(amount: number) {
  return `$${amount.toFixed(2)}`;
}

export default function BillingPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<any[]>([]);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) {
      const role = (user as any)?.role;
      if (role !== "ADMIN" && role !== "HR") {
        router.push("/hr/dashboard");
      } else {
        fetchAll();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  const fetchAll = async () => {
    setError(null);
    await Promise.all([fetchBilling(), fetchPlans()]);
  };

  const fetchBilling = async () => {
    try {
      const res = await fetch("/api/billing");
      const d = await res.json();
      if (!res.ok) {
        setError(d.error || "Failed to load billing");
        return;
      }
      setData(d);
    } catch (err) {
      setError("Failed to connect to billing service");
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const res = await fetch("/api/billing?action=plans");
      const d = await res.json();
      setPlans(d.plans || []);
    } catch {}
  };

  const handleUpgrade = async (slug: string) => {
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
      await fetchAll();
    } catch (err: any) {
      toast.error(err.message || "Upgrade failed");
    } finally {
      setUpgrading(null);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
    toast.success("Billing data refreshed");
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#0245EF] mx-auto mb-3" />
          <p className="text-sm text-slate-400">Loading billing...</p>
        </div>
      </div>
    );
  }

  if (error) {
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
            <span className="text-sm font-semibold text-slate-800">
              Billing & Usage
            </span>
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 text-center">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-700 mb-2">
            Billing Unavailable
          </h2>
          <p className="text-sm text-slate-400 mb-4">{error}</p>
          <Button onClick={fetchAll} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" /> Try Again
          </Button>
        </div>
      </div>
    );
  }

  const billing = data?.billing || {};
  const usage = data?.usage || { items: [], totalCost: 0, totalUnits: 0 };
  const dailyUsage = data?.dailyUsage || [];
  const invoices = data?.invoices || [];

  const creditsPercent =
    billing.creditsIncluded > 0
      ? Math.min(
          100,
          (billing.creditsUsed / billing.creditsIncluded) * 100
        )
      : 0;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto h-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/hr/dashboard">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <CreditCard className="w-5 h-5 text-[#0245EF]" />
            <span className="text-sm font-semibold text-slate-800">
              Billing & Usage
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw
              className={`w-4 h-4 mr-1 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* ==========================================
            CURRENT PLAN CARD
            ========================================== */}
        <Card className="border-[#A3BDFF] bg-gradient-to-r from-[#EBF0FF] to-white">
          <CardContent className="p-6">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className="bg-[#0245EF] text-white text-sm px-3 py-1">
                    {billing.planName || "Free"} Plan
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {billing.billingCycle}
                  </Badge>
                </div>
                <p className="text-3xl font-bold text-slate-800 mt-2">
                  {fmtCurrency(billing.baseCost || 0)}
                  <span className="text-sm font-normal text-slate-400">
                    /month
                  </span>
                </p>
                {billing.periodEnd && (
                  <p className="text-xs text-slate-400 mt-1">
                    Period ends {formatDate(billing.periodEnd)}
                  </p>
                )}
              </div>

              <div className="text-right">
                <p className="text-sm text-slate-500">
                  This month&apos;s usage
                </p>
                <p className="text-2xl font-bold text-[#0245EF]">
                  {fmtCurrency(billing.creditsUsed || 0)}
                </p>
                {billing.overage > 0 && (
                  <p className="text-xs text-amber-600 mt-1 flex items-center gap-1 justify-end">
                    <AlertTriangle className="w-3 h-3" />
                    {fmtCurrency(billing.overage)} overage
                  </p>
                )}
              </div>
            </div>

            {/* Credits Bar */}
            {billing.creditsIncluded > 0 && (
              <div className="mt-5">
                <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                  <span>
                    Credits: {fmtCurrency(billing.creditsUsed)} /{" "}
                    {fmtCurrency(billing.creditsIncluded)} used
                  </span>
                  <span>
                    {fmtCurrency(billing.creditsRemaining)} remaining
                  </span>
                </div>
                <div className="h-3 bg-white rounded-full border overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      creditsPercent > 90
                        ? "bg-red-500"
                        : creditsPercent > 70
                          ? "bg-amber-500"
                          : "bg-[#0245EF]"
                    }`}
                    style={{ width: `${Math.max(creditsPercent, 1)}%` }}
                  />
                </div>
                {creditsPercent > 80 && (
                  <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {creditsPercent > 95
                      ? "Credits almost exhausted! Consider upgrading."
                      : "Running low on credits."}
                  </p>
                )}
              </div>
            )}

            {billing.creditsIncluded === 0 &&
              billing.planSlug === "free" && (
                <p className="text-xs text-slate-400 mt-3">
                  Free plan — no included credits. All usage is
                  pay-as-you-go.
                </p>
              )}
          </CardContent>
        </Card>

        {/* ==========================================
            STATS CARDS
            ========================================== */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <DollarSign className="w-5 h-5 text-[#0245EF] mx-auto mb-1" />
              <p className="text-xl font-bold text-slate-800">
                {fmtCurrency(billing.totalDue || 0)}
              </p>
              <p className="text-[10px] text-slate-400">Total Due</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <BarChart3 className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
              <p className="text-xl font-bold text-slate-800">
                {usage.totalUnits || 0}
              </p>
              <p className="text-[10px] text-slate-400">Operations</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-5 h-5 text-purple-500 mx-auto mb-1" />
              <p className="text-xl font-bold text-slate-800">
                {fmtCurrency(usage.totalCost || 0)}
              </p>
              <p className="text-[10px] text-slate-400">Usage Cost</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Zap className="w-5 h-5 text-amber-500 mx-auto mb-1" />
              <p className="text-xl font-bold text-slate-800">
                {fmtCurrency(billing.creditsRemaining || 0)}
              </p>
              <p className="text-[10px] text-slate-400">Credits Left</p>
            </CardContent>
          </Card>
        </div>

        {/* ==========================================
            DAILY USAGE CHART
            ========================================== */}
        {dailyUsage.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#0245EF]" />
                Daily Usage (Last 30 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-36 flex items-end gap-[2px]">
                {dailyUsage.map((day: any, i: number) => {
                  const maxOps = Math.max(
                    ...dailyUsage.map((d: any) => d.operations || 1),
                    1
                  );
                  const height = Math.max(
                    4,
                    ((day.operations || 0) / maxOps) * 100
                  );
                  return (
                    <div key={i} className="flex-1 group relative">
                      <div
                        className="bg-[#0245EF] hover:bg-[#0237BF] rounded-t-sm transition-all cursor-pointer"
                        style={{ height: `${height}%` }}
                      />
                      <div className="hidden group-hover:block absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1.5 rounded-lg whitespace-nowrap z-10 shadow-lg">
                        <p className="font-medium">
                          {new Date(day.date).toLocaleDateString(
                            "en-US",
                            { month: "short", day: "numeric" }
                          )}
                        </p>
                        <p>
                          {day.operations} ops •{" "}
                          {fmtCurrency(day.cost)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 mt-2">
                <span>
                  {dailyUsage.length > 0
                    ? formatDate(dailyUsage[0].date)
                    : ""}
                </span>
                <span className="text-slate-300">
                  Hover bars for details
                </span>
                <span>
                  {dailyUsage.length > 0
                    ? formatDate(
                        dailyUsage[dailyUsage.length - 1].date
                      )
                    : ""}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ==========================================
            USAGE BREAKDOWN
            ========================================== */}
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
              <div className="text-center py-10">
                <BarChart3 className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-slate-400">
                  No usage recorded yet
                </p>
                <p className="text-xs text-slate-300 mt-1">
                  Usage is tracked automatically when pipeline nodes run
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {usage.items.map((item: any) => {
                  const pct =
                    usage.totalCost > 0
                      ? (item.totalCost / usage.totalCost) * 100
                      : 0;
                  return (
                    <div
                      key={item.nodeType}
                      className="p-3 bg-slate-50 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-slate-700">
                            {item.label}
                          </p>
                          <Badge
                            variant="outline"
                            className="text-[9px] h-4 px-1"
                          >
                            {item.nodeType}
                          </Badge>
                        </div>
                        <p className="text-sm font-bold text-slate-800">
                          {fmtCurrency(item.totalCost)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                        <span>
                          {item.totalUnits} × {fmtCurrency(item.unitCost)}{" "}
                          per use
                        </span>
                        <span>{Math.round(pct)}% of total</span>
                      </div>
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#0245EF] rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}

                <div className="flex items-center justify-between p-3 bg-[#EBF0FF] rounded-lg border border-[#A3BDFF] mt-3">
                  <div>
                    <p className="text-sm font-semibold text-[#0245EF]">
                      Total Usage
                    </p>
                    <p className="text-xs text-[#0245EF]/60">
                      {usage.totalUnits} total operations
                    </p>
                  </div>
                  <p className="text-lg font-bold text-[#0245EF]">
                    {fmtCurrency(usage.totalCost)}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ==========================================
            PRICING TABLE
            ========================================== */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Plans</CardTitle>
            <CardDescription>
              Choose the right plan for your team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {plans.map((plan: any) => {
                let features = plan.features || {};
                try {
                  if (typeof features === "string")
                    features = JSON.parse(features);
                } catch {
                  features = {};
                }

                const isCurrent = billing.planSlug === plan.slug;
                const planPrice = parseFloat(plan.price_monthly) || 0;
                const currentPrice = billing.baseCost || 0;
                const isUpgrade = planPrice > currentPrice;
                const isDowngrade =
                  planPrice < currentPrice && !isCurrent;
                const creditsIncluded =
                  parseFloat(plan.credits_included) || 0;

                return (
                  <div
                    key={plan.id}
                    className={`rounded-xl border-2 p-5 transition-all ${
                      isCurrent
                        ? "border-[#0245EF] bg-[#EBF0FF] shadow-md"
                        : "border-slate-200 hover:border-[#A3BDFF] hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-slate-800">
                        {plan.name}
                      </h3>
                      {isCurrent && (
                        <Badge className="bg-[#0245EF] text-white text-[9px]">
                          Current
                        </Badge>
                      )}
                    </div>

                    <p className="text-2xl font-bold mt-1">
                      {fmtCurrency(planPrice)}
                      <span className="text-sm font-normal text-slate-400">
                        /mo
                      </span>
                    </p>

                    {parseFloat(plan.price_yearly) > 0 && (
                      <p className="text-[10px] text-slate-400">
                        or {fmtCurrency(parseFloat(plan.price_yearly))}
                        /year (save{" "}
                        {Math.round(
                          100 -
                            (parseFloat(plan.price_yearly) /
                              (planPrice * 12)) *
                              100
                        )}
                        %)
                      </p>
                    )}

                    {creditsIncluded > 0 && (
                      <p className="text-xs text-[#0245EF] mt-1 font-medium">
                        {fmtCurrency(creditsIncluded)} credits included
                      </p>
                    )}

                    <div className="mt-4 space-y-1.5 min-h-[120px]">
                      {Object.entries(features)
                        .slice(0, 7)
                        .map(([key, value]) => {
                          const isEnabled =
                            value === true ||
                            value === "true" ||
                            value === "unlimited" ||
                            (typeof value === "number" &&
                              (value > 0 || value === -1)) ||
                            (typeof value === "string" &&
                              value !== "false" &&
                              value !== "0");

                          let displayValue = "";
                          if (
                            typeof value === "number" &&
                            value === -1
                          ) {
                            displayValue = "Unlimited";
                          } else if (
                            typeof value === "string" &&
                            value !== "true" &&
                            value !== "false"
                          ) {
                            displayValue = value;
                          } else if (typeof value === "number") {
                            displayValue = String(value);
                          }

                          return (
                            <div
                              key={key}
                              className="flex items-center gap-2 text-xs"
                            >
                              {isEnabled ? (
                                <CheckCircle
                                  className={`w-3 h-3 shrink-0 ${isCurrent ? "text-[#0245EF]" : "text-emerald-500"}`}
                                />
                              ) : (
                                <XCircle className="w-3 h-3 shrink-0 text-slate-300" />
                              )}
                              <span
                                className={
                                  isEnabled
                                    ? "text-slate-600"
                                    : "text-slate-400 line-through"
                                }
                              >
                                {key.replace(/_/g, " ")}
                                {displayValue &&
                                  isEnabled &&
                                  typeof value !== "boolean" &&
                                  value !== "true" &&
                                  `: ${displayValue}`}
                              </span>
                            </div>
                          );
                        })}
                    </div>

                    <div className="mt-4">
                      {isCurrent ? (
                        <Button
                          disabled
                          className="w-full"
                          variant="outline"
                          size="sm"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Current Plan
                        </Button>
                      ) : isUpgrade ? (
                        <Button
                          className="w-full bg-[#0245EF] hover:bg-[#0237BF]"
                          size="sm"
                          onClick={() => handleUpgrade(plan.slug)}
                          disabled={upgrading === plan.slug}
                        >
                          {upgrading === plan.slug ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-1" />
                          ) : (
                            <ArrowRight className="w-4 h-4 mr-1" />
                          )}
                          Upgrade
                        </Button>
                      ) : isDowngrade ? (
                        <Button
                          variant="outline"
                          className="w-full text-slate-500"
                          size="sm"
                          onClick={() => handleUpgrade(plan.slug)}
                          disabled={upgrading === plan.slug}
                        >
                          {upgrading === plan.slug ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-1" />
                          ) : null}
                          Downgrade
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* ==========================================
            INVOICES
            ========================================== */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#0245EF]" />
              Invoices
            </CardTitle>
            <CardDescription>
              Billing history and past invoices
            </CardDescription>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <div className="text-center py-10">
                <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-slate-400">
                  No invoices yet
                </p>
                <p className="text-xs text-slate-300 mt-1">
                  Invoices are generated at the end of each billing
                  period
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {invoices.map((inv: any) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-slate-700">
                          {inv.planName || "Invoice"}
                        </p>
                        <p className="text-xs text-slate-400">
                          {formatDate(inv.periodStart)} –{" "}
                          {formatDate(inv.periodEnd)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        className={`text-[10px] ${
                          inv.status === "PAID"
                            ? "bg-emerald-100 text-emerald-700"
                            : inv.status === "ISSUED"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {inv.status}
                      </Badge>
                      <p className="text-sm font-bold text-slate-800 min-w-[60px] text-right">
                        {fmtCurrency(inv.totalAmount || 0)}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        title="View Invoice"
                        onClick={() => {
                          const lineItems = inv.lineItems || [];
                          const win = window.open("", "_blank");
                          if (win) {
                            win.document.write(`
                              <html>
                              <head>
                                <title>Invoice — ${inv.planName || "Invoice"}</title>
                                <style>
                                  * { box-sizing: border-box; margin: 0; padding: 0; }
                                  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; color: #334155; }
                                  .header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 2px solid #E2E8F0; }
                                  .header h1 { font-size: 28px; color: #0245EF; }
                                  .meta { color: #94A3B8; font-size: 13px; line-height: 1.6; }
                                  table { width: 100%; border-collapse: collapse; margin: 24px 0; }
                                  th { text-align: left; padding: 10px 12px; background: #F8FAFC; color: #64748B; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #E2E8F0; }
                                  td { padding: 10px 12px; border-bottom: 1px solid #F1F5F9; font-size: 14px; }
                                  .amount { text-align: right; font-variant-numeric: tabular-nums; }
                                  .total-row td { font-weight: 700; font-size: 16px; color: #0245EF; border-top: 2px solid #0245EF; }
                                  .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
                                  .status-issued { background: #FEF3C7; color: #92400E; }
                                  .status-paid { background: #D1FAE5; color: #065F46; }
                                  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #E2E8F0; font-size: 12px; color: #94A3B8; }
                                  @media print { body { padding: 0; } .no-print { display: none; } }
                                </style>
                              </head>
                              <body>
                                <div class="header">
                                  <div>
                                    <h1>Invoice</h1>
                                    <p class="meta" style="margin-top: 8px">${inv.planName || "—"} Plan</p>
                                  </div>
                                  <div style="text-align: right">
                                    <span class="status ${inv.status === "PAID" ? "status-paid" : "status-issued"}">${inv.status}</span>
                                    <p class="meta" style="margin-top: 8px">
                                      Period: ${formatDate(inv.periodStart)} – ${formatDate(inv.periodEnd)}<br/>
                                      Generated: ${formatDate(inv.createdAt)}
                                    </p>
                                  </div>
                                </div>

                                <table>
                                  <thead>
                                    <tr>
                                      <th>Description</th>
                                      <th class="amount">Amount</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    ${lineItems
                                      .map(
                                        (li: any) =>
                                          `<tr>
                                            <td>${li.description}</td>
                                            <td class="amount">${li.amount < 0 ? "-" : ""}${fmtCurrency(Math.abs(li.amount))}</td>
                                          </tr>`
                                      )
                                      .join("")}
                                    <tr class="total-row">
                                      <td>Total</td>
                                      <td class="amount">${fmtCurrency(inv.totalAmount || 0)}</td>
                                    </tr>
                                  </tbody>
                                </table>

                                <div style="margin-top: 24px; padding: 16px; background: #F8FAFC; border-radius: 8px;">
                                  <p style="font-size: 13px; color: #64748B;">
                                    <strong>Base:</strong> ${fmtCurrency(inv.baseAmount || 0)} &nbsp;|&nbsp;
                                    <strong>Usage:</strong> ${fmtCurrency(inv.usageAmount || 0)} &nbsp;|&nbsp;
                                    <strong>Credits:</strong> -${fmtCurrency(inv.creditsApplied || 0)}
                                  </p>
                                </div>

                                <div class="footer">
                                  <p>This is an auto-generated invoice.</p>
                                </div>

                                <div class="no-print" style="margin-top: 20px; text-align: center;">
                                  <button onclick="window.print()" style="padding: 8px 24px; background: #0245EF; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">
                                    Print / Save as PDF
                                  </button>
                                </div>
                              </body>
                              </html>
                            `);
                          }
                        }}
                      >
                        <Download className="w-4 h-4 text-slate-400" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ==========================================
            RATE CARD
            ========================================== */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Rate Card</CardTitle>
            <CardDescription>
              Per-use costs for each pipeline node
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.entries(data?.nodeCosts || {})
                .sort(
                  ([, a]: [string, any], [, b]: [string, any]) =>
                    b.cost - a.cost
                )
                .map(([key, info]: [string, any]) => (
                  <div
                    key={key}
                    className={`flex items-center justify-between p-2.5 rounded-lg text-sm ${
                      info.cost === 0
                        ? "bg-emerald-50"
                        : "bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          info.cost === 0
                            ? "bg-emerald-400"
                            : info.cost >= 2
                              ? "bg-purple-400"
                              : info.cost >= 1
                                ? "bg-blue-400"
                                : "bg-slate-400"
                        }`}
                      />
                      <span
                        className={
                          info.cost === 0
                            ? "text-emerald-700"
                            : "text-slate-600"
                        }
                      >
                        {info.label}
                      </span>
                    </div>
                    <span
                      className={`font-mono font-medium ${
                        info.cost === 0
                          ? "text-emerald-700"
                          : "text-slate-800"
                      }`}
                    >
                      {info.cost === 0
                        ? "FREE"
                        : fmtCurrency(info.cost)}
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* ==========================================
            PLAN FEATURES (current plan)
            ========================================== */}
        {billing.features &&
          Object.keys(billing.features).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Your Plan Features
                </CardTitle>
                <CardDescription>
                  What&apos;s included in {billing.planName}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(billing.features).map(
                    ([key, value]: [string, any]) => {
                      const isEnabled =
                        value === true ||
                        value === "true" ||
                        value === "unlimited" ||
                        (typeof value === "number" &&
                          (value > 0 || value === -1)) ||
                        (typeof value === "string" &&
                          value !== "false" &&
                          value !== "0");

                      return (
                        <div
                          key={key}
                          className={`flex items-center gap-2 p-2.5 rounded-lg text-xs ${
                            isEnabled
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-50 text-slate-400"
                          }`}
                        >
                          {isEnabled ? (
                            <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 shrink-0" />
                          )}
                          <span className="capitalize">
                            {key.replace(/_/g, " ")}
                            {typeof value === "number" &&
                              value !== -1 &&
                              isEnabled &&
                              `: ${value}`}
                            {value === "unlimited" && ": ∞"}
                            {typeof value === "number" &&
                              value === -1 &&
                              ": ∞"}
                            {typeof value === "string" &&
                              value !== "true" &&
                              value !== "false" &&
                              value !== "unlimited" &&
                              `: ${value}`}
                          </span>
                        </div>
                      );
                    }
                  )}
                </div>
              </CardContent>
            </Card>
          )}
      </div>
    </div>
  );
}