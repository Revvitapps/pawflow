"use server";

import QRCode from "qrcode";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import { MfaCodeSchema, firstError } from "@/lib/schemas";
import { authMfa, roleRequiresMfa, verifySecondFactor } from "@/lib/mfa";

/**
 * MFA management for the signed-in user. Every action re-derives the user from
 * the session (never trusts a client-supplied userId), so a user can only ever
 * manage their OWN second factor.
 */

export type BeginEnrollmentResult =
  | { ok: true; qrDataUrl: string; secret: string; otpauthUri: string }
  | { ok: false; error: string };

/**
 * Start enrollment: mint a secret (stored disabled), and return a QR data URL
 * for the authenticator app plus the raw secret for manual entry. Safe to call
 * repeatedly — each call rotates to a fresh secret until confirmation.
 */
export async function beginMfaEnrollmentAction(): Promise<BeginEnrollmentResult> {
  const session = await requireSession();
  const { secret, otpauthUri } = await authMfa.beginEnrollment(session.user.id, {
    accountName: session.user.email ?? undefined,
  });
  const qrDataUrl = await QRCode.toDataURL(otpauthUri, { margin: 1, width: 220 });
  return { ok: true, qrDataUrl, secret, otpauthUri };
}

export type ConfirmState = { error?: string; backupCodes?: string[] } | undefined;

/**
 * Confirm enrollment with the first code from the app. On success returns the
 * backup codes to show ONCE (they are never retrievable again).
 */
export async function confirmMfaEnrollmentAction(
  _prev: ConfirmState,
  formData: FormData,
): Promise<ConfirmState> {
  const session = await requireSession();
  const parsed = MfaCodeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const result = await authMfa.confirmEnrollment(session.user.id, parsed.data.code);
  if (!result) return { error: "That code didn't match. Check your app's time and try again." };

  revalidatePath("/settings/security");
  revalidatePath("/enroll-mfa");
  return { backupCodes: result.backupCodes };
}

/**
 * Regenerate backup codes. A SENSITIVE action — gated behind step-up re-auth: a
 * fresh TOTP (or unused backup) code is required even though the user is already
 * signed in. Returns the new set once.
 */
export async function regenerateBackupCodesAction(
  _prev: ConfirmState,
  formData: FormData,
): Promise<ConfirmState> {
  const session = await requireSession();
  const parsed = MfaCodeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  // Step-up: prove possession of the second factor before rotating recovery
  // codes (otherwise a walk-up on an unlocked, already-authenticated session
  // could silently mint itself fresh recovery codes).
  if (!(await verifySecondFactor(session.user.id, parsed.data.code))) {
    return { error: "Enter a valid current code to regenerate backup codes." };
  }

  const result = await authMfa.regenerateBackupCodes(session.user.id);
  if (!result) return { error: "Two-factor authentication is not enabled." };

  revalidatePath("/settings/security");
  return { backupCodes: result.backupCodes };
}

export type DisableState = { error?: string; success?: boolean } | undefined;

/**
 * Disable MFA. SENSITIVE — gated behind step-up re-auth. Owners are required to
 * have MFA, so disabling immediately bounces them back to forced enrollment on
 * their next navigation (the (workspace) layout guard) — this is by design
 * (e.g. to re-enroll a new device), not a way to opt out of the policy.
 */
export async function disableMfaAction(
  _prev: DisableState,
  formData: FormData,
): Promise<DisableState> {
  const session = await requireSession();
  const parsed = MfaCodeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  if (!(await verifySecondFactor(session.user.id, parsed.data.code))) {
    return { error: "Enter a valid current code to turn off two-factor auth." };
  }

  await authMfa.disable(session.user.id);
  revalidatePath("/settings/security");
  return {
    success: true,
    // Not an error, but useful context for the UI to relay.
    ...(roleRequiresMfa(session.user.role)
      ? { error: "Two-factor is off. Your role requires it, so you'll be asked to re-enroll." }
      : {}),
  };
}
