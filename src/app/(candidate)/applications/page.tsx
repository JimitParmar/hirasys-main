"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";
import { Card, CardContent } from "@/components/ui/card";
import {
  Briefcase, MapPin, Building2, Loader2, ArrowLeft,
  FileSearch, Code, Bot, Video, Award, XCircle, Clock,
  Sparkles, ListChecks, MessageSquare, Users, Rocket,
  CheckCircle, FileText, BookOpen,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import Link from "next/link";

// ==========================================
// CONSTANTS
// ==========================================

const statusColors: Record<string, string> = {
  APPLIED: "bg-blue-100 text-blue-700",
  SCREENING: "bg-indigo-100 text-indigo-700",
  ASSESSMENT: "bg-purple-100 text-purple-700",
  AI_INTERVIEW: "bg-violet-100 text-violet-700",
  F2F_INTERVIEW: "bg-pink-100 text-pink-700",
  UNDER_REVIEW: "bg-orange-100 text-orange-700",
  OFFERED: "bg-emerald-100 text-emerald-700",
  HIRED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  WITHDRAWN: "bg-gray-100 text-gray-700",
};

const statusLabels: Record<string, string> = {
  APPLIED: "Applied",
  SCREENING: "Screening",
  ASSESSMENT: "Assessment",
  AI_INTERVIEW: "AI Interview",
  F2F_INTERVIEW: "F2F Interview",
  UNDER_REVIEW: "Under Review",
  OFFERED: "Offer Extended! 🎉",
  HIRED: "Hired! 🎉",
  REJECTED: "Not Selected",
  WITHDRAWN: "Withdrawn",
};

const iconMap: Record<string, React.ElementType> = {
  Briefcase,
  FileSearch,
  Code,
  ListChecks,
  Bot,
  MessageSquare,
  Video,
  Users,
  Award,
  XCircle,
  Rocket,
  Clock,
  FileText,
  CheckCircle,
};

// ==========================================
// MAIN PAGE
// ==========================================

export default function ApplicationsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [applications, setApplications] = useState<any[]>([]);
  const [pipelineData, setPipelineData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) fetchApplications();
  }, [isAuthenticated]);

  const fetchApplications = async () => {
    try {
      const res = await fetch("/api/applications");
      const data = await res.json();
      const apps = data.applications || [];
      setApplications(apps);

      // Fetch pipeline stages for each application
      const pipelinePromises = apps.map(async (app: any) => {
        try {
          const pRes = await fetch(`/api/applications/${app.id}/pipeline`);
          const pData = await pRes.json();
          return { appId: app.id, ...pData };
        } catch {
          return { appId: app.id, stages: [] };
        }
      });

      const results = await Promise.all(pipelinePromises);
      const pMap: Record<string, any> = {};
      results.forEach((r) => {
        pMap[r.appId] = r;
      });
      setPipelineData(pMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const activeApps = applications.filter(
    (a) => !["REJECTED", "WITHDRAWN", "HIRED"].includes(a.status)
  );
  const pastApps = applications.filter(
    (a) => ["REJECTED", "WITHDRAWN", "HIRED"].includes(a.status)
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/jobs">
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded flex items-center justify-center">
                <Briefcase className="w-3 h-3 text-white" />
              </div>
              <span className="font-semibold text-slate-800">My Applications</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/jobs">
              <Button variant="ghost" size="sm">Browse Jobs</Button>
            </Link>
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
              <span className="text-xs font-semibold text-indigo-600">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {applications.length === 0 ? (
          <div className="text-center py-20">
            <Briefcase className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-slate-600">No applications yet</h3>
            <p className="text-slate-400 mt-2 mb-6">Start applying and track your journey</p>
            <Link href="/jobs">
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                <Sparkles className="w-4 h-4 mr-2" /> Browse Jobs
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {activeApps.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  Active ({activeApps.length})
                </h2>
                <div className="space-y-4">
                  {activeApps.map((app) => (
                    <ApplicationCard
                      key={app.id}
                      app={app}
                      pipeline={pipelineData[app.id]}
                    />
                  ))}
                </div>
              </div>
            )}

            {pastApps.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-slate-500 mb-4">
                  Past ({pastApps.length})
                </h2>
                <div className="space-y-4 opacity-80">
                  {pastApps.map((app) => (
                    <ApplicationCard
                      key={app.id}
                      app={app}
                      pipeline={pipelineData[app.id]}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// APPLICATION CARD COMPONENT
// ==========================================

function ApplicationCard({ app, pipeline }: { app: any; pipeline?: any }) {
  const stages = pipeline?.stages || [];
  const currentStageIndex = pipeline?.currentStageIndex ?? 0;
  const isRejected = app.status === "REJECTED";
  const isWithdrawn = app.status === "WITHDRAWN";
  const isHired = app.status === "HIRED" || app.status === "OFFERED";

  return (
    <Card className="hover:shadow-md transition-all">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                isHired
                  ? "bg-emerald-100"
                  : isRejected
                    ? "bg-red-100"
                    : "bg-indigo-100"
              }`}
            >
              {isHired ? (
                <Award className="w-5 h-5 text-emerald-600" />
              ) : isRejected ? (
                <XCircle className="w-5 h-5 text-red-500" />
              ) : (
                <Briefcase className="w-5 h-5 text-indigo-600" />
              )}
            </div>
            <div>
              <Link href={`/jobs/${app.jobId}`} className="hover:underline">
                <h3 className="font-semibold text-slate-800">
                  {app.job?.title || "Job"}
                </h3>
              </Link>
              <div className="flex items-center gap-3 text-sm text-slate-500 mt-0.5">
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" />
                  {app.job?.poster?.company || "Company"}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {app.job?.location || "Location"}
                </span>
              </div>
            </div>
          </div>

          <div className="text-right">
            <Badge className={statusColors[app.status] || "bg-slate-100"}>
              {statusLabels[app.status] || app.status}
            </Badge>
            <p className="text-[11px] text-slate-400 mt-1.5">
              {formatRelativeTime(app.appliedAt)}
            </p>
          </div>
        </div>

        {/* Pipeline Stages */}
        {stages.length > 0 && !isRejected && !isWithdrawn ? (
          <div className="mt-4">
            <div className="flex items-start w-full">
              {stages.map((stage: any, i: number) => {
                const isCompleted = i < currentStageIndex;
                const isCurrent = i === currentStageIndex;
                const IconComp = iconMap[stage.icon] || Briefcase;

                return (
                  <React.Fragment key={stage.id}>
                    {/* Stage */}
                    <div
                      className="flex flex-col items-center"
                      style={{ minWidth: 60, flex: 1 }}
                    >
                      <div
                        className={`
                          w-10 h-10 rounded-full flex items-center justify-center border-2
                          transition-all duration-300
                          ${isCompleted
                            ? "bg-emerald-500 border-emerald-500 shadow-sm shadow-emerald-200"
                            : isCurrent
                              ? "bg-indigo-500 border-indigo-500 ring-4 ring-indigo-100 shadow-md shadow-indigo-200"
                              : "bg-white border-slate-200"
                          }
                        `}
                      >
                        {isCompleted ? (
                          <CheckCircle className="w-5 h-5 text-white" />
                        ) : (
                          <IconComp
                            className={`w-4 h-4 ${
                              isCurrent ? "text-white" : "text-slate-300"
                            }`}
                          />
                        )}
                      </div>

                      <span
                        className={`text-[10px] mt-2 text-center leading-tight px-1 ${
                          isCurrent
                            ? "text-indigo-600 font-bold"
                            : isCompleted
                              ? "text-emerald-600 font-medium"
                              : "text-slate-400"
                        }`}
                      >
                        {stage.label}
                      </span>
                    </div>

                    {/* Connector line */}
                    {i < stages.length - 1 && (
                      <div
                        className="flex-shrink-0 pt-5"
                        style={{ width: 0, flex: "0 1 auto", minWidth: 8 }}
                      >
                        <div
                          className={`h-0.5 w-full min-w-[8px] ${
                            i < currentStageIndex ? "bg-emerald-400" : "bg-slate-200"
                          }`}
                        />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Current stage info box */}
            {stages[currentStageIndex] && !isHired && (
              <div className="mt-4 bg-indigo-50 rounded-lg p-3 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-indigo-700">
                    {stages[currentStageIndex].label}
                  </p>
                  <p className="text-xs text-indigo-600 mt-0.5">
                    {stages[currentStageIndex].description}
                  </p>
                  <p className="text-[10px] text-indigo-400 mt-1">
                    Step {currentStageIndex + 1} of {stages.length}
                  </p>
                </div>
              </div>
            )}

                        {/* Action buttons based on current stage */}
            {!isHired && !isRejected && stages[currentStageIndex] && (
              <div className="mt-3">
                {["coding_assessment", "mcq_assessment"].includes(stages[currentStageIndex]?.subtype) && (
  <Button
    size="sm"
    className="bg-indigo-600 hover:bg-indigo-700"
    onClick={() => {
      // Navigate to assessment using the pipeline node subtype
      window.location.href = `/assessment/${stages[currentStageIndex].subtype}?applicationId=${app.id}`;
    }}
  >
    <Code className="w-4 h-4 mr-2" />
    {stages[currentStageIndex].subtype === "mcq_assessment"
      ? "Take Quiz →"
      : "Start Coding Challenge →"
    }
  </Button>
)}
              </div>
            )}
                            {["ai_technical_interview", "ai_behavioral_interview"].includes(stages[currentStageIndex]?.subtype) && (
                  <Button
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-700"
                    onClick={() => {
                      window.location.href = `/interview/${stages[currentStageIndex].subtype}?applicationId=${app.id}`;
                    }}
                  >
                    <Bot className="w-4 h-4 mr-2" />
                    Start AI Interview →
                  </Button>
                )}

            {isHired && (
              <div className="mt-4 bg-emerald-50 rounded-lg p-3 flex items-start gap-2">
                <Award className="w-5 h-5 text-emerald-500 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-emerald-700">
                    Congratulations! 🎉
                  </p>
                  <p className="text-xs text-emerald-600 mt-0.5">
                    You&apos;ve received an offer. Check your email for details.
                  </p>
                </div>
              </div>
            )}
          </div>
                ) : isRejected ? (
          <div className="mt-4 bg-slate-50 rounded-lg p-4">
            <p className="text-sm text-slate-600 mb-3">
              Thank you for your interest. We&apos;ve decided to move forward with other candidates.
            </p>
            <Link href={`/feedback/${app.id}`}>
              <Button size="sm" variant="outline" className="text-indigo-600 border-indigo-200 hover:bg-indigo-50">
                <BookOpen className="w-4 h-4 mr-2" />
                View Personalized Feedback →
              </Button>
            </Link>
          </div>
        ) : (
          <div className="mt-3">
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                style={{ width: "15%" }}
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Processing...</p>
          </div>
        )}

        {/* Resume Score */}
        {app.resumeScore > 0 && (
          <div className="mt-3 flex items-center gap-3 text-xs pt-3 border-t border-slate-100">
            <span className="text-slate-500">Resume Match:</span>
            <div className="flex items-center gap-2 flex-1">
              <div className="flex-1 h-1.5 bg-slate-100 rounded-full max-w-[120px]">
                <div
                  className={`h-full rounded-full ${
                    app.resumeScore >= 70
                      ? "bg-emerald-500"
                      : app.resumeScore >= 40
                        ? "bg-amber-500"
                        : "bg-red-500"
                  }`}
                  style={{ width: `${Math.min(app.resumeScore, 100)}%` }}
                />
              </div>
              <span
                className={`font-bold ${
                  app.resumeScore >= 70
                    ? "text-emerald-600"
                    : app.resumeScore >= 40
                      ? "text-amber-600"
                      : "text-red-600"
                }`}
              >
                {Math.round(app.resumeScore)}%
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}