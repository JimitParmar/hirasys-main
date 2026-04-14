import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || ""
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
  // Log ALL cookies to find the right name
  const allCookies = req.cookies.getAll();
  console.log(
    "[Middleware] All cookies:",
    allCookies.map((c) => `${c.name}=${c.value.substring(0, 20)}...`)
  );

  // Try every possible NextAuth cookie name
  const cookieNames = [
    "authjs.session-token",
    "__Secure-authjs.session-token",
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
    // Auth.js v5 sometimes uses these
    "authjs.callback-url",
    "authjs.csrf-token",
  ];

  let token: string | null = null;
  let foundCookieName: string | null = null;

  for (const name of cookieNames) {
    const cookie = req.cookies.get(name);
    if (cookie?.value) {
      token = cookie.value;
      foundCookieName = name;
      break;
    }
  }

  // Also try any cookie that looks like a JWT
  if (!token) {
    for (const cookie of allCookies) {
      if (
        cookie.value.length > 100 &&
        cookie.value.includes(".")
      ) {
        // Looks like a JWT (has dots and is long)
        token = cookie.value;
        foundCookieName = cookie.name;
        console.log(
          `[Middleware] Found potential JWT in cookie: ${cookie.name}`
        );
        break;
      }
    }
  }

  if (!token) {
    console.log("[Middleware] No session cookie found");
    return null;
  }

  console.log(
    `[Middleware] Found token in cookie: ${foundCookieName} (${token.length} chars)`
  );

  // Try to verify
  if (SECRET.byteLength === 0) {
    console.log("[Middleware] No NEXTAUTH_SECRET configured");
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, SECRET, {
      algorithms: ["HS256"],
    });

    console.log("[Middleware] JWT verified:", {
      id: payload.id || payload.sub,
      role: payload.role,
      email: payload.email,
    });

    return {
      id: (payload.id || payload.sub || "") as string,
      role: (payload.role || "CANDIDATE") as string,
      email: (payload.email || "") as string,
    };
  } catch (err: any) {
    console.log("[Middleware] JWT verify failed:", err.message);

    // Try decoding without verification to see the payload
    try {
      const parts = token.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(
          Buffer.from(parts[1], "base64url").toString("utf-8")
        );
        console.log("[Middleware] JWT payload (unverified):", {
          id: payload.id || payload.sub,
          role: payload.role,
          email: payload.email,
          iat: payload.iat,
          exp: payload.exp,
        });
      }
    } catch {}

    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const rule = ROUTE_RULES.find((r) => pathname.startsWith(r.prefix));

  console.log(`[Middleware] ${pathname} → rule:`, rule?.roles || "no rule");

  if (!rule || rule.roles === "public") {
    return NextResponse.next();
  }

  const session = await getSessionFromCookie(req);

  console.log(`[Middleware] Session:`, session);

  if (!session) {
    console.log(`[Middleware] No session → redirect to /login`);
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (rule.roles === "auth") {
    return NextResponse.next();
  }

  if (!rule.roles.includes(session.role)) {
    console.log(
      `[Middleware] Role ${session.role} not in ${rule.roles} → redirect`
    );
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

  console.log(`[Middleware] ✅ Access granted: ${session.email} → ${pathname}`);
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)"],
};