import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const job = await queryOne(
      `SELECT j.*,
        u.first_name as poster_first_name,
        u.last_name as poster_last_name,
        u.company as poster_company,
        (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) as application_count
       FROM jobs j
       LEFT JOIN users u ON j.posted_by = u.id
       WHERE j.id = $1`,
      [id]
    );

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json({
      job: {
        ...job,
        experienceMin: job.experience_min,
        experienceMax: job.experience_max,
        salaryMin: job.salary_min ? parseFloat(job.salary_min) : null,
        salaryMax: job.salary_max ? parseFloat(job.salary_max) : null,
        salaryCurrency: job.salary_currency,
        createdAt: job.created_at,
        poster: {
          firstName: job.poster_first_name,
          lastName: job.poster_last_name,
          company: job.poster_company,
        },
        _count: { applications: parseInt(job.application_count) },
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch job" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !["HR", "ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    // Build dynamic update query
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 2; // $1 is id

    const fieldMap: Record<string, string> = {
      title: "title",
      description: "description",
      department: "department",
      location: "location",
      type: "type",
      status: "status",
      experienceMin: "experience_min",
      experienceMax: "experience_max",
      salaryMin: "salary_min",
      salaryMax: "salary_max",
      salaryCurrency: "salary_currency",
      pipelineId: "pipeline_id",
    };

    for (const [jsKey, dbKey] of Object.entries(fieldMap)) {
      if (body[jsKey] !== undefined) {
        fields.push(`${dbKey} = $${idx}`);
        values.push(body[jsKey]);
        idx++;
      }
    }

    // Handle arrays separately
    if (body.skills !== undefined) {
      fields.push(`skills = $${idx}`);
      values.push(body.skills);
      idx++;
    }

    if (body.requirements !== undefined) {
      fields.push(`requirements = $${idx}`);
      values.push(body.requirements);
      idx++;
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    fields.push("updated_at = NOW()");

    const job = await queryOne(
      `UPDATE jobs SET ${fields.join(", ")} WHERE id = $1 RETURNING *`,
      [id, ...values]
    );

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, job });
  } catch (error: any) {
    console.error("Job update error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}