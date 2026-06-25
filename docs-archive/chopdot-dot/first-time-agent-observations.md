# ChopDot.dot First-Time Agent Observations

Generated from a clean browser run against the local ChopDot app on 2026-06-09.

Update: the visible demo naming issue found in this run was corrected to `Nina`. For the newer separate-device finding, see `multi-device-agent-observations.md`.

Scenario: three first-time savings-circle members try to use `Friday savings circle`.

Agents:
- Leo: on-time member and round receiver.
- Nina: missed-payment member.
- Omar: member who needs to mark his contribution paid.

## Plain-English Result

The three contributors could each mark their own contribution as paid, but they could not complete the round. That is correct from a trust standpoint because Mina, the treasurer, still has to confirm receipt.

The problem is the experience does not make that journey feel natural enough yet. First-time users can get stuck because the screen mixes global round status with the active person's own task.

## Agent Walkthrough

### Leo

What happened:
- Leo opened the savings circle and immediately saw: `Leo still needs to mark paid`.
- The primary pink action was visible.
- Leo clicked `Mark paid`.
- The screen correctly changed to: `Mina needs to confirm receipt`.

Observation:
- Leo's first action was clear.
- After Leo marked paid, he could not do much else. That is correct, but the app should say something like `Waiting for Mina to confirm Leo's payment` more strongly.

Verdict: Leo can achieve his individual job.

### Nina

What happened:
- After switching to Nina, the hero still said `Mina needs to confirm receipt` because Leo's payment was waiting for Mina.
- Nina could still find her own row and click `Mark paid`.
- After clicking, the screen showed that Mina needed to confirm both Leo and Nina.

Observation:
- The name mismatch is a trust issue.
- Nina's own action was available, but not promoted as the main action. A first-time user may think the screen is not for them because the headline is about Mina and Leo.

Verdict: Nina can complete her action, but the flow is too easy to misread.

### Omar

What happened:
- Omar switched in after Leo and Nina had marked paid.
- The hero still focused on Mina needing to confirm Leo.
- Omar could find his own row and click `Mark paid`.
- After Omar acted, all three contributions were marked paid, but none were confirmed.

Observation:
- Omar can act, but his task is buried below the global blocker.
- After all three contributors act, the app should switch from `Mina needs to confirm receipt` to a stronger grouped message like `Mina needs to confirm 3 payments`.

Verdict: Omar can complete his action, but the screen does not explain the group state well enough.

## 2026-06-20 follow-up: checklist T2 closeout

The following checks were reviewed against the current product flow:

- Savings circle: Leo, Nina, Omar, and Mina each see one clear top action in their turn (`Mark paid`, `Confirm received`, or `Prepare/Approve payout`).
- Emergency pot: contributors and organizer can proceed through contribution, approval readiness, release claim, receiver confirm, and closeout using one clear guided action.
- Community fund: contributors, two approvers, payer, and receiver each have a clear next action through approval and release confirmation flow.
- normal mode does not show dev-only controls (`Act as`, token rail, failed transfer drill, raw JSON receipt) without query switches.
- The flow is still single-session in browser for emergency/community in this lane; shared-state synchronization is tested end-to-end for savings circle in `native-session` spec.

The practical user result is that the same mode now behaves as a normal pot card in the app, not a detached lab surface.

## 2026-06-20 follow-up: grouped confirmations

The grouped confirmation gap from the original run is now covered.

When Leo and Nina both mark paid before Mina opens the round, the group-state panel now says:

```text
Mina needs to confirm 2 payments
```

The treasurer still gets the safer per-person worklist:

```text
Confirm Leo
Confirm Nina
```

Verification:

```bash
NATIVE_SESSION=1 npx playwright test tests/e2e/chopdot-dot-native-session.spec.ts --project=native-session --workers=1 --grep "grouped pending confirmations"
```

Result:

```text
1 passed
```

## 2026-06-20 follow-up: active person priority

The People tab now makes the current person's view obvious.

When Omar opens the savings circle from his own device and switches to People:

- Omar's participant card appears first;
- Omar's card shows a `You` badge;
- Omar's payment row appears first in payment details;
- the row keeps the normal `Mark paid` action.

Verification:

```bash
NATIVE_SESSION=1 npx playwright test tests/e2e/chopdot-dot-native-session.spec.ts --project=native-session --workers=1 --grep "active person"
```

Result:

```text
1 passed
```

## Product Findings

1. Contributor jobs work, but the app needs a clearer `Your task` layer.
   - If I am Nina or Omar, the top of the screen should show my own open action even if the global round blocker is Mina.

2. The global blocker is truthful, but too dominant.
   - `Mina needs to confirm receipt` is true, but it hides that Nina and Omar can still mark paid.
   - Follow-up: when multiple payments are waiting, the group-state panel now summarizes them as grouped pending confirmations.

3. The app needs better post-action handoff language.
   - After a member marks paid, show: `You are done for now. Waiting for Mina to confirm.`

4. The contributor list should prioritize the current person.
   - If Omar is active, Omar's row should move to the top or get a stronger visual treatment.

5. The payout panel appears too early.
   - `Prepare payout` is visible before the round is ready. Even when it is not clickable, it reads like an available step.
   - Better copy: `Payout waits until contributions are confirmed`.

6. The demo identity model leaks into the experience.
   - `Act as Mina` is useful for local testing, but real users need identity from invite/auth context.
   - For demos, the active person should be shown in the top area so testers understand whose view they are using.

7. Name consistency matters.
   - The scenario and app now both use Nina. In money contexts, small identity mismatches create distrust.

## Recommended Improvements

Highest priority:
- Add a `Your task` module above global status.
- Keep active-person priority covered in People as flows expand beyond seeded participants.
- After each `Mark paid`, show a clear waiting state for the actor.
- Keep grouped confirmation copy covered as more modes add larger groups.

Next:
- Keep seed participant names aligned with the test scenarios.
- Replace early `Prepare payout` copy with a waiting explanation until release is actually actionable.
- In dev/demo mode, show `Viewing as Leo/Nina/Omar` near the top, not only inside the People tab.

## Bottom Line

The underlying trust model is right: claim is not confirmation, and contributors cannot close the round alone. The next UX improvement is making each person's own job obvious without losing the shared group truth.
