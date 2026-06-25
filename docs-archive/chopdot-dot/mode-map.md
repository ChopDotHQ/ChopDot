# ChopDot.dot Mode Map

## Shared Domain Objects

`ChopDot.dot` treats these as shared objects across modes:

| Object | Purpose |
| --- | --- |
| `Chapter` | One bounded group-money context. |
| `PolicyVersion` | The rules people accepted for the chapter or round. |
| `Participant` | A person or group actor with scoped roles. |
| `Role` | Authority to act: organizer, treasurer, approver, contributor, receiver, viewer. |
| `Obligation` | Something someone is expected to pay, contribute, confirm, or resolve. |
| `ContributionClaim` | A claim that contribution/payment happened outside ChopDot or through an optional rail. |
| `PaymentClaim` | A claim tied to a payment/release leg. |
| `ApprovalRequest` | A request for release/readiness approval. |
| `ApprovalDecision` | Approve, deny, or needs-review decision by an authorized actor. |
| `ReleaseRequest` | A proposed outgoing release/spend/payout. |
| `Confirmation` | Receiver/treasurer/authorized party confirmation. |
| `Dispute` | A contested claim, rule, amount, or release. |
| `ExceptionNote` | An intentional policy exception or unresolved annotation. |
| `CloseoutSnapshot` | Deterministic chapter state at close. |
| `Receipt` | Redacted or full closeout record. |

## Invariant

```text
claim != confirmation != approval != release != closed
```

This is the core product safety rule. A rail adapter can observe a transaction, but only the kernel can close a chapter after policy passes or unresolved items are explicitly annotated.

## Mode Differences

| Mode | Catch | Show | Move | End |
| --- | --- | --- | --- | --- |
| `event_deposit` | Invites, rules, deposit obligation, payment claim. | Committed, claimed, confirmed, blocked. | Payer claims, receiver confirms, organizer records exception. | Event/session closeout receipt. |
| `shared_expense` | Expenses, splits, payment claims. | Open legs, claimed legs, confirmed legs. | Claim paid, confirm receipt, close. | Trip/month/simple split receipt. |
| `savings_circle` | Members, round, contribution expectation, payout order. | Round status, unpaid contributions, payout recipient. | Claim contribution, treasurer confirms, annotate misses. | Private round receipt. |
| `emergency_pot` | Privacy level, target, approval rule, contribution claim. | Target progress, private blockers, release readiness. | Approve release, claim contribution/release, confirm receipt. | Redacted receipt by default. |
| `community_fund` | Members, roles, categories, contribution expectations. | Fund period, approvals, release requests, unresolved items. | Approve/deny release, record payment claim, confirm. | Handoff receipt for next treasurer/reviewer. |

## Promotion Rules

Each mode is allowed into user-facing work only when it has:

- a clear user job
- a conservative copy model
- privacy defaults
- authority model
- closeout blockers
- focused tests
- explicit non-custody wording
