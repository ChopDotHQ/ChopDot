# ChopDot frontend design method

**Kind:** guardrail
**Status:** active
**Owner:** product experience and product assurance
**Last reviewed:** 2026-08-27
**Applies to:** `chopdot-v1-launch`
**Authority:** tracked frontend method; it may admit, reject, or route a bounded
experience but cannot change product law, category-baseline decisions, product
priority, implementation state, or release status

This is the durable method for ChopDot user-facing layout, interaction, and
copy. Machine-local skills are loaders only. The method defines how to create
and prove an experience; it does not prescribe one universal first action,
actor, scenario, mode, or visual composition.

## Exact-worktree preflight

Before editing user-facing source:

1. Resolve and report the Git root, branch, HEAD, complete status, and
   production entrypoint.
2. Read and validate `product/context-authority.json` from that exact worktree.
3. Read `PRODUCT_TRUTH.md`, `product/benchmark-baseline.md`, the active card,
   current decisions and decision contracts, and the tracked
   `chopdot-product-judgment.md` method. Record source identities and freshness.
4. Run `npm run product:query -- "next"` and `npm run product:validate`, while
   keeping the operator priority separate from this user's next action.
5. Identify the exact user state or route this change serves. If no active card
   covers it, stop and route the missing definition through Product Definition.
6. Record the current deployed screen and build identity separately from local
   source. Local work never proves a deployed change.

Wrong-root context, missing benchmark coverage, stale governing evidence, or a
same-level source conflict blocks the affected design judgment. Do not choose
the newest-looking source or copy a decision from another checkout.

## Compose the experience in three layers

### 1. Category baseline

Start with the normal job and recovery path that users can already complete in
strong relevant products or in the practical null workflow they use instead.
Map the change to applicable `BASE-*` and `MODE-*` IDs from
`product/benchmark-baseline.md`.

For each applicable ID, record:

- the preserved baseline treatment (`must-match`, `must-exceed`, or
  `mode-baseline`) and the package disposition (`covered`,
  `intentionally-exclude`, `not-applicable`, or `unresolved`);
- the cited evidence state and observation date;
- the intended screen, interaction, or recovery coverage; and
- the exact ChopDot proof still required.

An unresolved category basic blocks experience acceptance. An intentional
exclusion requires its reason, user consequence, and the approval required by
the current product decision.

### 2. ChopDot differentiation

Layer the named ChopDot improvement onto the complete baseline. Express it as
an observable user or trust outcome, such as clearer authority, more honest
payment status, safer correction, greater privacy, or durable participant-held
history. Do not expose the underlying infrastructure to make the distinction
visible.

A differentiator cannot compensate for a missing basic, and an internal
invariant is not automatically a better user experience.

### 3. Bounded experiment

Label unproven automation, interaction, rail, identity mechanism, mode, or
novel composition as an experiment. Record the hypothesis, affected states,
falsifier, evidence required for promotion, and fallback to the accepted
baseline. Experiments may improve a working path; they may not replace one.

## Preserve evidence boundaries

- `E0-discovery` and `E1-anecdotal` support investigation or pain hypotheses,
  not a current category capability or interaction claim. Inferred null
  workflows remain E0 until directly observed.
- `E1-public-source` describes a documented public capability. It does not
  prove hands-on usability, hierarchy, reliability, or same-task parity.
- `E2-hands-on` requires a dated reproducible walkthrough on the named product,
  platform, version or surface, with steps, result, and captured evidence.
- `E3-chopdot-proof` requires the exact candidate through the production
  entrypoint. A component fixture, source inspection, or competitor screenshot
  cannot provide it.

Keep missing E2 work visible. Never turn E1 into E2 through synthesis, a
product score, repeated citations, or agent confidence. When claiming that an
interaction matches or exceeds a competitor, require the relevant E2
same-task evidence; otherwise describe it as a hypothesis.

An expired or stale E1 source may route a refresh; it cannot prove current
capability, pricing, limits, platform support, superiority, or product
acceptance.

## State-scoped experience gate

Before implementation, write:

```text
User state or route:
[one observed state]

User journey:
"I am [person in that state], I need to [one job], so [observable outcome]."

Category baseline:
[requirement IDs, dispositions, evidence states, exact proof needed]

ChopDot differentiated outcome:
[one observable improvement layered on the baseline]

Experiments:
[none, or hypothesis + falsifier + baseline fallback]

One next action:
[one primary action for this state only]

State change and authority:
[what changes and who can accept it]

Failure and recovery:
[what remains safe, what the user sees, and what they can do]

Visual thesis:
[one sentence for hierarchy, material, and mood]

Content plan:
[first viewport, secondary detail, final action]
```

The Product Judgment score applies only after baseline coverage is valid. A
high score cannot prove benchmark coverage, implementation, hands-on parity,
or priority.

## One action per observed state

Every normal user screen should make one next action obvious for its current
actor, state, and route. This is not a global Home action and not a permanent
product wedge.

The first viewport should make clear:

```text
Where am I?
Who or what is this about?
What can I do now?
What will change if I do it?
```

Actions belonging to other states remain secondary, deferred, or absent. An
operator priority, benchmark example, test fixture, or previous scenario must
never become a universal participant action.

## Interaction and visual quality

- Start from the user's job, not a component inventory.
- Prefer direct manipulation and a short recovery action over instructional
  panels.
- Keep the first viewport sparse enough that hierarchy is obvious by scanning.
- Use the existing design system before introducing a new pattern.
- Use cards only when they clarify repeated items, records, or grouped
  choices; never nest cards to manufacture hierarchy.
- Put status and detail after the user has enough context to care.
- Avoid desktop dashboards compressed onto mobile.
- A primary action must succeed, be honestly disabled with a nearby recovery
  action, or lead directly through the required setup.
- Do not hide empty, error, wrong-actor, privacy, correction, closeout, and
  return states to make the happy path look polished.
- Add a screen only when it gives one actor a meaningfully clearer action or
  protects an authority, privacy, or recovery boundary.

The active card defines art direction and screenshot acceptance. This method
does not freeze one color, component shape, density, or competitor aesthetic as
permanent product truth.

## Product language boundary

Normal UI explains the user's situation and action, not implementation. Avoid
protocol, host, chain, adapter, state-machine, contract, CID, CAR, proof-system,
SDK, or internal account terminology unless a card explicitly defines an
advanced user surface where that information is necessary.

Prefer language such as:

- payment requested;
- marked paid;
- confirmed received;
- waiting on;
- ready to close;
- saved record; and
- payment link.

Contact verification, account control, wallet control, personhood, group
membership, organizer authority, and payment authority remain distinct in
both behavior and copy. Do not use visual polish to imply an authority the
underlying state does not grant.

## Behavior before polish

Write `GIVEN / WHEN / THEN` scenarios for:

- the intended actor and state;
- the wrong actor or missing authority;
- empty and first-use state;
- blocked or failed action;
- recovery without data loss or silent mutation; and
- the after-action state.

The visible state must map to product truth. A polished ambiguous state fails.
Fixture tests can prove a component; they cannot prove the journey, category
coverage, or live result.

## Required evidence loop

```text
verify exact root and governing identities
-> map baseline IDs and evidence states
-> name differentiated outcome and bounded experiments
-> lock user state, action, authority, failure, and recovery
-> implement through existing design primitives
-> run focused behavior and accessibility checks
-> traverse the production entrypoint in a clean context
-> capture first, action, error, recovery, and after states
-> review required mobile and desktop viewports
-> obtain independent visual and product review
-> repair the original source and rerun the affected journey plus regression
-> attach exact-candidate evidence to the active card
-> promote the identical reviewed build and verify live separately
```

Record command, cwd, commit or candidate identity, viewport, actor/state,
result, exact counts, screenshots, and limitations. A local pass, host
simulation, live reachability, and real-user success are separate verdicts.

## Stop and failure conditions

Stop acceptance and return an honest failure packet when:

- an applicable baseline requirement is unresolved;
- E1 is presented as hands-on E2 or competitor evidence as ChopDot proof;
- a differentiator or experiment replaces a missing basic;
- an action is generalized beyond its actor, route, or state;
- the screen resembles a dashboard, lab, ledger, admin panel, internal harness,
  or form dump because hierarchy is unresolved;
- users need infrastructure diagnosis to continue;
- the wrong actor can perform or appears able to perform a protected action;
- any declared viewport hides or clips the primary action;
- a blocking accessibility, privacy, or recovery failure remains; or
- the screenshot or first-time journey fails even though selectors or builds
  pass.

The failure packet records baseline IDs, evidence grade, failed state, actor,
viewport, exact candidate, user-visible consequence, recovery path, owner, and
next changed hypothesis. Repeating the same design with cosmetic changes is not
a repair.

## Required handoff

Report:

1. exact root, branch, candidate, and dirty-path attribution;
2. active card, user state, and state-scoped action;
3. baseline IDs, dispositions, evidence grades, and E2 gaps;
4. differentiated outcome and experiment status;
5. behavior, authority, privacy, failure, and recovery results;
6. production-entrypoint, viewport, accessibility, and screenshot evidence;
7. independent verdict and remaining failure packet; and
8. local, deployed, and real-user outcomes separately.
