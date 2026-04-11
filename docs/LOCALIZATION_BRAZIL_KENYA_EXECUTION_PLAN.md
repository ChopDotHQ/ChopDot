# Localization: Brazil And Kenya Execution Plan

<discovery_plan>
- Capture the practical localization and payment-rail value from the Brazil/Kenya research report
- Keep the output tied to the current shared-commitment kernel direction
- Distinguish what is useful now from what is later execution detail
</discovery_plan>

## FACTS

- The pasted research report covered:
  - Brazil / Pix
  - Kenya / M-PESA
  - local identity norms
  - local UX norms
  - local compliance constraints
  - adapter designs
  - offline / low-bandwidth flows
  - fraud mitigations
  - large-event operational runbooks
- ChopDot’s current active direction remains:
  - shared commitment kernel
  - coordination first
  - proof second
  - local execution as a future-critical layer

## INFERENCES

- This report is highly useful.
- Its biggest contribution is not “go expand internationally now.”
- Its biggest contribution is:
  - clearer local-rail doctrine
  - clearer pilot design
  - clearer adapter thinking
  - clearer low-tech / mobile-first requirements

## ASSUMPTIONS

- Brazil and Kenya remain important reference markets even if they are not both immediate launch targets.
- The current proof slice is still internal kernel recovery, not full Pix or M-PESA implementation now.

## What This Report Adds

### 1. Local rails are not a detail

The report makes clear that:
- Brazil is Pix-native
- Kenya is M-PESA / phone-number-native

This confirms that ChopDot should not be designed as:
- wallet-native only
- card-native only
- browser-only

### 2. Identity is market-shaped

Brazil:
- Pix keys
- CPF / CNPJ context
- smartphone and QR norms

Kenya:
- SIM / phone-number identity
- PIN-confirmed mobile money
- USSD and SMS resilience

This strengthens the existing doctrine that identity and execution should remain modular.

### 3. Adapter boundaries matter

The report reinforces the right architecture:
- universal commitment core
- pluggable payment and identity adapters
- event-driven confirmation from local rails into the core ledger

### 4. Offline and low-bandwidth support is a real product concern

This is especially important for:
- community usage
- pop-up groups
- less app-centric environments

## Recommended Current Interpretation

### Active now

- treat local rails as a first-class future layer
- keep commitment core backend-neutral and rail-neutral
- model contribution confirmation so it can later accept:
  - Pix confirmations
  - M-PESA confirmations
  - manual / fiat proof

### Supporting current work

- design invites and flows assuming phone-first use is likely in many markets
- keep contribution and confirmation language adaptable to:
  - QR-based payments
  - deep links
  - SMS / USSD guidance

### Deferred

- full Pix adapter
- full M-PESA / Daraja adapter
- USSD implementation
- country-specific KYC branches
- local field pilots

## Design Consequences

### Product

- phone / link-first onboarding matters
- “joined” and “paid” must remain separate
- local visibility rules may need per-market policy later

### Engineering

- payment confirmation should be adapter-driven
- callbacks and reconciliation need first-class modeling later
- idempotency matters for every local rail

### Compliance

- keep minimal necessary data
- avoid pretending to do more KYC than the product actually does
- keep custody boundaries explicit

## Practical Future Adapter Surface

Each local rail should eventually fit a shape like:

- `create_payment_request()`
- `get_payment_payload()`
- `handle_confirmation_callback()`
- `verify_confirmation()`
- `emit_contribution_confirmed()`
- `reconcile_pending()`

This keeps Pix, M-PESA, and future local rails subordinate to the commitment core.

## Best Use Of This Report Right Now

Use it to shape:
- architecture boundaries
- future pilot planning
- UX assumptions
- compliance posture

Do not use it as a reason to:
- expand scope immediately
- add country adapters before the kernel works

## Next move

- Keep this as a supporting localization and local-rail doctrine file.
- When the kernel is restored, this should inform the first real market-facing pilot design.
