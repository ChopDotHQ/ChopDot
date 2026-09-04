# Journey 11 — Visual and Journey QA

## Inherited Golden references

Home V1.4, Create Group V2, Invite / Join V1, Group Home V1, Add Expense V1, Review / Correct Expense V1.1, Review / Agree V1.1, and Overall Position V1.

## Rendered viewports

- 393 × 852
- 430 × 890

## Automated checks

- 56 explicit states
- 203/203 internal links resolve
- no duplicate IDs
- 96 representative state/viewport renders
- zero horizontal overflow
- zero header/content/footer overlap
- zero clipped settlement rows
- no Unicode or emoji placeholder icons
- no review-only copy leaked into user-facing screens
- Nina-specific avatar semantics passed

## Visual inspection

Reviewed directly:

- default settlement
- payment methods
- TWINT review
- bank review
- wallet quote and wallet review
- partial payment
- group person selection
- currency selection
- open issue
- missing payment details
- balance changed
- payment cancelled
- quote expired
- Golden comparison

## Defects found and fixed

1. Three group/currency links initially pointed to missing states.
2. Nina-specific settlement screens inherited Jeanine's `JA` initials.
3. The default wallet balance was lower than the amount required.
4. Wallet cancellation was missing.
5. Quote expiry was missing.
6. A review-only link leaked into the wallet surface and was removed.

## Above-the-fold copy audit

The default settlement contains only the approved task, person, amount, readiness, method, full-balance choice, Continue, and Cancel labels. No explanatory paragraph appears in the first viewport.

## Intentional deviations

- Global tabs are absent inside the focused settlement flow.
- External methods end at a Journey 12 handoff rather than simulating completion.
- Wallet and fiat details are prototype examples, not live financial instructions.

## Verdict

**Golden Candidate — ready for user review.**
