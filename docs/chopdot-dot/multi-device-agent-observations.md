# ChopDot.dot Multi-Device Agent Observations

Generated from a local browser simulation on 2026-06-09.

Scenario: Leo, Nina, and Omar each approach the Friday savings circle from their own device for the first time.

## Plain-English Result

The guided single-person screen is stronger: each person sees their own next job first and the top action stays obvious.

For the checklist finish, this lane now passes the first-time UX requirement by name and role.

Shared-state behavior is proven for the savings-circle native session path (same session id across browsers). Emergency pot and community fund are confirmed by full UI flow in the local pot route, with shared-state convergence work still remaining for native-host multi-device.

## What Each Person Saw

### Leo

Leo opened the savings circle and saw a clear personal task:

- `Viewing as Leo`
- `Mark your payment`
- `$100 to Mina for this round`
- primary action: `Mark paid`

After Leo marked paid, the screen changed to:

- `You are waiting for confirmation`
- `Mina still needs to confirm your $100 payment`

Finding: Leo's individual job now makes sense. The app tells him he is done for now and waiting on Mina.

### Nina

Nina opened from a separate device. Because the current demo state is local to each browser, she did not see Leo's completed action from Leo's device. Her device still looked like a fresh copy of the same pot.

Finding: Nina can understand her own job, but she cannot trust the shared group picture unless device state is synced.

### Omar

Omar opened from a separate device and had the same issue. He could act in his own local copy, but his screen did not reliably reflect Leo or Nina's real actions.

Finding: Omar's flow is usable in isolation, but not as a real savings-circle participant until the pot has shared state.

## What Improved

- The top of the pot now starts with the active person's task.
- `Mark paid` appears as the clear primary action for the person who owes.
- After payment is marked, the person sees a waiting state instead of more controls.
- The current person's payment row is prioritized.
- Payout controls no longer compete with the contribution step before payments are confirmed or noted.
- Visible `Nia` naming was corrected to `Nina` in the demo data.

## What Is Still Wrong

1. Too much is still one view.
   - Overview is doing personal task, group status, money in, payout, and receipt preview at once.
   - A first-time user needs a guided step flow, then a status board, not everything equally visible.

2. Separate devices do not share truth.
   - Local guest storage makes every device act like its own private copy.
   - That breaks the core promise for savings circles, emergency pots, and community funds.

3. Demo controls still leak into the product feel.
   - `Act as Mina` is useful for testing, but real users should never feel like they are role-playing the group.
   - In production, identity should come from invite/auth context.

4. Reload/share recovery is weak.
   - A person should be able to reopen a shared pot link and land back in the right pot, person, and state.

5. The product needs person-specific guidance.
   - Leo should see "Mark paid."
   - Mina should see "Confirm Leo."
   - Nina should see her own contribution, not be distracted by Mina's backlog.
   - Omar should see whether he is still needed or done for now.

## Product Decision

Do not treat ChopDot.dot as ready just because the local UI actions pass.

The next product requirement is a shared session model:

- invite link opens the same pot for each person
- each person has their own identity and permissions
- state changes sync across devices
- the pot shows one shared truth, with each person seeing their own next action first

## 2026-06-20 status update

- What is good enough for 99% UX pass: primary action clarity in all modes and per-person action visibility.
- What is still required for native host: cross-device convergence for emergency and community paths before live `.dot`.

## Next Move

Rebuild the savings-circle flow around three screens instead of one dense board:

1. `Your turn`
   - one job, one primary action, one waiting state

2. `Group status`
   - who paid, who confirmed, who is late, who is next

3. `Round record`
   - notes, payout readiness, closeout receipt

Then add native-host cross-device convergence before the final live `.dot` rollout. Without shared state across simulated devices, we are not testing the real behavior that matters.
