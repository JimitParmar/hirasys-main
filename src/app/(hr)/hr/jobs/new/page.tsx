"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Plus, X, Loader2, Send, Eye, GitBranch,
  AlertCircle, CheckCircle2, ExternalLink, Share2
} from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";

export default function NewJobPage() {
  const { user } = useAuth();
  const router = useRouter();
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
  const [selectedPortals, setSelectedPortals] = useState<string[]>([]);

  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [requirements, setRequirements] = useState<string[]>([]);
  const [reqInput, setReqInput] = useState("");

  // Fetch pipelines on mount
  useEffect(() => {
    fetchPipelines();
  }, []);

  const fetchPipelines = async () => {
    try {
      const res = await fetch("/api/pipeline");
      const data = await res.json();
      setPipelines(data.pipelines || []);
    } catch (err) {
      console.error("Failed to fetch pipelines:", err);
    }
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

  const handleSave = async (publish: boolean) => {
    if (!title || !description || !department || !location) {
      toast.error("Please fill all required fields");
      return;
    }

    if (publish && selectedPipelineId === "none") {
      toast.error("Please link a pipeline before publishing. Candidates need a hiring process to follow.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
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
          status: publish ? "PUBLISHED" : "DRAFT",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(publish ? "Job published! 🎉" : "Job saved as draft");
      router.push("/hr/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const selectedPipeline = pipelines.find((p) => p.id === selectedPipelineId);
  const getNodeCount = (pipeline: any) => {
    try {
      const nodes = typeof pipeline.nodes === "string"
        ? JSON.parse(pipeline.nodes)
        : pipeline.nodes;
      return Array.isArray(nodes) ? nodes.length : 0;
    } catch {
      return 0;
    }
  };

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
            <h1 className="font-bold text-slate-800">Post New Job</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleSave(false)} disabled={saving}>
              <Eye className="w-4 h-4 mr-2" /> Save Draft
            </Button>
            <Button
              onClick={() => handleSave(true)}
              disabled={saving}
              className="bg-[#0245EF] hover:bg-[#0237BF]"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Publish Job
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Pipeline Selection — FIRST and PROMINENT */}
        <Card className="border-2 border-[#A3BDFF] bg-[#EBF0FF]/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-[#0245EF]" />
              Hiring Pipeline
            </CardTitle>
            <CardDescription>
              Select the hiring pipeline candidates will go through when they apply to this job.
              This defines the stages: screening, assessments, interviews, etc.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="font-medium">Select Pipeline</Label>
              <Select value={selectedPipelineId} onValueChange={setSelectedPipelineId}>
                <SelectTrigger className="h-11 bg-white">
                  <SelectValue placeholder="Choose a pipeline..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="text-slate-400">No pipeline (select later)</span>
                  </SelectItem>
                  {pipelines.map((pipeline) => (
                    <SelectItem key={pipeline.id} value={pipeline.id}>
                      <div className="flex items-center gap-2">
                        <GitBranch className="w-4 h-4 text-[#0245EF]" />
                        <span>{pipeline.name}</span>
                        <Badge variant="secondary" className="text-[10px] ml-1">
                          {getNodeCount(pipeline)} nodes
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Pipeline preview */}
            {selectedPipeline && (
              <div className="bg-white rounded-lg border border-[#D1DEFF] p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-sm text-slate-700">
                    {selectedPipeline.name}
                  </h4>
                  <Link href={`/pipeline?id=${selectedPipeline.id}`} target="_blank">
                    <Button variant="ghost" size="sm" className="text-xs h-7">
                      <ExternalLink className="w-3 h-3 mr-1" /> Edit Pipeline
                    </Button>
                  </Link>
                </div>
                <PipelinePreview pipeline={selectedPipeline} />
              </div>
            )}

            {selectedPipelineId === "none" && (
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    No pipeline selected
                  </p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    You need a pipeline to publish this job. Candidates need a defined
                    hiring process to follow.{" "}
                    <Link href="/pipeline" className="underline font-medium">
                      Create a pipeline →
                    </Link>
                  </p>
                </div>
              </div>
            )}

            {selectedPipelineId !== "none" && (
              <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-emerald-800">
                    Pipeline linked!
                  </p>
                  <p className="text-xs text-emerald-600 mt-0.5">
                    When candidates apply, they&apos;ll go through this pipeline&apos;s
                    stages automatically.
                  </p>
                </div>
              </div>
            )}

            {pipelines.length === 0 && (
              <div className="text-center py-4">
                <GitBranch className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No pipelines created yet</p>
                <Link href="/pipeline">
                  <Button size="sm" className="mt-2 bg-[#0245EF] hover:bg-[#0237BF]">
                    <Plus className="w-4 h-4 mr-1" /> Create Pipeline
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
                {/* External Portals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-[#0245EF]" />
              Publish to Job Portals
            </CardTitle>
            <CardDescription>
              Auto-publish to connected platforms when job goes live.{" "}
              <Link href="/hr/integrations" className="text-[#0245EF] hover:underline">
                Manage integrations →
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PortalToggles
              selectedPortals={selectedPortals}
              onToggle={(portal) => {
                setSelectedPortals((prev) =>
                  prev.includes(portal) ? prev.filter((p) => p !== portal) : [...prev, portal]
                );
              }}
            />
          </CardContent>
        </Card>

        {/* Job Details */}
        <Card>
          <CardHeader>
            <CardTitle>Job Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Job Title *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Senior React Developer"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the role, responsibilities, what makes this opportunity exciting..."
                rows={8}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Department *</Label>
                <Input
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Engineering"
                />
              </div>
              <div className="space-y-2">
                <Label>Location *</Label>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Remote, Bangalore"
                />
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
                <Label>Min Experience (yrs)</Label>
                <Input
                  type="number"
                  value={experienceMin}
                  onChange={(e) => setExperienceMin(parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label>Max Experience (yrs)</Label>
                <Input
                  type="number"
                  value={experienceMax}
                  onChange={(e) => setExperienceMax(parseInt(e.target.value) || 10)}
                />
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
                <Input
                  type="number"
                  value={salaryMin}
                  onChange={(e) => setSalaryMin(e.target.value)}
                  placeholder="e.g. 120000"
                />
              </div>
              <div className="space-y-2">
                <Label>Max Salary</Label>
                <Input
                  type="number"
                  value={salaryMax}
                  onChange={(e) => setSalaryMax(e.target.value)}
                  placeholder="e.g. 180000"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Skills */}
        <Card>
          <CardHeader><CardTitle>Skills Required</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); addSkill(); }
                }}
                placeholder="Type a skill and press Enter"
                className="flex-1"
              />
              <Button variant="outline" onClick={addSkill} type="button">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <Badge key={skill} variant="secondary" className="pl-3 pr-1 py-1 gap-1">
                  {skill}
                  <button
                    onClick={() => setSkills(skills.filter((s) => s !== skill))}
                    className="ml-1 hover:bg-slate-200 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
              {skills.length === 0 && (
                <p className="text-xs text-slate-400">No skills added yet</p>
              )}
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
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); addRequirement(); }
                }}
                placeholder="Add a requirement and press Enter"
                className="flex-1"
              />
              <Button variant="outline" onClick={addRequirement} type="button">
                <Plus className="w-4 h-4" />
              </Button>
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
              {requirements.length === 0 && (
                <p className="text-xs text-slate-400">No requirements added yet</p>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Pipeline preview component — shows nodes as a simple flow
function PipelinePreview({ pipeline }: { pipeline: any }) {
  let nodes: any[] = [];
  try {
    nodes = typeof pipeline.nodes === "string"
      ? JSON.parse(pipeline.nodes)
      : pipeline.nodes || [];
  } catch {
    nodes = [];
  }

  if (nodes.length === 0) {
    return <p className="text-xs text-slate-400">Empty pipeline</p>;
  }

  // Get node labels in order (simple left-to-right by x position)
  const sorted = [...nodes].sort((a, b) => {
    const posA = a.position?.x || 0;
    const posB = b.position?.x || 0;
    return posA - posB;
  });

  const categoryColors: Record<string, string> = {
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
        const color = categoryColors[data.type] || "bg-slate-100 text-slate-700";

        return (
          <React.Fragment key={node.id}>
            <Badge
              variant="outline"
              className={`text-[10px] px-2 py-0.5 ${color}`}
            >
              {data.label || node.type}
              {data.costPerUnit > 0 && (
                <span className="ml-1 opacity-60">${data.costPerUnit}</span>
              )}
              {data.costPerUnit === 0 && data.type === "filter" && (
                <span className="ml-1 opacity-60">FREE</span>
              )}
            </Badge>
            {i < sorted.length - 1 && (
              <span className="text-slate-300 text-xs">→</span>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
function PortalToggles({
  selectedPortals,
  onToggle,
}: {
  selectedPortals: string[];
  onToggle: (portal: string) => void;
}) {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/integrations")
      .then((r) => r.json())
      .then((d) => setIntegrations(d.integrations || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const portals = [
    { id: "linkedin", name: "LinkedIn", icon: "🔗", desc: "Post to LinkedIn Jobs" },
    { id: "indeed", name: "Indeed", icon: "📋", desc: "Post to Indeed" },
    { id: "naukri", name: "Naukri", icon: "🇮🇳", desc: "Post to Naukri.com" },
    { id: "custom_webhook", name: "Webhook", icon: "🔌", desc: "Send to custom URL" },
  ];

  if (loading) {
    return <p className="text-xs text-slate-400">Loading integrations...</p>;
  }

  return (
    <div className="space-y-2">
      {portals.map((portal) => {
        const isConnected = integrations.some((i: any) => i.platform === portal.id);
        const isSelected = selectedPortals.includes(portal.id);

        return (
          <div
            key={portal.id}
            className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
              !isConnected
                ? "bg-slate-50 border-slate-100 opacity-50"
                : isSelected
                  ? "bg-[#EBF0FF] border-[#A3BDFF]"
                  : "bg-slate-50 border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">{portal.icon}</span>
              <div>
                <p className="text-sm font-medium text-slate-700">{portal.name}</p>
                <p className="text-[10px] text-slate-400">
                  {isConnected ? (
                    <span className="text-emerald-600">✓ Connected — {portal.desc}</span>
                  ) : (
                    <span>
                      Not connected —{" "}
                      <Link href="/hr/integrations" className="text-[#0245EF] hover:underline">
                        Set up →
                      </Link>
                    </span>
                  )}
                </p>
              </div>
            </div>

            {isConnected ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggle(portal.id);
                }}
                className={`
                  relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-200
                  ${isSelected ? "bg-[#0245EF]" : "bg-slate-300"}
                `}
              >
                <span
                  className={`
                    pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200
                    ${isSelected ? "translate-x-5" : "translate-x-0"}
                  `}
                />
              </button>
            ) : (
              <span className="text-[10px] text-slate-400 px-2 py-1 bg-slate-100 rounded">
                Setup required
              </span>
            )}
          </div>
        );
      })}

      {integrations.length === 0 && (
        <div className="text-center py-4 bg-slate-50 rounded-lg">
          <p className="text-sm text-slate-500">No integrations configured</p>
          <Link href="/hr/integrations">
            <Button variant="outline" size="sm" className="mt-2 text-xs">
              Set Up Integrations →
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}