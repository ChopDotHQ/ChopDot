# Dot Host Focused Input Viewport Proof

Change: `dot-host-focused-input-viewport-v1`

Programme: A - portable shell host proof

Status: live journey passed; focused-input app framing passed

## Discovery

The old automated packet showed a black area above the filled Add spend screen.
The live browser measurements did not show a displaced app:

- outer browser viewport: `390 x 844`, `scrollY=0`;
- app iframe: `x=0`, `y=56`, `390 x 788`;
- app viewport: `390 x 788`, `scrollY=0`;
- `Review split`: outer-page `y=764..820`, inside the `844px` viewport.

The black area was reproducible in Chromium screenshot compositing after a
cross-origin iframe input had focus. Full-page capture was especially prone to
it. It did not correspond to DOM scroll, iframe movement, or an unreachable
ChopDot action.

## Correction

The `.dot` proof profile now:

1. dismisses focus inside the app;
2. resets app and wrapper scroll;
3. waits for both layers to repaint;
4. asserts iframe position and `Review split` reachability;
5. records those measurements in `report.json`;
6. saves the visible `390 x 844` viewport rather than using full-page capture.

## Result

- `npm run lint`: passed;
- `npm run build`: passed;
- live `.dot` proof: 22/22 screenshots and journey steps passed;
- focused Add spend screenshot: complete host bar, app header, inputs, context,
  and bottom action;
- saved state restored after live host reload;
- payment request, marked-paid, receiver-confirmation, and closeout semantics
  were unchanged.

Chromium can still intermittently omit only the host-owned `56px` bar in an
automated screenshot after unrelated route transitions. This is retained as a
capture-compositor limitation. No ChopDot displacement was observed.

## Evidence

- `proof/portable-shell-dot-host/08-add-spend-filled.png`
- `proof/portable-shell-dot-host/09-review-split.png`
- `proof/portable-shell-dot-host/20-group-summary.png`
- `proof/portable-shell-dot-host/22-after-refresh-persisted.png`
- `proof/portable-shell-dot-host/report.json`

Documentation impact: `HOSTS.md` and `proof/host-matrix.json` updated. No wiki
or ADR update is required because product truth and architecture did not
change.
