# ChatGPT Work Factory — Worker Registry

**Status:** declared topology  
**Purpose:** durable expected roster for the ChopDot factory.  
**Important:** live automation state is operational truth; this file defines what the roster is *supposed* to be. Any mismatch must be reconciled before creating or repurposing workers.

## Capacity rule

The automation platform currently allows 15 active tasks. The ChopDot factory target is **13 active tasks**, leaving **2 slots reserved** for temporary recovery or unrelated user needs.

Do not fill the reserve simply to reduce latency.

## Mandatory change protocol

Before **any** automation create, enable, disable, schedule change, role change, or prompt change:

1. read the live automation roster;
2. read this registry;
3. compare live roles/counts with the declared topology;
4. classify the desired change as update, repurpose, disable, one-time recovery, or genuinely new recurring capability;
5. search the existing active roster for an equivalent capability;
6. **reuse or update an existing worker before creating another one**;
7. a genuinely new recurring worker is allowed only for a measured bottleneck plus a capability the existing roster cannot provide;
8. if already at the 13-task factory target, disable or repurpose another recurring worker before creating a new one;
9. after mutation, re-read the live roster and verify roles/counts against this file;
10. if topology intentionally changed, update this file in the same change.

Journey-specific recurring workers are forbidden. One-time recovery tasks must self-expire or be disabled after use.

## Declared active roster

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
| ChopDot Control Tower | `:58` hourly condition watch | coordination/no-idle observer |
| ChopDot Factory Observer | `:44` hourly exact | independent factory measurement/learning + post-J28 private strategy reconciliation |

### External change watches — 2

| Worker | Schedule | Role |
|---|---:|---|
| ChopDot Polkadot Platform Watch | daily | material Polkadot/Parity platform changes |
| ChopDot Capability Radar | weekly | genuinely new hard-to-own factory capabilities |

## Expected counts

- **Total active:** 13
- Builder opportunities: 3
- Reviewer opportunities: 3
- Supervisor opportunities: 3
- Factory control/observer: 2
- Platform/capability watches: 2
- Reserved platform slots: 2

## Anti-regression rules

- Do not create another Builder merely because a handoff is waiting.
- Do not create journey-number-specific kickoff/finish workers for normal operation.
- Do not count disabled/historical workers as reusable active capacity without deliberately re-evaluating them.
- Do not change worker count from memory; live-list first.
- Do not optimize schedule density before measuring the current mesh.
- Do not let a new worker exist without a distinct role that can be explained in one sentence.
- If two workers have the same trigger, authority and output, one of them is probably redundant.

## Authority relationship

This registry does **not** decide product truth, journey state, approval or Golden status. It governs factory topology only.

Live UX/product authority remains in the canonical workbench registry and exact Git evidence. Live automation state remains the truth of what is actually enabled. This file is the expected roster used to detect drift between those two worlds.
