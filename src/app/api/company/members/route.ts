export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { getSession } from "@/lib/session";
import { logAudit, getAuditUser } from "@/lib/audit";

// PUT — update team member role or deactivate
export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = session.user as any;
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Only admins can manage team" }, { status: 403 });
    }

    const { memberId, action, role } = await req.json();

    if (memberId === user.id) {
      return NextResponse.json({ error: "Cannot modify your own account here" }, { status: 400 });
    }

    const member = await queryOne(
      "SELECT * FROM users WHERE id = $1 AND company_id = $2",
      [memberId, user.companyId]
    );

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    if (action === "change_role") {
      if (!["ADMIN", "HR", "INTERVIEWER"].includes(role)) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      }

      await query("UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2", [role, memberId]);

      await logAudit({
        ...getAuditUser(session),
        action: "MEMBER_ROLE_CHANGED",
        resourceType: "user",
        resourceId: memberId,
        resourceName: `${member.first_name} ${member.last_name}`,
        details: { oldRole: member.role, newRole: role },
      });

      return NextResponse.json({ success: true, message: `Role changed to ${role}` });
    }

    if (action === "deactivate") {
      await query("UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1", [memberId]);

      await logAudit({
        ...getAuditUser(session),
        action: "MEMBER_DEACTIVATED",
        resourceType: "user",
        resourceId: memberId,
        resourceName: `${member.first_name} ${member.last_name}`,
      });

      return NextResponse.json({ success: true, message: "Member deactivated" });
    }

    if (action === "activate") {
      await query("UPDATE users SET is_active = true, updated_at = NOW() WHERE id = $1", [memberId]);

      await logAudit({
        ...getAuditUser(session),
        action: "MEMBER_ACTIVATED",
        resourceType: "user",
        resourceId: memberId,
        resourceName: `${member.first_name} ${member.last_name}`,
      });

      return NextResponse.json({ success: true, message: "Member activated" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}