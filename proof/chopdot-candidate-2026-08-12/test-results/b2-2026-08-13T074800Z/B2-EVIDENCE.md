# Batch 2 fresh local evidence

Candidate: `b2-2026-08-13T074800Z`  
Delivery train: `chopdot-functional-candidate-2026-08-12`  
Run window: `2026-08-13T07:48:00Z` through `2026-08-13T07:50:00Z`  
Verdict: **LOCAL PASS / LIVE BLOCKED**

This is a local host-simulator qualification of the actual `App` entry routes
and their production-neutral dependency seams. It is not evidence that the
public `.dot`, Polkadot Desktop allowance, contact resolver, or live chat
delivery works.

## Candidate identity

- Git HEAD: `81e56801a059253ca3daf667251239d4776e96f4`
- Source/test aggregate SHA-256: `fa24ce640b9ad27e455b3f3f9ca5a3ed10d908c0c7f43ab2344bee1922321a6d`
- `package-lock.json` SHA-256: `27dc2921197845c57dbba6556dde28892eef098acd591e3542b30315245a1c6c`
- The source/test aggregate is the SHA-256 of the sorted SHA-256 manifest for
  every regular file under `src/` and `tests/`. The same aggregate was measured
  before and after the run.
- The worktree is intentionally dirty and this is an intermediate Batch 2
  snapshot. Clean-source and final-fingerprint reproof are Batch 6 gates.

## Exact command results

| Command | Result | Log SHA-256 |
| --- | --- | --- |
| `b2-membership-regression` | PASS 54/54 | `784256a18ced3ad5af541e07272d1b04541d16272e9ee91c0bc0aebab156d038` |
| `b2-entry-domain` | PASS 6/6 | `d3b2c52e2f35f58f0a3cea2cd9e59dddebbccd25dcb3c31fde7386a411ace06a` |
| `b2-limited-no-app-domain` | PASS 8/8 | `2bff9263f17193ccd49d725bcff43ca0b1d86a09d329f2304ca67883efa8c42c` |
| `b2-request-link-regression` | PASS 4/4 | `afb0305e9b53fca4d472d36a46593b535ea2314b2521183d13b8309a6b2e3611` |
| `b2-preview-ui` | PASS 6/6; regression only | `4d32d59edebcdf987e2ab6b942e6d40c47b90251e2b204cce705c7ecf692a59b` |
| `b2-router-retirement` | PASS 2/2 | `528b5058804e507e83b4990e7df337244cfe4a341d997e8bb33845cf19d33c05` |
| `b2-mixed-ui` | PASS 5/5 | `038aac1fac6a0261ea8143188d4c187663cb19d51d2a9f46f9324571f2ce6559` |
| `b2-limited-actual-ui` | PASS 2/2 | `1d2e0c0bad50a0cfec4656199fbfe9089701c0b222b6f9bb393c48289715a697` |

Supplemental qualification also passed TypeScript lint, the security baseline
(113 files), and the production Vite build. Its log SHA-256 is
`ee97dc4cc10f90bb2cd21fdb07f86a612eb1d423f90a2ca1f0147629a2547a22`.
The sequential proof harness passed 13/13; log SHA-256
`698206e0d682fa2bb15f7fc7dc28f7196b9abcaa4ce2c14afc3bb66b567ccd97`.

## Fourteen-control mapping

1. **B2-ONE-MEMBERSHIP-MODEL — PASS.** Existing-contact, link, and QR
   invitations reduce through the signed lifecycle. The actual router retirement
   proof confirms legacy `joinGroup` snapshots import no group or money state.
2. **B2-LINK — PASS.** The organizer uses visible actual-App actions to create
   and copy the invitation. Copy success and the selectable fallback are both
   exercised. Nina opens the exact recipient-bound URL, explicitly accepts,
   remains waiting across reload, and joins only after Mina's separate action.
3. **B2-QR-PARITY — PASS.** The organizer uses visible `Show QR`; the test
   decodes the rendered PNG and proves it contains the exact canonical invitation
   URL. Nina receives the explicit QR decision state.
4. **B2-LIMITED-NO-APP — PASS.** The actual route binds a single dinner action,
   persists/retries one signed response across reload, rejects wrong-account and
   expiry, and keeps groups, expenses, splits, and saved records empty. Domain
   tests cover tamper, conflict/replay, dropped outbox, and offline restart.
5. **B2-TRANSPORT-NOT-AUTHORITY — PASS.** Domain tests reject URL/route
   authority, missing organizer trust, wrong accounts, tamper, and unsupported
   claims. The actual-App fixture injects organizer trust independently before
   navigation and gives each isolated context only its own signing capability.
6. **B2-LEGACY-SNAPSHOT-RETIRED — PASS.** Actual-router proof confirms the old
   snapshot no longer creates membership or imports group, expense, or split
   state.
7. **B2-EXPLICIT-CONSENT — PASS.** Opening does not join. Accept and Decline are
   explicit recipient actions; Accept remains pending and Decline never joins.
8. **B2-FORWARD-WRONG-PERSON — PASS.** Account-bound domain proof rejects a
   forwarded invitation. The actual limited route renders an honest wrong-account
   state with no action and no product-state mutation.
9. **B2-EXPIRY-REVOKE-REPLAY — PASS.** Domain tests cover expired invitations,
   organizer revoke, exact replay/conflict rejection, early grant defer/reorder,
   retry, and expired inbound grant. Actual routes render expired and malformed
   safe stops.
10. **B2-NO-SECRET-OR-HISTORY — PASS.** Bootstrap and limited-action payload
    tests reject group history, secrets, roles, grants, and unsupported data. The
    actual routes import no group or money history.
11. **B2-MONEY-STATE-NON-AUTHORITY — PASS.** The limited response is bound to
    one action, expense, amount, currency, account, and expiry. It does not mark
    app money collections or grant membership.
12. **B2-DUPLICATE-IDENTITY — PASS.** Domain lifecycle and bootstrap tests reject
    duplicate route/identity and conflicting event IDs without a second member.
13. **B2-ISOLATED-MIXED-UI — PASS.** Mina and Nina run in separate browser
    contexts with separate storage and signer capabilities. The proof covers
    visible organizer link/QR creation, subscribed simulated delivery,
    accept-wait-restart-grant, decline, malformed routes, and the separate limited
    participant route.
14. **B2-PLAIN-USER-LANGUAGE — PASS.** Actual surfaces were checked for forbidden
    infrastructure vocabulary and visually reviewed at 1280x720 and 390x844.
    Each state has one obvious next action or explicitly says no action remains.

## Visual review

Fourteen durable screenshots are stored in `screenshots/`:

- organizer link/share, recipient decision, restart waiting, organizer ready,
  and joined states at 1280x720;
- organizer QR, recipient QR decision, decline, malformed invitation, and
  malformed request at 390x844;
- limited dinner request, waiting-for-confirmation, wrong-account, and expired
  states at 390x844.

Independent visual review found no clipping, internal protocol language,
preview labels, false membership claim, or hidden primary action in these
captures. The copy fallback is asserted in the test log but has no separate
screenshot.

## Live stop

`B2-LIVE-PUBLIC-ROUTES` and `B2-LIVE-MIXED-DELIVERY` remain **BLOCKED**. The
normal `main.tsx` composition safely provides no organizer trust resolver or
live membership delivery dependency, and no authorized public two-account
Desktop run was performed. Local evidence must not satisfy these controls.
