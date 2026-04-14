"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { ScheduleF2FDialog } from "@/components/shared/ScheduleF2FDialog";
import { EditF2FDialog } from "@/components/shared/EditF2FDialog";
import { ShareJobDialog } from "@/components/shared/ShareJobDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Loader2,
  Users,
  Mail,
  Briefcase,
  ChevronDown,
  Pencil,
  FileSearch,
  Code,
  Bot,
  Video,
  Award,
  XCircle,
  Clock,
  CheckCircle,
  ArrowRight,
  Calendar,
  Share2,
  FileText,
  Eye,
  HelpCircle,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import Link from "next/link";
import toast from "react-hot-toast";

const ALL_STATUSES = [
  {
    value: "APPLIED",
    label: "Applied",
    color: "bg-blue-100 text-blue-700",
    icon: Briefcase,
  },
  {
    value: "SCREENING",
    label: "Screening",
    color: "bg-[#EBF0FF] text-[#0245EF]",
    icon: FileSearch,
  },
  {
    value: "ASSESSMENT",
    label: "Assessment",
    color: "bg-purple-100 text-purple-700",
    icon: Code,
  },
  {
    value: "AI_INTERVIEW",
    label: "AI Interview",
    color: "bg-violet-100 text-violet-700",
    icon: Bot,
  },
  {
    value: "F2F_INTERVIEW",
    label: "F2F Interview",
    color: "bg-pink-100 text-pink-700",
    icon: Video,
  },
  {
    value: "UNDER_REVIEW",
    label: "Under Review",
    color: "bg-orange-100 text-orange-700",
    icon: Clock,
  },
  {
    value: "OFFERED",
    label: "Offered",
    color: "bg-emerald-100 text-emerald-700",
    icon: Award,
  },
  {
    value: "HIRED",
    label: "Hired",
    color: "bg-green-100 text-green-700",
    icon: CheckCircle,
  },
  {
    value: "REJECTED",
    label: "Rejected",
    color: "bg-red-100 text-red-700",
    icon: XCircle,
  },
];

const SUBTYPE_ICONS: Record<string, any> = {
  job_posting: Briefcase,
  ai_resume_screen: FileSearch,
  coding_assessment: Code,
  mcq_assessment: HelpCircle,
  ai_technical_interview: Bot,
  ai_behavioral_interview: Bot,
  f2f_interview: Video,
  panel_interview: Video,
  offer: Award,
  onboarding: CheckCircle,
};

const SUBTYPE_COLORS: Record<string, string> = {
  job_posting: "bg-blue-100 text-blue-700",
  ai_resume_screen: "bg-[#EBF0FF] text-[#0245EF]",
  coding_assessment: "bg-purple-100 text-purple-700",
  mcq_assessment: "bg-indigo-100 text-indigo-700",
  ai_technical_interview: "bg-violet-100 text-violet-700",
  ai_behavioral_interview: "bg-fuchsia-100 text-fuchsia-700",
  f2f_interview: "bg-pink-100 text-pink-700",
  panel_interview: "bg-rose-100 text-rose-700",
  offer: "bg-emerald-100 text-emerald-700",
  onboarding: "bg-green-100 text-green-700",
};

interface PipelineStage {
  stageKey: string;
  status: string;
  label: string;
  subtype?: string;
  nodeId?: string;
  icon: any;
  color: string;
}

export default function HRJobDetailPage() {
  const { id } = useParams();
  const { isHR, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [job, setJob] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // filterKey can be "all", a status like "SCREENING", or a stageKey like "mcq_assessment_node123"
  const [filterKey, setFilterKey] = useState("all");
  const [scheduleApp, setScheduleApp] = useState<any>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([]);
  const [showShare, setShowShare] = useState(false);
  const [appScores, setAppScores] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!authLoading && !isHR) router.push("/login");
  }, [authLoading, isHR, router]);

  useEffect(() => {
    if (isHR) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const apps = appsData.applications || [];
      setApplications(apps);

      if (jobData.job?.pipeline_id) {
        try {
          const pRes = await fetch(
            `/api/pipeline?id=${jobData.job.pipeline_id}`
          );
          const pData = await pRes.json();
          if (pData.pipeline) {
            setPipelineStages(extractPipelineStages(pData.pipeline));
          }
        } catch {}
      }

      const scores: Record<string, any> = {};
      for (const app of apps) {
        try {
          const sRes = await fetch(`/api/candidates/${app.id}/results`);
          const sData = await sRes.json();
          scores[app.id] = {
            resume: sData.application?.resumeScore || 0,
            resumeCompleted: (sData.application?.resumeScore || 0) > 0,
            assessment: sData.submissions?.[0]?.percentage || 0,
            assessmentCompleted:
              sData.submissions?.some(
                (s: any) => s.status === "GRADED"
              ) || false,
            interview: sData.interviews?.[0]?.overallScore || 0,
            interviewCompleted:
              sData.interviews?.some(
                (i: any) => i.status === "COMPLETED"
              ) || false,
            f2f: sData.f2fInterviews?.[0]?.feedback_score || 0,
            f2fCompleted:
              sData.f2fInterviews?.some(
                (f: any) => f.status === "COMPLETED"
              ) || false,
            overall: sData.rating?.overallScore || 0,
          };
        } catch {
          scores[app.id] = null;
        }
      }
      setAppScores(scores);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (
    appId: string,
    newStatus: string,
    stage?: PipelineStage
  ) => {
    setUpdating(appId);
    try {
      const res = await fetch(`/api/applications/${appId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          ...(stage?.nodeId && { currentNodeId: stage.nodeId }),
          ...(stage?.subtype && { currentNodeSubtype: stage.subtype }),
        }),
      });
      if (!res.ok) throw new Error("Failed to update");

      const stageLabel =
        stage?.label ||
        ALL_STATUSES.find((s) => s.value === newStatus)?.label ||
        newStatus;
      toast.success(`Moved to ${stageLabel}`);
      fetchData();
    } catch {
      toast.error("Failed to update status");
    } finally {
      setUpdating(null);
    }
  };

  const getNextStage = (currentStatus: string): PipelineStage | null => {
    if (pipelineStages.length > 0) {
      const idx = pipelineStages.findIndex(
        (s) => s.status === currentStatus
      );
      if (idx === -1 || idx >= pipelineStages.length - 1) return null;
      return pipelineStages[idx + 1];
    }

    const order = [
      "APPLIED",
      "SCREENING",
      "ASSESSMENT",
      "AI_INTERVIEW",
      "F2F_INTERVIEW",
      "UNDER_REVIEW",
      "OFFERED",
      "HIRED",
    ];
    const idx = order.indexOf(currentStatus);
    if (idx === -1 || idx >= order.length - 1) return null;
    const nextStatus = order[idx + 1];
    const info = getStatusInfo(nextStatus);
    return {
      stageKey: nextStatus,
      status: nextStatus,
      label: info.label,
      icon: info.icon,
      color: info.color,
    };
  };

  const getStatusInfo = (status: string) =>
    ALL_STATUSES.find((s) => s.value === status) || ALL_STATUSES[0];

  const getDisplayStage = (
    app: any
  ): { label: string; icon: any; color: string } => {
    // If we have pipeline stages AND the app has current_stage (subtype),
    // find the specific node
    if (pipelineStages.length > 0 && app.current_stage) {
      const match = pipelineStages.find(
        (s) => s.subtype === app.current_stage
      );
      if (match) return { label: match.label, icon: match.icon, color: match.color };
    }

    // Fallback: match by status
    if (pipelineStages.length > 0) {
      const match = pipelineStages.find(
        (s) => s.status === app.status
      );
      if (match) return { label: match.label, icon: match.icon, color: match.color };
    }

    const info = getStatusInfo(app.status);
    return { label: info.label, icon: info.icon, color: info.color };
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

  // ==========================================
  // FILTERING — supports both status and stageKey (subtype)
  // ==========================================
  const filtered = (() => {
    if (filterKey === "all") return sorted;

    // Check if filterKey matches a pipeline stage's stageKey
    const matchedStage = pipelineStages.find(
      (s) => s.stageKey === filterKey
    );

    if (matchedStage && matchedStage.subtype) {
      // Filter by BOTH status AND current_stage (subtype)
      // This distinguishes coding_assessment from mcq_assessment
      return sorted.filter(
        (a) =>
          a.status === matchedStage.status &&
          (a.current_stage === matchedStage.subtype ||
            // If current_stage not set, still show if status matches
            // and there's only one stage with this status
            (!a.current_stage &&
              pipelineStages.filter(
                (s) => s.status === matchedStage.status
              ).length === 1))
      );
    }

    // Fallback: direct status match
    return sorted.filter((a) => a.status === filterKey);
  })();

  // Count applications per stageKey (granular)
  const stageCounts: Record<string, number> = {};
  if (pipelineStages.length > 0) {
    for (const stage of pipelineStages) {
      if (stage.subtype) {
        stageCounts[stage.stageKey] = sorted.filter(
          (a) =>
            a.status === stage.status &&
            (a.current_stage === stage.subtype ||
              (!a.current_stage &&
                pipelineStages.filter(
                  (s) => s.status === stage.status
                ).length === 1))
        ).length;
      } else {
        stageCounts[stage.stageKey] = sorted.filter(
          (a) => a.status === stage.status
        ).length;
      }
    }
  }

  // Fallback: status-based counts
  const statusCounts: Record<string, number> = {};
  applications.forEach((a) => {
    statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
  });

  const stagesForUI: PipelineStage[] =
    pipelineStages.length > 0
      ? pipelineStages
      : ALL_STATUSES.map((s) => ({
          stageKey: s.value,
          status: s.value,
          label: s.label,
          icon: s.icon,
          color: s.color,
        }));

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sub-header */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto h-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/hr/dashboard">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="font-semibold text-sm text-slate-800">
                {job.title}
              </h1>
              <p className="text-[11px] text-slate-400">
                {job.department} • {applications.length} applicant
                {applications.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={
                job.status === "PUBLISHED"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-slate-50 text-slate-500"
              }
            >
              {job.status}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowShare(true)}
            >
              <Share2 className="w-4 h-4 mr-1" /> Share
            </Button>
            <Link href={`/hr/jobs/${id}/edit`}>
              <Button variant="outline" size="sm">
                <Pencil className="w-4 h-4 mr-1" /> Edit
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Filter tabs */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <Button
            variant={filterKey === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterKey("all")}
            className={filterKey === "all" ? "bg-[#0245EF]" : ""}
          >
            All ({applications.length})
          </Button>

          {stagesForUI.map((stage) => {
            const count =
              pipelineStages.length > 0
                ? stageCounts[stage.stageKey] || 0
                : statusCounts[stage.status] || 0;

            if (count === 0) return null;

            const StageIcon = stage.icon;
            const isActive = filterKey === stage.stageKey;

            return (
              <Button
                key={stage.stageKey}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterKey(stage.stageKey)}
                className={isActive ? "bg-[#0245EF]" : ""}
              >
                <StageIcon className="w-3 h-3 mr-1" />
                {stage.label} ({count})
              </Button>
            );
          })}

          {statusCounts["REJECTED"] &&
            !stagesForUI.some((s) => s.status === "REJECTED") && (
              <Button
                variant={filterKey === "REJECTED" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterKey("REJECTED")}
                className={
                  filterKey === "REJECTED"
                    ? "bg-red-600"
                    : "text-red-600"
                }
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
              {filterKey === "all"
                ? "No applications yet"
                : "No candidates in this stage"}
            </h3>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((app, index) => {
              const displayStage = getDisplayStage(app);
              const StatusIcon = displayStage.icon;
              const nextStage = getNextStage(app.status);
              const isUpdating = updating === app.id;
              const scores = appScores[app.id];

              return (
                <Card
                  key={app.id}
                  className={`hover:shadow-md transition-all ${
                    index === 0 && filterKey === "all"
                      ? "border-[#A3BDFF] bg-[#EBF0FF]/20"
                      : ""
                  }`}
                >
                  <CardContent className="p-5">
                    {/* Candidate row */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                            index === 0
                              ? "bg-amber-100 text-amber-700"
                              : index === 1
                                ? "bg-slate-200 text-slate-600"
                                : index === 2
                                  ? "bg-orange-100 text-orange-700"
                                  : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {filterKey === "all" && index < 3
                            ? ["🥇", "🥈", "🥉"][index]
                            : `#${index + 1}`}
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-800">
                            {app.candidate?.firstName}{" "}
                            {app.candidate?.lastName}
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
                                app.resumeScore >= 70
                                  ? "text-emerald-600"
                                  : app.resumeScore >= 40
                                    ? "text-amber-600"
                                    : "text-red-500"
                              }`}
                            >
                              {Math.round(app.resumeScore)}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Match %
                            </div>
                          </div>
                        )}
                        <Badge className={displayStage.color}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {displayStage.label}
                        </Badge>
                      </div>
                    </div>

                    {/* Node Scores */}
                    {scores && (
                      <div className="mt-3 flex items-center gap-2 flex-wrap">
                        <NodeScoreBadge
                          label="Resume"
                          score={scores.resume}
                          completed={scores.resumeCompleted}
                          icon={FileSearch}
                        />
                        <NodeScoreBadge
                          label="Assessment"
                          score={scores.assessment}
                          completed={scores.assessmentCompleted}
                          icon={Code}
                        />
                        <NodeScoreBadge
                          label="AI Interview"
                          score={scores.interview}
                          completed={scores.interviewCompleted}
                          icon={Bot}
                        />
                        <NodeScoreBadge
                          label="F2F"
                          score={scores.f2f}
                          completed={scores.f2fCompleted}
                          icon={Video}
                        />
                        {scores.overall > 0 && (
                          <div className="ml-auto flex items-center gap-1 bg-slate-100 rounded-lg px-2 py-1">
                            <Award className="w-3 h-3 text-[#0245EF]" />
                            <span className="text-xs font-bold text-[#0245EF]">
                              {Math.round(scores.overall)}%
                            </span>
                            <span className="text-[10px] text-slate-400">
                              overall
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Interview Scores */}
                    <InterviewScores
                      applicationId={app.id}
                      status={app.status}
                    />

                    {/* F2F Info */}
                    <F2FScheduledInfo applicationId={app.id} />

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100 flex-wrap">
                      <Link href={`/hr/candidates/${app.id}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                        >
                          <Eye className="w-3 h-3 mr-1" /> View Details
                        </Button>
                      </Link>

                      {nextStage &&
                        app.status !== "REJECTED" &&
                        app.status !== "HIRED" && (
                          <Button
                            size="sm"
                            onClick={() =>
                              updateStatus(
                                app.id,
                                nextStage.status,
                                nextStage
                              )
                            }
                            disabled={isUpdating}
                            className="bg-[#0245EF] hover:bg-[#0237BF]"
                          >
                            {isUpdating ? (
                              <Loader2 className="w-3 h-3 animate-spin mr-1" />
                            ) : (
                              <ArrowRight className="w-3 h-3 mr-1" />
                            )}
                            Move to {nextStage.label}
                          </Button>
                        )}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs"
                          >
                            <ChevronDown className="w-3 h-3 mr-1" />{" "}
                            Change Stage
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="start"
                          className="w-56"
                        >
                          {stagesForUI.map((stage) => {
                            const Icon = stage.icon;
                            const isCurrent =
                              app.status === stage.status &&
                              (!stage.subtype ||
                                app.current_stage === stage.subtype);
                            return (
                              <DropdownMenuItem
                                key={stage.stageKey}
                                onClick={() => {
                                  if (!isCurrent)
                                    updateStatus(
                                      app.id,
                                      stage.status,
                                      stage
                                    );
                                }}
                                disabled={isCurrent}
                                className={
                                  isCurrent
                                    ? "opacity-50 bg-[#EBF0FF]"
                                    : ""
                                }
                              >
                                <Icon className="w-4 h-4 mr-2" />
                                <div className="flex-1">
                                  <span>{stage.label}</span>
                                  {stage.subtype && (
                                    <span className="text-[10px] text-slate-400 ml-1">
                                      (
                                      {stage.status
                                        .replace(/_/g, " ")
                                        .toLowerCase()}
                                      )
                                    </span>
                                  )}
                                </div>
                                {isCurrent && (
                                  <Badge
                                    variant="outline"
                                    className="text-[9px] h-4 px-1"
                                  >
                                    Current
                                  </Badge>
                                )}
                              </DropdownMenuItem>
                            );
                          })}
                          {app.status !== "REJECTED" && (
                            <DropdownMenuItem
                              className="border-t border-slate-100 mt-1 pt-1 text-red-600"
                              onClick={() =>
                                updateStatus(app.id, "REJECTED")
                              }
                            >
                              <XCircle className="w-4 h-4 mr-2" />{" "}
                              Reject
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {!["REJECTED", "HIRED", "APPLIED"].includes(
                        app.status
                      ) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => setScheduleApp(app)}
                        >
                          <Calendar className="w-3 h-3 mr-1" />{" "}
                          Schedule F2F
                        </Button>
                      )}

                      {app.status !== "REJECTED" &&
                        app.status !== "HIRED" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              updateStatus(app.id, "REJECTED")
                            }
                            disabled={isUpdating}
                            className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 ml-auto"
                          >
                            <XCircle className="w-3 h-3 mr-1" /> Reject
                          </Button>
                        )}

                      {app.status === "OFFERED" && (
                        <Button
                          size="sm"
                          onClick={() =>
                            updateStatus(app.id, "HIRED")
                          }
                          disabled={isUpdating}
                          className="bg-emerald-600 hover:bg-emerald-700 ml-auto"
                        >
                          <Award className="w-3 h-3 mr-1" /> Mark as
                          Hired
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

      {scheduleApp && (
        <ScheduleF2FDialog
          open={!!scheduleApp}
          onOpenChange={(open) => {
            if (!open) setScheduleApp(null);
          }}
          applicationId={scheduleApp.id}
          candidateName={`${scheduleApp.candidate?.firstName || ""} ${scheduleApp.candidate?.lastName || ""}`}
          onScheduled={fetchData}
        />
      )}

      {showShare && (
        <ShareJobDialog
          open={showShare}
          onOpenChange={setShowShare}
          jobId={id as string}
          jobTitle={job.title}
        />
      )}
    </div>
  );
}

// ==========================================
// Node Score Badge
// ==========================================
function NodeScoreBadge({
  label,
  score,
  completed,
  icon: Icon,
}: {
  label: string;
  score: number;
  completed: boolean;
  icon: any;
}) {
  if (!completed) {
    return (
      <div className="flex items-center gap-1.5 bg-slate-100 rounded-lg px-2 py-1">
        <Icon className="w-3 h-3 text-slate-400" />
        <span className="text-[10px] text-slate-400">{label}</span>
        <Badge
          variant="outline"
          className="text-[9px] h-4 px-1 text-slate-400 border-slate-200"
        >
          Pending
        </Badge>
      </div>
    );
  }

  const color =
    score >= 70
      ? "text-emerald-600 bg-emerald-50 border-emerald-200"
      : score >= 40
        ? "text-amber-600 bg-amber-50 border-amber-200"
        : "text-red-600 bg-red-50 border-red-200";

  return (
    <div
      className={`flex items-center gap-1.5 rounded-lg px-2 py-1 border ${color}`}
    >
      <Icon className="w-3 h-3" />
      <span className="text-[10px]">{label}</span>
      <span className="text-xs font-bold">{Math.round(score)}%</span>
    </div>
  );
}

// ==========================================
// Interview Scores
// ==========================================
function InterviewScores({
  applicationId,
  status,
}: {
  applicationId: string;
  status: string;
}) {
  const [scores, setScores] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (
      [
        "AI_INTERVIEW",
        "F2F_INTERVIEW",
        "UNDER_REVIEW",
        "OFFERED",
        "HIRED",
        "REJECTED",
      ].includes(status)
    ) {
      fetchScores();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId, status]);

  const fetchScores = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/interview?applicationId=${applicationId}`
      );
      const data = await res.json();
      if (data.interviews?.length > 0) {
        const interview = data.interviews[0];
        let breakdown = interview.score_breakdown;
        if (typeof breakdown === "string")
          breakdown = JSON.parse(breakdown);
        setScores({ ...interview, score_breakdown: breakdown });
      }
    } catch {
    } finally {
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
          <span className="text-sm font-medium text-slate-700">
            AI Interview
          </span>
          <Badge
            className={`text-xs ${
              (scores.overall_score || 0) >= 70
                ? "bg-emerald-100 text-emerald-700"
                : (scores.overall_score || 0) >= 40
                  ? "bg-amber-100 text-amber-700"
                  : "bg-red-100 text-red-700"
            }`}
          >
            {scores.overall_score || 0}/100
          </Badge>
          {breakdown.recommendation && (
            <Badge variant="outline" className="text-xs">
              {breakdown.recommendation}
            </Badge>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Overall", score: scores.overall_score },
              { label: "Technical", score: breakdown.technicalScore },
              {
                label: "Communication",
                score: breakdown.communicationScore,
              },
              {
                label: "Problem Solving",
                score: breakdown.problemSolvingScore,
              },
            ].map((item) => (
              <div key={item.label} className="bg-white rounded-lg p-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-slate-500">
                    {item.label}
                  </span>
                  <span
                    className={`text-sm font-bold ${
                      (item.score || 0) >= 70
                        ? "text-emerald-600"
                        : (item.score || 0) >= 40
                          ? "text-amber-600"
                          : "text-red-500"
                    }`}
                  >
                    {item.score || 0}
                    <span className="text-slate-400 font-normal">
                      /100
                    </span>
                  </span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full">
                  <div
                    className={`h-full rounded-full ${
                      (item.score || 0) >= 70
                        ? "bg-emerald-500"
                        : (item.score || 0) >= 40
                          ? "bg-amber-500"
                          : "bg-red-500"
                    }`}
                    style={{
                      width: `${Math.min(item.score || 0, 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          {scores.analysis && (
            <div className="bg-white rounded-lg p-3">
              <p className="text-xs font-semibold text-slate-600 mb-1">
                AI Analysis
              </p>
              <p className="text-xs text-slate-500">
                {scores.analysis}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ==========================================
// F2F Scheduled Info
// ==========================================
function F2FScheduledInfo({
  applicationId,
}: {
  applicationId: string;
}) {
  const [interviews, setInterviews] = useState<any[]>([]);
  const [editingInterview, setEditingInterview] = useState<any>(null);

  useEffect(() => {
    fetchInterviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId]);

  const fetchInterviews = async () => {
    try {
      const res = await fetch(
        `/api/f2f?applicationId=${applicationId}`
      );
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
        const isToday =
          date.toDateString() === new Date().toDateString();
        const isCancelled = interview.status === "CANCELLED";

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
                <Calendar
                  className={`w-4 h-4 mt-0.5 shrink-0 ${
                    isCancelled
                      ? "text-red-400"
                      : isToday
                        ? "text-[#0245EF]"
                        : "text-slate-400"
                  }`}
                />
                <div>
                  <span
                    className={`text-xs font-semibold ${
                      isCancelled
                        ? "text-red-600 line-through"
                        : isToday
                          ? "text-[#0245EF]"
                          : "text-slate-600"
                    }`}
                  >
                    {isCancelled
                      ? "Cancelled"
                      : isToday
                        ? "🔴 Today"
                        : isPast
                          ? interview.status === "COMPLETED"
                            ? "✅ Completed"
                            : "Past"
                          : "Scheduled"}
                  </span>
                  <p className="text-xs text-slate-500 mt-1">
                    {date.toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    at{" "}
                    {date.toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </p>
                </div>
              </div>
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
      {editingInterview && (
        <EditF2FDialog
          open={!!editingInterview}
          onOpenChange={(open) => {
            if (!open) setEditingInterview(null);
          }}
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

// ==========================================
// Extract Pipeline Stages
// ==========================================
function extractPipelineStages(pipeline: any): PipelineStage[] {
  let nodes: any[] = [];
  let edges: any[] = [];
  try {
    nodes =
      typeof pipeline.nodes === "string"
        ? JSON.parse(pipeline.nodes)
        : pipeline.nodes || [];
    edges =
      typeof pipeline.edges === "string"
        ? JSON.parse(pipeline.edges)
        : pipeline.edges || [];
  } catch {
    return [];
  }

  const adjMap = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  for (const node of nodes) {
    adjMap.set(node.id, []);
    inDegree.set(node.id, 0);
  }
  for (const edge of edges) {
    if (!edge.sourceHandle || edge.sourceHandle === "pass") {
      const t = adjMap.get(edge.source) || [];
      t.push(edge.target);
      adjMap.set(edge.source, t);
      inDegree.set(
        edge.target,
        (inDegree.get(edge.target) || 0) + 1
      );
    }
  }

  const queue: string[] = [];
  for (const [nodeId, deg] of inDegree.entries()) {
    if (deg === 0) queue.push(nodeId);
  }
  const ordered: any[] = [];
  while (queue.length > 0) {
    const c = queue.shift()!;
    const n = nodes.find((nd: any) => nd.id === c);
    if (n) ordered.push(n);
    for (const nx of adjMap.get(c) || []) {
      const d = (inDegree.get(nx) || 1) - 1;
      inDegree.set(nx, d);
      if (d === 0) queue.push(nx);
    }
  }

  const subtypeToStatus: Record<string, string> = {
    job_posting: "APPLIED",
    ai_resume_screen: "SCREENING",
    coding_assessment: "ASSESSMENT",
    mcq_assessment: "ASSESSMENT",
    ai_technical_interview: "AI_INTERVIEW",
    ai_behavioral_interview: "AI_INTERVIEW",
    f2f_interview: "F2F_INTERVIEW",
    panel_interview: "F2F_INTERVIEW",
    offer: "OFFERED",
    onboarding: "HIRED",
  };

  const stages: PipelineStage[] = [];

  for (const node of ordered) {
    const subtype = node.data?.subtype;
    if (
      !subtype ||
      ["filter", "logic", "action"].includes(node.data?.type)
    ) {
      continue;
    }

    const parentStatus = subtypeToStatus[subtype];
    if (!parentStatus) continue;

    const label =
      node.data?.label ||
      node.data?.config?.title ||
      subtype
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c: string) => c.toUpperCase());

    stages.push({
      stageKey: `${subtype}_${node.id}`,
      status: parentStatus,
      label,
      subtype,
      nodeId: node.id,
      icon: SUBTYPE_ICONS[subtype] || Code,
      color: SUBTYPE_COLORS[subtype] || "bg-slate-100 text-slate-700",
    });
  }

  const seenStatuses = new Set(stages.map((s) => s.status));
  if (!seenStatuses.has("UNDER_REVIEW")) {
    stages.push({
      stageKey: "UNDER_REVIEW",
      status: "UNDER_REVIEW",
      label: "Under Review",
      icon: Clock,
      color: "bg-orange-100 text-orange-700",
    });
  }
  if (!seenStatuses.has("OFFERED") && !seenStatuses.has("HIRED")) {
    stages.push({
      stageKey: "OFFERED",
      status: "OFFERED",
      label: "Offered",
      icon: Award,
      color: "bg-emerald-100 text-emerald-700",
    });
  }

  return stages;
}