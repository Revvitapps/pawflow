import { z } from 'zod';

/**
 * The injectable seams of RevSign. A host product (DocuChase, FieldFirst,
 * TradeOS, StayOS, Pawflow, Proposal Gen) implements these ports against its
 * own database, storage, and email provider; the engine stays framework- and
 * persistence-agnostic and knows nothing about any one app's Prisma client,
 * session model, or file system.
 *
 * Tenancy is expressed as an OPAQUE `tenantId` throughout — never `firmId`,
 * `businessId`, `orgId`, etc. Each host maps its own tenant column to it. The
 * store is the single tenant-isolation boundary: every scoped read/write takes
 * a `tenantId` and must include it in its WHERE clause.
 */
export type SignatureRequestStatus = "DRAFT" | "SENT" | "VIEWED" | "COMPLETED" | "DECLINED" | "VOIDED";
export type SignerStatus = "PENDING" | "VIEWED" | "SIGNED" | "DECLINED";
export interface SignerRecord {
	id: string;
	requestId: string;
	name: string;
	email: string;
	order: number;
	status: SignerStatus;
	signToken: string;
	signTokenExpiresAt: Date;
	signTokenRevoked: boolean;
	signatureType: string | null;
	signatureImagePath: string | null;
	consentedAt: Date | null;
	viewedAt: Date | null;
	signedAt: Date | null;
	declinedAt: Date | null;
	declineReason: string | null;
	signedIp: string | null;
	signedUserAgent: string | null;
}
export interface SignatureRequestRecord {
	id: string;
	tenantId: string;
	title: string;
	message: string | null;
	status: SignatureRequestStatus;
	/**
	 * Opaque back-reference to whatever the host document is (a change order, a
	 * quote, an engagement, a work order…). RevSign never interprets it; the host
	 * uses it to link the request back to its own object and to power hooks.
	 */
	linkedRef: string | null;
	originalFilename: string;
	originalPath: string;
	signedPath: string | null;
	documentHash: string | null;
	createdById: string | null;
	createdAt: Date;
	sentAt: Date | null;
	completedAt: Date | null;
	voidedAt: Date | null;
	voidReason: string | null;
}
/** A request joined to its signers, as most reads return it. */
export interface SignatureRequestWithSigners extends SignatureRequestRecord {
	signers: SignerRecord[];
}
/** A signer joined to its parent request (with all sibling signers). The shape
 * the public signing flow resolves a token into. */
export interface SignerWithRequest extends SignerRecord {
	request: SignatureRequestWithSigners;
}
export interface CreateSignatureRequestInput {
	title: string;
	message?: string | null;
	linkedRef?: string | null;
	createdById?: string | null;
	originalFilename: string;
	originalPath: string;
	signers: {
		name: string;
		email: string;
	}[];
	/** Pre-minted, HMAC-signed signing token per signer (parallel to `signers`). */
	signTokens: string[];
	/** Shared expiry for every signer's link. */
	signTokenExpiresAt: Date;
}
export interface SignatureStore {
	listRequests(tenantId: string): Promise<SignatureRequestWithSigners[]>;
	getRequestScoped(tenantId: string, requestId: string): Promise<SignatureRequestWithSigners | null>;
	createRequest(tenantId: string, input: CreateSignatureRequestInput): Promise<SignatureRequestWithSigners>;
	setRequestSource(requestId: string, data: {
		originalPath: string;
		originalFilename: string;
	}): Promise<void>;
	/** Tenant-scoped void; must revoke every signer token. Returns null if the
	 * request can no longer be voided (already completed/voided, or wrong tenant). */
	voidRequestScoped(tenantId: string, requestId: string, reason: string | null): Promise<SignatureRequestWithSigners | null>;
	/** Global lookup by signing token. The caller verifies the HMAC signature and
	 * re-checks expiry/revocation (see `resolveSigner`). */
	getSignerByToken(token: string): Promise<SignerWithRequest | null>;
	markSignerViewed(signerId: string): Promise<SignerRecord | null>;
	markSignerSigned(signerId: string, data: {
		signatureType: "typed" | "drawn";
		signatureImagePath: string;
		consentedAt: Date;
		signedIp?: string | null;
		signedUserAgent?: string | null;
	}): Promise<void>;
	markSignerDeclined(signerId: string, data: {
		reason: string;
		ip?: string | null;
		userAgent?: string | null;
	}): Promise<void>;
	/** Marks the whole request DECLINED and revokes outstanding tokens. */
	declineRequest(requestId: string): Promise<void>;
	/** Idempotent completion — returns null if another finalize already completed
	 * it (guard on `status != COMPLETED`), so completion side effects run once. */
	completeRequest(requestId: string, data: {
		signedPath: string;
		documentHash: string;
	}): Promise<SignatureRequestWithSigners | null>;
	recordEvent(params: {
		requestId: string;
		signerId?: string | null;
		type: string;
		ip?: string | null;
		userAgent?: string | null;
		metadata?: Record<string, unknown>;
	}): Promise<void>;
}
export interface StoragePort {
	/** Persist a source PDF for a request; returns the opaque stored path. */
	saveSourcePdf(requestId: string, file: {
		bytes: Uint8Array;
		filename: string;
	}): Promise<{
		storedPath: string;
		filename: string;
	}>;
	/** Persist a signer's rendered signature PNG (raw bytes already validated). */
	saveSignatureImage(requestId: string, signerId: string, pngBytes: Uint8Array): Promise<{
		storedPath: string;
	}>;
	/** Persist the finished, signed PDF. */
	saveSignedPdf(requestId: string, bytes: Uint8Array): Promise<{
		storedPath: string;
	}>;
	/** Read a previously stored object. */
	read(storedPath: string): Promise<Uint8Array>;
	/** Best-effort delete. */
	delete(storedPath: string): Promise<void>;
}
export interface SignatureEmail {
	to: string;
	kind: "signature_request" | "signature_completed";
	/** The tenant this send belongs to, and the linked host object if any — so a
	 * host can attribute/log the send however it likes. */
	tenantId: string;
	linkedRef?: string | null;
	vars: Record<string, string>;
}
export interface EmailPort {
	send(email: SignatureEmail): Promise<void>;
}
export interface StaffContext {
	tenantId: string;
	userId?: string | null;
	/** Display name used on emails / the certificate as the issuing party. */
	tenantName?: string | null;
}
export interface RevSignHooks {
	onRequested?(ctx: {
		tenantId: string;
		request: SignatureRequestWithSigners;
		userId?: string | null;
	}): Promise<void> | void;
	onSigned?(ctx: {
		tenantId: string;
		request: SignatureRequestWithSigners;
		signer: SignerRecord;
	}): Promise<void> | void;
	onDeclined?(ctx: {
		tenantId: string;
		request: SignatureRequestWithSigners;
		signer: SignerRecord;
		reason: string;
	}): Promise<void> | void;
	onCompleted?(ctx: {
		tenantId: string;
		request: SignatureRequestWithSigners;
	}): Promise<void> | void;
	onVoided?(ctx: {
		tenantId: string;
		request: SignatureRequestWithSigners;
		reason: string | null;
	}): Promise<void> | void;
}
export interface RevSignConfig {
	store: SignatureStore;
	storage: StoragePort;
	email: EmailPort;
	/** HMAC secret for signing-link tokens. Each product supplies its own. */
	tokenSecret: string;
	/** Absolute base URL for building signing links, e.g. https://app.example.com */
	appBaseUrl: string;
	/** How long a signing link stays valid. Default 30 days. */
	signTokenTtlDays?: number;
	hooks?: RevSignHooks;
}
export declare const SignerInputSchema: z.ZodObject<{
	name: z.ZodString;
	email: z.ZodPipe<z.ZodString, z.ZodEmail>;
}, z.core.$strip>;
export declare const CreateSignatureRequestSchema: z.ZodObject<{
	title: z.ZodString;
	message: z.ZodOptional<z.ZodString>;
	linkedRef: z.ZodOptional<z.ZodString>;
	signers: z.ZodArray<z.ZodObject<{
		name: z.ZodString;
		email: z.ZodPipe<z.ZodString, z.ZodEmail>;
	}, z.core.$strip>>;
}, z.core.$strip>;
export declare const SubmitSignatureSchema: z.ZodObject<{
	signature: z.ZodString;
	signatureType: z.ZodEnum<{
		typed: "typed";
		drawn: "drawn";
	}>;
	consent: z.ZodBoolean;
}, z.core.$strip>;
export declare const DeclineSignatureSchema: z.ZodObject<{
	reason: z.ZodString;
}, z.core.$strip>;
export declare const VoidSignatureSchema: z.ZodObject<{
	reason: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
/**
 * Framework-free upload validators — no fs, no DB, no provider. These enforce
 * RevSign's security properties on the two things a host feeds in: a source PDF
 * and a signature-pad PNG data URL. Backend-agnostic, so they run the same on
 * local-fs, S3, GCS, or Vercel Blob.
 */
export type ValidationResult = {
	valid: true;
} | {
	valid: false;
	error: string;
};
/** A signature request's source document must be a single, non-empty PDF. */
export declare function validateSourcePdf(input: {
	size: number;
	type: string;
}): ValidationResult;
/** Defense-in-depth on the raw bytes: a PDF starts with "%PDF-". */
export declare function looksLikePdf(bytes: Uint8Array): boolean;
/**
 * Decodes and validates a signature PNG supplied as a `data:image/png;base64,...`
 * URL (produced by the in-browser signature pad). Validates the MIME prefix, caps
 * the decoded size, and enforces the PNG magic number so a signer can't smuggle a
 * huge or non-PNG payload through. Returns the raw PNG bytes for embedding.
 */
export declare function decodeSignatureDataUrl(dataUrl: string): {
	bytes: Uint8Array;
} | {
	error: string;
};
/**
 * Turns an unsigned source PDF into the finished, signed PDF.
 *
 * Rather than overlaying signature fields at fixed coordinates on the original
 * (fragile for arbitrary documents), we APPEND authoritative pages the signers
 * can't have styled around:
 *   1. a "Signatures" page showing each signer's rendered signature image with
 *      their printed name, email, and signing timestamp, and
 *   2. a "Certificate of Completion" page with the document fingerprint
 *      (SHA-256) and the full, per-signer audit trail (consent, view, sign, IP,
 *      device) — the record that makes the signatures legally attributable.
 *
 * Pure and deterministic given its inputs, so it's unit-testable without a DB.
 * Ported verbatim from DocuChase, with `firmName` generalized to `issuerName`.
 */
export interface SignerCertificateInfo {
	name: string;
	email: string;
	signatureType?: string | null;
	/** Raw PNG bytes of the rendered signature; null if this signer hasn't signed. */
	signatureImage?: Uint8Array | null;
	consentedAt?: Date | null;
	viewedAt?: Date | null;
	signedAt?: Date | null;
	signedIp?: string | null;
	signedUserAgent?: string | null;
}
export interface BuildSignedPdfParams {
	title: string;
	/** The party that issued the request (firm/business/company name). */
	issuerName: string;
	requestId: string;
	/** SHA-256 (hex) of the original source PDF bytes. */
	documentHash: string;
	completedAt: Date;
	signers: SignerCertificateInfo[];
}
export declare function buildSignedPdf(originalBytes: Uint8Array, params: BuildSignedPdfParams): Promise<Uint8Array>;
export type RevSignResult<T = {}> = ({
	ok: true;
} & T) | {
	ok: false;
	error: string;
};
export interface RequestMeta {
	ip?: string | null;
	userAgent?: string | null;
}
/** The document to be signed, as bytes + metadata (host reads it from its form). */
export interface SourcePdfInput {
	bytes: Uint8Array;
	filename: string;
	size: number;
	type: string;
}
export interface CreateRequestInput {
	title: string;
	message?: string | null;
	linkedRef?: string | null;
	signers: {
		name: string;
		email: string;
	}[];
	pdf: SourcePdfInput;
}
export interface RevSign {
	listRequests(ctx: StaffContext): Promise<SignatureRequestWithSigners[]>;
	getRequest(ctx: StaffContext, requestId: string): Promise<SignatureRequestWithSigners | null>;
	createRequest(ctx: StaffContext, input: CreateRequestInput): Promise<RevSignResult<{
		requestId: string;
	}>>;
	voidRequest(ctx: StaffContext, requestId: string, reason?: string | null): Promise<RevSignResult>;
	resendSigner(ctx: StaffContext, requestId: string, signerId: string): Promise<RevSignResult>;
	/** Verifies HMAC signature + expiry + revocation, returns signer+request or null. */
	resolveSigner(token: string): Promise<SignerWithRequest | null>;
	submitSignature(token: string, input: {
		signature: unknown;
		signatureType: unknown;
		consent: unknown;
	}, meta: RequestMeta): Promise<RevSignResult>;
	declineSignature(token: string, input: {
		reason: unknown;
	}, meta: RequestMeta): Promise<RevSignResult>;
	handlers: {
		/** Streams the source PDF to a valid signer, recording first-view. */
		signerDocument(token: string, meta: RequestMeta): Promise<Response>;
		/** Streams the finished signed PDF to a signer, once COMPLETED. */
		signerSigned(token: string): Promise<Response>;
		/** Staff download; `?type=signed` returns the signed PDF, else the source. */
		staffDocument(ctx: StaffContext, requestId: string, opts?: {
			signed?: boolean;
		}): Promise<Response>;
	};
	/** The signing-link URL for a token (host builds emails/links off this). */
	signUrl(token: string): string;
	/** Portable pieces re-exported for hosts that want them directly. */
	lib: {
		buildSignedPdf: typeof buildSignedPdf;
		generateSignatureToken: (secret?: string) => string;
		verifySignatureTokenSignature: (token: string) => boolean;
		decodeSignatureDataUrl: typeof decodeSignatureDataUrl;
		validateSourcePdf: typeof validateSourcePdf;
		schemas: {
			CreateSignatureRequestSchema: typeof CreateSignatureRequestSchema;
			SubmitSignatureSchema: typeof SubmitSignatureSchema;
			DeclineSignatureSchema: typeof DeclineSignatureSchema;
			VoidSignatureSchema: typeof VoidSignatureSchema;
		};
	};
}
export declare function createRevSign(config: RevSignConfig): RevSign;
/**
 * Reference SignatureStore backed by Prisma. Kept structurally typed (no import
 * of any one app's generated `@prisma/client`) so it works against ANY host's
 * client, as long as the host has the three RevSign models from the schema
 * template — `SignatureRequest`, `Signer`, `SignatureEvent` — with the template
 * column names (notably an opaque `tenantId` and optional `linkedRef`).
 *
 * The host passes the delegate names in case its models are mapped/renamed; by
 * default they are `signatureRequest`, `signer`, `signatureEvent`.
 */
export interface Delegate {
	findMany(args: unknown): Promise<any[]>;
	findFirst(args: unknown): Promise<any | null>;
	findUnique(args: unknown): Promise<any | null>;
	create(args: unknown): Promise<any>;
	update(args: unknown): Promise<any>;
	updateMany(args: unknown): Promise<{
		count: number;
	}>;
}
export interface PrismaLikeClient {
	signatureRequest: Delegate;
	signer: Delegate;
	signatureEvent: Delegate;
}
export declare function createPrismaSignatureStore(prisma: PrismaLikeClient): SignatureStore;
export declare function createLocalFsStorage(opts: {
	rootDir: string;
}): StoragePort;
/** Mint a fresh signing token. 24 random bytes = 192 bits of entropy. */
export declare function generateSignatureToken(secret: string): string;
/** Constant-time verification of a token's HMAC signature. */
export declare function verifySignatureTokenSignature(token: string, secret: string): boolean;
/** SHA-256 (hex) of arbitrary bytes — used for the source-document fingerprint. */
export declare function sha256Hex(bytes: Uint8Array): string;
export declare function newId(): string;
/**
 * Optional default plain-text templates for the two RevSign emails. Hosts with
 * their own branded HTML (FieldFirst, DocuChase) ignore these and render off the
 * `vars` in EmailPort.send; hosts that just want something that works can call
 * `renderRevSignEmail(kind, vars)`.
 */
export type RevSignEmailKind = "signature_request" | "signature_completed";
export declare function renderRevSignEmail(kind: RevSignEmailKind, vars: Record<string, string>): {
	subject: string;
	body: string;
};

export {};
