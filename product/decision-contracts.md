# ChopDot Decision Contracts

Decision contracts state what evidence a card must produce before the team makes a product call.

## DC-001 - Pay-moment capture decision

Required evidence:

- first-screen screenshot
- action-after screenshot
- agent or operator notes on confusion
- proof that manual item entry is not the default path

Decision options:

- keep
- simplify
- redesign
- defer

## DC-002 - No-app payment link decision

Required evidence:

- link opened outside the organizer context
- friend sees amount, receiver, and one action
- no account setup before low-risk action
- done state screenshot

## DC-003 - Confirmation decision

Required evidence:

- receiver sees exact item to confirm
- matched payment item updates only itself
- open items remain visible
- wrong-person action is blocked

## DC-004 - Close record decision

Required evidence:

- confirmed, delayed, waived, and open items are readable
- close is blocked or annotated when unresolved items remain
- saved record screenshot
- sensitive fields redacted where needed

## DC-005 - Spend Card capture decision

Required evidence:

- card/spend moment entry screenshot
- route to split/share flow
- dead-end list
- clear reason to keep, simplify, or defer

## DC-006 - Savings circle decision

Required evidence:

- treasurer view screenshot
- member view screenshot
- delayed contribution handling
- round close state

## DC-007 - Emergency pot decision

Required evidence:

- contributor private view
- organizer confirmation view
- redacted saved record
- privacy leak check

## DC-008 - Community fund decision

Required evidence:

- role-aware views
- approval/review action
- payer/receiver confirmation
- handoff record

## DC-009 - Agent journey decision

Required evidence:

- agents use real app UI
- screenshots from separate contexts
- observed confusion and dead ends
- adversarial attempts recorded

## DC-010 - Native session decision

Required evidence:

- live host-backed proof or fail-visible blocked status
- no normal UI technical language
- product truth remains separate from adapter behavior

## DC-011 - Language cleanup decision

Required evidence:

- scan output
- screenshot review
- replacements applied or tracked

## DC-012 - Receipt capture decision

Required evidence:

- photo/link/import/amount first
- item editing only after capture
- screenshot proof

## DC-013 - Competitor benchmark decision

Required evidence:

- same journey replayed against alternatives
- beats/ties/loses call
- concrete friction and trust comparison

## DC-014 - Cockpit upgrade decision

Required evidence:

- generated board
- lifecycle command run
- history event
- screenshot review
- resume output

## DC-015 - Readiness scorecard decision

Required evidence:

- scorecard source
- readiness output
- blocked-live/setup-required separation

## DC-016 - Product resume decision

Required evidence:

- generated resume
- top work and blockers visible
- next action clear
