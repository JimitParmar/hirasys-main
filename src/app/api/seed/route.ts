import { query, queryOne } from "@/lib/db";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("🌱 Seeding screenshot-ready data...\n");

  const passwordHash = await bcrypt.hash("Test1234!", 12);

  // ==========================================
  // 1. CREATE COMPANY
  // ==========================================
  let cId: string;

  const existingCompany = await queryOne(
    "SELECT id FROM companies WHERE name = 'Nexlayer'",
  );

  if (existingCompany) {
    cId = existingCompany.id;
    console.log("✓ Company Nexlayer already exists");
  } else {
    const company = await queryOne(
      `INSERT INTO companies (name, domain, created_by)
       VALUES ('Nexlayer', 'nexlayer.io', 'pending')
       RETURNING *`,
    );
    cId = company.id;
    console.log("✅ Created company: Nexlayer");
  }

  // ==========================================
  // 2. CREATE TEAM MEMBERS
  // ==========================================
  const teamMembers = [
    {
      email: "priya@nexlayer.io",
      firstName: "Priya",
      lastName: "Sharma",
      role: "ADMIN",
    },
    {
      email: "recruiter@nexlayer.io",
      firstName: "Meera",
      lastName: "Kapoor",
      role: "HR",
    },
    {
      email: "hiring@nexlayer.io",
      firstName: "Arjun",
      lastName: "Mehta",
      role: "HR",
    },
    {
      email: "rahul@nexlayer.io",
      firstName: "Rahul",
      lastName: "Desai",
      role: "HIRING_MANAGER",
    },
  ];

  for (const u of teamMembers) {
    const existing = await queryOne("SELECT id FROM users WHERE email = $1", [
      u.email,
    ]);
    if (existing) {
      console.log(`✓ User ${u.email} already exists`);
      continue;
    }

    await queryOne(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, company_id, company, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)
       RETURNING id`,
      [
        u.email,
        passwordHash,
        u.firstName,
        u.lastName,
        u.role,
        cId,
        "Nexlayer",
      ],
    );
    console.log(`✅ Created ${u.role}: ${u.firstName} ${u.lastName}`);
  }

  // Update company created_by
  const admin = await queryOne(
    "SELECT id FROM users WHERE email = 'priya@nexlayer.io'",
  );
  if (admin) {
    await query("UPDATE companies SET created_by = $1 WHERE id = $2", [
      admin.id,
      cId,
    ]);
  }

  const recruiter = await queryOne(
    "SELECT id FROM users WHERE email = 'recruiter@nexlayer.io'",
  );
  const hrArjun = await queryOne(
    "SELECT id FROM users WHERE email = 'hiring@nexlayer.io'",
  );

  // ==========================================
  // 3. CANDIDATES — Realistic diverse pool
  // ==========================================
  const candidates = [
    // --- Strong engineering candidates ---
    {
      email: "ananya.r@gmail.com",
      firstName: "Ananya",
      lastName: "Raghavan",
    },
    { email: "omar.faisal@outlook.com", firstName: "Omar", lastName: "Faisal" },
    { email: "sarah.chen@proton.me", firstName: "Sarah", lastName: "Chen" },
    {
      email: "vikram.joshi@yahoo.com",
      firstName: "Vikram",
      lastName: "Joshi",
    },
    { email: "emily.zhang@gmail.com", firstName: "Emily", lastName: "Zhang" },
    {
      email: "carlos.rivera@hotmail.com",
      firstName: "Carlos",
      lastName: "Rivera",
    },
    {
      email: "sneha.patel@gmail.com",
      firstName: "Sneha",
      lastName: "Patel",
    },
    { email: "james.okonkwo@pm.me", firstName: "James", lastName: "Okonkwo" },
    { email: "aisha.khan@gmail.com", firstName: "Aisha", lastName: "Khan" },
    {
      email: "daniel.moretti@outlook.com",
      firstName: "Daniel",
      lastName: "Moretti",
    },

    // --- Mid-level / mixed candidates ---
    {
      email: "ritika.menon@gmail.com",
      firstName: "Ritika",
      lastName: "Menon",
    },
    {
      email: "tom.anderson@yahoo.com",
      firstName: "Tom",
      lastName: "Anderson",
    },
    {
      email: "fatima.zahra@outlook.com",
      firstName: "Fatima",
      lastName: "Zahra",
    },
    { email: "kevin.wu@gmail.com", firstName: "Kevin", lastName: "Wu" },
    {
      email: "prachi.deshmukh@pm.me",
      firstName: "Prachi",
      lastName: "Deshmukh",
    },
    { email: "ben.taylor@gmail.com", firstName: "Ben", lastName: "Taylor" },
    {
      email: "nisha.reddy@hotmail.com",
      firstName: "Nisha",
      lastName: "Reddy",
    },
    { email: "lucas.park@gmail.com", firstName: "Lucas", lastName: "Park" },
    {
      email: "maria.santos@outlook.com",
      firstName: "Maria",
      lastName: "Santos",
    },
    { email: "alex.dubois@proton.me", firstName: "Alex", lastName: "Dubois" },

    // --- Junior / intern candidates ---
    { email: "rohan.gupta@gmail.com", firstName: "Rohan", lastName: "Gupta" },
    {
      email: "sophie.miller@yahoo.com",
      firstName: "Sophie",
      lastName: "Miller",
    },
    { email: "arjun.nair@gmail.com", firstName: "Arjun", lastName: "Nair" },
    {
      email: "chloe.bennett@outlook.com",
      firstName: "Chloe",
      lastName: "Bennett",
    },
    {
      email: "karthik.iyer@hotmail.com",
      firstName: "Karthik",
      lastName: "Iyer",
    },

    // --- Design / marketing candidates ---
    { email: "maya.johnson@gmail.com", firstName: "Maya", lastName: "Johnson" },
    {
      email: "derek.chang@outlook.com",
      firstName: "Derek",
      lastName: "Chang",
    },
    { email: "isha.singh@pm.me", firstName: "Isha", lastName: "Singh" },
    { email: "ryan.brooks@gmail.com", firstName: "Ryan", lastName: "Brooks" },
    {
      email: "tanya.wilson@proton.me",
      firstName: "Tanya",
      lastName: "Wilson",
    },

    // --- More engineering / data ---
    {
      email: "deepak.sharma@gmail.com",
      firstName: "Deepak",
      lastName: "Sharma",
    },
    { email: "lisa.nakamura@yahoo.com", firstName: "Lisa", lastName: "Nakamura" },
    {
      email: "samuel.osei@outlook.com",
      firstName: "Samuel",
      lastName: "Osei",
    },
    { email: "pooja.bhatt@gmail.com", firstName: "Pooja", lastName: "Bhatt" },
    { email: "noah.klein@proton.me", firstName: "Noah", lastName: "Klein" },
    {
      email: "meghna.rao@hotmail.com",
      firstName: "Meghna",
      lastName: "Rao",
    },
    { email: "ethan.cole@gmail.com", firstName: "Ethan", lastName: "Cole" },
    {
      email: "zara.ahmed@outlook.com",
      firstName: "Zara",
      lastName: "Ahmed",
    },
    { email: "nikhil.verma@pm.me", firstName: "Nikhil", lastName: "Verma" },
    { email: "grace.liu@gmail.com", firstName: "Grace", lastName: "Liu" },
  ];

  for (const c of candidates) {
    const existing = await queryOne("SELECT id FROM users WHERE email = $1", [
      c.email,
    ]);
    if (existing) continue;

    await queryOne(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, is_active)
       VALUES ($1, $2, $3, $4, 'CANDIDATE', true)
       RETURNING id`,
      [c.email, passwordHash, c.firstName, c.lastName],
    );
  }
  console.log(`✅ Created ${candidates.length} candidates`);

  // ==========================================
  // 4. JOBS — Varied, realistic roles
  // ==========================================
  const jobs = [
    {
      title: "Senior Frontend Engineer",
      description: `We're looking for a Senior Frontend Engineer to lead the development of our customer-facing web applications.

You'll work closely with design and product to build fast, accessible interfaces using React, TypeScript, and Next.js. This is a high-impact role — you'll own major features end to end.

What you'll do:
- Architect and build complex UI components and pages
- Own frontend performance, accessibility, and testing
- Mentor junior engineers on frontend best practices
- Collaborate with backend engineers on API design
- Ship features weekly in a fast-paced environment

What we're looking for:
- 5+ years building production React applications
- Deep TypeScript knowledge — not just using it, but leveraging it
- Experience with Next.js (App Router preferred)
- Strong opinions on state management, loosely held
- Track record of shipping user-facing features at scale
- You've worked in a startup or high-growth environment before`,
      department: "Engineering",
      location: "Remote",
      type: "full_time",
      skills: [
        "React",
        "TypeScript",
        "Next.js",
        "Tailwind CSS",
        "GraphQL",
        "Testing",
      ],
      requirements: [
        "5+ years React experience",
        "Advanced TypeScript",
        "Next.js App Router",
        "Performance optimization",
        "Mentorship experience",
      ],
      postedBy: recruiter?.id,
      status: "PUBLISHED",
    },
    {
      title: "Backend Engineer — Platform",
      description: `Join our platform team to build the core infrastructure that powers Nexlayer.

You'll design and implement APIs, background jobs, data pipelines, and integrations. We run on Node.js, PostgreSQL, and Redis — deployed on AWS.

What you'll do:
- Build and maintain REST and GraphQL APIs
- Design database schemas and write efficient queries
- Build event-driven architectures for real-time features
- Own monitoring, alerting, and incident response for your services
- Write clean, tested, documented code

What we're looking for:
- 3+ years backend development with Node.js or Python
- Strong PostgreSQL skills — you can write complex queries in your sleep
- Experience with Redis, message queues, or event-driven systems
- Understanding of API design principles and authentication
- You care about reliability and observability as much as features`,
      department: "Engineering",
      location: "Remote",
      type: "full_time",
      skills: [
        "Node.js",
        "PostgreSQL",
        "Redis",
        "AWS",
        "REST APIs",
        "Docker",
      ],
      requirements: [
        "3+ years Node.js or Python",
        "Strong SQL skills",
        "API design experience",
        "AWS or GCP experience",
      ],
      postedBy: recruiter?.id,
      status: "PUBLISHED",
    },
    {
      title: "Product Designer",
      description: `We need a Product Designer who can own the end-to-end design process — from research through to pixel-perfect handoff.

You'll be the sole designer on a product squad, working with engineers and PMs to design features that make hiring less painful.

What you'll do:
- Conduct user research and synthesize findings into design decisions
- Create wireframes, prototypes, and high-fidelity designs in Figma
- Define and maintain our design system
- Run usability tests and iterate based on feedback
- Work directly with engineers during implementation

What we're looking for:
- 3+ years product design experience at a SaaS or B2B company
- Expert-level Figma skills including components, variants, auto-layout
- Portfolio showing end-to-end design process, not just final screens
- Experience designing complex workflows and data-heavy interfaces
- You've shipped features and seen how real users interact with them`,
      department: "Design",
      location: "Bangalore, IN",
      type: "full_time",
      skills: [
        "Figma",
        "User Research",
        "Design Systems",
        "Prototyping",
        "UI/UX",
      ],
      requirements: [
        "3+ years product design",
        "Figma expert",
        "B2B SaaS experience",
        "User research skills",
      ],
      postedBy: hrArjun?.id,
      status: "PUBLISHED",
    },
    {
      title: "DevOps / Infrastructure Engineer",
      description: `Own our cloud infrastructure and developer tooling.

We run on AWS with Terraform, Docker, and GitHub Actions. You'll make deployments faster, infrastructure more reliable, and developers more productive.

What you'll do:
- Manage and improve our AWS infrastructure using Terraform
- Build and maintain CI/CD pipelines
- Implement monitoring, logging, and alerting
- Optimize cloud costs without sacrificing reliability
- Support developers with tooling and environment setup

What we're looking for:
- 3+ years in DevOps, SRE, or infrastructure roles
- Strong AWS experience (ECS, RDS, S3, CloudFront, Lambda)
- Terraform or Pulumi for infrastructure as code
- Docker and container orchestration
- GitHub Actions or similar CI/CD
- You've been on-call and know what good incident response looks like`,
      department: "Engineering",
      location: "Remote",
      type: "full_time",
      skills: [
        "AWS",
        "Terraform",
        "Docker",
        "CI/CD",
        "Linux",
        "Monitoring",
      ],
      requirements: [
        "3+ years DevOps/SRE",
        "AWS certified or equivalent experience",
        "Terraform",
        "Docker + orchestration",
      ],
      postedBy: recruiter?.id,
      status: "PUBLISHED",
    },
    {
      title: "Growth Marketing Manager",
      description: `Lead our growth efforts from content to conversion.

You'll own the full marketing funnel — from driving awareness to converting signups into paying customers. This is a hands-on role, not a strategy-only position.

What you'll do:
- Plan and execute content marketing, SEO, and email campaigns
- Run paid acquisition experiments (Google, LinkedIn, Twitter)
- Build and optimize landing pages and conversion flows
- Analyze funnel data and identify growth levers
- Work with product on PLG features and activation

What we're looking for:
- 4+ years in growth, performance, or product marketing at a B2B SaaS company
- Hands-on experience with SEO, paid ads, and email marketing
- Data-driven — you live in analytics dashboards
- Experience with PLG or self-serve SaaS models
- Strong writing skills — you can write copy that converts`,
      department: "Marketing",
      location: "Mumbai, IN",
      type: "full_time",
      skills: [
        "SEO",
        "Content Marketing",
        "Google Ads",
        "Analytics",
        "Email Marketing",
        "PLG",
      ],
      requirements: [
        "4+ years B2B SaaS marketing",
        "Paid acquisition experience",
        "SEO expertise",
        "Analytics proficiency",
      ],
      postedBy: hrArjun?.id,
      status: "PUBLISHED",
    },
    {
      title: "Full Stack Engineering Intern",
      description: `A 3-month paid internship on our engineering team.

You'll work on real features alongside senior engineers. This isn't a coffee-fetching internship — you'll write code that ships to production.

What you'll do:
- Build features across the stack (React + Node.js + PostgreSQL)
- Participate in code reviews, standups, and sprint planning
- Own at least one feature end-to-end by the end of the internship
- Write tests and documentation for your code

What we're looking for:
- Currently pursuing CS, Engineering, or related degree
- Comfortable with JavaScript/TypeScript
- Built at least one project with React
- Basic understanding of databases and APIs
- You ship side projects — show us what you've built`,
      department: "Engineering",
      location: "Remote",
      type: "internship",
      skills: ["React", "Node.js", "JavaScript", "PostgreSQL", "Git"],
      requirements: [
        "CS or Engineering student",
        "JavaScript/TypeScript",
        "At least one React project",
        "Basic SQL knowledge",
      ],
      postedBy: recruiter?.id,
      status: "PUBLISHED",
    },
    {
      title: "Technical Content Writer",
      description: `Write content that developers and HR teams actually want to read.

You'll create blog posts, documentation, guides, and case studies that drive organic traffic and establish Nexlayer as a thought leader in hiring tech.

What you'll do:
- Write 3-4 long-form blog posts per month
- Create technical documentation and API guides
- Develop customer case studies and success stories
- Optimize existing content for SEO
- Collaborate with engineering on technical accuracy

What we're looking for:
- 2+ years technical writing or developer content creation
- You can explain complex technical concepts simply
- SEO knowledge — you understand keyword research and on-page optimization
- Portfolio of published technical content
- Bonus: experience with developer tools or HR tech`,
      department: "Marketing",
      location: "Remote",
      type: "contract",
      skills: [
        "Technical Writing",
        "SEO",
        "Content Strategy",
        "Documentation",
        "Copywriting",
      ],
      requirements: [
        "2+ years technical writing",
        "Published portfolio",
        "SEO fundamentals",
        "Developer audience experience",
      ],
      postedBy: hrArjun?.id,
      status: "PUBLISHED",
    },
    {
      title: "Senior Data Engineer",
      description: `Build the data infrastructure that powers our AI features.

You'll design pipelines, manage data warehousing, and work with ML engineers to ensure clean, reliable data flows across the platform.

What you'll do:
- Design and build ETL/ELT pipelines
- Manage our data warehouse (BigQuery/Redshift)
- Build data models that support analytics and ML
- Ensure data quality, monitoring, and documentation
- Optimize query performance and cost

What we're looking for:
- 4+ years data engineering experience
- Strong SQL and Python
- Experience with Airflow, dbt, or similar orchestration tools
- Cloud data warehouse experience (BigQuery, Redshift, or Snowflake)
- Understanding of ML data requirements is a plus`,
      department: "Data",
      location: "Bangalore, IN",
      type: "full_time",
      skills: ["Python", "SQL", "Airflow", "dbt", "BigQuery", "AWS"],
      requirements: [
        "4+ years data engineering",
        "Advanced SQL",
        "Python proficiency",
        "Cloud data warehouse experience",
      ],
      postedBy: recruiter?.id,
      status: "PUBLISHED",
    },
  ];

  const jobIds: Record<string, string> = {};

  for (const job of jobs) {
    const existing = await queryOne(
      "SELECT id FROM jobs WHERE title = $1 AND posted_by = $2",
      [job.title, job.postedBy],
    );

    if (existing) {
      jobIds[job.title] = existing.id;
      console.log(`✓ Job "${job.title}" already exists`);
      continue;
    }

    const created = await queryOne(
      `INSERT INTO jobs (title, description, department, location, type, skills, requirements, status, posted_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        job.title,
        job.description,
        job.department,
        job.location,
        job.type,
        job.skills,
        job.requirements,
        job.status,
        job.postedBy,
      ],
    );

    if (created) {
      jobIds[job.title] = created.id;
      console.log(`✅ Created job: ${job.title}`);
    }
  }

  // ==========================================
  // 5. APPLICATIONS — Spread across jobs with realistic scores
  // ==========================================

  // Helper to get user ID by email
  async function getUserId(email: string): Promise<string | null> {
    const user = await queryOne("SELECT id FROM users WHERE email = $1", [
      email,
    ]);
    return user?.id || null;
  }

  // Applications mapped to jobs with realistic distribution
  const applications: Array<{
    candidateEmail: string;
    jobTitle: string;
    status: string;
    score: number | null;
    appliedDaysAgo: number;
  }> = [
    // ---- Senior Frontend Engineer (most popular — 15 applicants) ----
    {
      candidateEmail: "ananya.r@gmail.com",
      jobTitle: "Senior Frontend Engineer",
      status: "SHORTLISTED",
      score: 94,
      appliedDaysAgo: 12,
    },
    {
      candidateEmail: "sarah.chen@proton.me",
      jobTitle: "Senior Frontend Engineer",
      status: "SHORTLISTED",
      score: 91,
      appliedDaysAgo: 11,
    },
    {
      candidateEmail: "vikram.joshi@yahoo.com",
      jobTitle: "Senior Frontend Engineer",
      status: "INTERVIEW",
      score: 87,
      appliedDaysAgo: 10,
    },
    {
      candidateEmail: "emily.zhang@gmail.com",
      jobTitle: "Senior Frontend Engineer",
      status: "INTERVIEW",
      score: 85,
      appliedDaysAgo: 10,
    },
    {
      candidateEmail: "carlos.rivera@hotmail.com",
      jobTitle: "Senior Frontend Engineer",
      status: "SCREENING",
      score: 82,
      appliedDaysAgo: 8,
    },
    {
      candidateEmail: "daniel.moretti@outlook.com",
      jobTitle: "Senior Frontend Engineer",
      status: "SCREENING",
      score: 78,
      appliedDaysAgo: 7,
    },
    {
      candidateEmail: "kevin.wu@gmail.com",
      jobTitle: "Senior Frontend Engineer",
      status: "SCREENING",
      score: 75,
      appliedDaysAgo: 6,
    },
    {
      candidateEmail: "tom.anderson@yahoo.com",
      jobTitle: "Senior Frontend Engineer",
      status: "APPLIED",
      score: 72,
      appliedDaysAgo: 5,
    },
    {
      candidateEmail: "ben.taylor@gmail.com",
      jobTitle: "Senior Frontend Engineer",
      status: "APPLIED",
      score: 68,
      appliedDaysAgo: 4,
    },
    {
      candidateEmail: "lucas.park@gmail.com",
      jobTitle: "Senior Frontend Engineer",
      status: "APPLIED",
      score: 65,
      appliedDaysAgo: 3,
    },
    {
      candidateEmail: "ethan.cole@gmail.com",
      jobTitle: "Senior Frontend Engineer",
      status: "APPLIED",
      score: 61,
      appliedDaysAgo: 3,
    },
    {
      candidateEmail: "nikhil.verma@pm.me",
      jobTitle: "Senior Frontend Engineer",
      status: "REJECTED",
      score: 42,
      appliedDaysAgo: 11,
    },
    {
      candidateEmail: "rohan.gupta@gmail.com",
      jobTitle: "Senior Frontend Engineer",
      status: "REJECTED",
      score: 35,
      appliedDaysAgo: 10,
    },
    {
      candidateEmail: "sophie.miller@yahoo.com",
      jobTitle: "Senior Frontend Engineer",
      status: "REJECTED",
      score: 28,
      appliedDaysAgo: 9,
    },
    {
      candidateEmail: "chloe.bennett@outlook.com",
      jobTitle: "Senior Frontend Engineer",
      status: "REJECTED",
      score: 22,
      appliedDaysAgo: 8,
    },

    // ---- Backend Engineer — Platform (12 applicants) ----
    {
      candidateEmail: "omar.faisal@outlook.com",
      jobTitle: "Backend Engineer — Platform",
      status: "SHORTLISTED",
      score: 92,
      appliedDaysAgo: 14,
    },
    {
      candidateEmail: "james.okonkwo@pm.me",
      jobTitle: "Backend Engineer — Platform",
      status: "INTERVIEW",
      score: 88,
      appliedDaysAgo: 13,
    },
    {
      candidateEmail: "deepak.sharma@gmail.com",
      jobTitle: "Backend Engineer — Platform",
      status: "INTERVIEW",
      score: 86,
      appliedDaysAgo: 11,
    },
    {
      candidateEmail: "sneha.patel@gmail.com",
      jobTitle: "Backend Engineer — Platform",
      status: "SCREENING",
      score: 79,
      appliedDaysAgo: 9,
    },
    {
      candidateEmail: "samuel.osei@outlook.com",
      jobTitle: "Backend Engineer — Platform",
      status: "SCREENING",
      score: 76,
      appliedDaysAgo: 8,
    },
    {
      candidateEmail: "noah.klein@proton.me",
      jobTitle: "Backend Engineer — Platform",
      status: "APPLIED",
      score: 73,
      appliedDaysAgo: 6,
    },
    {
      candidateEmail: "grace.liu@gmail.com",
      jobTitle: "Backend Engineer — Platform",
      status: "APPLIED",
      score: 70,
      appliedDaysAgo: 5,
    },
    {
      candidateEmail: "ritika.menon@gmail.com",
      jobTitle: "Backend Engineer — Platform",
      status: "APPLIED",
      score: 64,
      appliedDaysAgo: 4,
    },
    {
      candidateEmail: "alex.dubois@proton.me",
      jobTitle: "Backend Engineer — Platform",
      status: "REJECTED",
      score: 38,
      appliedDaysAgo: 12,
    },
    {
      candidateEmail: "karthik.iyer@hotmail.com",
      jobTitle: "Backend Engineer — Platform",
      status: "REJECTED",
      score: 31,
      appliedDaysAgo: 11,
    },
    {
      candidateEmail: "maria.santos@outlook.com",
      jobTitle: "Backend Engineer — Platform",
      status: "REJECTED",
      score: 25,
      appliedDaysAgo: 10,
    },
    {
      candidateEmail: "arjun.nair@gmail.com",
      jobTitle: "Backend Engineer — Platform",
      status: "REJECTED",
      score: 19,
      appliedDaysAgo: 9,
    },

    // ---- Product Designer (8 applicants) ----
    {
      candidateEmail: "isha.singh@pm.me",
      jobTitle: "Product Designer",
      status: "SHORTLISTED",
      score: 93,
      appliedDaysAgo: 9,
    },
    {
      candidateEmail: "maya.johnson@gmail.com",
      jobTitle: "Product Designer",
      status: "INTERVIEW",
      score: 89,
      appliedDaysAgo: 8,
    },
    {
      candidateEmail: "derek.chang@outlook.com",
      jobTitle: "Product Designer",
      status: "SCREENING",
      score: 81,
      appliedDaysAgo: 7,
    },
    {
      candidateEmail: "tanya.wilson@proton.me",
      jobTitle: "Product Designer",
      status: "SCREENING",
      score: 77,
      appliedDaysAgo: 6,
    },
    {
      candidateEmail: "ryan.brooks@gmail.com",
      jobTitle: "Product Designer",
      status: "APPLIED",
      score: 69,
      appliedDaysAgo: 5,
    },
    {
      candidateEmail: "fatima.zahra@outlook.com",
      jobTitle: "Product Designer",
      status: "APPLIED",
      score: 63,
      appliedDaysAgo: 4,
    },
    {
      candidateEmail: "nisha.reddy@hotmail.com",
      jobTitle: "Product Designer",
      status: "REJECTED",
      score: 41,
      appliedDaysAgo: 8,
    },
    {
      candidateEmail: "prachi.deshmukh@pm.me",
      jobTitle: "Product Designer",
      status: "REJECTED",
      score: 33,
      appliedDaysAgo: 7,
    },

    // ---- DevOps / Infrastructure Engineer (7 applicants) ----
    {
      candidateEmail: "james.okonkwo@pm.me",
      jobTitle: "DevOps / Infrastructure Engineer",
      status: "SHORTLISTED",
      score: 90,
      appliedDaysAgo: 7,
    },
    {
      candidateEmail: "deepak.sharma@gmail.com",
      jobTitle: "DevOps / Infrastructure Engineer",
      status: "INTERVIEW",
      score: 84,
      appliedDaysAgo: 6,
    },
    {
      candidateEmail: "noah.klein@proton.me",
      jobTitle: "DevOps / Infrastructure Engineer",
      status: "SCREENING",
      score: 78,
      appliedDaysAgo: 5,
    },
    {
      candidateEmail: "samuel.osei@outlook.com",
      jobTitle: "DevOps / Infrastructure Engineer",
      status: "APPLIED",
      score: 71,
      appliedDaysAgo: 4,
    },
    {
      candidateEmail: "ethan.cole@gmail.com",
      jobTitle: "DevOps / Infrastructure Engineer",
      status: "APPLIED",
      score: 66,
      appliedDaysAgo: 3,
    },
    {
      candidateEmail: "daniel.moretti@outlook.com",
      jobTitle: "DevOps / Infrastructure Engineer",
      status: "REJECTED",
      score: 39,
      appliedDaysAgo: 6,
    },
    {
      candidateEmail: "ben.taylor@gmail.com",
      jobTitle: "DevOps / Infrastructure Engineer",
      status: "REJECTED",
      score: 27,
      appliedDaysAgo: 5,
    },

    // ---- Growth Marketing Manager (6 applicants) ----
    {
      candidateEmail: "aisha.khan@gmail.com",
      jobTitle: "Growth Marketing Manager",
      status: "SHORTLISTED",
      score: 91,
      appliedDaysAgo: 8,
    },
    {
      candidateEmail: "tanya.wilson@proton.me",
      jobTitle: "Growth Marketing Manager",
      status: "INTERVIEW",
      score: 83,
      appliedDaysAgo: 7,
    },
    {
      candidateEmail: "zara.ahmed@outlook.com",
      jobTitle: "Growth Marketing Manager",
      status: "SCREENING",
      score: 76,
      appliedDaysAgo: 5,
    },
    {
      candidateEmail: "pooja.bhatt@gmail.com",
      jobTitle: "Growth Marketing Manager",
      status: "APPLIED",
      score: 68,
      appliedDaysAgo: 4,
    },
    {
      candidateEmail: "lisa.nakamura@yahoo.com",
      jobTitle: "Growth Marketing Manager",
      status: "APPLIED",
      score: 62,
      appliedDaysAgo: 3,
    },
    {
      candidateEmail: "meghna.rao@hotmail.com",
      jobTitle: "Growth Marketing Manager",
      status: "REJECTED",
      score: 36,
      appliedDaysAgo: 7,
    },

    // ---- Full Stack Engineering Intern (10 applicants — interns get lots) ----
    {
      candidateEmail: "rohan.gupta@gmail.com",
      jobTitle: "Full Stack Engineering Intern",
      status: "SHORTLISTED",
      score: 88,
      appliedDaysAgo: 6,
    },
    {
      candidateEmail: "sophie.miller@yahoo.com",
      jobTitle: "Full Stack Engineering Intern",
      status: "INTERVIEW",
      score: 82,
      appliedDaysAgo: 5,
    },
    {
      candidateEmail: "arjun.nair@gmail.com",
      jobTitle: "Full Stack Engineering Intern",
      status: "INTERVIEW",
      score: 79,
      appliedDaysAgo: 5,
    },
    {
      candidateEmail: "chloe.bennett@outlook.com",
      jobTitle: "Full Stack Engineering Intern",
      status: "SCREENING",
      score: 74,
      appliedDaysAgo: 4,
    },
    {
      candidateEmail: "karthik.iyer@hotmail.com",
      jobTitle: "Full Stack Engineering Intern",
      status: "SCREENING",
      score: 71,
      appliedDaysAgo: 4,
    },
    {
      candidateEmail: "grace.liu@gmail.com",
      jobTitle: "Full Stack Engineering Intern",
      status: "APPLIED",
      score: 67,
      appliedDaysAgo: 3,
    },
    {
      candidateEmail: "nikhil.verma@pm.me",
      jobTitle: "Full Stack Engineering Intern",
      status: "APPLIED",
      score: 63,
      appliedDaysAgo: 2,
    },
    {
      candidateEmail: "meghna.rao@hotmail.com",
      jobTitle: "Full Stack Engineering Intern",
      status: "APPLIED",
      score: 58,
      appliedDaysAgo: 2,
    },
    {
      candidateEmail: "tom.anderson@yahoo.com",
      jobTitle: "Full Stack Engineering Intern",
      status: "REJECTED",
      score: 34,
      appliedDaysAgo: 5,
    },
    {
      candidateEmail: "maria.santos@outlook.com",
      jobTitle: "Full Stack Engineering Intern",
      status: "REJECTED",
      score: 21,
      appliedDaysAgo: 4,
    },

    // ---- Technical Content Writer (5 applicants) ----
    {
      candidateEmail: "fatima.zahra@outlook.com",
      jobTitle: "Technical Content Writer",
      status: "SHORTLISTED",
      score: 90,
      appliedDaysAgo: 5,
    },
    {
      candidateEmail: "ritika.menon@gmail.com",
      jobTitle: "Technical Content Writer",
      status: "SCREENING",
      score: 80,
      appliedDaysAgo: 4,
    },
    {
      candidateEmail: "alex.dubois@proton.me",
      jobTitle: "Technical Content Writer",
      status: "APPLIED",
      score: 72,
      appliedDaysAgo: 3,
    },
    {
      candidateEmail: "prachi.deshmukh@pm.me",
      jobTitle: "Technical Content Writer",
      status: "APPLIED",
      score: 65,
      appliedDaysAgo: 2,
    },
    {
      candidateEmail: "kevin.wu@gmail.com",
      jobTitle: "Technical Content Writer",
      status: "REJECTED",
      score: 30,
      appliedDaysAgo: 4,
    },

    // ---- Senior Data Engineer (9 applicants) ----
    {
      candidateEmail: "sarah.chen@proton.me",
      jobTitle: "Senior Data Engineer",
      status: "SHORTLISTED",
      score: 95,
      appliedDaysAgo: 10,
    },
    {
      candidateEmail: "omar.faisal@outlook.com",
      jobTitle: "Senior Data Engineer",
      status: "INTERVIEW",
      score: 89,
      appliedDaysAgo: 9,
    },
    {
      candidateEmail: "pooja.bhatt@gmail.com",
      jobTitle: "Senior Data Engineer",
      status: "INTERVIEW",
      score: 85,
      appliedDaysAgo: 8,
    },
    {
      candidateEmail: "lisa.nakamura@yahoo.com",
      jobTitle: "Senior Data Engineer",
      status: "SCREENING",
      score: 79,
      appliedDaysAgo: 7,
    },
    {
      candidateEmail: "carlos.rivera@hotmail.com",
      jobTitle: "Senior Data Engineer",
      status: "SCREENING",
      score: 74,
      appliedDaysAgo: 6,
    },
    {
      candidateEmail: "ananya.r@gmail.com",
      jobTitle: "Senior Data Engineer",
      status: "APPLIED",
      score: 70,
      appliedDaysAgo: 5,
    },
    {
      candidateEmail: "sneha.patel@gmail.com",
      jobTitle: "Senior Data Engineer",
      status: "APPLIED",
      score: 66,
      appliedDaysAgo: 4,
    },
    {
      candidateEmail: "lucas.park@gmail.com",
      jobTitle: "Senior Data Engineer",
      status: "REJECTED",
      score: 37,
      appliedDaysAgo: 9,
    },
    {
      candidateEmail: "nisha.reddy@hotmail.com",
      jobTitle: "Senior Data Engineer",
      status: "REJECTED",
      score: 24,
      appliedDaysAgo: 8,
    },
  ];

  let appCount = 0;
  for (const app of applications) {
    const candidateId = await getUserId(app.candidateEmail);
    const jobId = jobIds[app.jobTitle];

    if (!candidateId || !jobId) {
      console.log(
        `⚠ Skipping: ${app.candidateEmail} → ${app.jobTitle} (missing ID)`,
      );
      continue;
    }

    // Check if application already exists
    const existing = await queryOne(
      "SELECT id FROM applications WHERE candidate_id = $1 AND job_id = $2",
      [candidateId, jobId],
    );

    if (existing) continue;

    const appliedAt = new Date();
    appliedAt.setDate(appliedAt.getDate() - app.appliedDaysAgo);

    await queryOne(
      `INSERT INTO applications (candidate_id, job_id, status, score, applied_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [candidateId, jobId, app.status, app.score, appliedAt.toISOString()],
    );

    appCount++;
  }

  console.log(`✅ Created ${appCount} applications`);

  // ==========================================
  // 6. SUMMARY
  // ==========================================
  console.log("\n" + "=".repeat(50));
  console.log("🎉 SEED COMPLETE — SCREENSHOT READY");
  console.log("=".repeat(50));

  console.log("\n📊 Data overview:");
  console.log("   Company:      Nexlayer");
  console.log("   Team members: 4");
  console.log("   Candidates:   40");
  console.log("   Jobs:         8 (across Engineering, Design, Marketing, Data)");
  console.log("   Applications: ~82 (distributed across all jobs)");

  console.log("\n🔑 Login accounts (password: Test1234!):");
  console.log("   Admin:           priya@nexlayer.io");
  console.log("   Recruiter:       recruiter@nexlayer.io");
  console.log("   Recruiter #2:    hiring@nexlayer.io");
  console.log("   Hiring Manager:  rahul@nexlayer.io");
  console.log("   Any candidate:   ananya.r@gmail.com (or any candidate email)");

  console.log("\n📸 Screenshot tips:");
  console.log('   → Login as recruiter@nexlayer.io for the "money shot" dashboard');
  console.log("   → Senior Frontend Engineer has 15 applicants across all stages");
  console.log("   → Backend Engineer has 12 — good for pipeline view");
  console.log("   → Intern role has 10 — good for showing volume");
  console.log("   → Scores range from 19 to 95 — realistic distribution");
  console.log("   → Mix of APPLIED, SCREENING, INTERVIEW, SHORTLISTED, REJECTED");

  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});