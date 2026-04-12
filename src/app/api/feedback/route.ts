export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { getSession } from "@/lib/session";

// GET feedback for an application
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const applicationId = searchParams.get("applicationId");

    if (!applicationId) {
      return NextResponse.json({ error: "applicationId required" }, { status: 400 });
    }

    const application = await queryOne(
      "SELECT * FROM applications WHERE id = $1",
      [applicationId]
    );

    if (!application?.rejection_feedback) {
      return NextResponse.json({ feedback: null });
    }

    let feedback = application.rejection_feedback;
    if (typeof feedback === "string") feedback = JSON.parse(feedback);

    return NextResponse.json({ feedback });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

// POST — generate feedback for rejected candidate
export async function POST(req: NextRequest) {
  try {
    const { applicationId } = await req.json();

    const feedback = await generateFeedback(applicationId);
    return NextResponse.json({ success: true, feedback });
  } catch (error: any) {
    console.error("Feedback error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function generateFeedback(applicationId: string) {
  const application = await queryOne(
    `SELECT a.*, j.title as job_title, j.skills as job_skills,
      j.requirements as job_requirements, j.description as job_description,
      u.first_name, u.last_name, u.email
     FROM applications a
     JOIN jobs j ON a.job_id = j.id
     JOIN users u ON a.candidate_id = u.id
     WHERE a.id = $1`,
    [applicationId]
  );

  if (!application) throw new Error("Application not found");

  // Get all scores
  const submission = await queryOne(
    "SELECT * FROM submissions WHERE application_id = $1 AND status = 'GRADED' LIMIT 1",
    [applicationId]
  );

  const interview = await queryOne(
    "SELECT * FROM ai_interviews WHERE application_id = $1 AND status = 'COMPLETED' LIMIT 1",
    [applicationId]
  );

  const rating = await queryOne(
    "SELECT * FROM ratings WHERE application_id = $1",
    [applicationId]
  );

  // Build context for AI
  const resumeScore = application.resume_score || 0;
  const assessmentScore = submission?.percentage || 0;
  const interviewScore = interview?.overall_score || 0;

  let interviewStrengths: string[] = [];
  let interviewWeaknesses: string[] = [];
  try {
    if (interview?.strengths) {
      const s = typeof interview.strengths === "string" ? JSON.parse(interview.strengths) : interview.strengths;
      if (Array.isArray(s)) interviewStrengths = s;
    }
    if (interview?.weaknesses) {
      const w = typeof interview.weaknesses === "string" ? JSON.parse(interview.weaknesses) : interview.weaknesses;
      if (Array.isArray(w)) interviewWeaknesses = w;
    }
  } catch {}

  let resumeParsed: any = {};
  try {
    resumeParsed = typeof application.resume_parsed === "string"
      ? JSON.parse(application.resume_parsed) : application.resume_parsed || {};
  } catch {}

  // Generate feedback with AI
  let feedback;
  try {
    const { aiJSON } = await import("@/lib/ai");
    feedback = await aiJSON<{
      greeting: string;
      strengths: { area: string; detail: string }[];
      improvements: { area: string; tip: string; resources: string[] }[];
      skillScores: { skill: string; score: number }[];
      encouragement: string;
      recommendedRoles: string[];
    }>(
      `You are a kind, helpful career advisor. A candidate was not selected for a role.
Generate personalized, constructive feedback. Be encouraging but honest.

IMPORTANT RULES:
- NEVER compare to other candidates
- NEVER share internal scores directly
- Focus on WHAT they can improve, not what they scored
- Give ACTIONABLE advice with specific resources
- Be warm and encouraging

Return JSON:
{
  "greeting": "Personal greeting using their name",
  "strengths": [{"area": "skill name", "detail": "specific positive feedback"}],
  "improvements": [{"area": "skill name", "tip": "specific actionable advice", "resources": ["resource 1", "resource 2"]}],
  "skillScores": [{"skill": "React", "score": 80}, {"skill": "System Design", "score": 40}],
  "encouragement": "Motivational closing message",
  "recommendedRoles": ["roles they'd be a better fit for"]
}`,
      `Candidate: ${application.first_name} ${application.last_name}
Job applied for: ${application.job_title}
Required skills: ${(application.job_skills || []).join(", ")}
Requirements: ${(application.job_requirements || []).join(", ")}
Resume match: ${resumeScore}%
Matched skills: ${(resumeParsed.matchedSkills || []).join(", ")}
Missing skills: ${(resumeParsed.missingSkills || []).join(", ")}
Assessment score: ${assessmentScore}%
Interview score: ${interviewScore}%
Interview strengths: ${interviewStrengths.join(", ")}
Interview weaknesses: ${interviewWeaknesses.join(", ")}`
    );
  } catch (err) {
    console.error("AI feedback generation failed:", err);
    // Fallback feedback
    feedback = {
      greeting: `Hi ${application.first_name},`,
      strengths: [
        { area: "Application", detail: "Thank you for applying and going through our process." },
      ],
      improvements: [
        { area: "Skills", tip: "Continue building on your technical skills.", resources: [] },
      ],
      skillScores: (application.job_skills || []).map((s: string) => ({
        skill: s,
        score: (resumeParsed.matchedSkills || []).includes(s) ? 70 : 30,
      })),
      encouragement: "Keep learning and growing. The right opportunity is out there for you!",
      recommendedRoles: [],
    };
  }

  // Save feedback
  await query(
    "UPDATE applications SET rejection_feedback = $2, updated_at = NOW() WHERE id = $1",
    [applicationId, JSON.stringify(feedback)]
  );

  return feedback;
}