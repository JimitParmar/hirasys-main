"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft, Loader2, Users, Mail, Briefcase, Star,
  ChevronRight, FileText,
} from "lucide-react";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import Link from "next/link";
import toast from "react-hot-toast";

export default function HRJobDetailPage() {
  const { id } = useParams();
  const { isHR, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [job, setJob] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isHR) router.push("/login");
  }, [authLoading, isHR, router]);

  useEffect(() => {
    if (isHR) fetchData();
  }, [isHR, id]);

  // Inside the header, after the existing badge, add pipeline info
// This goes inside fetchData, add pipeline fetch:

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
    try {
      await fetch(`/api/applications/${appId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      toast.success(`Status updated to ${newStatus}`);
      fetchData();
    } catch {
      toast.error("Failed to update");
    }
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

  // Sort by resume score descending
  const sorted = [...applications].sort(
    (a, b) => (b.resumeScore || 0) - (a.resumeScore || 0)
  );
  

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/hr/dashboard">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="font-semibold text-sm text-slate-800">{job.title}</h1>
            <p className="text-[11px] text-slate-400">
              {job.department} • {applications.length} applicants
            </p>
          </div>
          <div className="flex-1" />
          <Badge
            variant="outline"
            className={
              job.status === "PUBLISHED"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-slate-50 text-slate-500"
            }
          >
            {job.status}
          </Badge>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {applications.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-slate-600">No applications yet</h3>
            <p className="text-slate-400 mt-2">
              Candidates will appear here once they apply
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">
                Applications ({applications.length})
              </h2>
              <p className="text-sm text-slate-400">
                Sorted by resume match score
              </p>
            </div>

            {sorted.map((app, index) => (
              <Card
                key={app.id}
                className={`hover:shadow-md transition-all ${
                  index === 0 ? "border-indigo-200 bg-indigo-50/30" : ""
                }`}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      {/* Rank */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                        index === 0 ? "bg-amber-100 text-amber-700" :
                        index === 1 ? "bg-slate-200 text-slate-600" :
                        index === 2 ? "bg-orange-100 text-orange-700" :
                        "bg-slate-100 text-slate-500"
                      }`}>
                        {index < 3 ? ["🥇", "🥈", "🥉"][index] : `#${index + 1}`}
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

                    <div className="flex items-center gap-3">
                      {/* Resume Score */}
                      {app.resumeScore > 0 && (
                        <div className="text-center">
                          <div className={`text-2xl font-bold ${
                            app.resumeScore >= 70 ? "text-emerald-600" :
                            app.resumeScore >= 40 ? "text-amber-600" : "text-red-500"
                          }`}>
                            {Math.round(app.resumeScore)}
                          </div>
                          <div className="text-[10px] text-slate-400">Match %</div>
                        </div>
                      )}

                      {/* Status */}
                      <Badge
                        className={`${
                          app.status === "APPLIED" ? "bg-blue-100 text-blue-700" :
                          app.status === "SCREENING" ? "bg-indigo-100 text-indigo-700" :
                          app.status === "ASSESSMENT" ? "bg-purple-100 text-purple-700" :
                          app.status === "REJECTED" ? "bg-red-100 text-red-700" :
                          "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {app.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatus(app.id, "SCREENING")}
                      disabled={app.status !== "APPLIED"}
                      className="text-xs"
                    >
                      Move to Screening
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatus(app.id, "ASSESSMENT")}
                      disabled={!["APPLIED", "SCREENING"].includes(app.status)}
                      className="text-xs"
                    >
                      Send Assessment
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatus(app.id, "REJECTED")}
                      className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}