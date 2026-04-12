export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db"; // ✅ FIXED
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const applicationId = searchParams.get("applicationId");
    const nodeSubtype = searchParams.get("nodeSubtype");

    if (!applicationId) return NextResponse.json({ error: "applicationId required" }, { status: 400 });

    console.log("=== ASSESSMENT FROM PIPELINE ===");
    console.log("Application:", applicationId, "Node:", nodeSubtype);

    // Get application → job → pipeline
    const application = await queryOne(
      `SELECT a.*, j.pipeline_id, j.title as job_title, j.description as job_description,
        j.skills as job_skills, j.requirements as job_requirements
       FROM applications a
       JOIN jobs j ON a.job_id = j.id
       WHERE a.id = $1`,
      [applicationId]
    );

    if (!application || !application.pipeline_id) {
      return NextResponse.json({ error: "No pipeline linked" }, { status: 404 });
    }

    const pipeline = await queryOne("SELECT * FROM pipelines WHERE id = $1", [application.pipeline_id]);
    if (!pipeline) return NextResponse.json({ error: "Pipeline not found" }, { status: 404 });

    let nodes: any[] = [];
    try {
      nodes = typeof pipeline.nodes === "string" ? JSON.parse(pipeline.nodes) : pipeline.nodes || [];
    } catch { nodes = []; }

    const targetSubtype = nodeSubtype || "coding_assessment";
    const assessmentNode = nodes.find((n: any) => n.data?.subtype === targetSubtype);

    if (!assessmentNode) {
      return NextResponse.json({ error: `No ${targetSubtype} node found in pipeline` }, { status: 404 });
    }

    const nodeConfig = assessmentNode.data?.config || {};
    let questions = nodeConfig.questions || [];
    const questionMode = nodeConfig.questionMode || "auto";

    console.log("Question mode:", questionMode);
    console.log("Preset questions:", questions.length);

    // ==========================================
    // AUTO MODE — Generate questions directly
    // ==========================================
    if (questionMode === "auto" || questions.length === 0) {
      console.log("Auto-generating questions for:", application.job_title);

      const jobContext = {
        title: application.job_title || "",
        description: application.job_description || "",
        skills: application.job_skills || [],
        requirements: application.job_requirements || [],
      };

      try {
        questions = await generateQuestionsDirectly(
          targetSubtype === "mcq_assessment" ? "mcq" : "coding",
          nodeConfig.difficulty || "medium",
          nodeConfig.questionCount || 3,
          nodeConfig.languages || ["javascript", "python"],
          jobContext
        );
        console.log(`Generated ${questions.length} questions for "${application.job_title}"`);
      } catch (err) {
        console.error("Auto-generation failed:", err);
      }

      if (questions.length === 0) {
        console.log("Using mock questions as fallback");
        questions = getMockQuestions(
          targetSubtype === "mcq_assessment" ? "mcq" : "coding",
          nodeConfig.difficulty || "medium",
          nodeConfig.questionCount || 3,
          nodeConfig.languages || ["javascript", "python"]
        );
      }

      if (questions.length === 0) {
        return NextResponse.json({
          error: "Could not generate questions. HR needs to configure them in the pipeline builder.",
        }, { status: 404 });
      }
    }

    // ==========================================
    // ✅ Cache questions for grading
    // ==========================================
    try {
      if (questions.length > 0) {
        const appId = applicationId;
        const nodeId = assessmentNode.id;

        await query(
          `INSERT INTO ai_cache (cache_key, value, expires_at)
           VALUES ($1, $2, NOW() + INTERVAL '24 hours')
           ON CONFLICT (cache_key)
           DO UPDATE SET value = $2, expires_at = NOW() + INTERVAL '24 hours'`,
          [
            `assessment_questions:v1:${appId}:${nodeId}`,
            JSON.stringify(questions),
          ]
        );

        console.log("Cached", questions.length, "questions for grading");
      }
    } catch (cacheErr) {
      console.error("Question caching failed:", cacheErr);
    }

    return NextResponse.json({
      assessment: {
        id: assessmentNode.id,
        title: assessmentNode.data?.label || "Assessment",
        type: targetSubtype === "mcq_assessment" ? "MCQ" : "CODING",
        duration: nodeConfig.duration || 60,
        questions,
        difficulty: nodeConfig.difficulty || "medium",
        languages: nodeConfig.languages || ["javascript", "python"],
        totalPoints: questions.reduce((sum: number, q: any) => sum + (q.points || 10), 0),
        questionMode,
      },
      application: {
        id: application.id,
        jobTitle: application.job_title,
      },
    });

  } catch (error: any) {
    console.error("Pipeline assessment fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch assessment" }, { status: 500 });
  }


// ==========================================
// Generate questions directly (no HTTP call needed)
// ==========================================
async function generateQuestionsDirectly(
  type: string,
  difficulty: string,
  questionCount: number,
  languages: string[],
  jobContext: { title: string; description: string; skills: string[]; requirements: string[] }
): Promise<any[]> {

  // Check if Gemini is available
  if (!process.env.GEMINI_API_KEY) {
    console.log("No Gemini key — using mock questions");
    return getMockQuestions(type, difficulty, questionCount, languages);
  }

  try {
    const { aiJSON } = await import("@/lib/ai");
    const hasSQL = languages.some((l) => ["sql", "mysql", "postgresql"].includes(l));

    if (type === "coding") {
      const result = await aiJSON<{ questions: any[] }>(
        `Generate ${questionCount} coding questions for a job assessment.

IMPORTANT: Each question MUST be unique. No duplicate questions. No similar questions. Each should test a different concept or skill.
JOB: ${jobContext.title}
DESCRIPTION: ${jobContext.description?.substring(0, 500)}
SKILLS: ${jobContext.skills.join(", ")}
REQUIREMENTS: ${jobContext.requirements.join(", ")}

Questions MUST be relevant to this specific job.
Difficulty: ${difficulty}
Languages: ${languages.join(", ")}
${hasSQL ? "Include at least 1 SQL question." : ""}

Return JSON:
{
  "questions": [
    {
      "title": "Problem title",
      "description": "Detailed problem with examples and input/output format",
      "difficulty": "${difficulty}",
      "type": "coding",
      "points": 25,
      "starterCode": {
        ${languages.map((l) => {
          if (l === "javascript") return '"javascript": "function solve(input) {\\n  // Your code here\\n}"';
          if (l === "python") return '"python": "def solve(input):\\n    # Your code here\\n    pass"';
          if (l === "typescript") return '"typescript": "function solve(input: any): any {\\n  // Your code here\\n}"';
          if (l === "sql") return '"sql": "-- Write your query here\\nSELECT "';
          return `"${l}": "// Your code here"`;
        }).join(",\n        ")}
      },
      "testCases": [
        { "id": "tc1", "input": "sample", "expectedOutput": "result", "isHidden": false, "points": 5 },
        { "id": "tc2", "input": "test2", "expectedOutput": "result2", "isHidden": false, "points": 5 },
        { "id": "tc3", "input": "edge", "expectedOutput": "result3", "isHidden": true, "points": 5 },
        { "id": "tc4", "input": "large", "expectedOutput": "result4", "isHidden": true, "points": 5 }
      ]
    }
  ]
}`,
        `Generate ${questionCount} ${difficulty} coding questions for "${jobContext.title}". Test: ${jobContext.skills.join(", ")}`
      );

      return (result.questions || []).map((q: any) => ({
  ...q,
  id: crypto.randomUUID(),
}));
    }

    if (type === "mcq") {
      const result = await aiJSON<{ questions: any[] }>(
        `Generate ${questionCount} MCQ questions for a job assessment.

JOB: ${jobContext.title}
DESCRIPTION: ${jobContext.description?.substring(0, 500)}
SKILLS: ${jobContext.skills.join(", ")}

Questions MUST test skills relevant to THIS job. Difficulty: ${difficulty}.

Return JSON:
{
  "questions": [
    {
      "title": "Question text",
      "description": "",
      "difficulty": "${difficulty}",
      "type": "mcq",
      "points": 5,
      "options": [
        { "id": "a", "text": "Option A" },
        { "id": "b", "text": "Option B" },
        { "id": "c", "text": "Option C" },
        { "id": "d", "text": "Option D" }
      ],
      "correctAnswer": "b",
      "explanation": "Why this is correct"
    }
  ]
}`,
        `Generate ${questionCount} ${difficulty} MCQs for "${jobContext.title}". Topics: ${jobContext.skills.join(", ")}`
      );

      return result.questions || [];
    }

    return [];
  } catch (err) {
    console.error("AI generation failed:", err);
    return getMockQuestions(type, difficulty, questionCount, languages);
  }
}

// ==========================================
// Mock questions fallback
// ==========================================
function getMockQuestions(type: string, difficulty: string, count: number, languages: string[]): any[] {
  if (type === "coding") {
    const problems = [
      {
        title: "Two Sum",
        description: `Given a comma-separated list of integers and a target (last number), find two numbers that add up to the target. Return their indices.\n\nInput: 2,7,11,15,9\nOutput: 0,1\n\nInput: 3,2,4,6\nOutput: 1,2`,
        difficulty, type: "coding", points: 30,
        starterCode: {
          javascript: "function solve(input) {\n  const parts = input.split(',').map(Number);\n  const target = parts.pop();\n  const nums = parts;\n  // Your code here\n}",
          python: "def solve(input):\n    parts = list(map(int, input.split(',')))\n    target = parts.pop()\n    nums = parts\n    # Your code here\n    pass",
        },
        testCases: [
          { id: "t1", input: "2,7,11,15,9", expectedOutput: "0,1", isHidden: false, points: 10 },
          { id: "t2", input: "3,2,4,6", expectedOutput: "1,2", isHidden: false, points: 10 },
          { id: "t3", input: "3,3,6", expectedOutput: "0,1", isHidden: true, points: 10 },
        ],
      },
      {
        title: "Reverse Words",
        description: `Reverse the order of words in a string.\n\nInput: hello world\nOutput: world hello\n\nInput: the sky is blue\nOutput: blue is sky the`,
        difficulty: "easy", type: "coding", points: 20,
        starterCode: {
          javascript: "function solve(input) {\n  // Reverse words\n}",
          python: "def solve(input):\n    # Reverse words\n    pass",
        },
        testCases: [
          { id: "t1", input: "hello world", expectedOutput: "world hello", isHidden: false, points: 10 },
          { id: "t2", input: "the sky is blue", expectedOutput: "blue is sky the", isHidden: true, points: 10 },
        ],
      },
      {
        title: "Max Subarray Sum",
        description: `Find the contiguous subarray with the largest sum.\n\nInput: -2,1,-3,4,-1,2,1,-5,4\nOutput: 6\n\nInput: 5,4,-1,7,8\nOutput: 23`,
        difficulty: "medium", type: "coding", points: 30,
        starterCode: {
          javascript: "function solve(input) {\n  const nums = input.split(',').map(Number);\n  // Kadane's algorithm\n}",
          python: "def solve(input):\n    nums = list(map(int, input.split(',')))\n    # Kadane's algorithm\n    pass",
        },
        testCases: [
          { id: "t1", input: "-2,1,-3,4,-1,2,1,-5,4", expectedOutput: "6", isHidden: false, points: 10 },
          { id: "t2", input: "5,4,-1,7,8", expectedOutput: "23", isHidden: false, points: 10 },
          { id: "t3", input: "-1,-2,-3", expectedOutput: "-1", isHidden: true, points: 10 },
        ],
      },
    ];
  return problems.slice(0, count).map((q) => ({
  ...q,
  id: crypto.randomUUID(),
}));
  }

  if (type === "mcq") {
    return Array.from({ length: count }, (_, i) => ({
      title: [
        "What is the output of: console.log(typeof null)?",
        "Which data structure uses FIFO?",
        "What is the time complexity of binary search?",
        "Which HTTP method is idempotent?",
        "What does REST stand for?",
      ][i % 5],
      description: "",
      difficulty, type: "mcq", points: 5,
      options: [
        [
          { id: "a", text: '"null"' }, { id: "b", text: '"object"' },
          { id: "c", text: '"undefined"' }, { id: "d", text: "Error" },
        ],
        [
          { id: "a", text: "Stack" }, { id: "b", text: "Queue" },
          { id: "c", text: "Tree" }, { id: "d", text: "Graph" },
        ],
        [
          { id: "a", text: "O(n)" }, { id: "b", text: "O(log n)" },
          { id: "c", text: "O(n²)" }, { id: "d", text: "O(1)" },
        ],
        [
          { id: "a", text: "POST" }, { id: "b", text: "GET" },
          { id: "c", text: "PATCH" }, { id: "d", text: "DELETE" },
        ],
        [
          { id: "a", text: "Representational State Transfer" },
          { id: "b", text: "Remote Execution Service Technology" },
          { id: "c", text: "Reliable Endpoint Service Type" },
          { id: "d", text: "Resource State Tracking" },
        ],
      ][i % 5],
      correctAnswer: ["b", "b", "b", "b", "a"][i % 5],
      explanation: [
        "typeof null returns 'object' — a known JS quirk",
        "Queue follows FIFO — First In First Out",
        "Binary search halves the search space each step",
        "GET is idempotent — same result on repeat calls",
        "REST = Representational State Transfer",
      ][i % 5],
    })).map((q) => ({
  ...q,
  id: crypto.randomUUID(),
}));
  }

  return [];
}
}