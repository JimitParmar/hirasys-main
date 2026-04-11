import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, queryMany } from "@/lib/db";
import { getSession } from "@/lib/session";
import { logAudit, getAuditUser } from "@/lib/audit";
import crypto from "crypto";

// POST — invite team member
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = session.user as any;
    if (!["ADMIN", "HR"].includes(user.role)) {
      return NextResponse.json({ error: "Only admins and HR can invite" }, { status: 403 });
    }

    // Only ADMIN can invite other ADMINs or HRs
    const { email, role, department } = await req.json();

    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    const validRoles = user.role === "ADMIN"
      ? ["ADMIN", "HR", "INTERVIEWER"]
      : ["INTERVIEWER"]; // HR can only invite interviewers

    if (!validRoles.includes(role || "HR")) {
      return NextResponse.json({
        error: `You can only invite: ${validRoles.join(", ")}`,
      }, { status: 403 });
    }

    // Check if already in company
    const existing = await queryOne(
      "SELECT id FROM users WHERE email = $1 AND company_id = $2",
      [email, user.companyId]
    );
    if (existing) {
      return NextResponse.json({ error: "User already in your company" }, { status: 409 });
    }

    // Check pending invite
    const pendingInvite = await queryOne(
      "SELECT id FROM invitations WHERE email = $1 AND company_id = $2 AND status = 'PENDING'",
      [email, user.companyId]
    );
    if (pendingInvite) {
      return NextResponse.json({ error: "Invitation already pending" }, { status: 409 });
    }

    // Generate invite token
    const token = crypto.randomBytes(32).toString("hex");

    const invitation = await queryOne(
      `INSERT INTO invitations (company_id, email, role, invited_by, token)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [user.companyId, email, role || "HR", user.id, token]
    );

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/invite/${token}`;

    await logAudit({
      ...getAuditUser(session),
      action: "TEAM_MEMBER_INVITED",
      resourceType: "invitation",
      resourceId: invitation.id,
      resourceName: email,
      details: { email, role: role || "HR", inviteUrl },
    });

    return NextResponse.json({
      success: true,
      invitation,
      inviteUrl,
      message: `Invite link generated. Share with ${email}: ${inviteUrl}`,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE — revoke invitation
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = session.user as any;
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Only admins can revoke" }, { status: 403 });
    }

    const { invitationId } = await req.json();

    await query(
      "UPDATE invitations SET status = 'REVOKED' WHERE id = $1 AND company_id = $2",
      [invitationId, user.companyId]
    );

    await logAudit({
      ...getAuditUser(session),
      action: "INVITATION_REVOKED",
      resourceType: "invitation",
      resourceId: invitationId,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}