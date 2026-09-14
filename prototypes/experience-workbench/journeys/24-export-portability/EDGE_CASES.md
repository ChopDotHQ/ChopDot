# Journey 24 — Export / Portability V1 Edge Cases

Status: complete V1 edge inventory for candidate review. These cases constrain J24 only; they do not alter approved Goldens or production architecture.

## Scope / authorization

1. Account-wide export is selected from account entry.
2. One-group export is selected from group settings.
3. Group scope remains that exact group; it never silently expands to other groups.
4. Account scope never implies access to records the current user cannot already view.
5. Group export does not claim ownership of other members' private data.
6. Changing scope after preview invalidates the preview and requires a new snapshot.
7. A stale/deleted/left group cannot be exported from an old preview as though access still exists.
8. J24 cannot edit expenses, groups, people, balances, payment methods, settlement status, or wallet state while exporting.

## Package semantics

9. V1 package schema is explicitly `chopdot-portable-v1`.
10. Snapshot time and source record versions are written into the manifest fixture.
11. Included and excluded record classes are visible before artifact creation.
12. Money amounts, currencies, assets, and statuses are preserved as recorded.
13. No exchange-rate conversion, denomination substitution, rounding normalization, or status rewriting is allowed for convenience.
14. Package checksum covers artifact bytes only; it is not source-record authenticity/finality proof.
15. A successful package does not imply an external backup exists.
16. An exact already-created artifact for the same operation is reused instead of regenerated silently.
17. Same display name + different stable IDs remain separate people.
18. Missing/ambiguous identity remains explicitly unresolved.
19. Imported/legacy identity labels remain labels, not proof of current account identity.
20. A package later imported elsewhere must be revalidated by the import journey; J24 never promises round-trip equivalence.

## Privacy / secrets / authority

21. Private keys are never exportable.
22. Seed/recovery phrases are never exportable.
23. Session/auth tokens are never exportable.
24. Provider credentials/API secrets are never exportable.
25. Signing material is never exportable.
26. Connected-wallet/session authority is never serialized as usable authority.
27. Raw IBAN/phone/PayPal/wallet receiving details governed by J14/J20 are excluded from broad/default export.
28. Payment-method labels/types may be historical metadata but cannot authorize payment.
29. Settlement/payment history is read-only history, not retry/payment authority.
30. QR/payment-looking/imported records remain inert data, not commands.
31. Unexpected secret-like fields block packaging rather than being copied through.
32. Unsupported non-financial display-only fields may be omitted only with manifest warning and unchanged record meaning/balances.
33. Unsupported fields that would alter financial/history meaning cannot be silently omitted.

## Preview / stale truth

34. Scope/data-class/format explanation stays read-only.
35. Snapshot preparation stays read-only.
36. Preview stays read-only.
37. Final review stays read-only until explicit `Create export`.
38. Source version changing after preview invalidates confirmation.
39. Empty selected scope produces no export CTA.
40. Oversized account export suggests narrowing scope rather than truncating silently.
41. Offline before a fresh snapshot does not claim a current export can be created.
42. Partial/omitted details remain visible through final confirmation.

## Generation / cancellation / idempotency

43. Operation key binds exact scope + source snapshot/version + schema + destination intent.
44. Duplicate clicks cannot start two package-generation operations.
45. Taking longer is not presented as failure.
46. Leaving during generation is not presented as cancellation.
47. Cancel before final confirmation creates no artifact.
48. Cancel after generation starts stops future work where possible but cannot claim already-created bytes were recalled/deleted.
49. Known failure before artifact bytes allows safe retry of the same logical operation.
50. Unknown generation outcome blocks blind retry.
51. Reconciliation finding the artifact reuses it.
52. Reconciliation proving no artifact permits same-operation regeneration.
53. Reconciliation unavailable hands to J28 with exact operation/snapshot context and no retry permission.
54. Any scope/snapshot/schema change creates a fresh reviewed operation, never mutates an uncertain one.

## Destination / external effects

55. `Package ready` means package bytes exist in the prototype fixture only; no external save/share implied.
56. Browser download request does not prove final filesystem path or persistence.
57. Browser download unavailable leaves the package ready.
58. Opening OS share/save sheet is not delivery success.
59. Cancelling the system sheet leaves the package unchanged and does not claim delivery.
60. Returning from the system sheet with no definitive result is an unknown destination outcome.
61. Unknown destination outcome reconciles before another delivery attempt.
62. Destination reconciliation proving no save permits another delivery attempt with the same artifact.
63. Destination reconciliation reporting saved is a destination fact only; it does not prove source authenticity, backup completeness, or recipient access beyond that provider result.
64. The deterministic prototype must label provider/system outcomes as fixtures, not live integrations.
65. Changing destination intent after an uncertain delivery starts a fresh reviewed delivery intent rather than silently retargeting the pending attempt.
66. J24 cannot create persistent share/access permissions on an external provider unless a real owning system explicitly confirms them; V1 prototype does not model that as live.

## Presentation / accessibility / evidence

67. Account vs group scope remains visible on summary, preview, confirmation, pending, recovery, and result states.
68. Primary CTA names the effect (`Create export`, `Download package`, `Share or save elsewhere`) rather than generic `Continue` at authority-changing boundaries.
69. Pending, failure, cancelled, unknown, recovered, no-artifact, package-ready, destination-cancelled, destination-unknown, and destination-confirmed states have distinct text/status treatment.
70. Required actions remain reachable at `393×852` and `430×890` with no horizontal overflow.
71. Meaning does not depend on color alone.
72. Icon-only controls have accessible names.
73. Fixture/demo copy never claims real browser/cloud/storage execution.
74. TYPO-01 remains deferred and is not solved locally.
