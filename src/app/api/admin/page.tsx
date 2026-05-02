"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Shield,
  Loader2,
  CheckCircle,
  XCircle,
  Building2,
  Crown,
  Zap,
  Rocket,
  Gift,
  RefreshCw,
  Copy,
  Check,
  Lock,
  Database,
  CreditCard,
  Users,
  Search,
} from "lucide-react";

type Company = {
  id: string;
  name: string;
  domain: string;
  plan_slug: string;
  plan_name: string;
  credits_remaining: number;
  member_count: number;
  period_end: string;
};

type ActionLog = {
  timestamp: string;
  action: string;
  status: "success" | "error";
};

const PLANS = [
  {
    slug: "free",
    name: "Free",
    icon: Gift,
    color: "bg-slate-100 text-slate-700 border-slate-200",
    activeColor: "bg-slate-900 text-white border-slate-900",
    description: "1 job, 1 member, basic features",
  },
  {
    slug: "pro",
    name: "Pro",
    icon: Zap,
    color: "bg-blue-50 text-blue-700 border-blue-200",
    activeColor: "bg-[#0245EF] text-white border-[#0245EF]",
    description: "10 jobs, 3 members, all features",
  },
  {
    slug: "enterprise",
    name: "Enterprise",
    icon: Rocket,
    color: "bg-purple-50 text-purple-700 border-purple-200",
    activeColor: "bg-purple-600 text-white border-purple-600",
    description: "30 jobs, 7 members, SSO, audit logs",
  },
];

export default function AdminConsolePage() {
  const [secretKey, setSecretKey] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [actionLog, setActionLog] = useState<ActionLog[]>([]);

  const authenticate = async () => {
    if (!secretKey.trim()) return;
    setAuthenticating(true);
    setAuthError(false);

    try {
      const res = await fetch("/api/admin/companies", {
        headers: { "x-admin-secret": secretKey },
      });

      if (res.status === 401) {
        setAuthError(true);
        setAuthenticated(false);
        return;
      }

      const data = await res.json();
      setCompanies(data.companies || []);
      setAuthenticated(true);
    } catch {
      setAuthError(true);
    } finally {
      setAuthenticating(false);
    }
  };

  const refreshCompanies = async () => {
    setLoadingCompanies(true);
    try {
      const res = await fetch("/api/admin/companies", {
        headers: { "x-admin-secret": secretKey },
      });
      const data = await res.json();
      setCompanies(data.companies || []);

      if (selectedCompany) {
        const updated = data.companies?.find(
          (c: Company) => c.id === selectedCompany.id
        );
        if (updated) setSelectedCompany(updated);
      }
    } catch {
      log("Failed to refresh companies", "error");
    } finally {
      setLoadingCompanies(false);
    }
  };

  const setPlan = async (companyId: string, planSlug: string) => {
    setUpdating(planSlug);
    try {
      const res = await fetch("/api/admin/set-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": secretKey,
        },
        body: JSON.stringify({ companyId, planSlug }),
      });

      const data = await res.json();

      if (!res.ok) {
        log(`Failed to set ${planSlug} for ${selectedCompany?.name}: ${data.error}`, "error");
        return;
      }

      log(`Set ${planSlug.toUpperCase()} plan for ${selectedCompany?.name}`, "success");
      await refreshCompanies();
    } catch {
      log(`Failed to set ${planSlug}`, "error");
    } finally {
      setUpdating(null);
    }
  };

  const resetCredits = async (companyId: string, amount: number) => {
    setUpdating("credits");
    try {
      const res = await fetch("/api/admin/set-credits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": secretKey,
        },
        body: JSON.stringify({ companyId, credits: amount }),
      });

      if (!res.ok) {
        log("Failed to reset credits", "error");
        return;
      }

      log(`Set credits to ${amount.toLocaleString()} for ${selectedCompany?.name}`, "success");
      await refreshCompanies();
    } catch {
      log("Failed to reset credits", "error");
    } finally {
      setUpdating(null);
    }
  };

  const log = (action: string, status: "success" | "error") => {
    setActionLog((prev) => [
      { timestamp: new Date().toLocaleTimeString(), action, status },
      ...prev.slice(0, 19),
    ]);
  };

  const filteredCompanies = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.domain?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ============ AUTH GATE ============
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm border-slate-800 bg-slate-900">
          <CardContent className="p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Admin Console</h1>
                <p className="text-xs text-slate-500">Hirasys Internal</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">
                  Secret Key
                </label>
                <input
                  type="password"
                  value={secretKey}
                  onChange={(e) => {
                    setSecretKey(e.target.value);
                    setAuthError(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") authenticate();
                  }}
                  placeholder="Enter admin secret"
                  className="w-full h-10 px-3 rounded-lg border border-slate-700 bg-slate-800 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  autoFocus
                />
              </div>

              {authError && (
                <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">
                  <XCircle className="w-4 h-4 shrink-0" />
                  Invalid secret key
                </div>
              )}

              <Button
                onClick={authenticate}
                disabled={authenticating || !secretKey.trim()}
                className="w-full h-10 bg-red-600 hover:bg-red-700 text-white"
              >
                {authenticating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Authenticate
                  </>
                )}
              </Button>
            </div>

            <p className="text-[10px] text-slate-600 text-center mt-6">
              This console is restricted to Hirasys administrators only.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============ MAIN CONSOLE ============
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Top bar */}
      <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-red-500" />
            <span className="text-sm font-bold text-white">
              Admin Console
            </span>
            <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
              {companies.length} companies
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshCompanies}
              disabled={loadingCompanies}
              className="text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <RefreshCw
                className={`w-4 h-4 mr-1 ${loadingCompanies ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setAuthenticated(false);
                setSecretKey("");
                setCompanies([]);
                setSelectedCompany(null);
                setActionLog([]);
              }}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              Lock Console
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* ====== LEFT — Company List ====== */}
          <div className="lg:col-span-1 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search companies..."
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-800 bg-slate-900 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-700"
              />
            </div>

            {/* Company cards */}
            <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
              {filteredCompanies.map((company) => {
                const isSelected = selectedCompany?.id === company.id;
                const planConfig = PLANS.find((p) => p.slug === company.plan_slug);

                return (
                  <button
                    key={company.id}
                    onClick={() => setSelectedCompany(company)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      isSelected
                        ? "border-[#0245EF] bg-[#0245EF]/10"
                        : "border-slate-800 bg-slate-900 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-white truncate">
                        {company.name}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          company.plan_slug === "enterprise"
                            ? "bg-purple-500/20 text-purple-400"
                            : company.plan_slug === "pro"
                              ? "bg-blue-500/20 text-blue-400"
                              : "bg-slate-700 text-slate-400"
                        }`}
                      >
                        {company.plan_slug?.toUpperCase() || "FREE"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                      <span>{company.domain || "no domain"}</span>
                      <span>•</span>
                      <span>{company.member_count || 0} members</span>
                    </div>
                  </button>
                );
              })}

              {filteredCompanies.length === 0 && (
                <div className="text-center py-8">
                  <Building2 className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No companies found</p>
                </div>
              )}
            </div>
          </div>

          {/* ====== RIGHT — Company Detail + Controls ====== */}
          <div className="lg:col-span-2 space-y-4">
            {selectedCompany ? (
              <>
                {/* Company Header */}
                <Card className="border-slate-800 bg-slate-900">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center">
                          <Building2 className="w-6 h-6 text-slate-400" />
                        </div>
                        <div>
                          <h2 className="text-lg font-bold text-white">
                            {selectedCompany.name}
                          </h2>
                          <p className="text-xs text-slate-500 font-mono">
                            {selectedCompany.id}
                          </p>
                        </div>
                      </div>

                      <CopyButton text={selectedCompany.id} />
                    </div>

                    <div className="grid grid-cols-3 gap-3 mt-5">
                      <div className="bg-slate-800 rounded-lg p-3 text-center">
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                          Plan
                        </p>
                        <p className="text-sm font-bold text-white mt-0.5">
                          {selectedCompany.plan_name || "Free"}
                        </p>
                      </div>
                      <div className="bg-slate-800 rounded-lg p-3 text-center">
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                          Credits
                        </p>
                        <p className="text-sm font-bold text-white mt-0.5">
                          {Number(selectedCompany.credits_remaining || 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-slate-800 rounded-lg p-3 text-center">
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                          Members
                        </p>
                        <p className="text-sm font-bold text-white mt-0.5">
                          {selectedCompany.member_count || 0}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Plan Selector */}
                <Card className="border-slate-800 bg-slate-900">
                  <CardContent className="p-5">
                    <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      Change Plan
                    </h3>

                    <div className="grid grid-cols-3 gap-3">
                      {PLANS.map((plan) => {
                        const Icon = plan.icon;
                        const isActive =
                          selectedCompany.plan_slug === plan.slug;
                        const isUpdating = updating === plan.slug;

                        return (
                          <button
                            key={plan.slug}
                            onClick={() => {
                              if (!isActive)
                                setPlan(selectedCompany.id, plan.slug);
                            }}
                            disabled={isActive || !!updating}
                            className={`relative p-4 rounded-xl border-2 text-center transition-all ${
                              isActive
                                ? plan.activeColor
                                : `${plan.color} hover:opacity-80`
                            } ${isUpdating ? "animate-pulse" : ""} disabled:cursor-default`}
                          >
                            {isActive && (
                              <div className="absolute top-2 right-2">
                                <CheckCircle className="w-4 h-4" />
                              </div>
                            )}

                            <Icon className="w-6 h-6 mx-auto mb-2" />
                            <p className="text-sm font-bold">{plan.name}</p>
                            <p
                              className={`text-[10px] mt-1 ${
                                isActive ? "opacity-80" : "opacity-60"
                              }`}
                            >
                              {plan.description}
                            </p>

                            {isUpdating && (
                              <div className="absolute inset-0 bg-black/30 rounded-xl flex items-center justify-center">
                                <Loader2 className="w-5 h-5 animate-spin text-white" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Credits */}
                <Card className="border-slate-800 bg-slate-900">
                  <CardContent className="p-5">
                    <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      Credits
                    </h3>

                    <div className="flex flex-wrap gap-2">
                      {[100, 500, 1000, 5000, 10000, 999999].map((amount) => (
                        <Button
                          key={amount}
                          variant="outline"
                          size="sm"
                          disabled={!!updating}
                          onClick={() =>
                            resetCredits(selectedCompany.id, amount)
                          }
                          className={`border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white ${
                            updating === "credits" ? "opacity-50" : ""
                          }`}
                        >
                          {amount === 999999
                            ? "∞ Unlimited"
                            : amount.toLocaleString()}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Action Log */}
                {actionLog.length > 0 && (
                  <Card className="border-slate-800 bg-slate-900">
                    <CardContent className="p-5">
                      <h3 className="text-sm font-semibold text-slate-300 mb-3">
                        Action Log
                      </h3>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {actionLog.map((entry, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 text-xs"
                          >
                            {entry.status === "success" ? (
                              <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" />
                            ) : (
                              <XCircle className="w-3 h-3 text-red-500 shrink-0" />
                            )}
                            <span className="text-slate-500 font-mono w-16 shrink-0">
                              {entry.timestamp}
                            </span>
                            <span
                              className={
                                entry.status === "success"
                                  ? "text-slate-300"
                                  : "text-red-400"
                              }
                            >
                              {entry.action}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              /* No company selected */
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <Building2 className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">
                    Select a company to manage
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ Copy Button Helper ============
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition"
    >
      {copied ? (
        <>
          <Check className="w-3 h-3" /> Copied
        </>
      ) : (
        <>
          <Copy className="w-3 h-3" /> Copy ID
        </>
      )}
    </button>
  );
}