"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Loader2,
  CheckCircle,
  XCircle,
  Database,
  Copy,
  Check,
} from "lucide-react";
import toast from "react-hot-toast";

type SeedStep = {
  step: number;
  total: number;
  message: string;
  summary?: {
    company: string;
    teamMembers: number;
    candidates: number;
    jobs: number;
    applications: number;
    accounts: Array<{ role: string; email: string }>;
    password: string;
  };
};

export default function SeedPage() {
    if (
    process.env.NODE_ENV === "production" &&
    !process.env.NEXT_PUBLIC_ENABLE_SEED
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-400">Not found</p>
      </div>
    );
  }
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">(
    "idle"
  );
  const [steps, setSteps] = useState<SeedStep[]>([]);
  const [currentStep, setCurrentStep] = useState<SeedStep | null>(null);
  const [summary, setSummary] = useState<SeedStep["summary"] | null>(null);
  const [copied, setCopied] = useState(false);
  const [secretKey, setSecretKey] = useState("");

  const runSeed = async () => {
    if (!secretKey.trim()) {
    toast?.error?.("Enter the admin secret key") ||
      alert("Enter the admin secret key");
    return;
  }
    setStatus("running");
    setSteps([]);
    setCurrentStep(null);
    setSummary(null);

    try {
      const response = await fetch(`/api/seed?key=${encodeURIComponent(secretKey)}`);
      if (response.status === 401) {
      setStatus("error");
      setCurrentStep({ step: -1, total: 1, message: "Invalid secret key" });
      return;
    }
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        setStatus("error");
        return;
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data: SeedStep = JSON.parse(line.slice(6));

              if (data.step === -1) {
                setStatus("error");
                setCurrentStep(data);
                return;
              }

              setCurrentStep(data);
              setSteps((prev) => {
                const exists = prev.find((s) => s.step === data.step);
                if (exists) return prev;
                return [...prev, data];
              });

              if (data.summary) {
                setSummary(data.summary);
                setStatus("done");
              }
            } catch {}
          }
        }
      }

      if (status !== "error") setStatus("done");
    } catch {
      setStatus("error");
    }
  };

  const copyCredentials = () => {
    if (!summary) return;
    const text = summary.accounts
      .map((a) => `${a.role}: ${a.email}`)
      .join("\n") + `\nPassword: ${summary.password}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const progressPercent = currentStep
    ? Math.round((currentStep.step / currentStep.total) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg border-0 shadow-xl">
        <CardContent className="p-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-[#D1DEFF] flex items-center justify-center">
              <Database className="w-5 h-5 text-[#0245EF]" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">
                Seed Database
              </h1>
              <p className="text-sm text-slate-400">
                Populate with screenshot-ready data
              </p>
            </div>
          </div>

          {/* Idle state */}
          {status === "idle" && (
  <div>
    <div className="bg-slate-50 rounded-lg p-4 mb-6 text-sm text-slate-600 space-y-1">
      <p>This will create:</p>
      <ul className="list-disc list-inside space-y-0.5 text-slate-500">
        <li>1 company (Nexlayer)</li>
        <li>4 team members</li>
        <li>40 candidates</li>
        <li>8 job postings with pipelines</li>
        <li>~82 applications with scores</li>
      </ul>
    </div>

    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Admin Secret Key
        </label>
        <input
          type="password"
          value={secretKey}
          onChange={(e) => setSecretKey(e.target.value)}
          placeholder="Enter admin secret"
          className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0245EF] focus:border-transparent"
          onKeyDown={(e) => {
            if (e.key === "Enter" && secretKey.trim()) runSeed();
          }}
        />
      </div>
      <Button
        onClick={runSeed}
        disabled={!secretKey.trim()}
        className="w-full h-11 bg-[#0245EF] hover:bg-[#0237BF] text-base"
      >
        Run Seed
      </Button>
    </div>
  </div>
)}

          {/* Running state */}
          {status === "running" && (
            <div>
              {/* Progress bar */}
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-600 font-medium">
                    {currentStep?.message || "Starting..."}
                  </span>
                  <span className="text-slate-400">{progressPercent}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#0245EF] rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Step list */}
              <div className="space-y-2.5">
                {steps.map((s) => (
                  <div
                    key={s.step}
                    className="flex items-center gap-2.5 text-sm"
                  >
                    {s.step === currentStep?.step ? (
                      <Loader2 className="w-4 h-4 text-[#0245EF] animate-spin shrink-0" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    )}
                    <span
                      className={
                        s.step === currentStep?.step
                          ? "text-slate-800 font-medium"
                          : "text-slate-400"
                      }
                    >
                      {s.message}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Done state */}
          {status === "done" && summary && (
            <div>
              {/* Success header */}
              <div className="flex items-center gap-2.5 mb-6 bg-emerald-50 rounded-lg p-4">
                <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                <p className="text-sm font-medium text-emerald-800">
                  Database seeded successfully
                </p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {[
                  { label: "Company", value: summary.company },
                  { label: "Team", value: `${summary.teamMembers} members` },
                  { label: "Candidates", value: summary.candidates },
                  { label: "Jobs", value: `${summary.jobs} postings` },
                  {
                    label: "Applications",
                    value: `${summary.applications} total`,
                  },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="bg-slate-50 rounded-lg p-3 text-center"
                  >
                    <p className="text-xs text-slate-400">{stat.label}</p>
                    <p className="text-sm font-semibold text-slate-800 mt-0.5">
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Credentials */}
              <div className="bg-slate-900 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Login Credentials
                  </p>
                  <button
                    onClick={copyCredentials}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" /> Copy
                      </>
                    )}
                  </button>
                </div>
                <div className="space-y-1.5 font-mono text-sm">
                  {summary.accounts.map((a) => (
                    <div key={a.email} className="flex gap-2">
                      <span className="text-slate-500 w-28 shrink-0">
                        {a.role}
                      </span>
                      <span className="text-emerald-400">{a.email}</span>
                    </div>
                  ))}
                  <div className="flex gap-2 mt-2 pt-2 border-t border-slate-700">
                    <span className="text-slate-500 w-28 shrink-0">
                      Password
                    </span>
                    <span className="text-amber-400">{summary.password}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  onClick={() => (window.location.href = "/login")}
                  className="flex-1 h-10 bg-[#0245EF] hover:bg-[#0237BF]"
                >
                  Go to Login
                </Button>
                <Button
                  onClick={() => {
                    setStatus("idle");
                    setSteps([]);
                    setCurrentStep(null);
                    setSummary(null);
                  }}
                  variant="outline"
                  className="h-10"
                >
                  Run Again
                </Button>
              </div>
            </div>
          )}

          {/* Error state */}
          {status === "error" && (
            <div>
              <div className="flex items-center gap-2.5 mb-6 bg-red-50 rounded-lg p-4">
                <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-800">
                    Seed failed
                  </p>
                  <p className="text-xs text-red-600 mt-0.5">
                    {currentStep?.message || "Unknown error"}
                  </p>
                </div>
              </div>

              {/* Show completed steps */}
              {steps.length > 0 && (
                <div className="space-y-2 mb-6">
                  {steps.map((s) => (
                    <div key={s.step} className="flex items-center gap-2 text-sm">
                      {s.step === -1 ? (
                        <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                      )}
                      <span className="text-slate-500">{s.message}</span>
                    </div>
                  ))}
                </div>
              )}

              <Button
                onClick={() => {
                  setStatus("idle");
                  setSteps([]);
                  setCurrentStep(null);
                }}
                className="w-full h-10 bg-[#0245EF] hover:bg-[#0237BF]"
              >
                Try Again
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}