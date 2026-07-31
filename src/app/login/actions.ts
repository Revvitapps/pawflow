"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import {
  isAnyRateLimited,
  recordFailedAttempt,
  clearAttempts,
  emailKey,
  ipKey,
  clientIpFromHeaders,
} from "@/lib/rateLimit";

const RATE_LIMIT_MESSAGE = "Too many login attempts. Please wait a few minutes and try again.";

function fail(message: string): never {
  redirect(`/login?error=${encodeURIComponent(message)}`);
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) fail("Email and password are required.");

  const ip = clientIpFromHeaders(await headers());
  const identifiers = [emailKey(email), ipKey(ip)];

  // Block before spending a bcrypt comparison if either the account or the source
  // IP has already burned through its failure budget for this window.
  if (await isAnyRateLimited(identifiers)) fail(RATE_LIMIT_MESSAGE);

  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (err) {
    if (err instanceof AuthError) {
      await recordFailedAttempt(identifiers);
      // Re-check so the attempt that crosses the threshold already gets the
      // lockout message rather than one more "invalid credentials".
      const message = (await isAnyRateLimited(identifiers)) ? RATE_LIMIT_MESSAGE : "Invalid email or password.";
      fail(message);
    }
    throw err;
  }

  // Successful login — wipe the account's/IP's failure counters.
  await clearAttempts(identifiers);
  redirect("/dashboard");
}
