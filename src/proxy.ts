// Route guard for workspace pages (Next.js 16 proxy convention — the successor
// to middleware.ts). Unlike the old demo build, this no longer checks for the
// mere existence of a client-set cookie. It re-exports the edge-safe NextAuth
// instance, which VALIDATES the signed session JWT (signature + expiry) and, via
// the `authorized` callback in src/auth.config.ts, redirects unauthenticated
// visitors on protected routes to /login.
//
// This is an optimistic gate only; every protected page/server action still
// performs a full session check via requireSession() in src/lib/session.ts.
export { auth as proxy } from "@/auth-edge";

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
