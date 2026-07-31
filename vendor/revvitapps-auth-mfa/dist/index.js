// src/crypto.ts
import {
  createHash,
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
  timingSafeEqual
} from "node:crypto";
var ENC_PREFIX = "gcm.v1.";
var KEY_SALT = "revvit.auth-mfa.v1";
function deriveKey(secretEncryptionKey) {
  return scryptSync(secretEncryptionKey, KEY_SALT, 32);
}
function encryptSecret(plaintext, secretEncryptionKey) {
  if (!secretEncryptionKey) return plaintext;
  const key = deriveKey(secretEncryptionKey);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${ENC_PREFIX}${iv.toString("base64url")}.${tag.toString("base64url")}.${ct.toString("base64url")}`;
}
function decryptSecret(stored, secretEncryptionKey) {
  if (!stored.startsWith(ENC_PREFIX)) {
    return stored;
  }
  if (!secretEncryptionKey) {
    throw new Error("auth-mfa: encrypted secret present but no secretEncryptionKey configured");
  }
  const parts = stored.slice(ENC_PREFIX.length).split(".");
  if (parts.length !== 3) throw new Error("auth-mfa: malformed encrypted secret");
  const [ivB64, tagB64, ctB64] = parts;
  const key = deriveKey(secretEncryptionKey);
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64url"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ctB64, "base64url")), decipher.final()]).toString("utf8");
}
function normalizeBackupCode(code) {
  return code.replace(/[\s-]/g, "").toLowerCase();
}
function hashBackupCode(code) {
  return createHash("sha256").update(normalizeBackupCode(code)).digest("hex");
}
function digestsEqual(a, b) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

// src/totp.ts
import { Secret, TOTP } from "otpauth";
var DIGITS = 6;
var PERIOD = 30;
var ALGORITHM = "SHA1";
function generateSecret() {
  return new Secret({ size: 20 }).base32;
}
function totpFor(secretBase32, issuer, accountName) {
  return new TOTP({
    issuer,
    label: accountName,
    algorithm: ALGORITHM,
    digits: DIGITS,
    period: PERIOD,
    secret: Secret.fromBase32(secretBase32)
  });
}
function buildProvisioningUri(secretBase32, issuer, accountName) {
  return totpFor(secretBase32, issuer, accountName).toString();
}
function verifyTotp(secretBase32, token, window) {
  const normalized = token.replace(/\s/g, "");
  if (!/^\d{6}$/.test(normalized)) return false;
  const delta = totpFor(secretBase32, "", "").validate({ token: normalized, window });
  return delta !== null;
}

// src/backup-codes.ts
import { randomBytes as randomBytes2 } from "node:crypto";
var ALPHABET = "abcdefghjkmnpqrstvwxyz23456789";
var GROUP = 4;
var GROUPS = 2;
function oneCode() {
  const chars = [];
  const bytes = randomBytes2(GROUP * GROUPS);
  for (let i = 0; i < GROUP * GROUPS; i++) {
    chars.push(ALPHABET[bytes[i] % ALPHABET.length]);
  }
  const parts = [];
  for (let g = 0; g < GROUPS; g++) {
    parts.push(chars.slice(g * GROUP, g * GROUP + GROUP).join(""));
  }
  return parts.join("-");
}
function generateBackupCodes(count) {
  const plaintext = [];
  const seen = /* @__PURE__ */ new Set();
  while (plaintext.length < count) {
    const code = oneCode();
    if (seen.has(code)) continue;
    seen.add(code);
    plaintext.push(code);
  }
  return { plaintext, hashes: plaintext.map(hashBackupCode) };
}
function findBackupCodeMatch(presented, hashes) {
  const presentedHash = hashBackupCode(presented);
  let matchIndex = -1;
  for (let i = 0; i < hashes.length; i++) {
    if (digestsEqual(presentedHash, hashes[i])) matchIndex = i;
  }
  return matchIndex;
}

// src/engine.ts
function createAuthMfa(config) {
  const { store, issuer } = config;
  const encKey = config.secretEncryptionKey;
  const window = config.verificationWindow ?? 1;
  const backupCount = config.backupCodeCount ?? 10;
  return {
    async beginEnrollment(userId, opts) {
      const secret = generateSecret();
      await store.upsert(userId, {
        secret: encryptSecret(secret, encKey),
        enabled: false,
        backupCodeHashes: [],
        enrolledAt: null
      });
      return {
        secret,
        otpauthUri: buildProvisioningUri(secret, issuer, opts?.accountName ?? userId)
      };
    },
    async confirmEnrollment(userId, code) {
      const record = await store.get(userId);
      if (!record || !record.secret) return null;
      const secret = decryptSecret(record.secret, encKey);
      if (!verifyTotp(secret, code, window)) return null;
      const { plaintext, hashes } = generateBackupCodes(backupCount);
      await store.upsert(userId, {
        enabled: true,
        backupCodeHashes: hashes,
        enrolledAt: /* @__PURE__ */ new Date()
      });
      return { backupCodes: plaintext };
    },
    async verify(userId, code) {
      const record = await store.get(userId);
      if (!record || !record.enabled || !record.secret) return false;
      return verifyTotp(decryptSecret(record.secret, encKey), code, window);
    },
    async verifyBackupCode(userId, code) {
      const record = await store.get(userId);
      if (!record || !record.enabled) return false;
      const idx = findBackupCodeMatch(code, record.backupCodeHashes);
      if (idx === -1) return false;
      const remaining = record.backupCodeHashes.filter((_, i) => i !== idx);
      await store.upsert(userId, { backupCodeHashes: remaining });
      return true;
    },
    async regenerateBackupCodes(userId) {
      const record = await store.get(userId);
      if (!record || !record.enabled) return null;
      const { plaintext, hashes } = generateBackupCodes(backupCount);
      await store.upsert(userId, { backupCodeHashes: hashes });
      return { backupCodes: plaintext };
    },
    async isEnabled(userId) {
      const record = await store.get(userId);
      return !!record?.enabled;
    },
    async disable(userId) {
      await store.upsert(userId, {
        secret: null,
        enabled: false,
        backupCodeHashes: [],
        enrolledAt: null
      });
    },
    async remainingBackupCodes(userId) {
      const record = await store.get(userId);
      if (!record || !record.enabled) return 0;
      return record.backupCodeHashes.length;
    }
  };
}

// src/store/prisma-adapter.ts
function createPrismaMfaStore(prisma, delegateName = "userMfa") {
  const model = prisma[delegateName];
  return {
    async get(userId) {
      const row = await model.findUnique({ where: { userId } });
      if (!row) return null;
      return {
        secret: row.secret ?? null,
        enabled: !!row.enabled,
        backupCodeHashes: row.backupCodeHashes ?? [],
        enrolledAt: row.enrolledAt ?? null
      };
    },
    async upsert(userId, data) {
      await model.upsert({
        where: { userId },
        create: {
          userId,
          secret: data.secret ?? null,
          enabled: data.enabled ?? false,
          backupCodeHashes: data.backupCodeHashes ?? [],
          enrolledAt: data.enrolledAt ?? null
        },
        update: pruneUndefined(data)
      });
    }
  };
}
function pruneUndefined(data) {
  const out = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== void 0) out[k] = v;
  }
  return out;
}

// src/store/memory-adapter.ts
function createMemoryMfaStore() {
  const rows = /* @__PURE__ */ new Map();
  return {
    async get(userId) {
      const r = rows.get(userId);
      return r ? { ...r, backupCodeHashes: [...r.backupCodeHashes] } : null;
    },
    async upsert(userId, data) {
      const existing = rows.get(userId) ?? {
        secret: null,
        enabled: false,
        backupCodeHashes: [],
        enrolledAt: null
      };
      rows.set(userId, {
        secret: data.secret !== void 0 ? data.secret : existing.secret,
        enabled: data.enabled !== void 0 ? data.enabled : existing.enabled,
        backupCodeHashes: data.backupCodeHashes !== void 0 ? data.backupCodeHashes : existing.backupCodeHashes,
        enrolledAt: data.enrolledAt !== void 0 ? data.enrolledAt : existing.enrolledAt
      });
    }
  };
}
export {
  createAuthMfa,
  createMemoryMfaStore,
  createPrismaMfaStore
};
