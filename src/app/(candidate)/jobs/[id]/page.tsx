"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ResumeUpload } from "@/components/shared/ResumeUpload";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Briefcase, MapPin, Clock, DollarSign, Building2, Users,
  ArrowLeft, Send, Loader2, CheckCircle, Sparkles, FileText,
  Calendar, Target,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";
import Link from "next/link";

export default function JobDetailPage() {
  const { user, isAuthenticated } = useAuth();
  const params = useParams();
  const router = useRouter();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [resumeScore, setResumeScore] = useState<number | null>(null);

  useEffect(() => {
    fetchJob();
  }, [params.id]);

  const fetchJob = async () => {
    try {
      const res = await fetch(`/api/jobs/${params.id}`);
      const data = await res.json();
      setJob(data.job);

      // Check if already applied
      if (isAuthenticated) {
        try {
          const appRes = await fetch(`/api/applications?jobId=${params.id}`);
          const appData = await appRes.json();
          if (appData.applications?.length > 0) {
            setApplied(true);
            setResumeScore(appData.applications[0].resumeScore);
          }
        } catch {}
      }
    } catch (err) {
      console.error("Failed to fetch job:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    if (!resumeText.trim()) {
      toast.error("Please paste your resume");
      return;
    }

    setApplying(true);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: params.id,
          coverLetter,
          resumeText,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setApplied(true);
      setShowApplyForm(false);

      const score = data.application?.resumeScore;
      setResumeScore(score);

      toast.success("Application submitted! 🎉");

      if (score) {
        setTimeout(() => {
          toast(
            `Resume Match: ${Math.round(score)}%`,
            {
              icon: score >= 70 ? "🟢" : score >= 40 ? "🟡" : "🔴",
              duration: 5000,
            }
          );
        }, 1000);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to apply");
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#0245EF]" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Briefcase className="w-16 h-16 text-slate-200 mb-4" />
        <p className="text-slate-500 text-lg">Job not found</p>
        <Link href="/jobs">
          <Button variant="outline" className="mt-4">Back to Jobs</Button>
        </Link>
      </div>
    );
  }

  const typeLabels: Record<string, string> = {
    full_time: "Full Time", part_time: "Part Time",
    contract: "Contract", internship: "Internship",
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/jobs">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-[#0245EF] to-[#5B3FE6] rounded flex items-center justify-center">
              <Briefcase className="w-3 h-3 text-white" />
            </div>
            <span className="font-semibold text-slate-800 text-sm">Hirasys</span>
          </div>
          <div className="flex-1" />
          {isAuthenticated && (
            <Link href="/applications">
              <Button variant="ghost" size="sm" className="text-sm">My Applications</Button>
            </Link>
          )}
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Job Header */}
            <div>
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <Badge className="bg-[#D1DEFF] text-[#0237BF]">
                  {typeLabels[job.type] || job.type}
                </Badge>
                <span className="text-sm text-slate-400">
                  Posted {formatDate(job.createdAt)}
                </span>
              </div>

              <h1 className="text-3xl font-bold text-slate-800 mb-3">
                {job.title}
              </h1>

              <div className="flex items-center gap-5 text-slate-500 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4" />
                  {job.poster?.company || "Company"}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  {job.location}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  {job.experienceMin}-{job.experienceMax} years
                </span>
                {job.salaryMin && (
                  <span className="flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4" />
                    {job.salaryCurrency} {(job.salaryMin / 1000).toFixed(0)}K
                    {job.salaryMax && `–${(job.salaryMax / 1000).toFixed(0)}K`}
                  </span>
                )}
              </div>
            </div>

            <Separator />

            {/* Description */}
            <div>
              <h2 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#0245EF]" />
                About the Role
              </h2>
              <div className="prose prose-slate prose-sm max-w-none whitespace-pre-line text-slate-600 leading-relaxed">
                {job.description}
              </div>
            </div>

            {/* Requirements */}
            {job.requirements?.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <Target className="w-5 h-5 text-[#0245EF]" />
                  Requirements
                </h2>
                <ul className="space-y-2.5">
                  {job.requirements.map((req: string, i: number) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                      <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Skills */}
            {job.skills?.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#0245EF]" />
                  Skills Required
                </h2>
                <div className="flex flex-wrap gap-2">
                  {job.skills.map((skill: string) => (
                    <Badge
                      key={skill}
                      variant="outline"
                      className="px-3 py-1 bg-[#EBF0FF] text-[#0237BF] border-[#A3BDFF] text-sm"
                    >
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar — Apply Card */}
          <div>
            <Card className="sticky top-20 shadow-lg border-0">
              <CardContent className="p-6">
                {applied ? (
                  <div className="text-center py-6">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-emerald-500" />
                    </div>
                    <h3 className="font-semibold text-lg text-slate-800">Applied!</h3>
                    <p className="text-sm text-slate-500 mt-2">
                      Your application has been submitted successfully.
                    </p>

                    {resumeScore !== null && (
                      <div className="mt-4 bg-slate-50 rounded-xl p-4">
                        <p className="text-xs text-slate-500 mb-2">Resume Match Score</p>
                        <div className="flex items-center justify-center gap-3">
                          <div className="relative w-16 h-16">
                            <svg className="w-16 h-16 -rotate-90">
                              <circle cx="32" cy="32" r="28" stroke="#E2E8F0" strokeWidth="4" fill="none" />
                              <circle
                                cx="32" cy="32" r="28"
                                stroke={resumeScore >= 70 ? "#10B981" : resumeScore >= 40 ? "#F59E0B" : "#EF4444"}
                                strokeWidth="4"
                                fill="none"
                                strokeDasharray={`${(resumeScore / 100) * 176} 176`}
                                strokeLinecap="round"
                              />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-slate-700">
                              {Math.round(resumeScore)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    <Link href="/applications" className="block mt-4">
                      <Button variant="outline" className="w-full">
                        Track Application →
                      </Button>
                    </Link>
                  </div>
                ) : showApplyForm ? (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-800 text-lg">Apply Now</h3>

                    <ResumeUpload
  value={resumeText}
  onChange={(text) => setResumeText(text)}
/>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Cover Letter
                        <span className="text-slate-400 font-normal ml-1">(optional)</span>
                      </Label>
                      <Textarea
                        value={coverLetter}
                        onChange={(e) => setCoverLetter(e.target.value)}
                        placeholder="Why are you interested in this role?"
                        rows={4}
                        className="text-sm"
                      />
                    </div>

                    <div className="bg-[#EBF0FF] rounded-lg p-3">
                      <p className="text-xs text-[#0245EF] flex items-start gap-2">
                        <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>
                          Your resume will be AI-analyzed against this job&apos;s requirements.
                          You&apos;ll get a match score and personalized feedback.
                        </span>
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setShowApplyForm(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        className="flex-1 bg-[#0245EF] hover:bg-[#0237BF]"
                        onClick={handleApply}
                        disabled={applying || !resumeText.trim()}
                      >
                        {applying ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-2" />
                            Submit Application
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Button
                      className="w-full h-12 bg-[#0245EF] hover:bg-[#0237BF] text-base font-semibold shadow-md"
                      onClick={() => {
                        if (!isAuthenticated) {
                          toast("Please sign in to apply", { icon: "👤" });
                          router.push("/login");
                          return;
                        }
                        setShowApplyForm(true);
                      }}
                    >
                      <Send className="w-5 h-5 mr-2" />
                      Apply Now
                    </Button>

                    <p className="text-xs text-center text-slate-400">
                      Takes ~2 minutes • Get instant AI feedback
                    </p>

                    <Separator />

                    <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-3 text-slate-500">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span>{job._count?.applications || 0} people applied</span>
                      </div>
                      {job.closingDate && (
                        <div className="flex items-center gap-3 text-slate-500">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span>Closes {formatDate(job.closingDate)}</span>
                        </div>
                      )}
                    </div>

                    {job.salaryMin && (
                      <>
                        <Separator />
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="w-4 h-4 text-emerald-500" />
                          <span className="font-medium text-slate-700">
                            {job.salaryCurrency} {(job.salaryMin / 1000).toFixed(0)}K
                            {job.salaryMax && ` – ${(job.salaryMax / 1000).toFixed(0)}K`}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}