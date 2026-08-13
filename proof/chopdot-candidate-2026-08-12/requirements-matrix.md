# ChopDot candidate requirements matrix

Date initialized: 2026-08-12  
Programme: A experience + B native truth, with separate evidence  
Cards: P-032 — One ChopDot recovery and convergence; P-033 — Showcase-quality ChopDot entrance; P-034 — Core Money and Event Contract v1  
Candidate verdict: **BLOCKED — no exact candidate has been frozen or proved**

## Evidence rule

This is a living index for one future candidate. Historical proof is linked only
to show what has already been characterized and what should be rerun. It cannot
turn a row green for a later candidate.

- `PASS` means a bounded law or slice passed previously. It is not a fresh
  candidate pass.
- `PARTIAL` means some of the requirement has evidence but its release condition
  is incomplete.
- `RED` means the requirement is missing, currently contradicted, or has not been
  proved.
- `BLOCKED` means an external dependency prevents the required proof.
- Every controlled row must receive new evidence produced from the same frozen
  candidate source tree and built artifact before `candidate-ready-local`.
- Never copy an old test count, screenshot, report, CAR, CID, or asset hash into
  the fresh-candidate result column.
- Never overwrite an older proof folder. Put fresh outputs under this directory
  in `test-results/`, `screenshots/`, and `artifact/`.
- Local/simulated-host evidence cannot satisfy a real Polkadot Desktop row.
- Browser tabs or contexts sharing storage cannot count as distinct people or
  devices.

## Foundation Gate M0 — canonical money and event contract

M0 is not another outcome batch. It is the prerequisite that prevents the
current machine delivery train's Batch 3 recovery from freezing floating-point
or unversioned money state into a durable checkpoint. Historical B1/B2 receipts
remain valid for their source snapshots; the final candidate must rerun every
gate on one exact fingerprint.

| Requirement | Current status | Current bounded evidence | Missing fresh candidate proof |
| --- | --- | --- | --- |
| CME-01 Exact money | RED | The payment-intent reference kernel uses integer minor units, but portable expenses/splits use JavaScript numbers. | Reject floats at the core boundary; explicit amount/currency/precision; exact serialization and overflow limits. |
| CME-02 Conservation and rounding | RED | Equal/exact split behavior exists, but no cross-engine conservation law is indexed. | For every currency, expense equals assigned shares plus explicit fees/adjustments; deterministic remainder owner; property tests. |
| CME-03 Currency isolation and FX | PARTIAL | Payment matching checks currency and historical CHF drift has tests. | No implicit conversion; explicit separately authorized FX event with source, rate provenance, rounding, and resulting amounts. |
| CME-04 Canonical event envelope | PARTIAL | Signed actor/event IDs exist. | Schema version, aggregate ID/version, causal parent or expected version, payload hash, actor/role, timestamp, and signature validated together. |
| CME-05 Deterministic concurrency | RED | Duplicate/reordered delivery is tested in selected paths. | Concurrent add/edit/paid/confirm/close/correct matrices converge or fail as explicit conflicts; no last-write-wins money mutation. |
| CME-06 Idempotency | PARTIAL | Delivery/payment paths have bounded idempotency tests. | One global semantic/event identity contract across retry, restart, migration, replay, and adapters. |
| CME-07 Lifecycle separation | PARTIAL | Requested, marked paid, received, closed, and saved are distinct in reducer/UI law. | Invalid cross-state transitions, wrong actor, stale version, and partial-write cases fail on the exact candidate. |
| CME-08 Corrections and exceptional money states | RED | Main-app concepts include adjustments/delayed/waived/disputed behavior. | Append-only correction, reversal, refund, partial, fee, waiver, and dispute events preserve original facts and exact balances. |
| CME-09 Group authority | PARTIAL | Signed membership and receiver authority are locally characterized. | Exact command/role matrix for organizer, payer, receiver, member removal, policy change, correction, and close. |
| CME-10 Immutable close and successors | PARTIAL | Repeat close/late mutation laws pass bounded reducer tests. | Concurrent close/correction plus replay/recovery/export produce one locked record; later change creates an explicit successor. |
| CME-11 Schema migration and quarantine | RED | Main app, Supabase/Prisma, and shell shapes have been inventoried. | Deterministic versioned fixtures migrate or visibly quarantine; rollback, compatibility, and no-silent-coercion proof. |
| CME-12 Privacy, export, and deletion | RED | Redaction/archive concepts exist. | Participant-readable export round-trip, minimum disclosure, device/account cleanup, shared-record retention, and lost-account behavior. |
| CME-13 Provider independence | PARTIAL | ADR 0008 and adapters state the intended boundary. | Same canonical state hash across local/Supabase/host/archive test adapters; adapter failure cannot change balances. |
| CME-14 Capacity, cost, abuse, degradation | PARTIAL | Statement notification budget found a prior 1024-byte risk. | Named payload/storage/replay/retry/cost budgets, quota/abuse tests, backpressure, and honest degraded-mode recovery. |
| CME-15 Supportability and release identity | RED | Candidate receipt harness identifies evidence snapshots. | Source/build/schema/event versions and redacted diagnostic export explain a balance change without exposing secrets. |
| CME-16 Non-custodial boundary | PARTIAL | Current product records external payment claims/confirmation rather than holding funds. | Explicit tests/docs prove no custody/balance/movement authority; adapters cannot bypass payer/receiver lifecycle authority. |

### M0 adversarial scenarios

| Scenario | Current status | Required fresh result |
| --- | --- | --- |
| M0-S1 awkward split | RED | CHF 100.00 / 3 conserves exactly with deterministic remainder and identical state hash. |
| M0-S2 duplicate/reordered delivery | PARTIAL | Every event applies at most once and all valid orders produce the same projection. |
| M0-S3 concurrent edit and payment | RED | Stale edit cannot rewrite the amount/currency under an accepted payment claim. |
| M0-S4 concurrent close and correction | RED | One explicit outcome wins by version law; no duplicate or mutable saved record. |
| M0-S5 currency mismatch/implicit FX | PARTIAL | Mismatched currency and undeclared conversion fail with zero state change. |
| M0-S6 migration | RED | Main-app and shell fixtures migrate to one canonical hash or enter quarantine. |
| M0-S7 checkpoint equivalence | RED | Full replay and checkpoint plus later events return the identical canonical state hash. |
| M0-S8 provider failure | RED | Local/Supabase/host/archive write/read failures cannot invent, lose, or partially apply money. |
| M0-S9 privacy/export/delete | RED | Authorized export round-trips; unauthorized data is absent; local deletion preserves shared immutable truth. |
| M0-S10 boundary/load | RED | Maximum supported participants/events/retries stay within declared budgets or stop with recoverable user language. |

## Gate 0 — identity, access, and credentials

| Requirement | Current status | Current bounded evidence | Missing fresh candidate proof |
| --- | --- | --- | --- |
| IAC-01 Stable person identity | PARTIAL | `../general-shared-action-delivery/REPORT.md` proves deterministic Product Account migration and collision handling locally. | Stable person binding across guest, return, invitation, recovery, and wallet changes on one candidate. |
| IAC-02 Guest-first progressive protection | PARTIAL | Guest naming and first-shared-action migration pass locally in `../general-shared-action-delivery/REPORT.md`. | Useful guest entry followed by one atomic protection step, no duplicate participant, and normal-language failure/recovery UI. |
| IAC-03 Host-held signing credentials | PARTIAL | Real host reached identity/service in `../chopdotproof02-v0.5.6-native-readiness-2026-08-11/REPORT.md`; local host signing is covered by environment tests. | Fresh signer-use evidence plus logs/storage/report scan proving no private signing material entered ChopDot. |
| IAC-04 Payment instrument separation | PARTIAL | Exact PAS payer/receiver/amount/currency/hash matching is characterized in `../../../../docs/chopdot-dot/devnet-product-code-and-journey-review-2026-08-09.md`. | Change payment wallet and prove person, membership, and role remain unchanged while future intents use the new instrument. |
| IAC-05 Member-specific group-key delivery | PARTIAL | `src/environment/accountBoundKeyEnvelope.test.ts` proves account-bound recovery wrapping. `src/membership/groupKeyHandoff.test.ts` proves a signed invitation-bound P-256 ECDH first handoff with real sr25519 verification and rejects wrong account, substituted key, wrong organizer, expiry, and tamper. | Integrate the handoff with the live host signer, signed membership events, per-member envelope persistence, and removal of the reusable plaintext group key from URLs/general state. |
| IAC-06 Invitation and no-app capabilities | PARTIAL | Scoped payer capabilities, expiry, replay checks, and public-wrapper repair have bounded tests. | Participant-bound membership invitation, accept/decline, forward/wrong-person rejection, revocation, and proof that links carry no mutable group history or permanent group key. |
| IAC-07 Revocation and rotation | RED | No release-grade member removal/key rotation proof. | Revoke future read/write access, rotate key version, keep authorized members live, preserve historical signatures. |
| IAC-08 Recovery | PARTIAL | Outbox and deferred inbox survive local provider restart; account-bound envelope survives provider recreation in deterministic unit proof. | Same-account new-device discovery/recovery of binding, wrapped keys, checkpoint, outbox, inbox, and later events; explicit lost-account social re-grant; simulated/real host entropy proof. |
| IAC-09 Session and local storage | RED | Current group secret remains in general persisted app state. | Sign-out cleanup, encrypted local projection, recoverable signed history, and scans showing no long-lived bearer token/plaintext group secret in URL, storage, logs, analytics, or proof. |
| IAC-10 Provider proof | RED | Product Account host identity is only partially exercised; visible account/login controls are currently disabled. | For every promoted provider: sign-in, return, sign-out, cleanup, recovery, wrong-account, and no-loop proof on supported profile/device. |
| IAC-11 Operator secret hygiene | PARTIAL | `../../scripts/security-baseline.mjs` supplies a narrow static baseline. | Fresh broad secret scan, ignored-local-config check, redacted logs/screenshots/reports, and named rotation/revocation owner. |
| IAC-12 Finding closure | PARTIAL | P-032 and the Gate 0 contract name owner and release gate. | Fresh matrix mapping every critical/high finding to card, owner, proof, result, and closure; independent qualified review remains required. |

### Gate 0 adversarial scenarios

| Scenario | Current status | Required fresh result |
| --- | --- | --- |
| S1 Guest becomes the same person | PASS | Rerun normal UI guest-to-Product-Account migration on the exact candidate; assert no duplicate person and preserved group/history. |
| S2 Different-account collision | PARTIAL | Wrong account fails closed through visible UI and offers a safe recovery path; no authority merge. |
| S3 Existing friend accepts in-app | PARTIAL | Pure domain tests prove friendship creates only `invited`; signed ECDH and signed membership-event tests prove invite -> acceptance -> protected grant with real sr25519 signatures. A custom-chat adapter and restart-safe delivery outbox exist for an already-selected room. Real-host delivery and UI remain open. |
| S4 Link forwarding | PARTIAL | Wrong account/replay cannot redeem membership or expose history/key; legitimate participant can continue safely. |
| S5 Member removed | RED | Revoked member cannot read or author future events after key rotation. |
| S6 Same-account new-device recovery | RED | Fresh profile/device restores exactly once after more than 300 seconds without mutable state resend. |
| S7 Account lost | RED | Explicit re-grant to new account, old signatures unchanged, privileged authority reassigned explicitly. |
| S8 Payment wallet changed | RED | Same ChopDot person/membership, new instrument only on future payment intents. |
| S9 Sign out and return | RED | Acting person/signer cleared; authorized encrypted history recovers with no plaintext-secret exposure. |
| S10 Credential disclosure attempt | RED | Validator rejects/redacts a seeded credential/raw group secret and records rotation required. |

## Batch 1 — Come back safely

| Release requirement | Current status | Current bounded evidence | Missing fresh candidate proof |
| --- | --- | --- | --- |
| Versioned encrypted checkpoint contract | RED | Accepted-event journal/frontier foundation exists, but no release checkpoint implementation is indexed. | Canonical `EncryptedGroupCheckpointV1` fields, serialization, encryption, signature/binding, and state hash. |
| Checkpoint authority | RED | Signed participant-event authority exists. | Only currently authorized member can publish; checkpoint cannot invent/remove/reorder events. |
| Safe validation | RED | Existing event-envelope validation is reusable characterization only. | Wrong group/signer/member/secret, tamper, stale frontier, rollback, and conflicting checkpoint all fail. |
| Persistent accepted checkpoint | RED | Local state/outbox/inbox persistence exists. | Persist checkpoint metadata and latest accepted encrypted checkpoint without making it mutable authority. |
| Replay from checkpoint frontier | RED | Applied/rejected event IDs persist locally. | Restore projection, then apply later signed events exactly once; duplicate/reordered delivery remains safe. |
| Safe compaction | RED | Processed ledger intentionally does not evict before a checkpoint boundary. | Compaction only behind accepted frontier; pre-frontier replay provably rejected. |
| Replaceable archive seam | RED | No candidate recovery archive proof. | Local archive seam with an explicit non-claim for Bulletin/live durability. |
| Recovery beyond 300 seconds | RED | Current Statement Store TTL is 300 seconds. | Deterministic clock beyond 300 seconds plus full provider/hosted-app restart. |
| Outbox and deferred inbox recovery | PARTIAL | `../general-shared-action-delivery/REPORT.md` and `../deferred-shared-action-restart/REPORT.md`. | Restore both alongside checkpoint and later events on the exact candidate. |
| Same-account wrapped-key recovery | RED | No member-specific key envelope. | Fresh device/profile unwraps only its approved key version and reconstructs current state. |
| Immutable close after recovery | PARTIAL | Reducer closeout/idempotency is bounded by prior tests. | Close once, checkpoint/replay/reload, and prove one unchanged saved record with no edit/finish controls. |
| User-facing recovery language | RED | Deferred restart remains invisible in one bounded screenshot. | Visible loading/offline/recovery/error states use normal language and never expose checkpoint, Statement Store, Bulletin, host, frontier, or protocol. |

## Batch 2 — Bring people in naturally

| Release requirement | Current status | Current bounded evidence | Missing fresh candidate proof |
| --- | --- | --- | --- |
| Typed invitation lifecycle | PASS (local) | Fresh B2 evidence proves signed invite, explicit signed Accept/Decline, pending-before-grant, revoke/expiry/replay laws, durable persistence, and actual organizer/invitee UI. Legacy snapshot auto-import is retired. | Live provider composition and real-host proof remain blocked. |
| Standing-member variation | RED | No indexed standing-member release proof. | Existing accepted member joins a new round only under the explicit standing policy. |
| Existing-friend in-app accept/decline | PASS (local) | B1 receipt proves the authority ceremony; B2 actual-App proof preserves explicit decision, pending, restart, and separate protected organizer grant in isolated simulator contexts. | Real Desktop contact resolution and chat delivery remain live-blocked. |
| Known contact pending/resend/revoke | RED | No indexed lifecycle proof. | Pending remains honest and can be resent, revoked, declined, or expire. |
| Join link or QR | PASS (local) | Visible organizer link/copy/fallback/QR actions, exact QR decoding, explicit recipient decision, wrong-person/expiry/replay domain laws, and no mutable snapshot authority pass in the B2 packet. | Public `.dot` routes and mixed live delivery remain blocked. |
| Limited no-app action | PASS (local) | Actual route and domain proof bind one dinner action, account, amount, currency, expense, and expiry; reload/outbox, wrong-account, expiry, conflict, and state/history non-mutation pass. | Public live route and delivery remain blocked. |
| Duplicate entry/identity | PASS (local) | Lifecycle/bootstrap tests reject duplicate routes, identities, and conflicting event IDs without creating a second membership. | Re-prove on the clean Batch 6 final fingerprint and live host. |
| Membership survives recovery | RED | No live membership event model or wrapped-key recovery. | Refresh, provider restart, and Batch 1 restore keep accepted/declined/revoked truth. |
| Removal and key rotation | RED | No proof. | Removed participant cannot consume or author future-version group events. |
| Mixed Mina/Leo/Nina journey | PARTIAL | B1 locally proves the established-contact route; B2 locally proves isolated organizer/recipient link and QR routes plus limited participation. | One combined three-person live Desktop convergence run remains outstanding. |

## Batch 3 — Make the first click count

| Release requirement | Current status | Current evidence | Missing fresh candidate proof |
| --- | --- | --- | --- |
| One enabled action above fold | PASS | `screenshots/01-entrance-desktop-1280x720.png` and `02-entrance-mobile-390x844.png` show one enabled `Review this spend` action fully above the fold. | Rerun on the frozen candidate and prove the action continues into the real receipt/group draft rather than an empty Home. |
| Honest CHF 120 preview card | PASS | The same screenshots show a clearly labeled Preview: Zurich Dinner, CHF 120, Mina/Leo/Nina, people state, and next action without implying live money state. | Rerun on the frozen candidate and reuse the stateful card through the real journey. |
| Three-second comprehension | RED | Current live entrance failed the benchmark. | First-time viewer can state product job and next action within three seconds; record method/result. |
| Trust-state fidelity | PARTIAL | Existing reducer distinguishes request, marked paid, received, closed, and saved. | Same reusable card/components render each exact state without implying unconfirmed money movement. |
| Real product, not landing-page theater | PARTIAL | The preview is honest and creates no fake state; screenshot `04-guest-home-no-fake-state-mobile.png` proves the real Home remains empty. Receipt-first Catch is real in screenshots 05/06. | Connect the primary action to the real draft and reuse the organizer/payer/receiver/closed/saved components so the entrance is not a disconnected showcase surface. |
| Infrastructure invisibility | PARTIAL | Current normal screens generally hide host protocol language. | Fresh visible-copy scan over every candidate screen and error state. |
| Responsive/accessibility/hard states | RED | Historical mobile screenshots cannot satisfy the candidate. | Desktop/mobile, keyboard/focus, contrast, reduced motion, loading, offline, host-unavailable, wrong-person, duplicate, and closed-state proof. |

## Batch 4 — exact candidate hardening

| Candidate gate | Current status | Required fresh artifact/evidence |
| --- | --- | --- |
| Frozen source | RED | Clean candidate commit/tree, branch, zero untracked/modified files, lockfile hash, and exact diff/decision record. |
| Exact build identity | RED | Node/npm/SDK/deploy-tool versions, build command, `dist` file manifest, per-file SHA-256, aggregate hash, build timestamps, and candidate identifier. |
| TypeScript and production build | RED | Fresh command logs from the frozen tree. Prior test/build reports do not count. |
| Focused authority/state suite | PARTIAL | Rerun all environment, state, request-link, and payment tests from frozen tree; add missing Gate 0/B1/B2 suites first. |
| Official host-simulator journeys | PARTIAL | Rerun host sim, visible five-person regression, general delivery, deferred restart, live payer sync, quota, and the new mixed three-person recovery journey. |
| Three isolated participants | RED | Separate host instances/Product Accounts; visible UI only; no shared app storage, reducer calls, state mutation, or copied return-state links. |
| Adversarial hard paths | PARTIAL | Exact candidate screenshots/results for empty, offline, reconnect, duplicate, reorder, wrong person/account, decline, expiry, revoke, close/reopen, immutable history, refresh. |
| Identity/recovery matrix | RED | S1-S10 plus guest migration, collision, sign-out/return, new device, lost account re-grant, forwarding, rotation, and wallet change. |
| Statement Store payload budget | PARTIAL | Existing host-sim report measured five statements at 1170 bytes, above the 1024-byte per-user budget. Candidate must compact notifications/pointers and prove every bounded payload. |
| Security and secret hygiene | PARTIAL | Fresh broad scan plus runtime URL/storage/log/report inspection; the existing baseline is necessary but insufficient. |
| Visible candidate QA | RED | 1280x720 and 390x844 screenshot set for first screen and full Mina/Leo/Nina lifecycle, plus comprehension/accessibility review. |
| Requirement evidence index | PARTIAL | This matrix initializes the index. Every row still needs a fresh result and direct output/screenshot path. |
| Local candidate verdict | RED | Only `candidate-ready-local` when every controlled Gate 0 and B1-B4 row is green on the exact same artifact. |

## Batch 5 boundary — not a local candidate gate

| Live requirement | Status | Evidence boundary |
| --- | --- | --- |
| Six-stage Desktop readiness | BLOCKED | Latest real run passed container/identity/service, then failed at allowance before publish/readback: `../chopdotproof02-v0.5.6-native-readiness-2026-08-11/REPORT.md`. |
| Supported allowance recovery | BLOCKED | Upstream Desktop issue 29 and Triangle SDK issue 167 remain open. Do not repeat the same approval loop. |
| Three isolated live Product Accounts | BLOCKED | Run only after readiness is `ready`; local simulator identities do not count. |
| Live >300-second fresh-device convergence | BLOCKED | Requires Gate 0/B1 candidate plus supported live transport. |
| Exact public URLs and entry | RED | Root wrapper is the public route; never distribute `app.<name>.dev-dot.li`. Retest the exact deployed candidate. |
| Deploy/publication | BLOCKED | Requires separate action-time approval. Building/testing this matrix does not authorize deploy, publish, registry submission, or outreach. |

## Fresh candidate command contract

Run only after Gate 0/B1/B2/B3 implementation is complete and a clean candidate
tree has been frozen. Capture every command, exit code, timestamp, and output
under this directory. Commands that generate screenshots/reports must be pointed
at fresh output paths; never let them overwrite historical proof.

```bash
cd /Users/devinsonpena/ChopDot/.worktrees/portable-shell-trial

# Candidate identity: must be clean before continuing.
test -z "$(git status --porcelain)"
git branch --show-current
git rev-parse HEAD
git show -s --format='%H%n%cI%n%s' HEAD
shasum -a 256 package.json package-lock.json polkadot-app-deploy.config.ts
node --version
npm --version
polkadot-app-deploy --version
npm ls --depth=0

# Static and unit gates.
npm run lint
npm run security:baseline
npm run test:gate0-foundation
node --import tsx --test \
  src/environment/*.test.ts \
  src/state/store.test.ts \
  src/requestLinks.test.ts \
  src/groupInvite.test.ts \
  src/payments/*.test.ts

# Existing host-simulator regressions.
npm run test:host-adapter
npm run test:host-sim
npm run test:host-ui
npm run test:live-payer-sync
npx playwright test \
  tests/general-shared-action-delivery.spec.ts \
  tests/deferred-shared-action-restart.spec.ts \
  --config=playwright.host-sim.config.ts --workers=1
npm run test:statement-budget
npm run test:session-quota

# Exact production artifact.
npm run build
```

The current scripts do **not** cover the complete B1 checkpoint/key-recovery,
B2 invitation lifecycle, or B3 visual candidate gates. Before candidate freeze,
add focused tests/scripts that provide these equivalent fresh commands:

```text
test:recovery-checkpoint
test:membership-lifecycle
test:mixed-three-person-recovery
test:candidate-visual
test:iac-adversarial
```

After the build, write a fresh manifest under `artifact/` that includes every
`dist/` file and SHA-256. A CAR/CID may be added only through a verified local
packaging-only path. Do not invoke a deploy command merely to obtain a CAR or
CID. `polkadot-app-deploy --dump-car` is an option on the deployment path and is
therefore outside this local proof pack until its side effects are independently
excluded or action-time deployment approval is given.

## Final verdict rule

- `candidate-ready-local`: every controlled Gate 0 and B1-B4 requirement passes
  against one clean, byte-identified candidate and this matrix links each result.
- `blocked`: any identity, membership, key recovery, money-state, privacy,
  payload, visible journey, artifact-integrity, or evidence row remains red.
- `showcase-ready`: never awarded here. It additionally requires B5 live proof
  against the exact deployed artifact and separate deployment approval.
