"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProctoringReport } from "@/components/shared/ProctoringReport";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Loader2,
  User,
  Mail,
  FileSearch,
  Code,
  Bot,
  Video,
  Award,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  FileText,
  MessageSquare,
  HelpCircle,
  Shield,
} from "lucide-react";
import { formatDateTime, formatRelativeTime } from "@/lib/utils";
import Link from "next/link";

export default function CandidateDetailPage() {
  const { id } = useParams();
  const { isHR, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isHR) router.push("/login");
  }, [authLoading, isHR, router]);

  useEffect(() => {
    if (isHR) fetchResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHR, id]);

  const fetchResults = async () => {
    try {
      const res = await fetch(`/api/candidates/${id}/results`);
      const d = await res.json();
      setData(d);
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

  if (!data?.application) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Not found</p>
      </div>
    );
  }

  const { application, submissions, interviews, f2fInterviews, rating } =
    data;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto h-12 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-semibold text-slate-800">
            Candidate Details
          </span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#0245EF] to-[#5B3FE6] flex items-center justify-center">
                  <span className="text-xl font-bold text-white">
                    {application.candidate.firstName?.[0]}
                    {application.candidate.lastName?.[0]}
                  </span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-800">
                    {application.candidate.firstName}{" "}
                    {application.candidate.lastName}
                  </h1>
                  <p className="text-sm text-slate-500 flex items-center gap-1">
                    <Mail className="w-4 h-4" />{" "}
                    {application.candidate.email}
                  </p>
                  <p className="text-md text-emerald-700 mt-1">
                    Applied for{" "}
                    <strong>{application.jobTitle}</strong> •{" "}
                    {formatRelativeTime(application.appliedAt)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <Badge
                  className={
                    application.status === "OFFERED"
                      ? "bg-emerald-100 text-emerald-700"
                      : application.status === "REJECTED"
                        ? "bg-red-100 text-red-700"
                        : "bg-[#EBF0FF] text-[#0245EF]"
                  }
                >
                  {application.status}
                </Badge>
                {rating && (
                  <div className="mt-2">
                    <p
                      className={`text-3xl font-bold ${
                        rating.overallScore >= 70
                          ? "text-emerald-600"
                          : rating.overallScore >= 40
                            ? "text-amber-600"
                            : "text-red-500"
                      }`}
                    >
                      {Math.round(rating.overallScore)}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Overall Score
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Score Overview */}
        <div className="grid grid-cols-4 gap-4">
          <ScoreCard
            label="Resume"
            score={application.resumeScore}
            icon={FileSearch}
          />
          <ScoreCard
            label="Assessment"
            score={submissions[0]?.percentage || 0}
            icon={Code}
          />
          <ScoreCard
            label="AI Interview"
            score={interviews[0]?.overallScore || 0}
            icon={Bot}
          />
          <ScoreCard
            label="F2F Interview"
            score={f2fInterviews[0]?.feedback_score || 0}
            icon={Video}
          />
        </div>

        {/* Detailed Tabs */}
        <Tabs defaultValue="resume">
          <TabsList className="bg-white border">
            <TabsTrigger value="resume" className="mr-6">
              📄 Resume
            </TabsTrigger>
            <TabsTrigger value="assessment" className="mr-6">
              💻 Assessment
            </TabsTrigger>
            <TabsTrigger value="interview" className="mr-6">
              🤖 AI Interview
            </TabsTrigger>
            <TabsTrigger value="f2f" className="mr-6">
              📅 F2F
            </TabsTrigger>
          </TabsList>

          {/* Resume Tab */}
          <TabsContent value="resume">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileSearch className="w-5 h-5 text-[#0245EF]" />{" "}
                  Resume Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p
                      className={`text-3xl font-bold ${
                        application.resumeScore >= 70
                          ? "text-emerald-600"
                          : application.resumeScore >= 40
                            ? "text-amber-600"
                            : "text-red-500"
                      }`}
                    >
                      {Math.round(application.resumeScore)}%
                    </p>
                    <p className="text-xs text-slate-400">
                      Match Score
                    </p>
                  </div>
                  {application.resumeParsed?.matchedSkills && (
                    <div className="flex-1">
                      <p className="text-xs text-slate-500 mb-1">
                        Matched Skills
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {application.resumeParsed.matchedSkills.map(
                          (s: string) => (
                            <Badge
                              key={s}
                              className="bg-emerald-100 text-emerald-700 text-[10px]"
                            >
                              {s}
                            </Badge>
                          )
                        )}
                      </div>
                      {application.resumeParsed.missingSkills
                        ?.length > 0 && (
                        <>
                          <p className="text-xs text-slate-500 mb-1 mt-2">
                            Missing Skills
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {application.resumeParsed.missingSkills.map(
                              (s: string) => (
                                <Badge
                                  key={s}
                                  variant="outline"
                                  className="text-red-600 text-[10px]"
                                >
                                  {s}
                                </Badge>
                              )
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
                {application.resumeText && (
                  <div className="bg-slate-50 rounded-lg p-4 max-h-[400px] overflow-y-auto">
                    <p className="text-xs text-slate-500 mb-2 font-semibold">
                      Resume Text
                    </p>
                    <pre className="text-xs text-slate-600 whitespace-pre-wrap font-sans">
                      {application.resumeText}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Assessment Tab — with Proctoring Report */}
          <TabsContent value="assessment">
            {submissions.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-slate-400">
                  No assessments taken yet
                </CardContent>
              </Card>
            ) : (
              submissions.map((sub: any) => (
                <div key={sub.id} className="mb-6">
                  {/* Assessment Results Card */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Code className="w-5 h-5 text-[#0245EF]" />{" "}
                          Assessment Results
                        </span>
                        <div className="flex items-center gap-3">
                          <Badge
                            className={
                              sub.percentage >= 70
                                ? "bg-emerald-100 text-emerald-700"
                                : sub.percentage >= 40
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-red-100 text-red-700"
                            }
                          >
                            {Math.round(sub.percentage)}% (
                            {sub.totalScore}/{sub.maxScore})
                          </Badge>
                          <span className="text-xs text-slate-400">
                            {sub.timeTaken
                              ? `${Math.floor(sub.timeTaken / 60)}m ${sub.timeTaken % 60}s`
                              : ""}
                          </span>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {(sub.answers || []).map(
                        (answer: any, i: number) => (
                          <div
                            key={i}
                            className="border rounded-lg overflow-hidden"
                          >
                            {/* Question Header */}
                            <div
                              className={`flex items-center justify-between p-3 ${
                                answer.score > 0
                                  ? "bg-emerald-50"
                                  : "bg-red-50"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {answer.score > 0 ? (
                                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-red-500" />
                                )}
                                <span className="text-sm font-medium text-slate-700">
                                  Q{i + 1}: {answer.questionTitle}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="text-[10px]"
                                >
                                  {answer.type === "mcq" ? (
                                    <span className="flex items-center gap-0.5">
                                      <HelpCircle className="w-3 h-3" />{" "}
                                      MCQ
                                    </span>
                                  ) : (
                                    answer.type
                                  )}
                                </Badge>
                              </div>
                              <span
                                className={`text-sm font-bold ${
                                  answer.score > 0
                                    ? "text-emerald-600"
                                    : "text-red-500"
                                }`}
                              >
                                {answer.score}/{answer.maxScore}
                              </span>
                            </div>

                            <div className="p-3 space-y-2">
                              {/* CODING ANSWER */}
                              {answer.type === "coding" &&
                                answer.code && (
                                  <div>
                                    <p className="text-xs text-slate-500 mb-1">
                                      Code (
                                      {answer.language ||
                                        "javascript"}
                                      )
                                    </p>
                                    <pre className="text-xs bg-slate-900 text-slate-300 p-3 rounded-lg overflow-x-auto max-h-[300px]">
                                      {answer.code}
                                    </pre>
                                    {answer.grading
                                      ?.testResults && (
                                      <div className="mt-2 space-y-1">
                                        <p className="text-xs text-slate-500">
                                          Tests:{" "}
                                          {
                                            answer.grading
                                              .passedCount
                                          }
                                          /
                                          {
                                            answer.grading
                                              .totalTests
                                          }{" "}
                                          passed
                                        </p>
                                        {answer.grading.testResults.map(
                                          (
                                            tr: any,
                                            ti: number
                                          ) => (
                                            <div
                                              key={ti}
                                              className={`text-[10px] px-2 py-1 rounded flex items-center gap-2 ${
                                                tr.passed
                                                  ? "bg-emerald-50 text-emerald-700"
                                                  : "bg-red-50 text-red-600"
                                              }`}
                                            >
                                              {tr.passed ? (
                                                <CheckCircle className="w-3 h-3" />
                                              ) : (
                                                <XCircle className="w-3 h-3" />
                                              )}
                                              Test{" "}
                                              {ti + 1}
                                              {tr.isHidden ===
                                                false &&
                                                ` — Input: ${tr.input}`}
                                              {!tr.passed &&
                                                tr.error && (
                                                  <span className="ml-2 text-red-500">
                                                    {
                                                      tr.error
                                                    }
                                                  </span>
                                                )}
                                            </div>
                                          )
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}

                              {/* MCQ ANSWER */}
                              {answer.type === "mcq" && (
                                <div className="space-y-2">
                                  {answer.questionDescription && (
                                    <p className="text-xs text-slate-500 whitespace-pre-line">
                                      {
                                        answer.questionDescription
                                      }
                                    </p>
                                  )}

                                  {answer.grading?.options ? (
                                    <div className="space-y-1.5">
                                      {answer.grading.options.map(
                                        (opt: any) => {
                                          const isSelected =
                                            answer.grading
                                              ?.selected ===
                                            opt.id;
                                          const isCorrect =
                                            answer.grading
                                              ?.correctAnswer ===
                                            opt.id;

                                          return (
                                            <div
                                              key={opt.id}
                                              className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs ${
                                                isCorrect &&
                                                isSelected
                                                  ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                                                  : isCorrect
                                                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                                    : isSelected &&
                                                        !isCorrect
                                                      ? "bg-red-50 border-red-300 text-red-700"
                                                      : "bg-white border-slate-200 text-slate-600"
                                              }`}
                                            >
                                              <span
                                                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                                  isCorrect
                                                    ? "bg-emerald-500 text-white"
                                                    : isSelected
                                                      ? "bg-red-500 text-white"
                                                      : "bg-slate-200 text-slate-500"
                                                }`}
                                              >
                                                {opt.id.toUpperCase()}
                                              </span>
                                              <span className="flex-1">
                                                {opt.text}
                                              </span>
                                              {isCorrect && (
                                                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                                              )}
                                              {isSelected &&
                                                !isCorrect && (
                                                  <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                                                )}
                                              {isSelected && (
                                                <Badge
                                                  variant="outline"
                                                  className={`text-[9px] h-4 ${
                                                    isCorrect
                                                      ? "text-emerald-600 border-emerald-300"
                                                      : "text-red-600 border-red-300"
                                                  }`}
                                                >
                                                  Selected
                                                </Badge>
                                              )}
                                            </div>
                                          );
                                        }
                                      )}
                                    </div>
                                  ) : (
                                    <div className="space-y-1.5">
                                      <div
                                        className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs ${
                                          answer.grading?.correct
                                            ? "bg-emerald-50 border-emerald-200"
                                            : "bg-red-50 border-red-200"
                                        }`}
                                      >
                                        {answer.grading
                                          ?.correct ? (
                                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                                        ) : (
                                          <XCircle className="w-4 h-4 text-red-500" />
                                        )}
                                        <span>
                                          Selected:{" "}
                                          <strong>
                                            {answer.grading?.selected?.toUpperCase() ||
                                              answer.selectedOption?.toUpperCase() ||
                                              "None"}
                                          </strong>
                                        </span>
                                        {!answer.grading
                                          ?.correct &&
                                          answer.grading
                                            ?.correctAnswer && (
                                            <span className="text-slate-400 ml-2">
                                              Correct:{" "}
                                              <strong className="text-emerald-600">
                                                {answer.grading.correctAnswer.toUpperCase()}
                                              </strong>
                                            </span>
                                          )}
                                      </div>
                                    </div>
                                  )}

                                  {answer.grading
                                    ?.explanation && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 text-xs text-blue-700">
                                      <span className="font-semibold">
                                        💡 Explanation:
                                      </span>{" "}
                                      {
                                        answer.grading
                                          .explanation
                                      }
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      )}
                    </CardContent>
                  </Card>

                  {/* ✅ PROCTORING REPORT — shown below each submission */}
                  <ProctoringReport submissionId={sub.id} />
                </div>
              ))
            )}
          </TabsContent>

          {/* AI Interview Tab */}
          <TabsContent value="interview">
            {interviews.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-slate-400">
                  No AI interviews completed yet
                </CardContent>
              </Card>
            ) : (
              interviews.map((interview: any) => (
                <Card key={interview.id} className="mb-4">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Bot className="w-5 h-5 text-[#0245EF]" />{" "}
                        AI {interview.type} Interview
                      </span>
                      <Badge
                        className={
                          interview.overallScore >= 70
                            ? "bg-emerald-100 text-emerald-700"
                            : interview.overallScore >= 40
                              ? "bg-amber-100 text-amber-700"
                              : "bg-red-100 text-red-700"
                        }
                      >
                        {Math.round(interview.overallScore)}/100
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        {
                          label: "Overall",
                          score: interview.overallScore,
                        },
                        {
                          label: "Technical",
                          score:
                            interview.scoreBreakdown
                              ?.technicalScore,
                        },
                        {
                          label: "Communication",
                          score:
                            interview.scoreBreakdown
                              ?.communicationScore,
                        },
                        {
                          label: "Problem Solving",
                          score:
                            interview.scoreBreakdown
                              ?.problemSolvingScore,
                        },
                      ].map((s) => (
                        <div
                          key={s.label}
                          className="bg-slate-50 rounded-lg p-3 text-center"
                        >
                          <p
                            className={`text-xl font-bold ${
                              (s.score || 0) >= 70
                                ? "text-emerald-600"
                                : (s.score || 0) >= 40
                                  ? "text-amber-600"
                                  : "text-red-500"
                            }`}
                          >
                            {s.score || 0}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {s.label}
                          </p>
                        </div>
                      ))}
                    </div>

                    {interview.analysis && (
                      <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-xs font-semibold text-slate-600 mb-1">
                          Analysis
                        </p>
                        <p className="text-xs text-slate-500">
                          {interview.analysis}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      {interview.strengths?.length > 0 && (
                        <div className="bg-emerald-50 rounded-lg p-3">
                          <p className="text-xs font-semibold text-emerald-700 mb-1">
                            💪 Strengths
                          </p>
                          <ul className="space-y-0.5">
                            {interview.strengths.map(
                              (s: string, i: number) => (
                                <li
                                  key={i}
                                  className="text-[11px] text-slate-600"
                                >
                                  • {s}
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      )}
                      {interview.weaknesses?.length > 0 && (
                        <div className="bg-red-50 rounded-lg p-3">
                          <p className="text-xs font-semibold text-red-700 mb-1">
                            📈 Improve
                          </p>
                          <ul className="space-y-0.5">
                            {interview.weaknesses.map(
                              (w: string, i: number) => (
                                <li
                                  key={i}
                                  className="text-[11px] text-slate-600"
                                >
                                  • {w}
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Transcript */}
                    <div>
                      <p className="text-xs font-semibold text-slate-600 mb-2">
                        📝 Full Transcript
                      </p>
                      <div className="space-y-3 max-h-[500px] overflow-y-auto bg-slate-50 rounded-lg p-4">
                        {(interview.messages || []).map(
                          (msg: any, i: number) => (
                            <div
                              key={i}
                              className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                            >
                              <div
                                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                                  msg.role === "assistant"
                                    ? "bg-[#EBF0FF]"
                                    : "bg-emerald-100"
                                }`}
                              >
                                {msg.role === "assistant" ? (
                                  <Bot className="w-4 h-4 text-[#0245EF]" />
                                ) : (
                                  <User className="w-4 h-4 text-emerald-600" />
                                )}
                              </div>
                              <div
                                className={`max-w-[80%] ${msg.role === "user" ? "text-right" : ""}`}
                              >
                                <div
                                  className={`inline-block rounded-xl px-3 py-2 text-xs ${
                                    msg.role === "assistant"
                                      ? "bg-white border text-slate-700"
                                      : "bg-[#0245EF] text-white"
                                  }`}
                                >
                                  <p className="whitespace-pre-wrap">
                                    {msg.content}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* F2F Tab */}
          <TabsContent value="f2f">
            {f2fInterviews.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-slate-400">
                  No F2F interviews yet
                </CardContent>
              </Card>
            ) : (
              f2fInterviews.map((f2f: any) => (
                <Card key={f2f.id} className="mb-4">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Video className="w-5 h-5 text-[#0245EF]" />{" "}
                        {f2f.interview_type} Interview
                      </span>
                      <Badge variant="outline">
                        {f2f.status}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xs text-slate-500">
                      {formatDateTime(f2f.scheduled_at)} •{" "}
                      {f2f.duration} min
                    </p>
                    {f2f.feedback_score && (
                      <div className="grid grid-cols-5 gap-6">
                        {[
                          {
                            label: "Technical",
                            score: f2f.technical_score,
                          },
                          {
                            label: "Communication",
                            score: f2f.communication_score,
                          },
                          {
                            label: "Problem Solving",
                            score:
                              f2f.problem_solving_score,
                          },
                          {
                            label: "Culture Fit",
                            score: f2f.culture_fit_score,
                          },
                          {
                            label: "Overall",
                            score: f2f.feedback_score,
                          },
                        ].map((s) => (
                          <div
                            key={s.label}
                            className="bg-slate-50 rounded p-2 text-center"
                          >
                            <p className="text-lg font-bold text-slate-700">
                              {s.score || 0}
                            </p>
                            <p className="text-[9px] text-slate-400">
                              {s.label}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                    {f2f.recommendation && (
                      <p className="text-xs text-slate-600">
                        Recommendation:{" "}
                        <strong>{f2f.recommendation}</strong>
                      </p>
                    )}
                    {f2f.feedback_strengths && (
                      <p className="text-xs text-emerald-600">
                        💪 {f2f.feedback_strengths}
                      </p>
                    )}
                    {f2f.concerns && (
                      <p className="text-xs text-amber-600">
                        ⚠️ {f2f.concerns}
                      </p>
                    )}
                    {f2f.feedback_notes && (
                      <p className="text-xs text-slate-500">
                        📝 {f2f.feedback_notes}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function ScoreCard({
  label,
  score,
  icon: Icon,
}: {
  label: string;
  score: number;
  icon: any;
}) {
  return (
    <Card>
      <CardContent className="p-4 text-center">
        <Icon
          className={`w-5 h-5 mx-auto mb-1 ${
            score >= 70
              ? "text-emerald-500"
              : score >= 40
                ? "text-amber-500"
                : score > 0
                  ? "text-red-500"
                  : "text-slate-300"
          }`}
        />
        <p
          className={`text-2xl font-bold ${
            score >= 70
              ? "text-emerald-600"
              : score >= 40
                ? "text-amber-600"
                : score > 0
                  ? "text-red-500"
                  : "text-slate-300"
          }`}
        >
          {score > 0 ? `${Math.round(score)}%` : "—"}
        </p>
        <p className="text-[10px] text-slate-400">{label}</p>
      </CardContent>
    </Card>
  );
}