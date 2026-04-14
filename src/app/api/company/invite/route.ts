export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, queryMany } from "@/lib/db";
import { getSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { getUserCompanyId } from "@/lib/company";
import crypto from "crypto";
import { checkMemberLimit } from "@/lib/plan-limits";

// ==========================================
// POST — invite team member
// ==========================================
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    
    const userId = user.id;


// After auth check:
const memberLimit = await checkMemberLimit(userId);
if (!memberLimit.allowed) {
  return NextResponse.json(
    {
      error: memberLimit.message,
      upgradeRequired: memberLimit.upgradeRequired,
    },
    { status: 403 }
  );
}

    if (!["ADMIN", "HR"].includes(user.role)) {
      return NextResponse.json(
        { error: "Only admins and HR can invite" },
        { status: 403 }
      );
    }

    // Resolve company from DB
    const companyId = user.companyId || (await getUserCompanyId(userId));

    if (!companyId) {
      return NextResponse.json(
        { error: "No company account. Create one first." },
        { status: 400 }
      );
    }

    const { email, role, department } = await req.json();

    if (!email || !email.trim()) {
      return NextResponse.json(
        { error: "Email required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Permission check — HR can only invite interviewers
    const validRoles =
      user.role === "ADMIN"
        ? ["ADMIN", "HR", "INTERVIEWER"]
        : ["INTERVIEWER"];

    const inviteRole = role || "HR";
    if (!validRoles.includes(inviteRole)) {
      return NextResponse.json(
        { error: `You can only invite: ${validRoles.join(", ")}` },
        { status: 403 }
      );
    }

    // Check if already in company
    const existingMember = await queryOne(
      "SELECT id, email, is_active FROM users WHERE LOWER(email) = LOWER($1) AND company_id = $2",
      [email.trim(), companyId]
    );

    if (existingMember) {
      if (existingMember.is_active) {
        return NextResponse.json(
          { error: "This person is already a member of your company" },
          { status: 409 }
        );
      } else {
        return NextResponse.json(
          {
            error:
              "This person was previously deactivated. Reactivate them from the Team page instead.",
          },
          { status: 409 }
        );
      }
    }

    // Check if email belongs to another company
    const existingOtherCompany = await queryOne(
      "SELECT company_id FROM users WHERE LOWER(email) = LOWER($1) AND company_id IS NOT NULL AND company_id != $2",
      [email.trim(), companyId]
    );

    if (existingOtherCompany) {
      return NextResponse.json(
        {
          error:
            "This email is already associated with another company on Hirasys.",
        },
        { status: 409 }
      );
    }

    // Check pending invite
    const pendingInvite = await queryOne(
      "SELECT id FROM invitations WHERE LOWER(email) = LOWER($1) AND company_id = $2 AND status = 'PENDING' AND expires_at > NOW()",
      [email.trim(), companyId]
    );

    if (pendingInvite) {
      return NextResponse.json(
        { error: "An invitation is already pending for this email" },
        { status: 409 }
      );
    }

    // Generate secure invite token
    const token = crypto.randomBytes(32).toString("hex");
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const inviteUrl = `${appUrl}/invite/${token}`;

    // Create invitation record
    const invitation = await queryOne(
      `INSERT INTO invitations (company_id, email, role, invited_by, token)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [companyId, email.trim().toLowerCase(), inviteRole, userId, token]
    );

    if (!invitation) {
      return NextResponse.json(
        { error: "Failed to create invitation" },
        { status: 500 }
      );
    }

    // Get company name for email
    const company = await queryOne(
      "SELECT name FROM companies WHERE id = $1",
      [companyId]
    );

    // Send invitation email
    try {
      const { sendTeamInvite } = await import("@/lib/email");
      await sendTeamInvite({
        to: email.trim().toLowerCase(),
        inviterName: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
        companyName: company?.name || user.company || "the team",
        role: inviteRole,
        inviteUrl,
      });
      console.log(
        `[Invite] Email sent to ${email} for ${company?.name}`
      );
    } catch (emailErr) {
      console.error("[Invite] Email send failed:", emailErr);
      // Don't fail the invite if email fails — they can still use the link
    }

    // Create in-app notification for the inviter (confirmation)
    try {
      await query(
        `INSERT INTO notifications (user_id, type, title, message, link)
         VALUES ($1, 'GENERAL', 'Invitation Sent', $2, '/hr/team')`,
        [userId, `Invitation sent to ${email} as ${inviteRole}`]
      );
    } catch {}

    // ✅ AUDIT — after successful invite
    await logAudit({
      userId,
      action: "TEAM_MEMBER_INVITED",
      resourceType: "team",
      resourceId: invitation.id,
      resourceName: email.trim().toLowerCase(),
      details: {
        email: email.trim().toLowerCase(),
        role: inviteRole,
        companyName: company?.name,
        department: department || null,
      },
      req,
    });

    return NextResponse.json(
      {
        success: true,
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          status: invitation.status,
          expiresAt: invitation.expires_at,
        },
        inviteUrl,
        message: `Invitation sent to ${email}. They can join using the link.`,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Invite error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create invitation" },
      { status: 500 }
    );
  }
}

// ==========================================
// DELETE — revoke invitation
// ==========================================
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    const userId = user.id;

    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only admins can revoke invitations" },
        { status: 403 }
      );
    }

    // Resolve company from DB
    const companyId = user.companyId || (await getUserCompanyId(userId));

    if (!companyId) {
      return NextResponse.json(
        { error: "No company" },
        { status: 400 }
      );
    }

    const { invitationId } = await req.json();

    if (!invitationId) {
      return NextResponse.json(
        { error: "invitationId required" },
        { status: 400 }
      );
    }

    // Verify invitation belongs to this company
    const invitation = await queryOne(
      "SELECT * FROM invitations WHERE id = $1 AND company_id = $2",
      [invitationId, companyId]
    );

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    if (invitation.status !== "PENDING") {
      return NextResponse.json(
        {
          error: `Cannot revoke — invitation is already ${invitation.status}`,
        },
        { status: 400 }
      );
    }

    await query(
      "UPDATE invitations SET status = 'REVOKED' WHERE id = $1",
      [invitationId]
    );

    // ✅ AUDIT — after successful revoke
    await logAudit({
      userId,
      action: "INVITATION_REVOKED",
      resourceType: "team",
      resourceId: invitationId,
      resourceName: invitation.email,
      details: {
        email: invitation.email,
        role: invitation.role,
      },
      req,
    });

    return NextResponse.json({
      success: true,
      message: `Invitation to ${invitation.email} has been revoked`,
    });
  } catch (error: any) {
    console.error("Revoke error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to revoke" },
      { status: 500 }
    );
  }
}