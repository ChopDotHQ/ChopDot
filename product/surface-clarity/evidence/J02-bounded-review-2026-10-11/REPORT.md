# J02 bounded Surface Clarity review — 2026-10-11

The framework found concrete navigation/state issues as well as a styling hypothesis. This is a partial first-use review of the existing hosted prototype, not current-candidate clearance, J02 acceptance or a review of all 28 journeys.

## Tested version and scope

- Sites version 13, version ID `appgprj_6abeef79b7308191ba28f35d4fa246ce~appgver_bca6e3f100388191a83009df177f5b59`.
- Hosting-source commit metadata: `3c33539b2a25ac5d26a05b444b78c1eff06d1d7d`.
- Archive metadata hash: `sha256:065588d9295256fb3ec6a2656ff539817861376f3f6dcf39934f817369ec88d6`. Archive bytes were not independently downloaded/hashed.
- This hosting SHA did not resolve as a ChopDotHQ/ChopDot Git commit. It must not be described as GitHub implementation SHA `4b29bfac` or `bd464571`.
- Source inspected separately at GitHub `bd464571c578bbaf04bf208e14e2a7bc631a7263`; frozen schema `5107e64b1b2a0cb0eddd34f8235dfd6ae1d54013`; Golden/C1 `4ba456e6595330e4ca8e21366e0d827f17e10881`.
- Actual browser 1363×936, embedded product 428×878. Mandatory 393×852 and 430×890 comparisons were not executed.
- Empty guest state only. No group/expense submitted, business store reset, real identity/account/provider/funds/signing operation or external message.

See [results.json](results.json) for cases, outcomes, findings and exact schema references, and [interaction-log.md](interaction-log.md) for the direct UI reproduction.

## Findings

| ID | Observation | Smallest next action |
| --- | --- | --- |
| SC-J02-001 | Native Back from Start a group twice showed raw Golden sample groups, +CHF 132.20 and a Connected wallet rather than the same empty guest Home. Reload restored Guest / No groups yet. | Reapply the canonical Home projection and incoming guest/account mode on restored child navigation; add a native Back regression. |
| SC-J02-002 | Home People tab changed only a # fragment; no destination or unavailable explanation. Current source also lacks a People branch in J02 dispatch. | Wire the existing owner/context or supported boundary; do not invent a new People feature. |
| SC-J02-003 | Empty guest Insights return and Activity Pots return targeted Group Home, then a missing-group fallback with Gate A terminology. Following the fallback exit worked. | Preserve root Home versus selected Group Home routing and use truthful user-facing recovery wording. |
| UX-005, retained | Eight secondary buttons are enabled but pale and dashed. Start a group is clearly primary. | Styling is observed; actual choice confusion remains a user-test hypothesis. Avoid a hierarchy redesign based only on an agent's impression. |

All three new findings remain open. UX-006 expense-success return was not exercised because this audit did not save an expense.

## Behaviors to retain

Guest Home identifies guest scope and a clear first task. Start a group opens creation without creating a group. Reload restores the actual empty state. Insights refuses private records. Activity shows truthful empty activity. Recovery eventually provides an operable exit. No permissions, verification or domain writes were inferred from navigation.

## Schema connection

J02 owns no domain operation. Its frozen projection renders `view.home`; this view derives from attention, group, position and session inputs. The cited Home/tab pieces are authority-accounted or EXTERNAL_HANDOFF with empty `schema_refs`. The observed fixes concern display provenance and navigation ownership; they are not payment execution or a demonstrated semantic-verifier bypass.

The source-backed J02 goal is attention/group orientation, with meaningful routes and preserved mobile hierarchy. There is no certified J02 V1 task path. We preserve that limit, frozen source IDs and the distinction between schema relationships and UX evidence.

## What this teaches the process

1. Starting with an ordinary first-use route and testing Back found a defect that a static Golden screenshot could conceal.
2. Record actual version identity before using evidence: the old hosted build is not the repaired GitHub candidate.
3. Link finding, actual control (or explicit missing ID), context, authority, reproduction and proposed correction in the same record.
4. Keep rendering observations separate from comprehension hypotheses. Enabled-but-faint buttons are real; confused users have not been observed.
5. Retain passing behaviors and context-sensitive recovery; do not make the prototype pass by stripping supported routes.
6. The bookkeeping checker is not a browser test or usability judge. Historical records were not rebound, new observations were not declared independent review, and no ready status was manufactured.

Continue with bounded journeys, but resolve and retest these demonstrated issues on the actual candidate before treating J02 as complete. Current-version execution, canonical visual checks, recovery/returning actors, independent review and human comprehension remain distinct steps.
