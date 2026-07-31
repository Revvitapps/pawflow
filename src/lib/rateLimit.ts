import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * DB-backed, serverless-safe rate limiting (LoginAttempt table). Keyed by a
 * normalized identifier so we can throttle by BOTH account (email) and source
 * IP, and by ACTION SCOPE (login / signup / forgot) so one flow's failures never
 * spill into another's budget. The checker FAILS CLOSED: if the datastore is
 * unreachable we block rather than wave the request through.
 *
 * The single LoginAttempt table backs every pre-auth throttle; the scope prefix
 * (`login:`, `signup:`, `forgot:`) keeps the counters independent.
 */
export interface RateLimitOptions {
  /** Rolling window length in ms. */
  windowMs?: number;
  /** Attempts allowed inside the window before the identifier is blocked. */
  maxAttempts?: number;
}

const DEFAULT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const DEFAULT_MAX_ATTEMPTS = 5;

export type RateLimitScope = "login" | "signup" | "forgot";

function normalizeEmail(email: string) {
  return email.toLowerCase().trim();
}

/** Build the [email, ip] identifier pair for a scope. */
export function scopedKeys(scope: RateLimitScope, email: string, ip: string): string[] {
  return [`${scope}:email:${normalizeEmail(email)}`, `${scope}:ip:${ip}`];
}

// Back-compat helpers used by the login action (implicit "login" scope).
export function emailKey(email: string) {
  return `login:email:${normalizeEmail(email)}`;
}

export function ipKey(ip: string) {
  return `login:ip:${ip}`;
}

export function clientIpFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headers.get("x-real-ip")?.trim() || "unknown";
}

/** True if ANY identifier has met/exceeded its failure budget in the window. */
export async function isAnyRateLimited(
  identifiers: string[],
  opts: RateLimitOptions = {},
): Promise<boolean> {
  const windowMs = opts.windowMs ?? DEFAULT_WINDOW_MS;
  const maxAttempts = opts.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const since = new Date(Date.now() - windowMs);
  try {
    for (const identifier of identifiers) {
      const count = await prisma.loginAttempt.count({
        where: { identifier, createdAt: { gte: since } },
      });
      if (count >= maxAttempts) return true;
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
