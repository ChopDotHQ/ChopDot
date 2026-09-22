# Product Schema V1 — Reconstruction Closure

**Primary schema closure status: PASS. Gate-specific packets are downstream consumers, not the closure target.**

## Round-trip target

- 28 frozen Goldens
- approved Phase C1 overlays
- approved post-J28 decisions
- approved post-Golden impacts

## Golden → Schema completeness

- Frozen mapping/state sources pinned: **83 / 83**
- Distinct frozen domain events classified: **134 / 134**
- Reconstructed Golden pieces: **4160**
  - states: **1029**
  - actions: **3102**
  - fields: **29**
- Explicitly classified pieces: **4160 / 4160**
- Unjustified unmapped pieces: **0**

## Schema → Product soundness

- Semantic objects witnessed: **50 / 50**
- Operations witnessed: **49 / 49**
- Laws witnessed: **41 / 41**
- Derived views witnessed: **7 / 7**
- Contexts witnessed: **21 / 21**
- Construction requirements witnessed: **16 / 16**
- Continuity contracts witnessed: **4 / 4**

## Required-state reconstructibility

- Required states resolved: **21 / 21**
- Required states with explicit trigger meaning: **21 / 21**

## Machine-checkable safety contracts

- Machine-checkable laws: **28**
- Explicitly declared prose-only laws: **13**
- Mechanical mutations detected: **306 / 306 (100%)**

| Safety class | Detected | Applicable | Score |
|---|---:|---:|---:|
| authority | 48 | 48 | 100% |
| composition_continuity | 56 | 56 | 100% |
| identity | 42 | 42 | 100% |
| money | 14 | 14 | 100% |
| recovery_replay | 43 | 43 | 100% |
| settlement | 70 | 70 | 100% |
| storage_restore | 33 | 33 | 100% |

## Blast-radius probes

| Change | Tier | Objects | Ops | Laws | Contexts | Journeys | Views | Tasks |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| Equal split semantics | CRITICAL | 1 | 2 | 7 | 7 | 13 | 0 | 32 |
| Participant identity | CRITICAL | 1 | 1 | 4 | 14 | 27 | 0 | 32 |
| Settlement eligibility | CRITICAL | 0 | 0 | 1 | 1 | 4 | 0 | 23 |
| Expense edit rules | CRITICAL | 0 | 1 | 7 | 7 | 13 | 0 | 32 |
| Review reset behavior | CRITICAL | 0 | 0 | 1 | 0 | 4 | 0 | 23 |
| Restore semantics | LOW | 0 | 1 | 0 | 0 | 1 | 0 | 0 |
| Payment destination | CRITICAL | 1 | 2 | 2 | 4 | 27 | 0 | 32 |
| Group lifecycle | CRITICAL | 1 | 5 | 3 | 7 | 23 | 2 | 32 |
| SpendIntent | LOW | 1 | 1 | 2 | 1 | 0 | 0 | 0 |
| Settlement mutation guard | CRITICAL | 0 | 0 | 1 | 1 | 4 | 0 | 23 |
| Typed PositionScope | CRITICAL | 1 | 0 | 1 | 1 | 10 | 0 | 32 |
| Presentation-only control | LOW | 0 | 0 | 0 | 0 | 1 | 0 | 0 |

## Closure errors

- None

## Freeze criterion

**Reconstruction closure is machine-checkable and currently PASS. Product Schema V1 is a freeze candidate, subject to final independent adversarial review of Stage 5 itself.**
