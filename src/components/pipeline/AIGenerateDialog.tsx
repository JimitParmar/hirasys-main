"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Sparkles, Loader2, Wand2, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerated: (nodes: any[], edges: any[], name: string) => void;
}

const EXAMPLES = [
  "Hire a senior React developer. Need coding test, AI interview, and team interview.",
  "Fast hiring for 5 junior interns. Keep it simple — just resume screen and a quick quiz.",
  "Senior backend engineer with system design focus. High bar — only top candidates should pass.",
  "Hiring a data scientist. Need Python coding test, ML knowledge quiz, and behavioral interview.",
  "Full-stack developer role with 500+ expected applicants. Need strict filtering.",
  "DevOps engineer — test Docker, Kubernetes, CI/CD. Include SQL assessment.",
  "Product manager hiring — no coding, focus on case study and behavioral interviews.",
  "Bulk hiring 20 customer support agents — quick screen and basic assessment only.",
];

export function AIGenerateDialog({ open, onOpenChange, onGenerated }: Props) {
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleGenerate = async () => {
    if (!prompt.trim() || prompt.trim().length < 10) {
      toast.error("Please describe what you need (at least 10 characters)");
      return;
    }

    setGenerating(true);
    setResult(null);

    try {
      const res = await fetch("/api/pipeline/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setResult(data);
      toast.success("Pipeline generated! Review and apply.");
    } catch (err: any) {
      toast.error(err.message || "Generation failed. Try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleApply = () => {
    if (result?.nodes && result?.edges) {
      onGenerated(result.nodes, result.edges, result.pipeline?.name || "AI Generated Pipeline");
      onOpenChange(false);
      setPrompt("");
      setResult(null);
      toast.success("Pipeline applied to canvas! 🎉");
    }
  };

  const useExample = (example: string) => {
    setPrompt(example);
    setResult(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-[#0245EF]" />
            AI Pipeline Generator
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Prompt input */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Describe the hiring process you need
            </Label>
            <Textarea
              value={prompt}
              onChange={(e) => { setPrompt(e.target.value); setResult(null); }}
              placeholder="e.g., I need to hire a senior React developer. We expect 700+ applicants. Need coding assessment with JavaScript and Python, AI technical interview, and a final team interview. Only top performers should make it through."
              rows={4}
              className="text-sm"
            />
          </div>

          {/* Example prompts */}
          {!result && (
            <div className="space-y-2">
              <Label className="text-xs text-slate-500">Try an example:</Label>
              <div className="flex flex-wrap gap-2">
                {EXAMPLES.map((example, i) => (
                  <button
                    key={i}
                    onClick={() => useExample(example)}
                    className="text-xs px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 hover:bg-[#EBF0FF] hover:text-[#0245EF] transition-colors text-left"
                  >
                    {example.length > 60 ? example.substring(0, 60) + "..." : example}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Generate button */}
          {!result && (
            <Button
              onClick={handleGenerate}
              disabled={generating || prompt.trim().length < 10}
              className="w-full bg-[#0245EF] hover:bg-[#0237BF]"
              size="lg"
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Designing your pipeline...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate Pipeline
                </>
              )}
            </Button>
          )}

          {/* Result preview */}
          {result && (
            <div className="space-y-4">
              <div className="bg-[#EBF0FF] border border-[#A3BDFF] rounded-xl p-4">
                <h3 className="font-semibold text-[#011B5F] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#0245EF]" />
                  {result.pipeline?.name}
                </h3>
                {result.pipeline?.description && (
                  <p className="text-sm text-[#02298F] mt-1">{result.pipeline.description}</p>
                )}
              </div>

              {/* Pipeline flow preview */}
              <div className="space-y-2">
                <Label className="text-xs text-slate-500">Pipeline Flow</Label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {result.nodes?.map((node: any, i: number) => {
                    const data = node.data || {};
                    const colorMap: Record<string, string> = {
                      source: "bg-emerald-100 text-emerald-700 border-emerald-200",
                      stage: "bg-blue-100 text-blue-700 border-blue-200",
                      filter: "bg-amber-100 text-amber-700 border-amber-200",
                      exit: "bg-pink-100 text-pink-700 border-pink-200",
                    };
                    return (
                      <React.Fragment key={node.id}>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-2 py-0.5 ${colorMap[data.type] || ""}`}
                        >
                          {data.label}
                          {data.costPerUnit > 0 && (
                            <span className="ml-1 opacity-60">${data.costPerUnit}</span>
                          )}
                          {data.type === "filter" && " (FREE)"}
                        </Badge>
                        {i < result.nodes.length - 1 && (
                          <ArrowRight className="w-3 h-3 text-slate-300" />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-slate-700">
                    {result.nodes?.filter((n: any) => n.data?.type === "stage").length || 0}
                  </p>
                  <p className="text-[10px] text-slate-500">Stages</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-slate-700">
                    {result.nodes?.filter((n: any) => n.data?.type === "filter").length || 0}
                  </p>
                  <p className="text-[10px] text-slate-500">Filters (Free)</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-slate-700">{result.nodes?.length || 0}</p>
                  <p className="text-[10px] text-slate-500">Total Nodes</p>
                </div>
              </div>

              {/* AI Reasoning */}
              {result.pipeline?.reasoning && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-slate-600 mb-1">💡 Why this design</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{result.pipeline.reasoning}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {result ? (
            <div className="flex gap-2 w-full">
              <Button
                variant="outline"
                onClick={() => { setResult(null); }}
                className="flex-1"
              >
                Regenerate
              </Button>
              <Button
                onClick={handleApply}
                className="flex-1 bg-[#0245EF] hover:bg-[#0237BF]"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Apply to Canvas
              </Button>
            </div>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}