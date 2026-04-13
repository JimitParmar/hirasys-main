"use client";

import React, { useEffect, useState, useCallback } from "react";
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
  XCircle,
  AlertTriangle,
  Download,
  RefreshCw,
  Shield,
} from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";
import Script from "next/script";

declare global {
  interface Window {
    Razorpay: any;
  }
}

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmt(amount: number) {
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
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    "monthly"
  );
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [cancelling, setCancelling] = useState(false);

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
    } catch {
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

  // ==========================================
  // RAZORPAY CHECKOUT FLOW
  // ==========================================
  const handleUpgrade = useCallback(
    async (slug: string) => {
      setUpgrading(slug);

      try {
        // Step 1: Create checkout session on server
        const res = await fetch("/api/billing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "create_checkout",
            planSlug: slug,
            billingCycle,
          }),
        });

        const d = await res.json();
        if (!res.ok) throw new Error(d.error);

        // Free plan — no payment needed
        if (d.type === "free") {
          toast.success(d.message);
          await fetchAll();
          setUpgrading(null);
          return;
        }

        // Step 2: Open Razorpay checkout
        if (d.type === "razorpay") {
          if (!window.Razorpay) {
            throw new Error(
              "Payment system not loaded. Please refresh and try again."
            );
          }

          const options = {
            key: d.order.keyId,
            amount: d.order.amount,
            currency: d.order.currency,
            name: "HireFlow",
            description: `Plan Upgrade — ${slug} (${billingCycle})`,
            order_id: d.order.orderId,
            prefill: d.order.prefill,
            theme: {
              color: "#0245EF",
            },
            handler: async function (response: any) {
              // Step 3: Verify payment on server
              try {
                const verifyRes = await fetch("/api/billing", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    action: "verify_payment",
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                    planSlug: slug,
                    billingCycle,
                  }),
                });

                const verifyData = await verifyRes.json();

                if (!verifyRes.ok) {
                  throw new Error(
                    verifyData.error || "Payment verification failed"
                  );
                }

                toast.success(
                  verifyData.message || "Plan upgraded successfully! 🎉",
                  { duration: 5000 }
                );
                await fetchAll();
              } catch (err: any) {
                toast.error(err.message || "Payment verification failed");
              } finally {
                setUpgrading(null);
              }
            },
            modal: {
              ondismiss: function () {
                setUpgrading(null);
                toast("Payment cancelled", { icon: "ℹ️" });
              },
              escape: true,
              backdropclose: false,
            },
          };

          const rzp = new window.Razorpay(options);

          rzp.on("payment.failed", function (response: any) {
            console.error("Payment failed:", response.error);
            toast.error(
              `Payment failed: ${response.error?.description || "Unknown error"}`,
              { duration: 5000 }
            );
            setUpgrading(null);
          });

          rzp.open();
          return; // Don't clear upgrading — handler will do it
        }
      } catch (err: any) {
        toast.error(err.message || "Upgrade failed");
        setUpgrading(null);
      }
    },
    [billingCycle]
  );

  const handleCancel = async () => {
    if (
      !confirm(
        "Are you sure you want to cancel? You'll be downgraded to the Free plan."
      )
    ) {
      return;
    }

    setCancelling(true);
    try {
      const res = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      toast.success(d.message);
      await fetchAll();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCancelling(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
    toast.success("Refreshed");
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
      ? Math.min(100, (billing.creditsUsed / billing.creditsIncluded) * 100)
      : 0;

  return (
    <>
      {/* Load Razorpay SDK */}
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onLoad={() => setRazorpayLoaded(true)}
        strategy="lazyOnload"
      />

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
          {/* Current Plan */}
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
                    {billing.paymentMethod && (
                      <Badge
                        variant="outline"
                        className="text-[10px] text-emerald-600 border-emerald-200"
                      >
                        <Shield className="w-3 h-3 mr-0.5" />
                        Paid
                      </Badge>
                    )}
                  </div>
                  <p className="text-3xl font-bold text-slate-800 mt-2">
                    {fmt(billing.baseCost || 0)}
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
                    {fmt(billing.creditsUsed || 0)}
                  </p>
                  {billing.overage > 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      {fmt(billing.overage)} overage
                    </p>
                  )}
                </div>
              </div>

              {billing.creditsIncluded > 0 && (
                <div className="mt-5">
                  <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                    <span>
                      Credits: {fmt(billing.creditsUsed)} /{" "}
                      {fmt(billing.creditsIncluded)}
                    </span>
                    <span>{fmt(billing.creditsRemaining)} remaining</span>
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
                </div>
              )}

              {billing.planSlug !== "free" && (
                <div className="mt-4 pt-4 border-t border-[#A3BDFF]/30">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    {cancelling ? (
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                    ) : (
                      <XCircle className="w-3 h-3 mr-1" />
                    )}
                    Cancel Subscription
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              {
                icon: DollarSign,
                color: "text-[#0245EF]",
                value: fmt(billing.totalDue || 0),
                label: "Total Due",
              },
              {
                icon: BarChart3,
                color: "text-emerald-500",
                value: usage.totalUnits || 0,
                label: "Operations",
              },
              {
                icon: TrendingUp,
                color: "text-purple-500",
                value: fmt(usage.totalCost || 0),
                label: "Usage Cost",
              },
              {
                icon: Zap,
                color: "text-amber-500",
                value: fmt(billing.creditsRemaining || 0),
                label: "Credits Left",
              },
            ].map((stat, i) => (
              <Card key={i}>
                <CardContent className="p-4 text-center">
                  <stat.icon className={`w-5 h-5 ${stat.color} mx-auto mb-1`} />
                  <p className="text-xl font-bold text-slate-800">
                    {stat.value}
                  </p>
                  <p className="text-[10px] text-slate-400">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Daily Usage Chart */}
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
                            {new Date(day.date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                          <p>
                            {day.operations} ops • {fmt(day.cost)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

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
                      <div key={item.nodeType} className="p-3 bg-slate-50 rounded-lg">
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
                            {fmt(item.totalCost)}
                          </p>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                          <span>
                            {item.totalUnits} × {fmt(item.unitCost)} per use
                          </span>
                          <span>{Math.round(pct)}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#0245EF] rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex items-center justify-between p-3 bg-[#EBF0FF] rounded-lg border border-[#A3BDFF] mt-3">
                    <div>
                      <p className="text-sm font-semibold text-[#0245EF]">
                        Total
                      </p>
                      <p className="text-xs text-[#0245EF]/60">
                        {usage.totalUnits} ops
                      </p>
                    </div>
                    <p className="text-lg font-bold text-[#0245EF]">
                      {fmt(usage.totalCost)}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ==========================================
              PLANS — with billing toggle & Razorpay checkout
              ========================================== */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <CardTitle className="text-lg">Plans</CardTitle>
                  <CardDescription>Choose the right plan</CardDescription>
                </div>
                {/* Billing cycle toggle */}
                <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                  <button
                    onClick={() => setBillingCycle("monthly")}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      billingCycle === "monthly"
                        ? "bg-white shadow text-slate-800"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setBillingCycle("yearly")}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      billingCycle === "yearly"
                        ? "bg-white shadow text-slate-800"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    Yearly
                    <span className="ml-1 text-[10px] text-emerald-600 font-bold">
                      Save 20%
                    </span>
                  </button>
                </div>
              </div>
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
                  const monthlyPrice = parseFloat(plan.price_monthly) || 0;
                  const yearlyPrice = parseFloat(plan.price_yearly) || 0;
                  const displayPrice =
                    billingCycle === "yearly"
                      ? yearlyPrice > 0
                        ? yearlyPrice / 12
                        : monthlyPrice
                      : monthlyPrice;
                  const totalPrice =
                    billingCycle === "yearly" ? yearlyPrice : monthlyPrice;
                  const currentPrice = billing.baseCost || 0;
                  const isUpgrade = monthlyPrice > currentPrice;
                  const isDowngrade =
                    monthlyPrice < currentPrice && !isCurrent;
                  const credits = parseFloat(plan.credits_included) || 0;

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
                        {fmt(displayPrice)}
                        <span className="text-sm font-normal text-slate-400">
                          /mo
                        </span>
                      </p>

                      {billingCycle === "yearly" && yearlyPrice > 0 && (
                        <p className="text-[10px] text-slate-400">
                          {fmt(yearlyPrice)} billed annually
                        </p>
                      )}

                      {billingCycle === "yearly" &&
                        yearlyPrice > 0 &&
                        monthlyPrice > 0 && (
                          <p className="text-[10px] text-emerald-600 font-medium">
                            Save{" "}
                            {fmt(monthlyPrice * 12 - yearlyPrice)}/year
                          </p>
                        )}

                      {credits > 0 && (
                        <p className="text-xs text-[#0245EF] mt-1 font-medium">
                          {fmt(credits)} credits included
                        </p>
                      )}

                      <div className="mt-4 space-y-1.5 min-h-[110px]">
                        {Object.entries(features)
                          .slice(0, 6)
                          .map(([key, value]) => {
                            const on =
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
                                className="flex items-center gap-2 text-xs"
                              >
                                {on ? (
                                  <CheckCircle
                                    className={`w-3 h-3 shrink-0 ${isCurrent ? "text-[#0245EF]" : "text-emerald-500"}`}
                                  />
                                ) : (
                                  <XCircle className="w-3 h-3 shrink-0 text-slate-300" />
                                )}
                                <span
                                  className={
                                    on
                                      ? "text-slate-600 capitalize"
                                      : "text-slate-400 line-through capitalize"
                                  }
                                >
                                  {key.replace(/_/g, " ")}
                                  {typeof value === "string" &&
                                    value !== "true" &&
                                    value !== "false" &&
                                    on &&
                                    `: ${value}`}
                                  {typeof value === "number" &&
                                    value === -1 &&
                                    ": ∞"}
                                  {typeof value === "number" &&
                                    value > 0 &&
                                    value !== -1 &&
                                    on &&
                                    `: ${value}`}
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
                            <CheckCircle className="w-4 h-4 mr-1" /> Current
                          </Button>
                        ) : isUpgrade ? (
                          <Button
                            className="w-full bg-[#0245EF] hover:bg-[#0237BF]"
                            size="sm"
                            onClick={() => handleUpgrade(plan.slug)}
                            disabled={
                              upgrading === plan.slug ||
                              (!razorpayLoaded && totalPrice > 0)
                            }
                          >
                            {upgrading === plan.slug ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-1" />
                            ) : (
                              <ArrowRight className="w-4 h-4 mr-1" />
                            )}
                            {totalPrice > 0
                              ? `Upgrade — ${fmt(totalPrice)}`
                              : "Switch"}
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

              <p className="text-[10px] text-slate-400 text-center mt-4 flex items-center justify-center gap-1">
                <Shield className="w-3 h-3" />
                Payments are processed securely via Razorpay. Cancel anytime.
              </p>
            </CardContent>
          </Card>

          {/* Invoices */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#0245EF]" />
                Invoices
              </CardTitle>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <div className="text-center py-10">
                  <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm text-slate-400">No invoices yet</p>
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
                          {fmt(inv.totalAmount || 0)}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => {
                            const li = inv.lineItems || [];
                            const win = window.open("", "_blank");
                            if (win)
                              win.document.write(`<html><head><title>Invoice</title><style>body{font-family:sans-serif;max-width:800px;margin:40px auto;padding:20px;color:#334155}h1{color:#0245EF}table{width:100%;border-collapse:collapse;margin:20px 0}th,td{padding:8px 12px;text-align:left;border-bottom:1px solid #E2E8F0}th{background:#F8FAFC;color:#64748B;font-size:12px}.total{font-size:20px;font-weight:bold;color:#0245EF;text-align:right}@media print{body{margin:0}}</style></head><body><h1>Invoice</h1><p>${inv.planName} — ${formatDate(inv.periodStart)} to ${formatDate(inv.periodEnd)}</p><p>Status: <strong>${inv.status}</strong>${inv.paymentId ? ` | Payment: ${inv.paymentId}` : ""}</p><table><thead><tr><th>Description</th><th style="text-align:right">Amount</th></tr></thead><tbody>${li.map((l: any) => `<tr><td>${l.description}</td><td style="text-align:right">${fmt(Math.abs(l.amount))}${l.amount < 0 ? " (credit)" : ""}</td></tr>`).join("")}</tbody></table><p class="total">Total: ${fmt(inv.totalAmount || 0)}</p><br/><button onclick="window.print()" style="padding:8px 20px;background:#0245EF;color:white;border:none;border-radius:6px;cursor:pointer">Print</button></body></html>`);
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

          {/* Rate Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Rate Card</CardTitle>
              <CardDescription>Per-use costs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(data?.nodeCosts || {})
                  .sort(([, a]: any, [, b]: any) => b.cost - a.cost)
                  .map(([key, info]: [string, any]) => (
                    <div
                      key={key}
                      className={`flex items-center justify-between p-2.5 rounded-lg text-sm ${
                        info.cost === 0 ? "bg-emerald-50" : "bg-slate-50"
                      }`}
                    >
                      <span
                        className={
                          info.cost === 0
                            ? "text-emerald-700"
                            : "text-slate-600"
                        }
                      >
                        {info.label}
                      </span>
                      <span
                        className={`font-mono font-medium ${
                          info.cost === 0
                            ? "text-emerald-700"
                            : "text-slate-800"
                        }`}
                      >
                        {info.cost === 0 ? "FREE" : fmt(info.cost)}
                      </span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}