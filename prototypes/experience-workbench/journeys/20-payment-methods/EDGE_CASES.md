# Journey 20 — Edge Cases

Definition-stage V1 coverage targets.

- No saved methods.
- Method exists but is incomplete or structurally invalid.
- Duplicate Bank/TWINT/PayPal/crypto destination attempt.
- Same public destination entered twice with formatting differences.
- IBAN presentation normalization must not become a false validity claim.
- TWINT phone and handle conflict or both are empty.
- PayPal email/username conflict or both are empty.
- Crypto address has the right-looking length but wrong network/encoding.
- Asset ticker matches but network does not.
- Preferred method becomes unavailable, removed or incompatible with the current context.
- User tries to make an incompatible method preferred for the active settlement asset.
- Editing a destination while an old Journey 14 share/review references its previous version.
- Removing a destination while an old share is still active.
- Removing the only compatible method during a pending settlement/receive flow.
- Save accepted by storage but readable record temporarily unavailable.
- Save result unknown after timeout/navigation/reload.
- Remove result unknown after timeout/navigation/reload.
- Repeated Save/Remove clicks and delayed duplicate responses.
- Stale version: method changed elsewhere before this review is submitted.
- Offline cached list with no permission to write.
- Connectivity returns after an offline attempted write; do not replay an unaccepted command blindly.
- Session expires or account access changes while full destination details are open.
- Clipboard/browser history/external screenshots are outside ChopDot recall; do not promise revocation of already exported values.
- Removing/editing a method must not delete or rewrite settlement history.
- Changing preference/availability must not change balances, requests, source expenses or payment status.
- Raw destination fields must not leak into People, Activity, URL fragments, unauthenticated previews or demo navigation.
- No secret-like crypto fields (seed phrase/private key) accepted into the method record.
- Unsupported provider or future payment method must fail explicitly rather than masquerade as a supported kind.
- Loading/error/empty states keep one clear return path and do not invent a preferred method.

TYPO-01 remains deferred; readability changes are not part of these edge-case repairs.
