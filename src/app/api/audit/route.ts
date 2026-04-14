export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { queryOne, queryMany } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getUserCompanyId } from "@/lib/company";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;

    if (user.role !== "ADMIN" && user.role !== "HR") {
      return NextResponse.json(
        { error: "Only admins and HR can view audit logs" },
        { status: 403 }
      );
    }

    // ==========================================
    // RESOLVE COMPANY ID from DB (not session)
    // ==========================================
    const companyId = await getUserCompanyId(user.id);

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")));
    const resourceType = searchParams.get("resourceType");
    const actionFilter = searchParams.get("action");
    const userId = searchParams.get("userId");
    const search = searchParams.get("search");

    let where = "WHERE 1=1";
    const params: any[] = [];
    let idx = 1;

    // ==========================================
    // COMPANY-LEVEL ISOLATION
    // Only show logs belonging to this company
    // ==========================================
    if (companyId) {
      where += ` AND (company_id = $${idx} OR (company_id IS NULL AND user_id IN (
        SELECT id FROM users WHERE company_id = $${idx}
      )))`;
      params.push(companyId);
      idx++;
    } else {
      // No company — only show this user's own actions
      where += ` AND user_id = $${idx}`;
      params.push(user.id);
      idx++;
    }

    if (resourceType) {
      where += ` AND resource_type = $${idx}`;
      params.push(resourceType);
      idx++;
    }

    if (actionFilter) {
      where += ` AND action = $${idx}`;
      params.push(actionFilter);
      idx++;
    }

    if (userId) {
      where += ` AND user_id = $${idx}`;
      params.push(userId);
      idx++;
    }

    if (search) {
      where += ` AND (
        resource_name ILIKE $${idx}
        OR user_name ILIKE $${idx}
        OR user_email ILIKE $${idx}
        OR action ILIKE $${idx}
      )`;
      params.push(`%${search}%`);
      idx++;
    }

    // Get total count for pagination
    const countResult = await queryOne(
      `SELECT COUNT(*)::int as total FROM audit_logs ${where}`,
      params
    );
    const total = countResult?.total || 0;

    // Fetch logs
    const logs = await queryMany(
      `SELECT * FROM audit_logs ${where}
       ORDER BY created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, (page - 1) * limit]
    );

    // Get unique users + actions for filter dropdowns
    const uniqueUsers = await queryMany(
      `SELECT DISTINCT user_id, user_name, user_email
       FROM audit_logs ${where}
       ORDER BY user_name ASC
       LIMIT 100`,
      params
    );

    const uniqueActions = await queryMany(
      `SELECT DISTINCT action, COUNT(*)::int as count
       FROM audit_logs ${where}
       GROUP BY action
       ORDER BY count DESC`,
      params
    );

    const uniqueResources = await queryMany(
      `SELECT DISTINCT resource_type, COUNT(*)::int as count
       FROM audit_logs ${where}
       GROUP BY resource_type
       ORDER BY count DESC`,
      params
    );

    return NextResponse.json({
      logs,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      filters: {
        users: uniqueUsers.map((u: any) => ({
          id: u.user_id,
          name: u.user_name || u.user_email || u.user_id,
        })),
        actions: uniqueActions.map((a: any) => ({
          action: a.action,
          count: a.count,
        })),
        resourceTypes: uniqueResources.map((r: any) => ({
          type: r.resource_type,
          count: r.count,
        })),
      },
    });
  } catch (error: any) {
    console.error("Audit GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}