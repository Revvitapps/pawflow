import "server-only";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@prisma/client";

/**
 * The first-factor (password) verifier, factored out of auth.ts so BOTH the
 * next-auth `authorize` callback and the login server action can call it:
 *
 *   * `authorize` is the single session-minting seam (password + MFA both
 *     checked there, so a session can only ever be issued when both pass).
 *   * the login action calls it to decide the login UI's second step WITHOUT
 *     minting a session — it needs to know "is the password right, and does this
 *     user have MFA on?" to know whether to show the code field, and it must not
 *     reveal MFA status until the password is correct (no enumeration oracle).
 *
 * Verification behavior is unchanged from the previous inline check in auth.ts:
 * look the user up by normalized email, then bcrypt.compare against the stored
 * hash. Returns the login identity or null on any failure.
 */
export interface UserLogin {
  id: string;
  email: string;
  name: string;
  businessId: string;
  role: UserRole;
  /** Session-revocation counter, snapshotted into the JWT (see src/auth.ts). */
  tokenVersion: number;
}

export async function verifyUserLogin(email: string, password: string): Promise<UserLogin | null> {
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
}
