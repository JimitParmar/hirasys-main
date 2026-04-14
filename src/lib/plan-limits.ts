import { queryOne, queryMany } from "./db";
import { getCompanySubscription } from "./billing";
import { getUserCompanyId, getCompanyUserIds } from "./company";

export interface PlanCheckResult {
  allowed: boolean;
  limit: number | "unlimited";
  current: number;
  plan: string;
  planName: string;
  message?: string;
  upgradeRequired?: string;
}

// ==========================================
// PARSE HELPERS
// ==========================================

function parseLimits(raw: any): Record<string, number> {
  if (!raw) return {};
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    const result: Record<string, number> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (value === "unlimited" || value === -1) {
        result[key] = -1;
      } else {
        result[key] = parseInt(String(value)) || 0;
      }
    }
    return result;
  } catch {
    return {};
  }
}

function parseFeatures(raw: any): Record<string, any> {
  if (!raw) return {};
  try {
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return {};
  }
}

async function getSubAndLimits(userId: string) {
  const companyId = await getUserCompanyId(userId);
  if (!companyId) {
    return {
      sub: null,
      limits: {
        maxJobs: 1,
        maxMembers: 1,
        maxAssessmentNodes: 1,
        maxAiInterviewNodes: 1,
        maxApplicantsPerJob: 50,
        maxPipelineNodes: 5,
        maxResumeScreens: 500,
      },
      features: {
        pipelineBuilder: true,
        aiGenerate: false,
        integrations: false,
        auditLogs: false,
      },
      companyId: null,
    };
  }

  const sub = await getCompanySubscription(companyId);
  const limits = parseLimits(sub?.limits || sub?.plan_limits);
  const features = parseFeatures(sub?.features || sub?.plan_features);

  return { sub, limits, features, companyId };
}

// ==========================================
// CHECK: Jobs
// ==========================================

export async function checkJobLimit(
  userId: string
): Promise<PlanCheckResult> {
  const { sub, limits, companyId } = await getSubAndLimits(userId);
  const maxJobs = limits.maxJobs ?? 1;

  const userIds = await getCompanyUserIds(userId);
  const placeholders = userIds.map((_, i) => `$${i + 1}`).join(", ");

  const result = await queryOne(
    `SELECT COUNT(*)::int as count FROM jobs
     WHERE posted_by IN (${placeholders})
     AND status IN ('DRAFT', 'PUBLISHED')`,
    userIds
  );

  const current = result?.count || 0;
  const planName = sub?.plan_name || "Free";
  const planSlug = sub?.plan_slug || "free";

  if (maxJobs !== -1 && current >= maxJobs) {
    return {
      allowed: false,
      limit: maxJobs,
      current,
      plan: planSlug,
      planName,
      message: `You've reached the ${maxJobs} active job${maxJobs === 1 ? "" : "s"} limit on ${planName}.`,
      upgradeRequired: maxJobs <= 1 ? "pro" : "enterprise",
    };
  }

  return { allowed: true, limit: maxJobs === -1 ? "unlimited" : maxJobs, current, plan: planSlug, planName };
}

// ==========================================
// CHECK: Team Members
// ==========================================

export async function checkMemberLimit(
  userId: string
): Promise<PlanCheckResult> {
  const { sub, limits, companyId } = await getSubAndLimits(userId);
  const max = limits.maxMembers ?? 1;

  if (!companyId) {
    return {
      allowed: false,
      limit: 0,
      current: 0,
      plan: "free",
      planName: "Free",
      message: "Create a company first.",
    };
  }

  const result = await queryOne(
    "SELECT COUNT(*)::int as count FROM users WHERE company_id = $1 AND is_active = true",
    [companyId]
  );

  const current = result?.count || 0;
  const planName = sub?.plan_name || "Free";
  const planSlug = sub?.plan_slug || "free";

  if (max !== -1 && current >= max) {
    return {
      allowed: false,
      limit: max,
      current,
      plan: planSlug,
      planName,
      message: `You've reached the ${max} member${max === 1 ? "" : "s"} limit on ${planName}.`,
      upgradeRequired: max <= 1 ? "pro" : "enterprise",
    };
  }

  return { allowed: true, limit: max === -1 ? "unlimited" : max, current, plan: planSlug, planName };
}

// ==========================================
// CHECK: Pipeline Node Limits
// This is the key one — limits how many assessment
// and AI interview nodes can be added to a pipeline
// ==========================================

export async function checkPipelineNodeLimits(
  userId: string,
  nodes: any[]
): Promise<{
  allowed: boolean;
  plan: string;
  planName: string;
  violations: string[];
}> {
  const { sub, limits } = await getSubAndLimits(userId);
  const planName = sub?.plan_name || "Free";
  const planSlug = sub?.plan_slug || "free";

  const maxAssessmentNodes = limits.maxAssessmentNodes ?? 1;
  const maxAiInterviewNodes = limits.maxAiInterviewNodes ?? 1;
  const maxPipelineNodes = limits.maxPipelineNodes ?? 5;

  const violations: string[] = [];

  // Count node types
  const assessmentNodes = nodes.filter(
    (n: any) =>
      n.data?.subtype === "coding_assessment" ||
      n.data?.subtype === "mcq_assessment" ||
      n.data?.subtype === "subjective_assessment"
  ).length;

  const aiInterviewNodes = nodes.filter(
    (n: any) =>
      n.data?.subtype === "ai_technical_interview" ||
      n.data?.subtype === "ai_behavioral_interview"
  ).length;

  const totalNodes = nodes.filter(
    (n: any) => n.data?.type !== "source" && n.data?.type !== "exit"
  ).length;

  // Check assessment nodes
  if (maxAssessmentNodes !== -1 && assessmentNodes > maxAssessmentNodes) {
    violations.push(
      `${planName} plan allows ${maxAssessmentNodes} assessment node${maxAssessmentNodes === 1 ? "" : "s"} (you have ${assessmentNodes}). Upgrade to add more.`
    );
  }

  // Check AI interview nodes
  if (maxAiInterviewNodes !== -1 && aiInterviewNodes > maxAiInterviewNodes) {
    violations.push(
      `${planName} plan allows ${maxAiInterviewNodes} AI interview node${maxAiInterviewNodes === 1 ? "" : "s"} (you have ${aiInterviewNodes}). Upgrade to add more.`
    );
  }

  // Check total nodes
  if (maxPipelineNodes !== -1 && totalNodes > maxPipelineNodes) {
    violations.push(
      `${planName} plan allows ${maxPipelineNodes} pipeline nodes (you have ${totalNodes}). Upgrade for more.`
    );
  }

  return {
    allowed: violations.length === 0,
    plan: planSlug,
    planName,
    violations,
  };
}

// ==========================================
// CHECK: Feature Access
// ==========================================

export async function checkFeatureAccess(
  userId: string,
  feature: string
): Promise<PlanCheckResult> {
  const { sub, features } = await getSubAndLimits(userId);
  const planName = sub?.plan_name || "Free";
  const planSlug = sub?.plan_slug || "free";

  const value = (features as Record<string, any>)[feature];

  if (value === false || value === "false" || value === undefined) {
    const labels: Record<string, string> = {
      aiGenerate: "AI Pipeline Generation",
      integrations: "Integrations",
      auditLogs: "Audit Logs",
      sso: "Single Sign-On",
      prioritySupport: "Priority Support",
      dedicatedSupport: "Dedicated Support",
    };

    return {
      allowed: false,
      limit: 0,
      current: 0,
      plan: planSlug,
      planName,
      message: `${labels[feature] || feature} is not available on ${planName}. Upgrade to unlock.`,
      upgradeRequired: feature === "auditLogs" || feature === "sso" ? "enterprise" : "pro",
    };
  }

  return { allowed: true, limit: 0, current: 0, plan: planSlug, planName };
}

// ==========================================
// CHECK: Applicant limit per job
// ==========================================

export async function checkApplicantLimit(
  jobId: string,
  postedByUserId: string
): Promise<PlanCheckResult> {
  const { sub, limits } = await getSubAndLimits(postedByUserId);
  const max = limits.maxApplicantsPerJob ?? 50;
  const planName = sub?.plan_name || "Free";
  const planSlug = sub?.plan_slug || "free";

  if (max === -1) {
    return { allowed: true, limit: "unlimited", current: 0, plan: planSlug, planName };
  }

  const result = await queryOne(
    "SELECT COUNT(*)::int as count FROM applications WHERE job_id = $1",
    [jobId]
  );

  const current = result?.count || 0;

  if (current >= max) {
    return {
      allowed: false,
      limit: max,
      current,
      plan: planSlug,
      planName,
      message: `This job has reached the ${max} applicant limit on ${planName}.`,
      upgradeRequired: "pro",
    };
  }

  return { allowed: true, limit: max, current, plan: planSlug, planName };
}

// ==========================================
// GET FULL PLAN STATUS (for frontend)
// ==========================================

export async function getPlanStatus(userId: string) {
  const { sub, limits, features, companyId } = await getSubAndLimits(userId);

  let jobCount = 0;
  let memberCount = 0;

  if (companyId) {
    const userIds = await getCompanyUserIds(userId);
    const placeholders = userIds.map((_, i) => `$${i + 1}`).join(", ");

    const [jobs, members] = await Promise.all([
      queryOne(
        `SELECT COUNT(*)::int as count FROM jobs WHERE posted_by IN (${placeholders}) AND status IN ('DRAFT', 'PUBLISHED')`,
        userIds
      ),
      queryOne(
        "SELECT COUNT(*)::int as count FROM users WHERE company_id = $1 AND is_active = true",
        [companyId]
      ),
    ]);

    jobCount = jobs?.count || 0;
    memberCount = members?.count || 0;
  }

  return {
    plan: sub?.plan_slug || "free",
    planName: sub?.plan_name || "Free",
    features,
    limits,
    usage: {
      jobs: jobCount,
      members: memberCount,
    },
  };
}