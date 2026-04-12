export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, queryMany } from "@/lib/db";
import { getSession } from "@/lib/session";

// GET — fetch interview
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const applicationId = searchParams.get("applicationId");

    if (id) {
      const interview = await queryOne("SELECT * FROM ai_interviews WHERE id = $1", [id]);
      return NextResponse.json({ interview });
    }

    if (applicationId) {
      const interviews = await queryMany(
        "SELECT * FROM ai_interviews WHERE application_id = $1 ORDER BY created_at DESC",
        [applicationId]
      );
      return NextResponse.json({ interviews });
    }

    if (["HR", "ADMIN"].includes((session.user as any).role)) {
      const interviews = await queryMany(
        `SELECT ai.*, u.first_name as candidate_first_name, u.last_name as candidate_last_name, j.title as job_title
         FROM ai_interviews ai
         LEFT JOIN users u ON ai.candidate_id = u.id
         LEFT JOIN applications a ON ai.application_id = a.id
         LEFT JOIN jobs j ON a.job_id = j.id
         ORDER BY ai.created_at DESC LIMIT 50`
      );
      return NextResponse.json({ interviews });
    }

    return NextResponse.json({ interviews: [] });
  } catch (error: any) {
    console.error("Interview fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

// POST — start interview or send message
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const candidateId = (session.user as any).id;

    // ==========================================
    // START INTERVIEW
    // ==========================================
    if (body.action === "start") {
      const { applicationId, interviewType } = body;

      const existing = await queryOne(
        `SELECT * FROM ai_interviews WHERE application_id = $1 AND candidate_id = $2 AND type = $3`,
        [applicationId, candidateId, interviewType || "TECHNICAL"]
      );

      if (existing) {
        if (existing.status === "COMPLETED") {
          return NextResponse.json({ error: "Already completed", interview: existing }, { status: 409 });
        }
        let messages = existing.messages;
        if (typeof messages === "string") messages = JSON.parse(messages);
        return NextResponse.json({ interview: { ...existing, messages } });
      }

      const application = await queryOne(
        `SELECT a.*, a.resume_text, a.resume_parsed,
          j.title as job_title, j.description as job_description,
          j.skills as job_skills, j.requirements as job_requirements, j.pipeline_id
         FROM applications a JOIN jobs j ON a.job_id = j.id WHERE a.id = $1`,
        [applicationId]
      );

      if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 });

      // Get config from pipeline node
      let maxQuestions = 10;
      let duration = 30;
      let adaptive = true;
      let interviewMode = "technical";
      let difficulty = "progressive";
      let provideHints = true;
      let useResumeContext = true;
      let topics: string[] = [];
      let scoringCriteria: string[] = [];

      if (application.pipeline_id) {
        const pipeline = await queryOne("SELECT * FROM pipelines WHERE id = $1", [application.pipeline_id]);
        if (pipeline) {
          let nodes: any[] = [];
          try { nodes = typeof pipeline.nodes === "string" ? JSON.parse(pipeline.nodes) : pipeline.nodes || []; } catch {}

          const interviewNode = nodes.find(
            (n: any) => n.data?.subtype === "ai_technical_interview" || n.data?.subtype === "ai_behavioral_interview"
          );

          if (interviewNode?.data?.config) {
            const cfg = interviewNode.data.config;
            maxQuestions = cfg.maxQuestions || 10;
            duration = cfg.duration || 30;
            adaptive = cfg.adaptive !== false;
            interviewMode = cfg.interviewMode || "technical";
            difficulty = cfg.difficulty || "progressive";
            provideHints = cfg.provideHints !== false;
            useResumeContext = cfg.useResumeContext !== false;
            topics = cfg.topics || [];
            if (cfg.scoreTechnical !== false) scoringCriteria.push("technical knowledge");
            if (cfg.scoreCommunication !== false) scoringCriteria.push("communication");
            if (cfg.scoreProblemSolving !== false) scoringCriteria.push("problem solving");
            if (cfg.scoreCultureFit) scoringCriteria.push("culture fit");
            if (cfg.scoreLeadership) scoringCriteria.push("leadership");
          }
        }
      }

      const jobContext = {
        title: application.job_title,
        description: application.job_description,
        skills: application.job_skills || [],
        requirements: application.job_requirements || [],
      };

      let resumeContext = {};
      try {
        resumeContext = typeof application.resume_parsed === "string"
          ? JSON.parse(application.resume_parsed) : application.resume_parsed || {};
      } catch {}

      const interview = await queryOne(
        `INSERT INTO ai_interviews (application_id, candidate_id, type, status, job_context, resume_context, messages, max_questions, started_at)
         VALUES ($1, $2, $3, 'IN_PROGRESS', $4, $5, '[]', $6, NOW()) RETURNING *`,
        [applicationId, candidateId, interviewType || "TECHNICAL", JSON.stringify(jobContext), JSON.stringify(resumeContext), maxQuestions]
      );

      await query("UPDATE applications SET status = 'AI_INTERVIEW', updated_at = NOW() WHERE id = $1", [applicationId]);

      // Track usage
      try {
        const { getUserCompanyId } = await import("@/lib/company");
        const { trackUsage } = await import("@/lib/billing");
        const job = await queryOne(
          "SELECT posted_by FROM jobs j JOIN applications a ON a.job_id = j.id WHERE a.id = $1",
          [applicationId]
        );
        const hrCompany = job?.posted_by ? await getUserCompanyId(job.posted_by) : null;
        if (hrCompany) {
          await trackUsage({
            companyId: hrCompany,
            nodeType: interviewType === "BEHAVIORAL" ? "ai_behavioral_interview" : "ai_technical_interview",
            jobId: application.job_id,
            applicationId,
          });
        }
      } catch {}

      // Generate first message
      const { aiText } = await import("@/lib/ai");

      const systemPrompt = buildSystemPrompt(
        interviewType || "TECHNICAL", jobContext, resumeContext, maxQuestions,
        { interviewMode, difficulty, adaptive, provideHints, useResumeContext, topics, scoringCriteria }
      );

      const firstMessage = await aiText(systemPrompt, "Start the interview. Introduce yourself briefly and ask the first question.");

      const messages = [{ role: "assistant", content: firstMessage, timestamp: new Date().toISOString() }];

      await query(
        `UPDATE ai_interviews SET messages = $2, questions_asked = 1 WHERE id = $1`,
        [interview.id, JSON.stringify(messages)]
      );

      return NextResponse.json({
        interview: { ...interview, messages, status: "IN_PROGRESS" },
      }, { status: 201 });
    }

    // ==========================================
    // SEND MESSAGE
    // ==========================================
    if (body.action === "message") {
      const { interviewId, message } = body;

      const interview = await queryOne(
        "SELECT * FROM ai_interviews WHERE id = $1 AND candidate_id = $2",
        [interviewId, candidateId]
      );

      if (!interview) return NextResponse.json({ error: "Interview not found" }, { status: 404 });
      if (interview.status === "COMPLETED") return NextResponse.json({ error: "Already completed" }, { status: 409 });

      let messages: any[] = [];
      try { messages = typeof interview.messages === "string" ? JSON.parse(interview.messages) : interview.messages || []; } catch { messages = []; }

      let jobContext: any = {};
      try { jobContext = typeof interview.job_context === "string" ? JSON.parse(interview.job_context) : interview.job_context || {}; } catch {}

      let resumeContext: any = {};
      try { resumeContext = typeof interview.resume_context === "string" ? JSON.parse(interview.resume_context) : interview.resume_context || {}; } catch {}

      messages.push({ role: "user", content: message, timestamp: new Date().toISOString() });

      const questionsAsked = (interview.questions_asked || 0) + 1;
      const maxQuestions = interview.max_questions || 10;

      // Check if interview should end
      if (questionsAsked >= maxQuestions) {
        const { aiJSON } = await import("@/lib/ai");

        const evaluation = await aiJSON<{
          overallScore: number;
          technicalScore: number;
          communicationScore: number;
          problemSolvingScore: number;
          strengths: string[];
          weaknesses: string[];
          analysis: string;
          recommendation: string;
        }>(
          `You are evaluating a candidate interview. Score them based on the conversation.
Return JSON: { "overallScore": 0-100, "technicalScore": 0-100, "communicationScore": 0-100, "problemSolvingScore": 0-100, "strengths": ["..."], "weaknesses": ["..."], "analysis": "2-3 sentences", "recommendation": "strong_yes|yes|maybe|no|strong_no" }`,
          `Job: ${jobContext.title}\nSkills: ${(jobContext.skills || []).join(", ")}\n\nTranscript:\n${messages.map((m: any) => `${m.role === "user" ? "Candidate" : "Interviewer"}: ${m.content}`).join("\n\n")}`
        );

        messages.push({
          role: "assistant",
          content: "Thank you for your time! That concludes our interview. We'll review your responses and get back to you soon. Good luck! 🙌",
          timestamp: new Date().toISOString(),
        });

        await query(
          `UPDATE ai_interviews
           SET messages = $2, questions_asked = $3, status = 'COMPLETED',
               overall_score = $4, score_breakdown = $5, analysis = $6,
               strengths = $7, weaknesses = $8, completed_at = NOW(),
               duration = EXTRACT(EPOCH FROM (NOW() - started_at))::integer
           WHERE id = $1`,
          [interviewId, JSON.stringify(messages), questionsAsked, evaluation.overallScore || 0, JSON.stringify(evaluation), evaluation.analysis || "", evaluation.strengths || [], evaluation.weaknesses || []]
        );

        // Trigger pipeline execution
        try {
          await fetch(
            `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/pipeline/execute`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ applicationId: interview.application_id, trigger: "interview_completed" }),
            }
          );
        } catch {}

        return NextResponse.json({ messages, isComplete: true, evaluation });
      }

      // Generate next question
      const { aiText } = await import("@/lib/ai");
      const systemPrompt = buildSystemPrompt(interview.type || "TECHNICAL", jobContext, resumeContext, maxQuestions);

      const conversationHistory = messages.map((m: any) =>
        `${m.role === "user" ? "Candidate" : "You"}: ${m.content}`
      ).join("\n\n");

      const nextResponse = await aiText(
        systemPrompt,
        `Conversation so far:\n\n${conversationHistory}\n\nThis is question ${questionsAsked + 1} of ${maxQuestions}. ${
          questionsAsked >= maxQuestions - 2
            ? "Near the end. Ask a final important question."
            : "Ask a relevant follow-up or new question."
        }`
      );

      messages.push({ role: "assistant", content: nextResponse, timestamp: new Date().toISOString() });

      await query(
        `UPDATE ai_interviews SET messages = $2, questions_asked = $3 WHERE id = $1`,
        [interviewId, JSON.stringify(messages), questionsAsked]
      );

      return NextResponse.json({ messages, isComplete: false, questionsAsked, maxQuestions });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Interview error:", error);
    return NextResponse.json({ error: `Interview failed: ${error.message}` }, { status: 500 });
  }
}

function buildSystemPrompt(
  type: string, jobContext: any, resumeContext: any, maxQuestions: number,
  config?: {
    interviewMode?: string; difficulty?: string; adaptive?: boolean;
    provideHints?: boolean; useResumeContext?: boolean; topics?: string[]; scoringCriteria?: string[];
  }
): string {
  const mode = config?.interviewMode || (type === "BEHAVIORAL" ? "behavioral" : "technical");
  const diff = config?.difficulty || "progressive";
  const adaptiveMode = config?.adaptive !== false;
  const hints = config?.provideHints !== false;
  const useResume = config?.useResumeContext !== false;
  const topics = config?.topics || [];

  let modeInstructions = "";
  if (mode === "technical") modeInstructions = "Focus on technical skills, system design, algorithms, coding concepts, and architecture decisions.";
  else if (mode === "behavioral") modeInstructions = "Focus on teamwork, leadership, conflict resolution, project management, and work approach. Use STAR method.";
  else modeInstructions = "Mix technical questions (60%) with behavioral questions (40%).";

  let diffInstructions = "";
  if (diff === "progressive") diffInstructions = "Start with easy warm-up questions and progressively increase difficulty.";
  else if (diff === "easy") diffInstructions = "Keep all questions at an easy/introductory level.";
  else if (diff === "hard") diffInstructions = "Ask senior-level, challenging questions from the start.";
  else diffInstructions = "Keep questions at medium difficulty.";

  return `You are an expert interviewer conducting a ${mode} interview at a top company.
Interviewing for: ${jobContext.title || "Software Engineer"}.

JOB CONTEXT:
${jobContext.description || "Not specified"}
Skills: ${(jobContext.skills || []).join(", ") || "Not specified"}
Requirements: ${(jobContext.requirements || []).join(", ") || "Not specified"}

${useResume && resumeContext ? `CANDIDATE BACKGROUND:
${resumeContext.summary || resumeContext.experience || JSON.stringify(resumeContext).substring(0, 500)}
Matched skills: ${(resumeContext.matchedSkills || []).join(", ") || "Unknown"}
` : ""}

SETTINGS:
- Total questions: ${maxQuestions}
- Mode: ${modeInstructions}
- Difficulty: ${diffInstructions}
${topics.length > 0 ? `- Cover these topics: ${topics.join(", ")}` : ""}

RULES:
- Ask ONE question at a time
- ${adaptiveMode ? "Ask follow-up questions based on answers" : "Ask pre-planned questions in sequence"}
- ${hints ? "Provide small hints if stuck" : "No hints"}
- Be conversational and encouraging, not interrogating
- Keep responses to 2-4 sentences
- DO NOT evaluate or score during the interview
- DO NOT say "great answer" — stay neutral
- ${useResume ? "Reference their background when relevant" : "Don't reference background"}`;
}