# ChopDot Product Principles

Status: `active`
Last updated: 2026-06-24

These principles govern product decisions, agent work, and readiness claims.

## 1. User Job Before Architecture

Start from a person, a job, and a group outcome. Do not start from a provider, adapter, protocol, or component.

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

