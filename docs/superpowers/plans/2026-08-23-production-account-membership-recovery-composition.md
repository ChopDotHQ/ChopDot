# Production account, membership, and recovery composition

Date: 2026-08-23
Programme: A, constrained by Programme B
Cockpit cards: P-035 and P-032

## Goal

Make the production entrypoint usable with an explicit Product Account while
keeping receipt capture and bounded guest use available before account
ceremony. Compose signed organizer membership and optional participant-held
recovery into the existing One Chop Core without making host, chat, URL,
storage, or recovery carriers an authority.

## Current truth to preserve

- **Scan a receipt** remains the first product action.
- Signed canonical events are membership and money authority.
- Contact proof selects a person but grants no membership or organizer role.
- Receipt drafts remain local until reviewed and signed.
- Manual/external payment remains usable without account or native setup.
- `DurableMembershipKeyEnvelopeRegistry` is the sole account-bound membership
  key registry; reusable group keys never enter URLs, App state, logs, or copy.
- Recovery is optional and cannot report success until recovered events have
  been atomically imported into `ProductionAuthority`.

## Product gates

### Entry

User journey: “I am Mina, I need to scan now or use my Product Account, so my
signed group actions can belong to me without blocking capture.”

One next action: **Scan a receipt**.
Score: friction 3/3, trust 2/3, clarity 3/3, language 1/1 — 9/10 PASS.

### Membership

User journey: “I am Mina, I need to invite one verified person into one group,
so they join intentionally and receive future group access.”

One next action: **Invite this person**.
Score: friction 3/3, trust 3/3, clarity 3/3, language 1/1 — 10/10 PASS.

### Recovery

User journey: “I am Mina, I need to protect or recover this group, so I can
restore its signed record after losing local access.”

One next action: **Protect this group** or **Recover this group**, according to
the current state.
Score: friction 2/3, trust 3/3, clarity 3/3, language 1/1 — 9/10 PASS.

## Visual and interaction thesis

Sparse, cardless, payment-app utility screens. ChopDot pink marks only the one
primary action. Account, invite, and recovery are plain-language supporting
actions. No host, native, protocol, adapter, proof, key, digest, CID, or storage
language appears in normal UI.

## Scope in

- Explicit Product Account request and honest unavailable/retry states.
- Stable authority identity and dynamic membership resolvers.
- Organizer group-origin provisioning through
  `MembershipRegistryGroupAccessProvisioner`.
- Organizer selection of an existing canonical group, verified contact, and
  existing chat room.
- Production organizer coordinator and event/acknowledgement multiplexing.
- Canonical `MEMBER_ADDED` append through `ProductionAuthority` only after the
  recipient-bound signed grant acknowledgement.
- Canonical removal only after every remaining active member has opened,
  persisted, and signed an acknowledgement for the same proposed next key;
  removal intent and room metadata alone never authorize `MEMBER_REMOVED`.
- Ciphertext-only delivery of new canonical events to active members through
  an explicitly selected group-to-conversation binding, the sole account-bound
  key registry, signed recipient acknowledgements, retry, dedupe, and expiry.
- Explicit optional protect/recover actions using
  `ProductionRecoveryCoordinator`.
- Atomic recovered-event import before user-visible success.
- Focused runtime tests, production-entrypoint coverage, and source wiki/ADR
  updates.

## Scope out

- New identity provider, chat provider, custody, operated database, or private
  relay.
- Mandatory recovery setup or claims of permanent Bulletin retention.
- Lost-account recovery without explicit social re-grant or optional kit.
- Changes to receipt/money semantics or named-mode policy.
- Public deployment, name registration, or mainnet action.

## Behavior contracts

### Product Account

GIVEN Mina has not requested a Product Account
WHEN she scans a receipt or continues as guest
THEN the local draft/guest path remains usable and no account authority is
invented.

GIVEN the official host returns a Product Account signer
WHEN Mina explicitly chooses **Use my Product Account**
THEN the runtime binds participant identity to that public key and signer and
hydrates signed authority for that participant.

### Membership

GIVEN Mina is the accepted organizer of an existing canonical group, has one
verified contact, and chooses one existing conversation
WHEN the intended account accepts and returns the signed durable grant
acknowledgement
THEN the runtime appends exactly one canonical `MEMBER_ADDED` command.

GIVEN only contact proof, room metadata, peer metadata, an invitation, or an
acceptance exists
WHEN membership state is read
THEN no canonical member or organizer authority is added.

GIVEN a canonical group is explicitly bound to an existing conversation
WHEN a signed canonical event is accepted locally
THEN it is encrypted with the current account-bound group key and queued only
for active recipient accounts; conversation and peer metadata grant no
authority.

GIVEN a removed member has only an older group-key version
WHEN a later canonical event is delivered
THEN that member is not a recipient and cannot open the future-key ciphertext.

GIVEN the organizer explicitly selects one active member to remove
WHEN any remaining member has not returned an exact recipient-opened next-key
acknowledgement, or the canonical frontier changed
THEN the UI remains in a waiting/error state and no `MEMBER_REMOVED` command is
available.

GIVEN every remaining active member acknowledged the same proposed next key
WHEN the organizer finishes removal
THEN one canonical removal command carries the complete recipient envelope map
and the removed member receives no future-key material.

GIVEN a newly accepted member lacks prior canonical history
WHEN an active member sends ordered encrypted catch-up
THEN ChopDot verifies and atomically imports the complete signed frontier before
accepting or acknowledging the pending `MEMBER_ADDED`/live transition.

GIVEN an inbound ciphertext has a wrong conversation, recipient, key version,
signature, expiry, or duplicate delivery id
WHEN the runtime receives it
THEN no authority state changes; valid ciphertext is decrypted and passed to
`ProductionAuthority.accept` before its signed acknowledgement is returned.

### Recovery

GIVEN Mina chooses **Protect this group**
WHEN publishing succeeds
THEN ChopDot reports that the protected copy is optional, encrypted, and
subject to bounded availability.

GIVEN a same-account recovery locator resolves to a verified checkpoint and
events
WHEN Mina chooses **Recover this group**
THEN `ProductionAuthority.importRecoveredEvents` completes atomically before
the UI reports success.

GIVEN publishing, lookup, verification, or import fails
WHEN recovery returns
THEN the current group remains unchanged and the UI gives an honest retry or
social re-grant path.

## Verification

- Focused runtime/composition Node tests.
- Existing signed-membership and production-recovery suites.
- Canonical two-account convergence plus removed-member future-key denial.
- `npx tsc --noEmit` and `npm run build`.
- Production `src/main.tsx` browser entry coverage for scan/guest/account,
  membership selection, and recovery states where the host can be simulated.
- Screenshot review of first action and account/recovery states.
