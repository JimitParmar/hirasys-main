export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, queryMany } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["HR", "ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobId, platforms } = await req.json();
    const userId = (session.user as any).id;

    const job = await queryOne(
      `SELECT j.*, u.company FROM jobs j LEFT JOIN users u ON j.posted_by = u.id WHERE j.id = $1`,
      [jobId]
    );

    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const applyUrl = `${appUrl}/jobs/${job.id}`;

    const results: Record<string, any> = {};

    for (const platform of platforms) {
      const integration = await queryOne(
        "SELECT * FROM integrations WHERE user_id = $1 AND platform = $2 AND is_active = true",
        [userId, platform]
      );

      if (!integration) {
        results[platform] = { success: false, error: "Integration not configured" };
        continue;
      }

      try {
        let result;

        switch (platform) {
          case "linkedin":
            result = await postToLinkedIn(job, integration, applyUrl);
            break;
          case "indeed":
            result = await postToIndeed(job, integration, applyUrl);
            break;
          case "naukri":
            result = await postToNaukri(job, integration, applyUrl);
            break;
          case "custom_webhook":
            result = await postToWebhook(job, integration, applyUrl);
            break;
          default:
            result = { success: false, error: "Unsupported platform" };
        }

        // Save external posting record
        await query(
  `INSERT INTO job_postings_external (job_id, platform, external_id, external_url, status, response, posted_at)
   VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
  [
    jobId,
    platform,
    (result as any).externalId || null,
    (result as any).url || null,
    result.success ? "POSTED" : "FAILED",
    JSON.stringify(result),
  ]
);
        // Update integration last synced
        await query(
          "UPDATE integrations SET last_synced_at = NOW() WHERE id = $1",
          [integration.id]
        );

        results[platform] = result;
      } catch (err: any) {
        results[platform] = { success: false, error: err.message };
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ==========================================
// LINKEDIN JOB POSTING API
// ==========================================
async function postToLinkedIn(job: any, integration: any, applyUrl: string) {
  const accessToken = integration.access_token;
  if (!accessToken) return { success: false, error: "No access token. Connect LinkedIn first." };

  let config = integration.config;
  try { if (typeof config === "string") config = JSON.parse(config); } catch { config = {}; }

  const companyId = config.companyId || config.organizationId;
  if (!companyId) return { success: false, error: "Company/Organization ID not set in integration config." };

  try {
    // LinkedIn Job Posting API
    const res = await fetch("https://api.linkedin.com/v2/simpleJobPostings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        integrationContext: `urn:li:organization:${companyId}`,
        jobPostingOperationType: "CREATE",
        jobPostings: [{
          title: job.title,
          description: {
            text: `${job.description}\n\nApply here: ${applyUrl}`,
          },
          location: job.location,
          listedAt: Date.now(),
          jobPostingType: "STANDARD",
          workplaceTypes: [job.location?.toLowerCase().includes("remote") ? "REMOTE" : "ON_SITE"],
          externalApplyUrl: applyUrl,
        }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return { success: false, error: `LinkedIn API error: ${res.status} — ${err}` };
    }

    const data = await res.json();
    return {
      success: true,
      externalId: data.elements?.[0]?.jobPostingUrn,
      url: `https://www.linkedin.com/jobs/view/${data.elements?.[0]?.jobPostingUrn?.split(":").pop()}`,
      platform: "linkedin",
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ==========================================
// INDEED JOB POSTING API
// ==========================================
async function postToIndeed(job: any, integration: any, applyUrl: string) {
  const apiKey = integration.api_key;
  if (!apiKey) return { success: false, error: "No API key configured." };

  let config = integration.config;
  try { if (typeof config === "string") config = JSON.parse(config); } catch { config = {}; }

  const employerId = config.employerId;
  if (!employerId) return { success: false, error: "Employer ID not set in integration config." };

  try {
    // Indeed XML Feed approach (most common)
    // Indeed doesn't have a simple REST API for free — they use XML feeds
    // For sponsored jobs, they have a different API

    // For MVP: Generate an Indeed-compatible XML that HR can submit
    const xmlFeed = `<?xml version="1.0" encoding="utf-8"?>
<source>
  <publisher>Hirasys</publisher>
  <publisherurl>${process.env.NEXT_PUBLIC_APP_URL}</publisherurl>
  <job>
    <title><![CDATA[${job.title}]]></title>
    <date>${new Date().toISOString().split('T')[0]}</date>
    <referencenumber>${job.id}</referencenumber>
    <url><![CDATA[${applyUrl}]]></url>
    <company><![CDATA[${job.company || "Company"}]]></company>
    <city><![CDATA[${job.location}]]></city>
    <description><![CDATA[${job.description}]]></description>
    <salary><![CDATA[${job.salary_min ? `${job.salary_currency} ${job.salary_min}-${job.salary_max}` : "Competitive"}]]></salary>
    <jobtype><![CDATA[${job.type === "full_time" ? "fulltime" : job.type}]]></jobtype>
    <category><![CDATA[${job.department}]]></category>
  </job>
</source>`;

    return {
      success: true,
      platform: "indeed",
      note: "Indeed uses XML feeds. Submit this feed URL to Indeed employer dashboard.",
      xmlFeed,
      url: `https://employers.indeed.com/jobs`,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ==========================================
// NAUKRI JOB POSTING API
// ==========================================
async function postToNaukri(job: any, integration: any, applyUrl: string) {
  const apiKey = integration.api_key;
  if (!apiKey) return { success: false, error: "No API key configured." };

  let config = integration.config;
  try { if (typeof config === "string") config = JSON.parse(config); } catch { config = {}; }

  try {
    // Naukri Partner API
    const res = await fetch("https://api.naukri.com/v1/jobs", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Naukri-Partner-Id": config.partnerId || "",
      },
      body: JSON.stringify({
        title: job.title,
        description: job.description,
        location: job.location,
        experience: { min: job.experience_min, max: job.experience_max },
        salary: job.salary_min ? { min: job.salary_min, max: job.salary_max, currency: job.salary_currency } : undefined,
        skills: job.skills,
        applyUrl,
        jobType: job.type === "full_time" ? "Full Time" : job.type,
        department: job.department,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return { success: false, error: `Naukri API error: ${res.status} — ${err}` };
    }

    const data = await res.json();
    return {
      success: true,
      externalId: data.jobId,
      url: data.jobUrl || `https://www.naukri.com/job-listings-${job.title.replace(/\s+/g, "-")}`,
      platform: "naukri",
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ==========================================
// CUSTOM WEBHOOK
// ==========================================
async function postToWebhook(job: any, integration: any, applyUrl: string) {
  let config = integration.config;
  try { if (typeof config === "string") config = JSON.parse(config); } catch { config = {}; }

  const webhookUrl = config.webhookUrl;
  if (!webhookUrl) return { success: false, error: "Webhook URL not configured." };

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(integration.api_key ? { "Authorization": `Bearer ${integration.api_key}` } : {}),
      },
      body: JSON.stringify({
        event: "job.published",
        job: {
          id: job.id,
          title: job.title,
          description: job.description,
          location: job.location,
          type: job.type,
          department: job.department,
          skills: job.skills,
          requirements: job.requirements,
          salary: { min: job.salary_min, max: job.salary_max, currency: job.salary_currency },
          experience: { min: job.experience_min, max: job.experience_max },
          applyUrl,
        },
        timestamp: new Date().toISOString(),
      }),
    });

    return {
      success: res.ok,
      platform: "custom_webhook",
      statusCode: res.status,
      url: webhookUrl,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}