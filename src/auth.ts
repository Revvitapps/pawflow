import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") return null;

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase().trim() },
        });
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          businessId: user.businessId,
          role: user.role,
          tokenVersion: user.tokenVersion,
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
