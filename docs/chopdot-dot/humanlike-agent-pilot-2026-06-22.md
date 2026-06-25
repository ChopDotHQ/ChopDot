# ChopDot Human-Like Agent Pilot

Status: `user-review-pending`
Generated: 2026-06-25T07:44:39.809Z
Session: `humanlike-agent-2026-06-25-l1l2-wallet-live`
Base URL: `http://127.0.0.1:5173`

## Method

Agents used the normal ChopDot app surface only. They did not call the kernel, use developer flags, reset state through test endpoints, or promote themselves from code assertions. Each agent opened the app as their own person, read the visible screen, recorded a first reaction, chose whether to click a visible normal app action, and captured a screenshot.

Promotion rule: this is agent evidence for user review. It becomes a human-style pass only if the operator reviews the reactions/screenshots and approves that the behavior makes sense.

## Summary

- Steps: 42
- Runtime errors: 0
- Visible normal app actions clicked: 41
- Deliberate wait/no-action states: 1
- Expected actions missing after waiting: 0

## Scenario Outcomes

| Scenario | Final state | Steps | Missing expected actions | Final screenshot |
| --- | --- | ---: | ---: | --- |
| Group expense | closed | 11 | 0 | /Users/devinsonpena/ChopDot/artifacts/chopdot-humanlike-agents/2026-06-25/humanlike-agent-2026-06-25-l1l2-wallet-live/11-group-mina-close-the-split-record.png |
| Savings circle | closed | 11 | 0 | /Users/devinsonpena/ChopDot/artifacts/chopdot-humanlike-agents/2026-06-25/humanlike-agent-2026-06-25-l1l2-wallet-live/22-savings-mina-close-the-round-receipt.png |
| Emergency pot | closed | 10 | 0 | /Users/devinsonpena/ChopDot/artifacts/chopdot-humanlike-agents/2026-06-25/humanlike-agent-2026-06-25-l1l2-wallet-live/32-emergency-riley-close-redacted-pot-receipt.png |
| Community fund | closed | 10 | 0 | /Users/devinsonpena/ChopDot/artifacts/chopdot-humanlike-agents/2026-06-25/humanlike-agent-2026-06-25-l1l2-wallet-live/42-community-alex-close-the-period-handoff-record.png |

## What This Proved

- People could enter as guest, open real ChopDot pots, and act from their own person/device context.
- Mark paid stayed separate from Confirm received.
- Approval stayed separate from release and receiver confirmation.
- Emergency and community records closed only after the release path completed.
- Savings circle handled a deliberate missed contribution through a delay note before closeout.

## Still Needs Operator Review

This run proves the app can be driven through normal surfaces by simulated people. It does not prove real human comprehension until the operator reviews the reactions and screenshots and approves that the behavior makes sense.

## Agent Reactions

### 1. group / Leo

- Role: group expense payer
- Job: mark his dinner share paid
- First reaction: Leo sees "Mark your payment" and the main available action is "Mark paid".
- Decision: click-primary
- Decision reason: The normal app surface is asking Leo to use "Mark paid" now.
- Action taken: clicked "Mark paid"
- Unsafe assumption check: Mark paid is only my claim; the receiver or organizer still needs to confirm what arrived.
- Money-model check: I am recording my payment claim, not closing the group.
- Receipt/return check: There is a receipt preview or record area to return to later.
- After-state: next: You’re done for now | blockers: Group state 0/3 handled Mina needs to confirm receipt Leo marked $80 paid. Mina needs to confirm Leo. Nina has not marked $75 paid. Omar has not marked $70 paid. | record: receipt preview visible
- Screenshot: /Users/devinsonpena/ChopDot/artifacts/chopdot-humanlike-agents/2026-06-25/humanlike-agent-2026-06-25-l1l2-wallet-live/01-group-leo-mark-his-dinner-share-paid.png

### 2. group / Nina

- Role: group expense payer
- Job: mark her dinner share paid
- First reaction: Nina sees "Mark your payment" and the main available action is "Mark paid".
- Decision: click-primary
- Decision reason: The normal app surface is asking Nina to use "Mark paid" now.
- Action taken: clicked "Mark paid"
- Unsafe assumption check: Mark paid is only my claim; the receiver or organizer still needs to confirm what arrived.
- Money-model check: I am recording my payment claim, not closing the group.
- Receipt/return check: There is a receipt preview or record area to return to later.
- After-state: next: You’re done for now | blockers: Group state 0/3 handled Mina needs to confirm 2 payments Leo, Nina marked $155 paid in total. Confirm each only if money arrived. Mina needs to confirm Leo. Mina needs to confirm… | record: receipt preview visible
- Screenshot: /Users/devinsonpena/ChopDot/artifacts/chopdot-humanlike-agents/2026-06-25/humanlike-agent-2026-06-25-l1l2-wallet-live/02-group-nina-mark-her-dinner-share-paid.png

### 3. group / Omar

- Role: group expense payer
- Job: mark his dinner share paid
- First reaction: Omar sees "Mark your payment" and the main available action is "Mark paid".
- Decision: click-primary
- Decision reason: The normal app surface is asking Omar to use "Mark paid" now.
- Action taken: clicked "Mark paid"
- Unsafe assumption check: Mark paid is only my claim; the receiver or organizer still needs to confirm what arrived.
- Money-model check: I am recording my payment claim, not closing the group.
- Receipt/return check: There is a receipt preview or record area to return to later.
- After-state: next: You’re done for now | blockers: Group state 0/3 handled Mina needs to confirm 3 payments Leo, Nina, Omar marked $225 paid in total. Confirm each only if money arrived. Mina needs to confirm Leo. Mina needs to co… | record: receipt preview visible
- Screenshot: /Users/devinsonpena/ChopDot/artifacts/chopdot-humanlike-agents/2026-06-25/humanlike-agent-2026-06-25-l1l2-wallet-live/03-group-omar-mark-his-dinner-share-paid.png

### 4. group / Mina

- Role: receiver organizer
- Job: confirm Leo only if money arrived
- First reaction: Mina sees "Confirm Leo" and the main available action is "Confirm received".
- Decision: click-primary
- Decision reason: The normal app surface is asking Mina to use "Confirm received" now.
- Action taken: clicked "Confirm received"
- Unsafe assumption check: I should confirm only if money actually arrived.
- Money-model check: A claim becomes confirmed only when I record receipt.
- Receipt/return check: There is a receipt preview or record area to return to later.
- After-state: next: Confirm Nina | blockers: Group state 1/3 handled Mina needs to confirm 2 payments Nina, Omar marked $145 paid in total. Confirm each only if money arrived. Mina needs to confirm Nina. Mina needs to confir… | record: receipt preview visible
- Screenshot: /Users/devinsonpena/ChopDot/artifacts/chopdot-humanlike-agents/2026-06-25/humanlike-agent-2026-06-25-l1l2-wallet-live/04-group-mina-confirm-leo-only-if-money-arrived.png

### 5. group / Mina

- Role: receiver organizer
- Job: confirm Nina only if money arrived
- First reaction: Mina sees "Confirm Nina" and the main available action is "Confirm received".
- Decision: click-primary
- Decision reason: The normal app surface is asking Mina to use "Confirm received" now.
- Action taken: clicked "Confirm received"
- Unsafe assumption check: I should confirm only if money actually arrived.
- Money-model check: A claim becomes confirmed only when I record receipt.
- Receipt/return check: There is a receipt preview or record area to return to later.
- After-state: next: Confirm Omar | blockers: Group state 2/3 handled Mina needs to confirm receipt Omar marked $70 paid. Mina needs to confirm Omar. | record: receipt preview visible
- Screenshot: /Users/devinsonpena/ChopDot/artifacts/chopdot-humanlike-agents/2026-06-25/humanlike-agent-2026-06-25-l1l2-wallet-live/05-group-mina-confirm-nina-only-if-money-arrived.png

### 6. group / Mina

- Role: receiver organizer
- Job: confirm Omar only if money arrived
- First reaction: Mina sees "Confirm Omar" and the main available action is "Confirm received".
- Decision: click-primary
- Decision reason: The normal app surface is asking Mina to use "Confirm received" now.
- Action taken: clicked "Confirm received"
- Unsafe assumption check: I should confirm only if money actually arrived.
- Money-model check: A claim becomes confirmed only when I record receipt.
- Receipt/return check: There is a receipt preview or record area to return to later.
- After-state: next: Prepare reimbursement | blockers: Group state 3/3 handled Prepare release dinner reimbursement to mina $225 planned for Mina. Release dinner reimbursement to Mina has not been prepared yet. | record: receipt preview visible
- Screenshot: /Users/devinsonpena/ChopDot/artifacts/chopdot-humanlike-agents/2026-06-25/humanlike-agent-2026-06-25-l1l2-wallet-live/06-group-mina-confirm-omar-only-if-money-arrived.png

### 7. group / Mina

- Role: receiver organizer
- Job: prepare the reimbursement record
- First reaction: Mina sees "Prepare reimbursement" and the main available action is "Prepare reimbursement".
- Decision: click-primary
- Decision reason: The normal app surface is asking Mina to use "Prepare reimbursement" now.
- Action taken: clicked "Prepare reimbursement"
- Unsafe assumption check: Do not assume money moved, was received, or the record can close just because a prior step exists.
- Money-model check: Claim, confirmation, approval, release, and closeout are separate states.
- Receipt/return check: There is a receipt preview or record area to return to later.
- After-state: next: Approve release | blockers: Group state 3/3 handled Waiting for approval Release dinner reimbursement to Mina needs approval before money is marked released. Mina still needs to approve. | record: receipt preview visible
- Screenshot: /Users/devinsonpena/ChopDot/artifacts/chopdot-humanlike-agents/2026-06-25/humanlike-agent-2026-06-25-l1l2-wallet-live/07-group-mina-prepare-the-reimbursement-record.png

### 8. group / Mina

- Role: receiver organizer
- Job: approve release readiness
- First reaction: Mina sees "Approve release" and the main available action is "Approve release".
- Decision: click-primary
- Decision reason: The normal app surface is asking Mina to use "Approve release" now.
- Action taken: clicked "Approve release"
- Unsafe assumption check: Approval means release readiness, not that payment already happened.
- Money-model check: Approval is separate from release and receiver confirmation.
- Receipt/return check: There is a receipt preview or record area to return to later.
- After-state: next: Record the release | blockers: Group state 3/3 handled Ready to mark released $225 can be recorded once it moves outside ChopDot. Release dinner reimbursement to Mina is approved but not marked released. | record: receipt preview visible
- Screenshot: /Users/devinsonpena/ChopDot/artifacts/chopdot-humanlike-agents/2026-06-25/humanlike-agent-2026-06-25-l1l2-wallet-live/08-group-mina-approve-release-readiness.png

### 9. group / Mina

- Role: receiver organizer
- Job: record the outside reimbursement
- First reaction: Mina sees "Record the release" and the main available action is "Mark released outside ChopDot".
- Decision: click-primary
- Decision reason: The normal app surface is asking Mina to use "Mark released outside ChopDot" now.
- Action taken: clicked "Mark released outside ChopDot"
- Unsafe assumption check: Released outside ChopDot means external movement was recorded, not guaranteed by ChopDot.
- Money-model check: Release record still needs receiver confirmation where required.
- Receipt/return check: There is a receipt preview or record area to return to later.
- After-state: next: Confirm the release | blockers: Group state 3/3 handled Mina needs to confirm receipt Release dinner reimbursement to Mina was marked released outside ChopDot. Mina has not confirmed receipt. | record: receipt preview visible
- Screenshot: /Users/devinsonpena/ChopDot/artifacts/chopdot-humanlike-agents/2026-06-25/humanlike-agent-2026-06-25-l1l2-wallet-live/09-group-mina-record-the-outside-reimbursement.png

### 10. group / Mina

- Role: receiver organizer
- Job: confirm the release receipt
- First reaction: Mina sees "Confirm the release" and the main available action is "Confirm received".
- Decision: click-primary
- Decision reason: The normal app surface is asking Mina to use "Confirm received" now.
- Action taken: clicked "Confirm received"
- Unsafe assumption check: I should confirm only if money actually arrived.
- Money-model check: A claim becomes confirmed only when I record receipt.
- Receipt/return check: There is a receipt preview or record area to return to later.
- After-state: next: Close split | blockers: Group state 3/3 handled Split ready to close All required items have either been confirmed or noted. Every required item is confirmed. | record: receipt preview visible
- Screenshot: /Users/devinsonpena/ChopDot/artifacts/chopdot-humanlike-agents/2026-06-25/humanlike-agent-2026-06-25-l1l2-wallet-live/10-group-mina-confirm-the-release-receipt.png

### 11. group / Mina

- Role: receiver organizer
- Job: close the split record
- First reaction: Mina sees "Close split" and the main available action is "Close split".
- Decision: click-primary
- Decision reason: The normal app surface is asking Mina to use "Close split" now.
- Action taken: clicked "Close split"
- Unsafe assumption check: Closing should only happen after blockers are resolved or explicitly noted.
- Money-model check: Closeout records the final group state; it should not hide open items.
- Receipt/return check: There is a receipt preview or record area to return to later.
- After-state: next: Nothing for you yet | blockers: Group state 3/3 handled Split ready to close All required items have either been confirmed or noted. Every required item is confirmed. | record: closed receipt visible
- Screenshot: /Users/devinsonpena/ChopDot/artifacts/chopdot-humanlike-agents/2026-06-25/humanlike-agent-2026-06-25-l1l2-wallet-live/11-group-mina-close-the-split-record.png

### 12. savings / Leo

- Role: savings circle member and payout receiver
- Job: make round contribution
- First reaction: Leo sees "Mark your payment" and the main available action is "Mark paid".
- Decision: click-primary
- Decision reason: The normal app surface is asking Leo to use "Mark paid" now.
- Action taken: clicked "Mark paid"
- Unsafe assumption check: Mark paid is only my claim; the receiver or organizer still needs to confirm what arrived.
- Money-model check: I am recording my payment claim, not closing the group.
- Receipt/return check: There is a receipt preview or record area to return to later.
- After-state: next: You’re done for now | blockers: Group state 0/3 handled Mina needs to confirm receipt Leo marked $100 paid. Mina needs to confirm Leo. Nina has not marked $100 paid. Omar has not marked $100 paid. | record: receipt preview visible
- Screenshot: /Users/devinsonpena/ChopDot/artifacts/chopdot-humanlike-agents/2026-06-25/humanlike-agent-2026-06-25-l1l2-wallet-live/12-savings-leo-make-round-contribution.png

### 13. savings / Nina

- Role: savings circle member
- Job: make round contribution
- First reaction: Nina sees "Mark your payment" and the main available action is "Mark paid".
- Decision: click-primary
- Decision reason: The normal app surface is asking Nina to use "Mark paid" now.
- Action taken: clicked "Mark paid"
- Unsafe assumption check: Mark paid is only my claim; the receiver or organizer still needs to confirm what arrived.
- Money-model check: I am recording my payment claim, not closing the group.
- Receipt/return check: There is a receipt preview or record area to return to later.
- After-state: next: You’re done for now | blockers: Group state 0/3 handled Mina needs to confirm 2 payments Leo, Nina marked $200 paid in total. Confirm each only if money arrived. Mina needs to confirm Leo. Mina needs to confirm… | record: receipt preview visible
- Screenshot: /Users/devinsonpena/ChopDot/artifacts/chopdot-humanlike-agents/2026-06-25/humanlike-agent-2026-06-25-l1l2-wallet-live/13-savings-nina-make-round-contribution.png

### 14. savings / Mina

- Role: savings circle treasurer
- Job: confirm Leo only if money arrived
- First reaction: Mina sees "Confirm Leo" and the main available action is "Confirm received".
- Decision: click-primary
- Decision reason: The normal app surface is asking Mina to use "Confirm received" now.
- Action taken: clicked "Confirm received"
- Unsafe assumption check: I should confirm only if money actually arrived.
- Money-model check: A claim becomes confirmed only when I record receipt.
- Receipt/return check: There is a receipt preview or record area to return to later.
- After-state: next: Confirm Nina | blockers: Group state 1/3 handled Mina needs to confirm receipt Nina marked $100 paid. Mina needs to confirm Nina. Omar has not marked $100 paid. | record: receipt preview visible
- Screenshot: /Users/devinsonpena/ChopDot/artifacts/chopdot-humanlike-agents/2026-06-25/humanlike-agent-2026-06-25-l1l2-wallet-live/14-savings-mina-confirm-leo-only-if-money-arrived.png

### 15. savings / Mina

- Role: savings circle treasurer
- Job: confirm Nina only if money arrived
- First reaction: Mina sees "Confirm Nina" and the main available action is "Confirm received".
- Decision: click-primary
- Decision reason: The normal app surface is asking Mina to use "Confirm received" now.
- Action taken: clicked "Confirm received"
- Unsafe assumption check: I should confirm only if money actually arrived.
- Money-model check: A claim becomes confirmed only when I record receipt.
- Receipt/return check: There is a receipt preview or record area to return to later.
- After-state: next: Waiting on the group | blockers: Group state 2/3 handled Omar still needs to mark paid $100 to Mina. Omar has not marked $100 paid. | record: receipt preview visible
- Screenshot: /Users/devinsonpena/ChopDot/artifacts/chopdot-humanlike-agents/2026-06-25/humanlike-agent-2026-06-25-l1l2-wallet-live/15-savings-mina-confirm-nina-only-if-money-arrived.png

### 16. savings / Omar

- Role: savings circle member
- Job: see his missed contribution is still due and leave it unpaid for now
- First reaction: Omar sees "Mark your payment" and deliberately leaves the action for someone else or for later.
- Decision: wait
- Decision reason: Group state 2/3 handled Omar still needs to mark paid $100 to Mina. Omar has not marked $100 paid.
- Action taken: waited
- Unsafe assumption check: Mark paid is only my claim; the receiver or organizer still needs to confirm what arrived.
- Money-model check: I am recording my payment claim, not closing the group.
- Receipt/return check: There is a receipt preview or record area to return to later.
- After-state: next: Mark your payment | blockers: Group state 2/3 handled Omar still needs to mark paid $100 to Mina. Omar has not marked $100 paid. | record: receipt preview visible
- Screenshot: /Users/devinsonpena/ChopDot/artifacts/chopdot-humanlike-agents/2026-06-25/humanlike-agent-2026-06-25-l1l2-wallet-live/16-savings-omar-see-his-missed-contribution-is-still-due-and-leave-it-unpaid-for-now.png

### 17. savings / Mina

- Role: savings circle treasurer
- Job: record Omar delay instead of pretending payment happened
- First reaction: Mina sees "Waiting on the group" and the main available action is "Record delay".
- Decision: click-primary
- Decision reason: The normal app surface is asking Mina to use "Record delay" now.
- Action taken: clicked "Record delay"
- Unsafe assumption check: Do not assume money moved, was received, or the record can close just because a prior step exists.
- Money-model check: Claim, confirmation, approval, release, and closeout are separate states.
- Receipt/return check: There is a receipt preview or record area to return to later.
- After-state: next: Prepare payout | blockers: Group state 3/3 handled Prepare round 1 payout to leo $200 planned for Leo. Round 1 payout to Leo has not been prepared yet. | record: receipt preview visible
- Screenshot: /Users/devinsonpena/ChopDot/artifacts/chopdot-humanlike-agents/2026-06-25/humanlike-agent-2026-06-25-l1l2-wallet-live/17-savings-mina-record-omar-delay-instead-of-pretending-payment-happened.png

### 18. savings / Mina

- Role: savings circle treasurer
- Job: prepare payout after contributions are handled
- First reaction: Mina sees "Prepare payout" and the main available action is "Prepare payout".
- Decision: click-primary
- Decision reason: The normal app surface is asking Mina to use "Prepare payout" now.
- Action taken: clicked "Prepare payout"
- Unsafe assumption check: Do not assume money moved, was received, or the record can close just because a prior step exists.
- Money-model check: Claim, confirmation, approval, release, and closeout are separate states.
- Receipt/return check: There is a receipt preview or record area to return to later.
- After-state: next: Approve payout | blockers: Group state 3/3 handled Waiting for approval Round 1 payout to Leo needs approval before money is marked released. Mina still needs to approve. | record: receipt preview visible
- Screenshot: /Users/devinsonpena/ChopDot/artifacts/chopdot-humanlike-agents/2026-06-25/humanlike-agent-2026-06-25-l1l2-wallet-live/18-savings-mina-prepare-payout-after-contributions-are-handled.png

### 19. savings / Mina

- Role: savings circle treasurer
- Job: approve payout readiness
- First reaction: Mina sees "Approve payout" and the main available action is "Approve payout".
- Decision: click-primary
- Decision reason: The normal app surface is asking Mina to use "Approve payout" now.
- Action taken: clicked "Approve payout"
- Unsafe assumption check: Approval means release readiness, not that payment already happened.
- Money-model check: Approval is separate from release and receiver confirmation.
- Receipt/return check: There is a receipt preview or record area to return to later.
- After-state: next: Record the release | blockers: Group state 3/3 handled Ready to mark released $200 can be recorded once it moves outside ChopDot. Round 1 payout to Leo is approved but not marked released. | record: receipt preview visible
- Screenshot: /Users/devinsonpena/ChopDot/artifacts/chopdot-humanlike-agents/2026-06-25/humanlike-agent-2026-06-25-l1l2-wallet-live/19-savings-mina-approve-payout-readiness.png

### 20. savings / Omar

- Role: savings circle payer member
- Job: record payout moved outside ChopDot
- First reaction: Omar sees "Record the release" and the main available action is "Mark released outside ChopDot".
- Decision: click-primary
- Decision reason: The normal app surface is asking Omar to use "Mark released outside ChopDot" now.
- Action taken: clicked "Mark released outside ChopDot"
- Unsafe assumption check: Released outside ChopDot means external movement was recorded, not guaranteed by ChopDot.
- Money-model check: Release record still needs receiver confirmation where required.
- Receipt/return check: There is a receipt preview or record area to return to later.
- After-state: next: Waiting for recipient confirmation | blockers: Group state 3/3 handled Leo needs to confirm receipt Round 1 payout to Leo was marked released outside ChopDot. Leo has not confirmed receipt. | record: receipt preview visible
- Screenshot: /Users/devinsonpena/ChopDot/artifacts/chopdot-humanlike-agents/2026-06-25/humanlike-agent-2026-06-25-l1l2-wallet-live/20-savings-omar-record-payout-moved-outside-chopdot.png

### 21. savings / Leo

- Role: savings circle payout receiver
- Job: confirm payout arrived
- First reaction: Leo sees "Confirm the release" and the main available action is "Confirm received".
- Decision: click-primary
- Decision reason: The normal app surface is asking Leo to use "Confirm received" now.
- Action taken: clicked "Confirm received"
- Unsafe assumption check: I should confirm only if money actually arrived.
- Money-model check: A claim becomes confirmed only when I record receipt.
- Receipt/return check: There is a receipt preview or record area to return to later.
- After-state: next: Nothing for you yet | blockers: Group state 3/3 handled Round ready to close All required items have either been confirmed or noted. 1 item closed with a note. | record: receipt preview visible
- Screenshot: /Users/devinsonpena/ChopDot/artifacts/chopdot-humanlike-agents/2026-06-25/humanlike-agent-2026-06-25-l1l2-wallet-live/21-savings-leo-confirm-payout-arrived.png

### 22. savings / Mina

- Role: savings circle treasurer
- Job: close the round receipt
- First reaction: Mina sees "Close round" and the main available action is "Close round".
- Decision: click-primary
- Decision reason: The normal app surface is asking Mina to use "Close round" now.
- Action taken: clicked "Close round"
- Unsafe assumption check: Closing should only happen after blockers are resolved or explicitly noted.
- Money-model check: Closeout records the final group state; it should not hide open items.
- Receipt/return check: There is a receipt preview or record area to return to later.
- After-state: next: Nothing for you yet | blockers: Group state 3/3 handled Round ready to close All required items have either been confirmed or noted. 1 item closed with a note. | record: closed receipt visible
- Screenshot: /Users/devinsonpena/ChopDot/artifacts/chopdot-humanlike-agents/2026-06-25/humanlike-agent-2026-06-25-l1l2-wallet-live/22-savings-mina-close-the-round-receipt.png

### 23. emergency / Casey

- Role: emergency contributor
- Job: contribute without seeing sensitive details
- First reaction: Casey sees "Mark your payment" and the main available action is "Mark paid".
- Decision: click-primary
- Decision reason: The normal app surface is asking Casey to use "Mark paid" now.
- Action taken: clicked "Mark paid"
- Unsafe assumption check: Mark paid is only my claim; the receiver or organizer still needs to confirm what arrived.
- Money-model check: I am recording my payment claim, not closing the group.
- Receipt/return check: Emergency receipt should stay redacted and avoid sensitive names, reasons, and payment references.
- After-state: next: You’re done for now | blockers: Group state 0/2 handled Riley needs to confirm receipt Casey marked $150 paid. Riley needs to confirm Casey. Morgan has not marked $100 paid. | record: receipt preview visible
- Screenshot: /Users/devinsonpena/ChopDot/artifacts/chopdot-humanlike-agents/2026-06-25/humanlike-agent-2026-06-25-l1l2-wallet-live/23-emergency-casey-contribute-without-seeing-sensitive-details.png

### 24. emergency / Riley

- Role: emergency organizer
- Job: confirm Casey support
- First reaction: Riley sees "Confirm Casey" and the main available action is "Confirm received".
- Decision: click-primary
- Decision reason: The normal app surface is asking Riley to use "Confirm received" now.
- Action taken: clicked "Confirm received"
- Unsafe assumption check: I should confirm only if money actually arrived.
- Money-model check: A claim becomes confirmed only when I record receipt.
- Receipt/return check: Emergency receipt should stay redacted and avoid sensitive names, reasons, and payment references.
- After-state: next: Waiting on the group | blockers: Group state 1/2 handled Morgan still needs to mark paid $100 to Riley. Morgan has not marked $100 paid. | record: receipt preview visible
- Screenshot: /Users/devinsonpena/ChopDot/artifacts/chopdot-humanlike-agents/2026-06-25/humanlike-agent-2026-06-25-l1l2-wallet-live/24-emergency-riley-confirm-casey-support.png

### 25. emergency / Morgan

- Role: emergency contributor
- Job: contribute privately
- First reaction: Morgan sees "Mark your payment" and the main available action is "Mark paid".
- Decision: click-primary
- Decision reason: The normal app surface is asking Morgan to use "Mark paid" now.
- Action taken: clicked "Mark paid"
- Unsafe assumption check: Mark paid is only my claim; the receiver or organizer still needs to confirm what arrived.
- Money-model check: I am recording my payment claim, not closing the group.
- Receipt/return check: Emergency receipt should stay redacted and avoid sensitive names, reasons, and payment references.
- After-state: next: You’re done for now | blockers: Group state 1/2 handled Riley needs to confirm receipt Morgan marked $100 paid. Riley needs to confirm Morgan. | record: receipt preview visible
- Screenshot: /Users/devinsonpena/ChopDot/artifacts/chopdot-humanlike-agents/2026-06-25/humanlike-agent-2026-06-25-l1l2-wallet-live/25-emergency-morgan-contribute-privately.png

### 26. emergency / Riley

- Role: emergency organizer
- Job: confirm Morgan support
- First reaction: Riley sees "Confirm Morgan" and the main available action is "Confirm received".
- Decision: click-primary
- Decision reason: The normal app surface is asking Riley to use "Confirm received" now.
- Action taken: clicked "Confirm received"
- Unsafe assumption check: I should confirm only if money actually arrived.
- Money-model check: A claim becomes confirmed only when I record receipt.
- Receipt/return check: Emergency receipt should stay redacted and avoid sensitive names, reasons, and payment references.
- After-state: next: Prepare release | blockers: Group state 2/2 handled Prepare release emergency support $250 planned for Jordan. Release emergency support has not been prepared yet. | record: receipt preview visible
- Screenshot: /Users/devinsonpena/ChopDot/artifacts/chopdot-humanlike-agents/2026-06-25/humanlike-agent-2026-06-25-l1l2-wallet-live/26-emergency-riley-confirm-morgan-support.png

### 27. emergency / Riley

- Role: emergency organizer
- Job: prepare release
- First reaction: Riley sees "Prepare release" and the main available action is "Prepare release".
- Decision: click-primary
- Decision reason: The normal app surface is asking Riley to use "Prepare release" now.
- Action taken: clicked "Prepare release"
- Unsafe assumption check: Released outside ChopDot means external movement was recorded, not guaranteed by ChopDot.
- Money-model check: Release record still needs receiver confirmation where required.
- Receipt/return check: Emergency receipt should stay redacted and avoid sensitive names, reasons, and payment references.
- After-state: next: Approve release | blockers: Group state 2/2 handled Waiting for approval Release emergency support needs approval before money is marked released. Riley, Taylor still needs to approve. | record: receipt preview visible
- Screenshot: /Users/devinsonpena/ChopDot/artifacts/chopdot-humanlike-agents/2026-06-25/humanlike-agent-2026-06-25-l1l2-wallet-live/27-emergency-riley-prepare-release.png

### 28. emergency / Riley

- Role: emergency organizer
- Job: approve release readiness
- First reaction: Riley sees "Approve release" and the main available action is "Approve release".
- Decision: click-primary
- Decision reason: The normal app surface is asking Riley to use "Approve release" now.
- Action taken: clicked "Approve release"
- Unsafe assumption check: Approval means release readiness, not that payment already happened.
- Money-model check: Approval is separate from release and receiver confirmation.
- Receipt/return check: Emergency receipt should stay redacted and avoid sensitive names, reasons, and payment references.
- After-state: next: Approve release | blockers: Group state 2/2 handled Waiting for approval Release emergency support needs approval before money is marked released. Taylor still needs to approve. | record: receipt preview visible
- Screenshot: /Users/devinsonpena/ChopDot/artifacts/chopdot-humanlike-agents/2026-06-25/humanlike-agent-2026-06-25-l1l2-wallet-live/28-emergency-riley-approve-release-readiness.png

### 29. emergency / Taylor

- Role: emergency approver
- Job: approve release readiness
- First reaction: Taylor sees "Approve release" and the main available action is "Approve release".
- Decision: click-primary
- Decision reason: The normal app surface is asking Taylor to use "Approve release" now.
- Action taken: clicked "Approve release"
- Unsafe assumption check: Approval means release readiness, not that payment already happened.
- Money-model check: Approval is separate from release and receiver confirmation.
- Receipt/return check: Emergency receipt should stay redacted and avoid sensitive names, reasons, and payment references.
- After-state: next: Waiting for release | blockers: Group state 2/2 handled Ready to mark released $250 can be recorded once it moves outside ChopDot. Release emergency support is approved but not marked released. | record: receipt preview visible
- Screenshot: /Users/devinsonpena/ChopDot/artifacts/chopdot-humanlike-agents/2026-06-25/humanlike-agent-2026-06-25-l1l2-wallet-live/29-emergency-taylor-approve-release-readiness.png

### 30. emergency / Riley

- Role: emergency organizer
- Job: record release outside ChopDot
- First reaction: Riley sees "Record the release" and the main available action is "Mark released outside ChopDot".
- Decision: click-primary
- Decision reason: The normal app surface is asking Riley to use "Mark released outside ChopDot" now.
- Action taken: clicked "Mark released outside ChopDot"
- Unsafe assumption check: Released outside ChopDot means external movement was recorded, not guaranteed by ChopDot.
- Money-model check: Release record still needs receiver confirmation where required.
- Receipt/return check: Emergency receipt should stay redacted and avoid sensitive names, reasons, and payment references.
- After-state: next: Confirm the release | blockers: Group state 2/2 handled Jordan needs to confirm receipt Release emergency support was marked released outside ChopDot. Jordan has not confirmed receipt. | record: receipt preview visible
- Screenshot: /Users/devinsonpena/ChopDot/artifacts/chopdot-humanlike-agents/2026-06-25/humanlike-agent-2026-06-25-l1l2-wallet-live/30-emergency-riley-record-release-outside-chopdot.png

### 31. emergency / Jordan

- Role: emergency recipient
- Job: confirm release arrived
- First reaction: Jordan sees "Confirm the release" and the main available action is "Confirm received".
- Decision: click-primary
- Decision reason: The normal app surface is asking Jordan to use "Confirm received" now.
- Action taken: clicked "Confirm received"
- Unsafe assumption check: I should confirm only if money actually arrived.
- Money-model check: A claim becomes confirmed only when I record receipt.
- Receipt/return check: Emergency receipt should stay redacted and avoid sensitive names, reasons, and payment references.
- After-state: next: Nothing for you yet | blockers: Group state 2/2 handled Pot ready to close All required items have either been confirmed or noted. Every required item is confirmed. | record: receipt preview visible
- Screenshot: /Users/devinsonpena/ChopDot/artifacts/chopdot-humanlike-agents/2026-06-25/humanlike-agent-2026-06-25-l1l2-wallet-live/31-emergency-jordan-confirm-release-arrived.png

### 32. emergency / Riley

- Role: emergency organizer
- Job: close redacted pot receipt
- First reaction: Riley sees "Close pot" and the main available action is "Close pot".
- Decision: click-primary
- Decision reason: The normal app surface is asking Riley to use "Close pot" now.
- Action taken: clicked "Close pot"
- Unsafe assumption check: Closing should only happen after blockers are resolved or explicitly noted.
- Money-model check: Closeout records the final group state; it should not hide open items.
- Receipt/return check: Emergency receipt should stay redacted and avoid sensitive names, reasons, and payment references.
- After-state: next: Nothing for you yet | blockers: Group state 2/2 handled Pot ready to close All required items have either been confirmed or noted. Every required item is confirmed. | record: closed receipt visible
- Screenshot: /Users/devinsonpena/ChopDot/artifacts/chopdot-humanlike-agents/2026-06-25/humanlike-agent-2026-06-25-l1l2-wallet-live/32-emergency-riley-close-redacted-pot-receipt.png

### 33. community / Sam

- Role: community contributor
- Job: contribute to fund
- First reaction: Sam sees "Mark your payment" and the main available action is "Mark paid".
- Decision: click-primary
- Decision reason: The normal app surface is asking Sam to use "Mark paid" now.
- Action taken: clicked "Mark paid"
- Unsafe assumption check: Mark paid is only my claim; the receiver or organizer still needs to confirm what arrived.
- Money-model check: I am recording my payment claim, not closing the group.
- Receipt/return check: There is a receipt preview or record area to return to later.
- After-state: next: You’re done for now | blockers: Group state 0/2 handled Alex needs to confirm receipt Sam marked 300 USDC paid. Alex needs to confirm Sam. Noor has not marked 200 USDC paid. | record: receipt preview visible
- Screenshot: /Users/devinsonpena/ChopDot/artifacts/chopdot-humanlike-agents/2026-06-25/humanlike-agent-2026-06-25-l1l2-wallet-live/33-community-sam-contribute-to-fund.png

### 34. community / Alex

- Role: community admin
- Job: confirm Sam contribution
- First reaction: Alex sees "Confirm Sam" and the main available action is "Confirm received".
- Decision: click-primary
- Decision reason: The normal app surface is asking Alex to use "Confirm received" now.
- Action taken: clicked "Confirm received"
- Unsafe assumption check: I should confirm only if money actually arrived.
- Money-model check: A claim becomes confirmed only when I record receipt.
- Receipt/return check: There is a receipt preview or record area to return to later.
- After-state: next: Waiting on the group | blockers: Group state 1/2 handled Noor still needs to mark paid 200 USDC to Alex. Noor has not marked 200 USDC paid. | record: receipt preview visible
- Screenshot: /Users/devinsonpena/ChopDot/artifacts/chopdot-humanlike-agents/2026-06-25/humanlike-agent-2026-06-25-l1l2-wallet-live/34-community-alex-confirm-sam-contribution.png

### 35. community / Noor

- Role: community contributor
- Job: contribute to fund
- First reaction: Noor sees "Mark your payment" and the main available action is "Mark paid".
- Decision: click-primary
- Decision reason: The normal app surface is asking Noor to use "Mark paid" now.
- Action taken: clicked "Mark paid"
- Unsafe assumption check: Mark paid is only my claim; the receiver or organizer still needs to confirm what arrived.
- Money-model check: I am recording my payment claim, not closing the group.
- Receipt/return check: There is a receipt preview or record area to return to later.
- After-state: next: You’re done for now | blockers: Group state 1/2 handled Alex needs to confirm receipt Noor marked 200 USDC paid. Alex needs to confirm Noor. | record: receipt preview visible
- Screenshot: /Users/devinsonpena/ChopDot/artifacts/chopdot-humanlike-agents/2026-06-25/humanlike-agent-2026-06-25-l1l2-wallet-live/35-community-noor-contribute-to-fund.png

### 36. community / Alex

- Role: community admin
- Job: confirm Noor contribution
- First reaction: Alex sees "Confirm Noor" and the main available action is "Confirm received".
- Decision: click-primary
- Decision reason: The normal app surface is asking Alex to use "Confirm received" now.
- Action taken: clicked "Confirm received"
- Unsafe assumption check: I should confirm only if money actually arrived.
- Money-model check: A claim becomes confirmed only when I record receipt.
- Receipt/return check: There is a receipt preview or record area to return to later.
- After-state: next: Prepare release | blockers: Group state 2/2 handled Prepare pay workshop supplier 180 USDC planned for Jordan. Pay workshop supplier has not been prepared yet. | record: receipt preview visible
- Screenshot: /Users/devinsonpena/ChopDot/artifacts/chopdot-humanlike-agents/2026-06-25/humanlike-agent-2026-06-25-l1l2-wallet-live/36-community-alex-confirm-noor-contribution.png

### 37. community / Alex

- Role: community admin
- Job: prepare spend release
- First reaction: Alex sees "Prepare release" and the main available action is "Prepare release".
- Decision: click-primary
- Decision reason: The normal app surface is asking Alex to use "Prepare release" now.
- Action taken: clicked "Prepare release"
- Unsafe assumption check: Released outside ChopDot means external movement was recorded, not guaranteed by ChopDot.
- Money-model check: Release record still needs receiver confirmation where required.
- Receipt/return check: There is a receipt preview or record area to return to later.
- After-state: next: Approve release | blockers: Group state 2/2 handled Waiting for approval Pay workshop supplier needs approval before money is marked released. Alex, Priya still needs to approve. | record: receipt preview visible
- Screenshot: /Users/devinsonpena/ChopDot/artifacts/chopdot-humanlike-agents/2026-06-25/humanlike-agent-2026-06-25-l1l2-wallet-live/37-community-alex-prepare-spend-release.png

### 38. community / Alex

- Role: community admin
- Job: approve release readiness as admin
- First reaction: Alex sees "Approve release" and the main available action is "Approve release".
- Decision: click-primary
- Decision reason: The normal app surface is asking Alex to use "Approve release" now.
- Action taken: clicked "Approve release"
- Unsafe assumption check: Approval means release readiness, not that payment already happened.
- Money-model check: Approval is separate from release and receiver confirmation.
- Receipt/return check: There is a receipt preview or record area to return to later.
- After-state: next: Approve release | blockers: Group state 2/2 handled Waiting for approval Pay workshop supplier needs approval before money is marked released. Priya still needs to approve. | record: receipt preview visible
- Screenshot: /Users/devinsonpena/ChopDot/artifacts/chopdot-humanlike-agents/2026-06-25/humanlike-agent-2026-06-25-l1l2-wallet-live/38-community-alex-approve-release-readiness-as-admin.png

### 39. community / Priya

- Role: community approver
- Job: approve release readiness
- First reaction: Priya sees "Approve release" and the main available action is "Approve release".
- Decision: click-primary
- Decision reason: The normal app surface is asking Priya to use "Approve release" now.
- Action taken: clicked "Approve release"
- Unsafe assumption check: Approval means release readiness, not that payment already happened.
- Money-model check: Approval is separate from release and receiver confirmation.
- Receipt/return check: There is a receipt preview or record area to return to later.
- After-state: next: Waiting for release | blockers: Group state 2/2 handled Ready to mark released 180 USDC can be recorded once it moves outside ChopDot. Pay workshop supplier is approved but not marked released. | record: receipt preview visible
- Screenshot: /Users/devinsonpena/ChopDot/artifacts/chopdot-humanlike-agents/2026-06-25/humanlike-agent-2026-06-25-l1l2-wallet-live/39-community-priya-approve-release-readiness.png

### 40. community / Sam

- Role: community payer
- Job: record supplier payment outside ChopDot
- First reaction: Sam sees "Record the release" and the main available action is "Mark released outside ChopDot".
- Decision: click-primary
- Decision reason: The normal app surface is asking Sam to use "Mark released outside ChopDot" now.
- Action taken: clicked "Mark released outside ChopDot"
- Unsafe assumption check: Released outside ChopDot means external movement was recorded, not guaranteed by ChopDot.
- Money-model check: Release record still needs receiver confirmation where required.
- Receipt/return check: There is a receipt preview or record area to return to later.
- After-state: next: Waiting for recipient confirmation | blockers: Group state 2/2 handled Jordan needs to confirm receipt Pay workshop supplier was marked released outside ChopDot. Jordan has not confirmed receipt. | record: receipt preview visible
- Screenshot: /Users/devinsonpena/ChopDot/artifacts/chopdot-humanlike-agents/2026-06-25/humanlike-agent-2026-06-25-l1l2-wallet-live/40-community-sam-record-supplier-payment-outside-chopdot.png

### 41. community / Jordan

- Role: community receiver
- Job: confirm supplier payment arrived
- First reaction: Jordan sees "Confirm the release" and the main available action is "Confirm received".
- Decision: click-primary
- Decision reason: The normal app surface is asking Jordan to use "Confirm received" now.
- Action taken: clicked "Confirm received"
- Unsafe assumption check: I should confirm only if money actually arrived.
- Money-model check: A claim becomes confirmed only when I record receipt.
- Receipt/return check: There is a receipt preview or record area to return to later.
- After-state: next: Nothing for you yet | blockers: Group state 2/2 handled Period ready to close All required items have either been confirmed or noted. Every required item is confirmed. | record: receipt preview visible
- Screenshot: /Users/devinsonpena/ChopDot/artifacts/chopdot-humanlike-agents/2026-06-25/humanlike-agent-2026-06-25-l1l2-wallet-live/41-community-jordan-confirm-supplier-payment-arrived.png

### 42. community / Alex

- Role: community admin
- Job: close the period handoff record
- First reaction: Alex sees "Close period" and the main available action is "Close period".
- Decision: click-primary
- Decision reason: The normal app surface is asking Alex to use "Close period" now.
- Action taken: clicked "Close period"
- Unsafe assumption check: Closing should only happen after blockers are resolved or explicitly noted.
- Money-model check: Closeout records the final group state; it should not hide open items.
- Receipt/return check: There is a receipt preview or record area to return to later.
- After-state: next: Nothing for you yet | blockers: Group state 2/2 handled Period ready to close All required items have either been confirmed or noted. Every required item is confirmed. | record: closed receipt visible
- Screenshot: /Users/devinsonpena/ChopDot/artifacts/chopdot-humanlike-agents/2026-06-25/humanlike-agent-2026-06-25-l1l2-wallet-live/42-community-alex-close-the-period-handoff-record.png

## Operator Review

| Scenario | Agent behavior makes sense? | Notes |
| --- | --- | --- |
| Group expense | pending user approval | pending |
| Savings circle | pending user approval | pending |
| Emergency pot | pending user approval | pending |
| Community fund | pending user approval | pending |

## Claim Boundary

Allowed now: agent-observed human-like app run is complete and ready for operator review.

Not allowed yet: real human pass, 9/10 promotion, live `.dot` proof, or custody/escrow readiness.

