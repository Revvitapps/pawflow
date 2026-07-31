import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

/**
 * Edge-safe NextAuth instance built from the provider-less config in
 * src/auth.config.ts. Used ONLY by the route guard (src/proxy.ts) so the guard
 * can validate the signed session JWT without bundling bcrypt/Prisma. The full
 * Node instance (with the Credentials provider) lives in src/auth.ts.
 */
export const { auth } = NextAuth(authConfig);
