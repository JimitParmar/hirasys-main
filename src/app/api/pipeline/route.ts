import { NextRequest, NextResponse } from "next/server";
import { queryOne, queryMany, query } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["HR", "ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const pipeline = await queryOne(
        `SELECT p.*,
          j.title as linked_job_title
         FROM pipelines p
         LEFT JOIN jobs j ON p.linked_job_id = j.id
         WHERE p.id = $1`,
        [id]
      );
      return NextResponse.json({ pipeline });
    }

    const pipelines = await queryMany(
      `SELECT p.*,
        j.title as linked_job_title,
        (SELECT COUNT(*) FROM jobs jc WHERE jc.pipeline_id = p.id) as job_count
       FROM pipelines p
       LEFT JOIN jobs j ON p.linked_job_id = j.id
       WHERE p.created_by = $1 OR p.is_template = true
       ORDER BY p.updated_at DESC`,
      [(session.user as any).id]
    );

    return NextResponse.json({ pipelines });
  } catch (error: any) {
    console.error("Pipeline fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["HR", "ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const linkedJobId = body.linkedJobId && body.linkedJobId !== "none"
      ? body.linkedJobId
      : null;

    if (body.id) {
      // Update existing pipeline
      // If it has nodes and a linked job, mark as ACTIVE
      const nodes = body.nodes || [];
      const hasNodes = Array.isArray(nodes) && nodes.length > 0;
      const status = hasNodes ? "ACTIVE" : "DRAFT";

      const pipeline = await queryOne(
        `UPDATE pipelines
         SET name = COALESCE($2, name),
             nodes = $3,
             edges = $4,
             estimated_cost = COALESCE($5, estimated_cost),
             linked_job_id = $6,
             status = $7,
             updated_at = NOW()
         WHERE id = $1 AND created_by = $8
         RETURNING *`,
        [
          body.id,
          body.name,
          JSON.stringify(body.nodes || []),
          JSON.stringify(body.edges || []),
          body.estimatedCost || 0,
          linkedJobId,
          status,
          (session.user as any).id,
        ]
      );

      // Update job linkage
      if (linkedJobId) {
        await query("UPDATE jobs SET pipeline_id = NULL WHERE pipeline_id = $1", [body.id]);
        await query("UPDATE jobs SET pipeline_id = $1 WHERE id = $2", [body.id, linkedJobId]);
      } else {
        await query("UPDATE jobs SET pipeline_id = NULL WHERE pipeline_id = $1", [body.id]);
      }

      return NextResponse.json({ success: true, pipeline });
    }

    // Create new pipeline
    const nodes = body.nodes || [];
    const hasNodes = Array.isArray(nodes) && nodes.length > 0;
    const status = hasNodes ? "ACTIVE" : "DRAFT";

    const pipeline = await queryOne(
      `INSERT INTO pipelines (name, status, nodes, edges, estimated_cost, linked_job_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        body.name || "Untitled Pipeline",
        status,
        JSON.stringify(nodes),
        JSON.stringify(body.edges || []),
        body.estimatedCost || 0,
        linkedJobId,
        (session.user as any).id,
      ]
    );

    // Link job
    if (linkedJobId && pipeline) {
      await query("UPDATE jobs SET pipeline_id = $1 WHERE id = $2", [pipeline.id, linkedJobId]);
    }

    return NextResponse.json({ success: true, pipeline }, { status: 201 });
  } catch (error: any) {
    console.error("Pipeline save error:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}