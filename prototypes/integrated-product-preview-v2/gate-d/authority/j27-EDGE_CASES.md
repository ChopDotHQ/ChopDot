# Journey 27 — Account & Preferences V1 Edge Cases

## Freshness and session

1. Cached profile/session facts may render but cannot authorize writes.
2. If account/session freshness cannot be established, the surface is read-only.
3. If access disappears during refresh, do not reopen cached account controls as authority.

## Profile identity

4. Blank/invalid display names fail before a write begins.
5. A stale account/profile version produces a conflict rather than silent overwrite.
6. A known save failure preserves the previously saved name.
7. Timeout after save may have started is `unknown`; retry is blocked until reconciliation.
8. Reconciliation may discover the new name saved, discover the old name still current, or remain unknown; only proven no-effect exposes a fresh retry.
9. Display-name change never changes wallet/account cryptographic identity or historical attribution.

## Notifications

10. ChopDot notification preference and OS/device push permission are separate facts.
11. Saving push preference `on` while OS permission is absent yields a permission-needed state, not a false “push enabled” claim.
12. OS denial leaves effective push unavailable and preserves the app preference distinction.
13. Preference conflict/failure/unknown outcomes follow the same versioned write + reconciliation rule as profile identity.
14. Notification settings never claim delivery success or external provider mutation.

## Appearance

15. Preview is reversible and never becomes persisted truth until Save succeeds.
16. Failed save restores the last persisted theme.
17. Unknown save reconciles the same preference write before any new save.
18. System theme is an app/display preference boundary, not an OS setting mutation.

## Security / sign out

19. Sign-out confirmation must distinguish session revocation from account deletion.
20. Cancellation before execution leaves the current session active.
21. Known sign-out failure leaves the session active.
22. Unknown sign-out result reconciles the same session operation; navigation cannot decide whether the session ended.
23. Signed-out is a verified terminal fixture state and returns to a signed-out/auth-owned boundary only conceptually; it does not claim all remote sessions were revoked.

## Account deletion prerequisites

24. Account deletion is blocked while the user owns an active group; resolution belongs to Journey 26.
25. Account deletion is blocked while unresolved money obligations require resolution; Journey 27 cannot settle or zero them.
26. Returning from an adjacent owner boundary always refreshes prerequisites rather than trusting the handoff itself.
27. Export is optional but offered before deletion through Journey 24; export completion does not itself authorize deletion.

## Account deletion execution

28. Typed confirmation must match the current display name exactly.
29. A mismatched confirmation cannot reach the final destructive review.
30. Cancellation is allowed before deletion execution begins and creates no delete request.
31. Known request failure preserves the account.
32. Timeout/unknown after request start blocks duplicate delete requests and routes to reconciliation.
33. Reconciliation checks the existing deletion request identity.
34. Fresh retry is allowed only after reconciliation proves no delete effect.
35. Verified deletion removes only the ChopDot account working state represented by this fixture. Shared group/expense history, exports/backups, provider records and public/on-chain history are not claimed erased.
36. Deletion must not rewrite balances, expense history, settlement truth, payment evidence, or group history.

## Duplicate / retry / navigation

37. Repeated Save/Delete clicks cannot create parallel operation identities.
38. Back/reload/tab navigation is location only; it cannot manufacture saved, signed-out or deleted truth.
39. Direct hash/state access in the prototype is review tooling only and is not accepted as caller-reachability evidence.
40. Every material state must have a truthful clicked caller path or be a named adjacent-owner boundary.
