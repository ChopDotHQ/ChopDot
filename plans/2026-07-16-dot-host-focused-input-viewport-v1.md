# Dot Host Focused Input Viewport V1

## Change

`dot-host-focused-input-viewport-v1`

## Programme

Programme A - portable shell host proof.

## Current Truth To Preserve

- Source commit `07936cd` and evidence commit `85be5af` prove the same normal
  journey on web, Telegram profile, and the live Paseo `.dot` host.
- `CaptureSpend` owns draft input only; `ReviewSplit` remains the sole normal
  `ADD_EXPENSE` authority.
- Payment request, marked-paid, receiver confirmation, closeout, and saved
  summary semantics must not change.
- The main ChopDot root, P-025 worktrees, and P-026 worktree are owned by other
  tasks and must remain untouched.

## User Journey

I am Mina, I need to enter a spend inside ChopDot, so I can review the split
without the host chrome breaking the screen.

## One Next Action

`Review split`

## Product Gate

- Friction: 3/3
- Trust: 3/3
- Clarity: 3/3
- Language: 1/1
- Total: 10/10
- Decision: PASS

## Scope In

- Reproduce the focused-input `.dot` viewport/chrome shift.
- Measure wrapper scroll, iframe position, app viewport, and bottom-action
  reachability before and after focus.
- Apply the smallest host-safe fix at the correct ownership boundary.
- Add a regression assertion for stable framing and reachable bottom action.
- Regenerate and visually review the live `.dot` proof packet.

## Scope Out

- No money-state, reducer, payment-intent, wallet, or closeout changes.
- No main ChopDot merge or root edits.
- No receipt/OCR work.
- No Product Account, Statement Store, or Telegram client expansion.
- No host-wrapper code changes outside our repository.

## Requirements

1. Focusing amount or merchant/reason SHALL NOT leave the app visibly displaced
   after focus is dismissed.
2. The Add spend title, input context, and `Review split` action SHALL remain
   reachable at a 390 x 844 mobile proof viewport.
3. App code SHALL NOT depend on direct access to the cross-origin host wrapper.
4. Proof code SHALL distinguish an app-layout defect from host-owned wrapper
   scroll or screenshot behavior.
5. Existing payment and closeout semantics SHALL remain unchanged.

## Scenarios

GIVEN Mina opens Add spend inside the live `.dot` host
WHEN she enters 120 and Dinner at Gusto and dismisses focus
THEN the app frame SHALL return to its stable position
AND `Review split` SHALL remain visible and usable.

GIVEN the proof captures the filled Add spend screen
WHEN the host wrapper retained scroll after iframe focus
THEN the proof SHALL restore the wrapper viewport through visible host-safe
behavior or report the external limitation
AND SHALL NOT hide it with image cropping.

GIVEN the viewport correction is applied
WHEN the complete journey runs
THEN payment request, marked paid, confirmation, closeout, summary, and reload
results SHALL match the existing proof.

## Proof

- focused wrapper/iframe diagnostic before patch
- `npm run lint`
- `npm run build`
- live `proof:dot-host` with 22 screenshots
- screenshot review of empty, focused/filled, review, bottom action, summary,
  and persisted reload states
- host matrix and proof note update only if observed evidence changes

## Documentation Impact

- Update `HOSTS.md`, `proof/host-matrix.json`, and the live proof note if the
  limitation is fixed or reclassified.
- No wiki or ADR update is expected because product truth and architecture do
  not change.

## Result

- Live measurements proved the outer viewport stayed at `390 x 844` and the
  app iframe stayed at `y=56`, `390 x 788` before and after focused input.
- `Review split` occupied outer-page coordinates `y=764..820`, inside the
  visible `844px` browser viewport.
- The black area was reproduced as a Chromium automated screenshot artifact,
  not app scroll or layout displacement.
- The `.dot` proof now dismisses focus, resets app and wrapper scroll, captures
  the viewport rather than full page, and records the measured framing in
  `report.json`.
- The complete 22-step live journey and reload persistence passed unchanged.
