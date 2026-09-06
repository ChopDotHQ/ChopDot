# Journey 04 — Invite / Join a Group

**Priority:** P0  
**Status:** Design Approved / Golden Journey #3  
**Prototype:** `v1-golden-candidate.html`

## User goal
Bring people into a shared group, or understand and accept an invitation without friction.

## Two sides

### Inviter
`Group created / Group Home → Invite people → Share link or add someone → Pending/sent → Open group`

### Joiner
`Open invite → Understand group + inviter → Join / Not now → Joined → Open group`

## Inherited references
1. Home V1.4 — Golden Screen #1
2. Create Group V2 — Golden Journey #2

## Approved prototype decisions
- Invite people as people, not as wallet addresses.
- No blockchain terminology in the invite flow.
- Inviter gets two simple paths: share a group link or add someone directly.
- Invitee sees enough group context to decide: group name, inviter, people count, currency.
- Expense details stay private until the invitee joins.
- `Join group` and `Not now` are explicit exits.
- Successful join lands in a clean Group Home handoff (Journey 08).
- Pending invites remain visible to the inviter.

## Core states
Inviter:
- Invite people
- Share invite
- Add someone
- Pending invite
- Invite shared/sent
- Invite complete

Joiner:
- Open invite
- Joined
- Not now

Recovery:
- Expired invite
- Already joined
- Offline invite

## Copy rule
Keep every screen understandable without explanatory paragraphs.

Examples:
- `Invite people.`
- `Share a link or add them.`
- `Devinson invited you.`
- `Join group`
- `You're in.`

## Privacy rule
Before joining, show group-level context only. Do not expose expense details or balances.

## QA
Reviewed at:
- 393 × 852
- 430 × 890

Checks passed:
- 14 explicit states
- 37/37 internal hash links resolve
- zero horizontal overflow
- no header/content/footer overlap
- no placeholder glyph icons
- inviter and joiner happy paths complete
- expired / already joined / offline states exist

## Approval
Approved by the user on 2026-09-03 and frozen as **Golden Journey #3**.

Next: Journey 08 — Group Home.

<!-- JOURNEY_DECISION_HISTORY:START -->
## Decision history

**Coverage:** Selected source-supported decisions, backfilled 2026-09-06 from commit `f403b02d05a50d13f556b3edfb949f92b24488a9`. Not a complete conversation or alternatives audit. Earlier candidate labels in the spec body describe its drafting stage; the registry/approval sources below establish the recorded status. Revisit triggers below are maintenance notes added now, not claims about past discussion or permission to redesign.

### J04-D01 — Context before consent, private expenses after joining

**Decision:** Invite people rather than wallet addresses. Offer link sharing or direct addition. Show group name, inviter, people count and currency before explicit Join group / Not now choices; keep pending invitations visible.

**Why:** The source goal is to understand and accept an invitation without friction. Its privacy rule limits pre-join information to group-level context.

**Alternatives:** Wallet-address invitations and blockchain terminology are explicitly excluded. Expense details and balances are not part of the pre-join preview.

**Tradeoffs:** An invitation is not membership. Expired, already-joined and offline states must remain distinguishable; Join hands off to Group Home.

**Revisit when:** Tests expose private expenses before joining, unclear inviter/group identity or a missing safe exit; entry integration loses the invitation.

**Approval / version:** v1 — Golden #3 / design-approved, as recorded at the source commit. This documentation update does not create or expand approval. TYPO-01 shared typography/readability remains deferred.

**Sources:** [Spec: approved prototype decisions](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/04-invite-join/spec.md#approved-prototype-decisions); [Spec: privacy rule](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/04-invite-join/spec.md#privacy-rule); [Spec: approval](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/04-invite-join/spec.md#approval); [version and approval registry](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/registry/journeys.json).
<!-- JOURNEY_DECISION_HISTORY:END -->
