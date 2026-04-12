export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, queryMany } from "@/lib/db";
import { getSession } from "@/lib/session";

// GET — list user's integrations
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = (session.user as any).id;
    const integrations = await queryMany(
      "SELECT id, platform, is_active, config, last_synced_at, created_at FROM integrations WHERE user_id = $1",
      [userId]
    );

    // Don't send API keys to client — just whether they're set
    const safe = integrations.map((i: any) => ({
      ...i,
      hasApiKey: !!i.api_key,
      hasAccessToken: !!i.access_token,
    }));

    return NextResponse.json({ integrations: safe });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST — add/update integration
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["HR", "ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { platform, apiKey, apiSecret, accessToken, config } = await req.json();

    if (!platform) {
      return NextResponse.json({ error: "Platform required" }, { status: 400 });
    }

    const validPlatforms = ["linkedin", "indeed", "naukri", "wellfound", "custom_webhook"];
    if (!validPlatforms.includes(platform)) {
      return NextResponse.json({ error: `Invalid platform. Use: ${validPlatforms.join(", ")}` }, { status: 400 });
    }

    // Upsert
    const existing = await queryOne(
      "SELECT id FROM integrations WHERE user_id = $1 AND platform = $2",
      [userId, platform]
    );

    let integration;
    if (existing) {
      const updates: string[] = ["updated_at = NOW()"];
      const values: any[] = [];
      let idx = 3;

      if (apiKey !== undefined) { updates.push(`api_key = $${idx}`); values.push(apiKey); idx++; }
      if (apiSecret !== undefined) { updates.push(`api_secret = $${idx}`); values.push(apiSecret); idx++; }
      if (accessToken !== undefined) { updates.push(`access_token = $${idx}`); values.push(accessToken); idx++; }
      if (config !== undefined) { updates.push(`config = $${idx}`); values.push(JSON.stringify(config)); idx++; }

      integration = await queryOne(
        `UPDATE integrations SET ${updates.join(", ")} WHERE user_id = $1 AND platform = $2 RETURNING id, platform, is_active, config`,
        [userId, platform, ...values]
      );
    } else {
      integration = await queryOne(
        `INSERT INTO integrations (user_id, platform, api_key, api_secret, access_token, config)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, platform, is_active, config`,
        [userId, platform, apiKey || null, apiSecret || null, accessToken || null, JSON.stringify(config || {})]
      );
    }

    return NextResponse.json({ success: true, integration });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE — remove integration
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { platform } = await req.json();
    await query(
      "DELETE FROM integrations WHERE user_id = $1 AND platform = $2",
      [(session.user as any).id, platform]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}