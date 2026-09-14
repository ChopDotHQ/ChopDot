# Journey 23 — Import Data / Group V1 Canonical QA Evidence

Status: **exact reviewed synthetic-prototype evidence for the explicitly approved Golden freeze**. This file records provenance; it does not claim a production file picker/parser/provider, remote fetch, migration, database write, authenticity verification, payment execution, wallet signing, receiving-detail publication, invitation, export, recovery implementation, or external finality. Golden #23 is valid only after the full resulting-state Prototype workbench gate passes.

## Exact approved evidence binding

- Evidence head: `bbafa198f28f19e4b7b668474ed2a9fdac28451f`
- Candidate branch: `ux/experience-workbench-j23-v1-candidate`
- Definition head: `c072728234b2f475cf90c0a8846f6e2e355fa9a3`
- Candidate HTML path: `journeys/23-import/v1-candidate.html`
- Candidate Git blob: `0f84a832dc0b3b42da82bbe2b6dad0d3f0d3d862`
- Candidate HTML SHA-256: `3a6f88274ff59bd7d513d5bbcee57a235465f1d33345df37a0b84ed51a2f6f9d`
- Exact Journey 23 QA run: `34799157705` — success
- Evidence artifact: `10330638400`
- Evidence artifact SHA-256: `06aae3111d5f9f37c19d3c176067f0450e8b30c6863ba4c2d2c7b03f967c2baf`
- CI: `34799157704` — success
- Coverage: `34799157714` — success
- Smoke: `34799157725` — success
- E2E Cypress: `34799157718` — success

## Reviewed evidence

Dedicated QA reports the complete registered J23 V1 surface: 39 registered states plus three owner-boundary renders, 118 exact PNGs across 393×852 and 430×890, 150/150 interaction checks, and zero deterministic/browser/console/external-request failures. Independent review in issue #38 comment `5658531776` directly inspected the exact artifact at both canonical viewports, cleared all five required review lenses, and classified this exact candidate `GOLDEN-READY` with no blocking findings.

Human approval is issue #38 comment `5661163397`. Approval applies only to the exact candidate bytes and SHA-256 above. It does not authorize post-approval HTML/product mutation, protected-branch merge, production deployment, Products Devnet deployment, or financial activity.

## Approved Journey 23 authority boundary

- Source selection, inspection, and preview are read-only until explicit `Import group` confirmation.
- V1 creates one new group per import and never silently merges into an existing group.
- Exact prior-import duplicates reconcile to the existing imported group; similar groups may warn but never auto-merge.
- Ambiguous people are never name-only auto-linked, and ambiguous money/currency semantics are never silently guessed or converted.
- Imported payment-, settlement-, or wallet-looking records remain historical data and carry no execution, sharing, receiving-detail, signing, or payment authority.
- Unknown or partial commit outcomes reconcile before retry; a fresh write is offered only after the prototype establishes that no committed import exists.
- J08 owns established Group Home, J24 owns portability/export, and J28 owns broader recovery beyond J23-specific reconciliation.
- Prototype commit/result/reconciliation states remain deterministic fixtures, not proof of production persistence or external finality.

TYPO-01 remains deferred.
