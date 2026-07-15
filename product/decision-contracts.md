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

## DC-017 - AI PM process decision

Required evidence:

- AI PM adoption map
- executable AI PM process validator
- product cockpit npm commands available
- high-friction AI capture paths detected or quarantined
- false-positive, false-negative, human-review, correction, and monitoring requirements documented

## DC-018 - Normal pot expense tracking decision

Required evidence:

- pot detail screenshot before add
- quick add screenshot
- pot detail screenshot after add
- journey review with product and visual gates
- no first-viewport payback planning competing with Add Expense

## DC-019 - Normal pot layout quality decision

Required evidence:

- mobile screenshots for pots list, pot detail, settle flow, close review, and saved record
- desktop screenshots for pots list, pot detail, settle flow, close review, and saved record
- journey review with product and visual gates
- no bottom navigation or sticky action overlap
- no normal UI internal technical language
- desktop layout must not be a stretched mobile layout
- mobile layout must not feel like a cramped dashboard

## DC-020 - Chat capture agent decision

Required evidence:

- Telegram chat message creates a draft without changing chapter expenses
- explicit add action commits the draft
- live Telegram startup requires an allowlisted chat
- Telegram mutations are disabled unless explicitly enabled
- paid and confirmed states still require separate explicit actions
- non-consensual chat reading is not claimed or implemented
- WhatsApp path stays opt-in/webhook based, not private-chat scraping

## DC-021 - No-app friend payment link decision

Required evidence:

- generated pay link screenshot
- Leo sees one amount, one receiver, and one primary action
- no full app setup required before the low-risk friend action
- mark paid creates only a paid/waiting state for Leo
- Mina confirmation updates only the matching item
- normal UI contains no internal technical language
- screenshot-backed agent observation from separate browser contexts

## DC-022 - Regular pot end-to-end coherence decision

Required evidence:

- pots list screenshot
- pot detail before action screenshot
- add expense screenshot
- capture/split payment screenshot
- friend pay link screenshot
- receiver confirmation screenshot
- pot detail after confirmation screenshot
- close record and saved record screenshots
- journey review that names any stitched-flow, stale-state, or language drift
- normal UI contains no internal technical language

## DC-023 - PAS test wallet payment decision

Required evidence:

- friend payment link screenshot
- PAS payment option uses normal payment language
- finalized public-testnet PAS transfer matches payer, receiver, amount, and currency
- only the matching share is cleared
- mismatched amount or currency does not clear
- normal UI contains no native/protocol/adapter language
- boundary note says this is public-testnet proof, not production custody or live `.dot` readiness
- the visible `Pay Mina` action triggers the wallet signature; a repo script or
  prewritten report cannot stand in for the payer action
- every peer independently checks the finalized transaction before accepting
  the shared payment result
- five separate app profiles converge with four unique transaction hashes and
  zero open amount

## DC-024 - DOT and USDC wallet payment check decision

Required evidence:

- friend payment link screenshot
- DOT and USDC payment options use normal payment language
- real wallet-signed DOT and USDC transfers are observed from their authoritative chain or asset source
- only the exact payer, receiver, amount, currency, and payment item match can clear
- wrong currency does not clear the share
- missing funds does not clear the share
- normal UI contains no native/protocol/adapter language
- fixtures, mock tokens, and prewritten reports are retained only as historical lab artifacts and cannot promote this decision
- boundary note separates PAS proof from incomplete DOT and real-USDC proof

## DC-025 - Universal Chop Core security architecture decision

Required evidence:

- architecture document exists at `docs/security/universal-chop-core-security-architecture.md`
- core entities are named separately from surface adapters
- state machine defines requested, payment started, paid unconfirmed, confirmed, delayed, waived, disputed, and closed paths
- invariants state that surfaces never own final truth and adapters cannot close or confirm by evidence alone
- adapter capability model separates identity verification, payment movement, evidence submission, reminders, confirmation, and closeout
- payment intent matching requires obligation, payer, receiver, amount, currency, rail, nonce/reference, and expiry
- guest-link permissions are scoped, revocable, and unable to edit amounts, confirm receipt, or close Chops
- privacy boundaries define what payer, receiver, organizer, and observer roles can see
- replay and idempotency rules cover duplicate requests, duplicate events, expired intents, and consumed evidence
- deployment and manifest boundaries define URL, origin, capability, rail, identity, monitoring, commit, and rollback records
- public claims are bounded and do not imply universal security, legal settlement, custody, or automatic cross-currency equivalence
- authenticated actor identity is derived from a verified bearer token
- payer and receiver role checks execute against a migrated PostgreSQL schema
- canonical settlement states are `pending`, `paid`, and `confirmed`
- valid legacy rows are preserved and malformed legacy rows fail without destructive deletion
- capture-link access is limited to the creator or an active group member
- authenticated users cannot enumerate unrelated capture links or mutate token payloads
- replayed mark-paid and confirm-received commands create no duplicate effects
- direct financial-table writes and atomic command gaps remain explicitly tracked
