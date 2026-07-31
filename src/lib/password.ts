import "server-only";
import { createHash } from "node:crypto";

/**
 * Password policy for signup + reset.
 *
 *  - Minimum length 12 (NIST 800-63B favors length over composition, but we keep
 *    a light composition floor to reject trivially weak long strings).
 *  - HaveIBeenPwned breach check via k-anonymity: only the first 5 chars of the
 *    SHA-1 are ever sent to the API, never the password or full hash. Fails OPEN
 *    on network error so an HIBP outage cannot lock legitimate signups out — the
 *    length/composition floor still applies.
 */

export const MIN_PASSWORD_LENGTH = 12;

export function validatePasswordPolicy(password: string): string | null {
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password.length > 200) {
    return "Password is too long.";
  }
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length;
  if (classes < 3) {
    return "Use a mix of upper- and lower-case letters, numbers, and symbols.";
  }
  return null;
}

/**
 * Returns true if the password appears in the HIBP breach corpus. Fails open
 * (returns false) on any network/parse error so availability is preserved.
 */
export async function isBreachedPassword(password: string): Promise<boolean> {
  try {
    const sha1 = createHash("sha1").update(password, "utf8").digest("hex").toUpperCase();
    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);

    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "Add-Padding": "true", "User-Agent": "PawFlow-SecurityCheck/1.0" },
      signal: AbortSignal.timeout(4000),
      cache: "no-store",
    });
    if (!res.ok) return false;

    const body = await res.text();
    for (const line of body.split("\n")) {
      const [hashSuffix, countStr] = line.trim().split(":");
      if (hashSuffix === suffix && Number(countStr) > 0) return true;
    }
    return false;
  } catch {
    return false; // fail open
  }
}

/** One-shot policy + breach validation. Returns an error string, or null if OK. */
export async function assertStrongPassword(password: string): Promise<string | null> {
  const policyError = validatePasswordPolicy(password);
  if (policyError) return policyError;
  if (await isBreachedPassword(password)) {
    return "That password has appeared in a known data breach. Please choose a different one.";
  }
  return null;
}
