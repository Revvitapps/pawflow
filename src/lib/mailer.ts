import "server-only";

/**
 * Transactional email delivery seam.
 *
 * Pawflow has no email provider wired yet, so this is a deliberate stub: in
 * production it must be replaced with a real provider call (Resend/SES). It is
 * written so the reset flow is complete and safe TODAY — the raw token is passed
 * here and NOWHERE else, is never returned to the client, and is only logged in
 * non-production so a leaked prod log can't expose reset links.
 */
export async function sendPasswordResetEmail(params: {
  to: string;
  resetUrl: string;
}): Promise<void> {
  if (process.env.NODE_ENV !== "production") {
    // Dev convenience only — never logs in production.
    console.info(`[mailer:dev] password reset for ${params.to}: ${params.resetUrl}`);
    return;
  }
  // TODO(security): wire a real provider here (e.g. Resend). Until then, prod
  // reset emails are not delivered — tracked in SECURITY.md.
}
