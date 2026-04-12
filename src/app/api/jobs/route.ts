export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, queryMany } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getCompanyUserIds } from "@/lib/company";
import { logAudit, getAuditUser } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    const session = await getSession();
    const userId = (session?.user as any)?.id;
    const role = (session?.user as any)?.role;
    const isHR = session && ["HR", "ADMIN"].includes(role);

    let whereClause = "WHERE 1=1";
    const params: any[] = [];
    let paramIndex = 1;

    if (!isHR) {
      // Candidates only see published jobs
      whereClause += ` AND j.status = 'PUBLISHED'`;
    } else if (isHR && userId) {
      // HR sees ALL jobs from their company
      const companyUserIds = await getCompanyUserIds(userId);

      if (companyUserIds.length > 0) {
        const placeholders = companyUserIds.map((_, i) => `$${paramIndex + i}`).join(", ");
        whereClause += ` AND j.posted_by IN (${placeholders})`;
        params.push(...companyUserIds);
        paramIndex += companyUserIds.length;
      }

      if (status) {
        whereClause += ` AND j.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }
    }

    if (search) {
      whereClause += ` AND (j.title ILIKE $${paramIndex} OR j.description ILIKE $${paramIndex} OR j.department ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const countResult = await queryOne(
      `SELECT COUNT(*) as count FROM jobs j ${whereClause}`,
      params
    );

    const jobs = await queryMany(
      `SELECT j.*,
        u.first_name as poster_first_name,
        u.last_name as poster_last_name,
        u.company as poster_company,
        (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) as application_count
       FROM jobs j
       LEFT JOIN users u ON j.posted_by = u.id
       ${whereClause}
       ORDER BY j.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    const formattedJobs = jobs.map((j) => ({
      id: j.id,
      title: j.title,
      description: j.description,
      requirements: j.requirements,
      skills: j.skills,
      department: j.department,
      location: j.location,
      type: j.type,
      experienceMin: j.experience_min,
      experienceMax: j.experience_max,
      salaryMin: j.salary_min ? parseFloat(j.salary_min) : null,
      salaryMax: j.salary_max ? parseFloat(j.salary_max) : null,
      salaryCurrency: j.salary_currency,
      status: j.status,
      pipeline_id: j.pipeline_id,
      createdAt: j.created_at,
      postedBy: j.posted_by,
      poster: {
        firstName: j.poster_first_name,
        lastName: j.poster_last_name,
        company: j.poster_company,
      },
      _count: { applications: parseInt(j.application_count) },
    }));

    const total = parseInt(countResult?.count || "0");

    return NextResponse.json({
      jobs: formattedJobs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    console.error("Jobs fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["HR", "ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    if (!body.title || !body.description || !body.department || !body.location) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (body.status === "PUBLISHED" && !body.pipelineId) {
      return NextResponse.json({ error: "A pipeline must be linked before publishing" }, { status: 400 });
    }

    const job = await queryOne(
      `INSERT INTO jobs (
        title, description, requirements, skills, department, location,
        type, experience_min, experience_max, salary_min, salary_max,
        salary_currency, status, pipeline_id, posted_by, closing_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        body.title, body.description, body.requirements || [], body.skills || [],
        body.department, body.location, body.type || "full_time",
        body.experienceMin || 0, body.experienceMax || 99,
        body.salaryMin || null, body.salaryMax || null,
        body.salaryCurrency || "USD", body.status || "DRAFT",
        body.pipelineId || null, (session.user as any).id,
        body.closingDate ? new Date(body.closingDate) : null,
      ]
    );

    await logAudit({
      ...getAuditUser(session),
      action: "JOB_CREATED",
      resourceType: "job",
      resourceId: job.id,
      resourceName: body.title,
      details: { status: body.status, department: body.department },
    });

    return NextResponse.json({ success: true, job }, { status: 201 });
  } catch (error: any) {
    console.error("Job creation error:", error);
    return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
  }
}