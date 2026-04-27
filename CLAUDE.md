# ChopDot — CLAUDE.md

ChopDot is a **shared commitment system** for group expenses. The MVP proves a full commitment loop: propose → pay → confirm → close.

## Architecture

### Frontend (`src/`)
React + TypeScript + Vite. Data layer controlled by `VITE_DATA_SOURCE`:
- `local` (default) — pots/expenses in localStorage
- `supabase` — pots/expenses via Supabase

Settlement legs **always** go through the backend API (see `SettlementRepository`).

### Backend (`backend/`)
Express + Prisma + Postgres. Runs on port 3001.

Handles the settlement chapter lifecycle:
- `GET /api/pots/:potId/settlements` — list legs
- `POST /api/pots/:potId/settlements` — propose chapter (create legs)
- `PATCH /api/pots/:potId/settlements/:id/pay` — payer marks paid
- `PATCH /api/pots/:potId/settlements/:id/confirm` — receiver confirms
- `GET /api/pots/:potId/events` — append-only audit trail
- `GET /api/users/:userId/pending-actions` — pots where user must act (drives pot-list badges)

### Key frontend files

| File | Purpose |
|------|---------|
| `src/types/app.ts` | Canonical types: `SettlementLeg`, `PotEvent`, `PotStatus` |
| `src/services/data/repositories/SettlementRepository.ts` | HTTP client for the backend settlement API |
| `src/services/data/services/SettlementService.ts` | Business logic + `deriveChapterStatus` |
| `src/hooks/useChapterState.ts` | Loads/mutates legs; polls every 30 s (tab visible) |
| `src/hooks/useEventFeed.ts` | Fetches pot audit events; polls every 30 s |
| `src/hooks/usePendingActions.ts` | Polls backend for pots where the user must act; drives pot-list badges |
| `src/hooks/useSettlementActions.ts` | Orchestrates the settlement confirmation flow |
| `src/components/commit/ChapterPanel.tsx` | Renders open chapter: legs, mark-paid, confirm |
| `src/components/commit/EventTimeline.tsx` | Renders audit event log inside ChapterPanel |

## Development setup

```bash
# 1. Install deps
npm install
cd backend && npm install && cd ..

# 2. Configure backend env
cp backend/.env.example backend/.env
# edit DATABASE_URL to point at your Postgres instance

# 3. Apply DB schema
cd backend && npx prisma db push && cd ..

# 4. Start both servers
npm run dev            # frontend on :3000
cd backend && npm run dev  # backend on :3001
```

Set `VITE_API_URL=http://localhost:3001` in `.env.local` if the default doesn't work.

## Tests

```bash
npm test                        # frontend (vitest)
cd backend && npm test          # backend (vitest)
```

All 42 tests (22 frontend + 20 backend) must pass before merging.

## Constraints

- **No blockchain/wallet/CRDT/IPFS** — removed in the mvp branch rewrite and must not return.
- **Minimal new infrastructure** — reuse Supabase columns and Prisma tables before adding new ones.
- **Settlement legs are the source of truth** for chapter status — `deriveChapterStatus` computes it from leg states; never store it redundantly on the frontend.
- The backend does persist `pot.status = "completed"` in Prisma when all legs are confirmed, but the frontend derives status from legs directly.
