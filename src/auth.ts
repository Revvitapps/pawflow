import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";
import { verifyUserLogin } from "@/lib/auth/credentials";
import { authMfa } from "@/lib/mfa";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        // Second factor — a TOTP code or a single-use backup code. Optional on
        // the first step; REQUIRED before a session is issued for an
        // MFA-enabled user (enforced below).
        totp: { label: "Authentication code", type: "text" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") return null;

        // ---- First factor (password) ----
        // Same bcrypt behavior as before, now via the shared helper in
        // lib/auth/credentials.ts (reused by the login action's step-1 check).
        const login = await verifyUserLogin(email, password);
        if (!login) return null;

        // ---- Second factor (MFA) ----
        // authorize is the ONLY place a session is minted, so MFA is enforced
        // here regardless of how the credentials endpoint is reached. The login
        // UI's two-step flow is just UX on top of this: a direct POST with only
        // email+password can never obtain a session for an MFA-enabled user. The
        // backup-code path consumes the code, so it runs exactly once — here,
        // not also in the login action.
        if (await authMfa.isEnabled(login.id)) {
          const code = typeof credentials?.totp === "string" ? credentials.totp.trim() : "";
          if (!code) return null; // no/blank code -> reject; the action shows the code step
          const ok =
            (await authMfa.verify(login.id, code)) ||
            (await authMfa.verifyBackupCode(login.id, code));
          if (!ok) return null;
        }

        return {
          id: login.id,
          email: login.email,
          name: login.name,
          businessId: login.businessId,
          role: login.role,
          tokenVersion: login.tokenVersion,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Fresh sign-in: stamp the identity + the current tokenVersion.
        token.id = user.id;
        token.businessId = user.businessId;
        token.role = user.role;
        token.tokenVersion = user.tokenVersion;
        return token;
      }

      // Subsequent requests: enforce session revocation. If the user's
      // tokenVersion has moved on (password reset / forced logout), or the user
      // no longer exists, invalidate this token so the session ends.
      if (token.id) {
        const current = await prisma.user.findUnique({
          where: { id: token.id },
          select: { tokenVersion: true, role: true, businessId: true },
        });
        if (!current || current.tokenVersion !== token.tokenVersion) return null;
        // Keep role/businessId fresh so a role change takes effect without re-login.
        token.role = current.role;
        token.businessId = current.businessId;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.businessId = token.businessId;
      session.user.role = token.role;
      return session;
    },
  },
});
