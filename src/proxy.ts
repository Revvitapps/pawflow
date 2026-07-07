// Route guard for workspace pages (Next.js 16 proxy convention — the
// successor to middleware.ts). Unauthenticated visitors are redirected to
// /login. Demo mode sets a `pawflow_session` cookie at demo login; real
// Supabase Auth (fix F8) will replace the cookie check with a session check.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/calendar",
  "/appointments",
  "/customers",
  "/pets",
  "/boarding",
  "/messages",
  "/payments",
  "/reviews",
  "/automations",
  "/ai-receptionist",
  "/settings",
  "/setup",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (!isProtected) {
    return NextResponse.next();
  }

  const session = request.cookies.get("pawflow_session")?.value;
  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/calendar/:path*",
    "/appointments/:path*",
    "/customers/:path*",
    "/pets/:path*",
    "/boarding/:path*",
    "/messages/:path*",
    "/payments/:path*",
    "/reviews/:path*",
    "/automations/:path*",
    "/ai-receptionist/:path*",
    "/settings/:path*",
    "/setup/:path*",
  ],
};
