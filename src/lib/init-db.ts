import { query } from "./db";

export async function initializeDatabase() {
  await query(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'CANDIDATE' CHECK (role IN ('ADMIN', 'HR', 'INTERVIEWER', 'CANDIDATE')),
      phone TEXT,
      avatar_url TEXT,
      department TEXT,
      company TEXT,
      is_active BOOLEAN DEFAULT true,
      is_verified BOOLEAN DEFAULT false,
      last_login_at TIMESTAMP,
      skills TEXT[] DEFAULT '{}',
      resume_url TEXT,
      resume_text TEXT,
      profile_data JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Jobs table
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      requirements TEXT[] DEFAULT '{}',
      skills TEXT[] DEFAULT '{}',
      department TEXT NOT NULL,
      location TEXT NOT NULL,
      type TEXT DEFAULT 'full_time' CHECK (type IN ('full_time', 'part_time', 'contract', 'internship')),
      experience_min INTEGER DEFAULT 0,
      experience_max INTEGER DEFAULT 99,
      salary_min NUMERIC(12,2),
      salary_max NUMERIC(12,2),
      salary_currency TEXT DEFAULT 'USD',
      status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED')),
      pipeline_id TEXT,
      posted_by TEXT NOT NULL REFERENCES users(id),
      closing_date TIMESTAMP,
      applicant_count INTEGER DEFAULT 0,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Applications table
    CREATE TABLE IF NOT EXISTS applications (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      job_id TEXT NOT NULL REFERENCES jobs(id),
      candidate_id TEXT NOT NULL REFERENCES users(id),
      resume_url TEXT,
      resume_text TEXT,
      resume_parsed JSONB,
      cover_letter TEXT,
      status TEXT DEFAULT 'APPLIED' CHECK (status IN (
        'APPLIED', 'SCREENING', 'ASSESSMENT', 'AI_INTERVIEW',
        'F2F_INTERVIEW', 'UNDER_REVIEW', 'OFFERED', 'HIRED',
        'ONBOARDING', 'REJECTED', 'WITHDRAWN'
      )),
      resume_score REAL DEFAULT 0,
      current_stage TEXT,
      notes TEXT,
      rejection_feedback JSONB,
      metadata JSONB DEFAULT '{}',
      applied_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(job_id, candidate_id)
    );

    -- Pipelines table
    CREATE TABLE IF NOT EXISTS pipelines (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED')),
      nodes JSONB DEFAULT '[]',
      edges JSONB DEFAULT '[]',
      viewport JSONB DEFAULT '{}',
      estimated_applicants INTEGER DEFAULT 100,
      estimated_cost REAL DEFAULT 0,
      is_template BOOLEAN DEFAULT false,
      template_category TEXT,
      created_by TEXT NOT NULL REFERENCES users(id),
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Notifications table
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id TEXT NOT NULL REFERENCES users(id),
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      link TEXT,
      is_read BOOLEAN DEFAULT false,
      data JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- Assessments table
    CREATE TABLE IF NOT EXISTS assessments (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      job_id TEXT NOT NULL REFERENCES jobs(id),
      title TEXT NOT NULL,
      description TEXT,
      type TEXT DEFAULT 'CODING' CHECK (type IN ('CODING', 'MCQ', 'SUBJECTIVE', 'MIXED')),
      duration INTEGER DEFAULT 60,
      total_points INTEGER DEFAULT 100,
      passing_score INTEGER DEFAULT 60,
      questions JSONB DEFAULT '[]',
      is_active BOOLEAN DEFAULT true,
      created_by TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Submissions table
    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      assessment_id TEXT NOT NULL REFERENCES assessments(id),
      application_id TEXT NOT NULL REFERENCES applications(id),
      candidate_id TEXT NOT NULL REFERENCES users(id),
      answers JSONB DEFAULT '[]',
      total_score REAL DEFAULT 0,
      max_score REAL DEFAULT 0,
      percentage REAL DEFAULT 0,
      status TEXT DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS', 'SUBMITTED', 'GRADED')),
      started_at TIMESTAMP DEFAULT NOW(),
      submitted_at TIMESTAMP,
      code_execution_results JSONB,
      ai_grading_results JSONB,
      time_taken INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- AI Interviews table
    CREATE TABLE IF NOT EXISTS ai_interviews (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      application_id TEXT NOT NULL REFERENCES applications(id),
      candidate_id TEXT NOT NULL REFERENCES users(id),
      type TEXT DEFAULT 'TECHNICAL' CHECK (type IN ('TECHNICAL', 'BEHAVIORAL', 'CULTURE_FIT')),
      status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
      job_context JSONB DEFAULT '{}',
      resume_context JSONB DEFAULT '{}',
      messages JSONB DEFAULT '[]',
      questions_asked INTEGER DEFAULT 0,
      max_questions INTEGER DEFAULT 10,
      overall_score REAL,
      score_breakdown JSONB,
      analysis TEXT,
      strengths TEXT[] DEFAULT '{}',
      weaknesses TEXT[] DEFAULT '{}',
      started_at TIMESTAMP,
      completed_at TIMESTAMP,
      duration INTEGER,
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- Ratings table
    CREATE TABLE IF NOT EXISTS ratings (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      application_id TEXT UNIQUE NOT NULL REFERENCES applications(id),
      candidate_id TEXT NOT NULL REFERENCES users(id),
      job_id TEXT NOT NULL REFERENCES jobs(id),
      resume_score REAL DEFAULT 0,
      assessment_score REAL DEFAULT 0,
      ai_interview_score REAL DEFAULT 0,
      f2f_interview_score REAL DEFAULT 0,
      overall_score REAL DEFAULT 0,
      breakdown JSONB DEFAULT '{}',
      recommendation TEXT DEFAULT 'maybe',
      shows_promise BOOLEAN DEFAULT false,
      analysis TEXT,
      strengths TEXT[] DEFAULT '{}',
      weaknesses TEXT[] DEFAULT '{}',
      calculated_at TIMESTAMP DEFAULT NOW()
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
    CREATE INDEX IF NOT EXISTS idx_jobs_posted_by ON jobs(posted_by);
    CREATE INDEX IF NOT EXISTS idx_applications_job ON applications(job_id);
    CREATE INDEX IF NOT EXISTS idx_applications_candidate ON applications(candidate_id);
    CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
    CREATE INDEX IF NOT EXISTS idx_pipelines_created_by ON pipelines(created_by);
  `);
    // Add linked_job_id column if not exists
  await query(`
    DO $$ BEGIN
      ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS linked_job_id TEXT REFERENCES jobs(id);
    EXCEPTION WHEN OTHERS THEN NULL;
    END $$;
  `);
  console.log("Database schema initialized");
}

  // Fix submissions table — ensure assessment_id can accept pipeline node IDs
  await query(`
    DO $$ BEGIN
      ALTER TABLE submissions ALTER COLUMN assessment_id TYPE TEXT;
      ALTER TABLE submissions ALTER COLUMN max_score SET DEFAULT 100;
    EXCEPTION WHEN OTHERS THEN NULL;
    END $$;
  `);

  // Drop the foreign key constraint on assessment_id if it exists
  // (because we now use pipeline node IDs which aren't in the assessments table)
  await query(`
    DO $$ BEGIN
      ALTER TABLE submissions DROP CONSTRAINT IF EXISTS submissions_assessment_id_fkey;
    EXCEPTION WHEN OTHERS THEN NULL;
    END $$;
  `);