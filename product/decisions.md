# ChopDot Public Beta Decisions

**Kind:** decision
**Status:** active
**Owner:** product
**Last reviewed:** 2026-08-27
**Applies to:** `chopdot-v1-launch`
**Authority:** dated revocable release decisions subordinate to product law

Every decision is revocable, dated, scoped, and subordinate to
`PRODUCT_TRUTH.md`.

## DEC-001 - Receipt-first Catch entrance

- Date: 2026-08-23
- Status: active
- Scope: public-beta Catch route when a participant has a receipt, image, link, or spend to capture
- Supersedes: manual-first entry in historical prototypes
- Decision: The dominant action in this bounded Catch state is **Scan a
  receipt**. Capture creates a local draft; review is the authority boundary.
  Manual entry is a fallback. This decision does not select the Home action for
  every user state and does not determine the operator's next implementation
  priority.
- Reason: Capturing the real-world moment reduces retyping and preserves an
  explicit human review before shared truth changes.
- Falsifier: Real first-time users complete the intended Catch job more clearly
  and with less friction through another tested entrance.

## DEC-002 - One authority

- Date: 2026-08-23
- Status: active
- Scope: public-beta domain state
- Supersedes: competing production reducer/snapshot authority
- Decision: `MoneyV1`, `ChopEventV1`, and `ModePolicyV1` are the domain
  boundary. Hosts, wallets, chains, indexes, checkpoints, transports, and
  projections are adapters.
- Reason: One signed event set must produce one state and keep provider/runtime
  replacement possible.
- Falsifier: Deterministic replay cannot represent a required money culture
  without a second source of truth.

## DEC-003 - No private backend

- Date: 2026-08-23
- Status: active release guardrail
- Scope: this public beta, not permanent product law
- Supersedes: Supabase/private-relay beta assumptions
- Decision: Use participant-held signed events, encrypted local projections,
  encrypted Bulletin blobs, minimum-disclosure Statement Store hints, and the
  minimal `RecoveryHeadIndex`. Do not use Supabase or another operated ChopDot
  database/relay.
- Reason: The selected testnet capabilities support the beta authority and
  recovery model without adding a private server as a second authority.
- Falsifier: A required user journey cannot meet availability, privacy, and
  recovery acceptance under the bounded participant-held design.

## DEC-004 - Recovery is honest and optional

- Date: 2026-08-23
- Status: active
- Scope: public-beta recovery UX and authority
- Supersedes: mandatory recovery-kit ceremony
- Decision: Require same-account recovery and social re-grant. Offer a
  downloadable encrypted recovery kit without requiring it. State Bulletin
  retention and lost-account limitations in user language.
- Reason: Optional preparation reduces first-use ceremony while preserving an
  honest path for device/account loss.
- Falsifier: Fresh-device and lost-account testing shows unacceptable loss or
  ambiguity without a mandatory recovery mechanism.

## DEC-005 - One immutable promotion

- Date: 2026-08-23
- Status: active
- Scope: Products Devnet and supported public-testnet surfaces
- Supersedes: rebuild-per-environment deployment
- Decision: Build once, stage one CAR/CID on Products Devnet, and promote the
  identical CAR to Paseo. Claim a `.dot.li` URL only after independent build-ID
  and CID readback. Use `chopdot.dot` only with Full personhood; otherwise use
  `chopdotapp01.dot` and keep branded migration open.
- Reason: Byte identity prevents environment-specific source drift and makes
  rollback and ownership evidence inspectable.
- Falsifier: A supported host requires different immutable application bytes
  and the difference is explicitly reviewed as product-safe.

## DEC-006 - Context authority is explicit

- Date: 2026-08-24
- Status: active
- Scope: exact-worktree hydration, product routing, evidence, and cited recall
- Supersedes: competing default authority claims by ADRs, wiki, `.knowns`,
  generated Cockpit views, agent skills, and KG packets
- Decision: Use `product/context-authority.json` and ADR 0004. Product law
  defines invariants; Cockpit source defines current intent and priority;
  source/tests prove exact-commit implementation; immutable release/live
  readback prove deployment; Repo Graph/KGv2 provide cited recall only.
- Reason: Untyped documents previously allowed file order, freshness, and
  checkout drift to fall on the operator.
- Falsifier: Validator-approved routing still permits another checkout or a
  generated/stale surface to change current priority or release status.

## DEC-007 - Repair first-use before new promotion

- Date: 2026-08-24
- Status: active
- Scope: P-035, P-022, and P-030 public release critical path
- Supersedes: promotion eligibility of the frozen candidate
- Decision: Keep signed shared-group authority, but establish it behind one
  plain-language user action. Do not make `Product Account` the user's
  diagnosis. Do not require personhood for ordinary capture, group creation,
  membership, or payment. Freeze a new candidate after repair.
- Reason: The live candidate presents an enabled action that can only fail at a
  hidden authority boundary, while Home obscures the first job with a dashboard.
- Falsifier: Production-entrypoint and real-live proof show the reported path
  succeeds without coaching and the frozen bytes actually differ from those
  observed by the user.

## DEC-008 - Full product and deployment are one release train

- Date: 2026-08-27
- Status: active
- Scope: `codex/chopdot-v1-launch` through public-testnet acceptance
- Supersedes: treating the 2026-08-24 bounded first-use repair as the complete
  release plan
- Decision: Route the release through
  `docs/superpowers/plans/2026-08-27-chopdot-full-product-public-testnet-execution.md`.
  The bounded first-use repair remains a required early gate, followed by the
  full normal journey, every named mode, assurance, one immutable candidate,
  Devnet staging, byte-identical public-testnet promotion, name ownership,
  real three-person acceptance, and exact-source knowledge recall. An upload,
  CID, reachable gateway, or local green suite cannot individually mean 100%
  deployed.
- Reason: Product completion, release bytes, live reachability, user ownership,
  real use, and durable knowledge are different failure domains and must not be
  collapsed into one optimistic deployment label.
- Falsifier: A smaller objectively verified terminal contract proves the same
  product, security, byte-identity, ownership, real-user, rollback, and recall
  outcomes without weakening any of them.

## DEC-009 - Actions are contextual; priorities are comparative

- Date: 2026-08-27
- Status: active
- Scope: Product Cockpit prioritization and action selection across Home, routes, user states, and operator work
- Supersedes: any universal reading of DEC-001, `product/story-map.md`, generated Cockpit copy, or one card's `next_action`
- Decision: ChopDot presents one obvious action per observed user state or
  operator state. A card must name its audience and action scope. The Cockpit's
  ranked card selects the operator's next product package; it does not make that
  card action the universal Home action for every participant. Priority requires
  an expected outcome, proving evidence, failure outcome, accountable owner,
  exit condition, priority basis, and explicit alternatives not now. Product
  score remains an admission gate and is not ranking evidence.
- Reason: A participant creating a group, capturing a receipt, accepting an
  invite, continuing an existing group, recovering on another device, or
  operating a release has a different current job. Collapsing these states into
  one default action created contradictory guidance while the validator still
  passed.
- Falsifier: Real state-specific testing shows one universal action produces
  clearer completion with lower friction across every governed state, and the
  same evidence also resolves the operator-priority distinction without hiding
  a required job.

## DEC-010 - Category baseline before differentiation

- Date: 2026-08-27
- Status: active
- Scope: product definition, experience composition, benchmark evidence, and
  phased acceptance for every user-facing ChopDot package
- Supersedes: any reading of an internal scenario, high product score, Devnet
  catalog, 10x thesis, or infrastructure capability as proof that the normal
  category basics are complete
- Decision: Compose user-facing ChopDot work in three explicit layers:
  category baseline first, ChopDot differentiation second, and bounded
  experiments third. `product/benchmark-baseline.md` records the current floor
  and evidence grade. Every active user-facing card must cite the baseline
  outcomes it covers, name the differentiated outcome it adds, declare its
  delivery phase and evidence state, and preserve any E2 or real-user gap.
  Conventional apps and null workflows are decision inputs, not product law;
  dated E1 source review cannot be represented as hands-on E2 proof.
- Reason: The conventional group-money research, scenario scorecards, and 10x
  thesis existed in another checkout but were absent from the launch
  worktree's active context. That allowed a bounded receipt scenario and a
  platform catalog to substitute for a complete category-floor decision while
  validation still passed.
- Falsifier: Real same-journey evidence shows that a baseline requirement is
  irrelevant to the addressed user state, or that a smaller outcome set
  produces clearer completion without losing a familiar required job. The
  affected requirement may then be changed through a dated reviewed decision;
  it may not be silently ignored by a card or skill.
