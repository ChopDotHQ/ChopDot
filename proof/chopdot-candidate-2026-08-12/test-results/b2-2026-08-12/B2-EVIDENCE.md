# Batch 2 local characterization evidence

Run completed: 2026-08-12T15:18:08Z  
Delivery train: `chopdot-functional-candidate-2026-08-12`  
Candidate snapshot: `b2-2bffe81230bafec5`

## Product gate

User journey: Nina opens Mina's invitation and chooses whether to join so
Zurich Dinner can coordinate without a forwarded link becoming membership.

One next action: **Accept invite**.

- Friction 3/3
- Trust 3/3
- Clarity 3/3
- Language 1/1
- Total 10/10 — PASS for the controlled local preview; product route remains PARTIAL

## Exact commands and results

- Membership regression: PASS, 42/42.
- Recipient bootstrap/coordinator: PASS, 6/6.
- Payer request-link regression: PASS, 4/4.
- Coordinator-backed bootstrap UI: PASS, 6/6.
- Actual-router legacy retirement: PASS, 2/2.
- Mixed link/QR/no-app UI: PASS, 6/6.

## Control mapping

| Control | Fresh proof |
|---|---|
| One membership model | Existing-contact, link, and QR all reduce through signed invite, signed decision, and protected grant coordinator paths. |
| Link and QR parity | The canonical `#chopdot-invite` URL is byte-identical to QR text and decodes to the same exact-schema bootstrap. |
| Limited no-app | A separate signed exact-action request/response reducer cannot create membership or grant organizer/receiver authority. |
| Transport is not authority | Bootstrap import verifies recipient binding, organizer signature, an externally resolved organizer root, expiry, and exact schema. |
| Legacy snapshot retired | The actual router no longer parses `joinGroup` or dispatches `ACCEPT_GROUP_INVITE`; its test proves zero group/expense/split import. |
| Explicit consent | Opening creates no membership; Nina may accept or decline; acceptance remains pending until Mina's protected grant. |
| Forward/wrong person | Leo cannot import Nina's recipient-bound bootstrap; visible UI shows a safe stop. |
| Expiry/revoke/replay | Expiry, wrong route, conflicting replay, duplicate account/identity, and old lifecycle revoke cases fail closed. |
| No secret/history/money authority | Exact schema rejects extra group key, history, expense/split, capability, and money-state fields. |
| Isolated mixed UI | Separate Mina/Leo/Nina coordinators complete existing-contact plus link/QR flows; limited no-app remains action-only. |
| Plain language | Fresh desktop/mobile screenshots contain no infrastructure terms. |

## Honest boundary and failed promotion gate

This is a local model and simulated-host characterization pass, not a Batch 2
product-route pass. The actual app router recognizes the new bounded bootstrap
and fails safely, but does not expose Accept until a
real Product Account signer, trusted recipient/organizer resolvers, durable
return delivery, CryptoKey-capable pending storage, and protected key sink are
available. No public/live convergence is claimed.

Because the visible Accept -> pending -> protected grant journey exists only in
the clearly labeled local preview, no `receipts/B2.json` promotion receipt may
exist yet. Batch 3 stays locked.

The older snapshot builder/parser remain as dead code for historical tests,
but no candidate router or group screen invokes them. Full removal is tracked
for the final candidate cleanup.
