import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function getSession() {
  return await auth();
}

export async function requireAuth() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return session;
}

export async function requireRole(roles: string[]) {
  const session = await requireAuth();

  if (!roles.includes((session.user as any).role)) {
    redirect("/login");
  }

  return session;
}