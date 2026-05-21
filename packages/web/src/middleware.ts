import { NextResponse, type NextRequest } from "next/server";
import {
  AUTH_COOKIE_NAME,
  getAuthPassword,
  verifySessionCookieValue,
} from "@/lib/auth";

const PUBLIC_PATHS = new Set<string>([
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/manifest.webmanifest",
  "/health",
  "/favicon.ico",
]);

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/_next/")) return true;
  if (pathname.startsWith("/icon-")) return true;
  if (pathname.startsWith("/api/auth/")) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const password = getAuthPassword();
  if (!password) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();

  const cookie = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const ok = await verifySessionCookieValue(cookie, password);
  if (ok) return NextResponse.next();

  // For API routes (including SSE under /api/), reject with 401 instead of redirect.
  if (pathname.startsWith("/api/")) {
    return new NextResponse(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const loginUrl = new URL("/login", request.url);
  const target = pathname + (request.nextUrl.search ?? "");
  if (target && target !== "/") loginUrl.searchParams.set("next", target);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
