export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { queryOne, queryMany, query } from "@/lib/db";
import { getSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { getCompanyUserIds } from "@/lib/company";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["HR", "ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const userId = (session.user as any).id;

    if (id) {
      const pipeline = await queryOne(
        `SELECT p.*,
          (SELECT json_agg(json_build_object('id', j.id, 'title', j.title, 'status', j.status))
           FROM jobs j WHERE j.pipeline_id = p.id) as linked_jobs
         FROM pipelines p WHERE p.id = $1`,
        [id]
      );
      return NextResponse.json({ pipeline });
    }

    // Get ALL pipelines from company members
    const companyUserIds = await getCompanyUserIds(userId);

    let whereClause: string;
    let params: any[];

    if (companyUserIds.length > 1) {
      const placeholders = companyUserIds
        .map((_, i) => `$${i + 1}`)
        .join(", ");
      whereClause = `WHERE p.created_by IN (${placeholders}) OR p.is_template = true`;
      params = companyUserIds;
    } else {
      whereClause = "WHERE p.created_by = $1 OR p.is_template = true";
      params = [userId];
    }

    const pipelines = await queryMany(
      `SELECT p.*,
        u.first_name as creator_first_name,
        u.last_name as creator_last_name,
        (SELECT COUNT(*) FROM jobs j WHERE j.pipeline_id = p.id) as job_count,
        (SELECT string_agg(j.title, ', ') FROM jobs j WHERE j.pipeline_id = p.id LIMIT 3) as linked_job_titles
       FROM pipelines p
       LEFT JOIN users u ON p.created_by = u.id
       ${whereClause}
       ORDER BY p.updated_at DESC`,
      params
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

    const userId = (session.user as any).id;
    const body = await req.json();

    // Handle both single linkedJobId (old) and linkedJobIds array (new)
    let jobIds: string[] = [];
    if (body.linkedJobIds && Array.isArray(body.linkedJobIds)) {
      jobIds = body.linkedJobIds.filter(
        (id: string) => id && id !== "none"
      );
    } else if (body.linkedJobId && body.linkedJobId !== "none") {
      jobIds = [body.linkedJobId];
    }

    const linkedJobId = jobIds.length > 0 ? jobIds[0] : null;
    const hasNodes = Array.isArray(body.nodes) && body.nodes.length > 0;
    const status = hasNodes ? "ACTIVE" : "DRAFT";
    const nodeCount = (body.nodes || []).length;
    const edgeCount = (body.edges || []).length;

    // ==========================================
    // UPDATE EXISTING
    // ==========================================
    if (body.id) {
      // Fetch old pipeline for change comparison
      const oldPipeline = await queryOne(
        "SELECT * FROM pipelines WHERE id = $1",
        [body.id]
      );

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
          userId,
        ]
      );

      if (!pipeline) {
        return NextResponse.json(
          { error: "Pipeline not found or unauthorized" },
          { status: 404 }
        );
      }

      // Update ALL job linkages
      await query(
        "UPDATE jobs SET pipeline_id = NULL WHERE pipeline_id = $1",
        [body.id]
      );

      for (const jobId of jobIds) {
        await query(
          "UPDATE jobs SET pipeline_id = $1 WHERE id = $2",
          [body.id, jobId]
        );
      }

      // ✅ AUDIT — after successful update
      let oldNodeCount = 0;
      try {
        const oldNodes =
          typeof oldPipeline?.nodes === "string"
            ? JSON.parse(oldPipeline.nodes)
            : oldPipeline?.nodes || [];
        oldNodeCount = oldNodes.length;
      } catch {}

      const changes: Record<string, any> = {};
      if (oldPipeline?.name !== body.name) {
        changes.name = { from: oldPipeline?.name, to: body.name };
      }
      if (oldNodeCount !== nodeCount) {
        changes.nodeCount = { from: oldNodeCount, to: nodeCount };
      }
      if (oldPipeline?.status !== status) {
        changes.status = { from: oldPipeline?.status, to: status };
      }

      await logAudit({
        userId,
        action: "PIPELINE_UPDATED",
        resourceType: "pipeline",
        resourceId: body.id,
        resourceName: pipeline.name,
        details: {
          ...(Object.keys(changes).length > 0 ? changes : {}),
          nodeCount,
          edgeCount,
          linkedJobs: jobIds.length,
          estimatedCost: body.estimatedCost || 0,
        },
        req,
      });

      return NextResponse.json({ success: true, pipeline });
    }

    // ==========================================
    // CREATE NEW
    // ==========================================
    const pipeline = await queryOne(
      `INSERT INTO pipelines (name, status, nodes, edges, estimated_cost, linked_job_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        body.name || "Untitled Pipeline",
        status,
        JSON.stringify(body.nodes || []),
        JSON.stringify(body.edges || []),
        body.estimatedCost || 0,
        linkedJobId,
        userId,
      ]
    );

    if (!pipeline) {
      return NextResponse.json(
        { error: "Failed to create pipeline" },
        { status: 500 }
      );
    }

    // Link all selected jobs
    for (const jobId of jobIds) {
      await query(
        "UPDATE jobs SET pipeline_id = $1 WHERE id = $2",
        [pipeline.id, jobId]
      );
    }

    // ✅ AUDIT — after successful create
    await logAudit({
      userId,
      action: "PIPELINE_CREATED",
      resourceType: "pipeline",
      resourceId: pipeline.id,
      resourceName: pipeline.name,
      details: {
        nodeCount,
        edgeCount,
        linkedJobs: jobIds.length,
        status,
        estimatedCost: body.estimatedCost || 0,
      },
      req,
    });

    return NextResponse.json({ success: true, pipeline }, { status: 201 });
  } catch (error: any) {
    console.error("Pipeline save error:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}