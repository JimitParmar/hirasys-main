import { query } from "./db";

export interface AuditEntry {
  userId: string;
  userName?: string;
  userEmail?: string;
  companyId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  resourceName?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export async function logAudit(entry: AuditEntry) {
  try {
    await query(
      `INSERT INTO audit_logs (
        company_id, user_id, user_name, user_email,
        action, resource_type, resource_id, resource_name,
        details, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        entry.companyId || null,
        entry.userId,
        entry.userName || null,
        entry.userEmail || null,
        entry.action,
        entry.resourceType,
        entry.resourceId || null,
        entry.resourceName || null,
        JSON.stringify(entry.details || {}),
        entry.ipAddress || null,
        entry.userAgent || null,
      ]
    );
  } catch (err) {
    console.error("Audit log failed:", err);
    // Never throw — audit should never break the main flow
  }
}

// Helper to extract audit info from session
export function getAuditUser(session: any) {
  const user = session?.user as any;
  return {
    userId: user?.id || "unknown",
    userName: user ? `${user.firstName} ${user.lastName}` : "Unknown",
    userEmail: user?.email || "unknown",
    companyId: user?.companyId || null,
  };
}