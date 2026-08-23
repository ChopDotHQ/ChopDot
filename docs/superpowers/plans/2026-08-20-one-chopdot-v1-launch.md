# One ChopDot v1 — Complete Product and Launch Plan

Date: 2026-08-20
Track: Track 1 product delivery
Deployment door: Programme A `.dot`
Native capabilities: Programme B, pulled in only behind product-language boundaries
Cockpit anchor: P-032, with P-022, P-025, P-027, and P-033 as required dependencies

## Goal

Ship one class-act ChopDot v1 that a real Mina, Leo, and Nina can use on
separate devices from first entry through receipt capture, participation,
payment, receiver confirmation, recovery, and one immutable saved record.

This is not a portable-shell demo, a local proof screen, a protocol console, or
a blind merge of prior branches.

## What fully deployed means

ChopDot is fully deployed only when all three states are true for the same
source fingerprint:

1. **Candidate complete** — one clean source contains the account/profile,
   people, capture, split, payment, confirmation, recovery, cards, and history
   journey; exact local and simulated-host gates pass.
2. **Publicly deployed** — that exact artifact is published at the supported
   public wrapper, and first entry, routes, links, refresh, mobile, desktop, and
   failure states work outside the development machine.
3. **Live product proven** — Mina, Leo, and Nina use separate real accounts and
   devices; actions synchronize automatically; offline/new-device recovery
   works; one immutable record survives; monitoring, privacy, support, rollback,
   and backup/restore are operational.

A reachable URL without state 1 is an old prototype. A polished local candidate
without state 2 is not deployed. A deployment without state 3 is a public beta,
not a fully proven live product.

## Current position

| Product layer | Current evidence | Missing before full deployment |
| --- | --- | --- |
| Public URL | `chopdotproof02` is reachable | It runs the older v0.5.6 prototype, not the new candidate |
| Candidate | B6 `3519a894efbc` passed 84/84 local controls and 63 screenshots | Verified-person and later work must be integrated and all gates rerun |
| Account/profile | Guest, local profile, Product Account foundations, and verified-contact components exist | One real entry, profile, session, sign-out, wallet, and recovery lifecycle |
| Money truth | Integer money, signed events, receiver-confirmation, recovery, and immutable-close foundations pass locally | Remove remaining legacy paths and reprove one candidate |
| People/groups | Existing-person, link/QR, no-app, and verified-contact foundations pass locally | Real provider composition, revocation/rotation, and live account/device proof |
| Synchronization | Durable local outbox/inbox and recovery foundations pass | Verified remote delivery binding, availability relay/native transport, and live convergence |
| Full experience | Dinner journey and cards pass locally; richer main-app/parallel features exist | Intentional capability inheritance into the exact candidate |
| Release operations | Historical deploy pipeline and evidence pack exist | Clean final lock/artifact, public wrapper proof, monitoring, backup/restore, support, and rollback |

## The user-visible destination

The CHF 120 Mina/Leo/Nina dinner remains the canonical release proof, not the
only allowed experience. ChopDot must present a simple contextual next action
while supporting multiple paths through one trustworthy money model.

1. Mina opens ChopDot. A returning Mina opens automatically with her recovered
   profile and groups. A first-time Mina chooses `Get started`; the Polkadot App
   handles whichever account options it has actually qualified. A bounded guest
   route remains available where safe. Payment wallets remain separate.
2. Mina may begin group-first, expense-first, or person-first. She can add people
   before the first expense, while reviewing a split, or later in an ongoing
   group.
3. `Add expense` opens simple capture choices: take a photo, import/share a
   receipt, paste a link or text, enter a quick amount, or add manually. None of
   these paths creates a separate money model.
4. While the expense is open, Mina can edit its title, amount, currency, date,
   items, payer, participants, and split. Once money has been paid, confirmed,
   or closed, corrections become linked events rather than history rewrites.
5. Splits may be equal, exact, percentage/share, itemized, exclude people, or
   include multiple payers. Integer minor-unit math must reconcile exactly.
6. When the group chooses `Settle up`, ChopDot recommends the shortest correct
   payer-to-creditor plan for one item, selected expenses, a round, or the full
   open balance. Each recommended transfer remains an exact independent action.
7. Each person may settle by cash, TWINT, bank, or a supported wallet/asset. An
   exact finalized on-chain transfer may confirm its exact matching obligation;
   all external methods remain marked paid until the receiver confirms receipt.
8. The group may keep adding expenses, close one immutable settlement round and
   start another, or archive the whole group. Everyone keeps the same readable
   record and can recover it after disconnect, restart, or same-account return.

### Simplicity contract

- Do not show every option at once.
- Entry shows `Get started`; returning people bypass it.
- Empty home shows `Start sharing`.
- An open group shows `Add expense`.
- A draft shows `Review split`.
- Open balances show `Settle up` with a recommended minimum-transfer plan.
- Each payer sees `Pay` or `Mark paid`; each receiver sees `Confirm received`.
- A resolved round shows `Keep going`, with close-round/archive as deliberate
  choices.

The full permutation table is maintained in `product/story-map.md`. The release
suite SHALL prove each decision point at the domain/state level and a bounded
pairwise set of real UI journeys, plus the complete canonical dinner journey.

## Current truth to preserve

- Product truth is the participant-held signed event log.
- `claimed`, `received/cleared`, `approved/released`, and `closed` remain
  distinct.
- A payer cannot confirm receipt for the receiver.
- Only an exact finalized transfer may confirm its exact matching item.
- Money uses integer minor units with an explicit asset/currency.
- Links and QR codes carry invitations or scoped actions; they are not identity,
  membership, synchronization, or financial authority.
- Polkadot infrastructure stays invisible in normal UI.
- Capture supports photo, import/share, link/text, quick amount, and manual
  entry while never forcing manual accounting first.
- The frozen B6 candidate `3519a894efbc` is the implementation baseline.
- Verified-person work is locally passed but must be integrated and re-proved on
  the final candidate.
- The parallel v1 branch is a capability source, not a merge target.

## Product gate

User journey:
"I am Mina, I need to start shared spending from the thing I already have—a
group, a person, an amount, or a receipt—so everyone can use the payment method
that fits and still end with one correct record."

One next action: contextual—`Get started`, then `Start sharing`, `Add expense`,
`Review split`, `Settle up`, or `Confirm received` as the state changes.

- Friction: 3/3
- Trust: 3/3
- Clarity: 3/3
- Language: 1/1
- Total: 10/10 — PASS

## Scope in

### 1. One source and one authority

- Reconcile the B6 candidate, verified-person slice, and selected parallel-v1
  capabilities into one candidate branch.
- Keep the signed event kernel as authority.
- Treat Postgres, Supabase, Host Chat, Statement Store, Bulletin, Cloud Storage,
  and URL packets as replaceable delivery, projection, or recovery edges only.
- Remove legacy direct-confirm and floating-point money paths from the candidate.

### 2. Access, login, profiles, credentials, and wallets

- First entry SHALL show one primary `Get started` action, with honest `Log in`
  and bounded `Try without an account` alternatives only where relevant. A
  payment wallet SHALL NOT be presented as the person's identity.
- Inside the Polkadot App, `Get started` SHALL quietly bind the stable ChopDot
  person to the host Product Account and host-held signer without receiving
  private key material. Returning people SHALL open their recovered home rather
  than pass through a redundant login choice screen.
- Outside the Polkadot App, account access SHALL use a replaceable OIDC/passkey
  provider edge. Apple, Google, email, and passkey options SHALL appear only
  after their real sign-in, return, sign-out, wrong-account, cleanup, and
  recovery paths pass.
- A guest SHALL be able to preview and perform only bounded low-risk actions.
  The first durable shared action SHALL protect the same participant rather
  than creating a second person or losing local work.
- Each stable ChopDot person SHALL have one editable product profile containing
  display name, avatar, locale/default currency, and verified relationships.
- A `.dot` profile SHALL mean that this ChopDot profile is bound to a Product
  Account; the Product Account address/public key is authority metadata, not
  the display name and not a public wallet balance screen.
- Account settings SHALL show access methods, active sessions/devices, recovery
  readiness, export/delete controls, and a clear sign-out action.
- Sign-out SHALL clear active signer/session capability and locally decrypted
  material without deleting recoverable signed history.
- Same-account return SHALL recover the same person and data. A lost Product
  Account SHALL require explicit provider recovery or a signed social re-grant;
  it SHALL never silently rewrite old signer history.
- Payment instruments SHALL be managed separately from login and profile:
  connect, verify network/account, name, choose a default, disconnect, and
  recover from wrong-network or unavailable-wallet states.
- Connecting, switching, or disconnecting a wallet SHALL NOT change person,
  friendship, membership, organizer, payer, or receiver authority.
- Wallet payment SHALL be enabled only for a verified supported network, asset,
  decimals, signer, receiver, amount, and finality path. Cash, bank, TWINT, and
  other external methods remain valid product paths with their own references
  and receiver confirmation.

### 3. Identity, people, and group participation

- Stable ChopDot person identity SHALL survive guest-to-account upgrade and
  credential changes without duplicating financial history.
- `.dot` SHALL use the Polkadot App Product Account and host-held signer.
- ChopDot SHALL never receive or store private keys or seed phrases.
- Two people SHALL mutually verify the account they intend to trust using the
  signed contact ceremony and a human-checkable code.
- Joining a group SHALL support:
  - an already verified person selected in app;
  - a recipient-bound link or QR invitation with explicit accept/decline;
  - a scoped no-app payment action that grants no membership.
- Revocation SHALL stop future authority and rotate affected group-key material.

### 4. Durable delivery and recovery

- Every shared action SHALL be a signed, actor-bound, idempotent event.
- Every sender SHALL persist an outbox until an exact acknowledgement arrives.
- Every receiver SHALL persist a deduplicated inbox before reducing the event.
- Reordered, duplicated, stale, tampered, wrong-account, and wrong-role events
  SHALL fail closed or converge exactly once.
- Delivery SHALL use one provider-neutral encrypted-envelope contract with:
  - Polkadot Host Chat as the native transport when a verified account-to-room
    binding exists;
  - a replaceable encrypted relay as the availability path when native delivery
    or posting allowance is unavailable.
- A relay MAY store signed ciphertext, acknowledgements, and checkpoint
  locators. It SHALL NOT create, rewrite, or confirm financial events.
- Same-account recovery SHALL reconstruct from an encrypted checkpoint plus
  later signed events after a new device/profile and beyond 300 seconds.
- Checkpoint keys SHALL be recipient/account bound, recoverable by the intended
  account, revocable, and rotated on membership changes.

### 5. Complete consumer journey

- Catch SHALL start with receipt photo, shared link, or import.
- Extraction SHALL create a reviewable draft with a correction fallback.
- Management SHALL support people, exact splits, currencies, edits before
  settlement, activity, offline state, and explicit next actions.
- Payout SHALL support cash/external payment references and only verified native
  rails; unsupported rails stay unavailable rather than simulated.
- History SHALL show requested, marked paid, confirmed received, corrected,
  waived/delayed where applicable, closed, and saved in human language.
- Closed records SHALL be immutable and SHALL not accept new expenses or close
  twice.
- Spending-group cards SHALL be action surfaces derived from the same kernel,
  not a separate state model.

### 6. Product experience

- First entry SHALL have one enabled, above-fold action at 1280x720 and 390x844.
- Account, login, wallet, guest, recovery, and unavailable states SHALL be
  honest and reachable.
- Loading, offline, retry, success, and failure states SHALL be announced and
  keyboard accessible.
- Touch targets SHALL be at least 44px and layouts SHALL hold at 320, 375, and
  390px widths, long names, and large amounts.
- Normal UI SHALL contain no SDK, host, adapter, protocol, proof, state-machine,
  or test-language leakage.

### 7. Operations and release

- Production configuration SHALL be versioned and environment pinned.
- Database/projection schemas SHALL use migrations, row/actor boundaries,
  backups, restore tests, and idempotency keys.
- Logs and analytics SHALL exclude secrets and unnecessary financial content.
- Rate limiting, abuse controls, error reporting, privacy/deletion, and support
  paths SHALL exist before inviting broad public traffic.
- The exact release SHALL have one source commit/tree, dependency lock,
  `dist`/`dist-dot-host` manifest, hashes, CAR/CID where produced, test receipts,
  screenshots, and requirement evidence index.

## Scope out

- Blind merge of `origin/chatgpt/chopdot-v1-completion`.
- Rewriting the kernel around a backend, chain, wallet, or host provider.
- Claiming Pot/Card custody or a rail that has not passed legal, security,
  runtime, and recovery proof.
- USDC execution without verified network, asset, decimals, and supported path.
- Hiding upstream or live proof failures behind simulated UI.
- Public deployment before explicit action-time approval of the exact artifact,
  environment, domain, and command.

## Competitive response

Spliz demonstrates strong public packaging around a group account, atomic USDC
settlement on Base, and planned pot/card surfaces. ChopDot SHALL not imitate its
chain-specific all-or-nothing model. ChopDot's distinct promise is one clear
group-money truth from capture to close, across the payment methods and money
cultures the group already uses, with receiver-confirmed finality and portable
signed history.

## Execution waves and gates

### Wave 1 — Candidate reconciliation

- Port verified-person work onto this branch.
- Inventory parallel-v1 commits by slice.
- Cherry-pick or manually port only capabilities that preserve the kernel.
- Eliminate lockfile/type errors in the exact candidate.

Gate: one clean source; TypeScript, security, and build green; no authority
conflict.

### Wave 2 — Access, account, profile, and payment instruments

- Replace the guest-only entrance with the environment-aware entry contract.
- Implement Product Account login/binding in `.dot` and the provider-neutral
  web account seam.
- Complete guest-to-account migration, account collision, login return,
  sign-out, session clearing, same-account return, and lost-account recovery.
- Implement the actual ChopDot/.dot profile and account settings surfaces.
- Implement wallet/payment-instrument connect, verify, switch, disconnect, and
  wrong-network/unavailable states without changing person identity.
- Qualify the exact account options currently exposed by the Polkadot App and
  official Product SDK. Only options with proved first-entry, return, sign-out,
  wrong-account, and recovery behavior may appear in ChopDot.

Gate: actual UI proves first-time/returning/login/bounded-guest entry, profile persistence,
guest migration, sign-out/return, recovery, wallet separation, and no credential
or private-key leakage on supported profiles/devices.

### Wave 3 — Verified people and participation

- Wire real Product Account composition.
- Complete verified contact, existing-person invite, link/QR accept/decline,
  organizer grant, revoke, and limited no-app action.

Gate: isolated Mina/Leo/Nina actors; no link or transport authority; restart and
wrong-person paths pass.

### Wave 4 — Delivery and recovery

- Finish verified account-to-delivery binding.
- Implement the universal encrypted relay edge alongside Host Chat.
- Complete acknowledgements, retry, catch-up, encrypted checkpoints, locator,
  key rotation, and same-account fresh-device recovery.

Gate: disconnect, restart, exceed 300 seconds, reconnect, and converge exactly
once without copied return links.

### Wave 5 — Full product inheritance

- Port the strongest Catch, group management, payment, confirmation, history,
  modes, and accessibility slices from the year-long app and parallel branch.
- Implement the path permutations in `product/story-map.md`: group/expense/person
  first; people before/during/after; photo/import/link/quick/manual capture;
  editable open expenses; equal/exact/share/itemized splits; scoped minimum-
  transfer settlement; mixed payment methods; keep-open/close-round/archive.
- Reprove every adapted capability in this candidate.

Gate: actual UI completes the CHF 120 dinner journey plus representative
permutations and hard paths; manual capture is usable but never forced; no
identity, membership, money, payment-proof, or history semantic regression.

### Wave 6 — Product and operational hardening

- Finish responsive/accessibility work, observability, rate limits, privacy,
  backup/restore, dependency review, performance, and support surfaces.

Gate: new-user comprehension, keyboard/mobile review, error recovery, security,
and operational checklist pass.

### Wave 7 — Exact freeze, deployment, and live proof

- Freeze one exact fingerprint and rerun all prior gates on it.
- Build and verify the `.dot` host artifact.
- Present exact action-time deployment approval packet.
- Deploy only after approval.
- Run three real first-time people on separate Product Accounts/devices through
  invitation, capture, payment, confirmation, recovery, and immutable history.

Gate: public wrapper, iframe, routes, refresh, first entry, live convergence,
recovery, and final record all pass on the deployed fingerprint.

## Required scenarios

### Scenario: real dinner loop

GIVEN Mina captured a CHF 120 receipt and added verified Leo and Nina
WHEN the split is reviewed, requests are sent, both payers mark paid, and Mina
confirms what arrived
THEN each exact share changes through the allowed states and the group closes
once with one immutable readable record.

### Scenario: payer evidence is not receiver confirmation

GIVEN Leo has marked his exact share paid
WHEN Mina has not confirmed receipt and no exact finalized matching rail event
exists
THEN Leo remains marked paid, Mina still sees a confirmation action, and the
record cannot represent the share as receiver-confirmed.

### Scenario: offline convergence

GIVEN Nina is offline beyond the normal notification window
WHEN Mina and Leo act and Nina later restores on a fresh profile with the same
account
THEN Nina reconstructs the encrypted checkpoint, applies each later valid event
once, and reaches the same money truth without Mina resending a snapshot.

### Scenario: carrier cannot grant authority

GIVEN a valid invitation link or encrypted relay packet is forwarded to Omar
WHEN Omar opens it with the wrong account
THEN no identity, membership, key, group, expense, or payment authority is
created.

## Falsifiers

Stop and re-plan if any implementation:

- makes Postgres/Supabase, a host, a chain, a link, or a transport the unsigned
  financial authority;
- lets payer-only evidence confirm receiver receipt;
- silently merges people when credentials change;
- exposes internal infrastructure language;
- relies on one browser profile as multiple people;
- calls a simulated or local proof live;
- makes receipt reconstruction/manual typing the primary capture path;
- mutates a closed record;
- ships a different artifact than the one proved.

## Documentation impact

This programme changes architecture, identity, recovery, transport, operations,
and release strategy. Update the relevant source pages in `docs/wiki/` and
`docs/adr/`, regenerate/validate the wiki, update cockpit cards and evidence,
and record checkpoints as each wave passes.
