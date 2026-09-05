# Journey 12 — Visual and Journey QA

## Inherited Golden references

Journey 12 inherits the Journey 11 V1.1 frame, typography, cards, payment status rail, icon language, semantic colors, focused footer, and short human copy. Journeys 1–11 remain unchanged.

## Rendered viewports

- 393 × 852
- 430 × 890

## Structural checks

- 67 explicit states
- 194/194 internal links resolve
- no duplicate IDs
- 65/65 primary actions carry internal event and authority mappings
- no visible banned architecture terms
- no placeholder glyph icons

## Browser QA

- 88 representative state/viewport renders in the main pass
- zero horizontal overflow
- zero header/content/footer overlap
- zero clipped cards or rows
- fixed action footer remains visible
- center content scrolls independently when needed

## Visually reviewed sequences

- TWINT return → Sent → Waiting → Receiver confirms → Received → Complete → Updated balance
- Bank transfer waiting and confirmation
- Cash/manual confirmation
- Wallet approval → Submitted → Checking → Received → Complete
- Wallet result unknown → Recovering
- Partial payment → Remaining balance
- Receiver reports a different amount
- Failure → replay-safe retry
- Offline saved status
- Existing payment already open
- Recipient says not received
- Issue opened after send
- Payment reversal
- Saved record still materializing

## Defect found and fixed

Receiver issue rows initially collapsed title and supporting text into one line. The shared method-row text and icon sizing rules were corrected in Journey 12 only, then both target sizes were rerendered.

## Golden consistency comparison

Passed:

- same cool-gray background and white surfaces;
- same card radii, borders, shadows, and fixed frame;
- same compact header and footer hierarchy;
- same Lucide-style stroke icons;
- blue for started/sent, amber for waiting, green for received/complete, red/pink for failure or required recovery;
- same amount and personal-impact hierarchy;
- no provider-specific redesigns;
- no technical architecture copy in normal UI.

## Intentional distinction

Journey 12 is status-led rather than selection-led. It therefore uses Journey 11’s payment-status card and rail as its dominant pattern while preserving the same visual system.

## Verdict

**V1 Golden Candidate — ready for user review.**
