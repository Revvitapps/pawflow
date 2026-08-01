// src/tokens.ts
import { randomBytes, randomUUID, createHmac, createHash, timingSafeEqual } from "node:crypto";
function sign(base, secret) {
  return createHmac("sha256", secret).update(base).digest("base64url");
}
function generateSignatureToken(secret) {
  const base = randomBytes(24).toString("base64url");
  const sig = sign(base, secret);
  return `${base}.${sig}`;
}
function verifySignatureTokenSignature(token, secret) {
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [base, sig] = parts;
  const expected = sign(base, secret);
  const expectedBuf = Buffer.from(expected);
  const sigBuf = Buffer.from(sig);
  if (expectedBuf.length !== sigBuf.length) return false;
  return timingSafeEqual(expectedBuf, sigBuf);
}
function sha256Hex(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}
function newId() {
  return randomUUID();
}

// src/validation.ts
import { z } from "zod";
var emailField = (message = "Enter a valid email address.") => z.string().trim().toLowerCase().pipe(z.email(message));
var SignerInputSchema = z.object({
  name: z.string().trim().min(2, "Each signer needs a name (at least 2 characters)."),
  email: emailField("Enter a valid email for each signer.")
});
var CreateSignatureRequestSchema = z.object({
  title: z.string().trim().min(2, "Give the document a title (at least 2 characters)."),
  message: z.string().trim().optional(),
  /** Opaque host reference (a change order id, quote id, engagement id…). */
  linkedRef: z.string().optional(),
  signers: z.array(SignerInputSchema).min(1, "Add at least one signer.")
});
var SubmitSignatureSchema = z.object({
  // A `data:image/png;base64,...` URL from the signature pad; strict PNG decoding
  // and size limits are enforced in the storage layer.
  signature: z.string().min(1, "Please add your signature before submitting."),
  signatureType: z.enum(["typed", "drawn"]),
  consent: z.boolean().refine((v) => v === true, "You must agree to sign electronically to continue.")
});
var DeclineSignatureSchema = z.object({
  reason: z.string().trim().min(3, "Please give a brief reason for declining.")
});
var VoidSignatureSchema = z.object({
  reason: z.string().trim().optional()
});

// src/upload.ts
var MAX_PDF_BYTES = 20 * 1024 * 1024;
var MAX_SIGNATURE_IMAGE_BYTES = 1 * 1024 * 1024;
var PNG_MAGIC = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
function validateSourcePdf(input) {
  if (input.size === 0) return { valid: false, error: "The selected file is empty." };
  if (input.size > MAX_PDF_BYTES) {
    return { valid: false, error: "Files must be 20MB or smaller." };
  }
  if (input.type !== "application/pdf") {
    return { valid: false, error: "The document to sign must be a PDF." };
  }
  return { valid: true };
}
function looksLikePdf(bytes) {
  return bytes.length >= 5 && bytes[0] === 37 && // %
  bytes[1] === 80 && // P
  bytes[2] === 68 && // D
  bytes[3] === 70 && // F
  bytes[4] === 45;
}
function decodeSignatureDataUrl(dataUrl) {
  const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl.trim());
  if (!match) return { error: "Your signature could not be read. Please try again." };
  const bytes = new Uint8Array(Buffer.from(match[1], "base64"));
  if (bytes.length === 0) return { error: "Please provide a signature before submitting." };
  if (bytes.length > MAX_SIGNATURE_IMAGE_BYTES) {
    return { error: "That signature image is too large." };
  }
  if (bytes.length < 8 || !startsWith(bytes, PNG_MAGIC)) {
    return { error: "Your signature could not be read. Please try again." };
  }
  return { bytes };
}
function startsWith(bytes, prefix) {
  for (let i = 0; i < prefix.length; i++) {
    if (bytes[i] !== prefix[i]) return false;
  }
  return true;
}

// src/certificate.ts
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
var LETTER = [612, 792];
var MARGIN = 54;
var INK = rgb(0.1, 0.1, 0.12);
var MUTED = rgb(0.42, 0.42, 0.46);
var LINE = rgb(0.8, 0.8, 0.83);
function formatUtc(date) {
  if (!date) return "\u2014";
  return date.toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");
}
function clip(value, max = 90) {
  if (!value) return "\u2014";
  return value.length > max ? `${value.slice(0, max - 1)}\u2026` : value;
}
var Cursor = class {
  constructor(pdf, font, bold) {
    this.pdf = pdf;
    this.font = font;
    this.bold = bold;
    this.page = pdf.addPage(LETTER);
    this.y = LETTER[1] - MARGIN;
  }
  pdf;
  font;
  bold;
  page;
  y;
  ensure(space) {
    if (this.y - space < MARGIN) {
      this.page = this.pdf.addPage(LETTER);
      this.y = LETTER[1] - MARGIN;
    }
  }
  heading(text) {
    this.ensure(40);
    this.page.drawText(text, { x: MARGIN, y: this.y, size: 18, font: this.bold, color: INK });
    this.y -= 26;
    this.rule();
    this.y -= 14;
  }
  rule() {
    this.page.drawLine({
      start: { x: MARGIN, y: this.y },
      end: { x: LETTER[0] - MARGIN, y: this.y },
      thickness: 1,
      color: LINE
    });
  }
  label(text, size = 10) {
    this.ensure(size + 6);
    this.page.drawText(text, { x: MARGIN, y: this.y, size, font: this.bold, color: INK });
    this.y -= size + 6;
  }
  line(text, size = 10, indent = 0) {
    this.ensure(size + 5);
    this.page.drawText(text, {
      x: MARGIN + indent,
      y: this.y,
      size,
      font: this.font,
      color: MUTED
    });
    this.y -= size + 5;
  }
  gap(space = 12) {
    this.y -= space;
  }
  async image(bytes) {
    const png = await this.pdf.embedPng(bytes);
    const maxW = 200;
    const maxH = 64;
    const scale = Math.min(maxW / png.width, maxH / png.height, 1);
    const w = png.width * scale;
    const h = png.height * scale;
    this.ensure(h + 6);
    this.y -= h;
    this.page.drawImage(png, { x: MARGIN, y: this.y, width: w, height: h });
    this.y -= 6;
  }
};
async function buildSignedPdf(originalBytes, params) {
  const pdf = await PDFDocument.load(originalBytes);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const cursor = new Cursor(pdf, font, bold);
  cursor.heading("Signatures");
  cursor.line(`Document: ${clip(params.title, 80)}`);
  cursor.line(`Prepared by: ${params.issuerName}`);
  cursor.gap(10);
  for (const signer of params.signers) {
    cursor.label(signer.name);
    cursor.line(signer.email);
    if (signer.signatureImage && signer.signatureImage.length > 0) {
      await cursor.image(signer.signatureImage);
    } else {
      cursor.line("(no signature captured)");
    }
    cursor.line(
      `Signed ${formatUtc(signer.signedAt)}` + (signer.signatureType ? `  \xB7  ${signer.signatureType} signature` : "")
    );
    cursor.gap(16);
  }
  cursor.page = pdf.addPage(LETTER);
  cursor.y = LETTER[1] - MARGIN;
  cursor.heading("Certificate of Completion");
  cursor.line(`Document title: ${clip(params.title, 80)}`);
  cursor.line(`Envelope ID: ${params.requestId}`);
  cursor.line(`Source document SHA-256: ${params.documentHash}`);
  cursor.line(`Completed: ${formatUtc(params.completedAt)}`);
  cursor.line(`Issued by: ${params.issuerName}`);
  cursor.gap(16);
  cursor.label("Signer audit trail");
  cursor.gap(4);
  for (const signer of params.signers) {
    cursor.label(`${signer.name} <${signer.email}>`, 11);
    cursor.line(`Consented to sign electronically: ${formatUtc(signer.consentedAt)}`, 9, 12);
    cursor.line(`Viewed document: ${formatUtc(signer.viewedAt)}`, 9, 12);
    cursor.line(`Signed: ${formatUtc(signer.signedAt)}`, 9, 12);
    cursor.line(`IP address: ${clip(signer.signedIp, 45)}`, 9, 12);
    cursor.line(`Device: ${clip(signer.signedUserAgent)}`, 9, 12);
    cursor.gap(12);
  }
  cursor.gap(6);
  cursor.line(
    "This certificate accompanies an electronically signed document. Each signature above was applied",
    8
  );
  cursor.line(
    "by the named signer via a unique, expiring link after agreeing to do business electronically",
    8
  );
  cursor.line("(consistent with the U.S. ESIGN Act and UETA).", 8);
  return pdf.save();
}

// src/engine.ts
var DEFAULT_TTL_DAYS = 30;
var REQUEST_OPEN = /* @__PURE__ */ new Set(["SENT", "VIEWED"]);
function friendlyDate(d) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC"
  }).format(d);
}
function createRevSign(config) {
  const { store, storage, email, tokenSecret, appBaseUrl, hooks } = config;
  const ttlDays = config.signTokenTtlDays ?? DEFAULT_TTL_DAYS;
  function signUrl(token) {
    return `${appBaseUrl.replace(/\/$/, "")}/sign/${token}`;
  }
  async function resolveSigner(token) {
    if (!verifySignatureTokenSignature(token, tokenSecret)) return null;
    const signer = await store.getSignerByToken(token);
    if (!signer) return null;
    if (signer.signTokenRevoked) return null;
    if (signer.signTokenExpiresAt.getTime() < Date.now()) return null;
    return signer;
  }
  async function finalizeSignedDocument(request, issuerName) {
    const originalBytes = await storage.read(request.originalPath);
    const documentHash = sha256Hex(originalBytes);
    const completedAt = /* @__PURE__ */ new Date();
    const certSigners = await Promise.all(
      request.signers.map(async (s) => ({
        name: s.name,
        email: s.email,
        signatureType: s.signatureType,
        signatureImage: s.signatureImagePath ? await storage.read(s.signatureImagePath) : null,
        consentedAt: s.consentedAt,
        viewedAt: s.viewedAt,
        signedAt: s.signedAt,
        signedIp: s.signedIp,
        signedUserAgent: s.signedUserAgent
      }))
    );
    const signedBytes = await buildSignedPdf(originalBytes, {
      title: request.title,
      issuerName,
      requestId: request.id,
      documentHash,
      completedAt,
      signers: certSigners
    });
    const { storedPath: signedPath } = await storage.saveSignedPdf(request.id, signedBytes);
    const completed = await store.completeRequest(request.id, { signedPath, documentHash });
    if (!completed) return;
    await store.recordEvent({ requestId: request.id, type: "completed" });
    const signerList = request.signers.map((s) => s.name).join(", ");
    const recipients = request.signers.map((s) => ({
      to: s.email,
      downloadUrl: `${appBaseUrl.replace(/\/$/, "")}/sign/${s.signToken}/signed`
    }));
    await Promise.all(
      recipients.map(
        ({ to, downloadUrl }) => email.send({
          to,
          kind: "signature_completed",
          tenantId: request.tenantId,
          linkedRef: request.linkedRef,
          vars: {
            document_title: request.title,
            issuer_name: issuerName,
            signer_list: signerList,
            download_url: downloadUrl
          }
        })
      )
    );
    await hooks?.onCompleted?.({ tenantId: request.tenantId, request: completed });
  }
  return {
    signUrl,
    resolveSigner,
    async listRequests(ctx) {
      return store.listRequests(ctx.tenantId);
    },
    async getRequest(ctx, requestId) {
      return store.getRequestScoped(ctx.tenantId, requestId);
    },
    async createRequest(ctx, input) {
      const parsed = CreateSignatureRequestSchema.safeParse({
        title: input.title,
        message: input.message ?? void 0,
        linkedRef: input.linkedRef ?? void 0,
        signers: input.signers
      });
      if (!parsed.success) {
        return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
      }
      const pdfCheck = validateSourcePdf({ size: input.pdf.size, type: input.pdf.type });
      if (!pdfCheck.valid) return { ok: false, error: pdfCheck.error };
      if (!looksLikePdf(input.pdf.bytes)) {
        return { ok: false, error: "The document to sign must be a PDF." };
      }
      const expiresAt = /* @__PURE__ */ new Date();
      expiresAt.setDate(expiresAt.getDate() + ttlDays);
      const signTokens = parsed.data.signers.map(() => generateSignatureToken(tokenSecret));
      const request = await store.createRequest(ctx.tenantId, {
        title: parsed.data.title,
        message: parsed.data.message ?? null,
        linkedRef: parsed.data.linkedRef ?? null,
        createdById: ctx.userId ?? null,
        originalFilename: input.pdf.filename || "document.pdf",
        originalPath: "",
        signers: parsed.data.signers,
        signTokens,
        signTokenExpiresAt: expiresAt
      });
      const saved = await storage.saveSourcePdf(request.id, {
        bytes: input.pdf.bytes,
        filename: input.pdf.filename || "document.pdf"
      });
      await store.setRequestSource(request.id, {
        originalPath: saved.storedPath,
        originalFilename: saved.filename
      });
      await store.recordEvent({
        requestId: request.id,
        type: "sent",
        metadata: { signerCount: request.signers.length }
      });
      const issuerName = ctx.tenantName ?? "Your team";
      const expiresDate = friendlyDate(expiresAt);
      await Promise.all(
        request.signers.map(
          (signer) => email.send({
            to: signer.email,
            kind: "signature_request",
            tenantId: ctx.tenantId,
            linkedRef: request.linkedRef,
            vars: {
              signer_name: signer.name,
              issuer_name: issuerName,
              document_title: request.title,
              message: request.message ?? "",
              sign_url: signUrl(signer.signToken),
              expires_date: expiresDate
            }
          })
        )
      );
      await hooks?.onRequested?.({ tenantId: ctx.tenantId, request, userId: ctx.userId ?? null });
      return { ok: true, requestId: request.id };
    },
    async voidRequest(ctx, requestId, reason) {
      const parsed = VoidSignatureSchema.safeParse({ reason: reason ?? void 0 });
      if (!parsed.success) {
        return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
      }
      const voided = await store.voidRequestScoped(
        ctx.tenantId,
        requestId,
        parsed.data.reason ?? null
      );
      if (!voided) return { ok: false, error: "This request can no longer be voided." };
      await store.recordEvent({
        requestId,
        type: "voided",
        metadata: parsed.data.reason ? { reason: parsed.data.reason } : void 0
      });
      await hooks?.onVoided?.({
        tenantId: ctx.tenantId,
        request: voided,
        reason: parsed.data.reason ?? null
      });
      return { ok: true };
    },
    async resendSigner(ctx, requestId, signerId) {
      const request = await store.getRequestScoped(ctx.tenantId, requestId);
      if (!request) return { ok: false, error: "Signature request not found." };
      const signer = request.signers.find((s) => s.id === signerId);
      if (!signer) return { ok: false, error: "Signer not found." };
      if (signer.status === "SIGNED" || signer.signTokenRevoked) {
        return { ok: false, error: "That signer can no longer be reminded." };
      }
      const issuerName = ctx.tenantName ?? "Your team";
      await email.send({
        to: signer.email,
        kind: "signature_request",
        tenantId: ctx.tenantId,
        linkedRef: request.linkedRef,
        vars: {
          signer_name: signer.name,
          issuer_name: issuerName,
          document_title: request.title,
          message: request.message ?? "",
          sign_url: signUrl(signer.signToken),
          expires_date: friendlyDate(signer.signTokenExpiresAt)
        }
      });
      await store.recordEvent({
        requestId,
        signerId,
        type: "resent",
        metadata: { to: signer.email }
      });
      return { ok: true };
    },
    async submitSignature(token, rawInput, meta) {
      const signer = await resolveSigner(token);
      if (!signer) return { ok: false, error: "This signing link is invalid or has expired." };
      const request = signer.request;
      if (!REQUEST_OPEN.has(request.status) || signer.status === "SIGNED" || signer.status === "DECLINED") {
        return { ok: true };
      }
      const parsed = SubmitSignatureSchema.safeParse({
        signature: rawInput.signature,
        signatureType: rawInput.signatureType,
        consent: rawInput.consent
      });
      if (!parsed.success) {
        return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
      }
      const decoded = decodeSignatureDataUrl(parsed.data.signature);
      if ("error" in decoded) return { ok: false, error: decoded.error };
      const saved = await storage.saveSignatureImage(request.id, signer.id, decoded.bytes);
      const consentedAt = /* @__PURE__ */ new Date();
      await store.markSignerSigned(signer.id, {
        signatureType: parsed.data.signatureType,
        signatureImagePath: saved.storedPath,
        consentedAt,
        signedIp: meta.ip ?? null,
        signedUserAgent: meta.userAgent ?? null
      });
      await store.recordEvent({
        requestId: request.id,
        signerId: signer.id,
        type: "signed",
        ip: meta.ip ?? null,
        userAgent: meta.userAgent ?? null,
        metadata: { signatureType: parsed.data.signatureType }
      });
      await hooks?.onSigned?.({ tenantId: request.tenantId, request, signer });
      const fresh = await store.getRequestScoped(request.tenantId, request.id);
      if (fresh && fresh.status !== "COMPLETED" && fresh.signers.every((s) => s.status === "SIGNED")) {
        await finalizeSignedDocument(fresh, "The issuing party");
      }
      return { ok: true };
    },
    async declineSignature(token, rawInput, meta) {
      const signer = await resolveSigner(token);
      if (!signer) return { ok: false, error: "This signing link is invalid or has expired." };
      const request = signer.request;
      if (!REQUEST_OPEN.has(request.status) || signer.status === "SIGNED" || signer.status === "DECLINED") {
        return { ok: true };
      }
      const parsed = DeclineSignatureSchema.safeParse({ reason: rawInput.reason });
      if (!parsed.success) {
        return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
      }
      await store.markSignerDeclined(signer.id, {
        reason: parsed.data.reason,
        ip: meta.ip ?? null,
        userAgent: meta.userAgent ?? null
      });
      await store.declineRequest(request.id);
      await store.recordEvent({
        requestId: request.id,
        signerId: signer.id,
        type: "declined",
        ip: meta.ip ?? null,
        userAgent: meta.userAgent ?? null,
        metadata: { reason: parsed.data.reason }
      });
      await hooks?.onDeclined?.({
        tenantId: request.tenantId,
        request,
        signer,
        reason: parsed.data.reason
      });
      return { ok: true };
    },
    handlers: {
      async signerDocument(token, meta) {
        const signer = await resolveSigner(token);
        if (!signer) return new Response("Not found", { status: 404 });
        const request = signer.request;
        if (request.status === "SENT" || request.status === "VIEWED") {
          const prev = await store.markSignerViewed(signer.id);
          if (prev && prev.status === "PENDING") {
            await store.recordEvent({
              requestId: request.id,
              signerId: signer.id,
              type: "viewed",
              ip: meta.ip ?? null,
              userAgent: meta.userAgent ?? null
            });
          }
        }
        if (!request.originalPath) return new Response("Not found", { status: 404 });
        const bytes = await storage.read(request.originalPath);
        return pdfResponse(bytes, request.originalFilename, "inline");
      },
      async signerSigned(token) {
        const signer = await resolveSigner(token);
        if (!signer) return new Response("Not found", { status: 404 });
        const request = signer.request;
        if (request.status !== "COMPLETED" || !request.signedPath) {
          return new Response("Not found", { status: 404 });
        }
        const bytes = await storage.read(request.signedPath);
        const filename = request.originalFilename.replace(/\.pdf$/i, "") + "-signed.pdf";
        return pdfResponse(bytes, filename, "inline");
      },
      async staffDocument(ctx, requestId, opts) {
        const request = await store.getRequestScoped(ctx.tenantId, requestId);
        if (!request) return new Response("Not found", { status: 404 });
        const wantSigned = opts?.signed === true;
        const storedPath = wantSigned ? request.signedPath : request.originalPath;
        if (!storedPath) return new Response("Not found", { status: 404 });
        const bytes = await storage.read(storedPath);
        const base = request.originalFilename.replace(/\.pdf$/i, "");
        const filename = `${base}${wantSigned ? "-signed" : ""}.pdf`;
        return pdfResponse(bytes, filename, "inline");
      }
    },
    lib: {
      buildSignedPdf,
      generateSignatureToken: (secret) => generateSignatureToken(secret ?? tokenSecret),
      verifySignatureTokenSignature: (token) => verifySignatureTokenSignature(token, tokenSecret),
      decodeSignatureDataUrl,
      validateSourcePdf,
      schemas: {
        CreateSignatureRequestSchema,
        SubmitSignatureSchema,
        DeclineSignatureSchema,
        VoidSignatureSchema
      }
    }
  };
}
function pdfResponse(bytes, filename, disposition) {
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${encodeURIComponent(filename)}"`,
      "Content-Length": String(bytes.length)
    }
  });
}

// src/store/prisma-adapter.ts
var requestInclude = { signers: { orderBy: { order: "asc" } } };
function createPrismaSignatureStore(prisma) {
  return {
    async listRequests(tenantId) {
      return await prisma.signatureRequest.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        include: requestInclude
      });
    },
    async getRequestScoped(tenantId, requestId) {
      return await prisma.signatureRequest.findFirst({
        where: { id: requestId, tenantId },
        include: requestInclude
      });
    },
    async createRequest(tenantId, input) {
      return await prisma.signatureRequest.create({
        data: {
          tenantId,
          title: input.title,
          message: input.message ?? null,
          linkedRef: input.linkedRef ?? null,
          createdById: input.createdById ?? null,
          originalFilename: input.originalFilename,
          originalPath: input.originalPath,
          status: "SENT",
          sentAt: /* @__PURE__ */ new Date(),
          signers: {
            create: input.signers.map((s, i) => ({
              name: s.name,
              email: s.email,
              order: i,
              signToken: input.signTokens[i],
              signTokenExpiresAt: input.signTokenExpiresAt
            }))
          },
          events: { create: { type: "created" } }
        },
        include: requestInclude
      });
    },
    async setRequestSource(requestId, data) {
      await prisma.signatureRequest.update({
        where: { id: requestId },
        data: { originalPath: data.originalPath, originalFilename: data.originalFilename }
      });
    },
    async voidRequestScoped(tenantId, requestId, reason) {
      const result = await prisma.signatureRequest.updateMany({
        where: { id: requestId, tenantId, status: { notIn: ["COMPLETED", "VOIDED"] } },
        data: { status: "VOIDED", voidedAt: /* @__PURE__ */ new Date(), voidReason: reason ?? null }
      });
      if (result.count === 0) return null;
      await prisma.signer.updateMany({
        where: { requestId },
        data: { signTokenRevoked: true }
      });
      return this.getRequestScoped(tenantId, requestId);
    },
    async getSignerByToken(token) {
      return await prisma.signer.findUnique({
        where: { signToken: token },
        include: { request: { include: requestInclude } }
      });
    },
    async markSignerViewed(signerId) {
      const signer = await prisma.signer.findUnique({
        where: { id: signerId }
      });
      if (!signer) return null;
      if (signer.status === "PENDING") {
        await prisma.signer.update({
          where: { id: signerId },
          data: { status: "VIEWED", viewedAt: signer.viewedAt ?? /* @__PURE__ */ new Date() }
        });
      }
      await prisma.signatureRequest.updateMany({
        where: { id: signer.requestId, status: "SENT" },
        data: { status: "VIEWED" }
      });
      return signer;
    },
    async markSignerSigned(signerId, data) {
      await prisma.signer.update({
        where: { id: signerId },
        data: {
          status: "SIGNED",
          signatureType: data.signatureType,
          signatureImagePath: data.signatureImagePath,
          consentedAt: data.consentedAt,
          signedAt: /* @__PURE__ */ new Date(),
          signedIp: data.signedIp ?? null,
          signedUserAgent: data.signedUserAgent ?? null
        }
      });
    },
    async markSignerDeclined(signerId, data) {
      await prisma.signer.update({
        where: { id: signerId },
        data: {
          status: "DECLINED",
          declinedAt: /* @__PURE__ */ new Date(),
          declineReason: data.reason,
          signedIp: data.ip ?? null,
          signedUserAgent: data.userAgent ?? null
        }
      });
    },
    async declineRequest(requestId) {
      await prisma.signer.updateMany({
        where: { requestId, status: { in: ["PENDING", "VIEWED"] } },
        data: { signTokenRevoked: true }
      });
      await prisma.signatureRequest.update({
        where: { id: requestId },
        data: { status: "DECLINED" }
      });
    },
    async completeRequest(requestId, data) {
      const result = await prisma.signatureRequest.updateMany({
        where: { id: requestId, status: { not: "COMPLETED" } },
        data: {
          status: "COMPLETED",
          completedAt: /* @__PURE__ */ new Date(),
          signedPath: data.signedPath,
          documentHash: data.documentHash
        }
      });
      if (result.count === 0) return null;
      return await prisma.signatureRequest.findUnique({
        where: { id: requestId },
        include: requestInclude
      });
    },
    async recordEvent(params) {
      await prisma.signatureEvent.create({
        data: {
          requestId: params.requestId,
          signerId: params.signerId ?? null,
          type: params.type,
          ip: params.ip ?? null,
          userAgent: params.userAgent ?? null,
          metadata: params.metadata ? JSON.stringify(params.metadata) : null
        }
      });
    }
  };
}

// src/storage/local-fs.ts
import { randomUUID as randomUUID2 } from "node:crypto";
import path from "node:path";
import fs from "node:fs/promises";
function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-150);
}
function createLocalFsStorage(opts) {
  const root = path.resolve(opts.rootDir);
  function resolveWithinRoot(storedPath) {
    const absolute = path.resolve(root, storedPath);
    if (absolute !== root && !absolute.startsWith(root + path.sep)) {
      throw new Error("Refusing to access a path outside the storage root.");
    }
    return absolute;
  }
  function requestDir(requestId) {
    return path.join(root, "signatures", sanitizeFilename(requestId));
  }
  return {
    async saveSourcePdf(requestId, file) {
      const dir = requestDir(requestId);
      await fs.mkdir(dir, { recursive: true });
      const safeName = sanitizeFilename(file.filename || "document.pdf");
      const storedName = `source-${randomUUID2()}-${safeName}`;
      const absolute = path.join(dir, storedName);
      await fs.writeFile(absolute, file.bytes);
      return { storedPath: path.relative(root, absolute), filename: file.filename || safeName };
    },
    async saveSignatureImage(requestId, signerId, pngBytes) {
      const dir = requestDir(requestId);
      await fs.mkdir(dir, { recursive: true });
      const absolute = path.join(dir, `signature-${sanitizeFilename(signerId)}.png`);
      await fs.writeFile(absolute, pngBytes);
      return { storedPath: path.relative(root, absolute) };
    },
    async saveSignedPdf(requestId, bytes) {
      const dir = requestDir(requestId);
      await fs.mkdir(dir, { recursive: true });
      const absolute = path.join(dir, `signed-${sanitizeFilename(requestId)}.pdf`);
      await fs.writeFile(absolute, bytes);
      return { storedPath: path.relative(root, absolute) };
    },
    async read(storedPath) {
      const absolute = resolveWithinRoot(storedPath);
      return new Uint8Array(await fs.readFile(absolute));
    },
    async delete(storedPath) {
      const absolute = resolveWithinRoot(storedPath);
      await fs.rm(absolute, { force: true });
    }
  };
}

// src/email-templates.ts
function applyVars(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_m, key) => vars[key] ?? "");
}
var TEMPLATES = {
  signature_request: {
    subject: "{{issuer_name}} has sent you a document to sign",
    body: [
      "Hi {{signer_name}},",
      "",
      "{{issuer_name}} has asked you to review and sign \u201C{{document_title}}\u201D.",
      "",
      "{{message}}",
      "",
      "Sign here: {{sign_url}}",
      "",
      "This link is private to you and expires on {{expires_date}}."
    ].join("\n")
  },
  signature_completed: {
    subject: "\u201C{{document_title}}\u201D is fully signed",
    body: [
      "\u201C{{document_title}}\u201D has been signed by everyone ({{signer_list}}).",
      "",
      "Download the completed copy, including the certificate of completion:",
      "{{download_url}}",
      "",
      "Issued by {{issuer_name}}."
    ].join("\n")
  }
};
function renderRevSignEmail(kind, vars) {
  const t = TEMPLATES[kind];
  return { subject: applyVars(t.subject, vars), body: applyVars(t.body, vars) };
}
export {
  CreateSignatureRequestSchema,
  DeclineSignatureSchema,
  SignerInputSchema,
  SubmitSignatureSchema,
  VoidSignatureSchema,
  buildSignedPdf,
  createLocalFsStorage,
  createPrismaSignatureStore,
  createRevSign,
  decodeSignatureDataUrl,
  generateSignatureToken,
  looksLikePdf,
  newId,
  renderRevSignEmail,
  sha256Hex,
  validateSourcePdf,
  verifySignatureTokenSignature
};
