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
// Direct code execution (no HTTP self-call)
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
      try { await execAsync("python3 --version"); } catch { cmd = "python"; }
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
    try { rmSync(workDir, { recursive: true, force: true }); } catch {}
  }
}

// ==========================================
// GET Submissions
// ==========================================
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const candidateId = (session.user as any).id;
    const action = body.action;

    console.log("=== SUBMISSION ACTION ===", action);

    // ==========================================
    // START
    // ==========================================
    if (action === "start") {
      const { assessmentId, applicationId } = body;

      if (!assessmentId || !applicationId) {
        return NextResponse.json(
          { error: "assessmentId and applicationId required" },
          { status: 400 }
        );
      }

      const existing = await queryOne(
        `SELECT * FROM submissions
         WHERE assessment_id = $1 AND candidate_id = $2 AND application_id = $3`,
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
        `INSERT INTO submissions (
          assessment_id, application_id, candidate_id,
          status, max_score, started_at
        ) VALUES ($1, $2, $3, 'IN_PROGRESS', 100, NOW())
        RETURNING *`,
        [assessmentId, applicationId, candidateId]
      );

      await query(
        "UPDATE applications SET status = 'ASSESSMENT', updated_at = NOW() WHERE id = $1",
        [applicationId]
      );

      console.log("Created submission:", submission.id);
      return NextResponse.json({ submission }, { status: 201 });
    }

    // ==========================================
    // SUBMIT — Grade everything server-side
    // ==========================================
    if (action === "submit") {
      const { submissionId, answers } = body;

      if (!submissionId) {
        return NextResponse.json({ error: "submissionId required" }, { status: 400 });
      }

      console.log("Grading submission:", submissionId);
      console.log("Answers received:", answers?.length);

      const submission = await queryOne(
        "SELECT * FROM submissions WHERE id = $1 AND candidate_id = $2",
        [submissionId, candidateId]
      );

      if (!submission) {
        return NextResponse.json({ error: "Submission not found" }, { status: 404 });
      }

      if (submission.status === "GRADED") {
        return NextResponse.json({ error: "Already graded", submission }, { status: 409 });
      }

      // ==========================================
      // Get questions from pipeline node config
      // ==========================================
      const application = await queryOne(
        `SELECT a.*, j.pipeline_id
         FROM applications a
         JOIN jobs j ON a.job_id = j.id
         WHERE a.id = $1`,
        [submission.application_id]
      );

      let questions: any[] = [];

      if (application?.pipeline_id) {
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

          // Find ALL assessment nodes and collect questions
          for (const node of nodes) {
            if (
              node.data?.subtype === "coding_assessment" ||
              node.data?.subtype === "mcq_assessment"
            ) {
              const nodeQuestions = node.data?.config?.questions || [];
              questions.push(...nodeQuestions);
            }
          }
        }
      }

      console.log("Found", questions.length, "questions for grading");

      if (questions.length === 0) {
        console.error("NO QUESTIONS FOUND — checking assessment table");
        const assessment = await queryOne(
          "SELECT * FROM assessments WHERE id = $1",
          [submission.assessment_id]
        );
        if (assessment?.questions) {
          questions = typeof assessment.questions === "string"
            ? JSON.parse(assessment.questions)
            : assessment.questions;
          console.log("Found", questions.length, "questions from assessments table");
        }
      }

      // ==========================================
      // GRADE EACH ANSWER
      // ==========================================
      let totalScore = 0;
      let maxScore = 0;
      const gradedAnswers = [];

      for (const answer of (answers || [])) {
        const question = questions.find(
          (q: any) => q.title === answer.questionTitle
        );

        if (!question) {
          console.log("⚠️ Question not found:", answer.questionTitle);
          console.log("   Available:", questions.map((q: any) => q.title));
          continue;
        }

        let score = 0;
        let grading: any = {};
        const qMaxScore = question.points || 10;
        maxScore += qMaxScore;

        console.log(`\nGrading: "${question.title}" (${question.type}, ${qMaxScore} pts)`);

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

            console.log(
              `  TC ${tc.id}: ${passed ? "✅ PASS" : "❌ FAIL"}` +
              ` | got: "${actualOutput.substring(0, 50)}"` +
              ` | expected: "${expectedOutput.substring(0, 50)}"` +
              (result.stderr ? ` | err: ${result.stderr.substring(0, 50)}` : "")
            );
          }

          grading = {
            testResults,
            passedCount: testResults.filter((t) => t.passed).length,
            totalTests: testResults.length,
            earnedPoints: score,
          };

        } else if (question.type === "mcq" || answer.type === "mcq") {
          if (answer.selectedOption === question.correctAnswer) {
            score = qMaxScore;
          }
          grading = {
            correct: score > 0,
            selected: answer.selectedOption,
            correctAnswer: question.correctAnswer,
          };
          console.log(`  MCQ: selected=${answer.selectedOption} correct=${question.correctAnswer} → ${score > 0 ? "✅" : "❌"}`);
        }

        totalScore += score;

        gradedAnswers.push({
          questionTitle: answer.questionTitle,
          type: answer.type || question.type,
          score,
          maxScore: qMaxScore,
          grading,
        });

        console.log(`  Score: ${score}/${qMaxScore}`);
      }

      const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
      const timeTaken = Math.floor(
        (Date.now() - new Date(submission.started_at).getTime()) / 1000
      );

      console.log(`\n=== FINAL: ${totalScore}/${maxScore} (${percentage.toFixed(1)}%) in ${timeTaken}s ===\n`);

      // Save to database
      const updated = await queryOne(
        `UPDATE submissions
         SET answers = $2,
             total_score = $3,
             max_score = $4,
             percentage = $5,
             status = 'GRADED',
             submitted_at = NOW(),
             time_taken = $6
         WHERE id = $1
         RETURNING *`,
        [
          submissionId,
          JSON.stringify(gradedAnswers),
          totalScore,
          maxScore,
          Math.round(percentage * 100) / 100,
          timeTaken,
        ]
      );
            // ==========================================
      // TRIGGER PIPELINE EXECUTION
      // ==========================================
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
        console.error("Pipeline execution trigger failed (non-critical):", err);
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

    return NextResponse.json(
      { error: "Invalid action. Use 'start' or 'submit'" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Submission error:", error);
    return NextResponse.json(
      { error: `Submission failed: ${error.message}` },
      { status: 500 }
    );
  }
}