# Codex checklist — J17 V1.4 native standalone reload

Use the exact file:

`candidates/chopdot-j17-v1.4-operation-continuity-candidate.html`

SHA-256:

`a5dad1dc659955d4b70acaa13eced199dd778ff628ab8998d4c7ae83055d4915`

Do not run through an iframe/CDN wrapper. Open the standalone file in the normal browser/runtime used for prototype review.

## Case 1 — native reload recovery

1. Clear only this prototype's local storage key if needed: `chopdot-j17-v1.4-demo-unresolved-operation`.
2. Open the standalone HTML normally.
3. Add money → select **CHF 50** → Review contribution → **I added CHF 50.00**.
4. Record `J17Continuity.operation()` in DevTools. Note the ID; expected first fresh run is `demo-savings-op-1`.
5. Open Demo → **Unknown contribution**. Confirm the same operation ID now has status `unknown`.
6. **Check original result** → Still unknown (`checking`).
7. **Back to group**. Confirm the pink unresolved banner appears and `J17Continuity.operation()` still has the same ID, `minor: 5000`, `currency: CHF`, `group: Alps House Fund`, `actor: Dev`, `status: checking`.
8. Perform a real browser reload (not Back, not DOM reinjection).
9. Expected after reload: the group screen opens; the unresolved banner remains; `J17Continuity.operation()` has the same ID/scope/status; no success/failure is inferred.
10. Click the unresolved banner (or Add money). Expected: route to **Still unknown**, same operation ID, recovery controls work.

If any field changes, the operation disappears, retry becomes enabled, or success/failure is inferred, fail the test.

## Case 2 — same-operation retry through final submission

1. Clear the prototype storage and reload fresh.
2. Withdraw → **Max CHF 520** → Review withdrawal → **Confirm withdrawal**.
3. Record the operation ID.
4. Demo → Unknown contribution (the active withdrawal must remain the same operation) → service result **not executed**.
5. **Retry withdrawal**. Confirm review still shows CHF 520 / Available after CHF 720 / position after CHF 0 and the operation ID is unchanged.
6. Click **Confirm withdrawal** again.
7. Expected: Withdrawal waiting, status `waiting`, and the original operation ID/scope remain unchanged. No new `demo-savings-op-*` ID is allocated.

## Case 3 — unresolved protection

1. Create CHF 50 contribution and make it unknown/checking as in Case 1.
2. Back to group.
3. Click **Add money** repeatedly.
4. Expected: every click routes/resumes the existing recovery state; it must not open a fresh editable contribution or change the operation ID.
5. Manually enter `#add` in the fragment if practical. Expected: it redirects back to the existing recovery state.

## Authority check

Optional negative test: manually forge local storage with status `not-executed` or `confirmed`, then reload. V1.4 must not hydrate that value into an authoritative operation state. Browser storage is continuity only, not payment authority.
