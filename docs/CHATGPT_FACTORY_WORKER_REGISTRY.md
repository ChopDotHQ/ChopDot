# ChatGPT Work Factory — Worker Registry

**Status:** declared phase-aware topology  
**Purpose:** durable expected roster for the ChopDot factory.  
**Important:** live automation state is operational truth; this file defines what the roster is *supposed* to be for the current canonical phase. Any mismatch must be reconciled before creating or repurposing workers.

## Capacity rule

The automation platform currently allows 15 active tasks. Capacity is a ceiling, not a target.

- During active UX journey production, the declared topology is **13 active tasks**, leaving **2 slots reserved**.
- After the registered UX journey-production phase is canonically complete and exact-head verified, the declared post-UX / strategy-gate topology is **4 active tasks**. The UX Builder / Reviewer / Supervisor mesh becomes dormant rather than being re-enabled solely to satisfy the old 13-task count.
- Product Integrator remains disabled during the post-J28 strategy gate until the authorized private gap-placement plan exists and later authority explicitly allows implementation to resume.

Never fill unused capacity simply to reduce latency.

## Mandatory change protocol

Before **any** automation create, enable, disable, schedule change, role change, or prompt change:

1. read the live automation roster;
2. read live canonical product/UX phase authority;
3. read this registry;
4. compare live roles/counts with the declared topology for the current phase;
5. classify the desired change as update, repurpose, disable, one-time recovery, phase transition, or genuinely new recurring capability;
6. search the existing active and dormant ChopDot roster for an equivalent capability;
7. **reuse or update an existing worker before creating another one**;
8. a genuinely new recurring worker is allowed only for a measured bottleneck plus a capability the existing roster cannot provide;
9. after mutation, re-read the live roster and verify roles/counts against this file;
10. if topology intentionally changed, update this file in the same change.

Journey-specific recurring workers are forbidden. One-time recovery tasks must self-expire or be disabled after use.

## Phase A — active UX journey production

This topology applies only while canonical authority has a current registered UX journey or a just-frozen journey still requires resulting-state verification.

### Builder lane — 3 opportunities, one writer

| Worker | Schedule | Role |
|---|---:|---|
| ChopDot UX Builder | `:00` hourly | primary Builder |
| ChopDot Build Fast Watch A | `:20` hourly | generic Builder pickup / repair opportunity |
| ChopDot Build Fast Watch B | `:45` hourly | generic Builder pickup / repair opportunity |

All Builder opportunities are mutually exclusive on candidate product writes and use the repo-owned Builder lease. More Builder watchers are **not** an acceptable default response to latency.

### Independent review lane — 3 opportunities, one exact review

| Worker | Schedule | Role |
|---|---:|---|
| ChopDot Review Fast Watch A | `:15` hourly | generic independent review opportunity |
| ChopDot UX Reviewer | `:40` hourly | primary independent Reviewer |
| ChopDot Review Fast Watch B | `:55` hourly | generic independent review opportunity |

The opportunities do not authorize duplicate review of unchanged exact evidence.

### Supervisor / authority lane — 3 opportunities

| Worker | Schedule | Role |
|---|---:|---|
| ChopDot Supervisor Fast Watch A | `:05` hourly | generic authority-transition opportunity |
| ChopDot Supervisor Fast Watch B | `:35` hourly | generic authority-transition opportunity |
| ChopDot UX Supervisor | `:52` hourly | primary authority/process keeper |

These roles do not implement candidate UX and do not independently review their own authority transition.

### Factory control / learning — 2

| Worker | Schedule | Role |
|---|---:|---|
| ChopDot Control Tower | `:58` hourly condition watch | coordination / no-idle driver |
| ChopDot Factory Observer | `:44` hourly exact | independent factory measurement / learning |

### External change watches — 2

| Worker | Schedule | Role |
|---|---:|---|
| ChopDot Polkadot Platform Watch | daily | material Polkadot / Parity platform changes |
| ChopDot Capability Radar | weekly | genuinely new hard-to-own factory capabilities |

### Expected Phase A counts

- **Total active:** 13
- Builder opportunities: 3
- Reviewer opportunities: 3
- Supervisor opportunities: 3
- Factory control / observer: 2
- Platform / capability watches: 2
- Reserved platform slots: 2

## Phase B — post-UX strategy gate

This topology applies when canonical authority proves all 28 registered UX journeys are Golden and the final resulting state is exact-head verified. UX journey production is stopped in this phase.

### Declared active roster

| Worker | Schedule | Role |
|---|---:|---|
| ChopDot Control Tower | `:58` hourly condition watch | phase coordination, no-idle enforcement, and implementation hold |
| ChopDot Factory Observer | `:22` hourly exact | private Competitive × Golden × current Polkadot / Parity reconciliation and factory learning |
| ChopDot Polkadot Platform Watch | daily | material Polkadot / Parity platform changes |
| ChopDot Capability Radar | weekly | genuinely new hard-to-own factory capabilities |

### Declared dormant roster

The following existing workers remain available but **disabled** until canonical authority again requires journey production:

- ChopDot UX Builder
- ChopDot Build Fast Watch A
- ChopDot Build Fast Watch B
- ChopDot Review Fast Watch A
- ChopDot UX Reviewer
- ChopDot Review Fast Watch B
- ChopDot Supervisor Fast Watch A
- ChopDot Supervisor Fast Watch B
- ChopDot UX Supervisor

`ChopDot Product Integrator` also remains disabled while the post-J28 private reconciliation gate is open. It is not part of the Phase B active roster and must not be re-enabled merely because the UX phase is complete.

### Expected Phase B counts

- **Total active:** 4
- Factory control / private reconciliation: 2
- Platform / capability watches: 2
- UX production workers: 0 active / 9 dormant
- Product Integrator: disabled
- Unused platform capacity: 11 slots, including at least the 2 reserved slots

## Phase transition rule

Canonical product/UX authority decides which topology applies.

- If a current registered journey exists, or a just-frozen journey is still awaiting exact resulting-state verification, use **Phase A**.
- If all registered journeys are Golden, `current_journey` is null, and exact-head verification is true, use **Phase B**.
- Do not oscillate between topologies because dormant workers self-disable after the phase boundary.
- Do not reactivate the UX mesh for a private strategy/research gate.
- If the private post-UX plan later authorizes selective Golden extension or a genuinely new journey, first update canonical authority, then reactivate only the needed existing Phase A roles.
- Production implementation is a separate authority transition; it does not occur merely because Phase B finishes.

## Anti-regression rules

- Do not create another Builder merely because a handoff is waiting.
- Do not create journey-number-specific kickoff/finish workers for normal operation.
- Do not count disabled/historical workers as active capacity.
- Do not restore dormant Phase A workers just to reach 13 after UX completion.
- Do not change worker count from memory; live-list first.
- Do not optimize schedule density before measuring the current mesh.
- Do not let a new worker exist without a distinct role that can be explained in one sentence.
- If two workers have the same trigger, authority and output, one of them is probably redundant.
- Private competitive workbooks, evidence registers, strategic findings, and gap-placement conclusions never become public repository authority.

## Authority relationship

This registry does **not** decide product truth, journey state, approval, Golden status, or production implementation authority. It governs factory topology only.

Live UX/product authority remains in the canonical workbench registry and exact Git evidence. Live automation state remains the truth of what is actually enabled. This file is the expected topology used to detect drift between those two worlds.