import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/live",
  "/sessions",
  "/analysis",
  "/devices",
  "/settings",
];

const AUTH_PAGES = ["/login", "/register"];

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get("eeg_auth_token")?.value;

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  const isAuthPage = AUTH_PAGES.some(
    (page) => pathname === page || pathname.startsWith(`${page}/`)
  );

  // 1. If user is unauthenticated and attempting to access a protected route:
  // Redirect immediately to /login with redirect query parameter (server-side, never rendering protected UI)
  if (isProtected && (!token || token.trim() === "")) {
    const loginUrl = new URL("/login", request.url);
    const destination = pathname + search;
    loginUrl.searchParams.set("redirect", destination);
    return NextResponse.redirect(loginUrl);
  }

  // 2. If user is already authenticated and attempting to access login or register:
  // Redirect immediately to /dashboard
  if (isAuthPage && token && token.trim() !== "") {
    const dashboardUrl = new URL("/dashboard", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/live/:path*",
    "/sessions/:path*",
    "/analysis/:path*",
    "/devices/:path*",
    "/settings/:path*",
    "/login",
    "/register",
  ],
};
