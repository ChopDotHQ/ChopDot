# ChopDot

ChopDot is a **shared commitment system** for group expenses. It proves a complete settlement loop: propose → pay → confirm → close.

## What It Does

Most group expense apps stop at calculation. They tell you who owes whom, but they don't help create a verified record of what actually got paid.

ChopDot adds a commitment layer on top of normal expense tracking:

1. **Propose** — when you settle up, typed settlement legs are created (who pays whom, how much)
2. **Pay** — the payer marks each leg paid, choosing a method (cash, bank transfer, PayPal, Twint) and an optional reference
3. **Confirm** — the receiver confirms receipt
4. **Close** — once all legs are confirmed, the chapter closes with a full audit trail

## What Exists Today

- Group expense tracking with split calculations
- Settlement proposal flow that creates typed, persisted settlement legs
- Per-leg status progression: pending → paid → confirmed
- Chapter status derived from legs: active → partially settled → closed
- Full audit event log (chapter proposed, payments marked, receipts confirmed, chapter closed)
- Backend API with idempotency, offline mutation queue, and persistence via Postgres

## Development Setup

**Prerequisites:** Node 18+, PostgreSQL

```bash
# Install deps
npm install
cd backend && npm install && cd ..

# Configure backend
cp backend/.env.example backend/.env
# Edit DATABASE_URL in backend/.env

# Apply DB schema
cd backend && npx prisma db push && cd ..

# Run (two terminals)
npm run dev                    # frontend → http://localhost:3000
cd backend && npm run dev      # backend  → http://localhost:3001
```

If the backend runs on a different host, set `VITE_API_URL=http://your-host:3001` in a `.env.local` file at the project root.

## Tests

```bash
npm test                       # frontend (vitest) — 22 tests
cd backend && npm test         # backend  (vitest) — 20 tests
```

## Architecture

- **Frontend:** React + TypeScript + Vite. Pot/expense data in localStorage (default) or Supabase.
- **Backend:** Express + Prisma + Postgres. Owns the settlement chapter lifecycle.
- Settlement legs always persist through the backend API — see `src/services/data/repositories/SettlementRepository.ts`.
- Chapter status is derived client-side from leg states via `deriveChapterStatus`.
