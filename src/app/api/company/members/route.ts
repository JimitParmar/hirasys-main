export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { getSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { getUserCompanyId } from "@/lib/company";

// ==========================================
// PUT — update team member role or activate/deactivate
// ==========================================
export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    const userId = user.id;

    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only admins can manage team" },
        { status: 403 }
      );
    }

    // Resolve company from DB
    const companyId = user.companyId || (await getUserCompanyId(userId));

    if (!companyId) {
      return NextResponse.json(
        { error: "No company found" },
        { status: 400 }
      );
    }

    const { memberId, action, role } = await req.json();

    if (!memberId) {
      return NextResponse.json(
        { error: "memberId required" },
        { status: 400 }
      );
    }

    if (memberId === userId) {
      return NextResponse.json(
        { error: "Cannot modify your own account here" },
        { status: 400 }
      );
    }

    // Verify member belongs to this company
    const member = await queryOne(
      "SELECT * FROM users WHERE id = $1 AND company_id = $2",
      [memberId, companyId]
    );

    if (!member) {
      return NextResponse.json(
        { error: "Member not found in your company" },
        { status: 404 }
      );
    }

    const memberName =
      `${member.first_name || ""} ${member.last_name || ""}`.trim() ||
      member.email;

    // ==========================================
    // CHANGE ROLE
    // ==========================================
    if (action === "change_role") {
      if (!["ADMIN", "HR", "INTERVIEWER"].includes(role)) {
        return NextResponse.json(
          { error: "Invalid role. Must be ADMIN, HR, or INTERVIEWER" },
          { status: 400 }
        );
      }

      const oldRole = member.role;

      if (oldRole === role) {
        return NextResponse.json(
          { error: `Member is already ${role}` },
          { status: 400 }
        );
      }

      await query(
        "UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2",
        [role, memberId]
      );

      // ✅ AUDIT
      await logAudit({
        userId,
        action: "MEMBER_ROLE_CHANGED",
        resourceType: "team",
        resourceId: memberId,
        resourceName: memberName,
        details: {
          email: member.email,
          oldRole,
          newRole: role,
        },
        req,
      });

      return NextResponse.json({
        success: true,
        message: `${memberName}'s role changed from ${oldRole} to ${role}`,
      });
    }

    // ==========================================
    // DEACTIVATE
    // ==========================================
    if (action === "deactivate") {
      if (!member.is_active) {
        return NextResponse.json(
          { error: "Member is already deactivated" },
          { status: 400 }
        );
      }

      await query(
        "UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1",
        [memberId]
      );

      // ✅ AUDIT
      await logAudit({
        userId,
        action: "MEMBER_DEACTIVATED",
        resourceType: "team",
        resourceId: memberId,
        resourceName: memberName,
        details: {
          email: member.email,
          role: member.role,
        },
        req,
      });

      return NextResponse.json({
        success: true,
        message: `${memberName} has been deactivated`,
      });
    }

    // ==========================================
    // ACTIVATE
    // ==========================================
    if (action === "activate") {
      if (member.is_active) {
        return NextResponse.json(
          { error: "Member is already active" },
          { status: 400 }
        );
      }

      await query(
        "UPDATE users SET is_active = true, updated_at = NOW() WHERE id = $1",
        [memberId]
      );

      // ✅ AUDIT
      await logAudit({
        userId,
        action: "MEMBER_ACTIVATED",
        resourceType: "team",
        resourceId: memberId,
        resourceName: memberName,
        details: {
          email: member.email,
          role: member.role,
        },
        req,
      });

      return NextResponse.json({
        success: true,
        message: `${memberName} has been reactivated`,
      });
    }

    return NextResponse.json(
      { error: "Invalid action. Use change_role, deactivate, or activate" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Member update error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update member" },
      { status: 500 }
    );
  }
}