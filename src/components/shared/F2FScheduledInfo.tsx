"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Video,
  Users,
  Mail,
  Pencil,
  Loader2,
  CheckCircle,
  User,
  ChevronDown,
  ExternalLink,
} from "lucide-react";
import { EditF2FDialog } from "./EditF2FDialog";

interface Props {
  applicationId: string;
  showActions?: boolean;
}

export function F2FScheduledInfo({
  applicationId,
  showActions = true,
}: Props) {
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingInterview, setEditingInterview] = useState<any>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
    } catch {
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
        <Loader2 className="w-3 h-3 animate-spin" /> Loading
        interviews...
      </div>
    );
  }

  if (interviews.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      {interviews.map((interview) => {
        const date = new Date(interview.scheduled_at);
        const endDate = new Date(
          date.getTime() + (interview.duration || 60) * 60 * 1000
        );
        const isPast = date < new Date();
        const isToday =
          date.toDateString() === new Date().toDateString();
        const isCancelled = interview.status === "CANCELLED";
        const isCompleted = interview.status === "COMPLETED";
        const isExpanded = expandedId === interview.id;

        let metadata = interview.metadata || {};
        try {
          if (typeof metadata === "string")
            metadata = JSON.parse(metadata);
        } catch {
          metadata = {};
        }
        const interviewerList = metadata.interviewers || [];

        const statusConfig = isCancelled
          ? {
              bg: "bg-red-50",
              border: "border-red-200",
              text: "text-red-600",
              badge: "bg-red-100 text-red-700",
              label: "Cancelled",
            }
          : isCompleted
            ? {
                bg: "bg-emerald-50",
                border: "border-emerald-200",
                text: "text-emerald-600",
                badge: "bg-emerald-100 text-emerald-700",
                label: "✅ Completed",
              }
            : isToday
              ? {
                  bg: "bg-[#EBF0FF]",
                  border: "border-[#A3BDFF]",
                  text: "text-[#0245EF]",
                  badge: "bg-[#0245EF] text-white",
                  label: "🔴 Today",
                }
              : isPast
                ? {
                    bg: "bg-slate-50",
                    border: "border-slate-200",
                    text: "text-slate-500",
                    badge: "bg-slate-100 text-slate-600",
                    label: "Past",
                  }
                : {
                    bg: "bg-blue-50",
                    border: "border-blue-200",
                    text: "text-blue-600",
                    badge: "bg-blue-100 text-blue-700",
                    label: "Scheduled",
                  };

        return (
          <div
            key={interview.id}
            className={`border rounded-lg overflow-hidden ${statusConfig.border} ${isCancelled ? "opacity-60" : ""}`}
          >
            {/* Header — click to expand */}
            <button
              onClick={() =>
                setExpandedId(isExpanded ? null : interview.id)
              }
              className={`w-full text-left p-3 flex items-start justify-between ${statusConfig.bg} hover:brightness-[0.97] transition-all`}
            >
              <div className="flex items-start gap-3">
                <Calendar
                  className={`w-4 h-4 mt-0.5 shrink-0 ${statusConfig.text}`}
                />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      className={`text-[10px] ${statusConfig.badge}`}
                    >
                      {statusConfig.label}
                    </Badge>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/80 border border-slate-200 text-slate-500 capitalize">
                      {interview.interview_type || "technical"}
                    </span>
                    {interviewerList.length > 0 && (
                      <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                        <Users className="w-3 h-3" />
                        {interviewerList.length} interviewer
                        {interviewerList.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-sm font-medium mt-1 ${isCancelled ? "line-through" : "text-slate-700"}`}
                  >
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
                    {" — "}
                    {endDate.toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })}
                    <span className="text-slate-400 font-normal">
                      {" "}
                      ({interview.duration || 60} min)
                    </span>
                  </p>
                </div>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform shrink-0 mt-1 ${isExpanded ? "rotate-180" : ""}`}
              />
            </button>

            {/* Expanded Details */}
            {isExpanded && (
              <div className="p-3 space-y-3 bg-white border-t border-slate-100">
                {/* Interviewers */}
                {interviewerList.length > 0 && (
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1.5">
                      Interview Panel
                    </p>
                    <div className="space-y-1.5">
                      {interviewerList.map(
                        (person: any, i: number) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 bg-slate-50 rounded-lg px-2.5 py-1.5"
                          >
                            <div className="w-7 h-7 rounded-full bg-[#D1DEFF] flex items-center justify-center shrink-0">
                              <span className="text-[10px] font-bold text-[#0245EF]">
                                {person.name
                                  ?.split(" ")
                                  .map((n: string) => n[0])
                                  .join("")
                                  .substring(0, 2) || "?"}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-slate-700 truncate">
                                {person.name}
                              </p>
                              {person.email && (
                                <p className="text-[10px] text-slate-400 flex items-center gap-0.5 truncate">
                                  <Mail className="w-2.5 h-2.5 shrink-0" />
                                  {person.email}
                                </p>
                              )}
                            </div>
                            {person.role && (
                              <Badge
                                variant="outline"
                                className="text-[9px] h-4 shrink-0"
                              >
                                {person.role}
                              </Badge>
                            )}
                            {person.isExternal && (
                              <Badge className="text-[9px] h-4 bg-amber-100 text-amber-700 shrink-0">
                                External
                              </Badge>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* Fallback: primary interviewer from DB */}
                {interviewerList.length === 0 &&
                  interview.interviewer_first_name && (
                    <div className="flex items-center gap-2 text-xs bg-slate-50 rounded-lg px-2.5 py-1.5">
                      <User className="w-3 h-3 text-slate-400" />
                      <span className="font-medium text-slate-700">
                        {interview.interviewer_first_name}{" "}
                        {interview.interviewer_last_name}
                      </span>
                      {interview.interviewer_email && (
                        <span className="text-slate-400">
                          ({interview.interviewer_email})
                        </span>
                      )}
                    </div>
                  )}

                {/* Meeting Link */}
                {interview.meeting_link && (
                  <a
                    href={interview.meeting_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-[#0245EF] hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Video className="w-3 h-3" />
                    Join Meeting
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}

                {/* Notes */}
                {interview.notes && (
                  <div className="bg-slate-50 rounded-lg p-2">
                    <p className="text-[10px] text-slate-400 mb-0.5">
                      Notes
                    </p>
                    <p className="text-xs text-slate-600">
                      {interview.notes}
                    </p>
                  </div>
                )}

                {/* Scheduled by info */}
                {metadata.lastEditedAt && (
                  <p className="text-[10px] text-slate-400">
                    Last edited{" "}
                    {new Date(
                      metadata.lastEditedAt
                    ).toLocaleString()}
                  </p>
                )}

                {/* Actions — Edit only, cancel is inside EditDialog */}
                {showActions && !isCancelled && !isCompleted && (
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingInterview(interview);
                      }}
                    >
                      <Pencil className="w-3 h-3 mr-1" /> Edit /
                      Reschedule
                    </Button>

                    {interview.meeting_link && (
                      <a
                        href={interview.meeting_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-7 text-[#0245EF] border-[#A3BDFF]"
                        >
                          <Video className="w-3 h-3 mr-1" /> Join
                        </Button>
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Edit/Reschedule/Cancel Dialog */}
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