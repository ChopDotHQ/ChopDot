# Journey 28 — Things Go Wrong / Recovery V1 Edge Cases

## General truth preservation
1. Reload during an unknown result preserves the same operation identity and uncertainty.
2. Back navigation does not turn unknown/pending/partial into failed, cancelled, or successful.
3. A timeout is not proof that an operation failed.
4. A UI navigation failure is not proof that the underlying domain effect failed.
5. Cached owner truth cannot authorize a write after a stale/conflict signal.
6. A known pre-effect read failure may retry the read; it must not be labelled the same as post-effect uncertainty.

## Stale / conflict
7. Reviewed data changes before submit: refresh and require a fresh review.
8. Newer owner state wins over an older local draft unless the owning contract says otherwise.
9. Conflict resolution must not silently overwrite another actor's newer state.
10. User can stop after seeing the newer state without replaying the old action.

## Unknown / pending / reconciliation
11. Original operation pending: no replacement retry.
12. Original result unknown: no replacement retry.
13. Reconciliation is bound to exact operation identity/context.
14. Reconciliation says still pending: remain pending.
15. Reconciliation says succeeded: return verified success context to owner.
16. Reconciliation says failed: return verified failure context to owner; any later retry follows owner rules.
17. Reconciliation proves no operation/effect: only then may a replacement retry be reviewed.
18. Reconciliation itself fails/offline: preserve the original unknown state and operation reference.
19. Repeated reconciliation checks do not create a new operation.

## Partial
20. Partial success names what is verified and what is unresolved.
21. Unresolved remainder reconciles against the same operation/context.
22. Partial stop preserves both pieces; it must not collapse to whole success/failure.
23. Replacement retry for the whole operation remains blocked while any possible effect is unresolved.

## Cancellation
24. User requests cancel before completion: show cancel pending, not cancelled.
25. Cancel confirmed: only then show verified cancelled.
26. Cancel too late: reconcile original operation.
27. Cancel transport/read failure: cancellation outcome is unknown; do not claim cancelled.
28. Repeated cancel taps do not produce multiple cancellation operations.

## Duplicate / idempotency
29. Duplicate operation/request detected: open/reconcile the existing operation.
30. Duplicate cannot create a second payment/write/import/export/group/account mutation.
31. Existing completed result remains authoritative.
32. Existing unresolved result routes to same-operation reconciliation.

## Adjacent owner boundaries
33. Auth/session failure does not let J28 sign the user back in.
34. Wallet/payment/signing failure does not let J28 fabricate authorization or finality.
35. Provider/network outage does not let J28 infer chain/provider outcome.
36. Storage/import/export recovery does not let J28 claim remote persistence or external erasure.
37. Returning to a prior journey does not let J28 invent that journey's domain result.

## Explicit stop / support
38. Stop preserves the last verified facts and unresolved operation reference.
39. Support context excludes secrets, seed phrases, raw receiving details, private keys, credentials, or sensitive payloads.
40. Resuming later starts by refreshing/reconciling owner truth, not by replaying the prior action.
