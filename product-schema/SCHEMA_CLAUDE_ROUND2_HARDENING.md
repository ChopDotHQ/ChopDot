# Claude Round 2 — Schema Hardening

Status: **schema integrity candidate; Gate B readiness intentionally BLOCKED pending one human product decision**

Round 2 confirmed the underlying semantic model is strong but found that readiness had become partly self-fulfilling. This pass therefore separates **schema validity** from **product readiness**.

Corrections:
- readiness may now report an unresolved product-decision gap without failing schema verification;
- settlement lock existence (create/edit/delete) remains approved, while group-wide vs active-settlement/item scope is reopened as `POLICY-EXPENSE-LOCK-SCOPE`;
- J06 review reset uses one machine trigger: Journey 06 Save changes accepted persistence, affecting reviewers current at edit acceptance including participants removed by that edit;
- recovered J05 is anchored against the visible text of all six frozen `source/core.html` screens, not only self-recomputed hashes/counts;
- Equal split verification now checks participant→amount mapping against the accepted Gate A deterministic allocator;
- the allocator validates the declared normalization/base/remainder policy instead of ignoring those fields;
- Expense change history derives from accepted Expense revisions and requires a prior revision;
- read models can never appear in any operation's `changes`; `settlement.close` now invalidates Position instead of directly changing it;
- every declared effect-guarded operation must actually list the guard;
- read-projection journeys cannot own mutations;
- Group Home derivation is exact-set checked and GroupRecent refresh is required on create/edit/delete;
- the hostile mutation battery now uses Claude's independently generated semantic mutants.

The only Gate B product decision intentionally left open is settlement mutation lock scope.
