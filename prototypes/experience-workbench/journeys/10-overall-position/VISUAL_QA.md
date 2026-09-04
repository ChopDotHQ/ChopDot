# Journey 10 — Visual and Journey QA

## Inherited Golden references

- Home V1.4
- Create Group V2
- Invite / Join V1
- Group Home V1
- Add Expense V1
- Review / Correct Expense V1.1
- Review / Agree V1.1

## Rendered viewports

- 393 × 852
- 430 × 890

## Automated checks

- 34 explicit states
- 171/171 internal links resolve
- no duplicate IDs
- 36 final representative state/viewport renders
- zero horizontal overflow
- zero header/content/footer overlap
- zero clipped card rows
- center expense icon constrained to 23 × 23
- no Unicode or emoji placeholder icons

## Visual inspection

Reviewed directly:

- People view
- Groups view
- Jeanine same-currency offset
- Marc owed-to-you detail
- mixed currencies
- estimated position
- one person across two currencies
- balance-may-change
- owe-only
- owed-only
- all-square
- empty
- offline
- loading
- all journey handoffs

## Defects found and fixed

1. Center expense icon inherited no size and rendered oversized.
2. Mixed-currency cards collapsed into each other.
3. `May change` initially used a success checkmark.
4. Full-width plus signs introduced inconsistent spacing.
5. `Netted` and `cross-currency net` were too technical.

## Golden comparison

Passed:

- locked root frame and bottom navigation;
- Home typography, spacing, cards, and financial colors;
- Group Home row and state language;
- Lucide-style icon geometry;
- personal impact before secondary detail;
- restrained use of Polkadot pink;
- concise, non-banking copy.

## Intentional product choices

- People is the default balance view.
- Net is never shown without gross obligations.
- Same-currency balances may offset across groups.
- Different currencies remain separate.
- Estimates are optional and visibly approximate.
- Open issues affect only the relevant balance.
- Settlement and payment requests are separate journeys.

## Verdict

**Golden / Design Approved — approved September 4, 2026.**
