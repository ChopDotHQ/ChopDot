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
- Authority-accounted/classified pieces: **4418 / 4418**
- Unjustified pieces: **0**
- Authority-only PRODUCT_REQUIREMENT states: **667**
- Draft fields without semantic refs: **35**
- Duplicate control evidence instances: **59**
- Conflicting duplicate domain operations: **0**
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

## Construction-required state reconstructibility

- Scope: **05, 06, 08**
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

## Stage 5.2 adversarial closure regression coverage

- Detector: semantic closure checks plus independent freeze seals; reported separately from the 58-case safety-invariant mutation score
- Adversarial regression cases detected: **12 / 12 (100%)**
- Freeze seals: **safety_subgraph=cb7f5c7f42fcf2d8, semantic_inventory=efab713b1a9fabe8, closure_mapping=9aa481923e471537, event_semantics=c53b7e69301f2137, mapping_registry=8951ac0340a69257**

## Blast-radius probes

| Change | Direct tier | Direct journeys | Direct tasks | Transitive tier | Transitive journeys | Transitive tasks |
|---|---|---:|---:|---|---:|---:|
| Equal split semantics | LOW | 0 | 0 | CRITICAL | 27 | 32 |
| Participant identity | HIGH | 0 | 0 | CRITICAL | 27 | 32 |
| Settlement eligibility | MODERATE | 4 | 0 | CRITICAL | 27 | 32 |
| Expense edit rules | LOW | 1 | 0 | CRITICAL | 27 | 32 |
| Review reset behavior | MODERATE | 4 | 0 | CRITICAL | 27 | 32 |
| Restore semantics | LOW | 1 | 0 | CRITICAL | 27 | 32 |
| Payment destination | LOW | 0 | 0 | MODERATE | 2 | 0 |
| Group lifecycle | HIGH | 0 | 0 | CRITICAL | 27 | 32 |
| SpendIntent | NEGLIGIBLE | 0 | 0 | NEGLIGIBLE | 0 | 0 |
| Settlement mutation guard | MODERATE | 4 | 0 | CRITICAL | 27 | 32 |
| Typed PositionScope | LOW | 0 | 0 | CRITICAL | 27 | 32 |
| Low-semantic presentation/navigation control | NEGLIGIBLE | 1 | 0 | NEGLIGIBLE | 1 | 0 |

## Closure errors

- None

## Freeze criterion

**Reconstruction closure is independently machine-checkable and currently PASS. Product Schema V1 is a freeze candidate, subject only to final external adversarial confirmation.**
