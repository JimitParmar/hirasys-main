"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft, Loader2, Users, Mail, Briefcase,
  ChevronDown, Eye, Pencil, FileSearch, Code, Bot,
  Video, Award, XCircle, Clock, MoreVertical,
  CheckCircle, ArrowRight,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import Link from "next/link";
import toast from "react-hot-toast";

const ALL_STATUSES = [
  { value: "APPLIED", label: "Applied", color: "bg-blue-100 text-blue-700", icon: Briefcase },
  { value: "SCREENING", label: "Screening", color: "bg-indigo-100 text-indigo-700", icon: FileSearch },
  { value: "ASSESSMENT", label: "Assessment", color: "bg-purple-100 text-purple-700", icon: Code },
  { value: "AI_INTERVIEW", label: "AI Interview", color: "bg-violet-100 text-violet-700", icon: Bot },
  { value: "F2F_INTERVIEW", label: "F2F Interview", color: "bg-pink-100 text-pink-700", icon: Video },
  { value: "UNDER_REVIEW", label: "Under Review", color: "bg-orange-100 text-orange-700", icon: Clock },
  { value: "OFFERED", label: "Offered", color: "bg-emerald-100 text-emerald-700", icon: Award },
  { value: "HIRED", label: "Hired", color: "bg-green-100 text-green-700", icon: CheckCircle },
  { value: "REJECTED", label: "Rejected", color: "bg-red-100 text-red-700", icon: XCircle },
];

// Stage ordering for "next stage" logic
const STAGE_ORDER = [
  "APPLIED", "SCREENING", "ASSESSMENT", "AI_INTERVIEW",
  "F2F_INTERVIEW", "UNDER_REVIEW", "OFFERED", "HIRED",
];

export default function HRJobDetailPage() {
  const { id } = useParams();
  const { isHR, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [job, setJob] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
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
    const currentIndex = STAGE_ORDER.indexOf(currentStatus);
    if (currentIndex === -1 || currentIndex >= STAGE_ORDER.length - 1) return null;
    return STAGE_ORDER[currentIndex + 1];
  };

  const getStatusInfo = (status: string) => {
    return ALL_STATUSES.find((s) => s.value === status) || ALL_STATUSES[0];
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
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

  // Sort by score, then filter
  const sorted = [...applications].sort(
    (a, b) => (b.resumeScore || 0) - (a.resumeScore || 0)
  );
  const filtered = filterStatus === "all"
    ? sorted
    : sorted.filter((a) => a.status === filterStatus);

  // Count per status
  const statusCounts: Record<string, number> = {};
  applications.forEach((a) => {
    statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/hr/dashboard">
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="font-semibold text-sm text-slate-800">{job.title}</h1>
              <p className="text-[11px] text-slate-400">
                {job.department} • {applications.length} applicant{applications.length !== 1 ? "s" : ""}
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
            <Link href={`/hr/jobs/${id}/edit`}>
              <Button variant="outline" size="sm">
                <Pencil className="w-4 h-4 mr-1" /> Edit
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Status filter tabs */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <Button
            variant={filterStatus === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus("all")}
            className={filterStatus === "all" ? "bg-indigo-600" : ""}
          >
            All ({applications.length})
          </Button>
          {ALL_STATUSES.filter((s) => statusCounts[s.value]).map((status) => {
            const StatusIcon = status.icon;
            return (
              <Button
                key={status.value}
                variant={filterStatus === status.value ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus(status.value)}
                className={filterStatus === status.value ? "bg-indigo-600" : ""}
              >
                <StatusIcon className="w-3 h-3 mr-1" />
                {status.label} ({statusCounts[status.value]})
              </Button>
            );
          })}
        </div>

        {/* Applications */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-600">
              {filterStatus === "all" ? "No applications yet" : `No ${getStatusInfo(filterStatus).label.toLowerCase()} candidates`}
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
                      ? "border-indigo-200 bg-indigo-50/20"
                      : ""
                  }`}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      {/* Left: Candidate Info */}
                      <div className="flex items-start gap-4">
                        {/* Rank badge */}
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

                      {/* Right: Score + Status */}
                      <div className="flex items-center gap-4">
                        {/* Resume Score */}
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
                            <div className="text-[10px] text-slate-400">
                              Match %
                            </div>
                          </div>
                        )}

                        {/* Status Badge */}
                        <Badge className={statusInfo.color}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusInfo.label}
                        </Badge>
                      </div>
                    </div>
                                            {/* Interview/Assessment Scores if available */}
                    <InterviewScores applicationId={app.id} status={app.status} />
                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
                      {/* Quick advance to next stage */}
                      {nextStageInfo && app.status !== "REJECTED" && app.status !== "HIRED" && (
                        <Button
                          size="sm"
                          onClick={() => updateStatus(app.id, nextStage!)}
                          disabled={isUpdating}
                          className="bg-indigo-600 hover:bg-indigo-700"
                        >
                          {isUpdating ? (
                            <Loader2 className="w-3 h-3 animate-spin mr-1" />
                          ) : (
                            <ArrowRight className="w-3 h-3 mr-1" />
                          )}
                          Move to {nextStageInfo.label}
                        </Button>
                      )}

                      {/* Jump to any stage */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="text-xs">
                            <ChevronDown className="w-3 h-3 mr-1" />
                            Change Stage
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-48">
                          {ALL_STATUSES.map((status) => {
                            const Icon = status.icon;
                            const isCurrent = app.status === status.value;
                            return (
                              <DropdownMenuItem
                                key={status.value}
                                onClick={() => {
                                  if (!isCurrent) updateStatus(app.id, status.value);
                                }}
                                disabled={isCurrent}
                                className={isCurrent ? "opacity-50" : ""}
                              >
                                <Icon className="w-4 h-4 mr-2" />
                                {status.label}
                                {isCurrent && (
                                  <span className="ml-auto text-xs text-slate-400">
                                    Current
                                  </span>
                                )}
                              </DropdownMenuItem>
                            );
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {/* Reject shortcut */}
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

                      {/* Hire shortcut */}
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
    </div>
  );
}
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
        setScores({
          ...interview,
          score_breakdown: breakdown,
        });
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  if (!scores || loading) return null;

  const breakdown = scores.score_breakdown || {};

  return (
    <div className="mt-3 border border-indigo-100 bg-indigo-50/50 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-indigo-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Bot className="w-4 h-4 text-indigo-500" />
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
            <Badge variant="outline" className="text-xs">
              {breakdown.recommendation}
            </Badge>
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

          {/* View transcript link */}
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={() => {
              // Open transcript in new window
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
                    <h1>🤖 AI Interview Transcript</h1>
                    <p><strong>Overall Score:</strong>
                      <span class="score ${(scores.overall_score || 0) >= 70 ? 'high' : (scores.overall_score || 0) >= 40 ? 'mid' : 'low'}">
                        ${scores.overall_score || 0}/100
                      </span>
                      <span class="score ${(breakdown.technicalScore || 0) >= 70 ? 'high' : (breakdown.technicalScore || 0) >= 40 ? 'mid' : 'low'}">
                        Tech: ${breakdown.technicalScore || 0}/100
                      </span>
                      <span class="score ${(breakdown.communicationScore || 0) >= 70 ? 'high' : (breakdown.communicationScore || 0) >= 40 ? 'mid' : 'low'}">
                        Comm: ${breakdown.communicationScore || 0}/100
                      </span>
                    </p>
                    ${scores.analysis ? `<p><strong>Analysis:</strong> ${scores.analysis}</p>` : ""}
                    <hr/>
                    <pre>${transcript}</pre>
                  </body>
                  </html>
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