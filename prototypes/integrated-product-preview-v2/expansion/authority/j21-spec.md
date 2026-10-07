# Journey 21 — Wallet & Crypto

V1 · Definition stage · Current. Prototype only; candidate not built yet.

## Goal and route contract

**Goal:** Connect or switch a wallet and approve exact chain actions without anxiety, while keeping wallet execution downstream of ChopDot's product authority.

**Entry:** Account/You, settlement, receive/share, or a savings action requiring a connected wallet/signature.

**Exit:** Connected wallet state, signed/submitted action handed back to the calling journey, verified network-finality fact, or a safe cancelled/failed return.

Journey 21 owns connected-wallet session state, connect/switch/disconnect, exact account/network validation, signature handoff, chain submission state and finality facts. It does not decide settlement/savings scope, store receiving destinations, disclose receiving details, or own the resulting domain balance/history presentation.

## Adjacent ownership

- **Journey 11 — Settle Up:** owns exact settlement scope, human review/authorization and the decision that a payment should occur.
- **Journey 12 — Complete Settlement:** owns the customer-facing settlement progress/result, proof linkage and derived balance update after execution facts return.
- **Journey 14 — Receive / Share Payment Details:** owns deliberate disclosure/copy/private-link behavior for receiving details.
- **Journey 17 — Contribute / Withdraw Savings:** owns savings-specific amount/rules and consumes wallet execution outcomes when a chain action is required.
- **Journey 20 — Payment Methods:** owns saved receiving/payment destinations and compatibility-scoped preference; a public crypto address there is not a connected signing wallet.
- **Journey 27 — Account & Preferences:** owns broader identity, security and account settings outside the active wallet execution flow.

## V1 wallet model

The candidate should represent wallet behavior generically rather than make today's implementation permanent product truth:

- disconnected vs connected session;
- wallet/provider choice when more than one is available;
- masked active account plus exact network;
- connect, switch account/network and disconnect;
- an exact action contract received from the calling journey;
- wallet signature request;
- submission, unknown/reconciliation and network finality states;
- return to the exact originating context.

No seed phrase, private key, wallet password, signing credential or provider secret may enter ChopDot domain data. A connected wallet is execution capability, not a globally preferred payment method and not permission to move arbitrary funds.

## Main candidate paths

**Connection path:** Wallet-required handoff → disconnected context → choose wallet → provider approval → connected exact account/network → return to caller.

**Execution path:** Caller-authorized exact action → confirm account/network + action summary → request wallet signature → signed → submit → pending finality → verified result handed back to caller.

**Switch path:** Connected but wrong account/network → explain mismatch → switch → revalidate → require fresh exact action review when material context changed → continue or return.

## Candidate policies

1. **Execution does not define authority.** Journey 21 only executes an exact action already scoped by the calling ChopDot journey.
2. **Exact account + network.** Every signature boundary revalidates the active wallet account and network. Asset ticker equality is insufficient.
3. **Review invalidates on material change.** Account, network, amount, asset, destination, source items or calling authority changes require a fresh exact review before signature/submission.
4. **Connection is not disclosure.** Connecting a wallet does not automatically publish its address, add it as a saved Journey 20 method, or expose it to People/Activity/pot members.
5. **No secrets.** Wallet/provider credentials and signing secrets remain in the wallet/provider. ChopDot stores only the minimum public/session/transaction references needed for deterministic product behavior.
6. **Signature ≠ submission ≠ finality.** These states are distinct and honestly communicated. Finality is not inferred from a signature or optimistic UI.
7. **Recovery before retry.** Unknown signature/submission outcomes are reconciled before retrying so repeated taps cannot duplicate a chain action.
8. **No silent substitutions.** Journey 21 cannot change network, account, asset, amount or destination merely to make execution succeed.
9. **Return-context continuity.** Wallet connection/switching must preserve the settlement/receive/savings context that invoked it; cancellation returns safely without fabricating success.
10. **Provider-agnostic product semantics.** Browser extensions, mobile wallets, WalletConnect-like flows or future account abstractions may implement the boundary differently without redefining ChopDot's product contract.

## Information hierarchy for V1

Before a signature, the user should be able to answer quickly:

1. What exact action am I approving?
2. Which account will sign it?
3. On which network?
4. What is ChopDot waiting for right now?
5. Can I cancel/return safely, and what happens if the result is unknown?

Protocol/provider detail stays secondary unless it is necessary for an informed decision or recovery.

## Starting state inventory

Required before review: disconnected/connected wallet overview, wallet chooser, unavailable provider, connect pending/accepted/rejected/cancelled/timeout-unknown, account/network switch review/pending/accepted/rejected/unknown, exact action review, waiting for signature, signature rejected/cancelled/timeout, signed-submission-pending, submission unknown/reconciliation, submitted/pending finality, finalized, reverted/failed, insufficient fee/asset balance, stale account/network review, disconnect, offline, loading and provider/load error.

## Prototype constraints

The candidate remains standalone, synthetic and risk-free. No real wallet is connected, no signature requested, no funds moved and no chain transaction submitted. Demo accounts/transaction references must be synthetic. Boundary previews preserve context but do not redesign adjacent Golden journeys.

The canonical `Pots / People / raised Add / Activity / You` shell and inherited icon language remain unchanged. Journey 21 does not gain a new global tab. TYPO-01 remains deferred.

## Review focus

The V1 review should decide whether wallet connection feels like a short contextual handoff rather than a crypto control panel; whether the exact action/account/network is obvious before signing; whether rejected/unknown/pending states prevent unsafe retries; and whether users can distinguish a saved receiving address from a connected signing wallet without infrastructure-heavy copy.

<!-- JOURNEY_DECISION_HISTORY:START -->
## Decision history

**Coverage:** Journey 21 starting decisions recorded 2026-09-10 before candidate build from the current journey registry, frozen adjacent journey specifications, the payment compatibility contract, and inspected production wallet/settlement evidence. These are definition-stage decisions and are not yet user-approved Journey 21 behavior.

### J21-D01 — Wallet execution stays downstream of ChopDot product authority

**Decision:** Journey 21 may connect a wallet, request an exact signature, submit a chain action and report network finality facts, but the amount, asset, recipient, source items and permission to act remain owned by the calling ChopDot journey. Wallet approval executes an already-defined action; it does not decide what the user owes or widen settlement/savings authority.

**Why:** The frozen payment compatibility contract keeps exact settlement scope and authority rules inside ChopDot while replaceable wallet/payment integrations own execution and finality. Journey 11 already owns settlement review/authorization.

**Alternatives:** Letting the wallet surface derive or modify settlement scope, or treating a successful wallet connection as payment authorization, were rejected because they blur product authority with execution capability.

**Tradeoffs:** The calling journey must hand Journey 21 an explicit action contract and may need to re-review if that contract changes. In return, wallet providers remain replaceable and cannot silently widen the user's intent.

**Revisit when:** A future chain/account-abstraction integration requires a different execution boundary while preserving the same exact-scope and human-authority guarantees.

**Approval / version:** V1 definition — current / not-reviewed. Recorded 2026-09-10 before candidate build. TYPO-01 remains deferred.

**Sources:** [Journey 11 payment compatibility contract](../../11-settle-up/PAYMENT_AND_AGENTIC_COMPATIBILITY_CONTRACT.md); [Journey 11 specification](../../11-settle-up/spec.md); [current production settlement screen](https://github.com/ChopDotHQ/ChopDot/blob/main/src/components/screens/SettleHome.tsx).

### J21-D02 — Exact account and network are revalidated at the signature boundary

**Decision:** Connection state must identify the exact active account and network needed by the calling action. Account or network changes while a review/signature is open invalidate that stale review and require revalidation before submission. Matching an asset ticker alone never proves network compatibility.

**Why:** Journey 20 already requires exact network identity for saved crypto destinations, and current production evidence supports wallet/network switching as an implementation concern. A stale account/network context is materially different from the action the user reviewed.

**Alternatives:** Allowing a wallet/provider switch to continue an old review automatically, or accepting a same-ticker asset on another network, were rejected because the user could sign a materially different action than the one presented.

**Tradeoffs:** Wallet switching can add a re-review step. The benefit is deterministic intent continuity at the highest-risk boundary in the flow.

**Revisit when:** A provider can cryptographically guarantee an equivalent action across account/network changes and product review confirms that equivalence is understandable to users.

**Approval / version:** V1 definition — current / not-reviewed. Recorded 2026-09-10 before candidate build.

**Sources:** [Journey 20 specification](../../20-payment-methods/spec.md); [current production chain test surface](https://github.com/ChopDotHQ/ChopDot/blob/main/src/chain/chain-test-page.tsx); [current production settlement screen](https://github.com/ChopDotHQ/ChopDot/blob/main/src/components/screens/SettleHome.tsx).

### J21-D03 — Connected wallet state is not a saved destination or public profile field

**Decision:** A connected wallet session may expose the minimum masked account/network context required for the owner to act, but it does not automatically create a Journey 20 saved receiving destination, publish the address to other pot members, or persist wallet secrets. Saved public receiving destinations and deliberate disclosure remain Journeys 20 and 14.

**Why:** Journey 20 explicitly separates a public crypto receiving destination from a connected signing wallet, and Journey 14 owns deliberate receiving-detail disclosure. The payment compatibility contract keeps credentials/secrets with the wallet/provider.

**Alternatives:** Auto-saving every connected account as a payment method or making connected addresses visible as profile/payment-directory data were rejected because connection for execution does not imply consent to store or disclose a receiving destination.

**Tradeoffs:** Users who want to receive to the same account may deliberately save/share it separately. This adds an explicit step while preserving privacy and purpose limitation.

**Revisit when:** User research demonstrates a safe, explicit opt-in handoff from a connected wallet to Journey 20 without conflating connection, storage and disclosure.

**Approval / version:** V1 definition — current / not-reviewed. Recorded 2026-09-10 before candidate build.

**Sources:** [Journey 20 specification](../../20-payment-methods/spec.md); [Journey 14 specification](../../14-receive-money/spec.md); [payment compatibility contract](../../11-settle-up/PAYMENT_AND_AGENTIC_COMPATIBILITY_CONTRACT.md).

### J21-D04 — Signature, submission and finality are separate observable states

**Decision:** Journey 21 must never collapse wallet signature, network submission and finality into one success state. Unknown results are reconciled before retry. Once finality is verified, Journey 21 hands that fact back to the owning settlement/savings journey, which remains responsible for the customer-facing domain result and derived balances.

**Why:** Current production settlement evidence already models waiting-for-wallet and transaction progress, while the frozen payment contract assigns network execution/finality to integrations and domain balances/results to ChopDot. Separating these states avoids duplicate submissions and false completion claims.

**Alternatives:** Showing success immediately after signature or blindly retrying after an unknown submission result were rejected because either can misstate payment completion or duplicate a chain action.

**Tradeoffs:** The user may see one more progress/recovery state. In return, ChopDot can explain exactly what is known and avoid unsafe retries.

**Revisit when:** A future execution provider offers an atomic, verifiable primitive that genuinely collapses these states without losing recovery semantics.

**Approval / version:** V1 definition — current / not-reviewed. Recorded 2026-09-10 before candidate build.

**Sources:** [Journey 11 payment compatibility contract](../../11-settle-up/PAYMENT_AND_AGENTIC_COMPATIBILITY_CONTRACT.md); [Journey 12 specification](../../12-complete-settlement/spec.md); [current production settlement screen](https://github.com/ChopDotHQ/ChopDot/blob/main/src/components/screens/SettleHome.tsx).
<!-- JOURNEY_DECISION_HISTORY:END -->
