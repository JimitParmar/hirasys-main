import { query, queryOne, queryMany } from "./db";

// Cost per node type in USD
export const NODE_COSTS: Record<string, { cost: number; label: string }> = {
  ai_resume_screen: { cost: 0.15, label: "AI Resume Screen" },
  coding_assessment: { cost: 2.5, label: "Coding Assessment" },
  mcq_assessment: { cost: 1.0, label: "MCQ Assessment" },
  ai_technical_interview: { cost: 3.0, label: "AI Technical Interview" },
  ai_behavioral_interview: { cost: 2.5, label: "AI Behavioral Interview" },
  f2f_interview: { cost: 1.5, label: "F2F Interview" },
  panel_interview: { cost: 2.0, label: "Panel Interview" },
  ai_ranking: { cost: 1.0, label: "AI Ranking" },
  offer: { cost: 2.0, label: "Offer Generation" },
  rejection_feedback: { cost: 0.05, label: "Rejection Feedback" },
  job_posting: { cost: 0.5, label: "Job Posting" },
  notification_email: { cost: 0.02, label: "Email Notification" },
};

// ==========================================
// TRACK USAGE
// ==========================================
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

// ==========================================
// GET USAGE SUMMARY
// ==========================================
export async function getUsageSummary(
  companyId: string,
  periodStart?: Date,
  periodEnd?: Date
) {
  const start =
    periodStart ||
    new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const end = periodEnd || new Date();

  const summary = await queryMany(
    `SELECT
      node_type,
      COUNT(*)::int as count,
      SUM(unit_count)::int as total_units,
      SUM(total_cost)::numeric as total_cost
     FROM usage_records
     WHERE company_id = $1 AND created_at >= $2 AND created_at <= $3
     GROUP BY node_type
     ORDER BY total_cost DESC`,
    [companyId, start, end]
  );

  const totalCost = summary.reduce(
    (sum: number, s: any) => sum + parseFloat(s.total_cost || 0),
    0
  );
  const totalUnits = summary.reduce(
    (sum: number, s: any) => sum + parseInt(s.total_units || 0),
    0
  );

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

// ==========================================
// GET DAILY USAGE (for charts)
// ==========================================
export async function getDailyUsage(companyId: string, days: number = 30) {
  const rows = await queryMany(
    `SELECT
       DATE(created_at) as date,
       COUNT(*)::int as operations,
       SUM(total_cost)::numeric as cost
     FROM usage_records
     WHERE company_id = $1
       AND created_at >= NOW() - INTERVAL '${days} days'
     GROUP BY DATE(created_at)
     ORDER BY date ASC`,
    [companyId]
  );

  return rows.map((r: any) => ({
    date: r.date,
    operations: r.operations,
    cost: parseFloat(r.cost || 0),
  }));
}

// ==========================================
// GET COMPANY SUBSCRIPTION (with auto-create)
// ==========================================
export async function getCompanySubscription(companyId: string) {
  let sub = await queryOne(
    `SELECT cs.*, bp.name as plan_name, bp.slug as plan_slug,
      bp.price_monthly, bp.price_yearly, bp.credits_included,
      bp.features, bp.limits as plan_limits
     FROM company_subscriptions cs
     JOIN billing_plans bp ON cs.plan_id = bp.id
     WHERE cs.company_id = $1`,
    [companyId]
  );

  if (sub) {
    // Check if period has expired — auto-renew
    const periodEnd = new Date(sub.current_period_end);
    if (periodEnd < new Date()) {
      // Generate invoice for completed period
      try {
        await generateInvoice(companyId, sub);
      } catch (err) {
        console.error("Invoice generation failed:", err);
      }

      // Reset period
      await query(
        `UPDATE company_subscriptions
         SET credits_used = 0,
             current_period_start = NOW(),
             current_period_end = NOW() + INTERVAL '30 days',
             updated_at = NOW()
         WHERE id = $1`,
        [sub.id]
      );

      // Re-fetch
      sub = await queryOne(
        `SELECT cs.*, bp.name as plan_name, bp.slug as plan_slug,
          bp.price_monthly, bp.price_yearly, bp.credits_included,
          bp.features, bp.limits as plan_limits
         FROM company_subscriptions cs
         JOIN billing_plans bp ON cs.plan_id = bp.id
         WHERE cs.company_id = $1`,
        [companyId]
      );
    }

    return sub;
  }

  // No subscription — auto-create free plan
  const freePlan = await queryOne(
    "SELECT * FROM billing_plans WHERE slug = 'free'"
  );

  if (freePlan) {
    await queryOne(
      `INSERT INTO company_subscriptions (company_id, plan_id, credits_remaining)
       VALUES ($1, $2, 0) RETURNING *`,
      [companyId, freePlan.id]
    );

    return await queryOne(
      `SELECT cs.*, bp.name as plan_name, bp.slug as plan_slug,
        bp.price_monthly, bp.price_yearly, bp.credits_included,
        bp.features, bp.limits as plan_limits
       FROM company_subscriptions cs
       JOIN billing_plans bp ON cs.plan_id = bp.id
       WHERE cs.company_id = $1`,
      [companyId]
    );
  }

  return null;
}

// ==========================================
// UPGRADE PLAN
// ==========================================
export async function upgradePlan(companyId: string, planSlug: string) {
  const newPlan = await queryOne(
    "SELECT * FROM billing_plans WHERE slug = $1 AND is_active = true",
    [planSlug]
  );

  if (!newPlan) {
    throw new Error("Plan not found");
  }

  const currentSub = await getCompanySubscription(companyId);

  if (currentSub && currentSub.plan_slug === planSlug) {
    throw new Error("Already on this plan");
  }

  if (currentSub) {
    // Generate invoice for current period
    try {
      await generateInvoice(companyId, currentSub);
    } catch {}

    // Update to new plan
    await query(
      `UPDATE company_subscriptions
       SET plan_id = $2,
           credits_used = 0,
           credits_remaining = $3,
           current_period_start = NOW(),
           current_period_end = NOW() + INTERVAL '30 days',
           updated_at = NOW()
       WHERE company_id = $1`,
      [companyId, newPlan.id, parseFloat(newPlan.credits_included) || 0]
    );
  } else {
    await queryOne(
      `INSERT INTO company_subscriptions (company_id, plan_id, credits_remaining, current_period_start, current_period_end)
       VALUES ($1, $2, $3, NOW(), NOW() + INTERVAL '30 days')
       RETURNING *`,
      [companyId, newPlan.id, parseFloat(newPlan.credits_included) || 0]
    );
  }

  return await getCompanySubscription(companyId);
}

// ==========================================
// GENERATE INVOICE
// ==========================================
async function generateInvoice(companyId: string, subscription: any) {
  const usage = await getUsageSummary(
    companyId,
    new Date(subscription.current_period_start),
    new Date(subscription.current_period_end)
  );

  const baseCost = parseFloat(subscription.price_monthly) || 0;
  const creditsIncluded = parseFloat(subscription.credits_included) || 0;
  const creditsUsed = parseFloat(subscription.credits_used) || 0;
  const creditsApplied = Math.min(creditsUsed, creditsIncluded);
  const overageAmount = Math.max(0, creditsUsed - creditsIncluded);
  const totalAmount = baseCost + overageAmount;

  // Build line items
  const lineItems = [
    {
      description: `${subscription.plan_name} Plan — Monthly`,
      amount: baseCost,
    },
    ...usage.items.map((item: any) => ({
      description: `${item.label} × ${item.totalUnits}`,
      amount: item.totalCost,
    })),
  ];

  if (creditsApplied > 0) {
    lineItems.push({
      description: "Credits Applied",
      amount: -creditsApplied,
    });
  }

  await queryOne(
    `INSERT INTO invoices (company_id, period_start, period_end, plan_name, base_amount, usage_amount, credits_applied, total_amount, status, line_items)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ISSUED', $9)
     RETURNING *`,
    [
      companyId,
      subscription.current_period_start,
      subscription.current_period_end,
      subscription.plan_name,
      baseCost,
      usage.totalCost,
      creditsApplied,
      totalAmount,
      JSON.stringify(lineItems),
    ]
  );
}

// ==========================================
// GET INVOICES
// ==========================================
export async function getInvoices(companyId: string) {
  return await queryMany(
    `SELECT * FROM invoices
     WHERE company_id = $1
     ORDER BY created_at DESC
     LIMIT 24`,
    [companyId]
  );
}

// ==========================================
// CHECK PLAN LIMITS
// ==========================================
export async function checkPlanLimits(
  companyId: string,
  check: string,
  currentCount: number
): Promise<{ allowed: boolean; limit: number; current: number; plan: string }> {
  const sub = await getCompanySubscription(companyId);
  if (!sub) {
    return { allowed: true, limit: -1, current: currentCount, plan: "none" };
  }

  let limits = sub.plan_limits || {};
  try {
    if (typeof limits === "string") limits = JSON.parse(limits);
  } catch {
    limits = {};
  }

  const limitMap: Record<string, string> = {
    active_jobs: "maxJobs",
    candidates_per_job: "maxApplicantsPerJob",
    max_jobs: "maxJobs",
  };

  const limitKey = limitMap[check] || check;
  const limitValue = limits[limitKey];

  if (limitValue === undefined || limitValue === -1 || limitValue === "-1") {
    return {
      allowed: true,
      limit: -1,
      current: currentCount,
      plan: sub.plan_slug,
    };
  }

  return {
    allowed: currentCount < parseInt(limitValue),
    limit: parseInt(limitValue),
    current: currentCount,
    plan: sub.plan_slug,
  };
}

// ==========================================
// CHECK FEATURE ACCESS
// ==========================================
export async function checkFeatureAccess(
  companyId: string,
  feature: string
): Promise<{ allowed: boolean; plan: string }> {
  const sub = await getCompanySubscription(companyId);
  if (!sub) {
    return { allowed: true, plan: "none" };
  }

  let features = sub.features || {};
  try {
    if (typeof features === "string") features = JSON.parse(features);
  } catch {
    features = {};
  }

  const value = features[feature];

  // If feature is not mentioned, allow it
  if (value === undefined) {
    return { allowed: true, plan: sub.plan_slug };
  }

  // If it's a number, it's a limit (0 = not allowed)
  if (typeof value === "number") {
    return { allowed: value > 0 || value === -1, plan: sub.plan_slug };
  }

  // If it's "unlimited", allow
  if (value === "unlimited" || value === true || value === "true") {
    return { allowed: true, plan: sub.plan_slug };
  }

  if (value === false || value === "false" || value === 0 || value === "0") {
    return { allowed: false, plan: sub.plan_slug };
  }

  return { allowed: true, plan: sub.plan_slug };
}