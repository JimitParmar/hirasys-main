export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query, queryOne } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      role,
      company,
      phone,
    } = await req.json();

    // ==========================================
    // VALIDATION
    // ==========================================

    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        {
          error:
            "All fields are required: email, password, first name, last name",
        },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    if (firstName.trim().length < 1 || lastName.trim().length < 1) {
      return NextResponse.json(
        { error: "First name and last name are required" },
        { status: 400 }
      );
    }

    // ==========================================
    // DUPLICATE EMAIL CHECK
    // ==========================================
    const existingUser = await queryOne(
      "SELECT id, email, is_active FROM users WHERE LOWER(email) = LOWER($1)",
      [email.trim()]
    );

    if (existingUser) {
      if (!existingUser.is_active) {
        return NextResponse.json(
          {
            error:
              "This email was previously deactivated. Contact your company admin to reactivate.",
          },
          { status: 409 }
        );
      }
      return NextResponse.json(
        {
          error:
            "An account with this email already exists. Try signing in instead.",
        },
        { status: 409 }
      );
    }

    // ==========================================
    // COMPANY CHECKS (for HR/ADMIN role)
    // ==========================================
    const isHRRole = ["HR", "ADMIN"].includes(role || "CANDIDATE");
    let companyId = null;

    if (isHRRole) {
      if (!company || company.trim().length < 2) {
        return NextResponse.json(
          {
            error:
              "Company name is required for HR accounts (minimum 2 characters)",
          },
          { status: 400 }
        );
      }

      // Check for duplicate company name
      const existingCompany = await queryOne(
        "SELECT id, name, created_by FROM companies WHERE LOWER(TRIM(name)) = LOWER(TRIM($1))",
        [company.trim()]
      );

      if (existingCompany) {
        const companyAdmin = await queryOne(
          "SELECT first_name, last_name, email FROM users WHERE id = $1",
          [existingCompany.created_by]
        );

        const adminInfo = companyAdmin
          ? `Contact ${companyAdmin.first_name} ${companyAdmin.last_name} (${companyAdmin.email})`
          : "Contact your company administrator";

        return NextResponse.json(
          {
            error: `"${existingCompany.name}" is already registered on Hirasys. ${adminInfo} to get an invite link.`,
          },
          { status: 409 }
        );
      }

      // Check for similar company names (fuzzy match)
      const similarCompanies = await queryOne(
        `SELECT id, name FROM companies
         WHERE LOWER(TRIM(name)) LIKE LOWER(TRIM($1))
         OR LOWER(TRIM($1)) LIKE LOWER(TRIM(name))
         LIMIT 1`,
        [`%${company.trim()}%`]
      );

      if (similarCompanies) {
        return NextResponse.json(
          {
            error: `A similar company "${similarCompanies.name}" already exists. Did you mean that? If so, ask their admin for an invite link.`,
            suggestion: similarCompanies.name,
          },
          { status: 409 }
        );
      }

      // Check email domain
      const emailDomain = email.split("@")[1]?.toLowerCase();
      if (
        emailDomain &&
        ![
          "gmail.com",
          "yahoo.com",
          "hotmail.com",
          "outlook.com",
          "icloud.com",
        ].includes(emailDomain)
      ) {
        const existingDomainCompany = await queryOne(
          `SELECT c.id, c.name FROM companies c
           JOIN users u ON u.company_id = c.id
           WHERE LOWER(u.email) LIKE $1
           LIMIT 1`,
          [`%@${emailDomain}`]
        );

        if (existingDomainCompany) {
          return NextResponse.json(
            {
              error: `Someone from @${emailDomain} already has a company "${existingDomainCompany.name}" on Hirasys. Ask them for an invite link instead of creating a duplicate.`,
              suggestion: existingDomainCompany.name,
            },
            { status: 409 }
          );
        }
      }

      // All clear — create company
      const newCompany = await queryOne(
        `INSERT INTO companies (name, domain, created_by)
         VALUES ($1, $2, 'pending')
         RETURNING id`,
        [company.trim(), emailDomain || null]
      );

      companyId = newCompany?.id || null;
    }

    // ==========================================
    // CREATE USER
    // ==========================================
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await queryOne(
      `INSERT INTO users (email, password_hash, first_name, last_name, role,
       company, company_id, phone, is_active, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, false)
       RETURNING id, email, first_name, last_name, role, company, company_id`,
      [
        email.trim().toLowerCase(),
        passwordHash,
        firstName.trim(),
        lastName.trim(),
        companyId ? "ADMIN" : role || "CANDIDATE",
        company?.trim() || null,
        companyId,
        phone || null,
      ]
    );

    if (!user) {
      return NextResponse.json(
        { error: "Failed to create account" },
        { status: 500 }
      );
    }

    // Update company created_by now that we have the user ID
    if (companyId) {
      await query(
        "UPDATE companies SET created_by = $1 WHERE id = $2",
        [user.id, companyId]
      );

      // ✅ AUDIT — company created
      await logAudit({
        userId: user.id,
        action: "COMPANY_CREATED",
        resourceType: "company",
        resourceId: companyId,
        resourceName: company?.trim(),
        details: {
          domain: email.split("@")[1]?.toLowerCase() || null,
          founderEmail: email.trim().toLowerCase(),
        },
        req,
      });

      // ✅ AUDIT — HR user registered as founder
      await logAudit({
        userId: user.id,
        action: "USER_REGISTERED",
        resourceType: "user",
        resourceId: user.id,
        resourceName: `${firstName.trim()} ${lastName.trim()}`,
        details: {
          email: email.trim().toLowerCase(),
          role: "ADMIN",
          isFounder: true,
          companyName: company?.trim(),
        },
        req,
      });
    } else {
      // ✅ AUDIT — candidate or standalone user registered
      await logAudit({
        userId: user.id,
        action: "USER_REGISTERED",
        resourceType: "user",
        resourceId: user.id,
        resourceName: `${firstName.trim()} ${lastName.trim()}`,
        details: {
          email: email.trim().toLowerCase(),
          role: role || "CANDIDATE",
        },
        req,
      });
    }

    return NextResponse.json({ success: true, user }, { status: 201 });
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}