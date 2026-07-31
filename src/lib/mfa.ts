import { createAuthMfa, createPrismaMfaStore } from "@revvitapps/auth-mfa";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@prisma/client";

/**
 * Pawflow's single MFA engine, from the shared, independently-tested
 * @revvitapps/auth-mfa package (RFC 6238 TOTP + single-use backup codes). The
 * opaque `userId` the package is keyed by maps to User.id (via the UserMfa model
 * + createPrismaMfaStore); nothing in Pawflow touches those columns directly.
 *
 * MFA_SECRET_KEY (32+ chars) encrypts every TOTP secret at rest with
 * AES-256-GCM. It is STRONGLY recommended in production — without it, secrets
 * are stored in plaintext (fine for local dev; a leaked DB then hands over live
 * second factors). The same value must be set on every process that verifies
 * codes; changing it invalidates existing enrollments.
 */
export const authMfa = createAuthMfa({
  store: createPrismaMfaStore(prisma),
  issuer: "Pawflow",
  secretEncryptionKey: process.env.MFA_SECRET_KEY,
});

/**
 * Pawflow's privileged role(s) that MUST have MFA enabled. `owner` is the
 * account administrator (full financial + operational control over the
 * Business) and stands in for the pentest requirement's "owner/admin". Pawflow
 * has no separate admin role. front_desk and staff may enroll voluntarily but
 * are not forced; pet_parent is a portal role, not a staff seat.
 */
export const MFA_REQUIRED_ROLES: readonly UserRole[] = ["owner"] as const;

export function roleRequiresMfa(role: UserRole): boolean {
  return MFA_REQUIRED_ROLES.includes(role);
}

/**
 * Verify a second factor for step-up / login: a live TOTP code OR a single-use
 * backup code. Backup codes are consumed on use (so this is not idempotent for
 * them — call it exactly once per attempt). Returns one generic boolean.
 */
export async function verifySecondFactor(userId: string, code: string): Promise<boolean> {
  const trimmed = code.trim();
  if (!trimmed) return false;
  if (await authMfa.verify(userId, trimmed)) return true;
  return authMfa.verifyBackupCode(userId, trimmed);
}
