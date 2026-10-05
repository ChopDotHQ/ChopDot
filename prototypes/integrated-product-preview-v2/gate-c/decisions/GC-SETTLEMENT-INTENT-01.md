# GC-SETTLEMENT-INTENT-01 — Settlement follows the user's goal

Date: 2026-10-03.

Status: User direction recorded; the earlier proposal for mandatory offset-first/FIFO application is not accepted. This record does not approve Gate C implementation or revise frozen schema/Golden/C1 authority.

## User direction

The user explained that someone may want to finish a group's debt, finish their debt with a person, or keep it going, and that the prototype should support those combinations with smart calculations where useful. This replaces the assumption that one global source-application policy should determine every settlement.

## Existing approved scope

Frozen J11 spec, `Scope rules` and `Amount rules`, already supports:

- Person settlement across eligible source groups for the same pair and currency, with source lineage available before payment.
- Group settlement through Group Home → Settle → Choose person → resolve exact source items → review.
- Full payment by default, or a partial payment showing paid-now amount, remaining balance, included items and need for later settlement.

Frozen source: `4ba456e6595330e4ca8e21366e0d827f17e10881:prototypes/experience-workbench/journeys/11-settle-up/spec.md`. Its exact copy is in the decision checkpoint. J10 permits offsets only within the same pair/currency; it requires the group-level path to remain visible.

## Interpretation for the prototype

Model separate choices for settlement scope and amount. Entering through a group preserves that group scope; entering through a person can resolve their eligible cross-group balance. Full/partial is an amount choice within the selected scope. Clearing a balance does not itself archive a group or prevent later expenses; a request for group closure remains a distinct lifecycle action, not an implicit consequence of payment.

For a group with several counterparties, keep the approved choose-person path and individual payment identities. This direction does not authorize multilateral debt reassignment, currency conversion or one atomic payment to several people.

Smart calculation may explain the net and propose how the chosen payment affects its included sources. It must not silently replace a selected group scope with the wider person scope. Before confirmation, show the proposed paid amount and residuals for affected groups, with original source lineage retained. Where a partial allocation is ambiguous, the application must reflect an explicit source choice or a reviewed suggestion; a pair-level number alone is insufficient authority for group residuals.

## Worked scope examples

Initial obligations for this pair in CHF: Apartment 74.30 owed by Devinson; Ski Trip 20.00 owed back by Jeanine.

| Selected goal | Payment | Apartment remaining | Ski Trip remaining | Pair net remaining |
| --- | ---: | ---: | ---: | ---: |
| Clear Apartment with Jeanine, no other group included | Devinson pays 74.30 | 0.00 | Jeanine owes 20.00 | Jeanine owes 20.00 |
| Clear the net debt with Jeanine across both groups | Devinson pays 54.30 | 0.00 | 0.00 | 0.00 |
| Pay part of Apartment only | Devinson pays 20.00 | Devinson owes 54.30 | Jeanine owes 20.00 | Devinson owes 34.30 |

The cross-group full-settlement row applies the approved same-pair/currency offset within the confirmed scope; the offset must remain traceable separately from cash paid. The table concerns this pair, not other participants' balances in either group. All changes require accepted exact closure; payment preparation, a sent claim or refresh does not establish them.

## Reviewed suggestion in the integrated prototype

The user endorsed the scope-first interpretation with “Exactly. Now we are thinking right”. The user direction establishes flexibility of intent; it does not select one mandatory attribution policy for every partial payment. The earlier `decision-checkpoint/DECISION.md` is historical and remains explicitly unapproved.

The implementation displays a suggestion using oldest recorded expense first. Before payment, the person can select source items, keep or apply included offset credits for a partial payment, and enter exact cash amounts against each remaining positive source. The preview updates immediately and rejects allocations that do not sum exactly to the chosen amount. The resulting source plan is frozen into that payment identity. It is a reviewed prototype suggestion, not a new frozen product law.

For a lower actual receipt, the prototype explicitly discloses that the received amount follows the displayed source order and cash limits. Applied offsets retain the chosen plan; only the confirmed cash amount changes positions on exact closure. Full net settlement includes offsets so all selected source residuals clear. No currency conversion, multi-recipient payment or automatic group archival is added. Tests and review receipts, rather than this decision text, establish the executed coverage.
