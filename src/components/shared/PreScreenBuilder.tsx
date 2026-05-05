"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  X,
  GripVertical,
  Shield,
  Filter,
  ChevronDown,
  ChevronUp,
  Copy,
  AlertTriangle,
  Users,
  Briefcase,
  DollarSign,
  Scale,
} from "lucide-react";
import { PRE_SCREEN_TEMPLATES, type PreScreenQuestion } from "@/types";

interface PreScreenBuilderProps {
  questions: PreScreenQuestion[];
  onChange: (questions: PreScreenQuestion[]) => void;
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  experience: { label: "Experience", icon: Briefcase, color: "text-blue-600 bg-blue-50" },
  legal: { label: "Legal / Eligibility", icon: Scale, color: "text-amber-600 bg-amber-50" },
  compensation: { label: "Compensation", icon: DollarSign, color: "text-emerald-600 bg-emerald-50" },
  diversity: { label: "Diversity (Optional)", icon: Users, color: "text-purple-600 bg-purple-50" },
  custom: { label: "Custom", icon: Filter, color: "text-slate-600 bg-slate-50" },
};

const TYPE_OPTIONS = [
  { value: "number", label: "Number" },
  { value: "yes_no", label: "Yes / No" },
  { value: "select", label: "Dropdown" },
  { value: "salary", label: "Salary" },
  { value: "text", label: "Text" },
];

const OPERATOR_OPTIONS = [
  { value: "gte", label: "≥ Greater than or equal" },
  { value: "lte", label: "≤ Less than or equal" },
  { value: "eq", label: "= Equals" },
  { value: "not_eq", label: "≠ Not equals" },
];

export function PreScreenBuilder({ questions, onChange }: PreScreenBuilderProps) {
  const [showTemplates, setShowTemplates] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const addQuestion = (template?: PreScreenQuestion) => {
    const newQ: PreScreenQuestion = template
      ? { ...template, id: `q_${Date.now()}` }
      : {
          id: `q_${Date.now()}`,
          question: "",
          type: "text",
          required: false,
          filter: {
            enabled: false,
            operator: "gte",
            value: "",
          },
          category: "custom",
        };

    onChange([...questions, newQ]);
    setExpandedId(newQ.id);
  };

  const updateQuestion = (id: string, updates: Partial<PreScreenQuestion>) => {
    onChange(
      questions.map((q) => (q.id === id ? { ...q, ...updates } : q))
    );
  };

  const updateFilter = (id: string, filterUpdates: Partial<PreScreenQuestion["filter"]>) => {
    onChange(
      questions.map((q) =>
        q.id === id
          ? { ...q, filter: { ...q.filter, ...filterUpdates } }
          : q
      )
    );
  };

  const removeQuestion = (id: string) => {
    onChange(questions.filter((q) => q.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const moveQuestion = (index: number, direction: "up" | "down") => {
    const newQuestions = [...questions];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newQuestions.length) return;
    [newQuestions[index], newQuestions[targetIndex]] = [
      newQuestions[targetIndex],
      newQuestions[index],
    ];
    onChange(newQuestions);
  };

  const filterCount = questions.filter((q) => q.filter.enabled).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-[#0245EF]" />
          Pre-Screening Questions
        </CardTitle>
        <CardDescription>
          Ask candidates questions before they apply. Enable filters to
          automatically reject candidates who don&apos;t meet your requirements.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats bar */}
        {questions.length > 0 && (
          <div className="flex items-center gap-3 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
            <span>{questions.length} question{questions.length !== 1 ? "s" : ""}</span>
            <span className="text-slate-300">•</span>
            <span className="flex items-center gap-1">
              <Filter className="w-3 h-3" />
              {filterCount} hard filter{filterCount !== 1 ? "s" : ""}
            </span>
            {questions.some((q) => q.category === "diversity") && (
              <>
                <span className="text-slate-300">•</span>
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  Diversity questions included
                </span>
              </>
            )}
          </div>
        )}

        {/* Question list */}
        <div className="space-y-3">
          {questions.map((q, index) => {
            const isExpanded = expandedId === q.id;
            const catConfig = CATEGORY_CONFIG[q.category || "custom"];
            const CatIcon = catConfig.icon;

            return (
              <div
                key={q.id}
                className={`border rounded-lg transition-all ${
                  isExpanded
                    ? "border-[#0245EF] bg-[#EBF0FF]/20"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                {/* Collapsed header */}
                <div
                  className="flex items-center gap-3 p-3 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : q.id)}
                >
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        moveQuestion(index, "up");
                      }}
                      disabled={index === 0}
                      className="text-slate-300 hover:text-slate-500 disabled:opacity-30"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        moveQuestion(index, "down");
                      }}
                      disabled={index === questions.length - 1}
                      className="text-slate-300 hover:text-slate-500 disabled:opacity-30"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>

                  <div className={`w-7 h-7 rounded flex items-center justify-center shrink-0 ${catConfig.color}`}>
                    <CatIcon className="w-3.5 h-3.5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">
                      {q.question || "Untitled question"}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-slate-400">
                        {TYPE_OPTIONS.find((t) => t.value === q.type)?.label}
                      </span>
                      {q.required && (
                        <Badge className="text-[9px] bg-red-50 text-red-600 h-4 px-1">
                          Required
                        </Badge>
                      )}
                      {q.filter.enabled && (
                        <Badge className="text-[9px] bg-amber-50 text-amber-600 h-4 px-1">
                          <Filter className="w-2.5 h-2.5 mr-0.5" />
                          Filter
                        </Badge>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeQuestion(q.id);
                    }}
                    className="text-slate-300 hover:text-red-500 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Expanded editor */}
                {isExpanded && (
                  <div className="px-3 pb-4 pt-1 border-t border-slate-100 space-y-4">
                    {/* Question text */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Question</Label>
                      <Input
                        value={q.question}
                        onChange={(e) =>
                          updateQuestion(q.id, { question: e.target.value })
                        }
                        placeholder="e.g. How many years of relevant experience do you have?"
                        className="h-9 text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {/* Type */}
                      <div className="space-y-1.5">
                        <Label className="text-xs">Answer Type</Label>
                        <Select
                          value={q.type}
                          onValueChange={(v) =>
                            updateQuestion(q.id, {
                              type: v as PreScreenQuestion["type"],
                            })
                          }
                        >
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TYPE_OPTIONS.map((t) => (
                              <SelectItem key={t.value} value={t.value}>
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Category */}
                      <div className="space-y-1.5">
                        <Label className="text-xs">Category</Label>
                        <Select
                          value={q.category || "custom"}
                          onValueChange={(v) =>
                            updateQuestion(q.id, {
                              category: v as PreScreenQuestion["category"],
                            })
                          }
                        >
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                              <SelectItem key={key} value={key}>
                                {config.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Required */}
                      <div className="space-y-1.5">
                        <Label className="text-xs">Required</Label>
                        <div className="flex items-center gap-2 h-9">
                          <Switch
                            checked={q.required}
                            onCheckedChange={(v) =>
                              updateQuestion(q.id, { required: v })
                            }
                          />
                          <span className="text-xs text-slate-500">
                            {q.required ? "Yes" : "No"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Options for select type */}
                    {q.type === "select" && (
                      <div className="space-y-1.5">
                        <Label className="text-xs">Options (comma separated)</Label>
                        <Input
                          value={(q.options || []).join(", ")}
                          onChange={(e) =>
                            updateQuestion(q.id, {
                              options: e.target.value
                                .split(",")
                                .map((o) => o.trim())
                                .filter(Boolean),
                            })
                          }
                          placeholder="e.g. Option A, Option B, Option C"
                          className="h-9 text-sm"
                        />
                      </div>
                    )}

                    {/* Placeholder */}
                    {(q.type === "number" || q.type === "salary" || q.type === "text") && (
                      <div className="space-y-1.5">
                        <Label className="text-xs">Placeholder</Label>
                        <Input
                          value={q.placeholder || ""}
                          onChange={(e) =>
                            updateQuestion(q.id, { placeholder: e.target.value })
                          }
                          placeholder="e.g. Enter a number"
                          className="h-9 text-sm"
                        />
                      </div>
                    )}

                    {/* Filter config */}
                    <div className="bg-slate-50 rounded-lg p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Filter className="w-4 h-4 text-amber-600" />
                          <Label className="text-xs font-semibold">
                            Auto-Filter (Hard Gate)
                          </Label>
                        </div>
                        <Switch
                          checked={q.filter.enabled}
                          onCheckedChange={(v) =>
                            updateFilter(q.id, { enabled: v })
                          }
                        />
                      </div>

                      {q.filter.enabled && (
                        <>
                          <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                            <AlertTriangle className="w-3 h-3 text-amber-500" />
                            Candidates who fail this filter will be instantly rejected before entering the pipeline.
                          </p>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-[11px]">Operator</Label>
                              {q.type === "yes_no" ? (
                                <Select
                                  value={String(q.filter.value || "yes")}
                                  onValueChange={(v) =>
                                    updateFilter(q.id, {
                                      operator: "eq",
                                      value: v,
                                    })
                                  }
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="yes">Must answer Yes</SelectItem>
                                    <SelectItem value="no">Must answer No</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Select
                                  value={q.filter.operator}
                                  onValueChange={(v) =>
                                    updateFilter(q.id, {
                                      operator: v as PreScreenQuestion["filter"]["operator"],
                                    })
                                  }
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {OPERATOR_OPTIONS.map((o) => (
                                      <SelectItem key={o.value} value={o.value}>
                                        {o.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </div>

                            {q.type !== "yes_no" && (
                              <div className="space-y-1.5">
                                <Label className="text-[11px]">Threshold Value</Label>
                                <Input
                                  type={
                                    q.type === "number" || q.type === "salary"
                                      ? "number"
                                      : "text"
                                  }
                                  value={q.filter.value || ""}
                                  onChange={(e) =>
                                    updateFilter(q.id, { value: e.target.value })
                                  }
                                  placeholder={
                                    q.type === "number"
                                      ? "e.g. 5"
                                      : q.type === "salary"
                                        ? "e.g. 150000"
                                        : "e.g. value"
                                  }
                                  className="h-8 text-xs"
                                />
                              </div>
                            )}
                          </div>

                          {/* Custom rejection message */}
                          <div className="space-y-1.5">
                            <Label className="text-[11px]">
                              Rejection Message{" "}
                              <span className="text-slate-400 font-normal">(optional)</span>
                            </Label>
                            <Input
                              value={q.filter.rejectMessage || ""}
                              onChange={(e) =>
                                updateFilter(q.id, {
                                  rejectMessage: e.target.value,
                                })
                              }
                              placeholder="e.g. This role requires at least {value} years of experience."
                              className="h-8 text-xs"
                            />
                            <p className="text-[10px] text-slate-400">
                              Use {"{value}"} to insert the threshold value.
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add buttons */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addQuestion()}
            className="text-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Custom Question
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowTemplates(!showTemplates)}
            className="text-xs"
          >
            <Copy className="w-3.5 h-3.5 mr-1" />
            {showTemplates ? "Hide" : "From"} Templates
          </Button>
        </div>

        {/* Template picker */}
        {showTemplates && (
          <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-2">
            <p className="text-xs font-medium text-slate-500">
              Click to add a pre-built question:
            </p>
            <div className="grid grid-cols-1 gap-1.5">
              {PRE_SCREEN_TEMPLATES.filter(
                (t) => !questions.some((q) => q.question === t.question)
              ).map((template) => {
                const catConfig =
                  CATEGORY_CONFIG[template.category || "custom"];
                const CatIcon = catConfig.icon;

                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => {
                      addQuestion(template);
                    }}
                    className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-200 bg-white hover:border-[#0245EF] hover:bg-[#EBF0FF]/30 text-left transition-all"
                  >
                    <div
                      className={`w-7 h-7 rounded flex items-center justify-center shrink-0 ${catConfig.color}`}
                    >
                      <CatIcon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-700 truncate">
                        {template.question}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-slate-400">
                          {catConfig.label}
                        </span>
                        {template.filter.enabled && (
                          <Badge className="text-[9px] bg-amber-50 text-amber-600 h-3.5 px-1">
                            Has filter
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Plus className="w-4 h-4 text-slate-300" />
                  </button>
                );
              })}

              {PRE_SCREEN_TEMPLATES.filter(
                (t) => !questions.some((q) => q.question === t.question)
              ).length === 0 && (
                <p className="text-xs text-slate-400 text-center py-2">
                  All templates already added
                </p>
              )}
            </div>
          </div>
        )}

        {/* Empty state */}
        {questions.length === 0 && (
          <div className="text-center py-6 bg-slate-50 rounded-lg">
            <Shield className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No pre-screen questions</p>
            <p className="text-xs text-slate-400 mt-1">
              Add questions to filter candidates before they enter your pipeline
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}