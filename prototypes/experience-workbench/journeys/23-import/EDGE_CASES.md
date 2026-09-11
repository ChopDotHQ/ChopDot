# Journey 23 — Import Data / Group V1 Edge Cases

Status: **definition-stage / unapproved**. These are candidate obligations, not approved production behavior.

## Source intake

1. User cancels the source picker before selecting anything.
2. Selected source becomes unavailable before inspection starts.
3. Permission/access is denied by the platform source picker.
4. Selected package is empty or contains no importable group/history.
5. Package type/version is unsupported.
6. Package is malformed or cannot be parsed safely.
7. Package is too large/complex to inspect within the current flow.
8. Package is partially readable; omitted fields materially affect balances or identity.
9. Package is partially readable but omitted non-material metadata can be disclosed safely.
10. Source provenance cannot be verified even though parsing succeeds.
11. Source contains markup/script-like content; customer UI must not execute/render it as trusted content.
12. Offline/interruption happens while the package is being inspected.

## Group and duplicate conflicts

13. The exact same package/import attempt was already committed.
14. Same group name exists locally but package identity is not exact.
15. Group name, member set and currency strongly resemble an existing group but are still not deterministically identical.
16. User intentionally proceeds with a similar group as a separate new import after explicit warning.
17. Source group name is missing, blank or invalid for a new ChopDot group.
18. Source group metadata is internally inconsistent.
19. Source contains more than one group when V1 expects one group per import.
20. Source contains nested/linked groups or unsupported group structure.

## People and identity conflicts

21. Imported person exactly matches a stable local identity.
22. Imported person only matches by display name; do not auto-link.
23. Multiple local people plausibly match one imported person.
24. Multiple imported people plausibly match one local person.
25. Imported member may represent the current user but evidence is ambiguous.
26. Imported person has no usable identifier beyond a label.
27. User chooses to keep an ambiguous imported person separate.
28. Identity decision is changed before confirmation; preview must recompute truthfully.

## Monetary/history conflicts

29. Group currency is unsupported or unknown.
30. Expense/history row uses a currency that cannot be interpreted safely.
31. Amount sign/decimal/unit semantics are ambiguous.
32. Imported record appears to contain a conversion but exchange-rate semantics are missing.
33. Source totals do not reconcile with imported component records.
34. Source contains a record category ChopDot V1 does not support.
35. Dropping an unsupported record would change balances/financial meaning; confirmation must remain blocked.
36. Unsupported non-financial metadata can be omitted only with explicit disclosure.
37. Historical settlement/payment-looking data exists; it remains history and must not become executable payment authority.
38. Source contains saved payment/wallet-like data; import must not make it an active receiving destination, wallet session or signing authority.

## Confirmation and commit

39. User cancels from preview before confirmation; no write occurs.
40. User confirms, then immediately leaves while commit may have started.
41. Commit takes much longer than expected; do not mislabel as failed.
42. Device/app goes offline before first write; safe retry may remain pre-write.
43. Connectivity/process interruption occurs after a write may have started; result is unknown until reconciled.
44. Known pre-write validation failure occurs after confirmation but before mutation.
45. Commit fails and rollback is known to have completed.
46. Commit fails but rollback status cannot be established.
47. Only part of the intended imported state appears to exist.
48. Success response is lost even though the imported group was committed.
49. User retries after a lost response; the same logical attempt must not create a duplicate.
50. User selects the same source again after a completed import; exact duplicate path opens the existing imported group.
51. User selects a modified package derived from a prior import; treat as a new review problem, not automatically the same import.

## Recovery and owner boundaries

52. Reconciliation proves the import exists; route to existing imported group, no second write.
53. Reconciliation proves no import committed; retry the same logical attempt safely.
54. Reconciliation cannot establish truth; preserve context and hand off to J28 rather than guessing.
55. Imported group is established but downstream Group Home fails to load; J23 success remains true and J08 owns the downstream load problem.
56. User seeks a way to create/get a portable source package; J24 owns export/portability and J23 does not invent its format.
57. Recovery request is actually backup/restore rather than import; do not silently redefine J23 as Journey 25 Storage/Backup/Recovery.

## Cross-cutting non-goals / safety boundaries

58. No bulk multi-group import in V1.
59. No merge into an existing group in V1.
60. No continuous provider sync in V1.
61. No automatic invitations to imported people.
62. No payment execution, wallet signing, receiving-detail publication or settlement replay from imported data.
63. No silent currency conversion or identity linking.
64. No claim that a prototype fixture proves live parser/provider support.
65. `TYPO-01` is not repaired locally.
