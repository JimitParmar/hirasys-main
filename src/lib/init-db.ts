import { NextResponse } from "next/server";
import { query } from "./db"; // Adjust this import path to your actual db file

// 1. Force Next.js to never cache or pre-render this file during build
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

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
    await query(`
  CREATE TABLE IF NOT EXISTS ai_cache (
    cache_key TEXT PRIMARY KEY,
    value JSONB,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_cache_expires ON ai_cache(expires_at);
`);
  await query(`
    DO $$ BEGIN
      ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS linked_job_id TEXT REFERENCES jobs(id);
    EXCEPTION WHEN OTHERS THEN NULL;
    END $$;
  `);

  await query(`
    DO $$ BEGIN
      ALTER TABLE submissions ALTER COLUMN assessment_id TYPE TEXT;
      ALTER TABLE submissions ALTER COLUMN max_score SET DEFAULT 100;
    EXCEPTION WHEN OTHERS THEN NULL;
    END $$;
  `);

  await query(`
    DO $$ BEGIN
      ALTER TABLE submissions DROP CONSTRAINT IF EXISTS submissions_assessment_id_fkey;
    EXCEPTION WHEN OTHERS THEN NULL;
    END $$;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS f2f_interviews (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      application_id TEXT NOT NULL,
      candidate_id TEXT NOT NULL,
      interviewer_id TEXT NOT NULL,
      scheduled_at TIMESTAMP NOT NULL,
      duration INTEGER DEFAULT 60,
      meeting_link TEXT,
      status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
      interview_type TEXT DEFAULT 'technical',
      notes TEXT,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS interview_feedback (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      interview_id TEXT NOT NULL,
      interviewer_id TEXT NOT NULL,
      technical_score INTEGER DEFAULT 0,
      communication_score INTEGER DEFAULT 0,
      problem_solving_score INTEGER DEFAULT 0,
      culture_fit_score INTEGER DEFAULT 0,
      overall_score INTEGER DEFAULT 0,
      recommendation TEXT DEFAULT 'maybe',
      strengths TEXT,
      concerns TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_f2f_application ON f2f_interviews(application_id);
    CREATE INDEX IF NOT EXISTS idx_f2f_scheduled ON f2f_interviews(scheduled_at);
    CREATE INDEX IF NOT EXISTS idx_feedback_interview ON interview_feedback(interview_id);
  `);

  await query(`
    DO $$ BEGIN
      ALTER TABLE f2f_interviews ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
    EXCEPTION WHEN OTHERS THEN NULL;
    END $$;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS integrations (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id TEXT NOT NULL,
      platform TEXT NOT NULL,
      api_key TEXT,
      api_secret TEXT,
      access_token TEXT,
      refresh_token TEXT,
      config JSONB DEFAULT '{}',
      is_active BOOLEAN DEFAULT true,
      last_synced_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, platform)
    );

    CREATE TABLE IF NOT EXISTS job_postings_external (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      job_id TEXT NOT NULL,
      platform TEXT NOT NULL,
      external_id TEXT,
      external_url TEXT,
      status TEXT DEFAULT 'PENDING',
      response JSONB,
      posted_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_integrations_user ON integrations(user_id);
    CREATE INDEX IF NOT EXISTS idx_external_postings_job ON job_postings_external(job_id);
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      name TEXT NOT NULL,
      domain TEXT,
      logo_url TEXT,
      plan TEXT DEFAULT 'FREE',
      settings JSONB DEFAULT '{}',
      created_by TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Add company_id to users
    DO $$ BEGIN
      ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS invited_by TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';
    EXCEPTION WHEN OTHERS THEN NULL;
    END $$;

    -- Team invitations
    CREATE TABLE IF NOT EXISTS invitations (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      company_id TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'HR',
      invited_by TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      status TEXT DEFAULT 'PENDING',
      accepted_at TIMESTAMP,
      expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '7 days',
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- Audit log
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      company_id TEXT,
      user_id TEXT NOT NULL,
      user_name TEXT,
      user_email TEXT,
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT,
      resource_name TEXT,
      details JSONB DEFAULT '{}',
      ip_address TEXT,
      user_agent TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_companies_created_by ON companies(created_by);
    CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
    CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
    CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
    CREATE INDEX IF NOT EXISTS idx_audit_company ON audit_logs(company_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource_type, resource_id);
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS billing_plans (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      price_monthly DECIMAL(10,2) DEFAULT 0,
      price_yearly DECIMAL(10,2) DEFAULT 0,
      currency TEXT DEFAULT 'USD',
      credits_included DECIMAL(10,2) DEFAULT 0,
      features JSONB DEFAULT '{}',
      limits JSONB DEFAULT '{}',
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS company_subscriptions (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      company_id TEXT NOT NULL UNIQUE,
      plan_id TEXT NOT NULL,
      status TEXT DEFAULT 'ACTIVE',
      billing_cycle TEXT DEFAULT 'MONTHLY',
      current_period_start TIMESTAMP DEFAULT NOW(),
      current_period_end TIMESTAMP DEFAULT NOW() + INTERVAL '30 days',
      credits_used DECIMAL(10,2) DEFAULT 0,
      credits_remaining DECIMAL(10,2) DEFAULT 0,
      payment_method JSONB,
      razorpay_subscription_id TEXT,
      stripe_subscription_id TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS usage_records (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      company_id TEXT NOT NULL,
      user_id TEXT,
      node_type TEXT NOT NULL,
      unit_count INTEGER DEFAULT 1,
      unit_cost DECIMAL(10,4) NOT NULL,
      total_cost DECIMAL(10,4) NOT NULL,
      job_id TEXT,
      application_id TEXT,
      description TEXT,
      is_credited BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      company_id TEXT NOT NULL,
      period_start TIMESTAMP NOT NULL,
      period_end TIMESTAMP NOT NULL,
      plan_name TEXT,
      base_amount DECIMAL(10,2) DEFAULT 0,
      usage_amount DECIMAL(10,2) DEFAULT 0,
      credits_applied DECIMAL(10,2) DEFAULT 0,
      total_amount DECIMAL(10,2) DEFAULT 0,
      currency TEXT DEFAULT 'USD',
      status TEXT DEFAULT 'PENDING',
      payment_id TEXT,
      line_items JSONB DEFAULT '[]',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_usage_company ON usage_records(company_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_usage_node ON usage_records(node_type);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_company ON company_subscriptions(company_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_company ON invoices(company_id);

    -- Seed default plans if not exist
    INSERT INTO billing_plans (name, slug, price_monthly, price_yearly, currency, credits_included, features, limits)
    VALUES
      ('Free', 'free', 0, 0, 'USD', 0, '{"jobs": 3, "resumeScreens": 50, "assessments": 10, "aiInterviews": 5, "pipelineBuilder": true, "templates": "basic"}', '{"maxJobs": 3, "maxApplicantsPerJob": 100}'),
      ('Pro', 'pro', 179, 1699, 'USD', 500, '{"jobs": "unlimited", "resumeScreens": "unlimited", "assessments": "unlimited", "aiInterviews": "unlimited", "pipelineBuilder": true, "aiGenerate": true, "templates": "all", "integrations": true, "priority_support": true}', '{"maxJobs": -1, "maxApplicantsPerJob": -1}'),
      ('Enterprise', 'enterprise', 599, 5699, 'USD', 2000, '{"jobs": "unlimited", "resumeScreens": "unlimited", "assessments": "unlimited", "aiInterviews": "unlimited", "pipelineBuilder": true, "aiGenerate": true, "customNodes": true, "sso": true, "templates": "all", "integrations": true, "dedicated_support": true, "audit_logs": true}', '{"maxJobs": -1, "maxApplicantsPerJob": -1}')
    ON CONFLICT (slug) DO NOTHING;
  `);

    // Add to init-db.ts
  await query(`
    CREATE TABLE IF NOT EXISTS payment_orders (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      company_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      plan_id TEXT NOT NULL,
      plan_slug TEXT NOT NULL,
      billing_cycle TEXT DEFAULT 'MONTHLY',
      amount DECIMAL(10,2) NOT NULL,
      currency TEXT DEFAULT 'USD',
      provider TEXT NOT NULL DEFAULT 'razorpay',
      provider_order_id TEXT,
      provider_payment_id TEXT,
      provider_subscription_id TEXT,
      status TEXT DEFAULT 'CREATED' CHECK (status IN ('CREATED', 'AUTHORIZED', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED')),
      paid_at TIMESTAMP,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_payment_orders_company ON payment_orders(company_id);
    CREATE INDEX IF NOT EXISTS idx_payment_orders_provider ON payment_orders(provider_order_id);
    CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON payment_orders(status);

    -- Add razorpay_plan_id to billing_plans
    DO $$ BEGIN
      ALTER TABLE billing_plans ADD COLUMN IF NOT EXISTS razorpay_plan_id TEXT;
      ALTER TABLE billing_plans ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;
    EXCEPTION WHEN OTHERS THEN NULL;
    END $$;
  `);
  await query(`
  CREATE TABLE IF NOT EXISTS password_resets (
    user_id TEXT PRIMARY KEY REFERENCES users(id),
    token TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
`);

await query(`
  DO $$ BEGIN
    ALTER TABLE submissions ADD COLUMN IF NOT EXISTS proctoring_events JSONB DEFAULT '[]';
    ALTER TABLE submissions ADD COLUMN IF NOT EXISTS proctoring_summary JSONB;
  EXCEPTION WHEN OTHERS THEN NULL;
  END $$;
`);
  console.log("Database schema initialized successfully");
}
