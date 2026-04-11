"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { PipelineBuilder } from "@/components/pipeline/PipelineBuilder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ArrowLeft, Save, Loader2, GitBranch } from "lucide-react";
import { Node, Edge } from "@xyflow/react";
import toast from "react-hot-toast";
import Link from "next/link";

function PipelinePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isHR, isLoading: authLoading } = useAuth();

  const [pipelineId, setPipelineId] = useState<string | null>(
    searchParams.get("id")
  );
  const [pipelineName, setPipelineName] = useState("Untitled Pipeline");
  const [linkedJobIds, setLinkedJobIds] = useState<string[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [loading, setLoading] = useState(true);

  const [currentNodes, setCurrentNodes] = useState<Node[]>([]);
  const [currentEdges, setCurrentEdges] = useState<Edge[]>([]);

  const [initialNodes, setInitialNodes] = useState<Node[] | undefined>();
  const [initialEdges, setInitialEdges] = useState<Edge[] | undefined>();

  useEffect(() => {
    if (!authLoading && isAuthenticated && isHR) {
      fetchJobs();
      if (pipelineId) {
        fetchPipeline(pipelineId);
      } else {
        setLoading(false);
      }
    } else if (!authLoading && (!isAuthenticated || !isHR)) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, isHR, pipelineId]);

  const fetchJobs = async () => {
    try {
      // This now returns ALL company jobs (not just current user's)
      const res = await fetch("/api/jobs");
      const data = await res.json();
      setJobs(data.jobs || []);
    } catch (err) {
      console.error("Failed to fetch jobs:", err);
    }
  };

  const fetchPipeline = async (id: string) => {
    try {
      const res = await fetch(`/api/pipeline?id=${id}`);
      const data = await res.json();

      if (data.pipeline) {
        setPipelineName(data.pipeline.name || "Untitled Pipeline");

        // Load linked job IDs
        let linkedIds: string[] = [];

        // From linked_job_id field
        const linked = data.pipeline.linked_job_id;
        if (linked) {
          try {
            const parsed = typeof linked === "string" && linked.startsWith("[")
              ? JSON.parse(linked) : linked;
            linkedIds = Array.isArray(parsed) ? parsed : [parsed];
          } catch {
            linkedIds = [linked];
          }
        }

        // From linked_jobs array
        if (data.pipeline.linked_jobs) {
          let linkedJobs = data.pipeline.linked_jobs;
          try {
            if (typeof linkedJobs === "string") linkedJobs = JSON.parse(linkedJobs);
          } catch {}
          if (Array.isArray(linkedJobs)) {
            const jobIdsFromArray = linkedJobs
              .filter((j: any) => j && j.id)
              .map((j: any) => j.id);
            linkedIds = [...new Set([...linkedIds, ...jobIdsFromArray])];
          }
        }

        // Also check jobs that reference this pipeline
        try {
          const jobsRes = await fetch("/api/jobs");
          const jobsData = await jobsRes.json();
          const pipelineJobIds = (jobsData.jobs || [])
            .filter((j: any) => j.pipeline_id === id)
            .map((j: any) => j.id);
          linkedIds = [...new Set([...linkedIds, ...pipelineJobIds])];
        } catch {}

        setLinkedJobIds(linkedIds.filter(Boolean));

        // Load nodes and edges
        const nodes = typeof data.pipeline.nodes === "string"
          ? JSON.parse(data.pipeline.nodes) : data.pipeline.nodes;
        const edges = typeof data.pipeline.edges === "string"
          ? JSON.parse(data.pipeline.edges) : data.pipeline.edges;

        if (Array.isArray(nodes) && nodes.length > 0) {
          setInitialNodes(nodes);
          setInitialEdges(edges || []);
        }
      }
    } catch (err) {
      console.error("Failed to fetch pipeline:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (nodes: Node[], edges: Edge[]) => {
    setCurrentNodes(nodes);
    setCurrentEdges(edges);
    setShowSaveDialog(true);
  };

  const confirmSave = async () => {
    setSaving(true);
    try {
      const body: any = {
        name: pipelineName,
        linkedJobIds: linkedJobIds.filter((id) => id && id !== "none"),
        nodes: currentNodes.map((n) => ({
          id: n.id,
          type: n.type,
          position: n.position,
          data: n.data,
        })),
        edges: currentEdges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle,
          targetHandle: e.targetHandle,
        })),
        estimatedCost: 0,
      };

      if (pipelineId) body.id = pipelineId;

      const res = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.pipeline?.id) setPipelineId(data.pipeline.id);

      setShowSaveDialog(false);
      toast.success("Pipeline saved! 🎉");
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const toggleJob = (jobId: string) => {
    setLinkedJobIds((prev) =>
      prev.includes(jobId)
        ? prev.filter((id) => id !== jobId)
        : [...prev, jobId]
    );
  };

  if (authLoading || loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0245EF]" />
      </div>
    );
  }

  // Get linked job names for header
  const linkedJobNames = linkedJobIds
    .map((id) => jobs.find((j) => j.id === id)?.title)
    .filter(Boolean);

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-4 shrink-0 z-50">
        <div className="flex items-center gap-3">
          <Link href="/hr/dashboard">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="w-7 h-7 bg-gradient-to-br from-[#0245EF] to-[#5B3FE6] rounded-lg flex items-center justify-center">
            <GitBranch className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-sm text-slate-800">{pipelineName}</h1>
            <p className="text-[11px] text-slate-400">
              {linkedJobIds.length > 0
                ? `${linkedJobIds.length} job${linkedJobIds.length > 1 ? "s" : ""}: ${linkedJobNames.slice(0, 2).join(", ")}${linkedJobNames.length > 2 ? ` +${linkedJobNames.length - 2} more` : ""}`
                : "Not linked to any job"
              }
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/hr/dashboard">
            <Button variant="outline" size="sm">Dashboard</Button>
          </Link>
        </div>
      </header>

      {/* Pipeline Builder */}
      <div className="flex-1">
        <PipelineBuilder
          pipelineId={pipelineId || undefined}
          initialNodes={initialNodes}
          initialEdges={initialEdges}
          onSave={handleSave}
        />
      </div>

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="w-5 h-5 text-[#0245EF]" />
              Save Pipeline
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Name */}
            <div className="space-y-2">
              <Label>Pipeline Name</Label>
              <Input
                value={pipelineName}
                onChange={(e) => setPipelineName(e.target.value)}
                placeholder="e.g. Engineering Hiring Pipeline"
              />
            </div>

            {/* Job Multi-Select */}
            <div className="space-y-2">
              <Label className="flex items-center justify-between">
                <span>Link to Jobs</span>
                <span className="text-xs text-slate-400 font-normal">
                  {linkedJobIds.length} selected
                </span>
              </Label>
              <p className="text-xs text-slate-400">
                Select jobs that will use this pipeline. Assessment questions auto-generate based on each job&apos;s description.
              </p>

              <div className="border rounded-lg divide-y max-h-[300px] overflow-y-auto">
                {jobs.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-sm text-slate-500">No jobs created yet</p>
                    <Link href="/hr/jobs/new" className="text-xs text-[#0245EF] hover:underline mt-1 inline-block">
                      Create a job →
                    </Link>
                  </div>
                ) : (
                  jobs.map((job) => {
                    const isSelected = linkedJobIds.includes(job.id);
                    return (
                      <button
                        key={job.id}
                        type="button"
                        onClick={() => toggleJob(job.id)}
                        className={`w-full flex items-center justify-between p-3 text-left transition-colors ${
                          isSelected ? "bg-[#EBF0FF]" : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all shrink-0 ${
                              isSelected
                                ? "bg-[#0245EF] border-[#0245EF]"
                                : "border-slate-300"
                            }`}
                          >
                            {isSelected && (
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <div>
                            <p className={`text-sm font-medium ${isSelected ? "text-[#0245EF]" : "text-slate-700"}`}>
                              {job.title}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {job.department} • {job.location}
                              {(job._count?.applications || 0) > 0 && ` • ${job._count.applications} applicants`}
                              {job.poster?.firstName && (
                                <span className="text-slate-300"> • by {job.poster.firstName}</span>
                              )}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[10px] shrink-0 ${
                            job.status === "PUBLISHED"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : job.status === "DRAFT"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "text-slate-400"
                          }`}
                        >
                          {job.status}
                        </Badge>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Select all / Deselect all */}
              {jobs.length > 0 && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setLinkedJobIds(jobs.map((j) => j.id))}
                    className="text-[10px] text-[#0245EF] hover:underline"
                  >
                    Select all
                  </button>
                  <span className="text-[10px] text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => setLinkedJobIds([])}
                    className="text-[10px] text-slate-400 hover:underline"
                  >
                    Deselect all
                  </button>
                </div>
              )}

              {/* Reusable pipeline info */}
              {linkedJobIds.length > 1 && (
                <div className="bg-[#EBF0FF] border border-[#A3BDFF] rounded-lg p-3 text-xs text-[#02298F] space-y-1">
                  <p className="font-semibold">✨ Reusable Pipeline</p>
                  <p>
                    Same pipeline structure for {linkedJobIds.length} jobs.
                    Coding questions will auto-generate based on each job&apos;s
                    unique description and required skills.
                  </p>
                </div>
              )}

              {linkedJobIds.length === 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                  ⚠️ No jobs linked. You can link jobs later from the job creation page.
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-500 flex items-center justify-between">
              <span>{currentNodes.length} nodes • {currentEdges.length} connections</span>
              {linkedJobIds.length > 0 && (
                <span className="text-[#0245EF] font-medium">
                  {linkedJobIds.length} job{linkedJobIds.length > 1 ? "s" : ""} linked
                </span>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmSave}
              disabled={saving || !pipelineName.trim()}
              className="bg-[#0245EF] hover:bg-[#0237BF]"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Pipeline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function PipelinePage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#0245EF]" />
        </div>
      }
    >
      <PipelinePageInner />
    </Suspense>
  );
}