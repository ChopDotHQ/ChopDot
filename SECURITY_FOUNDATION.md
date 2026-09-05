# Security Foundation

Status: active baseline for the portable shell trial
Updated: 2026-07-14

## Purpose

This shell is allowed to prove ChopDot across web, Telegram Mini App, and
`.dot`/Paseo-style hosts, but it must not become a pile of host-specific risk.
The security posture is:

```text
Product state owns truth.
Host data is a hint.
URL request data is display-only unless matched to local state.
Payment marked is not payment confirmed.
Confirmation is receiver-owned.
Proofs are repeatable.
```

## Current Scope

This project is a static React/Vite prototype. It has no backend authority,
no custodial money movement, no server-side Telegram identity validation, and
no real payment rail integration.

`PAYMENT_INTENT_CONTRACT.md` defines the backend-owned authority, command,
idempotency, evidence, and audit boundary that must be implemented before any
surface can claim cross-device payment-state changes. The contract is a design
foundation, not a backend implementation.

`PAYMENT_INTENT_SERVICE_FOUNDATION.md` and `server/payment-intents/` provide an
executable in-memory reference kernel for those invariants. They are not a
network service, database, identity authority, or production backend.

That means every security-sensitive feature must stay honest about its current
authority. The shell can help people coordinate payment, but it cannot claim a
payment arrived unless the receiver confirms it in the local product state.

## Assets

- group names and member display names;
- spend amounts, currencies, split amounts, and payment status;
- preferred payment method labels;
- saved group summaries;
- payment request links;
- user trust in who owes, who paid, who confirmed, and what remains open.

## Trust Boundaries

Treat these inputs as attacker-controlled unless validated:

- URL query parameters, including `payGroupId`, `payMemberId`, and `payRequest`;
- Telegram `initDataUnsafe` and launch parameters;
- browser `localStorage`;
- Telegram `CloudStorage`;
- clipboard/share-sheet delivery;
- `.dot` host wrappers, iframes, and gateway query forwarding;
- any future wallet, payment, OCR, LLM, or receipt-import result.

## Product Security Invariants

1. Sending a request SHALL NOT reduce the receiver's net position.
2. A payer marking paid SHALL NOT reduce the receiver's net position.
3. Only receiver confirmation SHALL reduce the receiver's net position.
4. A standalone request link SHALL NOT mutate the receiver's local state.
5. URL request data SHALL NOT create a group, expense, split, user, saved record,
   or confirmed payment.
6. Local state matching SHALL be required before a payer link can enter the
   stateful payer flow.
7. Host storage mirrors SHALL NOT become product truth.
8. Developer/proof/host/protocol language SHALL NOT appear in normal UI.
9. Future backend or chain evidence SHALL be matched to a scoped payment intent
   before it can update product state.
10. AI/OCR/chat capture SHALL create a draft for review, not a payment request
    or confirmed record.
11. Future payment-state mutations SHALL use the actor-bound, versioned,
    idempotent command boundary in `PAYMENT_INTENT_CONTRACT.md`.
12. A host or payment event SHALL NOT update a split unless it matches the live
    payment intent's payer, receiver, amount, currency, rail, reference, scope,
    and expiry.

## Request Link Boundary

Request links can carry two pieces of data:

- local route ids: `payGroupId` and `payMemberId`;
- a compact request summary for fresh-device display.

If local state has a matching group, member, and `request_sent` split, ChopDot
can show the normal payer flow and update that local split to `marked_paid`.

If local state does not match, ChopDot can only show a standalone payment
request. In that standalone path, `I paid` is local to the payer screen and must
end with the message that the receiver still needs to confirm.

For a future backend, these URL values remain untrusted hints. A public intent
lookup id may fetch a minimal server projection, but mutation authority requires
the separate actor and guest-capability rules in `PAYMENT_INTENT_CONTRACT.md`.

## Host Capability Boundary

Host-specific behavior must flow through `src/environment/index.ts`.
Components may use capabilities such as share, clipboard, host back button, and
storage availability, but normal product components must not inspect Telegram,
`.dot`, wallet, or iframe globals directly.

## Secure Frontend Baseline

- Do not ship secrets in the browser bundle or `.env.example`.
- Avoid `dangerouslySetInnerHTML`, DOM HTML sinks, `eval`, string timers, and
  unvalidated `postMessage`.
- Keep third-party scripts minimal and documented.
- Prefer React-rendered text so user-controlled strings are escaped by default.
- Validate and bound URL-derived packets before rendering.
- Treat `localStorage` and host storage as recoverable convenience only.
- Keep production build and proof commands green before accepting a host pass.
- Proof reports SHALL be written on failure as well as success, SHALL close
  browser processes, and SHALL redact URL query values.

## Repeatable Checks

Run before accepting new host, request-link, payment, or storage behavior:

```bash
npm run lint
npm run security:baseline
npm run test:payment-intents
npm run build
npm run proof:web
npm run proof:telegram
npm run hosts:matrix
```

Run `.dot` proof when the change touches iframe/gateway behavior:

```bash
PROOF_URL=https://chopdot-shell-proof.paseo.li/?chainBackend=rpc-gateway \
  PROOF_OUT=proof/portable-shell-dot-host npm run proof:dot-host
```

A direct localhost app is not a `.dot` wrapper. The proof runner fails fast
without a wrapped `PROOF_URL` so a missing iframe cannot be mistaken for a
product regression.

## Launch Blockers For Real Money

Before this shell can represent production money movement, ChopDot needs:

- server-side identity/session authority;
- server-side Telegram `initData` validation if Telegram identity is trusted;
- an implementation of the scoped, expiring payment-intent contract;
- an implementation of idempotent commands and append-only event history;
- backend persistence with authorization checks;
- payment evidence matching rules;
- receiver-bound confirmation authority;
- audit logs for payment-state transitions;
- privacy rules for names, links, receipts, and saved records.

Until those exist, this shell is a coordination prototype and must say so in
payment surfaces where the distinction matters.
