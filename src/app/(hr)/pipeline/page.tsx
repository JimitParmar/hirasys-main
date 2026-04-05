"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { PipelineBuilder } from "@/components/pipeline/PipelineBuilder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Loader2, GitBranch } from "lucide-react";
import { Node, Edge } from "@xyflow/react";
import toast from "react-hot-toast";
import Link from "next/link";

function PipelinePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isHR, isLoading: authLoading } = useAuth();

  const [pipelineId, setPipelineId] = useState<string | null>(
    searchParams.get("id")
  );
  const [pipelineName, setPipelineName] = useState("Untitled Pipeline");
  const [linkedJobId, setLinkedJobId] = useState<string>("none");
  const [jobs, setJobs] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [loading, setLoading] = useState(true);

  const [currentNodes, setCurrentNodes] = useState<Node[]>([]);
  const [currentEdges, setCurrentEdges] = useState<Edge[]>([]);

  const [initialNodes, setInitialNodes] = useState<Node[] | undefined>();
  const [initialEdges, setInitialEdges] = useState<Edge[] | undefined>();

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchJobs();
      if (pipelineId) {
        fetchPipeline(pipelineId);
      } else {
        setLoading(false);
      }
    }
  }, [authLoading, isAuthenticated, pipelineId]);

  const fetchJobs = async () => {
    try {
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

        // LOAD the linked job ID
        setLinkedJobId(data.pipeline.linked_job_id || "none");

        const nodes = typeof data.pipeline.nodes === "string"
          ? JSON.parse(data.pipeline.nodes)
          : data.pipeline.nodes;
        const edges = typeof data.pipeline.edges === "string"
          ? JSON.parse(data.pipeline.edges)
          : data.pipeline.edges;

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
        linkedJobId: linkedJobId !== "none" ? linkedJobId : null,
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

      if (pipelineId) {
        body.id = pipelineId;
      }

      const res = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.pipeline?.id) {
        setPipelineId(data.pipeline.id);
      }

      setShowSaveDialog(false);
      toast.success("Pipeline saved! 🎉");
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-4 shrink-0 z-50">
        <div className="flex items-center gap-3">
          <Link href="/hr/dashboard">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
            <GitBranch className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-sm text-slate-800">{pipelineName}</h1>
            <p className="text-[11px] text-slate-400">
              {linkedJobId !== "none"
                ? `Linked to: ${jobs.find((j) => j.id === linkedJobId)?.title || "Job"}`
                : "Not linked to a job"
              }
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Select value={linkedJobId} onValueChange={setLinkedJobId}>
            <SelectTrigger className="h-8 w-[200px] text-xs">
              <SelectValue placeholder="Link to job..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No job linked</SelectItem>
              {jobs.map((job) => (
                <SelectItem key={job.id} value={job.id}>
                  {job.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Link href="/hr/dashboard">
            <Button variant="outline" size="sm">Dashboard</Button>
          </Link>
        </div>
      </header>

      <div className="flex-1">
        <PipelineBuilder
          pipelineId={pipelineId || undefined}
          initialNodes={initialNodes}
          initialEdges={initialEdges}
          onSave={handleSave}
        />
      </div>

      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save Pipeline</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Pipeline Name</Label>
              <Input
                value={pipelineName}
                onChange={(e) => setPipelineName(e.target.value)}
                placeholder="e.g. Engineering Hiring Pipeline"
              />
            </div>
            <div className="space-y-2">
              <Label>Link to Job</Label>
              <Select value={linkedJobId} onValueChange={setLinkedJobId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a job..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No job linked</SelectItem>
                  {jobs.map((job) => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.title} — {job.department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-500">
              {currentNodes.length} nodes • {currentEdges.length} connections
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>Cancel</Button>
            <Button
              onClick={confirmSave}
              disabled={saving || !pipelineName.trim()}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function PipelinePage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    }>
      <PipelinePageInner />
    </Suspense>
  );
}