"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { verifyUserLogin } from "@/lib/auth/credentials";
import { authMfa } from "@/lib/mfa";
import {
  isAnyRateLimited,
  recordFailedAttempt,
  clearAttempts,
  emailKey,
  ipKey,
  clientIpFromHeaders,
} from "@/lib/rateLimit";

const RATE_LIMIT_MESSAGE = "Too many login attempts. Please wait a few minutes and try again.";

// `step: "mfa"` tells the client to reveal the authentication-code field. The
// email/password fields stay filled (uncontrolled) and are resubmitted with the
// code so the single `authorize` seam can verify both factors together.
export type LoginState = { error?: string; step?: "mfa" } | undefined;

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const code = String(formData.get("totp") ?? "").trim();

  if (!email || !password) return { error: "Email and password are required." };

  const ip = clientIpFromHeaders(await headers());
  const identifiers = [emailKey(email), ipKey(ip)];

  // Block before spending a bcrypt comparison if either the account or the
  // source IP has already burned through its failure budget. Every code
  // resubmission passes back through here too, so this also throttles
  // second-factor guessing.
  if (await isAnyRateLimited(identifiers)) return { error: RATE_LIMIT_MESSAGE };

  // Verify the password ourselves first (no session minted) so we can decide
  // whether a second factor is needed — WITHOUT leaking MFA status for a wrong
  // password. This is idempotent (a bcrypt compare); it does NOT verify or
  // consume the MFA code (that happens exactly once, inside `authorize`).
  const login = await verifyUserLogin(email, password);
  if (!login) {
    await recordFailedAttempt(identifiers);
    const message = (await isAnyRateLimited(identifiers)) ? RATE_LIMIT_MESSAGE : "Invalid email or password.";
    return { error: message };
  }

  const mfaEnabled = await authMfa.isEnabled(login.id);
  if (mfaEnabled && !code) {
    // Password is correct and MFA is on, but no code yet — advance to step 2.
    // No failed attempt is recorded (the password was right) and no session is
    // issued until the code is verified in `authorize`.
    return { step: "mfa" };
  }

  try {
    // redirect:false so a successful sign-in RETURNS here instead of throwing
    // NEXT_REDIRECT — giving us a place to clear the attempt ledger first.
    // `authorize` re-verifies the password AND (for an MFA-enabled user) the
    // code, consuming a backup code if one was used.
    await signIn("credentials", { email, password, totp: code, redirect: false });
  } catch (err) {
    if (err instanceof AuthError) {
      await recordFailedAttempt(identifiers);
      // We already know the password is right and whether MFA is on, so a
      // failure here is a bad/expired code when MFA is enabled — keep the user
      // on the code step rather than bouncing them back to the password step.
      if (mfaEnabled) {
        return { step: "mfa", error: "Invalid or expired authentication code." };
      }
      const message = (await isAnyRateLimited(identifiers)) ? RATE_LIMIT_MESSAGE : "Invalid email or password.";
      return { error: message };
    }
    throw err;
  }

  // Successful login — wipe the account's/IP's failure counters, then redirect.
  await clearAttempts(identifiers);
  redirect("/dashboard");
}
