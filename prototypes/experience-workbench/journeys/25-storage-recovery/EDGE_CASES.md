# Journey 25 — Storage / Backup / Recovery V1 Edge Cases

All cases below must fail closed or remain explicit in the candidate. None may silently widen authority, claim a provider effect, or convert uncertainty into success/failure.

## Storage posture
1. Device-only selected: no backup/sync claim appears.
2. Device lost with no readable copy: recovery stops; no bypass is invented.
3. External sync described without provider connection: clearly fixture/boundary only.
4. Device/provider versions disagree: neither copy silently wins.
5. Storage approach changes: choice alone does not move or rewrite records.

## Backup scope / privacy / integrity
6. Empty authorized scope: no artifact action.
7. Secret-like field appears: preparation stops; no override.
8. Private keys / seed phrases / session or provider credentials: never serialized.
9. Raw broad-scope receiving details: excluded.
10. Payment/status history: inert history only, never retry/payment authority.
11. Unresolved identity: stable IDs preserved; no name-only merge.
12. Snapshot becomes stale after preview: old confirmation blocked.
13. Scope/source/schema changes after review: require fresh reviewed operation.
14. Checksum matches bytes: do not claim source authenticity/completeness/currentness.
15. Unsupported field whose omission would change meaning: do not silently omit.

## Backup execution / idempotency
16. Exact backup already exists: reuse; do not regenerate.
17. Backup pending: duplicate generation blocked.
18. Taking longer: not failure.
19. User leaves while pending: leaving is not cancellation.
20. Stop requested: not proof of no artifact.
21. Stop verified with no artifact: fresh reviewed backup may start.
22. Known failure before bytes exist: same operation may retry.
23. Outcome unknown: blind retry blocked.
24. Reconciliation finds artifact: reuse.
25. Reconciliation finds no artifact: same logical operation may retry.
26. Reconciliation itself cannot establish truth: hand to J25 recovery owner boundary.

## Destination / provider
27. Browser save request: final local path/durability unknown.
28. External save sheet opened: not success.
29. External handoff cancelled: no durable copy claim.
30. Return from external sheet with unknown outcome: duplicate save blocked.
31. Destination reconciliation proves not saved: same artifact may retry destination only.
32. Destination reconciliation proves saved in fixture: destination fact only; not live provider/durability proof.
33. Provider credentials/background sync/retention/deletion: outside J25 prototype boundary.
34. Destination retry must never regenerate backup bytes.

## Restore source / conflict / identity
35. Corrupt/unreadable artifact: no preview/apply.
36. Incompatible schema: no guessed migration.
37. Backup older than current working copy: automatic overwrite blocked.
38. Current/newer facts exist: preserved unless an explicitly reviewed change says otherwise.
39. Ambiguous identity mapping: affected link held out; no name-only merge.
40. Selecting artifact/provider source: read-only; no apply.
41. Restore preview: exact incoming/current differences visible before effect.
42. Secrets/executable authority absent from artifact: restore does not manufacture them.

## Restore execution / reconciliation
43. Exact restore already applied: duplicate apply blocked.
44. Apply pending: duplicate apply blocked.
45. Known failure before commit: same reviewed operation may retry.
46. Apply outcome unknown: blind retry blocked.
47. Reconciliation proves applied: show existing recovered result.
48. Reconciliation proves not applied: same reviewed operation may retry.
49. Reconciliation cannot resolve: hand to recovery owner boundary.
50. Navigation/back/reload never creates success, failure, provider access or restored authority.

## Accessibility / mobile / trust
51. All visible actions meet at least 44px target height in both canonical viewports.
52. Status meaning is conveyed by text/icon, not color alone.
53. Long copy/rows must not create horizontal overflow at 393×852 or 430×890.
54. Pending states respect reduced-motion settings.
55. External/live claims remain explicitly fixture/boundary language.
56. TYPO-01 stays deferred; no approved Golden typography is changed.
