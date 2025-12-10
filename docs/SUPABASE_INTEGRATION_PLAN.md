# Supabase Integration Plan

Author: Codex (with Teddy & Emmanuel)  
Last Updated: November 18, 2025

This document captures the agreed-upon plan for wiring the ChopDot app into the Supabase backend and outlines the phased rollout (CRUD first, CRDT second). Use it as the reference/spec sheet while implementing and reviewing the integration.

---

## Goals

1. **Cross-device persistence** – pots, members, expenses, settlements, etc. live in Supabase instead of localStorage so any device logged in with the same account shares state.
2. **Maintain CRDT readiness** – once basic CRUD is stable, restore the Automerge/CRDT flow for offline edits and tamper-proof snapshots.
3. **Keep the path clear for future security work** – RLS and audit features can be layered on after persistence is live.

---

## Phase 1 – Supabase CRUD (In Progress)

| Item | Description | Owner |
|------|-------------|-------|
| Data access path | Client will call Supabase REST/PostgREST directly using the existing `SUPABASE_URL` + `SUPABASE_ANON_KEY`. No proxy API for now. | App |
| Data layer swap | Implement a Supabase-backed source for `PotService`, `ExpenseService`, `MemberService`, etc. All CRUD hits Supabase tables (`pots`, `expenses`, `pot_members`, `contributions`, `settlements`, `receipts`, `wallet_links`). | App |
| React wiring | `usePot`, `usePots`, and related hooks hydrate from Supabase on load and persist every mutation (keep optimistic UI). | App |
| Auth mapping | Set `created_by` / `user_id` columns to `auth.uid()` (wallet auth already bridges to a Supabase profile). | App |
| Environment | Confirm `.env` contains `SUPABASE_URL`, `SUPABASE_ANON_KEY`. No service-role key in the client. | App |
| RLS | Keep existing policies on `pots`, `pot_members`, `receipts`. Other tables stay open for now (per Teddy); revisit later. | Later |
| Metadata bridge | Phase 1 continues to store members/expenses/history inside the Supabase `metadata` JSON while we migrate to normalized tables. Documented as an intentional transitional step. | App |

**Deliverable:** CRUD flow working against Supabase so pots/expenses sync across devices.

### Critical Readiness: Cross-user Pots & Invites (Unblocked once CRUD is live)

| Item | Description | Owner |
|------|-------------|-------|
| Invites table | Add `invites` table (pot_id, invitee_email, inviter_user_id, status, token, expires_at). Apply RLS: inviter + pot members can read/write; invitee can read/accept via token/email. | App |
| Email / link | Generate signed join link or email (via Supabase SMTP or webhook). Include pot context + token; mark accepted/expired. | App |
| Client wiring | AddMember “invite” writes to `invites` in Supabase; show pending/accepted; handle join via link/email on the recipient device. | App |
| QA | Two-account test (desktop + mobile): send, accept, reject, expire. | App |

---

## Phase 2 – CRDT Sync (Queued)

| Item | Description | Owner |
|------|-------------|-------|
| Automerge integration | Re-enable CRDT writes (`crdt_changes`, `crdt_checkpoints`). Decide whether to store serialized Automerge docs or delta chains. | App + Dev |
| Conflict/offline handling | Ensure changes made offline merge cleanly when back online (CRDT is the source of truth). | App |
| Snapshot/backup | Plan how snapshots are anchored (e.g., IPFS/Crust) now that Supabase holds the metadata. | Dev |
| Testing | Add regression tests covering concurrent edits, offline flows, and replay from `crdt_checkpoints`. | App |

**Deliverable:** Same behavior as pre-Supabase CRDT variant but backed by Supabase data.

---

## Follow-up / Nice-to-haves

1. **RLS Expansion (deferred)** – per Teddy, leave the remaining tables open for now to reduce friction; revisit when we actually store PII/financial data.
2. **Custom API (optional)** – if we ever need server-side logic or service-role actions, introduce Vercel Edge Functions or a lightweight API.
3. **Monitoring + CI** – add tests and health checks for Supabase-backed operations.

---

## Open Questions Tracking

| Topic | Decision / Next Step |
|-------|---------------------|
| Wallet-only users | Wallet login already creates a Supabase user by bridging the signing key; no extra work needed right now. |
| RLS timing | Defer until we store more PII/financial data. Teddy to flag when to re-prioritize. |
| CRDT timeframe | Implement right after CRUD ships; Teddy to raise any constraints before we start Phase 2. |

---

## How to Use This Doc

- Treat Phase 1 items as the active sprint scope.
- When CRUD is merged, revisit the Phase 2 table and create tickets for each item.
- Update this document whenever we change the plan (e.g., if we add RLS earlier or decide on a custom API).
