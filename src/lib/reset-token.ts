import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";

/**
 * Password-reset token lifecycle.
 *
 * The raw token is a 256-bit random value handed to the user exactly once (via
 * the reset link). Only its SHA-256 hash is persisted, so a DB leak yields no
 * usable link. Tokens expire after RESET_TTL_MS, are single-use (usedAt), and
 * issuing a new one rotates out any prior unused tokens for the same user.
 *
 * SHA-256 (not bcrypt) is appropriate here: the token is high-entropy random,
 * so there is nothing to brute-force, and a fast lookup by hash is required.
 */
const RESET_TTL_MS = 30 * 60 * 1000; // 30 minutes

export function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

/**
 * Issue a fresh reset token for a user. Deletes any outstanding tokens first
 * (rotation) so only one link is ever live. Returns the RAW token — callers
 * must deliver it out-of-band (email) and never persist it.
 */
export async function issueResetToken(userId: string): Promise<string> {
  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TTL_MS);

  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId } }),
    prisma.passwordResetToken.create({ data: { userId, tokenHash, expiresAt } }),
  ]);

  return rawToken;
}

/**
 * Validate a raw token. Returns the owning userId if the token is present,
 * unexpired, and unused — otherwise null. Uses a constant-time comparison on the
 * hash to avoid leaking match progress via timing.
 */
export async function consumeResetToken(rawToken: string): Promise<string | null> {
  if (!rawToken || rawToken.length < 16) return null;
  const tokenHash = hashToken(rawToken);

  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!record) return null;
  if (record.usedAt) return null;
  if (record.expiresAt.getTime() < Date.now()) return null;

  // Defensive constant-time equality on the stored vs recomputed hash.
  const a = Buffer.from(record.tokenHash);
  const b = Buffer.from(tokenHash);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  // Mark used atomically; if another request already consumed it, bail.
  const consumed = await prisma.passwordResetToken.updateMany({
    where: { id: record.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (consumed.count !== 1) return null;

  return record.userId;
}
