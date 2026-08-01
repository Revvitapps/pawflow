import "server-only";

/**
 * Transactional email delivery seam.
 *
 * Sends through Resend's HTTP API (no SDK dependency — a single fetch keeps the
 * vendor surface small). When RESEND_API_KEY is unset the send is a graceful
 * no-op: in non-production the link is logged so the flow can be exercised
 * end-to-end locally without a provider. The raw reset token is passed here and
 * NOWHERE else, is never returned to the client, and is only logged in
 * non-production so a leaked prod log can't expose reset links.
 */

const DEFAULT_FROM = "Revvit <noreply@documents.revvit.io>";

async function deliver(params: {
  to: string;
  subject: string;
  html: string;
  /** Logged in dev when no provider is configured, so the flow stays usable. */
  devLog: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    // Graceful no-op: no provider configured. Never log in production so a
    // leaked prod log can't expose reset/signing links.
    if (process.env.NODE_ENV !== "production") {
      console.info(params.devLog);
    }
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM ?? DEFAULT_FROM,
      to: [params.to],
      subject: params.subject,
      html: params.html,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Resend send failed (${res.status}): ${detail.slice(0, 300)}`);
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendPasswordResetEmail(params: {
  to: string;
  resetUrl: string;
}): Promise<void> {
  const url = escapeHtml(params.resetUrl);
  await deliver({
    to: params.to,
    subject: "Reset your PawFlow password",
    html: `<p>We received a request to reset your PawFlow password.</p>
<p><a href="${url}">Click here to choose a new password</a>. This link expires soon.</p>
<p>If you didn't request this, you can safely ignore this email.</p>`,
    devLog: `[mailer:dev] password reset for ${params.to}: ${params.resetUrl}`,
  });
}

/**
 * RevSign notification. Keeping the call site non-throwing is the caller's
 * responsibility — a mail failure should never block the signing lifecycle.
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
  const url = escapeHtml(params.signUrl);
  const title = escapeHtml(params.documentTitle);
  const issuer = escapeHtml(params.issuerName);
  const signer = escapeHtml(params.signerName);
  const note = params.message
    ? `<p style="color:#555;">${escapeHtml(params.message)}</p>`
    : "";
  await deliver({
    to: params.to,
    subject: `${params.issuerName} has sent you a document to sign: ${params.documentTitle}`,
    html: `<p>Hi ${signer},</p>
<p>${issuer} has sent you “${title}” to review and sign.</p>
${note}
<p><a href="${url}">Open and sign the document</a>. This link expires ${escapeHtml(params.expiresDate)}.</p>`,
    devLog: `[mailer:dev] signature request for ${params.to} — “${params.documentTitle}”: ${params.signUrl}`,
  });
}

export async function sendSignatureCompletedEmail(params: {
  to: string;
  documentTitle: string;
  issuerName: string;
  signerList: string;
  downloadUrl: string;
}): Promise<void> {
  const url = escapeHtml(params.downloadUrl);
  const title = escapeHtml(params.documentTitle);
  await deliver({
    to: params.to,
    subject: `Fully signed: ${params.documentTitle}`,
    html: `<p>“${title}” has been signed by all parties (${escapeHtml(params.signerList)}).</p>
<p><a href="${url}">Download the completed document</a>.</p>`,
    devLog: `[mailer:dev] signature completed for ${params.to} — “${params.documentTitle}”: ${params.downloadUrl}`,
  });
}
