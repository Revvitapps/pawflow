import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * DB-backed login rate limiting (LoginAttempt table). Keyed by a normalized
 * identifier so we can throttle by BOTH account (email) and source IP. The
 * checker FAILS CLOSED: if the datastore is unreachable we block rather than
 * wave the request through.
 */
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

export function emailKey(email: string) {
  return `email:${email.toLowerCase().trim()}`;
}

export function ipKey(ip: string) {
  return `ip:${ip}`;
}

export function clientIpFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headers.get("x-real-ip")?.trim() || "unknown";
}

/** True if ANY identifier has met/exceeded its failure budget in the window. */
export async function isAnyRateLimited(identifiers: string[]): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MS);
  try {
    for (const identifier of identifiers) {
      const count = await prisma.loginAttempt.count({
        where: { identifier, createdAt: { gte: since } },
      });
      if (count >= MAX_ATTEMPTS) return true;
    }
    return false;
  } catch {
    // Fail closed — never let a datastore outage disable the throttle.
    return true;
  }
}

export async function recordFailedAttempt(identifiers: string[]): Promise<void> {
  try {
    await prisma.loginAttempt.createMany({
      data: identifiers.map((identifier) => ({ identifier })),
    });
  } catch {
    // Best-effort; a failure here must not surface to the user.
  }
}

export async function clearAttempts(identifiers: string[]): Promise<void> {
  try {
    await prisma.loginAttempt.deleteMany({ where: { identifier: { in: identifiers } } });
  } catch {
    // Best-effort cleanup.
  }
}
