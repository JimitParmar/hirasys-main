"use client";

import React, { useEffect, useState, useRef, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { formatRelativeTime, parseDBTimestamp } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Play,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Code,
  Terminal,
  FileText,
  AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";

// 1. Shared Loader Component
function AssessmentLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="text-center">
        <Loader2 className="w-10 h-10 animate-spin text-[#0245EF] mx-auto mb-4" />
        <p className="text-white text-lg font-medium">
          Preparing your assessment...
        </p>
        <p className="text-slate-400 text-sm mt-2">
          Setting up your environment.
        </p>
      </div>
    </div>
  );
}

// 2. The Core Application Logic
function AssessmentContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const applicationId = searchParams.get("applicationId");
  const assessmentId = params.id as string;

  // Core state
  const [assessment, setAssessment] = useState<any>(null);
  const [submission, setSubmission] = useState<any>(null);
  const submissionRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [language, setLanguage] = useState("javascript");
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);
  const [runningTests, setRunningTests] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [timeLeft, setTimeLeft] = useState(-1);
  const [isFinished, setIsFinished] = useState(false);
  const [activeTab, setActiveTab] = useState("output");
  const [questionsReady, setQuestionsReady] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const submitCalledRef = useRef(false);

  // Keep an up-to-date ref of answers for the interval timer
  const answersRef = useRef<Record<string, any>>({});
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const saveSubmission = (sub: any) => {
    setSubmission(sub);
    submissionRef.current = sub;
  };

  // Load assessment
  useEffect(() => {
    if (isAuthenticated && assessmentId) {
      loadAssessment();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, assessmentId]);

  // Timer
  useEffect(() => {
    if (!questionsReady || timeLeft <= 0 || isFinished) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          if (!submitCalledRef.current) {
            submitCalledRef.current = true;
            handleAutoSubmit();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionsReady, isFinished]);

  // Sync language when switching questions
  useEffect(() => {
    if (!assessment?.questions?.length) return;
    const question = assessment.questions[currentQuestionIndex];
    if (!question || question.type !== "coding") return;
    const answer = answers[question.title];
    if (answer?.language) {
      setLanguage(answer.language);
    }
  }, [currentQuestionIndex, assessment, answers]);

  const loadAssessment = async () => {
    try {
      const aRes = await fetch(
        `/api/assessments/from-pipeline?applicationId=${applicationId}&nodeSubtype=${assessmentId}`
      );
      const aData = await aRes.json();

      if (aData.error) {
        toast.error(aData.error);
        setLoading(false);
        return;
      }

      if (!aData.assessment?.questions?.length) {
        toast.error(
          "No questions available. Please contact the hiring team."
        );
        setLoading(false);
        return;
      }

      setAssessment(aData.assessment);

      const sRes = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          assessmentId: aData.assessment?.id || assessmentId,
          applicationId,
        }),
      });
      const sData = await sRes.json();

      if (
        sData.error === "Already submitted" ||
        sData.submission?.status === "GRADED"
      ) {
        setIsFinished(true);
        setLoading(false);
        return;
      }
      console.log("📥 START RESPONSE:", sData);

      if (!sData.submission) {
        console.error("❌ No submission returned");
        toast.error("Failed to start assessment");
        setLoading(false);
        return;
      }

      console.log("✅ Submission created:", sData.submission.id);
      saveSubmission(sData.submission);

      // --- ROBUST TIMER CALCULATION ---
      const durationSec = (aData.assessment?.duration || 60) * 60;
      let remaining = durationSec;

      if (sData.submission?.started_at) {
        const startedAt = parseDBTimestamp(
          sData.submission.started_at
        ).getTime();
        const now = Date.now();

        if (!isNaN(startedAt)) {
          let elapsed = Math.floor((now - startedAt) / 1000);

          // DYNAMIC TIMEZONE SKEW CORRECTOR
          if (elapsed > durationSec && elapsed > 1800) {
            const skewSeconds = Math.round(elapsed / 1800) * 1800;
            console.warn(
              `⚠️ DB Timezone Skew Detected: Off by ~${skewSeconds / 3600} hours. Auto-correcting.`
            );
            elapsed -= skewSeconds;
          } else if (elapsed < -1800) {
            const skewSeconds =
              Math.round(Math.abs(elapsed) / 1800) * 1800;
            console.warn(
              `⚠️ DB Timezone Skew Detected: Future offset by ~${skewSeconds / 3600} hours. Auto-correcting.`
            );
            elapsed += skewSeconds;
          }

          if (elapsed < 0) elapsed = 0;

          console.log("⏱️ Final Timer Debug:", {
            rawServerTime: sData.submission.started_at,
            clientNow: new Date(now).toLocaleString(),
            correctedElapsedSeconds: elapsed,
            remainingSeconds: Math.max(0, durationSec - elapsed),
          });

          if (elapsed >= durationSec) {
            remaining = 0;
          } else {
            remaining = durationSec - elapsed;
          }
        }
      }

      if (remaining <= 0) {
        toast.error("Time expired for this assessment.");
        setIsFinished(true);
        setLoading(false);
        return;
      }

      // Initialize answers
      const questions = aData.assessment.questions;
      const defaultLang = (aData.assessment?.languages || ["javascript"])[0];
      const initial: Record<string, any> = {};

      questions.forEach((q: any) => {
        if (q.type === "coding") {
          initial[q.title] = {
            questionId: q.id,
            questionTitle: q.title,
            code:
              q.starterCode?.[defaultLang] ||
              q.starterCode?.javascript ||
              "// Write your solution here\n",
            language: defaultLang,
            type: "coding",
          };
        } else if (q.type === "mcq") {
          initial[q.title] = {
            questionId: q.id,
            questionTitle: q.title,
            selectedOption: null,
            type: "mcq",
          };
        }
      });

      setAnswers(initial);
      setLanguage(defaultLang);

      // UPDATE started_at to NOW — timer starts when page is actually ready
      try {
        const resetRes = await fetch("/api/submissions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "reset_timer",
            submissionId: sData.submission.id,
          }),
        });
        const resetData = await resetRes.json();

        if (resetData.submission?.started_at) {
          const newStartedAt = new Date(
            String(resetData.submission.started_at).endsWith("Z")
              ? resetData.submission.started_at
              : resetData.submission.started_at + "Z"
          ).getTime();
          const newDurationMs =
            (aData.assessment?.duration || 60) * 60 * 1000;
          const newRemaining = Math.max(
            0,
            Math.floor((newDurationMs - (Date.now() - newStartedAt)) / 1000)
          );

          console.log("Timer reset! New remaining:", newRemaining, "seconds");
          setTimeLeft(newRemaining);
        } else {
          setTimeLeft(remaining);
        }
      } catch {
        setTimeLeft(remaining);
      }

      setQuestionsReady(true);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load assessment");
    } finally {
      setLoading(false);
    }
  };

  const handleAutoSubmit = async () => {
    const sub = submissionRef.current;
    if (!sub?.id || isFinished) return;

    const currentAnswers = answersRef.current;
    const hasContent = Object.values(currentAnswers).some(
      (a: any) =>
        (a.code && a.code.trim().length > 10) || a.selectedOption
    );

    if (!hasContent) {
      setIsFinished(true);
      toast.error("Time expired with no answers.");
      return;
    }

    toast("Time's up! Submitting...", { icon: "⏰" });
    await submitAnswers(sub.id, currentAnswers);
  };

  const handleSubmit = async () => {
    console.log("🟢 Submit button clicked");

    if (isFinished || submitting || submitCalledRef.current) {
      console.log("⛔ Submit blocked", {
        isFinished,
        submitting,
        submitCalledRef: submitCalledRef.current,
      });
      return;
    }

    const sub = submissionRef.current;
    console.log("📦 Current submissionRef:", sub);

    if (!sub?.id) {
      console.error("❌ No submission ID found");
      toast.error("Submission not initialized. Refresh page.");
      return;
    }

    await submitAnswers(sub.id, answersRef.current);
  };

  const submitAnswers = async (
    submissionId: string,
    finalAnswers: Record<string, any>
  ) => {
    if (submitting) {
      console.log("⛔ Already submitting, skipping...");
      return;
    }

    setSubmitting(true);
    submitCalledRef.current = true;

    const payload = {
      action: "submit",
      submissionId,
      answers: Object.values(finalAnswers),
      questions: assessment.questions,
    };

    console.log("🚀 SUBMIT PAYLOAD:", payload);

    try {
      console.log("🚀 SUBMIT PAYLOAD:", {
        submissionId,
        answers: Object.values(finalAnswers),
        questions: assessment?.questions?.length,
      });
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      console.log("🌐 API RESPONSE STATUS:", res.status);

      const data = await res.json();

      console.log("📩 API RESPONSE DATA:", data);

      if (!res.ok) {
        console.error("❌ API ERROR:", data);
        throw new Error(data.error || "Submit failed");
      }

      console.log("✅ Submission successful");

      setIsFinished(true);
      if (timerRef.current) clearInterval(timerRef.current);

      toast.success("Assessment submitted successfully! 🎉", {
        duration: 5000,
      });
    } catch (err: any) {
      console.error("❌ Submit failed:", err);
      toast.error(err.message || "Failed to submit");
      submitCalledRef.current = false;
    } finally {
      setSubmitting(false);
    }
  };

  const runCode = async () => {
    const question = assessment.questions[currentQuestionIndex];
    const answer = answersRef.current[question.title];
    if (!answer?.code) {
      toast.error("Write some code first");
      return;
    }

    setRunning(true);
    setOutput("");
    setActiveTab("output");

    try {
      const firstVisible = question.testCases?.find(
        (tc: any) => !tc.isHidden
      );
      const res = await fetch("/api/assessments/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: answer.code,
          language: answer.language || language,
          input: firstVisible?.input || "",
        }),
      });
      const result = await res.json();

      let text = "";
      if (result.stderr) {
        text = `❌ ERROR:\n${result.stderr}`;
      } else if (result.stdout) {
        text = `✅ Output:\n${result.stdout}`;
        if (firstVisible) {
          text += `\n\n📋 Expected:\n${firstVisible.expectedOutput}`;
          text +=
            normalizeOutput(result.stdout) ===
            normalizeOutput(firstVisible.expectedOutput)
              ? "\n\n✅ Matches!"
              : "\n\n⚠️ Does not match";
        }
      } else {
        text = "⚠️ No output. Make sure your function returns a value.";
      }
      if (result.version) text += `\n\n--- ${result.version} ---`;
      setOutput(text);
    } catch {
      setOutput("❌ Execution failed.");
    } finally {
      setRunning(false);
    }
  };

  const runTests = async () => {
    const question = assessment.questions[currentQuestionIndex];
    const answer = answersRef.current[question.title];
    if (!answer?.code) {
      toast.error("Write some code first");
      return;
    }

    setRunningTests(true);
    setTestResults([]);
    setActiveTab("tests");

    try {
      const results = [];
      for (const tc of question.testCases || []) {
        try {
          const res = await fetch("/api/assessments/execute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              code: answer.code,
              language: answer.language || language,
              input: tc.input,
            }),
          });
          const result = await res.json();
          const actual = result.stdout?.trim() || "";
          const expected = tc.expectedOutput?.trim() || "";
          const passed =
            normalizeOutput(actual) === normalizeOutput(expected) &&
            !result.stderr;
          results.push({
            id: tc.id,
            passed,
            input: tc.isHidden ? "[hidden]" : tc.input,
            expected: tc.isHidden ? "[hidden]" : expected,
            actual: tc.isHidden && !passed ? "[hidden]" : actual,
            error: result.stderr || null,
            isHidden: tc.isHidden,
            points: tc.points || 5,
          });
        } catch {
          results.push({
            id: tc.id,
            passed: false,
            input: tc.isHidden ? "[hidden]" : tc.input,
            expected: "[error]",
            actual: "",
            error: "Execution failed",
            isHidden: tc.isHidden,
            points: tc.points || 5,
          });
        }
      }
      setTestResults(results);
      const p = results.filter((r) => r.passed).length;
      const pts = results
        .filter((r) => r.passed)
        .reduce((s, r) => s + r.points, 0);
      const total = results.reduce((s, r) => s + r.points, 0);
      toast(`${p}/${results.length} passed (${pts}/${total} pts)`, {
        icon: p === results.length ? "🎉" : p > 0 ? "⚠️" : "❌",
        duration: 4000,
      });
    } catch {
      toast.error("Test failed");
    } finally {
      setRunningTests(false);
    }
  };

  const updateAnswer = (questionTitle: string, updates: any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionTitle]: { ...prev[questionTitle], ...updates },
    }));
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)
      .toString()
      .padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  if (loading) return <AssessmentLoader />;

  if (isFinished) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            Assessment Complete!
          </h2>
          <p className="text-slate-500 mb-4">
            Your answers have been submitted and will be reviewed by the hiring
            team.
          </p>
          <p className="text-xs text-slate-400 mb-6">
            You&apos;ll be notified about next steps through your application
            tracker.
          </p>
          <Button
            onClick={() => router.push("/applications")}
            className="bg-[#0245EF] hover:bg-[#0237BF]"
          >
            Back to Applications
          </Button>
        </div>
      </div>
    );
  }

  if (!assessment || !assessment.questions?.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <p className="text-lg">No questions available</p>
          <Button
            onClick={() => router.push("/applications")}
            variant="outline"
            className="mt-4"
          >
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const questions = assessment.questions;
  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = answers[currentQuestion?.title] || {};

  return (
    <div className="h-screen flex flex-col bg-slate-900 text-white">
      {/* Top Bar */}
      <div className="h-12 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <Code className="w-5 h-5 text-[#0245EF]" />
          <span className="font-semibold text-sm">{assessment.title}</span>
          <Badge
            variant="outline"
            className="text-[10px] border-slate-600 text-slate-300"
          >
            {questions.length} question{questions.length > 1 ? "s" : ""}
          </Badge>
        </div>
        <div className="flex items-center gap-4">
          {questionsReady && timeLeft > 0 ? (
            <div
              className={`flex items-center gap-2 px-3 py-1 rounded-lg font-mono text-sm font-bold ${
                timeLeft < 300
                  ? "bg-red-900/50 text-red-400 animate-pulse"
                  : "bg-slate-700 text-slate-300"
              }`}
            >
              <Clock className="w-4 h-4" />
              {formatTime(timeLeft)}
            </div>
          ) : !isFinished ? (
            <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-700 text-slate-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading...
            </div>
          ) : null}
          <Button
            onClick={handleSubmit}
            disabled={submitting || isFinished}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : (
              <Send className="w-4 h-4 mr-1" />
            )}
            Submit All
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Question */}
        <div className="w-[420px] bg-slate-800 border-r border-slate-700 flex flex-col shrink-0 overflow-hidden">
          {/* Navigation */}
          <div className="flex items-center justify-between p-3 border-b border-slate-700 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              disabled={currentQuestionIndex === 0}
              onClick={() => {
                setCurrentQuestionIndex((i) => i - 1);
                setTestResults([]);
                setOutput("");
              }}
              className="text-slate-300 hover:text-white"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Prev
            </Button>
            <span className="text-xs text-slate-400">
              Q{currentQuestionIndex + 1}/{questions.length}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={currentQuestionIndex === questions.length - 1}
              onClick={() => {
                setCurrentQuestionIndex((i) => i + 1);
                setTestResults([]);
                setOutput("");
              }}
              className="text-slate-300 hover:text-white"
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          {/* Question dots */}
          <div className="flex gap-2 p-3 border-b border-slate-700 flex-wrap shrink-0">
            {questions.map((_: any, i: number) => {
              const q = questions[i];
              const ans = answers[q?.title];
              const hasAnswer = ans?.code?.trim() || ans?.selectedOption;
              return (
                <button
                  key={i}
                  onClick={() => {
                    setCurrentQuestionIndex(i);
                    setTestResults([]);
                    setOutput("");
                  }}
                  className={`w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center transition-all ${
                    i === currentQuestionIndex
                      ? "bg-[#0245EF] text-white ring-2 ring-[#4775FF]"
                      : hasAnswer
                        ? "bg-emerald-900/50 text-emerald-400 border border-emerald-700"
                        : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                  }`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>

          {/* Question content — scrollable */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
            <div className="p-4 space-y-4">
              {currentQuestion && (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      className={`${
                        currentQuestion.difficulty === "easy"
                          ? "bg-emerald-900 text-emerald-300"
                          : currentQuestion.difficulty === "hard"
                            ? "bg-red-900 text-red-300"
                            : "bg-amber-900 text-amber-300"
                      }`}
                    >
                      {currentQuestion.difficulty}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="border-slate-600 text-slate-300"
                    >
                      {currentQuestion.points} pts
                    </Badge>
                    <Badge
                      variant="outline"
                      className="border-slate-600 text-slate-300"
                    >
                      {currentQuestion.type}
                    </Badge>
                  </div>

                  <h3 className="text-lg font-semibold">
                    {currentQuestion.title}
                  </h3>
                  <div className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">
                    {currentQuestion.description}
                  </div>

                  {/* Test cases */}
                  {currentQuestion.type === "coding" &&
                    currentQuestion.testCases?.some(
                      (tc: any) => !tc.isHidden
                    ) && (
                      <div className="space-y-3 mt-4">
                        <h4 className="text-sm font-semibold text-[#4775FF]">
                          📋 Test Cases
                        </h4>
                        {currentQuestion.testCases
                          ?.filter((tc: any) => !tc.isHidden)
                          .map((tc: any, i: number) => (
                            <TestCaseDisplay
                              key={tc.id}
                              testCase={tc}
                              index={i}
                            />
                          ))}
                        {currentQuestion.testCases?.some(
                          (tc: any) => tc.isHidden
                        ) && (
                          <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50 text-xs text-slate-500 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                            +{" "}
                            {
                              currentQuestion.testCases.filter(
                                (tc: any) => tc.isHidden
                              ).length
                            }{" "}
                            hidden test cases
                          </div>
                        )}
                      </div>
                    )}

                  {/* MCQ */}
                  {currentQuestion.type === "mcq" && (
                    <div className="space-y-2 mt-4">
                      {currentQuestion.options?.map((opt: any) => (
                        <button
                          key={opt.id}
                          onClick={() =>
                            updateAnswer(currentQuestion.title, {
                              selectedOption: opt.id,
                            })
                          }
                          className={`w-full text-left p-3 rounded-lg border text-sm transition-all ${
                            currentAnswer.selectedOption === opt.id
                              ? "border-[#0245EF] bg-[#0245EF]/20 text-white"
                              : "border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500"
                          }`}
                        >
                          <span className="font-mono mr-2 text-slate-500">
                            {opt.id.toUpperCase()}.
                          </span>
                          {opt.text}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Editor + Output */}
        {currentQuestion?.type === "coding" && (
          <div className="flex-1 flex flex-col">
            <div className="h-10 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-3">
              <Select
                value={language}
                onValueChange={(v) => {
                  setLanguage(v);
                  const starter = currentQuestion.starterCode?.[v];
                  const currentCode = currentAnswer.code || "";
                  const oldStarter =
                    currentQuestion.starterCode?.[
                      currentAnswer.language || language
                    ] || "";
                  if (
                    normalizeCode(currentCode) ===
                      normalizeCode(oldStarter) ||
                    !currentCode.trim()
                  ) {
                    updateAnswer(currentQuestion.title, {
                      language: v,
                      code: starter || currentCode,
                    });
                  } else {
                    updateAnswer(currentQuestion.title, { language: v });
                    toast(
                      "Language changed. Code kept — ensure valid syntax.",
                      { icon: "⚠️", duration: 3000 }
                    );
                  }
                }}
              >
                <SelectTrigger className="w-[140px] h-7 bg-slate-700 border-slate-600 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(assessment.languages || ["javascript", "python"]).map(
                    (l: string) => (
                      <SelectItem key={l} value={l}>
                        {l === "sql"
                          ? "SQL"
                          : l === "cpp"
                            ? "C++"
                            : l.charAt(0).toUpperCase() + l.slice(1)}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={runCode}
                  disabled={running || runningTests}
                  className="h-7 text-xs border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-600"
                >
                  {running ? (
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  ) : (
                    <Play className="w-3 h-3 mr-1" />
                  )}{" "}
                  Run
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={runTests}
                  disabled={running || runningTests}
                  className="h-7 text-xs border-emerald-700 bg-emerald-900/30 text-emerald-300 hover:bg-emerald-900/50"
                >
                  {runningTests ? (
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  ) : (
                    <CheckCircle className="w-3 h-3 mr-1" />
                  )}{" "}
                  Tests
                </Button>
              </div>
            </div>

            <div className="flex-1">
              <Editor
                height="100%"
                language={getMonacoLanguage(language)}
                theme="vs-dark"
                value={currentAnswer.code || ""}
                onChange={(v) =>
                  updateAnswer(currentQuestion.title, { code: v || "" })
                }
                options={{
                  fontSize: 14,
                  minimap: { enabled: false },
                  padding: { top: 16 },
                  scrollBeyondLastLine: false,
                  wordWrap: "on",
                  tabSize: 2,
                  automaticLayout: true,
                }}
              />
            </div>

            <div className="h-[200px] bg-slate-900 border-t border-slate-700 flex flex-col shrink-0">
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="flex-1 flex flex-col"
              >
                <TabsList className="bg-slate-800 rounded-none border-b border-slate-700 h-8 px-2 justify-start">
                  <TabsTrigger
                    value="output"
                    className="text-xs h-6 data-[state=active]:bg-slate-700"
                  >
                    <Terminal className="w-3 h-3 mr-1" /> Output
                  </TabsTrigger>
                  <TabsTrigger
                    value="tests"
                    className="text-xs h-6 data-[state=active]:bg-slate-700"
                  >
                    <FileText className="w-3 h-3 mr-1" /> Tests
                    {testResults.length > 0 && (
                      <span
                        className={`ml-1.5 text-[10px] font-bold ${
                          testResults.every((r) => r.passed)
                            ? "text-emerald-400"
                            : "text-amber-400"
                        }`}
                      >
                        {testResults.filter((r) => r.passed).length}/
                        {testResults.length}
                      </span>
                    )}
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="output" className="flex-1 m-0">
                  <ScrollArea className="h-full p-3">
                    <pre className="text-xs font-mono whitespace-pre-wrap">
                      {running ? (
                        <span className="text-[#4775FF]">⏳ Running...</span>
                      ) : output ? (
                        <span
                          className={
                            output.includes("❌")
                              ? "text-red-400"
                              : "text-slate-300"
                          }
                        >
                          {output}
                        </span>
                      ) : (
                        <span className="text-slate-600">
                          Click &apos;Run&apos; to test your code.
                        </span>
                      )}
                    </pre>
                  </ScrollArea>
                </TabsContent>
                <TabsContent value="tests" className="flex-1 m-0">
                  <ScrollArea className="h-full p-3">
                    {runningTests ? (
                      <div className="flex items-center gap-2 text-[#4775FF] text-xs">
                        <Loader2 className="w-4 h-4 animate-spin" /> Running
                        tests...
                      </div>
                    ) : testResults.length === 0 ? (
                      <p className="text-xs text-slate-600">
                        Click &apos;Tests&apos; to validate your solution.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        <div
                          className={`p-2 rounded-lg text-xs font-medium ${
                            testResults.every((r) => r.passed)
                              ? "bg-emerald-900/30 text-emerald-400 border border-emerald-800"
                              : "bg-amber-900/30 text-amber-400 border border-amber-800"
                          }`}
                        >
                          {testResults.filter((r) => r.passed).length}/
                          {testResults.length} passed •{" "}
                          {testResults
                            .filter((r) => r.passed)
                            .reduce((s, r) => s + r.points, 0)}
                          /{testResults.reduce((s, r) => s + r.points, 0)} pts
                        </div>
                        {testResults.map((r, i) => (
                          <div
                            key={r.id}
                            className={`p-2.5 rounded-lg text-xs font-mono border ${
                              r.passed
                                ? "bg-emerald-900/20 border-emerald-800/50"
                                : "bg-red-900/20 border-red-800/50"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                {r.passed ? (
                                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <XCircle className="w-3.5 h-3.5 text-red-400" />
                                )}
                                <span
                                  className={
                                    r.passed
                                      ? "text-emerald-400"
                                      : "text-red-400"
                                  }
                                >
                                  Test {i + 1}{" "}
                                  {r.isHidden ? "(hidden)" : ""}
                                </span>
                              </div>
                              <span className="text-slate-500">
                                {r.points} pts
                              </span>
                            </div>
                            {!r.isHidden && (
                              <div className="ml-5 space-y-0.5 text-[11px]">
                                <div>
                                  <span className="text-slate-500">
                                    Input:{" "}
                                  </span>
                                  <span className="text-cyan-400">
                                    {r.input}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-500">
                                    Expected:{" "}
                                  </span>
                                  <span className="text-emerald-400">
                                    {r.expected}
                                  </span>
                                </div>
                                {!r.passed && (
                                  <div>
                                    <span className="text-slate-500">
                                      Got:{" "}
                                    </span>
                                    <span className="text-red-400">
                                      {r.actual || "(empty)"}
                                    </span>
                                  </div>
                                )}
                                {r.error && (
                                  <div className="mt-1 p-1.5 bg-red-900/30 rounded text-red-300 whitespace-pre-wrap">
                                    {r.error}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// HELPERS
// ==========================================

function TestCaseDisplay({
  testCase,
  index,
}: {
  testCase: any;
  index: number;
}) {
  let input = testCase.input || "";
  let isSQL = false;

  try {
    if (typeof input === "string" && input.startsWith("{")) {
      const parsed = JSON.parse(input);
      if (parsed.setup) isSQL = true;
    }
  } catch {}

  const renderOutput = (output: string) => {
    const lines = output.split("\n").filter((l) => l.trim());
    if (lines.length > 0 && lines[0].includes("|")) {
      const headers = lines[0].split("|").map((h) => h.trim());
      const rows = lines
        .slice(1)
        .map((l) => l.split("|").map((c) => c.trim()));
      return (
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="border-b border-slate-600">
              {headers.map((h, i) => (
                <th
                  key={i}
                  className="text-left py-1 px-2 text-[#4775FF] font-semibold"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="border-b border-slate-700/50">
                {row.map((cell, ci) => (
                  <td key={ci} className="py-1 px-2 text-emerald-400">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
    return <span className="text-emerald-400">{output}</span>;
  };

  if (isSQL) {
    const tables = parseCreateStatements(JSON.parse(input).setup);
    return (
      <div className="bg-slate-900/80 rounded-lg border border-slate-700 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700 bg-slate-800/50">
          <span className="text-[11px] text-slate-400">
            Example {index + 1}
          </span>
          <Badge
            variant="outline"
            className="text-[9px] border-slate-600"
          >
            {testCase.points} pts
          </Badge>
        </div>
        <div className="p-3 space-y-3">
          <div>
            <span className="text-[10px] text-slate-500 uppercase">
              Tables
            </span>
            {tables.map((t, ti) => (
              <div key={ti} className="mt-1">
                <span className="text-xs text-cyan-400 font-mono font-semibold">
                  {t.name}
                </span>
                <table className="text-xs font-mono mt-0.5">
                  <thead>
                    <tr className="border-b border-slate-700">
                      {t.columns.map((c, ci) => (
                        <th
                          key={ci}
                          className="text-left py-0.5 px-2 text-slate-400"
                        >
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {t.rows.map((r, ri) => (
                      <tr key={ri} className="border-b border-slate-800">
                        {r.map((cell, ci) => (
                          <td
                            key={ci}
                            className="py-0.5 px-2 text-slate-300"
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase">
              Expected
            </span>
            <div className="mt-1 bg-slate-900 rounded p-2">
              {renderOutput(testCase.expectedOutput)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/80 rounded-lg p-3 text-xs font-mono border border-slate-700">
      <div className="flex items-center justify-between mb-2">
        <span className="text-slate-400 font-sans text-[11px]">
          Example {index + 1}
        </span>
        <Badge
          variant="outline"
          className="text-[9px] border-slate-600"
        >
          {testCase.points} pts
        </Badge>
      </div>
      <div className="space-y-1.5">
        <div>
          <span className="text-slate-500">Input: </span>
          <span className="text-cyan-400">{input}</span>
        </div>
        <div>
          <span className="text-slate-500">Expected: </span>
          {renderOutput(testCase.expectedOutput)}
        </div>
      </div>
    </div>
  );
}

function parseCreateStatements(sql: string) {
  const tables: { name: string; columns: string[]; rows: string[][] }[] = [];
  const createRegex = /CREATE\s+TABLE\s+(\w+)\s*\((.*?)\)/gi;
  let m;
  while ((m = createRegex.exec(sql)) !== null) {
    const cols = m[2]
      .split(",")
      .map((c) => c.trim().split(/\s+/)[0])
      .filter(
        (c) => c && !c.toUpperCase().startsWith("PRIMARY")
      );
    tables.push({ name: m[1], columns: cols, rows: [] });
  }
  const insertRegex =
    /INSERT\s+INTO\s+(\w+)\s+VALUES\s+(.*?)(?=;|INSERT|CREATE|$)/gi;
  while ((m = insertRegex.exec(sql)) !== null) {
    const table = tables.find(
      (t) => t.name.toLowerCase() === m![1].toLowerCase()
    );
    if (!table) continue;
    const groups = m[2].match(/\(([^)]+)\)/g);
    if (groups)
      groups.forEach((g) =>
        table.rows.push(
          g
            .slice(1, -1)
            .split(",")
            .map((v) => v.trim().replace(/^'|'$/g, ""))
        )
      );
  }
  return tables;
}

function normalizeOutput(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\s*,\s*/g, ",")
    .replace(/\s*:\s*/g, ":")
    .replace(/\[\s+/g, "[")
    .replace(/\s+\]/g, "]")
    .replace(/\{\s+/g, "{")
    .replace(/\s+\}/g, "}")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .join("\n")
    .trim()
    .replace(/\bTrue\b/g, "true")
    .replace(/\bFalse\b/g, "false")
    .replace(/\bNone\b/g, "null");
}

function normalizeCode(code: string): string {
  return code
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("//") && !l.startsWith("#"))
    .join("\n")
    .trim();
}

function getMonacoLanguage(lang: string): string {
  const map: Record<string, string> = {
    javascript: "javascript",
    python: "python",
    typescript: "typescript",
    java: "java",
    cpp: "cpp",
    sql: "sql",
    mysql: "sql",
    postgresql: "sql",
  };
  return map[lang] || lang;
}

// 3. The Top-Level Wrapper
function AssessmentPageInner() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <AssessmentLoader />;
  }

  return (
    <Suspense fallback={<AssessmentLoader />}>
      <AssessmentContent />
    </Suspense>
  );
}

export default function AssessmentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-900">
          <p className="text-white">Loading assessment...</p>
        </div>
      }
    >
      <AssessmentPageInner />
    </Suspense>
  );
}