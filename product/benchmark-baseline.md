# ChopDot conventional group-money benchmark baseline

**Kind:** guardrail
**Status:** active
**Owner:** product-research
**Last reviewed:** 2026-08-27
**Applies to:** `chopdot-v1-launch`
**Authority:** dated category-floor input only; it cannot select priority, change product law, or claim implementation, deployment, adoption, or parity
**Schema:** `chopdot.product-benchmark-baseline.v1`
**Evidence grade:** stale `E1-public-source`; inferred `E0-discovery`; `E2-hands-on` open

## 1. Purpose and use

This is the launch worktree's single conventional group-money benchmark source.
It consolidates the existing public-source competitor lane, scenario
scorecards, 10x thesis, source-backed capability matrix, and bounded user-
feedback review without treating another checkout as current launch authority.

Every user-facing product package is composed in this order:

```text
applicable category baseline outcomes
-> a named ChopDot differentiated outcome
-> bounded experiments that may fail or be removed
```

The baseline is job- and state-specific. It does **not** select a universal
first action. A person starting a group, responding to an invitation, capturing
a spend, making a contribution, confirming receipt, or recovering on a new
device has a different job and may see a different one obvious action.

Cards cite the stable IDs below through `benchmark_requirements` and also name
their `delivery_phase`, `differentiated_outcome`, and
`benchmark_evidence_state`. A card may mark an outcome not applicable only when
its actor, state, and job make the outcome irrelevant and the reason is
explicit. A differentiator or high product score cannot compensate for a
missing applicable baseline outcome.

## 2. Evidence grades and current boundary

| Grade | Meaning | What it can prove |
|---|---|---|
| `E0-discovery` | Registry, third-party mention, or unverified lead | A candidate to investigate only |
| `E1-public-source` | Official product, store, or support material | A publicly stated capability or workflow, not its real usability |
| `E1-anecdotal` | Bounded reviews, forums, or user commentary | A pain hypothesis, not demand or product proof |
| `E2-hands-on` | Same-task walkthrough on a real current product/device | Observed steps, friction, errors, and outcome for that version and context |
| `E3-chopdot-proof` | ChopDot production-entrypoint and real-user evidence | A bounded ChopDot outcome; it does not prove competitor parity unless compared on the same task |

This baseline is currently **E1 only**. No requirement below has completed the
planned E2 same-task competitor walkthrough. Prior local ChopDot tests mentioned
in the source packet are historical observations and are not accepted here as
current `E3-chopdot-proof`.

The official-source evidence was gathered on 2026-05-14 and refreshed in part
on 2026-06-23. On 2026-08-27 it is useful as a historical floor and E2 queue,
but it is stale for claims about current pricing, limits, exact steps, platform
support, or present-day superiority. Re-open the official sources before a
benchmark-dependent card is accepted or a release claims parity.

## 3. Provenance

The tracked source files were observed in the canonical checkout on branch
`codex/chopdot-agentops-bridge-docs` at commit
`2f28c1e425a8fc2b8e01dd37a3032746b92d80cb`. The canonical checkout was dirty,
but each of these three paths matched its `HEAD` blob exactly when observed:

| Source observed on 2026-08-27 | SHA-256 | Evidence role |
|---|---|---|
| `/Users/devinsonpena/ChopDot/docs/chopdot-dot/competitor-app-research-lane-2026-06-23.md` | `432b5b016c2a72da72a78092cd81cacfd27ec7e0203f52fc7591152cd46038bf` | E1 competitor/null set, source index, and E2 protocol |
| `/Users/devinsonpena/ChopDot/docs/chopdot-dot/competitor-scenario-scorecards-2026-06-23.md` | `9c080d2b0f1185fbed84877df9f78e78a0228522ce8f6705c0b1af2437995e15` | E1 same-scenario threat and opportunity scorecards |
| `/Users/devinsonpena/ChopDot/docs/chopdot-dot/chopdot-10x-experience-thesis-2026-06-23.md` | `385c75518a873282904ad6e55e2f66b7d9849b2606a7b5108d8ab271c6051db4` | Dated candidate differentiation thesis and falsifiers |
| `/Users/devinsonpena/ChopDot/docs/chopdot-dot/competitive-gap-decisions-2026-06-23.md` | `7de1e381b80ed666bf8adfaf6cfa22a8a71e4d4939a5b7f5b1a220af8d2c95c3` | Historical receipt-first and stop-modes priority decision; explicitly superseded by DEC-009 and DEC-010 |

Two machine-local research inputs were also observed. They are supporting
evidence, not Git-backed launch authority:

| Local source observed on 2026-08-27 | SHA-256 | Evidence role |
|---|---|---|
| `/Users/devinsonpena/ChopDot/.local-private/chopdot-architecture-os/taxonomy-wiki/COMPETITOR_CAPABILITY_MATRIX_SOURCE_BACKED_2026-05-14.csv` | `97b39dec8356cf05e304a2030a7841fd3c0707d7be8ee25a0cc0a08f64812659` | Source-backed capability claims and URLs |
| `/Users/devinsonpena/ChopDot/.local-private/chopdot-architecture-os/taxonomy-wiki/COMPETITOR_USER_FEEDBACK_REVIEW_2026-05-14.md` | `cf0a5dc3c5099e672224ce12d8e4432a6a79e3adc14319212fb5374030c38f83` | E1-anecdotal pain hypotheses |
| `/Users/devinsonpena/ChopDot/.local-private/chopdot-architecture-os/taxonomy-wiki/USER_FACING_COPY_DECISION_AFTER_COMPETITOR_REVIEW_2026-05-14.md` | `fbbe9c360c54bcf7a3d7d97b770fc22f42d078cc500ff767794b3f154200ebda` | Dated category-language decision input |
| `/Users/devinsonpena/ChopDot/.local-private/chopdot-architecture-os/taxonomy-wiki/COMPETITOR_TERMINOLOGY_MATRIX_2026-05-14.csv` | `84a66edf07d9fa872de6d25adcdc49e7d64cc443598383b9d7aa003553915e95` | E1 category-term/source matrix and risk labels |
| `/Users/devinsonpena/ChopDot/.local-private/chopdot-architecture-os/taxonomy-wiki/COMPETITOR_TERMINOLOGY_SOURCE_REVIEW_2026-05-14.md` | `f980fdf706f2dfc276f2ff3db930a3cc370d1c13b4709b605c1edd8d4429ae4d` | E1 terminology synthesis and proof-safe copy implications |

The earlier unsourced capability matrix
`COMPETITOR_CAPABILITY_MATRIX.csv` (`e94d454152bf55dad90834f8890b8478677ba1402f06d59b3fc75626662b7bef`)
and terminology research queue
`COMPETITOR_TERMINOLOGY_RESEARCH_QUEUE.md` (`3f472470cb28959214581afee23bcd646125a1191d56ba4f21ce737d22e4958d`)
are discovery inputs superseded for current decisions by the dated
source-backed successors above. They cannot re-open receipt-first priority,
stop the named modes, or supply current evidence.

The conclusions needed by the launch worktree are reproduced below so product
judgment no longer depends on resolving those machine-local paths.

## 4. Familiar category-language floor

The stale E1 terminology review shows that people already encounter these
plain category terms: `group`, `add expense`, `who paid`, `who owes`, `split`,
`balance`, `settle up`, `payment request`, `mark as paid`, `payment added`,
`recipient confirmed`, `group summary`, `close group`, `needs review`,
`reimbursement`, `activity`, and `history`.

These terms are a dated copy-testing floor, not mandatory copy or proof that
users understand ChopDot. Use the shortest accurate term for the bounded state
and keep the authority distinction visible: `mark as paid` is a participant
claim; `payment added` is a record; `recipient confirmed` is receiver action;
`closed` is group state, not legal or banking finality. Advanced
admin/business states may use `submit`, `review`, `approve`, `reimburse`, and
`report` only when the role and authority actually exist.

Reject internal replacements such as `closeout snapshot`, `receiver
observation`, `commitment frontier`, host, adapter, chain, or protocol language
in normal flows unless a bounded advanced surface is separately approved and
tested. Refresh this language floor through E2 comprehension testing before
claiming that it is current or clearer than a comparator.

## 5. Strongest conventional and null workflows

| User job | Strongest comparator or null | Evidence state | What it sets as the floor | E2 state |
|---|---|---|---|---|
| One-off dinner | Splyt; TWINT/Venmo where shared; chat + calculator + payment request null | Apps `E1-public-source`, stale; null `E0-discovery`, inferred | Near-zero setup, receipt or payment-moment capture, a simple friend action | Not executed |
| Trip or event | Splitwise, Tricount, Splid; chat + spreadsheet null | Apps `E1-public-source`, stale; null `E0-discovery`, inferred | Fast repeated entry, groups, balances, multi-currency, low-connectivity return | Not executed |
| No-account participation | Kittysplit and Splyt-style links | `E1-public-source`, stale | A friend understands and completes a bounded action without learning the whole product | Not executed |
| Same-rail settlement | TWINT, Venmo, Revolut, Wise | `E1-public-source`, stale and region-dependent | Prefilled request or payment inside a rail people already trust | Not executed |
| Pay-and-split at source | Cino/shared-card model | `E1-public-source`, stale | Nobody fronts the whole bill; strongest future user model with greater partner/regulatory cost | Not executed |
| Household or couple | Splitwise/Tricount-style recurring group; chat + banking-app null | Apps `E1-public-source`, stale; null `E0-discovery`, inferred | Recurring entries, understandable balances, external reimbursement, returnable history | Not executed |
| Savings circle | Private chat + bank transfers + memory or spreadsheet | `E0-discovery`, inferred null; conventional-app weakness is stale `E1-public-source` | Known order, visible contributions, delay handling, payout record | Not executed |
| Emergency support | Private chat + payment link/bank transfer | `E0-discovery`, inferred null; conventional-app weakness is stale `E1-public-source` | Speed, dignity, minimal disclosure, clear recipient and amount | Not executed |
| Community fund | WhatsApp/chat + spreadsheet + bank account | `E0-discovery`, inferred null; conventional-app limits are stale `E1-public-source` | Contributions, decisions, releases, reporting, and treasurer handoff | Not executed |

The null workflow is a real competitor. If ChopDot is slower than chat plus the
group's existing payment rail and does not create a clearly better outcome,
the feature fails its benchmark.

## 6. Stable baseline requirements

`Treatment` means:

- `must-match`: cover the familiar job at least as clearly as the strongest
  relevant comparator;
- `must-exceed`: match the familiar job and prove the named ChopDot trust or
  completion improvement;
- `mode-baseline`: cover the null workflow before claiming the mode is usable.

| ID | Expected user outcome | Conventional/null evidence | Evidence state | E2 status | Treatment and ChopDot obligation |
|---|---|---|---|---|---|
| BASE-ENTRY-01 | Understand what this bounded visit is for and reach the first useful state without unnecessary account or wallet ceremony. | Kittysplit no-registration links; Splyt no-app friend action; chat/payment-link null. | Apps `E1-public-source`, stale; null `E0-discovery`, inferred. | Not executed. | `must-match`: use one contextual action for the observed state; require identity only when the consequential authority change needs it. |
| BASE-GROUP-01 | Create a group, invite or join intentionally, see the participants, return later, and leave or remove someone through the appropriate role. | Splitwise, Tricount, Settle Up, Splid, Venmo Groups; chat-group null. | Apps `E1-public-source`, stale; null `E0-discovery`, inferred; detailed lifecycle requires E2. | Not executed. | `must-exceed`: keep familiar group entry and lifecycle while separating verified contact, membership, organizer authority, account, wallet, and personhood. |
| BASE-EXPENSE-01 | Add an expense or obligation, choose payer/participants, edit a draft, and correct a mistake without losing the understandable result. | Splitwise, Tricount, Settle Up, Splid, Splittr, Venmo Groups. | `E1-public-source`; current-market refresh required. | Not executed. | `must-match`: preserve simple entry; consequential corrections append history rather than silently rewriting accepted truth. |
| BASE-CAPTURE-01 | When the state includes a receipt or transaction, capture it by photo/import/link and correct the resulting draft; manual entry remains available where useful. | Splyt and receipt splitters; Splitwise Pro; Revolut transaction split; TapTab/OurTab. | `E1-public-source`; current-market refresh required. | Not executed. | `must-match` when applicable: automation assists a reviewable draft and never becomes a universal entrance or unreviewed authority. |
| BASE-SPLIT-01 | Allocate an amount using the split methods relevant to the group and see exact totals before acceptance. | Splitwise and Tricount custom splits; Venmo editable split; receipt item claims. | `E1-public-source`; exact method coverage needs refresh. | Not executed. | `must-match`: equal, amount, share, percentage, or item allocation is adopted only where the compared job requires it; exact totals and currency are mandatory. |
| BASE-STATUS-01 | See who owes, who needs to act, what is waiting, and whether the person is done without reading an admin dashboard. | Splitwise balances; Venmo group summary; Splittr next payer; payment-app pending requests. | `E1-public-source`; current-market refresh required. | Not executed. | `must-exceed`: show one role-appropriate action and preserve distinct requested, claimed, observed/cleared, confirmed, approved/released, and closed meanings without jargon. |
| BASE-PAY-01 | Request, hand off, perform, or record payment using a method the group already understands, with an honest result afterward. | TWINT, Venmo, Revolut, Wise, Splitwise payment integrations; external cash/bank-transfer null. | Apps `E1-public-source`, stale and region-dependent; null `E0-discovery`, inferred. | Not executed. | `must-exceed`: payment evidence affects only the exact matching leg; payer claim alone never closes a receiver's position. |
| BASE-EXCEPTION-01 | Handle partial, late, failed, waived, disputed, refunded, reversed, or forgotten activity without losing the original record or socially blaming someone. | Mature IOU/reminder tools; payment-app reminders; chat-negotiation null. | Apps `E1-public-source` plus pain hypotheses `E1-anecdotal`, both stale; null `E0-discovery`, inferred; detailed coverage incomplete. | Not executed. | `must-exceed`: humane recovery and append-only successor records remain understandable to every affected role. |
| BASE-CURRENCY-01 | Know the exact currency for every amount and handle a relevant multi-currency trip or group without ambiguous conversion. | Splitwise, Tricount, Splid 150+ currency claim, Wise/Revolut cross-border context. | `E1-public-source`; conversion and offline rules need refresh. | Not executed. | `must-match`: exact integer money and explicit currency; automatic FX is excluded unless separately governed and proved. |
| BASE-OFFLINE-01 | Continue an allowed local task under weak connectivity, reconnect without duplication, and understand what is still unsent or unconfirmed. | Splid offline groups; Splitwise offline-mode claim; chat/note local-capture null. | Apps `E1-public-source`, stale; null `E0-discovery`, inferred; device behavior not observed. | Not executed. | `must-exceed`: local encrypted projection, durable retry, dedupe, and convergence may not imply a remote participant received anything. |
| BASE-HISTORY-01 | Return later and understand what happened, what changed, what remains open, and what the group agreed. | Expense-app histories and balances; payment-rail transaction history; revisitable link/session nulls. | `E1-public-source`; closeout comprehension unknown. | Not executed. | `must-exceed`: readable participant-held history, receiver-confirmed closeout, immutable corrections, and stated proof limits. |
| BASE-EXPORT-01 | Save or share a readable group summary appropriate to the job without leaking sensitive material. | Splid PDF/Excel summary; Expensify reports; spreadsheet null. | Apps `E1-public-source`, stale; null `E0-discovery`, inferred; exact current formats need refresh. | Not executed. | `must-match`: redacted export and support bundle; export never upgrades a claim into payment, legal, or public truth. |
| BASE-ACCESS-01 | Complete the job on relevant mobile/desktop sizes with understandable language, keyboard/touch access, privacy, and no visible infrastructure coaching. | Lightweight web/app competitors and no-app links establish a low-friction expectation. | `E1-public-source`; accessibility evidence largely unknown. | Not executed. | `must-exceed`: plain category language, minimum disclosure, responsive/accessibility proof, and no chain/host/protocol UI. |
| MODE-SPEND-01 | Match a transaction and receipt, review mismatch/duplicate/late receipt, handle refund or reversal, then return to a normal group record. | Revolut transaction split, Cino shared-card model, receipt-first tools; manual card statement + chat null. | Apps `E1-public-source`, stale; null `E0-discovery`, inferred; no same-task walkthrough. | Not executed. | `mode-baseline`: transaction/receipt coordination only; no claim that ChopDot issues a card, holds money, or owns the bank transaction. |
| MODE-SAVINGS-01 | Agree rules and order, contribute, handle delay/default, record and confirm payout, advance exactly once, replace/exit/recover, and export the cycle. | Conventional split apps are weak; private chat + bank transfers + spreadsheet/memory is the strongest inferred null. | Comparator weakness `E1-public-source`, stale; null `E0-discovery`, inferred. | Not executed. | `mode-baseline`: make the existing social process clearer; no guaranteed payout, credit, automatic debit, or custody claim. |
| MODE-EMERGENCY-01 | Request help privately, apply trusted approval, contribute, record release, confirm/dispute, recover safely, and retain a redacted record. | Conventional split apps are not purpose-built; private chat + payment link/bank transfer is the strongest inferred null. | Comparator weakness `E1-public-source`, stale; null `E0-discovery`, inferred; privacy outcome untested. | Not executed. | `mode-baseline`: speed, dignity, bounded disclosure, and explicit authority; no public donor wall or exposed reason by default. |
| MODE-COMMUNITY-01 | Define roles, contribute, propose, decide by the agreed threshold, release, confirm, hand off stewardship, and report/export. | Split apps cover ledger fragments; chat + spreadsheet + bank account is the strongest inferred null. | Comparator limits `E1-public-source`, stale; null `E0-discovery`, inferred; governance outcome untested. | Not executed. | `mode-baseline`: familiar treasurer workflow plus bounded approval history; no organizer bypass, token-governance theatre, custody, or guaranteed release. |

## 7. Candidate ChopDot differentiation

These are either product-law consequences or dated candidate advantages. They
still require production and real-user proof:

- `claimed != received/cleared != approved/released != closed` while the UI
  remains simple;
- receiver confirmation or exact matching finalized evidence closes only the
  matching payment leg;
- exact integer money and append-only corrections;
- participant-held signed history instead of invisible server authority;
- one shared authority core across normal pots, Spend Card, savings circles,
  emergency pots, and community funds;
- humane exception handling without public blame;
- privacy-appropriate redaction and minimum disclosure;
- encrypted delivery, revocation, fresh-device recovery, and social re-grant;
- cross-rail coordination that preserves cash, bank, TWINT, payment links, and
  other group habits;
- readable closeout and return-to-record without exposing infrastructure.

The differentiator fails if users need more coaching, take longer, or understand
less than with the strongest relevant conventional or null workflow.

## 8. Experiments and explicit omissions

Until promoted by named evidence, receipt OCR, automatic item extraction,
novel payment rails, proof of personhood, host-specific recovery, and new mode
entrances are experiments. An experiment may improve an applicable baseline;
it may not replace it.

This baseline deliberately does **not** require or authorize:

- one universal first action or receipt-first Home;
- every competitor feature on every route;
- account, wallet, or personhood ceremony before a low-risk first useful state;
- automatic acceptance of OCR, imported transactions, or payment claims;
- card issuing, custody, escrow, automatic debit/FX, credit, yield, or guaranteed
  payout in this release train;
- public emergency reasons, recipients, or donor walls;
- token-governance theatre or organizer bypass;
- blockchain, host, adapter, protocol, or proof terminology in normal UI;
- implementation, test, release, adoption, pricing, or market-leadership claims.

## 9. E2 same-task queue and acceptance

For the strongest relevant comparator and null workflow, use the same actor,
state, data, device class, and job:

1. enter from a realistic first-use state;
2. reach the first useful group state;
3. add or capture the relevant expense, contribution, or proposal;
4. involve a participant who has not used the product;
5. perform or record the money action;
6. handle one correction or exception;
7. confirm or close only through the appropriate authority;
8. return later and explain the final state;
9. repeat under weak connectivity and on another device where applicable.

Record time, screens/actions, coaching, failures, disclosures, state
comprehension, accessibility blockers, and return-to-record quality. Then run
the same scenario through ChopDot's production entrypoint. A requirement passes
only when its evidence names the exact product version, environment, actor
state, result, and artifact.

Failure is useful evidence: record the loss, keep the card open or narrow its
claim, and repair the responsible outcome. Do not promote an E1 row to E2 or
E3 because a fixture, selector, unit suite, product score, or internal scenario
passed.

## 10. Primary-source register

These URLs were present in the E1 packet when observed. They have not been
re-opened in this consolidation and therefore require freshness review:

- Splitwise: <https://www.splitwise.com/>,
  <https://feedback.splitwise.com/knowledgebase/articles/1088920-how-do-i-use-splitwise>,
  <https://feedback.splitwise.com/knowledgebase/articles/2010350-why-am-i-seeing-an-expense-limit>
- Tricount: <https://tricount.com/expense-tracker-features>,
  <https://help.tricount.com/articles/tricount-faqs>
- Settle Up: <https://settleup.io/>
- Splid: <https://splid.app/english/>
- Splittr: <https://splittr.io/>
- Kittysplit: <https://kittysplit.com/>
- Splyt: <https://www.splyt.co/>
- Venmo Groups: <https://help.venmo.com/cs/articles/setting-up-a-group-vhel106>,
  <https://help.venmo.com/cs/articles/settling-up-group-expenses-vhel192>
- Revolut Group Bills:
  <https://help.revolut.com/en-US/help/transfers/internal-transfers/groups/>
- TWINT: <https://www.twint.ch/en/private-customers/payment/send-and-request-money/>
- Wise: <https://wise.com/help/articles/5ssvrNF7DSP8w8iLv1W1Cr/what-are-groups-and-how-do-i-use-them>
- Cino: <https://support.getcino.com/hc/en-us/articles/8016692003869-How-does-Cino-work>
- Expensify:
  <https://help.expensify.com/articles/new-expensify/reports-and-expenses/Split-Expenses>
- TapTab and OurTab: <https://www.tapthetab.com/>, <https://ourtab.app/>

## 11. Review and exit contract

- **Expected outcome:** every active user-facing card cites its applicable
  baseline IDs, names one differentiated outcome, preserves experiments as
  hypotheses, and exposes its evidence grade.
- **Proof:** deterministic card validation, fresh E1 source checks, E2 same-task
  artifacts, production-entrypoint evidence, and real-user comprehension.
- **Failure:** missing, stale, or weaker-than-null baseline evidence blocks the
  affected product-acceptance claim; it does not silently select another
  priority or product direction.
- **Owner:** product research owns source freshness and E2 comparison; product
  owns the experience; independent product assurance accepts the result.
- **Exit:** all applicable rows for a bounded journey have current evidence and
  the named ChopDot differentiation improves trust or completion without
  reducing baseline clarity.
