# Sequential Batch 1–6 release gate harness

Date: 2026-08-12

Programme: local delivery and real-host proof tracked as separate lanes

Current evidence verdict: **B1 LOCAL PASS; B2 LOCAL PASS; both live lanes BLOCKED**

## Operator sequence

The harness uses the six batches authorized by the operator. Gate 0 identity,
access, credential, and recovery controls are embedded in the batches that need
them; they are not shown as an extra batch.

```text
B1 Existing-contact invitation
  -> B2 Link, QR, and limited no-app entry
  -> B3 Beyond-window recovery
  -> B4 Full loop and capability inheritance
  -> B5 UX and spending-group cards
  -> B6 Freeze, prove, and separately approve release
```

[`batch-gates.json`](./batch-gates.json) is the machine-readable schema.
[`run-batch-gates.mjs`](./run-batch-gates.mjs) evaluates fresh receipts and
enforces predecessor promotion. It never runs the declared commands itself and
cannot deploy, publish, allocate resources, sign, or send messages.

## Two independent verdict lanes

Every batch has a local verdict and a real-host verdict:

| Lane | `PASS` | `PARTIAL` | `BLOCKED` |
| --- | --- | --- | --- |
| Local | Every local authority, UI, simulator, and command criterion has fresh hashed evidence for that batch's source snapshot and the stable delivery train. | The predecessor passed locally, but this batch is incomplete or has no valid receipt. | The predecessor has not passed locally. |
| Live | The batch passed locally and every real-host control/command has fresh evidence from a verified live environment. | Not used; live claims fail closed. | Local batch incomplete, or real-host evidence/dependency is incomplete. B6 is also blocked without explicit action-time approval. |

This means B1 can be `LOCAL PASS / LIVE BLOCKED`. That local pass unlocks B2
for local execution; it does not claim that chat/contact delivery works in the
real Desktop host.

## Evidence contract

A promotion receipt is `receipts/B<N>.json` with `schemaVersion: 2`. It must name:

- one stable `deliveryTrainId` shared by the B1–B6 delivery train;
- one source snapshot: candidate ID, commit, tree, lockfile SHA-256, and snapshot time;
- every control with `lane`, `status`, and one or more evidence files;
- every exact command with `lane`, exact command text, exit code, and evidence;
- whether the live environment was actually verified;
- for B6 live only, whether action-time release approval exists.

Accepted evidence is a regular in-pack file under exactly one of:

```text
test-results/<candidate-id>/
screenshots/<candidate-id>/
artifact/<candidate-id>/
```

The evaluator recomputes SHA-256, rejects symlinks/path escape, and rejects
evidence captured before the run. Historic proof remains characterization and
cannot satisfy a fresh control. B1–B5 may use newer source snapshots as work is
implemented, but every passing promotion receipt must retain the same
`deliveryTrainId`. A receipt from another delivery train cannot inherit an
earlier pass.

B6 is the freeze boundary. Its promotion receipt additionally requires a clean
source tree and valid build aggregate SHA-256. It cannot pass merely by
combining evidence from the evolving B1–B5 snapshots. After the final source is
frozen, every B1–B6 local gate must be rerun on that exact final candidate
fingerprint. Those receipts live at:

```text
receipts/final/<final-candidate-id>/B1.json
...
receipts/final/<final-candidate-id>/B6.json
```

Each final rerun must use `proofPurpose: "final-candidate-rerun"`, the same
`deliveryTrainId`, the exact final candidate ID/commit/tree/lockfile fingerprint,
a clean-candidate assertion, complete local controls and commands, and fresh
hashed evidence. Missing, cross-train, stale, incomplete, or mismatched reruns
make B6 `LOCAL PARTIAL`. This final-candidate rerun rule preserves the freedom
to build between batches without allowing historical passes to certify a
different release artifact.

## Exact gate matrix

| Batch | Local PASS criteria | Live PASS criteria | Promotion command set |
| --- | --- | --- | --- |
| B1 — Existing contact | Stable Product Account identity; host-held signing boundary; trusted contact/account binding; organizer-signed invite into one selected room; pending is not membership; visible accept/decline; invitee-signed decision; recipient-protected grant; wrong actor/account/tamper/replay rejection; durable delivery; isolated-host simulation. | Real contact lookup, real chat custom-message delivery, and two isolated Product Accounts. | Membership foundation; trusted-contact coordinator; `membership-invitation-ui.spec.ts` under host-sim; `groupKeyHandoff.test.ts`; separate live-contact command. |
| B2 — Link/QR/no-app | Link, QR, and limited no-app entry use one membership model; transport never grants authority; the legacy `joinGroup` snapshot/auto-apply path is retired; consent is explicit; forwarded/wrong-person, expiry/revocation/replay, secret/history leakage, money-state assertions, duplicates, plain language, and mixed isolated UI pass. | Exact public routes and mixed live delivery pass. | Full membership regression; recipient-bound bootstrap domain tests; limited action + link + service domain tests; payer-request link regression; preview UI characterization only; actual-router retirement; `candidate-batch2-actual-participation.spec.ts`; `candidate-batch2-limited-actual-route.spec.ts`; separate public live command. |
| B3 — Recovery | Foundation M0 exact money/conservation/currency/event/concurrency/correction/migration/privacy/capacity/non-custody controls; then account-bound key recovery/rotation, checkpoint v1 authority and validation, persistence/replay/compaction, replaceable archive, durable locator discovery, >300-second restoration, inbox/outbox, immutable close, and plain language pass. | Real host entropy, durable locator, and >300-second live recovery pass. | Money-foundation characterization/migration/convergence; recovery, fresh-device UI, and secret-boundary commands; separate live recovery command. |
| B4 — Full loop/inheritance | Catch → Management → Payout → History, main-app capability inheritance, One Chop authority, money-state and payment-instrument separation, mixed three-person reconnect, and immutable close pass. | Exact live full loop and payment reference pass. | Authority suite, full-loop UI, inheritance verifier; separate live loop command. |
| B5 — UX/cards | One action, honest preview, comprehension, lifecycle-faithful cards, real journey, invisible infrastructure, responsive/a11y/hard states, and screenshot review pass. | Exact live entry and real device viewports pass. | Visual, accessibility, and comprehension commands; separate live visual command. |
| B6 — Freeze/prove | Complete IAC matrix, clean frozen source, build identity, static/build, authority/host/adversarial/payload/security/visual evidence, complete index, and `candidate-ready-local` pass. | Desktop readiness, allowance, three live accounts, >300-second live convergence, exact public URL, and explicit action-time approval pass. | Clean/static/host/artifact commands; separate readiness/live/public verification commands. No deploy command is included. |

The exact control IDs and command strings are in `batch-gates.json`; this table
is the operator-readable view.

## Harness verification

```bash
cd /Users/devinsonpena/ChopDot/.worktrees/portable-shell-trial

# Verify schema, lane separation, evidence freshness, predecessor locking,
# same-train source evolution, cross-train rejection, final-fingerprint reruns,
# B1 local-pass/live-block behavior, and B6 approval gating.
node --test tests/candidate-batch-gate-harness.test.mjs

# Read current state without treating the expected block as a process failure.
node proof/chopdot-candidate-2026-08-12/run-batch-gates.mjs \
  --through B2 --mode audit

# CI promotion gate: exits non-zero until the requested local batch passes.
node proof/chopdot-candidate-2026-08-12/run-batch-gates.mjs \
  --through B1 --mode enforce
```

## Current result

The preserved schema-v2 B1 receipt and the fresh schema-v2 B2 receipt pass their
local lanes. Both live lanes remain independently blocked. The honest current
evaluator result is:

```text
B1  LOCAL PASS     LIVE BLOCKED  12/12 local controls; no real-host proof
B2  LOCAL PASS     LIVE BLOCKED  14/14 local controls; no real-host proof
```

The B2 evidence index is
[`test-results/b2-2026-08-13T074800Z/B2-EVIDENCE.md`](./test-results/b2-2026-08-13T074800Z/B2-EVIDENCE.md),
and the machine-checked receipt is [`receipts/B2.json`](./receipts/B2.json).
Local promotion unlocks Batch 3; it does not certify public routes, live chat
delivery, or real Desktop accounts.

Batch 3 begins with Foundation Gate M0. This preserves the existing six-batch
sequence and the earned B1/B2 receipts while making it impossible for a new B3
receipt to pass by checkpointing the current floating-point/unversioned money
projection. M0 is specified in
`../../../../docs/superpowers/specs/2026-08-13-core-money-and-event-contract-v1.md`.

## Documentation impact

This is proof infrastructure only. It changes no product behavior, architecture,
roadmap, provider, deployment, or release state. No wiki or ADR update is
required. A future gate promotion must update source truth only after its fresh
evidence packet is reviewed.
