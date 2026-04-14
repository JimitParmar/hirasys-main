export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, queryMany } from "@/lib/db";
import { getSession } from "@/lib/session";
import { exec } from "child_process";
import { writeFileSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { promisify } from "util";

const execAsync = promisify(exec);
const TEMP_DIR = join(process.cwd(), ".tmp-exec");
const TIMEOUT = 15000;

function normalizeOutput(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\s*,\s*/g, ",")
    .replace(/\s*:\s*/g, ":")
    .replace(/\[\s+/g, "[")
    .replace(/\s+\]/g, "]")
    .replace(/\{\s+/g, "{")
    .replace(/\s+\}/g, "}")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n")
    .trim()
    .replace(/\bTrue\b/g, "true")
    .replace(/\bFalse\b/g, "false")
    .replace(/\bNone\b/g, "null")
    .replace(/\bNULL\b/g, "null");
}

// ==========================================
// Direct code execution
// ==========================================
async function executeCode(
  code: string,
  language: string,
  input: string
): Promise<{ stdout: string; stderr: string }> {
  const execId = `grade_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const workDir = join(TEMP_DIR, execId);

  try {
    mkdirSync(workDir, { recursive: true });
    writeFileSync(join(workDir, "input.txt"), input);

    if (language === "javascript" || language === "typescript") {
      const wrappedCode = `
const __fs = require('fs');
const __path = require('path');
const __rawInput = __fs.readFileSync(__path.join(__dirname, 'input.txt'), 'utf8').trim();
let __input;
try { __input = JSON.parse(__rawInput); } catch {
  if (!isNaN(__rawInput) && __rawInput !== '') { __input = Number(__rawInput); }
  else { __input = __rawInput; }
}

${code}

try {
  let __result;
  if (typeof solve === 'function') __result = solve(__input);
  else if (typeof main === 'function') __result = main(__input);
  else if (typeof solution === 'function') __result = solution(__input);
  if (__result !== undefined && __result !== null) {
    if (typeof __result === 'object') console.log(JSON.stringify(__result));
    else console.log(String(__result));
  }
} catch (e) { console.error(e.message); process.exit(1); }
`;
      writeFileSync(join(workDir, "solution.js"), wrappedCode);
      const { stdout, stderr } = await execAsync(
        `node "${join(workDir, "solution.js")}"`,
        { timeout: TIMEOUT, maxBuffer: 1024 * 1024 }
      );
      return { stdout: stdout.trim(), stderr: stderr.trim() };
    } else if (language === "python") {
      const wrappedCode = `
import sys, os, json
with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'input.txt'), 'r') as f:
    __raw_input = f.read().strip()
try: __input = json.loads(__raw_input)
except (json.JSONDecodeError, ValueError):
    try: __input = float(__raw_input) if '.' in __raw_input else int(__raw_input)
    except ValueError: __input = __raw_input

${code}

try:
    __result = None
    if 'solve' in dir(): __result = solve(__input)
    elif 'main' in dir(): __result = main(__input)
    elif 'solution' in dir(): __result = solution(__input)
    if __result is not None:
        if isinstance(__result, (list, dict, tuple, bool)): print(json.dumps(__result))
        else: print(__result)
except Exception as e:
    print(str(e), file=sys.stderr)
    sys.exit(1)
`;
      writeFileSync(join(workDir, "solution.py"), wrappedCode);
      let cmd = "python3";
      try {
        await execAsync("python3 --version");
      } catch {
        cmd = "python";
      }
      const { stdout, stderr } = await execAsync(
        `${cmd} "${join(workDir, "solution.py")}"`,
        { timeout: TIMEOUT, maxBuffer: 1024 * 1024 }
      );
      return { stdout: stdout.trim(), stderr: stderr.trim() };
    }

    return { stdout: "", stderr: `Language ${language} not supported for grading` };
  } catch (error: any) {
    return {
      stdout: error.stdout?.trim() || "",
      stderr: error.stderr?.trim() || error.message || "Execution failed",
    };
  } finally {
    try {
      rmSync(workDir, { recursive: true, force: true });
    } catch {}
  }
}

// ==========================================
// GET Submissions
// ==========================================
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const applicationId = searchParams.get("applicationId");

    let whereClause = "WHERE 1=1";
    const params: any[] = [];
    let idx = 1;

    if ((session.user as any).role === "CANDIDATE") {
      whereClause += ` AND s.candidate_id = $${idx}`;
      params.push((session.user as any).id);
      idx++;
    }

    if (applicationId) {
      whereClause += ` AND s.application_id = $${idx}`;
      params.push(applicationId);
      idx++;
    }

    const submissions = await queryMany(
      `SELECT * FROM submissions s ${whereClause} ORDER BY s.created_at DESC`,
      params
    );

    return NextResponse.json({ submissions });
  } catch (error: any) {
    console.error("Submissions fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

// ==========================================
// POST — Start or Submit
// ==========================================
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    console.log("🔥 POST /api/submissions HIT");

    let body;
    try {
      body = await req.json();
      console.log("📦 REQUEST BODY:", JSON.stringify(body).substring(0, 500));
    } catch (err) {
      console.error("❌ Failed to parse JSON:", err);
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const candidateId = (session.user as any).id;
    const action = body.action;
    console.log("🔥 API HIT:", action);

    // ==========================================
    // START
    // ==========================================
    if (action === "start") {
      console.log("🚀 START action triggered");

      const { assessmentId, applicationId } = body;
      console.log("📌 START params:", { assessmentId, applicationId, candidateId });

      if (!assessmentId || !applicationId) {
        return NextResponse.json(
          { error: "assessmentId and applicationId required" },
          { status: 400 }
        );
      }

      const existing = await queryOne(
        `SELECT * FROM submissions WHERE assessment_id = $1 AND candidate_id = $2 AND application_id = $3`,
        [assessmentId, candidateId, applicationId]
      );

      if (existing) {
        if (existing.status === "GRADED") {
          return NextResponse.json(
            { error: "Already submitted", submission: existing },
            { status: 409 }
          );
        }
        console.log("Returning existing submission:", existing.id);
        return NextResponse.json({ submission: existing });
      }

      const submission = await queryOne(
        `INSERT INTO submissions (assessment_id, application_id, candidate_id, status, max_score, started_at)
         VALUES ($1, $2, $3, 'IN_PROGRESS', 100, NOW()) RETURNING *`,
        [assessmentId, applicationId, candidateId]
      );

      await query(
        "UPDATE applications SET status = 'ASSESSMENT', updated_at = NOW() WHERE id = $1",
        [applicationId]
      );

      // Track usage
      try {
        const { getUserCompanyId } = await import("@/lib/company");
        const { trackUsage } = await import("@/lib/billing");
        const app = await queryOne("SELECT job_id FROM applications WHERE id = $1", [applicationId]);
        const job = await queryOne("SELECT posted_by FROM jobs WHERE id = $1", [app?.job_id]);
        const hrCompany = job?.posted_by ? await getUserCompanyId(job.posted_by) : null;
        if (hrCompany) {
          await trackUsage({
            companyId: hrCompany,
            nodeType: "coding_assessment",
            jobId: app?.job_id,
            applicationId,
          });
        }
      } catch {}

      console.log("Created submission:", submission.id);
      return NextResponse.json({ submission }, { status: 201 });
    }

    // ==========================================
    // SUBMIT — Grade everything server-side
    // ==========================================
    if (action === "submit") {
      console.log("🔥 SUBMIT action triggered");

      const { submissionId, answers, questions: incomingQuestions } = body;

      console.log("📌 Submission ID:", submissionId);
      console.log("📌 Answers received:", answers?.length);
      console.log("📌 Incoming questions from client:", incomingQuestions?.length);

      if (!submissionId) {
        console.error("❌ Missing submissionId");
        return NextResponse.json({ error: "submissionId required" }, { status: 400 });
      }

      console.log("🔍 Fetching submission...");

      const submission = await queryOne(
        "SELECT * FROM submissions WHERE id = $1 AND candidate_id = $2",
        [submissionId, candidateId]
      );

      console.log("📦 Submission from DB:", submission?.id, "status:", submission?.status);

      if (!submission)
        return NextResponse.json({ error: "Submission not found" }, { status: 404 });
      if (submission.status === "GRADED")
        return NextResponse.json({ error: "Already graded", submission }, { status: 409 });

      // Get questions from pipeline node config
      const application = await queryOne(
        `SELECT a.*, j.pipeline_id FROM applications a JOIN jobs j ON a.job_id = j.id WHERE a.id = $1`,
        [submission.application_id]
      );

      let questions: any[] = [];
      const nodeId = submission.assessment_id;

      console.log("🔍 Looking for questions...");
      console.log("📌 nodeId (assessment_id):", nodeId);
      console.log("📌 application_id:", submission.application_id);

      // ==========================================
      // STRATEGY 1: Try fetching cached AI-generated questions
      // ==========================================
      try {
        const cacheKey = `assessment_questions:v1:${submission.application_id}:${nodeId}`;
        console.log("🔍 Cache key:", cacheKey);

        const cached = await queryOne(
          `SELECT value FROM ai_cache WHERE cache_key = $1 AND expires_at > NOW()`,
          [cacheKey]
        );

        console.log("📦 Cache result:", cached ? "FOUND" : "NOT FOUND");

        if (cached?.value) {
          const rawValue = cached.value;
          console.log("📦 Cache value type:", typeof rawValue);
          console.log("📦 Cache value preview:", JSON.stringify(rawValue).substring(0, 200));

          if (typeof rawValue === "string") {
            try {
              questions = JSON.parse(rawValue);
            } catch (parseErr) {
              console.error("❌ Failed to parse cached string:", parseErr);
            }
          } else if (Array.isArray(rawValue)) {
            questions = rawValue;
          } else if (rawValue && typeof rawValue === "object") {
            // Sometimes postgres JSONB returns the object directly
            questions = Array.isArray(rawValue) ? rawValue : [rawValue];
          }

          console.log("✅ Questions from cache:", questions.length);
        }
      } catch (err) {
        console.error("❌ Cache fetch failed:", err);
      }

      // ==========================================
      // STRATEGY 2: Try ALL cache key variations
      // ==========================================
      if (questions.length === 0) {
        console.log("🔍 Trying alternative cache keys...");

        // The from-pipeline route finds node by subtype, but saves cache with node.id
        // Let's search for any matching cache
        try {
          const allCaches = await queryMany(
            `SELECT cache_key, value FROM ai_cache 
             WHERE cache_key LIKE $1 AND expires_at > NOW()`,
            [`assessment_questions:v1:${submission.application_id}:%`]
          );

          console.log("📦 Found", allCaches.length, "cache entries for this application");

          for (const cache of allCaches) {
            console.log("  📌 Cache key:", cache.cache_key);
          }

          if (allCaches.length > 0) {
            const rawValue = allCaches[0].value;
            if (typeof rawValue === "string") {
              try {
                questions = JSON.parse(rawValue);
              } catch {
                questions = [];
              }
            } else if (Array.isArray(rawValue)) {
              questions = rawValue;
            } else if (rawValue && typeof rawValue === "object") {
              questions = Array.isArray(rawValue) ? rawValue : [];
            }
            console.log("✅ Questions from alt cache:", questions.length);
          }
        } catch (err) {
          console.error("❌ Alt cache search failed:", err);
        }
      }

      // ==========================================
      // STRATEGY 3: Pipeline config (preset questions)
      // ==========================================
      if (questions.length === 0 && application?.pipeline_id) {
        console.log("🔍 Trying pipeline config...");

        const pipeline = await queryOne(
          "SELECT * FROM pipelines WHERE id = $1",
          [application.pipeline_id]
        );

        if (pipeline) {
          let nodes: any[] = [];
          try {
            nodes = typeof pipeline.nodes === "string"
              ? JSON.parse(pipeline.nodes)
              : pipeline.nodes || [];
          } catch {}

          console.log("📦 Pipeline has", nodes.length, "nodes");

          // Try exact match first
          let node = nodes.find((n: any) => n.id === nodeId);

          // Try matching by subtype
          if (!node) {
            node = nodes.find((n: any) => n.data?.subtype === nodeId);
            if (node) console.log("📌 Found node by subtype match:", node.id);
          }

          // Try any assessment node
          if (!node) {
            node = nodes.find((n: any) =>
              n.data?.subtype?.includes("assessment") ||
              n.data?.subtype?.includes("mcq")
            );
            if (node) console.log("📌 Found fallback assessment node:", node.id, node.data?.subtype);
          }

          if (node) {
            questions = node.data?.config?.questions || [];
            console.log("✅ Questions from pipeline config:", questions.length);
          } else {
            console.log("❌ No matching node found in pipeline");
            console.log("📌 Available nodes:", nodes.map((n: any) => ({ id: n.id, subtype: n.data?.subtype })));
          }
        }
      }

      // ==========================================
      // STRATEGY 4: Assessments table
      // ==========================================
      if (questions.length === 0) {
        console.log("🔍 Trying assessments table...");

        const assessment = await queryOne(
          "SELECT * FROM assessments WHERE id = $1",
          [submission.assessment_id]
        );

        if (assessment?.questions) {
          questions = typeof assessment.questions === "string"
            ? JSON.parse(assessment.questions)
            : assessment.questions;
          console.log("✅ Questions from assessments table:", questions.length);
        } else {
          console.log("❌ No assessment found in DB for id:", submission.assessment_id);
        }
      }

      // ==========================================
      // STRATEGY 5: USE QUESTIONS FROM CLIENT (last resort)
      // This is the failsafe — client sends questions in payload
      // ==========================================
      if (questions.length === 0 && incomingQuestions?.length > 0) {
        console.log("⚠️ Using questions from client payload as last resort");
        questions = incomingQuestions;
        console.log("✅ Questions from client:", questions.length);
      }

      console.log("=== FINAL QUESTION COUNT:", questions.length, "===");

      if (questions.length === 0) {
        console.error("❌❌❌ ZERO QUESTIONS — Cannot grade!");
        console.error("Assessment ID:", submission.assessment_id);
        console.error("Application ID:", submission.application_id);

        // Return a meaningful error instead of 0/0
        return NextResponse.json({
          success: false,
          error: "No questions found for grading. Please contact support.",
          debug: {
            assessmentId: submission.assessment_id,
            applicationId: submission.application_id,
            answersReceived: answers?.length || 0,
          }
        }, { status: 500 });
      }

      // ==========================================
      // GRADE EACH ANSWER
      // ==========================================
      let totalScore = 0;
      let maxScore = 0;
      const gradedAnswers = [];

      console.log("=== GRADING START ===");
      console.log("Questions:", questions.length);
      console.log("Answers:", answers?.length);
      console.log("Question IDs:", questions.map((q: any) => q.id));
      console.log("Question Titles:", questions.map((q: any) => q.title));
      console.log("Answer questionIds:", (answers || []).map((a: any) => a.questionId));
      console.log("Answer titles:", (answers || []).map((a: any) => a.questionTitle));

      for (const answer of answers || []) {
        console.log(`\n🧪 Grading: "${answer.questionTitle}" (questionId: ${answer.questionId})`);

        // Try multiple matching strategies
        let question = null;

        // Match by ID
        if (answer.questionId) {
          question = questions.find((q: any) => q.id === answer.questionId);
          if (question) console.log("  ✅ Matched by ID");
        }

        // Match by title (exact)
        if (!question && answer.questionTitle) {
          question = questions.find((q: any) => q.title === answer.questionTitle);
          if (question) console.log("  ✅ Matched by exact title");
        }

        // Match by title (normalized — trim, lowercase)
        if (!question && answer.questionTitle) {
          const normalizedTitle = answer.questionTitle.trim().toLowerCase();
          question = questions.find((q: any) =>
            q.title?.trim().toLowerCase() === normalizedTitle
          );
          if (question) console.log("  ✅ Matched by normalized title");
        }

        // Match by title (contains)
        if (!question && answer.questionTitle) {
          const answerTitle = answer.questionTitle.trim().toLowerCase();
          question = questions.find((q: any) =>
            q.title?.trim().toLowerCase().includes(answerTitle) ||
            answerTitle.includes(q.title?.trim().toLowerCase())
          );
          if (question) console.log("  ✅ Matched by partial title");
        }

        // Match by index (last resort)
        if (!question) {
          const answerIndex = (answers || []).indexOf(answer);
          if (answerIndex >= 0 && answerIndex < questions.length) {
            question = questions[answerIndex];
            console.log("  ⚠️ Matched by index:", answerIndex);
          }
        }

        if (!question) {
          console.error("  ❌ NO MATCH for:", {
            questionId: answer.questionId,
            title: answer.questionTitle,
            availableIds: questions.slice(0, 3).map((q: any) => q.id),
            availableTitles: questions.slice(0, 3).map((q: any) => q.title),
          });
          continue;
        }

        let score = 0;
        let grading: any = {};
        const qMaxScore = question.points || 10;
        maxScore += qMaxScore;

        console.log(`  📝 Type: ${question.type || answer.type}, Points: ${qMaxScore}`);

        if (question.type === "coding" || answer.type === "coding") {
          const testCases = question.testCases || [];
          const testResults = [];

          for (const tc of testCases) {
            const result = await executeCode(
              answer.code || "",
              answer.language || "javascript",
              tc.input || ""
            );

            const actualOutput = result.stdout || "";
            const expectedOutput = tc.expectedOutput || "";
            const passed =
              normalizeOutput(actualOutput) === normalizeOutput(expectedOutput) &&
              !result.stderr;

            const tcPoints = tc.points || 5;
            if (passed) score += tcPoints;

            testResults.push({
              id: tc.id,
              passed,
              input: tc.isHidden ? "[hidden]" : tc.input,
              expected: tc.isHidden ? "[hidden]" : expectedOutput,
              actual: tc.isHidden && !passed ? "[hidden]" : actualOutput,
              error: result.stderr || null,
              points: tcPoints,
            });

            console.log(`  TC ${tc.id}: ${passed ? "✅" : "❌"} | got: "${actualOutput.substring(0, 50)}" | expected: "${expectedOutput.substring(0, 50)}"`);
          }

          grading = {
            testResults,
            passedCount: testResults.filter((t) => t.passed).length,
            totalTests: testResults.length,
            earnedPoints: score,
          };
        } else if (question.type === "mcq" || answer.type === "mcq") {
  const selected = answer.selectedOption;
  const correct = question.correctAnswer;

  if (selected && correct && String(selected).trim().toLowerCase() === String(correct).trim().toLowerCase()) {
    score = qMaxScore;
  }

  grading = {
    correct: score > 0,
    selected: selected,
    correctAnswer: correct,
    // ✅ Include options so HR can see the full question
    options: question.options || [],
    explanation: question.explanation || null,
  };

          console.log(`  MCQ Result: ${score > 0 ? "✅ CORRECT" : "❌ WRONG"}`);
        }

        totalScore += score;
        gradedAnswers.push({
          questionId: question.id,
          questionTitle: answer.questionTitle || question.title,
          type: answer.type || question.type,
          score,
          maxScore: qMaxScore,
          grading,
        });

        console.log(`  Score: ${score}/${qMaxScore}`);
      }

      const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
      const startedAtMs =
        submission.started_at instanceof Date
          ? submission.started_at.getTime()
          : new Date(
              String(submission.started_at).endsWith("Z")
                ? submission.started_at
                : submission.started_at + "Z"
            ).getTime();
      const timeTaken = Math.floor((Date.now() - startedAtMs) / 1000);

      console.log(`\n=== FINAL RESULT: ${totalScore}/${maxScore} (${percentage.toFixed(1)}%) in ${timeTaken}s ===`);
      console.log(`Graded ${gradedAnswers.length} answers out of ${(answers || []).length} submitted`);

      const updated = await queryOne(
        `UPDATE submissions
         SET answers = $2, total_score = $3, max_score = $4, percentage = $5,
             status = 'GRADED', submitted_at = NOW(), time_taken = $6
         WHERE id = $1 RETURNING *`,
        [
          submissionId,
          JSON.stringify(gradedAnswers),
          totalScore,
          maxScore,
          Math.round(percentage * 100) / 100,
          timeTaken,
        ]
      );

      // Trigger pipeline execution
      try {
        await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/pipeline/execute`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              applicationId: submission.application_id,
              trigger: "assessment_completed",
            }),
          }
        );
      } catch (err) {
        console.error("Pipeline trigger failed:", err);
      }

      return NextResponse.json({
        success: true,
        submission: updated,
        totalScore,
        maxScore,
        percentage: Math.round(percentage * 100) / 100,
        gradedAnswers,
      });
    }

    // ==========================================
    // RESET TIMER
    // ==========================================
    if (action === "reset_timer") {
      const { submissionId } = body;

      if (!submissionId) {
        return NextResponse.json({ error: "submissionId required" }, { status: 400 });
      }

      const submission = await queryOne(
        "SELECT * FROM submissions WHERE id = $1 AND candidate_id = $2",
        [submissionId, candidateId]
      );

      if (!submission) {
        return NextResponse.json({ error: "Submission not found" }, { status: 404 });
      }

      if (submission.status !== "IN_PROGRESS") {
        return NextResponse.json({ error: "Cannot reset — already submitted" }, { status: 400 });
      }

      const startedAt = new Date(
        String(submission.started_at).endsWith("Z")
          ? submission.started_at
          : submission.started_at + "Z"
      ).getTime();
      const elapsed = Date.now() - startedAt;
      const maxResetWindow = 5 * 60 * 1000;

      if (elapsed > maxResetWindow) {
        console.log("Timer reset denied — started", Math.floor(elapsed / 1000), "seconds ago");
        return NextResponse.json({ submission });
      }

      const updated = await queryOne(
        "UPDATE submissions SET started_at = NOW() WHERE id = $1 RETURNING *",
        [submissionId]
      );

      console.log("Timer reset! Old start:", submission.started_at, "New start:", updated.started_at);

      return NextResponse.json({ submission: updated });
    }

    return NextResponse.json({ error: "Invalid action. Use 'start' or 'submit'" }, { status: 400 });
  } catch (error: any) {
    console.error("Submission error:", error);
    return NextResponse.json({ error: `Submission failed: ${error.message}` }, { status: 500 });
  }
}