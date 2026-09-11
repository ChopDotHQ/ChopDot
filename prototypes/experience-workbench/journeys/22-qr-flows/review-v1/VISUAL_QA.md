# Journey 22 — QR Flows V1 Canonical QA Evidence

Status: **exact reviewed synthetic-prototype evidence for the explicitly approved Golden freeze**. This file records provenance; it does not claim live camera, backend, payment, wallet, group-join, or receiving-detail execution. Golden #22 is valid only after the full resulting-state Prototype workbench gate passes.

## Exact approved evidence binding

- Evidence head: `a1f60b0255e3f72054e0bf500b5cb559c213679d`
- Candidate branch: `ux/experience-workbench-j22-v1-candidate`
- Candidate HTML path: `journeys/22-qr-flows/v1-candidate.html`
- Candidate Git blob: `dc9c789bfdb157b50ff573a059e3bf4b8ab4ed07`
- Candidate HTML SHA-256: `3bbab5328a71d42866006c6f48088c06759fd0a3a922ee4a91e6fcd7bb75fe23`
- Exact Journey 22 QA run: `34625659266` — success
- Evidence artifact: `10273727742`
- Evidence artifact SHA-256: `787eafecec922b415c417be8fce6a42956b0a6271b760555fb67ed2436ed1760`
- CI: `34625659287` — success
- Coverage: `34625659274` — success
- Smoke: `34625659271` — success
- E2E Cypress: `34625659262` — success

## Reviewed evidence

Dedicated QA reports `COMPLETE_CANDIDATE_QA_PASSED`: 39 registered states, 45 rendered states/boundaries, 90 screenshots across 393×852 and 430×890, 56/56 clicked-path observations passed, 0 browser errors, 0 console errors, and 0 external requests. Independent review in issue #38 comment `5638120649` classified this exact candidate `GOLDEN-READY` with no remaining blockers.

Human approval is issue #38 comment `5639819516`. Approval applies only to the exact candidate bytes and SHA-256 above. It does not authorize post-approval HTML/product mutation, protected-branch merge, production deployment, Products Devnet deployment, or financial activity.

## Evidence limits

- Standalone synthetic prototype; no real camera, resolver, authentication, backend write, group join, receiving-detail disclosure, payment, wallet connection, or external application is used.
- Displayed demo codes bind only inert `example.invalid` references; they are not provider payment QRs and cannot move money or grant access.
- Boundary states identify J04/J09/J11/J14 ownership but do not copy or claim completion of approved adjacent Golden experiences.
- Mechanical/browser evidence alone is not independent UX approval; the independent review and explicit human approval above provide those separate gates.

## Approved Journey 22 authority boundary

- QR transport may read, resolve, or render typed opaque references; it does not itself join groups, pay, disclose raw receiving details, store a receiving destination, or grant wallet authority.
- Person, invite, receiving-share, and settlement handoffs remain owned and revalidated by their domain journeys.
- A settlement QR never substitutes recipient, amount, currency, source, destination, asset, or network to make a scanned code fit.
- Malformed, unsupported, external, and sensitive payloads remain inert and do not become executable actions.
- Cancellation, retry, duplicate reads, offline state, and owner returns affect QR transport state only; they do not manufacture domain success or failure.

TYPO-01 remains deferred.
