# UX Coverage Diagnostics

**Derived diagnostics only — Goldens/specs remain product authority.**

These outputs answer two questions: what is visible/actionable in each approved journey, and how much interaction friction the current prototype graph suggests. Step counts marked heuristic are not canonical user-task counts.

## Coverage summary

- Journeys parsed: **28 / 28**
- Screen/state surfaces found: **667**
- Action instances found: **2226**
- Field instances found: **20**

## Journey overview

| J | Journey | States | Fields | Actions | Min transitions | Est. min interactions | Confidence |
|---|---|---:|---:|---:|---:|---:|---|
| J01 | Enter ChopDot | 1 | 0 | 0 | — | — | single_surface_no_transition_metric |
| J02 | Home / Orientation | 1 | 0 | 12 | — | — | single_surface_no_transition_metric |
| J03 | Create a Group | 11 | 1 | 30 | 1 | 1 | heuristic_static_prototype_graph |
| J04 | Invite / Join a Group | 14 | 1 | 26 | 1 | 1 | heuristic_static_prototype_graph |
| J05 | Add an Expense | 27 | 10 | 84 | 1 | 3 | verified_required_inputs_plus_derived_transitions |
| J06 | Review / Correct an Expense | 31 | 4 | 112 | 3 | 3 | heuristic_static_prototype_graph |
| J07 | Review / Agree / Raise an Issue | 61 | 0 | 158 | 2 | 2 | heuristic_static_prototype_graph |
| J08 | Group Home | 19 | 0 | 54 | — | — | heuristic_static_prototype_graph |
| J09 | Manage People | 1 | 0 | 0 | — | — | single_surface_no_transition_metric |
| J10 | Overall Position | 34 | 0 | 157 | — | — | heuristic_static_prototype_graph |
| J11 | Settle Up | 93 | 2 | 270 | 3 | 3 | heuristic_static_prototype_graph |
| J12 | Complete Settlement | 67 | 0 | 175 | 1 | 1 | heuristic_static_prototype_graph |
| J13 | Request Money | 1 | 0 | 0 | — | — | single_surface_no_transition_metric |
| J14 | Receive / Share Payment Details | 1 | 0 | 0 | — | — | single_surface_no_transition_metric |
| J15 | Settlement History | 9 | 0 | 35 | 1 | 1 | heuristic_static_prototype_graph |
| J16 | Savings Group | 14 | 0 | 55 | — | — | heuristic_static_prototype_graph |
| J17 | Contribute / Withdraw Savings | 21 | 2 | 96 | 2 | 2 | heuristic_static_prototype_graph |
| J18 | Activity & Notifications | 36 | 0 | 193 | 1 | 1 | heuristic_static_prototype_graph |
| J19 | Insights | 27 | 0 | 139 | — | — | heuristic_static_prototype_graph |
| J20 | Payment Methods | 59 | 0 | 299 | — | — | heuristic_static_prototype_graph |
| J21 | Wallet & Crypto | 47 | 0 | 98 | 9 | 9 | heuristic_static_prototype_graph |
| J22 | QR Flows | 45 | 0 | 106 | — | — | heuristic_static_prototype_graph |
| J23 | Import Data / Group | 42 | 0 | 97 | — | — | heuristic_static_prototype_graph |
| J24 | Export / Portability | 1 | 0 | 6 | — | — | single_surface_no_transition_metric |
| J25 | Storage / Backup / Recovery | 1 | 0 | 6 | — | — | single_surface_no_transition_metric |
| J26 | Group Lifecycle | 1 | 0 | 6 | — | — | single_surface_no_transition_metric |
| J27 | Account & Preferences | 1 | 0 | 6 | — | — | single_surface_no_transition_metric |
| J28 | Things Go Wrong / Recovery | 1 | 0 | 6 | — | — | single_surface_no_transition_metric |

## How to use this

- Surface inventory exposes buttons/fields/states that exist in approved artifacts.
- Semantic action mappings show where a visible action is tied to a schema operation; missing mappings are coverage questions, not automatically product defects.
- Shortest transitions are useful for spotting obviously long paths, but only certified task paths should be used for UX optimization decisions.
- Required inputs come from schema construction requirements when explicitly approved; they are not inferred from placeholder HTML.

Generated files: ui-surface-inventory.json, journey-path-metrics.json, UX_COVERAGE.md

