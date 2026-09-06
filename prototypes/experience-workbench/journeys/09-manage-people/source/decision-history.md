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
