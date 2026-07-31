"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getUserByEmail } from "@/server/tenant";
import { issueResetToken } from "@/lib/reset-token";
import { sendPasswordResetEmail } from "@/lib/mailer";
import {
  isAnyRateLimited,
  recordFailedAttempt,
  scopedKeys,
  clientIpFromHeaders,
} from "@/lib/rateLimit";

const GENERIC_MESSAGE = "If an account exists for that email, a reset link is on its way.";
const RATE_LIMIT_MESSAGE = "Too many requests. Please wait a few minutes and try again.";

function done(message: string): never {
  redirect(`/forgot-password?sent=${encodeURIComponent(message)}`);
}

function baseUrl(h: Headers): string {
  const envUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

export async function forgotPasswordAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const h = await headers();
  const ip = clientIpFromHeaders(h);
  const identifiers = scopedKeys("forgot", email || "unknown", ip);

  // Fail closed on abuse; count every request against the budget.
  if (await isAnyRateLimited(identifiers)) done(RATE_LIMIT_MESSAGE);
  await recordFailedAttempt(identifiers);

  // Always return the same generic response — never reveal whether the account
  // exists (no user enumeration).
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const user = await getUserByEmail(email);
    if (user) {
      const rawToken = await issueResetToken(user.id);
      const resetUrl = `${baseUrl(h)}/reset-password?token=${encodeURIComponent(rawToken)}`;
      await sendPasswordResetEmail({ to: user.email, resetUrl });
    }
  }

  done(GENERIC_MESSAGE);
}
