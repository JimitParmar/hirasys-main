import { NextRequest, NextResponse } from "next/server";

const ROUTE_RULES: {
  prefix: string;
  roles: string[] | "public" | "auth";
}[] = [
  { prefix: "/login", roles: "public" },
  { prefix: "/register", roles: "public" },
  { prefix: "/invite", roles: "public" },
  { prefix: "/reset-password", roles: "public" },
  { prefix: "/landing", roles: "public" },
  { prefix: "/jobs", roles: "public" },
  { prefix: "/feedback", roles: "public" },

  { prefix: "/hr/billing", roles: ["ADMIN"] },
  { prefix: "/hr/audit", roles: ["ADMIN"] },
  { prefix: "/hr/team", roles: ["ADMIN"] },
  { prefix: "/hr/settings", roles: ["ADMIN"] },

  { prefix: "/hr", roles: ["ADMIN", "HR", "INTERVIEWER"] },

  { prefix: "/candidate", roles: ["CANDIDATE"] },
  { prefix: "/applications", roles: ["CANDIDATE", "HR", "ADMIN"] },

  { prefix: "/settings", roles: "auth" },
  { prefix: "/profile", roles: "auth" },
];

function getSessionFromCookie(
  req: NextRequest
): { id: string; role: string; email: string } | null {
  const allCookies = req.cookies.getAll();

  // LOG: See all cookies
  console.log(
    "[MW] Cookies:",
    allCookies.map((c) => `${c.name} (${c.value.length} chars)`)
  );

  for (const cookie of allCookies) {
    const value = cookie.value;
    const parts = value.split(".");

    // LOG: Check each cookie
    console.log(
      `[MW] Checking ${cookie.name}: parts=${parts.length}, length=${value.length}`
    );

    if (parts.length === 3) {
      try {
        const payload = JSON.parse(
          atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
        );
        console.log(`[MW] Decoded ${cookie.name}:`, JSON.stringify(payload).substring(0, 200));

        if (payload.role || payload.id || payload.sub || payload.email) {
          console.log(`[MW] ✅ Found session in ${cookie.name}: role=${payload.role}`);
          return {
            id: (payload.id || payload.sub || "") as string,
            role: (payload.role || "CANDIDATE") as string,
            email: (payload.email || "") as string,
          };
        }
      } catch (err) {
        console.log(`[MW] Failed to decode ${cookie.name}:`, (err as any).message);
        continue;
      }
    }
  }

  console.log("[MW] ❌ No session found in any cookie");
  return null;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip static/API
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Find rule
  const rule = ROUTE_RULES.find((r) => pathname.startsWith(r.prefix));

  // No rule or public
  if (!rule || rule.roles === "public") {
    return NextResponse.next();
  }

  // Get session
  const session = getSessionFromCookie(req);

  // Not logged in
  if (!session) {
    // Don't redirect on every page — only on clearly protected ones
    // This prevents redirect loops
    if (pathname.startsWith("/hr") || pathname.startsWith("/candidate")) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    // For other paths, let the page handle auth
    return NextResponse.next();
  }

  // Any authenticated user
  if (rule.roles === "auth") {
    return NextResponse.next();
  }

  // Check role
  if (!rule.roles.includes(session.role)) {
    let redirectPath = "/login";
    switch (session.role) {
      case "ADMIN":
      case "HR":
      case "INTERVIEWER":
        redirectPath = "/hr/dashboard";
        break;
      case "CANDIDATE":
        redirectPath = "/jobs";
        break;
    }

    // Prevent redirect loop
    if (pathname === redirectPath) {
      return NextResponse.next();
    }

    return NextResponse.redirect(new URL(redirectPath, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)"],
};