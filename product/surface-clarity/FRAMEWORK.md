# ChopDot Surface Clarity V1

Status: proposed review method and working tooling; not product authority or a new gate.

Make the next action and its consequence understandable, while preserving the
approved financial meaning. Use the least communication that is sufficient;
do not optimize word count. Do not explain what the interface can demonstrate.

## Relationship to the existing product

The schema answers what the product means and which relationships must hold.
Goldens, C1, approved decisions and documented integration impacts govern the
experience. Surface Clarity asks whether a person can understand and use that
experience. It cannot override either authority or certify production readiness.

Frozen schema: `5107e64b1b2a0cb0eddd34f8235dfd6ae1d54013`, tree
`ce5b82d008dfa2f48e714607e30fdb6839b8305c`. Frozen Golden/C1 source:
`4ba456e6595330e4ca8e21366e0d827f17e10881`. Approved later decisions retain
their own source pins; the original Golden is not the only source of an impact.
These sources remain on their existing Git lineages. Nothing here moves a tag.

## The five questions

Ask at every meaningful state and incoming transition:

1. Is this still true for this build, person, scope and payment state?
2. Where am I, and what changed or is true now?
3. What can I do next, and why is an action unavailable?
4. What happens if I do it, including what remains unresolved?
5. What will the other affected person see, and how can I return or recover?

An unchanged screenshot is insufficient when the underlying state, actor or
incoming route has changed. Test normal entry, contextual entry and recovery.

## Communication ladder

| Layer | Prefer | ChopDot application |
|---|---|---|
| L0 | Demonstrate with state, hierarchy, selection and progress | Selected source groups; reviewed/waiting status; remaining amount |
| L1 | Clear task label | Return to payment; Edit expense; Review allocation |
| L2 | Short consequence caption beside the action | Explain review reset or the unpaid remainder, when supported by authority |
| L3 | Inline explanation before a consequential decision | Scope, currency, participant, irreversible change or an unknown payment result |
| L4 | Optional Details / Help | Provenance, exact timestamps, hashes, technical background |
| L5 | Internal records only | Journey IDs, architecture, review denominator, owner-boundary implementation terminology |

Payment scope, currency, exact amount, recipient, source lineage, remaining
obligations and accepted result must remain inspectable where the approved
contract requires them. A concise surface must not hide them or reinterpret
netting as cancellation. Moving copy into Details requires an actual reachable
control and a check that mandatory pre-commit facts remain visible.

Introduce a novel concept when first needed, demonstrate it, then retire
redundant explanations. Repeat when the consequence changes. Do not add
per-person tutorial tracking just to implement this method. A required prototype
disclosure may be centralized, but a local funds/signing consequence still needs
truthful disclosure at the relevant action.

## Eight checks, applied to bounded tasks

| ID | Check | Concrete question / observation |
|---|---|---|
| truth | Truth and scope | Does visible copy match the actual actor, amount, currency, source set, storage and external capability? |
| orientation | Orientation and hierarchy | Can the person identify the current group/person/task and intended next action? |
| consequence | Consequence before commitment | Can they predict who changes, what persists, what resets and what remains? |
| effort | Decisions and memory | Are facts visible at the decision, defaults justified, and unrelated choices secondary? |
| controls | Controls and access | Are targets reachable, separated, labelled and operable; errors near fields; no dangerous double activation? |
| continuity | Continuity and counterpart | Does Back/reopen/reload preserve effort, and do affected roles see truthful state without new permissions? |
| recovery | Recovery and exits | Are empty, unavailable, interrupted, unknown and terminal states distinguishable, with a valid next step? |
| finish | Finish and visual clarity | Is completion truthful, text readable and hierarchy consistent without burying the meaningful moment? |

Use Hick, Fitts, Jakob, cognitive load/chunking, proximity, aesthetic-usability
and peak-end as explanation/prediction lenses. No law supplies a universal
number of buttons, words or steps. Polished appearance can improve perceived
ease; it does not prove correctness or comprehension. Accessibility conformance
is a separate assessment against the chosen standard, not a UX-law score.

## The reusable loop

1. **Bind:** record exact implementation SHA, runtime digest, registry digest,
   frozen source, relevant state/control piece, operation owner and task IDs.
   Read the frozen schema's `V1_USAGE_GUIDE.md`. Certified paths cover six
   journeys, not all 28. For other tasks cite approved sources and label the path
   source-backed or exploratory; do not call it certified.
2. **Scope:** list affected states, entry/return routes, actors and counterpart,
   alternate/error paths, applicable viewports and any external fixture. Read
   state inventories and edge cases. The nine starter scenario categories are a
   reminder, not an exhaustive list or a demand to invent features.
3. **Inspect:** answer the five questions, use the eight checks, then record
   KEEP, CORRECT, DELETE, UI_CUE, LABEL, CAPTION, INLINE, DETAILS, INTERNAL or TEST.
   CORRECT an inaccurate claim before polishing it. KEEP good behavior too.
4. **Predict:** name the observed defect or comprehension hypothesis, expected
   benefit, possible cost, evidence needed and authority boundary. Do not hide a
   supported destination because Hick's Law sounds persuasive.
5. **Change narrowly:** preserve semantic contracts and canonical state. Record
   a genuine product decision separately if navigation, hierarchy or consequence
   changes approved meaning. Do not edit frozen sources to make a comparison pass.
6. **Verify:** run affected existing model/browser/authority tests; interact with
   normal UI; compare the same states at approved viewports; replay Back/reopen/
   reload, permissions, counterpart and recovery where applicable. Existing
   Goldens use 393×852 and 430×890 in many QA packets; consult each packet rather
   than assuming all journeys share those dimensions. Device simulation is not
   physical-device qualification.
7. **Record:** attach command/exit logs, screenshots and exact-version receipts.
   For wording/hierarchy hypotheses, give cold participants neutral task prompts
   and ask them to predict consequences before clicking. Small formative sessions
   find problems; they do not establish a population-wide success rate. Obtain
   separate review when required by the existing acceptance process. Self-review
   remains self-review.

## Evidence and result vocabulary

Record evidence as SOURCE, BROWSER, INDEPENDENT_REVIEW or USER_STUDY. They prove
different things. A source citation does not prove a rendered interaction;
browser success does not prove human comprehension. Automated records include
command, actual exit code and log. User-study records include protocol, anonymized
observations and participant scope. Never put real financial or identity data in
these records.

Each check/scenario is unassessed, pass, fail or not_applicable. A pass is bounded
by its expectation, source/case and evidence. A justified not_applicable names why
the state does not exist; it is not an unexecuted pass. Historical findings remain
open until a disposition links new evidence. Distinguish fixed, accepted_limit,
needs_product_decision and hypothesis_needs_test. Only fixed or an explicitly
acknowledged accepted_limit can satisfy a journey's readiness bookkeeping.

`check` validates bookkeeping and source freshness. `ready` also refuses missing
scenario/check evidence and undispositioned findings. Neither command understands
screens, judges evidence quality, approves a product decision or accepts the
prototype. A human can falsify a record; review must inspect the cited artifacts.
Do not substitute this command for existing schema, model, browser or CI checks.

## Adoption and maintenance

Use one record for every journey in the existing registry; future registry
entries become missing coverage until initialized and reviewed. Add task/state
cases to that record, including cross-journey sequences. Never duplicate the
schema's operations or create a second outcome fixture store.

Runtime or registry changes invalidate old bindings. The checker conservatively
uses the whole integrated runtime, so a shared change may stale all records.
Explicitly inspect the impact and refresh records with new evidence; no automatic
carry-forward is provided. Documentation-only changes do not stale runtime
evidence. External-service changes still require a new review even if client
bytes are unchanged. Record the environment and fixture version in the receipt.

Adopt this in the existing change/review process: add the affected journey IDs,
Surface Clarity finding IDs, retained behavior, consequence prediction and evidence
to the normal PR. Make `check` required only through the repository's normal
workflow change process. No new scheduled worker, architecture stage, schema
freeze or blanket human-study requirement is introduced.

## Starting backlog and provenance

The 2026-10-10 audit sampled 28 families at prototype `3738c730`; it did not
complete every path. Its 12 findings seed this framework as open observations.
Start with observed wrapping, delayed validation, misleading return destination
and missing visible labels. Test choice-overload and wording hypotheses before
changing hierarchy. Navigation differences may require an explicit approved
decision. Retain exact allocation, scoped facts, calm unknown-result recovery and
truthful confirmations. This package makes the method usable; it does not claim
the backlog has been repaired.

Adapted from Flagged's Surface Clarity V0.1 at
`43514569a5b10a5b60165e8e14456f9434a2d36f` and V0.2 proposals at
`550a18d9e1b7b8b575abc9f16810ed5f9ead0739`. The latter supplies truth,
counterpart, exits and accidental-activation lessons, not approved ChopDot rules.
Flagged implementation receipts are not ChopDot usability evidence.
