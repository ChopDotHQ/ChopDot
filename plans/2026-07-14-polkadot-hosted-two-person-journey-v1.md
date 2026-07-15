# Polkadot-hosted two-person journey v1

## Programme

Programme B: native truth. Programme A's live static `.dot` shell remains the
frozen product-parity baseline.

## User journey

> I am Mina, I need Leo's payment action to reach the same group from his own
> device, so we can finish the group with one trusted summary.

## Product gate

- One next action: each person sees only the action assigned to them.
- Friction: 3/3
- Trust: 3/3
- Clarity: 3/3
- Language: 1/1
- Total: 10/10
- Decision: PASS

This change adds no normal user-facing controls. Polkadot capabilities remain
behind the portable product journey and developer proof.

## Current truth to preserve

- The same group-money journey already passes on web, Telegram, and the live
  Paseo `.dot` host.
- `request_sent`, `marked_paid`, `confirmed`, and `closed` remain distinct.
- Host identity, storage, statements, and payments are inputs. ChopDot owns
  payment and closeout truth.
- The main ChopDot app is not merged into this shell.

## Scope in

- Add a replaceable Polkadot host bridge to the portable shell.
- Probe Product Account, Statement Store, payment manager, and preimage archive
  capabilities without prompting on first load.
- Request app-scoped identity only after an explicit call.
- Publish only encrypted shared-session packets.
- Treat host payment completion as an observed payment result for exact-intent
  validation, never as receiver confirmation or group closeout.
- Store only a redacted closeout packet through the host preimage manager.
- Keep a machine-readable capability report behind developer checks.
- Document and prove the local iOS reference-host setup boundary.

## Scope out

- No main ChopDot merge.
- No visible native-chain, host, protocol, or proof UI.
- No Swift rewrite of ChopDot.
- No mainnet, custody, escrow, or automatic closeout.
- No simulated success when a host capability is absent.

## Requirements

1. The portable shell SHALL preserve the existing journey and reducer semantics.
2. Each host capability SHALL report `available`, `needs_login`, `unavailable`,
   or `error`.
3. Identity SHALL use a product-scoped account for
   `chopdot-shell-proof.dot`.
4. Statement Store SHALL receive ciphertext packets only; plaintext money or
   participant data SHALL be rejected before publish.
5. A completed host payment SHALL remain `observed` until the matching ChopDot
   payment intent accepts it.
6. Receipt archive input SHALL be explicitly redacted.
7. Developer diagnostics SHALL remain absent from normal UI.
8. Missing full Xcode SHALL NOT block ChopDot work. A source-built iOS client
   is an optional fallback, not a product requirement.

## Scenarios

### Capability probe

GIVEN ChopDot loads outside a Polkadot host
WHEN the bridge probes capabilities
THEN it SHALL return unavailable capability states without changing the UI.

### Identity

GIVEN ChopDot is inside a compatible host
WHEN Mina explicitly requests access
THEN the host SHALL return a product-scoped identity or a fail-visible status.

### Shared session

GIVEN Mina and Leo share a session secret
WHEN either publishes a group action
THEN Statement Store SHALL carry only an encrypted packet and ChopDot SHALL
validate the decrypted action before applying it.

### Payment

GIVEN Leo completes a host payment for one exact request
WHEN the payment manager reports `completed`
THEN ChopDot SHALL observe that result for exact-intent matching and SHALL NOT
confirm another payment or close the group.

### Receipt

GIVEN the group is ready to close
WHEN Mina saves the final record
THEN only a redacted receipt packet SHALL be submitted to the archive path.

## Proof

- `npm run lint`
- `npm run test:host-adapter`
- `npm run test:payment-intents`
- `npm run build`
- unchanged web and Telegram portable-shell proof packets
- live `.dot` proof after a controlled redeploy
- iOS reference-host setup report, with build evidence only after full Xcode is
  installed

## Execution checkpoint - 2026-07-14

Completed locally:

- Added the Product SDK host bridge and exact dependency versions.
- Added product-scoped identity, encrypted Statement Store packet, observed-only
  payment, and redacted receipt archive boundaries.
- Added AES-GCM session packet encryption and private routing-name derivation.
- Added a developer-only capability report with no normal UI output.
- `npm run test:host-adapter`: 8 passed.
- `npm run test:payment-intents`: 12 passed.
- `npm run security:baseline`: passed across 47 files.
- `npm run lint`: passed.
- `npm run build`: passed.
- `npm run proof:web`: passed with 24 screenshots and persisted state.
- `npm run proof:telegram`: passed with 24 screenshots and persisted state.
- `npm run test:host-sim`: passed against the official
  `@parity/host-api-test-sdk@0.10.0` with separate Alice and Bob hosts.
- The host simulation proved distinct product-scoped identities, ciphertext-only
  Statement Store transport, Bob decrypting Alice's group event, an
  observed-only payment result, and redacted receipt submit/retrieval.

Current boundaries:

- The local capability proof correctly reports identity, Statement Store,
  payments, and receipt archive as unavailable outside a compatible host.
- Full Xcode is not installed. This is recorded only for the optional iOS
  source-build route and does not block current ChopDot development.
- The bridge-enabled bundle is deployed to Paseo at CID
  `bafybeid27jigusqvjugfa76d5xhufz754ndtrbpr7rhudytkn7jgvlgfky`.
- The live product journey passed with 22 screenshots and state restored after
  reopening the hosted app.
- The live capability report proves the host container and reports Product
  Account identity as `needs_login`; Statement Store, payments, and receipt
  archive managers are available.
- A real browser click on the host account control opened the Product Account
  QR ceremony and displayed `Scan with Polkadot Mobile to connect`. See
  `proof/product-account-login-boundary-2026-07-14.md`.
- The same manager boundaries now pass in Parity's official local host
  simulator. See `proof/polkadot-host-sim/report.json`.
- Live runtime use remains unproven until login and the same
  two-device/payment/receipt scenario are executed against the deployed host.

The live identity lane is `blocked_external_distribution`: ChopDot and the host
reach the login ceremony, but no distributed Polkadot Mobile client is
installed. The local real-UI host-simulation lane remains unblocked.

## Promotion boundary

The official host simulation closes the locally controllable integration gate.
It proves the host bridge, not the real UI-bound product journey. The tested
actions currently run through developer checks and do not yet drive the
portable-shell reducer or authenticated payment-intent service.

The next locally controllable gate is:

1. connect normal portable-shell actions to the authenticated payment-intent
   and encrypted-session boundary; and
2. run Mina and Leo through the real UI in separate official test hosts with no
   direct state mutation or developer action shortcuts.

Live-native promotion then requires:

1. complete Product Account login with a runnable Polkadot Mobile client;
2. repeat the real UI-bound Mina/Leo convergence against the live host;
3. match one live host payment to one exact ChopDot payment intent; and
4. submit and retrieve one live redacted closeout receipt.

Deployment uses the worktree-owned `polkadot-app-deploy.config.ts` for
`chopdot-shell-proof.dot`; it must not inherit the main repo's
`chopdotws01.dot` configuration.
