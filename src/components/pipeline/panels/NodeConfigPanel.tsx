"use client";

import React, { useState, useEffect } from "react";
import { Node } from "@xyflow/react";
import { PipelineNodeData } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import toast from "react-hot-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { X, Trash2, Info, CheckCircle2, Loader2, RefreshCw, Sparkles } from "lucide-react";

interface NodeConfigPanelProps {
  node: Node;
  onChange: (nodeId: string, data: Partial<PipelineNodeData>) => void;
  onDelete: (nodeId: string) => void;
  onClose: () => void;
}

export function NodeConfigPanel({
  node,
  onChange,
  onDelete,
  onClose,
}: NodeConfigPanelProps) {
  // Extract node data safely
  const data: PipelineNodeData = node.data as PipelineNodeData;

  // Local config state for immediate UI feedback
  const [localConfig, setLocalConfig] = useState<Record<string, any>>(
    data?.config ? JSON.parse(JSON.stringify(data.config)) : {}
  );
  const [localLabel, setLocalLabel] = useState(data?.label || "");

  // Sync when node changes
  useEffect(() => {
    if (data?.config) {
      setLocalConfig(JSON.parse(JSON.stringify(data.config)));
    }
    if (data?.label) {
      setLocalLabel(data.label);
    }
  }, [node]);

  // Update config and propagate to parent
  const updateConfig = (key: string, value: any) => {
    const newConfig = { ...localConfig, [key]: value };
    setLocalConfig(newConfig);
    onChange(node.id, { config: newConfig });
  };

  const updateNestedConfig = (parentKey: string, key: string, value: any) => {
    const parent = localConfig[parentKey] || {};
    const newParent = { ...parent, [key]: value };
    const newConfig = { ...localConfig, [parentKey]: newParent };
    setLocalConfig(newConfig);
    onChange(node.id, { config: newConfig });
  };

  const updateLabel = (label: string) => {
    setLocalLabel(label);
    onChange(node.id, { label });
  };

  if (!data) {
    return null;
  }

  return (
    <div className="h-full w-[380px] bg-white border-l border-slate-200 shadow-2xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${data.color || "#94A3B8"}20` }}
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: data.color || "#94A3B8" }}
            />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-slate-700">
              {data.label}
            </h3>
            <p className="text-[11px] text-slate-400">
              {data.type} • {data.subtype?.replace(/_/g, " ")}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Common: Label */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Basic Settings
            </Label>
            <div className="space-y-2">
              <Label htmlFor="nodeLabel" className="text-sm">
                Node Label
              </Label>
              <Input
                id="nodeLabel"
                value={localLabel}
                onChange={(e) => updateLabel(e.target.value)}
                className="h-9"
              />
            </div>

            {/* Cost indicator */}
            {data.costPerUnit > 0 ? (
              <div className="flex items-center justify-between bg-slate-50 rounded-lg p-3">
                <span className="text-sm text-slate-600">
                  Cost per candidate
                </span>
                <Badge variant="outline" className="font-mono">
                  ${data.costPerUnit}
                </Badge>
              </div>
            ) : data.type === "filter" || data.type === "logic" ? (
              <div className="flex items-center justify-between bg-green-50 rounded-lg p-3">
                <span className="text-sm text-green-700 font-medium">
                  Cost
                </span>
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                  FREE ✨
                </Badge>
              </div>
            ) : null}
          </div>

          <Separator />

          {/* Type-specific config */}
          {renderNodeConfig(data, localConfig, updateConfig, updateNestedConfig)}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-slate-100 flex justify-between bg-slate-50">
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onDelete(node.id)}
          className="h-9"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete
        </Button>
        <Button size="sm" onClick={onClose} className="h-9">
          Done
        </Button>
      </div>
    </div>
  );
}

// ==========================================
// NODE TYPE CONFIGURATIONS
// ==========================================

function renderNodeConfig(
  data: PipelineNodeData,
  config: Record<string, any>,
  updateConfig: (key: string, value: any) => void,
  updateNestedConfig: (parentKey: string, key: string, value: any) => void
) {
  switch (data.subtype) {
    case "top_n":
      return <TopNConfig config={config} updateConfig={updateConfig} updateNestedConfig={updateNestedConfig} />;
    case "score_gate":
      return <ScoreGateConfig config={config} updateConfig={updateConfig} updateNestedConfig={updateNestedConfig} />;
    case "percentage":
      return <PercentageConfig config={config} updateConfig={updateConfig} updateNestedConfig={updateNestedConfig} />;
    case "hybrid":
      return <HybridConfig config={config} updateConfig={updateConfig} updateNestedConfig={updateNestedConfig} />;
    case "human_approval":
      return <HumanApprovalConfig config={config} updateConfig={updateConfig} />;
    case "ai_resume_screen":
      return <ResumeScreenConfig config={config} updateConfig={updateConfig} />;
    case "coding_assessment":
      return <CodingAssessmentConfig config={config} updateConfig={updateConfig} />;
    case "mcq_assessment":
      return <MCQConfig config={config} updateConfig={updateConfig} />;
    case "ai_technical_interview":
    case "ai_behavioral_interview":
      return <AIInterviewConfig config={config} updateConfig={updateConfig} />;
    case "f2f_interview":
    case "panel_interview":
      return <F2FInterviewConfig config={config} updateConfig={updateConfig} isPanel={data.subtype === "panel_interview"} />;
    case "send_email":
      return <EmailConfig config={config} updateConfig={updateConfig} />;
    case "rejection":
      return <RejectionConfig config={config} updateConfig={updateConfig} />;
    case "offer":
      return <OfferConfig config={config} updateConfig={updateConfig} />;
    default:
      return (
        <div className="text-sm text-slate-400 text-center py-8">
          <p>No additional configuration needed.</p>
        </div>
      );
  }
}

// ==========================================
// FILTER CONFIGS
// ==========================================

function TopNConfig({
  config,
  updateConfig,
  updateNestedConfig,
}: {
  config: any;
  updateConfig: (k: string, v: any) => void;
  updateNestedConfig: (p: string, k: string, v: any) => void;
}) {
  return (
    <div className="space-y-5">
      <SectionTitle>Top-N Filter Settings</SectionTitle>

      <div className="space-y-2">
        <Label className="text-sm font-medium">
          How many candidates pass through?
        </Label>
        <div className="flex items-center gap-3">
          <Slider
            value={[config.n || 50]}
            onValueChange={([v]) => updateConfig("n", v)}
            min={1}
            max={500}
            step={1}
            className="flex-1"
          />
          <Input
            type="number"
            value={config.n || 50}
            onChange={(e) =>
              updateConfig("n", parseInt(e.target.value) || 1)
            }
            className="w-20 h-9 font-mono text-center"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Rank candidates by</Label>
        <Select
          value={config.rankBy || "previous_stage_score"}
          onValueChange={(v) => updateConfig("rankBy", v)}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="previous_stage_score">
              Previous Stage Score
            </SelectItem>
            <SelectItem value="resume_score">Resume Score</SelectItem>
            <SelectItem value="overall_score">
              Overall Average Score
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Tiebreaker (optional)</Label>
        <Select
          value={config.tiebreaker || "none"}
          onValueChange={(v) =>
            updateConfig("tiebreaker", v === "none" ? undefined : v)
          }
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No tiebreaker</SelectItem>
            <SelectItem value="resume_score">Resume Score</SelectItem>
            <SelectItem value="experience">Years of Experience</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator />
      <SectionTitle>Batch Settings</SectionTitle>

      <div className="space-y-2">
        <Label className="text-sm font-medium">When to evaluate</Label>
        <Select
          value={config.batchMode || "count_or_time"}
          onValueChange={(v) => updateConfig("batchMode", v)}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all_complete">
              After all candidates complete previous stage
            </SelectItem>
            <SelectItem value="count_or_time">
              After N candidates OR X days
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config.batchMode === "count_or_time" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Candidate count</Label>
            <Input
              type="number"
              value={config.batchCount || 100}
              onChange={(e) =>
                updateConfig("batchCount", parseInt(e.target.value) || 100)
              }
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">OR days to wait</Label>
            <Input
              type="number"
              value={config.batchDays || 7}
              onChange={(e) =>
                updateConfig("batchDays", parseInt(e.target.value) || 7)
              }
              className="h-9"
            />
          </div>
        </div>
      )}

      <Separator />
      <SectionTitle>Fast-Track (Optional)</SectionTitle>

      <ToggleRow
        label="Enable fast-track for top performers"
        checked={config.fastTrack?.enabled || false}
        onChange={(v) => updateNestedConfig("fastTrack", "enabled", v)}
      />

      {config.fastTrack?.enabled && (
        <div className="space-y-2 pl-1">
          <Label className="text-sm">Fast-track if score ≥</Label>
          <div className="flex items-center gap-3">
            <Slider
              value={[config.fastTrack?.threshold || 90]}
              onValueChange={([v]) =>
                updateNestedConfig("fastTrack", "threshold", v)
              }
              min={50}
              max={100}
              step={1}
              className="flex-1"
            />
            <span className="text-sm font-mono w-10 text-right font-semibold">
              {config.fastTrack?.threshold || 90}
            </span>
          </div>
          <HintBox>
            Candidates scoring above this pass immediately without waiting for
            the batch.
          </HintBox>
        </div>
      )}

      <Separator />
      <FilteredActionsConfig
        config={config}
        updateNestedConfig={updateNestedConfig}
      />
    </div>
  );
}

function ScoreGateConfig({
  config,
  updateConfig,
  updateNestedConfig,
}: {
  config: any;
  updateConfig: (k: string, v: any) => void;
  updateNestedConfig: (p: string, k: string, v: any) => void;
}) {
  return (
    <div className="space-y-5">
      <SectionTitle>Score Gate Settings</SectionTitle>

      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Minimum score to pass
        </Label>
        <div className="flex items-center gap-3">
          <Slider
            value={[config.minScore || 70]}
            onValueChange={([v]) => updateConfig("minScore", v)}
            min={0}
            max={100}
            step={1}
            className="flex-1"
          />
          <span className="text-lg font-mono font-bold text-slate-700 w-10 text-right">
            {config.minScore || 70}
          </span>
        </div>
        <div className="flex justify-between text-[10px] text-slate-400 px-1">
          <span>Lenient (more pass)</span>
          <span>Strict (fewer pass)</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Score source</Label>
        <Select
          value={config.scoreSource || "previous_stage_score"}
          onValueChange={(v) => updateConfig("scoreSource", v)}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="previous_stage_score">
              Previous Stage Score
            </SelectItem>
            <SelectItem value="resume_score">Resume Score</SelectItem>
            <SelectItem value="overall_score">Overall Average</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg">
        <p className="text-xs text-blue-700 flex items-start gap-2">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Score gates evaluate candidates <strong>in real-time</strong> — no
            waiting for batch. Anyone scoring ≥{config.minScore || 70} passes
            immediately.
          </span>
        </p>
      </div>

      <Separator />
      <FilteredActionsConfig
        config={config}
        updateNestedConfig={updateNestedConfig}
      />
    </div>
  );
}

function PercentageConfig({
  config,
  updateConfig,
  updateNestedConfig,
}: {
  config: any;
  updateConfig: (k: string, v: any) => void;
  updateNestedConfig: (p: string, k: string, v: any) => void;
}) {
  return (
    <div className="space-y-5">
      <SectionTitle>Top % Filter Settings</SectionTitle>

      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Top percentage to pass
        </Label>
        <div className="flex items-center gap-3">
          <Slider
            value={[config.percentage || 25]}
            onValueChange={([v]) => updateConfig("percentage", v)}
            min={1}
            max={100}
            step={1}
            className="flex-1"
          />
          <span className="text-lg font-mono font-bold text-slate-700 w-14 text-right">
            {config.percentage || 25}%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-slate-500">Minimum to pass</Label>
          <Input
            type="number"
            value={config.minPass || 3}
            onChange={(e) =>
              updateConfig("minPass", parseInt(e.target.value) || 1)
            }
            className="h-9"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-slate-500">Maximum to pass</Label>
          <Input
            type="number"
            value={config.maxPass || 100}
            onChange={(e) =>
              updateConfig("maxPass", parseInt(e.target.value) || 100)
            }
            className="h-9"
          />
        </div>
      </div>

      <Separator />
      <FilteredActionsConfig
        config={config}
        updateNestedConfig={updateNestedConfig}
      />
    </div>
  );
}

function HybridConfig({
  config,
  updateConfig,
  updateNestedConfig,
}: {
  config: any;
  updateConfig: (k: string, v: any) => void;
  updateNestedConfig: (p: string, k: string, v: any) => void;
}) {
  return (
    <div className="space-y-5">
      <SectionTitle>Hybrid Filter Settings</SectionTitle>

      <div className="bg-purple-50 border border-purple-100 p-3 rounded-lg space-y-1">
        <p className="text-xs font-semibold text-purple-700">
          How Hybrid works:
        </p>
        <p className="text-xs text-purple-600">
          ① Candidates scoring ≥ threshold pass <strong>immediately</strong>
        </p>
        <p className="text-xs text-purple-600">
          ② Remaining are batched — top N from batch also pass
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Fast-track threshold</Label>
        <div className="flex items-center gap-3">
          <Slider
            value={[config.fastTrackThreshold || 85]}
            onValueChange={([v]) => updateConfig("fastTrackThreshold", v)}
            min={50}
            max={100}
            step={1}
            className="flex-1"
          />
          <span className="text-sm font-mono w-10 text-right font-semibold">
            ≥{config.fastTrackThreshold || 85}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Batch: pick top N from remaining
        </Label>
        <Input
          type="number"
          value={config.batchN || 40}
          onChange={(e) =>
            updateConfig("batchN", parseInt(e.target.value) || 10)
          }
          className="h-9"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Rank by</Label>
        <Select
          value={config.rankBy || "previous_stage_score"}
          onValueChange={(v) => updateConfig("rankBy", v)}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="previous_stage_score">
              Previous Stage Score
            </SelectItem>
            <SelectItem value="resume_score">Resume Score</SelectItem>
            <SelectItem value="overall_score">Overall Average</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator />
      <FilteredActionsConfig
        config={config}
        updateNestedConfig={updateNestedConfig}
      />
    </div>
  );
}

function HumanApprovalConfig({
  config,
  updateConfig,
}: {
  config: any;
  updateConfig: (k: string, v: any) => void;
}) {
  return (
    <div className="space-y-5">
      <SectionTitle>Human Approval Settings</SectionTitle>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Who approves?</Label>
        <Select
          value={config.approverRole || "HR"}
          onValueChange={(v) => updateConfig("approverRole", v)}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="HR">HR Manager</SelectItem>
            <SelectItem value="HIRING_MANAGER">Hiring Manager</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Deadline (days)</Label>
        <Input
          type="number"
          value={config.deadline || 3}
          onChange={(e) =>
            updateConfig("deadline", parseInt(e.target.value) || 1)
          }
          className="h-9"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">If no action taken</Label>
        <Select
          value={config.autoAction || "hold"}
          onValueChange={(v) => updateConfig("autoAction", v)}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hold">Hold (wait for decision)</SelectItem>
            <SelectItem value="advance">Auto-advance after deadline</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Show to approver</Label>
        <div className="space-y-2">
          {[
            { key: "resume_score", label: "Resume Score" },
            { key: "assessment_score", label: "Assessment Score" },
            { key: "ai_analysis", label: "AI Analysis Summary" },
            { key: "resume_data", label: "Resume Details" },
            { key: "interview_score", label: "Interview Score" },
          ].map(({ key, label }) => (
            <ToggleRow
              key={key}
              label={label}
              checked={(config.showData || []).includes(key)}
              onChange={(checked) => {
                const current = config.showData || [];
                updateConfig(
                  "showData",
                  checked
                    ? [...current, key]
                    : current.filter((f: string) => f !== key)
                );
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// STAGE CONFIGS
// ==========================================

function ResumeScreenConfig({
  config,
  updateConfig,
}: {
  config: any;
  updateConfig: (k: string, v: any) => void;
}) {
  return (
    <div className="space-y-5">
      <SectionTitle>AI Resume Screening</SectionTitle>
      <div className="space-y-2">
        <Label className="text-sm font-medium">Scoring criteria</Label>
        {[
          { key: "skills_match", label: "Skills Match" },
          { key: "experience", label: "Relevant Experience" },
          { key: "education", label: "Education" },
          { key: "project_relevance", label: "Project Relevance" },
          { key: "culture_keywords", label: "Culture Keywords" },
        ].map(({ key, label }) => (
          <ToggleRow
            key={key}
            label={label}
            checked={(config.criteria || []).includes(key)}
            onChange={(checked) => {
              const current = config.criteria || [];
              updateConfig(
                "criteria",
                checked
                  ? [...current, key]
                  : current.filter((c: string) => c !== key)
              );
            }}
          />
        ))}
      </div>
    </div>
  );
}

function CodingAssessmentConfig({
  config,
  updateConfig,
}: {
  config: any;
  updateConfig: (k: string, v: any) => void;
}) {
  const [generating, setGenerating] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const questions = config.questions || [];

  const generateQuestions = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/assessments/generate-for-node", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "coding",
          difficulty: config.difficulty || "medium",
          questionCount: config.questionCount || 3,
          languages: config.languages || ["javascript", "python"],
        }),
      });
      const data = await res.json();
      if (data.questions) {
        updateConfig("questions", data.questions);
        toast.success(`Generated ${data.questions.length} questions!`);
      }
    } catch {
      toast.error("Failed to generate");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <SectionTitle>Coding Assessment</SectionTitle>

      <div className="space-y-2">
        <Label className="text-sm">Duration (minutes)</Label>
        <Input
          type="number"
          value={config.duration || 90}
          onChange={(e) => updateConfig("duration", parseInt(e.target.value) || 30)}
          min={15}
          max={180}
          className="h-9"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm">Difficulty</Label>
        <Select
          value={config.difficulty || "medium"}
          onValueChange={(v) => updateConfig("difficulty", v)}
        >
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="easy">Easy</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="hard">Hard</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-sm">Number of Questions</Label>
        <Input
          type="number"
          value={config.questionCount || 3}
          onChange={(e) => updateConfig("questionCount", parseInt(e.target.value) || 1)}
          min={1}
          max={10}
          className="h-9"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm">Languages</Label>
        {["javascript", "python", "typescript", "java", "cpp"].map((lang) => (
          <ToggleRow
            key={lang}
            label={lang.charAt(0).toUpperCase() + lang.slice(1)}
            checked={(config.languages || []).includes(lang)}
            onChange={(checked) => {
              const current = config.languages || [];
              updateConfig("languages",
                checked ? [...current, lang] : current.filter((l: string) => l !== lang)
              );
            }}
          />
        ))}
      </div>

      <Separator />
      <SectionTitle>Questions</SectionTitle>

      {questions.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-emerald-600 font-medium">
              ✅ {questions.length} questions ready
            </span>
            <Button
              variant="ghost" size="sm" className="text-xs h-7"
              onClick={() => setPreviewOpen(!previewOpen)}
            >
              {previewOpen ? "Hide" : "Preview"}
            </Button>
          </div>

          {previewOpen && (
            <div className="space-y-2 max-h-[250px] overflow-y-auto">
              {questions.map((q: any, i: number) => (
                <div key={i} className="bg-slate-50 rounded-lg p-2 text-xs">
                  <p className="font-medium text-slate-700">Q{i + 1}: {q.title}</p>
                  <p className="text-slate-400 mt-0.5">{q.difficulty} • {q.points} pts • {q.testCases?.length || 0} tests</p>
                </div>
              ))}
            </div>
          )}

          <Button
            variant="outline" size="sm" className="w-full text-xs"
            onClick={generateQuestions} disabled={generating}
          >
            {generating ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
            Regenerate
          </Button>
        </div>
      ) : (
        <Button
          className="w-full bg-purple-600 hover:bg-purple-700" size="sm"
          onClick={generateQuestions} disabled={generating}
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
          AI Generate Questions
        </Button>
      )}
    </div>
  );
}

function MCQConfig({
  config,
  updateConfig,
}: {
  config: any;
  updateConfig: (k: string, v: any) => void;
}) {
  const [generating, setGenerating] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const questions = config.questions || [];

  const generateQuestions = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/assessments/generate-for-node", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "mcq",
          difficulty: config.difficulty || "medium",
          questionCount: config.questionCount || 20,
        }),
      });
      const data = await res.json();
      if (data.questions) {
        updateConfig("questions", data.questions);
        toast.success(`Generated ${data.questions.length} MCQs!`);
      }
    } catch {
      toast.error("Failed to generate");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <SectionTitle>MCQ Assessment</SectionTitle>

      <div className="space-y-2">
        <Label className="text-sm">Duration (minutes)</Label>
        <Input
          type="number"
          value={config.duration || 45}
          onChange={(e) => updateConfig("duration", parseInt(e.target.value) || 15)}
          min={10}
          max={120}
          className="h-9"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm">Difficulty</Label>
        <Select
          value={config.difficulty || "medium"}
          onValueChange={(v) => updateConfig("difficulty", v)}
        >
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="easy">Easy</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="hard">Hard</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-sm">Number of Questions</Label>
        <Input
          type="number"
          value={config.questionCount || 20}
          onChange={(e) => updateConfig("questionCount", parseInt(e.target.value) || 5)}
          min={5}
          max={50}
          className="h-9"
        />
      </div>

      <Separator />
      <SectionTitle>Questions</SectionTitle>

      {questions.length > 0 ? (
        <div className="space-y-2">
          <span className="text-sm text-emerald-600 font-medium">
            ✅ {questions.length} MCQs ready
          </span>
          <Button
            variant="outline" size="sm" className="w-full text-xs"
            onClick={generateQuestions} disabled={generating}
          >
            {generating ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
            Regenerate
          </Button>
        </div>
      ) : (
        <Button
          className="w-full bg-purple-600 hover:bg-purple-700" size="sm"
          onClick={generateQuestions} disabled={generating}
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
          AI Generate MCQs
        </Button>
      )}
    </div>
  );
}

function AIInterviewConfig({
  config,
  updateConfig,
}: {
  config: any;
  updateConfig: (k: string, v: any) => void;
}) {
  return (
    <div className="space-y-4">
      <SectionTitle>AI Interview Settings</SectionTitle>

      <div className="space-y-2">
        <Label className="text-sm">Interview Mode</Label>
        <Select
          value={config.interviewMode || "technical"}
          onValueChange={(v) => updateConfig("interviewMode", v)}
        >
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="technical">Technical</SelectItem>
            <SelectItem value="behavioral">Behavioral</SelectItem>
            <SelectItem value="mixed">Mixed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-sm">Number of Questions</Label>
        <Input
          type="number"
          value={config.maxQuestions || 10}
          onChange={(e) => updateConfig("maxQuestions", parseInt(e.target.value) || 5)}
          min={3}
          max={25}
          className="h-9"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm">Duration (minutes)</Label>
        <Input
          type="number"
          value={config.duration || 30}
          onChange={(e) => updateConfig("duration", parseInt(e.target.value) || 15)}
          min={5}
          max={60}
          className="h-9"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm">Difficulty</Label>
        <Select
          value={config.difficulty || "progressive"}
          onValueChange={(v) => updateConfig("difficulty", v)}
        >
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="easy">Easy</SelectItem>
            <SelectItem value="progressive">Progressive (Easy → Hard)</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="hard">Hard</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator />
      <SectionTitle>Options</SectionTitle>

      <ToggleRow
        label="Adaptive follow-ups"
        checked={config.adaptive !== false}
        onChange={(v) => updateConfig("adaptive", v)}
      />

      <ToggleRow
        label="Use resume context"
        checked={config.useResumeContext !== false}
        onChange={(v) => updateConfig("useResumeContext", v)}
      />

      <ToggleRow
        label="Provide hints when stuck"
        checked={config.provideHints !== false}
        onChange={(v) => updateConfig("provideHints", v)}
      />

      {/* Simple summary */}
      <div className="bg-indigo-50 rounded-lg p-3 text-xs text-indigo-700">
        {config.maxQuestions || 10} questions •{" "}
        {config.duration || 30} min •{" "}
        {config.interviewMode || "technical"} •{" "}
        {config.difficulty || "progressive"}
      </div>
    </div>
  );
}

// Topic input helper component
function TopicInput({
  topics,
  onChange,
}: {
  topics: string[];
  onChange: (topics: string[]) => void;
}) {
  const [input, setInput] = React.useState("");

  const addTopic = () => {
    if (input.trim() && !topics.includes(input.trim())) {
      onChange([...topics, input.trim()]);
      setInput("");
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); addTopic(); }
          }}
          placeholder="e.g. System Design, React Hooks"
          className="h-8 text-xs flex-1"
        />
        <Button variant="outline" size="sm" className="h-8 text-xs px-2" onClick={addTopic}>
          +
        </Button>
      </div>
      {topics.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {topics.map((topic) => (
            <Badge key={topic} variant="secondary" className="text-[10px] pl-2 pr-0.5 py-0.5 gap-1">
              {topic}
              <button
                onClick={() => onChange(topics.filter((t) => t !== topic))}
                className="ml-0.5 hover:bg-slate-300 rounded-full p-0.5"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
function F2FInterviewConfig({
  config,
  updateConfig,
  isPanel,
}: {
  config: any;
  updateConfig: (k: string, v: any) => void;
  isPanel: boolean;
}) {
  return (
    <div className="space-y-5">
      <SectionTitle>{isPanel ? "Panel" : "F2F"} Interview</SectionTitle>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Duration</Label>
        <Select
          value={String(config.duration || 60)}
          onValueChange={(v) => updateConfig("duration", parseInt(v))}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30">30 minutes</SelectItem>
            <SelectItem value="45">45 minutes</SelectItem>
            <SelectItem value="60">60 minutes</SelectItem>
            <SelectItem value="90">90 minutes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Interview type</Label>
        <Select
          value={config.interviewType || "technical"}
          onValueChange={(v) => updateConfig("interviewType", v)}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="technical">Technical</SelectItem>
            <SelectItem value="behavioral">Behavioral</SelectItem>
            <SelectItem value="hiring_manager">Hiring Manager</SelectItem>
            <SelectItem value="culture_fit">Culture Fit</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isPanel && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Panel size</Label>
          <Input
            type="number"
            value={config.panelSize || 3}
            onChange={(e) =>
              updateConfig("panelSize", parseInt(e.target.value) || 2)
            }
            className="h-9"
            min={2}
            max={6}
          />
        </div>
      )}
    </div>
  );
}

// ==========================================
// ACTION/EXIT CONFIGS
// ==========================================

function EmailConfig({
  config,
  updateConfig,
}: {
  config: any;
  updateConfig: (k: string, v: any) => void;
}) {
  return (
    <div className="space-y-5">
      <SectionTitle>Email Settings</SectionTitle>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Email type</Label>
        <Select
          value={config.emailType || "ai_personalized"}
          onValueChange={(v) => updateConfig("emailType", v)}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ai_personalized">
              AI Personalized ($0.05)
            </SelectItem>
            <SelectItem value="template">Template ($0.02)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config.emailType === "template" && (
        <div className="space-y-2">
          <Label className="text-sm">Subject</Label>
          <Input
            value={config.subject || ""}
            onChange={(e) => updateConfig("subject", e.target.value)}
            className="h-9"
            placeholder="Your application update..."
          />
        </div>
      )}
    </div>
  );
}

function RejectionConfig({
  config,
  updateConfig,
}: {
  config: any;
  updateConfig: (k: string, v: any) => void;
}) {
  return (
    <div className="space-y-5">
      <SectionTitle>Rejection Settings</SectionTitle>

      <ToggleRow
        label="Send personalized feedback"
        checked={config.sendFeedback !== false}
        onChange={(v) => updateConfig("sendFeedback", v)}
      />

      <ToggleRow
        label="Add to talent pool"
        checked={config.addToTalentPool || false}
        onChange={(v) => updateConfig("addToTalentPool", v)}
      />

      <ToggleRow
        label="Recommend other matching jobs"
        checked={config.recommendJobs !== false}
        onChange={(v) => updateConfig("recommendJobs", v)}
      />

      {config.sendFeedback && (
        <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-lg">
          <p className="text-xs text-emerald-700">
            ✨ Candidates will receive personalized skill feedback, improvement
            tips, and recommended jobs — making Hirasys the most
            candidate-friendly hiring platform.
          </p>
        </div>
      )}
    </div>
  );
}

function OfferConfig({
  config,
  updateConfig,
}: {
  config: any;
  updateConfig: (k: string, v: any) => void;
}) {
  return (
    <div className="space-y-5">
      <SectionTitle>Offer Settings</SectionTitle>

      <ToggleRow
        label="Auto-generate offer letter"
        checked={config.autoGenerate || false}
        onChange={(v) => updateConfig("autoGenerate", v)}
      />

      <ToggleRow
        label="Trigger onboarding on acceptance"
        checked={config.triggerOnboarding !== false}
        onChange={(v) => updateConfig("triggerOnboarding", v)}
      />

      <ToggleRow
        label="Notify hiring team"
        checked={config.notifyTeam !== false}
        onChange={(v) => updateConfig("notifyTeam", v)}
      />
    </div>
  );
}

// ==========================================
// SHARED: Filtered Actions (for all filter nodes)
// ==========================================

function FilteredActionsConfig({
  config,
  updateNestedConfig,
}: {
  config: any;
  updateNestedConfig: (p: string, k: string, v: any) => void;
}) {
  const filtered = config.filtered || {};

  return (
    <div className="space-y-4">
      <SectionTitle>Filtered-Out Candidates</SectionTitle>

      <ToggleRow
        label="Keep waitlist (backup candidates)"
        checked={filtered.waitlist || false}
        onChange={(v) => updateNestedConfig("filtered", "waitlist", v)}
      />

      {filtered.waitlist && (
        <div className="pl-4 space-y-2">
          <Label className="text-xs text-slate-500">Waitlist size</Label>
          <Input
            type="number"
            value={filtered.waitlistSize || 20}
            onChange={(e) =>
              updateNestedConfig(
                "filtered",
                "waitlistSize",
                parseInt(e.target.value) || 5
              )
            }
            className="h-8"
          />
        </div>
      )}

      <ToggleRow
        label="Send rejection email with feedback"
        checked={filtered.rejectEmail !== false}
        onChange={(v) => updateNestedConfig("filtered", "rejectEmail", v)}
      />

      {filtered.rejectEmail && (
        <div className="pl-4 space-y-2">
          <Label className="text-xs text-slate-500">Email type</Label>
          <Select
            value={filtered.emailType || "ai_personalized"}
            onValueChange={(v) =>
              updateNestedConfig("filtered", "emailType", v)
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ai_personalized">
                AI Personalized (with skill feedback)
              </SelectItem>
              <SelectItem value="template">Basic Template</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <ToggleRow
        label="Add to talent pool for future roles"
        checked={filtered.addToTalentPool || false}
        onChange={(v) =>
          updateNestedConfig("filtered", "addToTalentPool", v)
        }
      />
    </div>
  );
}

// ==========================================
// REUSABLE UI COMPONENTS
// ==========================================

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
      {children}
    </Label>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <Label className="text-sm text-slate-600 cursor-pointer">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function HintBox({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs text-slate-400 flex items-start gap-1.5 bg-slate-50 p-2 rounded-lg">
      <Info className="w-3 h-3 shrink-0 mt-0.5" />
      <span>{children}</span>
    </p>
  );
}