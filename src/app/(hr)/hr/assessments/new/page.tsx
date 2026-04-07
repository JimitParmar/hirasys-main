"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Loader2, Sparkles, Plus, Save, Code,
  CheckCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";

export default function NewAssessmentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobId = searchParams.get("jobId");

  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJobId, setSelectedJobId] = useState(jobId || "");
  const [title, setTitle] = useState("");
  const [type, setType] = useState("CODING");
  const [difficulty, setDifficulty] = useState("medium");
  const [duration, setDuration] = useState(60);
  const [questionCount, setQuestionCount] = useState(3);
  const [questions, setQuestions] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    const res = await fetch("/api/jobs");
    const data = await res.json();
    setJobs(data.jobs || []);
  };

  const generateQuestions = async () => {
    if (!selectedJobId) {
      toast.error("Select a job first");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/assessments/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: selectedJobId,
          type: type.toLowerCase(),
          difficulty,
          questionCount,
        }),
      });
      const data = await res.json();
      if (data.questions) {
        setQuestions(data.questions);
        toast.success(`Generated ${data.questions.length} questions!`);
      }
    } catch {
      toast.error("Failed to generate");
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!selectedJobId || !title || questions.length === 0) {
      toast.error("Fill all fields and generate questions");
      return;
    }
    setSaving(true);
    try {
      const totalPoints = questions.reduce((sum: number, q: any) => sum + (q.points || 10), 0);
      const res = await fetch("/api/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: selectedJobId,
          title,
          type,
          duration,
          totalPoints,
          passingScore: Math.floor(totalPoints * 0.6),
          questions,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Assessment created!");
      router.push("/hr/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const selectedJob = jobs.find((j) => j.id === selectedJobId);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/hr/dashboard">
              <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
            </Link>
            <h1 className="font-bold text-slate-800">Create Assessment</h1>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving || questions.length === 0}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save Assessment
          </Button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <Card>
          <CardHeader><CardTitle>Assessment Settings</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Job *</Label>
                <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                  <SelectTrigger><SelectValue placeholder="Select job..." /></SelectTrigger>
                  <SelectContent>
                    {jobs.map((j) => (
                      <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. React Coding Challenge"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CODING">Coding</SelectItem>
                    <SelectItem value="MCQ">MCQ</SelectItem>
                    <SelectItem value="MIXED">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Duration (min)</Label>
                <Input type="number" value={duration} onChange={(e) => setDuration(parseInt(e.target.value) || 60)} />
              </div>
              <div className="space-y-2">
                <Label>Questions</Label>
                <Input type="number" value={questionCount} onChange={(e) => setQuestionCount(parseInt(e.target.value) || 3)} min={1} max={10} />
              </div>
            </div>

            <Button
              onClick={generateQuestions}
              disabled={generating || !selectedJobId}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {generating ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              {generating ? "Generating questions from job description..." : "AI Generate Questions"}
            </Button>
          </CardContent>
        </Card>

        {/* Generated Questions Preview */}
        {questions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                {questions.length} Questions Generated
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {questions.map((q, i) => (
                <div key={i} className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">{q.type}</Badge>
                    <Badge className={
                      q.difficulty === "easy" ? "bg-emerald-100 text-emerald-700" :
                      q.difficulty === "hard" ? "bg-red-100 text-red-700" :
                      "bg-amber-100 text-amber-700"
                    }>{q.difficulty}</Badge>
                    <Badge variant="secondary">{q.points} pts</Badge>
                  </div>
                  <h4 className="font-semibold text-slate-800">{q.title}</h4>
                  <p className="text-sm text-slate-500 mt-1 line-clamp-3">{q.description}</p>
                  {q.testCases && (
                    <p className="text-xs text-slate-400 mt-2">
                      {q.testCases.length} test cases ({q.testCases.filter((t: any) => !t.isHidden).length} visible, {q.testCases.filter((t: any) => t.isHidden).length} hidden)
                    </p>
                  )}
                  {q.options && (
                    <div className="mt-2 flex gap-2 flex-wrap">
                      {q.options.map((o: any) => (
                        <Badge key={o.id} variant={o.id === q.correctAnswer ? "default" : "outline"} className="text-xs">
                          {o.id}: {o.text}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}