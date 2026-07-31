# Security Policy

Pawflow is a live, multi-tenant SaaS handling pet-owner PII and business data.
This document covers responsible disclosure, our data-recovery posture, and
open security follow-ups.

## Reporting a Vulnerability

Email **security@revvit.io** with details and reproduction steps. Please do not
open public issues for security reports. We aim to acknowledge within 2 business
days. Do not access, modify, or exfiltrate data belonging to other tenants while
testing — report the isolation gap instead.

## Tenancy & Data Isolation

Every domain read/write goes through the guarded data layer in
`src/server/db.ts`, which scopes all queries by `businessId`. Cross-tenant
isolation is asserted by `prisma/isolation.check.ts` (`npm run isolation`).

## Data Recovery — Neon Postgres PITR

Production data lives in Neon Postgres. Recovery relies on Neon
**Point-in-Time Recovery (PITR)**:

- Confirm the branch retention window is set to **at least 7 days** (Neon Console
  → Project → Settings → History retention).
- To recover: create a new branch from the desired timestamp
  (`Restore`/`Branch from history`), validate, then repoint `DATABASE_URL` /
  `DATABASE_URL_UNPOOLED`.
- **Migrations are never applied to production from CI.** `npm run build` is
  plain `next build`; migrations are generated in this repo and deployed as a
  separate, deliberate step (`prisma migrate deploy`).
- Verify PITR restore end-to-end at least quarterly.

## Authentication & Session Security

- Passwords hashed with bcrypt. Policy: **min 12 chars**, composition floor, and
  a **HaveIBeenPwned** k-anonymity breach check on signup and reset.
- DB-backed, serverless-safe rate limiting on **login, signup, and
  forgot/reset** (per email + IP, fail-closed), backed by the `LoginAttempt`
  table.
- Password-reset tokens are stored as **SHA-256 hashes** (never plaintext), are
  single-use, expire in 30 minutes, and rotate on reissue.
- **Session revocation:** each `User` has a `tokenVersion`; it is bumped on
  password reset and verified in the next-auth `jwt` callback, so a reset
  invalidates all existing sessions.

## Recommended Next Step — Multi-Factor Authentication (MFA)

MFA is **not yet implemented** (reported, not fixed in this pass). Recommended
approach:

- **TOTP (RFC 6238)** as the baseline second factor (authenticator apps), stored
  as an encrypted secret per user, with one-time recovery codes (hashed at
  rest). Prefer this over SMS OTP (SIM-swap risk).
- Enforce MFA for `owner` and `front_desk` roles first (highest privilege),
  optional for `staff`.
- Add WebAuthn/passkeys as a follow-on for phishing-resistant auth.
- Gate step-up MFA on sensitive actions (billing/settings changes) once the base
  factor ships.

## Known / Accepted Risks

- `npm audit` reports high-severity advisories in **postcss** and **sharp**,
  which are transitive dependencies of Next.js 16 and cannot be resolved without
  a breaking framework downgrade. Tracked; re-evaluate on each Next.js bump. CI
  gates on **critical** advisories and reports highs.
- Content-Security-Policy uses `'unsafe-inline'` for scripts/styles (App Router
  requirement); migrating to nonce-based CSP is a recommended follow-up.
- Transactional email delivery for password resets is stubbed
  (`src/lib/mailer.ts`) pending an email provider; tokens are issued/validated
  securely but not yet delivered in production.
