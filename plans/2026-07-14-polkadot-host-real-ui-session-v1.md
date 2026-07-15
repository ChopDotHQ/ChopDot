# Polkadot Host Real-UI Session v1

## Programme

Programme B: native truth.

## Product gate

- User journey: "I am Leo, I need to mark my Friday Crew payment from my own device, so Mina and the group can see what happened and finish the group."
- One next action: `I paid Mina`.
- Friction: 3/3.
- Trust: 3/3.
- Clarity: 3/3.
- Language: 1/1.
- Total: 10/10.
- Decision: PASS.

## Current truth to preserve

- The portable shell already proves the normal group-money journey on web, Telegram, and a deployed Paseo `.dot` host.
- The ChopDot reducer owns payment and closeout truth.
- `marked_paid` is not `confirmed`; only the receiver can confirm.
- The existing five-person host stress proves encrypted append-only Statement Store transport, duplicate suppression, wrong-secret isolation, observed-only payments, and redacted receipt storage.
- That stress uses developer controls and is not proof that separate people can complete the real UI journey.

## Scope in

- Bind a host Product Account to a stable local ChopDot participant.
- Publish normal ChopDot domain actions as encrypted, signed session events.
- Validate signer and actor authority before replaying remote actions through the reducer.
- Reuse known synced participants when Mina creates a group by name.
- Prove Mina, Leo, Nina, Omar, and Vera complete the existing UI journey from separate local host instances.
- Capture screenshots and a machine-readable report.

## Scope out

- No main ChopDot merge.
- No live-network or Polkadot Mobile readiness claim.
- No visible host, native, protocol, proof, adapter, account, or session language.
- No direct reducer calls, developer controls, or test-only mutation in the journey proof.
- No change to payment, request, confirmation, settle-up, finish-group, or saved-record semantics.

## Requirements

1. The portable shell SHALL derive a stable participant ID from the host Product Account when host session parameters are present.
2. Device-local state such as the active participant, theme, and navigation SHALL NOT be shared.
3. Shared domain actions SHALL be encrypted before Statement Store submission.
4. A remote event SHALL be rejected when its signer does not match its declared participant.
5. A remote action SHALL be rejected when the participant lacks authority under current ChopDot state.
6. Duplicate event delivery SHALL NOT apply a domain action twice.
7. Host and session failures SHALL remain fail-visible to tests without adding technical copy to normal UI.
8. Five isolated participants SHALL use only normal UI controls to join, create the group, add spend, request payment, mark paid, confirm receipt, finish the group, and open the saved summary.
9. All five participants SHALL converge on the same shared users, group, expense, split statuses, and saved record while preserving their own active participant.

## Scenarios

### Participant binding

GIVEN Leo opens ChopDot in his own local Polkadot host
WHEN he continues as Leo
THEN his ChopDot participant is bound to that host Product Account without technical UI.

### Shared group

GIVEN all five people have entered ChopDot once
WHEN Mina creates Friday Crew and adds Leo, Nina, Omar, and Vera by name
THEN the group reuses their existing host-bound participants rather than creating duplicates.

### Payment and confirmation

GIVEN Mina sends payment requests
WHEN Leo opens his own request and taps `I paid Mina`
THEN all devices show Leo waiting for Mina's confirmation and no device treats him as confirmed.

GIVEN Leo marked paid
WHEN Mina confirms receipt
THEN all devices show only Leo's matching share as confirmed.

### Closeout

GIVEN all four payer shares are confirmed
WHEN Mina finishes the group and saves the summary
THEN all devices converge on the same closed record.

### Adversarial authority

GIVEN a signed remote action declares a different actor or an unauthorized action
WHEN it arrives through the session
THEN ChopDot rejects it before reducer application.

## Proof

- Focused unit tests for envelope validation, authority, deduplication, and local-only actions.
- Five-person Playwright test using five official Host API Test SDK instances.
- Screenshots of first entry, group creation, request, payer action, confirmation, and saved summary.
- `proof/polkadot-host-real-ui/report.json` with participant identities, convergence, action path, and boundaries.
- Fresh type-check and production build.

## Falsifier

This pass fails if any participant requires developer controls, direct state mutation, technical UI, a shared browser identity, or a hidden happy-path shortcut to complete the journey.
