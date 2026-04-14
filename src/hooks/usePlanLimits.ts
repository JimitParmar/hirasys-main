"use client";

import { useEffect, useState, useCallback } from "react";

interface PlanStatus {
  plan: string;
  planName: string;
  features: Record<string, any>;
  limits: Record<string, number>;
  usage: Record<string, number>;
}

export function usePlanLimits() {
  const [status, setStatus] = useState<PlanStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLimits = useCallback(async () => {
    try {
      const res = await fetch("/api/billing/limits");
      const data = await res.json();
      if (res.ok) setStatus(data);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLimits();
  }, [fetchLimits]);

  const isFree = status?.plan === "free";
  const isPro = status?.plan === "pro";
  const isEnterprise = status?.plan === "enterprise";

  const canCreateJob = (): boolean => {
    if (!status) return true;
    const max = status.limits.maxJobs ?? 1;
    if (max === -1) return true;
    return (status.usage.jobs || 0) < max;
  };

  const canInviteMember = (): boolean => {
    if (!status) return true;
    const max = status.limits.maxMembers ?? 1;
    if (max === -1) return true;
    return (status.usage.members || 0) < max;
  };

  const hasFeature = (feature: string): boolean => {
    if (!status) return false;
    const val = status.features[feature];
    if (val === true || val === "true" || val === "unlimited") return true;
    if (val === false || val === "false" || val === undefined) return false;
    if (typeof val === "number") return val > 0 || val === -1;
    return !!val;
  };

  const getNodeLimit = (
    nodeType: "assessment" | "aiInterview" | "total"
  ): number | "unlimited" => {
    if (!status) return 1;
    const key =
      nodeType === "assessment"
        ? "maxAssessmentNodes"
        : nodeType === "aiInterview"
          ? "maxAiInterviewNodes"
          : "maxPipelineNodes";
    const val = status.limits[key];
    if (val === -1 || val === undefined) return "unlimited";
    return val;
  };

  const canAddNode = (
    nodeSubtype: string,
    currentNodes: any[]
  ): { allowed: boolean; message?: string } => {
    if (!status) return { allowed: true };

    const isAssessment = [
      "coding_assessment",
      "mcq_assessment",
      "subjective_assessment",
    ].includes(nodeSubtype);

    const isAiInterview = [
      "ai_technical_interview",
      "ai_behavioral_interview",
    ].includes(nodeSubtype);

    if (isAssessment) {
      const max = status.limits.maxAssessmentNodes ?? 1;
      if (max === -1) return { allowed: true };
      const current = currentNodes.filter(
        (n) =>
          n.data?.subtype === "coding_assessment" ||
          n.data?.subtype === "mcq_assessment" ||
          n.data?.subtype === "subjective_assessment"
      ).length;
      if (current >= max) {
        return {
          allowed: false,
          message: `${status.planName} plan allows ${max} assessment node${max === 1 ? "" : "s"}. Upgrade to add more.`,
        };
      }
    }

    if (isAiInterview) {
      const max = status.limits.maxAiInterviewNodes ?? 1;
      if (max === -1) return { allowed: true };
      const current = currentNodes.filter(
        (n) =>
          n.data?.subtype === "ai_technical_interview" ||
          n.data?.subtype === "ai_behavioral_interview"
      ).length;
      if (current >= max) {
        return {
          allowed: false,
          message: `${status.planName} plan allows ${max} AI interview node${max === 1 ? "" : "s"}. Upgrade to add more.`,
        };
      }
    }

    // Total node limit
    const maxTotal = status.limits.maxPipelineNodes ?? 5;
    if (maxTotal !== -1) {
      const totalNonSourceExit = currentNodes.filter(
        (n) => n.data?.type !== "source" && n.data?.type !== "exit"
      ).length;
      if (totalNonSourceExit >= maxTotal) {
        return {
          allowed: false,
          message: `${status.planName} plan allows ${maxTotal} pipeline nodes. Upgrade for more.`,
        };
      }
    }

    return { allowed: true };
  };

  const getLimit = (key: string): number | "unlimited" => {
    if (!status) return 0;
    const val = status.limits[key];
    if (val === -1 || val === undefined) return "unlimited";
    return val;
  };

  const getUsage = (key: string): number => {
    return status?.usage[key] || 0;
  };

  return {
    status,
    loading,
    isFree,
    isPro,
    isEnterprise,
    canCreateJob,
    canInviteMember,
    hasFeature,
    canAddNode,
    getNodeLimit,
    getLimit,
    getUsage,
    refresh: fetchLimits,
    planName: status?.planName || "Free",
  };
}