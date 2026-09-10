# Journey 21 — Edge Cases

Definition-stage V1 coverage targets.

- No supported wallet is installed/available.
- Multiple wallet providers are available.
- User rejects or closes the connection prompt.
- Connection result is unknown after timeout, navigation or reload.
- Previously connected wallet is no longer available.
- Wallet account changes outside ChopDot while a review is open.
- Wallet network changes outside ChopDot while a review is open.
- Connected account is valid but not the account expected by the calling context.
- Exact network is unsupported by the selected wallet.
- Same asset ticker exists on more than one network; ticker equality must never substitute for exact network identity.
- User rejects/cancels a signature; no transaction is represented as submitted.
- Wallet closes or disconnects while a signature is pending.
- Signature succeeds but submission fails.
- Submission result becomes unknown; reconcile transaction identity before retrying.
- Transaction is submitted but not final yet.
- Transaction reverts/fails after submission.
- Insufficient native fee balance.
- Insufficient transfer asset balance.
- Repeated Connect/Sign/Submit taps must not create duplicate prompts or duplicate chain actions.
- Upstream settlement/savings scope changes while wallet approval is pending; stale review must not execute.
- Return context from Journey 11, 14 or 17 is lost during wallet switching.
- Disconnecting a wallet must not delete a Journey 20 receiving destination, settlement history, source expenses or balances.
- Connecting a wallet must not automatically make its public address broadly visible to other pot members.
- A Journey 20 public receiving address must not be treated as a connected signing wallet.
- No seed phrase, private key, wallet password or signing credential may be requested, logged, persisted or included in URLs.
- Offline/captive connectivity must not produce a fake connected/submitted/finalized state.
- Provider RPC/indexer disagreement must not be collapsed into final success; preserve an unknown/recovery state.
- Browser extension, mobile deep-link and embedded-wallet implementations may differ; product semantics must stay provider-agnostic.
- Loading/error/empty states retain one clear safe return path.

TYPO-01 remains deferred; shared typography changes are not part of Journey 21.
