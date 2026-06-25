# ChopDot Unscripted Agent Simulation

Date: 2026-06-22
Programme: `B` native truth + product usability
Status: `complete`

## Plain-English Result

The core ChopDot pattern works when the person on screen is the person who needs to act next. Contributors can usually find `Mark paid`, and organizers can usually find `Confirm received`.

The strongest result is that contributors could still act from their own devices even when another person was also blocking the group. Leo, Nina, Omar, Casey, and Sam all got a clear `Mark paid` action.

The later-stage guidance is better than the previous run. Approvers and recipients now see personal statuses such as `Approval comes later` or `You’ll confirm the release later`, instead of a dead-end message.

This run used the normal native product surface. Developer checks and escrow lab controls were not included, because they should not be part of a friend-style product review.

## Agent Runs

### Group expense: Leo

- Objective: Pay my dinner share.
- Expected: I should immediately know how to mark my share paid.
- First screen: Mark your payment
- Primary action: Mark paid
- Guidance shown: How this split closes Everyone marks paid, Mina confirms what arrived, then the group closes one clean record. 1 Mark shares paid Now Each friend records their own share. 2 Confirm received Next The receiver confirms what actually arrived. 3 Prepare reimbursement Next Record any money moving back outside ChopDot. 4 Close split Next Save the final private receipt.
- Setup shown: Split setup Each person marks their own payment; the receiver confirms what arrived. Friends paying 3 people Receiver confirms Mina Reimbursement record $225 planned for Mina Closeout Private receipt after confirmation
- Result: The obvious action matched the job: Leo clicked "Mark paid".
- Personal state after action: You’re done for now
- After state: Group state 0/3 handled Mina needs to confirm receipt Leo marked $80 paid. Mina needs to confirm Leo. Nina has not marked $75 paid. Omar has not marked $70 paid.
- Screenshot: /Users/devinsonpena/ChopDot/artifacts/chopdot-unscripted-agents/2026-06-22/group-expense-leo-pay-my-dinner-share.png

### Group expense: Nina

- Objective: Pay my dinner share from my own phone after Leo already acted.
- Expected: I should not be blocked just because Mina still needs to confirm Leo.
- First screen: Mark your payment
- Primary action: Mark paid
- Guidance shown: How this split closes Everyone marks paid, Mina confirms what arrived, then the group closes one clean record. 1 Mark shares paid Now Each friend records their own share. 2 Confirm received Next The receiver confirms what actually arrived. 3 Prepare reimbursement Next Record any money moving back outside ChopDot. 4 Close split Next Save the final private receipt.
- Setup shown: Split setup Each person marks their own payment; the receiver confirms what arrived. Friends paying 3 people Receiver confirms Mina Reimbursement record $225 planned for Mina Closeout Private receipt after confirmation
- Result: The obvious action matched the job: Nina clicked "Mark paid".
- Personal state after action: You’re done for now
- After state: Group state 0/3 handled Mina needs to confirm 2 payments Leo, Nina marked $155 paid in total. Confirm each only if money arrived. Mina needs to confirm Leo. Mina needs to confirm Nina. Omar has not marked $70 paid.
- Screenshot: /Users/devinsonpena/ChopDot/artifacts/chopdot-unscripted-agents/2026-06-22/group-expense-nina-pay-my-dinner-share-from-my-own-phone-after-leo-already-acted.png

### Group expense: Mina

- Objective: Confirm what I received and understand what is still open.
- Expected: I should see the person waiting on me and confirm receipt.
- First screen: Confirm Leo
- Primary action: Confirm received
- Guidance shown: How this split closes Everyone marks paid, Mina confirms what arrived, then the group closes one clean record. 1 Mark shares paid Now Each friend records their own share. 2 Confirm received Next The receiver confirms what actually arrived. 3 Prepare reimbursement Next Record any money moving back outside ChopDot. 4 Close split Next Save the final private receipt.
- Setup shown: Split setup Each person marks their own payment; the receiver confirms what arrived. Friends paying 3 people Receiver confirms Mina Reimbursement record $225 planned for Mina Closeout Private receipt after confirmation
- Organizer queue shown: Organizer queue Work these in order. 3 open 1 Confirm Leo Leo marked $80 paid. Confirm only if money arrived. Why: A claim is not a receipt confirmation. Confirm received 2 Confirm Nina Nina marked $75 paid. Confirm only if money arrived. Why: A claim is not a receipt confirmation. Confirm received 3 Check Omar Omar has not marked $70 paid yet. Why: A delay note keeps the record honest without pretending payment happened. Record delay
- Result: The obvious action matched the job: Mina clicked "Confirm received".
- Personal state after action: Confirm Nina
- After state: Group state 1/3 handled Mina needs to confirm receipt Nina marked $75 paid. Mina needs to confirm Nina. Omar has not marked $70 paid.
- Screenshot: /Users/devinsonpena/ChopDot/artifacts/chopdot-unscripted-agents/2026-06-22/group-expense-mina-confirm-what-i-received-and-understand-what-is-still-open.png

### Savings circle: Leo

- Objective: Make my round contribution.
- Expected: I should see one clear contribution action.
- First screen: Mark your payment
- Primary action: Mark paid
- Guidance shown: How this round closes Members contribute, the treasurer confirms, delays are noted, and the payout is closed with a receipt. 1 Members mark paid Now Each member records their contribution. 2 Treasurer confirms Next The treasurer confirms what arrived. 3 Record delays Next Missed or late payments get a visible note. 4 Prepare payout Next The round payout is recorded outside ChopDot. 5 Close round Next The round closes with the payout and notes attached.
- Setup shown: Round setup Use this to check the circle rules before anyone pays. Members paying now 3 members · $100 each Treasurer confirms Mina Round payout $200 planned for Leo If someone is late Record delay; do not close silently
- Result: The obvious action matched the job: Leo clicked "Mark paid".
- Personal state after action: You’re done for now
- After state: Group state 0/3 handled Mina needs to confirm receipt Leo marked $100 paid. Mina needs to confirm Leo. Nina has not marked $100 paid. Omar has not marked $100 paid.
- Screenshot: /Users/devinsonpena/ChopDot/artifacts/chopdot-unscripted-agents/2026-06-22/savings-circle-leo-make-my-round-contribution.png

### Savings circle: Omar

- Objective: Contribute without knowing the payout rules.
- Expected: I should know whether I owe now or whether the organizer is blocking me.
- First screen: Mark your payment
- Primary action: Mark paid
- Guidance shown: How this round closes Members contribute, the treasurer confirms, delays are noted, and the payout is closed with a receipt. 1 Members mark paid Now Each member records their contribution. 2 Treasurer confirms Next The treasurer confirms what arrived. 3 Record delays Next Missed or late payments get a visible note. 4 Prepare payout Next The round payout is recorded outside ChopDot. 5 Close round Next The round closes with the payout and notes attached.
- Setup shown: Round setup Use this to check the circle rules before anyone pays. Members paying now 3 members · $100 each Treasurer confirms Mina Round payout $200 planned for Leo If someone is late Record delay; do not close silently
- Result: The obvious action matched the job: Omar clicked "Mark paid".
- Personal state after action: You’re done for now
- After state: Group state 0/3 handled Mina needs to confirm 2 payments Leo, Omar marked $200 paid in total. Confirm each only if money arrived. Mina needs to confirm Leo. Nina has not marked $100 paid. Mina needs to confirm Omar.
- Screenshot: /Users/devinsonpena/ChopDot/artifacts/chopdot-unscripted-agents/2026-06-22/savings-circle-omar-contribute-without-knowing-the-payout-rules.png

### Savings circle: Mina

- Objective: Act as treasurer and keep the round moving.
- Expected: I should see whose contribution needs confirmation.
- First screen: Confirm Leo
- Primary action: Confirm received
- Guidance shown: How this round closes Members contribute, the treasurer confirms, delays are noted, and the payout is closed with a receipt. 1 Members mark paid Now Each member records their contribution. 2 Treasurer confirms Next The treasurer confirms what arrived. 3 Record delays Next Missed or late payments get a visible note. 4 Prepare payout Next The round payout is recorded outside ChopDot. 5 Close round Next The round closes with the payout and notes attached.
- Setup shown: Round setup Use this to check the circle rules before anyone pays. Members paying now 3 members · $100 each Treasurer confirms Mina Round payout $200 planned for Leo If someone is late Record delay; do not close silently
- Organizer queue shown: Organizer queue Work these in order. 3 open 1 Confirm Leo Leo marked $100 paid. Confirm only if money arrived. Why: A claim is not a receipt confirmation. Confirm received 2 Check Nina Nina has not marked $100 paid yet. Why: A delay note keeps the record honest without pretending payment happened. Record delay 3 Confirm Omar Omar marked $100 paid. Confirm only if money arrived. Why: A claim is not a receipt confirmation. Confirm received
- Result: The obvious action matched the job: Mina clicked "Confirm received".
- Personal state after action: Confirm Omar
- After state: Group state 1/3 handled Mina needs to confirm receipt Omar marked $100 paid. Nina has not marked $100 paid. Mina needs to confirm Omar.
- Screenshot: /Users/devinsonpena/ChopDot/artifacts/chopdot-unscripted-agents/2026-06-22/savings-circle-mina-act-as-treasurer-and-keep-the-round-moving.png

### Emergency pot: Casey

- Objective: Privately contribute to urgent help.
- Expected: I should be able to contribute without seeing private details.
- First screen: Mark your payment
- Primary action: Mark paid
- Guidance shown: How this support closes Keep details private, confirm support, approve release, then export a redacted receipt. 1 Support marked paid Now Contributors record private support. 2 Organizer confirms Next The organizer confirms what arrived. 3 Approve release Next Required approvers confirm release readiness. 4 Recipient confirms Next The recipient confirms what was received. 5 Close redacted receipt Next Sensitive names, reasons, and payment refs stay out of export.
- Setup shown: Privacy setup Only the minimum details should be visible before this pot closes. Reason visibility medical · sensitive details stay out of receipts Organizer confirms Riley Release approval Riley and Taylor Receipt default Redacted export
- Result: The obvious action matched the job: Casey clicked "Mark paid".
- Personal state after action: You’re done for now
- After state: Group state 0/2 handled Riley needs to confirm receipt Casey marked $150 paid. Riley needs to confirm Casey. Morgan has not marked $100 paid.
- Screenshot: /Users/devinsonpena/ChopDot/artifacts/chopdot-unscripted-agents/2026-06-22/emergency-pot-casey-privately-contribute-to-urgent-help.png

### Emergency pot: Riley

- Objective: As organizer, confirm private support and keep sensitive details out.
- Expected: I should see whose support needs confirmation without exposing emergency details.
- First screen: Confirm Casey
- Primary action: Confirm received
- Guidance shown: How this support closes Keep details private, confirm support, approve release, then export a redacted receipt. 1 Support marked paid Now Contributors record private support. 2 Organizer confirms Next The organizer confirms what arrived. 3 Approve release Next Required approvers confirm release readiness. 4 Recipient confirms Next The recipient confirms what was received. 5 Close redacted receipt Next Sensitive names, reasons, and payment refs stay out of export.
- Setup shown: Privacy setup Only the minimum details should be visible before this pot closes. Reason visibility medical · sensitive details stay out of receipts Organizer confirms Riley Release approval Riley and Taylor Receipt default Redacted export
- Organizer queue shown: Organizer queue Work these in order. 2 open 1 Confirm Casey Casey marked $150 paid. Confirm only if money arrived. Why: A claim is not a receipt confirmation. Confirm received 2 Check Morgan Morgan has not marked $100 paid yet. Why: A delay note keeps the record honest without pretending payment happened. Record delay
- Result: The obvious action matched the job: Riley clicked "Confirm received".
- Personal state after action: Waiting on the group
- After state: Group state 1/2 handled Morgan still needs to mark paid $100 to Riley. Morgan has not marked $100 paid.
- Screenshot: /Users/devinsonpena/ChopDot/artifacts/chopdot-unscripted-agents/2026-06-22/emergency-pot-riley-as-organizer-confirm-private-support-and-keep-sensitive-details-out.png

### Emergency pot: Taylor

- Objective: Approve release only when the pot is ready.
- Expected: I should know whether I can approve or whether contributions are still missing.
- First screen: Approval comes later
- Primary action: none visible
- Guidance shown: How this support closes Keep details private, confirm support, approve release, then export a redacted receipt. 1 Support marked paid Now Contributors record private support. 2 Organizer confirms Next The organizer confirms what arrived. 3 Approve release Next Required approvers confirm release readiness. 4 Recipient confirms Next The recipient confirms what was received. 5 Close redacted receipt Next Sensitive names, reasons, and payment refs stay out of export.
- Setup shown: Privacy setup Only the minimum details should be visible before this pot closes. Reason visibility medical · sensitive details stay out of receipts Organizer confirms Riley Release approval Riley and Taylor Receipt default Redacted export
- Waiting guidance shown: Why you’re waiting Approval opens after contributions are confirmed or noted. You do not need to approve the release yet. Waiting on Morgan has not marked $100 paid Your part Approve later Next safe step Organizer confirms or notes each payment first Not yet Do not approve before payments are handled Unsafe shortcut Approval cannot replace confirmation
- Result: No action was available yet, and the screen gave a personal status: "Approval comes later".
- Fallback issue: Could not find Approve release in People tab.
- Personal state after action: Approval comes later
- After state: Group state 1/2 handled Morgan still needs to mark paid $100 to Riley. Morgan has not marked $100 paid.
- Screenshot: /Users/devinsonpena/ChopDot/artifacts/chopdot-unscripted-agents/2026-06-22/emergency-pot-taylor-approve-release-only-when-the-pot-is-ready.png

### Emergency pot: Jordan

- Objective: Understand if money was released to me and confirm receipt.
- Expected: I should not be asked to confirm before a release is actually marked.
- First screen: You’ll confirm the release later
- Primary action: none visible
- Guidance shown: How this support closes Keep details private, confirm support, approve release, then export a redacted receipt. 1 Support marked paid Now Contributors record private support. 2 Organizer confirms Next The organizer confirms what arrived. 3 Approve release Next Required approvers confirm release readiness. 4 Recipient confirms Next The recipient confirms what was received. 5 Close redacted receipt Next Sensitive names, reasons, and payment refs stay out of export.
- Setup shown: Privacy setup Only the minimum details should be visible before this pot closes. Reason visibility medical · sensitive details stay out of receipts Organizer confirms Riley Release approval Riley and Taylor Receipt default Redacted export
- Waiting guidance shown: Why you’re waiting You confirm only after the release is prepared and marked released outside ChopDot. Waiting on Morgan has not marked $100 paid Your part Confirm later Next safe step Organizer prepares and marks the release released Not yet release has not been marked released Unsafe shortcut Do not confirm before money arrives
- Result: No action was available yet, and the screen gave a personal status: "You’ll confirm the release later".
- Personal state after action: You’ll confirm the release later
- After state: Group state 1/2 handled Morgan still needs to mark paid $100 to Riley. Morgan has not marked $100 paid.
- Screenshot: /Users/devinsonpena/ChopDot/artifacts/chopdot-unscripted-agents/2026-06-22/emergency-pot-jordan-understand-if-money-was-released-to-me-and-confirm-receipt.png

### Community fund: Sam

- Objective: Contribute to the fund and later pay a release if approved.
- Expected: I should first see my contribution action, not treasury jargon.
- First screen: Mark your payment
- Primary action: Mark paid
- Guidance shown: How this fund period closes Contributions are confirmed, spending is approved, release is recorded, and the next treasurer gets a clean handoff. 1 Contributions marked paid Now Members record their fund contributions. 2 Admin confirms Next The admin confirms what arrived. 3 Approvers approve spend Next Required approvers approve the release. 4 Receiver confirms Next The receiver confirms the outside payment. 5 Close handoff record Next The period closes with open items and evidence refs clear.
- Setup shown: Fund period setup Confirm contributions first, then approve and record outside spending. Contributions 2 members this period Admin confirms Alex Spend approval Alex and Priya Handoff record 180 USDC planned for Jordan
- Result: The obvious action matched the job: Sam clicked "Mark paid".
- Personal state after action: You’re done for now
- After state: Group state 0/2 handled Alex needs to confirm receipt Sam marked 300 USDC paid. Alex needs to confirm Sam. Noor has not marked 200 USDC paid.
- Screenshot: /Users/devinsonpena/ChopDot/artifacts/chopdot-unscripted-agents/2026-06-22/community-fund-sam-contribute-to-the-fund-and-later-pay-a-release-if-approved.png

### Community fund: Priya

- Objective: Approve a spend request from my own device.
- Expected: I should know if there is nothing to approve yet.
- First screen: Approval comes later
- Primary action: none visible
- Guidance shown: How this fund period closes Contributions are confirmed, spending is approved, release is recorded, and the next treasurer gets a clean handoff. 1 Contributions marked paid Now Members record their fund contributions. 2 Admin confirms Next The admin confirms what arrived. 3 Approvers approve spend Next Required approvers approve the release. 4 Receiver confirms Next The receiver confirms the outside payment. 5 Close handoff record Next The period closes with open items and evidence refs clear.
- Setup shown: Fund period setup Confirm contributions first, then approve and record outside spending. Contributions 2 members this period Admin confirms Alex Spend approval Alex and Priya Handoff record 180 USDC planned for Jordan
- Waiting guidance shown: Why you’re waiting Approval opens after contributions are confirmed or noted. You do not need to approve the release yet. Waiting on Alex needs to confirm Sam + 1 more Your part Approve later Next safe step Organizer confirms or notes each payment first Not yet Do not approve before payments are handled Unsafe shortcut Approval cannot replace confirmation
- Result: No action was available yet, and the screen gave a personal status: "Approval comes later".
- Fallback issue: Could not find Approve release in People tab.
- Personal state after action: Approval comes later
- After state: Group state 0/2 handled Alex needs to confirm receipt Sam marked 300 USDC paid. Alex needs to confirm Sam. Noor has not marked 200 USDC paid.
- Screenshot: /Users/devinsonpena/ChopDot/artifacts/chopdot-unscripted-agents/2026-06-22/community-fund-priya-approve-a-spend-request-from-my-own-device.png

### Community fund: Alex

- Objective: As admin, see the full state and close only when ready.
- Expected: I should see blockers before I try to close.
- First screen: Confirm Sam
- Primary action: Confirm received
- Guidance shown: How this fund period closes Contributions are confirmed, spending is approved, release is recorded, and the next treasurer gets a clean handoff. 1 Contributions marked paid Now Members record their fund contributions. 2 Admin confirms Next The admin confirms what arrived. 3 Approvers approve spend Next Required approvers approve the release. 4 Receiver confirms Next The receiver confirms the outside payment. 5 Close handoff record Next The period closes with open items and evidence refs clear.
- Setup shown: Fund period setup Confirm contributions first, then approve and record outside spending. Contributions 2 members this period Admin confirms Alex Spend approval Alex and Priya Handoff record 180 USDC planned for Jordan
- Organizer queue shown: Organizer queue Work these in order. 2 open 1 Confirm Sam Sam marked 300 USDC paid. Confirm only if money arrived. Why: A claim is not a receipt confirmation. Confirm received 2 Check Noor Noor has not marked 200 USDC paid yet. Why: A delay note keeps the record honest without pretending payment happened. Record delay
- Result: Observation-only step.
- Personal state after action: Confirm Sam
- After state: Group state 0/2 handled Alex needs to confirm receipt Sam marked 300 USDC paid. Alex needs to confirm Sam. Noor has not marked 200 USDC paid.
- Screenshot: /Users/devinsonpena/ChopDot/artifacts/chopdot-unscripted-agents/2026-06-22/community-fund-alex-as-admin-see-the-full-state-and-close-only-when-ready.png

## Findings

1. Group expense is the strongest first product wedge. The job is familiar, the next action is plain, and the organizer confirmation model makes sense.
2. Savings circle is promising. Contributors understood their payment action, the setup card shows contribution amount, treasurer, payout recipient, and delay policy, and organizers now see an ordered queue for confirmations, delays, payout, and closeout.
3. Emergency pot is safer than before. Contributors can act without seeing sensitive details, organizers get a queue, and future approvers/recipients now see why they are waiting before sensitive release steps.
4. Community fund still needs the most UX work, but the setup card now makes the approval rule and handoff record visible before the release exists, admins get a queue, and approvers see why approval is not available yet.
5. The `Your step` lane is the strongest product pattern. It separates personal action from global group state without exposing technical rails.
6. Dev-only role switching and escrow controls stayed out of this normal-surface run. Keep that boundary for friend pilots.

## Product Fixes Before Friends Pilot

- Run friend-pilot comprehension on waiting states: approvers and recipients should be able to explain why they cannot act yet without reading the full blocker list.
- Run friend-pilot comprehension on the organizer queue: the organizer should be able to explain why `Confirm`, `Record delay`, `Prepare payout`, and `Close` are separate.
- Keep demo role-switching and escrow language out of the normal surface before any friend pilot.

## Judgment

Safe to promote next: group expenses and savings circles as coordination-first ChopDot modes.

Keep lab-only: emergency escrow, community fund release automation, and any custody/escrow claim.

Next move: run a real friend pilot for group expense and savings circle first, then promote emergency/community only after users can explain waiting, approval, release, and receipt states back correctly.

