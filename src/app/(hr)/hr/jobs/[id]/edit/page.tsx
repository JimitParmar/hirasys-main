"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Plus, X, Loader2, Save, Send, Eye,
  GitBranch, AlertCircle, CheckCircle2, ExternalLink, Trash2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import toast from "react-hot-toast";
import Link from "next/link";

export default function EditJobPage() {
  const { id } = useParams();
  const router = useRouter();
  const { isHR, isLoading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pipelines, setPipelines] = useState<any[]>([]);

  // Job fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [department, setDepartment] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState("full_time");
  const [experienceMin, setExperienceMin] = useState(0);
  const [experienceMax, setExperienceMax] = useState(10);
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [salaryCurrency, setSalaryCurrency] = useState("USD");
  const [selectedPipelineId, setSelectedPipelineId] = useState("none");
  const [status, setStatus] = useState("DRAFT");
  const [applicantCount, setApplicantCount] = useState(0);

  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [requirements, setRequirements] = useState<string[]>([]);
  const [reqInput, setReqInput] = useState("");

  useEffect(() => {
    if (!authLoading && !isHR) router.push("/login");
  }, [authLoading, isHR, router]);

  useEffect(() => {
    if (isHR) {
      fetchJob();
      fetchPipelines();
    }
  }, [isHR, id]);

  const fetchJob = async () => {
    try {
      const res = await fetch(`/api/jobs/${id}`);
      const data = await res.json();
      const job = data.job;

      if (!job) {
        toast.error("Job not found");
        router.push("/hr/dashboard");
        return;
      }

      setTitle(job.title || "");
      setDescription(job.description || "");
      setDepartment(job.department || "");
      setLocation(job.location || "");
      setType(job.type || "full_time");
      setExperienceMin(job.experienceMin ?? job.experience_min ?? 0);
      setExperienceMax(job.experienceMax ?? job.experience_max ?? 10);
      setSalaryMin(job.salaryMin ?? job.salary_min ? String(job.salaryMin ?? job.salary_min) : "");
      setSalaryMax(job.salaryMax ?? job.salary_max ? String(job.salaryMax ?? job.salary_max) : "");
      setSalaryCurrency(job.salaryCurrency ?? job.salary_currency ?? "USD");
      setSelectedPipelineId(job.pipeline_id || "none");
      setStatus(job.status || "DRAFT");
      setApplicantCount(job._count?.applications ?? job.applicant_count ?? 0);
      setSkills(job.skills || []);
      setRequirements(job.requirements || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load job");
    } finally {
      setLoading(false);
    }
  };

  const fetchPipelines = async () => {
    try {
      const res = await fetch("/api/pipeline");
      const data = await res.json();
      setPipelines(data.pipelines || []);
    } catch {}
  };

  const addSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()]);
      setSkillInput("");
    }
  };

  const addRequirement = () => {
    if (reqInput.trim()) {
      setRequirements([...requirements, reqInput.trim()]);
      setReqInput("");
    }
  };

  const handleSave = async (newStatus?: string) => {
    if (!title || !description || !department || !location) {
      toast.error("Please fill all required fields");
      return;
    }

    const targetStatus = newStatus || status;

    if (targetStatus === "PUBLISHED" && selectedPipelineId === "none") {
      toast.error("Link a pipeline before publishing");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/jobs/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          department,
          location,
          type,
          experienceMin,
          experienceMax,
          salaryMin: salaryMin ? parseFloat(salaryMin) : null,
          salaryMax: salaryMax ? parseFloat(salaryMax) : null,
          salaryCurrency,
          skills,
          requirements,
          pipelineId: selectedPipelineId !== "none" ? selectedPipelineId : null,
          status: targetStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Job updated! ✅");
      router.push("/hr/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    try {
      await fetch(`/api/jobs/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ARCHIVED" }),
      });
      toast.success("Job archived");
      router.push("/hr/dashboard");
    } catch {
      toast.error("Failed to archive");
    }
  };

  const selectedPipeline = pipelines.find((p) => p.id === selectedPipelineId);

  const getNodeCount = (pipeline: any) => {
    try {
      const nodes = typeof pipeline.nodes === "string"
        ? JSON.parse(pipeline.nodes) : pipeline.nodes;
      return Array.isArray(nodes) ? nodes.length : 0;
    } catch { return 0; }
  };

  if (authLoading || loading) {
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
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/hr/dashboard">
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="font-bold text-slate-800 text-sm">Edit Job</h1>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={`text-[10px] ${
                    status === "PUBLISHED" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                    status === "DRAFT" ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                    status === "CLOSED" ? "bg-red-50 text-red-700 border-red-200" :
                    "bg-slate-50 text-slate-500"
                  }`}
                >
                  {status}
                </Badge>
                <span className="text-[11px] text-slate-400">
                  {applicantCount} applicant{applicantCount !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {status === "PUBLISHED" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSave("CLOSED")}
                disabled={saving}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                Close Job
              </Button>
            )}

            {status === "CLOSED" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSave("PUBLISHED")}
                disabled={saving}
              >
                Republish
              </Button>
            )}

            {status === "DRAFT" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSave("DRAFT")}
                disabled={saving}
              >
                <Save className="w-4 h-4 mr-1" /> Save Draft
              </Button>
            )}

            <Button
              onClick={() => handleSave(status === "DRAFT" ? "PUBLISHED" : status)}
              disabled={saving}
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <Save className="w-4 h-4 mr-1" />
              )}
              {status === "DRAFT" ? "Publish" : "Save Changes"}
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Pipeline Selection */}
        <Card className="border-2 border-indigo-200 bg-indigo-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-indigo-600" />
              Hiring Pipeline
            </CardTitle>
            <CardDescription>
              The hiring pipeline candidates go through when they apply.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedPipelineId} onValueChange={setSelectedPipelineId}>
              <SelectTrigger className="h-11 bg-white">
                <SelectValue placeholder="Choose a pipeline..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <span className="text-slate-400">No pipeline</span>
                </SelectItem>
                {pipelines.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <div className="flex items-center gap-2">
                      <GitBranch className="w-4 h-4 text-indigo-500" />
                      <span>{p.name}</span>
                      <Badge variant="secondary" className="text-[10px] ml-1">
                        {getNodeCount(p)} nodes
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedPipeline && (
              <div className="bg-white rounded-lg border border-indigo-100 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-sm text-slate-700">{selectedPipeline.name}</h4>
                  <Link href={`/pipeline?id=${selectedPipeline.id}`} target="_blank">
                    <Button variant="ghost" size="sm" className="text-xs h-7">
                      <ExternalLink className="w-3 h-3 mr-1" /> Edit
                    </Button>
                  </Link>
                </div>
                <PipelinePreview pipeline={selectedPipeline} />
              </div>
            )}

            {selectedPipelineId === "none" && (
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  A pipeline is required to publish.{" "}
                  <Link href="/pipeline" className="underline font-medium">Create one →</Link>
                </p>
              </div>
            )}

            {selectedPipelineId !== "none" && (
              <div className="flex items-center gap-2 text-xs text-emerald-600">
                <CheckCircle2 className="w-4 h-4" /> Pipeline linked
              </div>
            )}
          </CardContent>
        </Card>

        {/* Job Details */}
        <Card>
          <CardHeader><CardTitle>Job Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Job Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={8} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Department *</Label>
                <Input value={department} onChange={(e) => setDepartment(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Location *</Label>
                <Input value={location} onChange={(e) => setLocation(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Job Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_time">Full Time</SelectItem>
                    <SelectItem value="part_time">Part Time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="internship">Internship</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Min Exp (yrs)</Label>
                <Input type="number" value={experienceMin} onChange={(e) => setExperienceMin(parseInt(e.target.value) || 0)} />
              </div>
              <div className="space-y-2">
                <Label>Max Exp (yrs)</Label>
                <Input type="number" value={experienceMax} onChange={(e) => setExperienceMax(parseInt(e.target.value) || 10)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select value={salaryCurrency} onValueChange={setSalaryCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="INR">INR</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Min Salary</Label>
                <Input type="number" value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Max Salary</Label>
                <Input type="number" value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Skills */}
        <Card>
          <CardHeader><CardTitle>Skills</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
                placeholder="Type a skill and press Enter"
                className="flex-1"
              />
              <Button variant="outline" onClick={addSkill}><Plus className="w-4 h-4" /></Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <Badge key={skill} variant="secondary" className="pl-3 pr-1 py-1 gap-1">
                  {skill}
                  <button onClick={() => setSkills(skills.filter((s) => s !== skill))} className="ml-1 hover:bg-slate-200 rounded-full p-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
              {skills.length === 0 && <p className="text-xs text-slate-400">No skills</p>}
            </div>
          </CardContent>
        </Card>

        {/* Requirements */}
        <Card>
          <CardHeader><CardTitle>Requirements</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={reqInput}
                onChange={(e) => setReqInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRequirement(); } }}
                placeholder="Add requirement and press Enter"
                className="flex-1"
              />
              <Button variant="outline" onClick={addRequirement}><Plus className="w-4 h-4" /></Button>
            </div>
            <ul className="space-y-2">
              {requirements.map((req, i) => (
                <li key={i} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 text-sm">
                  <span>{req}</span>
                  <button onClick={() => setRequirements(requirements.filter((_, idx) => idx !== i))}>
                    <X className="w-4 h-4 text-slate-400 hover:text-red-500" />
                  </button>
                </li>
              ))}
              {requirements.length === 0 && <p className="text-xs text-slate-400">No requirements</p>}
            </ul>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="w-4 h-4 mr-2" /> Archive Job
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Archive this job?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove the job from listings. Existing applications
                    will be preserved. You can&apos;t undo this action.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleArchive} className="bg-red-600 hover:bg-red-700">
                    Archive
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Pipeline preview component
function PipelinePreview({ pipeline }: { pipeline: any }) {
  let nodes: any[] = [];
  try {
    nodes = typeof pipeline.nodes === "string"
      ? JSON.parse(pipeline.nodes) : pipeline.nodes || [];
  } catch { nodes = []; }

  if (nodes.length === 0) return <p className="text-xs text-slate-400">Empty pipeline</p>;

  const sorted = [...nodes].sort((a, b) => (a.position?.x || 0) - (b.position?.x || 0));

  const colors: Record<string, string> = {
    source: "bg-emerald-100 text-emerald-700 border-emerald-200",
    stage: "bg-blue-100 text-blue-700 border-blue-200",
    filter: "bg-amber-100 text-amber-700 border-amber-200",
    logic: "bg-purple-100 text-purple-700 border-purple-200",
    action: "bg-red-100 text-red-700 border-red-200",
    exit: "bg-pink-100 text-pink-700 border-pink-200",
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {sorted.map((node, i) => {
        const data = node.data || {};
        return (
          <React.Fragment key={node.id}>
            <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${colors[data.type] || ""}`}>
              {data.label || node.type}
            </Badge>
            {i < sorted.length - 1 && <span className="text-slate-300 text-xs">→</span>}
          </React.Fragment>
        );
      })}
    </div>
  );
}