export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, queryMany } from "@/lib/db";
import { getSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { getUserCompanyId } from "@/lib/company";

// ==========================================
// GET — company info + team members
// ==========================================
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    const userId = user.id;

    // Resolve company from DB instead of trusting session
    const companyId = user.companyId || (await getUserCompanyId(userId));

    if (!companyId) {
      return NextResponse.json({ company: null, team: [], pendingInvites: [] });
    }

    const company = await queryOne(
      "SELECT * FROM companies WHERE id = $1",
      [companyId]
    );

    const team = await queryMany(
      `SELECT id, email, first_name, last_name, role, department, is_active,
        last_login_at, created_at, invited_by, timezone
       FROM users WHERE company_id = $1 ORDER BY created_at ASC`,
      [companyId]
    );

    const pendingInvites = await queryMany(
      `SELECT * FROM invitations
       WHERE company_id = $1 AND status = 'PENDING' AND expires_at > NOW()
       ORDER BY created_at DESC`,
      [companyId]
    );

    return NextResponse.json({ company, team, pendingInvites });
  } catch (error: any) {
    console.error("Company GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ==========================================
// POST — create or update company
// ==========================================
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    const userId = user.id;
    const body = await req.json();

    // ==========================================
    // CREATE COMPANY
    // ==========================================
    if (body.action === "create") {
      // Check if user already has a company
      const existingCompanyId = await getUserCompanyId(userId);
      if (existingCompanyId) {
        return NextResponse.json(
          { error: "You already belong to a company" },
          { status: 400 }
        );
      }

      const company = await queryOne(
        `INSERT INTO companies (name, domain, created_by)
         VALUES ($1, $2, $3) RETURNING *`,
        [body.name, body.domain || null, userId]
      );

      if (!company) {
        return NextResponse.json(
          { error: "Failed to create company" },
          { status: 500 }
        );
      }

      // Link user to company as ADMIN
      await query(
        "UPDATE users SET company_id = $1, role = 'ADMIN' WHERE id = $2",
        [company.id, userId]
      );

      // ✅ AUDIT
      await logAudit({
        userId,
        action: "COMPANY_CREATED",
        resourceType: "company",
        resourceId: company.id,
        resourceName: body.name,
        details: {
          domain: body.domain || null,
        },
        req,
      });

      return NextResponse.json({ success: true, company }, { status: 201 });
    }

    // ==========================================
    // UPDATE COMPANY
    // ==========================================
    if (body.action === "update") {
      if (user.role !== "ADMIN") {
        return NextResponse.json(
          { error: "Only admins can update company" },
          { status: 403 }
        );
      }

      const companyId = user.companyId || (await getUserCompanyId(userId));
      if (!companyId) {
        return NextResponse.json(
          { error: "No company found" },
          { status: 404 }
        );
      }

      // Fetch old company for change comparison
      const oldCompany = await queryOne(
        "SELECT * FROM companies WHERE id = $1",
        [companyId]
      );

      const company = await queryOne(
        `UPDATE companies
         SET name = COALESCE($2, name),
             domain = COALESCE($3, domain),
             settings = COALESCE($4, settings),
             updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [
          companyId,
          body.name || null,
          body.domain || null,
          body.settings ? JSON.stringify(body.settings) : null,
        ]
      );

      if (!company) {
        return NextResponse.json(
          { error: "Company not found" },
          { status: 404 }
        );
      }

      // ✅ AUDIT — track what changed
      const changes: Record<string, any> = {};
      if (body.name && oldCompany?.name !== body.name) {
        changes.name = { from: oldCompany?.name, to: body.name };
      }
      if (body.domain && oldCompany?.domain !== body.domain) {
        changes.domain = { from: oldCompany?.domain, to: body.domain };
      }
      if (body.settings) {
        changes.settings = "updated";
      }

      await logAudit({
        userId,
        action: "COMPANY_UPDATED",
        resourceType: "company",
        resourceId: companyId,
        resourceName: company.name,
        details:
          Object.keys(changes).length > 0
            ? changes
            : { fieldsUpdated: Object.keys(body).filter((k) => k !== "action").length },
        req,
      });

      return NextResponse.json({ success: true, company });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Company POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}