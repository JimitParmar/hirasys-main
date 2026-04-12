import { query, queryOne, queryMany } from "./db";

// Cost per node type in USD
export const NODE_COSTS: Record<string, { cost: number; label: string }> = {
  ai_resume_screen: { cost: 0.15, label: "AI Resume Screen" },
  coding_assessment: { cost: 2.50, label: "Coding Assessment" },
  mcq_assessment: { cost: 1.00, label: "MCQ Assessment" },
  ai_technical_interview: { cost: 3.00, label: "AI Technical Interview" },
  ai_behavioral_interview: { cost: 2.50, label: "AI Behavioral Interview" },
  f2f_interview: { cost: 1.50, label: "F2F Interview" },
  panel_interview: { cost: 2.00, label: "Panel Interview" },
  ai_ranking: { cost: 1.00, label: "AI Ranking" },
  offer: { cost: 2.00, label: "Offer Generation" },
  rejection_feedback: { cost: 0.05, label: "Rejection Feedback" },
  job_posting: { cost: 0.50, label: "Job Posting" },
  notification_email: { cost: 0.02, label: "Email Notification" },
};

export async function trackUsage(params: {
  companyId: string;
  userId?: string;
  nodeType: string;
  unitCount?: number;
  jobId?: string;
  applicationId?: string;
  description?: string;
}) {
  const costInfo = NODE_COSTS[params.nodeType];
  if (!costInfo) return;

  const unitCount = params.unitCount || 1;
  const totalCost = costInfo.cost * unitCount;

  try {
    await query(
      `INSERT INTO usage_records (company_id, user_id, node_type, unit_count, unit_cost, total_cost, job_id, application_id, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        params.companyId,
        params.userId || null,
        params.nodeType,
        unitCount,
        costInfo.cost,
        totalCost,
        params.jobId || null,
        params.applicationId || null,
        params.description || costInfo.label,
      ]
    );

    // Update subscription credits used
    await query(
      `UPDATE company_subscriptions
       SET credits_used = credits_used + $2, updated_at = NOW()
       WHERE company_id = $1`,
      [params.companyId, totalCost]
    );
  } catch (err) {
    console.error("Usage tracking failed (non-critical):", err);
  }
}

export async function getUsageSummary(companyId: string, periodStart?: Date, periodEnd?: Date) {
  const start = periodStart || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const end = periodEnd || new Date();

  const summary = await queryMany(
    `SELECT
      node_type,
      COUNT(*) as count,
      SUM(unit_count) as total_units,
      SUM(total_cost) as total_cost
     FROM usage_records
     WHERE company_id = $1 AND created_at >= $2 AND created_at <= $3
     GROUP BY node_type
     ORDER BY total_cost DESC`,
    [companyId, start, end]
  );

  const totalCost = summary.reduce((sum: number, s: any) => sum + parseFloat(s.total_cost || 0), 0);
  const totalUnits = summary.reduce((sum: number, s: any) => sum + parseInt(s.total_units || 0), 0);

  return {
    items: summary.map((s: any) => ({
      nodeType: s.node_type,
      label: NODE_COSTS[s.node_type]?.label || s.node_type,
      count: parseInt(s.count),
      totalUnits: parseInt(s.total_units),
      unitCost: NODE_COSTS[s.node_type]?.cost || 0,
      totalCost: parseFloat(s.total_cost),
    })),
    totalCost: Math.round(totalCost * 100) / 100,
    totalUnits,
    periodStart: start,
    periodEnd: end,
  };
}

export async function getCompanySubscription(companyId: string) {
  const sub = await queryOne(
    `SELECT cs.*, bp.name as plan_name, bp.slug as plan_slug,
      bp.price_monthly, bp.credits_included, bp.features, bp.limits
     FROM company_subscriptions cs
     JOIN billing_plans bp ON cs.plan_id = bp.id
     WHERE cs.company_id = $1`,
    [companyId]
  );

  if (!sub) {
    // Auto-create free subscription
    const freePlan = await queryOne("SELECT id FROM billing_plans WHERE slug = 'free'");
    if (freePlan) {
      const newSub = await queryOne(
        `INSERT INTO company_subscriptions (company_id, plan_id, credits_remaining)
         VALUES ($1, $2, 0) RETURNING *`,
        [companyId, freePlan.id]
      );
      return { ...newSub, plan_name: "Free", plan_slug: "free", price_monthly: 0, credits_included: 0, features: {}, limits: {} };
    }
  }

  return sub;
}