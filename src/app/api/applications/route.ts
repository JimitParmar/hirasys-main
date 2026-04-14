export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, queryMany } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getCompanyUserIds } from "@/lib/company";
import { checkApplicantLimit } from "@/lib/plan-limits";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const role = (session.user as any).role;
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId");
    const status = searchParams.get("status");

    let whereClause = "WHERE 1=1";
    const params: any[] = [];
    let idx = 1;

    // ==========================================
    // CANDIDATE VIEW — only their own applications
    // ==========================================
    if (role === "CANDIDATE") {
      whereClause += ` AND a.candidate_id = $${idx}`;
      params.push(userId);
      idx++;

      if (jobId) {
        whereClause += ` AND a.job_id = $${idx}`;
        params.push(jobId);
        idx++;
      }

      // Lightweight query — no heavy joins
      const applications = await queryMany(
        `SELECT
          a.id, a.job_id, a.status, a.resume_score, a.current_stage,
          a.applied_at, a.updated_at,
          j.title as job_title, j.department as job_department,
          j.location as job_location, j.type as job_type,
          j.status as job_status
         FROM applications a
         JOIN jobs j ON a.job_id = j.id
         ${whereClause}
         ORDER BY a.applied_at DESC`,
        params
      );

      return NextResponse.json({
        applications: applications.map((a: any) => ({
          id: a.id,
          jobId: a.job_id,
          status: a.status,
          resumeScore: parseFloat(a.resume_score) || 0,
          currentStage: a.current_stage,
          appliedAt: a.applied_at,
          updatedAt: a.updated_at,
          jobTitle: a.job_title,
          jobDepartment: a.job_department,
          jobLocation: a.job_location,
          jobType: a.job_type,
          jobStatus: a.job_status,
        })),
      });
    }

    // ==========================================
    // HR VIEW — applications for their jobs
    // ==========================================
    if (jobId) {
      whereClause += ` AND a.job_id = $${idx}`;
      params.push(jobId);
      idx++;
    } else {
      // Only show applications for jobs posted by this company
      const { getCompanyUserIds } = await import("@/lib/company");
      const companyUserIds = await getCompanyUserIds(userId);

      if (companyUserIds.length > 0) {
        const placeholders = companyUserIds
          .map((_, i) => `$${idx + i}`)
          .join(", ");
        whereClause += ` AND j.posted_by IN (${placeholders})`;
        params.push(...companyUserIds);
        idx += companyUserIds.length;
      }
    }

    if (status) {
      whereClause += ` AND a.status = $${idx}`;
      params.push(status);
      idx++;
    }

    const applications = await queryMany(
      `SELECT
        a.id, a.job_id, a.candidate_id, a.status, a.resume_score,
        a.current_stage, a.applied_at, a.updated_at,
        a.resume_parsed, a.cover_letter,
        j.title as job_title, j.department as job_department,
        u.first_name as candidate_first_name,
        u.last_name as candidate_last_name,
        u.email as candidate_email
       FROM applications a
       JOIN jobs j ON a.job_id = j.id
       LEFT JOIN users u ON a.candidate_id = u.id
       ${whereClause}
       ORDER BY a.resume_score DESC NULLS LAST, a.applied_at DESC
       LIMIT 200`,
      params
    );

    return NextResponse.json({
      applications: applications.map((a: any) => ({
        id: a.id,
        jobId: a.job_id,
        candidateId: a.candidate_id,
        status: a.status,
        resumeScore: parseFloat(a.resume_score) || 0,
        currentStage: a.current_stage,
        appliedAt: a.applied_at,
        updatedAt: a.updated_at,
        coverLetter: a.cover_letter,
        candidate: {
          firstName: a.candidate_first_name,
          lastName: a.candidate_last_name,
          email: a.candidate_email,
        },
        jobTitle: a.job_title,
        jobDepartment: a.job_department,
        resumeParsed: (() => {
          try {
            return typeof a.resume_parsed === "string"
              ? JSON.parse(a.resume_parsed)
              : a.resume_parsed;
          } catch {
            return null;
          }
        })(),
      })),
    });
  } catch (error: any) {
    console.error("Applications GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch applications" },
      { status: 500 }
    );
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
    const { jobId, resumeUrl, resumeText, coverLetter } = body;

    if (!jobId) {
      return NextResponse.json(
        { error: "jobId required" },
        { status: 400 }
      );
    }

    // Check duplicate
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

    const jobData = await queryOne(
  "SELECT posted_by, title, status FROM jobs WHERE id = $1",
  [jobId]
);

if (!jobData) {
  return NextResponse.json(
    { error: "Job not found" },
    { status: 404 }
  );
}

if (jobData.status !== "PUBLISHED") {
  return NextResponse.json(
    { error: "This job is no longer accepting applications" },
    { status: 400 }
  );
}

const applicantLimit = await checkApplicantLimit(jobId, jobData.posted_by);

if (!applicantLimit.allowed) {
  // Don't tell the candidate about the company's plan limits
  // Show a generic "no longer accepting" message instead
  return NextResponse.json(
    {
      error: "This position has received the maximum number of applications and is no longer accepting new ones. Please check back later or explore other openings.",
    },
    { status: 400 }
  );
}


    // Create application immediately
    const application = await queryOne(
      `INSERT INTO applications (job_id, candidate_id, resume_url, resume_text, cover_letter, status)
       VALUES ($1, $2, $3, $4, $5, 'APPLIED')
       RETURNING id, status`,
      [
        jobId,
        userId,
        resumeUrl || null,
        resumeText || null,
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

    try {
  const newCount = await queryOne(
    "SELECT COUNT(*)::int as count FROM applications WHERE job_id = $1",
    [jobId]
  );

  const postLimit = await checkApplicantLimit(jobId, jobData.posted_by);

  if (!postLimit.allowed) {
    // Limit reached — auto-close the job
    await query(
      "UPDATE jobs SET status = 'CLOSED', metadata = jsonb_set(COALESCE(metadata, '{}'), '{closedReason}', '\"applicant_limit_reached\"'), updated_at = NOW() WHERE id = $1 AND status = 'PUBLISHED'",
      [jobId]
    );

    // Notify HR
    await query(
      `INSERT INTO notifications (user_id, type, title, message, link)
       VALUES ($1, 'JOB_UPDATE', '📋 Job Auto-Closed', $2, $3)`,
      [
        jobData.posted_by,
        `"${jobData.title}" has been automatically closed after reaching ${newCount?.count} applications (plan limit). Upgrade your plan to accept more applicants.`,
        `/hr/jobs/${jobId}`,
      ]
    );

    console.log(
      `[Plan] Job ${jobId} auto-closed: ${newCount?.count} applicants (limit: ${postLimit.limit})`
    );
  }
} catch (err) {
  console.error("Auto-close check failed (non-critical):", err);
}

    // ==========================================
    // RETURN IMMEDIATELY — don't wait for parsing
    // ==========================================
    const response = NextResponse.json(
      {
        success: true,
        application: {
          id: application.id,
          status: "APPLIED",
        },
      },
      { status: 201 }
    );

    // ==========================================
    // BACKGROUND: Parse resume + trigger pipeline
    // Fire-and-forget — errors won't affect the response
    // ==========================================
    const doBackgroundWork = async () => {
      try {
        console.log(`[BG] Starting resume processing for ${application.id}`);
        const startTime = Date.now();

        const job = await queryOne(
          "SELECT id, title, description, skills, requirements, posted_by FROM jobs WHERE id = $1",
          [jobId]
        );

        if (!job) {
          console.error(`[BG] Job not found: ${jobId}`);
          return;
        }

        let finalResumeText = resumeText || null;

        // Extract text from file if needed
        if (resumeUrl && !finalResumeText) {
          try {
            const { extractTextFromResume } = await import("@/lib/resume");
            finalResumeText = await extractTextFromResume(resumeUrl);
            console.log(
              `[BG] Extracted ${finalResumeText?.length || 0} chars`
            );
          } catch (err) {
            console.error("[BG] Resume extraction failed:", err);
          }
        }

        // AI score
        let parsedResume: any = null;
        let resumeScore = 0;

        if (finalResumeText) {
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
              `Analyze this resume against the job requirements. Be fair and practical.

JOB TITLE: ${job.title}
JOB DESCRIPTION: ${(job.description || "").substring(0, 800)}
REQUIRED SKILLS: ${(job.skills || []).join(", ")}
REQUIREMENTS: ${(job.requirements || []).join(", ")}

RESUME:
${finalResumeText.substring(0, 3000)}

Return JSON:
- score: 0-100 match percentage
- matchedSkills: skills from job found in resume
- missingSkills: required skills NOT in resume
- experience: brief experience summary
- education: education summary
- summary: 2-3 sentence candidate summary
- strengths: top 3 strengths
- concerns: top 3 gaps`,
              "Score this resume"
            );

            parsedResume = result;
            resumeScore = Math.min(100, Math.max(0, result.score || 0));

            console.log(
              `[BG] Resume scored: ${resumeScore}% in ${Date.now() - startTime}ms`
            );
          } catch (err) {
            console.error("[BG] AI scoring failed:", err);
          }
        }

        // Update application with results
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

        // Store resume text on user for future (NOT score — score is per-job)
        if (finalResumeText) {
          await query(
            `UPDATE users
             SET resume_text = $2,
                 resume_url = COALESCE($3, resume_url),
                 updated_at = NOW()
             WHERE id = $1`,
            [userId, finalResumeText, resumeUrl]
          );
        }

        console.log(
          `[BG] Resume saved in ${Date.now() - startTime}ms. Triggering pipeline...`
        );

        // Trigger pipeline — use internal function call instead of HTTP fetch
        // This avoids the self-fetch timeout issue on serverless
        try {
          const appUrl =
            process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

          // Use AbortController with timeout to prevent hanging
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

          await fetch(`${appUrl}/api/pipeline/execute`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              applicationId: application.id,
              trigger: "application_submitted",
            }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);
          console.log(`[BG] Pipeline triggered`);
        } catch (err: any) {
          if (err.name === "AbortError") {
            console.warn("[BG] Pipeline trigger timed out (non-critical)");
          } else {
            console.error("[BG] Pipeline trigger failed:", err);
          }
        }

        // Track billing
        try {
          const { getUserCompanyId } = await import("@/lib/company");
          const { trackUsage } = await import("@/lib/billing");
          const companyId = await getUserCompanyId(job.posted_by);
          if (companyId) {
            await trackUsage({
              companyId,
              nodeType: "ai_resume_screen",
              jobId,
              applicationId: application.id,
            });
          }
        } catch {}

        console.log(
          `[BG] ✅ Complete for ${application.id} in ${Date.now() - startTime}ms`
        );
      } catch (err) {
        console.error(`[BG] ❌ Failed for ${application.id}:`, err);
      }
    };

    // Fire and forget — don't await
    doBackgroundWork().catch((err) =>
      console.error("[BG] Unhandled:", err)
    );

    return response;
  } catch (error: any) {
    console.error("Application POST error:", error);
    return NextResponse.json(
      { error: error.message || "Application failed" },
      { status: 500 }
    );
  }
}