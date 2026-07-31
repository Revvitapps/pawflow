# PawFlow

PawFlow is a functional MVP prototype for an AI-powered, mobile-first operating system for grooming, boarding, daycare, and independent pet-care businesses. It includes a marketing homepage, demo login, owner workspace, customer portal, realistic seed data, AI workflows, and Vercel-friendly architecture with graceful demo-mode fallbacks.

## Project Overview

PawFlow is built to show how a pet-care business can replace notebooks, missed calls, sticky notes, and scattered texts with one modern workspace.

Included in this MVP:

- Marketing homepage
- Demo auth flow
- Owner/staff workspace routes
- Customer CRM + pet records
- Appointment lifecycle management
- Boarding management
- Unified inbox
- AI receptionist command center
- Automation toggles
- Payments/deposits UI
- Reviews + reactivation tools
- White-label brand settings
- Pet parent portal
- Global prototype feedback drawer
- Mock AI, Supabase, and Twilio fallbacks

## Tech Stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS v4
- shadcn/ui
- lucide-react
- Claude (Anthropic) server-side integration with budget/rate caps and fallback mode
- Supabase client/server helpers
- Twilio integration stub with mock mode

## Installation

```bash
npm install
cp .env.example .env.local
npm run dev
```

Local app URL:

- `http://localhost:3000`

## Environment Variables

Required for production wiring, optional for demo mode:

- `ANTHROPIC_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`
- `NEXT_PUBLIC_APP_URL`

If these keys are missing, the app still runs with demo data and mock responses.

## Running Locally

```bash
npm run dev
```

Recommended checks:

```bash
npm run build
```

## Demo Mode

Demo mode is the default behavior when Supabase, Anthropic, or Twilio keys are absent.

What still works in demo mode:

- Route navigation
- Demo login
- Seeded multi-tenant workspace
- Appointment and boarding workflows
- Grooming note capture
- Portal intake requests
- AI receptionist testing
- Mock message sending
- Review/reactivation drafting

How demo state works:

- Seed data comes from [`src/lib/demo-data.ts`](src/lib/demo-data.ts)
- Interactive changes persist in browser `localStorage`
- Reset workspace is available from the top app shell

## Architecture Overview

Key files:

- [`src/app`](src/app): App Router routes
- [`src/components/app-shell.tsx`](src/components/app-shell.tsx): shared workspace shell
- [`src/components/pawflow-provider.tsx`](src/components/pawflow-provider.tsx): demo workspace store and actions
- [`src/components/pawflow-ui.tsx`](src/components/pawflow-ui.tsx): shared product UI blocks
- [`src/components/feedback-panel.tsx`](src/components/feedback-panel.tsx): side-tab feedback drawer across the prototype
- [`src/lib/types.ts`](src/lib/types.ts): domain models
- [`src/lib/demo-data.ts`](src/lib/demo-data.ts): seeded tenant data
- [`src/lib/ai.ts`](src/lib/ai.ts): AI service module — capped Claude (Anthropic) provider + fallback mode
- [`src/lib/actions.ts`](src/lib/actions.ts): server-side AI action dispatcher
- [`src/lib/feedback-store.ts`](src/lib/feedback-store.ts): optional Vercel Blob-backed feedback storage
- [`src/lib/twilio.ts`](src/lib/twilio.ts): Twilio/mock sending structure
- [`src/lib/supabase/client.ts`](src/lib/supabase/client.ts): browser client helper
- [`src/lib/supabase/server.ts`](src/lib/supabase/server.ts): server client helper
- [`supabase/migrations/001_pawflow_init.sql`](supabase/migrations/001_pawflow_init.sql): initial schema

## Routes

- `/` marketing homepage
- `/login` demo login
- `/dashboard` owner dashboard
- `/calendar` day-view schedule
- `/customers` CRM
- `/pets` pet records + grooming notes
- `/appointments` appointment manager + intake approvals
- `/boarding` boarding manager
- `/messages` unified inbox
- `/ai-receptionist` AI receptionist command center
- `/automations` automation toggles
- `/payments` invoices/deposits
- `/reviews` reviews + reactivation
- `/settings/brand` white-label brand settings
- `/settings/business` business settings
- `/portal/[businessSlug]` pet parent portal
- Side-tab feedback drawer available across all pages

## AI Setup

Set `ANTHROPIC_API_KEY` in `.env.local` to enable live Claude responses. Spend and call volume are capped server-side (see [`src/lib/ai-usage.ts`](src/lib/ai-usage.ts)).

Current server-side AI functions:

- `summarizeDay()`
- `summarizeIntakeRequest()`
- `generateCustomerReply()`
- `generateReadyForPickupMessage()`
- `generateReviewRequest()`
- `generateReviewReply()`
- `generateReactivationMessage()`
- `classifyInboundMessage()`
- `generateMissedCallTextBack()`
- `answerReceptionistQuestion()`

Without an API key, these functions return deterministic mock copy so the product stays usable.

## Supabase Setup

1. Create a Supabase project.
2. Add the URL, anon key, and service role key to `.env.local`.
3. Run the SQL in [`supabase/migrations/001_pawflow_init.sql`](supabase/migrations/001_pawflow_init.sql).
4. Add tenant-aware RLS policies based on `organization_id`.

Notes:

- Every tenant-owned table includes `organization_id`
- UUID primary keys are used throughout
- `created_at` and `updated_at` columns are included
- RLS guidance is included at the bottom of the migration

## Claude (Anthropic) Setup

1. Create an Anthropic API key.
2. Add `ANTHROPIC_API_KEY` to `.env.local`.
3. Restart the dev server.

All AI usage stays server-side through `/api/ai` and [`src/lib/actions.ts`](src/lib/actions.ts). Keys are never exposed client-side.

## Twilio Setup

1. Add `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_PHONE_NUMBER`.
2. Replace the mock return path in [`src/lib/twilio.ts`](src/lib/twilio.ts) with production SDK calls when ready.

Current MVP behavior:

- Missing keys: mock-send succeeds and creates message logs
- Present keys: architecture is ready for a real Twilio implementation

## Prototype Feedback Notes

The app includes a persistent side-tab feedback drawer so you can annotate the prototype while reviewing it.

It captures:

- Which page you were on
- Which section or area you are commenting on
- What you like
- What you do not like
- What you would add

Storage behavior:

- With `BLOB_READ_WRITE_TOKEN` configured on Vercel, notes can be shared through Vercel Blob storage
- Without Blob configuration, notes fall back to browser localStorage so the feature still works immediately

## Deploying To Vercel

1. Push the repo to GitHub.
2. Import the project into Vercel.
3. Set the environment variables in the Vercel dashboard.
4. Deploy.

Deployment notes:

- App Router is already Vercel-friendly
- AI requests use a route handler and server-only environment variables
- Demo mode means preview deployments still work even before external services are connected

## Core MVP Workflows Included

- New customer intake from portal to staff approval
- Appointment lifecycle from requested to completed
- Grooming notes and same-as-last-time memory
- Boarding request, room assignment, stay updates, and checkout
- Missed call rescue with AI text-back and lead capture
- Rebooking/reactivation targeting for pets not seen in 6+ weeks
- Vaccine watch with reminder sending

## Future Roadmap

### Phase 2

- Real auth
- Real Supabase persistence
- Stripe/Square payments
- SMS production messaging
- Staff permissions
- Calendar sync
- File uploads for vaccine records
- Actual PWA install prompts

### Phase 3

- Native app wrapper
- Multi-location management
- Franchise dashboard
- Advanced AI voice receptionist
- Review platform integrations
- QuickBooks integration
- POS integrations
- Grooming marketplace
- Benchmarking analytics

## Next Build Priorities

1. Replace localStorage demo persistence with real Supabase data writes and reads.
2. Add production auth and role-based route protection.
3. Wire Twilio and payment providers for true outbound messaging and deposits.
4. Add file upload/storage for vaccine records and boarding photos.
5. Introduce calendar drag-and-drop and richer analytics charts.

## Build Status

Validated with:

```bash
npm run build
```
