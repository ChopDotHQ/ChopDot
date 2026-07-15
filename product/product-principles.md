# ChopDot Product Principles

Status: `active`
Last updated: 2026-07-05

These principles govern product decisions, agent work, and readiness claims.

## 1. User Job Before Architecture

Start from a person, a job, and a group outcome. Do not start from a provider, adapter, protocol, or component.

The story map owns product sequence. The cockpit tracks execution; it does not decide the product direction.

## 2. Friction Down, Trust Up

Build only when the change reduces typing, setup, thinking, coordination, app switching, or social chasing while making the record clearer.

## 3. One Next Action

The first screen of a user journey should make one action obvious. If the screen feels like a dashboard, lab, ledger, admin panel, or protocol console, simplify.

## 4. Normal Language In Normal UI

Normal users should not see implementation terms such as evidence, rail, claim, kernel, adapter, obligation, chapter, test-token, raw JSON, protocol, native, host, or state machine.

Use user language: receipt, payment app, mark paid, confirmed received, waiting on, ready to close, saved record, payment link.

## 5. Receipt Capture Means Capture First

Receipt capture means photo, link, import, scan, or pasted checkout context first. Manual item entry is only a correction path after ChopDot has captured or inferred something useful.

## 6. Money Movement Should Matter

If money moved and ChopDot has a strong matching record, the exact payment item can be treated as paid or received according to the flow. Do not overcomplicate this with abstract group-agreement language.

The pot closes when all required items are paid, confirmed, delayed, waived, or annotated.

## 7. Polkadot Is Infrastructure

Polkadot-native capabilities should reduce friction or increase trust invisibly. Product SDK, Statement Store, Bulletin, Asset Hub, Coinage, `.dot`, and proof language belong in developer checks and proof reports, not normal UI.

## 8. Screenshots Beat Selector-Only Passing

Passing tests are necessary but not sufficient. User-facing changes require real app screenshots or agent/human observations tied to the relevant journey.

## 8.1 Premium Money App Reference

Use `product/design-references/kast-premium-money-app-2026-06-30/README.md` as the current visual-quality reference for "sleek, professional, and tight."

This does not mean copying the reference app's brand or product. It means matching its discipline:

- one screen, one job
- sparse first viewport
- one dominant bottom action
- compact labels and status instead of explanations
- no internal language leaks
- everything fits cleanly on mobile
- detail appears only after the user's intent is clear

If a ChopDot screen feels like a dashboard, ledger, form dump, lab, or process manual next to this reference, it fails visual review.

## 8.2 Effortless App Gate

Great ChopDot and ChopDot.dot screens should feel effortless because the work behind them is strict. Before adding or polishing a user-facing flow, confirm these six locks:

1. **Locked state model before UI polish**
   - The product truth is named before screens are designed.
   - For money flows, states such as paid, received, approved, released, delayed, waived, closed, and saved cannot overlap casually.
   - A visual pass cannot hide an unclear state model.

2. **Strict design system before new components**
   - Reuse existing ChopDot spacing, button, sheet, row, card, and typography patterns.
   - New components are allowed only when an existing pattern cannot carry the job.
   - Shape, spacing, and hierarchy drift are product bugs.

3. **Scope cuts before feature expansion**
   - Product management should remove options, screens, and explanations until one job remains obvious.
   - If a mode needs multiple first-screen explanations, the scope is too wide.
   - One complete journey beats several half-finished surfaces.

4. **Invariants before confidence**
   - Engineers must write tests around the product laws of the flow.
   - Examples: a receipt does not confirm money, the wrong person cannot confirm, a private emergency receipt cannot leak names, and a completed payment cannot close unrelated shares.
   - Passing visual review without invariant coverage is not enough.

5. **Fewer screens before more screens**
   - Designers should combine, cut, or defer screens unless a separate moment reduces friction or confusion.
   - A screen earns its place only when it gives one person one clearer action.

6. **QA clicks empty, error, payment, privacy, and close paths**
   - Agent and human review must click the uncomfortable paths, not only the happy path.
   - Empty states, wrong-person actions, failed payments, privacy boundaries, closeout, and return-to-record all need real UI evidence before promotion.

For ChopDot.dot specifically: Polkadot-native work must pass this gate before being exposed in normal UI. Native infrastructure can be powerful, but it must disappear behind a locked state model, one clear journey, and screenshot-proven usability.

## 9. Evidence Levels Stay Honest

Keep these separate:

```text
local-code
browser-agent
human-reviewed
testnet-payment
production-payment
blocked-live
```

Do not promote a journey beyond its evidence.

## 10. Human-Owned Final Decisions

Agents can draft, validate, summarize, and recommend. The final product call belongs to the human/operator.
