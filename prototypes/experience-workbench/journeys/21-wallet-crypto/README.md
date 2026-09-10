# Journey 21 — Wallet & Crypto

Status: **current definition stage** after Journey 20 Golden freeze. Prototype not built yet.

Goal: connect or switch a wallet and approve exact chain actions without anxiety or widening ChopDot's authority.

Entry: Account/You, settlement, receive/share, or a savings flow that needs a connected wallet or signature.

Exit: connected wallet state, a signed/submitted chain action handed back to its owning journey, or a safe cancelled/failed return.

## Boundaries

Journey 21 owns connected-wallet session state, wallet selection, connect/switch/disconnect, exact account/network revalidation, signature handoff, chain submission state, and network finality facts needed by the calling journey.

It does **not** decide what is owed or authorize settlement scope (Journey 11), own the settlement result/balance update presentation (Journey 12), store saved receiving destinations (Journey 20), disclose receiving details (Journey 14), redefine savings contribution/withdrawal rules (Journey 17), or own broader account/security preferences (Journey 27).

A connected wallet is execution capability, not ChopDot product authority. No seed phrase, private key, wallet password, signing credential, or provider secret enters ChopDot domain data.

TYPO-01 remains deferred.
