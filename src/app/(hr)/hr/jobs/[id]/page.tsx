"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { EditF2FDialog } from "@/components/shared/EditF2FDialog";
import { ScheduleF2FDialog } from "@/components/shared/ScheduleF2FDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft, Loader2, Users, Mail, Briefcase,
  ChevronDown, Pencil, FileSearch, Code, Bot,
  Video, Award, XCircle, Clock,
  CheckCircle, ArrowRight, Calendar,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import Link from "next/link";
import toast from "react-hot-toast";

const ALL_STATUSES = [
  { value: "APPLIED", label: "Applied", color: "bg-blue-100 text-blue-700", icon: Briefcase },
  { value: "SCREENING", label: "Screening", color: "bg-[#D1DEFF] text-[#0237BF]", icon: FileSearch },
  { value: "ASSESSMENT", label: "Assessment", color: "bg-purple-100 text-purple-700", icon: Code },
  { value: "AI_INTERVIEW", label: "AI Interview", color: "bg-violet-100 text-violet-700", icon: Bot },
  { value: "F2F_INTERVIEW", label: "F2F Interview", color: "bg-pink-100 text-pink-700", icon: Video },
  { value: "UNDER_REVIEW", label: "Under Review", color: "bg-orange-100 text-orange-700", icon: Clock },
  { value: "OFFERED", label: "Offered", color: "bg-emerald-100 text-emerald-700", icon: Award },
  { value: "HIRED", label: "Hired", color: "bg-green-100 text-green-700", icon: CheckCircle },
  { value: "REJECTED", label: "Rejected", color: "bg-red-100 text-red-700", icon: XCircle },
];

const STAGE_ORDER = [
  "APPLIED", "SCREENING", "ASSESSMENT", "AI_INTERVIEW",
  "F2F_INTERVIEW", "UNDER_REVIEW", "OFFERED", "HIRED",
];

export default function HRJobDetailPage() {
  const { id } = useParams();
  const { isHR, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [job, setJob] = useState<any>(null);
  const [pipelineStages, setPipelineStages] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [scheduleApp, setScheduleApp] = useState<any>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isHR) router.push("/login");
  }, [authLoading, isHR, router]);

  useEffect(() => {
    if (isHR) fetchData();
  }, [isHR, id]);

    const fetchData = async () => {
    try {
      const [jobRes, appsRes] = await Promise.all([
        fetch(`/api/jobs/${id}`),
        fetch(`/api/applications?jobId=${id}`),
      ]);
      const jobData = await jobRes.json();
      const appsData = await appsRes.json();
      setJob(jobData.job);
      setApplications(appsData.applications || []);

      // Fetch pipeline stages
      if (jobData.job?.pipeline_id) {
        try {
          const pRes = await fetch(`/api/pipeline?id=${jobData.job.pipeline_id}`);
          const pData = await pRes.json();
          if (pData.pipeline) {
            const stages = extractPipelineStages(pData.pipeline);
            setPipelineStages(stages);
          }
        } catch {}
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (appId: string, newStatus: string) => {
    setUpdating(appId);
    try {
      const res = await fetch(`/api/applications/${appId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success(`Moved to ${ALL_STATUSES.find((s) => s.value === newStatus)?.label || newStatus}`);
      fetchData();
    } catch {
      toast.error("Failed to update status");
    } finally {
      setUpdating(null);
    }
  };

    const getNextStage = (currentStatus: string): string | null => {
    if (pipelineStages.length === 0) {
      // Fallback to default order
      const defaultOrder = ["APPLIED", "SCREENING", "ASSESSMENT", "AI_INTERVIEW", "F2F_INTERVIEW", "UNDER_REVIEW", "OFFERED", "HIRED"];
      const idx = defaultOrder.indexOf(currentStatus);
      if (idx === -1 || idx >= defaultOrder.length - 1) return null;
      return defaultOrder[idx + 1];
    }

    const currentIndex = pipelineStages.findIndex((s) => s.status === currentStatus);
    if (currentIndex === -1 || currentIndex >= pipelineStages.length - 1) return null;
    return pipelineStages[currentIndex + 1].status;
  };

  const getStatusInfo = (status: string) => {
    return ALL_STATUSES.find((s) => s.value === status) || ALL_STATUSES[0];
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0245EF]" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Job not found</p>
      </div>
    );
  }

  const sorted = [...applications].sort(
    (a, b) => (b.resumeScore || 0) - (a.resumeScore || 0)
  );
  const filtered = filterStatus === "all"
    ? sorted
    : sorted.filter((a) => a.status === filterStatus);

  const statusCounts: Record<string, number> = {};
  applications.forEach((a) => {
    statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Status filter tabs */}
                {/* Status filter tabs — based on pipeline */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <Button
            variant={filterStatus === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus("all")}
            className={filterStatus === "all" ? "bg-[#0245EF]" : ""}
          >
            All ({applications.length})
          </Button>

          {/* Pipeline stages */}
          {(pipelineStages.length > 0 ? pipelineStages : ALL_STATUSES)
            .filter((s) => statusCounts[s.status])
            .map((stage) => {
              const StageIcon = stage.icon;
              return (
                <Button
                  key={stage.status}
                  variant={filterStatus === stage.status ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus(stage.status)}
                  className={filterStatus === stage.status ? "bg-[#0245EF]" : ""}
                >
                  <StageIcon className="w-3 h-3 mr-1" />
                  {stage.label} ({statusCounts[stage.status]})
                </Button>
              );
            })}

          {/* Always show Rejected tab if there are rejected candidates */}
          {statusCounts["REJECTED"] && !pipelineStages.some((s) => s.status === "REJECTED") && (
            <Button
              variant={filterStatus === "REJECTED" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus("REJECTED")}
              className={filterStatus === "REJECTED" ? "bg-red-600" : "text-red-600"}
            >
              <XCircle className="w-3 h-3 mr-1" />
              Rejected ({statusCounts["REJECTED"]})
            </Button>
          )}
        </div>

        {/* Applications */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-600">
              {filterStatus === "all"
                ? "No applications yet"
                : `No ${getStatusInfo(filterStatus).label.toLowerCase()} candidates`}
            </h3>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((app, index) => {
              const statusInfo = getStatusInfo(app.status);
              const StatusIcon = statusInfo.icon;
              const nextStage = getNextStage(app.status);
              const nextStageInfo = nextStage ? getStatusInfo(nextStage) : null;
              const isUpdating = updating === app.id;

              return (
                <Card
                  key={app.id}
                  className={`hover:shadow-md transition-all ${
                    index === 0 && filterStatus === "all"
                      ? "border-[#A3BDFF] bg-[#EBF0FF]/20"
                      : ""
                  }`}
                >
                  <CardContent className="p-5">
                    {/* Candidate Info Row */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                            index === 0 ? "bg-amber-100 text-amber-700" :
                            index === 1 ? "bg-slate-200 text-slate-600" :
                            index === 2 ? "bg-orange-100 text-orange-700" :
                            "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {filterStatus === "all" && index < 3
                            ? ["🥇", "🥈", "🥉"][index]
                            : `#${index + 1}`}
                        </div>

                        <div>
                          <h3 className="font-semibold text-slate-800">
                            {app.candidate?.firstName} {app.candidate?.lastName}
                          </h3>
                          <p className="text-sm text-slate-500 flex items-center gap-2 mt-0.5">
                            <Mail className="w-3 h-3" />
                            {app.candidate?.email}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            Applied {formatRelativeTime(app.appliedAt)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {app.resumeScore > 0 && (
                          <div className="text-center">
                            <div
                              className={`text-2xl font-bold ${
                                app.resumeScore >= 70 ? "text-emerald-600" :
                                app.resumeScore >= 40 ? "text-amber-600" :
                                "text-red-500"
                              }`}
                            >
                              {Math.round(app.resumeScore)}
                            </div>
                            <div className="text-[10px] text-slate-400">Match %</div>
                          </div>
                        )}

                        <Badge className={statusInfo.color}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusInfo.label}
                        </Badge>
                      </div>
                    </div>

                    {/* Interview Scores */}
                    <InterviewScores applicationId={app.id} status={app.status} />
                    {/* Scheduled F2F Interviews */}
                    <F2FScheduledInfo applicationId={app.id} />

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
                      {nextStageInfo && app.status !== "REJECTED" && app.status !== "HIRED" && (
                        <Button
                          size="sm"
                          onClick={() => updateStatus(app.id, nextStage!)}
                          disabled={isUpdating}
                          className="bg-[#0245EF] hover:bg-[#0237BF]"
                        >
                          {isUpdating ? (
                            <Loader2 className="w-3 h-3 animate-spin mr-1" />
                          ) : (
                            <ArrowRight className="w-3 h-3 mr-1" />
                          )}
                          Move to {nextStageInfo.label}
                        </Button>
                      )}

                                            {/* Jump to any stage — only show pipeline stages */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="text-xs">
                            <ChevronDown className="w-3 h-3 mr-1" />
                            Change Stage
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-52">
                          {/* Pipeline stages in order */}
                          {(pipelineStages.length > 0 ? pipelineStages : ALL_STATUSES).map((stage) => {
                            const Icon = stage.icon;
                            const isCurrent = app.status === stage.status;
                            const currentIdx = pipelineStages.findIndex((s) => s.status === app.status);
                            const stageIdx = pipelineStages.findIndex((s) => s.status === stage.status);
                            const isPast = stageIdx < currentIdx;

                            return (
                              <DropdownMenuItem
                                key={stage.status}
                                onClick={() => {
                                  if (!isCurrent) updateStatus(app.id, stage.status);
                                }}
                                disabled={isCurrent}
                                className={`${isCurrent ? "opacity-50 bg-[#EBF0FF]" : ""} ${isPast ? "text-slate-400" : ""}`}
                              >
                                <div className="flex items-center gap-2 w-full">
                                  <Icon className="w-4 h-4 shrink-0" />
                                  <span className="flex-1">{stage.label}</span>
                                  {isCurrent && (
                                    <Badge variant="outline" className="text-[9px] h-4 px-1">Current</Badge>
                                  )}
                                  {isPast && (
                                    <span className="text-[9px] text-slate-400">←</span>
                                  )}
                                </div>
                              </DropdownMenuItem>
                            );
                          })}

                          {/* Always show Reject option */}
                          {app.status !== "REJECTED" && (
                            <>
                              <DropdownMenuItem className="border-t border-slate-100 mt-1 pt-1">
                                <div
                                  className="flex items-center gap-2 w-full text-red-600"
                                  onClick={() => updateStatus(app.id, "REJECTED")}
                                >
                                  <XCircle className="w-4 h-4" />
                                  <span>Reject</span>
                                </div>
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {/* Schedule F2F */}
                      {!["REJECTED", "HIRED", "APPLIED", "WITHDRAWN"].includes(app.status) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => setScheduleApp(app)}
                        >
                          <Calendar className="w-3 h-3 mr-1" />
                          Schedule F2F
                        </Button>
                      )}

                      {app.status !== "REJECTED" && app.status !== "HIRED" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateStatus(app.id, "REJECTED")}
                          disabled={isUpdating}
                          className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 ml-auto"
                        >
                          <XCircle className="w-3 h-3 mr-1" />
                          Reject
                        </Button>
                      )}

                      {app.status === "OFFERED" && (
                        <Button
                          size="sm"
                          onClick={() => updateStatus(app.id, "HIRED")}
                          disabled={isUpdating}
                          className="bg-emerald-600 hover:bg-emerald-700 ml-auto"
                        >
                          <Award className="w-3 h-3 mr-1" />
                          Mark as Hired
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Schedule F2F Dialog */}
      {scheduleApp && (
        <ScheduleF2FDialog
          open={!!scheduleApp}
          onOpenChange={(open) => { if (!open) setScheduleApp(null); }}
          applicationId={scheduleApp.id}
          candidateName={`${scheduleApp.candidate?.firstName || ""} ${scheduleApp.candidate?.lastName || ""}`}
          onScheduled={fetchData}
        />
      )}
    </div>
  );
}

// ==========================================
// Interview Scores Component
// ==========================================
function InterviewScores({ applicationId, status }: { applicationId: string; status: string }) {
  const [scores, setScores] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (["AI_INTERVIEW", "F2F_INTERVIEW", "UNDER_REVIEW", "OFFERED", "HIRED", "REJECTED"].includes(status)) {
      fetchScores();
    }
  }, [applicationId, status]);

  const fetchScores = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/interview?applicationId=${applicationId}`);
      const data = await res.json();
      if (data.interviews?.length > 0) {
        const interview = data.interviews[0];
        let breakdown = interview.score_breakdown;
        if (typeof breakdown === "string") breakdown = JSON.parse(breakdown);
        setScores({ ...interview, score_breakdown: breakdown });
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  if (!scores || loading) return null;

  const breakdown = scores.score_breakdown || {};

  return (
    <div className="mt-3 border border-[#D1DEFF] bg-[#EBF0FF]/50 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-[#EBF0FF] transition-colors"
      >
        <div className="flex items-center gap-3">
          <Bot className="w-4 h-4 text-[#0245EF]" />
          <span className="text-sm font-medium text-slate-700">AI Interview Results</span>
          <Badge
            className={`text-xs ${
              (scores.overall_score || 0) >= 70 ? "bg-emerald-100 text-emerald-700" :
              (scores.overall_score || 0) >= 40 ? "bg-amber-100 text-amber-700" :
              "bg-red-100 text-red-700"
            }`}
          >
            {scores.overall_score || 0}/100
          </Badge>
          {breakdown.recommendation && (
            <Badge variant="outline" className="text-xs">{breakdown.recommendation}</Badge>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3">
          {/* Score bars */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Overall", score: scores.overall_score },
              { label: "Technical", score: breakdown.technicalScore },
              { label: "Communication", score: breakdown.communicationScore },
              { label: "Problem Solving", score: breakdown.problemSolvingScore },
            ].map((item) => (
              <div key={item.label} className="bg-white rounded-lg p-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-slate-500">{item.label}</span>
                  <span className={`text-sm font-bold ${
                    (item.score || 0) >= 70 ? "text-emerald-600" :
                    (item.score || 0) >= 40 ? "text-amber-600" : "text-red-500"
                  }`}>
                    {item.score || 0}<span className="text-slate-400 font-normal">/100</span>
                  </span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full">
                  <div
                    className={`h-full rounded-full ${
                      (item.score || 0) >= 70 ? "bg-emerald-500" :
                      (item.score || 0) >= 40 ? "bg-amber-500" : "bg-red-500"
                    }`}
                    style={{ width: `${Math.min(item.score || 0, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Analysis */}
          {scores.analysis && (
            <div className="bg-white rounded-lg p-3">
              <p className="text-xs font-semibold text-slate-600 mb-1">AI Analysis</p>
              <p className="text-xs text-slate-500 leading-relaxed">{scores.analysis}</p>
            </div>
          )}

          {/* Strengths & Weaknesses */}
          <div className="grid grid-cols-2 gap-2">
            {scores.strengths?.length > 0 && (
              <div className="bg-white rounded-lg p-3">
                <p className="text-xs font-semibold text-emerald-600 mb-1">💪 Strengths</p>
                <ul className="space-y-0.5">
                  {scores.strengths.map((s: string, i: number) => (
                    <li key={i} className="text-[11px] text-slate-500 flex items-start gap-1">
                      <span className="text-emerald-500 mt-0.5">•</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {scores.weaknesses?.length > 0 && (
              <div className="bg-white rounded-lg p-3">
                <p className="text-xs font-semibold text-red-600 mb-1">📈 Improve</p>
                <ul className="space-y-0.5">
                  {scores.weaknesses.map((w: string, i: number) => (
                    <li key={i} className="text-[11px] text-slate-500 flex items-start gap-1">
                      <span className="text-red-500 mt-0.5">•</span> {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Transcript Button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={() => {
              const msgs = typeof scores.messages === "string"
                ? JSON.parse(scores.messages) : scores.messages || [];
              const transcript = msgs.map((m: any) =>
                `${m.role === "user" ? "📝 Candidate" : "🤖 Interviewer"}:\n${m.content}`
              ).join("\n\n---\n\n");

              const win = window.open("", "_blank");
              if (win) {
                win.document.write(`
                  <html>
                  <head><title>Interview Transcript</title>
                  <style>
                    body { font-family: -apple-system, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; color: #334155; }
                    h1 { color: #4F46E5; }
                    pre { white-space: pre-wrap; background: #F8FAFC; padding: 20px; border-radius: 12px; border: 1px solid #E2E8F0; }
                    .score { display: inline-block; padding: 4px 12px; border-radius: 8px; font-weight: bold; margin-right: 8px; }
                    .high { background: #D1FAE5; color: #065F46; }
                    .mid { background: #FEF3C7; color: #92400E; }
                    .low { background: #FEE2E2; color: #991B1B; }
                  </style>
                  </head>
                  <body>
                    <h1>AI Interview Transcript</h1>
                    <p><strong>Overall:</strong>
                      <span class="score ${(scores.overall_score || 0) >= 70 ? "high" : (scores.overall_score || 0) >= 40 ? "mid" : "low"}">
                        ${scores.overall_score || 0}/100
                      </span>
                      <span class="score ${(breakdown.technicalScore || 0) >= 70 ? "high" : (breakdown.technicalScore || 0) >= 40 ? "mid" : "low"}">
                        Tech: ${breakdown.technicalScore || 0}
                      </span>
                      <span class="score ${(breakdown.communicationScore || 0) >= 70 ? "high" : (breakdown.communicationScore || 0) >= 40 ? "mid" : "low"}">
                        Comm: ${breakdown.communicationScore || 0}
                      </span>
                    </p>
                    ${scores.analysis ? `<p><strong>Analysis:</strong> ${scores.analysis}</p>` : ""}
                    <hr/>
                    <pre>${transcript}</pre>
                  </body></html>
                `);
              }
            }}
          >
            📄 View Full Transcript
          </Button>
        </div>
      )}
    </div>
  );
}

// ==========================================
// F2F Scheduled Info for HR
// ==========================================
function F2FScheduledInfo({ applicationId }: { applicationId: string }) {
  const [interviews, setInterviews] = useState<any[]>([]);
  const [editingInterview, setEditingInterview] = useState<any>(null);

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
        const isCancelled = interview.status === "CANCELLED";

        let metadata = interview.metadata || {};
        try {
          if (typeof metadata === "string") metadata = JSON.parse(metadata);
        } catch { metadata = {}; }

        const interviewerList = metadata.interviewers || [];

        return (
          <div
            key={interview.id}
            className={`border rounded-lg p-3 ${
              isCancelled
                ? "bg-red-50 border-red-200 opacity-60"
                : isToday
                  ? "bg-[#EBF0FF] border-[#A3BDFF]"
                  : isPast
                    ? interview.status === "COMPLETED"
                      ? "bg-emerald-50 border-emerald-200"
                      : "bg-slate-50 border-slate-200"
                    : "bg-blue-50 border-blue-200"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-2">
                <Calendar className={`w-4 h-4 mt-0.5 shrink-0 ${
                  isCancelled ? "text-red-400" :
                  isToday ? "text-[#0245EF]" :
                  isPast ? "text-slate-400" : "text-blue-500"
                }`} />

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-semibold ${
                      isCancelled ? "text-red-600 line-through" :
                      isToday ? "text-[#0237BF]" :
                      isPast ? "text-slate-600" : "text-blue-700"
                    }`}>
                      {isCancelled ? "Cancelled" :
                       isToday ? "🔴 Today" :
                       isPast ? (interview.status === "COMPLETED" ? "✅ Completed" : "Past") :
                       "Scheduled"}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-500 capitalize">
                      {interview.interview_type}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mt-1">
                    {date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    {" at "}
                    {date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}
                    {interview.duration && ` • ${interview.duration} min`}
                  </p>

                  {interviewerList.length > 0 && (
                    <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                      <span className="text-[10px] text-slate-400">Panel:</span>
                      {interviewerList.map((person: any, i: number) => (
                        <span key={i} className="text-[10px] bg-white border border-slate-200 rounded-full px-2 py-0.5 text-slate-600">
                          {person.name}
                          {person.role && <span className="text-slate-400 ml-0.5">• {person.role}</span>}
                        </span>
                      ))}
                    </div>
                  )}

                  {interview.meeting_link && (
                    <a href={interview.meeting_link} target="_blank" rel="noopener noreferrer"
                      className="text-[10px] text-[#0245EF] hover:underline mt-1 inline-flex items-center gap-1">
                      <Video className="w-3 h-3" /> Meeting link
                    </a>
                  )}
                </div>
              </div>

              {/* Edit button — only for non-cancelled, non-completed */}
              {!isCancelled && interview.status !== "COMPLETED" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 text-[#0245EF] hover:bg-[#EBF0FF]"
                  onClick={() => setEditingInterview(interview)}
                >
                  <Pencil className="w-3 h-3 mr-1" /> Edit
                </Button>
              )}
            </div>
          </div>
        );
      })}

      {/* Edit Dialog */}
      {editingInterview && (
        <EditF2FDialog
          open={!!editingInterview}
          onOpenChange={(open) => { if (!open) setEditingInterview(null); }}
          interview={editingInterview}
          onUpdated={() => {
            setEditingInterview(null);
            fetchInterviews();
          }}
        />
      )}
    </div>
  );
}

function extractPipelineStages(pipeline: any) {
  let nodes: any[] = [];
  let edges: any[] = [];

  try {
    nodes = typeof pipeline.nodes === "string" ? JSON.parse(pipeline.nodes) : pipeline.nodes || [];
    edges = typeof pipeline.edges === "string" ? JSON.parse(pipeline.edges) : pipeline.edges || [];
  } catch {
    return [];
  }

  // Build adjacency for ordering (follow pass paths only)
  const adjMap = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const node of nodes) {
    adjMap.set(node.id, []);
    inDegree.set(node.id, 0);
  }

  for (const edge of edges) {
    if (!edge.sourceHandle || edge.sourceHandle === "pass") {
      const targets = adjMap.get(edge.source) || [];
      targets.push(edge.target);
      adjMap.set(edge.source, targets);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    }
  }

  // Topological sort
  const queue: string[] = [];
  for (const [nodeId, degree] of inDegree.entries()) {
    if (degree === 0) queue.push(nodeId);
  }

  const ordered: any[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const node = nodes.find((n: any) => n.id === current);
    if (node) ordered.push(node);
    for (const next of (adjMap.get(current) || [])) {
      const newDeg = (inDegree.get(next) || 1) - 1;
      inDegree.set(next, newDeg);
      if (newDeg === 0) queue.push(next);
    }
  }

  // Convert to stage list — map node subtypes to application statuses
  const subtypeToStatus: Record<string, { status: string; label: string; icon: any }> = {
    job_posting: { status: "APPLIED", label: "Applied", icon: Briefcase },
    ai_resume_screen: { status: "SCREENING", label: "Screening", icon: FileSearch },
    coding_assessment: { status: "ASSESSMENT", label: "Assessment", icon: Code },
    mcq_assessment: { status: "ASSESSMENT", label: "Assessment", icon: Code },
    ai_technical_interview: { status: "AI_INTERVIEW", label: "AI Interview", icon: Bot },
    ai_behavioral_interview: { status: "AI_INTERVIEW", label: "AI Interview", icon: Bot },
    f2f_interview: { status: "F2F_INTERVIEW", label: "F2F Interview", icon: Video },
    panel_interview: { status: "F2F_INTERVIEW", label: "Panel Interview", icon: Video },
    offer: { status: "OFFERED", label: "Offered", icon: Award },
    onboarding: { status: "HIRED", label: "Hired", icon: CheckCircle },
  };

  // Build unique ordered stages
  const stages: { status: string; label: string; icon: any }[] = [];
  const seenStatuses = new Set<string>();

  for (const node of ordered) {
    const subtype = node.data?.subtype;
    if (!subtype) continue;

    // Skip filter, logic, action nodes
    if (["filter", "logic", "action"].includes(node.data?.type)) continue;

    const mapping = subtypeToStatus[subtype];
    if (mapping && !seenStatuses.has(mapping.status)) {
      seenStatuses.add(mapping.status);
      stages.push(mapping);
    }
  }

  // Always add these at the end if not present
  if (!seenStatuses.has("UNDER_REVIEW")) {
    stages.push({ status: "UNDER_REVIEW", label: "Under Review", icon: Clock });
  }
  if (!seenStatuses.has("OFFERED") && !seenStatuses.has("HIRED")) {
    stages.push({ status: "OFFERED", label: "Offered", icon: Award });
  }

  return stages;
}