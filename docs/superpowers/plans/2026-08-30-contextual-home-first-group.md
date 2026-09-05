# Contextual Home and first-group presentation

**Kind:** execution plan
**Status:** active
**Owner:** product experience
**Last reviewed:** 2026-08-30
**Applies to:** `codex/contextual-home-first-group`
**Authority:** bounded P-035/P-022 presentation and entry-routing repair; cannot
change product law, signed authority, release status, or benchmark evidence

## Goal

Replace the universal receipt entrance with state-scoped entry and Home
hierarchy: a new participant can start a group through one plain-language path,
an empty Home offers `New group`, returning Home leads with group cards and at
most one deterministic pending-action prompt, and receipt priority remains
inside an explicitly chosen Catch flow.

## Current truth to preserve

- `PRODUCT_TRUTH.md` SHA-256:
  `d5ea94b3b89f682d7b7ab76f580102316c25b0366c52b9b5a851a5ab7162bba6`.
- `product/benchmark-baseline.md` SHA-256:
  `eb0bad42e37a3d6b61ca98414dfc03ff123a0c67c016ee612aab7b6b54c76b50`;
  reviewed 2026-08-27; stale E1 public-source evidence and inferred E0 null
  workflow only; E2 hands-on remains open.
- P-035 is the current P0 operator package. P-022 remains the dependent P1
  Home package. Neither card action is a universal user action.
- Deep links, invitations, payment requests, recovery, explicit Catch, signed
  group creation, membership authority, and exact-money authority keep their
  existing behavior.

## Category baseline

| ID | Treatment | Package disposition | Evidence | Exact proof still required |
|---|---|---|---|---|
| `BASE-ENTRY-01` | must-match | covered | stale E1 / E2 open | Production entry shows one first-group action without account or wallet diagnosis. |
| `BASE-GROUP-01` | must-exceed | covered | stale E1 / E2 open | Start-group intent survives guest setup; signed creation and later invitation remain distinct. |
| `BASE-STATUS-01` | must-exceed | covered | stale E1 / E2 open | Returning Home shows groups first and no more than one role-appropriate pending prompt. |
| `BASE-CAPTURE-01` | must-match when applicable | covered only for explicit Catch | E1 / refresh required / E2 open | Receipt priority appears after the participant deliberately chooses Catch, not as universal Home. |
| `BASE-ACCESS-01` | must-exceed | covered | stale E1 / E2 open | 320, 390, and desktop production-entry screens retain semantic hierarchy, keyboard reach, reflow, and clear recovery. |

Unresolved applicable baseline count for implementation: **0**. E2 and
real-user acceptance remain open and prevent parity/completion claims.

## ChopDot differentiated outcome

The familiar first-group and Home jobs stay simple while account, contact,
membership, organizer, and money authority remain separate and invisible until
the consequential signed action actually needs them.

## Experiments

- **Deterministic pending prompt:** returning Home may show one prompt only for
  a concrete receiver-confirmation or requested-payment state.
- **Falsifier:** the prompt competes with group recognition, selects the wrong
  actor, varies for the same state, or hides a group card.
- **Fallback:** show group cards with their existing status copy and no global
  prompt.

## State-scoped product gates

### First visit — start a group

- **User state:** no local participant; no deep-link intent.
- **Journey:** “I am starting a shared group, I need to begin without learning
  account plumbing, so I can name the group and invite people intentionally.”
- **One next action:** `Start a group`.
- **State change and authority:** the action carries local intent through guest
  setup; only the later signed create action changes shared group truth.
- **Failure and recovery:** setup or signing failure keeps the local name/draft
  and offers retry; no shared group is silently created.
- **Score:** friction 3/3, trust 3/3, clarity 3/3, language 1/1 = **10/10 PASS**.

### Empty Home — create the first group

- **User state:** local participant exists; participant belongs to no open
  groups.
- **Journey:** “I am ready to organize something, I need to create my first
  group, so I have a clear home for people and shared costs.”
- **One next action:** `New group`.
- **State change and authority:** navigation only until signed creation.
- **Failure and recovery:** the participant stays on an honest empty Home or
  returns to it without synthetic groups or money state.
- **Score:** friction 3/3, trust 3/3, clarity 3/3, language 1/1 = **10/10 PASS**.

### Returning Home — recognize and continue

- **User state:** participant belongs to one or more open groups.
- **Journey:** “I am returning to ChopDot, I need to recognize my groups and
  anything truly waiting on me, so I can continue the right one.”
- **One next action:** open the relevant group card; when a proven pending
  action exists, one contextual prompt may point to that group.
- **State change and authority:** Home navigation changes no money or
  membership state.
- **Failure and recovery:** ambiguous or conflicting prompt inputs yield no
  prompt; all group cards remain available.
- **Score:** friction 3/3, trust 3/3, clarity 3/3, language 1/1 = **10/10 PASS**.

### Explicit Catch — scan a receipt

- **User state:** participant deliberately chooses the receipt/Catch path.
- **Journey:** “I paid for something, I need to capture the receipt, so I can
  review a local draft before adding it to a group.”
- **One next action:** `Scan a receipt` / import a receipt.
- **State change and authority:** local draft only until review and signed save.
- **Failure and recovery:** unreadable input remains correctable and creates no
  shared money state.
- **Score:** friction 3/3, trust 3/3, clarity 3/3, language 1/1 = **10/10 PASS**.

## Exact scenarios

1. **GIVEN** a first visit without a deep link, **WHEN** the participant chooses
   `Start a group` and completes guest setup, **THEN** `CreateGroup` opens and no
   group or expense exists yet.
2. **GIVEN** an empty Home, **WHEN** it renders, **THEN** `New group` is the one
   primary action and receipt capture is secondary.
3. **GIVEN** open groups with no actionable receiver/payment state, **WHEN**
   returning Home renders, **THEN** group cards appear before secondary tools
   and no contextual prompt appears.
4. **GIVEN** several open groups with pending states, **WHEN** Home derives its
   presentation, **THEN** exactly one deterministic highest-priority prompt is
   selected and it only opens the cited group.
5. **GIVEN** a receipt-specific intent, **WHEN** the participant chooses Catch,
   **THEN** the receipt-first screen retains its existing draft-only behavior.
6. **GIVEN** invitation, payer, recovery, contact, or bounded-action URL state,
   **WHEN** the app starts, **THEN** that deep route still wins over generic
   entry intent.
7. **GIVEN** group setup/signing fails or reloads, **WHEN** the participant
   retries, **THEN** the exact local group draft survives and no unauthorized
   group is created.

## Visual thesis and screenshot acceptance

Use a quiet, familiar homebase: clear ChopDot identity, generous neutral space,
one strong action only when the state warrants it, readable group cards before
secondary tools, pink as action emphasis rather than page decoration, and no
dashboard statistics or infrastructure panels.

Production-entrypoint screenshots SHALL be captured under ignored
`test-results/` for:

- first visit at 390x844 and 1280x900;
- empty Home at 320x700 and 390x844;
- returning Home with group cards at 390x844 and 1280x900;
- returning Home with one contextual prompt at 390x844;
- explicit Catch at 390x844; and
- failed group setup with preserved draft at 390x844.

Acceptance criteria: one visible H1, no horizontal overflow, no clipped primary
action, minimum 44px interactive targets, clear keyboard focus, group cards
before the contextual prompt, no more than one visible primary action, and no
Product Account, host, adapter, chain, personhood, protocol, or state-machine
language. Screenshots are review inputs, not self-approval.

Fixture limitation: the historical `candidateBatch5HardStatesApp` Dinner-loading
fixture currently fails production-authority startup before its guest action.
It remains unmodified and is not evidence for this package; reduced-motion
coverage runs through the real production entrypoint instead. Repairing or
retiring that fixture belongs to its owning assurance package.

## Scope in

- Welcome presentation and entry intent.
- App entry-intent routing through guest setup.
- Pure deterministic Home presentation derivation and focused tests.
- Empty/returning Home hierarchy and CreateGroup presentation copy.
- The nine active Playwright specifications whose generic entrance/Home
  assertions encode the superseded universal receipt action.

## Scope out

- Product cards, generated Cockpit/wiki/evidence, authority services, money or
  membership events, receipt parsing, deep-link semantics, deployment, commit,
  push, or visual acceptance.

## Loop contract

- **Expected outcome:** first-time, empty-Home, returning-Home, and explicit
  Catch states each expose their own understandable action without changing
  signed authority.
- **Proof:** pure presentation tests, focused production-entrypoint Playwright,
  lint/typecheck, and ignored real screenshots at declared viewports.
- **Failure:** a universal receipt action remains, start-group intent is lost,
  group cards are subordinated, multiple prompts appear, a deep link regresses,
  shared truth mutates before signing, or any declared viewport/accessibility
  criterion fails.
- **Owner:** product-experience implementation owner; independent visual and
  product review remains required.
- **Retry:** repair the smallest state derivation, routing, copy, or layout
  hypothesis, then rerun its focused test plus the full nine-spec regression.
- **Exit:** focused Node and Playwright checks are green, screenshots are
  captured from `src/main.tsx`, no protected authority source changed, and the
  package is explicitly reported as local-only and not visually accepted.

## Documentation impact

This plan is the only required source-document update. Product cards, generated
views, wiki, and ADRs remain unchanged because the package implements existing
DEC-007, DEC-009, DEC-010, DC-001, and DC-007 rather than changing them.
