"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { NotificationBell } from "@/components/shared/NotificationBell";
import {
  Briefcase, MapPin, Building2, Loader2, ArrowLeft,
  FileSearch, Code, Bot, Video, Award, XCircle, Clock,
  Sparkles, ListChecks, MessageSquare, Users, Rocket,
  CheckCircle, FileText, BookOpen, Calendar,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import toast from "react-hot-toast";
import Link from "next/link";

// ==========================================
// CONSTANTS
// ==========================================

const statusColors: Record<string, string> = {
  APPLIED: "bg-blue-100 text-blue-700",
  SCREENING: "bg-[#D1DEFF] text-[#0237BF]",
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
  Briefcase, FileSearch, Code, ListChecks, Bot, MessageSquare,
  Video, Users, Award, XCircle, Rocket, Clock, FileText, CheckCircle, Calendar,
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
        <Loader2 className="w-8 h-8 animate-spin text-[#0245EF]" />
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
              <div className="w-6 h-6 bg-gradient-to-br from-[#0245EF] to-purple-600 rounded flex items-center justify-center">
                <Briefcase className="w-3 h-3 text-white" />
              </div>
              <span className="font-semibold text-slate-800">My Applications</span>
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
              <Button className="bg-[#0245EF] hover:bg-[#0237BF]">
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
// APPLICATION CARD
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
                    : "bg-[#D1DEFF]"
              }`}
            >
              {isHired ? (
                <Award className="w-5 h-5 text-emerald-600" />
              ) : isRejected ? (
                <XCircle className="w-5 h-5 text-red-500" />
              ) : (
                <Briefcase className="w-5 h-5 text-[#0245EF]" />
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
                              ? "bg-[#0245EF] border-[#0245EF] ring-4 ring-[#D1DEFF] shadow-md shadow-[#A3BDFF]"
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
                            ? "text-[#0245EF] font-bold"
                            : isCompleted
                              ? "text-emerald-600 font-medium"
                              : "text-slate-400"
                        }`}
                      >
                        {stage.label}
                      </span>
                    </div>

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
              <div className="mt-4 bg-[#EBF0FF] rounded-lg p-3 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-[#0245EF] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-[#0237BF]">
                    {stages[currentStageIndex].label}
                  </p>
                  <p className="text-xs text-[#0245EF] mt-0.5">
                    {stages[currentStageIndex].description}
                  </p>
                  <p className="text-[10px] text-[#4775FF] mt-1">
                    Step {currentStageIndex + 1} of {stages.length}
                  </p>
                </div>
              </div>
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

            {/* Action Buttons */}
            {!isHired && !isRejected && stages[currentStageIndex] && (
              <div className="mt-3">
                {/* Assessment */}
                {["coding_assessment", "mcq_assessment"].includes(stages[currentStageIndex]?.subtype) && (
                  <Button
                    size="sm"
                    className="bg-[#0245EF] hover:bg-[#0237BF]"
                    onClick={async () => {
                      try {
                        const res = await fetch(`/api/assessments?jobId=${app.jobId}`);
                        const data = await res.json();
                        if (data.assessments?.length > 0) {
                          window.location.href = `/assessment/${data.assessments[0].id}?applicationId=${app.id}`;
                        } else {
                          window.location.href = `/assessment/${stages[currentStageIndex].subtype}?applicationId=${app.id}`;
                        }
                      } catch {
                        window.location.href = `/assessment/${stages[currentStageIndex].subtype}?applicationId=${app.id}`;
                      }
                    }}
                  >
                    <Code className="w-4 h-4 mr-2" />
                    {stages[currentStageIndex].subtype === "mcq_assessment"
                      ? "Take Quiz →"
                      : "Start Coding Challenge →"
                    }
                  </Button>
                )}

                {/* AI Interview */}
                {["ai_technical_interview", "ai_behavioral_interview"].includes(stages[currentStageIndex]?.subtype) && (
                  <Button
                    size="sm"
                    className="bg-[#0245EF] hover:bg-[#0237BF]"
                    onClick={() => {
                      window.location.href = `/interview/${stages[currentStageIndex].subtype}?applicationId=${app.id}`;
                    }}
                  >
                    <Bot className="w-4 h-4 mr-2" />
                    Start AI Interview →
                  </Button>
                )}
              </div>
            )}

            {/* F2F Interview Info */}
            <F2FInfo applicationId={app.id} currentStage={stages[currentStageIndex]?.subtype} />
          </div>
        ) : isRejected ? (
          <div className="mt-4 bg-slate-50 rounded-lg p-4">
            <p className="text-sm text-slate-600 mb-3">
              Thank you for your interest. We&apos;ve decided to move forward with other candidates.
            </p>
            <Link href={`/feedback/${app.id}`}>
              <Button size="sm" variant="outline" className="text-[#0245EF] border-[#A3BDFF] hover:bg-[#EBF0FF]">
                <BookOpen className="w-4 h-4 mr-2" />
                View Personalized Feedback →
              </Button>
            </Link>
          </div>
        ) : (
          <div className="mt-3">
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#0245EF] to-purple-500 rounded-full"
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

// ==========================================
// F2F INTERVIEW INFO
// ==========================================

function F2FInfo({ applicationId, currentStage }: { applicationId: string; currentStage?: string }) {
  const [interviews, setInterviews] = useState<any[]>([]);

  useEffect(() => {
    fetchInterviews();
  }, [applicationId]);

  const fetchInterviews = async () => {
    try {
      const res = await fetch(`/api/f2f?applicationId=${applicationId}`);
      const data = await res.json();
      setInterviews(data.interviews || []);
    } catch {}
  };

  if (interviews.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      {interviews.map((interview) => {
        const date = new Date(interview.scheduled_at);
        const isPast = date < new Date();
        const isToday = date.toDateString() === new Date().toDateString();

        return (
          <div
            key={interview.id}
            className={`rounded-lg p-4 border ${
              isToday
                ? "bg-[#EBF0FF] border-[#A3BDFF]"
                : isPast
                  ? "bg-slate-50 border-slate-200"
                  : "bg-blue-50 border-blue-200"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                isToday ? "bg-[#D1DEFF]" : isPast ? "bg-slate-200" : "bg-blue-100"
              }`}>
                <Calendar className={`w-5 h-5 ${
                  isToday ? "text-[#0245EF]" : isPast ? "text-slate-500" : "text-blue-600"
                }`} />
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className={`text-sm font-semibold ${
                    isToday ? "text-[#011B5F]" : isPast ? "text-slate-600" : "text-blue-800"
                  }`}>
                    {isToday ? "🔴 Interview Today!" : isPast ? "Interview Completed" : "📅 Interview Scheduled"}
                  </h4>
                  {interview.interview_type && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${
                      isToday ? "bg-indigo-200 text-[#0237BF]" : "bg-slate-200 text-slate-600"
                    }`}>
                      {interview.interview_type}
                    </span>
                  )}
                </div>

                <p className={`text-sm mt-1 ${
                  isToday ? "text-[#0245EF]" : isPast ? "text-slate-500" : "text-blue-600"
                }`}>
                  {date.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>

                <p className={`text-sm ${
                  isToday ? "text-[#0245EF]" : isPast ? "text-slate-500" : "text-blue-600"
                }`}>
                  🕐 {date.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })}
                  {interview.duration && ` • ${interview.duration} minutes`}
                </p>

                {/* Show all interviewers */}
{interview.metadata?.interviewers?.length > 0 ? (
  <div className="mt-1">
    <p className="text-xs text-slate-500">
      👥 {interview.metadata.interviewers.length > 1 ? "Panel" : "Interviewer"}:
    </p>
    <div className="flex flex-wrap gap-1 mt-1">
      {interview.metadata.interviewers.map((person: any, idx: number) => (
        <span
          key={idx}
          className="text-xs bg-white px-2 py-0.5 rounded-full border border-slate-200 text-slate-600"
        >
          {person.name}
          {person.role && (
            <span className="text-slate-400 ml-1">({person.role})</span>
          )}
        </span>
      ))}
    </div>
  </div>
) : interview.interviewer_first_name ? (
  <p className="text-xs text-slate-500 mt-1">
    👤 Interviewer: {interview.interviewer_first_name} {interview.interviewer_last_name}
  </p>
) : null}

                {interview.notes && (
                  <p className="text-xs text-slate-500 mt-1">
                    📝 {interview.notes}
                  </p>
                )}
              </div>
            </div>

            {/* Meeting Link */}
            {interview.meeting_link && !isPast && (
              <div className="mt-3 pt-3 border-t border-blue-100">
                <a
                  href={interview.meeting_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isToday
                      ? "bg-[#0245EF] text-white hover:bg-[#0237BF]"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  <Video className="w-4 h-4" />
                  {isToday ? "Join Meeting Now →" : "Meeting Link →"}
                </a>
              </div>
            )}

            {isPast && interview.status === "COMPLETED" && (
              <div className="mt-2 text-xs text-emerald-600 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Interview completed
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}