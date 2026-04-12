export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, queryMany } from "@/lib/db";
import { getSession } from "@/lib/session";
import { logAudit, getAuditUser } from "@/lib/audit";

// GET company info + team members
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = session.user as any;

    if (!user.companyId) {
      return NextResponse.json({ company: null, team: [] });
    }

    const company = await queryOne("SELECT * FROM companies WHERE id = $1", [user.companyId]);

    const team = await queryMany(
      `SELECT id, email, first_name, last_name, role, department, is_active,
        last_login_at, created_at, invited_by, timezone
       FROM users WHERE company_id = $1 ORDER BY created_at ASC`,
      [user.companyId]
    );

    const pendingInvites = await queryMany(
      `SELECT * FROM invitations WHERE company_id = $1 AND status = 'PENDING' AND expires_at > NOW()
       ORDER BY created_at DESC`,
      [user.companyId]
    );

    return NextResponse.json({ company, team, pendingInvites });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST — create company (during registration) or update
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = session.user as any;
    const body = await req.json();

    if (body.action === "create") {
      // Create new company
      const company = await queryOne(
        `INSERT INTO companies (name, domain, created_by)
         VALUES ($1, $2, $3) RETURNING *`,
        [body.name, body.domain || null, user.id]
      );

      // Link user to company as ADMIN
      await query(
        "UPDATE users SET company_id = $1, role = 'ADMIN' WHERE id = $2",
        [company.id, user.id]
      );

      await logAudit({
        ...getAuditUser(session),
        companyId: company.id,
        action: "COMPANY_CREATED",
        resourceType: "company",
        resourceId: company.id,
        resourceName: body.name,
      });

      return NextResponse.json({ success: true, company }, { status: 201 });
    }

    if (body.action === "update") {
      if (user.role !== "ADMIN") {
        return NextResponse.json({ error: "Only admins can update company" }, { status: 403 });
      }

      const company = await queryOne(
        `UPDATE companies SET name = COALESCE($2, name), domain = COALESCE($3, domain),
          settings = COALESCE($4, settings), updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [user.companyId, body.name, body.domain, body.settings ? JSON.stringify(body.settings) : null]
      );

      await logAudit({
        ...getAuditUser(session),
        action: "COMPANY_UPDATED",
        resourceType: "company",
        resourceId: user.companyId,
        details: body,
      });

      return NextResponse.json({ success: true, company });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}   