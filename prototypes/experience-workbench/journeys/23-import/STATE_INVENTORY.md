# Journey 23 — Import Data / Group V1 State Inventory

Status: **definition-stage / unapproved**. Minimum V1 candidate surface; this does not approve a production parser, provider, file format or migration implementation.

## Entry and source selection

- **J23-S01 — Import entry / You:** explain that one group-history package can be reviewed before import. Primary: `Choose import package`.
- **J23-S02 — Import entry / group list:** same job from the group-list entry; entering does not modify an existing group.
- **J23-S03 — Source picker boundary:** the platform picker is open; no product write.
- **J23-S04 — Source picker cancelled:** return with no side effect.
- **J23-S05 — Source selected:** show only enough metadata to identify the selected package, then inspect it.
- **J23-S06 — Source unavailable:** the selected source cannot be read; choose another source. No product write.

## Inspecting and validation

- **J23-S07 — Inspecting:** parsing/validation is in progress; do not imply data is imported.
- **J23-S08 — Valid package:** inspection completed and may proceed to preview.
- **J23-S09 — Unsupported package:** this V1 flow cannot interpret the package; choose another source or leave.
- **J23-S10 — Malformed/unreadable:** damaged or invalid source; stop before write and do not display unsafe/raw source content.
- **J23-S11 — Empty:** no importable group/history found; no import action.
- **J23-S12 — Oversized/unsafe to inspect:** stop before write and explain that this package cannot be safely processed here.
- **J23-S13 — Partially readable:** preview only when omitted data is explicit and does not make financial truth ambiguous; otherwise block.
- **J23-S14 — Provenance unknown:** parsing success is not verification; show a subordinate trust note without claiming authenticity.
- **J23-S15 — Offline before inspection completes:** preserve selection context when safe and offer retry/choose another source without claiming validation.

## Preview and review

- **J23-S16 — Clean preview:** summarize group identity, detected people, history/record counts, currencies and warnings. No product write yet.
- **J23-S17 — Preview detail:** inspect detected categories and warnings without exposing unnecessary raw source data.
- **J23-S18 — Exact prior-import duplicate:** do not create another group. Primary: `Open group`; secondary: choose another source.
- **J23-S19 — Similar existing group warning:** similarity is not identity. User may explicitly continue as a separate new group or cancel; no merge.
- **J23-S20 — Identity matches clean:** deterministic matches may be shown as resolved; never link from display-name similarity alone.
- **J23-S21 — Ambiguous person:** require explicit `Link existing` or `Keep separate` choice when the mapping changes identity.
- **J23-S22 — Own-identity ambiguity:** require explicit confirmation when the source cannot deterministically establish which imported member represents the current user.
- **J23-S23 — Currency/amount conflict:** block confirmation for unsupported or ambiguous monetary semantics; no silent conversion.
- **J23-S24 — Unsupported record category:** explain what cannot import. If omission changes balances or financial meaning, block; otherwise require explicit acknowledgement.
- **J23-S25 — Ready to confirm:** all blockers resolved; final summary plus one clear `Import group` action.

## Confirmation and commit

- **J23-S26 — Import confirmation:** final explicit boundary before the first product write; existing groups will not be merged.
- **J23-S27 — Importing:** commit may be underway; show progress and no second import/retry action.
- **J23-S28 — Taking longer:** preserve intent and say the outcome is not known yet; slowness is not a failure result.
- **J23-S29 — Leave during commit:** leaving does not necessarily cancel an import already underway; never promise cancellation after a write may have begun.
- **J23-S30 — Offline/interrupted during possible commit:** outcome may be unknown; reconcile before any second write.

## Result and recovery

- **J23-S31 — Import succeeded:** explicit success with imported group identity. Primary: `Open group` → J08.
- **J23-S32 — Known failure before write:** existing ChopDot data remains unchanged; allow source correction/selection or retry inspection.
- **J23-S33 — Known commit failure with established rollback:** only claim rollback when it is proven; retry reuses the same logical import attempt.
- **J23-S34 — Unknown/partial outcome:** claim neither success nor failure; explain that ChopDot must check what was saved before retry.
- **J23-S35 — Reconciling prior attempt:** determine whether the imported group/attempt already exists; no duplicate write.
- **J23-S36 — Reconciled / import already exists:** primary `Open group`; do not import again.
- **J23-S37 — Reconciled / safe to retry:** retry the same logical attempt only after proving no committed duplicate exists.
- **J23-S38 — Reconciliation unavailable:** preserve context and hand off to J28 recovery rather than guessing.
- **J23-S39 — Cancelled before confirmation:** no product write occurred; return to source/entry.

## Owner-boundary renders

- **J23-B01 → J08 Group Home:** open only after success/reconciliation establishes the imported group exists.
- **J23-B02 → J24 Export / Portability:** optional portability/help boundary; J23 does not define export formats or storage destinations.
- **J23-B03 → J28 Things Go Wrong / Recovery:** shared recovery boundary when J23 cannot safely establish an outcome.

## Invariants

- Source selection, inspection and preview never write product data.
- V1 never merges into an existing group.
- Import never initiates settlement/payment, wallet signing, private payment-detail sharing or member invitation.
- Ambiguous identity and monetary truth are never silently guessed.
- A possible-commit retry cannot start a second logical import until reconciliation proves it is safe.
- Exact duplicates open the existing imported group instead of duplicating it.
- Parser success, import success and source authenticity are distinct claims.
- `TYPO-01` remains centrally deferred.
