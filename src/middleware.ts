import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || ""
);

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

async function getSessionFromCookie(
  req: NextRequest
): Promise<{ id: string; role: string; email: string } | null> {
  // Find the session cookie
  const cookieNames = [
    "__Secure-authjs.session-token",
    "authjs.session-token",
    "__Secure-next-auth.session-token",
    "next-auth.session-token",
  ];

  let token: string | null = null;
  for (const name of cookieNames) {
    const cookie = req.cookies.get(name);
    if (cookie?.value) {
      token = cookie.value;
      break;
    }
  }

  if (!token) return null;

  // After the auth.ts change, token will be a plain JWT (HS256)
  // Verify and decode it
  try {
    const { payload } = await jwtVerify(token, SECRET, {
      algorithms: ["HS256"],
    });

    return {
      id: (payload.id || payload.sub || "") as string,
      role: (payload.role || "CANDIDATE") as string,
      email: (payload.email || "") as string,
    };
  } catch {
    // If verification fails, token might still be old encrypted format
    // Let them through — page-level auth will handle it
    // They'll need to re-login to get the new JWT format
    return null;
  }
}

export async function middleware(req: NextRequest) {
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
  const session = await getSessionFromCookie(req);

  // Not logged in
  if (!session) {
    if (
      pathname.startsWith("/hr") ||
      pathname.startsWith("/candidate") ||
      pathname.startsWith("/applications")
    ) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    // For other paths, let page handle it
    return NextResponse.next();
  }

  // Any authenticated
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
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)",
  ],
};