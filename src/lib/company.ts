import { queryOne, queryMany } from "./db";

// Get the company ID for a user
export async function getUserCompanyId(userId: string): Promise<string | null> {
  const user = await queryOne(
    "SELECT company_id FROM users WHERE id = $1",
    [userId]
  );
  return user?.company_id || null;
}

// Get all user IDs in the same company
export async function getCompanyUserIds(userId: string): Promise<string[]> {
  const user = await queryOne(
    "SELECT company_id FROM users WHERE id = $1",
    [userId]
  );

  if (!user?.company_id) {
    // No company — return just this user
    return [userId];
  }

  const members = await queryMany(
    "SELECT id FROM users WHERE company_id = $1 AND is_active = true",
    [user.company_id]
  );

  return members.map((m: any) => m.id);
}

// Build a SQL IN clause for company members
export async function getCompanyFilter(userId: string): Promise<{ companyId: string | null; userIds: string[]; inClause: string; params: string[] }> {
  const user = await queryOne(
    "SELECT company_id FROM users WHERE id = $1",
    [userId]
  );

  if (!user?.company_id) {
    return {
      companyId: null,
      userIds: [userId],
      inClause: `= '${userId}'`,
      params: [userId],
    };
  }

  const members = await queryMany(
    "SELECT id FROM users WHERE company_id = $1 AND is_active = true",
    [user.company_id]
  );

  const ids = members.map((m: any) => m.id);

  return {
    companyId: user.company_id,
    userIds: ids,
    inClause: `IN (${ids.map((_: any, i: number) => `$${i + 1}`).join(", ")})`,
    params: ids,
  };
}