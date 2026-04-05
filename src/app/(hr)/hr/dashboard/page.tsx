"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase, Users, GitBranch, Plus, LogOut, Eye, Loader2,
  ArrowRight, Pencil, Trash2, MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import toast from "react-hot-toast";
import Link from "next/link";

export default function HRDashboard() {
  const { user, isLoading, isAuthenticated, isHR, logout } = useAuth();
  const router = useRouter();
  const [jobs, setJobs] = useState<any[]>([]);
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !isHR)) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, isHR, router]);

  useEffect(() => {
    if (isAuthenticated && isHR) {
      fetchData();
    }
  }, [isAuthenticated, isHR]);

  const fetchData = async () => {
    try {
      const [jobsRes, pipelineRes] = await Promise.all([
        fetch("/api/jobs"),
        fetch("/api/pipeline"),
      ]);

      const jobsData = await jobsRes.json();
      const pipelineData = await pipelineRes.json();

      setJobs(jobsData.jobs || []);
      setPipelines(pipelineData.pipelines || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleJobStatus = async (jobId: string, currentStatus: string) => {
    const newStatus = currentStatus === "PUBLISHED" ? "CLOSED" : "PUBLISHED";
    try {
      await fetch(`/api/jobs/${jobId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      toast.success(`Job ${newStatus === "PUBLISHED" ? "published" : "closed"}`);
      fetchData();
    } catch {
      toast.error("Failed to update");
    }
  };

  const totalApps = jobs.reduce(
    (sum, j) => sum + (j._count?.applications || 0), 0
  );

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg text-slate-800">Hirasys</span>
            <Badge variant="secondary" className="text-xs">HR</Badge>
          </div>

          <nav className="flex items-center gap-1">
            <Link href="/hr/dashboard">
              <Button variant="ghost" size="sm" className="text-indigo-600 bg-indigo-50">
                Dashboard
              </Button>
            </Link>
            <Link href="/hr/jobs/new">
              <Button variant="ghost" size="sm">Post Job</Button>
            </Link>
            <Link href="/pipeline">
              <Button variant="ghost" size="sm">Pipeline Builder</Button>
            </Link>
            <div className="h-6 w-px bg-slate-200 mx-2" />
            <span className="text-sm text-slate-500">{user?.firstName}</span>
            <Button variant="ghost" size="icon" onClick={logout} className="h-8 w-8">
              <LogOut className="w-4 h-4" />
            </Button>
          </nav>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Welcome back, {user?.firstName} 👋
            </h1>
            <p className="text-slate-500 mt-1">
              {user?.company ? `${user.company} — ` : ""}Manage your hiring
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/pipeline">
              <Button variant="outline">
                <GitBranch className="w-4 h-4 mr-2" /> New Pipeline
              </Button>
            </Link>
            <Link href="/hr/jobs/new">
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-2" /> Post Job
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{jobs.length}</p>
                <p className="text-sm text-slate-500">Jobs Posted</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{totalApps}</p>
                <p className="text-sm text-slate-500">Total Applications</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <GitBranch className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{pipelines.length}</p>
                <p className="text-sm text-slate-500">Pipelines</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Jobs */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-lg">Job Postings</CardTitle>
              <Link href="/hr/jobs/new">
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-1" /> New
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {jobs.length === 0 ? (
                <div className="text-center py-8">
                  <Briefcase className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">No jobs yet</p>
                  <Link href="/hr/jobs/new">
                    <Button size="sm" className="mt-3 bg-indigo-600 hover:bg-indigo-700">
                      Post First Job
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {jobs.map((job) => (
                    <div
                      key={job.id}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-sm text-slate-800 truncate">
                          {job.title}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {job.department} • {job.location} •{" "}
                          <span className="font-medium text-indigo-600">
                            {job._count?.applications || 0} applicants
                          </span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            job.status === "PUBLISHED"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : job.status === "DRAFT"
                                ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                                : "bg-slate-50 text-slate-500"
                          }`}
                        >
                          {job.status}
                        </Badge>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => router.push(`/hr/jobs/${job.id}`)}
                            >
                              <Eye className="w-4 h-4 mr-2" /> View Applications
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => toggleJobStatus(job.id, job.status)}
                            >
                              {job.status === "PUBLISHED" ? "Close Job" : "Publish Job"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pipelines */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-lg">Pipelines</CardTitle>
              <Link href="/pipeline">
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-1" /> New
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {pipelines.length === 0 ? (
                <div className="text-center py-8">
                  <GitBranch className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">No pipelines yet</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Create a visual hiring pipeline
                  </p>
                  <Link href="/pipeline">
                    <Button size="sm" className="mt-3 bg-indigo-600 hover:bg-indigo-700">
                      Build Pipeline
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {pipelines.map((pipeline) => {
                    const nodeCount = Array.isArray(pipeline.nodes)
                      ? pipeline.nodes.length
                      : typeof pipeline.nodes === "string"
                        ? JSON.parse(pipeline.nodes || "[]").length
                        : 0;

                    return (
                      <div
                        key={pipeline.id}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-sm text-slate-800 truncate">
                            {pipeline.name}
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {nodeCount} nodes •{" "}
                            {pipeline.linked_job_title
                              ? `Linked to: ${pipeline.linked_job_title}`
                              : "Not linked to a job"
                            }
                            {" • "}
                            {formatRelativeTime(pipeline.updated_at || pipeline.created_at)}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          <Badge variant="outline" className="text-[10px]">
                            {pipeline.status}
                          </Badge>
                          <Link href={`/pipeline?id=${pipeline.id}`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Pencil className="w-4 h-4" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}