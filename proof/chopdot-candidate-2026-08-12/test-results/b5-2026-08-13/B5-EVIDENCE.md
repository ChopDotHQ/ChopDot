# Batch 5 evidence — UX and spending-group cards

Date: 2026-08-13

Candidate: `b5-2026-08-13`

Scoped source aggregate SHA-256: `6b92e3217621c565b3daf0801dfc1a8693ede3101197a8cb78d4c1c6363d0317`

Package-lock SHA-256: `27dc2921197845c57dbba6556dde28892eef098acd591e3542b30315245a1c6c`

## Product gate

- User journey: Mina needs to understand the dinner group and its next action at a glance so the group can collect, confirm, and close without instructions.
- One next action: `Review this spend`.
- Friction 3/3, trust 3/3, clarity 3/3, language 1/1. Total 10/10 — PASS.
- The preview is explicitly labeled and creates no stored group or money state.
- The real card is projected from the Batch 4 `DinnerJourneySnapshot`; it introduces no accounting, membership, delivery, persistence, or signing authority.

## Exact Batch 5 commands

| Command | Result |
| --- | --- |
| `npx playwright test tests/showcase-entrance.spec.ts tests/candidate-batch5-lifecycle-card.spec.ts --config=playwright.host-sim.config.ts --workers=1` | PASS — 4/4 |
| `npx playwright test tests/candidate-batch5-accessibility.spec.ts --config=playwright.host-sim.config.ts --workers=1` | PASS — 6/6 |
| `node proof/chopdot-candidate-2026-08-12/verify-comprehension-evidence.mjs` | PASS — 10/10 B5 controls |

Fresh source checks also passed: `npx tsc --noEmit`, `npm run lint`, `npm run security:baseline` (127 files), and `npm run build`. Vite retains the existing non-blocking warning that the largest generated chunk is 843.54 kB.

## Lifecycle and hard-state proof

The actual App passed one isolated Mina/Leo/Nina flow through:

1. honest CHF 120 preview;
2. empty receipt-first Catch;
3. payer request;
4. marked paid;
5. receiver confirmation;
6. offline saved action and retry;
7. everyone settled;
8. one immutable saved record;
9. loading;
10. unavailable safe stop.

The runtime comprehension artifact records one `GROUP_CLOSED` event, exact CHF 120.00, Mina/Leo/Nina, all six lifecycle card states, both required viewports, no infrastructure language, and no preview-created money state:

- `test-results/b5-2026-08-13/comprehension-observations.json`

## Accessibility proof

The actual entrance and hard-state route passed:

- semantic main/heading/article/action structure;
- accessible card and button names;
- one visible primary action;
- keyboard activation and visible focus;
- 44px minimum target audit;
- no duplicate IDs, unnamed visible buttons, unlabelled inputs, or images without alt text;
- WCAG AA contrast for the core foreground/background pairs;
- reduced-motion animation suppression;
- 200% equivalent reflow without horizontal overflow;
- desktop 1280×720 and mobile 390×844 checks.

This is an automated and keyboard/visual local audit. It is not a claim of certification by assistive-technology users or a real-device live `.dot` audit.

## Screenshot review

Eleven fresh screenshots live under `screenshots/b5-2026-08-13/`.

Manual visual review found and corrected three failures before this receipt:

- the entrance action was browser-visible but clipped by the 1280×720 app shell;
- lifecycle state changes preserved scroll position and could clip the saved heading;
- long state pills crowded the group name and the saved summary collided with the amount.

The corrected screenshots show the complete entrance action, full receiver action, full saved action, readable group name, distinct status tone, and no clipping at the required viewports.

## Earlier-batch regression

After the visual changes, all declared local B1–B4 command groups were rerun successfully:

- B1 signed membership/domain foundation and 5/5 invitation UI;
- B2 membership 54/54, recipient bootstrap 6/6, limited action 8/8, request links 4/4, preview 6/6, router 2/2, actual participation 5/5, limited route 2/2;
- B3 money/event 15/15, recovery 6/6, fresh-device UI 3/3, secret boundary 4/4;
- B4 dinner domain 3/3, authority/state 102/102, actual full loop 2/2, capability inheritance 10/10.

One stale B1 UI assertion expected the older `Leo declined` copy. The visible product correctly rendered `Invite declined / You were not added to Zurich Dinner`; the assertion was updated to the current plain-language outcome and the exact suite then passed 5/5. No membership behavior changed.

## Verdict

- B5 local: PASS, 10/10 controlled requirements and 3/3 exact commands.
- B5 live: BLOCKED. No live `.dot` entry or real-device viewport command was run.
- Deployment/publication: not performed and not authorized by this receipt.
- Documentation impact: P-033, current product state, and the cockpit checkpoint must record this evidence. No ADR change is needed because authority boundaries did not change.
