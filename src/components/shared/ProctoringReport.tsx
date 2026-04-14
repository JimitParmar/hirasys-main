"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Shield,
  AlertTriangle,
  Eye,
  Clipboard,
  Monitor,
  Maximize,
  Clock,
  ChevronDown,
  Loader2,
  CheckCircle,
} from "lucide-react";

interface ProctoringReportProps {
  submissionId: string;
}

export function ProctoringReport({ submissionId }: ProctoringReportProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissionId]);

  const fetchReport = async () => {
    try {
      const res = await fetch(
        `/api/proctoring?submissionId=${submissionId}`
      );
      const d = await res.json();
      if (res.ok) setData(d);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-400 p-2">
        <Loader2 className="w-3 h-3 animate-spin" /> Loading proctoring
        data...
      </div>
    );
  }

  if (!data || !data.summary) return null;

  const { summary, events } = data;
  const hasViolations = summary.totalViolations > 0;

  const levelConfig = {
    low: {
      color: "bg-emerald-100 text-emerald-700 border-emerald-200",
      icon: CheckCircle,
      label: "Clean",
    },
    medium: {
      color: "bg-amber-100 text-amber-700 border-amber-200",
      icon: AlertTriangle,
      label: "Minor Issues",
    },
    high: {
      color: "bg-orange-100 text-orange-700 border-orange-200",
      icon: AlertTriangle,
      label: "Suspicious",
    },
    critical: {
      color: "bg-red-100 text-red-700 border-red-200",
      icon: AlertTriangle,
      label: "High Risk",
    },
  };

  const level =
    levelConfig[summary.suspicionLevel] || levelConfig.low;
  const LevelIcon = level.icon;

  return (
    <Card
      className={`mt-3 border ${
        summary.suspicionLevel === "critical"
          ? "border-red-300 bg-red-50/50"
          : summary.suspicionLevel === "high"
            ? "border-orange-300 bg-orange-50/50"
            : "border-slate-200"
      }`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left"
      >
        <CardHeader className="p-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-slate-500" />
              <span>Proctoring Report</span>
              <Badge className={`text-[10px] ${level.color}`}>
                <LevelIcon className="w-3 h-3 mr-0.5" />
                {level.label}
              </Badge>
              {summary.totalViolations > 0 && (
                <Badge
                  variant="outline"
                  className="text-[10px] text-slate-500"
                >
                  {summary.totalViolations} violation
                  {summary.totalViolations !== 1 ? "s" : ""}
                </Badge>
              )}
            </div>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`}
            />
          </CardTitle>
        </CardHeader>
      </button>

      {expanded && (
        <CardContent className="p-3 pt-0 space-y-3">
          {/* Stats Grid */}
          <div className="grid grid-cols-5 gap-2">
            {[
              {
                icon: Eye,
                label: "Tab Switches",
                value: summary.tabSwitches,
                warn: summary.tabSwitches > 2,
              },
              {
                icon: Clipboard,
                label: "Copy/Paste",
                value: summary.copyPasteAttempts,
                warn: summary.copyPasteAttempts > 0,
              },
              {
                icon: Monitor,
                label: "DevTools",
                value: summary.devtoolsOpened,
                warn: summary.devtoolsOpened > 0,
              },
              {
                icon: Maximize,
                label: "FS Exits",
                value: summary.fullscreenExits,
                warn: summary.fullscreenExits > 2,
              },
              {
                icon: Clock,
                label: "Duration",
                value: summary.duration
                  ? `${Math.floor(summary.duration / 60000)}m`
                  : "—",
                warn: false,
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className={`text-center p-2 rounded-lg ${
                  stat.warn
                    ? "bg-red-50 border border-red-200"
                    : "bg-slate-50"
                }`}
              >
                <stat.icon
                  className={`w-4 h-4 mx-auto mb-1 ${stat.warn ? "text-red-500" : "text-slate-400"}`}
                />
                <p
                  className={`text-lg font-bold ${stat.warn ? "text-red-600" : "text-slate-700"}`}
                >
                  {stat.value}
                </p>
                <p className="text-[9px] text-slate-400">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Event Timeline */}
          {events && events.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-2">
                Event Timeline ({events.length} events)
              </p>
              <div className="max-h-[300px] overflow-y-auto space-y-1">
                {events
                  .filter(
                    (e: any) =>
                      e.type !== "SESSION_START" &&
                      e.type !== "SESSION_END" &&
                      e.type !== "WINDOW_FOCUS" &&
                      e.type !== "TAB_VISIBLE"
                  )
                  .map((event: any, i: number) => {
                    const isViolation = [
                      "TAB_SWITCH",
                      "TAB_HIDDEN",
                      "WINDOW_BLUR",
                      "COPY",
                      "PASTE",
                      "CUT",
                      "DEVTOOLS_OPEN",
                      "FULLSCREEN_EXIT",
                      "SCREENSHOT_ATTEMPT",
                    ].includes(event.type);

                    return (
                      <div
                        key={i}
                        className={`flex items-center gap-2 text-[10px] px-2 py-1 rounded ${
                          isViolation
                            ? "bg-red-50 text-red-700"
                            : "bg-slate-50 text-slate-500"
                        }`}
                      >
                        <span className="font-mono shrink-0">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[8px] h-4 shrink-0 ${isViolation ? "border-red-300 text-red-600" : "border-slate-300"}`}
                        >
                          {event.type.replace(/_/g, " ")}
                        </Badge>
                        {event.details && (
                          <span className="truncate">{event.details}</span>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {!hasViolations && (
            <div className="text-center py-2">
              <CheckCircle className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
              <p className="text-xs text-emerald-600 font-medium">
                No suspicious activity detected
              </p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}