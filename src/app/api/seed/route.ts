import { query, queryOne } from "@/lib/db";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("🌱 Seeding test data...\n");

  const passwordHash = await bcrypt.hash("Test1234!", 12);

  // ==========================================
  // 1. CREATE COMPANY
  // ==========================================
  const company = await queryOne(
    `INSERT INTO companies (name, domain, created_by)
     VALUES ('Acme Corp', 'acme.com', 'pending')
     ON CONFLICT DO NOTHING
     RETURNING *`
  );

  const companyId = company?.id;
  if (!companyId) {
    console.log("Company already exists, fetching...");
    const existing = await queryOne(
      "SELECT id FROM companies WHERE name = 'Acme Corp'"
    );
    if (!existing) {
      console.error("Failed to create/find company");
      return;
    }
  }

  const cId =
    companyId ||
    (await queryOne("SELECT id FROM companies WHERE name = 'Acme Corp'"))
      ?.id;

  // ==========================================
  // 2. CREATE USERS
  // ==========================================
  const users = [
    {
      email: "admin@acme.com",
      firstName: "Alice",
      lastName: "Admin",
      role: "ADMIN",
    },
    {
      email: "hr@acme.com",
      firstName: "Hannah",
      lastName: "Recruiter",
      role: "HR",
    },
    {
      email: "candidate1@test.com",
      firstName: "John",
      lastName: "Developer",
      role: "CANDIDATE",
    },
    {
      email: "candidate2@test.com",
      firstName: "Jane",
      lastName: "Designer",
      role: "CANDIDATE",
    },
    {
      email: "candidate3@test.com",
      firstName: "Bob",
      lastName: "Engineer",
      role: "CANDIDATE",
    },
  ];

  for (const u of users) {
    const existing = await queryOne(
      "SELECT id FROM users WHERE email = $1",
      [u.email]
    );
    if (existing) {
      console.log(`  ✓ User ${u.email} already exists`);
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
        u.role !== "CANDIDATE" ? cId : null,
        u.role !== "CANDIDATE" ? "Acme Corp" : null,
      ]
    );
    console.log(`  ✅ Created ${u.role}: ${u.email}`);
  }

  // Update company created_by
  const admin = await queryOne(
    "SELECT id FROM users WHERE email = 'admin@acme.com'"
  );
  if (admin && cId) {
    await query("UPDATE companies SET created_by = $1 WHERE id = $2", [
      admin.id,
      cId,
    ]);
  }

  // ==========================================
  // 3. CREATE SAMPLE JOBS
  // ==========================================
  const hr = await queryOne(
    "SELECT id FROM users WHERE email = 'hr@acme.com'"
  );

  if (hr) {
    const jobs = [
      {
        title: "Senior React Developer",
        description:
          "We are looking for a Senior React Developer to join our frontend team. You will build modern web applications using React, TypeScript, and Next.js.\n\nRequirements:\n- 4+ years of React experience\n- Strong TypeScript skills\n- Experience with Next.js and server-side rendering\n- Familiarity with state management (Redux, Zustand)\n- Understanding of REST APIs and GraphQL",
        department: "Engineering",
        location: "Remote",
        type: "full_time",
        skills: ["React", "TypeScript", "Next.js", "Node.js", "GraphQL"],
        requirements: [
          "4+ years React experience",
          "TypeScript proficiency",
          "Next.js experience",
        ],
      },
      {
        title: "Product Marketing Manager",
        description:
          "Lead our product marketing efforts. You will work closely with product and sales teams to create compelling positioning, messaging, and go-to-market strategies.\n\nRequirements:\n- 3+ years in product marketing or related role\n- Excellent communication and writing skills\n- Experience with market research and competitive analysis\n- Track record of successful product launches",
        department: "Marketing",
        location: "New York, NY",
        type: "full_time",
        skills: [
          "Product Marketing",
          "Content Strategy",
          "Market Research",
          "GTM Strategy",
        ],
        requirements: [
          "3+ years product marketing",
          "Strong writing skills",
          "Launch experience",
        ],
      },
      {
        title: "Data Science Intern",
        description:
          "Join our data team for a 3-month internship. You will work on real projects involving machine learning, data analysis, and building predictive models.\n\nRequirements:\n- Currently pursuing degree in CS, Statistics, or related field\n- Familiarity with Python and pandas\n- Basic understanding of ML concepts",
        department: "Data",
        location: "San Francisco, CA",
        type: "internship",
        skills: ["Python", "Machine Learning", "SQL", "pandas", "Statistics"],
        requirements: [
          "CS or Statistics student",
          "Python knowledge",
          "ML basics",
        ],
      },
    ];

    for (const job of jobs) {
      const existing = await queryOne(
        "SELECT id FROM jobs WHERE title = $1 AND posted_by = $2",
        [job.title, hr.id]
      );
      if (existing) {
        console.log(`  ✓ Job "${job.title}" already exists`);
        continue;
      }

      await queryOne(
        `INSERT INTO jobs (title, description, department, location, type, skills, requirements, status, posted_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'PUBLISHED', $8)
         RETURNING id`,
        [
          job.title,
          job.description,
          job.department,
          job.location,
          job.type,
          job.skills,
          job.requirements,
          hr.id,
        ]
      );
      console.log(`  ✅ Created job: ${job.title}`);
    }
  }

  console.log("\n🎉 Seed complete!\n");
  console.log("Test accounts (password: Test1234!):");
  console.log("  Admin:     admin@acme.com");
  console.log("  HR:        hr@acme.com");
  console.log("  Candidate: candidate1@test.com");
  console.log("  Candidate: candidate2@test.com");
  console.log("  Candidate: candidate3@test.com");

  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});