export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, queryMany } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getCompanyUserIds } from "@/lib/company";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId");

    const userId = (session.user as any).id;
    const role = (session.user as any).role;

    let whereClause = "WHERE 1=1";
    const params: any[] = [];
    let idx = 1;

    if (role === "CANDIDATE") {
      // Candidates see only their own
      whereClause += ` AND a.candidate_id = $${idx}`;
      params.push(userId);
      idx++;
    } else if (["HR", "ADMIN"].includes(role)) {
      // HR/Admin see applications for ALL company jobs
      if (jobId) {
        whereClause += ` AND a.job_id = $${idx}`;
        params.push(jobId);
        idx++;
      } else {
        // All applications for jobs posted by anyone in the company
        const companyUserIds = await getCompanyUserIds(userId);
        const placeholders = companyUserIds.map((_, i) => `$${idx + i}`).join(", ");
        whereClause += ` AND a.job_id IN (SELECT id FROM jobs WHERE posted_by IN (${placeholders}))`;
        params.push(...companyUserIds);
        idx += companyUserIds.length;
      }
    }

    const applications = await queryMany(
      `SELECT a.*,
        j.title as job_title, j.department as job_department,
        j.location as job_location, j.type as job_type,
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
        id: a.job_id, title: a.job_title, department: a.job_department,
        location: a.job_location, type: a.job_type,
        poster: { company: a.job_company },
      },
      candidate: {
        id: a.candidate_id, firstName: a.candidate_first_name,
        lastName: a.candidate_last_name, email: a.candidate_email,
      },
    }));

    return NextResponse.json({ applications: formatted, total: formatted.length });
  } catch (error) {
    console.error("Applications fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

// In your applications POST handler, find where resume is processed
// Replace the synchronous parsing with background processing:

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();
    const { jobId, resumeUrl, resumeText: rawResumeText, coverLetter } = body;

    if (!jobId) {
      return NextResponse.json({ error: "jobId required" }, { status: 400 });
    }

    // Check for duplicate
    const existing = await queryOne(
      "SELECT id FROM applications WHERE job_id = $1 AND candidate_id = $2",
      [jobId, userId]
    );

    if (existing) {
      return NextResponse.json(
        { error: "You've already applied to this job" },
        { status: 409 }
      );
    }

    // ==========================================
    // CREATE APPLICATION IMMEDIATELY
    // Don't wait for resume parsing
    // ==========================================
    const application = await queryOne(
      `INSERT INTO applications (job_id, candidate_id, resume_url, resume_text, cover_letter, status)
       VALUES ($1, $2, $3, $4, $5, 'APPLIED')
       RETURNING *`,
      [
        jobId,
        userId,
        resumeUrl || null,
        rawResumeText || null, // Store raw text if provided
        coverLetter || null,
      ]
    );

    if (!application) {
      return NextResponse.json(
        { error: "Failed to create application" },
        { status: 500 }
      );
    }

    // Update applicant count
    await query(
      "UPDATE jobs SET applicant_count = applicant_count + 1 WHERE id = $1",
      [jobId]
    );

    // ==========================================
    // RETURN SUCCESS IMMEDIATELY
    // ==========================================
    const response = NextResponse.json(
      {
        success: true,
        application: {
          id: application.id,
          status: "APPLIED",
          message: "Application submitted! Resume is being processed.",
        },
      },
      { status: 201 }
    );

    // ==========================================
    // BACKGROUND: Parse resume + trigger pipeline
    // Using waitUntil pattern for serverless
    // ==========================================
    const backgroundWork = async () => {
      try {
        console.log(`[BG] Processing resume for application ${application.id}`);

        let parsedResume: any = null;
        let resumeScore = 0;
        let finalResumeText = rawResumeText || null;

        // Get job for matching
        const job = await queryOne(
          "SELECT * FROM jobs WHERE id = $1",
          [jobId]
        );

        // If we have a resume URL but no text, extract it
        if (resumeUrl && !finalResumeText) {
          try {
            const { extractTextFromResume } = await import("@/lib/resume");
            finalResumeText = await extractTextFromResume(resumeUrl);
            console.log(
              `[BG] Extracted ${finalResumeText?.length || 0} chars from resume`
            );
          } catch (err) {
            console.error("[BG] Resume extraction failed:", err);
          }
        }

        // AI-parse and score the resume
        if (finalResumeText && job) {
          try {
            const { aiJSON } = await import("@/lib/ai");

            const result = await aiJSON<{
              score: number;
              matchedSkills: string[];
              missingSkills: string[];
              experience: string;
              education: string;
              summary: string;
              strengths: string[];
              concerns: string[];
            }>(
              `Analyze this resume against the job requirements.

JOB TITLE: ${job.title}
JOB DESCRIPTION: ${job.description?.substring(0, 1000)}
REQUIRED SKILLS: ${(job.skills || []).join(", ")}
REQUIREMENTS: ${(job.requirements || []).join(", ")}

RESUME:
${finalResumeText.substring(0, 4000)}

Return JSON with:
- score: 0-100 match percentage
- matchedSkills: skills from job found in resume
- missingSkills: required skills NOT in resume
- experience: brief experience summary
- education: education summary
- summary: 2-3 sentence candidate summary
- strengths: top 3 strengths for this role
- concerns: top 3 concerns/gaps`,
              "Score this resume"
            );

            parsedResume = result;
            resumeScore = result.score || 0;

            console.log(
              `[BG] Resume scored: ${resumeScore}% for application ${application.id}`
            );
          } catch (err) {
            console.error("[BG] AI resume scoring failed:", err);
            resumeScore = 0;
          }
        }

        // Update the application with parsed data
        await query(
          `UPDATE applications
           SET resume_text = COALESCE($2, resume_text),
               resume_parsed = $3,
               resume_score = $4,
               updated_at = NOW()
           WHERE id = $1`,
          [
            application.id,
            finalResumeText,
            parsedResume ? JSON.stringify(parsedResume) : null,
            resumeScore,
          ]
        );

        // Also update user's resume text for future applications
        if (finalResumeText) {
          await query(
            "UPDATE users SET resume_text = $2, resume_url = COALESCE($3, resume_url), updated_at = NOW() WHERE id = $1",
            [userId, finalResumeText, resumeUrl]
          );
        }

        // Trigger pipeline execution
        try {
          const appUrl =
            process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
          await fetch(`${appUrl}/api/pipeline/execute`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              applicationId: application.id,
              trigger: "application_submitted",
            }),
          });
          console.log(
            `[BG] Pipeline triggered for application ${application.id}`
          );
        } catch (err) {
          console.error("[BG] Pipeline trigger failed:", err);
        }

        // Track billing
        try {
          const { getUserCompanyId } = await import("@/lib/company");
          const { trackUsage } = await import("@/lib/billing");
          const jobData = await queryOne(
            "SELECT posted_by FROM jobs WHERE id = $1",
            [jobId]
          );
          if (jobData?.posted_by) {
            const companyId = await getUserCompanyId(jobData.posted_by);
            if (companyId) {
              await trackUsage({
                companyId,
                nodeType: "ai_resume_screen",
                jobId,
                applicationId: application.id,
              });
            }
          }
        } catch {}

        console.log(
          `[BG] ✅ Resume processing complete for ${application.id}`
        );
      } catch (err) {
        console.error(
          `[BG] ❌ Background processing failed for ${application.id}:`,
          err
        );
      }
    };

    // Fire and forget — don't await
    backgroundWork().catch((err) =>
      console.error("[BG] Unhandled error:", err)
    );

    return response;
  } catch (error: any) {
    console.error("Application error:", error);
    return NextResponse.json(
      { error: error.message || "Application failed" },
      { status: 500 }
    );
  }
}