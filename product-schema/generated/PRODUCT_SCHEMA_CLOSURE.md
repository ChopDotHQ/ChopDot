# Product Schema V1 — Reconstruction Closure

**Primary schema closure status: PASS. Gate-specific packets are downstream consumers, not the closure target.**

## Round-trip target

- 28 frozen Goldens
- approved Phase C1 overlays
- approved post-J28 decisions
- approved post-Golden impacts

## Golden → Schema completeness

- Frozen mapping/state/executable sources pinned: **92 / 92**
- Distinct frozen domain events classified: **141 / 141**
- Reconstructed pieces: **4418**
  - states: **1105**
  - actions: **3277**
  - fields: **35**
- Justified/classified pieces: **4418 / 4418**
- Unjustified pieces: **0**
- Pseudo-state pieces: **0**
- Ungoverned recovery/system pieces: **0**

## Schema → Product soundness

- Semantic objects witnessed: **50 / 50**
- Operations witnessed: **49 / 49**
- Laws witnessed: **41 / 41**
- Derived views witnessed: **7 / 7**
- Contexts witnessed: **21 / 21**
- Construction requirements witnessed: **16 / 16**
- Continuity contracts witnessed: **4 / 4**
- Required overlay/decision source families decomposed: **7 / 7**

## Required-state reconstructibility

- Required states resolved: **21 / 21**
- Required states with governed trigger meaning: **21 / 21**

## Independent safety mutation coverage

- Detector: independent fixed invariants + frozen authority; old safety snapshots are co-mutated and do not count as detectors
- Independent co-mutation cases detected: **58 / 58 (100%)**

| Safety class | Detected | Applicable | Score |
|---|---:|---:|---:|
| money | 9 | 9 | 100% |
| identity | 6 | 6 | 100% |
| recovery_replay | 7 | 7 | 100% |
| storage_restore | 5 | 5 | 100% |
| authority | 8 | 8 | 100% |
| settlement | 16 | 16 | 100% |
| composition_continuity | 7 | 7 | 100% |

## Blast-radius probes

| Change | Direct tier | Direct journeys | Direct tasks | Transitive tier | Transitive journeys | Transitive tasks |
|---|---|---:|---:|---|---:|---:|
| Equal split semantics | LOW | 0 | 0 | CRITICAL | 9 | 29 |
| Participant identity | HIGH | 0 | 0 | CRITICAL | 27 | 32 |
| Settlement eligibility | MODERATE | 4 | 0 | CRITICAL | 7 | 23 |
| Expense edit rules | LOW | 1 | 0 | HIGH | 5 | 10 |
| Review reset behavior | MODERATE | 4 | 0 | CRITICAL | 7 | 23 |
| Restore semantics | LOW | 1 | 0 | MODERATE | 3 | 5 |
| Payment destination | LOW | 0 | 0 | MODERATE | 2 | 0 |
| Group lifecycle | HIGH | 0 | 0 | CRITICAL | 17 | 29 |
| SpendIntent | NEGLIGIBLE | 0 | 0 | NEGLIGIBLE | 0 | 0 |
| Settlement mutation guard | MODERATE | 4 | 0 | CRITICAL | 7 | 23 |
| Typed PositionScope | LOW | 0 | 0 | CRITICAL | 9 | 25 |
| Low-semantic presentation/navigation control | NEGLIGIBLE | 1 | 0 | NEGLIGIBLE | 1 | 0 |

## Closure errors

- None

## Freeze criterion

**Reconstruction closure is independently machine-checkable and currently PASS. Product Schema V1 is a freeze candidate, subject only to final external adversarial confirmation.**
