export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, queryMany } from "@/lib/db";
import { getSession } from "@/lib/session";

// GET ratings for a job
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId");
    const applicationId = searchParams.get("applicationId");

    if (applicationId) {
      const rating = await queryOne(
        "SELECT * FROM ratings WHERE application_id = $1",
        [applicationId]
      );
      return NextResponse.json({ rating });
    }

    if (jobId) {
      const ratings = await queryMany(
        `SELECT r.*,
          u.first_name, u.last_name, u.email
         FROM ratings r
         LEFT JOIN users u ON r.candidate_id = u.id
         WHERE r.job_id = $1
         ORDER BY r.overall_score DESC`,
        [jobId]
      );
      return NextResponse.json({ ratings });
    }

    return NextResponse.json({ ratings: [] });
  } catch (error: any) {
    console.error("Rating fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

// POST — calculate rating for a candidate
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { applicationId } = await req.json();

    if (!applicationId) {
      return NextResponse.json({ error: "applicationId required" }, { status: 400 });
    }

    const rating = await calculateRating(applicationId);
    return NextResponse.json({ success: true, rating });
  } catch (error: any) {
    console.error("Rating error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function calculateRating(applicationId: string) {
  // Get application + job info
  const application = await queryOne(
    `SELECT a.*, j.title as job_title, j.skills as job_skills,
      j.requirements as job_requirements, j.description as job_description,
      j.id as job_id
     FROM applications a
     JOIN jobs j ON a.job_id = j.id
     WHERE a.id = $1`,
    [applicationId]
  );

  if (!application) throw new Error("Application not found");

  // Get resume score
  const resumeScore = application.resume_score || 0;

  // Get assessment score
  const submission = await queryOne(
    `SELECT * FROM submissions
     WHERE application_id = $1 AND status = 'GRADED'
     ORDER BY percentage DESC LIMIT 1`,
    [applicationId]
  );
  const assessmentScore = submission?.percentage || 0;

  // Get AI interview score
  const interview = await queryOne(
    `SELECT * FROM ai_interviews
     WHERE application_id = $1 AND status = 'COMPLETED'
     ORDER BY overall_score DESC LIMIT 1`,
    [applicationId]
  );
  const aiInterviewScore = interview?.overall_score || 0;

  // Weighted scoring
  const weights = {
    resume: 0.15,
    assessment: 0.35,
    aiInterview: 0.30,
    f2f: 0.20,
  };

  // Only weight scores that exist
  let totalWeight = 0;
  let weightedSum = 0;

  if (resumeScore > 0) {
    weightedSum += resumeScore * weights.resume;
    totalWeight += weights.resume;
  }
  if (assessmentScore > 0) {
    weightedSum += assessmentScore * weights.assessment;
    totalWeight += weights.assessment;
  }
  if (aiInterviewScore > 0) {
    weightedSum += aiInterviewScore * weights.aiInterview;
    totalWeight += weights.aiInterview;
  }

  const overallScore = totalWeight > 0
    ? Math.round((weightedSum / totalWeight) * 100) / 100
    : resumeScore;

  // Determine recommendation
  let recommendation = "maybe";
  if (overallScore >= 80) recommendation = "strong_yes";
  else if (overallScore >= 65) recommendation = "yes";
  else if (overallScore >= 45) recommendation = "maybe";
  else if (overallScore >= 25) recommendation = "no";
  else recommendation = "strong_no";

  // Shows promise: good assessment but weak resume, or improving trend
  const showsPromise =
    (assessmentScore >= 70 && resumeScore < 50) ||
    (aiInterviewScore >= 70 && assessmentScore < 50) ||
    (overallScore >= 40 && overallScore < 65 && (assessmentScore >= 60 || aiInterviewScore >= 60));

  // Build breakdown
  const breakdown = {
    resumeScore: Math.round(resumeScore),
    assessmentScore: Math.round(assessmentScore),
    aiInterviewScore: Math.round(aiInterviewScore),
    f2fInterviewScore: 0,
    weights,
  };

  // Get AI analysis
  let analysis = "";
  let strengths: string[] = [];
  let weaknesses: string[] = [];

  try {
    // Get strengths from interview
    if (interview?.strengths) {
      const s = typeof interview.strengths === "string"
        ? JSON.parse(interview.strengths) : interview.strengths;
      if (Array.isArray(s)) strengths.push(...s);
    }
    if (interview?.weaknesses) {
      const w = typeof interview.weaknesses === "string"
        ? JSON.parse(interview.weaknesses) : interview.weaknesses;
      if (Array.isArray(w)) weaknesses.push(...w);
    }

    // Get from resume parsed
    if (application.resume_parsed) {
      const parsed = typeof application.resume_parsed === "string"
        ? JSON.parse(application.resume_parsed) : application.resume_parsed;
      if (parsed.strengths) strengths.push(...parsed.strengths);
      if (parsed.improvements) weaknesses.push(...parsed.improvements.map((i: any) => typeof i === "string" ? i : i.area || i));
    }

    // Deduplicate
    strengths = [...new Set(strengths)].slice(0, 5);
    weaknesses = [...new Set(weaknesses)].slice(0, 5);

    analysis = `Overall score: ${Math.round(overallScore)}/100. Resume: ${Math.round(resumeScore)}%, Assessment: ${Math.round(assessmentScore)}%, Interview: ${Math.round(aiInterviewScore)}%. ${
      recommendation === "strong_yes" ? "Highly recommended for the role." :
      recommendation === "yes" ? "Good candidate, recommended to proceed." :
      recommendation === "maybe" ? "Borderline candidate, consider further evaluation." :
      "Does not meet requirements for this role."
    }${showsPromise ? " Shows promise despite some gaps." : ""}`;
  } catch {}

  // Upsert rating
  const existing = await queryOne(
    "SELECT id FROM ratings WHERE application_id = $1",
    [applicationId]
  );

  let rating;
  if (existing) {
    rating = await queryOne(
      `UPDATE ratings SET
        resume_score = $2, assessment_score = $3, ai_interview_score = $4,
        overall_score = $5, breakdown = $6, recommendation = $7,
        shows_promise = $8, analysis = $9, strengths = $10, weaknesses = $11,
        calculated_at = NOW()
       WHERE application_id = $1 RETURNING *`,
      [
        applicationId, resumeScore, assessmentScore, aiInterviewScore,
        overallScore, JSON.stringify(breakdown), recommendation,
        showsPromise, analysis, strengths, weaknesses,
      ]
    );
  } else {
    rating = await queryOne(
      `INSERT INTO ratings (
        application_id, candidate_id, job_id,
        resume_score, assessment_score, ai_interview_score,
        overall_score, breakdown, recommendation,
        shows_promise, analysis, strengths, weaknesses
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        applicationId, application.candidate_id, application.job_id,
        resumeScore, assessmentScore, aiInterviewScore,
        overallScore, JSON.stringify(breakdown), recommendation,
        showsPromise, analysis, strengths, weaknesses,
      ]
    );
  }

  return rating;
}