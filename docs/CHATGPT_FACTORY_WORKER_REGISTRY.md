# ChatGPT Work Factory — Worker Registry

**Status:** declared phase-aware topology  
**Purpose:** durable expected roster for the ChopDot factory.  
**Important:** live automation state is operational truth; this file defines what the roster is *supposed* to be for the current canonical phase. Any mismatch must be reconciled before creating or repurposing workers.

## Capacity rule

The automation platform currently allows 15 active tasks. Capacity is a ceiling, not a target.

- During active UX journey production, the declared topology is **13 active tasks**, leaving **2 slots reserved**.
- After the registered UX journey-production phase is canonically complete and exact-head verified, the declared post-UX / strategy-gate topology is **4 active tasks**. The UX Builder / Reviewer / Supervisor mesh becomes dormant rather than being re-enabled solely to satisfy the old 13-task count.
- During an explicitly authorized post-UX selective contract-integration phase, only the primary Builder / Reviewer / Supervisor trio is reactivated alongside Control Tower and the two external capability watches. Fast A/B watchers and the Factory Observer remain dormant unless later measured drift plus explicit topology authority justifies a change.
- Product Integrator remains disabled until the selective product-contract changes are independently reviewed, explicitly human-approved for the exact post-J28 bytes/contracts, re-locked/verified, and a later human authority transition starts production implementation.

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

This topology applies when canonical authority proves all 28 registered UX journeys are Golden and the final resulting state is exact-head verified, while selective post-UX product integration has not yet been explicitly authorized. UX journey production is stopped in this phase.

### Declared active roster

| Worker | Schedule | Role |
|---|---:|---|
| ChopDot Control Tower | `:58` hourly condition watch | phase coordination, no-idle enforcement, and implementation hold |
| ChopDot Factory Observer | `:44` hourly exact | private Competitive × Golden × current Polkadot / Parity reconciliation and factory learning |
| ChopDot Polkadot Platform Watch | daily | material Polkadot / Parity platform changes |
| ChopDot Capability Radar | weekly | genuinely new hard-to-own factory capabilities |

### Declared dormant roster

The following existing workers remain available but **disabled** until canonical authority again requires journey production or selective contract integration:

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

## Phase C1 — selective post-J28 product-contract integration

This topology applies only after explicit human product authority authorizes selective post-J28 contract integration without authorizing production implementation. The registered 28 Golden journeys remain the immutable baseline except for dedicated successor candidate bytes/contracts under independent review. Phase C1 is not Journey 29 and is not production implementation.

### Declared active roster — 6 existing workers only

| Worker | Live schedule | Phase C1 role |
|---|---:|---|
| ChopDot Control Tower | `:12` hourly condition watch | phase coordination, no-idle enforcement, roster reconciliation, and process self-heal |
| ChopDot UX Builder | `:15` hourly | **one writer** for the dedicated non-protected selective contract/prototype candidate only |
| ChopDot UX Reviewer | `:35` hourly | independent semantic / UX / regression review of the exact Phase C1 candidate |
| ChopDot UX Supervisor | `:50` hourly | authority/process keeper; binds exact review state and stops at exact human approval for new post-J28 bytes |
| ChopDot Polkadot Platform Watch | daily | material Polkadot / Parity platform changes |
| ChopDot Capability Radar | weekly | genuinely new hard-to-own factory capabilities |

The three primary UX worker IDs are repurposed in place for Phase C1; their live titles may describe the contract role, but they remain the existing primary Builder / Reviewer / Supervisor identities. No new recurring worker is authorized.

### Phase C1 worker boundaries

- **Builder:** may create only a dedicated non-protected selective-integration candidate derived from the exact validated 28-Golden base. It must preserve unrelated Golden bytes/checksums, must not edit approved Golden HTML in place, and must not write production/runtime implementation. It owns public-safe contract/prototype candidate work only.
- **Reviewer:** independently reviews the exact candidate's product semantics, identity privacy/authority, guest upgrade/link/recovery behavior, rail-neutral `SpendIntent` invariants, any actually changed visual/user flows, and regression preservation. Reviewer never implements repairs or grants approval.
- **Supervisor:** may bind exact review state and prepare the approval/freeze transition. The prior J26–J28 standing approval does **not** cover Phase C1. Exact `GOLDEN-READY / CONTRACT-READY` post-J28 bytes require a new explicit human approval before selective re-lock/freeze.
- **Control Tower:** may self-heal generic factory coordination only. It does not author product candidate bytes, perform independent review, or infer approval.

### Declared dormant / held roster during Phase C1

Keep all of the following **disabled** unless measured Phase C1 drift proves the primary trio cannot advance and a later authority change updates this registry:

- ChopDot Build Fast Watch A
- ChopDot Build Fast Watch B
- ChopDot Review Fast Watch A
- ChopDot Review Fast Watch B
- ChopDot Supervisor Fast Watch A
- ChopDot Supervisor Fast Watch B
- ChopDot Factory Observer

`ChopDot Product Integrator` remains **disabled** throughout Phase C1. Selective product-contract approval/re-lock does not itself authorize production implementation.

### Expected Phase C1 counts

- **Total active ChopDot tasks:** 6
- Candidate writers: 1
- Independent reviewers: 1
- Authority/process keepers: 1
- Control Tower: 1
- Platform / capability watches: 2
- Fast A/B watchers: 0 active
- Factory Observer: disabled
- Product Integrator: disabled
- Unused platform capacity: 9 slots, including at least the 2 reserved slots

## Phase transition rule

Canonical product/UX authority plus explicit human post-UX product authority decides which topology applies.

- If a current registered journey exists, or a just-frozen journey is still awaiting exact resulting-state verification, use **Phase A**.
- If all registered journeys are Golden, `current_journey` is null, exact-head verification is true, and no selective post-UX product integration is yet authorized, use **Phase B**.
- If all 28 registered journeys remain exact-head validated and explicit human authority authorizes bounded post-J28 selective contract integration while production remains held, use **Phase C1**.
- Do not oscillate between topologies because dormant workers self-disable after a phase boundary.
- Do not reactivate the full UX mesh for private strategy/research or Phase C1; activate only the primary trio required by the declared selective-integration topology.
- A genuinely new journey requires a separate product-authority decision and registry change; Phase C1 is not permission to create Journey 29.
- Production implementation is a separate authority transition; it does not occur merely because Phase B or Phase C1 finishes.

## Anti-regression rules

- Do not create another Builder merely because a handoff is waiting.
- Do not create journey-number-specific kickoff/finish workers for normal operation.
- Do not count disabled/historical workers as active capacity.
- Do not restore dormant fast watchers merely to increase opportunity count during Phase C1.
- Do not change worker count from memory; live-list first.
- Do not optimize schedule density before measuring the current primary trio.
- Do not let a new worker exist without a distinct role that can be explained in one sentence.
- If two workers have the same trigger, authority and output, one of them is probably redundant.
- Never use standing approval from an earlier activation scope to approve new post-J28 selective bytes/contracts.
- Private competitive workbooks, evidence registers, strategic findings, and gap-placement conclusions never become public repository authority.

## Authority relationship

This registry does **not** decide product truth, journey state, approval, Golden status, selective integration approval, or production implementation authority. It governs factory topology only.

Live UX/product authority remains in the canonical workbench registry plus explicit human product decisions and exact Git evidence. Live automation state remains the truth of what is actually enabled. This file is the expected topology used to detect drift between those two worlds.
