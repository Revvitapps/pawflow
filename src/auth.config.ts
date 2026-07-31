import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe subset of the NextAuth config — no Credentials provider (which pulls
 * in bcryptjs + Prisma, both Node-only) so this can be bundled into the route
 * guard (src/proxy.ts) on the Edge runtime. The full config in auth.ts extends
 * this with the real Credentials provider for use everywhere else.
 *
 * The `authorized` callback is the OPTIMISTIC guard the proxy runs on every
 * request: it validates that a real, signed NextAuth session JWT is present
 * (NextAuth verifies the cookie's signature + expiry before this runs) — not
 * mere cookie existence. Every protected page/server action re-checks the full
 * session via requireSession() in src/lib/session.ts.
 */
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

export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  trustHost: true,
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isProtected = PROTECTED_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
      );
      if (!isProtected) return true;
      // Returning false makes NextAuth redirect to `pages.signIn` (/login).
      return !!auth?.user;
    },
  },
} satisfies NextAuthConfig;
