import { query } from "./db";
import { getUserCompanyId } from "./company";

/**
 * Log an audit event. Call this from any API route after a mutation.
 *
 * Example:
 *   await logAudit({
 *     userId: session.user.id,
 *     action: "JOB_CREATED",
 *     resourceType: "job",
 *     resourceId: job.id,
 *     resourceName: job.title,
 *     details: { status: "DRAFT" },
 *     req,  // optional — extracts IP + user agent
 *   });
 */
export async function logAudit(params: {
  userId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  resourceName?: string;
  details?: Record<string, any>;
  req?: Request | null;
}) {
  try {
    // Resolve company, name, email
    const { queryOne } = await import("./db");

    const user = await queryOne(
      "SELECT first_name, last_name, email, company_id FROM users WHERE id = $1",
      [params.userId]
    );

    const companyId = user?.company_id || (await getUserCompanyId(params.userId));
    const userName = user
      ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
      : null;
    const userEmail = user?.email || null;

    // Extract IP + UA from request if provided
    let ipAddress: string | null = null;
    let userAgent: string | null = null;

    if (params.req) {
      const headers = params.req.headers;
      ipAddress =
        (headers as any).get?.("x-forwarded-for")?.split(",")[0]?.trim() ||
        (headers as any).get?.("x-real-ip") ||
        null;
      userAgent = (headers as any).get?.("user-agent") || null;
    }

    await query(
      `INSERT INTO audit_logs (
        company_id, user_id, user_name, user_email,
        action, resource_type, resource_id, resource_name,
        details, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        companyId || null,
        params.userId,
        userName,
        userEmail,
        params.action,
        params.resourceType,
        params.resourceId || null,
        params.resourceName || null,
        JSON.stringify(params.details || {}),
        ipAddress,
        userAgent,
      ]
    );
  } catch (err) {
    // Audit logging should never break the main flow
    console.error("Audit log failed (non-critical):", err);
  }
}