"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Loader2,
  ShieldCheck,
  User,
  Briefcase,
  GitBranch,
  FileText,
  Calendar,
  Bot,
  Users,
  Settings,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Download,
  Clock,
  Globe,
  Monitor,
  X,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import Link from "next/link";
import toast from "react-hot-toast";

const ACTION_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  JOB_CREATED: { icon: Briefcase, color: "text-emerald-600 bg-emerald-50", label: "Job Created" },
  JOB_UPDATED: { icon: Briefcase, color: "text-blue-600 bg-blue-50", label: "Job Updated" },
  JOB_PUBLISHED: { icon: Briefcase, color: "text-emerald-600 bg-emerald-50", label: "Job Published" },
  JOB_CLOSED: { icon: Briefcase, color: "text-slate-600 bg-slate-50", label: "Job Closed" },
  PIPELINE_CREATED: { icon: GitBranch, color: "text-purple-600 bg-purple-50", label: "Pipeline Created" },
  PIPELINE_UPDATED: { icon: GitBranch, color: "text-purple-600 bg-purple-50", label: "Pipeline Updated" },
  APPLICATION_STATUS_CHANGED: { icon: FileText, color: "text-amber-600 bg-amber-50", label: "Status Changed" },
  APPLICATION_REJECTED: { icon: FileText, color: "text-red-600 bg-red-50", label: "Rejected" },
  F2F_SCHEDULED: { icon: Calendar, color: "text-pink-600 bg-pink-50", label: "Interview Scheduled" },
  F2F_COMPLETED: { icon: Calendar, color: "text-emerald-600 bg-emerald-50", label: "Interview Completed" },
  F2F_CANCELLED: { icon: Calendar, color: "text-red-600 bg-red-50", label: "Interview Cancelled" },
  TEAM_MEMBER_INVITED: { icon: Users, color: "text-[#0245EF] bg-[#EBF0FF]", label: "Invited" },
  INVITATION_ACCEPTED: { icon: Users, color: "text-emerald-600 bg-emerald-50", label: "Invite Accepted" },
  INVITATION_REVOKED: { icon: Users, color: "text-red-600 bg-red-50", label: "Invite Revoked" },
  MEMBER_ROLE_CHANGED: { icon: ShieldCheck, color: "text-purple-600 bg-purple-50", label: "Role Changed" },
  MEMBER_DEACTIVATED: { icon: Users, color: "text-red-600 bg-red-50", label: "Deactivated" },
  MEMBER_ACTIVATED: { icon: Users, color: "text-emerald-600 bg-emerald-50", label: "Activated" },
  COMPANY_CREATED: { icon: Settings, color: "text-[#0245EF] bg-[#EBF0FF]", label: "Company Created" },
  COMPANY_UPDATED: { icon: Settings, color: "text-slate-600 bg-slate-50", label: "Settings Updated" },
  PLAN_UPGRADED: { icon: ShieldCheck, color: "text-emerald-600 bg-emerald-50", label: "Plan Upgraded" },
  PLAN_DOWNGRADED: { icon: ShieldCheck, color: "text-amber-600 bg-amber-50", label: "Plan Downgraded" },
};

const RESOURCE_ICONS: Record<string, any> = {
  job: Briefcase,
  pipeline: GitBranch,
  application: FileText,
  f2f_interview: Calendar,
  team: Users,
  company: Settings,
  billing: ShieldCheck,
  interview: Bot,
};

export default function AuditPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [filters, setFilters] = useState<any>({
    users: [],
    actions: [],
    resourceTypes: [],
  });

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [filterResource, setFilterResource] = useState("all");
  const [filterUser, setFilterUser] = useState("all");
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) {
      const role = (user as any)?.role;
      if (role !== "ADMIN" && role !== "HR") {
        router.push("/hr/dashboard");
      } else {
        fetchLogs();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, page, filterAction, filterResource, filterUser]);

  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "50");

      if (filterAction !== "all") params.set("action", filterAction);
      if (filterResource !== "all") params.set("resourceType", filterResource);
      if (filterUser !== "all") params.set("userId", filterUser);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/audit?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to load audit logs");
        return;
      }

      setLogs(data.logs || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 0);
      setFilters(data.filters || { users: [], actions: [], resourceTypes: [] });
    } catch (err) {
      console.error(err);
      toast.error("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, [page, filterAction, filterResource, filterUser, searchQuery]);

  const handleSearch = () => {
    setPage(1);
    fetchLogs();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchLogs();
    setRefreshing(false);
  };

  const clearFilters = () => {
    setFilterAction("all");
    setFilterResource("all");
    setFilterUser("all");
    setSearchQuery("");
    setPage(1);
  };

  const hasActiveFilters =
    filterAction !== "all" ||
    filterResource !== "all" ||
    filterUser !== "all" ||
    searchQuery.trim() !== "";

  const exportLogs = () => {
    const csv = [
      ["Time", "User", "Action", "Resource Type", "Resource", "Details"].join(","),
      ...logs.map((log) => {
        let details = log.details;
        try {
          if (typeof details === "string") details = JSON.parse(details);
        } catch {
          details = {};
        }
        return [
          new Date(log.created_at).toISOString(),
          `"${log.user_name || log.user_email || "System"}"`,
          log.action,
          log.resource_type || "",
          `"${log.resource_name || ""}"`,
          `"${JSON.stringify(details).replace(/"/g, '""')}"`,
        ].join(",");
      }),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported to CSV");
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#0245EF] mx-auto mb-3" />
          <p className="text-sm text-slate-400">Loading audit trail...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto h-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/hr/team">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <ShieldCheck className="w-5 h-5 text-[#0245EF]" />
            <span className="text-sm font-semibold text-slate-800">
              Audit Trail
            </span>
            <Badge variant="outline" className="text-[10px]">
              {total} events
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportLogs}
              disabled={logs.length === 0}
            >
              <Download className="w-4 h-4 mr-1" /> Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw
                className={`w-4 h-4 mr-1 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search by name, email, resource..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-9 h-9 text-sm"
                />
              </div>

              {/* Action filter */}
              <Select
                value={filterAction}
                onValueChange={(v) => {
                  setFilterAction(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[180px] h-9 text-xs">
                  <Filter className="w-3 h-3 mr-1" />
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {filters.actions.map((a: any) => (
                    <SelectItem key={a.action} value={a.action}>
                      {ACTION_CONFIG[a.action]?.label ||
                        a.action.replace(/_/g, " ").toLowerCase()}{" "}
                      ({a.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Resource type filter */}
              <Select
                value={filterResource}
                onValueChange={(v) => {
                  setFilterResource(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[160px] h-9 text-xs">
                  <SelectValue placeholder="All Resources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Resources</SelectItem>
                  {filters.resourceTypes.map((r: any) => (
                    <SelectItem key={r.type} value={r.type}>
                      {r.type} ({r.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* User filter */}
              <Select
                value={filterUser}
                onValueChange={(v) => {
                  setFilterUser(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[180px] h-9 text-xs">
                  <User className="w-3 h-3 mr-1" />
                  <SelectValue placeholder="All Users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {filters.users.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Search button */}
              <Button size="sm" onClick={handleSearch} className="h-9 bg-[#0245EF]">
                <Search className="w-4 h-4" />
              </Button>

              {/* Clear */}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-9 text-xs text-slate-500"
                >
                  <X className="w-3 h-3 mr-1" /> Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Logs */}
        <Card>
          <CardContent className="p-0">
            {logs.length === 0 ? (
              <div className="p-12 text-center">
                <ShieldCheck className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-slate-500 font-medium">
                  {hasActiveFilters
                    ? "No matching events found"
                    : "No activity logged yet"}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {hasActiveFilters
                    ? "Try adjusting your filters"
                    : "Actions like creating jobs, updating pipelines, and managing team members will appear here"}
                </p>
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                    className="mt-4"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {logs.map((log: any) => {
                  const config = ACTION_CONFIG[log.action] || {
                    icon: Settings,
                    color: "text-slate-600 bg-slate-50",
                    label: log.action,
                  };
                  const Icon = config.icon;
                  const ResourceIcon = RESOURCE_ICONS[log.resource_type] || FileText;

                  let details = log.details;
                  try {
                    if (typeof details === "string")
                      details = JSON.parse(details);
                  } catch {
                    details = {};
                  }

                  const isExpanded = expandedLog === log.id;
                  const hasDetails =
                    Object.keys(details).length > 0 ||
                    log.ip_address ||
                    log.user_agent;

                  return (
                    <div
                      key={log.id}
                      className={`transition-colors ${
                        isExpanded ? "bg-slate-50" : "hover:bg-slate-50/50"
                      }`}
                    >
                      <div
                        className="flex items-start gap-3 p-4 cursor-pointer"
                        onClick={() =>
                          setExpandedLog(isExpanded ? null : log.id)
                        }
                      >
                        {/* Icon */}
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${config.color}`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm text-slate-700">
                                <strong className="font-medium">
                                  {log.user_name ||
                                    log.user_email ||
                                    "System"}
                                </strong>{" "}
                                {formatAction(log.action)}
                                {log.resource_name && (
                                  <span className="font-medium text-[#0245EF]">
                                    {" "}
                                    &quot;{log.resource_name}&quot;
                                  </span>
                                )}
                              </p>

                              {/* Quick detail badges */}
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                {log.resource_type && (
                                  <Badge
                                    variant="outline"
                                    className="text-[9px] h-4 px-1.5 gap-0.5"
                                  >
                                    <ResourceIcon className="w-2.5 h-2.5" />
                                    {log.resource_type}
                                  </Badge>
                                )}
                                {Object.entries(details)
                                  .filter(
                                    ([key]) =>
                                      [
                                        "status",
                                        "from",
                                        "to",
                                        "role",
                                        "email",
                                        "oldStatus",
                                        "newStatus",
                                      ].includes(key)
                                  )
                                  .slice(0, 3)
                                  .map(([key, value]) => (
                                    <Badge
                                      key={key}
                                      variant="outline"
                                      className="text-[9px] h-4 px-1.5 font-mono"
                                    >
                                      {key}:{" "}
                                      {String(value).substring(0, 25)}
                                    </Badge>
                                  ))}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[10px] text-slate-400">
                                {formatRelativeTime(log.created_at)}
                              </span>
                              {hasDetails && (
                                <ChevronRight
                                  className={`w-3.5 h-3.5 text-slate-300 transition-transform ${
                                    isExpanded ? "rotate-90" : ""
                                  }`}
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && hasDetails && (
                        <div className="px-4 pb-4 ml-11">
                          <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
                            {/* Full details */}
                            {Object.keys(details).length > 0 && (
                              <div>
                                <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">
                                  Details
                                </p>
                                <div className="grid grid-cols-2 gap-1">
                                  {Object.entries(details).map(
                                    ([key, value]) => (
                                      <div
                                        key={key}
                                        className="flex items-start gap-1.5 text-xs"
                                      >
                                        <span className="text-slate-400 font-mono shrink-0">
                                          {key}:
                                        </span>
                                        <span className="text-slate-700 break-all">
                                          {typeof value === "object"
                                            ? JSON.stringify(value)
                                            : String(value)}
                                        </span>
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Metadata */}
                            <div className="flex items-center gap-4 pt-2 border-t border-slate-100">
                              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(log.created_at).toLocaleString()}
                              </span>
                              {log.ip_address && (
                                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                  <Globe className="w-3 h-3" />
                                  {log.ip_address}
                                </span>
                              )}
                              {log.user_agent && (
                                <span
                                  className="text-[10px] text-slate-400 flex items-center gap-1 truncate max-w-[300px]"
                                  title={log.user_agent}
                                >
                                  <Monitor className="w-3 h-3 shrink-0" />
                                  {log.user_agent.substring(0, 60)}...
                                </span>
                              )}
                              {log.user_email && (
                                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {log.user_email}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 flex items-center justify-between border-t border-slate-100">
                <p className="text-xs text-slate-400">
                  Showing {(page - 1) * 50 + 1}–
                  {Math.min(page * 50, total)} of {total}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="h-8"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from(
                      { length: Math.min(totalPages, 5) },
                      (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (page <= 3) {
                          pageNum = i + 1;
                        } else if (page >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = page - 2 + i;
                        }
                        return (
                          <Button
                            key={pageNum}
                            variant={
                              page === pageNum ? "default" : "outline"
                            }
                            size="sm"
                            onClick={() => setPage(pageNum)}
                            className={`h-8 w-8 p-0 ${
                              page === pageNum ? "bg-[#0245EF]" : ""
                            }`}
                          >
                            {pageNum}
                          </Button>
                        );
                      }
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                    className="h-8"
                  >
                    Next <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
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
    JOB_PUBLISHED: "published job",
    JOB_CLOSED: "closed job",
    PIPELINE_CREATED: "created pipeline",
    PIPELINE_UPDATED: "updated pipeline",
    APPLICATION_STATUS_CHANGED: "changed status for",
    APPLICATION_REJECTED: "rejected application for",
    F2F_SCHEDULED: "scheduled interview for",
    F2F_COMPLETED: "completed interview for",
    F2F_CANCELLED: "cancelled interview for",
    TEAM_MEMBER_INVITED: "invited team member",
    INVITATION_ACCEPTED: "accepted invitation",
    INVITATION_REVOKED: "revoked invitation for",
    MEMBER_ROLE_CHANGED: "changed role for",
    MEMBER_DEACTIVATED: "deactivated member",
    MEMBER_ACTIVATED: "activated member",
    COMPANY_CREATED: "created company",
    COMPANY_UPDATED: "updated company settings",
    PLAN_UPGRADED: "upgraded plan to",
    PLAN_DOWNGRADED: "downgraded plan to",
  };
  return map[action] || action.toLowerCase().replace(/_/g, " ");
}