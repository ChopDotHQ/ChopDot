# ChopDot — Dev Handoff

## One-line local setup

```bash
cp .env.example .env && cp backend/.env.example backend/.env && npm install && (cd backend && npm install) && (cd backend && npx prisma db push) && echo "✅ Ready — run: npm run dev (frontend) + cd backend && npm run dev (API)"
```

Then fill in `DATABASE_URL` in `backend/.env` and your Supabase keys in `.env` before running.

---

## What ChopDot is

A shared commitment system for group expenses. Proves a full settlement loop:

```
propose → pay → confirm → close
```

Pots hold expenses. When you settle up, a **chapter** is created — typed settlement legs (who pays whom, how much). Each leg transitions `pending → paid → confirmed`. When all legs are confirmed, the chapter closes and the pot is marked `completed`.

---

## Architecture

```
┌──────────────────────────────────────┐
│  React + Vite (port 3000)            │
│  Pot/expense data → Supabase         │
│  Settlement legs → backend API       │
└──────────────────────┬───────────────┘
                       │ /api/*
┌──────────────────────▼───────────────┐
│  Express + Prisma (port 3001)        │
│  Settlement chapter lifecycle        │
│  PostgreSQL (same Supabase DB)       │
└──────────────────────────────────────┘
```

Nginx (`nginx.conf`) proxies `/api/*` to the backend in Docker — the frontend never needs CORS in production.

---

## Environment variables

### Frontend (`.env`)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | ✅ | Supabase anon key |
| `VITE_API_URL` | local only | Backend URL (default `http://localhost:3001`). Not needed in Docker — nginx proxies `/api`. |
| `VITE_DATA_SOURCE` | — | `supabase` (default) or `local` (localStorage, guest mode) |
| `VITE_DL_READS` | — | `on` to read pots from Supabase data layer |

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `CORS_ORIGIN` | — | Frontend origin (default `http://localhost:3000`) |
| `PORT` | — | API port (default `3001`) |

---

## Database

The backend uses Prisma against the **same PostgreSQL DB as Supabase**. Tables:

| Table | Purpose |
|---|---|
| `settlements` | One row per settlement leg. `tx_hash` stores `{method, reference, paidAt, confirmedAt}` as JSON. Status: `pending → paid → confirmed`. |
| `pot_events` | Append-only audit trail. Types: `chapter_proposed`, `leg_marked_paid`, `leg_confirmed`, `chapter_closed`. |
| `payments` | One row per payment attempt (method + reference). |
| `pots` | Existing Supabase pots table. `status` column added (`active → completed` when chapter closes). |

### First-time DB setup

```bash
# Apply schema to your Postgres instance (Supabase or local)
cd backend && npx prisma db push

# Or, if you're using proper migrations:
cd backend && npx prisma migrate deploy
```

> Prisma schema is in `backend/prisma/schema.prisma`. No migration files are committed yet — `db push` is fine for MVP. Switch to `migrate dev` when you want a migration history.

---

## API routes

All routes are on the backend at port 3001.

```
GET    /health
GET    /api/pots/:potId/settlements          → list legs for a pot
POST   /api/pots/:potId/settlements          → propose chapter { legs: [...] }
PATCH  /api/pots/:potId/settlements/:id/pay  → mark leg paid { method, reference? }
PATCH  /api/pots/:potId/settlements/:id/confirm → confirm receipt
GET    /api/pots/:potId/events               → audit event log
GET    /api/users/:userId/pending-actions    → pots where this user must act (drives badges)
```

Auth: pass `x-user-id: <supabase-user-uuid>` header. Used for event logging only — row-level security is enforced at the DB level.

---

## Key frontend files

```
src/
  types/app.ts                          — SettlementLeg, PotEvent, PotStatus types
  hooks/
    useChapterState.ts                  — loads/mutates legs, polls every 30s
    useEventFeed.ts                     — fetches audit events, polls every 30s
    usePendingActions.ts                — polls pending-actions endpoint, drives pot badges
    useSettlementActions.ts             — orchestrates the propose flow
  services/data/repositories/
    SettlementRepository.ts             — HTTP client for the backend (offline queue + idempotency)
  services/data/services/
    SettlementService.ts                — deriveChapterStatus + chapter lifecycle methods
  components/commit/
    ChapterPanel.tsx                    — renders open chapter (legs, mark-paid, confirm)
    EventTimeline.tsx                   — renders audit event log
  components/screens/
    PotsHome.tsx                        — pot list, shows Pay/Confirm badges
    PotHome.tsx                         — pot detail, mounts ChapterPanel + EventTimeline
```

---

## Running tests

```bash
# Frontend (22 tests)
npm test

# Backend (25 tests)
cd backend && npm test

# Type check
npm run type-check
cd backend && npm run type-check
```

All 47 tests must pass before merging.

---

## Docker (production)

```bash
# Requires .env with SUPABASE credentials and DATABASE_URL
docker compose up --build
```

- Frontend on `:3000` (nginx, SPA fallback, proxies `/api` to backend)
- Backend on `:3001` (Node, Prisma)

> Before first boot: run `cd backend && DATABASE_URL=<prod-url> npx prisma db push` to apply the schema to the production database.

---

## What's done

- [x] Full settlement loop: propose → pay → confirm → close
- [x] Per-leg status tracking (`pending → paid → confirmed`)
- [x] Chapter auto-closes and marks pot `completed` when all legs confirmed
- [x] Audit event log (backend + frontend display)
- [x] Counterparty notification: 30s polling + pot-list `Pay`/`Confirm` badges
- [x] Idempotency keys on chapter proposals (safe to retry)
- [x] Offline mutation queue (failed mutations retry on reconnect)
- [x] Clean build: 0 TS errors, 0 warnings
- [x] Docker Compose with multi-stage backend Dockerfile
- [x] CSP headers updated (blockchain domains removed)

## What's not done (next up)

- [ ] **Prisma migrations** — currently using `db push`. Add `prisma migrate dev` workflow when you want version-controlled schema changes.
- [ ] **Real-time push** — polling every 30s works for MVP. For instant counterparty notification, wire up Supabase Realtime on the `settlements` table.
- [ ] **`VITE_API_URL` in Vercel** — set this to your deployed backend URL in Vercel project settings. The frontend reads it at build time via `SettlementRepository`.
- [ ] **Backend hosting** — choose a host for the Express API (Railway, Render, Fly.io, or a Vercel serverless rewrite). The Docker Compose file is ready for any VPS.
- [ ] **Email/push notifications** — when a chapter is proposed, the counterparty currently has no out-of-app signal. Hook into Supabase Edge Functions + Resend/SendGrid to send an email when a new leg targets them.
