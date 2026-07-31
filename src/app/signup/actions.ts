"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { signIn } from "@/auth";
import { createBusinessWithOwner, getUserByEmail } from "@/server/tenant";
import { assertStrongPassword } from "@/lib/password";
import {
  isAnyRateLimited,
  recordFailedAttempt,
  clearAttempts,
  scopedKeys,
  clientIpFromHeaders,
} from "@/lib/rateLimit";

const RATE_LIMIT_MESSAGE = "Too many signup attempts. Please wait a few minutes and try again.";

function fail(message: string): never {
  redirect(`/signup?error=${encodeURIComponent(message)}`);
}

export async function signupAction(formData: FormData) {
  const businessName = String(formData.get("businessName") ?? "").trim();
  const ownerName = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const ip = clientIpFromHeaders(await headers());
  const identifiers = scopedKeys("signup", email || "unknown", ip);

  // Throttle abusive signup floods per email + IP (fail closed).
  if (await isAnyRateLimited(identifiers)) fail(RATE_LIMIT_MESSAGE);

  if (!businessName) fail("Business name is required.");
  if (!ownerName) fail("Your name is required.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail("Enter a valid email address.");

  // Password policy: min 12, composition floor, and HIBP breach check.
  const pwError = await assertStrongPassword(password);
  if (pwError) fail(pwError);

  const existing = await getUserByEmail(email);
  if (existing) {
    // Count against the budget so signup can't be used to probe which emails
    // already have accounts at high volume.
    await recordFailedAttempt(identifiers);
    fail("An account with that email already exists.");
  }

  await createBusinessWithOwner({ businessName, ownerName, email, password });

  // Establish the real session immediately after provisioning the tenant.
  await signIn("credentials", { email, password, redirect: false });

  await clearAttempts(identifiers);
  redirect("/dashboard");
}
