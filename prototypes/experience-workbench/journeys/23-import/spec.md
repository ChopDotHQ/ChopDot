# Journey 23 — Import Data / Group V1

Status: **definition stage / unapproved** after Journey 22 Golden freeze. Prototype not built yet.

## Goal

Bring one existing group and its history into ChopDot safely, with a truthful preview before anything is written.

## Entry

- You → Import
- Group list → Import

## Exit

- Imported group → Journey 08 Group Home
- Portability/export guidance boundary → Journey 24
- Recovery boundary when outcome cannot be established safely → Journey 28

## V1 product contract

Journey 23 owns **import intake, validation, preview, conflict review, explicit confirmation, commit progress, result and import-specific recovery**. It does not own the downstream group experience or a general backup/restore system.

V1 is deliberately bounded:

- Import **one group package at a time**. Bulk multi-group import and continuous sync are out of scope.
- Treat the selected source as untrusted until it has been parsed and validated. Selecting a file/package never writes product data by itself.
- Show a human-readable preview before commit: group identity, detected people, record/history counts, currencies and any warnings/conflicts material to the decision.
- Require an explicit **Import group** confirmation before the first product write.
- Import into a **new group**. V1 does not merge history into an existing group.
- Detect exact prior-import duplicates before writing. The same package/retry must not create a second group.
- Similar existing groups are warnings, not proof of identity. Do not merge them automatically; a user may explicitly continue as a separate imported group after reviewing the warning.
- Never silently link imported people to existing ChopDot people from display-name similarity alone. Ambiguous identity matches require explicit review; unresolved people remain distinct rather than being guessed together.
- Preserve source monetary truth. Do not invent exchange rates, convert ambiguous values, or silently rewrite unsupported/unknown currency information.
- Imported history is historical data only. Import does not create payment authority, initiate settlement, connect/sign with a wallet, expose payment destinations, invite people, or claim external verification/finality.
- A prototype fixture may demonstrate a package, but that fixture does **not** authorize a production file format, provider integration, parser, network fetch, or live migration claim.

## Source and trust rules

- V1 UX is source-format neutral: the user chooses an import package and ChopDot reports whether it can be read. Provider-specific import flows require a later explicit decision.
- Show only the source metadata needed to make the import decision; never render source HTML/scripts or expose unrelated/raw payload content in the customer flow.
- Parsing/validation happens before commit. Malformed, unsupported, unsafe, empty or materially incomplete input stops before write.
- A package with unknown provenance may still be reviewable, but the UI must not describe it as verified/authentic merely because it parsed successfully.

## Import lifecycle

1. **Choose source** — user selects a package or cancels without side effects.
2. **Inspect** — ChopDot parses and validates without writing product state.
3. **Preview** — show what would be imported and what needs attention.
4. **Resolve blocking conflicts** — duplicate, identity, currency or unsupported-record issues must be understood before confirmation.
5. **Confirm** — one explicit action starts the import write.
6. **Commit** — show progress without implying completion early.
7. **Result** — success opens the imported group; known pre-write failure keeps existing data unchanged; uncertain/partial outcomes enter reconciliation before retry.

## Duplicate and conflict behavior

### Exact prior import

If the same import package/attempt is already committed, do not import it again. Show the existing imported group and offer **Open group**.

### Similar group

If name/currency/member patterns resemble an existing group but identity is not exact, explain the similarity and require an explicit choice to continue as a separate new group or cancel. V1 does not merge.

### People

Exact stable identity evidence may be presented as a match; name-only or otherwise ambiguous matches are never auto-linked. Ambiguous mappings must be reviewed explicitly or kept separate.

### Currency / amount truth

Preserve source currency and amount semantics. Unsupported or ambiguous currency/amount data is blocking; no silent conversion or inferred replacement is allowed.

## Cancellation, offline and recovery

- Cancelling before confirmation has no import side effect.
- Offline/unavailable before commit keeps the validated preview when safe and explains what can be retried.
- Once commit begins, leaving the screen must not be described as cancelling a write that may already be underway.
- If commit outcome is unknown or partial, do not offer a blind second import. Reconcile whether the group exists and what was committed before retrying.
- Retry/recovery must preserve one logical import attempt so repeated actions cannot duplicate the group/history.
- Import-specific recovery stays in J23; general cross-journey recovery patterns hand off to Journey 28.

## Adjacent ownership

- **Journey 08 — Group Home:** owns the imported group once import success is established. J23 may preview the destination but does not redesign Group Home.
- **Journey 24 — Export / Portability:** owns taking records out. J23 may link to that boundary but does not define J24 formats or storage behavior.
- **Journey 28 — Things Go Wrong / Recovery:** owns shared recovery patterns. J23 still defines its own duplicate/idempotency/unknown-import states before handing off.
- Existing Golden create/group/people/payment/wallet journeys keep their authority. Import cannot bypass them by treating source data as permission.

## Candidate obligations before independent review

A candidate must cover at minimum: source selection/cancel, inspecting/loading, valid preview, empty/unsupported/malformed/oversized or partial input, exact duplicate, similar-group warning, identity conflict, currency conflict, confirmation, importing, success, known failure, offline/interrupted execution, unknown/partial outcome, reconciliation and safe retry. Material states must be rendered at 393×852 and 430×890 with deterministic interaction/layout evidence and directly inspectable screenshots.

<!-- JOURNEY_DECISION_HISTORY:START -->
## Decision history

**Coverage:** Builder-proposed Journey 23 V1 definition recorded 2026-09-11 from the canonical J23 seed, shared design/review contracts and adjacent Golden ownership. These entries define an unapproved candidate contract; they do not create production format support, human approval or a Golden.

### J23-D01 — Initialize Journey 23 from the canonical registry

**Decision:** Journey 23 becomes the current definition-stage journey only after Journey 22 is checksum-locked as Golden #22.

**Why:** Preserve sequential authority and prevent import implementation from outrunning the approved Golden chain.

**Alternatives:** Starting import implementation before the J22 freeze is not authorized.

**Tradeoffs:** Definition work starts later, but authority remains auditable and deterministic.

**Revisit when:** The canonical registry is explicitly revised.

**Approval / version:** Process initialization only; J23 V1 remains unapproved.

**Sources:** [Journey registry](../../registry/journeys.json), [progress](../../registry/progress.json), [review protocol](../../REVIEW_PROTOCOL.md).

### J23-D02 — Preview before any import write

**Decision:** Source selection and parsing are read-only. A human-readable preview and explicit `Import group` confirmation are required before the first product write.

**Why:** The canonical goal says existing history must be brought in safely; the shared contract requires clear authority and honest pending/failure states.

**Alternatives:** Immediate import on file selection and write-while-parsing are rejected for V1 because they remove a meaningful review/cancel boundary.

**Tradeoffs:** Import takes an extra confirmation step, but mistakes are caught before product state changes.

**Revisit when:** A future trusted source can prove a safer equivalent confirmation model without weakening user control.

**Approval / version:** Proposed J23 V1 behavior; unapproved until independent review and explicit human approval.

**Sources:** [J23 canonical seed](../spec.md), [Design Contract — hierarchy, trust and interaction semantics](../../DESIGN_CONTRACT.md).

### J23-D03 — V1 imports one new group; it does not merge into an existing group

**Decision:** Import one group package at a time into a new group. Exact prior-import duplicates no-op to the existing imported group; merely similar groups require warning/review and are never auto-merged.

**Why:** Merge semantics can rewrite existing group history and identities. The canonical seed explicitly withholds merge, deduplication and conflict-policy authority until they are defined.

**Alternatives:** Bulk import, background sync and merge-into-existing are deferred rather than implicitly invented inside V1.

**Tradeoffs:** Users with an existing near-duplicate group may need to keep two groups until a later deliberate merge capability exists.

**Revisit when:** A separately defined merge contract can preserve provenance, identity, balances and rollback deterministically.

**Approval / version:** Proposed J23 V1 behavior; unapproved.

**Sources:** [J23 canonical seed](../spec.md), [Journey 03 group-creation Golden](../../journeys/03-create-group/spec.md), [Journey registry — J23/J24/J28 boundaries](../../registry/journeys.json).

### J23-D04 — Identity and monetary truth are never guessed

**Decision:** Ambiguous imported people are not auto-linked from name similarity, and ambiguous/unsupported currency or amount semantics are not silently converted or replaced. Conflicts must be reviewed or kept separate/blocking as appropriate.

**Why:** Importing history must not create false identity or financial truth.

**Alternatives:** Name-only auto-linking and silent currency normalization are rejected for V1.

**Tradeoffs:** Some imports need manual review, but imported records remain explainable and reversible.

**Revisit when:** Stable identity/provenance evidence or an approved currency-normalization contract provides deterministic mappings.

**Approval / version:** Proposed J23 V1 behavior; unapproved.

**Sources:** [Design Contract — trust/privacy/authority](../../DESIGN_CONTRACT.md), [Journey 08 Group Home Golden](../../journeys/08-group-home/spec.md).

### J23-D05 — Import history carries no payment, sharing or wallet authority

**Decision:** Imported payment/settlement-looking records are historical data only. Import cannot initiate settlement, connect/sign a wallet, expose receiving details, invite members or claim external verification/finality.

**Why:** Shared authority rules keep saved/history data distinct from execution, sharing and signing; import must not become a shortcut around owning journeys.

**Alternatives:** Replaying imported actions or treating imported destinations/accounts as live authority is rejected.

**Tradeoffs:** Imported history can describe what a source says happened without making those records executable or externally verified.

**Revisit when:** An owning journey explicitly defines a verified migration contract for one of those authority surfaces.

**Approval / version:** Proposed J23 V1 behavior; unapproved.

**Sources:** [Design Contract — trust/privacy/authority](../../DESIGN_CONTRACT.md), [Journey registry](../../registry/journeys.json).

### J23-D06 — Unknown or partial commit outcomes reconcile before retry

**Decision:** Known pre-write failure may retry directly; once a write may have started, an unknown/partial result must reconcile the existing import attempt before a second write is allowed.

**Why:** Blind retry can duplicate a group/history and turn recovery into a second mutation.

**Alternatives:** A generic `Try again` that always starts a fresh import is rejected after possible commit.

**Tradeoffs:** Recovery can take longer, but one logical import remains idempotent and the UI does not lie about outcome.

**Revisit when:** The storage layer guarantees an atomic, durable import transaction with a stronger proven retry contract.

**Approval / version:** Proposed J23 V1 behavior; unapproved.

**Sources:** [Design Contract — retry/recovery](../../DESIGN_CONTRACT.md), [Journey 28 registry boundary](../../registry/journeys.json).

### J23-D07 — V1 remains source-format neutral at the UX contract layer

**Decision:** The J23 UX describes a user-selected import package and validation result without claiming support for a named provider, file extension, remote fetch or production parser. Prototype fixtures are evidence of the journey only.

**Why:** The canonical seed does not approve an import format or parser, and prototype behavior must not be presented as live production capability.

**Alternatives:** Naming Splitwise/CSV/JSON/ChopDot-export support without an approved format contract is deferred.

**Tradeoffs:** The first prototype demonstrates the safety model rather than promising a broad compatibility matrix.

**Revisit when:** A specific import/export format or provider integration is explicitly specified and reviewed.

**Approval / version:** Proposed J23 V1 behavior; unapproved.

**Sources:** [J23 canonical seed](../spec.md), [Design Contract — trust and prototype truth](../../DESIGN_CONTRACT.md).
<!-- JOURNEY_DECISION_HISTORY:END -->
