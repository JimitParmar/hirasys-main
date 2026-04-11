import { NextRequest, NextResponse } from "next/server";
import { queryMany } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = session.user as any;
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Only admins can view audit logs" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const resourceType = searchParams.get("resourceType");
    const userId = searchParams.get("userId");

    let where = "WHERE 1=1";
    const params: any[] = [];
    let idx = 1;

    if (user.companyId) {
      where += ` AND (company_id = $${idx} OR company_id IS NULL)`;
      params.push(user.companyId);
      idx++;
    }

    if (resourceType) {
      where += ` AND resource_type = $${idx}`;
      params.push(resourceType);
      idx++;
    }

    if (userId) {
      where += ` AND user_id = $${idx}`;
      params.push(userId);
      idx++;
    }

    const logs = await queryMany(
      `SELECT * FROM audit_logs ${where}
       ORDER BY created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, (page - 1) * limit]
    );

    return NextResponse.json({ logs, page, limit });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}