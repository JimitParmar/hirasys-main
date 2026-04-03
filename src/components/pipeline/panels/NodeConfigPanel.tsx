"use client";

import React from "react";
import { Node } from "@xyflow/react";
import { PipelineNodeData } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { X, Trash2, Info } from "lucide-react";

interface NodeConfigPanelProps {
  node: Node;
  onChange: (nodeId: string, data: Partial<PipelineNodeData>) => void;
  onDelete: (nodeId: string) => void;
  onClose: () => void;
}

export function NodeConfigPanel({ node, onChange, onDelete, onClose }: NodeConfigPanelProps) {
  const data = node.data as unknown as PipelineNodeData;

  const updateConfig = (key: string, value: any) => {
    onChange(node.id, {
      config: { ...data.config, [key]: value },
    });
  };

  const updateNestedConfig = (parentKey: string, key: string, value: any) => {
    onChange(node.id, {
      config: {
        ...data.config,
        [parentKey]: { ...(data.config[parentKey] || {}), [key]: value },
      },
    });
  };

  const updateLabel = (label: string) => {
    onChange(node.id, { label });
  };

  return (
    <div className="fixed right-0 top-0 h-full w-[380px] bg-white border-l border-slate-200 shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${data.color}15` }}
          >
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: data.color }} />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-slate-700">Configure Node</h3>
            <p className="text-xs text-slate-400">{data.subtype}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          {/* Common Fields */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Basic Settings
            </Label>
            <div className="space-y-2">
              <Label htmlFor="label" className="text-sm">Node Label</Label>
              <Input
                id="label"
                value={data.label}
                onChange={(e) => updateLabel(e.target.value)}
                className="h-9"
              />
            </div>
            {data.costPerUnit > 0 && (
              <div className="flex items-center justify-between bg-slate-50 rounded-lg p-3">
                <span className="text-sm text-slate-600">Cost per candidate</span>
                <Badge variant="outline">${data.costPerUnit}</Badge>
              </div>
            )}
            {data.costPerUnit === 0 && data.type === "filter" && (
              <div className="flex items-center justify-between bg-green-50 rounded-lg p-3">
                <span className="text-sm text-green-700">Cost</span>
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100">FREE ✨</Badge>
              </div>
            )}
          </div>

          <Separator />

          {/* Type-specific configurations */}
          {renderTypeConfig(data, updateConfig, updateNestedConfig)}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-slate-100 flex justify-between">
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onDelete(node.id)}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Node
        </Button>
        <Button size="sm" onClick={onClose}>
          Done
        </Button>
      </div>
    </div>
  );
}

function renderTypeConfig(
  data: PipelineNodeData,
  updateConfig: (key: string, value: any) => void,
  updateNestedConfig: (parentKey: string, key: string, value: any) => void
) {
  switch (data.subtype) {
    // ==========================================
    // FILTER NODES
    // ==========================================
    case "top_n":
      return (
        <div className="space-y-4">
          <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Top-N Filter Settings
          </Label>

          <div className="space-y-2">
            <Label className="text-sm">How many candidates pass through?</Label>
            <div className="flex items-center gap-3">
              <Slider
                value={[data.config.n || 50]}
                onValueChange={([v]) => updateConfig("n", v)}
                min={1}
                max={500}
                step={1}
                className="flex-1"
              />
              <Input
                type="number"
                value={data.config.n || 50}
                onChange={(e) => updateConfig("n", parseInt(e.target.value) || 1)}
                className="w-20 h-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Rank candidates by</Label>
            <Select
              value={data.config.rankBy || "previous_stage_score"}
              onValueChange={(v) => updateConfig("rankBy", v)}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="previous_stage_score">Previous Stage Score</SelectItem>
                <SelectItem value="resume_score">Resume Score</SelectItem>
                <SelectItem value="overall_score">Overall Average Score</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Tiebreaker</Label>
            <Select
              value={data.config.tiebreaker || "none"}
              onValueChange={(v) => updateConfig("tiebreaker", v === "none" ? undefined : v)}
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

          <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Batch Settings
          </Label>

          <div className="space-y-2">
            <Label className="text-sm">When to evaluate</Label>
            <Select
              value={data.config.batchMode || "count_or_time"}
              onValueChange={(v) => updateConfig("batchMode", v)}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_complete">After all candidates complete previous stage</SelectItem>
                <SelectItem value="count_or_time">After N candidates OR X days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {data.config.batchMode === "count_or_time" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Candidate count</Label>
                <Input
                  type="number"
                  value={data.config.batchCount || 100}
                  onChange={(e) => updateConfig("batchCount", parseInt(e.target.value))}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Days to wait</Label>
                <Input
                  type="number"
                  value={data.config.batchDays || 7}
                  onChange={(e) => updateConfig("batchDays", parseInt(e.target.value))}
                  className="h-9"
                />
              </div>
            </div>
          )}

          <Separator />

          <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Fast-Track (Optional)
          </Label>

          <div className="flex items-center justify-between">
            <Label className="text-sm">Enable fast-track for top performers</Label>
            <Switch
              checked={data.config.fastTrack?.enabled || false}
              onCheckedChange={(v) => updateNestedConfig("fastTrack", "enabled", v)}
            />
          </div>

          {data.config.fastTrack?.enabled && (
            <div className="space-y-2">
              <Label className="text-sm">Fast-track if score ≥</Label>
              <div className="flex items-center gap-3">
                <Slider
                  value={[data.config.fastTrack?.threshold || 90]}
                  onValueChange={([v]) => updateNestedConfig("fastTrack", "threshold", v)}
                  min={50}
                  max={100}
                  step={1}
                  className="flex-1"
                />
                <span className="text-sm font-mono w-12 text-right">
                  {data.config.fastTrack?.threshold || 90}
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <Info className="w-3 h-3" />
                Candidates scoring above this pass immediately without waiting for batch
              </p>
            </div>
          )}

          <Separator />

          {renderFilteredActions(data, updateConfig, updateNestedConfig)}
        </div>
      );

    case "score_gate":
      return (
        <div className="space-y-4">
          <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Score Gate Settings
          </Label>

          <div className="space-y-2">
            <Label className="text-sm">Minimum score to pass</Label>
            <div className="flex items-center gap-3">
              <Slider
                value={[data.config.minScore || 70]}
                onValueChange={([v]) => updateConfig("minScore", v)}
                min={0}
                max={100}
                step={1}
                className="flex-1"
              />
              <span className="text-sm font-mono w-12 text-right font-semibold">
                {data.config.minScore || 70}
              </span>
            </div>
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Lenient</span>
              <span>Strict</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Score source</Label>
            <Select
              value={data.config.scoreSource || "previous_stage_score"}
              onValueChange={(v) => updateConfig("scoreSource", v)}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="previous_stage_score">Previous Stage Score</SelectItem>
                <SelectItem value="resume_score">Resume Score</SelectItem>
                <SelectItem value="overall_score">Overall Average</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-xs text-blue-700 flex items-center gap-1">
              <Info className="w-3 h-3" />
              Score gates evaluate candidates in real-time — no waiting for batch.
            </p>
          </div>

          <Separator />
          {renderFilteredActions(data, updateConfig, updateNestedConfig)}
        </div>
      );

    case "percentage":
      return (
        <div className="space-y-4">
          <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Percentage Filter Settings
          </Label>

          <div className="space-y-2">
            <Label className="text-sm">Top percentage to pass</Label>
            <div className="flex items-center gap-3">
              <Slider
                value={[data.config.percentage || 25]}
                onValueChange={([v]) => updateConfig("percentage", v)}
                min={1}
                max={100}
                step={1}
                className="flex-1"
              />
              <span className="text-sm font-mono w-14 text-right font-semibold">
                {data.config.percentage || 25}%
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Minimum to pass</Label>
              <Input
                type="number"
                value={data.config.minPass || 3}
                onChange={(e) => updateConfig("minPass", parseInt(e.target.value))}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Maximum to pass</Label>
              <Input
                type="number"
                value={data.config.maxPass || 100}
                onChange={(e) => updateConfig("maxPass", parseInt(e.target.value))}
                className="h-9"
              />
            </div>
          </div>

          <Separator />
          {renderFilteredActions(data, updateConfig, updateNestedConfig)}
        </div>
      );

    case "hybrid":
      return (
        <div className="space-y-4">
          <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Hybrid Filter Settings
          </Label>

          <div className="bg-purple-50 p-3 rounded-lg space-y-1">
            <p className="text-xs font-medium text-purple-700">How Hybrid works:</p>
            <p className="text-xs text-purple-600">
              1. Candidates scoring ≥ threshold pass IMMEDIATELY
            </p>
            <p className="text-xs text-purple-600">
              2. Rest are batched and top N are selected
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Fast-track threshold</Label>
            <div className="flex items-center gap-3">
              <Slider
                value={[data.config.fastTrackThreshold || 85]}
                onValueChange={([v]) => updateConfig("fastTrackThreshold", v)}
                min={50}
                max={100}
                step={1}
                className="flex-1"
              />
              <span className="text-sm font-mono w-12 text-right">
                ≥{data.config.fastTrackThreshold || 85}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Batch: pick top N from remaining</Label>
            <Input
              type="number"
              value={data.config.batchN || 40}
              onChange={(e) => updateConfig("batchN", parseInt(e.target.value))}
              className="h-9"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Rank by</Label>
            <Select
              value={data.config.rankBy || "previous_stage_score"}
              onValueChange={(v) => updateConfig("rankBy", v)}
            >
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="previous_stage_score">Previous Stage Score</SelectItem>
                <SelectItem value="resume_score">Resume Score</SelectItem>
                <SelectItem value="overall_score">Overall Average</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />
          {renderFilteredActions(data, updateConfig, updateNestedConfig)}
        </div>
      );

    case "human_approval":
      return (
        <div className="space-y-4">
          <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Human Approval Settings
          </Label>

          <div className="space-y-2">
            <Label className="text-sm">Who approves?</Label>
            <Select
              value={data.config.approverRole || "HR"}
              onValueChange={(v) => updateConfig("approverRole", v)}
            >
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="HR">HR Manager</SelectItem>
                <SelectItem value="HIRING_MANAGER">Hiring Manager</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Deadline (days)</Label>
            <Input
              type="number"
              value={data.config.deadline || 3}
              onChange={(e) => updateConfig("deadline", parseInt(e.target.value))}
              className="h-9"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm">If no action taken</Label>
            <Select
              value={data.config.autoAction || "hold"}
              onValueChange={(v) => updateConfig("autoAction", v)}
            >
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="hold">Hold (wait for decision)</SelectItem>
                <SelectItem value="advance">Auto-advance after deadline</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Show approver</Label>
            <div className="space-y-2">
              {["resume_score", "assessment_score", "ai_analysis", "resume_data", "interview_score"].map((field) => (
                <div key={field} className="flex items-center gap-2">
                  <Switch
                    checked={(data.config.showData || []).includes(field)}
                    onCheckedChange={(checked) => {
                      const current = data.config.showData || [];
                      updateConfig(
                        "showData",
                        checked ? [...current, field] : current.filter((f: string) => f !== field)
                      );
                    }}
                  />
                  <Label className="text-xs capitalize">{field.replace(/_/g, " ")}</Label>
                </div>
              ))}
            </div>
          </div>
        </div>
      );

    // ==========================================
    // STAGE NODES
    // ==========================================
    case "ai_resume_screen":
      return (
        <div className="space-y-4">
          <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Resume Screening Settings
          </Label>

          <div className="space-y-2">
            <Label className="text-sm">Scoring criteria</Label>
            {["skills_match", "experience", "education", "project_relevance", "culture_keywords"].map((criterion) => (
              <div key={criterion} className="flex items-center gap-2">
                <Switch
                  checked={(data.config.criteria || []).includes(criterion)}
                  onCheckedChange={(checked) => {
                    const current = data.config.criteria || [];
                    updateConfig(
                      "criteria",
                      checked ? [...current, criterion] : current.filter((c: string) => c !== criterion)
                    );
                  }}
                />
                <Label className="text-xs capitalize">{criterion.replace(/_/g, " ")}</Label>
              </div>
            ))}
          </div>
        </div>
      );

    case "coding_assessment":
      return (
        <div className="space-y-4">
          <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Coding Assessment Settings
          </Label>

          <div className="space-y-2">
            <Label className="text-sm">Duration (minutes)</Label>
            <div className="flex items-center gap-3">
              <Slider
                value={[data.config.duration || 90]}
                onValueChange={([v]) => updateConfig("duration", v)}
                min={15}
                max={180}
                step={15}
                className="flex-1"
              />
              <span className="text-sm font-mono w-16 text-right">
                {data.config.duration || 90} min
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Difficulty</Label>
            <Select
              value={data.config.difficulty || "medium"}
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
            <Label className="text-sm">Allowed languages</Label>
            {["javascript", "python", "typescript", "java", "cpp", "go"].map((lang) => (
              <div key={lang} className="flex items-center gap-2">
                <Switch
                  checked={(data.config.languages || []).includes(lang)}
                  onCheckedChange={(checked) => {
                    const current = data.config.languages || [];
                    updateConfig(
                      "languages",
                      checked ? [...current, lang] : current.filter((l: string) => l !== lang)
                    );
                  }}
                />
                <Label className="text-xs capitalize">{lang}</Label>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Number of questions</Label>
            <Input
              type="number"
              value={data.config.questionCount || 3}
              onChange={(e) => updateConfig("questionCount", parseInt(e.target.value))}
              className="h-9"
              min={1}
              max={10}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-sm">AI-generate questions from JD</Label>
            <Switch
              checked={data.config.autoGenerate !== false}
              onCheckedChange={(v) => updateConfig("autoGenerate", v)}
            />
          </div>
        </div>
      );

    case "ai_technical_interview":
    case "ai_behavioral_interview":
      return (
        <div className="space-y-4">
          <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            AI Interview Settings
          </Label>

          <div className="space-y-2">
            <Label className="text-sm">Max questions</Label>
            <div className="flex items-center gap-3">
              <Slider
                value={[data.config.maxQuestions || 10]}
                onValueChange={([v]) => updateConfig("maxQuestions", v)}
                min={3}
                max={20}
                step={1}
                className="flex-1"
              />
              <span className="text-sm font-mono w-8 text-right">
                {data.config.maxQuestions || 10}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Estimated duration (minutes)</Label>
            <div className="flex items-center gap-3">
              <Slider
                value={[data.config.duration || 30]}
                onValueChange={([v]) => updateConfig("duration", v)}
                min={10}
                max={60}
                step={5}
                className="flex-1"
              />
              <span className="text-sm font-mono w-16 text-right">
                {data.config.duration || 30} min
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-sm">Adapt questions based on responses</Label>
            <Switch
              checked={data.config.adaptive !== false}
              onCheckedChange={(v) => updateConfig("adaptive", v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-sm">Consider resume context</Label>
            <Switch
              checked={data.config.useResumeContext !== false}
              onCheckedChange={(v) => updateConfig("useResumeContext", v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-sm">Allow candidate to ask questions</Label>
            <Switch
              checked={data.config.allowCandidateQuestions || false}
              onCheckedChange={(v) => updateConfig("allowCandidateQuestions", v)}
            />
          </div>
        </div>
      );

    case "f2f_interview":
    case "panel_interview":
      return (
        <div className="space-y-4">
          <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Interview Settings
          </Label>

          <div className="space-y-2">
            <Label className="text-sm">Duration (minutes)</Label>
            <Select
              value={String(data.config.duration || 60)}
              onValueChange={(v) => updateConfig("duration", parseInt(v))}
            >
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="45">45 minutes</SelectItem>
                <SelectItem value="60">60 minutes</SelectItem>
                <SelectItem value="90">90 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Interview type</Label>
            <Select
              value={data.config.interviewType || "technical"}
              onValueChange={(v) => updateConfig("interviewType", v)}
            >
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="technical">Technical</SelectItem>
                <SelectItem value="behavioral">Behavioral</SelectItem>
                <SelectItem value="hiring_manager">Hiring Manager</SelectItem>
                <SelectItem value="culture_fit">Culture Fit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {data.subtype === "panel_interview" && (
            <div className="space-y-2">
              <Label className="text-sm">Panel size</Label>
              <Input
                type="number"
                value={data.config.panelSize || 3}
                onChange={(e) => updateConfig("panelSize", parseInt(e.target.value))}
                className="h-9"
                min={2}
                max={6}
              />
            </div>
          )}
        </div>
      );

    // Action Nodes
    case "send_email":
      return (
        <div className="space-y-4">
          <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Email Settings
          </Label>

          <div className="space-y-2">
            <Label className="text-sm">Email type</Label>
            <Select
              value={data.config.emailType || "ai_personalized"}
              onValueChange={(v) => updateConfig("emailType", v)}
            >
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ai_personalized">AI Personalized ($0.05)</SelectItem>
                <SelectItem value="template">Template ($0.02)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {data.config.emailType === "template" && (
            <div className="space-y-2">
              <Label className="text-sm">Email subject</Label>
              <Input
                value={data.config.subject || ""}
                onChange={(e) => updateConfig("subject", e.target.value)}
                className="h-9"
                placeholder="Your application update"
              />
            </div>
          )}
        </div>
      );

    // Exit Nodes
    case "rejection":
      return (
        <div className="space-y-4">
          <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Rejection Settings
          </Label>

          <div className="flex items-center justify-between">
            <Label className="text-sm">Send personalized feedback</Label>
            <Switch
              checked={data.config.sendFeedback !== false}
              onCheckedChange={(v) => updateConfig("sendFeedback", v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-sm">Add to talent pool</Label>
            <Switch
              checked={data.config.addToTalentPool || false}
              onCheckedChange={(v) => updateConfig("addToTalentPool", v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-sm">Recommend other jobs</Label>
            <Switch
              checked={data.config.recommendJobs !== false}
              onCheckedChange={(v) => updateConfig("recommendJobs", v)}
            />
          </div>

          {data.config.sendFeedback && (
            <div className="bg-emerald-50 p-3 rounded-lg">
              <p className="text-xs text-emerald-700">
                ✨ Candidates will receive personalized skill feedback, improvement tips,
                and recommended jobs — making Hirasys the most candidate-friendly platform.
              </p>
            </div>
          )}
        </div>
      );

    default:
      return (
        <div className="text-sm text-slate-400 text-center py-4">
          No additional configuration needed for this node.
        </div>
      );
  }
}

// Shared filtered candidates action config
function renderFilteredActions(
  data: PipelineNodeData,
  updateConfig: (key: string, value: any) => void,
  updateNestedConfig: (parentKey: string, key: string, value: any) => void
) {
  return (
    <div className="space-y-4">
      <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
        Filtered-Out Candidates
      </Label>

      <div className="flex items-center justify-between">
        <Label className="text-sm">Keep waitlist (backup)</Label>
        <Switch
          checked={data.config.filtered?.waitlist || false}
          onCheckedChange={(v) => updateNestedConfig("filtered", "waitlist", v)}
        />
      </div>

      {data.config.filtered?.waitlist && (
        <div className="space-y-2 pl-4">
          <Label className="text-xs">Waitlist size</Label>
          <Input
            type="number"
            value={data.config.filtered?.waitlistSize || 20}
            onChange={(e) => updateNestedConfig("filtered", "waitlistSize", parseInt(e.target.value))}
            className="h-8"
          />
        </div>
      )}

      <div className="flex items-center justify-between">
        <Label className="text-sm">Send rejection email</Label>
        <Switch
          checked={data.config.filtered?.rejectEmail !== false}
          onCheckedChange={(v) => updateNestedConfig("filtered", "rejectEmail", v)}
        />
      </div>

      {data.config.filtered?.rejectEmail && (
        <div className="space-y-2 pl-4">
          <Label className="text-xs">Email type</Label>
          <Select
            value={data.config.filtered?.emailType || "ai_personalized"}
            onValueChange={(v) => updateNestedConfig("filtered", "emailType", v)}
          >
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ai_personalized">AI Personalized (with feedback)</SelectItem>
              <SelectItem value="template">Basic Template</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex items-center justify-between">
        <Label className="text-sm">Add to talent pool</Label>
        <Switch
          checked={data.config.filtered?.addToTalentPool || false}
          onCheckedChange={(v) => updateNestedConfig("filtered", "addToTalentPool", v)}
        />
      </div>
    </div>
  );
}