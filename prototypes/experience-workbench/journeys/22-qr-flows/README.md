# Journey 22 — QR Flows V1

Status: **current / definition / not-reviewed**. No candidate HTML exists yet.

Goal: let a user scan or show a QR to identify a supported ChopDot target and continue safely into the journey that owns the consequential action.

## V1 boundary

J22 owns QR transport: scanner/display UI, camera permission, decode/classify/resolve, minimal typed preview, safe recovery and exact return-context continuity.

V1 recognizes only:
- person reference → Journey 09;
- group-invite reference → Journey 04;
- private receive/share reference → Journey 14.

QR is **not authority**. A scan does not join a group, reveal receiving details, authorize/pay, change balances, save a payment method, connect a wallet or prove finality. Settlement scope remains J11; private disclosure remains J14; saved destinations remain J20; wallet execution remains J21.

`My QR` is an identity/person reference only. Invite and private receive QR display renders an already-authorized opaque reference supplied by the owning journey; J22 does not create or widen those records.

Malformed, unsupported/external, expired/revoked, mismatched, permission-denied, offline/network, duplicate-scan, cancellation and stale-session states fail closed and preserve the caller.

See `spec.md`, `STATE_INVENTORY.md`, `EDGE_CASES.md`, and `source/decision-history.md` before building. Reuse approved Golden shell/components. `TYPO-01` remains deferred.
