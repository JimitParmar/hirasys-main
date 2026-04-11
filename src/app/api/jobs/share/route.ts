import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["HR", "ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobId, platforms } = await req.json();

    const job = await queryOne(
      `SELECT j.*, u.company FROM jobs j LEFT JOIN users u ON j.posted_by = u.id WHERE j.id = $1`,
      [jobId]
    );

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const jobUrl = `${appUrl}/jobs/${job.id}`;

    const links: Record<string, string> = {};

    // Generate share links for each platform
    if (platforms.includes("linkedin")) {
      const text = encodeURIComponent(
        `🚀 We're hiring: ${job.title} at ${job.company || "our company"}!\n\n` +
        `📍 ${job.location} | ${job.type === "full_time" ? "Full Time" : job.type}\n` +
        `💰 ${job.salary_min ? `${job.salary_currency} ${job.salary_min}-${job.salary_max}` : "Competitive"}\n\n` +
        `Apply now and get instant AI feedback on your application:\n${jobUrl}\n\n` +
        `#hiring #${job.department?.toLowerCase() || "tech"} #jobs`
      );
      links.linkedin = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(jobUrl)}&summary=${text}`;
    }

    if (platforms.includes("twitter")) {
      const text = encodeURIComponent(
        `🚀 Hiring: ${job.title} (${job.location})\n\n` +
        `Apply and get instant AI feedback:\n${jobUrl}\n\n` +
        `#hiring #jobs #${job.department?.toLowerCase() || "tech"}`
      );
      links.twitter = `https://twitter.com/intent/tweet?text=${text}`;
    }

    if (platforms.includes("indeed")) {
      links.indeed = `https://www.indeed.com/hire/post-a-job`;
      links.indeed_note = "Copy job details and paste on Indeed. Direct API integration coming soon.";
    }

    if (platforms.includes("wellfound")) {
      links.wellfound = `https://wellfound.com/recruit/overview`;
      links.wellfound_note = "Post on Wellfound/AngelList with a link back to Hirasys for assessments.";
    }

    if (platforms.includes("naukri")) {
      links.naukri = `https://www.naukri.com/employers/dashboard`;
      links.naukri_note = "Post on Naukri with application link pointing to Hirasys.";
    }

    // Generate embed code
    const embedCode = `<!-- Hirasys Job Widget -->
<a href="${jobUrl}" target="_blank" style="display:inline-block;padding:12px 24px;background:#0245EF;color:white;border-radius:8px;text-decoration:none;font-family:sans-serif;font-weight:600;">
  Apply for ${job.title} →
</a>`;

    // Generate direct apply URL (can be pasted anywhere)
    const directUrl = jobUrl;

    return NextResponse.json({
      success: true,
      links,
      embedCode,
      directUrl,
      jobDetails: {
        title: job.title,
        company: job.company,
        location: job.location,
        type: job.type,
        description: job.description?.substring(0, 500),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}