// Lightweight request validation + rate limiting for API routes.
// Dependency-free by design (mirrors zod's ergonomics for our simple shapes).

import { NextResponse } from "next/server";

export class ValidationError extends Error {
  constructor(public field: string, message: string) {
    super(`${field}: ${message}`);
  }
}

export function requireString(value: unknown, field: string, opts?: { max?: number; min?: number }): string {
  if (typeof value !== "string") throw new ValidationError(field, "must be a string");
  const trimmed = value.trim();
  if (trimmed.length < (opts?.min ?? 1)) throw new ValidationError(field, "is required");
  if (trimmed.length > (opts?.max ?? 2000)) throw new ValidationError(field, `must be at most ${opts?.max ?? 2000} characters`);
  return trimmed;
}

export function optionalString(value: unknown, field: string, opts?: { max?: number }): string {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") throw new ValidationError(field, "must be a string");
  if (value.length > (opts?.max ?? 2000)) throw new ValidationError(field, `must be at most ${opts?.max ?? 2000} characters`);
  return value.trim();
}

export function requireOneOf<T extends string>(value: unknown, field: string, allowed: readonly T[]): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new ValidationError(field, `must be one of: ${allowed.join(", ")}`);
  }
  return value as T;
}

export function requireObject(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ValidationError(field, "must be an object");
  }
  return value as Record<string, unknown>;
}

export function validationResponse(error: unknown): NextResponse {
  if (error instanceof ValidationError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}

// ---------------------------------------------------------------------------
// In-memory token-bucket rate limiter. Per-instance (resets on cold start),
// which is adequate abuse protection for demo/MVP; swap for a shared store
// (Upstash/Redis) at production scale.
// ---------------------------------------------------------------------------

const buckets = new Map<string, { tokens: number; refilledAt: number }>();

export function rateLimit(request: Request, key: string, opts = { capacity: 20, refillPerMinute: 20 }): NextResponse | null {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const bucketKey = `${key}:${ip}`;
  const now = Date.now();
  const bucket = buckets.get(bucketKey) ?? { tokens: opts.capacity, refilledAt: now };

  const refill = ((now - bucket.refilledAt) / 60000) * opts.refillPerMinute;
  bucket.tokens = Math.min(opts.capacity, bucket.tokens + refill);
  bucket.refilledAt = now;

  if (bucket.tokens < 1) {
    buckets.set(bucketKey, bucket);
    return NextResponse.json({ error: "Too many requests — slow down a little." }, { status: 429 });
  }
  bucket.tokens -= 1;
  buckets.set(bucketKey, bucket);
  if (buckets.size > 5000) {
    // Prevent unbounded growth: drop the oldest half.
    const keys = [...buckets.keys()].slice(0, 2500);
    for (const staleKey of keys) buckets.delete(staleKey);
  }
  return null;
}
