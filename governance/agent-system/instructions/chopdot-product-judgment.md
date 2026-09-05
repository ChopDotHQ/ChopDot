# ChopDot product judgment method

**Kind:** guardrail
**Status:** active
**Owner:** product assurance
**Last reviewed:** 2026-08-27
**Applies to:** `chopdot-v1-launch`
**Authority:** tracked agent judgment method; it may challenge or route a priority but cannot change product law, strategy, or product priority by itself

This is the durable source for ChopDot product judgment. Machine-local skills
are loaders only. Exact-worktree product law, Cockpit decisions, source, tests,
screens, and live evidence remain authoritative according to
`product/context-authority.json`.

## Exact-worktree preflight

Before any current or next claim:

1. Resolve and report Git root, branch, HEAD, and complete status.
2. Read the exact worktree's `product/context-authority.json` and run
   `npm run context:validate`.
3. Read `PRODUCT_TRUTH.md` and record its digest.
4. Treat another checkout as external context only.
5. Attribute dirty paths. Do not refresh hashes or generated views in a way
   that accepts unrelated dirty work.

If exact-root validation fails or same-level sources conflict, the affected
judgment is `blocked`; do not pick the newer-looking or more detailed source.

## Authority boundary

- `PRODUCT_TRUTH.md` is the only product law.
- `product/cards.md`, `product/decisions.md`,
  `product/decision-contracts.md`, and `product/roadmap.md` contain current
  revocable product decisions.
- Source, tests, screenshots, live readback, and user evidence prove different
  things. Keep them separate.
- Generated Cockpit views, `.knowns`, plans, KGs, Repo Graph packets, skills,
  competitors, and old scenarios are supporting or derived context. They may
  reveal a conflict; they may not silently resolve one.
- A change to product law or real strategy requires the product owner's
  approval. A repair to contradictory scaffolding may preserve current
  priorities but must not invent a replacement priority.

## Independent-first judgment

Do this before accepting the Cockpit's ranked recommendation. Independent-first
means independent of the current recommendation; it does not mean
evidence-free or competitor-blind:

1. State the observed user or operator state.
2. State the one job that matters in that state.
3. Propose the likely one next action for that state.
4. State the expected observable outcome.
5. Name the authority, privacy, trust, and failure boundaries.
6. State the evidence available, missing, and likely to falsify the view.

Then read the Cockpit sources and run:

```bash
npm run product:query -- "next"
npm run product:validate
```

Compare the independent view with the current card. Do not rewrite the first
view after seeing the answer. Report agreement, disagreement, or insufficient
evidence.

## Category baseline before differentiation

For every user-facing product definition, read the exact worktree's
`product/benchmark-baseline.md` and record its digest and review date. It is an
evidence-backed guardrail subordinate to product law, not product law and not
proof that ChopDot currently implements any behavior.

Build the definition in this order:

1. **Category baseline:** map the user job to the relevant `BASE-*` or `MODE-*`
   requirement IDs. Preserve the baseline treatment (`must-match`,
   `must-exceed`, or `mode-baseline`) and give every applicable requirement one
   package disposition: `covered`, `intentionally-exclude`, `not-applicable`,
   or `unresolved`.
2. **ChopDot differentiation:** name the observable user or trust outcome that
   improves the baseline. A technical component, product slogan, or internal
   invariant is not an observable differentiated outcome by itself.
3. **Experiment:** label unproven interaction, automation, rail, or mode ideas
   as hypotheses with a falsifier and promotion evidence. Experiments cannot
   displace an unresolved category basic.

A definition cannot pass while an applicable baseline requirement is
`unresolved`. `intentionally-exclude` requires the reason, user consequence,
and the approval required by the current product decision. A product score,
internal fixture, reference scenario, implementation test, or infrastructure
capability cannot substitute for baseline mapping.

### Benchmark evidence boundary

Preserve the evidence state on every cited benchmark row:

- `E0-discovery` and `E1-anecdotal` support an investigation or pain
  hypothesis only. An inferred chat, calculator, banking, spreadsheet, or
  memory null workflow remains E0 until directly observed.
- `E1-public-source` supports a cited claim about documented public capability
  at the recorded observation date. It does not prove that a real user
  completed the journey, that the interaction is clear, or that ChopDot has
  reached parity.
- `E2-hands-on` requires a reproducible same-task walkthrough with product,
  platform, version or surface, date, steps, result, and captured evidence.
- `E3-chopdot-proof` requires exact-candidate source or production-entrypoint
  evidence for ChopDot itself. Competitor evidence cannot provide it.

Record missing E2 work as an open evidence gap. Never upgrade E1 into E2 by
repetition, synthesis, a high score, or agent confidence. Null workflows such
as chat, notes, calculators, and spreadsheets are valid benchmarks when they
are the user's real alternative, but an inferred null is not current hands-on
evidence. Stale E1 may define a refresh queue; it cannot prove a current
capability, present-day superiority, current pricing or limits, or accepted
product completion.

## Keep these three questions separate

1. **What should the team work on next?** The comparative operator priority.
2. **What should this user do now?** One action for one observed user state or
   route.
3. **Is this bounded product definition good enough to implement?** The
   friction/trust/clarity/language admission gate.

None proves another. A P0 repair can be the team's top priority without becoming
the Home action for every user. A `9/10` or `10/10` product score does not rank
cards. A card's `next_action` is scoped by its `audience` and `action_scope`.

## Product Portfolio Judgment

For every eligible card, compare:

- user job and affected state;
- applicable category-baseline IDs, dispositions, evidence states, and gaps;
- the differentiated outcome and any bounded experiment;
- expected observable outcome;
- reach or frequency;
- trust, authority, privacy, and failure impact;
- blocker and dependency leverage;
- evidence quality and confidence;
- implementation and verification effort;
- opportunity cost and reversibility; and
- urgency, including live P0/P1 evidence.

The selected card must record:

- `audience` and `action_scope`;
- `expected_outcome` and `success_evidence`;
- `failure_outcome`;
- `accountable_owner`;
- `exit_condition` or bounded retry condition;
- `priority_basis`; and
- `alternatives_not_now` covering at least the next two eligible alternatives
  in the product verdict.

Numeric priority is an explicit reviewed ordering field. It is not objective
evidence by itself. Markdown order is never priority.

## Product gate for a bounded journey

Write:

- `User state`: the observed state or route.
- `User journey`: “I am [person], I need to [one job], so [outcome].”
- `One next action`: one action in this state.
- `State change`: what changes after the action.
- `Authority`: who or what can accept the change.
- `Failure and recovery`: what the user sees and can do.
- `Category baseline`: applicable requirement IDs, dispositions, evidence
  states, and unresolved count.
- `ChopDot differentiation`: the measurable improvement layered on the
  baseline.
- `Experiments`: bounded hypotheses, falsifiers, and promotion evidence.
- `Friction /3`, `Trust /3`, `Clarity /3`, `Language /1`, total `/10`.

Only implement when the category baseline gate passes and the score is `8/10`
or higher. Record the component scores and evidence. This score evaluates the
bounded ChopDot experience after baseline coverage; it never proves baseline
coverage, benchmark quality, hands-on parity, implementation, or portfolio
priority.

## Scenario containment

Examples are test fixtures, not defaults. A receipt scenario applies to a user
who has a receipt or spend to capture. Group creation applies to a user starting
a shared group. Invitation, returning-group, recovery, payment, and release
states have their own actions.

Before reusing any example, ask:

- Does the same actor have the same state and job?
- Does the same authority boundary apply?
- Is the same failure path possible?
- Does the governing decision scope include this route?

If any answer is no or unknown, do not generalize the example.

## Product and business judgment

Evaluate the product as a trust system for real group money, not as a checklist
of infrastructure features. Prefer moves that lower friction, increase trust,
and preserve future optionality across `Catch -> Management -> Payout ->
History`.

Ask:

- What recurring job becomes easier?
- What trust ambiguity disappears?
- What evidence would show increased activation, completion, return, or
  referral?
- Does this strengthen ChopDot's category or merely expose infrastructure?
- Is monetization aligned with improved user outcome rather than control,
  custody, or surveillance?

Infrastructure and Polkadot capabilities should reduce friction or increase
trust invisibly. Account, wallet, verified contact, personhood, membership,
organizer authority, and payment evidence remain distinct.

## UI judgment

Use one obvious action per observed state. Reject a dashboard, lab, ledger,
protocol console, admin panel, internal test harness, or generic form dump.
Normal UI must not diagnose the user with host, adapter, chain, personhood,
Product Account, Statement Store, Bulletin, or protocol language.

First preserve the familiar category job and recovery path, then make the
ChopDot trust improvement visible in user terms, and only then introduce a
bounded experiment. Do not make a differentiated trust mechanism feel like
extra ceremony, and do not call an unfamiliar interaction better without E2 or
real-user evidence.

For user-facing work, proof requires the production entrypoint, first/action/
error/recovery/after states, responsive and accessibility checks, and real
screenshots. Selector or unit success alone is not product acceptance.

## Required output

Use this order:

1. **FACTS** — exact source and evidence facts.
2. **INFERENCES** — conclusions supported by those facts.
3. **ASSUMPTIONS / UNKNOWNS** — missing or stale evidence.
4. **Independent first view** — state, job, action, outcome, authority, risk.
5. **Benchmark comparison** — applicable baseline IDs, dispositions, evidence
   states, E2 gaps, null workflow, differentiation, and experiments.
6. **Cockpit comparison** — agreement, conflict, or insufficient evidence.
7. **Priority verdict** — now, alternatives not now, and why.
8. **Product gate** — baseline gate first, then bounded journey and component
   score.
9. **Loop contract** — expected outcome, proof, failure, owner, retry/exit.
10. **Decision** — `BUILD`, `REPAIR`, `HOLD`, `BLOCKED`, or
   `APPROVAL_REQUIRED`.
11. **Next move** — one bounded action and its proof method.

Never say “the Cockpit says so,” “the score is high,” or “this was the last
plan” as the complete reason for a priority. Never say “competitors cover it”
without requirement IDs, evidence grades, and dated citations.
