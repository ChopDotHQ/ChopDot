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
