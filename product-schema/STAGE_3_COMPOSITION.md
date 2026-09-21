# ChopDot Product Schema V1 — Stage 3 Composition Wiring

**Status: complete candidate**  
**Stage 2 parent:** `2e2b6a211af62af687586a7aa2d783b606323693`

Stage 3 wires the normalized semantic core into the frozen journey/gate structure. It does not implement Gate B.

## What changed conceptually

We now have three distinct layers:

```text
semantic objects + laws
          ↓
    continuity contexts
          ↓
journey projections / operation owners
          ↓
   composition units
          ↓
          gates
```

The 93 registry navigation edges remain derived from the frozen Stage 1 journey registry rather than being copied into another hand-maintained list.

## Wiring inventory

- **20 continuity contexts**
- **28 / 28 journey projections**
- **11 named composition units**
- **5 gate/stage records**
- **6 shared composition laws**
- **46 semantic operation families after one schema-only normalization**

Stage 3 exposed one omission in Stage 2: Journey 18's already-approved read/unread mutation had an object (`NotificationDelivery`) and law, but no named operation. The schema now includes `notification.set_read_state`. No product or runtime source changed.

## Gate B circuit is now explicit

```text
              ┌─────────────────────┐
              │ J08 Group Home      │
              │ view.group_home     │
              └──────┬───────┬──────┘
                     │       │
              Add expense    Open expense/review
                     │       │
                     ▼       ▼
                J05       J06 / J07
             create        edit/delete/
             Expense       agree/issue
                 │             │
                 └──────┬──────┘
                        ▼
              same Expense lineage
                        │
          ┌─────────────┼─────────────┐
          ▼             ▼             ▼
     GroupHome       Position      Activity
      refresh        refresh       refresh
```

The important point is that these are not four independent screens. They are projections and operations over the same `Group`, `Expense`, `Split`, `ExpenseReview`, `ExpenseIssue`, `Position`, Participant and exact-money contexts.

## Gate A remains bounded

Gate A stays accepted exactly as recorded: J01/J02 plus the bounded common equal-split expense capability and account-conversion/continuity demonstration. Stage 3 explicitly forbids interpreting that bounded J05 capability as full J05 or J08 integration.

## Composition units

The full product is now wired through reusable assemblies:

- entry & orientation;
- group onboarding;
- core expense loop;
- position → settlement → history;
- people/request/receiving;
- savings;
- payment destinations/wallet/QR;
- activity & insights;
- import/export/backup/restore;
- lifecycle/account/recovery;
- Phase C1 SpendIntent overlay.

## Next

Stage 4 will audit this graph for completeness, orphaned or duplicate ownership, missing context across routes, and then **derive** the Gate B construction packet from the same schema rather than writing another manual plan.
