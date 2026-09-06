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
