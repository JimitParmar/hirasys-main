export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import bcrypt from "bcryptjs";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const { token, firstName, lastName, password } = await req.json();

    if (!token || !firstName || !lastName || !password) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const invitation = await queryOne(
      `SELECT i.*, c.name as company_name
       FROM invitations i
       LEFT JOIN companies c ON i.company_id = c.id
       WHERE i.token = $1 AND i.status = 'PENDING' AND i.expires_at > NOW()`,
      [token]
    );

    if (!invitation) {
      return NextResponse.json(
        { error: "Invalid or expired invitation" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existing = await queryOne(
      "SELECT id, company_id, is_active FROM users WHERE LOWER(email) = LOWER($1)",
      [invitation.email]
    );

    let acceptedUserId: string;

    if (existing) {
      if (existing.company_id === invitation.company_id) {
        return NextResponse.json(
          {
            error:
              "You're already a member of this company. Try signing in.",
          },
          { status: 409 }
        );
      }

      if (
        existing.company_id &&
        existing.company_id !== invitation.company_id
      ) {
        return NextResponse.json(
          {
            error:
              "This email is already associated with another company. Use a different email or contact support.",
          },
          { status: 409 }
        );
      }

      // User exists but not in any company — link them
      await query(
        `UPDATE users SET company_id = $1, role = $2, invited_by = $3,
         is_active = true, updated_at = NOW()
         WHERE id = $4`,
        [
          invitation.company_id,
          invitation.role,
          invitation.invited_by,
          existing.id,
        ]
      );

      acceptedUserId = existing.id;
    } else {
      // Create new user
      const passwordHash = await bcrypt.hash(password, 12);
      const newUser = await queryOne(
        `INSERT INTO users (email, password_hash, first_name, last_name, role,
         company_id, invited_by, is_active, company)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8)
         RETURNING id`,
        [
          invitation.email.toLowerCase(),
          passwordHash,
          firstName.trim(),
          lastName.trim(),
          invitation.role,
          invitation.company_id,
          invitation.invited_by,
          invitation.company_name,
        ]
      );

      acceptedUserId = newUser?.id || invitation.invited_by;
    }

    // Mark invitation as accepted
    await query(
      "UPDATE invitations SET status = 'ACCEPTED', accepted_at = NOW() WHERE id = $1",
      [invitation.id]
    );

    // ✅ AUDIT — log as the new user who accepted
    await logAudit({
      userId: acceptedUserId,
      action: "INVITATION_ACCEPTED",
      resourceType: "team",
      resourceId: invitation.id,
      resourceName: invitation.email,
      details: {
        email: invitation.email,
        role: invitation.role,
        companyId: invitation.company_id,
        companyName: invitation.company_name,
        invitedBy: invitation.invited_by,
      },
      req,
    });

    return NextResponse.json({
      success: true,
      message: "Account created! You can now sign in.",
    });
  } catch (error: any) {
    console.error("Invite accept error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to accept invitation" },
      { status: 500 }
    );
  }
}