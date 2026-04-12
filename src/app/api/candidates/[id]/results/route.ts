export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { queryOne, queryMany } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !["HR", "ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: applicationId } = await params;

    // Get application info
    const application = await queryOne(
      `SELECT a.*, j.title as job_title, j.skills as job_skills,
        u.first_name, u.last_name, u.email
       FROM applications a
       JOIN jobs j ON a.job_id = j.id
       JOIN users u ON a.candidate_id = u.id
       WHERE a.id = $1`,
      [applicationId]
    );

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    // Get resume data
    let resumeParsed = null;
    try {
      resumeParsed = typeof application.resume_parsed === "string"
        ? JSON.parse(application.resume_parsed)
        : application.resume_parsed;
    } catch {}

    // Get all submissions (assessments)
    const submissions = await queryMany(
      `SELECT * FROM submissions WHERE application_id = $1 ORDER BY created_at ASC`,
      [applicationId]
    );

    const formattedSubmissions = submissions.map((s: any) => {
      let answers = s.answers;
      try { if (typeof answers === "string") answers = JSON.parse(answers); } catch { answers = []; }

      return {
        id: s.id,
        assessmentId: s.assessment_id,
        status: s.status,
        totalScore: parseFloat(s.total_score) || 0,
        maxScore: parseFloat(s.max_score) || 0,
        percentage: parseFloat(s.percentage) || 0,
        timeTaken: s.time_taken,
        startedAt: s.started_at,
        submittedAt: s.submitted_at,
        answers: (answers || []).map((a: any) => {
          let grading = a.grading;
          try { if (typeof grading === "string") grading = JSON.parse(grading); } catch {}
          return {
            questionTitle: a.questionTitle,
            type: a.type,
            score: a.score || 0,
            maxScore: a.maxScore || 0,
            // Coding answers
            code: a.code || null,
            language: a.language || null,
            // MCQ answers
            selectedOption: a.selectedOption || null,
            // Grading details
            grading,
          };
        }),
      };
    });

    // Get all AI interviews
    const interviews = await queryMany(
      `SELECT * FROM ai_interviews WHERE application_id = $1 ORDER BY created_at ASC`,
      [applicationId]
    );

    const formattedInterviews = interviews.map((i: any) => {
      let messages = i.messages;
      try { if (typeof messages === "string") messages = JSON.parse(messages); } catch { messages = []; }
      let scoreBreakdown = i.score_breakdown;
      try { if (typeof scoreBreakdown === "string") scoreBreakdown = JSON.parse(scoreBreakdown); } catch { scoreBreakdown = {}; }
      let strengths = i.strengths;
      try { if (typeof strengths === "string") strengths = JSON.parse(strengths); } catch { strengths = []; }
      let weaknesses = i.weaknesses;
      try { if (typeof weaknesses === "string") weaknesses = JSON.parse(weaknesses); } catch { weaknesses = []; }

      return {
        id: i.id,
        type: i.type,
        status: i.status,
        overallScore: parseFloat(i.overall_score) || 0,
        scoreBreakdown,
        analysis: i.analysis,
        strengths: Array.isArray(strengths) ? strengths : [],
        weaknesses: Array.isArray(weaknesses) ? weaknesses : [],
        questionsAsked: i.questions_asked,
        maxQuestions: i.max_questions,
        duration: i.duration,
        startedAt: i.started_at,
        completedAt: i.completed_at,
        messages,
      };
    });

    // Get F2F interviews
    const f2fInterviews = await queryMany(
      `SELECT f.*, 
        fb.technical_score, fb.communication_score, fb.problem_solving_score,
        fb.culture_fit_score, fb.overall_score as feedback_score,
        fb.recommendation, fb.strengths as feedback_strengths, 
        fb.concerns, fb.notes as feedback_notes
       FROM f2f_interviews f
       LEFT JOIN interview_feedback fb ON fb.interview_id = f.id
       WHERE f.application_id = $1
       ORDER BY f.created_at ASC`,
      [applicationId]
    );

    // Get rating
    const rating = await queryOne(
      "SELECT * FROM ratings WHERE application_id = $1",
      [applicationId]
    );

    let ratingBreakdown = rating?.breakdown;
    try { if (typeof ratingBreakdown === "string") ratingBreakdown = JSON.parse(ratingBreakdown); } catch { ratingBreakdown = {}; }

    return NextResponse.json({
      application: {
        id: application.id,
        status: application.status,
        resumeScore: parseFloat(application.resume_score) || 0,
        appliedAt: application.applied_at,
        resumeText: application.resume_text,
        resumeParsed,
        candidate: {
          firstName: application.first_name,
          lastName: application.last_name,
          email: application.email,
        },
        jobTitle: application.job_title,
        jobSkills: application.job_skills,
      },
      submissions: formattedSubmissions,
      interviews: formattedInterviews,
      f2fInterviews,
      rating: rating ? {
        ...rating,
        breakdown: ratingBreakdown,
        overallScore: parseFloat(rating.overall_score) || 0,
      } : null,
    });
  } catch (error: any) {
    console.error("Results fetch error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}