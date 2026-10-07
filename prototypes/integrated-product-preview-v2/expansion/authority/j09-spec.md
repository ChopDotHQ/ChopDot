# Journey 09 — Manage People

Version: V1 · Golden Candidate #12 · review pending. Prototype only.

## Position in the workbench

Journey 01 V1 is now approved Golden #11. The core entry and in-app money loop are design-approved. Journey 09 is the first unfinished supporting journey in the existing registry order, before Request Money (13). The canonical goal is: **Understand members, relationships, roles, and payment preferences.**

Entry: People view or Group Home. Exit: Person detail, group, or settlement. This candidate uses Group Home → People as its starting context. It does not replace Journey 10's default People/balances view or add a global navigation tab. Existing Golden files remain unchanged.

## Main path

Group members → person → payment preference / shared groups → exact Settle or Request handoff → return to the same person and scope.

Zurich Weekend has four active members. Nina's separate pending invitation is a candidate-only fixture; she is not counted as a fifth member. She already belongs to a different shared group, which never grants Zurich access automatically.

## People before infrastructure

The member list shows name and role, not a financial ranking. A person's detail shows only your relationship with that person. Group roles are scoped to the selected group. There are no trust scores, contact-book uploads, network names, wallet addresses or banking dashboards.

Payment preferences are read-only when viewing another person. The recipient controls them. No account number, phone number, key or address is exposed in this journey. Own-method editing is handed off to Journey 20; sign-in choice is not a payment preference.

## Exact balances and continuity

All amounts are derived from the included fixture items. This prototype never edits the payment ledger. Positive amounts are owed to Dev; negative amounts are owed by Dev. The member-role demo changes the group's owner, not the viewer identity, so “you” stays Dev consistently.

- Jeanine in Zurich: CHF 0.00. Across balance-producing groups: Dev owes CHF 54.30, from Apartment −74.30 and Ski Trip +20.00.
- Marc in Zurich owes Dev CHF 30.00; across four groups CHF 125.40.
- Sam in Zurich owes Dev CHF 22.90; across three CHF groups CHF 91.10. The separate mixed-currency demo adds DOT 2.400000 from Hackathon.
- Nina owes no Zurich item because she is only invited there. Dev owes her CHF 30.00 in Geneva Day.
- Dev owes Luca EUR 18.00 in Lisbon Weekend.

A shared group count includes groups with no outstanding amount; a payment's source groups include only its concrete items. This explains why Jeanine has three shared groups but a global payment covering two.

Settle/Request resolves payer, recipient, integer amount, one currency, source item IDs, source group IDs and source version. A method shown here is a fixture suggestion, not authorization; Journey 11 must revalidate the scope and select the actual method. DOT uses the Wallet suggestion, never TWINT. No estimated conversion or multi-currency sum becomes an instruction.

Back navigation does not undo accepted changes. Group selection and return retain person, scope and search query. Refresh and demo service results are separate concepts. The demo is reset on a full reload; this is not production persistence.

## Safe member management — candidate policy for approval

Only the current group owner can request removal of another active member. They cannot remove themselves or the group owner. Ownership transfer, leaving the group, archiving and group-wide settings remain Journey 26 scope.

Removal requires no open items for that member in this group, not merely a zero net formed by cancelling unsettled items. An issue blocks only its dependent items. A balance elsewhere does not block removal from an unrelated zero-balance group.

Review → Remove from group → Saving → accepted result → updated roster. The accepted change removes access to this group only. Historical expense attribution remains; other memberships and every ledger item remain byte-for-byte unchanged.

The mock result defaults to accepted after a short delay. Unknown or failed results are selectable from Demo. Unknown → Check status stays pending/recovering until a simulated service result is supplied. Retry is offered only after verified non-acceptance and reuses the same command identity. Repeated clicks must not remove twice. A changed role, item/version or permission invalidates acceptance.

## Cross-journey boundaries

04: invitation creation and invite management. 07: expense review. 08: Group Home. 11: payment review/authorization. 13: request creation. 20: own payment-method editing. 26: ownership transfer and group lifecycle.

Boundary cards are explicitly labelled “Preview only” and return to the original context. They neither impersonate the complete adjacent journey nor claim an invitation, request, payment or setting was saved. They preview the routing contract; the final app's cross-journey integration remains to be wired.

## Recovery

Search with no matches; missing/shared preferences; member-only role; pending invitation; only-owner group; open expense issue; removal blocked; save pending/unknown/failed; stale version; access changed mid-action; offline saved roster; loading and load error.

Offline allows cached reading, but disables invite and money actions and requires reconnection for removal. A revoked group is not re-exposed by Back or a directory-return action. Other authorized shared groups remain discoverable.

## Compatibility

J09 requests are deterministically checked in the prototype model. Production role, version, scope, balance and replay checks belong on the backend, never an LLM. Successful storage acceptance is distinct from the user-readable record, using the already approved storage-neutral contract. No provider, chain or protocol is the domain authority. All identities here are synthetic fixture labels.

## Visual inheritance and deferred work

The entire first stylesheet is inherited byte-for-byte from approved Journey 01/Journey 12. J09 additions are component-scoped. The established card radii, colors, type scale, icon strokes, header and anchored footer remain. TYPO-01 shared typography/readability is explicitly deferred; no approved typography was changed.

## Review decisions

Does the group roster feel useful without duplicating the balance screen? Are roles and pending invitations clear? Is a shared preference enough before entering settlement? Is the conservative group-specific removal rule right? Does each boundary preserve the exact person, currency, amount and group context?

<!-- JOURNEY_DECISION_HISTORY:START -->
## Decision history

**Coverage:** Selected source-supported decisions, backfilled 2026-09-06 from commit `f403b02d05a50d13f556b3edfb949f92b24488a9`. Not a complete conversation or alternatives audit. Earlier candidate labels in the spec body describe its drafting stage; the registry/approval sources below establish the recorded status. Revisit triggers below are maintenance notes added now, not claims about past discussion or permission to redesign.

### J09-D01 — Group-specific, owner-only removal

**Decision:** Only the current group owner may remove another active member with no open items in that group. Preserve past attribution, every ledger item and other memberships. Roles and payment preferences retain their scope.

**Why:** The recorded implementation separates access changes from the payment ledger. Its continuity examples explicitly retain balances in other groups.

**Alternatives:** A zero net made from cancelling unsettled items is explicitly insufficient. Financial rankings, trust scores and contact uploads are excluded; ownership transfer/leave/archive belong elsewhere.

**Tradeoffs:** Removing access is not debt forgiveness. Unknown saves require recovery, and retry follows verified non-acceptance. Adjacent journeys are labelled boundary previews, not completed integrations.

**Revisit when:** Removal loses records, changes another membership or bypasses open-item checks; broader role/lifecycle work is explicitly approved for review.

**Approval / version:** v1 — Golden #12 / design-approved, as recorded at the source commit. This documentation update does not create or expand approval. TYPO-01 shared typography/readability remains deferred.

**Sources:** [Spec: safe member management  candidate policy for approval](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/09-manage-people/spec.md#safe-member-management--candidate-policy-for-approval); [Spec: exact balances and continuity](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/09-manage-people/spec.md#exact-balances-and-continuity); [Spec: cross journey boundaries](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/09-manage-people/spec.md#cross-journey-boundaries); [version and approval registry](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/registry/journeys.json). [Explicit approval](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/registry/approvals/09-v1.json).
<!-- JOURNEY_DECISION_HISTORY:END -->
