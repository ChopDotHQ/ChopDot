# Journey 07 — Visual and Journey QA

## Inherited Golden references

Home V1.4, Create Group V2, Invite / Join V1, Group Home V1, Add Expense V1, and Review / Correct Expense V1.1.

## Rendered viewports

- 393 × 852
- 430 × 890

## Automated checks

- 61 explicit states
- 176/176 internal links resolve
- no duplicate IDs
- 44 representative state/viewport renders
- zero horizontal overflow
- zero header/content/footer overlap
- no Unicode or emoji placeholder icons
- icon/avatar alignment audit passed
- alternate issue paths retain the correct reason, person, and expense

## Actual visual inspection

Reviewed the queue, default review, reasons, note, issue sent, waiting, owner issue, owner reply, member reply, changed-after-review, caught-up success, offline, settlement blocked, and Train Tickets question path.

## Defects found and fixed

1. Broad text selectors overrode icon/avatar grid alignment.
2. Queue, reason, status, reviewer, and message icons were present but optically misaligned.
3. Every issue reason initially collapsed into `My share`.
4. Train Tickets issue paths incorrectly returned to Dinner/Marc context.
5. Alternate reason paths now preserve the correct semantic result.

## Intentional choices

- `Looks right` replaces technical confirmation language.
- `Something's off` replaces dispute language.
- There is no blind `Confirm all`.
- Open issues block settlement in this candidate.
- Global tabs are omitted inside the focused review loop.

## Verdict

**Golden Candidate — ready for user review.**
