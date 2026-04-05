import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, queryMany } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId");

    let whereClause = "WHERE 1=1";
    const params: any[] = [];
    let idx = 1;

    if ((session.user as any).role === "CANDIDATE") {
      whereClause += ` AND a.candidate_id = $${idx}`;
      params.push((session.user as any).id);
      idx++;
    }

    if (jobId) {
      whereClause += ` AND a.job_id = $${idx}`;
      params.push(jobId);
      idx++;
    }

    const applications = await queryMany(
      `SELECT a.*,
        j.title as job_title,
        j.department as job_department,
        j.location as job_location,
        j.type as job_type,
        ju.company as job_company,
        u.first_name as candidate_first_name,
        u.last_name as candidate_last_name,
        u.email as candidate_email
       FROM applications a
       LEFT JOIN jobs j ON a.job_id = j.id
       LEFT JOIN users ju ON j.posted_by = ju.id
       LEFT JOIN users u ON a.candidate_id = u.id
       ${whereClause}
       ORDER BY a.applied_at DESC`,
      params
    );

    const formatted = applications.map((a) => ({
      id: a.id,
      jobId: a.job_id,
      candidateId: a.candidate_id,
      status: a.status,
      resumeScore: a.resume_score,
      appliedAt: a.applied_at,
      job: {
        id: a.job_id,
        title: a.job_title,
        department: a.job_department,
        location: a.job_location,
        type: a.job_type,
        poster: { company: a.job_company },
      },
      candidate: {
        id: a.candidate_id,
        firstName: a.candidate_first_name,
        lastName: a.candidate_last_name,
        email: a.candidate_email,
      },
    }));

    return NextResponse.json({ applications: formatted, total: formatted.length });
  } catch (error) {
    console.error("Applications fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobId, coverLetter, resumeText } = await req.json();

    const job = await queryOne("SELECT * FROM jobs WHERE id = $1 AND status = 'PUBLISHED'", [jobId]);
    if (!job) {
      return NextResponse.json({ error: "Job not available" }, { status: 404 });
    }

    const existing = await queryOne(
      "SELECT id FROM applications WHERE job_id = $1 AND candidate_id = $2",
      [jobId, (session.user as any).id]
    );
    if (existing) {
      return NextResponse.json({ error: "Already applied" }, { status: 409 });
    }

    // Resume scoring
    let resumeScore = 0;
    let resumeParsed: any = null;

    if (resumeText && process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "sk-your-key-here") {
      try {
        const { aiJSON } = await import("@/lib/ai");
        const result = await aiJSON<{
          score: number; matchedSkills: string[]; missingSkills: string[];
          summary: string; strengths: string[]; improvements: string[];
        }>(
          `Score this resume against the job (0-100). Return JSON: { score, matchedSkills, missingSkills, summary, strengths, improvements }`,
          `Job: ${job.title}\nDescription: ${job.description}\nSkills: ${(job.skills || []).join(", ")}\n\nResume:\n${resumeText}`
        );
        resumeScore = result.score || 0;
        resumeParsed = result;
      } catch (err) {
        console.error("AI scoring failed:", err);
      }
    } else if (resumeText) {
      const resumeLower = resumeText.toLowerCase();
      const skills = job.skills || [];
      const matched = skills.filter((s: string) => resumeLower.includes(s.toLowerCase()));
      resumeScore = Math.round((matched.length / Math.max(skills.length, 1)) * 100);
      resumeParsed = { score: resumeScore, matchedSkills: matched, method: "keyword" };
    }

    const application = await queryOne(
      `INSERT INTO applications (job_id, candidate_id, resume_url, resume_text, resume_parsed, cover_letter, status, resume_score, current_stage)
       VALUES ($1, $2, 'text-input', $3, $4, $5, 'APPLIED', $6, 'applied')
       RETURNING *`,
      [jobId, (session.user as any).id, resumeText || null, JSON.stringify(resumeParsed), coverLetter || null, resumeScore]
    );

    // Increment count
    await query("UPDATE jobs SET applicant_count = applicant_count + 1 WHERE id = $1", [jobId]);

    return NextResponse.json({
      success: true,
      application: { ...application, resumeScore },
    }, { status: 201 });
  } catch (error: any) {
    console.error("Application error:", error);
    return NextResponse.json({ error: "Application failed" }, { status: 500 });
  }
}