# J01 repair registration alongside Product Schema V1

The three J01 Surface Clarity repairs are now explicitly traced to the frozen schema, source decisions and existing verification evidence. This record adds the missing finding → affected surface → operation/context → applicable obligation → repair → test/review links. It does not revise Product Schema V1 or accept the repairs.

Record ID: `J01-SCHEMA-TRACE-2026-10-11`. Date: 2026-10-11.

Read [change-record.json](change-record.json) for reusable IDs, exact snapshots and version pins, and [validation.json](validation.json) for the reference checks performed when registering this record.

## What is registered

| Finding | Repair | Frozen contract connection | Evidence scope |
| --- | --- | --- | --- |
| SC-J01-001 — hidden simulation instructions | Visible prototype code and wallet outcome controls; truthful disclosure of external capabilities | `J01/code/action/continue@none` → `session.enter`; `ctx.entry`; LAW-OP-03; J01-D02. Existing handoff and review-demo controls remain distinguished from actual provider execution. | Visible code assertions; J01-R14/R15/R21 at both canonical widths; separate read-only repair review |
| SC-J01-002 — Back returns to older welcome | Return to the actual front-door, guest boundary or membership owner; preserve local work | `ctx.entry` preserves destination/invite identity; `session.enter` does not join/pay; Participant preservation under `participant.link_account` / LAW-ID-01; J01-D01 and selected Gate A front-door decision | J01-R04/R05/R12/R20/R22 at both widths; account-link-specific Back is source-inspected only |
| SC-J01-003 — reload loses entry intent | Retain safe intent, explain restart, create fresh verification epoch and reject old proof | `ctx.entry` and `session.enter`; LAW-OP-03; J01-D01/D02. Intent is preserved separately from verification and membership consent. | J01-R07/R08/R10/R12/R13/R19/R21/R23 at both widths; same-tab reload only |

The exact test IDs, 22 referenced V1 piece records and applicability explanations are in the JSON. These product/authority laws are distinct from Surface Clarity's UX checks: truth, recovery, orientation and continuity. Neither layer substitutes for the other.

## Exact versions

| Record | Commit | Tree |
| --- | --- | --- |
| Immutable Product Schema V1, tag `product-schema-v1` | `5107e64b1b2a0cb0eddd34f8235dfd6ae1d54013` | `ce5b82d008dfa2f48e714607e30fdb6839b8305c` |
| Frozen Golden/C1 authority | `4ba456e6595330e4ca8e21366e0d827f17e10881` | `cb424dafedff066fed433e106eb4468bec985d98` |
| Repaired prototype and portable evidence | `4b29bfac000f3c7639cbfde8de081fc06ba13afe` | `1d1f4c8f07ca9c198a425c172146e2bd32322f4c` |
| Delivery / parent of this documentation record | `902d3c1ab1ae54573540b650bced48062be0f2f1` | `5527d772c3418b3b63fb753e10a09a3b368f69ab` |

The schema is read from its own frozen commit, not assumed to exist at this prototype branch's root. The Git commit containing this record identifies the registration version; it is deliberately not embedded as a self-referential hash.

The selected front-door decision file is present in accepted Gate A at `8548313791e4ef7b436ee742cd18c1fa48d74eeb`. Its historical “Gate A remains unaccepted” header is retained as written; this trace record neither rewrites past evidence nor issues a new acceptance.

## What the mapping does and does not mean

The frozen schema already accounts for J01 states, sign-in and account-link operations, context preservation and their approved sources. It also identifies some exact controls, including the code Continue binding `CTRL-J01-SESSION-VERIFY`.

Several integrated prototype wrapper elements have no exact V1 reconstruction piece ID: the affected header Back interception, account boundary/return routing, restart annotation and newly visible simulation buttons. Their source locators are recorded with `frozen_piece_id: null`. Nearby frozen controls are trace anchors; they are not falsely presented as IDs for the new controls.

Some referenced pieces have empty `schema_refs`. They remain authority-accounted states, fields or navigation/handoff controls. Copying their references here does not create an executable binding. Existing recovery pieces retain their full V1 law lists, but only the obligations actually used are explained per finding.

Frozen V1 has **no certified J01 task path**. This record retains that limitation and does not invent a certification. The repairs implement existing approved preservation/provenance rules and improve prototype disclosure; no new product contract decision is proposed.

## Review and execution evidence

- [Separate read-only review receipt](https://github.com/ChopDotHQ/ChopDot/blob/902d3c1ab1ae54573540b650bced48062be0f2f1/product/surface-clarity/evidence/J01-REV-001/old-independent-de9ced5/REVIEW-RECEIPT.md): reviewed `de9ced5d281ec906f8cd3056164f864528ca7573`. Supports the three bounded repairs in the exercised scope; original runner had 372 passes and one missing-favicon failure. It is not a review of the later fixture correction or this record.
- [Owner retest receipt](https://github.com/ChopDotHQ/ChopDot/blob/902d3c1ab1ae54573540b650bced48062be0f2f1/product/surface-clarity/evidence/J01-REV-001/receipt.json): tested `2cb499e5fa196de87c26d8d72ce2e5162af4b0d6`; 373 browser checks, 213 model checks and 18 framework tests; runner exit 0. The cited app/surface/browser-test blobs match the delivered `4b29bfac` source.
- [J01 case results](https://github.com/ChopDotHQ/ChopDot/blob/902d3c1ab1ae54573540b650bced48062be0f2f1/product/surface-clarity/evidence/J01-REV-001/new-owner-2cb499e5/j01/results.json): 53 checks across 393×852 and 430×890.
- [Runnable review package and launch instructions](https://github.com/ChopDotHQ/ChopDot/blob/902d3c1ab1ae54573540b650bced48062be0f2f1/product/surface-clarity/evidence/J01-REV-001/review-prototype-4b29bfac/README.md): exact `4b29bfac` runtime, local Python launch and screenshots.
- [Frozen V1 usage guide](https://github.com/ChopDotHQ/ChopDot/blob/5107e64b1b2a0cb0eddd34f8235dfd6ae1d54013/product-schema/V1_USAGE_GUIDE.md): explains the same distinctions between semantic binding, authority accounting and certified task paths.

J01-REV-001 is separately classified as test infrastructure: serving an empty HTTP 204 for the local favicon request while retaining browser-health assertions. It is not mapped to a product-schema control.

This registration performed reference validation against immutable Git objects and existing results. No fresh browser run, full schema-chain run or hosted pipeline run is claimed for the documentation-only change. The frozen tag, approved source tree, runtime and historical readiness records are preserved.

## Retained limits and status

The historical clarity checker remains INCOMPLETE because its exact runtime/evidence bindings are stale; `findings.json` and `journeys/J01.json` were not rebound or reset. This new record does not claim a passing current clarity gate, close all findings or accept J01 for the user.

New-tab/full-session restoration, a dedicated account-link Back interaction, comprehensive accessibility, pixel Golden certification and human comprehension remain unverified. Completed-conversion reload retains local business work/accountCreated but does not restore a current verified session. The independent review also retained weaker simulation disclosure in declined/expired wallet copy.

The previously diagnosed hosted CI failure at `4b29bfac` is separate: Vitest discovers `scripts/surface-clarity.test.mjs`, which uses `node:test`, and reports “No test suite found.” This record does not fix that failure or claim hosted CI clearance. The hosted preview still uses an earlier runtime; use the pinned downloadable package to review these repairs.

Other 27 journeys and other finding families are outside this registration.

For a future bounded repair, preserve the same trace: exact finding and source version, actual piece IDs or explicit missing IDs, operation/context and applicable obligations, changed runtime files, exact-version evidence, and honest acceptance/verification status. A genuinely new contract rule requires a separate proposed schema revision; the V1 tag remains immutable.
