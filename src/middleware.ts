import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

// ==========================================
// SECRET — must match your NEXTAUTH_SECRET
// ==========================================
const SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || ""
);

// ==========================================
// ROUTE ACCESS RULES (first match wins)
// ==========================================
const ROUTE_RULES: {
  prefix: string;
  roles: string[] | "public" | "auth";
}[] = [
  // Public
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

  // Any authenticated
  { prefix: "/settings", roles: "auth" },
  { prefix: "/profile", roles: "auth" },
];

// ==========================================
// READ JWT FROM COOKIE — Edge compatible
// ==========================================
async function getSessionFromCookie(
  req: NextRequest
): Promise<{ id: string; role: string; email: string } | null> {
  // NextAuth v5 cookie names
  const cookieNames = [
    "authjs.session-token",
    "__Secure-authjs.session-token",
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
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

  // If no secret configured, skip verification
  // (let page-level auth handle it)
  if (!SECRET.length || SECRET.byteLength === 0) {
    return null;
  }

  try {
    // Verify JWT with jose (Edge-compatible)
    const { payload } = await jwtVerify(token, SECRET, {
      algorithms: ["HS256"],
    });

    return {
      id: (payload.id || payload.sub || "") as string,
      role: (payload.role || "CANDIDATE") as string,
      email: (payload.email || "") as string,
    };
  } catch {
    // JWT verification failed — token expired or invalid
    return null;
  }
}

// ==========================================
// MIDDLEWARE
// ==========================================
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip API, static files, images
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Find matching rule
  const rule = ROUTE_RULES.find((r) => pathname.startsWith(r.prefix));

  // No rule or public → allow
  if (!rule || rule.roles === "public") {
    return NextResponse.next();
  }

  // Get session from JWT cookie
  const session = await getSessionFromCookie(req);

  // Not logged in → redirect to login
  if (!session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // "auth" → any logged-in user
  if (rule.roles === "auth") {
    return NextResponse.next();
  }

  // Check role
  if (!rule.roles.includes(session.role)) {
    // Redirect to their home page
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
    return NextResponse.redirect(new URL(redirectPath, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)"],
};