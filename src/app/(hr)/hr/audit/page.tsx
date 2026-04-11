"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft, Loader2, ShieldCheck, User, Briefcase,
  GitBranch, FileText, Calendar, Bot, Users, Settings,
} from "lucide-react";
import { formatDateTime, formatRelativeTime } from "@/lib/utils";
import Link from "next/link";

const ACTION_CONFIG: Record<string, { icon: any; color: string }> = {
  JOB_CREATED: { icon: Briefcase, color: "text-emerald-600 bg-emerald-50" },
  JOB_UPDATED: { icon: Briefcase, color: "text-blue-600 bg-blue-50" },
  PIPELINE_CREATED: { icon: GitBranch, color: "text-purple-600 bg-purple-50" },
  PIPELINE_UPDATED: { icon: GitBranch, color: "text-purple-600 bg-purple-50" },
  APPLICATION_STATUS_CHANGED: { icon: FileText, color: "text-amber-600 bg-amber-50" },
  F2F_SCHEDULED: { icon: Calendar, color: "text-pink-600 bg-pink-50" },
  TEAM_MEMBER_INVITED: { icon: Users, color: "text-[#0245EF] bg-[#EBF0FF]" },
  INVITATION_ACCEPTED: { icon: Users, color: "text-emerald-600 bg-emerald-50" },
  INVITATION_REVOKED: { icon: Users, color: "text-red-600 bg-red-50" },
  MEMBER_ROLE_CHANGED: { icon: ShieldCheck, color: "text-purple-600 bg-purple-50" },
  MEMBER_DEACTIVATED: { icon: Users, color: "text-red-600 bg-red-50" },
  MEMBER_ACTIVATED: { icon: Users, color: "text-emerald-600 bg-emerald-50" },
  COMPANY_CREATED: { icon: Settings, color: "text-[#0245EF] bg-[#EBF0FF]" },
  COMPANY_UPDATED: { icon: Settings, color: "text-slate-600 bg-slate-50" },
};

export default function AuditPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!authLoading) {
      if ((user as any)?.role !== "ADMIN") {
        router.push("/hr/dashboard");
      } else {
        fetchLogs();
      }
    }
  }, [authLoading, user, page]);

  const fetchLogs = async () => {
    try {
      const res = await fetch(`/api/audit?page=${page}&limit=50`);
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0245EF]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto h-12 flex items-center gap-3">
          <Link href="/hr/team">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <ShieldCheck className="w-5 h-5 text-[#0245EF]" />
          <span className="text-sm font-semibold text-slate-800">Audit Log</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Activity History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {logs.length === 0 ? (
              <div className="p-8 text-center">
                <ShieldCheck className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-slate-500">No activity logged yet</p>
              </div>
            ) : (
              <div className="divide-y">
                {logs.map((log: any) => {
                  const config = ACTION_CONFIG[log.action] || { icon: Settings, color: "text-slate-600 bg-slate-50" };
                  const Icon = config.icon;
                  let details = log.details;
                  try { if (typeof details === "string") details = JSON.parse(details); } catch { details = {}; }

                  return (
                    <div key={log.id} className="flex items-start gap-3 p-4">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${config.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm text-slate-700">
                              <strong className="font-medium">{log.user_name || log.user_email || "System"}</strong>
                              {" "}{formatAction(log.action)}
                              {log.resource_name && (
                                <span className="font-medium"> "{log.resource_name}"</span>
                              )}
                            </p>

                            {Object.keys(details).length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {Object.entries(details).slice(0, 4).map(([key, value]) => (
                                  <Badge key={key} variant="outline" className="text-[9px] font-mono">
                                    {key}: {typeof value === "object" ? JSON.stringify(value) : String(value).substring(0, 30)}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>

                          <span className="text-[10px] text-slate-400 shrink-0">
                            {formatRelativeTime(log.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {logs.length >= 50 && (
              <div className="p-4 flex justify-center gap-2 border-t">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
                  Previous
                </Button>
                <span className="text-sm text-slate-400 flex items-center px-3">Page {page}</span>
                <Button variant="outline" size="sm" onClick={() => setPage(page + 1)}>
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function formatAction(action: string): string {
  const map: Record<string, string> = {
    JOB_CREATED: "created job",
    JOB_UPDATED: "updated job",
    PIPELINE_CREATED: "created pipeline",
    PIPELINE_UPDATED: "updated pipeline",
    APPLICATION_STATUS_CHANGED: "changed application status for",
    F2F_SCHEDULED: "scheduled F2F interview",
    TEAM_MEMBER_INVITED: "invited",
    INVITATION_ACCEPTED: "accepted invitation from",
    INVITATION_REVOKED: "revoked invitation for",
    MEMBER_ROLE_CHANGED: "changed role for",
    MEMBER_DEACTIVATED: "deactivated",
    MEMBER_ACTIVATED: "activated",
    COMPANY_CREATED: "created company",
    COMPANY_UPDATED: "updated company settings",
  };
  return map[action] || action.toLowerCase().replace(/_/g, " ");
}