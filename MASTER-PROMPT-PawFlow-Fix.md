# MASTER PROMPT — PawFlow Correction & Production-Hardening Pass

> Paste everything below this line into Claude Code, run from the PawFlow repo root.

---

You are the senior full-stack engineer taking **PawFlow** (Next.js 16 App Router, TypeScript, Tailwind v4, shadcn/ui, Supabase, OpenAI, Twilio-stub) from demo-mode prototype to a production-viable, test-ready application. An audit has already been performed; your job is to fix every finding below in one continuous run.

## EXECUTION CONTRACT — READ FIRST

1. **One shot, no stopping.** Execute all phases in order in a single run. Do not pause for approval or ask questions. Stop only at the Definition of Done.
2. **READ THE LOCAL NEXT.JS DOCS FIRST.** Per `AGENTS.md`, this Next.js 16 version has breaking changes vs. your training data. Before writing any code, read the relevant guides in `node_modules/next/dist/docs/`. Heed deprecation notices.
3. **Do not break demo mode.** The graceful no-env-keys fallback is a core feature (the app must run and demo fully with zero API keys). Every fix must preserve it: real services activate when env vars exist, clean mocks otherwise — behind provider interfaces, never inline `if (key)` scattered through components.
4. **Full decision autonomy.** Ambiguity → make the pragmatic call, log it in `DECISIONS.md`, keep moving.
5. **No placeholders, no regressions.** Existing working UI stays working. Run the app and click through after each phase.
6. **Errors don't stop you.** Debug, fix, and if an approach fails twice, use a simpler approach and log it.

## AUDIT FINDINGS TO FIX (all mandatory)

### Tier 1 — Broken in production
- **F1. Harden the OpenAI integration** (`src/lib/ai.ts`). CORRECTION TO EARLIER AUDIT: the existing code is VALID — `client.responses.create()` is the current Responses API in the installed openai v6 SDK, and `gpt-4.1-mini` is a valid model per the SDK's ChatModel types. Do NOT rewrite it to `chat.completions.create()`. Scope here is hardening only: add safe JSON parsing with typed errors for tasks that return JSON (`classifyInboundMessage`), and optionally bump to a newer model from the installed SDK's model list. **Partially done already**: API routes now validate input via `src/lib/validate.ts`.
- **F2. No RLS policies** — **DONE**: `supabase/migrations/002_rls_policies.sql` now adds RLS + helper functions on every tenant table. Remaining: apply the migration and add a script/test that proves cross-tenant reads fail.
- **F3. No auth middleware** — **DONE (demo-grade)**: `src/proxy.ts` (Next 16 proxy convention — middleware.ts is deprecated, do not create one) guards workspace routes via a `pawflow_session` cookie set on demo login in `pawflow-provider.tsx`. Remaining: replace the cookie check with real Supabase Auth session validation when F8 lands.
- **F4. Unvalidated API routes** — **DONE**: all three routes validate via `src/lib/validate.ts` (dependency-free validators + in-memory token-bucket rate limiting), and brand-intake has an SSRF guard. Remaining: swap the in-memory rate limiter for a shared store at production scale.

### Tier 2 — Demo-only wiring that must become real
- **F5. No persistence**: all data lives in localStorage when Supabase env vars are absent — and Supabase paths are not actually used. Implement a `DataStore` interface with two implementations: `SupabaseStore` (real queries matching the schema) and `LocalStore` (current localStorage behavior, kept for demo mode). All reads/writes in the app go through this interface. Selection is automatic from env.
- **F6. Portal tenant isolation**: portal currently has no multi-tenancy validation. Portal access must require a signed, expiring, revocable token bound to one customer + one business; every portal query filters by both.
- **F7. Twilio stub → provider**: formalize a `MessageProvider` interface — `TwilioProvider` (real, activates on env keys) and `MockProvider` (logs rendered messages to a `sent_messages` table/store and stdout). All outbound SMS in the app goes through it.
- **F8. Real auth**: wire Supabase Auth (email/password + magic link) for owner/staff when env keys exist; demo login remains the zero-key path. Session handling per the local Next.js 16 docs.

### Tier 3 — Mockups that must function
- **F9. Payments**: implement a `PaymentProvider` interface — Stripe test mode when keys exist, `FakePaymentProvider` (simulated checkout + webhook) otherwise. Wire the existing payments/deposits UI to it: deposit request → payment link → status updates on the appointment.
- **F10. File uploads**: pet photos/records currently fake. Wire to Supabase Storage (or local-disk in demo mode) with type/size validation.
- **F11. Hardening** — **PARTIALLY DONE**: error boundaries added (`src/app/error.tsx`, `src/app/(workspace)/error.tsx`). Remaining: loading states where missing and any unsafe JSON parsing left in `src/`.

### Do not touch — new since the audit
The **AI voice receptionist module** was built after the audit and is tested and working. Do not rewrite it; only extend it where a finding explicitly requires (e.g., persistence in F5):
- `src/lib/receptionist/domain.ts` + `src/lib/receptionist/engine.ts` — pure conversation engine (30-check self-test: `npx tsx scripts/receptionist-selftest.ts`; keep it green)
- `src/app/api/voice/route.ts` — stateless Twilio voice webhook (TwiML Gather/Say, state in action URL)
- `src/components/call-simulator.tsx` — zero-key demo call simulator on the AI receptionist page
- When implementing F5 (DataStore), wire `create_booking_request` / `escalate_to_staff` actions in the voice route to real persistence, and replace `loadContext()`'s demo workspace with the org's data.

## PHASES — EXECUTE ALL, IN ORDER

### Phase 0 — Baseline
Read `node_modules/next/dist/docs/` relevant guides. Run `npm install`, `npm run build`, `npm run dev`; record every existing error/warning in `AUDIT-BASELINE.md`. Create `DECISIONS.md`.
**Gate:** you can state the current build status and have the docs' conventions loaded.

### Phase 1 — Tier 1 fixes (F1–F4)
**Gate:** build passes; a script proves RLS isolation; hitting API routes with bad payloads returns typed 4xx; unauthenticated workspace access redirects.

### Phase 2 — Data layer + auth (F5, F6, F8)
**Gate:** with env keys set, data persists in Supabase across restarts; with no keys, demo mode works exactly as before; portal token grants access to exactly one customer's data.

### Phase 3 — Providers (F7, F9, F10)
**Gate:** mock message log fills as automations fire; fake checkout completes and updates appointment state; upload → preview works in both modes.

### Phase 4 — Hardening + tests (F11)
Add Vitest: cover ai.ts parsing/fallbacks, zod schemas, token signing/expiry, DataStore selection, payment webhook handler. Add one Playwright smoke test: login (demo) → create customer → book appointment → request deposit → fake-pay → appointment updated.
**Gate:** `npm run test` fully green.

### Phase 5 — Final verification sweep (do not skip)
Clean run: fresh `npm run build` with zero type errors → `npm run dev` → click through every route in demo mode → run full test suite. Update `README.md` (new env vars, provider modes, test commands) and finish `DECISIONS.md`. Fix anything that surfaces and re-sweep until clean.

## DEFINITION OF DONE

All eleven findings fixed; build passes with zero type errors; all tests green; demo mode fully functional with zero keys; real mode activates cleanly from env; RLS + auth + validation in place; README and DECISIONS.md current. Then print a final report: each finding → what changed (files), how to verify it, and remaining recommendations.

BEGIN NOW. Work through every phase without stopping.
