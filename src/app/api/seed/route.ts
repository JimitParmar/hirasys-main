import { query, queryOne } from "@/lib/db";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("key");

  if (secret !== process.env.ADMIN_SECRET) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(message: string) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(message)}\n\n`));
      }

      function progress(step: number, total: number, message: string) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ step, total, message })}\n\n`
          )
        );
      }

      const TOTAL_STEPS = 8;

      try {
        // ==========================================
        // STEP 1: SETUP
        // ==========================================
        progress(1, TOTAL_STEPS, "Hashing passwords...");
        const passwordHash = await bcrypt.hash("Test1234!", 12);

        // ==========================================
        // STEP 2: COMPANY
        // ==========================================
        progress(2, TOTAL_STEPS, "Creating company — Nexlayer...");

        let cId: string;
        const existingCompany = await queryOne(
          "SELECT id FROM companies WHERE name = 'Nexlayer'"
        );

        if (existingCompany) {
          cId = existingCompany.id;
        } else {
          const company = await queryOne(
            `INSERT INTO companies (name, domain, created_by)
             VALUES ('Nexlayer', 'nexlayer.io', 'pending')
             RETURNING *`
          );
          cId = company.id;
        }

        // ==========================================
        // STEP 3: TEAM MEMBERS
        // ==========================================
        progress(3, TOTAL_STEPS, "Creating team members...");

        const teamMembers = [
  { email: "priya@nexlayer.io", firstName: "Priya", lastName: "Sharma", role: "ADMIN" },
  { email: "recruiter@nexlayer.io", firstName: "Meera", lastName: "Kapoor", role: "HR" },
  { email: "hiring@nexlayer.io", firstName: "Arjun", lastName: "Mehta", role: "HR" },
  { email: "rahul@nexlayer.io", firstName: "Rahul", lastName: "Desai", role: "INTERVIEWER" },
];

        for (const u of teamMembers) {
          const existing = await queryOne("SELECT id FROM users WHERE email = $1", [u.email]);
          if (!existing) {
            await queryOne(
              `INSERT INTO users (email, password_hash, first_name, last_name, role, company_id, company, is_active)
               VALUES ($1, $2, $3, $4, $5, $6, $7, true) RETURNING id`,
              [u.email, passwordHash, u.firstName, u.lastName, u.role, cId, "Nexlayer"]
            );
          }
        }

        const admin = await queryOne("SELECT id FROM users WHERE email = 'priya@nexlayer.io'");
        if (admin) {
          await query("UPDATE companies SET created_by = $1 WHERE id = $2", [admin.id, cId]);
        }

        const recruiter = await queryOne("SELECT id FROM users WHERE email = 'recruiter@nexlayer.io'");
        const hrArjun = await queryOne("SELECT id FROM users WHERE email = 'hiring@nexlayer.io'");

        // ==========================================
        // STEP 4: CANDIDATES
        // ==========================================
        progress(4, TOTAL_STEPS, "Creating 40 candidates...");

        const candidates = [
          { email: "ananya.r@gmail.com", firstName: "Ananya", lastName: "Raghavan" },
          { email: "omar.faisal@outlook.com", firstName: "Omar", lastName: "Faisal" },
          { email: "sarah.chen@proton.me", firstName: "Sarah", lastName: "Chen" },
          { email: "vikram.joshi@yahoo.com", firstName: "Vikram", lastName: "Joshi" },
          { email: "emily.zhang@gmail.com", firstName: "Emily", lastName: "Zhang" },
          { email: "carlos.rivera@hotmail.com", firstName: "Carlos", lastName: "Rivera" },
          { email: "sneha.patel@gmail.com", firstName: "Sneha", lastName: "Patel" },
          { email: "james.okonkwo@pm.me", firstName: "James", lastName: "Okonkwo" },
          { email: "aisha.khan@gmail.com", firstName: "Aisha", lastName: "Khan" },
          { email: "daniel.moretti@outlook.com", firstName: "Daniel", lastName: "Moretti" },
          { email: "ritika.menon@gmail.com", firstName: "Ritika", lastName: "Menon" },
          { email: "tom.anderson@yahoo.com", firstName: "Tom", lastName: "Anderson" },
          { email: "fatima.zahra@outlook.com", firstName: "Fatima", lastName: "Zahra" },
          { email: "kevin.wu@gmail.com", firstName: "Kevin", lastName: "Wu" },
          { email: "prachi.deshmukh@pm.me", firstName: "Prachi", lastName: "Deshmukh" },
          { email: "ben.taylor@gmail.com", firstName: "Ben", lastName: "Taylor" },
          { email: "nisha.reddy@hotmail.com", firstName: "Nisha", lastName: "Reddy" },
          { email: "lucas.park@gmail.com", firstName: "Lucas", lastName: "Park" },
          { email: "maria.santos@outlook.com", firstName: "Maria", lastName: "Santos" },
          { email: "alex.dubois@proton.me", firstName: "Alex", lastName: "Dubois" },
          { email: "rohan.gupta@gmail.com", firstName: "Rohan", lastName: "Gupta" },
          { email: "sophie.miller@yahoo.com", firstName: "Sophie", lastName: "Miller" },
          { email: "arjun.nair@gmail.com", firstName: "Arjun", lastName: "Nair" },
          { email: "chloe.bennett@outlook.com", firstName: "Chloe", lastName: "Bennett" },
          { email: "karthik.iyer@hotmail.com", firstName: "Karthik", lastName: "Iyer" },
          { email: "maya.johnson@gmail.com", firstName: "Maya", lastName: "Johnson" },
          { email: "derek.chang@outlook.com", firstName: "Derek", lastName: "Chang" },
          { email: "isha.singh@pm.me", firstName: "Isha", lastName: "Singh" },
          { email: "ryan.brooks@gmail.com", firstName: "Ryan", lastName: "Brooks" },
          { email: "tanya.wilson@proton.me", firstName: "Tanya", lastName: "Wilson" },
          { email: "deepak.sharma@gmail.com", firstName: "Deepak", lastName: "Sharma" },
          { email: "lisa.nakamura@yahoo.com", firstName: "Lisa", lastName: "Nakamura" },
          { email: "samuel.osei@outlook.com", firstName: "Samuel", lastName: "Osei" },
          { email: "pooja.bhatt@gmail.com", firstName: "Pooja", lastName: "Bhatt" },
          { email: "noah.klein@proton.me", firstName: "Noah", lastName: "Klein" },
          { email: "meghna.rao@hotmail.com", firstName: "Meghna", lastName: "Rao" },
          { email: "ethan.cole@gmail.com", firstName: "Ethan", lastName: "Cole" },
          { email: "zara.ahmed@outlook.com", firstName: "Zara", lastName: "Ahmed" },
          { email: "nikhil.verma@pm.me", firstName: "Nikhil", lastName: "Verma" },
          { email: "grace.liu@gmail.com", firstName: "Grace", lastName: "Liu" },
        ];

        let candidateCount = 0;
        for (const c of candidates) {
          const existing = await queryOne("SELECT id FROM users WHERE email = $1", [c.email]);
          if (!existing) {
            await queryOne(
              `INSERT INTO users (email, password_hash, first_name, last_name, role, is_active)
               VALUES ($1, $2, $3, $4, 'CANDIDATE', true) RETURNING id`,
              [c.email, passwordHash, c.firstName, c.lastName]
            );
            candidateCount++;
          }
        }

        // ==========================================
        // STEP 5: JOBS
        // ==========================================
        progress(5, TOTAL_STEPS, "Creating 8 job postings...");

        const jobs = [
          {
            title: "Senior Frontend Engineer",
            description: "We're looking for a Senior Frontend Engineer to lead the development of our customer-facing web applications.\n\nYou'll work closely with design and product to build fast, accessible interfaces using React, TypeScript, and Next.js.\n\nRequirements:\n- 5+ years building production React applications\n- Deep TypeScript knowledge\n- Experience with Next.js (App Router preferred)\n- Track record of shipping at scale",
            department: "Engineering", location: "Remote", type: "full_time",
            skills: ["React", "TypeScript", "Next.js", "Tailwind CSS", "GraphQL", "Testing"],
            requirements: ["5+ years React", "Advanced TypeScript", "Next.js App Router", "Performance optimization"],
            postedBy: recruiter?.id,
          },
          {
            title: "Backend Engineer — Platform",
            description: "Join our platform team to build the core infrastructure that powers Nexlayer.\n\nYou'll design and implement APIs, background jobs, data pipelines, and integrations.\n\nRequirements:\n- 3+ years backend development with Node.js or Python\n- Strong PostgreSQL skills\n- Experience with Redis and event-driven systems\n- Understanding of API design principles",
            department: "Engineering", location: "Remote", type: "full_time",
            skills: ["Node.js", "PostgreSQL", "Redis", "AWS", "REST APIs", "Docker"],
            requirements: ["3+ years Node.js or Python", "Strong SQL", "API design", "AWS or GCP"],
            postedBy: recruiter?.id,
          },
          {
            title: "Product Designer",
            description: "We need a Product Designer who can own the end-to-end design process — from research through to pixel-perfect handoff.\n\nRequirements:\n- 3+ years product design at a SaaS company\n- Expert-level Figma skills\n- Experience designing complex workflows and data-heavy interfaces",
            department: "Design", location: "Bangalore, IN", type: "full_time",
            skills: ["Figma", "User Research", "Design Systems", "Prototyping", "UI/UX"],
            requirements: ["3+ years product design", "Figma expert", "B2B SaaS experience"],
            postedBy: hrArjun?.id,
          },
          {
            title: "DevOps / Infrastructure Engineer",
            description: "Own our cloud infrastructure and developer tooling.\n\nWe run on AWS with Terraform, Docker, and GitHub Actions.\n\nRequirements:\n- 3+ years in DevOps or SRE roles\n- Strong AWS experience\n- Terraform for infrastructure as code\n- Docker and container orchestration",
            department: "Engineering", location: "Remote", type: "full_time",
            skills: ["AWS", "Terraform", "Docker", "CI/CD", "Linux", "Monitoring"],
            requirements: ["3+ years DevOps/SRE", "AWS experience", "Terraform", "Docker"],
            postedBy: recruiter?.id,
          },
          {
            title: "Growth Marketing Manager",
            description: "Lead our growth efforts from content to conversion.\n\nYou'll own the full marketing funnel — from driving awareness to converting signups.\n\nRequirements:\n- 4+ years in growth or product marketing at B2B SaaS\n- Hands-on SEO, paid ads, and email marketing\n- Data-driven with analytics experience",
            department: "Marketing", location: "Mumbai, IN", type: "full_time",
            skills: ["SEO", "Content Marketing", "Google Ads", "Analytics", "Email Marketing", "PLG"],
            requirements: ["4+ years B2B SaaS marketing", "Paid acquisition", "SEO expertise"],
            postedBy: hrArjun?.id,
          },
          {
            title: "Full Stack Engineering Intern",
            description: "A 3-month paid internship on our engineering team.\n\nYou'll work on real features alongside senior engineers.\n\nRequirements:\n- Currently pursuing CS or Engineering degree\n- Comfortable with JavaScript/TypeScript\n- Built at least one React project",
            department: "Engineering", location: "Remote", type: "internship",
            skills: ["React", "Node.js", "JavaScript", "PostgreSQL", "Git"],
            requirements: ["CS or Engineering student", "JavaScript/TypeScript", "One React project"],
            postedBy: recruiter?.id,
          },
          {
            title: "Technical Content Writer",
            description: "Write content that developers and HR teams actually want to read.\n\nRequirements:\n- 2+ years technical writing\n- Can explain complex concepts simply\n- SEO knowledge\n- Portfolio of published technical content",
            department: "Marketing", location: "Remote", type: "contract",
            skills: ["Technical Writing", "SEO", "Content Strategy", "Documentation", "Copywriting"],
            requirements: ["2+ years technical writing", "Published portfolio", "SEO fundamentals"],
            postedBy: hrArjun?.id,
          },
          {
            title: "Senior Data Engineer",
            description: "Build the data infrastructure that powers our AI features.\n\nRequirements:\n- 4+ years data engineering\n- Strong SQL and Python\n- Experience with Airflow, dbt, or similar\n- Cloud data warehouse experience",
            department: "Data", location: "Bangalore, IN", type: "full_time",
            skills: ["Python", "SQL", "Airflow", "dbt", "BigQuery", "AWS"],
            requirements: ["4+ years data engineering", "Advanced SQL", "Python", "Cloud data warehouse"],
            postedBy: recruiter?.id,
          },
        ];

        const jobIds: Record<string, string> = {};

        for (const job of jobs) {
          const existing = await queryOne(
            "SELECT id FROM jobs WHERE title = $1 AND posted_by = $2",
            [job.title, job.postedBy]
          );

          if (existing) {
            jobIds[job.title] = existing.id;
            continue;
          }

          const created = await queryOne(
            `INSERT INTO jobs (title, description, department, location, type, skills, requirements, status, posted_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'PUBLISHED', $8) RETURNING id`,
            [job.title, job.description, job.department, job.location, job.type, job.skills, job.requirements, job.postedBy]
          );

          if (created) jobIds[job.title] = created.id;
        }


                // ==========================================
        // STEP 6: PIPELINES
        // ==========================================
        progress(6, TOTAL_STEPS, "Creating pipelines for all jobs...");

        const pipelineConfigs: Array<{
          jobTitle: string;
          name: string;
          description: string;
          nodes: any[];
          edges: any[];
        }> = [
          // ---- Senior Frontend Engineer ----
          {
            jobTitle: "Senior Frontend Engineer",
            name: "Senior Frontend Hiring Pipeline",
            description: "Full pipeline for senior frontend engineer role — resume screen, coding assessment, AI interview, F2F, and final review.",
            nodes: [
              {
                id: "start-1",
                type: "startNode",
                position: { x: 0, y: 300 },
                data: { label: "Applications Open", description: "Candidates apply through job posting" },
              },
              {
                id: "resume-1",
                type: "resumeScreenNode",
                position: { x: 300, y: 300 },
                data: {
                  label: "Resume Screening",
                  description: "AI screens resumes against role requirements",
                  passThreshold: 70,
                  criteria: ["React 5+ years", "TypeScript", "Next.js experience", "Production scale apps"],
                  estimatedPassRate: 40,
                },
              },
              {
                id: "assessment-1",
                type: "assessmentNode",
                position: { x: 600, y: 200 },
                data: {
                  label: "Coding Assessment",
                  description: "React + TypeScript coding challenge",
                  assessmentType: "CODING",
                  duration: 90,
                  passingScore: 65,
                  skills: ["React", "TypeScript", "Problem Solving"],
                },
              },
              {
                id: "ai-interview-1",
                type: "aiInterviewNode",
                position: { x: 900, y: 200 },
                data: {
                  label: "AI Technical Interview",
                  description: "30-min AI interview on frontend architecture and system design",
                  interviewType: "TECHNICAL",
                  duration: 30,
                  maxQuestions: 8,
                  focusAreas: ["React architecture", "Performance", "State management", "Testing"],
                },
              },
              {
                id: "f2f-1",
                type: "interviewNode",
                position: { x: 1200, y: 200 },
                data: {
                  label: "Team Interview",
                  description: "1-hour interview with engineering lead and senior engineer",
                  interviewType: "technical",
                  duration: 60,
                  interviewers: ["Engineering Lead", "Senior Engineer"],
                },
              },
              {
                id: "review-1",
                type: "reviewNode",
                position: { x: 1500, y: 300 },
                data: {
                  label: "Final Review",
                  description: "Hiring committee reviews all scores and feedback",
                  reviewers: ["Engineering Lead", "VP Engineering", "HR"],
                },
              },
              {
                id: "offer-1",
                type: "offerNode",
                position: { x: 1800, y: 300 },
                data: { label: "Offer", description: "Extend offer to selected candidate" },
              },
              {
                id: "reject-resume",
                type: "rejectionNode",
                position: { x: 300, y: 500 },
                data: { label: "Rejected — Resume", description: "Did not meet minimum requirements", sendFeedback: true },
              },
              {
                id: "reject-assessment",
                type: "rejectionNode",
                position: { x: 600, y: 500 },
                data: { label: "Rejected — Assessment", description: "Below passing score on coding challenge", sendFeedback: true },
              },
              {
                id: "reject-interview",
                type: "rejectionNode",
                position: { x: 1050, y: 500 },
                data: { label: "Rejected — Interview", description: "Not a fit based on interview performance", sendFeedback: true },
              },
            ],
            edges: [
              { id: "e-start-resume", source: "start-1", target: "resume-1", type: "smoothstep", animated: true },
              { id: "e-resume-pass", source: "resume-1", target: "assessment-1", type: "smoothstep", label: "Score ≥ 70", animated: true },
              { id: "e-resume-fail", source: "resume-1", target: "reject-resume", type: "smoothstep", label: "Score < 70", style: { stroke: "#ef4444" } },
              { id: "e-assess-pass", source: "assessment-1", target: "ai-interview-1", type: "smoothstep", label: "Pass", animated: true },
              { id: "e-assess-fail", source: "assessment-1", target: "reject-assessment", type: "smoothstep", label: "Fail", style: { stroke: "#ef4444" } },
              { id: "e-ai-pass", source: "ai-interview-1", target: "f2f-1", type: "smoothstep", label: "Advance", animated: true },
              { id: "e-ai-fail", source: "ai-interview-1", target: "reject-interview", type: "smoothstep", label: "No advance", style: { stroke: "#ef4444" } },
              { id: "e-f2f-pass", source: "f2f-1", target: "review-1", type: "smoothstep", label: "Positive", animated: true },
              { id: "e-f2f-fail", source: "f2f-1", target: "reject-interview", type: "smoothstep", label: "No hire", style: { stroke: "#ef4444" } },
              { id: "e-review-offer", source: "review-1", target: "offer-1", type: "smoothstep", label: "Approved", animated: true },
              { id: "e-review-reject", source: "review-1", target: "reject-interview", type: "smoothstep", label: "Declined", style: { stroke: "#ef4444" } },
            ],
          },

          // ---- Backend Engineer ----
          {
            jobTitle: "Backend Engineer — Platform",
            name: "Backend Engineer Pipeline",
            description: "Technical-heavy pipeline with coding assessment, system design AI interview, and team interview.",
            nodes: [
              {
                id: "start-1",
                type: "startNode",
                position: { x: 0, y: 300 },
                data: { label: "Applications Open", description: "Candidates apply" },
              },
              {
                id: "resume-1",
                type: "resumeScreenNode",
                position: { x: 300, y: 300 },
                data: {
                  label: "Resume Screening",
                  description: "AI screens for backend experience",
                  passThreshold: 65,
                  criteria: ["Node.js/Python 3+ years", "PostgreSQL", "API design", "Cloud experience"],
                  estimatedPassRate: 45,
                },
              },
              {
                id: "assessment-1",
                type: "assessmentNode",
                position: { x: 600, y: 200 },
                data: {
                  label: "Backend Coding Challenge",
                  description: "API design and database query challenge",
                  assessmentType: "CODING",
                  duration: 120,
                  passingScore: 60,
                  skills: ["Node.js", "SQL", "API Design"],
                },
              },
              {
                id: "ai-interview-1",
                type: "aiInterviewNode",
                position: { x: 900, y: 200 },
                data: {
                  label: "AI System Design Interview",
                  description: "AI-led system design and architecture discussion",
                  interviewType: "TECHNICAL",
                  duration: 35,
                  maxQuestions: 10,
                  focusAreas: ["System design", "Database modeling", "Scalability", "API patterns"],
                },
              },
              {
                id: "f2f-1",
                type: "interviewNode",
                position: { x: 1200, y: 200 },
                data: {
                  label: "Team Interview",
                  description: "Live coding + architecture discussion with platform team",
                  interviewType: "technical",
                  duration: 75,
                  interviewers: ["Platform Lead", "Staff Engineer"],
                },
              },
              {
                id: "review-1",
                type: "reviewNode",
                position: { x: 1500, y: 300 },
                data: { label: "Final Review", description: "Team debrief and decision" },
              },
              {
                id: "offer-1",
                type: "offerNode",
                position: { x: 1800, y: 300 },
                data: { label: "Offer", description: "Extend offer" },
              },
              {
                id: "reject-1",
                type: "rejectionNode",
                position: { x: 600, y: 500 },
                data: { label: "Rejected", description: "Not moving forward", sendFeedback: true },
              },
            ],
            edges: [
              { id: "e-start-resume", source: "start-1", target: "resume-1", type: "smoothstep", animated: true },
              { id: "e-resume-pass", source: "resume-1", target: "assessment-1", type: "smoothstep", label: "Score ≥ 65", animated: true },
              { id: "e-resume-fail", source: "resume-1", target: "reject-1", type: "smoothstep", label: "Below threshold", style: { stroke: "#ef4444" } },
              { id: "e-assess-pass", source: "assessment-1", target: "ai-interview-1", type: "smoothstep", label: "Pass", animated: true },
              { id: "e-assess-fail", source: "assessment-1", target: "reject-1", type: "smoothstep", label: "Fail", style: { stroke: "#ef4444" } },
              { id: "e-ai-pass", source: "ai-interview-1", target: "f2f-1", type: "smoothstep", label: "Advance", animated: true },
              { id: "e-ai-fail", source: "ai-interview-1", target: "reject-1", type: "smoothstep", label: "No advance", style: { stroke: "#ef4444" } },
              { id: "e-f2f-pass", source: "f2f-1", target: "review-1", type: "smoothstep", label: "Positive", animated: true },
              { id: "e-f2f-fail", source: "f2f-1", target: "reject-1", type: "smoothstep", label: "No hire", style: { stroke: "#ef4444" } },
              { id: "e-review-offer", source: "review-1", target: "offer-1", type: "smoothstep", animated: true },
            ],
          },

          // ---- Product Designer ----
          {
            jobTitle: "Product Designer",
            name: "Product Designer Pipeline",
            description: "Design-focused pipeline with portfolio review, design challenge, and culture fit.",
            nodes: [
              {
                id: "start-1",
                type: "startNode",
                position: { x: 0, y: 300 },
                data: { label: "Applications Open", description: "Candidates apply with portfolio" },
              },
              {
                id: "resume-1",
                type: "resumeScreenNode",
                position: { x: 300, y: 300 },
                data: {
                  label: "Resume + Portfolio Screen",
                  description: "AI reviews resume and portfolio link",
                  passThreshold: 70,
                  criteria: ["3+ years product design", "Figma proficiency", "B2B SaaS experience", "Portfolio quality"],
                  estimatedPassRate: 35,
                },
              },
              {
                id: "assessment-1",
                type: "assessmentNode",
                position: { x: 600, y: 200 },
                data: {
                  label: "Design Challenge",
                  description: "Take-home design exercise — redesign a hiring workflow",
                  assessmentType: "SUBJECTIVE",
                  duration: 180,
                  passingScore: 70,
                  skills: ["UI Design", "UX Thinking", "Design Systems"],
                },
              },
              {
                id: "ai-interview-1",
                type: "aiInterviewNode",
                position: { x: 900, y: 200 },
                data: {
                  label: "AI Design Thinking Interview",
                  description: "AI-led interview on design process and decision making",
                  interviewType: "BEHAVIORAL",
                  duration: 25,
                  maxQuestions: 8,
                  focusAreas: ["Design process", "User empathy", "Collaboration", "Design critique"],
                },
              },
              {
                id: "f2f-1",
                type: "interviewNode",
                position: { x: 1200, y: 200 },
                data: {
                  label: "Design Presentation + Culture Fit",
                  description: "Present design challenge solution + team culture chat",
                  interviewType: "culture",
                  duration: 60,
                  interviewers: ["Design Lead", "Product Manager", "Engineer"],
                },
              },
              {
                id: "offer-1",
                type: "offerNode",
                position: { x: 1500, y: 300 },
                data: { label: "Offer", description: "Extend offer" },
              },
              {
                id: "reject-1",
                type: "rejectionNode",
                position: { x: 600, y: 500 },
                data: { label: "Rejected", description: "Not moving forward", sendFeedback: true },
              },
            ],
            edges: [
              { id: "e-start-resume", source: "start-1", target: "resume-1", type: "smoothstep", animated: true },
              { id: "e-resume-pass", source: "resume-1", target: "assessment-1", type: "smoothstep", label: "Pass", animated: true },
              { id: "e-resume-fail", source: "resume-1", target: "reject-1", type: "smoothstep", label: "Fail", style: { stroke: "#ef4444" } },
              { id: "e-assess-pass", source: "assessment-1", target: "ai-interview-1", type: "smoothstep", label: "Pass", animated: true },
              { id: "e-assess-fail", source: "assessment-1", target: "reject-1", type: "smoothstep", label: "Fail", style: { stroke: "#ef4444" } },
              { id: "e-ai-pass", source: "ai-interview-1", target: "f2f-1", type: "smoothstep", label: "Advance", animated: true },
              { id: "e-ai-fail", source: "ai-interview-1", target: "reject-1", type: "smoothstep", label: "No advance", style: { stroke: "#ef4444" } },
              { id: "e-f2f-pass", source: "f2f-1", target: "offer-1", type: "smoothstep", label: "Hire", animated: true },
              { id: "e-f2f-fail", source: "f2f-1", target: "reject-1", type: "smoothstep", label: "No hire", style: { stroke: "#ef4444" } },
            ],
          },

          // ---- DevOps ----
          {
            jobTitle: "DevOps / Infrastructure Engineer",
            name: "DevOps Engineer Pipeline",
            description: "Infrastructure-focused pipeline with hands-on assessment and incident response scenario.",
            nodes: [
              {
                id: "start-1",
                type: "startNode",
                position: { x: 0, y: 300 },
                data: { label: "Applications Open", description: "Candidates apply" },
              },
              {
                id: "resume-1",
                type: "resumeScreenNode",
                position: { x: 300, y: 300 },
                data: {
                  label: "Resume Screening",
                  passThreshold: 65,
                  criteria: ["AWS experience", "Terraform/IaC", "Docker", "CI/CD", "On-call experience"],
                },
              },
              {
                id: "assessment-1",
                type: "assessmentNode",
                position: { x: 600, y: 200 },
                data: {
                  label: "Infrastructure Challenge",
                  description: "Terraform + Docker hands-on task",
                  assessmentType: "CODING",
                  duration: 90,
                  passingScore: 60,
                  skills: ["Terraform", "Docker", "AWS", "Bash"],
                },
              },
              {
                id: "ai-interview-1",
                type: "aiInterviewNode",
                position: { x: 900, y: 200 },
                data: {
                  label: "AI Incident Response Interview",
                  description: "Scenario-based interview on debugging and incident handling",
                  interviewType: "TECHNICAL",
                  duration: 30,
                  maxQuestions: 8,
                },
              },
              {
                id: "f2f-1",
                type: "interviewNode",
                position: { x: 1200, y: 200 },
                data: {
                  label: "Team Interview",
                  interviewType: "technical",
                  duration: 60,
                  interviewers: ["Platform Lead", "SRE Lead"],
                },
              },
              {
                id: "offer-1",
                type: "offerNode",
                position: { x: 1500, y: 300 },
                data: { label: "Offer" },
              },
              {
                id: "reject-1",
                type: "rejectionNode",
                position: { x: 600, y: 500 },
                data: { label: "Rejected", sendFeedback: true },
              },
            ],
            edges: [
              { id: "e-start-resume", source: "start-1", target: "resume-1", type: "smoothstep", animated: true },
              { id: "e-resume-pass", source: "resume-1", target: "assessment-1", type: "smoothstep", label: "Pass", animated: true },
              { id: "e-resume-fail", source: "resume-1", target: "reject-1", type: "smoothstep", style: { stroke: "#ef4444" } },
              { id: "e-assess-pass", source: "assessment-1", target: "ai-interview-1", type: "smoothstep", label: "Pass", animated: true },
              { id: "e-assess-fail", source: "assessment-1", target: "reject-1", type: "smoothstep", style: { stroke: "#ef4444" } },
              { id: "e-ai-pass", source: "ai-interview-1", target: "f2f-1", type: "smoothstep", label: "Advance", animated: true },
              { id: "e-ai-fail", source: "ai-interview-1", target: "reject-1", type: "smoothstep", style: { stroke: "#ef4444" } },
              { id: "e-f2f-pass", source: "f2f-1", target: "offer-1", type: "smoothstep", animated: true },
              { id: "e-f2f-fail", source: "f2f-1", target: "reject-1", type: "smoothstep", style: { stroke: "#ef4444" } },
            ],
          },

          // ---- Growth Marketing Manager ----
          {
            jobTitle: "Growth Marketing Manager",
            name: "Marketing Hire Pipeline",
            description: "Marketing pipeline — resume screen, case study presentation, culture fit.",
            nodes: [
              {
                id: "start-1",
                type: "startNode",
                position: { x: 0, y: 300 },
                data: { label: "Applications Open" },
              },
              {
                id: "resume-1",
                type: "resumeScreenNode",
                position: { x: 300, y: 300 },
                data: {
                  label: "Resume Screening",
                  passThreshold: 70,
                  criteria: ["B2B SaaS marketing", "SEO experience", "Paid acquisition", "Analytics"],
                },
              },
              {
                id: "ai-interview-1",
                type: "aiInterviewNode",
                position: { x: 600, y: 200 },
                data: {
                  label: "AI Marketing Interview",
                  description: "AI-led interview on growth strategy and marketing fundamentals",
                  interviewType: "BEHAVIORAL",
                  duration: 25,
                  maxQuestions: 8,
                },
              },
              {
                id: "f2f-1",
                type: "interviewNode",
                position: { x: 900, y: 200 },
                data: {
                  label: "Case Study Presentation",
                  description: "Present a GTM strategy for Nexlayer",
                  interviewType: "presentation",
                  duration: 45,
                  interviewers: ["Head of Marketing", "CEO"],
                },
              },
              {
                id: "f2f-2",
                type: "interviewNode",
                position: { x: 1200, y: 200 },
                data: {
                  label: "Culture Fit Chat",
                  interviewType: "culture",
                  duration: 30,
                  interviewers: ["Team Lead", "HR"],
                },
              },
              {
                id: "offer-1",
                type: "offerNode",
                position: { x: 1500, y: 300 },
                data: { label: "Offer" },
              },
              {
                id: "reject-1",
                type: "rejectionNode",
                position: { x: 500, y: 500 },
                data: { label: "Rejected", sendFeedback: true },
              },
            ],
            edges: [
              { id: "e-start-resume", source: "start-1", target: "resume-1", type: "smoothstep", animated: true },
              { id: "e-resume-pass", source: "resume-1", target: "ai-interview-1", type: "smoothstep", label: "Pass", animated: true },
              { id: "e-resume-fail", source: "resume-1", target: "reject-1", type: "smoothstep", style: { stroke: "#ef4444" } },
              { id: "e-ai-pass", source: "ai-interview-1", target: "f2f-1", type: "smoothstep", label: "Advance", animated: true },
              { id: "e-ai-fail", source: "ai-interview-1", target: "reject-1", type: "smoothstep", style: { stroke: "#ef4444" } },
              { id: "e-f2f1-pass", source: "f2f-1", target: "f2f-2", type: "smoothstep", label: "Advance", animated: true },
              { id: "e-f2f1-fail", source: "f2f-1", target: "reject-1", type: "smoothstep", style: { stroke: "#ef4444" } },
              { id: "e-f2f2-pass", source: "f2f-2", target: "offer-1", type: "smoothstep", animated: true },
              { id: "e-f2f2-fail", source: "f2f-2", target: "reject-1", type: "smoothstep", style: { stroke: "#ef4444" } },
            ],
          },

          // ---- Full Stack Engineering Intern ----
          {
            jobTitle: "Full Stack Engineering Intern",
            name: "Intern Hiring Pipeline",
            description: "Lightweight pipeline for interns — resume screen, short assessment, AI interview.",
            nodes: [
              {
                id: "start-1",
                type: "startNode",
                position: { x: 0, y: 300 },
                data: { label: "Applications Open" },
              },
              {
                id: "resume-1",
                type: "resumeScreenNode",
                position: { x: 300, y: 300 },
                data: {
                  label: "Resume Screening",
                  passThreshold: 55,
                  criteria: ["CS student", "JavaScript basics", "At least one project", "Enthusiasm"],
                  estimatedPassRate: 50,
                },
              },
              {
                id: "assessment-1",
                type: "assessmentNode",
                position: { x: 600, y: 200 },
                data: {
                  label: "Quick Coding Test",
                  description: "45-min JavaScript fundamentals test",
                  assessmentType: "CODING",
                  duration: 45,
                  passingScore: 50,
                  skills: ["JavaScript", "Problem Solving", "Basic React"],
                },
              },
              {
                id: "ai-interview-1",
                type: "aiInterviewNode",
                position: { x: 900, y: 200 },
                data: {
                  label: "AI Conversational Interview",
                  description: "Friendly AI interview focused on motivation and learning ability",
                  interviewType: "BEHAVIORAL",
                  duration: 20,
                  maxQuestions: 6,
                },
              },
              {
                id: "review-1",
                type: "reviewNode",
                position: { x: 1200, y: 300 },
                data: { label: "Team Review", description: "Engineering team picks top candidates" },
              },
              {
                id: "offer-1",
                type: "offerNode",
                position: { x: 1500, y: 300 },
                data: { label: "Internship Offer" },
              },
              {
                id: "reject-1",
                type: "rejectionNode",
                position: { x: 500, y: 500 },
                data: { label: "Rejected", sendFeedback: true },
              },
            ],
            edges: [
              { id: "e-start-resume", source: "start-1", target: "resume-1", type: "smoothstep", animated: true },
              { id: "e-resume-pass", source: "resume-1", target: "assessment-1", type: "smoothstep", label: "Pass", animated: true },
              { id: "e-resume-fail", source: "resume-1", target: "reject-1", type: "smoothstep", style: { stroke: "#ef4444" } },
              { id: "e-assess-pass", source: "assessment-1", target: "ai-interview-1", type: "smoothstep", label: "Pass", animated: true },
              { id: "e-assess-fail", source: "assessment-1", target: "reject-1", type: "smoothstep", style: { stroke: "#ef4444" } },
              { id: "e-ai-pass", source: "ai-interview-1", target: "review-1", type: "smoothstep", label: "Advance", animated: true },
              { id: "e-ai-fail", source: "ai-interview-1", target: "reject-1", type: "smoothstep", style: { stroke: "#ef4444" } },
              { id: "e-review-offer", source: "review-1", target: "offer-1", type: "smoothstep", animated: true },
              { id: "e-review-reject", source: "review-1", target: "reject-1", type: "smoothstep", style: { stroke: "#ef4444" } },
            ],
          },

          // ---- Technical Content Writer ----
          {
            jobTitle: "Technical Content Writer",
            name: "Content Writer Pipeline",
            description: "Writing-focused pipeline — resume screen, writing sample, AI interview.",
            nodes: [
              {
                id: "start-1",
                type: "startNode",
                position: { x: 0, y: 300 },
                data: { label: "Applications Open" },
              },
              {
                id: "resume-1",
                type: "resumeScreenNode",
                position: { x: 300, y: 300 },
                data: {
                  label: "Resume + Portfolio Screen",
                  passThreshold: 65,
                  criteria: ["Technical writing experience", "Published portfolio", "SEO knowledge"],
                },
              },
              {
                id: "assessment-1",
                type: "assessmentNode",
                position: { x: 600, y: 200 },
                data: {
                  label: "Writing Sample",
                  description: "Write a 500-word technical blog post on a given topic",
                  assessmentType: "SUBJECTIVE",
                  duration: 120,
                  passingScore: 70,
                  skills: ["Technical Writing", "Clarity", "SEO"],
                },
              },
              {
                id: "ai-interview-1",
                type: "aiInterviewNode",
                position: { x: 900, y: 200 },
                data: {
                  label: "AI Editorial Interview",
                  interviewType: "BEHAVIORAL",
                  duration: 20,
                  maxQuestions: 6,
                },
              },
              {
                id: "f2f-1",
                type: "interviewNode",
                position: { x: 1200, y: 200 },
                data: {
                  label: "Chat with Marketing Lead",
                  interviewType: "culture",
                  duration: 30,
                  interviewers: ["Head of Marketing"],
                },
              },
              {
                id: "offer-1",
                type: "offerNode",
                position: { x: 1500, y: 300 },
                data: { label: "Offer" },
              },
              {
                id: "reject-1",
                type: "rejectionNode",
                position: { x: 500, y: 500 },
                data: { label: "Rejected", sendFeedback: true },
              },
            ],
            edges: [
              { id: "e-start-resume", source: "start-1", target: "resume-1", type: "smoothstep", animated: true },
              { id: "e-resume-pass", source: "resume-1", target: "assessment-1", type: "smoothstep", label: "Pass", animated: true },
              { id: "e-resume-fail", source: "resume-1", target: "reject-1", type: "smoothstep", style: { stroke: "#ef4444" } },
              { id: "e-assess-pass", source: "assessment-1", target: "ai-interview-1", type: "smoothstep", label: "Pass", animated: true },
              { id: "e-assess-fail", source: "assessment-1", target: "reject-1", type: "smoothstep", style: { stroke: "#ef4444" } },
              { id: "e-ai-pass", source: "ai-interview-1", target: "f2f-1", type: "smoothstep", animated: true },
              { id: "e-ai-fail", source: "ai-interview-1", target: "reject-1", type: "smoothstep", style: { stroke: "#ef4444" } },
              { id: "e-f2f-pass", source: "f2f-1", target: "offer-1", type: "smoothstep", animated: true },
              { id: "e-f2f-fail", source: "f2f-1", target: "reject-1", type: "smoothstep", style: { stroke: "#ef4444" } },
            ],
          },

          // ---- Senior Data Engineer ----
          {
            jobTitle: "Senior Data Engineer",
            name: "Data Engineer Pipeline",
            description: "Data-heavy pipeline with SQL challenge, pipeline design interview, and team fit.",
            nodes: [
              {
                id: "start-1",
                type: "startNode",
                position: { x: 0, y: 300 },
                data: { label: "Applications Open" },
              },
              {
                id: "resume-1",
                type: "resumeScreenNode",
                position: { x: 300, y: 300 },
                data: {
                  label: "Resume Screening",
                  passThreshold: 70,
                  criteria: ["4+ years data engineering", "SQL mastery", "Python", "Cloud DW experience"],
                },
              },
              {
                id: "assessment-1",
                type: "assessmentNode",
                position: { x: 600, y: 200 },
                data: {
                  label: "SQL + Python Challenge",
                  description: "Complex queries, data transformation, and pipeline design",
                  assessmentType: "CODING",
                  duration: 90,
                  passingScore: 65,
                  skills: ["SQL", "Python", "Data Modeling"],
                },
              },
              {
                id: "ai-interview-1",
                type: "aiInterviewNode",
                position: { x: 900, y: 200 },
                data: {
                  label: "AI Data Architecture Interview",
                  description: "Discussion on data pipeline design and warehouse architecture",
                  interviewType: "TECHNICAL",
                  duration: 30,
                  maxQuestions: 10,
                },
              },
              {
                id: "f2f-1",
                type: "interviewNode",
                position: { x: 1200, y: 200 },
                data: {
                  label: "Team Interview",
                  interviewType: "technical",
                  duration: 60,
                  interviewers: ["Data Lead", "ML Engineer", "Backend Lead"],
                },
              },
              {
                id: "review-1",
                type: "reviewNode",
                position: { x: 1500, y: 300 },
                data: { label: "Hiring Committee Review" },
              },
              {
                id: "offer-1",
                type: "offerNode",
                position: { x: 1800, y: 300 },
                data: { label: "Offer" },
              },
              {
                id: "reject-1",
                type: "rejectionNode",
                position: { x: 600, y: 500 },
                data: { label: "Rejected", sendFeedback: true },
              },
            ],
            edges: [
              { id: "e-start-resume", source: "start-1", target: "resume-1", type: "smoothstep", animated: true },
              { id: "e-resume-pass", source: "resume-1", target: "assessment-1", type: "smoothstep", label: "Pass", animated: true },
              { id: "e-resume-fail", source: "resume-1", target: "reject-1", type: "smoothstep", style: { stroke: "#ef4444" } },
              { id: "e-assess-pass", source: "assessment-1", target: "ai-interview-1", type: "smoothstep", label: "Pass", animated: true },
              { id: "e-assess-fail", source: "assessment-1", target: "reject-1", type: "smoothstep", style: { stroke: "#ef4444" } },
              { id: "e-ai-pass", source: "ai-interview-1", target: "f2f-1", type: "smoothstep", label: "Advance", animated: true },
              { id: "e-ai-fail", source: "ai-interview-1", target: "reject-1", type: "smoothstep", style: { stroke: "#ef4444" } },
              { id: "e-f2f-pass", source: "f2f-1", target: "review-1", type: "smoothstep", animated: true },
              { id: "e-f2f-fail", source: "f2f-1", target: "reject-1", type: "smoothstep", style: { stroke: "#ef4444" } },
              { id: "e-review-offer", source: "review-1", target: "offer-1", type: "smoothstep", animated: true },
              { id: "e-review-reject", source: "review-1", target: "reject-1", type: "smoothstep", style: { stroke: "#ef4444" } },
            ],
          },
        ];

        const pipelineIds: Record<string, string> = {};

        for (const config of pipelineConfigs) {
          const jobId = jobIds[config.jobTitle];
          if (!jobId) continue;

          // Check if pipeline already exists for this job
          const existing = await queryOne(
            "SELECT id FROM pipelines WHERE linked_job_id = $1",
            [jobId]
          );

          if (existing) {
            pipelineIds[config.jobTitle] = existing.id;
            continue;
          }

          const viewport = { x: 50, y: 50, zoom: 0.75 };

          const pipeline = await queryOne(
            `INSERT INTO pipelines (name, description, status, nodes, edges, viewport, estimated_applicants, is_template, created_by, linked_job_id)
             VALUES ($1, $2, 'ACTIVE', $3, $4, $5, $6, false, $7, $8)
             RETURNING id`,
            [
              config.name,
              config.description,
              JSON.stringify(config.nodes),
              JSON.stringify(config.edges),
              JSON.stringify(viewport),
              config.nodes.length * 15,
              recruiter?.id || admin?.id,
              jobId,
            ]
          );

          if (pipeline) {
            pipelineIds[config.jobTitle] = pipeline.id;

            // Link pipeline back to job
            await query(
              "UPDATE jobs SET pipeline_id = $1 WHERE id = $2",
              [pipeline.id, jobId]
            );
          }
        }

        console.log(`Created ${Object.keys(pipelineIds).length} pipelines`);
        // ==========================================
        // STEP 7: APPLICATIONS
        // ==========================================
        progress(7, TOTAL_STEPS, "Creating 82 applications across all jobs...");

        async function getUserId(email: string): Promise<string | null> {
          const user = await queryOne("SELECT id FROM users WHERE email = $1", [email]);
          return user?.id || null;
        }

                const applications = [
          // Senior Frontend Engineer — 15
          { candidateEmail: "ananya.r@gmail.com", jobTitle: "Senior Frontend Engineer", status: "UNDER_REVIEW", score: 94, appliedDaysAgo: 12 },
          { candidateEmail: "sarah.chen@proton.me", jobTitle: "Senior Frontend Engineer", status: "UNDER_REVIEW", score: 91, appliedDaysAgo: 11 },
          { candidateEmail: "vikram.joshi@yahoo.com", jobTitle: "Senior Frontend Engineer", status: "F2F_INTERVIEW", score: 87, appliedDaysAgo: 10 },
          { candidateEmail: "emily.zhang@gmail.com", jobTitle: "Senior Frontend Engineer", status: "AI_INTERVIEW", score: 85, appliedDaysAgo: 10 },
          { candidateEmail: "carlos.rivera@hotmail.com", jobTitle: "Senior Frontend Engineer", status: "ASSESSMENT", score: 82, appliedDaysAgo: 8 },
          { candidateEmail: "daniel.moretti@outlook.com", jobTitle: "Senior Frontend Engineer", status: "SCREENING", score: 78, appliedDaysAgo: 7 },
          { candidateEmail: "kevin.wu@gmail.com", jobTitle: "Senior Frontend Engineer", status: "SCREENING", score: 75, appliedDaysAgo: 6 },
          { candidateEmail: "tom.anderson@yahoo.com", jobTitle: "Senior Frontend Engineer", status: "APPLIED", score: 72, appliedDaysAgo: 5 },
          { candidateEmail: "ben.taylor@gmail.com", jobTitle: "Senior Frontend Engineer", status: "APPLIED", score: 68, appliedDaysAgo: 4 },
          { candidateEmail: "lucas.park@gmail.com", jobTitle: "Senior Frontend Engineer", status: "APPLIED", score: 65, appliedDaysAgo: 3 },
          { candidateEmail: "ethan.cole@gmail.com", jobTitle: "Senior Frontend Engineer", status: "APPLIED", score: 61, appliedDaysAgo: 3 },
          { candidateEmail: "nikhil.verma@pm.me", jobTitle: "Senior Frontend Engineer", status: "REJECTED", score: 42, appliedDaysAgo: 11 },
          { candidateEmail: "rohan.gupta@gmail.com", jobTitle: "Senior Frontend Engineer", status: "REJECTED", score: 35, appliedDaysAgo: 10 },
          { candidateEmail: "sophie.miller@yahoo.com", jobTitle: "Senior Frontend Engineer", status: "REJECTED", score: 28, appliedDaysAgo: 9 },
          { candidateEmail: "chloe.bennett@outlook.com", jobTitle: "Senior Frontend Engineer", status: "REJECTED", score: 22, appliedDaysAgo: 8 },

          // Backend Engineer — 12
          { candidateEmail: "omar.faisal@outlook.com", jobTitle: "Backend Engineer — Platform", status: "OFFERED", score: 92, appliedDaysAgo: 14 },
          { candidateEmail: "james.okonkwo@pm.me", jobTitle: "Backend Engineer — Platform", status: "F2F_INTERVIEW", score: 88, appliedDaysAgo: 13 },
          { candidateEmail: "deepak.sharma@gmail.com", jobTitle: "Backend Engineer — Platform", status: "AI_INTERVIEW", score: 86, appliedDaysAgo: 11 },
          { candidateEmail: "sneha.patel@gmail.com", jobTitle: "Backend Engineer — Platform", status: "ASSESSMENT", score: 79, appliedDaysAgo: 9 },
          { candidateEmail: "samuel.osei@outlook.com", jobTitle: "Backend Engineer — Platform", status: "SCREENING", score: 76, appliedDaysAgo: 8 },
          { candidateEmail: "noah.klein@proton.me", jobTitle: "Backend Engineer — Platform", status: "APPLIED", score: 73, appliedDaysAgo: 6 },
          { candidateEmail: "grace.liu@gmail.com", jobTitle: "Backend Engineer — Platform", status: "APPLIED", score: 70, appliedDaysAgo: 5 },
          { candidateEmail: "ritika.menon@gmail.com", jobTitle: "Backend Engineer — Platform", status: "APPLIED", score: 64, appliedDaysAgo: 4 },
          { candidateEmail: "alex.dubois@proton.me", jobTitle: "Backend Engineer — Platform", status: "REJECTED", score: 38, appliedDaysAgo: 12 },
          { candidateEmail: "karthik.iyer@hotmail.com", jobTitle: "Backend Engineer — Platform", status: "REJECTED", score: 31, appliedDaysAgo: 11 },
          { candidateEmail: "maria.santos@outlook.com", jobTitle: "Backend Engineer — Platform", status: "REJECTED", score: 25, appliedDaysAgo: 10 },
          { candidateEmail: "arjun.nair@gmail.com", jobTitle: "Backend Engineer — Platform", status: "REJECTED", score: 19, appliedDaysAgo: 9 },

          // Product Designer — 8
          { candidateEmail: "isha.singh@pm.me", jobTitle: "Product Designer", status: "UNDER_REVIEW", score: 93, appliedDaysAgo: 9 },
          { candidateEmail: "maya.johnson@gmail.com", jobTitle: "Product Designer", status: "F2F_INTERVIEW", score: 89, appliedDaysAgo: 8 },
          { candidateEmail: "derek.chang@outlook.com", jobTitle: "Product Designer", status: "ASSESSMENT", score: 81, appliedDaysAgo: 7 },
          { candidateEmail: "tanya.wilson@proton.me", jobTitle: "Product Designer", status: "SCREENING", score: 77, appliedDaysAgo: 6 },
          { candidateEmail: "ryan.brooks@gmail.com", jobTitle: "Product Designer", status: "APPLIED", score: 69, appliedDaysAgo: 5 },
          { candidateEmail: "fatima.zahra@outlook.com", jobTitle: "Product Designer", status: "APPLIED", score: 63, appliedDaysAgo: 4 },
          { candidateEmail: "nisha.reddy@hotmail.com", jobTitle: "Product Designer", status: "REJECTED", score: 41, appliedDaysAgo: 8 },
          { candidateEmail: "prachi.deshmukh@pm.me", jobTitle: "Product Designer", status: "REJECTED", score: 33, appliedDaysAgo: 7 },

          // DevOps — 7
          { candidateEmail: "james.okonkwo@pm.me", jobTitle: "DevOps / Infrastructure Engineer", status: "UNDER_REVIEW", score: 90, appliedDaysAgo: 7 },
          { candidateEmail: "deepak.sharma@gmail.com", jobTitle: "DevOps / Infrastructure Engineer", status: "AI_INTERVIEW", score: 84, appliedDaysAgo: 6 },
          { candidateEmail: "noah.klein@proton.me", jobTitle: "DevOps / Infrastructure Engineer", status: "SCREENING", score: 78, appliedDaysAgo: 5 },
          { candidateEmail: "samuel.osei@outlook.com", jobTitle: "DevOps / Infrastructure Engineer", status: "APPLIED", score: 71, appliedDaysAgo: 4 },
          { candidateEmail: "ethan.cole@gmail.com", jobTitle: "DevOps / Infrastructure Engineer", status: "APPLIED", score: 66, appliedDaysAgo: 3 },
          { candidateEmail: "daniel.moretti@outlook.com", jobTitle: "DevOps / Infrastructure Engineer", status: "REJECTED", score: 39, appliedDaysAgo: 6 },
          { candidateEmail: "ben.taylor@gmail.com", jobTitle: "DevOps / Infrastructure Engineer", status: "REJECTED", score: 27, appliedDaysAgo: 5 },

          // Growth Marketing — 6
          { candidateEmail: "aisha.khan@gmail.com", jobTitle: "Growth Marketing Manager", status: "OFFERED", score: 91, appliedDaysAgo: 8 },
          { candidateEmail: "tanya.wilson@proton.me", jobTitle: "Growth Marketing Manager", status: "F2F_INTERVIEW", score: 83, appliedDaysAgo: 7 },
          { candidateEmail: "zara.ahmed@outlook.com", jobTitle: "Growth Marketing Manager", status: "SCREENING", score: 76, appliedDaysAgo: 5 },
          { candidateEmail: "pooja.bhatt@gmail.com", jobTitle: "Growth Marketing Manager", status: "APPLIED", score: 68, appliedDaysAgo: 4 },
          { candidateEmail: "lisa.nakamura@yahoo.com", jobTitle: "Growth Marketing Manager", status: "APPLIED", score: 62, appliedDaysAgo: 3 },
          { candidateEmail: "meghna.rao@hotmail.com", jobTitle: "Growth Marketing Manager", status: "REJECTED", score: 36, appliedDaysAgo: 7 },

          // Intern — 10
          { candidateEmail: "rohan.gupta@gmail.com", jobTitle: "Full Stack Engineering Intern", status: "UNDER_REVIEW", score: 88, appliedDaysAgo: 6 },
          { candidateEmail: "sophie.miller@yahoo.com", jobTitle: "Full Stack Engineering Intern", status: "AI_INTERVIEW", score: 82, appliedDaysAgo: 5 },
          { candidateEmail: "arjun.nair@gmail.com", jobTitle: "Full Stack Engineering Intern", status: "ASSESSMENT", score: 79, appliedDaysAgo: 5 },
          { candidateEmail: "chloe.bennett@outlook.com", jobTitle: "Full Stack Engineering Intern", status: "SCREENING", score: 74, appliedDaysAgo: 4 },
          { candidateEmail: "karthik.iyer@hotmail.com", jobTitle: "Full Stack Engineering Intern", status: "SCREENING", score: 71, appliedDaysAgo: 4 },
          { candidateEmail: "grace.liu@gmail.com", jobTitle: "Full Stack Engineering Intern", status: "APPLIED", score: 67, appliedDaysAgo: 3 },
          { candidateEmail: "nikhil.verma@pm.me", jobTitle: "Full Stack Engineering Intern", status: "APPLIED", score: 63, appliedDaysAgo: 2 },
          { candidateEmail: "meghna.rao@hotmail.com", jobTitle: "Full Stack Engineering Intern", status: "APPLIED", score: 58, appliedDaysAgo: 2 },
          { candidateEmail: "tom.anderson@yahoo.com", jobTitle: "Full Stack Engineering Intern", status: "REJECTED", score: 34, appliedDaysAgo: 5 },
          { candidateEmail: "maria.santos@outlook.com", jobTitle: "Full Stack Engineering Intern", status: "REJECTED", score: 21, appliedDaysAgo: 4 },

          // Content Writer — 5
          { candidateEmail: "fatima.zahra@outlook.com", jobTitle: "Technical Content Writer", status: "UNDER_REVIEW", score: 90, appliedDaysAgo: 5 },
          { candidateEmail: "ritika.menon@gmail.com", jobTitle: "Technical Content Writer", status: "SCREENING", score: 80, appliedDaysAgo: 4 },
          { candidateEmail: "alex.dubois@proton.me", jobTitle: "Technical Content Writer", status: "APPLIED", score: 72, appliedDaysAgo: 3 },
          { candidateEmail: "prachi.deshmukh@pm.me", jobTitle: "Technical Content Writer", status: "APPLIED", score: 65, appliedDaysAgo: 2 },
          { candidateEmail: "kevin.wu@gmail.com", jobTitle: "Technical Content Writer", status: "REJECTED", score: 30, appliedDaysAgo: 4 },

          // Data Engineer — 9
          { candidateEmail: "sarah.chen@proton.me", jobTitle: "Senior Data Engineer", status: "OFFERED", score: 95, appliedDaysAgo: 10 },
          { candidateEmail: "omar.faisal@outlook.com", jobTitle: "Senior Data Engineer", status: "F2F_INTERVIEW", score: 89, appliedDaysAgo: 9 },
          { candidateEmail: "pooja.bhatt@gmail.com", jobTitle: "Senior Data Engineer", status: "AI_INTERVIEW", score: 85, appliedDaysAgo: 8 },
          { candidateEmail: "lisa.nakamura@yahoo.com", jobTitle: "Senior Data Engineer", status: "ASSESSMENT", score: 79, appliedDaysAgo: 7 },
          { candidateEmail: "carlos.rivera@hotmail.com", jobTitle: "Senior Data Engineer", status: "SCREENING", score: 74, appliedDaysAgo: 6 },
          { candidateEmail: "ananya.r@gmail.com", jobTitle: "Senior Data Engineer", status: "APPLIED", score: 70, appliedDaysAgo: 5 },
          { candidateEmail: "sneha.patel@gmail.com", jobTitle: "Senior Data Engineer", status: "APPLIED", score: 66, appliedDaysAgo: 4 },
          { candidateEmail: "lucas.park@gmail.com", jobTitle: "Senior Data Engineer", status: "REJECTED", score: 37, appliedDaysAgo: 9 },
          { candidateEmail: "nisha.reddy@hotmail.com", jobTitle: "Senior Data Engineer", status: "REJECTED", score: 24, appliedDaysAgo: 8 },
        ];

        let appCount = 0;
        for (let i = 0; i < applications.length; i++) {
          const app = applications[i];
          const candidateId = await getUserId(app.candidateEmail);
          const jobId = jobIds[app.jobTitle];

          if (!candidateId || !jobId) continue;

          const existing = await queryOne(
            "SELECT id FROM applications WHERE candidate_id = $1 AND job_id = $2",
            [candidateId, jobId]
          );

          if (existing) continue;

          const appliedAt = new Date();
          appliedAt.setDate(appliedAt.getDate() - app.appliedDaysAgo);

          await queryOne(
            `INSERT INTO applications (candidate_id, job_id, status, resume_score, applied_at)
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [candidateId, jobId, app.status, app.score, appliedAt.toISOString()]
          );

          appCount++;
        }

        // ==========================================
        // STEP 8: DONE
        // ==========================================
        progress(8, TOTAL_STEPS, `Done! Created ${appCount} applications across 8 jobs.`);

        // Send final summary
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              step: TOTAL_STEPS,
              total: TOTAL_STEPS,
              message: "complete",
                            summary: {
                company: "Nexlayer",
                teamMembers: 4,
                candidates: 40,
                jobs: 8,
                pipelines: Object.keys(pipelineIds).length,
                applications: appCount,
                accounts: [
                  { role: "Admin", email: "priya@nexlayer.io" },
                  { role: "Recruiter", email: "recruiter@nexlayer.io" },
                  { role: "Recruiter #2", email: "hiring@nexlayer.io" },
                  { role: "Interviewer", email: "rahul@nexlayer.io" },
                ],
                password: "Test1234!",
              },
            })}\n\n`
          )
        );
      } catch (error: any) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              step: -1,
              total: TOTAL_STEPS,
              message: `Error: ${error.message}`,
            })}\n\n`
          )
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}