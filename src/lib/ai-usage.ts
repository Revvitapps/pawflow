// Budget- and rate-cap guardrails for the Claude provider (src/lib/ai.ts).
//
// Caps are checked BEFORE each model call and are all env-overridable. Spend and
// call counts are persisted per-day in the Prisma `AiUsage` ledger; the
// per-minute burst limit is tracked in-memory (process-local) keyed to the
// current minute. Money is a plain USD Float here (not cents) because these are
// pricing estimates, not customer-facing currency.

import { prisma } from "@/lib/prisma";

export class BudgetExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BudgetExceededError";
  }
}

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
}

function envNum(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") {
    return fallback;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

// Cap defaults (all env-overridable).
export const caps = {
  minuteMaxCalls: () => envNum("AI_MINUTE_MAX_CALLS", 12),
  dailyCapUsd: () => envNum("AI_DAILY_CAP_USD", 2),
  dailyMaxCalls: () => envNum("AI_DAILY_MAX_CALLS", 200),
  monthlyCapUsd: () => envNum("AI_MONTHLY_CAP_USD", 20),
};

// Pricing per 1M tokens (input / output), keyed by model id.
const PRICING_PER_MTOK: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-opus-5": { input: 5, output: 25 },
  "claude-opus-4-8": { input: 5, output: 25 },
  "claude-haiku-4-5": { input: 1, output: 5 },
};

export function estimateCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const pricing = PRICING_PER_MTOK[model];
  if (!pricing) {
    return 0;
  }
  return (
    (inputTokens / 1_000_000) * pricing.input +
    (outputTokens / 1_000_000) * pricing.output
  );
}

function dayKey(now = new Date()): string {
  return now.toISOString().slice(0, 10); // yyyy-mm-dd
}

function monthKey(now = new Date()): string {
  return now.toISOString().slice(0, 7); // yyyy-mm
}

function minuteKey(now = new Date()): string {
  return now.toISOString().slice(0, 16); // yyyy-mm-ddThh:mm
}

// In-memory per-minute burst counter. Process-local by design — a burst cap is a
// coarse safety valve, so an exact cluster-wide count is not required.
const minuteBuckets = new Map<string, number>();

function checkAndBumpMinuteBurst(): void {
  const key = minuteKey();
  // Prune stale minute buckets so the map cannot grow unbounded.
  for (const existing of minuteBuckets.keys()) {
    if (existing !== key) {
      minuteBuckets.delete(existing);
    }
  }
  const current = minuteBuckets.get(key) ?? 0;
  if (current >= caps.minuteMaxCalls()) {
    throw new RateLimitError(
      `AI per-minute burst cap reached (${caps.minuteMaxCalls()} calls/min).`,
    );
  }
  minuteBuckets.set(key, current + 1);
}

// Runs before every model call. Throws RateLimitError or BudgetExceededError
// when a cap would be exceeded; otherwise returns cleanly.
export async function enforceCaps(): Promise<void> {
  // 1. Per-minute burst (in-memory, cheapest — check first).
  checkAndBumpMinuteBurst();

  const today = dayKey();
  const month = monthKey();

  // 2/3. Per-day calls + spend.
  const todayRow = await prisma.aiUsage.findUnique({ where: { day: today } });
  if (todayRow) {
    if (todayRow.calls >= caps.dailyMaxCalls()) {
      throw new RateLimitError(
        `AI per-day call cap reached (${caps.dailyMaxCalls()} calls/day).`,
      );
    }
    if (todayRow.spentUsd >= caps.dailyCapUsd()) {
      throw new BudgetExceededError(
        `AI per-day spend cap reached ($${caps.dailyCapUsd()}/day).`,
      );
    }
  }

  // 4. Per-month spend (sum across all days in the current month).
  const monthRows = await prisma.aiUsage.findMany({
    where: { day: { startsWith: month } },
    select: { spentUsd: true },
  });
  const monthSpend = monthRows.reduce((sum, row) => sum + row.spentUsd, 0);
  if (monthSpend >= caps.monthlyCapUsd()) {
    throw new BudgetExceededError(
      `AI per-month spend cap reached ($${caps.monthlyCapUsd()}/month).`,
    );
  }
}

// Records one completed call: increments today's call count and adds the
// estimated cost. Upserts the day row so the first call of the day creates it.
export async function recordUsage(costUsd: number): Promise<void> {
  const today = dayKey();
  await prisma.aiUsage.upsert({
    where: { day: today },
    create: { day: today, spentUsd: costUsd, calls: 1 },
    update: { spentUsd: { increment: costUsd }, calls: { increment: 1 } },
  });
}
