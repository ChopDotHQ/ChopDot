# Journey 17 — GIVEN / WHEN / THEN coverage

- GIVEN Track together and Dev records CHF 180, WHEN Dev taps “I added it”, THEN CHF 180 is On the way and Available stays CHF 1240 until confirmation.
- GIVEN the correct confirmation arrives, WHEN the contribution is confirmed, THEN Available becomes CHF 1420 and only Dev's position increases.
- GIVEN an external/provider submission times out, WHEN the result is unknown, THEN retry is blocked until recovery resolves the original operation.
- GIVEN recovery proves nothing executed, WHEN Dev retries, THEN the same scope can be safely retried with idempotency protection.
- GIVEN Dev has CHF 520 confirmed, WHEN Dev prepares CHF 100 withdrawal, THEN only Dev's position is in scope.
- GIVEN the group owner views Jeanine's position, WHEN they attempt withdrawal, THEN the operation is rejected unless a separately configured group-controlled rule grants authority.
- GIVEN Shared account requires 2 of 3 approvals, WHEN only one approval exists, THEN the withdrawal remains waiting.
- GIVEN a wallet/provider rejects approval, WHEN the result is verified rejected, THEN no savings balance changes.
- GIVEN CHF is the group currency, WHEN DOT is selected, THEN DOT remains a separate asset and cannot become a CHF instruction.
- GIVEN a confirmed contribution is later returned, WHEN the return is verified, THEN that exact amount reopens and the earlier confirmation remains in history.
- GIVEN the app is offline, WHEN a member enters an amount, THEN a draft may be retained but no execution occurs.
- GIVEN group/source version changes before confirmation, WHEN the action is refreshed, THEN stale scope cannot be applied without review.
