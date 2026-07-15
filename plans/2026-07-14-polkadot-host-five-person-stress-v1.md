# Polkadot-hosted five-person stress v1

## Programme

Programme B: native truth integration proof. This extends the official local
host simulation; it does not claim a live-network or real-UI pass.

## User journey

> I am Mina, I need five people acting from separate devices to reach the same
> group safely, so nobody's payment, delay, or final record is lost or confused.

## Product gate

- One next action: each person performs only their assigned group action.
- Friction: 3/3
- Trust: 3/3
- Clarity: 3/3
- Language: 1/1
- Total: 10/10
- Decision: PASS

This pass adds no normal UI and exposes no infrastructure language to users.

## Current truth to preserve

- The two-person official host simulation passes.
- Host transport remains ciphertext-only.
- Host payment completion remains observation-only.
- Only an explicitly redacted receipt may enter the receipt archive.
- The portable-shell reducer is not yet connected to this bridge; this remains
  a developer integration proof.

## Scope in

- Five distinct official test hosts and Product Accounts.
- Concurrent encrypted event publication and convergence.
- Duplicate delivery observation.
- Wrong-secret isolation.
- Three concurrent payment requests with isolated logs and observed-only state.
- Five-member redacted receipt submit/retrieval.
- Machine-readable report and one screenshot per host.

## Scope out

- No normal UI changes.
- No direct claim that Mina, Leo, Nina, Omar, or Vera clicked the real product.
- No live Product Account login, live Statement Store, or real token transfer.
- No reducer or payment-authority changes solely to make the stress test green.

## Requirements

1. Five hosts SHALL receive unique product-scoped identities.
2. Each host SHALL publish one encrypted event without plaintext leakage.
3. Every correctly configured host SHALL reconstruct all five unique events.
4. A host using the wrong session secret SHALL NOT receive a later group event.
5. Duplicate statement delivery SHALL be measured and reported.
6. Payment results SHALL remain `observed_only` and isolated to their host.
7. The stored receipt SHALL be redacted and contain no participant names.
8. The report SHALL distinguish bridge proof from real-UI and live-network
   proof.

## Scenarios

### Five-person convergence

GIVEN five separate hosted participants share one group secret
WHEN all five publish an action concurrently
THEN every correctly configured participant receives the same five unique
actions
AND the host statement logs contain no plaintext action, name, or amount.

### Wrong secret

GIVEN Vera reconnects with a different group secret
WHEN Mina publishes another group action
THEN the other four participants receive it
AND Vera does not.

### Concurrent payments

GIVEN Leo, Nina, and Omar each have a separate payment request
WHEN all three host payments complete
THEN each result remains observation-only
AND no payment log appears in Mina's or Vera's host.

### Receipt

GIVEN the five-person record is ready to save
WHEN Mina archives the redacted packet
THEN it can be retrieved
AND it contains no participant names or payment references.

## Proof

- `npm run lint`
- `npm run test:host-stress`
- `proof/polkadot-host-stress/report.json`
- screenshots for Mina, Leo, Nina, Omar, and Vera

## Result

Status: `passed` on 2026-07-14.

- Five distinct Product Accounts each published one encrypted event.
- All five hosts received all five unique events in the initial burst with no
  retries.
- Two injected duplicate deliveries did not create duplicate received events.
- A host reconnected with the wrong secret did not receive the later event.
- Three concurrent payment requests stayed isolated and `observed_only`.
- The archived five-member receipt was retrievable and contained no names.

The first run exposed a real adapter defect: every session event used the same
Statement Store channel, which applies last-write-wins semantics. Concurrent
money events were therefore suppressed. The bridge now publishes session
events without a channel so they remain append-only; the Statement Store
client deduplicates identical packets by data hash.

This remains developer integration proof. The normal ChopDot UI and reducer
are not yet bound to the host session, and no live-network five-device claim is
made.
