# People/chat qualification for natural participation

Date: 2026-08-12  
Programme: B native truth  
Verdict: **PARTIAL — credible existing-contact route; integration and real-host proof open**

## Decision

Use the installed Product Host SDK chat surface as a replaceable delivery edge
for already-signed membership events when Mina and Leo already share a Polkadot
chat room. Do not treat a room, message, peer string, link, or push notification
as identity or membership authority.

Separately qualify `@novasamatech/host-chat@0.9.4` as a possible People-chain
contact lookup and recipient-encryption-key source. Do not install or promote it
until its host-stack compatibility, account binding, X25519 ceremony, bundle
impact, lifecycle, and real Desktop read-only behavior pass.

## Confirmed local SDK facts

The current shell already installs:

- `@parity/product-sdk-host@0.14.1`;
- `@parity/truapi@0.5.1`;
- `@parity/host-api-test-sdk@0.10.0`.

The installed Host SDK exposes `getChatManager()` with:

- room-list subscription;
- custom binary chat messages;
- incoming chat-action subscription containing room and peer;
- a `MessageTooLarge` posting error.

It does not expose account/participant targeting on `sendMessage`; ChopDot must
use a room the user already participates in. Scheduled push notifications are
local host notifications and are not a recipient mailbox.

The official `@novasamatech/host-chat@0.9.4` package README describes:

- username search backed by an off-chain index;
- People-chain identity resolution;
- a 32-byte X25519 `identifierKey` where supported;
- host-side chat message/session codecs.

It depends on the aligned `0.9.4` Nova host/statement/storage stack. That is a
different line from the shell's Product Host 0.14.1 / TruAPI 0.5.1 runtime and
the current Desktop host-papp evidence. It is not a drop-in product dependency.

## Implemented local seam

`src/membership/chatInvitationTransport.ts` now:

- encodes one structurally valid signed membership event as a versioned custom
  chat message;
- decodes only ChopDot membership messages;
- ignores unrelated/malformed messages;
- forwards room and peer as untrusted delivery metadata;
- requires the caller to select an existing room.

`src/membership/membershipDeliveryOutbox.ts` now persists the exact signed event
and selected room before delivery, keeps it on failure/restart, removes it only
after accepted delivery, and protects concurrent enqueue during flush. Neither
transport nor outbox applies membership.

## Payload characterization

Measured JSON payloads before the host's custom-message wire encoding:

- signed invitation: 617 bytes;
- signed acceptance: 882 bytes;
- signed encrypted grant: 1327 bytes.

The installed types expose `MessageTooLarge` but not a documented byte limit.
The grant therefore needs an aligned host/simulator size canary and probably a
compact binary codec before promotion. No current pass claim is made.

## Required qualification gates

### C0 — zero-write compatibility

1. Build an isolated dependency/runtime matrix for Product Host 0.14.1/0.15.1,
   TruAPI 0.5.1/0.7.x, host-api-test 0.10.0, and host-chat 0.9.4.
2. Prove a single codec/runtime line; reject duplicate incompatible host codecs.
3. Measure tree-shaken bundle and exact message sizes.
4. Prove X25519 key validation, wrong-account rejection, rotation, missing-key
   fallback, and no private-key exposure.

### C1 — read-only real Desktop

1. Confirm chat manager availability.
2. Subscribe to the current Product Account's room list without creating a room
   or sending a message.
3. Verify the visible selected conversation maps to the intended human/contact;
   do not trust peer text as the Product Account.
4. Record unsupported/permission-denied behavior in normal user language.

### C2 — action-time-approved synthetic delivery

Only with fresh approval:

1. Mina selects an existing conversation with Leo.
2. ChopDot signs and durably queues one non-money invitation event.
3. The host sends one custom message.
4. Leo's isolated Product Account receives it, verifies Mina, and sees an honest
   accept/decline action.
5. Acceptance returns through the same room and remains pending until Mina's
   verified protected grant arrives.
6. Duplicate, offline, restart, wrong-room, wrong-account, oversized, decline,
   and revoke cases are exercised.

## Boundaries

- Existing chat room: promising route for an existing contact.
- People lookup/X25519 key: promising discovery/encryption input, unproved in the
  product and likely host-side rather than product-side.
- Link/QR: bootstrap for someone not already reachable; never synchronization.
- Limited no-app link: one named payer action only; never membership.
- Statement Store: shared signed-event delivery after protected membership;
  not initial recipient discovery.
- Cloud Storage: encrypted checkpoint transport only; not contact discovery.

No package, permission, account, chat room, message, allowance, chain state,
deployment, or publication was changed during this qualification.
