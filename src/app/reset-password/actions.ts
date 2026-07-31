"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { consumeResetToken } from "@/lib/reset-token";
import { assertStrongPassword } from "@/lib/password";
import {
  isAnyRateLimited,
  recordFailedAttempt,
  scopedKeys,
  clientIpFromHeaders,
} from "@/lib/rateLimit";

const RATE_LIMIT_MESSAGE = "Too many attempts. Please wait a few minutes and try again.";

function fail(token: string, message: string): never {
  redirect(`/reset-password?token=${encodeURIComponent(token)}&error=${encodeURIComponent(message)}`);
}

export async function resetPasswordAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const ip = clientIpFromHeaders(await headers());
  const identifiers = scopedKeys("forgot", `reset:${ip}`, ip);

  if (await isAnyRateLimited(identifiers)) fail(token, RATE_LIMIT_MESSAGE);
  await recordFailedAttempt(identifiers);

  if (!token) fail(token, "This reset link is invalid or has expired.");
  if (password !== confirm) fail(token, "Passwords do not match.");

  const pwError = await assertStrongPassword(password);
  if (pwError) fail(token, pwError);

  // Single-use, unexpired token → owning userId (or null).
  const userId = await consumeResetToken(token);
  if (!userId) fail(token, "This reset link is invalid or has expired.");

  const passwordHash = await bcrypt.hash(password, 12);

  // Apply the new password AND bump tokenVersion so every existing session is
  // revoked (session-revocation contract, verified in the next-auth jwt callback).
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, tokenVersion: { increment: 1 } },
  });

  redirect("/login?error=" + encodeURIComponent("Password updated. Please log in."));
}
