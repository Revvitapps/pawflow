/**
 * The injectable seams of RevMFA. A host product (StayOS, TradeOS, DocuChase,
 * Pawflow, Proposal Gen, FieldFirst) implements the store against its own
 * database; the engine stays framework- and persistence-agnostic and knows
 * nothing about any one app's Prisma client, session model, or user table.
 *
 * The subject is expressed as an OPAQUE `userId` throughout — never
 * `staffUserId`, `personId`, etc. Each host maps its own user column to it.
 */
export interface MfaRecord {
	/** The stored TOTP secret. AES-256-GCM ciphertext when a `secretEncryptionKey`
	 * is configured on the engine, otherwise the raw base32 secret. Null before
	 * enrollment begins and after `disable()`. RevMFA reads this back through the
	 * store verbatim and decrypts it internally when a key is configured. */
	secret: string | null;
	/** False between `beginEnrollment` and a successful `confirmEnrollment`. */
	enabled: boolean;
	/** SHA-256 hex digests of the user's remaining single-use backup codes. */
	backupCodeHashes: string[];
	/** Stamped at successful `confirmEnrollment`; cleared by `disable()`. */
	enrolledAt: Date | null;
}
/** The mutable fields the engine writes back. Every field is optional so a
 * single `upsert` covers begin/confirm/regenerate/consume/disable — the store
 * only touches the keys present. */
export interface MfaUpsertInput {
	secret?: string | null;
	enabled?: boolean;
	backupCodeHashes?: string[];
	enrolledAt?: Date | null;
}
export interface MfaStore {
	/** Load a user's MFA record, or null if they have never begun enrollment. */
	get(userId: string): Promise<MfaRecord | null>;
	/** Create-or-update the user's MFA record, writing only the provided fields. */
	upsert(userId: string, data: MfaUpsertInput): Promise<void>;
}
export interface AuthMfaConfig {
	store: MfaStore;
	/** Issuer shown in the authenticator app (the `issuer` label of the
	 * otpauth:// URI), e.g. "StayOS". */
	issuer: string;
	/**
	 * Optional 32+ char secret used to derive an AES-256-GCM key that encrypts
	 * TOTP secrets at rest. STRONGLY RECOMMENDED in production: without it, TOTP
	 * secrets are stored in plaintext and a leaked database hands an attacker
	 * every user's live second factor. Supplying it is transparent to callers —
	 * the same secret must be provided on every process that verifies codes.
	 */
	secretEncryptionKey?: string;
	/**
	 * Clock-skew tolerance for TOTP verification, in 30-second steps checked on
	 * either side of the current window. Default 1 (accepts the previous, current
	 * and next code — ±30s). Keep small; larger windows weaken the factor.
	 */
	verificationWindow?: number;
	/** How many backup codes to mint per enrollment / regeneration. Default 10. */
	backupCodeCount?: number;
}
/**
 * @revvitapps/auth-mfa public engine. One implementation of TOTP + single-use
 * backup codes for every Revvit product, behind an injected `MfaStore`.
 *
 * Lifecycle:
 *   beginEnrollment  -> mint secret, persist it disabled, return otpauth URI
 *   confirmEnrollment -> verify a code against that secret, enable, mint backup
 *                        codes (plaintext returned ONCE), stamp enrolledAt
 *   verify / verifyBackupCode -> second-factor checks at login / step-up
 *   regenerateBackupCodes -> replace the set, return new plaintext once
 *   isEnabled / disable -> query and tear down
 */
export interface BeginEnrollmentResult {
	/** Raw base32 secret — the host may show it as a manual-entry fallback under
	 * the QR. Not persisted in the clear when encryption is configured. */
	secret: string;
	/** `otpauth://totp/...` URI the host renders as a QR code. */
	otpauthUri: string;
}
export interface AuthMfa {
	/**
	 * Start (or restart) enrollment: generates a new secret, stores it in the
	 * DISABLED state (overwriting any half-finished prior attempt), and returns
	 * the provisioning URI. Idempotent to call again before confirmation — each
	 * call rotates to a fresh secret so a leaked in-progress QR can't be reused.
	 * `accountName` is what the user sees in their authenticator app (their email
	 * is the usual choice).
	 */
	beginEnrollment(userId: string, opts?: {
		accountName?: string;
	}): Promise<BeginEnrollmentResult>;
	/**
	 * Confirm enrollment by verifying `code` against the pending secret. On
	 * success: flips `enabled` true, mints backup codes, stamps `enrolledAt`, and
	 * returns the plaintext backup codes ONCE (persist nothing but their digests).
	 * Returns null on a bad/expired code or when there is no pending enrollment —
	 * one generic failure, no distinction leaked.
	 */
	confirmEnrollment(userId: string, code: string): Promise<{
		backupCodes: string[];
	} | null>;
	/** Verify a TOTP code for a fully-enrolled user (second factor at login /
	 * step-up). False if MFA is not enabled or the code is wrong/out of window. */
	verify(userId: string, code: string): Promise<boolean>;
	/** Verify AND consume a single-use backup code. A given code works exactly
	 * once; false if MFA is not enabled, the code is unknown, or already used. */
	verifyBackupCode(userId: string, code: string): Promise<boolean>;
	/** Replace the user's backup codes with a fresh set, returned in plaintext
	 * ONCE. Only meaningful for an enrolled user; returns null otherwise. */
	regenerateBackupCodes(userId: string): Promise<{
		backupCodes: string[];
	} | null>;
	/** True once enrollment has been confirmed. */
	isEnabled(userId: string): Promise<boolean>;
	/** Turn MFA off and wipe the secret, backup codes and enrolledAt. Idempotent. */
	disable(userId: string): Promise<void>;
	/** How many unused backup codes remain (for "regenerate soon" nudges). */
	remainingBackupCodes(userId: string): Promise<number>;
}
export declare function createAuthMfa(config: AuthMfaConfig): AuthMfa;
/**
 * Reference MfaStore backed by Prisma. Kept structurally typed (no import of any
 * one app's generated `@prisma/client`) so it works against ANY host's client,
 * as long as the host has the `UserMfa` model from the schema template — with
 * the template column names (`userId`, `secret`, `enabled`, `backupCodeHashes`,
 * `enrolledAt`).
 *
 * If the host mapped the model to a different delegate name, pass it as the
 * second argument; by default it is `userMfa`.
 */
export interface Delegate {
	findUnique(args: unknown): Promise<any | null>;
	upsert(args: unknown): Promise<any>;
}
export interface PrismaLikeClient {
	userMfa: Delegate;
}
export declare function createPrismaMfaStore(prisma: PrismaLikeClient, delegateName?: keyof PrismaLikeClient): MfaStore;
/**
 * Zero-dependency in-memory MfaStore. Backs unit tests and dev/preview flows
 * where no database is wired. NOT for production (state is per-process and
 * lost on restart).
 */
export declare function createMemoryMfaStore(): MfaStore;

export {};
