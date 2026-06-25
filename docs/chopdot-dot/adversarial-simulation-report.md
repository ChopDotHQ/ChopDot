# ChopDot.dot Adversarial Simulation Report

Generated from `src/chopdot-dot/simulationAgents.ts` and the clickable lab at `/?chopdot-dot-lab=1`.

Latest hardening pass: 2026-06-19.

## What Was Tested

The simulations used explicit product agents to run the first three `ChopDot.dot` modes end to end. The new clickable lab then made those people act through the real UI surface with local fake test tokens.

| Mode | Agents Simulated | Result |
| --- | --- | --- |
| Savings circle | Organizer, viewer, members, payer, closeout agent | Closed cleanly with one missed contribution annotated. |
| Emergency pot | Organizer, privacy viewer, contributor, approver, receiver, redacted closeout agent | Closed cleanly with redacted receipt defaults. |
| Community fund | Admin, reviewer, contributor, two approvers, payer, receiver, closeout agent | Closed cleanly after two approvals and receiver confirmation. |

The tests intentionally model the user-visible jobs:

- Catch: create the chapter, rules, people, obligations, and requests.
- Show: expose status, next actor, blockers, and closeout readiness.
- Move: claim contribution, confirm receipt, approve release, record external release, confirm receiver outcome.
- End: close the round, pot, or fund period with a receipt.

## Clickable Lab Added

The private lab now supports:

- mode selector for savings circle, emergency pot, and community fund
- active-person switching
- visible permissions and forbidden actions
- obligations, approvals, release state, blockers, and next actor
- fake `TEST_USD` / `TEST_USDC` evidence rail
- event history
- redacted receipt preview

The lab is private/local and does not use real wallets, custody, escrow, Supabase migrations, or live Polkadot rails.

## What Worked

The shared loop held across all three modes:

```text
claim != confirmation != approval != release != closed
```

That matters because the app can remain simple for users while staying honest underneath:

- A person claiming they paid does not mean the receiver confirmed it.
- An approval does not mean money moved.
- A payment/release claim does not close the chapter.
- A chapter can close cleanly only when blockers are gone.
- A chapter can close with open items only when the unresolved state is annotated.
- A completed fake test-token transfer supports a claim, but does not confirm the claim.

## Mode Findings

### Savings Circle

The simulation proved a round can support normal contribution tracking, a missed-payment note, payout approval, external payout claim, receiver confirmation, and a private closeout receipt.

Important product implication: the value is not "automatic savings." The value is that the group can see the round state without social chasing.

Best next UX surface:

- current round
- payout recipient
- who claimed contribution
- who the treasurer confirmed
- missed contribution policy
- ready/not-ready closeout state

### Emergency Pot

The simulation proved strict privacy mode can close with a redacted receipt that excludes participant names, the original emergency title, and sensitive reason text.

Important product implication: this mode must feel dignified and private by default. Public proof, donor walls, or permanent public details would undermine the product.

Best next UX surface:

- minimum necessary reason
- private contribution status
- approval readiness
- release confirmation
- redacted export preview

### Community Fund

The simulation proved a small fund period can track contributions, a release request, two approvals, external payment claim, receiver confirmation, and closeout.

Important product implication: this should feel like a handoff ledger for humans, not a DAO, bank, or treasury executor.

Best next UX surface:

- period status
- incoming contribution claims
- release requests
- approver state
- payer claim
- receiver confirmation
- handoff receipt

## Adversarial Checks

| Check | Risk Tested | Result |
| --- | --- | --- |
| Duplicate contribution claim | Same obligation gets spammed or double-counted. | Blocked. |
| Wrong person claims contribution | Participant claims someone else paid. | Blocked. |
| Release claim before approval | Payment is claimed before approval readiness. | Blocked. |
| Viewer claims release | Read-only actor records a payment claim. | Blocked. |
| Duplicate approval decision | One approver creates misleading repeated approvals. | Blocked. |
| Unrequired approver decision | Wrong actor pushes release forward. | Blocked. |
| Viewer records exception | Read-only actor hides blockers. | Blocked. |
| Negative obligation amount | Bad amount reverses meaning. | Blocked. |
| Clean close with missing contribution | Chapter closes while required work remains. | Blocked. |
| Open-item close without annotation | Organizer closes unresolved state with no explanation. | Blocked. |
| Viewer resolves dispute | Read-only actor erases contested item. | Blocked. |
| Emergency redaction | Sensitive emergency details leak into export. | Blocked. |
| Emergency open-item blocker redaction | Redacted receipt leaks names, private title, or payment reference through unresolved blocker text. | Found and fixed. |
| Second approver bypass | Payer records community fund release after only one required approval. | Blocked. |
| Missing UI actor coverage | A required contributor exists in the chapter but cannot act on the surface. | Found and fixed for Morgan in the emergency pot. |

## What Changed Because Of The Adversarial Pass

The kernel now rejects several behaviors that were too permissive for these modes:

- repeated contribution claims on the same obligation
- repeated approval decisions by the same approver
- negative or zero amounts
- release claims by viewers or unrelated participants
- exception notes from actors without organizer/treasurer authority
- dispute resolution by read-only actors

The clickable browser pass also found a product-surface gap: Morgan had a required emergency contribution but was not initially represented as a selectable person. That mattered because a real contributor would have been blocked by missing UI, not by policy. Morgan is now a first-class clickable contributor agent.

The 2026-06-19 hardening pass found one privacy-specific issue: even when the emergency receipt hid the title and people, unresolved blocker text could still carry private words from the live case. Redacted emergency receipts now replace blocker details with a generic private-review line, and the browser test checks that names, reason text, and payment references stay out of the exported receipt panel.

## Test-Token Findings

Fake tokens helped make the money behavior concrete without introducing custody:

- A contributor can click `Claim with test tokens`.
- The token rail records `pending`, `completed`, or `failed` evidence.
- A completed transfer changes the obligation to `claimed`, not `confirmed`.
- The blocker remains until the receiver, treasurer, or authorized actor confirms.
- A failed transfer stays visible and leaves the blocker in place.

This is the right posture for v1. The rail can explain what someone says happened, but it cannot become ChopDot truth on its own.

## Product Conclusion

The three expanded modes are viable as coordination-first products.

The strongest common product idea is not "Polkadot app." It is:

```text
Everyone can see what is open, who needs to act, what was confirmed, and what record closes the loop.
```

Polkadot should remain optional infrastructure until it makes one of those user-visible outcomes better:

- easier signing
- clearer payment lifecycle
- portable redacted receipt
- stronger final-record integrity
- lower wallet friction

## Remaining Risks

- The clickable lab is still seeded/local; it does not yet persist a real user session.
- The receipt model still summarizes counts more than money totals.
- Privacy needs field-level policy before real emergency or savings-circle use.
- Polkadot adapter labs still need separate evidence before any infrastructure promotion.

## Next Build Target

Next, use the private lab for human review:

1. Have a person click each mode without reading the docs.
2. Ask whether the next actor and blockers are obvious.
3. Tighten wording where people confuse claim, confirmation, approval, and closeout.
4. Only then decide whether Product SDK, Asset Hub, Product Account signing, or Bulletin improves the experience enough to add.
