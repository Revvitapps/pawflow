import "server-only";

// Pawflow's adoption of the shared, headless RevSign engine
// (@revvitapps/revsign). This is the ONE place the four ports are implemented
// against Pawflow's own infrastructure:
//
//   • SignatureStore → the Prisma reference adapter over Pawflow's client,
//     tenant-scoped by `tenantId` (which IS the businessId — the same
//     tenant-isolation key src/server/db.ts enforces everywhere else).
//   • StoragePort    → Vercel Blob (the same store Pawflow already uses).
//   • EmailPort      → Pawflow's mailer seam (dev-logged today; Resend later).
//   • hooks          → Pawflow's AuditEvent log.
//
// The staff session is resolved by the caller (requireSession / requireRole)
// and passed in as a StaffContext; the public /sign routes take NO session —
// the crypto-strong signing token is the auth. The engine is constructed per
// request with the request's own origin so signing links are absolute and
// correct in every environment.
import { put, del } from "@vercel/blob";
import {
  createRevSign,
  createPrismaSignatureStore,
  type RevSign,
  type StoragePort,
  type EmailPort,
  type StaffContext,
} from "@revvitapps/revsign";
import { prisma } from "@/lib/prisma";
import {
  sendSignatureRequestEmail,
  sendSignatureCompletedEmail,
} from "@/lib/mailer";

export type { StaffContext };

/** Per-product HMAC secret for signing links. Reuses the app's auth secret so
 * there's one secret to configure; each Revvit product supplies its own, so a
 * link minted by Pawflow is unforgeable in any sibling product. */
const TOKEN_SECRET =
  process.env.SIGN_TOKEN_SECRET ||
  process.env.AUTH_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  "insecure-dev-secret";

// ---------------------------------------------------------------------------
// StoragePort — Vercel Blob. Stored paths ARE the blob URLs; reads fetch them
// server-side. The blob store is the single place to swap for private-at-rest
// (point BLOB at a private store and replace fetch with a signed get).
// ---------------------------------------------------------------------------
function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-150) || "document.pdf";
}

async function readBlob(url: string): Promise<Uint8Array> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Blob read failed (${r.status})`);
  return new Uint8Array(await r.arrayBuffer());
}

const blobStorage: StoragePort = {
  async saveSourcePdf(requestId, file) {
    const { url } = await put(
      `signatures/${requestId}/source-${safeName(file.filename)}`,
      Buffer.from(file.bytes),
      { access: "public", addRandomSuffix: true, contentType: "application/pdf" },
    );
    return { storedPath: url, filename: file.filename };
  },
  async saveSignatureImage(requestId, signerId, pngBytes) {
    const { url } = await put(
      `signatures/${requestId}/signature-${signerId}.png`,
      Buffer.from(pngBytes),
      { access: "public", addRandomSuffix: true, contentType: "image/png" },
    );
    return { storedPath: url };
  },
  async saveSignedPdf(requestId, bytes) {
    const { url } = await put(
      `signatures/${requestId}/signed-${requestId}.pdf`,
      Buffer.from(bytes),
      { access: "public", addRandomSuffix: true, contentType: "application/pdf" },
    );
    return { storedPath: url };
  },
  async read(storedPath) {
    return readBlob(storedPath);
  },
  async delete(storedPath) {
    try {
      await del(storedPath);
    } catch {
      /* best-effort */
    }
  },
};

// ---------------------------------------------------------------------------
// EmailPort — dispatches on kind and renders through Pawflow's mailer seam off
// the vars the engine passes.
// ---------------------------------------------------------------------------
const emailPort: EmailPort = {
  async send(msg) {
    if (msg.kind === "signature_request") {
      await sendSignatureRequestEmail({
        to: msg.to,
        signerName: msg.vars.signer_name ?? "",
        issuerName: msg.vars.issuer_name ?? "PawFlow",
        documentTitle: msg.vars.document_title ?? "",
        message: msg.vars.message ?? "",
        signUrl: msg.vars.sign_url ?? "",
        expiresDate: msg.vars.expires_date ?? "",
      });
    } else {
      await sendSignatureCompletedEmail({
        to: msg.to,
        documentTitle: msg.vars.document_title ?? "",
        issuerName: msg.vars.issuer_name ?? "PawFlow",
        signerList: msg.vars.signer_list ?? "",
        downloadUrl: msg.vars.download_url ?? "",
      });
    }
  },
};

// ---------------------------------------------------------------------------
// The store is stable; the engine is built per request with the caller's origin.
// The Prisma reference adapter is structurally typed against the three RevSign
// models — every staff read/write it runs is scoped by `tenantId` (businessId),
// so tenant isolation holds exactly as it does through src/server/db.ts.
// ---------------------------------------------------------------------------
const store = createPrismaSignatureStore(prisma);

export function getRevSign(appBaseUrl: string): RevSign {
  return createRevSign({
    store,
    storage: blobStorage,
    email: emailPort,
    tokenSecret: TOKEN_SECRET,
    appBaseUrl,
    hooks: {
      async onRequested({ tenantId, request, userId }) {
        await prisma.auditEvent
          .create({
            data: {
              businessId: tenantId,
              actorId: userId ?? undefined,
              action: `Sent “${request.title}” for signature`,
              entityType: "SignatureRequest",
              entityId: request.id,
              metadata: {
                signers: request.signers.length,
                linkedRef: request.linkedRef ?? null,
              },
            },
          })
          .catch(() => {});
      },
      async onSigned({ tenantId, request, signer }) {
        await prisma.auditEvent
          .create({
            data: {
              businessId: tenantId,
              action: `${signer.name} signed “${request.title}”`,
              entityType: "SignatureRequest",
              entityId: request.id,
              metadata: { signerEmail: signer.email },
            },
          })
          .catch(() => {});
      },
      async onDeclined({ tenantId, request, signer, reason }) {
        await prisma.auditEvent
          .create({
            data: {
              businessId: tenantId,
              action: `${signer.name} declined “${request.title}”`,
              entityType: "SignatureRequest",
              entityId: request.id,
              metadata: { reason },
            },
          })
          .catch(() => {});
      },
      async onCompleted({ tenantId, request }) {
        await prisma.auditEvent
          .create({
            data: {
              businessId: tenantId,
              action: `“${request.title}” fully signed`,
              entityType: "SignatureRequest",
              entityId: request.id,
              metadata: { linkedRef: request.linkedRef ?? null },
            },
          })
          .catch(() => {});
      },
      async onVoided({ tenantId, request, reason }) {
        await prisma.auditEvent
          .create({
            data: {
              businessId: tenantId,
              action: `Voided “${request.title}”`,
              entityType: "SignatureRequest",
              entityId: request.id,
              metadata: { reason: reason ?? "Cancelled" },
            },
          })
          .catch(() => {});
      },
    },
  });
}
