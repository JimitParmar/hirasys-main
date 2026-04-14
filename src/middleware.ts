import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// ==========================================
// ROUTE ACCESS RULES (first match wins)
// Order matters — more specific routes first
// ==========================================
const ROUTE_RULES: {
  prefix: string;
  roles: string[] | "public" | "auth";
}[] = [
  // Public — anyone
  { prefix: "/login", roles: "public" },
  { prefix: "/register", roles: "public" },
  { prefix: "/invite", roles: "public" },
  { prefix: "/reset-password", roles: "public" },
  { prefix: "/landing", roles: "public" },
  { prefix: "/jobs", roles: "public" },
  { prefix: "/feedback", roles: "public" },

  // ADMIN only
  { prefix: "/hr/billing", roles: ["ADMIN"] },
  { prefix: "/hr/audit", roles: ["ADMIN"] },
  { prefix: "/hr/team", roles: ["ADMIN"] },
  { prefix: "/hr/settings", roles: ["ADMIN"] },

  // HR + ADMIN + INTERVIEWER
  { prefix: "/hr", roles: ["ADMIN", "HR", "INTERVIEWER"] },

  // Candidate
  { prefix: "/candidate", roles: ["CANDIDATE"] },
  { prefix: "/applications", roles: ["CANDIDATE", "HR", "ADMIN"] },

  // Any logged-in user
  { prefix: "/settings", roles: "auth" },
  { prefix: "/profile", roles: "auth" },
];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Find the first matching rule
  const rule = ROUTE_RULES.find((r) => pathname.startsWith(r.prefix));

  // No rule or public route → allow
  if (!rule || rule.roles === "public") {
    return NextResponse.next();
  }

  // Get session — NextAuth attaches it to req.auth
  const session = req.auth;
  const userRole = (session?.user as any)?.role as string | undefined;

  // ==========================================
  // NOT LOGGED IN → redirect to login
  // ==========================================
  if (!session || !session.user) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ==========================================
  // "auth" = any authenticated user → allow
  // ==========================================
  if (rule.roles === "auth") {
    return NextResponse.next();
  }

  // ==========================================
  // CHECK ROLE
  // ==========================================
  if (!userRole || !rule.roles.includes(userRole)) {
    console.log(
      `[Middleware] Blocked: ${session.user.email} (${userRole || "unknown"}) tried to access ${pathname}`
    );

    // Redirect to their appropriate dashboard
    const redirectUrl = getRoleHome(userRole);
    return NextResponse.redirect(new URL(redirectUrl, req.url));
  }

  // ✅ Access granted
  return NextResponse.next();
});

function getRoleHome(role: string | undefined): string {
  switch (role) {
    case "ADMIN":
    case "HR":
    case "INTERVIEWER":
      return "/hr/dashboard";
    case "CANDIDATE":
      return "/jobs";
    default:
      return "/login";
  }
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)"],
};