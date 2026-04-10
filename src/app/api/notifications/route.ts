import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, queryMany } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    const notifications = await queryMany(
      "SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50",
      [userId]
    );

    const unreadResult = await queryOne(
      "SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false",
      [userId]
    );

    return NextResponse.json({
      notifications,
      unreadCount: parseInt(unreadResult?.count || "0"),
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();

    if (body.markAllRead) {
      await query(
        "UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false",
        [userId]
      );
    } else if (body.notificationId) {
      await query(
        "UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2",
        [body.notificationId, userId]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}