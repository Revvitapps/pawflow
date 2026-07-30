import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe subset of the NextAuth config — no Credentials provider (which pulls
 * in bcryptjs + Prisma, both Node-only) so this can be bundled into middleware
 * on the Edge runtime. The full config in auth.ts extends this with the real
 * provider for use everywhere else.
 */
export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  trustHost: true,
  providers: [],
} satisfies NextAuthConfig;
