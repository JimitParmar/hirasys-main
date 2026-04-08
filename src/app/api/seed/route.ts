import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    console.log("🌱 Seeding database...");

    // ==========================================
    // 1. CREATE USERS
    // ==========================================
    const passwordHash = await bcrypt.hash("password123", 12);

    // HR User
    const hr = await queryOne(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, company)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (email) DO UPDATE SET first_name = $3
       RETURNING *`,
      ["hr@hirasys.com", passwordHash, "Sarah", "Johnson", "HR", "TechCorp"]
    );

    // Candidates
    const candidates = [];
    const candidateData = [
      { email: "alice@test.com", first: "Alice", last: "Chen", resume: generateResume("Alice Chen", "senior", ["React", "TypeScript", "Node.js", "PostgreSQL", "AWS", "System Design"]) },
      { email: "bob@test.com", first: "Bob", last: "Kumar", resume: generateResume("Bob Kumar", "mid", ["React", "JavaScript", "Python", "MongoDB"]) },
      { email: "charlie@test.com", first: "Charlie", last: "Wang", resume: generateResume("Charlie Wang", "junior", ["HTML", "CSS", "JavaScript", "React basics"]) },
      { email: "diana@test.com", first: "Diana", last: "Patel", resume: generateResume("Diana Patel", "senior", ["Python", "Machine Learning", "TensorFlow", "AWS", "Docker", "System Design"]) },
      { email: "eve@test.com", first: "Eve", last: "Smith", resume: generateResume("Eve Smith", "mid", ["React", "TypeScript", "GraphQL", "Next.js", "Tailwind"]) },
      { email: "frank@test.com", first: "Frank", last: "Lee", resume: generateResume("Frank Lee", "junior", ["Java", "Spring Boot", "MySQL"]) },
      { email: "grace@test.com", first: "Grace", last: "Kim", resume: generateResume("Grace Kim", "senior", ["React", "Node.js", "TypeScript", "PostgreSQL", "Redis", "Kubernetes"]) },
      { email: "henry@test.com", first: "Henry", last: "Zhao", resume: generateResume("Henry Zhao", "mid", ["Vue.js", "Python", "Django", "PostgreSQL"]) },
    ];

    for (const c of candidateData) {
      const user = await queryOne(
        `INSERT INTO users (email, password_hash, first_name, last_name, role, resume_text, skills)
         VALUES ($1, $2, $3, $4, 'CANDIDATE', $5, $6)
         ON CONFLICT (email) DO UPDATE SET first_name = $3
         RETURNING *`,
        [c.email, passwordHash, c.first, c.last, c.resume.text, c.resume.skills]
      );
      candidates.push({ ...user, resumeText: c.resume.text });
    }

    // ==========================================
    // 2. CREATE PIPELINE
    // ==========================================
    const pipelineNodes = [
      {
        id: "source_1", type: "source", position: { x: 50, y: 200 },
        data: { id: "source_1", type: "source", subtype: "job_posting", label: "Job Posting", config: {}, costPerUnit: 0.5, icon: "Briefcase", color: "#10B981" },
      },
      {
        id: "screen_1", type: "stage", position: { x: 300, y: 200 },
        data: { id: "screen_1", type: "stage", subtype: "ai_resume_screen", label: "AI Resume Screen", config: { criteria: ["skills_match", "experience"] }, costPerUnit: 0.15, icon: "FileSearch", color: "#3B82F6" },
      },
      {
        id: "filter_1", type: "filter", position: { x: 550, y: 200 },
        data: { id: "filter_1", type: "filter", subtype: "score_gate", label: "Score Gate", config: { minScore: 40, scoreSource: "previous_stage_score", filtered: { rejectEmail: true, emailType: "ai_personalized" } }, costPerUnit: 0, icon: "Gauge", color: "#F59E0B" },
      },
      {
        id: "assess_1", type: "stage", position: { x: 800, y: 200 },
        data: {
          id: "assess_1", type: "stage", subtype: "coding_assessment", label: "Coding Assessment",
          config: {
            duration: 60, difficulty: "medium", questionCount: 2, languages: ["javascript", "python"],
            questions: [
              {
                title: "Two Sum", type: "coding", difficulty: "medium", points: 30,
                description: "Given a comma-separated list of integers and a target (last number), find two numbers that add up to the target. Return their indices separated by comma.\n\nInput: 2,7,11,15,9\nOutput: 0,1",
                starterCode: {
                  javascript: "function solve(input) {\n  const parts = input.split(',').map(Number);\n  const target = parts.pop();\n  const nums = parts;\n  // Your code here\n}",
                  python: "def solve(input):\n    parts = list(map(int, input.split(',')))\n    target = parts.pop()\n    nums = parts\n    # Your code here",
                },
                testCases: [
                  { id: "t1", input: "2,7,11,15,9", expectedOutput: "0,1", isHidden: false, points: 10 },
                  { id: "t2", input: "3,2,4,6", expectedOutput: "1,2", isHidden: false, points: 10 },
                  { id: "t3", input: "3,3,6", expectedOutput: "0,1", isHidden: true, points: 10 },
                ],
              },
              {
                title: "Reverse Words", type: "coding", difficulty: "easy", points: 20,
                description: "Reverse the order of words in a string.\n\nInput: hello world\nOutput: world hello",
                starterCode: {
                  javascript: "function solve(input) {\n  // Reverse words\n}",
                  python: "def solve(input):\n    # Reverse words\n    pass",
                },
                testCases: [
                  { id: "t1", input: "hello world", expectedOutput: "world hello", isHidden: false, points: 10 },
                  { id: "t2", input: "the sky is blue", expectedOutput: "blue is sky the", isHidden: true, points: 10 },
                ],
              },
            ],
          },
          costPerUnit: 2.5, icon: "Code", color: "#3B82F6",
        },
      },
      {
        id: "interview_1", type: "stage", position: { x: 1050, y: 200 },
        data: { id: "interview_1", type: "stage", subtype: "ai_technical_interview", label: "AI Technical Interview", config: { maxQuestions: 3, duration: 15, adaptive: true, useResumeContext: true, difficulty: "progressive", interviewMode: "technical" }, costPerUnit: 3.0, icon: "Bot", color: "#3B82F6" },
      },
      {
        id: "offer_1", type: "exit", position: { x: 1300, y: 200 },
        data: { id: "offer_1", type: "exit", subtype: "offer", label: "Extend Offer", config: {}, costPerUnit: 2.0, icon: "Award", color: "#EC4899" },
      },
    ];

    const pipelineEdges = [
      { id: "e1", source: "source_1", target: "screen_1" },
      { id: "e2", source: "screen_1", target: "filter_1" },
      { id: "e3", source: "filter_1", target: "assess_1", sourceHandle: "pass" },
      { id: "e4", source: "assess_1", target: "interview_1" },
      { id: "e5", source: "interview_1", target: "offer_1" },
    ];

    const pipeline = await queryOne(
      `INSERT INTO pipelines (name, status, nodes, edges, estimated_cost, created_by, linked_job_id)
       VALUES ($1, 'ACTIVE', $2, $3, 350, $4, NULL)
       RETURNING *`,
      ["Engineering Hiring Pipeline", JSON.stringify(pipelineNodes), JSON.stringify(pipelineEdges), hr.id]
    );

    // ==========================================
    // 3. CREATE JOB
    // ==========================================
    const job = await queryOne(
      `INSERT INTO jobs (title, description, requirements, skills, department, location, type,
        experience_min, experience_max, salary_min, salary_max, salary_currency,
        status, pipeline_id, posted_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'PUBLISHED', $13, $14)
       RETURNING *`,
      [
        "Senior Full-Stack Developer",
        "We are looking for a Senior Full-Stack Developer to join our engineering team. You'll be working on our core product, building scalable APIs, and creating beautiful user interfaces.\n\nResponsibilities:\n- Design and implement new features\n- Write clean, maintainable code\n- Mentor junior developers\n- Participate in code reviews\n- Contribute to system architecture decisions",
        ["5+ years of full-stack development", "Strong React/Next.js experience", "Backend API design", "Database design and optimization", "Experience with cloud services"],
        ["React", "TypeScript", "Node.js", "PostgreSQL", "AWS", "System Design", "Next.js"],
        "Engineering",
        "Remote",
        "full_time",
        3, 8,
        120000, 180000, "USD",
        pipeline.id,
        hr.id,
      ]
    );

    // Update pipeline with job link
    await query("UPDATE pipelines SET linked_job_id = $1 WHERE id = $2", [job.id, pipeline.id]);

    // ==========================================
    // 4. CREATE APPLICATIONS (auto-scored)
    // ==========================================
    const applicationResults = [];

    for (const candidate of candidates) {
      // Score resume
      const resumeText = candidate.resumetext || candidate.resume_text || "";
      const jobSkills = ["React", "TypeScript", "Node.js", "PostgreSQL", "AWS", "System Design", "Next.js"];
      const candidateSkills = candidate.skills || [];

      const matchedSkills = jobSkills.filter((s: string) =>
        candidateSkills.some((cs: string) => cs.toLowerCase().includes(s.toLowerCase())) ||
        resumeText.toLowerCase().includes(s.toLowerCase())
      );
      const resumeScore = Math.round((matchedSkills.length / jobSkills.length) * 100);

      const app = await queryOne(
        `INSERT INTO applications (job_id, candidate_id, resume_url, resume_text, resume_score,
          resume_parsed, status, current_stage)
         VALUES ($1, $2, 'seeded', $3, $4, $5, 'APPLIED', 'applied')
         ON CONFLICT (job_id, candidate_id) DO UPDATE SET resume_score = $4
         RETURNING *`,
        [
          job.id,
          candidate.id,
          resumeText,
          resumeScore,
          JSON.stringify({ matchedSkills, missingSkills: jobSkills.filter((s: string) => !matchedSkills.includes(s)), score: resumeScore }),
        ]
      );

      applicationResults.push({
        name: `${candidate.first_name} ${candidate.last_name}`,
        email: candidate.email,
        resumeScore,
        matchedSkills,
        applicationId: app.id,
      });
    }

    // ==========================================
    // 5. TRIGGER PIPELINE FOR ALL APPLICATIONS
    // ==========================================
    for (const app of applicationResults) {
      try {
        await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/pipeline/execute`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              applicationId: app.applicationId,
              trigger: "seed_application",
            }),
          }
        );
      } catch {}
    }

    // ==========================================
    // 6. UPDATE JOB APPLICANT COUNT
    // ==========================================
    await query(
      "UPDATE jobs SET applicant_count = $1 WHERE id = $2",
      [candidates.length, job.id]
    );

    console.log("🌱 Seed complete!");

    return NextResponse.json({
      success: true,
      message: "Database seeded!",
      data: {
        hr: { email: "hr@hirasys.com", password: "password123" },
        candidates: applicationResults.map((a) => ({
          ...a,
          password: "password123",
        })),
        job: { id: job.id, title: job.title },
        pipeline: { id: pipeline.id, name: pipeline.name },
      },
    });
  } catch (error: any) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function generateResume(name: string, level: string, skills: string[]) {
  const years = level === "senior" ? "7" : level === "mid" ? "4" : "1";
  const text = `${name}
${level.charAt(0).toUpperCase() + level.slice(1)} Software Developer
${years} years of experience

Skills: ${skills.join(", ")}

Experience:
- ${level === "senior" ? "Led team of 5 developers building scalable microservices" : level === "mid" ? "Built and maintained web applications" : "Developed frontend components"}
- Worked with ${skills.slice(0, 3).join(", ")}
- ${level === "senior" ? "Designed system architecture for 1M+ users" : "Contributed to product features"}

Education:
- B.Tech Computer Science, ${level === "senior" ? "IIT Delhi" : level === "mid" ? "NIT Trichy" : "Local Engineering College"}`;

  return { text, skills };
}