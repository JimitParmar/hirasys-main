"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Play, Send, Clock, CheckCircle, XCircle, Loader2,
  ChevronLeft, ChevronRight, Code, Terminal, FileText,
  AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";

export default function AssessmentPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const applicationId = searchParams.get("applicationId");
  const assessmentId = params.id as string;

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
  const [timeLeft, setTimeLeft] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [activeTab, setActiveTab] = useState("output");
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to set submission in both state and ref
  const saveSubmission = (sub: any) => {
    setSubmission(sub);
    submissionRef.current = sub;
    console.log("Submission saved:", sub?.id);
  };

  useEffect(() => {
    if (isAuthenticated && assessmentId) loadAssessment();
  }, [isAuthenticated, assessmentId]);

  // Timer
  useEffect(() => {
    if (timeLeft <= 0 || isFinished) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timeLeft, isFinished]);

    // Sync language when switching questions
  useEffect(() => {
    if (!assessment?.questions?.length) return;
    const question = assessment.questions[currentQuestionIndex];
    if (!question || question.type !== "coding") return;

    const answer = answers[question.title];
    if (answer?.language) {
      setLanguage(answer.language);
    } else {
      // Default to first available language
      const availableLanguages = assessment.languages || ["javascript", "python"];
      setLanguage(availableLanguages[0] || "javascript");
    }
  }, [currentQuestionIndex, assessment]);

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
  const loadAssessment = async () => {
    try {
      // Fetch assessment from pipeline
      const aRes = await fetch(
        `/api/assessments/from-pipeline?applicationId=${applicationId}&nodeSubtype=${assessmentId}`
      );
      const aData = await aRes.json();

      if (aData.error) {
        toast.error(aData.error);
        setLoading(false);
        return;
      }

      setAssessment(aData.assessment);

      // Start or resume submission
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

      console.log("Start submission response:", sData);

      if (sData.error === "Already submitted") {
        setIsFinished(true);
        saveSubmission(sData.submission || null);
      } else if (sData.submission) {
        saveSubmission(sData.submission);

        // SERVER-SIDE TIMER: Calculate remaining time from server data
        const startedAt = new Date(sData.submission.started_at).getTime();
        const durationMs = (aData.assessment?.duration || 60) * 60 * 1000;
        const endTime = startedAt + durationMs;
        const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));

        if (remaining <= 0) {
          // Time already expired — auto-submit
          toast.error("Time expired! Auto-submitting...");
          setTimeLeft(0);
          // Wait for submission to be set, then submit
          setTimeout(() => handleSubmit(), 500);
        } else {
          setTimeLeft(remaining);
        }
      }

      // Initialize answers with starter code
            // Initialize answers with starter code
      const questions = aData.assessment?.questions || [];
      const defaultLang = (aData.assessment?.languages || ["javascript"])[0];
      const initial: Record<string, any> = {};
      
      questions.forEach((q: any) => {
        if (q.type === "coding") {
          initial[q.title] = {
            questionTitle: q.title,
            code: q.starterCode?.[defaultLang] || q.starterCode?.javascript || "// Write your solution here\n",
            language: defaultLang,
            type: "coding",
          };
        } else if (q.type === "mcq") {
          initial[q.title] = {
            questionTitle: q.title,
            selectedOption: null,
            type: "mcq",
          };
        }
      });
      setAnswers(initial);
      setLanguage(defaultLang);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load assessment");
    } finally {
      setLoading(false);
    }
  };

  const runCode = async () => {
    const question = assessment.questions[currentQuestionIndex];
    const answer = answers[question.title];
    if (!answer?.code) {
      toast.error("Write some code first");
      return;
    }

    setRunning(true);
    setOutput("");
    setActiveTab("output");

    try {
      const firstVisible = question.testCases?.find((tc: any) => !tc.isHidden);
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

      let outputText = "";
      if (result.stderr) {
        outputText = `❌ ERROR:\n${result.stderr}`;
      } else if (result.stdout) {
        outputText = `✅ Output:\n${result.stdout}`;
        if (firstVisible) {
          outputText += `\n\n📋 Expected:\n${firstVisible.expectedOutput}`;
          if (normalizeOutput(result.stdout) === normalizeOutput(firstVisible.expectedOutput)) {
            outputText += `\n\n✅ Matches expected output!`;
          } else {
            outputText += `\n\n⚠️ Does not match expected output`;
          }
        }
      } else {
        outputText = "⚠️ No output. Make sure your function returns a value.";
      }
      if (result.version) {
        outputText += `\n\n--- ${result.version} ---`;
      }
      setOutput(outputText);
    } catch {
      setOutput("❌ Execution failed. Try again.");
    } finally {
      setRunning(false);
    }
  };

  const runTests = async () => {
    const question = assessment.questions[currentQuestionIndex];
    const answer = answers[question.title];
    if (!answer?.code) {
      toast.error("Write some code first");
      return;
    }

    setRunningTests(true);
    setTestResults([]);
    setActiveTab("tests");

    try {
      const results = [];
      for (const tc of (question.testCases || [])) {
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
          const actualOutput = result.stdout?.trim() || "";
          const expectedOutput = tc.expectedOutput?.trim() || "";
          const passed = normalizeOutput(actualOutput) === normalizeOutput(expectedOutput) && !result.stderr;

          results.push({
            id: tc.id, passed,
            input: tc.isHidden ? "[hidden]" : tc.input,
            expected: tc.isHidden ? "[hidden]" : expectedOutput,
            actual: tc.isHidden && !passed ? "[hidden]" : actualOutput,
            error: result.stderr || null,
            isHidden: tc.isHidden,
            points: tc.points || 5,
          });
        } catch {
          results.push({
            id: tc.id, passed: false,
            input: tc.isHidden ? "[hidden]" : tc.input,
            expected: "[error]", actual: "", error: "Execution failed",
            isHidden: tc.isHidden, points: tc.points || 5,
          });
        }
      }
      setTestResults(results);
      const passedCount = results.filter((r) => r.passed).length;
      const earnedPoints = results.filter((r) => r.passed).reduce((s, r) => s + r.points, 0);
      const totalPoints = results.reduce((s, r) => s + r.points, 0);
      toast(
        `${passedCount}/${results.length} tests passed (${earnedPoints}/${totalPoints} pts)`,
        { icon: passedCount === results.length ? "🎉" : passedCount > 0 ? "⚠️" : "❌", duration: 4000 }
      );
    } catch {
      toast.error("Test execution failed");
    } finally {
      setRunningTests(false);
    }
  };

    const handleSubmit = async () => {
    if (isFinished || submitting) return;
    setSubmitting(true);

    try {
      // Read submission ID from state directly
      // Use a promise to get current state value
      const currentSubmissionId = await new Promise<string | null>((resolve) => {
        setSubmission((current: any) => {
          resolve(current?.id || null);
          return current; // Don't modify state
        });
      });

      console.log("=== SUBMIT ===");
      console.log("Submission ID:", currentSubmissionId);

      if (!currentSubmissionId) {
        // Last resort — check the database
        try {
          const checkRes = await fetch(
            `/api/submissions?applicationId=${applicationId}`
          );
          const checkData = await checkRes.json();
          const activeSubmission = checkData.submissions?.find(
            (s: any) => s.status === "IN_PROGRESS"
          );

          if (activeSubmission?.id) {
            console.log("Found submission from API:", activeSubmission.id);
            await submitWithId(activeSubmission.id);
            return;
          }
        } catch {}

        toast.error("No active submission found. Please refresh.");
        setSubmitting(false);
        return;
      }

      await submitWithId(currentSubmissionId);
    } catch (err: any) {
      console.error("Submit error:", err);
      toast.error(err.message || "Failed to submit");
      setSubmitting(false);
    }
  };

  const submitWithId = async (submissionId: string) => {
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit",
          submissionId,
          answers: Object.values(answers),
        }),
      });

      const data = await res.json();
      console.log("Submit response:", data);

      if (!res.ok) {
        if (data.error === "Already graded") {
          setIsFinished(true);
          toast.success("Already submitted!");
          return;
        }
        throw new Error(data.error || "Submission failed");
      }

      setIsFinished(true);
      if (timerRef.current) clearInterval(timerRef.current);

      const score = data.totalScore ?? 0;
      const maxS = data.maxScore ?? 0;
      const pct = data.percentage ?? 0;

      toast.success(
        `Assessment Submitted! Score: ${score}/${maxS} (${Math.round(pct)}%)`,
        { duration: 8000 }
      );
    } catch (err: any) {
      console.error("Submit error:", err);
      toast.error(err.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  const updateAnswer = (questionTitle: string, updates: any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionTitle]: { ...prev[questionTitle], ...updates },
    }));
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-[#4775FF]" />
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Assessment Complete!</h2>
          <p className="text-slate-500 mb-6">Your answers have been submitted and graded.</p>
          <Button onClick={() => router.push("/applications")} className="bg-[#0245EF] hover:bg-[#0237BF]">
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
          <p className="text-lg">No questions found for this assessment</p>
          <Button onClick={() => router.push("/applications")} variant="outline" className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const questions = assessment.questions;
  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = answers[currentQuestion?.title] || {};
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
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n")
    .trim()
    .replace(/\bTrue\b/g, "true")
    .replace(/\bFalse\b/g, "false")
    .replace(/\bNone\b/g, "null")
    .replace(/\bNULL\b/g, "null");
}
  return (
    <div className="h-screen flex flex-col bg-slate-900 text-white">
      {/* Top Bar */}
      <div className="h-12 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <Code className="w-5 h-5 text-[#4775FF]" />
          <span className="font-semibold text-sm">{assessment.title}</span>
          <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-300">
            {questions.length} question{questions.length > 1 ? "s" : ""}
          </Badge>
        </div>
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-lg font-mono text-sm font-bold ${
            timeLeft < 300 ? "bg-red-900/50 text-red-400 animate-pulse" : "bg-slate-700 text-slate-300"
          }`}>
            <Clock className="w-4 h-4" />
            {formatTime(timeLeft)}
          </div>
          <Button onClick={handleSubmit} disabled={submitting} size="sm" className="bg-emerald-600 hover:bg-emerald-700">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />}
            Submit All
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Question */}
                {/* Left Panel — Question */}
        <div className="w-[420px] bg-slate-800 border-r border-slate-700 flex flex-col shrink-0 overflow-hidden">
          {/* Question nav */}
          <div className="flex items-center justify-between p-3 border-b border-slate-700 shrink-0">
            <Button variant="ghost" size="sm" disabled={currentQuestionIndex === 0}
              onClick={() => { setCurrentQuestionIndex((i) => i - 1); setTestResults([]); setOutput(""); }}
              className="text-slate-300 hover:text-white">
              <ChevronLeft className="w-4 h-4 mr-1" /> Prev
            </Button>
            <span className="text-xs text-slate-400">Q{currentQuestionIndex + 1}/{questions.length}</span>
            <Button variant="ghost" size="sm" disabled={currentQuestionIndex === questions.length - 1}
              onClick={() => { setCurrentQuestionIndex((i) => i + 1); setTestResults([]); setOutput(""); }}
              className="text-slate-300 hover:text-white">
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
                <button key={i} onClick={() => { setCurrentQuestionIndex(i); setTestResults([]); setOutput(""); }}
                  className={`w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center transition-all ${
                    i === currentQuestionIndex ? "bg-[#0245EF] text-white ring-2 ring-[#4775FF]"
                    : hasAnswer ? "bg-emerald-900/50 text-emerald-400 border border-emerald-700"
                    : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                  }`}>
                  {i + 1}
                </button>
              );
            })}
          </div>

          {/* Question content — THIS IS THE SCROLLABLE PART */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
            <div className="p-4 space-y-4">
              {currentQuestion && (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={`${
                      currentQuestion.difficulty === "easy" ? "bg-emerald-900 text-emerald-300" :
                      currentQuestion.difficulty === "hard" ? "bg-red-900 text-red-300" :
                      "bg-amber-900 text-amber-300"
                    }`}>
                      {currentQuestion.difficulty}
                    </Badge>
                    <Badge variant="outline" className="border-slate-600 text-slate-300">
                      {currentQuestion.points} pts
                    </Badge>
                    <Badge variant="outline" className="border-slate-600 text-slate-300">
                      {currentQuestion.type}
                    </Badge>
                  </div>

                  <h3 className="text-lg font-semibold">{currentQuestion.title}</h3>

                  <div className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">
                    {currentQuestion.description}
                  </div>

                  {/* Test Cases — Formatted Nicely */}
                  {currentQuestion.type === "coding" && currentQuestion.testCases?.some((tc: any) => !tc.isHidden) && (
                    <div className="space-y-3 mt-4">
                      <h4 className="text-sm font-semibold text-[#4775FF]">📋 Test Cases</h4>
                      {currentQuestion.testCases?.filter((tc: any) => !tc.isHidden).map((tc: any, i: number) => (
                        <TestCaseDisplay key={tc.id} testCase={tc} index={i} />
                      ))}

                      {currentQuestion.testCases?.some((tc: any) => tc.isHidden) && (
                        <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50 text-xs text-slate-500 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                          + {currentQuestion.testCases.filter((tc: any) => tc.isHidden).length} hidden test cases
                        </div>
                      )}
                    </div>
                  )}

                  {/* MCQ Options */}
                  {currentQuestion.type === "mcq" && (
                    <div className="space-y-2 mt-4">
                      {currentQuestion.options?.map((opt: any) => (
                        <button key={opt.id}
                          onClick={() => updateAnswer(currentQuestion.title, { selectedOption: opt.id })}
                          className={`w-full text-left p-3 rounded-lg border text-sm transition-all ${
                            currentAnswer.selectedOption === opt.id
                              ? "border-[#0245EF] bg-[#010E30]/30 text-white"
                              : "border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500"
                          }`}>
                          <span className="font-mono mr-2 text-slate-500">{opt.id.toUpperCase()}.</span>
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
            {/* Toolbar */}
            <div className="h-10 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-3">
              <Select
  value={language}
  onValueChange={(v) => {
    setLanguage(v);

    const currentCode = currentAnswer.code || "";
    const currentStarterCode = currentQuestion.starterCode?.[currentAnswer.language || language] || "";
    const newStarterCode = currentQuestion.starterCode?.[v] || "";

    // Check if user still has the original starter code (hasn't typed anything meaningful)
    const isStillStarterCode =
      normalizeCode(currentCode) === normalizeCode(currentStarterCode) ||
      currentCode.trim() === "" ||
      currentCode.trim() === "// Write your solution here";

    if (isStillStarterCode && newStarterCode) {
      // User hasn't written anything — swap to new language's starter code
      updateAnswer(currentQuestion.title, {
        language: v,
        code: newStarterCode,
      });
    } else {
      // User has written code — keep their code, just change the language
      updateAnswer(currentQuestion.title, {
        language: v,
      });
      toast(
        "Language changed. Your code was kept — make sure it's valid " +
          v.charAt(0).toUpperCase() + v.slice(1) + " syntax.",
        { icon: "⚠️", duration: 3000 }
      );
    }
  }}
>
  <SelectTrigger className="w-[140px] h-7 bg-slate-700 border-slate-600 text-xs">
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
  {(assessment.languages || ["javascript", "python"]).map((l: string) => (
    <SelectItem key={l} value={l}>
      {l === "sql" ? "SQL / MySQL" :
       l === "postgresql" ? "PostgreSQL" :
       l === "cpp" ? "C++" :
       l.charAt(0).toUpperCase() + l.slice(1)}
    </SelectItem>
  ))}
</SelectContent>
</Select>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={runCode} disabled={running || runningTests}
                  className="h-7 text-xs border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-600">
                  {running ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Play className="w-3 h-3 mr-1" />}
                  Run Code
                </Button>
                <Button variant="outline" size="sm" onClick={runTests} disabled={running || runningTests}
                  className="h-7 text-xs border-emerald-700 bg-emerald-900/30 text-emerald-300 hover:bg-emerald-900/50">
                  {runningTests ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle className="w-3 h-3 mr-1" />}
                  Run Tests
                </Button>
              </div>
            </div>

            {/* Editor */}
            <div className="flex-1">
              <Editor
  height="100%"
  language={getMonacoLanguage(language)}
                theme="vs-dark"
                value={currentAnswer.code || ""}
                onChange={(value) => updateAnswer(currentQuestion.title, { code: value || "" })}
                options={{
                  fontSize: 14, minimap: { enabled: false }, padding: { top: 16 },
                  scrollBeyondLastLine: false, wordWrap: "on", tabSize: 2, automaticLayout: true,
                }}
              />
            </div>

            {/* Output/Tests Panel */}
            <div className="h-[220px] bg-slate-900 border-t border-slate-700 flex flex-col shrink-0">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                <TabsList className="bg-slate-800 rounded-none border-b border-slate-700 h-8 px-2 justify-start">
                  <TabsTrigger value="output" className="text-xs h-6 data-[state=active]:bg-slate-700">
                    <Terminal className="w-3 h-3 mr-1" /> Output
                  </TabsTrigger>
                  <TabsTrigger value="tests" className="text-xs h-6 data-[state=active]:bg-slate-700">
                    <FileText className="w-3 h-3 mr-1" /> Test Results
                    {testResults.length > 0 && (
                      <span className={`ml-1.5 text-[10px] font-bold ${
                        testResults.every((r) => r.passed) ? "text-emerald-400" : "text-amber-400"
                      }`}>
                        {testResults.filter((r) => r.passed).length}/{testResults.length}
                      </span>
                    )}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="output" className="flex-1 m-0">
                  <ScrollArea className="h-full p-3">
                    <pre className="text-xs font-mono whitespace-pre-wrap">
                      {running ? (
                        <span className="text-[#4775FF]">⏳ Running your code...</span>
                      ) : output ? (
                        <span className={output.includes("❌") ? "text-red-400" : "text-slate-300"}>
                          {output}
                        </span>
                      ) : (
                        <span className="text-slate-600">
                          Click &apos;Run Code&apos; to test with the first example input.{"\n"}
                          Click &apos;Run Tests&apos; to check against all test cases.
                        </span>
                      )}
                    </pre>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="tests" className="flex-1 m-0">
                  <ScrollArea className="h-full p-3">
                    {runningTests ? (
                      <div className="flex items-center gap-2 text-[#4775FF] text-xs">
                        <Loader2 className="w-4 h-4 animate-spin" /> Running all test cases...
                      </div>
                    ) : testResults.length === 0 ? (
                      <p className="text-xs text-slate-600">
                        Click &apos;Run Tests&apos; to validate your solution against all test cases.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {/* Summary */}
                        <div className={`p-2 rounded-lg text-xs font-medium ${
                          testResults.every((r) => r.passed)
                            ? "bg-emerald-900/30 text-emerald-400 border border-emerald-800"
                            : "bg-amber-900/30 text-amber-400 border border-amber-800"
                        }`}>
                          {testResults.filter((r) => r.passed).length}/{testResults.length} tests passed
                          {" • "}
                          {testResults.filter((r) => r.passed).reduce((s, r) => s + r.points, 0)}/
                          {testResults.reduce((s, r) => s + r.points, 0)} points
                        </div>

                        {testResults.map((result, i) => (
                          <div key={result.id}
                            className={`p-2.5 rounded-lg text-xs font-mono border ${
                              result.passed
                                ? "bg-emerald-900/20 border-emerald-800/50"
                                : "bg-red-900/20 border-red-800/50"
                            }`}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                {result.passed
                                  ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                                  : <XCircle className="w-3.5 h-3.5 text-red-400" />
                                }
                                <span className={result.passed ? "text-emerald-400" : "text-red-400"}>
                                  Test {i + 1} {result.isHidden ? "(hidden)" : ""}
                                </span>
                              </div>
                              <span className="text-slate-500">{result.points} pts</span>
                            </div>

                            {!result.isHidden && (
                              <div className="ml-5 space-y-0.5 text-[11px]">
                                <div><span className="text-slate-500">Input:    </span><span className="text-cyan-400">{result.input}</span></div>
                                <div><span className="text-slate-500">Expected: </span><span className="text-emerald-400">{result.expected}</span></div>
                                {!result.passed && (
                                  <div><span className="text-slate-500">Got:      </span><span className="text-red-400">{result.actual || "(empty)"}</span></div>
                                )}
                                {result.error && (
                                  <div className="mt-1 p-1.5 bg-red-900/30 rounded text-red-300 whitespace-pre-wrap">
                                    {result.error}
                                  </div>
                                )}
                              </div>
                            )}

                            {result.isHidden && !result.passed && (
                              <div className="ml-5 text-[11px] text-slate-500">
                                Hidden test case failed
                                {result.error && <span className="text-red-400 ml-1">— {result.error.split('\n')[0]}</span>}
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
function normalizeCode(code: string): string {
  return code
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => {
      // Remove empty lines and comment-only lines
      if (line === "") return false;
      if (line.startsWith("//")) return false;
      if (line.startsWith("#")) return false;
      if (line.startsWith("/*")) return false;
      if (line.startsWith("*")) return false;
      return true;
    })
    .join("\n")
    .trim();
}
function TestCaseDisplay({ testCase, index }: { testCase: any; index: number }) {
  let input = testCase.input || "";
  let expectedOutput = testCase.expectedOutput || "";
  let isSQL = false;
  let setupSQL = "";

  // Check if input is SQL setup JSON
  try {
    if (typeof input === "string" && input.startsWith("{")) {
      const parsed = JSON.parse(input);
      if (parsed.setup) {
        isSQL = true;
        setupSQL = parsed.setup;
      }
    }
  } catch {}

  // Parse expected output into table format
  const renderOutput = (output: string) => {
    const lines = output.split("\n").filter((l) => l.trim());

    // Check if output is pipe-separated (table format)
    if (lines.length > 0 && lines[0].includes("|")) {
      const headers = lines[0].split("|").map((h) => h.trim());
      const rows = lines.slice(1).map((line) => line.split("|").map((c) => c.trim()));

      return (
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-600">
                {headers.map((h, i) => (
                  <th key={i} className="text-left py-1 px-2 text-[#4775FF] font-semibold">
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
        </div>
      );
    }

    // Plain text output
    return <span className="text-emerald-400">{output}</span>;
  };

  if (isSQL) {
    // SQL test case — show tables and expected result nicely
    const tables = parseCreateStatements(setupSQL);

    return (
      <div className="bg-slate-900/80 rounded-lg border border-slate-700 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700 bg-slate-800/50">
          <span className="text-[11px] text-slate-400">Example {index + 1}</span>
          <Badge variant="outline" className="text-[9px] border-slate-600">{testCase.points} pts</Badge>
        </div>

        <div className="p-3 space-y-3">
          {/* Show tables */}
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Tables</span>
            <div className="mt-1 space-y-2">
              {tables.map((table, ti) => (
                <div key={ti}>
                  <span className="text-xs text-cyan-400 font-mono font-semibold">{table.name}</span>
                  <div className="mt-0.5 overflow-x-auto">
                    <table className="text-xs font-mono">
                      <thead>
                        <tr className="border-b border-slate-700">
                          {table.columns.map((col, ci) => (
                            <th key={ci} className="text-left py-0.5 px-2 text-slate-400 font-medium">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {table.rows.map((row, ri) => (
                          <tr key={ri} className="border-b border-slate-800">
                            {row.map((cell, ci) => (
                              <td key={ci} className="py-0.5 px-2 text-slate-300">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Expected output */}
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Expected Result</span>
            <div className="mt-1 bg-slate-900 rounded p-2">
              {renderOutput(expectedOutput)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Non-SQL test case
  return (
    <div className="bg-slate-900/80 rounded-lg p-3 text-xs font-mono border border-slate-700">
      <div className="flex items-center justify-between mb-2">
        <span className="text-slate-400 font-sans text-[11px]">Example {index + 1}</span>
        <Badge variant="outline" className="text-[9px] border-slate-600">{testCase.points} pts</Badge>
      </div>
      <div className="space-y-1.5">
        <div>
          <span className="text-slate-500">Input: </span>
          <span className="text-cyan-400">{input}</span>
        </div>
        <div>
          <span className="text-slate-500">Expected: </span>
          {renderOutput(expectedOutput)}
        </div>
      </div>
    </div>
  );
}

// Parse CREATE TABLE and INSERT statements into visual tables
function parseCreateStatements(sql: string): { name: string; columns: string[]; rows: string[][] }[] {
  const tables: { name: string; columns: string[]; rows: string[][] }[] = [];

  // Find CREATE TABLE statements
  const createRegex = /CREATE\s+TABLE\s+(\w+)\s*\((.*?)\)/gi;
  let createMatch;
  while ((createMatch = createRegex.exec(sql)) !== null) {
    const tableName = createMatch[1];
    const columnDefs = createMatch[2];

    // Extract column names (ignore types)
    const columns = columnDefs
      .split(",")
      .map((col) => col.trim().split(/\s+/)[0])
      .filter((col) => col && !col.toUpperCase().startsWith("PRIMARY") && !col.toUpperCase().startsWith("FOREIGN"));

    tables.push({ name: tableName, columns, rows: [] });
  }

  // Find INSERT statements
  const insertRegex = /INSERT\s+INTO\s+(\w+)\s+VALUES\s+(.*?)(?=;|INSERT|CREATE|$)/gi;
  let insertMatch;
  while ((insertMatch = insertRegex.exec(sql)) !== null) {
    const tableName = insertMatch[1];
    const valuesStr = insertMatch[2];

    const table = tables.find((t) => t.name.toLowerCase() === tableName.toLowerCase());
    if (!table) continue;

    // Parse value groups: (1, 'Alice', 100), (2, 'Bob', 200)
    const valueGroups = valuesStr.match(/\(([^)]+)\)/g);
    if (valueGroups) {
      for (const group of valueGroups) {
        const values = group
          .slice(1, -1) // Remove parentheses
          .split(",")
          .map((v) => v.trim().replace(/^'|'$/g, "")); // Remove quotes
        table.rows.push(values);
      }
    }
  }

  return tables;
}