# J02 — canonical Home and contextual navigation

Owner: Codex. Status: implementation authorized by user on 2026-10-12;
new journey work paused until user reviews the result.

## Current truth to preserve

Use J02_CONTINUATION_2026-10-12.md, Surface Clarity V1 and frozen J02 sources.
Schema `5107e64b`, Golden/C1 `4ba456e6` stay immutable. No financial/auth domain
change. Guest exploration, stable records/drafts and selected guest-first entry
remain. Root Home is distinct from selected Group Home. Navigation is not a
domain effect. No fabricated account, wallet, money, shared people or finality.

## Goal / scope

Finish UX-005 and SC-J02-001/002/003; reproduce and regress Back → Forward.
In: canonical projection after history restoration; root tab routing; secondary
tools through existing You/Activity/group owners; real screen and return checks.
Out: new journeys/capabilities, frozen sources, payments/auth semantics, native
work, production, whole-product accessibility or human-comprehension certification.

## Product gate

User journey: I am a person exploring or returning to ChopDot, I need to find my
group or next task, so the group can keep its shared work moving.
One next action: empty Home — Start a group; returning Home — continue the
selected group's task (Add expense / Add money), with groups plainly reachable.
State change: navigation only until the existing owner receives an explicit action.
Authority: current local actor and existing owner guards; no new permissions.
Result: current saved work and the correct destination. Failure: truthful existing
capability boundary with a usable exit. Friction 3/3, Trust 3/3, Clarity 2/3,
Language 1/1 = 9/10. Implement this bounded correction; score is design judgment,
not observed human comprehension. Actual screenshots may falsify it.

## Surface Clarity decision / prediction

Bind: source `dfa8ed82`, runtime digest in continuation receipt. J02 has no
certified task path and owns no operation. Home/Pots/People/Activity/You piece
anchors are authority-accounted EXTERNAL_HANDOFF, not executable semantics.

CORRECT: route identity on actual frame load, not stale mutable journey flags.
CORRECT: People opens existing J09 directory or truthful supported boundary.
CORRECT: bottom Pots and no-group returns reach root Home; explicit group actions
retain Group Home. KEEP canonical records and explicit account/payment boundaries.
CORRECT: remove Home's tools directory. Use You for payment/data tools, Activity
for Insights, and group browsing for Savings/All groups. No supported route deleted.
Prediction: empty Home makes the first-group task obvious and navigation becomes
predictable. Cost: tools require visiting their owning section. Test reachability
and valid exits for each. No new product meaning is introduced.

## SHALL / scenarios / visual acceptance

R1–R7 and GIVEN/WHEN/THEN scenarios are retained from the continuation record.
Additionally, GIVEN a restored frame, WHEN native Back or Forward fires, THEN
the wrapper recognizes the actual loaded source and applies only its owner behavior.
GIVEN Home, WHEN a secondary tool is sought, THEN it is reachable through its
named owner and returning does not create/alter groups, expenses or accounts.
At 393×852, 430×890 and desktop: inspect empty/populated Home and People/Activity/
You destinations; no sample money, internal harness copy, clipping or overlap;
header/footer stay visible, content scrolls, enabled controls are readable.

## Ordered tasks / proof

1. Capture baseline normal UI failure and add native Back → Forward regression.
2. Fix source-aware wrapper dispatch and contextual return navigation.
3. Place retained tools in their owners and inspect complete screens.
4. Run new J02 UI tests plus retained J01, A–D, membership and family checks.
   Full runner archives committed HEAD; test exact committed runtime.
5. Record source links, disposition, logs and screenshots; package exact bytes;
   present local preview before any journey expansion. Self-review is self-review.

Documentation impact: J02 record/findings, schema trace, usage and continuation
status must be updated. No wiki/ADR update needed for this bounded prototype repair.
CI discovery conflict remains separate unless this repair requires a test config
change. Local proof does not clear CI, hosted, devices or human acceptance.
