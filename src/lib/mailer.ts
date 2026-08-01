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

/**
 * RevSign notifications. Same delivery seam as the reset email above: in dev the
 * signing link is logged (so a request can be exercised end-to-end without a
 * provider), in prod this is where a real Resend send must be wired. Kept
 * non-throwing so a mail failure never blocks the signing lifecycle.
 */
export async function sendSignatureRequestEmail(params: {
  to: string;
  signerName: string;
  issuerName: string;
  documentTitle: string;
  message?: string;
  signUrl: string;
  expiresDate: string;
}): Promise<void> {
  if (process.env.NODE_ENV !== "production") {
    console.info(
      `[mailer:dev] signature request for ${params.to} — “${params.documentTitle}”: ${params.signUrl}`,
    );
    return;
  }
  // TODO(delivery): wire Resend here to send the branded PawFlow "please sign"
  // email. Until then, prod signing-link emails are not delivered.
}

export async function sendSignatureCompletedEmail(params: {
  to: string;
  documentTitle: string;
  issuerName: string;
  signerList: string;
  downloadUrl: string;
}): Promise<void> {
  if (process.env.NODE_ENV !== "production") {
    console.info(
      `[mailer:dev] signature completed for ${params.to} — “${params.documentTitle}”: ${params.downloadUrl}`,
    );
    return;
  }
  // TODO(delivery): wire Resend here to send the branded "fully signed" email.
}
