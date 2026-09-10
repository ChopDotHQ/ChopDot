# Shared UX Improvements

Cross-cutting UX/design findings live here so active journey work does not silently mutate approved Goldens.

## Rule

A journey worker may discover and record a shared-system issue. It may not solve that issue locally unless a dedicated shared-system pass has been explicitly opened. Any change that affects an approved Golden requires a separately reviewed version and explicit human approval.

| ID | Status | Scope | Current rule | Revisit trigger |
| --- | --- | --- | --- | --- |
| TYPO-01 | Deferred | Shared typography/readability, including small progress/status labels | Do not change typography inside Journey 20 or other local journey work; preserve existing Golden checksums. | Explicitly authorized shared typography/readability pass with regression review across affected Goldens. |

Add new entries only when the issue crosses journey boundaries. Journey-specific defects belong in that journey's review evidence/decision history instead.