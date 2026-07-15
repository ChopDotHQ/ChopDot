# AI Product Management Adoption Map

Status: `active`
Visibility: `private-local`
Created: 2026-06-27

This document turns the AI product-management source material into ChopDot operating rules.
It is not a book summary. It is the translation layer between AI PM practice and how ChopDot should actually build.

## Source Synthesis

The AI PM material adds five useful disciplines that ChopDot did not enforce strongly enough:

1. **AI starts with problem fit, not model excitement.**
   Use AI only when it reduces a real step in `Catch -> Management -> Payout -> History`.

2. **AI outputs are probabilistic.**
   Every AI feature needs confidence, review, fallback, and a clear owner for correction.

3. **False positives and false negatives have product costs.**
   For ChopDot, a false positive can create a wrong split or wrong receiver; a false negative can force manual correction. The product must say which risk is worse for the journey.

4. **Human-in-the-loop is a design pattern, not a disclaimer.**
   Mina can review captured receipt details before payment links are sent. The app should make review fast, not make the user do the original work manually.

5. **AI features need monitoring after launch.**
   Screenshots and selectors are not enough. We need correction rate, user override rate, failed capture rate, and drift notes.

## Comparison To ChopDot's Current Way

| AI PM practice | ChopDot already has | Gap to close |
| --- | --- | --- |
| Start with user problem | Product spine and product gate | Add AI-specific falsifier before implementation |
| Data and model lifecycle | Product cockpit and evidence levels | Add AI error/correction metrics |
| Precision/recall tradeoff | Trust semantics | Name the worse failure per feature |
| Human-in-the-loop | Confirm received and close record | Require review before AI-created shares become payment links |
| Responsible AI | Privacy and non-custody posture | Add sensitive-data and hallucination checks |
| Deployment/monitoring | Agent tests and screenshots | Add AI capture observability and drift log |

## ChopDot AI Feature Gate

Every AI-assisted product feature must add this block to its card, decision contract, or implementation plan:

```text
AI fit:
- User job:
- AI reduces:
- Non-AI fallback:
- Human review point:
- Confidence shown as:
- False positive cost:
- False negative cost:
- Sensitive data touched:
- Correction path:
- Success metric:
- Drift/monitoring signal:
- Rollout level: lab / local / pilot / production
```

Hard rule:

```text
AI may draft, extract, suggest, or prefill.
The user confirms before ChopDot sends payment links, marks money as received, or closes a record.
```

## Product Rules We Should Code

1. **Photo/link/import first.**
   A normal capture UI cannot start with a blank textarea for receipt or chat parsing.

2. **Manual entry is a fallback.**
   It can appear only after capture fails, or as a correction path after ChopDot has inferred something useful.

3. **AI output must be reviewable.**
   The user sees amount, merchant/context, payer, people, split, and confidence/correction affordances before sharing.

4. **AI confidence must not be theatrical.**
   If confidence is unavailable, use plain states: `Needs review`, `Looks ready`, `Could not read`.

5. **No hidden money truth.**
   AI extraction can create a draft split. It cannot confirm payment, receiver arrival, or close the record.

6. **Sensitive records default private.**
   Emergency reasons, names, notes, and payment details must not appear in normal receipts unless the user explicitly chooses a private full copy.

## Immediate ChopDot Changes

- Restore product cockpit npm scripts so the AI-PM loop can run without remembering raw node commands.
- Add `product:ai-pm:validate` to check the process guardrails.
- Treat `SmartScanModal` as known debt until it is removed or replaced with photo/link/import-first capture.
- Promote `P-012 Receipt capture without manual-first entry` only after screenshots prove capture starts from photo/link/import/amount, not pasted text.

## What Not To Copy From The Books

- Do not create a heavyweight MLOps program before the product journey is validated.
- Do not add analytics dashboards before the capture flow is usable.
- Do not expose model language, confidence theory, or AI lifecycle terms in normal UI.
- Do not let AI parsing become the product. ChopDot's product truth remains who owes, who paid, who received, what is open, and what can close.

